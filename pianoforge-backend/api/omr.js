import crypto from 'node:crypto';

const ALLOWED = new Set([
  'https://boyman131418.github.io',
  'https://pianoforge-five-level-piano.vercel.app'
]);

function cors(req,res){
  const origin=req.headers.origin||'';
  if(ALLOWED.has(origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
function token(){return process.env.FLAT_API_TOKEN||''}
function flatHeaders(extra={},auth=true){
  return {
    ...(auth&&token()?{Authorization:`Bearer ${token()}`} : {}),
    'X-Flat-Locale':'zh-HK',
    ...extra
  };
}
function signJob(job){return crypto.createHmac('sha256',token()).update(String(job)).digest('base64url')}
function validJob(job,sig){
  if(!job||!sig||!token())return false;
  const expected=signJob(job);
  try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(sig)))}catch{return false}
}
async function flatJson(path,opts={},auth=true){
  const r=await fetch(`https://api.flat.io/v2${path}`,{
    ...opts,
    headers:flatHeaders({'Content-Type':'application/json',...(opts.headers||{})},auth)
  });
  const data=await r.json().catch(()=>({}));
  return{r,data};
}
function flatError(res,r,data,fallback){
  const message=data?.message||data?.errorMessage||fallback||`Flat OMR API ${r.status}`;
  return res.status(r.status).json({ok:false,error:message,code:data?.code||data?.errorCode||null});
}
async function deleteDraft(job){
  if(!job||!token())return;
  try{await flatJson(`/omr/jobs/${encodeURIComponent(job)}`,{method:'DELETE'})}catch{}
}

