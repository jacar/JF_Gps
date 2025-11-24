"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Map, Marker, Overlay } from "pigeon-maps"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Truck, MapPin, Navigation, Clock, Calendar, Menu, Route, List, X, Zap } from "lucide-react"

interface VehicleLocation {
    id: string
    vehicle_number: string
    driver_name: string
    latitude: number
    longitude: number
    speed: number
    status: "moving" | "stopped" | "idle" | "offline"
    last_update: string
    // Vehicle details
    brand?: string
    model?: string
    plate?: string
    color?: string
    motion_detected?: boolean
    last_motion_update?: string
}

export default function VehiclesMapPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState<VehicleLocation[]>([])
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [mapCenter, setMapCenter] = useState<[number, number]>([4.6097, -74.0817]) // Bogotá
    const [mapZoom, setMapZoom] = useState(13)
    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [trackingLocation, setTrackingLocation] = useState(false)
    const [showSidebar, setShowSidebar] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed)
    }

    const [activeRoutes, setActiveRoutes] = useState<any[]>([
        { driverName: "Juan P", estimatedTime: "1h 00m", imageUrl: "/path/to/juan.png" }, // Placeholder
        { driverName: "Maria S.", estimatedTime: "1h 05m", imageUrl: "/path/to/maria.png" }, // Placeholder
    ]);
    const [currentRoute, setCurrentRoute] = useState<{ origin: string; destination: string } | null>({
        origin: "Caracas",
        destination: "Maracaibo",
    });
    const [currentTime, setCurrentTime] = useState(new Date());
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

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

    // Track admin's current location
    useEffect(() => {
        if (!navigator.geolocation) {
            console.warn("Geolocation not supported")
            return
        }

        setTrackingLocation(true)

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setMyLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                })
                setTrackingLocation(false)
            },
            (error) => {
                console.error("Error getting location:", error)
                setTrackingLocation(false)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        )

        return () => {
            navigator.geolocation.clearWatch(watchId)
        }
    }, [])

    useEffect(() => {
        if (selectedVehicle) {
            setMapCenter([selectedVehicle.latitude, selectedVehicle.longitude])
            setMapZoom(15)
        }
    }, [selectedVehicle])

    const loadVehicles = async () => {
        try {
            // 1. Fetch active trips
            const { data: tripsData, error: tripsError } = await supabase
                .from("trips")
                .select(`
                    *,
                    driver:users(full_name)
                `)
                .eq("status", "active")

            if (tripsError) throw tripsError

            // 2. Fetch all vehicles to get latest location and motion sensor data
            const { data: vehiclesData, error: vehiclesError } = await supabase
                .from("vehicles")
                .select("*")

            if (vehiclesError) throw vehiclesError

            // 3. Merge data
            const mappedVehicles: VehicleLocation[] = (tripsData || []).map((trip: any) => {
                const vehicle = vehiclesData?.find((v: any) => v.vehicle_number === trip.vehicle_number)

                // Use vehicle location if available, otherwise trip start location
                const lat = vehicle?.last_latitude || trip.start_latitude || 0
                const lng = vehicle?.last_longitude || trip.start_longitude || 0
                const speed = vehicle?.current_speed || 0
                const lastUpdate = vehicle?.last_position_update || trip.created_at

                // Calculate status based on motion sensor and speed
                // Priority: motion_detected > speed > default stopped
                let status: "moving" | "stopped" | "idle" = "stopped"

                if (vehicle?.motion_detected) {
                    // If motion sensor detects movement, it's moving
                    status = "moving"
                } else if (speed >= 1) {
                    // Fallback to speed if motion sensor not available
                    status = "moving"
                }

                // Check for offline status (no update > 20 mins)
                const lastUpdateDate = new Date(lastUpdate)
                const now = new Date()
                const minutesSinceUpdate = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60)

                if (minutesSinceUpdate > 20) {
                    status = "offline"
                }
                // else stopped

                return {
                    id: trip.id,
                    vehicle_number: trip.vehicle_number,
                    driver_name: trip.driver?.full_name || "Conductor",
                    latitude: lat,
                    longitude: lng,
                    speed: Math.round(speed),
                    status: status,
                    last_update: lastUpdate,
                    // Vehicle details
                    brand: vehicle?.brand,
                    model: vehicle?.model,
                    plate: vehicle?.plate,
                    color: vehicle?.color,
                    motion_detected: vehicle?.motion_detected,
                    last_motion_update: vehicle?.last_motion_update,
                }
            }).filter((v: VehicleLocation) => v.latitude !== 0 && v.longitude !== 0)

            setVehicles(mappedVehicles)

            // Center map on vehicles if available
            if (mappedVehicles.length > 0) {
                const validLocations = mappedVehicles.filter(v => v.latitude !== 0 && v.longitude !== 0)
                if (validLocations.length > 0) {
                    const avgLat = validLocations.reduce((sum, v) => sum + v.latitude, 0) / validLocations.length
                    const avgLng = validLocations.reduce((sum, v) => sum + v.longitude, 0) / validLocations.length
                    setMapCenter([avgLat, avgLng])
                    setMapZoom(validLocations.length === 1 ? 15 : 12)
                }
            }
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
        offline: vehicles.filter((v) => v.status === "offline").length,
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
            {/* Mobile sidebar overlay */}
            {showSidebar && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setShowSidebar(false)}
                ></div>
            )}

            {/* Admin Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${showSidebar ? "translate-x-0" : "-translate-x-full"}
                md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}
            >
                <AdminSidebar
                    onLogout={handleLogout}
                    userName={user?.full_name}
                    onClose={() => setShowSidebar(false)}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={toggleSidebar}
                />
            </div>

            <div className={`flex-1 ml-0 md:${isSidebarCollapsed ? "ml-16" : "ml-64"} flex flex-col h-screen overflow-hidden`}>
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="mr-2 md:hidden"
                                onClick={() => setShowSidebar(true)}
                            >
                                <Menu className="h-6 w-6" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Mapa de Vehículos</h1>
                                <p className="text-sm text-gray-500 mt-1">Ubicación en tiempo real de la flota</p>
                            </div>
                        </div>
                        {/* Ruta Activa Info */}
                        <div className="mt-4 flex items-center gap-4">
                            {currentRoute && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Navigation className="h-4 w-4 text-blue-500" />
                                    <span>
                                        <span className="font-medium">{currentRoute.origin}</span> a <span className="font-medium">{currentRoute.destination}</span>
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                            </div>
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
                                    <p className="text-xs text-green-600 font-medium">En Ruta</p>
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
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Sin Señal</p>
                                    <p className="text-xl font-bold text-gray-900 mt-1">{stats.offline}</p>
                                </div>
                                <Zap className="h-6 w-6 text-gray-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map and Panel Container */}
                <div className="flex-1 relative overflow-hidden">


                    {/* Center on My Location Button */}
                    {myLocation && (
                        <button
                            onClick={() => {
                                setMapCenter([myLocation.lat, myLocation.lng])
                                setMapZoom(15)
                            }}
                            className="absolute top-4 right-4 z-40 bg-blue-600 text-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                            title="Centrar en mi ubicación"
                        >
                            <MapPin className="h-4 w-4" />
                            Mi Ubicación
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
                            onClick={() => setSelectedVehicle(null)}
                        >
                            {filteredVehicles.map((vehicle) => (
                                <Marker
                                    key={vehicle.id}
                                    width={60}
                                    anchor={[vehicle.latitude, vehicle.longitude]}
                                    onClick={({ event }) => {
                                        event.stopPropagation()
                                        setSelectedVehicle(vehicle)
                                    }}
                                >
                                    <div className="relative flex items-center justify-center cursor-pointer">
                                        <img
                                            src={vehicle.status === "moving" ? "/carro_g_n.png" : (vehicle.status === "offline" ? "/carro_r_s.png" : "/carro_r_s.png")}
                                            alt="Vehicle"
                                            className={`w-12 h-12 object-contain ${selectedVehicle?.id === vehicle.id ? "drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" : ""} ${vehicle.status === "offline" ? "opacity-50 grayscale" : ""}`}
                                        />
                                    </div>
                                </Marker>
                            ))}

                            {/* My Location Marker */}
                            {myLocation && (
                                <Marker
                                    width={50}
                                    anchor={[myLocation.lat, myLocation.lng]}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl bg-blue-600 ring-4 ring-blue-200 ring-opacity-50 animate-pulse">
                                            <MapPin className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                </Marker>
                            )}

                            {selectedVehicle && (
                                <Overlay anchor={[selectedVehicle.latitude, selectedVehicle.longitude]} offset={[0, -70]}>
                                    <div className="bg-white rounded-lg shadow-2xl border border-gray-300 p-4 min-w-[280px] max-w-[320px] relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedVehicle(null)
                                            }}
                                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 z-10"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        {/* Header */}
                                        <div className="border-b border-gray-200 pb-3 mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-lg text-gray-900">{selectedVehicle.vehicle_number}</h3>
                                                <span
                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedVehicle.status === "moving"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                        }`}
                                                >
                                                    {selectedVehicle.status === "moving" ? "En ruta" : (selectedVehicle.status === "offline" ? "Sin señal" : "Detenido")}
                                                </span>
                                            </div>
                                            {(selectedVehicle.brand || selectedVehicle.model) && (
                                                <p className="text-sm text-gray-600">
                                                    {selectedVehicle.brand} {selectedVehicle.model}
                                                    {selectedVehicle.color && ` • ${selectedVehicle.color}`}
                                                </p>
                                            )}
                                            {selectedVehicle.plate && (
                                                <p className="text-xs text-gray-500 mt-1">Placa: {selectedVehicle.plate}</p>
                                            )}
                                        </div>

                                        {/* Driver Info */}
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-500 mb-1">Conductor</p>
                                            <p className="text-sm font-medium text-gray-900">{selectedVehicle.driver_name}</p>
                                        </div>

                                        {/* Vehicle Stats */}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-blue-50 rounded p-2">
                                                <p className="text-xs text-blue-600 mb-1">Velocidad</p>
                                                <p className="text-lg font-bold text-blue-900">{selectedVehicle.speed} <span className="text-xs">km/h</span></p>
                                            </div>
                                            <div className={`rounded p-2 ${selectedVehicle.motion_detected ? "bg-green-50" : "bg-gray-50"}`}>
                                                <p className={`text-xs mb-1 ${selectedVehicle.motion_detected ? "text-green-600" : "text-gray-600"}`}>Sensor</p>
                                                <p className={`text-sm font-bold ${selectedVehicle.motion_detected ? "text-green-900" : "text-gray-900"}`}>
                                                    {selectedVehicle.motion_detected ? "Movimiento" : "Detenido"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Last Update */}
                                        <div className="text-xs text-gray-500 mb-3">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Actualizado: {new Date(selectedVehicle.last_update).toLocaleString("es-ES", {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}</span>
                                            </div>
                                            {selectedVehicle.last_motion_update && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Navigation className="h-3 w-3" />
                                                    <span>Sensor: {new Date(selectedVehicle.last_motion_update).toLocaleString("es-ES", {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <Button
                                            size="sm"
                                            className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8f]"
                                            onClick={() => router.push(`/admin/vehicles?id=${selectedVehicle.id}`)}
                                        >
                                            Ver Historial Completo
                                        </Button>

                                        {/* End Trip Button for Offline/Stopped */}
                                        {(selectedVehicle.status === "offline" || selectedVehicle.status === "stopped") && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="w-full mt-2"
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    if (confirm("¿Finalizar este viaje manualmente?")) {
                                                        try {
                                                            const { endTrip } = await import("@/app/actions")
                                                            // We use 0 values as we don't have better data, or could use vehicle last known
                                                            await endTrip(selectedVehicle.id, selectedVehicle.latitude, selectedVehicle.longitude, 0, 0, 0)
                                                            alert("Viaje finalizado.")
                                                            setSelectedVehicle(null)
                                                            loadVehicles()
                                                        } catch (err) {
                                                            console.error(err)
                                                            alert("Error al finalizar viaje.")
                                                        }
                                                    }
                                                }}
                                            >
                                                Finalizar Viaje
                                            </Button>
                                        )}

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
