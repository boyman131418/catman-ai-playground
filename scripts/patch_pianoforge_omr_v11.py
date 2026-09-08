from pathlib import Path

JS = Path('public/pianoforge/pianoforge-pro.js')
HTML = Path('public/pianoforge/index.html')
s = JS.read_text()

s = s.replace(
"let state={source:null,score:null,view:null,grade:5,band:2,selectedFile:null,playing:false,startMs:0,beatSec:60/88,timers:[],uniqueTimes:[],cursorIndex:0,practiceIndex:0,ok:0,tries:0,osmd:null};",
"let state={source:null,sourceXML:null,score:null,view:null,grade:5,band:2,selectedFile:null,playing:false,startMs:0,beatSec:60/88,timers:[],uniqueTimes:[],cursorIndex:0,practiceIndex:0,ok:0,tries:0,osmd:null};"
)

def replace_between(text, start_marker, end_marker, replacement):
    a = text.index(start_marker)
    b = text.index(end_marker, a)
    return text[:a] + replacement.rstrip() + "\n" + text[b:]

new_render = r'''async function render(sc){
  state.view=normalizeScore(sc);
  $('#title').textContent=state.view.title+(state.view.composer?' · '+state.view.composer:'');
  $('#tempo').value=state.view.tempo;
  $('#leveltag').textContent=state.grade===8?'Grade 8 / 原譜':`${GRADE_RULES[state.grade].name} · ${BANDS[state.band].name}`;
  updateFacts();
  const useOriginalXML=state.grade===8&&typeof state.sourceXML==='string'&&/<score-(partwise|timewise)\b/i.test(state.sourceXML);
  const xml=useOriginalXML?state.sourceXML:scoreToXML(state.view);
  if(!state.osmd)state.osmd=new opensheetmusicdisplay.OpenSheetMusicDisplay('osmd',{autoResize:true,backend:'svg',drawTitle:false,drawSubtitle:false,drawComposer:false,drawCredits:false,drawingParameters:'compacttight'});
  await state.osmd.load(xml);
  state.osmd.render();
  try{state.osmd.cursor.show();state.osmd.cursor.reset()}catch{}
  state.uniqueTimes=[...new Set(state.view.events.map(e=>+e.start.toFixed(4)))].sort((a,b)=>a-b);
  state.cursorIndex=0;
  $('#meta').textContent=`${keyLabel(state.view)} · ${state.view.time.beats}/${state.view.time.beatType} · ♩=${state.view.tempo} · ${Math.ceil(totalBeats(state.view)/timeLen(state.view))} bars · ${state.view.events.length} notes${useOriginalXML?' · OMR MusicXML 原譜':''}`;
  resetPractice();
}'''
s = replace_between(s, 'async function render(sc){', 'function keyLabel', new_render)

