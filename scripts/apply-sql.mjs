import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer variables de entorno del archivo .env si no están cargadas
// Nota: En un entorno real usaríamos dotenv, pero aquí leeremos manualmente para simplificar
const envPath = path.join(__dirname, '../.env');
let connectionString = process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/POSTGRES_URL_NON_POOLING="([^"]+)"/);
    if (match) {
        connectionString = match[1];
    }
}

if (!connectionString) {
    console.error('❌ No se encontró la variable POSTGRES_URL_NON_POOLING');
    process.exit(1);
}

// Eliminar parámetros SSL de la URL para evitar conflictos
const url = new URL(connectionString);
url.searchParams.delete('sslmode');
url.searchParams.delete('ssl');

const client = new pg.Client({
    connectionString: url.toString(),
    ssl: {
        rejectUnauthorized: false
    }
});

async function applySql() {
    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');

        const sqlFile = process.argv[2] || '006_create_missing_tables.sql';
        const sqlPath = path.join(__dirname, sqlFile);

        if (!fs.existsSync(sqlPath)) {
            console.error(`❌ No se encontró el archivo SQL: ${sqlFile}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`🚀 Ejecutando script SQL: ${sqlFile}...`);
        await client.query(sql);

        console.log('✅ Tablas creadas exitosamente!');
    } catch (err) {
        console.error('❌ Error ejecutando SQL:', err);
    } finally {
        await client.end();
    }
}

applySql();
