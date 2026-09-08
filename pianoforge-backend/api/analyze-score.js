const MODEL_CANDIDATES = [...new Set([
  process.env.OPENROUTER_MODEL,
  'qwen/qwen3-vl-32b-instruct',
  'z-ai/glm-5.3-flash',
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

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function normalizePass(raw){
  const ts=Array.isArray(raw?.s)?raw.s:[4,4];
  const beats=Number.isFinite(Number(ts[0]))?clamp(Math.round(Number(ts[0])),1,12):4;
  const beatType=[1,2,4,8,16].includes(Number(ts[1]))?Number(ts[1]):4;
  const barLen=beats*4/beatType;
  const kk=Array.isArray(raw?.k)?raw.k:['','unknown',0];
  const notes=(Array.isArray(raw?.n)?raw.n:[]).map((x,i)=>{
    if(!Array.isArray(x)||x.length<7) return null;
    const midi=Math.round(Number(x[0]));
    const measure=Math.max(1,Math.round(Number(x[1])||1));
    const beat=Math.max(0,Number(x[2])||0);
    const duration=Number(x[3]);
    const hand=x[4]==='L'?'L':'R';
    const voice=clamp(Math.round(Number(x[5])||1),1,4);
    const confidence=clamp(Number(x[6]??0.75),0,1);
    if(!Number.isFinite(midi)||midi<21||midi>108||!Number.isFinite(duration)||duration<=0) return null;
    return {midi,measure,beat,duration,hand,voice,confidence,id:`p${i}`};
  }).filter(Boolean);
  return {
    title:String(raw?.t||''), composer:String(raw?.a||''),
    key:{tonic:String(kk[0]||''),mode:['major','minor','unknown'].includes(kk[1])?kk[1]:'unknown',fifths:Number.isFinite(Number(kk[2]))?clamp(Math.round(Number(kk[2])),-7,7):null},
    time_signature:{beats,beat_type:beatType}, tempo:Number.isFinite(Number(raw?.b))?clamp(Number(raw.b),20,300):88,
    overall_confidence:clamp(Number(raw?.q??0.7),0,1), notes, warnings:Array.isArray(raw?.w)?raw.w.map(String).slice(0,8):[], barLen
  };
}

function mergePasses(passes){
  const usable=passes.filter(p=>p&&p.notes?.length);
  if(!usable.length) return null;
  const meta=usable.reduce((a,b)=>b.notes.length>a.notes.length?b:a,usable[0]);
  const barLen=meta.barLen||4;
  const map=new Map();
  for(const p of usable){
    for(const n of p.notes){
      const k=[n.measure,n.beat.toFixed(3),n.midi,n.hand,n.voice].join('|');
      const old=map.get(k);
      if(!old||n.confidence>old.confidence) map.set(k,n);
    }
  }
  const notes=[...map.values()].map((n,i)=>({
    midi:n.midi,
    start:(n.measure-1)*barLen+n.beat,
    duration:n.duration,
    hand:n.hand,
    measure:n.measure,
    voice:n.voice,
    confidence:n.confidence,
    id:`ai${i}`
  })).sort((a,b)=>a.start-b.start||a.hand.localeCompare(b.hand)||a.midi-b.midi).slice(0,900);
  const groups=new Map();
  for(const n of notes.filter(x=>x.hand==='R')){
    const k=n.start.toFixed(4);
    if(!groups.has(k)||groups.get(k).midi<n.midi) groups.set(k,n);
  }
  const melody=[...groups.values()].sort((a,b)=>a.start-b.start).slice(0,320).map(n=>({midi:n.midi,start:n.start,duration:n.duration,measure:n.measure,confidence:n.confidence}));
  return {
    title:meta.title, composer:meta.composer, key:meta.key, time_signature:meta.time_signature, tempo:meta.tempo,
    overall_confidence:usable.reduce((a,p)=>a+p.overall_confidence,0)/usable.length,
    notes, melody, warnings:[...new Set(usable.flatMap(p=>p.warnings||[]))].slice(0,12)
  };
}

async function callOpenRouter({model,image,filename,passLabel,timeoutMs}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(3000,timeoutMs));
  const system=`You are a professional optical music recognition specialist and conservatory-level piano engraver. Read ONLY the supplied piano score image. Extract notation, do not creatively complete music from memory. Preserve both hands, all chord tones, independent voices, accidentals, ledger-line notes and printed rhythm values. Quarter-note units: quarter=1, eighth=.5, sixteenth=.25, dotted quarter=1.5, half=2, whole=4. For each note return printed measure number and beat offset WITHIN that measure, where the first beat is 0. Chord tones share the same measure and beat. Never default all notes to quarter notes.`;
  const prompt=`OMR pass ${passLabel} for ${filename}. Return ONLY compact JSON: {"t":"title","a":"composer","k":["tonic","major|minor|unknown",fifths],"s":[beats,beatType],"b":tempo,"q":confidence,"n":[[midi,measure,beatWithinMeasure,duration,"R|L",voice,confidence],...],"w":[]}. IMPORTANT: transcribe EVERY clearly visible note in this crop. A normal piano system usually has dozens of noteheads; returning only a handful is an incomplete result. No prose, no markdown.`;
  try{
    const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST', signal:controller.signal,
      headers:{Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://boyman131418.github.io/catman-ai-playground/pianoforge/','X-OpenRouter-Title':'PianoForge Pro'},
      body:JSON.stringify({model,temperature:0,max_tokens:9000,response_format:{type:'json_object'},provider:{allow_fallbacks:true},messages:[{role:'system',content:system},{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:image}}]}]})
    });
    const raw=await r.json().catch(()=>({}));
    if(!r.ok) return {ok:false,status:r.status,error:raw?.error?.message||`OpenRouter request failed (${r.status})`};
    let out=raw?.choices?.[0]?.message?.content;
    if(Array.isArray(out)) out=out.map(x=>x?.text||'').join('');
    const pass=normalizePass(cleanJSON(out));
    if(pass.notes.length<8) return {ok:false,status:422,error:`Incomplete OMR: only ${pass.notes.length} usable notes`,pass};
    return {ok:true,pass};
  } catch(e){
    if(e?.name==='AbortError') return {ok:false,status:504,error:`Model timed out after ${Math.round(timeoutMs/1000)}s`};
    return {ok:false,status:502,error:e?.message||'Provider connection failed'};
  } finally { clearTimeout(timer); }
}

