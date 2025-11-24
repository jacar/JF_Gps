"use client"

import { Map, Marker, Overlay } from "pigeon-maps"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Timer, Gauge, Route, UserIcon, Phone, MapPin, Car, Truck, Clock, Navigation, X } from "lucide-react"
import type { TripWithDriver, TripLocation } from "@/lib/types"

interface MapWrapperProps {
  activeTrips: TripWithDriver[]
  tripLocations: Record<string, TripLocation[]>
  selectedTripId: string | null
  onTripSelect: (tripId: string | null) => void
}



export default function MapWrapper({ activeTrips, tripLocations, selectedTripId, onTripSelect }: MapWrapperProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([4.6097, -74.0817]) // Bogotá default
  const [mapZoom, setMapZoom] = useState(12)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerHeight, setContainerHeight] = useState<number>(600)

  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [trackingLocation, setTrackingLocation] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null)
  const [vehiclesData, setVehiclesData] = useState<Record<string, any>>({})

  useEffect(() => {
    // Removed debug log
    const fetchVehicleDetails = async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()

      for (const trip of activeTrips) {
        const { data, error } = await supabase
          .from("vehicles")
          .select("vehicle_number, brand, model, plate, color, current_speed, last_position_update")
          .eq("vehicle_number", trip.vehicle_number)
          .maybeSingle()

        if (!error && data) {
          setVehiclesData(prev => ({ ...prev, [trip.vehicle_number]: data }))
          console.log('  ✅ Datos de vehículo obtenidos para:', trip.vehicle_number, data);
        } else if (error) {
          console.error('  ❌ Error al obtener datos de vehículo para:', trip.vehicle_number, error);
        }
      }
      console.log('  ✅ fetchVehicleDetails completado. vehiclesData final:', vehiclesData);
    }

    if (activeTrips.length > 0) {
      fetchVehicleDetails()
    } else {
      console.log('  ℹ️ No hay activeTrips para fetchVehicleDetails.');
    }
  }, [activeTrips])

  // Initialize selectedVehicle automatically when activeTrips or vehiclesData changes
  useEffect(() => {
    // Removed init debug log
    if (activeTrips.length > 0 && Object.keys(vehiclesData).length > 0 && !selectedVehicle) {
      const firstTrip = activeTrips[0];
      const latestLocation = tripLocations[firstTrip.id]?.[tripLocations[firstTrip.id].length - 1];
      const location = latestLocation || {
        latitude: firstTrip.start_latitude,
        longitude: firstTrip.start_longitude,
        timestamp: firstTrip.start_time,
        speed_kmh: 0
      };
      const vehicleInfo = vehiclesData[firstTrip.vehicle_number];

      if (vehicleInfo) {
        console.log('  Inicializando selectedVehicle automáticamente con:', { ...firstTrip, ...location, ...vehicleInfo });
        setSelectedVehicle({
          ...firstTrip,
          ...location,
          ...vehicleInfo,
          driver_name: firstTrip.driver?.full_name || "Conductor"
        });
      } else {
        console.log('  ❌ vehicleInfo no disponible para el primer viaje al intentar inicializar automáticamente.', firstTrip.vehicle_number);
      }
    }
  }, [activeTrips, vehiclesData, tripLocations]);




  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerHeight(el.clientHeight || 600)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Track admin's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported")
      return
    }

    setTrackingLocation(true)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setTrackingLocation(false)
      },
      (error) => {
        const err = error as GeolocationPositionError
        const msg = err?.message || "No se pudo obtener la ubicación. Verifica permisos del navegador o usa HTTPS."
        const code = err?.code

        // Only log as error if it's not a permission denied (code 1) or timeout (code 3) which are common
        if (code === 1) {
          console.warn("Geolocation permission denied:", msg)
        } else if (code === 3) {
          console.warn("Geolocation timeout:", msg)
        } else {
          console.error("Error getting location:", { code, message: msg, errorObject: err })
        }
        setTrackingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    if (selectedTripId) {
      const selectedTrip = activeTrips.find((t) => t.id === selectedTripId)
      if (selectedTrip) {
        const locations = tripLocations[selectedTrip.id]
        if (locations && locations.length > 0) {
          const latest = locations[locations.length - 1]
          setMapCenter([latest.latitude, latest.longitude])
          setMapZoom(15)
        } else {
          setMapCenter([selectedTrip.start_latitude, selectedTrip.start_longitude])
          setMapZoom(15)
        }

        // Update selectedVehicle based on selectedTripId
        const vehicleInfo = vehiclesData[selectedTrip.vehicle_number]
        const latestLocation = locations?.[locations.length - 1] || {
          latitude: selectedTrip.start_latitude,
          longitude: selectedTrip.start_longitude,
          timestamp: selectedTrip.start_time,
          speed_kmh: 0
        }

        setSelectedVehicle({
          ...selectedTrip,
          ...latestLocation,
          ...vehicleInfo,
          driver_name: selectedTrip.driver?.full_name || "Conductor"
        })
      }
    } else if (activeTrips.length > 0) {
      // Center on all active trips
      const firstTrip = activeTrips[0]
      const locations = tripLocations[firstTrip.id]
      if (locations && locations.length > 0) {
        const latest = locations[locations.length - 1]
        setMapCenter([latest.latitude, latest.longitude])
      } else {
        setMapCenter([firstTrip.start_latitude, firstTrip.start_longitude])
      }
      setMapZoom(12)
    }
  }, [selectedTripId, activeTrips, tripLocations])

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime).getTime()
    const now = Date.now()

    if (isNaN(start)) return "00:00:00"

    const diffSeconds = Math.floor((now - start) / 1000)

    if (diffSeconds < 0) return "00:00:00"

    const hours = Math.floor(diffSeconds / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    const seconds = diffSeconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const haversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  if (activeTrips.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full">
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-muted-foreground">No hay viajes activos para mostrar</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Center on My Location Button */}
      {myLocation && (
        <Button
          onClick={() => {
            setMapCenter([myLocation.lat, myLocation.lng])
            setMapZoom(15)
          }}
          className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white shadow-lg"
          size="sm"
          title="Centrar en mi ubicación"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Mi Ubicación
        </Button>
      )}

      {/* View All Vehicles Button */}
      {activeTrips.length > 0 && (
        <Button
          onClick={() => {
            // Calculate bounds for all vehicles
            const validLocations = activeTrips
              .map(trip => {
                const latest = tripLocations[trip.id]?.[tripLocations[trip.id].length - 1]
                return latest || { latitude: trip.start_latitude, longitude: trip.start_longitude }
              })
              .filter(loc => loc.latitude && loc.longitude &&
                loc.latitude !== 0 && loc.longitude !== 0)

            if (validLocations.length > 0) {
              // Calculate center
              const avgLat = validLocations.reduce((sum, loc) => sum + loc.latitude, 0) / validLocations.length
              const avgLng = validLocations.reduce((sum, loc) => sum + loc.longitude, 0) / validLocations.length

              setMapCenter([avgLat, avgLng])
              setMapZoom(validLocations.length === 1 ? 13 : 6) // Zoom out if multiple vehicles
            }
          }}
          className="absolute top-4 right-40 z-50 bg-green-600 hover:bg-green-700 text-white shadow-lg"
          size="sm"
          title="Ver todos los vehículos"
        >
          <Car className="h-4 w-4 mr-2" />
          Ver Todos ({activeTrips.length})
        </Button>
      )}

      <Map
        height={containerHeight}
        center={mapCenter}
        zoom={mapZoom}
        dprs={[1, 2]}
        onClick={() => {
          setSelectedVehicle(null)
          onTripSelect(null)
        }}
      >
        {activeTrips.map((trip) => {
          const latestLocation = tripLocations[trip.id]?.[tripLocations[trip.id].length - 1]
          const location = latestLocation || {
            latitude: trip.start_latitude,
            longitude: trip.start_longitude,
            timestamp: trip.start_time,
            speed_kmh: 0
          };

          console.log(`🔍 Marcador ${trip.vehicle_number} (${trip.driver?.full_name}) → LAT: ${location.latitude}, LNG: ${location.longitude}, Latest: ${!!latestLocation}`);

          return (
            <Marker
              key={trip.id}
              width={60}
              anchor={[location.latitude, location.longitude]}
              onClick={({ event }) => {
                console.log('Evento de clic en Marker disparado');
                event.stopPropagation()
                const vehicleInfo = vehiclesData[trip.vehicle_number]
                console.log('🚗 Vehículo clickeado:', trip.vehicle_number, vehicleInfo)
                const newSelectedVehicle = {
                  ...trip,
                  ...location,
                  ...vehicleInfo,
                  driver_name: trip.driver?.full_name || "Conductor"
                }
                console.log('✨ Intentando establecer selectedVehicle:', newSelectedVehicle)
                setSelectedVehicle(newSelectedVehicle)
                onTripSelect(trip.id)
              }}>
              <div className="relative flex items-center justify-center cursor-pointer">
                <img
                  src={(location.speed_kmh || 0) >= 1 ? "/carro_g_n.png" : "/carro_r_s.png"}
                  alt="Vehicle"
                  className={`w-12 h-12 object-contain ${selectedVehicle?.id === trip.id ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" : ""}`}
                />
              </div>
            </Marker>
          )
        })}

        {/* My Location Marker */}
        {myLocation && (
          <Marker
            anchor={[myLocation.lat, myLocation.lng]}
            offset={[-15, -15]}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-xl bg-blue-600 ring-4 ring-blue-200 ring-opacity-50 animate-pulse">
                <MapPin className="h-5 w-5 text-white" />
              </div>
            </div>
          </Marker>
        )}

        {/* Selected Vehicle Info Card */}
        {selectedVehicle && (
          <Overlay anchor={[selectedVehicle.latitude, selectedVehicle.longitude]} offset={[0, -70]}>
            <div className="bg-white rounded-lg shadow-2xl border border-gray-300 p-4 min-w-[280px] max-w-[320px] relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedVehicle(null)
                  onTripSelect(null)
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Header */}
              <div className="border-b border-gray-200 pb-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{selectedVehicle.vehicle_number}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedVehicle.speed_kmh >= 1
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                      }`}
                  >
                    {selectedVehicle.speed_kmh >= 1 ? "En ruta" : "Detenido"}
                  </span>
                </div>
                {(selectedVehicle.brand || selectedVehicle.model) && (
                  <p className="text-sm text-gray-600">
                    {selectedVehicle.brand} {selectedVehicle.model}
                    {selectedVehicle.color && ` • ${selectedVehicle.color}`}
                  </p>
                )}
                {selectedVehicle.plate && (
                  <p className="text-xs text-gray-500 mt-1">Placa: {selectedVehicle.plate}</p>
                )}
              </div>

              {/* Driver Info */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Conductor</p>
                <p className="text-sm font-medium text-gray-900">@{selectedVehicle.driver_name}</p>
              </div>

              {/* Trip Details */}
              <div className="mb-3 text-sm text-gray-700">
                <div className="flex items-center gap-1 mb-1">
                  <Timer className="h-4 w-4 text-gray-500" />
                  <span>Duración: {calculateDuration(selectedVehicle.start_time)}</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  <Route className="h-4 w-4 text-gray-500" />
                  <span>Lat: {selectedVehicle.latitude.toFixed(4)}, Lng: {selectedVehicle.longitude.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Estado: <Badge variant="secondary">{selectedVehicle.status}</Badge></span>
                </div>
              </div>

              {/* Vehicle Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-blue-50 rounded p-2">
                  <p className="text-xs text-blue-600 mb-1">Velocidad</p>
                  <p className="text-lg font-bold text-blue-900">
                    {Math.round(selectedVehicle.speed_kmh || 0)} <span className="text-xs">km/h</span>
                  </p>
                </div>
                <div className={`rounded p-2 ${selectedVehicle.motion_detected ? "bg-green-50" : "bg-gray-50"}`}>
                  <p className={`text-xs mb-1 ${selectedVehicle.motion_detected ? "text-green-600" : "text-gray-600"}`}>
                    Sensor
                  </p>
                  <p className={`text-sm font-bold ${selectedVehicle.motion_detected ? "text-green-900" : "text-gray-900"}`}>
                    {selectedVehicle.motion_detected ? "Movimiento" : "Detenido"}
                  </p>
                </div>
              </div>

              {/* Last Update */}
              <div className="text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Actualizado: {new Date(selectedVehicle.timestamp).toLocaleString("es-ES", {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
                {selectedVehicle.last_motion_update && (
                  <div className="flex items-center gap-1 mt-1">
                    <Navigation className="h-3 w-3" />
                    <span>
                      Sensor: {new Date(selectedVehicle.last_motion_update).toLocaleString("es-ES", {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setSelectedVehicle(null)}
              >
                Cerrar
              </Button>

              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
              </div>
            </div>
          </Overlay>
        )}
      </Map>
    </div>
  )
}
