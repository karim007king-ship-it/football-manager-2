// Football Manager 2 career data and simulation core
window.FM2 = (() => {
 const clubSeed = [
  ["الترجي الرياضي التونسي","الترجي",80,8000000,300000],
  ["النجم الرياضي الساحلي","النجم",75,5500000,220000],
  ["النادي الإفريقي","الإفريقي",72,4500000,200000],
  ["النادي الرياضي الصفاقسي","الصفاقسي",70,4000000,180000],
  ["الاتحاد الرياضي المنستيري","المنستيري",65,2500000,120000],
  ["النادي الرياضي البنزرتي","البنزرتي",62,2000000,100000],
  ["الملعب التونسي","الملعب",60,1800000,90000],
  ["مستقبل قابس","قابس",55,1200000,70000]
 ];
 const first=["محمد","أمين","يوسف","حمزة","أنس","معز","سيف","خالد","إلياس","مالك","زياد","كريم","آدم","مروان","رامي","فارس"];
 const last=["بن رمضان","الجزيري","العبيدي","الشعلالي","بالعيد","الطبوبي","الخنيسي","البجاوي","السالمي","القروي","الجبالي","التونسي"];
 const pos=["GK","DEF","DEF","DEF","DEF","MID","MID","MID","MID","FWD","FWD","GK","DEF","DEF","MID","MID","FWD","FWD"];
 const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a, pick=a=>a[rand(0,a.length-1)];
 const dateNow=()=>new Date().toISOString().slice(0,10);
 const addDays=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
 let state;
 function create(){
  if(window.FM2Database){
   const world=window.FM2Database.createWorld(dateNow());
   world.clubs.forEach(club=>{
    const team=world.players.filter(p=>p.clubId===club.id);
    team.forEach(p=>p.starter=false);
    const chosen=[team.find(p=>p.pos==="GK"),...team.filter(p=>p.pos==="DEF").slice(0,4),...team.filter(p=>p.pos==="MID").slice(0,4),...team.filter(p=>p.pos==="FWD").slice(0,2)].filter(Boolean);
    chosen.forEach(p=>p.starter=true);
   });
   return world;
  }
  const clubs=clubSeed.map((c,i)=>({id:i+1,name:c[0],short:c[1],rep:c[2],budget:c[3],wageBudget:c[4],capacity:[60000,25000,40000,25000,15000,18000,12000,10000][i],ticket:[20,15,15,12,10,10,8,8][i],tactic:"متوازن",formation:"4-4-2",familiarity:100,confidence:80,sponsor:"none",objective:c[2]>=75?"الفوز بالدوري":c[2]>=65?"المنافسة على المراكز الأولى":"البقاء في الدوري"}));
  const players=[];let id=1;
  clubs.forEach((club,i)=>{const range=[[72,85],[68,80],[65,78],[62,76],[58,72],[55,70],[52,68],[48,65]][i];for(let j=0;j<18;j++){const ovr=rand(range[0],range[1]),age=rand(18,34);players.push({id:id++,name:pick(first)+" "+pick(last),clubId:club.id,pos:pos[j],age,ovr,potential:Math.min(94,ovr+rand(0,12)),starter:j<11,injured:false,injuryDays:0,suspension:0,contract:rand(1,4),wage:ovr*120,value:ovr*ovr*180,morale:rand(60,85),form:rand(60,85),youth:age<20,focus:null,apps:0,goals:0,motm:0});}});
  return {version:2,career:false,clubId:1,clubs,players,date:dateNow(),season:new Date().getFullYear(),day:1,fixtures:[],history:[],finance:[],message:"اختر نادياً لبدء مسيرتك.",sacked:false};
 }
 function save(){localStorage.setItem("fm2-career-v2",JSON.stringify(state))}
 function replaceState(next){Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,next);}
 function startNewCareer(){
  save();
  const current=localStorage.getItem("fm2-career-v2");
  if(current)localStorage.setItem("fm2-career-v2-archive",current);
  replaceState(create());save();
  return {success:true};
 }
 function swapArchivedCareer(){
  save();
  const archived=localStorage.getItem("fm2-career-v2-archive");
  if(!archived)return {error:"لا توجد مسيرة محفوظة."};
  let next;try{next=JSON.parse(archived)}catch(e){return {error:"تعذر قراءة المسيرة المحفوظة."}}
  if(!next||next.version!==2||!Array.isArray(next.clubs)||!Array.isArray(next.players))return {error:"ملف المسيرة المحفوظة غير صالح."};
  const current=localStorage.getItem("fm2-career-v2");
  if(current)localStorage.setItem("fm2-career-v2-archive",current);
  replaceState(next);save();
  return {success:true};
 }
 function hasArchivedCareer(){return Boolean(localStorage.getItem("fm2-career-v2-archive"));}

 function load(){try{const x=JSON.parse(localStorage.getItem("fm2-career-v2"));if(x&&x.version===2){state=x;return}}catch(e){}state=create();save()}
 const club=id=>state.clubs.find(c=>c.id===id), me=()=>club(state.clubId), squad=id=>state.players.filter(p=>p.clubId===(id||state.clubId));
 const wages=id=>squad(id).reduce((n,p)=>n+p.wage,0);
 function transaction(id,amount,description){club(id).budget+=amount;if(id===state.clubId)state.finance.unshift({date:state.date,amount,description,balance:club(id).budget})}
 function playerPerformance(p){
  const a=p.attributes||{},keys=p.pos==="FWD"?["finishing","shotPower","pace","positioning","decisions"]:p.pos==="MID"?["passing","vision","firstTouch","teamwork","stamina"]:p.pos==="DEF"?["tackling","marking","positioning","strength","heading"]:["goalkeeping","positioning","decisions"];
  const values=keys.map(k=>Number(a[k])).filter(Number.isFinite),role=values.length?values.reduce((n,v)=>n+v,0)/values.length:Number(p.ovr)||50;
  return Number(p.ovr||50)*.55+role*.45;
 }
 function strength(id){const c=club(id),p=squad(id).filter(x=>x.starter&&!x.injured&&!x.suspension),avg=k=>{const a=p.filter(x=>x.pos===k);return a.length?a.reduce((n,x)=>n+playerPerformance(x)*x.morale/70*x.form/70,0)/a.length:52};let atk=(avg("FWD")+avg("MID"))/2,def=(avg("DEF")+avg("GK"))/2;if(c.tactic==="هجومي")atk+=3,def-=2;if(c.tactic==="دفاعي")atk-=2,def+=3;if(c.formation==="4-3-3")atk+=2;if(c.formation==="5-3-2")def+=3;const m=.8+c.familiarity/500;return {atk:atk*m,def:def*m}}
 const trainingMap={"تسديد":["finishing","shotPower"],"تمرير":["passing","vision","firstTouch"],"دفاع":["tackling","marking","positioning"],"سرعة":["pace","acceleration","agility"],"بدني":["stamina","strength","workRate"],"حراسة":["goalkeeping","positioning","decisions"]};
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function weeklyTraining(){
  state.players.filter(p=>p.focus&&p.clubId!==null&&p.clubId!==undefined).forEach(p=>{
   const owner=club(p.clubId),keys=trainingMap[p.focus];
   if(!owner||!keys||p.injured||owner.budget<800)return;
   owner.budget-=800;
   if(owner.id===state.clubId)state.finance.unshift({date:state.date,amount:-800,description:"تدريب "+p.name,balance:owner.budget});
   p.attributes||={};p.trainingProgress||={};p.development||={growthRate:2,professionalism:50};
   const growth=clamp(.075+(Number(p.development.growthRate)||0)*.009,.075,.15)*clamp(.8+(Number(p.development.professionalism)||50)/250,.8,1.2)*(1+Math.max(0,(Number(owner.trainingLevel)||1)-1)*.04);
   keys.forEach(key=>{const current=Number(p.attributes[key]);if(!Number.isFinite(current)||current>=95)return;p.trainingProgress[key]=(Number(p.trainingProgress[key])||0)+growth;if(p.trainingProgress[key]>=1){p.attributes[key]=Math.min(95,Math.round(current)+1);p.trainingProgress[key]-=1;}});
   p.developmentProgress=(Number(p.developmentProgress)||0)+growth;
   if(p.developmentProgress>=10&&p.ovr<p.potential){p.ovr=Math.min(p.potential,p.ovr+1);p.developmentProgress-=10;}
   p.fitness=clamp((Number.isFinite(Number(p.fitness))?Number(p.fitness):85)-2,0,100);p.fatigue=clamp((Number(p.fatigue)||0)+5,0,100);p.form=clamp((Number(p.form)||65)+1,30,100);
  });
 }
 function schedule(){
  const groups=state.divisions?.length?state.divisions.map(d=>({id:d.id,clubIds:d.clubIds.slice()})):[{id:1,clubIds:state.clubs.map(c=>c.id)}];
  state.fixtureSeq=Math.max(Number(state.fixtureSeq)||0,...state.fixtures.map(f=>Number(f.id)||0));
  const nextFixtureId=()=>++state.fixtureSeq;
  state.fixtures=[];
  groups.forEach(group=>{
   const teams=group.clubIds.slice(),rounds=[];
   for(let r=0;r<teams.length-1;r++){
    const matches=[];
    for(let j=0;j<teams.length/2;j++){const a=teams[j],b=teams[teams.length-1-j];matches.push(r%2?[b,a]:[a,b]);}
    rounds.push(matches);teams.splice(1,0,teams.pop());
   }
   rounds.concat(rounds.map(r=>r.map(x=>[x[1],x[0]]))).forEach((round,i)=>round.forEach(x=>state.fixtures.push({id:nextFixtureId(),date:addDays(state.date,i*3),home:x[0],away:x[1],competition:"الدوري",divisionId:group.id,round:"الجولة "+(i+1),status:"scheduled"})));
  });
  const firstDivision=groups.find(g=>g.id===1)||groups[0],ids=firstDivision.clubIds.slice().sort(()=>Math.random()-.5);
  for(let i=0;i<Math.min(4,Math.floor(ids.length/2));i++)state.fixtures.push({id:nextFixtureId(),date:addDays(state.date,45),home:ids[i*2],away:ids[i*2+1],competition:"الكأس",round:"ربع النهائي",status:"scheduled"});
  const top=state.clubs.slice().sort((a,b)=>b.rep-a.rep).slice(0,4).map(c=>c.id).sort(()=>Math.random()-.5);
  for(let i=0;i<2;i++)state.fixtures.push({id:nextFixtureId(),date:addDays(state.date,75),home:top[i*2],away:top[i*2+1],competition:"قارية",round:"نصف النهائي",status:"scheduled"});
 }
 function standings(){
  const rows=state.clubs.map(c=>({id:c.id,name:c.name,divisionId:c.divisionId||1,divisionName:c.divisionName||"الدوري",p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));
  state.fixtures.filter(f=>f.competition==="الدوري"&&f.status==="played").forEach(f=>[[f.home,f.hg,f.ag],[f.away,f.ag,f.hg]].forEach(([id,g,a])=>{const r=rows.find(x=>x.id===id);if(!r)return;r.p++;r.gf+=g;r.ga+=a;if(g>a)r.w++,r.pts+=3;else if(g===a)r.d++,r.pts++;else r.l++;}));
  return rows.map(r=>({...r,gd:r.gf-r.ga})).sort((a,b)=>a.divisionId-b.divisionId||b.pts-a.pts||b.gd-a.gd||b.gf-a.gf);
 }
 function poisson(mean){const limit=Math.exp(-Math.max(.05,mean));let k=0,p=1;do{k++;p*=Math.random()}while(p>limit);return k-1}
 function play(f){const h=club(f.home),a=club(f.away),x=strength(h.id),y=strength(a.id);let hg=poisson(1.5+(x.atk-y.def)/20),ag=poisson(1.1+(y.atk-x.def)/20);if(f.competition!=="الدوري"&&hg===ag){if(Math.random()<.5)hg++;else ag++}f.hg=hg;f.ag=ag;f.status="played";f.weather=pick(["صحو","مطر","حرارة"]);const suspendedBefore=new Set(state.players.filter(p=>(p.clubId===h.id||p.clubId===a.id)&&Number(p.suspension)>0).map(p=>p.id));transaction(h.id,(h.ticket||10)*rand(3000,Math.min(30000,h.capacity||30000)),"مداخيل مباراة");[[h.id,hg],[a.id,ag]].forEach(([id,n])=>{const team=squad(id),eligible=team.filter(p=>p.starter&&!p.injured&&!p.suspension);for(let i=0;i<n;i++){if(eligible.length)pick(eligible).goals++}team.filter(p=>p.starter&&!p.injured&&!p.suspension).forEach(p=>{p.apps++;p.form=Math.max(30,Math.min(100,p.form+rand(-3,4)));if(Math.random()<.012)p.injured=true,p.injuryDays=rand(3,24);if(Math.random()<.035)p.suspension=Math.max(1,Number(p.suspension)||0)})});suspendedBefore.forEach(pid=>{const p=state.players.find(x=>x.id===pid);if(p)p.suspension=Math.max(0,Number(p.suspension)-1)});if(f.competition==="الدوري"){if(hg>ag)transaction(h.id,180000,"منحة فوز");else if(hg===ag)transaction(h.id,90000,"منحة تعادل");if(ag>hg)transaction(a.id,180000,"منحة فوز خارج الأرض")}state.history.unshift({date:state.date,competition:f.competition,home:h.name,away:a.name,score:hg+" - "+ag,round:f.round});return f}
 function progress(comp,round,next){const matches=state.fixtures.filter(f=>f.competition===comp&&f.round===round);if(!matches.length||!matches.every(f=>f.status==="played")||state.fixtures.some(f=>f.competition===comp&&f.round===next))return;const winners=matches.map(f=>f.hg>f.ag?f.home:f.away);for(let i=0;i<winners.length;i+=2)state.fixtures.push({id:++state.fixtureSeq,date:addDays(state.date,14),home:winners[i],away:winners[i+1],competition:comp,round:next,status:"scheduled"})}
 function progressCompetitions(){progress("الكأس","ربع النهائي","نصف النهائي");progress("الكأس","نصف النهائي","النهائي");progress("قارية","نصف النهائي","النهائي")}
 function advance(days){if(state.sacked)return {error:"تمت إقالتك"};const played=[];for(let d=0;d<days;d++){state.clubs.forEach(c=>{const cost=wages(c.id)/7;c.budget-=cost;if(c.id===state.clubId)state.finance.unshift({date:state.date,amount:-cost,description:"رواتب اللاعبين",balance:c.budget});c.familiarity=Math.min(100,c.familiarity+1)});state.players.forEach(p=>{if(p.injured&&p.injuryDays>0&&!--p.injuryDays)p.injured=false;p.fitness=clamp((Number.isFinite(Number(p.fitness))?Number(p.fitness):85)+2,0,100);p.fatigue=clamp((Number(p.fatigue)||0)-1,0,100)});state.fixtures.filter(f=>f.status==="scheduled"&&f.date<=state.date).forEach(f=>played.push(play(f)));progressCompetitions();if(state.day%7===0)weeklyTraining();state.date=addDays(state.date,1);state.day++}const ownResults=played.filter(f=>f.home===state.clubId||f.away===state.clubId);if(ownResults.length){const change=ownResults.reduce((n,f)=>n+((f.home===state.clubId?f.hg>f.ag:f.ag>f.hg)?2:(f.home===state.clubId?f.hg<f.ag:f.ag<f.hg)?-3:0),0);me().confidence=Math.max(0,Math.min(100,me().confidence+change));}if(!me().confidence)state.sacked=true;state.message=played.length?"تمت محاكاة "+played.length+" مباراة.":"مرّت "+days+" أيام دون مباراة لفريقك.";save();return {played:played.length}}
 load();
 return {get state(){return state},club,me,squad,wages,transaction,strength,standings,schedule,advance,progressCompetitions,save,load,create,play,rand,pick,startNewCareer,swapArchivedCareer,hasArchivedCareer};
})();