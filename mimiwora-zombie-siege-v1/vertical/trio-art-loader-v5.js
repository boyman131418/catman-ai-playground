/* MIMIWORA trio character-sheet art loader v5 — approved Hachiware */
(function(){
  const TRIO=new Set(['chiikawa','hachiware','usagi']);
  const BASE='/catman-ai-playground/mimiwora-zombie-siege-v1/vertical/art/';
  const files={chiikawa:'chiikawa-v4.png',hachiware:'hachiware-v4.png',usagi:'usagi-v4.png'};
  window.MIMIWORA_SPRITES=window.MIMIWORA_SPRITES||{};

  function sourceFor(k,file){
    if(k==='hachiware' && window.__H5){
      const tail=(window.__H5R||'').split('').reverse().join('');
      return 'data:image/png;base64,'+window.__H5+tail;
    }
    return BASE+file+'?v=20260914k';
  }

  for(const [k,file] of Object.entries(files)){
    const im=new Image();
    im.decoding='async';
    im.onload=()=>{
      IMG[k]=im;
      window.MIMIWORA_SPRITES[k]=im.src;
      if(k==='hachiware'){
        try{delete window.__H5;delete window.__H5R}catch(e){}
      }
    };
    im.onerror=()=>{
      if(k==='hachiware' && !im.__fallback){
        im.__fallback=true;
        im.src=BASE+'hachiware-v4.png?v=20260914k';
      }
    };
    im.src=sourceFor(k,file);
  }

  const oldDrawSprite=window.drawSprite;
  window.drawSprite=function(k,tier,frame,x,base,scale=2.01,alpha=1){
    const im=IMG[k];
    if(!TRIO.has(k) || !im || !im.complete || !im.naturalWidth){
      return oldDrawSprite(k,tier,frame,x,base,scale,alpha);
    }
    const sw=im.naturalWidth/8, sh=im.naturalHeight/3;
    const f=Math.max(0,Math.min(7,frame|0));
    const t=Math.max(0,Math.min(2,tier|0));
    const size=80*scale;
    ctx.save();
    ctx.globalAlpha=alpha;
    const prev=ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(im,f*sw,t*sh,sw,sh,x-size/2,base-size,size,size);
    ctx.imageSmoothingEnabled=prev;
    ctx.restore();
  };
  window.MIMIWORA_TRIO_ART_VERSION='character-sheet-v5-approved-hachiware';
})();
