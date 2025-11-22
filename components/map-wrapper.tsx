"use client"

import { Map, Marker, Overlay } from "pigeon-maps"

import { useState, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Timer, Gauge, Route, UserIcon, Phone, MapPin, Car } from "lucide-react"
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
  const [visiblePopups, setVisiblePopups] = useState<Record<string, boolean>>({});
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [trackingLocation, setTrackingLocation] = useState(false)

  // Initialize visiblePopups when activeTrips changes
  useEffect(() => {
    const initialVisiblePopups: Record<string, boolean> = {};
    activeTrips.forEach(trip => {
      initialVisiblePopups[trip.id] = true; // All popups visible by default
    });
    setVisiblePopups(initialVisiblePopups);
  }, [activeTrips]);

  const handleClosePopup = useCallback((tripId: string) => {
    setVisiblePopups(prev => ({ ...prev, [tripId]: false }));
  }, []);

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
        console.error("Error getting location:", error)
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
          className="absolute top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
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
          className="absolute top-4 left-4 z-50 bg-green-600 hover:bg-green-700 text-white shadow-lg"
          size="sm"
          title="Ver todos los vehículos"
        >
          <Car className="h-4 w-4 mr-2" />
          Ver Todos ({activeTrips.length})
        </Button>
      )}

      <Map height={containerHeight} center={mapCenter} zoom={mapZoom} dprs={[1, 2]}>
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
              anchor={[location.latitude, location.longitude]}
              offset={[-15, -15]}
            >
              <div className="relative flex items-center justify-center">
                <div className="text-3xl">
                  🚗
                </div>
                <div className="absolute -bottom-6 bg-white text-gray-900 px-2 py-0.5 rounded text-xs font-semibold shadow-md border border-gray-300">
                  {trip.vehicle_number}
                </div>
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
      </Map>
    </div>
  )
}

// Helper component to handle props passed by Map (latLngToPixel, pixelToLatLng)
const TripMarker = ({ trip, latestLocation, visiblePopups, setVisiblePopups, handleClosePopup, calculateDuration, latLngToPixel, pixelToLatLng }: any) => {
  // Use latest location or fallback to start location
  const location = latestLocation || {
    latitude: trip.start_latitude,
    longitude: trip.start_longitude,
    timestamp: trip.start_time,
    speed_kmh: 0
  };

  console.log(`🔍 Marcador ${trip.vehicle_number} (${trip.driver?.full_name}) → LAT: ${location.latitude}, LNG: ${location.longitude}, Latest: ${!!latestLocation}`);

  const isPopupVisible = visiblePopups[trip.id];

  return (
    <>
      <Marker
        anchor={[location.latitude, location.longitude]}
        offset={[-25, -25]}
      >
        <div className="relative flex items-center justify-center animate-bounce">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl bg-red-600 ring-8 ring-yellow-400 ring-opacity-80 border-4 border-white">
            <div className="text-white text-2xl font-bold">🚗</div>
          </div>
          <div className="absolute -bottom-8 bg-black text-white px-2 py-1 rounded text-xs font-bold">
            {trip.vehicle_number}
          </div>
        </div>
      </Marker>

      {isPopupVisible && (
        <Overlay
          key={`overlay-${trip.id}`}
          anchor={[location.latitude, location.longitude]}
          offset={[15, -10]}
        >
          <div
            key={trip.id}
            className="bg-white p-2 rounded-lg shadow-md flex flex-col items-start text-sm relative"
            style={{ minWidth: '200px' }}
            onMouseOver={() => setVisiblePopups((prev: any) => ({ ...prev, [trip.id]: true }))}
            onMouseOut={() => setVisiblePopups((prev: any) => ({ ...prev, [trip.id]: false }))}
          >
            <button
              onClick={() => handleClosePopup(trip.id)}
              className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 text-lg font-bold"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              &times;
            </button>
            <div className="flex items-center mb-1">
              <img src="/carro_g_n.png" alt="Vehicle Icon" className="w-6 h-6 mr-2" />
              <span className="font-bold text-base">Vehículo: {trip.vehicle_number}</span>
            </div>
            <div className="flex items-center mb-1">
              <UserIcon className="w-4 h-4 mr-1 text-gray-500" />
              <span>Conductor: {trip.driver.full_name}</span>
            </div>
            <div className="flex items-center mb-1">
              <Timer className="w-4 h-4 mr-1 text-gray-500" />
              <span>Tiempo de Viaje: {calculateDuration(trip.start_time)}</span>
            </div>
            <div className="flex items-center mb-1">
              <Gauge className="w-4 h-4 mr-1 text-gray-500" />
              <span>Velocidad: {location.speed_kmh?.toFixed(2) || '0.00'} km/h</span>
            </div>
            <div className="flex items-center mb-1">
              <Route className="w-4 h-4 mr-1 text-gray-500" />
              <span>Latitud: {location.latitude.toFixed(4)}</span>
            </div>
            <div className="flex items-center mb-1">
              <Route className="w-4 h-4 mr-1 text-gray-500" />
              <span>Longitud: {location.longitude.toFixed(4)}</span>
            </div>
            <div className="flex items-center mb-1">
              <span>Fecha GPS: {new Date(location.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center">
              <span>Estado: <Badge variant="secondary">{trip.status}</Badge></span>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
};
