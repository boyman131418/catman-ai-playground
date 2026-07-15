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

function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    // Accept lat/lon/ip/city from body (preferred — client already did IP lookup)
    let body: any = {}
    if (req.method === 'POST') {
      try { body = await req.json() } catch {}
    }

    let lat: number | undefined = Number(body.lat ?? url.searchParams.get('lat')) || undefined
    let lon: number | undefined = Number(body.lon ?? url.searchParams.get('lon')) || undefined
    let ip: string = body.ip || url.searchParams.get('ip') || getClientIp(req) || ''
    let city: string = body.city || ''
    let country: string = body.country || ''
    let country_code: string = body.country_code || ''
    let region: string = body.region || ''
    let timezone: string = body.timezone || ''

    // Fallback: if client did not supply lat/lon, try ipapi.co server-side
    if (lat === undefined || lon === undefined) {
      const ipUrl = ip ? `https://ipapi.co/${ip}/json/` : `https://ipapi.co/json/`
      const ipRes = await fetch(ipUrl)
      const ipData: any = await safeJson(ipRes) || {}
      lat = typeof ipData.latitude === 'number' ? ipData.latitude : lat
      lon = typeof ipData.longitude === 'number' ? ipData.longitude : lon
      ip = ipData.ip || ip
      city = city || ipData.city || ''
      country = country || ipData.country_name || ''
      country_code = country_code || ipData.country_code || ''
      region = region || ipData.region || ''
      timezone = timezone || ipData.timezone || ''
    }

    if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
      return new Response(JSON.stringify({ error: '無法偵測位置', ip }), {
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

    // Fill city/country from OWM if still missing
    if (!city && current?.name) city = current.name
    if (!country_code && current?.sys?.country) country_code = current.sys.country

    const payload = {
      ip,
      location: { city, region, country, country_code, lat, lon, timezone },
      current,
      forecast,
      air,
      fetched_at: new Date().toISOString(),
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('weather error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
