"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminMap } from "@/components/admin-map"
import { DriversPanel } from "@/components/drivers-panel"
import { createClient } from "@/lib/supabase/client"
import type { User, TripWithDriver } from "@/lib/types"
import { Menu } from "lucide-react"
import { AdminCameraViewer } from "@/components/admin-camera-viewer"

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<TripWithDriver | null>(null)
  const [showDriversPanel, setShowDriversPanel] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showCameraViewer, setShowCameraViewer] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

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
      <div className={`fixed inset-y-0 left-0 z-50 bg-card border-r transition-transform duration-300 ease-in-out ${showSidebar ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 ${isSidebarCollapsed ? "md:w-16" : "md:w-64"}`}>
        <AdminSidebar onLogout={handleLogout} userName={user?.full_name} onClose={() => setShowSidebar(false)} isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setShowSidebar(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col md:flex-row h-screen overflow-hidden ${isSidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        {/* Toggle Sidebar Button for mobile */}
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-40 bg-red-700 text-white shadow-lg rounded-lg p-2 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        {/* Toggle Camera Viewer Button */}
        <button
          onClick={() => setShowCameraViewer(!showCameraViewer)}
          className="absolute top-4 left-16 z-40 bg-blue-600 text-white shadow-lg rounded-lg px-3 py-1 md:hidden"
        >
          {showCameraViewer ? "Ocultar Cámara" : "Ver Cámara"}
        </button>

        {/* Map - Full Screen */}
        <div className="flex-1 relative h-full">
          {/* Drivers Panel - Collapsible */}
          {showDriversPanel && (
            <div className="absolute top-0 left-0 z-40 h-full w-full md:w-80 bg-white/90 backdrop-blur-sm shadow-xl transition-all duration-300 overflow-y-auto">
              <DriversPanel
                onDriverSelect={handleDriverSelect}
                selectedTripId={selectedTrip?.id || null}
                onClose={() => setShowDriversPanel(false)}
              />
            </div>
          )}
          <AdminMap
            selectedTripId={selectedTrip?.id || null}
            onTripSelect={(id) => {
              if (id) {
                // Find the trip and set it as selected
                // This will be handled by the map component
              }
            }}
          />
          {/* Admin Camera Viewer */}
          {showCameraViewer && user && (
            <div className="absolute inset-0 z-50 bg-black/70 p-4">
              <AdminCameraViewer adminUser={user} />
              <button
                onClick={() => setShowCameraViewer(false)}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded"
              >
                Cerrar Cámara
              </button>
            </div>
          )}
        </div>

        {/* Toggle Drivers Panel Button */}
        {!showDriversPanel && (
          <button
            onClick={() => setShowDriversPanel(true)}
            className="fixed top-4 right-4 z-40 bg-red-700 hover:bg-red-800 text-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium md:absolute md:top-4 md:left-4"
          >
            Mostrar Conductores
          </button>
        )}
      </div>
    </div>
  )
}
