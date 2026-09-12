/* ---------- render game ---------- */
function bgGame(){
 let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#17213a");g.addColorStop(.45,"#38495d");g.addColorStop(1,"#443d39");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(let i=0;i<40;i++)R((i*137)%W,(i*83)%260,2,2,i%5?"#9db1c8":"#d8ceb1");
 for(let i=0;i<10;i++){let x=i*105;R(x,245+(i%3)*14,90,125,i%2?"#202936":"#25313d");R(x+18,220+(i%2)*20,10,40,"#1d2632")}
 R(40,160,880,380,"#514942");R(62,178,836,362,"#5e5449");
 for(let y=220;y<H;y+=55){ctx.strokeStyle="rgba(255,255,255,.05)";ctx.beginPath();ctx.moveTo(70,y);ctx.lineTo(890,y);ctx.stroke()}
 R(20,96,920,74,"#495364");R(28,104,904,58,"#69778b");
 for(let x=30;x<930;x+=58){R(x,92,42,19,"#5a687b")}
 R(55,152,850,18,"#303946");
}
function drawHeroes(){
 for(const h of Object.values(heroes)){
   const tier=heroTier(h),frame=heroFrame(h),a=h.hit>0&&Math.floor(performance.now()/40)%2?.35:1;
   drawSprite(h.type,tier,frame,h.x,187,1.93,a);
   bar(h.x-38,78,76,6,h.hp,h.maxHp,"#75da80");
   T(h.name+" Lv."+h.level,h.x,72,11,heroBase[h.type].color,"center");
   if(h.level<5)bar(h.x-35,188,70,5,h.xp,h.nextXp,"#ffd85d");else T("MAX",h.x,194,9,"#ffe77c","center");
 }
}
function drawEffects(){
 for(const e of fx){
   let a=clamp(e.t/.3,0,1);ctx.globalAlpha=clamp(a,0,1);
   if(e.kind==="spark"||e.kind==="death"){ctx.strokeStyle=e.kind==="spark"?"#c2f3ff":"#e3c29b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,30*(1-a)+4,0,Math.PI*2);ctx.stroke()}
   if(e.kind==="slash"){ctx.strokeStyle="#edf1ff";ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,25,-2.5,-.2);ctx.stroke()}
   if(e.kind==="tongue"){ctx.strokeStyle="#e64f5c";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.ex,e.ey);ctx.stroke()}
   if(e.kind==="shock"){ctx.strokeStyle="#ffd775";ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,80*(1-a)+20,0,Math.PI);ctx.stroke()}
   if(e.kind==="ultimate"){
     ctx.strokeStyle="#bcefff";ctx.lineWidth=3;ctx.strokeRect(4,4,W-8,H-8);
     for(let i=0;i<22;i++)R((i*61+performance.now()/4)%W,180+(i%7)*48,4,30,"#bdefff");
   }
   ctx.globalAlpha=1;
 }
 for(const f of floaters){ctx.globalAlpha=clamp(f.t/.75,0,1);T(f.s,f.x,f.y,12,f.c,"center");ctx.globalAlpha=1}
}
function drawShots(){for(const s of shots){R(s.x-4,s.y-4,8,8,"#b9efff");R(s.x-1,s.y-8,2,16,"#fff")}}
function HUD(){
 P(12,12,220,66,"城門");T("HP",26,39,12,"#ffe7a8");bar(55,31,155,12,gateHP,gateMax,"#6ed6ff");T(Math.round(gateHP)+" / "+gateMax,132,58,10,"#fff","center");
 P(242,12,220,66,"關卡");T("第一關：屍喪攻城",258,40,15,"#fff");T("擊殺 "+kills+"　時間 "+Math.floor(stageT)+"s",258,59,10,"#cfe7ff");
 P(472,12,220,66,"四人合技");T(Math.round(teamGauge)+" / "+teamMax,488,39,12,teamGauge>=teamMax?"#ffe77c":"#fff");bar(488,49,184,9,teamGauge,teamMax,teamGauge>=teamMax?"#ffe16e":"#75bde8");
 P(702,12,246,66,"提示");T(teamGauge>=teamMax?"Q：夢光流星 READY":"每位角色最高 Lv.5",718,40,12,teamGauge>=teamMax?"#ffe77c":"#fff");T("升級選錯，後期可能守唔住",718,59,10,"#ffced2");
}
function renderGame(){
 bgGame();drawHeroes();for(const z of zombies)drawZombie(z);drawShots();drawEffects();HUD();
 if(flashT>0){ctx.globalAlpha=Math.min(1,flashT);T(flash,480,218,20,"#ffe990","center");ctx.globalAlpha=1}
 if(state==="upgrade")renderUpgrade();
 if(state==="win"||state==="lose")renderEnd();
}
function renderUpgrade(){
 R(0,0,W,H,"rgba(2,6,12,.72)");
 P(95,85,770,365,"LEVEL UP");
 T(levelHero.name+" 升到 Lv."+levelHero.level,480,126,25,heroBase[levelHero.type].color,"center");
 T("選擇一個強化方向（1 / 2 / 3）",480,154,14,"#fff","center");
 skillCards.forEach((u,i)=>{
   let x=135+i*235,y=188,w=210,h=195;
   R(x,y,w,h,i===0?"#1a3552":"#172e47");ctx.strokeStyle="#e2d39d";ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,w-4,h-4);
   T((i+1)+"",x+20,y+28,17,"#ffe77d");
   T(u.icon,x+105,y+78,38,"#fff1a0","center");T(u.name,x+105,y+112,17,"#fff","center");
   wrap(u.desc,x+22,y+148,168,22,14,"#cfe8ff");
 });
 T("現有強化："+(levelHero.picked.length?levelHero.picked.join(" / "):"無"),480,414,11,"#d6eaff","center");
}
function wrap(s,x,y,max,lh=20,size=14,c="#fff"){ctx.font=size+"px monospace";ctx.fillStyle=c;let line="",yy=y;for(const ch of s){let q=line+ch;if(ctx.measureText(q).width>max){ctx.fillText(line,x,yy);line=ch;yy+=lh}else line=q}if(line)ctx.fillText(line,x,yy)}
function renderEnd(){
 R(0,0,W,H,"rgba(0,0,0,.62)");P(170,145,620,250);
 T(state==="win"?"第一關完成！":"夢城被攻破……",480,205,34,state==="win"?"#ffe88a":"#ffb5c1","center");
 if(state==="win"){
   T("屍王已被擊倒",480,245,18,"#fff","center");
   T("總擊殺："+kills,480,279,15,"#cfe7ff","center");
   T("四位角色最終等級："+heroesOrder.map(k=>heroes[k].name+" "+heroes[k].level).join("　"),480,310,12,"#fff","center");
 }else{
   wrap("今關的核心係技能取捨。單純堆傷害未必最好；後期屍群變快、變硬，控制、穿透同攻速都可能比純傷害更重要。",235,235,490,25,15,"#fff");
 }
 T("按 ENTER 再玩一次",480,358,16,"#ffe88a","center");
}
function say(s,t=1.4){flash=s;flashT=t}
function update(dt){
 if(state==="intro"){updateIntro(dt);return}
 if(state==="play")updateGame(dt);
}
function handleKey(code){
 keys[code]=true;
 audioInit();
 if(code==="KeyM"){muted=!muted;if(master)master.gain.value=muted?0:.18}
 if(state==="intro"){
   if(!startedIntro&&(code==="Space"||code==="Enter"))startIntro();
   else if(introReady&&code==="Enter"){freshHeroes();state="play";stageT=0;spawnT=.7;gateHP=gateMax;kills=0;bossSpawned=false;bossKilled=false;zombies=[];shots=[];fx=[];floaters=[];levelQueue=[];levelHero=null;teamGauge=0;difficulty=1;say("第一關：屍喪攻城",2);audioInit()}
   return;
 }
 if(state==="upgrade"){
   if(code==="Digit1")chooseSkill(0);
   if(code==="Digit2")chooseSkill(1);
   if(code==="Digit3")chooseSkill(2);
   return;
 }
 if(state==="play"&&code==="KeyQ")ultimate();
 if((state==="win"||state==="lose")&&code==="Enter"){freshHeroes();state="play";stageT=0;spawnT=.7;gateHP=gateMax;kills=0;bossSpawned=false;bossKilled=false;zombies=[];shots=[];fx=[];floaters=[];levelQueue=[];levelHero=null;teamGauge=0;difficulty=1;say("第一關：屍喪攻城",2)}
}
addEventListener("keydown",e=>handleKey(e.code));
document.querySelectorAll(".touchBtn").forEach(btn=>{
 btn.addEventListener("pointerdown",e=>{e.preventDefault();handleKey(btn.dataset.key)});
});
C.addEventListener("click",e=>{
 const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
 if(state==="intro"){if(!startedIntro)startIntro();return}
 if(state==="upgrade"){
   if(y>=188&&y<=383){let i=Math.floor((x-135)/235);if(i>=0&&i<3)chooseSkill(i)}
 }
 if(state==="play"&&teamGauge>=teamMax&&x>=472&&x<=692&&y<=78)ultimate();
});
function loop(ts){
 let dt=Math.min(.033,(ts-last||16)/1000);last=ts;
 update(dt);
 if(state==="intro")renderIntro();else renderGame();
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);