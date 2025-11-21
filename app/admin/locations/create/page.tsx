"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, MapPin } from "lucide-react"

export default function CreateLocationPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        type: "office",
        latitude: "",
        longitude: "",
        radius: "100",
    })

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
        setLoading(false)
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        // Simulate API call
        setTimeout(() => {
            setSaving(false)
            router.push("/admin/locations")
        }, 1000)
    }

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData({
                        ...formData,
                        latitude: position.coords.latitude.toString(),
                        longitude: position.coords.longitude.toString(),
                    })
                },
                (error) => {
                    console.error("Error getting location:", error)
                    alert("No se pudo obtener la ubicación actual")
                }
            )
        } else {
            alert("Geolocalización no soportada en este navegador")
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando...</p>
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
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/locations")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Nueva Ubicación</h1>
                            <p className="text-sm text-gray-500 mt-1">Registra una nueva ubicación o geocerca</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-2xl">
                        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="name">Nombre de la Ubicación *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Almacén Central"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="description">Descripción</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Breve descripción del lugar"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="type">Tipo *</Label>
                                        <select
                                            id="type"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                            required
                                        >
                                            <option value="office">Oficina</option>
                                            <option value="warehouse">Almacén</option>
                                            <option value="client">Cliente</option>
                                            <option value="checkpoint">Punto de Control</option>
                                            <option value="other">Otro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="radius">Radio de Geocerca (metros) *</Label>
                                        <Input
                                            id="radius"
                                            type="number"
                                            value={formData.radius}
                                            onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                                            min="10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-medium text-blue-900">Coordenadas GPS</h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={getCurrentLocation}
                                            className="bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                            <MapPin className="h-3 w-3 mr-1" />
                                            Usar mi ubicación
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="latitude">Latitud *</Label>
                                            <Input
                                                id="latitude"
                                                value={formData.latitude}
                                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                                placeholder="-12.000000"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="longitude">Longitud *</Label>
                                            <Input
                                                id="longitude"
                                                value={formData.longitude}
                                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                                placeholder="-77.000000"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/admin/locations")}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving} className="flex-1 bg-[#1e3a5f] hover:bg-[#2d5a8f]">
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Guardar Ubicación
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
