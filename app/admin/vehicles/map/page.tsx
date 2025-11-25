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
import { getTripLocations } from "@/app/actions"
// Custom Polyline component since it's not exported by pigeon-maps
const Polyline = ({ latLngToPixel, points, color = 'red', width = 3, ...props }: any) => {
    if (!points || points.length < 2) return null

    // pigeon-maps passes width and height of the map in props
    // but we can just use the overlay approach or absolute positioning
    // The props contain width and height of the map container

    const pixelPoints = points.map((p: any) => {
        const [x, y] = latLngToPixel(p)
        return `${x},${y}`
    }).join(' ')

    return (
        <svg
            width={props.width}
            height={props.height}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
            <polyline
                points={pixelPoints}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

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
    const [tripPath, setTripPath] = useState<Array<{ lat: number; lng: number }>>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [mapCenter, setMapCenter] = useState<[number, number]>([4.6097, -74.0817]) // Bogotá
    const [mapZoom, setMapZoom] = useState(13)
    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [trackingLocation, setTrackingLocation] = useState(false)
    const [showSidebar, setShowSidebar] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(false)

    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours()
            // Night mode from 6 PM (18) to 6 AM (6)
            setIsDarkMode(hour >= 18 || hour < 6)
        }

        checkTime()
        const interval = setInterval(checkTime, 60000) // Check every minute
        return () => clearInterval(interval)
    }, [])

    const mapProvider = (x: number, y: number, z: number, dpr?: number) => {
        return isDarkMode
            ? `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}${dpr && dpr >= 2 ? '@2x' : ''}.png`
            : `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
    }

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

    // Real-time subscription to vehicle updates
    useEffect(() => {
        const channel = supabase.channel('public:vehicles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload: any) => {
                console.log('Vehicle change payload:', payload)
                loadVehicles()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
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
        // Initial load of vehicles
        loadVehicles()
        // Simulate periodic refresh (optional, can rely on realtime)
        const interval = setInterval(() => {
            loadVehicles()
        }, 10000)

        // Start tracking admin location
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
            clearInterval(interval)
            navigator.geolocation.clearWatch(watchId)
        }
    }, [])

    useEffect(() => {
        if (selectedVehicle) {
            setMapCenter([selectedVehicle.latitude, selectedVehicle.longitude])
            setMapZoom(15)
            // Load route for selected vehicle
            getTripLocations(selectedVehicle.id).then((locs) => {
                console.log("Trip locations fetched:", locs.length)
                const path = locs.map((l: any) => ({ lat: l.latitude, lng: l.longitude }))
                setTripPath(path)
            }).catch((e) => console.error('Error loading trip locations:', e))
        } else {
            setTripPath([])
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
                let status: "moving" | "stopped" | "idle" | "offline" = "stopped"

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
            })
            setVehicles(mappedVehicles)
        } catch (error) {
            console.error("Error loading vehicles:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredVehicles = vehicles.filter(v =>
        v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.driver_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/")
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <div className={`z-50 ${showSidebar ? "block" : "hidden md:block"}`}>
                <AdminSidebar
                    onLogout={handleLogout}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={toggleSidebar}
                    onClose={() => setShowSidebar(false)}
                />
            </div>
            <div className="flex-1 relative overflow-hidden">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="bg-white shadow-md md:hidden"
                        onClick={() => setShowSidebar(true)}
                    >
                        <Menu className="h-4 w-4" />
                    </Button>
                    <div className="bg-white p-2 rounded-lg shadow-md flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar vehículo..."
                            className="h-8 w-48 border-none focus-visible:ring-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="secondary"
                        className="bg-white shadow-md"
                        onClick={() => {
                            if (myLocation) {
                                setMapCenter([myLocation.lat, myLocation.lng])
                                setMapZoom(15)
                            }
                        }}
                    >
                        <MapPin className="h-4 w-4 mr-2" />
                        Mi Ubicación
                    </Button>
                </div>

                <div className="w-full h-full">
                    <Map
                        provider={mapProvider}
                        height={800}
                        center={mapCenter}
                        zoom={mapZoom}
                        onBoundsChanged={({ center, zoom }) => {
                            setMapCenter(center)
                            setMapZoom(zoom)
                        }}
                        onClick={() => setSelectedVehicle(null)}
                    >
                        {/* Render route for selected vehicle */}
                        {
                            tripPath.length > 1 && (
                                <Polyline
                                    color="#ff0000"
                                    width={5}
                                    points={tripPath.map(p => [p.lat, p.lng])}
                                />
                            )
                        }

                        {
                            filteredVehicles.map((vehicle) => (
                                <Marker
                                    key={vehicle.id}
                                    width={20}
                                    anchor={[vehicle.latitude, vehicle.longitude]}
                                    onClick={({ event }) => {
                                        event.stopPropagation()
                                        setSelectedVehicle(vehicle)
                                    }}
                                >
                                    <div className="relative flex items-center justify-center cursor-pointer">
                                        {/* Pulsing background circle for moving vehicles */}
                                        {vehicle.status === "moving" && (
                                            <div className="absolute w-8 h-8 rounded-full bg-green-500/40 animate-pulse" />
                                        )}
                                        {/* Static background circle for stopped vehicles */}
                                        {vehicle.status !== "moving" && vehicle.status !== "offline" && (
                                            <div className="absolute w-8 h-8 rounded-full bg-red-500/20" />
                                        )}

                                        <img
                                            src={vehicle.status === "moving" ? "/carro_g_n.png" : (vehicle.status === "offline" ? "/carro_r_s.png" : "/carro_r_s.png")}
                                            alt="Vehicle"
                                            className={`w-5 h-5 object-contain relative z-10
                                                ${selectedVehicle?.id === vehicle.id ? "scale-125 transition-transform" : ""} 
                                                ${vehicle.status === "offline" ? "opacity-50 grayscale" : ""}
                                            `}
                                        />
                                    </div>
                                </Marker>
                            ))
                        }

                        {/* My Location Marker */}
                        {
                            myLocation && (
                                <Marker
                                    anchor={[myLocation.lat, myLocation.lng]}
                                    width={30}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-xl bg-blue-600 ring-4 ring-blue-200 ring-opacity-50 animate-pulse">
                                            <MapPin className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                </Marker>
                            )
                        }

                        {
                            selectedVehicle && (
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
                                                <p className="text-xs text-blue-600 font-medium">Velocidad</p>
                                                <p className="text-xl font-bold text-blue-900 mt-1">{selectedVehicle.speed} <span className="text-xs">km/h</span></p>
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
                            )
                        }
                    </Map>
                </div>
            </div>
        </div>
    )
}
