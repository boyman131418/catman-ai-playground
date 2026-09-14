/* MIMIWORA trio character-sheet art loader v6 HQ */
(function(){
  const TRIO=new Set(['chiikawa','hachiware','usagi']);
  const BASE='/catman-ai-playground/mimiwora-zombie-siege-v1/vertical/art/';
  const files={
    chiikawa:'chiikawa-v4.png',
    hachiware:'hachiware-v6.svg',
    usagi:'usagi-v4.png'
  };
  window.MIMIWORA_SPRITES=window.MIMIWORA_SPRITES||{};

  function install(k,src){
    const im=new Image();
    im.decoding='async';
    im.onload=()=>{ IMG[k]=im; window.MIMIWORA_SPRITES[k]=src; };
    im.onerror=()=>console.warn('MIMIWORA trio art failed:',k,src);
    im.src=src;
  }

  install('chiikawa',BASE+files.chiikawa+'?v=20260914i');
  install('hachiware',BASE+files.hachiware+'?v=20260914i');
  install('usagi',BASE+files.usagi+'?v=20260914i');

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
    ctx.save();
    ctx.globalAlpha=alpha;
    const prev=ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(im,f*sw,t*sh,sw,sh,x-size/2,base-size,size,size);
    ctx.imageSmoothingEnabled=prev;
    ctx.restore();
  };
  window.MIMIWORA_TRIO_ART_VERSION='character-sheet-v6-hachiware-polished';
})();
