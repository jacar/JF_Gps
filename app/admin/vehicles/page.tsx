"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Truck, Plus, Edit, Trash2, MapPin } from "lucide-react"

interface Vehicle {
    id: string
    vehicle_number: string
    brand: string
    model: string
    year: number
    plate: string
    color: string
    status: "active" | "maintenance" | "inactive"
    imei: string | null
}

export default function VehiclesPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
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
        loadVehicles()
    }, [router])

    const loadVehicles = async () => {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setVehicles(data || [])
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
            vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: vehicles.length,
        active: vehicles.filter((v) => v.status === "active").length,
        maintenance: vehicles.filter((v) => v.status === "maintenance").length,
        inactive: vehicles.filter((v) => v.status === "inactive").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando vehículos...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestiona la flota de vehículos</p>
                        </div>
                        <Button
                            className="bg-[#1e3a5f] hover:bg-[#2d5a8f]"
                            onClick={() => router.push("/admin/vehicles/create")}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Vehículo
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
                                <Truck className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Activos</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
                                </div>
                                <Truck className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Mantenimiento</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.maintenance}</p>
                                </div>
                                <Truck className="h-8 w-8 text-orange-600" />
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Inactivos</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inactive}</p>
                                </div>
                                <Truck className="h-8 w-8 text-gray-600" />
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
                            placeholder="Buscar por número, marca, modelo o placa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Vehicles Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVehicles.map((vehicle) => (
                            <div key={vehicle.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                                                <Truck className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{vehicle.vehicle_number}</h3>
                                                <p className="text-sm text-gray-500">{vehicle.plate}</p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${vehicle.status === "active"
                                                ? "bg-green-100 text-green-800"
                                                : vehicle.status === "maintenance"
                                                    ? "bg-orange-100 text-orange-800"
                                                    : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {vehicle.status === "active"
                                                ? "Activo"
                                                : vehicle.status === "maintenance"
                                                    ? "Mantenimiento"
                                                    : "Inactivo"}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Marca:</span>
                                            <span className="font-medium text-gray-900">{vehicle.brand}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Modelo:</span>
                                            <span className="font-medium text-gray-900">{vehicle.model}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Año:</span>
                                            <span className="font-medium text-gray-900">{vehicle.year}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Color:</span>
                                            <span className="font-medium text-gray-900">{vehicle.color}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">IMEI:</span>
                                            <span className="font-medium text-gray-900">{vehicle.imei || "No asignado"}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                                        <Button variant="outline" size="sm" className="flex-1">
                                            <Edit className="h-4 w-4 mr-1" />
                                            Editar
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1">
                                            <MapPin className="h-4 w-4 mr-1" />
                                            Ubicar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredVehicles.length === 0 && (
                        <div className="text-center py-12">
                            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No se encontraron vehículos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
