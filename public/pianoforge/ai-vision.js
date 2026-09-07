(()=>{
  const q=s=>document.querySelector(s);
  const API=window.PIANOFORGE_AI_ENDPOINT||'https://pianoforge-ai-api.vercel.app/api/analyze-score';
  let selected=null;

  const css=document.createElement('style');
  css.textContent=`
    #pf-ai-btn{background:linear-gradient(135deg,#f0c45c,#d99b2b);color:#171008;border:0}
    #pf-ai-btn[disabled]{opacity:.55;cursor:not-allowed}
    #pf-ai-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;border:1px solid #5d4a2a;color:#f2d395;font-size:11px}
    #pf-ai-result{display:none;margin-top:10px;padding:11px 12px;border-radius:12px;background:#100d15;border:1px solid #3c3345;color:#cfc5d4;font-size:12px;line-height:1.55}
    #pf-ai-result strong{color:#f3d28a}
  `;
  document.head.appendChild(css);

  function isImage(f){return !!f&&(f.type?.startsWith('image/')||/\.(png|jpe?g|webp|bmp)$/i.test(f.name||''));}
  function fileToImage(f){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('無法讀取圖片'))};im.src=u;});}
  async function compress(f){
    const im=await fileToImage(f),max=1800,scale=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));
    const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.88);
  }
  function safeNum(x,def){const n=Number(x);return Number.isFinite(n)?n:def;}
  function applyScore(data,filename){
    const sc=data?.score;if(!sc?.melody?.length)throw new Error('AI 未能抽取可用主旋律');
    const mel=sc.melody
      .map(n=>({p:Math.round(safeNum(n.midi,60)),s:Math.max(0,safeNum(n.start,0)),d:Math.max(.125,safeNum(n.duration,1)),h:'R',confidence:safeNum(n.confidence,.5)}))
      .filter(n=>n.p>=21&&n.p<=108)
      .sort((a,b)=>a.s-b.s||a.p-b.p)
      .slice(0,240);
    if(mel.length<3)throw new Error('AI 辨識到的旋律音符太少');
    if(typeof stop==='function')stop();
    S.orig=mel;S.title=(sc.title||filename.replace(/\.[^.]+$/,''))+' · AI Vision';S.t=Math.max(40,Math.min(220,Math.round(safeNum(sc.tempo,88))));S.idx=S.ok=S.tr=0;
    if(typeof analyze==='function')analyze();
    const r=q('#pf-ai-result');if(r){const conf=Math.round(safeNum(sc.overall_confidence,0)*100),warn=(sc.warnings||[]).slice(0,3).join('；');r.style.display='block';r.innerHTML=`<strong>AI 分析完成</strong>：${mel.length} 個主旋律音符 · 信心 ${conf||'—'}%${warn?'<br>注意：'+warn:''}<br>已交由 PianoForge 五階編配引擎生成五個程度。`;}
    q('.lab')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function runAI(){
    if(!isImage(selected))return;
    const btn=q('#pf-ai-btn'),st=q('#status'),r=q('#pf-ai-result');
    btn.disabled=true;btn.textContent='AI 正在讀譜…';if(st){st.style.display='block';st.textContent='正在用 AI Vision 分析整張琴譜：調號、拍號、左右手、音高與節奏…';}if(r)r.style.display='none';
    try{
      const imageDataUrl=await compress(selected);
      const resp=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl,filename:selected.name})});
      const data=await resp.json().catch(()=>({}));
      if(!resp.ok)throw new Error(data.error||`AI API 錯誤 ${resp.status}`);
      applyScore(data,selected.name);
      if(st)st.textContent='AI Vision 完成，已生成五階琴譜。';
    }catch(e){
      if(st)st.textContent='AI Vision 未連接成功：'+e.message+'。你仍可使用下面的本機圖片 Beta。';
    }finally{btn.disabled=false;btn.textContent='✨ 用 AI Vision 分析琴譜';}
  }

  function build(){
    const bar=q('#genbar');if(!bar||q('#pf-ai-btn'))return;
    const b=document.createElement('button');b.type='button';b.id='pf-ai-btn';b.className='btn';b.textContent='✨ 用 AI Vision 分析琴譜';b.addEventListener('click',runAI);bar.insertBefore(b,bar.firstChild);
    const badge=document.createElement('span');badge.id='pf-ai-badge';badge.textContent='AI + 本機 OMR 雙引擎';bar.appendChild(badge);
    const out=document.createElement('div');out.id='pf-ai-result';bar.insertAdjacentElement('afterend',out);
    const input=q('#file');input?.addEventListener('change',e=>{const f=e.target.files?.[0];selected=isImage(f)?f:null;b.style.display=selected?'inline-block':'none';});
  }
  build();
})();
