/* MIMIWORA scalable character roster v2 */
(function(){
const ROSTER=['mimi','goban','nomo','kuro','chiikawa','hachiware','usagi'];
const ORIGINAL=['mimi','goban','nomo','kuro'];
const POS=[72,204,336,468];

HERO_BASE.chiikawa={name:'吉伊卡哇',role:'膽小勇者',hp:118,atk:21,rate:.92,range:390,color:'#ffd0df'};
HERO_BASE.hachiware={name:'小八',role:'樂觀突擊手',hp:132,atk:23,rate:.82,range:430,color:'#a9d9ff'};
HERO_BASE.usagi={name:'兔兔',role:'狂氣破陣者',hp:148,atk:30,rate:.94,range:315,color:'#ffe58a'};

WEAPONS.chiikawa=[
{name:'粉紅刺叉',tag:'勇氣・暈眩',unlock:1,desc:'招牌討伐武器。危急時傷害上升。',mods:{atk:1,rate:1,range:1,stun:.13,pierce:1,brave:.35},skills:[['鼓起勇氣','城門低血時額外傷害 +30%',h=>h.brave+=.30],['刺叉熟練','傷害 +38%',h=>h.atk*=1.38],['緊張突刺','暈眩 +18%',h=>h.stun+=.18]]},
{name:'除草小叉',tag:'高速・資源',unlock:2,desc:'把努力工作的特質變成高速連擊與額外廢料。',mods:{atk:.78,rate:.58,range:.92,pierce:1,loot:2},skills:[['勤力工作','擊殺額外廢料 +3',h=>h.loot+=3],['熟能生巧','攻速 +27%',h=>h.rate*=.73],['整齊一列','穿透 +1',h=>h.pierce++]]},
{name:'淚光護符',tag:'支援・回復',unlock:3,desc:'將緊張與眼淚化成隊伍能量和城門回復。',mods:{atk:.72,rate:.88,range:1.16,support:1,teamGain:2.2,repair:.8},skills:[['眼淚變力量','每次攻擊隊伍能量 +2',h=>h.teamGain+=2],['溫柔守護','攻擊時微量修復城門',h=>h.repair+=1.2],['朋友在身邊','傷害 +35% 並提升支援',h=>{h.atk*=1.35;h.teamGain+=1}]]},
{name:'勇氣刺叉・覺醒',tag:'傳說・逆境',unlock:4,desc:'越危險越強，低血城門時爆發。',mods:{atk:1.22,rate:.82,range:1.08,stun:.20,pierce:2,brave:.75},skills:[['最後勇氣','逆境加成再 +40%',h=>h.brave+=.40],['必死守城','傷害 +45%',h=>h.atk*=1.45],['不再退後','攻速 +24%',h=>h.rate*=.76]]}
];

WEAPONS.hachiware=[
{name:'藍色刺叉',tag:'直線・穿透',unlock:1,desc:'穩定又可靠的討伐武器，擅長直線清怪。',mods:{atk:1,rate:1,range:1,pierce:2,hope:1},skills:[['總有辦法','攻擊有機會額外增加合技能量',h=>h.hope+=.16],['藍叉貫穿','穿透 +1',h=>h.pierce++],['積極突擊','攻速 +24%',h=>h.rate*=.76]]},
{name:'伸縮刺叉',tag:'遠距・安全',unlock:2,desc:'把刺叉伸長，遠距離保持輸出。',mods:{atk:.92,rate:.88,range:1.35,pierce:2,hope:1},skills:[['再伸長一點','射程 +30%',h=>h.range*=1.30],['直線掃蕩','穿透 +2',h=>h.pierce+=2],['樂觀節奏','攻速 +22%',h=>h.rate*=.78]]},
{name:'應援刺叉',tag:'支援・士氣',unlock:3,desc:'正面性格化成隊伍士氣，快速累積合技能量。',mods:{atk:.82,rate:.72,range:1.08,pierce:1,hope:1,teamGain:3},skills:[['大聲打氣','合技能量獲得 +3',h=>h.teamGain+=3],['朋友優先','傷害 +32% 並提高全隊節奏',h=>{h.atk*=1.32;h.aura=.08}],['正面思考','攻速 +25%',h=>h.rate*=.75]]},
{name:'希望刺叉・極',tag:'傳說・連穿',unlock:4,desc:'超長直線穿透，越多敵人越能累積希望。',mods:{atk:1.20,rate:.80,range:1.40,pierce:4,hope:1,teamGain:2},skills:[['一路向前','穿透 +2',h=>h.pierce+=2],['希望爆發','傷害 +42%',h=>h.atk*=1.42],['一定有辦法','希望觸發率大幅提升',h=>h.hope+=.28]]}
];

WEAPONS.usagi=[
{name:'黃色討伐棒',tag:'範圍・衝擊',unlock:1,desc:'高能量揮棒，一次掃開一大片敵人。',mods:{atk:1,rate:1,range:1,shock:95,stun:.10,fury:.18},skills:[['YAHAA！','狂擊觸發率 +18%',h=>h.fury+=.18],['大力揮棒','傷害 +42%',h=>h.atk*=1.42],['亂舞範圍','震波半徑 +45',h=>h.shock+=45]]},
{name:'雙頭討伐棒',tag:'十字・清場',unlock:2,desc:'雙頭武器形成更大的十字掃蕩。',mods:{atk:.92,rate:.78,range:1.06,shock:135,stun:.12,fury:.16},skills:[['十字暴走','震波半徑 +55',h=>h.shock+=55],['雙頭連擊','攻速 +26%',h=>h.rate*=.74],['打飛晒佢','傷害 +38%',h=>h.atk*=1.38]]},
{name:'跳跳討伐棒',tag:'跳擊・暴擊',unlock:3,desc:'利用超高活力跳入屍群中心，爆發暴擊。',mods:{atk:1.12,rate:.94,range:.92,shock:110,crit:.20,fury:.25},skills:[['超級跳擊','暴擊 +20%',h=>h.crit+=.20],['落地震波','震波半徑 +50',h=>h.shock+=50],['停唔到手','狂擊率 +22%',h=>h.fury+=.22]]},
{name:'黃金狂擊棒',tag:'傳說・暴走',unlock:4,desc:'完全放飛自我的高速範圍武器。',mods:{atk:1.30,rate:.66,range:1.05,shock:145,stun:.16,fury:.35},skills:[['URA！','狂擊率 +25%',h=>h.fury+=.25],['無限精力','攻速 +28%',h=>h.rate*=.72],['黃金大暴走','傷害 +45%',h=>h.atk*=1.45]]}
];

function normalizeSave(){
 if(!Array.isArray(save.party)||save.party.length!==4||save.party.some(k=>!ROSTER.includes(k))) save.party=ORIGINAL.slice();
 save.weapons=save.weapons||{}; save.selected=save.selected||{};
 const tier=Math.min(4,Math.max(1,save.unlockedStage||1));
 for(const k of ROSTER){
   if(!Array.isArray(save.weapons[k])) save.weapons[k]=[];
   for(let i=0;i<WEAPONS[k].length;i++) if(WEAPONS[k][i].unlock<=tier&&!save.weapons[k].includes(i)) save.weapons[k].push(i);
   if(save.selected[k]==null||!save.weapons[k].includes(save.selected[k])) save.selected[k]=save.weapons[k][0]??0;
 }
}
const oldDefaultSave=defaultSave;
defaultSave=function(){const s=oldDefaultSave();s.party=ORIGINAL.slice();s.weapons=s.weapons||{};s.selected=s.selected||{};for(const k of ['chiikawa','hachiware','usagi']){s.weapons[k]=[0];s.selected[k]=0}return s};
normalizeSave();

function px(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function makeSprite(kind){
 const cv=document.createElement('canvas');cv.width=CW*8;cv.height=CH*3;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
 const palette={chiikawa:{body:'#fffdf8',mark:'#ffd6e3',accent:'#ef93b2',weapon:'#ef92bd'},hachiware:{body:'#fffdf7',mark:'#86aecd',accent:'#f2a7b8',weapon:'#5da9e9'},usagi:{body:'#f6df70',mark:'#e9b65a',accent:'#ed9e7e',weapon:'#f4ca45'}}[kind];
 function frame(f,t){const ox=f*CW,oy=t*CH,bob=(f===1?1:0),attack=(f===4||f===5),celebrate=(f===7),tier=t;
   const body=palette.body,mark=palette.mark;
   if(tier>0){g.globalAlpha=.18;px(g,ox+5,oy+8,35,70,tier===1?'#9ee9ff':'#ffe280');g.globalAlpha=1}
   if(kind==='chiikawa'){
     px(g,ox+11,oy+13+bob,23,5,body);px(g,ox+8,oy+18+bob,29,23,body);px(g,ox+11,oy+8+bob,7,9,body);px(g,ox+27,oy+8+bob,7,9,body);
     px(g,ox+14,oy+25+bob,4,5,'#20242a');px(g,ox+28,oy+25+bob,4,5,'#20242a');px(g,ox+10,oy+31+bob,5,3,mark);px(g,ox+31,oy+31+bob,5,3,mark);px(g,ox+22,oy+32+bob,2,2,'#553944');
     px(g,ox+14,oy+40+bob,17,25,body);px(g,ox+8,oy+44+bob,7,13,body);px(g,ox+30,oy+44+bob,7,13,body);px(g,ox+15,oy+64+bob,6,9,body);px(g,ox+25,oy+64+bob,6,9,body);
     if(celebrate){px(g,ox+6,oy+38,7,16,body);px(g,ox+33,oy+38,7,16,body)}
     if(attack||tier>0){px(g,ox+36,oy+30,3,38,palette.weapon);px(g,ox+31,oy+29,13,3,palette.weapon);px(g,ox+31,oy+29,3,8,palette.weapon);px(g,ox+41,oy+29,3,8,palette.weapon)}
   }else if(kind==='hachiware'){
     px(g,ox+9,oy+16+bob,28,25,body);px(g,ox+9,oy+7+bob,8,13,mark);px(g,ox+29,oy+7+bob,8,13,mark);px(g,ox+13,oy+12+bob,20,9,mark);px(g,ox+9,oy+18+bob,6,8,mark);px(g,ox+31,oy+18+bob,6,8,mark);
     px(g,ox+14,oy+26+bob,4,5,'#1f252b');px(g,ox+28,oy+26+bob,4,5,'#1f252b');px(g,ox+22,oy+32+bob,3,2,'#d17f91');px(g,ox+20,oy+35+bob,6,2,'#333');
     px(g,ox+14,oy+41+bob,17,24,body);px(g,ox+8,oy+45+bob,7,12,body);px(g,ox+30,oy+45+bob,7,12,body);px(g,ox+15,oy+64+bob,6,9,body);px(g,ox+25,oy+64+bob,6,9,body);px(g,ox+31,oy+55+bob,8,4,mark);
     if(celebrate){px(g,ox+5,oy+38,7,17,body);px(g,ox+34,oy+38,7,17,body)}
     if(attack||tier>0){px(g,ox+36,oy+29,3,40,palette.weapon);px(g,ox+31,oy+28,13,3,palette.weapon);px(g,ox+31,oy+28,3,8,palette.weapon);px(g,ox+41,oy+28,3,8,palette.weapon)}
   }else{
     px(g,ox+12,oy+17+bob,23,24,body);px(g,ox+13,oy+1+bob,7,20,body);px(g,ox+27,oy+1+bob,7,20,body);px(g,ox+15,oy+4+bob,3,13,mark);px(g,ox+29,oy+4+bob,3,13,mark);
     px(g,ox+16,oy+26+bob,4,5,'#222');px(g,ox+28,oy+26+bob,4,5,'#222');px(g,ox+21,oy+33+bob,6,3,'#5b3a2a');
     px(g,ox+14,oy+41+bob,18,25,body);px(g,ox+7,oy+(celebrate?35:45)+bob,8,13,body);px(g,ox+31,oy+(celebrate?35:45)+bob,8,13,body);px(g,ox+15,oy+65+bob,6,9,body);px(g,ox+26,oy+65+bob,6,9,body);
     if(attack||tier>0){px(g,ox+37,oy+27,4,43,palette.weapon);px(g,ox+34,oy+27,10,5,palette.weapon);px(g,ox+34,oy+65,10,5,palette.weapon)}
   }
   if(tier===2){px(g,ox+7,oy+76,31,2,'#ffe36e');px(g,ox+11,oy+80,23,2,'#9eeaff')}
 }
 for(let t=0;t<3;t++)for(let f=0;f<8;f++)frame(f,t);
 return cv.toDataURL('image/png');
}
for(const k of ['chiikawa','hachiware','usagi']){const uri=makeSprite(k);window.MIMIWORA_SPRITES[k]=uri;const im=new Image();im.src=uri;IMG[k]=im}

function applyParty(party){
 TYPES.splice(0,TYPES.length,...party.slice(0,4));
 TYPES.forEach((k,i)=>HERO_X[k]=POS[i]);
 save.party=TYPES.slice();
 game.selectedHero=TYPES[0];
 normalizeSave();
}
applyParty(save.party);

const oldMakeHero=makeHero;
makeHero=function(k){const h=oldMakeHero(k),m=WEAPONS[k][h.weapon].mods||{};h.brave=m.brave||0;h.loot=m.loot||0;h.support=m.support||0;h.teamGain=m.teamGain||0;h.repair=m.repair||0;h.hope=typeof m.hope==='number'?m.hope:(m.hope?0.10:0);h.aura=m.aura||0;h.fury=m.fury||0;return h};

const oldResetBattle=resetBattle;
resetBattle=function(id){applyParty(save.party);oldResetBattle(id);const aura=Math.max(0,...Object.values(game.heroes).map(h=>h.aura||0));if(aura>0)for(const h of Object.values(game.heroes))h.rate*=1-aura};

const oldAttack=attack;
attack=function(h,z){
 if(!['chiikawa','hachiware','usagi'].includes(h.type)) return oldAttack(h,z);
 h.anim='attack';h.animT=.24;
 if(h.type==='chiikawa'){
   sfx('mimi');let mult=1;if(game.gateHP/game.gateMax<.45)mult+=h.brave||0;const before=z.hp;damage(z,h.atk*mult,h,'#ffb6d2');game.fx.push({kind:'slash',x:z.x,y:z.y-28,t:.16});if(Math.random()<h.stun)z.stun=Math.max(z.stun,.75);
   if(h.pierce){for(const q of game.zombies.filter(q=>q!==z&&q.hp>0&&Math.abs(q.x-z.x)<45&&q.y>=z.y-20).slice(0,h.pierce))damage(q,h.atk*.58*mult,h,'#ffd0df')}
   if(before>0&&z.hp<=0&&h.loot)game.scrap+=h.loot;
   if(h.support){game.team=clamp(game.team+(h.teamGain||0),0,100);if(h.repair)game.gateHP=Math.min(game.gateMax,game.gateHP+h.repair)}
 }else if(h.type==='hachiware'){
   sfx('mimi');const pool=game.zombies.filter(q=>q.hp>0&&Math.abs(q.x-z.x)<52&&q.y>=z.y-35).sort((a,b)=>a.y-b.y).slice(0,1+(h.pierce||0));pool.forEach((q,i)=>damage(q,h.atk*(1-i*.10),h,'#a9dbff'));game.fx.push({kind:'arc',x:h.x,y:205,ex:z.x,ey:z.y-25,t:.13});
   game.team=clamp(game.team+(h.teamGain||0),0,100);if(Math.random()<(h.hope||0)){game.team=clamp(game.team+8,0,100);for(const k in game.skillCD)game.skillCD[k]=Math.max(0,game.skillCD[k]-.7);flo(h.x,188,'總有辦法！','#c9f0ff')}
 }else{
   sfx('goban');let rad=78+(h.shock||0);game.fx.push({kind:'shock',x:z.x,y:z.y-5,t:.25,r:rad});let targets=game.zombies.filter(q=>q.hp>0&&Math.hypot(q.x-z.x,q.y-z.y)<rad);targets.forEach(q=>{let crit=Math.random()<(h.crit||.06);damage(q,h.atk*(q===z?1:.62)*(crit?2:1),h,crit?'#fff19b':'#ffe58a');if(Math.random()<h.stun)q.stun=Math.max(q.stun,.65)});if(Math.random()<(h.fury||0)){flo(z.x,z.y-70,'YAHAA!','#ffe36e');targets.slice(0,5).forEach(q=>damage(q,h.atk*.55,h,'#fff0a5'));game.team=clamp(game.team+5,0,100)}
 }
};

const oldWinStage=winStage;
winStage=function(){oldWinStage();const unlock=Math.min(4,game.stageId+1);for(const k of ROSTER)for(let i=0;i<WEAPONS[k].length;i++)if(WEAPONS[k][i].unlock<=unlock&&!save.weapons[k].includes(i))save.weapons[k].push(i);store()};

const oldSpeakerType=speakerType;
speakerType=function(s){return ({'吉伊卡哇':'chiikawa','小八':'hachiware','兔兔':'usagi'})[s]||oldSpeakerType(s)};

let partyDraft=save.party.slice();
function renderParty(){
 bg(['#10172a','#25364a','#465665']);T('選擇出戰角色',270,48,27,'#efe0aa','center');T('最多／必須選 4 位　角色庫 '+ROSTER.length,270,75,11,'#cfe7ff','center');
 ROSTER.forEach((k,i)=>{const col=i%2,row=Math.floor(i/2),x=18+col*262,y=105+row*145,w=244,h=130,idx=partyDraft.indexOf(k),sel=idx>=0;R(x,y,w,h,sel?'#244d70':'#14283f');ctx.strokeStyle=sel?'#ffe18a':'#64798b';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);drawSprite(k,0,0,x+55,y+108,.88);T(HERO_BASE[k].name,x+103,y+27,14,HERO_BASE[k].color);T(HERO_BASE[k].role,x+103,y+48,10,'#cfe7ff');let trait=k==='chiikawa'?'逆境爆發／支援':k==='hachiware'?'穿透／士氣':k==='usagi'?'範圍／狂擊':'專屬武器 Build';T(trait,x+103,y+70,9,'#fff');if(sel){R(x+w-36,y+10,25,25,'#d6b84f');T(String(idx+1),x+w-23,y+28,12,'#111','center')}else T('點擊加入',x+103,y+103,9,'#9db5c8')});
 P(28,700,484,76,'目前隊伍');partyDraft.forEach((k,i)=>{T((i+1)+' '+HERO_BASE[k].name,48+i*118,744,10,HERO_BASE[k].color)});
 const ok=partyDraft.length===4;R(90,810,360,76,ok?'#285c7d':'#29303a');ctx.strokeStyle=ok?'#aee8ff':'#59616b';ctx.lineWidth=2;ctx.strokeRect(91,811,358,74);T(ok?'確認隊伍 → 整備':'請選滿 4 位角色',270,855,17,ok?'#fff0ad':'#aaa','center');T('之後新增角色只需加入角色資料，不會改動四人上限。',270,918,9,'#a9bed1','center')
}
const oldRender=render;
render=function(){if(game.mode==='party'){ctx.clearRect(0,0,W,H);renderParty()}else oldRender()};
const oldRenderTitle=renderTitle;
renderTitle=function(){oldRenderTitle();T('角色庫 7 人・每局選 4 人',270,724,10,'#aee8ff','center')};

function xy(e){const r=C.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
C.addEventListener('pointerdown',function(e){
 const p=xy(e);
 if(game.mode==='map'){
   for(let i=0;i<STAGES.length;i++){let yy=110+i*145,s=STAGES[i];if(p.x>=35&&p.x<=505&&p.y>=yy&&p.y<=yy+125&&s.id<=save.unlockedStage){e.preventDefault();e.stopImmediatePropagation();game.stageId=s.id;partyDraft=(save.party||ORIGINAL).slice(0,4);game.mode='party';return}}
 }
 if(game.mode==='party'){
   e.preventDefault();e.stopImmediatePropagation();
   for(let i=0;i<ROSTER.length;i++){const col=i%2,row=Math.floor(i/2),x=18+col*262,y=105+row*145;if(p.x>=x&&p.x<=x+244&&p.y>=y&&p.y<=y+130){const k=ROSTER[i],at=partyDraft.indexOf(k);if(at>=0)partyDraft.splice(at,1);else if(partyDraft.length<4)partyDraft.push(k);return}}
   if(p.x>=90&&p.x<=450&&p.y>=810&&p.y<=886&&partyDraft.length===4){applyParty(partyDraft);store();game.selectedHero=TYPES[0];game.mode='loadout';return}
 }
},true);

const oldStore=store;
store=function(){normalizeSave();oldStore()};

if(window.__MIMIWORA_TEST__){window.__MIMIWORA_TEST__.unlockAll=function(){save.unlockedStage=5;save.bells=99;for(const k of ROSTER)save.weapons[k]=[0,1,2,3];store()};window.__MIMIWORA_TEST__.party=function(list){partyDraft=(list||['chiikawa','hachiware','usagi','mimi']).slice(0,4);applyParty(partyDraft);store();return TYPES.slice()}}
window.MIMIWORA_ROSTER={all:ROSTER,applyParty,get party(){return save.party.slice()},normalize:normalizeSave};
})();