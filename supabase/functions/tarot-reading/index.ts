import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MAJOR_ARCANA = [
  { no: 0, name: '愚者', keywords: '純真、冒險、新開始', element: '風', astrology: '天王星' },
  { no: 1, name: '魔術師', keywords: '創造、意志、行動', element: '風', astrology: '水星' },
  { no: 2, name: '女祭司', keywords: '直覺、神秘、內在智慧', element: '水', astrology: '月亮' },
  { no: 3, name: '皇后', keywords: '豐饒、母性、創造力', element: '土', astrology: '金星' },
  { no: 4, name: '皇帝', keywords: '權威、秩序、掌控', element: '火', astrology: '牡羊座' },
  { no: 5, name: '教皇', keywords: '傳統、教導、信仰', element: '土', astrology: '金牛座' },
  { no: 6, name: '戀人', keywords: '愛情、抉擇、結合', element: '風', astrology: '雙子座' },
  { no: 7, name: '戰車', keywords: '意志、勝利、前進', element: '水', astrology: '巨蟹座' },
  { no: 8, name: '力量', keywords: '勇氣、耐心、內在力量', element: '火', astrology: '獅子座' },
  { no: 9, name: '隱者', keywords: '內省、指引、獨處', element: '土', astrology: '處女座' },
  { no: 10, name: '命運之輪', keywords: '變化、循環、機遇', element: '火', astrology: '木星' },
  { no: 11, name: '正義', keywords: '公平、真理、因果', element: '風', astrology: '天秤座' },
  { no: 12, name: '吊人', keywords: '犧牲、暫停、換位思考', element: '水', astrology: '海王星' },
  { no: 13, name: '死神', keywords: '結束、轉化、重生', element: '水', astrology: '天蠍座' },
  { no: 14, name: '節制', keywords: '平衡、調和、耐心', element: '火', astrology: '射手座' },
  { no: 15, name: '惡魔', keywords: '慾望、束縛、誘惑', element: '土', astrology: '摩羯座' },
  { no: 16, name: '高塔', keywords: '崩塌、突變、覺醒', element: '火', astrology: '火星' },
  { no: 17, name: '星星', keywords: '希望、靈感、療癒', element: '風', astrology: '水瓶座' },
  { no: 18, name: '月亮', keywords: '幻象、潛意識、不安', element: '水', astrology: '雙魚座' },
  { no: 19, name: '太陽', keywords: '光明、成功、喜悅', element: '火', astrology: '太陽' },
  { no: 20, name: '審判', keywords: '重生、覺悟、召喚', element: '火', astrology: '冥王星' },
  { no: 21, name: '世界', keywords: '完成、圓滿、成就', element: '土', astrology: '土星' },
];

