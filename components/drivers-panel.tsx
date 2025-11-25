"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Car, Timer, Gauge, MapPin, UserIcon, Smartphone, X } from "lucide-react"
import type { User, TripWithDriver, TripLocation, Trip } from "@/lib/types"

interface DriversPanelProps {
  onDriverSelect: (trip: TripWithDriver | null) => void
  selectedTripId: string | null
  onClose?: () => void
}

export function DriversPanel({ onDriverSelect, selectedTripId, onClose }: DriversPanelProps) {
  const [activeDrivers, setActiveDrivers] = useState<TripWithDriver[]>([])

  const [latestLocations, setLatestLocations] = useState<Record<string, TripLocation>>({})
  const [tripDurations, setTripDurations] = useState<Record<string, string>>({})
  const [lastTrips, setLastTrips] = useState<Record<string, Trip>>({})
  const supabase = createClient()

  const activeDriversRef = useRef<TripWithDriver[]>([])

  useEffect(() => {
    activeDriversRef.current = activeDrivers
  }, [activeDrivers])

  useEffect(() => {
    fetchDrivers()

    const tripsChannel = supabase
      .channel("drivers-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        fetchDrivers()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trip_locations" }, (payload: any) => {
        const newLocation = payload.new as TripLocation
        setLatestLocations((prev) => ({
          ...prev,
          [newLocation.trip_id]: newLocation,
        }))
      })
      .subscribe()

    // Update durations every second
    const durationInterval = setInterval(() => {
      updateDurations()
    }, 1000)

    return () => {
      supabase.removeChannel(tripsChannel)
      clearInterval(durationInterval)
    }
  }, [])

  const fetchDrivers = async () => {
    setLatestLocations({})
    setTripDurations({})
    // Fetch active trips with driver info
    const { data: activeTrips } = await supabase
      .from("trips")
      .select(`
        *,
        driver:users(*)
      `)
      .eq("status", "active")
      .order("start_time", { ascending: false })

    if (activeTrips) {
      setActiveDrivers(activeTrips as TripWithDriver[])

      // Fetch latest location for each active trip
      const locationPromises = activeTrips.map(async (trip: any) => {
        const { data: locations } = await supabase
          .from("trip_locations")
          .select("*")
          .eq("trip_id", trip.id)
          .order("timestamp", { ascending: false })
          .limit(1)
        return { tripId: trip.id, location: locations && locations.length > 0 ? locations[0] : null }
      })

      const fetchedLocations = await Promise.all(locationPromises)
      const newLatestLocations: Record<string, TripLocation> = {}
      fetchedLocations.forEach(({ tripId, location }) => {
        if (location) {
          newLatestLocations[tripId] = location
        }
      })
      setLatestLocations(newLatestLocations)
    }


  }

  const updateDurations = () => {
    const newDurations: Record<string, string> = {}
    activeDriversRef.current.forEach((trip) => {
      newDurations[trip.id] = calculateDuration(trip.start_time)
    })
    setTripDurations(newDurations)
  }

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

  const formatTripDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(diffSeconds / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conductores</CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 flex flex-col h-full">
        <Tabs defaultValue="active" className="w-full flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-1 rounded-none border-b">
            <TabsTrigger value="active" className="relative">
              Activos
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1">
                {activeDrivers.length}
              </Badge>
            </TabsTrigger>

          </TabsList>

          <TabsContent value="active" className="m-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              {activeDrivers.length === 0 ? (
                <div className="p-6 text-center">
                  <Car className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hay conductores activos</p>
                </div>
              ) : (
                <div className="p-2 sm:p-4 space-y-2">
                  {activeDrivers.map((trip) => {
                    const latestLocation = latestLocations[trip.id]
                    const isSelected = selectedTripId === trip.id

                    return (
                      <Button
                        key={trip.id}
                        variant={isSelected ? "secondary" : "outline"}
                        className="w-full h-auto p-2 sm:p-3 justify-start hover:bg-red-100"
                        onClick={() => onDriverSelect(isSelected ? null : trip)}
                      >
                        <div className="flex-1 text-left space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="p-1 sm:p-1.5 bg-green-500/10 rounded">
                                <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                              </div>
                              <div>
                                <p className="font-medium text-xs sm:text-sm leading-none text-red-700">{trip.driver.full_name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{trip.vehicle_number}</p>
                                {trip.driver.imei && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Smartphone className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{trip.driver.imei}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-500 text-[10px] sm:text-xs px-1.5 sm:px-2">
                              En ruta
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs">
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <Timer className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{tripDurations[trip.id] || "00:00:00"}</span>
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <Gauge className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {latestLocation?.speed_kmh?.toFixed(0) || 0} km/h
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 sm:gap-1">
                              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {trip.total_distance_km ? trip.total_distance_km.toFixed(1) : "0.0"} km
                              </span>
                            </div>
                          </div>
                        </div>
                      </Button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>


        </Tabs>
      </CardContent>
    </Card>
  )
}
