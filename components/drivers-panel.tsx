"use client"

import { useEffect, useState } from "react"
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
  const [inactiveDrivers, setInactiveDrivers] = useState<User[]>([])
  const [latestLocations, setLatestLocations] = useState<Record<string, TripLocation>>({})
  const [tripDurations, setTripDurations] = useState<Record<string, string>>({})
  const [lastTrips, setLastTrips] = useState<Record<string, Trip>>({})
  const supabase = createClient()

  useEffect(() => {
    fetchDrivers()

    const tripsChannel = supabase
      .channel("drivers-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        fetchDrivers()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trip_locations" }, (payload) => {
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
      activeTrips.forEach(async (trip) => {
        const { data: locations } = await supabase
          .from("trip_locations")
          .select("*")
          .eq("trip_id", trip.id)
          .order("timestamp", { ascending: false })
          .limit(1)

        if (locations && locations.length > 0) {
          setLatestLocations((prev) => ({
            ...prev,
            [trip.id]: locations[0],
          }))
        }
      })
    }

    // Fetch all drivers and filter inactive ones
    const { data: allDrivers } = await supabase
      .from("users")
      .select("*")
      .eq("role", "driver")
      .order("full_name", { ascending: true })

    if (allDrivers && activeTrips) {
      const activeDriverIds = new Set(activeTrips.map((t) => t.driver_id))
      const inactive = allDrivers.filter((d) => !activeDriverIds.has(d.id))
      setInactiveDrivers(inactive)
    }

    // Fetch recent completed trips to show stats for inactive drivers
    const { data: recentTrips } = await supabase
      .from("trips")
      .select("*")
      .eq("status", "completed")
      .order("end_time", { ascending: false })
      .limit(50)

    if (recentTrips) {
      const lastTripsMap: Record<string, Trip> = {}
      recentTrips.forEach((trip) => {
        if (!lastTripsMap[trip.driver_id]) {
          lastTripsMap[trip.driver_id] = trip as Trip
        }
      })
      setLastTrips(lastTripsMap)
    }
  }

  const updateDurations = () => {
    const newDurations: Record<string, string> = {}
    activeDrivers.forEach((trip) => {
      newDurations[trip.id] = calculateDuration(trip.start_time)
    })
    setTripDurations(newDurations)
  }

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime).getTime()
    const now = Date.now()
    const diffSeconds = Math.floor((now - start) / 1000)
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
      <CardContent className="p-0">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="active" className="relative">
              Activos
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1">
                {activeDrivers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="relative">
              Inactivos
              <Badge variant="outline" className="ml-2 h-5 min-w-[20px] px-1">
                {inactiveDrivers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="m-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {activeDrivers.length === 0 ? (
                <div className="p-6 text-center">
                  <Car className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hay conductores activos</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {activeDrivers.map((trip) => {
                    const latestLocation = latestLocations[trip.id]
                    const isSelected = selectedTripId === trip.id

                    return (
                      <Button
                        key={trip.id}
                        variant={isSelected ? "secondary" : "ghost"}
                        className="w-full h-auto p-3 justify-start hover:bg-accent"
                        onClick={() => onDriverSelect(isSelected ? null : trip)}
                      >
                        <div className="flex-1 text-left space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-green-500/10 rounded">
                                <Car className="h-4 w-4 text-green-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm leading-none">{trip.driver.full_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{trip.vehicle_number}</p>
                                {trip.driver.imei && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Smartphone className="h-3 w-3 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground">{trip.driver.imei}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="default" className="bg-green-500 text-xs">
                              En ruta
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{tripDurations[trip.id] || "00:00:00"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Gauge className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {latestLocation?.speed_kmh?.toFixed(0) || 0} km/h
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
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

          <TabsContent value="inactive" className="m-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {inactiveDrivers.length === 0 ? (
                <div className="p-6 text-center">
                  <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Todos los conductores están activos</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {inactiveDrivers.map((driver) => {
                    const lastTrip = lastTrips[driver.id]
                    return (
                      <div key={driver.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-muted rounded">
                              <Car className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{driver.full_name}</p>
                              <p className="text-xs text-muted-foreground">{driver.vehicle_number || "Sin vehículo"}</p>
                              {driver.imei && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Smartphone className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-[10px] text-muted-foreground">{driver.imei}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Inactivo
                          </Badge>
                        </div>
                        {lastTrip && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {lastTrip.end_time ? formatTripDuration(lastTrip.start_time, lastTrip.end_time) : "--"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {lastTrip.total_distance_km.toFixed(1)} km
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
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
