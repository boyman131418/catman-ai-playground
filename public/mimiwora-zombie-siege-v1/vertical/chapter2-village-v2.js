/* MIMIWORA Chapter 2 + 夢森育成村 v2 */
(function(){
const PAL_KEYS=['chiikawa','hachiware','usagi'];
const PAL_NAME={chiikawa:'吉伊卡哇',hachiware:'小八',usagi:'兔兔'};
let villageMsg='';

function villageDefault(){
  return {
    wood:0,fruit:0,joy:0,day:1,energy:3,seeded:false,tab:'life',
    fac:{camp:0,orchard:0,cafe:0},
    pals:{chiikawa:{lv:0,bond:0},hachiware:{lv:0,bond:0},usagi:{lv:0,bond:0}}
  };
}
function normalizeVillage(){
  save.village=save.village||villageDefault();
  const d=villageDefault(),v=save.village;
  for(const r of ['wood','fruit','joy','day','energy']) if(!Number.isFinite(v[r]))v[r]=d[r];
  v.fac=Object.assign({},d.fac,v.fac||{});
  v.pals=v.pals||{};
  for(const k of PAL_KEYS)v.pals[k]=Object.assign({},d.pals[k],v.pals[k]||{});
  if(!v.tab)v.tab='life';
  if(!v.seeded && (save.unlockedStage||1)>=2){
    v.wood=Math.max(v.wood,4);v.fruit=Math.max(v.fruit,4);v.joy=Math.max(v.joy,2);v.seeded=true;
  }
  return v;
}
const oldDefaultSave=defaultSave;
defaultSave=function(){const s=oldDefaultSave();s.village=villageDefault();return s};
normalizeVillage();

STAGES[1].name='黑雨街區・三主角編';
STAGES[1].sub='吉伊卡哇、小八、兔兔加入夢城守衛戰';
STAGES[1].intro=[
 ['NOMO','呢場雨連我都覺得臭。'],
 ['MIMI','前面有三個細細隻的生命反應。'],
 ['吉伊卡哇','咿……咿呀！'],
 ['小八','我哋可以幫手！一定有辦法㗎！'],
 ['兔兔','烏拉！烏拉！'],
 ['KURO','……可愛得嚟，好似真係打得。'],
 ['GOBAN','……守。一起。']
];
STAGES[1].outro=[
 ['吉伊卡哇','做、做到啦……！'],
 ['小八','第二塊鐘芯搵到啦！'],
 ['兔兔','烏拉！下一站！'],
 ['MIMI','由今日開始，你哋都係夢城伙伴。'],
 ['KURO','村入面仲有地方，住低先。']
];

function palLv(k){return normalizeVillage().pals[k]?.lv||0}
function facLv(k){return normalizeVillage().fac[k]||0}
function palBond(k){return normalizeVillage().pals[k]?.bond||0}
function costFor(k,lv){
  const table={
    chiikawa:[[2,0,1,1],[4,1,2,1],[6,2,2,2],[8,3,3,3],[10,4,4,4]],
    hachiware:[[2,1,1,1],[4,2,2,1],[6,2,3,2],[8,3,4,3],[10,4,4,4]],
    usagi:[[2,1,0,1],[4,2,1,2],[6,3,2,2],[8,4,2,3],[10,4,3,4]],
    camp:[[2,2,0,0],[4,4,1,1],[7,6,2,2]],
    orchard:[[2,0,2,0],[4,1,4,1],[7,2,6,2]],
    cafe:[[3,1,1,1],[5,2,3,2],[8,3,4,4]]
  };
  const a=table[k]?.[lv];return a?{bells:a[0],wood:a[1],fruit:a[2],joy:a[3]}:null;
}
function canPay(c){const v=normalizeVillage();return c&&save.bells>=c.bells&&v.wood>=c.wood&&v.fruit>=c.fruit&&v.joy>=c.joy}
function pay(c){const v=normalizeVillage();save.bells-=c.bells;v.wood-=c.wood;v.fruit-=c.fruit;v.joy-=c.joy}
function costText(c){return c?`鐘${c.bells} 木${c.wood} 果${c.fruit} 樂${c.joy}`:'MAX'}
function say(t){villageMsg=t;game.flash=t;game.flashT=1.2}
function addBond(k,n){const p=normalizeVillage().pals[k];p.bond=Math.min(100,(p.bond||0)+n)}

function upgradePal(k){
  const v=normalizeVillage(),lv=v.pals[k].lv||0,c=costFor(k,lv);
  if(!c)return say('已達最高等級');
  if(!canPay(c))return say('材料不足');
  pay(c);v.pals[k].lv=lv+1;addBond(k,4);store();sfx('coin');vib(25);say(PAL_NAME[k]+' Lv.'+(lv+1));
}
function upgradeFac(k){
  const v=normalizeVillage(),lv=v.fac[k]||0,c=costFor(k,lv);
  if(!c)return say('已達最高等級');
  if(!canPay(c))return say('材料不足');
  pay(c);v.fac[k]=lv+1;store();sfx('coin');vib(25);say(({camp:'露營地',orchard:'果樹園',cafe:'小屋咖啡店'})[k]+' Lv.'+(lv+1));
}
function villageAction(kind){
  const v=normalizeVillage();
  if(v.energy<=0){say('今日已經玩到攰喇，休息到明日先');return}
  v.energy--;
  if(kind==='wood'){
    const gain=2+Math.floor(Math.random()*3)+facLv('camp');v.wood+=gain;addBond('chiikawa',2);say('拾木 +'+gain+'｜吉伊卡哇好努力！');
  }else if(kind==='fruit'){
    const gain=2+Math.floor(Math.random()*3)+facLv('orchard');v.fruit+=gain;addBond('hachiware',2);say('採果 +'+gain+'｜小八搵到靚果！');
  }else{
    const gain=2+facLv('cafe');v.joy+=gain;addBond('usagi',3);say('一起玩 +'+gain+' 歡樂｜兔兔大暴走！');
  }
  store();sfx('coin');vib(18);
}
function nextVillageDay(){
  const v=normalizeVillage();v.day++;v.energy=3;
  const w=facLv('camp'),f=facLv('orchard'),j=facLv('cafe');
  v.wood+=w;v.fruit+=f;v.joy+=j;
  for(const k of PAL_KEYS)addBond(k,1+j);
  store();sfx('level');say(`第 ${v.day} 日開始｜設施產出 木${w} 果${f} 樂${j}`);
}

const oldStore=store;
store=function(){normalizeVillage();oldStore()};

const oldResetBattle=resetBattle;
resetBattle=function(id){
  oldResetBattle(id);
  const v=normalizeVillage(),boost=id===2?1.6:1;
  const ch=Math.max(palLv('chiikawa'),id===2?1:0),ha=Math.max(palLv('hachiware'),id===2?1:0),us=Math.max(palLv('usagi'),id===2?1:0);
  const chBond=palBond('chiikawa')/100,haBond=palBond('hachiware')/100,usBond=palBond('usagi')/100;
  for(const h of Object.values(game.heroes))h.atk*=1+(ch*.025+chBond*.03)*boost;
  game.gateMax+=facLv('camp')*30+Math.round(ch*8*boost);game.gateHP=game.gateMax;
  game.scrap+=facLv('orchard')*3+ha*4+Math.floor(haBond*6);
  game.scrapMul*=1+facLv('orchard')*.05;
  game.xpMul*=1+facLv('cafe')*.04;
  game.team=clamp(game.team+facLv('cafe')*5+us*8+Math.floor(usBond*10),0,100);
  game.villageSupport={chiikawa:ch,hachiware:ha,usagi:us,boost,chiT:12,hachiT:16,usaT:8};
};

const oldUpdateBattle=updateBattle;
updateBattle=function(dt){
  if(game.mode==='battle'&&game.villageSupport){
    const s=game.villageSupport,b=s.boost||1;
    if(s.chiikawa>0){
      s.chiT-=dt;
      if(s.chiT<=0){
        const heal=Math.round((10+s.chiikawa*5)*b);game.gateHP=Math.min(game.gateMax,game.gateHP+heal);game.team=clamp(game.team+3+s.chiikawa*2,0,100);
        flo(105,205,'+'+heal,'#ffd4e2');game.flash='吉伊卡哇打氣！';game.flashT=.8;s.chiT=Math.max(7,15-s.chiikawa)+rnd(0,1.5);
      }
    }
    if(s.hachiware>0){
      s.hachiT-=dt;
      if(s.hachiT<=0){
        const add=2+s.hachiware*2;game.scrap+=add;flo(270,205,'+'+add+' 廢料','#aee8ff');
        if(Math.random()<.38+.08*s.hachiware&&!game.crate)game.crate={x:pick(LANES),y:rnd(550,735),t:10};
        game.flash='小八送到補給！';game.flashT=.8;s.hachiT=Math.max(8,18-s.hachiware)+rnd(0,1.5);
      }
    }
    if(s.usagi>0){
      s.usaT-=dt;
      if(s.usaT<=0){
        const targets=game.zombies.filter(z=>z.hp>0).sort((a,b)=>b.y-a.y).slice(0,Math.min(1+s.usagi,4));
        for(const z of targets){damage(z,(18+s.usagi*9)*b,null,'#ffe17d');z.stun=Math.max(z.stun,.35+.1*s.usagi)}
        if(targets.length){flo(435,205,'烏拉！','#ffe17d');game.shake=Math.max(game.shake,4);game.team=clamp(game.team+2+s.usagi,0,100)}
        s.usaT=Math.max(5,12-s.usagi)+rnd(0,1.4);
      }
    }
  }
  oldUpdateBattle(dt);
};

const oldWinStage=winStage;
winStage=function(){
  const sid=game.stageId,kills=game.kills||0;oldWinStage();
  const v=normalizeVillage(),stars=game.resultStars||1;
  v.wood+=stars+(sid>=2?1:0);v.fruit+=Math.max(1,Math.floor(kills/18))+stars;v.joy+=1+Math.floor(stars/2);
  if(sid===1&&!v.seeded){v.wood+=3;v.fruit+=3;v.joy+=2;v.seeded=true}
  store();
};

const oldRenderMap=renderMap;
renderMap=function(){
  oldRenderMap();const v=normalizeVillage(),open=(save.unlockedStage||1)>=2;
  R(0,826,540,120,'#10192d');
  R(12,842,138,58,open?'#25422e':'#252a31');ctx.strokeStyle=open?'#b9e5b1':'#666';ctx.strokeRect(13,843,136,56);
  T(open?'夢森育成':'夢森育成 LOCK',81,876,11,open?'#d7ffd0':'#888','center');
  if(open){T(`木 ${v.wood}｜果 ${v.fruit}｜樂 ${v.joy}`,335,866,10,'#d7f2dd','center');T(`第 ${v.day} 日・行動力 ${'●'.repeat(v.energy)}${'○'.repeat(3-v.energy)}`,335,888,9,'#cfe7ff','center')}
  else T('完成 CH.1 後解鎖育成村',335,878,10,'#9aa8b5','center');
};

function palDesc(k,lv){
  if(k==='chiikawa')return `全隊傷害 +${(lv*2.5).toFixed(1)}%｜定時修城`;
  if(k==='hachiware')return `開場廢料 +${lv*4}｜定時補給`;
  return `開場合技 +${lv*8}｜定時衝擊`;
}
function facDesc(k,lv){
  if(k==='camp')return `城門 HP +${lv*30}｜每日木材 +${lv}`;
  if(k==='orchard')return `廢料收入 +${lv*5}%｜每日果實 +${lv}`;
  return `XP +${lv*4}%｜每日歡樂 +${lv}`;
}
function renderVillageLife(){
  const v=normalizeVillage();
  T('夢 森 育 成 村',270,46,27,'#efe0aa','center');
  T(`第 ${v.day} 日｜行動力 ${'●'.repeat(v.energy)}${'○'.repeat(3-v.energy)}`,270,75,11,'#d8f3df','center');
  T(`鐘芯 ${save.bells}｜木 ${v.wood}｜果 ${v.fruit}｜樂 ${v.joy}`,270,101,12,'#ffe6a3','center');
  PAL_KEYS.forEach((k,i)=>{const x=[105,270,435][i],lv=palLv(k),bond=palBond(k);drawSprite(k,Math.min(2,Math.floor(lv/2)),0,x,300,1.42);T(PAL_NAME[k],x,331,12,HERO_BASE[k].color,'center');T(`Lv.${lv} ♥${bond}`,x,348,9,'#fff0ad','center')});
  P(28,374,484,220,'今日做咩好？');
  [['wood','拾木','🪵','木材：升露營地／角色'],['fruit','採果','🍎','果實：升果園／角色'],['joy','一起玩','✨','歡樂：升咖啡店／羈絆']].forEach((a,i)=>{const y=410+i*58;R(55,y,430,48,v.energy>0?'#25422e':'#272b30');ctx.strokeStyle=v.energy>0?'#b9e5b1':'#666';ctx.strokeRect(56,y+1,428,46);T(a[2]+' '+a[1],78,y+29,14,v.energy>0?'#fff':'#777');T(a[3],460,y+28,9,v.energy>0?'#dcefdc':'#777','right')});
  const prod=`每日設施產出：木 +${facLv('camp')}｜果 +${facLv('orchard')}｜樂 +${facLv('cafe')}`;
  T(prod,270,625,10,'#d9f2df','center');
  R(55,654,430,54,'#294761');ctx.strokeStyle='#9fdfff';ctx.strokeRect(56,655,428,52);T(v.energy<=0?'休息到明日 →':'提早休息到明日',270,687,14,'#dff5ff','center');
  R(55,734,205,58,'#3b3158');ctx.strokeStyle='#d4bfff';ctx.strokeRect(56,735,203,56);T('角色／設施育成',157,769,13,'#f0ddff','center');
  R(280,734,205,58,'#173750');ctx.strokeStyle='#9ddfff';ctx.strokeRect(281,735,203,56);T('返回夢城戰線',382,769,13,'#aee8ff','center');
  T('育成能力會永久帶入所有守城關卡；CH.2 支援效果更強。',270,842,9,'#cfe7ff','center');if(villageMsg)T(villageMsg,270,868,10,'#ffe9a8','center');
}
function renderVillageTrain(){
  const v=normalizeVillage();
  T('夢 森 育 成｜升級',270,43,24,'#efe0aa','center');
  T(`鐘芯 ${save.bells}｜木 ${v.wood}｜果 ${v.fruit}｜樂 ${v.joy}`,270,70,11,'#ffe6a3','center');
  PAL_KEYS.forEach((k,i)=>{const y=92+i*122,lv=palLv(k),c=costFor(k,lv);R(28,y,484,104,'#182c21');ctx.strokeStyle='#cbe7c2';ctx.strokeRect(29,y+1,482,102);drawSprite(k,Math.min(2,Math.floor(lv/2)),0,74,y+92,.74);T(PAL_NAME[k],128,y+26,15,HERO_BASE[k].color);T('Lv.'+lv+'/5',476,y+26,10,'#ffe6a3','right');T(palDesc(k,lv),128,y+52,9,'#e4f7e7');T(`羈絆 ${palBond(k)}/100`,128,y+72,8,'#ffd6e4');T(c?costText(c):'MAX',470,y+84,9,c?(canPay(c)?'#bdf2c6':'#ffb3bc'):'#aaa','right')});
  T('村設施',270,474,15,'#ffe6a3','center');
  [['camp','露營地'],['orchard','果樹園'],['cafe','小屋咖啡店']].forEach((it,i)=>{const [k,n]=it,y=495+i*83,lv=facLv(k),c=costFor(k,lv);R(42,y,456,66,'#203625');ctx.strokeStyle='#b9dfb1';ctx.strokeRect(43,y+1,454,64);T(n,60,y+22,13,'#fff');T('Lv.'+lv+'/3',474,y+22,9,'#ffe6a3','right');T(facDesc(k,lv),60,y+43,8,'#dff2e2');T(c?costText(c):'MAX',474,y+47,8,c?(canPay(c)?'#bdf2c6':'#ffb3bc'):'#aaa','right')});
  R(70,775,190,58,'#294761');ctx.strokeStyle='#9fdfff';ctx.strokeRect(71,776,188,56);T('← 村日常',165,810,13,'#dff5ff','center');
  R(280,775,190,58,'#173750');ctx.strokeStyle='#9ddfff';ctx.strokeRect(281,776,188,56);T('返回夢城戰線',375,810,13,'#aee8ff','center');if(villageMsg)T(villageMsg,270,858,10,'#ffe9a8','center');
}
function renderVillage(){bg(['#0c1811','#1e3325','#344d39']);const v=normalizeVillage();if(v.tab==='train')renderVillageTrain();else renderVillageLife()}
const oldRender=render;
render=function(){if(game.mode==='village'){ctx.clearRect(0,0,W,H);renderVillage()}else oldRender()};

const oldRenderBattle=renderBattle;
renderBattle=function(){oldRenderBattle();if(game.stageId===2&&game.mode==='battle'){T('CH.2　三主角支援強化',270,94,9,'#fff4a9','center')}};

function vxy(e){const r=C.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
C.addEventListener('pointerdown',function(e){
  const p=vxy(e),v=normalizeVillage();
  if(game.mode==='map'&&p.x>=12&&p.x<=150&&p.y>=842&&p.y<=900){
    e.preventDefault();e.stopImmediatePropagation();
    if((save.unlockedStage||1)<2){say('完成 CH.1 後解鎖育成村');return}
    v.tab='life';game.mode='village';return;
  }
  if(game.mode==='village'){
    e.preventDefault();e.stopImmediatePropagation();
    if(v.tab==='life'){
      const acts=['wood','fruit','joy'];for(let i=0;i<3;i++){let y=410+i*58;if(p.x>=55&&p.x<=485&&p.y>=y&&p.y<=y+48){villageAction(acts[i]);return}}
      if(p.x>=55&&p.x<=485&&p.y>=654&&p.y<=708){nextVillageDay();return}
      if(p.x>=55&&p.x<=260&&p.y>=734&&p.y<=792){v.tab='train';store();return}
      if(p.x>=280&&p.x<=485&&p.y>=734&&p.y<=792){game.mode='map';return}
    }else{
      for(let i=0;i<3;i++){let y=92+i*122;if(p.x>=28&&p.x<=512&&p.y>=y&&p.y<=y+104){upgradePal(PAL_KEYS[i]);return}}
      const fs=['camp','orchard','cafe'];for(let i=0;i<3;i++){let y=495+i*83;if(p.x>=42&&p.x<=498&&p.y>=y&&p.y<=y+66){upgradeFac(fs[i]);return}}
      if(p.x>=70&&p.x<=260&&p.y>=775&&p.y<=833){v.tab='life';store();return}
      if(p.x>=280&&p.x<=470&&p.y>=775&&p.y<=833){game.mode='map';return}
    }
  }
},true);

window.MIMIWORA_VILLAGE={normalize:normalizeVillage,upgradePal,upgradeFac,action:villageAction,nextDay:nextVillageDay,get data(){return normalizeVillage()}};
})();
