"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Plus, Edit, Trash2 } from "lucide-react"

interface Location {
    id: string
    name: string
    description: string | null
    latitude: number
    longitude: number
    radius: number
    location_type: "office" | "warehouse" | "client" | "checkpoint" | "other"
}

export default function LocationsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [locations, setLocations] = useState<Location[]>([])
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
        loadLocations()
    }, [router])

    const loadLocations = async () => {
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setLocations(data || [])
        } catch (error) {
            console.error("Error loading locations:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredLocations = locations.filter(
        (location) =>
            location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (location.description && location.description.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    const stats = {
        total: locations.length,
        offices: locations.filter((l) => l.location_type === "office").length,
        warehouses: locations.filter((l) => l.location_type === "warehouse").length,
        clients: locations.filter((l) => l.location_type === "client").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando ubicaciones...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Ubicaciones</h1>
                            <p className="text-sm text-gray-500 mt-1">Gestiona puntos de interés y geocercas</p>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8f]" onClick={() => router.push("/admin/locations/create")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Ubicación
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
                                <MapPin className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Oficinas</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">{stats.offices}</p>
                                </div>
                                <MapPin className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Almacenes</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.warehouses}</p>
                                </div>
                                <MapPin className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Clientes</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.clients}</p>
                                </div>
                                <MapPin className="h-8 w-8 text-orange-600" />
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
                            placeholder="Buscar ubicaciones..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Locations List */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nombre
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Descripción
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Coordenadas
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Radio (m)
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLocations.map((location) => (
                                    <tr key={location.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{location.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{location.description || "Sin descripción"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${location.location_type === "office"
                                                    ? "bg-purple-100 text-purple-800"
                                                    : location.location_type === "warehouse"
                                                        ? "bg-green-100 text-green-800"
                                                        : location.location_type === "client"
                                                            ? "bg-orange-100 text-orange-800"
                                                            : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {location.location_type === "office"
                                                    ? "Oficina"
                                                    : location.location_type === "warehouse"
                                                        ? "Almacén"
                                                        : location.location_type === "client"
                                                            ? "Cliente"
                                                            : location.location_type === "checkpoint"
                                                                ? "Punto de Control"
                                                                : "Otro"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.radius}m</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm">
                                                    <MapPin className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredLocations.length === 0 && (
                            <div className="text-center py-12">
                                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No se encontraron ubicaciones</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
