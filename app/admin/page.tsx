"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminMap } from "@/components/admin-map"
import { DriversPanel } from "@/components/drivers-panel"
import { createClient } from "@/lib/supabase/client"
import type { User, TripWithDriver } from "@/lib/types"
import { Menu } from "lucide-react"

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null)
  const [showDriversPanel, setShowDriversPanel] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
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
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 ease-in-out ${showSidebar ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <AdminSidebar onLogout={handleLogout} userName={user?.full_name} onClose={() => setShowSidebar(false)} />
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden md:ml-64">
        {/* Toggle Sidebar Button for mobile */}
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-40 bg-white shadow-lg rounded-lg p-2 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Drivers Panel - Collapsible */}
        {showDriversPanel && (
          <div className="fixed inset-x-0 bottom-0 z-40 w-full max-h-[50vh] overflow-y-auto bg-background p-4 md:relative md:top-auto md:left-auto md:w-96 md:h-full md:overflow-y-auto md:bg-transparent md:p-0">
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
            className="fixed bottom-4 right-4 z-40 bg-white shadow-lg rounded-full p-3 text-sm font-medium hover:bg-gray-50 transition-colors md:absolute md:top-4 md:left-4 md:rounded-lg md:px-4 md:py-2"
          >
            Mostrar Conductores
          </button>
        )}
      </div>
    </div>
  )
}
