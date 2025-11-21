"use client" 

import { useState, useEffect } from "react" 
import { useRouter } from "next/navigation" 
import { createClient } from "@/lib/supabase/client" 
import { AdminSidebar } from "@/components/admin-sidebar" 
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
    const [metrics, setMetrics] = useState<SystemMetrics>({ 
        activeVehicles: 0, 
        totalTrips: 0, 
        activeDrivers: 0, 
        avgSpeed: 0, 
        totalDistance: 0, 
        alerts: 0, 
    }) 
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

        // Simulate real-time updates 
        const interval = setInterval(() => { 
            loadMetrics() 
        }, 5000) 

        return () => clearInterval(interval) 
    }, [router]) 

    const loadMetrics = async () => { 
        const supabase = createClient() 

        try { 
            // 1. Vehículos Activos (aquellos con viajes activos) 
            const { count: activeVehiclesCount } = await supabase 
                .from('trips') 
                .select('*', { count: 'exact', head: true }) 
                .eq('status', 'active') 

            // 2. Total Viajes Hoy 
            const today = new Date() 
            today.setHours(0, 0, 0, 0) 
            const { count: totalTripsCount } = await supabase 
                .from('trips') 
                .select('*', { count: 'exact', head: true }) 
                .gte('start_time', today.toISOString()) 

            // 3. Conductores Activos 
            const { count: activeDriversCount } = await supabase 
                .from('trips') 
                .select('*', { count: 'exact', head: true }) 
                .eq('status', 'active') 

            // 4. Velocidad Promedio (de vehículos en movimiento) 
            const { data: vehiclesData } = await supabase 
                .from('vehicles') 
                .select('current_speed') 
                .gt('current_speed', 0) 

            const avgSpeed = vehiclesData && vehiclesData.length > 0 
                ? Math.round(vehiclesData.reduce((acc, curr) => acc + (curr.current_speed || 0), 0) / vehiclesData.length) 
                : 0 

            // 5. Distancia Total Hoy 
            const { data: tripsToday } = await supabase 
                .from('trips') 
                .select('total_distance_km') 
                .gte('start_time', today.toISOString()) 

            const totalDistance = tripsToday 
                ? Math.round(tripsToday.reduce((acc, curr) => acc + (curr.total_distance_km || 0), 0)) 
                : 0 

            // 6. Alertas Activas 
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

    // ... (resto del código) 

    // Para la actividad reciente, podríamos hacer un componente separado o cargarlo aquí también. 
    // Por simplicidad, mostraré un mensaje si no hay actividad reciente real o implementaré una carga básica. 
    const [recentActivity, setRecentActivity] = useState<any[]>([]) 

    useEffect(() => { 
        const loadActivity = async () => { 
            const supabase = createClient() 
            // Combinar últimos viajes y alarmas 
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
                ...(trips || []).map(t => ({ 
                    time: new Date(t.start_time).toLocaleTimeString(), 
                    event: t.status === 'active' ? `Vehículo ${t.vehicle_number} inició viaje` : `Vehículo ${t.vehicle_number} completó viaje`, 
                    type: t.status === 'active' ? 'info' : 'success', 
                    timestamp: new Date(t.start_time).getTime() 
                })), 
                ...(alarms || []).map(a => ({ 
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

    // ... (renderizado) 

    return ( 
        <> 
            {/* Recent Activity */}
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
                        <div
                            className={`w-2 h-2 rounded-full mt-2 ${activity.type === "warning"
                                ? "bg-orange-500"
                                : activity.type === "success"
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                                }`}
                        ></div>
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

    {user && <AdminCameraViewer adminUser={user} />}

    {/* System Status */ }
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Estado del Sistema</h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Operativo
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Base de Datos</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Operativo
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">GPS Tracking</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Operativo
                    </span>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Rendimiento</h3>
            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">CPU</span>
                        <span className="font-medium">42%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: "42%" }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Memoria</span>
                        <span className="font-medium">68%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: "68%" }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Disco</span>
                        <span className="font-medium">35%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: "35%" }}></div>
                    </div>
                </div>
            </div>
        </div>

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
</>
)
}
