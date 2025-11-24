"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StorageDiagnosticPage() {
    const [results, setResults] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const addResult = (message: string) => {
        setResults(prev => [...prev, message])
    }

    const runDiagnostics = async () => {
        setResults([])
        setLoading(true)
        addResult("🔍 Iniciando diagnóstico...")

        try {
            // Test 1: Check Supabase client
            addResult("✅ Cliente de Supabase inicializado")

            // Test 2: List all buckets
            addResult("📦 Listando buckets disponibles...")
            const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

            if (bucketsError) {
                addResult(`❌ Error al listar buckets: ${bucketsError.message}`)
            } else {
                addResult(`✅ Buckets encontrados: ${buckets?.length || 0}`)
                buckets?.forEach(bucket => {
                    addResult(`  - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
                })
            }

            // Test 3: Check if profile-photos exists
            const profilePhotosBucket = buckets?.find(b => b.name === 'profile-photos')
            if (profilePhotosBucket) {
                addResult("✅ Bucket 'profile-photos' encontrado")
                addResult(`  - Público: ${profilePhotosBucket.public ? 'Sí' : 'No'}`)
            } else {
                addResult("❌ Bucket 'profile-photos' NO encontrado")
                addResult("💡 Necesitas crear el bucket 'profile-photos' en Supabase Dashboard")
            }

            // Test 4: Try to list files in profile-photos
            if (profilePhotosBucket) {
                addResult("📁 Intentando listar archivos en profile-photos...")
                const { data: files, error: filesError } = await supabase.storage
                    .from('profile-photos')
                    .list('avatars', { limit: 10 })

                if (filesError) {
                    addResult(`⚠️ Error al listar archivos: ${filesError.message}`)
                } else {
                    addResult(`✅ Archivos en /avatars: ${files?.length || 0}`)
                }
            }

            // Test 5: Check environment variables
            addResult("🔑 Verificando variables de entorno...")
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

            if (supabaseUrl) {
                addResult(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`)
            } else {
                addResult("❌ NEXT_PUBLIC_SUPABASE_URL no configurada")
            }

            if (supabaseKey) {
                addResult(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 20)}...`)
            } else {
                addResult("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no configurada")
            }

        } catch (error: any) {
            addResult(`❌ Error general: ${error.message}`)
        } finally {
            setLoading(false)
            addResult("✅ Diagnóstico completado")
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Diagnóstico de Supabase Storage</h1>

                <Card className="bg-gray-800 border-gray-700 mb-6">
                    <CardHeader>
                        <CardTitle>Prueba de Conexión</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={runDiagnostics}
                            disabled={loading}
                            className="bg-cyan-600 hover:bg-cyan-700"
                        >
                            {loading ? "Ejecutando..." : "Ejecutar Diagnóstico"}
                        </Button>
                    </CardContent>
                </Card>

                {results.length > 0 && (
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle>Resultados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="font-mono text-sm space-y-2">
                                {results.map((result, index) => (
                                    <div key={index} className="text-gray-300">
                                        {result}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="bg-gray-800 border-gray-700 mt-6">
                    <CardHeader>
                        <CardTitle>Instrucciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-gray-300">
                        <div>
                            <h3 className="font-bold text-white mb-2">Si el bucket no aparece:</h3>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Ve a Supabase Dashboard → Storage</li>
                                <li>Crea un nuevo bucket llamado exactamente: <code className="bg-gray-700 px-2 py-1 rounded">profile-photos</code></li>
                                <li>Marca la opción "Public bucket"</li>
                                <li>Vuelve a ejecutar este diagnóstico</li>
                            </ol>
                        </div>

                        <div>
                            <h3 className="font-bold text-white mb-2">Si las variables de entorno faltan:</h3>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Verifica que el archivo .env.local existe</li>
                                <li>Debe contener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                                <li>Reinicia el servidor de desarrollo (npm run dev)</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
