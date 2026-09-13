/* Balance patch for roster v2 */
(function(){
  if(!window.WEAPONS && typeof WEAPONS==='undefined') return;
  const table=(typeof WEAPONS!=='undefined'?WEAPONS:window.WEAPONS);
  if(!table.hachiware) return;
  const rates=[0.10,0.12,0.14,0.18];
  table.hachiware.forEach((w,i)=>{ if(w&&w.mods) w.mods.hope=rates[i]??0.10; });
})();
