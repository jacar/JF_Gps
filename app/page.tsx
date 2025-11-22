"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserByPhone } from "@/app/actions"
import { useRouter } from "next/navigation"
import { MapPin, Lock, User, Truck, ShieldCheck } from "lucide-react"

export default function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Estados para Conductor
  const [driverPhone, setDriverPhone] = useState("")
  const [driverPass, setDriverPass] = useState("")

  // Estados para Admin
  const [adminUser, setAdminUser] = useState("")
  const [adminPass, setAdminPass] = useState("")

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (driverPass !== "Jf2025") {
        setError("Contraseña de conductor incorrecta")
        setLoading(false)
        return
      }

      const user = await getUserByPhone(driverPhone)

      if (!user) {
        setError("Número de celular no registrado. Contacte al administrador.")
        setLoading(false)
        return
      }

      if (user.role !== "driver") {
        setError("Este usuario no tiene perfil de conductor.")
        setLoading(false)
        return
      }

      localStorage.setItem("gps_jf_user", JSON.stringify(user))
      router.push("/driver")
    } catch (err) {
      console.error(err)
      setError("Error al iniciar sesión")
      setLoading(false)
    }
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // 1. Intento de login con credenciales maestras (Hardcoded)
      if (adminUser === "Petroboscan" && adminPass === "Petroboscan2025") {
        const adminUserObj = {
          id: "admin-universal",
          phone_number: "admin-phone",
          full_name: "Administrador Petroboscan",
          role: "admin",
          vehicle_number: null,
        }
        localStorage.setItem("gps_jf_user", JSON.stringify(adminUserObj))
        router.push("/admin")
        return
      }

      // 2. Intento de login con base de datos (Teléfono)
      // Asumimos que si no es el usuario maestro, es un número de teléfono
      const user = await getUserByPhone(adminUser)

      if (user) {
        if (user.role !== "admin") {
          setError("Este usuario no tiene permisos de administrador.")
          setLoading(false)
          return
        }

        // Por ahora, usamos una contraseña genérica o la misma que el maestro para DB admins
        // O podríamos implementar una verificación de contraseña real si existiera en la DB
        if (adminPass !== "Jf2025" && adminPass !== "Petroboscan2025") {
          setError("Contraseña incorrecta")
          setLoading(false)
          return
        }

        localStorage.setItem("gps_jf_user", JSON.stringify(user))
        router.push("/admin")
        return
      }

      // Si no coincide con ninguno
      setError("Credenciales incorrectas o usuario no encontrado")
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError("Error al iniciar sesión")
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(https://www.webcincodev.com/blog/wp-content/uploads/2025/11/Whisk_dc8e13226f7c52c91fc44be13e2ef1b8eg.png)'
      }}
    >
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/70 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 bg-white rounded-full h-32 w-32 flex items-center justify-center shadow-lg">
            <img src="https://www.webcincodev.com/blog/wp-content/uploads/2025/11/logojf-1.png" alt="GPS JF Logo" className="h-full w-full" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#1e3a5f]">GPS JF</CardTitle>
          <p className="text-gray-500 mt-2">Sistema de Control y Rastreo</p>
        </CardHeader>
        <CardContent className="pt-6">

          <Tabs defaultValue="driver" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="driver" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Conductor
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Administrador
              </TabsTrigger>
            </TabsList>

            {/* --- FORMULARIO CONDUCTOR --- */}
            <TabsContent value="driver">
              <form onSubmit={handleDriverLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="driverPhone" className="text-gray-700 font-medium">Número de Celular</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="driverPhone"
                      type="tel"
                      placeholder="+58..."
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driverPass">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="driverPass"
                      type="password"
                      placeholder="••••••••"
                      value={driverPass}
                      onChange={(e) => setDriverPass(e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600 text-center font-medium">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold bg-[#1e3a5f] hover:bg-[#2d5a8f] transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Entrar como Conductor"}
                </Button>
              </form>
            </TabsContent>

            {/* --- FORMULARIO ADMINISTRADOR --- */}
            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="adminUser" className="text-gray-700 font-medium">Usuario o Celular</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="adminUser"
                      type="text"
                      placeholder="Usuario o +58..."
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPass">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="adminPass"
                      type="password"
                      placeholder="••••••••"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      className="pl-10 h-11 border-gray-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600 text-center font-medium">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold bg-[#1e3a5f] hover:bg-[#2d5a8f] transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Entrar como Administrador"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>
    </div>
  )
}
