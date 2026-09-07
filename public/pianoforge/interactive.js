(()=>{
  const q=s=>document.querySelector(s);
  let raf=0, playStartedAt=0, playBeat=0, playbackActive=false, practiceActive=false;
  let correctMarks=new Set();

  const css=document.createElement('style');
  css.textContent=`
    #score ellipse.pf-note{transition:fill .12s,stroke .12s,filter .12s,transform .12s;transform-box:fill-box;transform-origin:center;cursor:pointer}
    #score ellipse.pf-current{fill:#e0a72f!important;stroke:#9b6500!important;stroke-width:4!important;filter:drop-shadow(0 0 5px rgba(224,167,47,.65));transform:scale(1.35)}
    #score ellipse.pf-correct{fill:#2eae64!important;stroke:#176d3c!important;stroke-width:4!important;filter:drop-shadow(0 0 5px rgba(46,174,100,.55));transform:scale(1.3)}
    #score ellipse.pf-wrong{fill:#e14e55!important;stroke:#8e2028!important;stroke-width:4!important;filter:drop-shadow(0 0 5px rgba(225,78,85,.6));transform:scale(1.35)}
    #pf-feedback{margin:10px 0 12px;padding:10px 12px;border:1px solid #3d3546;border-radius:12px;background:#100d15;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
    #pf-feedback .pf-dot{width:11px;height:11px;border-radius:50%;background:#e0a72f;box-shadow:0 0 0 4px rgba(224,167,47,.13)}
    #pf-feedback[data-state="ok"] .pf-dot{background:#2eae64;box-shadow:0 0 0 4px rgba(46,174,100,.13)}
    #pf-feedback[data-state="bad"] .pf-dot{background:#e14e55;box-shadow:0 0 0 4px rgba(225,78,85,.13)}
    #pf-feedback strong{color:#f4d393}
    #pf-feedback .pf-help{margin-left:auto;color:#9e95a4;font-size:12px}
    #pf-modehint{font-size:11px;color:#a59cab;margin-top:7px;line-height:1.45}
  `;
  document.head.appendChild(css);

  function rightNotes(){return S.out.filter(n=>n.h==='R').sort((a,b)=>a.s-b.s||a.p-b.p)}
  function allScoreEls(){return [...document.querySelectorAll('#score ellipse.pf-note')]}
  function rightScoreEls(){return [...document.querySelectorAll('#score ellipse.pf-note[data-hand="R"]')]}
  function expectedAtBeat(beat){
    const r=rightNotes(); if(!r.length)return -1;
    let best=0,dist=Infinity;
    for(let i=0;i<r.length;i++){
      const n=r[i],center=n.s+Math.min(n.d,.6)*.3,d=Math.abs(center-beat);
      if(d<dist){dist=d;best=i}
      if(n.s>beat+1)break;
    }
    return best;
  }
  function expectedIndex(){return practiceActive?Math.min(S.idx,rightNotes().length-1):expectedAtBeat(playBeat)}
  function noteName(n){return typeof nm==='function'?nm(n):String(n)}

  function ensureFeedback(){
    if(q('#pf-feedback'))return;
    const player=q('.player'); if(!player)return;
    const bar=document.createElement('div');
    bar.id='pf-feedback';bar.dataset.state='idle';
    bar.innerHTML='<span class="pf-dot"></span><span id="pf-feedback-text">琴譜已進入互動模式：播放時會追蹤目前音符；你彈琴時會即時判斷啱／錯。</span><span class="pf-help">金色＝目前音　綠色＝正確　紅色＝錯誤</span>';
    player.parentNode.insertBefore(bar,player);
    const hint=document.createElement('div');hint.id='pf-modehint';hint.textContent='提示：「等我彈」模式會停在下一個音，直到你彈啱先前進；普通播放模式則會跟住時間軸移動。';
    const wait=q('#wait')?.closest('label'); if(wait)wait.insertAdjacentElement('afterend',hint);
  }
  function feedback(text,state='idle'){
    ensureFeedback();const b=q('#pf-feedback'),t=q('#pf-feedback-text');if(!b||!t)return;b.dataset.state=state;t.textContent=text;
  }
  function annotateScore(){
    ensureFeedback();
    const els=[...document.querySelectorAll('#score ellipse')];
    const ordered=[];
    const dur=S.out.length?Math.max(...S.out.map(n=>n.s+n.d)):0;
    const systems=Math.max(1,Math.ceil(Math.ceil(dur/4)/4));
    for(let sys=0;sys<systems;sys++){
      S.out.filter(n=>n.s>=sys*16&&n.s<(sys+1)*16).forEach(n=>ordered.push(n));
    }
    let ridx=0;
    els.forEach((el,i)=>{
      const n=ordered[i]; if(!n)return;
      el.classList.add('pf-note');
      el.dataset.s=String(n.s);el.dataset.d=String(n.d);el.dataset.p=String(n.p);el.dataset.hand=n.h;
      if(n.h==='R')el.dataset.ridx=String(ridx++);
      el.addEventListener('click',()=>{tone(n.p,.35,.65);flashKey(n.p);feedback('已試聽：'+noteName(n.p)+'。','idle')});
    });
    applyPracticeCursor();
  }
  function clearTransient(){allScoreEls().forEach(e=>e.classList.remove('pf-current','pf-wrong'))}
  function markTime(beat){
    playBeat=beat;
    const els=allScoreEls();
    els.forEach(e=>{
      const s=+e.dataset.s,d=+e.dataset.d;
      e.classList.toggle('pf-current',beat>=s-.03&&beat<s+Math.max(.15,d));
    });
    const r=rightNotes(),idx=expectedAtBeat(beat),n=r[idx];
    if(n)feedback('播放位置：'+noteName(n.p)+'　（第 '+(idx+1)+' / '+r.length+' 個旋律音）','idle');
  }
  function applyPracticeCursor(){
    if(!practiceActive)return;
    allScoreEls().forEach(e=>e.classList.remove('pf-current'));
    const e=rightScoreEls()[Math.min(S.idx,rightScoreEls().length-1)];
    if(e)e.classList.add('pf-current');
    const n=rightNotes()[S.idx];
    if(n)feedback('輪到你彈：'+noteName(n.p)+'　彈啱後琴譜會自動去下一音。','idle');
    else if(rightNotes().length)feedback('完成！你已經彈完今個版本。','ok');
  }
  function markCorrect(idx){
    const e=rightScoreEls()[idx];if(e){e.classList.remove('pf-current','pf-wrong');e.classList.add('pf-correct');correctMarks.add(idx)}
  }
  function markWrong(idx){
    const e=rightScoreEls()[idx];if(!e)return;e.classList.add('pf-wrong');setTimeout(()=>e.classList.remove('pf-wrong'),520)
  }
  function flashKey(n,bad=false){
    document.querySelectorAll(`[data-p="${n}"]`).forEach(k=>{k.classList.add('a');if(bad)k.style.outline='3px solid #e14e55';setTimeout(()=>{k.classList.remove('a');k.style.outline=''},190)})
  }

  const baseScore=score;
  score=function(dur){baseScore(dur);requestAnimationFrame(annotateScore)};

  const baseStop=stop;
  stop=function(){
    baseStop();cancelAnimationFrame(raf);raf=0;playbackActive=false;practiceActive=false;playBeat=0;
    allScoreEls().forEach(e=>e.classList.remove('pf-current','pf-wrong'));
    if(rightNotes().length)feedback('已停止。按播放會追蹤音符；勾選「等我彈」可逐音練習。','idle');
  };

  play=function(){
    if(S.playing||playbackActive||practiceActive){stop();return}
    ac().resume();
    if(q('#wait')?.checked){
      practiceActive=true;playbackActive=false;S.playing=false;S.idx=0;S.ok=0;S.tr=0;correctMarks.clear();
      rightScoreEls().forEach(e=>e.classList.remove('pf-correct','pf-wrong','pf-current'));
      q('#play').textContent='Ⅱ';update();applyPracticeCursor();return;
    }
    baseStop();
    playbackActive=true;S.playing=true;q('#play').textContent='Ⅱ';
    const beatSec=60/(+q('#tempo').value||S.t),dur=Math.max(...S.out.map(n=>n.s+n.d));
    const startBeat=(+q('#seek').value||0)/1000*dur;playBeat=startBeat;playStartedAt=performance.now()-startBeat*beatSec*1000;
    S.out.filter(n=>n.s>=startBeat-.001).forEach(n=>S.timers.push(setTimeout(()=>tone(n.p,Math.min(1,n.d*beatSec),n.h==='L'?.38:.65),Math.max(0,(n.s-startBeat)*beatSec*1000))));
    const tick=()=>{
      if(!playbackActive)return;
      const elapsed=(performance.now()-playStartedAt)/1000,beat=elapsed/beatSec;
      markTime(beat);
      q('#seek').value=Math.min(1000,beat/dur*1000);
      q('#clock').textContent=fmt(beat*beatSec)+' / '+fmt(dur*beatSec);
      if(beat<dur)raf=requestAnimationFrame(tick);else stop();
    };raf=requestAnimationFrame(tick);
  };

  press=function(n){
    tone(n);flashKey(n);
    const r=rightNotes();if(!r.length)return;
    const idx=expectedIndex(),target=r[idx];if(!target)return;
    S.tr++;
    if(n===target.p){
      S.ok++;markCorrect(idx);feedback('✓ 正確：'+noteName(n)+'！','ok');
      if(practiceActive){S.idx=Math.min(S.idx+1,r.length);update();setTimeout(applyPracticeCursor,150)}
    }else{
      markWrong(idx);flashKey(n,true);feedback('✕ 你彈咗 '+noteName(n)+'，應該係 '+noteName(target.p)+'。再試一次。','bad');
      if(practiceActive)applyPracticeCursor();
    }
    q('#ok').textContent=S.ok;q('#try').textContent=S.tr;q('#acc').textContent=S.tr?Math.round(S.ok/S.tr*100)+'%':'—';
  };

  q('#seek')?.addEventListener('input',e=>{
    if(playbackActive){stop()}
    const dur=S.out.length?Math.max(...S.out.map(n=>n.s+n.d)):1;
    const beat=(+e.target.value/1000)*dur;markTime(beat);
  });
  q('#wait')?.addEventListener('change',()=>{
    if(playbackActive||practiceActive)stop();
    feedback(q('#wait').checked?'已選「等我彈」：按播放後，琴譜會逐音等你彈啱先前進。':'普通播放模式：播放時琴譜會跟住目前音符移動。','idle');
  });

  ensureFeedback();annotateScore();
})();
