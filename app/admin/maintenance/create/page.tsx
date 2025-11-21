"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default function CreateMaintenancePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        vehicle_number: "",
        maintenance_type: "preventive",
        description: "",
        cost: "",
        scheduled_date: "",
        mechanic_name: "",
        notes: "",
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
            router.push("/admin/maintenance")
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
                        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/maintenance")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Programar Mantenimiento</h1>
                            <p className="text-sm text-gray-500 mt-1">Registra un nuevo mantenimiento para un vehículo</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-2xl">
                        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="vehicle_number">Vehículo *</Label>
                                    <Input
                                        id="vehicle_number"
                                        value={formData.vehicle_number}
                                        onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                                        placeholder="Ingrese número de vehículo (ej. V001)"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="maintenance_type">Tipo de Mantenimiento *</Label>
                                        <select
                                            id="maintenance_type"
                                            value={formData.maintenance_type}
                                            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                            required
                                        >
                                            <option value="preventive">Preventivo</option>
                                            <option value="corrective">Correctivo</option>
                                            <option value="inspection">Inspección</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="scheduled_date">Fecha Programada *</Label>
                                        <Input
                                            id="scheduled_date"
                                            type="datetime-local"
                                            value={formData.scheduled_date}
                                            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="description">Descripción del Trabajo *</Label>
                                    <textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Detalle los trabajos a realizar..."
                                        className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="mechanic_name">Mecánico / Taller</Label>
                                        <Input
                                            id="mechanic_name"
                                            value={formData.mechanic_name}
                                            onChange={(e) => setFormData({ ...formData, mechanic_name: e.target.value })}
                                            placeholder="Nombre del responsable"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="cost">Costo Estimado ($)</Label>
                                        <Input
                                            id="cost"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.cost}
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="notes">Notas Adicionales</Label>
                                    <textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Observaciones adicionales..."
                                        className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/admin/maintenance")}
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
                                            Programar Mantenimiento
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
