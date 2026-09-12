"use strict";
const C=document.getElementById("c"),ctx=C.getContext("2d");
ctx.imageSmoothingEnabled=false;
const W=960,H=540,CW=45,CH=90;
const IMG={}, SRC=window.MIMIWORA_SPRITES;
for(const [k,s] of Object.entries(SRC)){const im=new Image();im.src=s;IMG[k]=im}

const heroesOrder=["mimi","goban","nomo","kuro"];
const heroX={mimi:165,goban:375,nomo:585,kuro:795};
const heroBase={
 mimi:{name:"MIMI",role:"星術師",hp:115,atk:20,rate:1.00,range:440,proj:360,color:"#9edcff",desc:"星錨魔法"},
 goban:{name:"GOBAN",role:"守城拳士",hp:180,atk:30,rate:1.28,range:220,proj:0,color:"#ffd664",desc:"重拳震波"},
 nomo:{name:"NOMO",role:"魔舌紳士",hp:135,atk:24,rate:1.05,range:340,proj:0,color:"#a7e67e",desc:"伸縮魔舌"},
 kuro:{name:"KURO",role:"影刃貓",hp:105,atk:18,rate:.54,range:250,proj:0,color:"#d9d9ef",desc:"月牙影斬"}
};

const upgrades={
 mimi:[
  {id:"power",name:"星錨增幅",icon:"✦",desc:"傷害 +35%",apply:h=>h.atk*=1.35},
  {id:"rapid",name:"流星連發",icon:"↯",desc:"攻速 +24%",apply:h=>h.rate*=.76},
  {id:"nova",name:"星爆擴散",icon:"◎",desc:"攻擊爆炸範圍 +26",apply:h=>h.splash+=26}
 ],
 goban:[
  {id:"power",name:"鋼拳增幅",icon:"✊",desc:"傷害 +42%",apply:h=>h.atk*=1.42},
  {id:"stun",name:"震地衝擊",icon:"✹",desc:"25% 機率暈眩",apply:h=>h.stun+=.25},
  {id:"guard",name:"鐵壁反擊",icon:"◆",desc:"城門受傷 -8% 並強化震波",apply:h=>{h.guard+=.08;h.shock+=22}}
 ],
 nomo:[
  {id:"range",name:"魔舌延伸",icon:"➜",desc:"射程 +25%・傷害 +10%",apply:h=>{h.range*=1.25;h.atk*=1.10}},
  {id:"pierce",name:"穿刺舌擊",icon:"⇢",desc:"額外穿透 +1 個目標",apply:h=>h.pierce++},
  {id:"toxin",name:"麻痺唾液",icon:"☣",desc:"命中後減速 20%",apply:h=>h.slow+=.20}
 ],
 kuro:[
  {id:"speed",name:"疾風影刃",icon:"≋",desc:"攻速 +25%",apply:h=>h.rate*=.75},
  {id:"crit",name:"月影暴擊",icon:"✧",desc:"暴擊率 +18%",apply:h=>h.crit+=.18},
  {id:"clone",name:"殘影追斬",icon:"♟",desc:"20% 機率追加斬擊",apply:h=>h.clone+=.20}
 ]
};

let heroes={};
function freshHeroes(){
  heroes={};
  for(const k of heroesOrder){
    let b=heroBase[k];
    heroes[k]={type:k,name:b.name,role:b.role,x:heroX[k],y:132,
      hp:b.hp,maxHp:b.hp,atk:b.atk,rate:b.rate,range:b.range,proj:b.proj,
      level:1,xp:0,nextXp:28,cd:0,anim:"idle",animT:0,hit:0,
      splash:k==="mimi"?14:0,stun:0,guard:0,shock:0,pierce:0,slow:0,crit:.06,clone:0,
      picked:[]};
  }
}
freshHeroes();

let state="intro",introT=0,startedIntro=false,introReady=false;
let zombies=[],shots=[],fx=[],floaters=[],spawnT=0,stageT=0;
let gateHP=320,gateMax=320,kills=0,bossSpawned=false,bossKilled=false;
let levelQueue=[],levelHero=null,skillCards=[];
let teamGauge=0,teamMax=100,wave=1,difficulty=1;
let muted=false;
const keys={};