const SPREADS: Record<number, { name: string; positions: { name: string; desc: string }[] }> = {
  1: { name: '一張牌占卜法', positions: [{ name: '核心指引', desc: '當下最需要關注的訊息' }] },
  2: { name: '二選一牌陣', positions: [
    { name: '選項 A', desc: '第一個選擇的能量走向' },
    { name: '選項 B', desc: '第二個選擇的能量走向' },
  ]},
  3: { name: '聖三角牌陣', positions: [
    { name: '過去', desc: '影響現況的過去因素' },
    { name: '現在', desc: '當前的狀態' },
    { name: '未來', desc: '可能的發展方向' },
  ]},
  4: { name: '時光箭牌陣', positions: [
    { name: '過去', desc: '過去的影響' },
    { name: '現在', desc: '當前的處境' },
    { name: '未來', desc: '即將到來的趨勢' },
  ]},
  5: { name: '四元素牌陣', positions: [
    { name: '火（行動）', desc: '你的動力與熱情' },
    { name: '水（情感）', desc: '你的情緒狀態' },
    { name: '風（思維）', desc: '你的想法與溝通' },
    { name: '土（現實）', desc: '你的物質基礎' },
  ]},
  6: { name: '戀人金字塔', positions: [
    { name: '你', desc: '你在關係中的狀態' },
    { name: '對方', desc: '對方的狀態' },
    { name: '關係', desc: '你們之間的能量' },
    { name: '結果', desc: '可能的發展' },
  ]},
  7: { name: '五行牌陣', positions: [
    { name: '金', desc: '收斂與決斷' },
    { name: '木', desc: '成長與發展' },
    { name: '水', desc: '情感與流動' },
    { name: '火', desc: '熱情與動力' },
    { name: '土', desc: '穩定與基礎' },
  ]},
  8: { name: '戀人牌陣', positions: [
    { name: '你', desc: '你的心境' },
    { name: '對方', desc: '對方的心境' },
    { name: '過去', desc: '關係的過去' },
    { name: '現在', desc: '關係的現況' },
    { name: '未來', desc: '關係的走向' },
  ]},
  9: { name: '大十字牌陣', positions: [
    { name: '核心', desc: '問題的核心' },
    { name: '阻礙', desc: '面臨的挑戰' },
    { name: '過去', desc: '過去的因素' },
    { name: '未來', desc: '未來的趨勢' },
    { name: '結果', desc: '最終結果' },
  ]},
  10: { name: '六芒星牌陣', positions: [
    { name: '過去', desc: '過去影響' },
    { name: '現在', desc: '當前處境' },
    { name: '未來', desc: '未來趨勢' },
    { name: '對策', desc: '應採取的行動' },
    { name: '環境', desc: '外在環境' },
    { name: '結果', desc: '最終結果' },
  ]},
  11: { name: '復合牌陣', positions: [
    { name: '你的心', desc: '你對復合的想法' },
    { name: '對方的心', desc: '對方對復合的想法' },
    { name: '分手原因', desc: '導致分開的核心' },
    { name: '現況', desc: '目前雙方狀態' },
    { name: '契機', desc: '復合的可能性' },
    { name: '結果', desc: '最終走向' },
  ]},
  12: { name: '七行星牌陣', positions: [
    { name: '太陽', desc: '自我與意志' },
    { name: '月亮', desc: '情感與潛意識' },
    { name: '水星', desc: '思維與溝通' },
    { name: '金星', desc: '愛情與價值' },
    { name: '火星', desc: '行動與衝突' },
    { name: '木星', desc: '擴張與幸運' },
    { name: '土星', desc: '限制與責任' },
  ]},
  13: { name: '九宮格牌陣', positions: Array.from({ length: 9 }, (_, i) => ({
    name: `第 ${i + 1} 宮`, desc: `第 ${i + 1} 個面向的訊息`,
  }))},
  14: { name: '戀人關係深度牌陣', positions: Array.from({ length: 9 }, (_, i) => ({
    name: `位置 ${i + 1}`, desc: `關係第 ${i + 1} 個層面`,
  }))},
  15: { name: '凱爾特十字牌陣', positions: [
    { name: '現況', desc: '目前的核心狀態' },
    { name: '阻礙', desc: '面臨的挑戰' },
    { name: '目標', desc: '意識層面的追求' },
    { name: '根源', desc: '潛意識的根源' },
    { name: '過去', desc: '過去的影響' },
    { name: '未來', desc: '即將發生' },
    { name: '自我', desc: '你的態度' },
    { name: '環境', desc: '外在影響' },
    { name: '希望與恐懼', desc: '內心的期待與擔憂' },
    { name: '結果', desc: '最終結果' },
  ]},
  16: { name: '生命之樹牌陣', positions: Array.from({ length: 11 }, (_, i) => ({
    name: `第 ${i + 1} 質點`, desc: `生命之樹第 ${i + 1} 個層次`,
  }))},
  17: { name: '年運週期牌陣', positions: Array.from({ length: 12 }, (_, i) => ({
    name: `${i + 1} 月`, desc: `第 ${i + 1} 個月的運勢` ,
  }))},
};

const TOPICS: Record<number, string> = {
  1: '戀愛婚姻', 2: '工作學業', 3: '人際財富', 4: '健康生活', 5: '其它綜合',
};

