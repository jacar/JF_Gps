"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User, TripWithDriver } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Clock, TrendingUp, Filter, Download, Menu } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function TripsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [trips, setTrips] = useState<TripWithDriver[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all")
    const [showSidebar, setShowSidebar] = useState(false) // Estado para controlar la visibilidad del sidebar
    const [showTripPopup, setShowTripPopup] = useState(false) // Estado para controlar la visibilidad del popup de viajes en móvil
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
        loadTrips()

        const interval = setInterval(() => {
            loadTrips()
        }, 10000)

        return () => clearInterval(interval)
    }, [router])

    const loadTrips = async () => {
        try {
            const { data: tripsData, error } = await supabase
                .from("trips")
                .select(`
          *,
          driver:users!trips_driver_id_fkey(*)
        `)
                .order("created_at", { ascending: false })

            if (error) throw error

            setTrips(tripsData || [])
        } catch (error) {
            console.error("Error loading trips:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredTrips = trips.filter((trip) => {
        const matchesSearch =
            trip.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trip.driver.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filterStatus === "all" || trip.status.toLowerCase() === filterStatus
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: trips.length,
        active: trips.filter((t) => t.status === "active").length,
        completed: trips.filter((t) => t.status === "completed").length,
        totalDistance: trips.reduce((sum, t) => sum + t.total_distance_km, 0),
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando viajes...</p>
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
                <AdminSidebar onLogout={handleLogout} userName={user?.full_name} onClose={() => setShowSidebar(false)} />
            </div>

            <div className="flex-1 flex flex-col overflow-y-auto md:ml-64">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-6 md:px-8">
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
                                <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
                                <p className="text-sm text-gray-500 mt-1">Gestiona y monitorea todos los viajes</p>
                            </div>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8f]">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                        <Button
                            variant="destructive"
                            className="ml-2"
                            onClick={async () => {
                                if (confirm("¿Estás seguro de que deseas cerrar todos los viajes inactivos (más de 12 horas sin actividad)?")) {
                                    setLoading(true)
                                    try {
                                        const { closeStaleTrips } = await import("@/app/actions")
                                        const count = await closeStaleTrips()
                                        alert(`Se han cerrado ${count} viajes inactivos.`)
                                        loadTrips()
                                    } catch (error) {
                                        console.error("Error closing stale trips:", error)
                                        alert("Error al cerrar viajes inactivos.")
                                    } finally {
                                        setLoading(false)
                                    }
                                }
                            }}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Limpiar Antiguos
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total Viajes</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <MapPin className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Activos</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
                                </div>
                                <Clock className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Completados</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">{stats.completed}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Distancia Total</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.totalDistance.toFixed(1)} km</p>
                                </div>
                                <MapPin className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por vehículo o conductor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="hidden md:flex gap-2">
                            <Button
                                variant={filterStatus === "all" ? "default" : "outline"}
                                onClick={() => { setFilterStatus("all"); setShowTripPopup(true) }}
                                size="sm"
                            >
                                Todos
                            </Button>
                            <Button
                                variant={filterStatus === "active" ? "default" : "outline"}
                                onClick={() => { setFilterStatus("active"); setShowTripPopup(true) }}
                                size="sm"
                            >
                                Activos
                            </Button>
                            <Button
                                variant={filterStatus === "completed" ? "default" : "outline"}
                                onClick={() => { setFilterStatus("completed"); setShowTripPopup(true) }}
                                size="sm"
                            >
                                Completados
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Trips List */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Inicio</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Fin</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distancia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Vel. Máx</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTrips.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{trip.driver.full_name}</div>
                                            <div className="text-sm text-gray-500">{trip.driver.phone_number}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{trip.vehicle_number}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                            <div className="text-sm text-gray-900">
                                                {format(new Date(trip.start_time), "dd/MM/yyyy", { locale: es })}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {format(new Date(trip.start_time), "HH:mm", { locale: es })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                            {trip.end_time ? (
                                                <>
                                                    <div className="text-sm text-gray-900">
                                                        {format(new Date(trip.end_time), "dd/MM/yyyy", { locale: es })}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {format(new Date(trip.end_time), "HH:mm", { locale: es })}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400">En curso</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {trip.total_distance_km.toFixed(2)} km
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                                            {trip.max_speed_kmh.toFixed(0)} km/h
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${trip.status === "active"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {trip.status === "active" ? "Activo" : "Completado"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/admin?trip=${trip.id}`)}
                                            >
                                                Ver en mapa
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredTrips.length === 0 && (
                            <div className="text-center py-12">
                                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No se encontraron viajes</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Filters for Mobile */}
                <div className="fixed bottom-0 inset-x-0 z-50 bg-white p-4 shadow-lg md:hidden">
                    <div className="flex justify-around gap-2">
                        <Button
                            variant={filterStatus === "all" ? "default" : "outline"}
                            onClick={() => { setFilterStatus("all"); setShowTripPopup(true) }}
                            className="flex-1"
                        >
                            Todos
                        </Button>
                        <Button
                            variant={filterStatus === "active" ? "default" : "outline"}
                            onClick={() => { setFilterStatus("active"); setShowTripPopup(true) }}
                            className="flex-1"
                        >
                            Activos
                        </Button>
                        <Button
                            variant={filterStatus === "completed" ? "default" : "outline"}
                            onClick={() => { setFilterStatus("completed"); setShowTripPopup(true) }}
                            className="flex-1"
                        >
                            Completados
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
