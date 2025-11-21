"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Map, Marker, Overlay } from "pigeon-maps"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Truck, MapPin, Navigation, Layers } from "lucide-react"

interface VehicleLocation {
    id: string
    vehicle_number: string
    driver_name: string
    latitude: number
    longitude: number
    speed: number
    status: "moving" | "stopped" | "idle"
    last_update: string
}

export default function VehiclesMapPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState<VehicleLocation[]>([])
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [showPanel, setShowPanel] = useState(true)
    const [mapCenter, setMapCenter] = useState<[number, number]>([-12.0464, -77.0428])
    const [mapZoom, setMapZoom] = useState(13)
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
        loadVehicles()

        // Simulate real-time updates
        const interval = setInterval(() => {
            loadVehicles()
        }, 10000)

        return () => clearInterval(interval)
    }, [router])

    useEffect(() => {
        if (selectedVehicle) {
            setMapCenter([selectedVehicle.latitude, selectedVehicle.longitude])
            setMapZoom(15)
        }
    }, [selectedVehicle])

    const loadVehicles = async () => {
        try {
            const { data: vehiclesData, error } = await supabase
                .from("vehicles")
                .select(`
                    *,
                    driver:users!vehicles_current_driver_id_fkey(full_name)
                `)
                .eq("status", "active")

            if (error) throw error

            const mappedVehicles: VehicleLocation[] = vehiclesData.map((v: any) => {
                // Determinar estado basado en velocidad
                let status: "moving" | "stopped" | "idle" = "stopped"
                if (v.current_speed > 5) status = "moving"
                else if (v.current_speed > 0) status = "idle"

                return {
                    id: v.id,
                    vehicle_number: v.vehicle_number,
                    driver_name: v.driver?.full_name || "Sin conductor",
                    latitude: v.last_latitude || 0,
                    longitude: v.last_longitude || 0,
                    speed: Math.round(v.current_speed || 0),
                    status: status,
                    last_update: v.last_position_update || v.updated_at,
                }
            }).filter((v: VehicleLocation) => v.latitude !== 0 && v.longitude !== 0)

            setVehicles(mappedVehicles)
        } catch (error) {
            console.error("Error loading vehicles:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredVehicles = vehicles.filter(
        (vehicle) =>
            vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.driver_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const stats = {
        total: vehicles.length,
        moving: vehicles.filter((v) => v.status === "moving").length,
        stopped: vehicles.filter((v) => v.status === "stopped").length,
        idle: vehicles.filter((v) => v.status === "idle").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando mapa de vehículos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <AdminSidebar onLogout={handleLogout} userName={user?.full_name} />

            <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Mapa de Vehículos</h1>
                            <p className="text-sm text-gray-500 mt-1">Ubicación en tiempo real de la flota</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-700">En vivo</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-600 font-medium">Total</p>
                                    <p className="text-xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <Truck className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-green-600 font-medium">En Movimiento</p>
                                    <p className="text-xl font-bold text-green-900 mt-1">{stats.moving}</p>
                                </div>
                                <Navigation className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-red-600 font-medium">Detenidos</p>
                                    <p className="text-xl font-bold text-red-900 mt-1">{stats.stopped}</p>
                                </div>
                                <MapPin className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-orange-600 font-medium">Ralentí</p>
                                    <p className="text-xl font-bold text-orange-900 mt-1">{stats.idle}</p>
                                </div>
                                <Truck className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map and Panel Container */}
                <div className="flex-1 relative overflow-hidden">
                    {/* Vehicles Panel */}
                    {showPanel && (
                        <div className="absolute top-4 left-4 z-40 w-80 max-h-[calc(100vh-250px)] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-900">Vehículos Activos</h3>
                                    <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600">
                                        ✕
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar vehículo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-9"
                                    />
                                </div>
                            </div>

                            <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
                                {filteredVehicles.map((vehicle) => (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => setSelectedVehicle(vehicle)}
                                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedVehicle?.id === vehicle.id ? "bg-blue-50" : ""
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-3 h-3 rounded-full ${vehicle.status === "moving"
                                                        ? "bg-green-500 animate-pulse"
                                                        : vehicle.status === "stopped"
                                                            ? "bg-red-500"
                                                            : "bg-orange-500"
                                                        }`}
                                                ></div>
                                                <span className="font-semibold text-gray-900">{vehicle.vehicle_number}</span>
                                            </div>
                                            <span
                                                className={`px-2 py-1 text-xs font-semibold rounded-full ${vehicle.status === "moving"
                                                    ? "bg-green-100 text-green-800"
                                                    : vehicle.status === "stopped"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-orange-100 text-orange-800"
                                                    }`}
                                            >
                                                {vehicle.status === "moving"
                                                    ? "En movimiento"
                                                    : vehicle.status === "stopped"
                                                        ? "Detenido"
                                                        : "Ralentí"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">{vehicle.driver_name}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Navigation className="h-3 w-3" />
                                                {vehicle.speed} km/h
                                            </span>
                                            <span>{new Date(vehicle.last_update).toLocaleTimeString("es-ES")}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Toggle Panel Button */}
                    {!showPanel && (
                        <button
                            onClick={() => setShowPanel(true)}
                            className="absolute top-4 left-4 z-40 bg-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Layers className="h-4 w-4" />
                            Mostrar Vehículos
                        </button>
                    )}

                    {/* Map */}
                    <div className="w-full h-full">
                        <Map
                            height={800}
                            center={mapCenter}
                            zoom={mapZoom}
                            onBoundsChanged={({ center, zoom }) => {
                                setMapCenter(center)
                                setMapZoom(zoom)
                            }}
                        >
                            {filteredVehicles.map((vehicle) => (
                                <Marker
                                    key={vehicle.id}
                                    width={50}
                                    anchor={[vehicle.latitude, vehicle.longitude]}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer ${vehicle.status === "moving"
                                                ? "bg-green-500 animate-pulse"
                                                : vehicle.status === "stopped"
                                                    ? "bg-red-500"
                                                    : "bg-orange-500"
                                                } ${selectedVehicle?.id === vehicle.id ? "ring-4 ring-blue-400" : ""}`}
                                        >
                                            <Truck className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </Marker>
                            ))}

                            {selectedVehicle && (
                                <Overlay anchor={[selectedVehicle.latitude, selectedVehicle.longitude]} offset={[0, -60]}>
                                    <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]">
                                        <div className="text-center">
                                            <p className="font-bold text-gray-900 mb-1">{selectedVehicle.vehicle_number}</p>
                                            <p className="text-sm text-gray-600 mb-2">{selectedVehicle.driver_name}</p>
                                            <div className="space-y-1 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Velocidad:</span>
                                                    <span className="font-medium text-gray-900">{selectedVehicle.speed} km/h</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Estado:</span>
                                                    <span
                                                        className={`font-medium ${selectedVehicle.status === "moving"
                                                            ? "text-green-600"
                                                            : selectedVehicle.status === "stopped"
                                                                ? "text-red-600"
                                                                : "text-orange-600"
                                                            }`}
                                                    >
                                                        {selectedVehicle.status === "moving"
                                                            ? "En movimiento"
                                                            : selectedVehicle.status === "stopped"
                                                                ? "Detenido"
                                                                : "Ralentí"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Actualizado:</span>
                                                    <span className="font-medium text-gray-900">
                                                        {new Date(selectedVehicle.last_update).toLocaleTimeString("es-ES")}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="w-full mt-3 bg-[#1e3a5f] hover:bg-[#2d5a8f]"
                                                onClick={() => router.push(`/admin?vehicle=${selectedVehicle.id}`)}
                                            >
                                                Ver Detalles
                                            </Button>
                                        </div>
                                        {/* Arrow */}
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
                                        </div>
                                    </div>
                                </Overlay>
                            )}
                        </Map>
                    </div>
                </div>
            </div>
        </div>
    )
}
