/* ---------- zombies ---------- */
const zdef={
 walker:{hp:36,spd:22,atk:10,xp:7,col:"#788d62"},
 runner:{hp:27,spd:40,atk:8,xp:7,col:"#8c9d67"},
 tank:{hp:92,spd:13,atk:18,xp:15,col:"#667457"},
 spitter:{hp:46,spd:19,atk:13,xp:10,col:"#7c8760"},
 king:{hp:620,spd:8,atk:30,xp:90,col:"#56614b"}
};
function spawnZombie(type){
 let d=zdef[type],x=rnd(100,860);
 zombies.push({type,x,y:565,hp:d.hp*difficulty,max:d.hp*difficulty,spd:d.spd*(.92+rnd(0,.2)),atk:d.atk,xp:d.xp,hit:0,stun:0,slow:0,cd:0,anim:rnd(0,10)});
}
function drawZombie(z){
 const s=z.type==="king"?1.45:z.type==="tank"?1.15:1;
 const hit=z.hit>0, x=z.x,y=z.y;
 ctx.save();ctx.translate(x,y);
 if(z.type==="runner")ctx.rotate(Math.sin(z.anim*7)*.04);
 R(-12*s,-45*s,24*s,26*s,hit?"#fff":zdef[z.type].col);
 R(-9*s,-38*s,6*s,6*s,"#d6e1b1");R(3*s,-38*s,6*s,6*s,"#d6e1b1");
 R(-6*s,-36*s,2*s,2*s,"#a82a33");R(5*s,-36*s,2*s,2*s,"#a82a33");
 if(z.type==="king"){R(-15*s,-55*s,30*s,8*s,"#463a28");R(-10*s,-63*s,6*s,9*s,"#d4aa3e");R(3*s,-63*s,6*s,9*s,"#d4aa3e")}
 R(-10*s,-19*s,20*s,26*s,z.type==="tank"?"#3f4b43":"#4c594c");
 if(z.type==="tank"){R(-15*s,-17*s,30*s,7*s,"#6e766b");R(-14*s,-10*s,5*s,18*s,"#5f685d");R(9*s,-10*s,5*s,18*s,"#5f685d")}
 else{R(-15*s,-14*s,5*s,19*s,"#6d7f5b");R(10*s,-14*s,5*s,19*s,"#6d7f5b")}
 R(-8*s,7*s,6*s,14*s,"#343e39");R(2*s,7*s,6*s,14*s,"#343e39");
 ctx.restore();
 bar(z.x-22*s,z.y-72*s,44*s,5,z.hp,z.max,z.type==="king"?"#e1586f":"#d26d72");
}
function updateSpawns(dt){
 spawnT-=dt;
 if(spawnT<=0&&!bossSpawned){
   let t=stageT;
   let type="walker";
   if(t>35&&Math.random()<.30)type="runner";
   if(t>75&&Math.random()<.28)type="tank";
   if(t>110&&Math.random()<.22)type="spitter";
   spawnZombie(type);
   let base=Math.max(.28,1.25-stageT/170);
   spawnT=base*rnd(.7,1.25);
 }
 if(stageT>155&&!bossSpawned){
   bossSpawned=true;spawnZombie("king");sfx("boss");
   for(let i=0;i<10;i++)spawnZombie(i%3===0?"tank":"walker");
 }
}
function nearestInRange(h){
 let best=null,dy=1e9;
 for(const z of zombies){
   let d=z.y-h.y;
   if(z.hp>0 && d>=-20 && d<dy && d<=h.range && Math.abs(z.x-h.x)<175){best=z;dy=d}
 }
 return best;
}
function damageZ(z,d,c="#fff",source=null){
 if(z.hp<=0)return;
 z.hp-=d;z.hit=.08;flo(z.x,z.y-75,"-"+Math.round(d),c);teamGauge=Math.min(teamMax,teamGauge+d*.08);
 if(z.hp<=0){
   kills++;fx.push({kind:"death",x:z.x,y:z.y-30,t:.35});sfx("kill");
   if(source)gainXP(source,z.xp);
 }
}
function gainXP(h,amt){
 if(h.level>=5)return;
 h.xp+=amt;
 while(h.level<5&&h.xp>=h.nextXp){
   h.xp-=h.nextXp;h.level++;h.nextXp=Math.round(h.nextXp*1.45+8);
   levelQueue.push(h.type);h.anim="celebrate";h.animT=1.2;sfx("level");
 }
}
function fireHero(h,z){
 h.anim="attack";h.animT=.27;sfx(h.type);
 if(h.type==="mimi"){
   shots.push({kind:"star",x:h.x,y:h.y+18,target:z,spd:390,dmg:h.atk,source:h});
 }else if(h.type==="goban"){
   fx.push({kind:"shock",x:h.x,y:h.y+55,t:.26,r:h.shock});
   let radius=70+h.shock;
   for(const q of zombies){
     if(q.hp>0&&Math.hypot(q.x-h.x,q.y-(h.y+120))<radius+80){
       damageZ(q,h.atk*(q===z?1:.55),"#ffd875",h);
       if(Math.random()<h.stun)q.stun=Math.max(q.stun,.8);
     }
   }
 }else if(h.type==="nomo"){
   fx.push({kind:"tongue",x:h.x,y:h.y+15,ex:z.x,ey:z.y-25,t:.18});
   let targets=zombies.filter(q=>q.hp>0&&Math.abs(q.x-z.x)<45&&q.y>=z.y-25).sort((a,b)=>a.y-b.y).slice(0,1+h.pierce);
   for(const q of targets){damageZ(q,h.atk,"#b8ee83",h);q.slow=Math.max(q.slow,h.slow)}
 }else{
   let crit=Math.random()<h.crit,dmg=h.atk*(crit?2:1);
   damageZ(z,dmg,crit?"#fff29d":"#e7e7ff",h);fx.push({kind:"slash",x:z.x,y:z.y-35,t:.16});
   if(Math.random()<h.clone){damageZ(z,h.atk*.7,"#c5c8ff",h);flo(z.x,z.y-90,"殘影","#cbd2ff")}
 }
}
function chooseSkill(i){
 if(!levelHero)return;
 const u=skillCards[i];if(!u)return;
 u.apply(levelHero);levelHero.picked.push(u.id);
 say(levelHero.name+" Lv."+levelHero.level+"："+u.name,1.6);
 levelHero=null;skillCards=[];
 if(levelQueue.length){openNextLevel()}else state="play";
}
function openNextLevel(){
 let k=levelQueue.shift(),h=heroes[k];if(!h)return;
 levelHero=h;skillCards=upgrades[k];state="upgrade";
}
function ultimate(){
 if(teamGauge<teamMax||state!=="play")return;
 teamGauge=0;sfx("ultimate");fx.push({kind:"ultimate",t:1.2});
 for(const z of zombies)damageZ(z,z.type==="king"?85:58,"#c6f4ff",null);
}
function updateGame(dt){
 stageT+=dt;flashT=Math.max(0,flashT-dt);updateSpawns(dt);
 for(const h of Object.values(heroes)){
   h.cd-=dt;h.hit=Math.max(0,h.hit-dt);h.animT-=dt;if(h.animT<=0)h.anim="idle";
   let z=nearestInRange(h);
   if(z&&h.cd<=0){fireHero(h,z);h.cd=h.rate}
 }
 for(const s of shots){
   if(!s.target||s.target.hp<=0){s.dead=true;continue}
   let dx=s.target.x-s.x,dy=(s.target.y-40)-s.y,d=Math.hypot(dx,dy);
   if(d<14){
     damageZ(s.target,s.dmg,"#b8efff",s.source);
     if(s.source.splash>0)for(const q of zombies)if(q!==s.target&&Math.hypot(q.x-s.target.x,q.y-s.target.y)<s.source.splash+18)damageZ(q,s.dmg*.45,"#9edcff",s.source);
     fx.push({kind:"spark",x:s.target.x,y:s.target.y-40,t:.22});s.dead=true;
   }else{s.x+=dx/d*s.spd*dt;s.y+=dy/d*s.spd*dt}
 }
 shots=shots.filter(s=>!s.dead);
 for(const z of zombies){
   z.anim+=dt;z.hit=Math.max(0,z.hit-dt);z.stun=Math.max(0,z.stun-dt);z.cd-=dt;
   if(z.hp<=0||z.stun>0)continue;
   if(z.y<=178){
     if(z.cd<=0){
       let guard=heroes.goban.guard;
       let dmg=z.atk*(1-guard);
       gateHP-=dmg;flo(z.x,155,"-"+Math.round(dmg),"#ffb6bf");z.cd=1.0;sfx("gate");
     }
   }else{
     let slowFactor=1-clamp(z.slow,0,.65);
     z.y-=z.spd*slowFactor*dt;
   }
 }
 zombies=zombies.filter(z=>z.hp>0);
 fx.forEach(e=>e.t-=dt);fx=fx.filter(e=>e.t>0);
 floaters.forEach(f=>{f.t-=dt;f.y-=28*dt});floaters=floaters.filter(f=>f.t>0);
 if(levelQueue.length&&state==="play")openNextLevel();
 if(gateHP<=0){gateHP=0;state="lose"}
 if(bossSpawned&&!zombies.some(z=>z.type==="king")&&!bossKilled){bossKilled=true;state="win";Object.values(heroes).forEach(h=>{h.anim="celebrate";h.animT=999})}
}