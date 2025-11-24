import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBucket() {
    console.log('🔧 Intentando crear bucket profile-photos...')

    try {
        // Try to create the bucket
        const { data, error } = await supabase.storage.createBucket('profile-photos', {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        })

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ El bucket ya existe')
                return true
            }
            throw error
        }

        console.log('✅ Bucket creado exitosamente:', data)
        return true
    } catch (error) {
        console.error('❌ Error al crear bucket:', error)
        return false
    }
}

async function verifyBucket() {
    console.log('🔍 Verificando buckets...')

    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
        console.error('❌ Error al listar buckets:', error)
        return false
    }

    console.log(`📦 Buckets encontrados: ${buckets?.length || 0}`)
    buckets?.forEach(bucket => {
        console.log(`  - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`)
    })

    const profilePhotos = buckets?.find(b => b.name === 'profile-photos')
    if (profilePhotos) {
        console.log('✅ Bucket profile-photos encontrado')
        return true
    } else {
        console.log('❌ Bucket profile-photos NO encontrado')
        return false
    }
}

async function main() {
    console.log('=== Configuración de Storage ===\n')

    // First verify
    const exists = await verifyBucket()

    if (!exists) {
        console.log('\n📝 Intentando crear el bucket...\n')
        await createBucket()

        // Verify again
        console.log('\n🔍 Verificando nuevamente...\n')
        await verifyBucket()
    }

    console.log('\n=== Proceso completado ===')
}

main()