export default async function handler(req,res){
  const started=Date.now();
  cors(req,res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method==='GET') return res.status(200).json({ok:true,service:'PianoForge AI OMR',configured:Boolean(process.env.OPENROUTER_API_KEY),models:MODEL_CANDIDATES,version:'v10-parallel-crop-omr'});
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!process.env.OPENROUTER_API_KEY) return res.status(503).json({error:'AI backend is not configured'});

  try{
    const {images,imageDataUrl,filename='score'}=req.body||{};
    let imgs=Array.isArray(images)?images.filter(x=>typeof x==='string'&&/^data:image\//.test(x)):(/^data:image\//.test(imageDataUrl||'')?[imageDataUrl]:[]);
    if(!imgs.length) return res.status(400).json({error:'score image is required'});
    if(imgs.length>3) imgs=imgs.slice(0,3);
    if(imgs.reduce((a,s)=>a+s.length,0)>4_000_000) return res.status(413).json({error:'琴譜圖片資料太大，請重新選擇圖片；前端會自動壓縮。'});

    const attempts=[];
    for(const model of MODEL_CANDIDATES){
      const remaining=HARD_DEADLINE_MS-(Date.now()-started);
      if(remaining<9000) break;
      const timeoutMs=Math.min(43000,remaining-3000);
      // Prefer the two high-resolution crop images. Use the full-page image as a third pass only when no crops exist.
      const passImages=imgs.length>=3?imgs.slice(1,3):imgs;
      const results=await Promise.all(passImages.map((img,i)=>callOpenRouter({model,image:img,filename,passLabel:`${i+1}/${passImages.length}`,timeoutMs})));
      const good=results.filter(x=>x.ok).map(x=>x.pass);
      const bad=results.filter(x=>!x.ok);
      attempts.push({model,status:good.length?206:(bad[0]?.status||422),error:good.length?`${good.length}/${results.length} crop passes succeeded`:bad.map(x=>x.error).join('; '),passes:results.map(x=>({ok:x.ok,status:x.status||200,notes:x.pass?.notes?.length||0,error:x.error||''}))});
      const score=mergePasses(good);
      if(score&&score.notes.length>=20){
        if(good.length<results.length) score.warnings.unshift('部分分段辨識未成功；目前結果來自成功辨識的分段。');
        return res.status(200).json({ok:true,model,score,fallbacks:attempts,elapsed_ms:Date.now()-started,pass_count:good.length});
      }
      // If this model produced partial data, try the next model only if time remains.
    }

    const timed=attempts.some(a=>a.passes?.some(p=>p.status===504));
    return res.status(timed?504:422).json({error:timed?'AI 讀譜超時；分段模型未能在時限內完成。':'AI 已連接，但本次分段辨識仍未取得足夠完整的音符資料。',attempts,elapsed_ms:Date.now()-started});
  } catch(e){
    return res.status(500).json({error:e?.message||'AI score analysis failed'});
  }
}
