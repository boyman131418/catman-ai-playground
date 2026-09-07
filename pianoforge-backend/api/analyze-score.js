const MODEL_CANDIDATES = [...new Set([
  process.env.OPENROUTER_MODEL,
  'z-ai/glm-5.3-flash',
  'qwen/qwen3-vl-32b-instruct',
  'deepseek/deepseek-v4-flash-vision-exp'
].filter(Boolean))];

const ALLOWED = new Set([
  'https://boyman131418.github.io',
  'https://pianoforge-five-level-piano.vercel.app',
  'https://pianoforge-ai-api.vercel.app'
]);

const HARD_DEADLINE_MS = 54000;

function cors(req,res){
  const origin=req.headers.origin||'';
  if(ALLOWED.has(origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}

function cleanJSON(text){
  if(typeof text!=='string') return text;
  const s=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  return JSON.parse(s);
}

function expandCompact(raw){
  const arr=Array.isArray(raw?.n)?raw.n:[];
  const notes=arr.map((x,i)=>{
    if(!Array.isArray(x)||x.length<6) return null;
    const midi=Math.round(Number(x[0]));
    const start=Number(x[1]);
    const duration=Number(x[2]);
    const hand=x[3]==='L'?'L':'R';
    const measure=Math.max(1,Math.round(Number(x[4])||1));
    const voice=Math.max(1,Math.min(4,Math.round(Number(x[5])||1)));
    const confidence=Math.max(0,Math.min(1,Number(x[6]??0.75)));
    if(!Number.isFinite(midi)||midi<21||midi>108||!Number.isFinite(start)||start<0||!Number.isFinite(duration)||duration<=0) return null;
    return {midi,start,duration,hand,measure,voice,confidence,id:`ai${i}`};
  }).filter(Boolean).slice(0,900).sort((a,b)=>a.start-b.start||a.hand.localeCompare(b.hand)||a.midi-b.midi);

  const ts=Array.isArray(raw?.s)?raw.s:[4,4];
  const kk=Array.isArray(raw?.k)?raw.k:['','unknown',0];
  const groups=new Map();
  for(const n of notes.filter(x=>x.hand==='R')){
    const key=n.start.toFixed(5);
    if(!groups.has(key)||groups.get(key).midi<n.midi) groups.set(key,n);
  }
  const melody=[...groups.values()].sort((a,b)=>a.start-b.start).map(n=>({midi:n.midi,start:n.start,duration:n.duration,measure:n.measure,confidence:n.confidence})).slice(0,320);

  return {
    title:String(raw?.t||''),
    composer:String(raw?.a||''),
    key:{
      tonic:String(kk[0]||''),
      mode:['major','minor','unknown'].includes(kk[1])?kk[1]:'unknown',
      fifths:Number.isFinite(Number(kk[2]))?Math.max(-7,Math.min(7,Math.round(Number(kk[2])))):null
    },
    time_signature:{
      beats:Number.isFinite(Number(ts[0]))?Math.max(1,Math.min(12,Math.round(Number(ts[0])))):4,
      beat_type:[1,2,4,8,16].includes(Number(ts[1]))?Number(ts[1]):4
    },
    tempo:Number.isFinite(Number(raw?.b))?Math.max(20,Math.min(300,Number(raw.b))):88,
    overall_confidence:Math.max(0,Math.min(1,Number(raw?.q??0.7))),
    notes,
    melody,
    warnings:Array.isArray(raw?.w)?raw.w.map(String).slice(0,12):[]
  };
}

async function callOpenRouter({model,content,system,timeoutMs}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(3000,timeoutMs));
  try{
    const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{
        Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type':'application/json',
        'HTTP-Referer':'https://boyman131418.github.io/catman-ai-playground/pianoforge/',
        'X-OpenRouter-Title':'PianoForge Pro'
      },
      body:JSON.stringify({
        model,
        temperature:0,
        max_tokens:12000,
        response_format:{type:'json_object'},
        provider:{allow_fallbacks:true},
        messages:[{role:'system',content:system},{role:'user',content}]
      })
    });
    const raw=await r.json().catch(()=>({}));
    return {r,raw};
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req,res){
  const started=Date.now();
  cors(req,res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method==='GET') return res.status(200).json({
    ok:true,
    service:'PianoForge AI OMR',
    configured:Boolean(process.env.OPENROUTER_API_KEY),
    models:MODEL_CANDIDATES,
    version:'v9-compact-timeout-safe'
  });
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!process.env.OPENROUTER_API_KEY) return res.status(503).json({error:'AI backend is not configured'});

  try{
    const {images,imageDataUrl,filename='score'}=req.body||{};
    let imgs=Array.isArray(images)?images.filter(x=>typeof x==='string'&&/^data:image\//.test(x)):(/^data:image\//.test(imageDataUrl||'')?[imageDataUrl]:[]);
    if(!imgs.length) return res.status(400).json({error:'score image is required'});
    if(imgs.length>3) imgs=imgs.slice(0,3);
    const payloadChars=imgs.reduce((a,s)=>a+s.length,0);
    if(payloadChars>4_000_000) return res.status(413).json({error:'琴譜圖片資料太大，請重新選擇圖片；新版前端會自動壓縮後再送出。'});

    const system=`You are a professional optical music recognition specialist and conservatory-level piano engraver. Extract only notation visibly supported by the supplied score images. The first image is the full page; later images are overlapping crops of the same page. Reconcile crops and NEVER duplicate notes. Use quarter-note units for absolute time from the beginning: quarter=1, eighth=.5, sixteenth=.25, dotted quarter=1.5, half=2, whole=4. Preserve chords at identical start times, both hands, independent voices, accidentals, ties that extend duration, pickup measures, time signature and key signature. Never default all rhythms to quarter notes. Do not invent missing notes from familiarity with the composition.`;

    const prompt=`Analyze ${filename}. Return ONLY one compact JSON object with exactly these keys:\n`+
      `{"t":"title","a":"composer","k":["tonic","major|minor|unknown",fifths],"s":[beats,beatType],"b":tempoBPM,"q":overallConfidence,"n":[[midi,start,duration,"R|L",measure,voice,confidence],...],"w":["warning",...]}\n`+
      `Rules: n must contain ALL clearly visible piano notes from both staves, including chord tones and ledger-line notes. start is absolute quarter-note time from the beginning. duration must match printed rhythm. Use voice 1-4 to distinguish independent voices where visible. Keep confidence 0..1. No prose and no markdown.`;
    const content=[{type:'text',text:prompt},...imgs.map(url=>({type:'image_url',image_url:{url}}))];

    const attempts=[];
    for(const model of MODEL_CANDIDATES){
      const elapsed=Date.now()-started;
      const remaining=HARD_DEADLINE_MS-elapsed;
      if(remaining<6500) break;
      const timeoutMs=Math.min(48000,remaining-2500);
      let result;
      try{
        result=await callOpenRouter({model,content,system,timeoutMs});
      }catch(e){
        if(e?.name==='AbortError'){
          attempts.push({model,status:504,error:`Model timed out after ${Math.round(timeoutMs/1000)}s`});
          break;
        }
        attempts.push({model,status:502,error:e?.message||'Provider connection failed'});
        continue;
      }
      const {r,raw}=result;
      if(!r.ok){
        const message=raw?.error?.message||`OpenRouter request failed (${r.status})`;
        attempts.push({model,status:r.status,error:message});
        if(r.status===401||r.status===402) break;
        continue;
      }
      try{
        let out=raw?.choices?.[0]?.message?.content;
        if(Array.isArray(out)) out=out.map(x=>x?.text||'').join('');
        const compact=cleanJSON(out);
        const score=expandCompact(compact);
        if(score.notes.length<3){
          attempts.push({model,status:422,error:'Model returned too few usable notes'});
          continue;
        }
        return res.status(200).json({ok:true,model,score,fallbacks:attempts,elapsed_ms:Date.now()-started});
      }catch(e){
        attempts.push({model,status:422,error:e?.message||'Invalid JSON output'});
      }
    }

    const timed=attempts.some(a=>a.status===504);
    const tos=attempts.some(a=>a.status===403&&/terms of service|prohibited/i.test(a.error||''));
    return res.status(timed?504:502).json({
      error:timed
        ? 'AI 讀譜超過伺服器可等待時間。新版已停止無限等待；請再試一次，或先裁切成較少系統的琴譜圖片。'
        : tos
          ? '部分 AI provider 因帳戶/供應商條款限制拒絕請求，系統已嘗試其他視覺模型但未成功。'
          : (attempts[0]?.error||'All AI vision providers failed'),
      attempts,
      elapsed_ms:Date.now()-started
    });
  }catch(e){
    return res.status(500).json({error:e?.message||'AI score analysis failed'});
  }
}
