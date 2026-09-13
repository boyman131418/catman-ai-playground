/* MIMIWORA trio character-sheet art loader v3 */
(function(){
  const BASE='/catman-ai-playground/mimiwora-zombie-siege-v1/vertical/art/';
  const files={chiikawa:'chiikawa-v3.png',hachiware:'hachiware-v3.png',usagi:'usagi-v3.png'};
  for(const [k,file] of Object.entries(files)){
    const im=new Image();
    im.decoding='async';
    im.onload=()=>{IMG[k]=im;window.MIMIWORA_SPRITES[k]=im.src};
    im.src=BASE+file+'?v=20260914';
  }
  window.MIMIWORA_TRIO_ART_VERSION='character-sheet-v3';
})();