new_parser = r'''function parseMusicXML(text){
  const x=new DOMParser().parseFromString(text,'application/xml');
  if(x.querySelector('parsererror'))throw Error('MusicXML 格式錯誤');
  const title=x.querySelector('work-title,movement-title')?.textContent?.trim()||'MusicXML';
  const composer=x.querySelector('creator[type="composer"]')?.textContent?.trim()||'';
  const parts=[...x.querySelectorAll('score-partwise > part, score-timewise part')];
  if(!parts.length)throw Error('MusicXML 無可讀取聲部');
  let scoreTime={beats:4,beatType:4},scoreKey={fifths:0,mode:'major'},tempo=88,events=[];
  const tieOpen=new Map();
  const stepMap={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  parts.forEach((part,partIndex)=>{
    let div=1,time={...scoreTime},key={...scoreKey},measureStart=0;
    const measures=[...part.querySelectorAll(':scope > measure')];
    for(const me of measures){
      const attrs=me.querySelector(':scope > attributes');
      if(attrs){
        div=Number(attrs.querySelector('divisions')?.textContent)||div;
        const tt=attrs.querySelector('time');
        if(tt){time={beats:Number(tt.querySelector('beats')?.textContent)||time.beats,beatType:Number(tt.querySelector('beat-type')?.textContent)||time.beatType};scoreTime={...time}}
        const kk=attrs.querySelector('key');
        if(kk){key={fifths:Number(kk.querySelector('fifths')?.textContent)||0,mode:kk.querySelector('mode')?.textContent||key.mode};scoreKey={...key}}
      }
      const snd=me.querySelector('sound[tempo]');if(snd)tempo=Number(snd.getAttribute('tempo'))||tempo;
      const metro=me.querySelector('per-minute');if(metro&&!snd)tempo=Number(metro.textContent)||tempo;
      let cur=measureStart,lastStart=cur,measureMax=measureStart;
      for(const node of me.children){
        if(node.tagName==='backup'){cur-=Number(node.querySelector('duration')?.textContent||0)/div;continue}
        if(node.tagName==='forward'){cur+=Number(node.querySelector('duration')?.textContent||0)/div;measureMax=Math.max(measureMax,cur);continue}
        if(node.tagName!=='note')continue;
        const durRaw=Number(node.querySelector('duration')?.textContent||0)/div;
        const dur=durRaw>0?durRaw:1;
        const isChord=!!node.querySelector('chord');
        const start=isChord?lastStart:cur;
        if(!isChord)lastStart=cur;
        if(!node.querySelector('rest')){
          const st=node.querySelector('pitch > step')?.textContent;
          const oct=Number(node.querySelector('pitch > octave')?.textContent);
          const alt=Number(node.querySelector('pitch > alter')?.textContent||0);
          if(st&&Number.isFinite(oct)){
            const midi=(oct+1)*12+(stepMap[st]??0)+alt;
            let staff=Number(node.querySelector('staff')?.textContent||0);
            if(!staff)staff=parts.length>1?Math.min(2,partIndex+1):1;
            const hand=staff===2?'L':'R';
            const voice=Math.max(1,Number(node.querySelector('voice')?.textContent||1));
            const ties=[...node.querySelectorAll('tie, tied')].map(t=>t.getAttribute('type'));
            const tieStart=ties.includes('start'),tieStop=ties.includes('stop');
            const tk=`${partIndex}|${staff}|${voice}|${midi}`;
            if(tieStop&&tieOpen.has(tk)){
              const old=events[tieOpen.get(tk)];
              old.duration+=dur;
              if(!tieStart)tieOpen.delete(tk);
            }else{
              events.push({midi,start,duration:dur,hand,voice,velocity:82,confidence:1});
              if(tieStart)tieOpen.set(tk,events.length-1);
            }
          }
        }
        if(!isChord)cur+=dur;
        measureMax=Math.max(measureMax,start+dur,cur);
      }
      const nominal=time.beats*4/time.beatType;
      const actual=Math.max(.125,measureMax-measureStart);
      measureStart+=me.getAttribute('implicit')==='yes'?actual:Math.max(nominal,actual>nominal*1.25?actual:nominal);
    }
  });
  if(!events.length)throw Error('MusicXML 無可播放音符');
  return normalizeScore({title,composer,tempo,time:scoreTime,key:scoreKey,events});
}'''
s = replace_between(s, 'function parseMusicXML(text){', 'async function chooseFile', new_parser)

new_choose = r'''async function chooseFile(f){
  state.selectedFile=f;state.sourceXML=null;
  $('#fname').textContent=f.name;
  const isImage=f.type.startsWith('image/'),isPdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name),isXml=/\.(xml|musicxml)$/i.test(f.name)||/musicxml|xml/.test(f.type);
  $('#ai').disabled=!(isImage||isPdf);
  $('#local').disabled=!isImage;
  if(isImage){
    const u=URL.createObjectURL(f);$('#preview').src=u;$('#preview').style.display='block';$('#preview').onload=()=>URL.revokeObjectURL(u);
    showStatus('圖片已載入。按「專業 OMR 讀譜」會先轉成 MusicXML，再由同一份資料驅動五線譜、播放、MIDI 練習與分級改編。','');
    return;
  }
  $('#preview').style.display='none';
  if(isPdf){showStatus('PDF 已載入。專業 OMR 可辨識 PDF；大型 PDF 建議逐頁或壓縮後上傳。','');return}
  if(isXml){
    try{const xml=await f.text(),sc=parseMusicXML(xml);state.sourceXML=xml;state.source=sc;state.grade=8;state.band=4;await render(sc);showStatus(`MusicXML 已讀取：${sc.events.length} 個音符，拍號 ${sc.time.beats}/${sc.time.beatType}。`,'ok')}catch(e){showStatus(e.message,'bad')}
    return;
  }
  showStatus('目前這個入口支援琴譜圖片、PDF 或 MusicXML。音訊轉譜會用另一條專門流程，不會混入 OMR。','bad');
}'''
s = replace_between(s, 'async function chooseFile(f){', 'function showStatus', new_choose)

