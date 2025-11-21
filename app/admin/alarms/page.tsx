"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Bell, AlertTriangle, CheckCircle, XCircle, MapPin } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Alarm {
    id: string
    device_imei: string
    vehicle_number: string
    alarm_type: "speed" | "geofence" | "battery" | "offline" | "panic"
    severity: "low" | "medium" | "high" | "critical"
    message: string
    latitude: number | null
    longitude: number | null
    acknowledged: boolean
    created_at: string
}

export default function AlarmsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [alarms, setAlarms] = useState<Alarm[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filterSeverity, setFilterSeverity] = useState<"all" | "low" | "medium" | "high" | "critical">("all")
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
        loadAlarms()
    }, [router])

    const loadAlarms = async () => {
        try {
            const { data, error } = await supabase
                .from('alarms')
                .select(`
                    *,
                    vehicle:vehicles(vehicle_number)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const mappedData = data?.map((a: any) => ({
                ...a,
                vehicle_number: a.vehicle?.vehicle_number || 'Desconocido'
            })) || []

            setAlarms(mappedData)
        } catch (error) {
            console.error("Error loading alarms:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const handleAcknowledge = (alarmId: string) => {
        setAlarms((prev) => prev.map((a) => (a.id === alarmId ? { ...a, acknowledged: true } : a)))
    }

    const filteredAlarms = alarms.filter((alarm) => {
        const matchesSearch =
            alarm.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alarm.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alarm.device_imei.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filterSeverity === "all" || alarm.severity === filterSeverity
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: alarms.length,
        unacknowledged: alarms.filter((a) => !a.acknowledged).length,
        critical: alarms.filter((a) => a.severity === "critical").length,
        high: alarms.filter((a) => a.severity === "high").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando alarmas...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Alarmas</h1>
                            <p className="text-sm text-gray-500 mt-1">Monitorea y gestiona las alertas del sistema</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total Alarmas</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <Bell className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Sin Reconocer</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.unacknowledged}</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Críticas</p>
                                    <p className="text-2xl font-bold text-red-900 mt-1">{stats.critical}</p>
                                </div>
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-600 font-medium">Alta Prioridad</p>
                                    <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.high}</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-yellow-600" />
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
                                placeholder="Buscar por vehículo, mensaje o IMEI..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={filterSeverity === "all" ? "default" : "outline"}
                                onClick={() => setFilterSeverity("all")}
                                size="sm"
                            >
                                Todas
                            </Button>
                            <Button
                                variant={filterSeverity === "critical" ? "default" : "outline"}
                                onClick={() => setFilterSeverity("critical")}
                                size="sm"
                            >
                                Críticas
                            </Button>
                            <Button
                                variant={filterSeverity === "high" ? "default" : "outline"}
                                onClick={() => setFilterSeverity("high")}
                                size="sm"
                            >
                                Alta
                            </Button>
                            <Button
                                variant={filterSeverity === "medium" ? "default" : "outline"}
                                onClick={() => setFilterSeverity("medium")}
                                size="sm"
                            >
                                Media
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Alarms List */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="space-y-4">
                        {filteredAlarms.map((alarm) => (
                            <div
                                key={alarm.id}
                                className={`bg-white rounded-lg shadow-sm border-l-4 p-6 ${alarm.severity === "critical"
                                    ? "border-red-500"
                                    : alarm.severity === "high"
                                        ? "border-orange-500"
                                        : alarm.severity === "medium"
                                            ? "border-yellow-500"
                                            : "border-blue-500"
                                    } ${alarm.acknowledged ? "opacity-60" : ""}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span
                                                className={`px-3 py-1 text-xs font-semibold rounded-full ${alarm.severity === "critical"
                                                    ? "bg-red-100 text-red-800"
                                                    : alarm.severity === "high"
                                                        ? "bg-orange-100 text-orange-800"
                                                        : alarm.severity === "medium"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-blue-100 text-blue-800"
                                                    }`}
                                            >
                                                {alarm.severity === "critical"
                                                    ? "Crítica"
                                                    : alarm.severity === "high"
                                                        ? "Alta"
                                                        : alarm.severity === "medium"
                                                            ? "Media"
                                                            : "Baja"}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">{alarm.vehicle_number}</span>
                                            <span className="text-xs text-gray-500">{alarm.device_imei}</span>
                                            {alarm.acknowledged && (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Reconocida
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-900 font-medium mb-2">{alarm.message}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>{format(new Date(alarm.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</span>
                                            {alarm.latitude && alarm.longitude && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {alarm.latitude.toFixed(4)}, {alarm.longitude.toFixed(4)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {!alarm.acknowledged && (
                                            <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alarm.id)}>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Reconocer
                                            </Button>
                                        )}
                                        {alarm.latitude && alarm.longitude && (
                                            <Button variant="outline" size="sm">
                                                <MapPin className="h-4 w-4 mr-1" />
                                                Ver en Mapa
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredAlarms.length === 0 && (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No se encontraron alarmas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
