"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import type { User } from "@/lib/types"
import { Activity, Truck, MapPin, Zap, TrendingUp, Users, Clock } from "lucide-react"
import { AdminCameraViewer } from "@/components/admin-camera-viewer"

interface SystemMetrics {
    activeVehicles: number
    totalTrips: number
    activeDrivers: number
    avgSpeed: number
    totalDistance: number
    alerts: number
}

export default function MonitorPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
    const [metrics, setMetrics] = useState<SystemMetrics>({
        activeVehicles: 0,
        totalTrips: 0,
        activeDrivers: 0,
        avgSpeed: 0,
        totalDistance: 0,
        alerts: 0,
    })
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const router = useRouter()

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
        loadMetrics()

        const interval = setInterval(() => {
            loadMetrics()
        }, 5000)

        return () => clearInterval(interval)
    }, [router])

    const loadMetrics = async () => {
        const supabase = createClient()

        try {
            const { count: activeVehiclesCount } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { count: totalTripsCount } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', today.toISOString())

            const { count: activeDriversCount } = await supabase
                .from('trips')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')

            const { data: vehiclesData } = await supabase
                .from('vehicles')
                .select('current_speed')
                .gt('current_speed', 0)

            const avgSpeed = vehiclesData && vehiclesData.length > 0
                ? Math.round(vehiclesData.reduce((acc: number, curr: any) => acc + (curr.current_speed || 0), 0) / vehiclesData.length)
                : 0

            const { data: tripsToday } = await supabase
                .from('trips')
                .select('total_distance_km')
                .gte('start_time', today.toISOString())

            const totalDistance = tripsToday
                ? Math.round(tripsToday.reduce((acc: number, curr: any) => acc + (curr.total_distance_km || 0), 0))
                : 0

            const { count: alertsCount } = await supabase
                .from('alarms')
                .select('*', { count: 'exact', head: true })
                .eq('acknowledged', false)

            setMetrics({
                activeVehicles: activeVehiclesCount || 0,
                totalTrips: totalTripsCount || 0,
                activeDrivers: activeDriversCount || 0,
                avgSpeed: avgSpeed,
                totalDistance: totalDistance,
                alerts: alertsCount || 0,
            })

        } catch (error) {
            console.error("Error loading metrics:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const loadActivity = async () => {
            const supabase = createClient()
            const { data: trips } = await supabase
                .from('trips')
                .select('id, start_time, status, vehicle_number')
                .order('start_time', { ascending: false })
                .limit(3)

            const { data: alarms } = await supabase
                .from('alarms')
                .select('id, created_at, alarm_type, message')
                .order('created_at', { ascending: false })
                .limit(3)

            const activities = [
                ...(trips || []).map((t: any) => ({
                    time: new Date(t.start_time).toLocaleTimeString(),
                    event: t.status === 'active' ? `Vehículo ${t.vehicle_number} inició viaje` : `Vehículo ${t.vehicle_number} completó viaje`,
                    type: t.status === 'active' ? 'info' : 'success',
                    timestamp: new Date(t.start_time).getTime()
                })),
                ...(alarms || []).map((a: any) => ({
                    time: new Date(a.created_at).toLocaleTimeString(),
                    event: `Alerta: ${a.message || a.alarm_type}`,
                    type: 'warning',
                    timestamp: new Date(a.created_at).getTime()
                }))
            ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

            setRecentActivity(activities)
        }

        if (user) {
            loadActivity()
            const interval = setInterval(loadActivity, 10000)
            return () => clearInterval(interval)
        }
    }, [user])

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando monitor...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <AdminSidebar onLogout={handleLogout} userName={user?.full_name} isCollapsed={isSidebarCollapsed} onClose={() => setIsSidebarCollapsed(true)} />

            <div className={`w-full flex flex-col overflow-hidden ml-0 ${isSidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="flex items-center mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 mr-2 md:hidden"
                            onClick={() => setIsSidebarCollapsed(false)}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Monitor del Sistema</h1>
                            <p className="text-sm text-gray-500 mt-1">Vista en tiempo real del estado del sistema</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck className="h-4 w-4 text-blue-600" />
                                <p className="text-xs text-blue-600 font-medium">Vehículos Activos</p>
                            </div>
                            <p className="text-xl font-bold text-blue-900">{metrics.activeVehicles}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="h-4 w-4 text-green-600" />
                                <p className="text-xs text-green-600 font-medium">Viajes Hoy</p>
                            </div>
                            <p className="text-xl font-bold text-green-900">{metrics.totalTrips}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-purple-600" />
                                <p className="text-xs text-purple-600 font-medium">Conductores</p>
                            </div>
                            <p className="text-xl font-bold text-purple-900">{metrics.activeDrivers}</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="h-4 w-4 text-orange-600" />
                                <p className="text-xs text-orange-600 font-medium">Vel. Promedio</p>
                            </div>
                            <p className="text-xl font-bold text-orange-900">{metrics.avgSpeed} km/h</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-indigo-600" />
                                <p className="text-xs text-indigo-600 font-medium">Distancia Hoy</p>
                            </div>
                            <p className="text-xl font-bold text-indigo-900">{metrics.totalDistance} km</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-4 w-4 text-red-600" />
                                <p className="text-xs text-red-600 font-medium">Alertas</p>
                            </div>
                            <p className="text-xl font-bold text-red-900">{metrics.alerts}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 h-full">
                        {/* Left Column - System Info */}
                        <div className="space-y-6">
                            {/* Activity Recent */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
                                        <p className="text-sm text-gray-500">Últimos eventos del sistema</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {recentActivity.length > 0 ? (
                                        recentActivity.map((activity, index) => (
                                            <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === "warning" ? "bg-orange-500" :
                                                    activity.type === "success" ? "bg-green-500" : "bg-blue-500"
                                                    }`}></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{activity.event}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No hay actividad reciente registrada.</p>
                                    )}
                                </div>
                            </div>

                            {/* System State */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-500 mb-4">Estado del Sistema</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">API</span>
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Operativo</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Base de Datos</span>
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Operativo</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">GPS Tracking</span>
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Operativo</span>
                                    </div>
                                </div>
                            </div>

                            {/* Connections */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-500 mb-4">Conexiones</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Dispositivos GPS</span>
                                        <span className="text-lg font-bold text-gray-900">{metrics.activeVehicles}/12</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Usuarios Activos</span>
                                        <span className="text-lg font-bold text-gray-900">3</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Sesiones Web</span>
                                        <span className="text-lg font-bold text-gray-900">5</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Camera Grid */}
                        <div className="lg:min-h-[calc(100vh-280px)]">
                            {user && (
                                <AdminCameraViewer adminUser={user} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
