import type { Handler } from '@netlify/functions'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

type Line = {
  code: string; name: string; unit: string;
  qty: number; unit_price: number; line_total: number;
}

type Payload = {
  project: string
  customer: string
  currency: string
  subtotal: number
  tax: number
  total: number
  lines: Line[]
  meta?: { rule_set_version?: string; price_list_id?: string; compute_hash?: string }
}

const fmt = (n: number, ccy: string) => `${ccy} ${Number(n || 0).toFixed(2)}`

function buildHtml(p: Payload) {
  const ccy = p.currency || 'EUR'
  const rows = (p.lines || []).map(l => `
    <tr>
      <td>${escapeHtml(l.code)}</td>
      <td>${escapeHtml(l.name)}</td>
      <td class="t-right">${escapeHtml(l.unit)}</td>
      <td class="t-right">${l.qty ?? 0}</td>
      <td class="t-right">${fmt(l.unit_price, ccy)}</td>
      <td class="t-right">${fmt(l.line_total, ccy)}</td>
    </tr>`).join('')

  const meta = p.meta || {}
  const footer = `Rule set v${meta.rule_set_version ?? '1'} • Price list ${meta.price_list_id ?? 'default'} • Hash ${meta.compute_hash ?? ''}`

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Quotation</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif; font-size: 12px; color: #111; margin: 0; padding: 24px; }
      h1 { font-size: 22px; margin: 0 0 6px; }
      .muted { color: #666; }
      .section { margin-top: 18px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
      th { text-align: left; font-weight: 600; background: #fafafa; }
      .t-right { text-align: right; }
      .totals { margin-top: 8px; width: 40%; margin-left: auto; }
      .totals td { border: none; }
      .hr { height: 1px; background: #e6e6e6; margin: 12px 0; }
      .footer { color: #666; font-size: 10px; margin-top: 14px; }
      .header { display: flex; justify-content: space-between; align-items: baseline; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>Quotation</h1>
        <div class="muted">Project: ${escapeHtml(p.project || 'Untitled')}</div>
        <div class="muted">Customer: ${escapeHtml(p.customer || '')}</div>
      </div>
      <div class="muted">${new Date().toLocaleDateString()}</div>
    </div>

    <div class="section">
      <div class="hr"></div>
      <h3>Bill of Materials</h3>
      <table>
        <thead>
          <tr>
            <th style="width:18%">Code</th>
            <th style="width:36%">Description</th>
            <th class="t-right" style="width:10%">Unit</th>
            <th class="t-right" style="width:12%">Qty</th>
            <th class="t-right" style="width:12%">Unit</th>
            <th class="t-right" style="width:12%">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <table class="totals">
      <tr><td>Subtotal</td><td class="t-right">${fmt(p.subtotal, ccy)}</td></tr>
      <tr><td>Tax</td><td class="t-right">${fmt(p.tax, ccy)}</td></tr>
      <tr><td><strong>Total</strong></td><td class="t-right"><strong>${fmt(p.total, ccy)}</strong></td></tr>
    </table>

    <div class="footer">${escapeHtml(footer)}</div>
  </body>
  </html>`
}

function escapeHtml(s: any) {
  const str = String(s ?? '')
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}

export const handler: Handler = async (event) => {
  try {
    const payload: Payload = event.body ? JSON.parse(event.body) : {
      project: 'Untitled', customer: '', currency: 'EUR', subtotal: 0, tax: 0, total: 0, lines: []
    }

    const html = buildHtml(payload)

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 1 } // approx A4 @ 96dpi
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Optional: header/footer or margins
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' }
    })
    await browser.close()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="quote.pdf"',
        'Cache-Control': 'no-store'
      },
      body: Buffer.from(pdf).toString('base64'),
      isBase64Encoded: true
    }
  } catch (err: any) {
    console.error('PDF error:', err)
    return { statusCode: 500, body: 'PDF generation failed' }
  }
}
