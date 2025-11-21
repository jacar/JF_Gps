"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Cpu, Plus, Wifi, WifiOff, Battery, Signal } from "lucide-react"

interface Device {
    id: string
    imei: string
    device_type: string
    status: "active" | "inactive" | "maintenance"
    vehicle_number: string | null
    last_connection: string | null
    battery_level: number | null
    signal_strength: number | null
}

export default function DevicesPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [devices, setDevices] = useState<Device[]>([])
    const [searchTerm, setSearchTerm] = useState("")
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
        loadDevices()
    }, [router])

    const loadDevices = async () => {
        try {
            const { data, error } = await supabase
                .from('gps_devices')
                .select(`
                    *,
                    vehicle:vehicles(vehicle_number)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const mappedData = data?.map((d: any) => ({
                ...d,
                vehicle_number: d.vehicle?.vehicle_number || null
            })) || []

            setDevices(mappedData)
        } catch (error) {
            console.error("Error loading devices:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredDevices = devices.filter(
        (device) =>
            device.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.device_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (device.vehicle_number && device.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    const stats = {
        total: devices.length,
        active: devices.filter((d) => d.status === "active").length,
        inactive: devices.filter((d) => d.status === "inactive").length,
        maintenance: devices.filter((d) => d.status === "maintenance").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando dispositivos...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Dispositivos GPS</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestiona los dispositivos de rastreo</p>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8f]" onClick={() => router.push("/admin/devices/create")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Dispositivo
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <Cpu className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Activos</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
                                </div>
                                <Wifi className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Inactivos</p>
                                    <p className="text-2xl font-bold text-red-900 mt-1">{stats.inactive}</p>
                                </div>
                                <WifiOff className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Mantenimiento</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.maintenance}</p>
                                </div>
                                <Cpu className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Buscar por IMEI, tipo o vehículo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Devices Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDevices.map((device) => (
                            <div key={device.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                                                <Cpu className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{device.device_type}</h3>
                                                <p className="text-xs text-gray-500">{device.imei}</p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${device.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : device.status === "maintenance"
                                                    ? "bg-orange-100 text-orange-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {device.status === "active"
                                                ? "Activo"
                                                : device.status === "maintenance"
                                                    ? "Mantenimiento"
                                                    : "Inactivo"}
                                        </span>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Vehículo:</span>
                                            <span className="font-medium text-gray-900">{device.vehicle_number || "No asignado"}</span>
                                        </div>

                                        {device.battery_level !== null && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 flex items-center gap-1">
                                                        <Battery className="h-4 w-4" />
                                                        Batería:
                                                    </span>
                                                    <span className="font-medium text-gray-900">{device.battery_level}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${device.battery_level > 60
                                                            ? "bg-green-500"
                                                            : device.battery_level > 30
                                                                ? "bg-orange-500"
                                                                : "bg-red-500"
                                                            }`}
                                                        style={{ width: `${device.battery_level}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {device.signal_strength !== null && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500 flex items-center gap-1">
                                                        <Signal className="h-4 w-4" />
                                                        Señal:
                                                    </span>
                                                    <span className="font-medium text-gray-900">{device.signal_strength}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${device.signal_strength > 60
                                                            ? "bg-green-500"
                                                            : device.signal_strength > 30
                                                                ? "bg-orange-500"
                                                                : "bg-red-500"
                                                            }`}
                                                        style={{ width: `${device.signal_strength}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {device.last_connection && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Última conexión:</span>
                                                <span className="font-medium text-gray-900">
                                                    {new Date(device.last_connection).toLocaleString("es-ES")}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-gray-200">
                                        <Button variant="outline" size="sm" className="w-full">
                                            Ver Detalles
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredDevices.length === 0 && (
                        <div className="text-center py-12">
                            <Cpu className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No se encontraron dispositivos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
