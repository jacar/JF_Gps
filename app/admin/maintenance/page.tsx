"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Wrench, Plus, Calendar, DollarSign, CheckCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Maintenance {
    id: string
    vehicle_number: string
    maintenance_type: "preventive" | "corrective" | "inspection"
    description: string
    cost: number
    scheduled_date: string
    completed_date: string | null
    status: "scheduled" | "in_progress" | "completed" | "cancelled"
    mechanic_name: string | null
}

export default function MaintenancePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [maintenances, setMaintenances] = useState<Maintenance[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | "scheduled" | "in_progress" | "completed">("all")
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
        loadMaintenances()
    }, [router])

    const loadMaintenances = async () => {
        try {
            const { data, error } = await supabase
                .from('maintenances')
                .select(`
                    *,
                    vehicle:vehicles(vehicle_number)
                `)
                .order('scheduled_date', { ascending: false })

            if (error) throw error

            const mappedData = data?.map((m: any) => ({
                ...m,
                vehicle_number: m.vehicle?.vehicle_number || 'Desconocido'
            })) || []

            setMaintenances(mappedData)
        } catch (error) {
            console.error("Error loading maintenances:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredMaintenances = maintenances.filter((m) => {
        const matchesSearch =
            m.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.mechanic_name && m.mechanic_name.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesFilter = filterStatus === "all" || m.status === filterStatus
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: maintenances.length,
        scheduled: maintenances.filter((m) => m.status === "scheduled").length,
        inProgress: maintenances.filter((m) => m.status === "in_progress").length,
        completed: maintenances.filter((m) => m.status === "completed").length,
        totalCost: maintenances.reduce((sum, m) => sum + m.cost, 0),
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando mantenimientos...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Mantenimientos</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestiona el mantenimiento de la flota</p>
                        </div>
                        <Button
                            className="bg-[#1e3a5f] hover:bg-[#2d5a8f]"
                            onClick={() => router.push("/admin/maintenance/create")}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Programar Mantenimiento
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-5 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <Wrench className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-600 font-medium">Programados</p>
                                    <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.scheduled}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-yellow-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">En Proceso</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.inProgress}</p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Completados</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.completed}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Costo Total</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">${stats.totalCost.toFixed(0)}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-purple-600" />
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
                                placeholder="Buscar por vehículo, descripción o mecánico..."
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
                                variant={filterStatus === "scheduled" ? "default" : "outline"}
                                onClick={() => setFilterStatus("scheduled")}
                                size="sm"
                            >
                                Programados
                            </Button>
                            <Button
                                variant={filterStatus === "in_progress" ? "default" : "outline"}
                                onClick={() => setFilterStatus("in_progress")}
                                size="sm"
                            >
                                En Proceso
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

                {/* Maintenances List */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vehículo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Descripción
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mecánico
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha Programada
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Costo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredMaintenances.map((maintenance) => (
                                    <tr key={maintenance.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{maintenance.vehicle_number}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${maintenance.maintenance_type === "preventive"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : maintenance.maintenance_type === "corrective"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {maintenance.maintenance_type === "preventive"
                                                    ? "Preventivo"
                                                    : maintenance.maintenance_type === "corrective"
                                                        ? "Correctivo"
                                                        : "Inspección"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{maintenance.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{maintenance.mechanic_name || "No asignado"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {format(new Date(maintenance.scheduled_date), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">${maintenance.cost.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${maintenance.status === "completed"
                                                    ? "bg-green-100 text-green-800"
                                                    : maintenance.status === "in_progress"
                                                        ? "bg-orange-100 text-orange-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                            >
                                                {maintenance.status === "completed"
                                                    ? "Completado"
                                                    : maintenance.status === "in_progress"
                                                        ? "En Proceso"
                                                        : "Programado"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredMaintenances.length === 0 && (
                            <div className="text-center py-12">
                                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No se encontraron mantenimientos</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
