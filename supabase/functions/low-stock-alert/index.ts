import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { itemName, sku, quantity, reorderThreshold, supplierName } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'StockPilot <onboarding@resend.dev>',
        to: ['mishrasrijan2305@gmail.com'],
        subject: `⚠️ Low Stock Alert: ${itemName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: #4f46e5; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Low Stock Alert</h1>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="color: #475569; margin: 0 0 16px;">The following item has dropped below its reorder threshold:</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 13px;">Item Name</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">${itemName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 13px;">SKU</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">${sku}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 13px;">Current Quantity</td>
                  <td style="padding: 10px 0; color: #ef4444; font-weight: 600;">${quantity}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 13px;">Reorder Threshold</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">${reorderThreshold}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; font-size: 13px;">Supplier</td>
                  <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">${supplierName || 'N/A'}</td>
                </tr>
              </table>
              <div style="margin-top: 24px; padding: 12px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                <p style="color: #dc2626; margin: 0; font-size: 13px;">Action required: Please raise a purchase order immediately.</p>
              </div>
              <p style="margin-top: 24px; color: #94a3b8; font-size: 12px;">Sent by StockPilot — inventory operations, engineered for clarity.</p>
            </div>
          </div>
        `
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
