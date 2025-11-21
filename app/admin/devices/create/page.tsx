"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default function CreateDevicePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        imei: "",
        type: "GPS-4G",
        sim_number: "",
        vehicle_number: "",
        status: "active",
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
            router.push("/admin/devices")
        }, 1000)
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
                        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/devices")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Nuevo Dispositivo</h1>
                            <p className="text-sm text-gray-500 mt-1">Registra un nuevo dispositivo GPS</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-2xl">
                        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="imei">IMEI *</Label>
                                    <Input
                                        id="imei"
                                        value={formData.imei}
                                        onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                        placeholder="Ingrese los 15 dígitos del IMEI"
                                        maxLength={15}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="type">Modelo de Dispositivo *</Label>
                                        <select
                                            id="type"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                            required
                                        >
                                            <option value="GPS-4G">GPS-4G Standard</option>
                                            <option value="GPS-OBD">GPS OBD-II</option>
                                            <option value="GPS-SAT">Satelital Puro</option>
                                            <option value="GPS-MINI">Rastreador Mini</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="sim_number">Número SIM</Label>
                                        <Input
                                            id="sim_number"
                                            value={formData.sim_number}
                                            onChange={(e) => setFormData({ ...formData, sim_number: e.target.value })}
                                            placeholder="+51 999 999 999"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="vehicle_number">Vehículo Asignado</Label>
                                        <Input
                                            id="vehicle_number"
                                            value={formData.vehicle_number}
                                            onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                                            placeholder="Ej. V001"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Opcional: puede asignar después</p>
                                    </div>
                                    <div>
                                        <Label htmlFor="status">Estado Inicial *</Label>
                                        <select
                                            id="status"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                            required
                                        >
                                            <option value="active">Activo</option>
                                            <option value="inactive">Inactivo</option>
                                            <option value="maintenance">Mantenimiento</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/admin/devices")}
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
                                            Registrar Dispositivo
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
