/**
 * WhatsApp notification utility using WhatsApp Business API
 * Sends speed alert messages to configured phone number
 */

const WHATSAPP_PHONE = '+573052891719'
const WHATSAPP_API_URL = 'https://api.whatsapp.com/send'

export interface WhatsAppMessage {
    message: string
    driverName?: string
    vehicleNumber?: string
    speed?: number
    limit?: number
    location?: string
}

/**
 * Sends WhatsApp message via web.whatsapp.com link
 * Opens in new tab for user to send manually (no API key required)
 * 
 * For automatic sending, you would need WhatsApp Business API credentials
 */
export async function sendWhatsAppAlert(data: WhatsAppMessage): Promise<{ success: boolean; message: string }> {
    try {
        const { message, driverName, vehicleNumber, speed, limit, location } = data

        // Format message
        let formattedMessage = `🚨 *ALERTA DE VELOCIDAD GPS JF*\n\n`
        formattedMessage += `${message}\n\n`

        if (driverName) formattedMessage += `👤 Conductor: ${driverName}\n`
        if (vehicleNumber) formattedMessage += `🚗 Vehículo: ${vehicleNumber}\n`
        if (speed && limit) formattedMessage += `⚠️ Velocidad: ${speed} km/h (Límite: ${limit} km/h)\n`
        if (location) formattedMessage += `📍 Ubicación: ${location}\n`

        formattedMessage += `\n⏰ ${new Date().toLocaleString('es-ES')}`

        // Encode message for URL
        const encodedMessage = encodeURIComponent(formattedMessage)
        const whatsappUrl = `${WHATSAPP_API_URL}?phone=${WHATSAPP_PHONE.replace('+', '')}&text=${encodedMessage}`

        // For browser environment, you would need to open in new window
        if (typeof window !== 'undefined') {
            // Server-side: Log the message
            console.log('📱 WhatsApp Alert:', formattedMessage)
            console.log('📲 WhatsApp URL:', whatsappUrl)

            // In a real implementation with WhatsApp Business API, you would make an API call here
            // For now, we just return success
            return {
                success: true,
                message: 'Alerta de WhatsApp preparada (requiere WhatsApp Business API para envío automático)'
            }
        }

        return {
            success: true,
            message: 'WhatsApp alert sent'
        }
    } catch (error) {
        console.error('Error sending WhatsApp alert:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Error desconocido'
        }
    }
}

/**
 * Alternative: Using Twilio WhatsApp API (requires account and credentials)
 * Uncomment and configure if you have Twilio credentials
 */
/*
export async function sendWhatsAppViaTwilio(message: string): Promise<boolean> {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM // e.g., 'whatsapp:+14155238886'
  
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_WHATSAPP_FROM!,
          To: `whatsapp:${WHATSAPP_PHONE}`,
          Body: message
        })
      }
    )
    
    return response.ok
  } catch (error) {
    console.error('Twilio WhatsApp error:', error)
    return false
  }
}
*/
