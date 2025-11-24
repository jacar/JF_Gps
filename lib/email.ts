import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    try {
        // Fetch SMTP settings from database
        const supabase = await createClient()
        const { data: settings, error } = await supabase
            .from('settings')
            .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure')
            .single()

        if (error || !settings) {
            return { success: false, message: 'No se encontró configuración SMTP' }
        }

        if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
            return { success: false, message: 'Configuración SMTP incompleta. Por favor ingresa Host, Usuario y Contraseña en la sección de Configuración.' }
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port || 587,
            secure: settings.smtp_secure || false,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass,
            },
        })

        // Send email
        const info = await transporter.sendMail({
            from: settings.smtp_user,
            to,
            subject,
            html,
        })

        console.log('Email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error('Error sending email:', error)
        return { success: false, message: error.message || 'Error desconocido al enviar correo' }
    }
}
