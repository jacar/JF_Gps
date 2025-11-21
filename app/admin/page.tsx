"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminMap } from "@/components/admin-map"
import { DriversPanel } from "@/components/drivers-panel"
import { createClient } from "@/lib/supabase/client"
import type { User, TripWithDriver } from "@/lib/types"

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null)
  const [showDriversPanel, setShowDriversPanel] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const userData = localStorage.getItem("gps_jf_user")

    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)

    if (parsedUser.role !== "admin") {
      router.push("/driver")
      return
    }

    setUser(parsedUser)
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("gps_jf_user")
    router.push("/")
  }

  const handleDriverSelect = (trip: TripWithDriver | null) => {
    setSelectedTrip(trip)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AdminSidebar onLogout={handleLogout} userName={user?.full_name} />

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        {/* Drivers Panel - Collapsible */}
        {showDriversPanel && (
          <div className="absolute top-4 left-72 z-40 w-96 max-h-[calc(100vh-2rem)] overflow-hidden">
            <DriversPanel
              onDriverSelect={handleDriverSelect}
              selectedTripId={selectedTrip?.id || null}
              onClose={() => setShowDriversPanel(false)}
            />
          </div>
        )}

        {/* Map - Full Screen */}
        <div className="flex-1 relative">
          <AdminMap
            selectedTripId={selectedTrip?.id || null}
            onTripSelect={(id) => {
              if (id) {
                // Find the trip and set it as selected
                // This will be handled by the map component
              }
            }}
          />
        </div>

        {/* Toggle Drivers Panel Button */}
        {!showDriversPanel && (
          <button
            onClick={() => setShowDriversPanel(true)}
            className="absolute top-4 left-72 z-40 bg-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Mostrar Conductores
          </button>
        )}
      </div>
    </div>
  )
}