new_omr = r'''function fileAsDataURL(f){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(Error('讀取檔案失敗'));r.readAsDataURL(f)})}
async function prepareOMRFile(f){
  const isPdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name);
  if(isPdf){if(f.size>2_900_000)throw Error('PDF 超過目前網頁安全上傳上限（約 2.9 MB）；請先壓縮或逐頁匯出成清晰 JPG/PNG。');return{fileDataUrl:await fileAsDataURL(f),filename:f.name,mimeType:'application/pdf',quality:null}}
  if(!f.type.startsWith('image/'))throw Error('請上傳琴譜圖片或 PDF');
  const u=URL.createObjectURL(f),im=new Image();
  await new Promise((r,j)=>{im.onload=r;im.onerror=j;im.src=u});URL.revokeObjectURL(u);
  const original={width:im.naturalWidth||im.width,height:im.naturalHeight||im.height};
  let maxW=Math.min(2800,original.width),quality=.93,data='';
  for(let pass=0;pass<5;pass++){
    const scale=Math.min(1,maxW/original.width),W=Math.max(700,Math.round(original.width*scale)),H=Math.max(400,Math.round(original.height*scale));
    const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.drawImage(im,0,0,W,H);
    data=c.toDataURL('image/jpeg',quality);
    if(data.length<3_750_000)return{fileDataUrl:data,filename:f.name.replace(/\.[^.]+$/,'.jpg'),mimeType:'image/jpeg',quality:{width:W,height:H,sourceWidth:original.width,sourceHeight:original.height}};
    maxW=Math.max(1500,Math.round(maxW*.82));quality=Math.max(.82,quality-.03);
  }
  throw Error('圖片仍然太大；請裁走琴譜四周空白後再試。');
}
function omrProgressText(p,status){
  if(typeof p==='number')return `${Math.round(p)}%`;
  if(p&&typeof p.percent==='number')return `${Math.round(p.percent)}%`;
  if(p&&p.label)return String(p.label);
  return status==='processing'?'辨識中…':status||'處理中…';
}
function omrQuality(sc,xml){
  const measures=(xml.match(/<measure\b/gi)||[]).length,durations=[...new Set(sc.events.map(e=>Number(e.duration.toFixed(4))))],r=sc.events.filter(e=>e.hand==='R').length,l=sc.events.length-r;
  const warnings=[];
  if(sc.events.length<12)warnings.push('辨識到的音符非常少');
  if(measures<2)warnings.push('小節結構不足');
  if(durations.length<2&&sc.events.length>20)warnings.push('音值變化異常單一');
  if(!r||!l)warnings.push('未能同時建立左右手聲部');
  return{measures,durationKinds:durations.length,right:r,left:l,warnings,usable:sc.events.length>=12&&measures>=2};
}
async function aiAnalyze(){
  const f=state.selectedFile;if(!f)return;$('#ai').disabled=true;
  let ticket=null;
  try{
    showStatus('專業 OMR：正在準備清晰原頁，不再用一般聊天 AI 猜音符…');
    const prepared=await prepareOMRFile(f);
    const startResp=await fetch('https://pianoforge-five-level-piano.vercel.app/api/omr?action=start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...prepared,locale:'en'})});
    const start=await startResp.json().catch(()=>({}));
    if(!startResp.ok)throw Error(start.error||`OMR 啟動失敗 (${startResp.status})`);
    ticket={job:start.job,sig:start.sig};
    const deadline=Date.now()+240000;let status=start.status||'processing',info=start;
    while(status!=='done'&&Date.now()<deadline){
      if(status==='error'||status==='canceled')throw Error(info.errorMessage||`OMR ${status}`);
      showStatus(`專業 OMR 正在辨識：${omrProgressText(info.progress,status)}。系統完成後會直接取得 MusicXML。`);
      const q=new URLSearchParams({action:'status',job:ticket.job,sig:ticket.sig,wait:'15'});
      const rr=await fetch('https://pianoforge-five-level-piano.vercel.app/api/omr?'+q.toString());
      info=await rr.json().catch(()=>({}));if(!rr.ok)throw Error(info.error||`OMR 狀態失敗 (${rr.status})`);status=info.status;
    }
    if(status!=='done')throw Error('OMR 超過 4 分鐘仍未完成，已停止等待；檔案不會被當作成功。');
    const q=new URLSearchParams({action:'result',job:ticket.job,sig:ticket.sig});
    const resultResp=await fetch('https://pianoforge-five-level-piano.vercel.app/api/omr?'+q.toString());
    const xml=await resultResp.text();
    if(!resultResp.ok){let msg='';try{msg=JSON.parse(xml).error||''}catch{}throw Error(msg||`MusicXML 下載失敗 (${resultResp.status})`)}
    const sc=parseMusicXML(xml),qc=omrQuality(sc,xml);
    if(!qc.usable)throw Error(`OMR 已回傳 MusicXML，但品質檢查未通過：${qc.warnings.join('、')||'資料不足'}`);
    state.sourceXML=xml;state.source=sc;state.grade=8;state.band=4;await render(sc);
    document.querySelectorAll('#bands button').forEach((b,j)=>b.classList.toggle('on',j===4));document.querySelectorAll('#grades button').forEach((b,j)=>b.classList.toggle('on',j===8));
    const warn=qc.warnings.length?`；需留意：${qc.warnings.join('、')}`:'';
    showStatus(`專業 OMR 完成：${sc.events.length} 個可播放音符 · ${qc.measures} 小節 · 左/右手 ${qc.left}/${qc.right} · ${qc.durationKinds} 種音值 · 拍號 ${sc.time.beats}/${sc.time.beatType}${warn}`,'ok');
  }catch(e){showStatus('專業 OMR 未完成：'+(e?.message||e),'bad')}
  finally{
    $('#ai').disabled=false;
    if(ticket){const q=new URLSearchParams({action:'cleanup',job:ticket.job,sig:ticket.sig});fetch('https://pianoforge-five-level-piano.vercel.app/api/omr?'+q.toString(),{method:'DELETE'}).catch(()=>{})}
  }
}
async function localScan(){
  const f=state.selectedFile;if(!f||!f.type.startsWith('image/'))return;
  try{
    const u=URL.createObjectURL(f),im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=j;im.src=u});URL.revokeObjectURL(u);
    const W=im.naturalWidth||im.width,H=im.naturalHeight||im.height,min=Math.min(W,H),mp=W*H/1e6;
    let verdict='適合 OMR',kind='ok',tips=[];
    if(W<1200||H<700){verdict='解像度偏低';kind='bad';tips.push('建議重新掃描/拍攝，長邊最好 1800px 以上')}
    if(W/H>5||H/W>3.5)tips.push('比例較極端，請確認沒有裁走譜號或小節');
    showStatus(`檔案品質檢查：${W}×${H}（${mp.toFixed(1)} MP）· ${verdict}${tips.length?'；'+tips.join('；'):''}`,kind);
  }catch(e){showStatus('品質檢查失敗：'+e.message,'bad')}
}'''
s = replace_between(s, 'function imgPages(', 'function analysis()', new_omr)

