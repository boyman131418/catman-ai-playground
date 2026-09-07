(()=>{
  const q=s=>document.querySelector(s);
  const pcMap={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  const P=[
    {title:'Ode to Joy',sub:'Beethoven',genre:'古典 Classical',tempo:96,style:'basic',desc:'清楚級進旋律，最適合測試五階簡化。',seq:'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1 D4:1 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1 C4:1 C4:2'},
    {title:'Minuet in G',sub:'Christian Petzold · BWV Anh.114',genre:'巴洛克 Baroque',tempo:108,style:'basic',desc:'舞曲節奏、跳進與級進並存。',seq:'G4:1 C5:1 D5:1 E5:1 F#5:1 G5:1 C5:1 C5:1 A4:1 D5:1 E5:1 F#5:1 G5:1 G4:1 G4:2 E5:1 C5:1 D5:1 B4:1 C5:1 A4:1 B4:1 G4:1 F#4:1 G4:1 A4:1 B4:1 C5:1 D5:1 G4:2'},
    {title:'Für Elise',sub:'Beethoven',genre:'浪漫 Romantic',tempo:72,style:'newage',desc:'半音、琶音感與浪漫派旋律線。',seq:'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 -:.5 C4:.5 E4:.5 A4:.5 B4:1 -:.5 E4:.5 G#4:.5 B4:.5 C5:1 -:.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1'},
    {title:'The Blue Danube',sub:'Johann Strauss II · study excerpt',genre:'華爾茲 Waltz',tempo:90,style:'waltz',desc:'三拍子流動感，測試 Waltz 左手。',seq:'A4:1 A4:1 C#5:1 E5:2 E5:1 C#5:1 A4:2 A4:1 C#5:1 E5:1 F#5:2 F#5:1 D5:1 B4:2 B4:1 D5:1 F#5:1 A5:2 F#5:1 E5:1 C#5:2 A4:3'},
    {title:'Ragtime Study',sub:'PianoForge original study',genre:'拉格泰姆 Ragtime',tempo:112,style:'rock',desc:'切分、跳躍與明快節奏，適合測試高階版。',seq:'C5:.5 E5:.5 G5:.5 A5:.5 G5:1 E5:.5 C5:.5 D#5:.5 E5:.5 C6:.5 A5:.5 G5:1 E5:1 C5:.5 D5:.5 E5:.5 G5:.5 C6:.5 B5:.5 A5:1 G5:.5 E5:.5 D5:.5 C5:.5 E5:1 C5:1'},
    {title:'Amazing Grace',sub:'Traditional',genre:'聖詩 Hymn',tempo:72,style:'basic',desc:'長線條、呼吸感與和聲支撐。',seq:'D4:1 G4:2 B4:1 G4:2 B4:1 A4:2 G4:1 E4:2 D4:1 G4:2 B4:1 G4:2 B4:1 A4:3 D5:1 B4:2 D5:1 B4:2 G4:1 E4:2 G4:1 G4:3'},
    {title:'Greensleeves',sub:'Traditional English folk song',genre:'民謠 Folk / Modal',tempo:84,style:'newage',desc:'小調／調式色彩，旋律具有古老民謠感。',seq:'A4:1 C5:2 D5:1 E5:1 F5:1 E5:2 D5:1 B4:1 G4:1 A4:2 B4:1 C5:1 A4:2 A4:1 G#4:1 A4:2 C5:2 D5:1 E5:1 F5:1 E5:2 D5:1 B4:1 G4:1'},
    {title:'Sakura Sakura',sub:'Traditional Japanese melody',genre:'日本傳統 Japanese',tempo:76,style:'basic',desc:'較少見的音階色彩，方便測試非一般大調旋律。',seq:'A4:1 A4:1 B4:2 A4:1 A4:1 B4:2 A4:1 B4:1 C5:1 B4:1 A4:1 B4:.5 A4:.5 F4:2 E4:1 C4:1 E4:1 F4:1 E4:1 E4:1 C4:2 B3:1 A3:1 B3:1 C4:1 A3:3'},
    {title:'12-Bar Blues Study',sub:'PianoForge original study',genre:'藍調 Blues',tempo:104,style:'blues',desc:'Blue notes、重複動機與 Boogie 左手。',seq:'C4:.5 Eb4:.5 F4:1 Gb4:.5 G4:.5 Bb4:1 G4:1 F4:1 Eb4:1 C4:1 F4:.5 Ab4:.5 Bb4:1 B4:.5 C5:.5 Eb5:1 C5:1 Bb4:1 G4:1 F4:1 G4:.5 Bb4:.5 C5:1 Eb5:1 C5:.5 Bb4:.5 G4:1 F4:1 Eb4:1 C4:2'},
    {title:'Pop Ballad Study',sub:'PianoForge original study',genre:'流行抒情 Pop Ballad',tempo:82,style:'newage',desc:'現代流行旋律配 1–5–8–5 伴奏，展示學生最常用場景。',seq:'E4:1 G4:1 A4:2 G4:1 E4:1 D4:2 E4:1 G4:1 C5:2 B4:1 A4:1 G4:2 A4:.5 B4:.5 C5:1 E5:2 D5:1 C5:1 B4:2 G4:1 A4:1 G4:1 E4:1 D4:2 C4:2'}
  ];

  function midi(name){
    const m=/^([A-G](?:#|b)?)(-?\d+)$/.exec(name);if(!m)return null;
    return (Number(m[2])+1)*12+pcMap[m[1]];
  }
  function parse(s){
    let t=0,a=[];
    s.trim().split(/\s+/).forEach(tok=>{
      const [note,dd]=tok.split(':'),d=Math.max(.125,Number(dd)||1);
      if(note!=='-'){const p=midi(note);if(p!==null)a.push({p,s:t,d,h:'R'});}
      t+=d;
    });
    return a;
  }
  function load(i){
    const p=P[i];if(!p)return;
    if(typeof stop==='function')stop();
    S.orig=parse(p.seq);S.title=p.title+' · '+p.genre;S.t=p.tempo;S.idx=S.ok=S.tr=0;
    const st=q('#style');if(st)st.value=p.style||'auto';
    if(typeof analyze==='function')analyze();
    document.querySelectorAll('.pf-preset').forEach((b,j)=>b.classList.toggle('on',j===i));
    const info=q('#pf-preset-info');if(info)info.innerHTML='<strong>'+p.title+'</strong> · '+p.sub+'　<span>'+p.genre+'</span>　♩='+p.tempo+'<br><small>'+p.desc+'　你可以再按左邊 1–5 級切換同一首歌的不同難度。</small>';
    q('.lab')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function build(){
    const upload=q('.upload');if(!upload||q('#pf-presets'))return;
    const css=document.createElement('style');css.textContent=`
      #pf-presets{margin:16px 0;padding:20px;background:#17131f;border:1px solid #2d2837;border-radius:22px}
      #pf-presets .pf-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:13px}
      #pf-presets .pf-head b{font-size:16px}.pf-sub{font-size:12px;color:#a59cab}
      .pf-preset-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
      .pf-preset{min-width:0;text-align:left;background:#100d15;color:#eee;border:1px solid #383241;border-radius:13px;padding:11px;cursor:pointer;transition:.15s}
      .pf-preset:hover{border-color:#8a6b31}.pf-preset.on{border-color:#c99b40;background:#2a2115;box-shadow:inset 0 0 0 1px #c99b40}
      .pf-preset strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pf-preset span{display:block;margin-top:5px;font-size:10px;color:#ad9d83}
      #pf-preset-info{margin-top:11px;padding:11px 12px;border-radius:12px;background:#100d15;border:1px solid #332d3b;color:#d6ceda;font-size:12px;line-height:1.55}
      #pf-preset-info span{color:#e4b95e}#pf-preset-info small{color:#9e95a4}
      @media(max-width:900px){.pf-preset-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.pf-preset-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(css);
    const sec=document.createElement('section');sec.id='pf-presets';
    sec.innerHTML='<div class="pf-head"><div><b>🎼 10 首預設琴譜</b><div class="pf-sub">唔需要上傳檔案，直接揀不同音樂類型測試五階琴譜、播放追蹤及互動練習。</div></div><div class="pf-sub">全部為傳統／公版作品或 PianoForge 原創練習</div></div><div class="pf-preset-grid"></div><div id="pf-preset-info"></div>';
    upload.insertAdjacentElement('afterend',sec);
    const grid=sec.querySelector('.pf-preset-grid');
    P.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='pf-preset';b.innerHTML='<strong>'+(i+1)+'. '+p.title+'</strong><span>'+p.genre+' · ♩ '+p.tempo+'</span>';b.addEventListener('click',()=>load(i));grid.appendChild(b)});
    load(0);
  }
  build();
  window.PianoForgePresets={list:P,load};
})();