export default async function handler(req,res){
  cors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  const action=String(req.query?.action||'capabilities');

  try{
    if(req.method==='GET'&&action==='capabilities'){
      const configured=Boolean(token());
      const {r,data}=await flatJson('/omr/capabilities',{method:'GET'},configured);
      if(!r.ok)return flatError(res,r,data,'Unable to read OMR capabilities');
      return res.status(200).json({ok:true,configured,provider:'professional-omr',capabilities:data});
    }

    if(!token())return res.status(503).json({ok:false,configured:false,error:'Professional OMR backend is not configured',code:'FLAT_TOKEN_MISSING'});

    if(req.method==='POST'&&action==='start'){
      const body=req.body||{};
      const filename=String(body.filename||'score.jpg').replace(/[^\w.()\-\u4e00-\u9fff]+/g,'_').slice(0,180);
      const mimeType=String(body.mimeType||'image/jpeg');
      let file=String(body.fileBase64||'');
      if(!file&&typeof body.fileDataUrl==='string')file=body.fileDataUrl.replace(/^data:[^;]+;base64,/,'');
      if(!file)return res.status(400).json({ok:false,error:'Score file is required',code:'FILE_REQUIRED'});
      if(file.length>4_000_000)return res.status(413).json({ok:false,error:'File is too large for the web upload gateway. Please compress it or export one page as a clear image.',code:'FILE_TOO_LARGE'});
      const locale=String(body.locale||'en');
      const key=crypto.createHash('sha256').update(file).digest('hex').slice(0,48);
      let job='';

      const caps=await flatJson('/omr/capabilities',{method:'GET'});
      if(!caps.r.ok)return flatError(res,caps.r,caps.data,'Unable to check OMR credits');
      if(Number.isFinite(Number(caps.data.remainingCredits))&&Number(caps.data.remainingCredits)<Number(caps.data.costPerPage||1)){
        return res.status(402).json({ok:false,error:'OMR credits are insufficient for this page.',code:'NO_OMR_CREDITS',remainingCredits:caps.data.remainingCredits,costPerPage:caps.data.costPerPage});
      }

      const draft=await flatJson('/omr/jobs',{method:'POST',body:JSON.stringify({output:'musicxml',interactiveSteps:[],locales:[locale],idempotencyKey:`pianoforge-${key}`})});
      if(!draft.r.ok)return flatError(res,draft.r,draft.data,'Unable to create OMR job');
      job=draft.data.id;
      if(!job)return res.status(502).json({ok:false,error:'OMR provider did not return a job id',code:'NO_JOB_ID'});

      const upload=await flatJson(`/omr/jobs/${encodeURIComponent(job)}/files`,{method:'POST',body:JSON.stringify({file,filename,mimeType})});
      if(!upload.r.ok){await deleteDraft(job);return flatError(res,upload.r,upload.data,'Unable to upload score to OMR')}

      if(body.validateOnly===true){
        const state=await flatJson(`/omr/jobs/${encodeURIComponent(job)}`,{method:'GET'});
        const out={ok:true,validated:true,job,status:state.data?.status||'draft',estimatedCredits:state.data?.estimatedCredits??null,remainingCredits:caps.data.remainingCredits??null,costPerPage:caps.data.costPerPage??null};
        await deleteDraft(job);
        return res.status(200).json(out);
      }

      const run=await flatJson(`/omr/jobs/${encodeURIComponent(job)}/start`,{method:'POST',body:'{}'});
      if(!run.r.ok){await deleteDraft(job);return flatError(res,run.r,run.data,'Unable to start professional OMR')}
      return res.status(run.r.status).json({ok:true,job,sig:signJob(job),status:run.data.status||'processing',estimatedCredits:run.data.estimatedCredits??draft.data.estimatedCredits??null,remainingCredits:caps.data.remainingCredits??null,costPerPage:caps.data.costPerPage??null,progress:run.data.progress??null});
    }

    const job=String(req.query?.job||''),sig=String(req.query?.sig||'');
    if(!validJob(job,sig))return res.status(403).json({ok:false,error:'Invalid OMR job ticket',code:'INVALID_JOB_TICKET'});

    if(req.method==='GET'&&action==='status'){
      const wait=Math.max(0,Math.min(20,Number(req.query?.wait)||0));
      const {r,data}=await flatJson(`/omr/jobs/${encodeURIComponent(job)}?wait=${wait}`,{method:'GET'});
      if(!r.ok)return flatError(res,r,data,'Unable to read OMR status');
      return res.status(200).json({ok:true,job:data.id,status:data.status,progress:data.progress??null,estimatedCredits:data.estimatedCredits??null,importedMetadata:data.importedMetadata??null,errorCode:data.errorCode??null,errorMessage:data.errorMessage??null,result:data.result??null});
    }

    if(req.method==='GET'&&action==='result'){
      const state=await flatJson(`/omr/jobs/${encodeURIComponent(job)}`,{method:'GET'});
      if(!state.r.ok)return flatError(res,state.r,state.data,'Unable to read OMR job');
      if(state.data.status!=='done')return res.status(409).json({ok:false,error:`OMR is ${state.data.status}`,code:'OMR_NOT_DONE',status:state.data.status});
      const r=await fetch(`https://api.flat.io/v2/omr/jobs/${encodeURIComponent(job)}/exports/musicxml`,{headers:flatHeaders()});
      if(!r.ok){const data=await r.json().catch(()=>({}));return flatError(res,r,data,'Unable to download MusicXML')}
      const xml=await r.text();
      if(!/<score-(partwise|timewise)\b/i.test(xml))return res.status(502).json({ok:false,error:'OMR returned an invalid MusicXML document',code:'INVALID_MUSICXML'});
      res.setHeader('Content-Type','application/vnd.recordare.musicxml+xml; charset=utf-8');
      res.setHeader('Cache-Control','no-store');
      return res.status(200).send(xml);
    }

    if(req.method==='DELETE'&&action==='cleanup'){
      const {r,data}=await flatJson(`/omr/jobs/${encodeURIComponent(job)}`,{method:'DELETE'});
      if(!r.ok)return flatError(res,r,data,'Unable to delete OMR job');
      return res.status(200).json({ok:true,status:data.status||'deleted'});
    }

    return res.status(405).json({ok:false,error:'Unsupported OMR action',code:'METHOD_NOT_ALLOWED'});
  }catch(e){
    return res.status(500).json({ok:false,error:e?.message||'Professional OMR service failed',code:'OMR_GATEWAY_ERROR'});
  }
}
