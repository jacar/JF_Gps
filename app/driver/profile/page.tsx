"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, User as UserIcon } from "lucide-react"
import type { User } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

export default function DriverProfilePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [fullName, setFullName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const userData = localStorage.getItem("gps_jf_user")

        if (!userData) {
            router.push("/")
            return
        }

        const parsedUser = JSON.parse(userData)

        if (parsedUser.role !== "driver") {
            router.push("/admin")
            return
        }

        setUser(parsedUser)
        setFullName(parsedUser.full_name || "")
        setPhoneNumber(parsedUser.phone_number || "")
        setLoading(false)
    }, [router])

    const handleSave = async () => {
        if (!user) return

        setSaving(true)

        try {
            const { error } = await supabase
                .from("users")
                .update({
                    full_name: fullName,
                    phone_number: phoneNumber,
                })
                .eq("id", user.id)

            if (error) throw error

            // Update local storage
            const updatedUser = {
                ...user,
                full_name: fullName,
                phone_number: phoneNumber,
            }
            localStorage.setItem("gps_jf_user", JSON.stringify(updatedUser))
            setUser(updatedUser)

            alert("Perfil actualizado correctamente")
            router.push("/driver")
        } catch (error: any) {
            console.error("Error updating profile:", error)
            alert(`Error al actualizar perfil: ${error.message}`)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <p>Cargando perfil...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 md:p-6">
            {/* Header */}
            <header className="flex items-center gap-4 mb-8">
                <Button
                    onClick={() => router.push("/driver")}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                </Button>
                <h1 className="text-xl font-bold text-gray-200">Editar Perfil</h1>
            </header>

            {/* Profile Card */}
            <div className="max-w-2xl mx-auto">
                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5" />
                            Información Personal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Profile Picture (Read-only) */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-1">
                                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                    <UserIcon className="h-16 w-16 text-gray-400" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">ID: {user?.id?.slice(0, 8).toUpperCase()}</p>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="fullName" className="text-gray-300">
                                    Nombre Completo
                                </Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white mt-2"
                                    placeholder="Ingrese su nombre completo"
                                />
                            </div>

                            <div>
                                <Label htmlFor="phoneNumber" className="text-gray-300">
                                    Teléfono
                                </Label>
                                <Input
                                    id="phoneNumber"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white mt-2"
                                    placeholder="Ingrese su número de teléfono"
                                />
                            </div>

                            <div>
                                <Label className="text-gray-300">Vehículo Asignado</Label>
                                <Input
                                    type="text"
                                    value={user?.vehicle_number || "N/A"}
                                    disabled
                                    className="bg-gray-700/50 border-gray-600 text-gray-400 mt-2 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    El vehículo asignado no puede ser modificado desde aquí
                                </p>
                            </div>
                        </div>

                        {/* Save Button */}
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                            {saving ? (
                                <>Guardando...</>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar Cambios
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
