"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Server, Cpu, HardDrive, Activity, WifiOff, Wifi } from "lucide-react"

interface ServerInfo {
    id: string
    name: string
    host: string
    port: number
    status: "online" | "offline" | "maintenance"
    cpu_usage: number | null
    memory_usage: number | null
    disk_usage: number | null
    last_check: string | null
}

export default function ServersPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [servers, setServers] = useState<ServerInfo[]>([])
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
        loadServers()
    }, [router])

    const loadServers = () => {
        // Mock data
        const mockServers: ServerInfo[] = [
            {
                id: "1",
                name: "Servidor Principal",
                host: "gps.jfcorp.com",
                port: 443,
                status: "online",
                cpu_usage: 45,
                memory_usage: 62,
                disk_usage: 38,
                last_check: new Date().toISOString(),
            },
            {
                id: "2",
                name: "Servidor de Base de Datos",
                host: "db.jfcorp.com",
                port: 5432,
                status: "online",
                cpu_usage: 28,
                memory_usage: 75,
                disk_usage: 52,
                last_check: new Date().toISOString(),
            },
            {
                id: "3",
                name: "Servidor de Respaldo",
                host: "backup.jfcorp.com",
                port: 443,
                status: "maintenance",
                cpu_usage: null,
                memory_usage: null,
                disk_usage: null,
                last_check: new Date(Date.now() - 3600000).toISOString(),
            },
        ]
        setServers(mockServers)
        setLoading(false)
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const stats = {
        total: servers.length,
        online: servers.filter((s) => s.status === "online").length,
        offline: servers.filter((s) => s.status === "offline").length,
        maintenance: servers.filter((s) => s.status === "maintenance").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando servidores...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Servidores</h1>
                            <p className="text-sm text-gray-500 mt-1">Monitorea el estado de los servidores</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <Server className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">En Línea</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.online}</p>
                                </div>
                                <Wifi className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Fuera de Línea</p>
                                    <p className="text-2xl font-bold text-red-900 mt-1">{stats.offline}</p>
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
                                <Server className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Servers Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {servers.map((server) => (
                            <div key={server.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                                                <Server className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{server.name}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {server.host}:{server.port}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-3 py-1 text-xs font-semibold rounded-full ${server.status === "online"
                                                    ? "bg-green-100 text-green-800"
                                                    : server.status === "maintenance"
                                                        ? "bg-orange-100 text-orange-800"
                                                        : "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {server.status === "online"
                                                ? "En Línea"
                                                : server.status === "maintenance"
                                                    ? "Mantenimiento"
                                                    : "Fuera de Línea"}
                                        </span>
                                    </div>

                                    {server.cpu_usage !== null && (
                                        <div className="space-y-4">
                                            {/* CPU Usage */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Cpu className="h-4 w-4" />
                                                        <span>CPU</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{server.cpu_usage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${server.cpu_usage > 80
                                                                ? "bg-red-500"
                                                                : server.cpu_usage > 60
                                                                    ? "bg-orange-500"
                                                                    : "bg-green-500"
                                                            }`}
                                                        style={{ width: `${server.cpu_usage}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Memory Usage */}
                                            {server.memory_usage !== null && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Activity className="h-4 w-4" />
                                                            <span>Memoria</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{server.memory_usage}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${server.memory_usage > 80
                                                                    ? "bg-red-500"
                                                                    : server.memory_usage > 60
                                                                        ? "bg-orange-500"
                                                                        : "bg-green-500"
                                                                }`}
                                                            style={{ width: `${server.memory_usage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Disk Usage */}
                                            {server.disk_usage !== null && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <HardDrive className="h-4 w-4" />
                                                            <span>Disco</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{server.disk_usage}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${server.disk_usage > 80
                                                                    ? "bg-red-500"
                                                                    : server.disk_usage > 60
                                                                        ? "bg-orange-500"
                                                                        : "bg-green-500"
                                                                }`}
                                                            style={{ width: `${server.disk_usage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {server.last_check && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                Última verificación: {new Date(server.last_check).toLocaleString("es-ES")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
