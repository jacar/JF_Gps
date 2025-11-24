"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getUserByPhone } from "@/app/actions"
import { useRouter } from "next/navigation"
import { Lock, User, Truck, ShieldCheck, Menu } from "lucide-react"
import Link from "next/link"

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
      const user = await getUserByPhone(adminUser)

      if (user) {
        if (user.role !== "admin") {
          setError("Este usuario no tiene permisos de administrador.")
          setLoading(false)
          return
        }

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
    <div className="min-h-screen flex flex-col font-sans">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://www.webcincodev.com/blog/wp-content/uploads/2025/11/Whisk_dc8e13226f7c52c91fc44be13e2ef1b8eg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Overlay for better text readability if needed, though glassmorphism handles this mostly */}
      <div className="fixed inset-0 z-0 bg-black/20" />

      {/* Header / Navigation */}
      <header className="relative z-10 w-full p-4 md:p-6 flex justify-between items-center bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-4">
          <img
            src="https://www.webcincodev.com/blog/wp-content/uploads/2025/11/logojf-1.png"
            alt="Logo JF"
            className="h-10 md:h-12 object-contain"
          />
          <span className="text-white font-bold text-xl tracking-wide hidden md:block">CORPORACIÓN JF</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a
            href="https://corporacionjf.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-red-400 transition-colors font-medium text-sm uppercase tracking-wider"
          >
            Jf Maracaibo
          </a>
          <a
            href="#"
            className="text-white hover:text-red-400 transition-colors font-medium text-sm uppercase tracking-wider"
          >
            Jf Barcelona
          </a>
        </nav>

        {/* Mobile Menu Icon (Placeholder) */}
        <Button variant="ghost" size="icon" className="md:hidden text-white">
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/20 shadow-2xl bg-white/10 backdrop-blur-md text-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 bg-white/90 rounded-full h-24 w-24 flex items-center justify-center shadow-lg p-2">
              <img
                src="https://www.webcincodev.com/blog/wp-content/uploads/2025/11/logojf-1.png"
                alt="Rastreo JF Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold text-white drop-shadow-md">Rastreo JF</CardTitle>
            <p className="text-gray-200 mt-2 text-sm font-light">Sistema de Control y Monitoreo Vehicular</p>
          </CardHeader>
          <CardContent className="pt-6">

            <Tabs defaultValue="driver" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-black/40 text-gray-300 border border-white/10">
                <TabsTrigger
                  value="driver"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Conductor
                </TabsTrigger>
                <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Administrador
                </TabsTrigger>
              </TabsList>

              {/* --- FORMULARIO CONDUCTOR --- */}
              <TabsContent value="driver">
                <form onSubmit={handleDriverLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="driverPhone" className="text-gray-200 font-medium">Número de Celular</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="driverPhone"
                        type="tel"
                        placeholder="+58..."
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        className="pl-10 h-12 bg-black/40 border-white/20 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driverPass" className="text-gray-200">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="driverPass"
                        type="password"
                        placeholder="••••••••"
                        value={driverPass}
                        onChange={(e) => setDriverPass(e.target.value)}
                        className="pl-10 h-12 bg-black/40 border-white/20 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-red-500/20 border border-red-500/50 backdrop-blur-sm">
                      <p className="text-sm text-red-200 text-center font-medium">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-200 shadow-lg hover:shadow-red-900/50 border border-red-500/50"
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
                    <Label htmlFor="adminUser" className="text-gray-200 font-medium">Usuario o Celular</Label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="adminUser"
                        type="text"
                        placeholder="Usuario o +58..."
                        value={adminUser}
                        onChange={(e) => setAdminUser(e.target.value)}
                        className="pl-10 h-12 bg-black/40 border-white/20 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPass" className="text-gray-200">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="adminPass"
                        type="password"
                        placeholder="••••••••"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className="pl-10 h-12 bg-black/40 border-white/20 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-red-500/20 border border-red-500/50 backdrop-blur-sm">
                      <p className="text-sm text-red-200 text-center font-medium">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-200 shadow-lg hover:shadow-red-900/50 border border-red-500/50"
                    disabled={loading}
                  >
                    {loading ? "Verificando..." : "Entrar como Administrador"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </main>

      {/* Footer (Optional) */}
      <footer className="relative z-10 p-4 text-center text-white/50 text-xs">
        <p>
          &copy; 2025 Corporación JF. Todos los derechos reservados. | Desarrollo:{" "}
          <a
            href="https://www.armandomi.space/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors underline decoration-white/30 hover:decoration-white"
          >
            Armando Ovalle
          </a>
        </p>
      </footer>
    </div>
  )
}
