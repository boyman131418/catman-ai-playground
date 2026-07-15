import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const BASE = 'https://api.freeastroapi.com';

async function callFreeAstro(path: string, body: unknown, key: string, wantText = false) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`FreeAstro ${path} ${r.status}: ${t.slice(0, 300)}`);
  }
  if (wantText) return await r.text();
  return await r.json();
}

async function aiSummarize(lovableKey: string, systemPrompt: string, userPayload: unknown): Promise<any> {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableKey}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: typeof userPayload === 'string' ? userPayload : JSON.stringify(userPayload) },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const jsonResp = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { action, payload = {} } = await req.json();
    const apiKey = Deno.env.get('FREEASTRO_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('FREEASTRO_API_KEY 未設定');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY 未設定');

    // Helper: build a natal object from common fields
    const asNatal = (p: any) => ({
      name: p.name || '訪客',
      year: p.year, month: p.month, day: p.day,
      hour: p.hour ?? 12, minute: p.minute ?? 0,
      city: p.city || 'Hong Kong',
      time_known: p.time_known !== false,
      tz_str: p.tz_str || 'AUTO',
    });

    if (action === 'svg') {
      const svg = await callFreeAstro('/api/v1/natal/chart/', {
        ...asNatal(payload),
        format: 'svg',
        theme_type: payload.theme_type || 'dark',
      }, apiKey, true);
      return jsonResp({ errcode: 0, data: { svg } });
    }

    if (action === 'daily') {
      const data = await callFreeAstro('/api/v3/horoscope/daily/personal', {
        birth: asNatal(payload),
        date: payload.date,
        include_interpretation_blocks: true,
      }, apiKey);
      const ai = await aiSummarize(
        lovableKey,
        '你是專業西方占星師，只用繁體中文回覆，只輸出合法 JSON。',
        `請根據以下今日個人運勢資料，撰寫繁體中文（台灣用語）解讀。\n${JSON.stringify(data).slice(0, 8000)}\n\n請只回傳 JSON：\n{ "summary": "今日整體運勢（150-220字）", "love": "愛情建議（60-100字）", "career": "事業建議（60-100字）", "money": "財運建議（60-100字）", "health": "健康建議（60-100字）", "advice": "一句話行動指引（30-50字）" }`,
      );
      return jsonResp({ errcode: 0, data: { raw: data, interpretation: ai } });
    }

    if (action === 'weekly') {
      const data = await callFreeAstro('/api/v3/horoscope/weekly/personal', {
        birth: asNatal(payload),
        week_start: payload.week_start,
      }, apiKey);
      const ai = await aiSummarize(
        lovableKey,
        '你是專業西方占星師，只用繁體中文回覆，只輸出合法 JSON。',
        `請根據以下本週個人運勢資料，撰寫繁體中文（台灣用語）解讀。\n${JSON.stringify(data).slice(0, 8000)}\n\n請只回傳 JSON：\n{ "summary": "本週整體主題與能量（180-260字）", "highlights": ["三個關鍵日的重點（各30-60字）"], "love": "愛情/人際（80-120字）", "career": "事業/學業（80-120字）", "money": "財富（60-100字）", "advice": "本週行動指引（40-70字）" }`,
      );
      return jsonResp({ errcode: 0, data: { raw: data, interpretation: ai } });
    }

    if (action === 'transits') {
      const natal = asNatal(payload.natal || payload);
      const now = new Date();
      const iso = payload.transit_date || `${now.toISOString().slice(0, 10)}T12:00`;
      const data = await callFreeAstro('/api/v1/transits/calculate', {
        natal,
        transit_date: iso,
        current_city: payload.current_city || natal.city,
        tz_str: 'AUTO',
      }, apiKey);
      const ai = await aiSummarize(
        lovableKey,
        '你是專業西方占星師，只用繁體中文回覆，只輸出合法 JSON。',
        `請根據以下流年 Transits 資料（行運行星對本命盤影響），撰寫繁體中文（台灣用語）解讀，找出 3-5 個最重要相位。\n${JSON.stringify(data).slice(0, 8000)}\n\n請只回傳 JSON：\n{ "summary": "當前宇宙氣場總覽（150-220字）", "key_transits": [ { "title": "相位名稱（如：木星三分本命金星）", "meaning": "含義（60-100字）", "period": "影響期" } ], "opportunities": "機會提示（80-120字）", "cautions": "需注意事項（80-120字）", "advice": "行動建議（60-100字）" }`,
      );
      return jsonResp({ errcode: 0, data: { raw: data, interpretation: ai } });
    }

    if (action === 'synastry') {
      const a = asNatal(payload.person_a);
      const b = asNatal(payload.person_b);
      const data = await callFreeAstro('/api/v2/western/synastry', {
        person_a: { ...a, subject_name: a.name },
        person_b: { ...b, subject_name: b.name },
      }, apiKey).catch(async () => {
        // fallback to summary endpoint if v2 shape differs
        return await callFreeAstro('/api/v1/western/synastry/summary', {
          first_subject: { ...a },
          second_subject: { ...b },
        }, apiKey);
      });
      const ai = await aiSummarize(
        lovableKey,
        '你是專業西方占星師，只用繁體中文回覆，只輸出合法 JSON。',
        `請根據以下兩人合盤（Synastry）資料，撰寫繁體中文（台灣用語）深度分析。\n${JSON.stringify(data).slice(0, 8000)}\n\n請只回傳 JSON：\n{ "archetype": "關係原型描述（80-120字）", "scores": { "overall": 0-100 分, "romance": 0-100, "communication": 0-100, "stability": 0-100, "growth": 0-100 }, "strengths": "關係優勢（120-180字）", "challenges": "潛在挑戰（120-180字）", "key_aspects": ["3-5 個關鍵相位解讀，各 30-60字"], "advice": "維繫關係的建議（100-150字）" }`,
      );
      return jsonResp({ errcode: 0, data: { raw: data, interpretation: ai } });
    }

    if (action === 'bazi') {
      const data = await callFreeAstro('/api/v1/chinese/bazi', {
        year: payload.year, month: payload.month, day: payload.day,
        hour: payload.hour ?? 12, minute: payload.minute ?? 0,
        city: payload.city || 'Hong Kong',
        sex: payload.sex || 'M',
        time_standard: 'civil',
        include_pinyin: true,
        include_stars: true,
        include_interactions: true,
        include_professional: true,
      }, apiKey);
      const ai = await aiSummarize(
        lovableKey,
        '你是資深中國八字命理師，只用繁體中文回覆，只輸出合法 JSON。',
        `請根據以下八字四柱資料，撰寫繁體中文（台灣用語）完整命理分析。\n${JSON.stringify(data).slice(0, 8000)}\n\n請只回傳 JSON：\n{ "day_master": "日主分析（日主是甚麼、五行、旺弱，120-180字）", "personality": "性格特質（150-220字）", "career": "事業運（120-180字）", "wealth": "財運（120-180字）", "love": "感情婚姻（120-180字）", "health": "健康建議（100-150字）", "luck_cycle": "當前大運分析（100-150字）", "favorable": { "elements": "喜用神", "colors": "利色", "direction": "利方位", "numbers": "利數字" }, "advice": "一生指引（80-120字）" }`,
      );
      return jsonResp({ errcode: 0, data: { raw: data, interpretation: ai } });
    }

    return jsonResp({ errcode: 400, errmsg: `未知動作：${action}` });
  } catch (e) {
    console.error(e);
    return jsonResp({ errcode: -1, errmsg: String((e as any)?.message || e) });
  }
});