new_export = r'''function exportXML(){
  if(!state.view)return;
  const original=state.grade===8&&typeof state.sourceXML==='string'&&/<score-(partwise|timewise)\b/i.test(state.sourceXML);
  const xml=original?state.sourceXML:scoreToXML(state.view);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([xml],{type:'application/vnd.recordare.musicxml+xml'}));a.download=(state.view.title||'PianoForge').replace(/[^\w\-\u4e00-\u9fff]+/g,'_')+`_${GRADE_RULES[state.grade].name}.musicxml`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)
}'''
s = replace_between(s, 'function exportXML(){', 'const PRESETS=', new_export)

JS.write_text(s)

h = HTML.read_text()
h = h.replace('專業重寫版 v9','專業 OMR 重寫版 v11')
h = h.replace('上傳 / AI 讀譜','上傳 / 專業 OMR 讀譜')
h = h.replace('圖片：建議 AI Vision 全譜辨識；MusicXML：直接匯入。舊版「對焦失敗」本機像素掃描只保留作備援，不再作主要方案。','圖片 / PDF：使用專業 Optical Music Recognition 轉成 MusicXML；MusicXML：直接匯入。一般聊天 AI 不再負責猜音符。')
h = h.replace('✨ AI Vision 全譜辨識','🎼 專業 OMR 讀譜')
h = h.replace('快速本機掃描','檔案品質檢查')
h = h.replace('上傳圖片時優先使用 AI Vision 全譜辨識；MusicXML 則可直接保留拍號、音值、左右手與樂譜結構。','上傳圖片 / PDF 時先由專業 OMR 轉為 MusicXML；原譜顯示直接使用 OMR MusicXML，拍號、音值、左右手、voice、beam、stem 與附加線不再由一般 Vision 模型猜測。')
h = h.replace('pianoforge-pro.js?v=9','pianoforge-pro.js?v=11')
h = h.replace('accept=".xml,.musicxml,image/*"','accept=".xml,.musicxml,.pdf,image/*"')
HTML.write_text(h)
print('patched PianoForge professional OMR v11')
