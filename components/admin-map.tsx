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

    // Use a unique channel name to avoid conflicts during Fast Refresh
    const channelId = `trips-changes-${Date.now()}`
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        fetchActiveTrips()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trip_locations" }, (payload: any) => {
        const newLocation = payload.new as TripLocation
        setTripLocations((prev) => ({
          ...prev,
          [newLocation.trip_id]: [...(prev[newLocation.trip_id] || []), newLocation],
        }))
      })
      .subscribe((status: string, err?: Error) => {
        if (status === "SUBSCRIBED") {
          console.log(`Supabase channel ${channelId} subscribed successfully!`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`Supabase channel ${channelId} error:`, err);
        } else if (status === "TIMED_OUT") {
          console.error(`Supabase channel ${channelId} timed out:`, err);
        }
      })

    return () => {
      console.log(`Cleaning up channel ${channelId}`);
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchActiveTrips = async () => {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        *,
        driver:users(*)
      `)
      .eq("status", "active")

    if (error) {
      console.error("Error fetching active trips:", error)
      return
    }

    if (data) {
      console.log('📊 Active trips fetched:', data.length, 'trips:', data.map((t: any) => ({ vehicle: t.vehicle_number, driver: t.driver?.full_name, lat: t.start_latitude, lng: t.start_longitude })))
      setActiveTrips(data as TripWithDriver[])

      // Fetch locations for each trip
      data.forEach(async (trip: any) => {
        const locations = await getTripLocations(trip.id)
        console.log(`📍 Locations for ${trip.vehicle_number}:`, locations.length, 'points')
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
