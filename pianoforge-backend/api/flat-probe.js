export default async function handler(req,res){
  res.setHeader('Content-Type','application/json');
  try{
    const capsResp=await fetch('https://api.flat.io/v2/omr/capabilities',{headers:{'X-Flat-Locale':'zh-HK'}});
    const caps=await capsResp.json().catch(()=>({}));
    const draftResp=await fetch('https://api.flat.io/v2/omr/jobs',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Flat-Locale':'zh-HK'},
      body:JSON.stringify({output:'musicxml',interactiveSteps:[]})
    });
    const draft=await draftResp.json().catch(()=>({}));
    return res.status(200).json({capsStatus:capsResp.status,caps,draftStatus:draftResp.status,draft});
  }catch(e){
    return res.status(500).json({error:e?.message||String(e)});
  }
}
