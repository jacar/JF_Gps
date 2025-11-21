"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User, TripWithDriver } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Clock, TrendingUp, Filter, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function TripsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [trips, setTrips] = useState<TripWithDriver[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all")
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
        const matchesFilter = filterStatus === "all" || trip.status === filterStatus
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
            <AdminSidebar onLogout={handleLogout} userName={user?.full_name} />

            <div className="flex-1 ml-64 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestiona y monitorea todos los viajes</p>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8f]">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
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
                        <div className="flex gap-2">
                            <Button
                                variant={filterStatus === "all" ? "default" : "outline"}
                                onClick={() => setFilterStatus("all")}
                                size="sm"
                            >
                                Todos
                            </Button>
                            <Button
                                variant={filterStatus === "active" ? "default" : "outline"}
                                onClick={() => setFilterStatus("active")}
                                size="sm"
                            >
                                Activos
                            </Button>
                            <Button
                                variant={filterStatus === "completed" ? "default" : "outline"}
                                onClick={() => setFilterStatus("completed")}
                                size="sm"
                            >
                                Completados
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Trips List */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Conductor
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehículo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Inicio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fin
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Distancia
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vel. Máx
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {format(new Date(trip.start_time), "dd/MM/yyyy", { locale: es })}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {format(new Date(trip.start_time), "HH:mm", { locale: es })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {trip.max_speed_kmh.toFixed(0)} km/h
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${trip.status === "active"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
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
            </div>
        </div>
    )
}
