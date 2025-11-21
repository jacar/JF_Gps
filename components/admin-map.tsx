"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getTripLocations } from "@/app/actions"
import type { Trip, TripLocation, User } from "@/lib/types"
import dynamic from "next/dynamic"

const DynamicMap = dynamic(() => import("./map-wrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-muted flex items-center justify-center">
      <p className="text-muted-foreground">Cargando mapa...</p>
    </div>
  ),
})

interface TripWithDriver extends Trip {
  driver: User
}

interface AdminMapProps {
  selectedTripId: string | null
  onTripSelect: (tripId: string | null) => void
}

export function AdminMap({ selectedTripId, onTripSelect }: AdminMapProps) {
  const [activeTrips, setActiveTrips] = useState<TripWithDriver[]>([])
  const [tripLocations, setTripLocations] = useState<Record<string, TripLocation[]>>({})
  const supabase = createClient()

  useEffect(() => {
    fetchActiveTrips()

    const channel = supabase
      .channel("trips-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        fetchActiveTrips()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trip_locations" }, (payload) => {
        const newLocation = payload.new as TripLocation
        setTripLocations((prev) => ({
          ...prev,
          [newLocation.trip_id]: [...(prev[newLocation.trip_id] || []), newLocation],
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchActiveTrips = async () => {
    const { data } = await supabase
      .from("trips")
      .select(`
        *,
        driver:users(*)
      `)
      .eq("status", "active")

    if (data) {
      setActiveTrips(data as TripWithDriver[])

      // Fetch locations for each trip
      data.forEach(async (trip) => {
        const locations = await getTripLocations(trip.id)
        setTripLocations((prev) => ({
          ...prev,
          [trip.id]: locations,
        }))
      })
    }
  }

  return (
    <div className="absolute inset-0">
      <DynamicMap
        activeTrips={activeTrips}
        tripLocations={tripLocations}
        selectedTripId={selectedTripId}
        onTripSelect={onTripSelect}
      />
    </div>
  )
}
