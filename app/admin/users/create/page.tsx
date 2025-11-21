"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"

export default function CreateUserPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        full_name: "",
        phone_number: "",
        role: "driver",
        vehicle_number: "",
        imei: "",
        password: "",
        confirm_password: "",
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

        if (formData.password !== formData.confirm_password) {
            alert("Las contraseñas no coinciden")
            return
        }

        setSaving(true)

        // Simulate API call
        setTimeout(() => {
            setSaving(false)
            router.push("/admin/users")
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
                        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/users")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Nuevo Usuario</h1>
                            <p className="text-sm text-gray-500 mt-1">Registra un nuevo usuario en el sistema</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-2xl">
                        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="full_name">Nombre Completo *</Label>
                                    <Input
                                        id="full_name"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="Ej. Juan Pérez"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="phone_number">Teléfono *</Label>
                                        <Input
                                            id="phone_number"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                            placeholder="+51 999 999 999"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="role">Rol *</Label>
                                        <select
                                            id="role"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                                            required
                                        >
                                            <option value="driver">Conductor</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.role === "driver" && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="col-span-2 mb-2">
                                            <h3 className="text-sm font-medium text-gray-900">Asignación de Vehículo</h3>
                                        </div>
                                        <div>
                                            <Label htmlFor="vehicle_number">Vehículo Asignado</Label>
                                            <Input
                                                id="vehicle_number"
                                                value={formData.vehicle_number}
                                                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                                                placeholder="Ej. V001"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="imei">IMEI del Dispositivo</Label>
                                            <Input
                                                id="imei"
                                                value={formData.imei}
                                                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                                placeholder="15 dígitos"
                                                maxLength={15}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="password">Contraseña *</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="confirm_password">Confirmar Contraseña *</Label>
                                        <Input
                                            id="confirm_password"
                                            type="password"
                                            value={formData.confirm_password}
                                            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/admin/users")}
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
                                            Crear Usuario
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
