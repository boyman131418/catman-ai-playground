/* MIMIWORA trio character-sheet art loader v4 HQ — 2026-09-14 approved Hachiware hotload */
(function(){
  const TRIO=new Set(['chiikawa','hachiware','usagi']);
  const BASE='/catman-ai-playground/mimiwora-zombie-siege-v1/vertical/art/';
  const files={chiikawa:'chiikawa-v4.png',hachiware:'hachiware-v4.png',usagi:'usagi-v4.png'};
  window.MIMIWORA_SPRITES=window.MIMIWORA_SPRITES||{};

  function install(k,src,onerror){
    const im=new Image();
    im.decoding='async';
    im.onload=()=>{IMG[k]=im;window.MIMIWORA_SPRITES[k]=im.src};
    if(onerror)im.onerror=onerror;
    im.src=src;
    return im;
  }

  install('chiikawa',BASE+files.chiikawa+'?v=20260914k');
  install('hachiware',BASE+files.hachiware+'?v=20260914k');
  install('usagi',BASE+files.usagi+'?v=20260914k');

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  async function hotloadApprovedHachiware(){
    try{
      window.__H5='';window.__H5R='';
      const root='/catman-ai-playground/mimiwora-zombie-siege-v1/vertical/';
      for(const f of ['h5-0.js','h5-1.js','h5-2.js','h5-rest-rev.js']) await loadScript(root+f+'?v=20260914k');
      if(!window.__H5||!window.__H5R)throw new Error('approved Hachiware data incomplete');
      const tail=window.__H5R.split('').reverse().join('');
      const src='data:image/png;base64,'+window.__H5+tail;
      const im=new Image();
      im.decoding='async';
      im.onload=()=>{
        IMG.hachiware=im;
        window.MIMIWORA_SPRITES.hachiware=src;
        window.MIMIWORA_TRIO_ART_VERSION='character-sheet-v5-approved-hachiware';
        try{delete window.__H5;delete window.__H5R}catch(e){}
      };
      im.src=src;
    }catch(e){
      console.warn('MIMIWORA approved Hachiware hotload fallback:',e);
    }
  }
  hotloadApprovedHachiware();

  const oldDrawSprite=window.drawSprite;
  window.drawSprite=function(k,tier,frame,x,base,scale=2.01,alpha=1){
    const im=IMG[k];
    if(!TRIO.has(k)||!im||!im.complete||!im.naturalWidth){
      return oldDrawSprite(k,tier,frame,x,base,scale,alpha);
    }
    const sw=im.naturalWidth/8,sh=im.naturalHeight/3;
    const f=Math.max(0,Math.min(7,frame|0));
    const t=Math.max(0,Math.min(2,tier|0));
    const size=80*scale;
    ctx.save();ctx.globalAlpha=alpha;
    const prev=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(im,f*sw,t*sh,sw,sh,x-size/2,base-size,size,size);
    ctx.imageSmoothingEnabled=prev;ctx.restore();
  };
  window.MIMIWORA_TRIO_ART_VERSION='character-sheet-v4-hq-loading-approved-hachiware';
})();
