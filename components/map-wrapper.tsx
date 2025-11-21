"use client"

import { Map, Marker, Overlay } from "pigeon-maps"
import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Timer, Gauge, Route, UserIcon, Phone } from "lucide-react"
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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerHeight(el.clientHeight || 600)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
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
    const diffSeconds = Math.floor((now - start) / 1000)
    const hours = Math.floor(diffSeconds / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    const seconds = diffSeconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

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
    <div ref={containerRef} className="w-full h-full">
      <Map height={containerHeight} center={mapCenter} zoom={mapZoom} dprs={[1, 2]}>
        {activeTrips.map((trip) => {
          const locations = tripLocations[trip.id] || []
          const latestLocation = locations.length > 0 ? locations[locations.length - 1] : null
          const position: [number, number] = latestLocation
            ? [latestLocation.latitude, latestLocation.longitude]
            : [trip.start_latitude, trip.start_longitude]

          const isSelected = selectedTripId === trip.id

          const elements = [
            <Marker
              key={`marker-${trip.id}`}
              width={isSelected ? 60 : 50}
              anchor={position}
              onClick={() => onTripSelect(trip.id)}
            >
              <div
                className={`relative flex items-center justify-center transition-transform ${isSelected ? "scale-125" : "scale-100"
                  }`}
              >
                {/* Vehicle icon */}
                <div
                  className={`p-2 rounded-full shadow-lg border-2 ${isSelected ? "bg-primary border-primary-foreground" : "bg-green-500 border-white"
                    }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </div>
                {/* Speed badge */}
                {latestLocation && latestLocation.speed_kmh && latestLocation.speed_kmh > 0 && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow">
                    {latestLocation.speed_kmh.toFixed(0)}
                  </div>
                )}
              </div>
            </Marker>,
          ]

          if (isSelected) {
            elements.push(
              <Overlay key={`overlay-${trip.id}`} anchor={position} offset={[0, -70]}>
                <div className="bg-card border-2 border-primary rounded-lg shadow-xl p-4 min-w-[280px]">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base leading-none">{trip.driver.full_name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{trip.driver.phone_number}</p>
                          </div>
                          {trip.driver.imei && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3 text-muted-foreground"
                              >
                                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                                <path d="M12 18h.01" />
                              </svg>
                              <p className="text-[10px] text-muted-foreground">{trip.driver.imei}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500 shrink-0">
                        Activo
                      </Badge>
                    </div>

                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                            <circle cx="7" cy="17" r="2" />
                            <path d="M9 17h6" />
                            <circle cx="17" cy="17" r="2" />
                          </svg>
                          Vehículo:
                        </span>
                        <span className="font-semibold">{trip.vehicle_number}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Timer className="h-4 w-4" />
                          Duración:
                        </span>
                        <span className="font-semibold">{calculateDuration(trip.start_time)}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Gauge className="h-4 w-4" />
                          Velocidad actual:
                        </span>
                        <span className="font-semibold">{latestLocation?.speed_kmh?.toFixed(0) || 0} km/h</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Route className="h-4 w-4" />
                          Distancia:
                        </span>
                        <span className="font-semibold">
                          {trip.total_distance_km ? trip.total_distance_km.toFixed(2) : "0.00"} km
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Gauge className="h-4 w-4" />
                          Vel. máxima:
                        </span>
                        <span className="font-semibold">{trip.max_speed_kmh || 0} km/h</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      Inicio: {new Date(trip.start_time).toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>
              </Overlay>,
            )
          }

          return elements
        })}
      </Map>
    </div>
  )
}