let AC=null, master=null, musicTimer=null, musicStep=0;
function audioInit(){
 if(AC)return;
 AC=new (window.AudioContext||window.webkitAudioContext)();
 master=AC.createGain();master.gain.value=.18;master.connect(AC.destination);
 startMusic();
}
function tone(freq,d=.08,type="square",vol=.12,when=0){
 if(!AC||muted)return;
 const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+when;
 o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 o.connect(g);g.connect(master);o.start(t);o.stop(t+d);
}
function noise(d=.08,vol=.08){
 if(!AC||muted)return;
 const n=AC.createBuffer(1,AC.sampleRate*d,AC.sampleRate),data=n.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const s=AC.createBufferSource(),g=AC.createGain();s.buffer=n;g.gain.value=vol;s.connect(g);g.connect(master);s.start();g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);
}
function sfx(name){
 if(name==="mimi"){tone(740,.06,"triangle",.13);tone(990,.09,"sine",.08,.04)}
 if(name==="goban"){tone(105,.08,"square",.18);noise(.05,.06)}
 if(name==="nomo"){tone(210,.07,"square",.12);tone(155,.07,"square",.08,.06)}
 if(name==="kuro"){noise(.035,.07);tone(480,.045,"sawtooth",.08)}
 if(name==="hit"){tone(125,.035,"square",.06)}
 if(name==="kill"){tone(420,.045,"square",.06);tone(630,.06,"triangle",.05,.035)}
 if(name==="level"){tone(523,.09,"square",.1);tone(659,.09,"square",.1,.09);tone(784,.14,"square",.1,.18)}
 if(name==="boss"){tone(82,.35,"sawtooth",.12);tone(73,.35,"sawtooth",.1,.15)}
 if(name==="ultimate"){[523,659,784,1046].forEach((f,i)=>tone(f,.24,"triangle",.12,i*.08))}
 if(name==="gate"){tone(70,.14,"sawtooth",.15);noise(.12,.08)}
}
function startMusic(){
 if(!AC||musicTimer)return;
 const bass=[110,110,123.47,110,146.83,138.59,123.47,98];
 const lead=[440,0,523.25,493.88,440,392,440,0,587.33,523.25,493.88,440,392,369.99,392,0];
 musicTimer=setInterval(()=>{
   if(muted||state==="intro"&&!startedIntro)return;
   const b=bass[Math.floor(musicStep/2)%bass.length],l=lead[musicStep%lead.length];
   tone(b,.18,"square",.032);
   if(l)tone(l,.12,"triangle",.028,.02);
   if(musicStep%4===0)noise(.025,.018);
   musicStep++;
 },220);
}
function R(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function T(s,x,y,z=16,c="#fff",align="left"){ctx.fillStyle=c;ctx.font=z+"px monospace";ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign="left"}
function P(x,y,w,h,title=""){R(x,y,w,h,"#07101deb");R(x+4,y+4,w-8,h-8,"#172943ee");ctx.strokeStyle="#dfd19a";ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,w-4,h-4);if(title)T(title,x+12,y+19,12,"#f2dfa0")}
function bar(x,y,w,h,v,max,c){R(x,y,w,h,"#151922");R(x+2,y+2,Math.max(0,(w-4)*v/max),h-4,c)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rnd(a,b){return a+Math.random()*(b-a)}
function flo(x,y,s,c="#fff"){floaters.push({x,y,s,c,t:.75})}
function drawSprite(k,tier,frame,x,base,scale=2.01,alpha=1){
 const im=IMG[k];if(!im||!im.complete)return;
 ctx.save();ctx.globalAlpha=alpha;
 let dw=CW*scale,dh=CH*scale;
 ctx.drawImage(im,frame*CW,tier*CH,CW,CH,x-dw/2,base-dh,dw,dh);
 ctx.restore();
}
function heroFrame(h){
 if(h.anim==="hurt")return 6;
 if(h.anim==="celebrate")return 7;
 if(h.anim==="attack")return Math.floor(performance.now()/90)%2?4:5;
 return Math.floor(performance.now()/850)%8===0?1:0;
}
function heroTier(h){return h.level>=5?2:h.level>=3?1:0}
function startIntro(){
 if(startedIntro)return;
 audioInit();startedIntro=true;introT=0;
 tone(220,.25,"triangle",.07);
}
function updateIntro(dt){
 if(!startedIntro)return;
 introT+=dt;
 if(introT>1.0&&introT-dt<=1.0)sfx("mimi");
 if(introT>2.2&&introT-dt<=2.2)sfx("goban");
 if(introT>3.4&&introT-dt<=3.4)sfx("nomo");
 if(introT>4.6&&introT-dt<=4.6)sfx("kuro");
 if(introT>6.0&&introT-dt<=6.0){noise(.35,.09);tone(82,.4,"sawtooth",.09)}
 if(introT>=7.1)introReady=true;
}
function introZombie(x,y,s=1,flip=false){
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 R(-11*s,-34*s,22*s,23*s,"#7b8f62");R(-8*s,-29*s,5*s,5*s,"#d9e6b6");R(3*s,-29*s,5*s,5*s,"#d9e6b6");
 R(-6*s,-27*s,2*s,2*s,"#8d2430");R(5*s,-27*s,2*s,2*s,"#8d2430");R(-8*s,-11*s,16*s,21*s,"#48584b");
 R(-13*s,-7*s,5*s,18*s,"#71855d");R(8*s,-7*s,5*s,18*s,"#71855d");R(-7*s,10*s,5*s,12*s,"#34413c");R(2*s,10*s,5*s,12*s,"#34413c");
 ctx.restore();
}
function renderIntro(){
 let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#080c16");g.addColorStop(1,"#28303b");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 for(let i=0;i<50;i++)R((i*173)%W,(i*91)%300,2,2,i%5?"#8796ab":"#b6d7e8");
 T("MIMIWORA",480,64,43,"#eee0ac","center");T("屍 喪 攻 城",480,100,24,"#a7dfff","center");
 if(!startedIntro){
   P(250,200,460,118);T("第一關：屍喪攻城",480,238,22,"#ffe88a","center");T("點一下畫面／按 Space 播放開場動畫",480,276,14,"#fff","center");return;
 }
 const show=(start,dur)=>clamp((introT-start)/dur,0,1);
 if(introT>=.4){let a=show(.4,.7),x=190,y=210-(1-a)*150;drawSprite("mimi",0,5,x,y+130,2.21);if(introT<2){ctx.strokeStyle="#9fe6ff";for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(x-30+i*14,y-75);ctx.lineTo(x-30+i*14,y-25);ctx.stroke()}}}
 if(introT>=1.6){let a=show(1.6,.55),x=380,y=210-(1-a)*120;drawSprite("goban",0,a<.8?3:4,x,y+130,2.21);if(a>.8){ctx.strokeStyle="#ffd766";ctx.beginPath();ctx.arc(x,330,45*(a-.8)*5,0,Math.PI);ctx.stroke()}}
 if(introT>=2.8){let a=show(2.8,.7),x=575,y=210;drawSprite("nomo",0,a<.6?3:5,x,y+130,2.21);if(a>.45&&a<.9){ctx.strokeStyle="#e54d58";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x+10,y+35);ctx.lineTo(x+110,y-25);ctx.stroke()}}
 if(introT>=4.0){let a=show(4,.6),x=790-(1-a)*170,y=210;ctx.globalAlpha=.25;for(let i=1;i<=3;i++)drawSprite("kuro",0,3,x-i*35,y+130,2.21,.20);ctx.globalAlpha=1;drawSprite("kuro",0,a<.7?3:5,x,y+130,2.21)}
 if(introT>=5.5){
   let a=show(5.5,.9);
   for(let i=0;i<18;i++){
     let ang=(i/18)*Math.PI*1.25-.15,rad=290-(a*80);
     let x=480+Math.cos(ang)*rad, y=365+Math.sin(ang)*95;
     introZombie(x,y,.85,i%2===0);
   }
   T("……屍群正在包圍夢城。",480,405,16,"#ffbbc3","center");
 }
 if(introReady){
   R(0,450,W,90,"rgba(0,0,0,.55)");T("PRESS ENTER",480,489,25,"#ffe88a","center");T("守住城門，利用喪屍掉落的經驗值強化四位主角。",480,518,13,"#fff","center");
 }
}