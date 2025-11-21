"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, FileText, Download, Calendar, BarChart3, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Report {
    id: string
    report_type: "daily" | "weekly" | "monthly" | "custom"
    title: string
    description: string
    start_date: string
    end_date: string
    generated_by: string
    created_at: string
}

export default function ReportsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState<Report[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const router = useRouter()

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
        loadReports()
    }, [router])

    const loadReports = () => {
        // Mock data
        const mockReports: Report[] = [
            {
                id: "1",
                report_type: "daily",
                title: "Reporte Diario - 20/11/2025",
                description: "Resumen de actividades del día",
                start_date: new Date().toISOString(),
                end_date: new Date().toISOString(),
                generated_by: "Admin",
                created_at: new Date().toISOString(),
            },
            {
                id: "2",
                report_type: "weekly",
                title: "Reporte Semanal - Semana 47",
                description: "Análisis semanal de la flota",
                start_date: new Date(Date.now() - 604800000).toISOString(),
                end_date: new Date().toISOString(),
                generated_by: "Admin",
                created_at: new Date(Date.now() - 86400000).toISOString(),
            },
            {
                id: "3",
                report_type: "monthly",
                title: "Reporte Mensual - Noviembre 2025",
                description: "Estadísticas mensuales completas",
                start_date: new Date(2025, 10, 1).toISOString(),
                end_date: new Date(2025, 10, 30).toISOString(),
                generated_by: "Admin",
                created_at: new Date(Date.now() - 172800000).toISOString(),
            },
        ]
        setReports(mockReports)
        setLoading(false)
    }

    const handleLogout = () => {
        localStorage.removeItem("gps_jf_user")
        router.push("/")
    }

    const filteredReports = reports.filter(
        (report) =>
            report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.description.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: reports.length,
        daily: reports.filter((r) => r.report_type === "daily").length,
        weekly: reports.filter((r) => r.report_type === "weekly").length,
        monthly: reports.filter((r) => r.report_type === "monthly").length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/80">Cargando reportes...</p>
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
                            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
                            <p className="text-sm text-gray-500 mt-1">Genera y descarga reportes del sistema</p>
                        </div>
                        <Button className="bg-[#1e3a5f] hover:bg-[#2d5a8f]">
                            <FileText className="h-4 w-4 mr-2" />
                            Generar Reporte
                        </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total Reportes</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                                </div>
                                <FileText className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Diarios</p>
                                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.daily}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Semanales</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-1">{stats.weekly}</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Mensuales</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{stats.monthly}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-orange-600" />
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
                            placeholder="Buscar reportes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Reports Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReports.map((report) => (
                            <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{report.title}</h3>
                                                <p className="text-xs text-gray-500 mt-1">{report.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Tipo:</span>
                                            <span
                                                className={`px-2 py-1 text-xs font-semibold rounded-full ${report.report_type === "daily"
                                                        ? "bg-green-100 text-green-800"
                                                        : report.report_type === "weekly"
                                                            ? "bg-purple-100 text-purple-800"
                                                            : "bg-orange-100 text-orange-800"
                                                    }`}
                                            >
                                                {report.report_type === "daily"
                                                    ? "Diario"
                                                    : report.report_type === "weekly"
                                                        ? "Semanal"
                                                        : "Mensual"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Periodo:</span>
                                            <span className="font-medium text-gray-900">
                                                {format(new Date(report.start_date), "dd/MM/yyyy", { locale: es })} -{" "}
                                                {format(new Date(report.end_date), "dd/MM/yyyy", { locale: es })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Generado:</span>
                                            <span className="font-medium text-gray-900">
                                                {format(new Date(report.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Por:</span>
                                            <span className="font-medium text-gray-900">{report.generated_by}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-200">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Download className="h-4 w-4 mr-2" />
                                            Descargar PDF
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredReports.length === 0 && (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No se encontraron reportes</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
