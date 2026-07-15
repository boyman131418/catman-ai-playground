import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const OWM_KEY = Deno.env.get('OPENWEATHER_API_KEY') ?? ''

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip')
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    let ip = url.searchParams.get('ip') || getClientIp(req) || ''

    // ipapi.co lookup (empty path = auto-detect based on caller IP)
    const ipUrl = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`
    const ipRes = await fetch(ipUrl)
    const ipData: any = await safeJson(ipRes) || {}

    const lat = ipData.latitude
    const lon = ipData.longitude
    ip = ipData.ip || ip

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return new Response(JSON.stringify({ error: '無法偵測位置', ipData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const base = 'https://api.openweathermap.org/data/2.5'
    const common = `lat=${lat}&lon=${lon}&appid=${OWM_KEY}`
    const [curRes, fcRes, airRes] = await Promise.all([
      fetch(`${base}/weather?${common}&units=metric&lang=zh_tw`),
      fetch(`${base}/forecast?${common}&units=metric&lang=zh_tw`),
      fetch(`${base}/air_pollution?${common}`),
    ])
    const [current, forecast, air] = await Promise.all([
      safeJson(curRes), safeJson(fcRes), safeJson(airRes),
    ])

    const payload = {
      ip,
      location: {
        city: ipData.city,
        region: ipData.region,
        country: ipData.country_name,
        country_code: ipData.country_code,
        lat, lon,
        timezone: ipData.timezone,
      },
      current,
      forecast,
      air,
      fetched_at: new Date().toISOString(),
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
