"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Clock, Route, Gauge, Calendar } from "lucide-react"
import type { Trip, User } from "@/lib/types"

interface TripWithDriver extends Trip {
  driver: User
}

export function TripsList() {
  const [completedTrips, setCompletedTrips] = useState<TripWithDriver[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchCompletedTrips()

    const channel = supabase
      .channel("completed-trips")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        fetchCompletedTrips()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCompletedTrips = async () => {
    const { data } = await supabase
      .from("trips")
      .select(`
        *,
        driver:users(*)
      `)
      .eq("status", "completed")
      .order("start_time", { ascending: false })
      .limit(20)

    if (data) {
      setCompletedTrips(data as TripWithDriver[])
    }
  }

  const formatDuration = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(diffSeconds / 3600)
    const minutes = Math.floor((diffSeconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Historial de Viajes</span>
          <Badge variant="secondary">{completedTrips.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {completedTrips.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No hay viajes completados</p>
        ) : (
          <div className="space-y-3">
            {completedTrips.map((trip) => (
              <div key={trip.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{trip.driver.full_name}</p>
                    <p className="text-sm text-muted-foreground">Vehículo: {trip.vehicle_number}</p>
                  </div>
                  <Badge variant="outline">Completado</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duración</p>
                      <p className="font-medium">
                        {trip.end_time ? formatDuration(trip.start_time, trip.end_time) : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Distancia</p>
                      <p className="font-medium">{trip.total_distance_km.toFixed(2)} km</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vel. Máx</p>
                      <p className="font-medium">{trip.max_speed_kmh.toFixed(0)} km/h</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vel. Prom</p>
                      <p className="font-medium">{trip.average_speed_kmh.toFixed(0)} km/h</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(trip.start_time).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
