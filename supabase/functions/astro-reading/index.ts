import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FREEASTRO_BASE = 'https://api.freeastroapi.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      name = '訪客',
      year, month, day,
      time_known = true,
      hour = 12, minute = 0,
      city = 'Hong Kong',
      tz_str = 'AUTO',
      house_system = 'placidus',
    } = body ?? {};

    if (!year || !month || !day) {
      return new Response(JSON.stringify({ errcode: 400, errmsg: '請提供出生年月日' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('FREEASTRO_API_KEY');
    if (!apiKey) throw new Error('FREEASTRO_API_KEY 未設定');

    const natalPayload: any = {
      name, year, month, day,
      time_known, hour, minute,
      city, tz_str,
      house_system, zodiac_type: 'tropical',
      response_format: 'full',
      include_speed: true,
      include_dignity: true,
      include_stelliums: true,
      include_dominants: true,
      dominants_method: 'modern',
    };

    const natalResp = await fetch(`${FREEASTRO_BASE}/api/v1/natal/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(natalPayload),
    });

    if (!natalResp.ok) {
      const errText = await natalResp.text();
      console.error('FreeAstroAPI 錯誤', natalResp.status, errText);
      return new Response(JSON.stringify({
        errcode: natalResp.status,
        errmsg: `占星計算失敗（${natalResp.status}）：${errText.slice(0, 200)}`,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const natal = await natalResp.json();

    // Extract concise summary for AI
    const planets = (natal.planets || []).map((p: any) => ({
      name: p.name, sign: p.sign, pos: p.pos, house: p.house,
      retrograde: p.retrograde,
    }));
    const houses = (natal.houses || []).map((h: any) => ({
      house: h.house ?? h.number, sign: h.sign, pos: h.pos,
    }));
    const aspects = (natal.aspects || []).slice(0, 20).map((a: any) => ({
      p1: a.p1_name ?? a.planet1, p2: a.p2_name ?? a.planet2,
      aspect: a.aspect ?? a.name, orb: a.orb,
    }));
    const dominants = natal.dominants_profile ?? natal.dominants ?? null;

    // Ask Lovable AI for full Chinese interpretation
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY 未設定');

    const prompt = `你是專業的西方占星師。以下是 ${name} 的本命盤（Natal Chart）資料，請以繁體中文（台灣用語）撰寫完整、深入且溫暖的分析。

出生資料：${year}年${month}月${day}日 ${time_known ? `${hour}:${String(minute).padStart(2,'0')}` : '（時間未知）'} · ${city}

行星位置：
${JSON.stringify(planets, null, 2)}

宮位（Houses）：
${JSON.stringify(houses, null, 2)}

主要相位（Aspects）：
${JSON.stringify(aspects, null, 2)}

主導能量（Dominants）：
${JSON.stringify(dominants, null, 2)}

請只回傳合法 JSON，格式如下：
{
  "core_identity": "太陽/月亮/上升三大主軸總覽，說明性格核心（150-220字）",
  "personality": "性格特質與內在動機（150-220字）",
  "love": "愛情觀、關係模式、金星火星分析（150-220字）",
  "career": "事業方向、天賦、10宮/6宮/水星分析（150-220字）",
  "wealth": "財富傾向、2宮/8宮/木星分析（120-180字）",
  "health": "健康傾向、能量平衡、6宮分析（100-160字）",
  "life_theme": "本命盤呈現的人生主題與核心課題（120-180字）",
  "advice": "給予的具體人生建議（120-180字）",
  "lucky": { "colors": "幸運色（如：金、白）", "numbers": "幸運數字（如：3、7）", "direction": "有利方向", "gemstone": "幸運寶石" },
  "oracle": "一句神諭式的鼓勵（20-40字）"
}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: '你是專業的西方占星師，只以繁體中文回應，只輸出合法 JSON。' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text();
      console.error('AI 錯誤', aiResp.status, errBody);
      return new Response(JSON.stringify({ errcode: -1, errmsg: `AI 解讀失敗（${aiResp.status}）` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    // Extract simple sign summary
    const sun = planets.find((p: any) => p.name === 'Sun');
    const moon = planets.find((p: any) => p.name === 'Moon');
    const asc = (natal.axes?.ascendant) || (houses[0] ? { sign: houses[0].sign } : null);

    return new Response(JSON.stringify({
      errcode: 0,
      errmsg: 'ok',
      data: {
        subject: {
          name, year, month, day, hour, minute, city, time_known,
        },
        big_three: {
          sun: sun ? { sign: sun.sign, pos: sun.pos, house: sun.house } : null,
          moon: moon ? { sign: moon.sign, pos: moon.pos, house: moon.house } : null,
          ascendant: asc,
        },
        planets, houses, aspects, dominants,
        interpretation: parsed,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ errcode: -1, errmsg: String((e as any)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