const GANZHI_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const GANZHI_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

function getGanzhi(date: Date): { ganzhi: string; element: string } {
  const hour = date.getHours();
  const branchIdx = Math.floor(((hour + 1) % 24) / 2);
  const stemIdx = (date.getDate() * 2 + branchIdx) % 10;
  const stem = GANZHI_STEMS[stemIdx];
  const branch = GANZHI_BRANCHES[branchIdx];
  const elements = ['木','木','火','火','土','土','金','金','水','水'];
  return { ganzhi: `${stem}${branch}時`, element: elements[stemIdx] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { spread_id = 3, topic_id = 5 } = await req.json().catch(() => ({}));
    const spread = SPREADS[spread_id] || SPREADS[3];
    const topic = TOPICS[topic_id] || TOPICS[5];
    const numCards = spread.positions.length;

    // Draw cards (with orientation) — pure random from 22 major arcana, no duplicates
    const pool = [...Array(22).keys()];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const drawn = pool.slice(0, numCards).map((cardNo, idx) => {
      const orientation = Math.random() < 0.5 ? 0 : 1; // 0 逆, 1 正 (以配合前端 rotate-180)
      const card = MAJOR_ARCANA[cardNo];
      const pos = spread.positions[idx];
      return {
        positions_index: idx + 1,
        positions_name: pos.name,
        positions_desc: pos.desc,
        orientation_code: orientation,
        orientation_text: orientation === 1 ? '正位' : '逆位',
        card_no: card.no,
        card_name: card.name,
        card_keywords: card.keywords,
        card_astrology: card.astrology,
        card_element: card.element,
        card_description: `${card.name} - ${card.keywords}`,
        image_url: `https://yuanfenju.com/Public/img/taluo/${card.no}.jpg`,
      };
    });

    // Ask Lovable AI to write interpretations (zh-tw)
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY 未設定');

    const cardsForPrompt = drawn.map((c) => ({
      index: c.positions_index,
      position: c.positions_name,
      position_desc: c.positions_desc,
      card: c.card_name,
      orientation: c.orientation_text,
      keywords: c.card_keywords,
    }));

    const prompt = `你是一位專業的塔羅牌占卜師。請以繁體中文（台灣用語）為以下抽牌結果做解讀。\n\n主題：${topic}\n牌陣：${spread.name}\n\n抽出的牌（依序）：\n${JSON.stringify(cardsForPrompt, null, 2)}\n\n請只回傳 JSON，不要額外文字，格式：\n{\n  "cards": [ { "index": number, "general": "此牌的基本含義（40-70字）", "topic": "結合主題與位置的解讀（60-100字）", "advice": "具體行動建議（40-70字）" } ],\n  "summary": "整體綜合解讀（120-180字）",\n  "oracle": "一句話神諭指引（20-40字）"\n}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: '你是專業塔羅占卜師，只以繁體中文回應，只輸出合法 JSON。' },
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

    const now = new Date();
    const { ganzhi, element } = getGanzhi(now);

    const cards = drawn.map((c) => {
      const interp = parsed.cards?.find((x: any) => x.index === c.positions_index) || {};
      return {
        ...c,
        card_interpretation: {
          general: interp.general || c.card_keywords,
          topic: interp.topic || `此牌在${topic}主題下代表相應的能量。`,
          advice: interp.advice || '保持覺察，順勢而為。',
        },
      };
    });

    return new Response(JSON.stringify({
      errcode: 0,
      errmsg: 'ok',
      data: {
        cards,
        overall_interpretation: {
          summary_message: parsed.summary || '整體能量流動中，請保持開放心態。',
          oracle_message: parsed.oracle || '相信自己的直覺。',
        },
        environment: {
          calculation_time: now.toISOString().replace('T', ' ').slice(0, 19),
          time_ganzhi: ganzhi,
          time_element: element,
        },
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ errcode: -1, errmsg: String(e?.message || e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
