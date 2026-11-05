// Versioned deterministic database for Football Manager 2.
window.FM2Database = (() => {
 const VERSION=1;
 const first=["محمد","أمين","يوسف","حمزة","أنس","معز","سيف","خالد","إلياس","مالك","زياد","كريم","آدم","مروان","رامي","فارس","بلال","أيوب","مهدي","نادر","وليد","طارق","ريان","بشير","هيثم","أسامة","حسام","جلال","عادل","منصف"];
 const last=["بن رمضان","الجزيري","العبيدي","الشعلالي","بالعيد","الطبوبي","الخنيسي","البجاوي","السالمي","القروي","الجبالي","التونسي","المساكني","الدريدي","الغربي","المنصوري","الحدادي","الحمامي","الوريمي","النفاتي","المرزوقي","العربي","بن يوسف","الطرابلسي","العايدي","بن عيسى","الزواوي","القاسمي","الخميري","الشريف"];
 const rows=[
 ["الترجي الرياضي التونسي","الترجي","EST","تونس",80,8000000,300000,60000,20,1],
 ["النجم الرياضي الساحلي","النجم","ESS","سوسة",75,5500000,220000,25000,15,1],
 ["النادي الإفريقي","الإفريقي","CA","تونس",72,4500000,200000,40000,15,1],
 ["النادي الرياضي الصفاقسي","الصفاقسي","CSS","صفاقس",70,4000000,180000,25000,12,1],
 ["الاتحاد الرياضي المنستيري","المنستيري","USM","المنستير",65,2500000,120000,15000,10,1],
 ["النادي الرياضي البنزرتي","البنزرتي","CAB","بنزرت",62,2000000,100000,18000,10,1],
 ["الملعب التونسي","الملعب","ST","باردو",60,1800000,90000,12000,8,1],
 ["مستقبل قابس","قابس","ASG","قابس",55,1200000,70000,10000,8,1],
 ["المستقبل الرياضي بالمرسى","المرسى","ASM","المرسى",58,1500000,80000,8000,8,1],
 ["الأولمبي الباجي","الأولمبي","OB","باجة",59,1600000,85000,10000,8,1],
 ["الاتحاد الرياضي ببن قردان","بن قردان","USBG","بن قردان",57,1450000,78000,10000,8,1],
 ["النجم الرياضي بالمتلوي","المتلوي","ESM","المتلوي",54,1100000,65000,8000,7,1],
 ["القوافل الرياضية بقفصة","قفصة","EGSG","قفصة",51,900000,55000,9000,7,2],
 ["الشبيبة الرياضية القيروانية","القيروان","JSK","القيروان",52,950000,58000,12000,7,2],
 ["الترجي الرياضي الجرجيسي","الجرجيسي","ESZ","جرجيس",50,850000,52000,8000,7,2],
 ["المستقبل الرياضي بسليمان","سليمان","ASS","سليمان",49,800000,50000,7000,7,2],
 ["الاتحاد الرياضي بتطاوين","تطاوين","UST","تطاوين",50,820000,51000,7000,7,2],
 ["النادي الرياضي بحمام الأنف","حمام الأنف","CSHL","حمام الأنف",48,750000,48000,8000,7,2],
 ["الأمل الرياضي بحمام سوسة","حمام سوسة","ESHS","حمام سوسة",47,700000,45000,7000,6,2],
 ["جندوبة الرياضية","جندوبة","JS","جندوبة",46,680000,43000,6000,6,2],
 ["الأولمبيك بسيدي بوزيد","سيدي بوزيد","OSB","سيدي بوزيد",45,650000,42000,7000,6,2],
 ["النادي الأولمبي للنقل","النقل","COT","تونس",44,620000,40000,6000,6,2],
 ["مكارم المهدية","المهدية","EMM","المهدية",43,600000,39000,6000,6,2],
 ["الأهلي الصفاقسي","الأهلي","AS","صفاقس",42,580000,37000,6000,6,2]
 ];
 const keys=["esperance","etoile","club-africain","sfaxien","monastir","bizertin","stade-tunisien","gabes","marsa","beja","ben-guerdane","metlaoui","gafsa","kairouan","zarzis","soliman","tataouine","hammam-lif","hammam-sousse","jendouba","sidi-bouzid","olympique-transport","makarem-mahdia","ahli-sfax"];
 const positions=["GK","CB","CB","CB","CB","LB","RB","LB","RB","DM","DM","CM","CM","CM","AM","AM","LW","LW","RW","RW","ST","ST","ST","GK"];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const rng=seed=>{let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}};
 const makePlayer=(id,club,index,free)=>{
  const r=rng(id*2654435761>>>0),pos=free?["GK","CB","LB","RB","DM","CM","AM","LW","RW","ST"][index%10]:positions[index];
  const age=free?17+Math.floor(r()*14):18+Math.floor(r()*17);
  const base=clamp(Math.round((club?club.rep:48+Math.floor(r()*19))+(r()-.5)*19+(age<21?-2:age>31?-4:0)),34,86);
  const attrs={};["pace","acceleration","stamina","strength","agility","finishing","shotPower","passing","vision","crossing","dribbling","firstTouch","tackling","marking","positioning","heading","goalkeeping","decisions","teamwork","workRate"].forEach(k=>{
   const bonus=k==="goalkeeping"?(pos==="GK"?18:-25):["finishing","shotPower"].includes(k)?(["ST","LW","RW","AM"].includes(pos)?5:-4):["tackling","marking","heading"].includes(k)?(["CB","LB","RB","DM"].includes(pos)?5:-3):0;
   attrs[k]=clamp(base+bonus+Math.floor(r()*27)-13,18,95);
  });
  const legacy=["CB","LB","RB"].includes(pos)?"DEF":["DM","CM","AM"].includes(pos)?"MID":["ST","LW","RW"].includes(pos)?"FWD":"GK";
  const name=first[(id-1)%first.length]+" "+last[Math.floor((id-1)/first.length)%last.length];
  const value=Math.round(base*base*(135+Math.floor(r()*71)));
  return {id,databaseId:"player.tun."+String(id).padStart(4,"0"),name,clubId:club?club.id:null,clubKey:club?club.key:null,pos:legacy,primaryPosition:pos,secondaryPositions:pos==="CM"?["DM","AM"]:pos==="ST"?["LW"]:[],preferredFoot:r()>.5?"right":"left",nationality:"تونس",age,heightCm:165+Math.floor(r()*34),ovr:base,overall:base,potential:clamp(base+Math.floor(r()*19)+(age<20?5:age>29?-5:0),base,96),attributes:attrs,starter:!free&&index<11,injured:false,injuryDays:0,suspension:0,contract:free?0:1+Math.floor(r()*4),wage:free?0:Math.round(base*(95+Math.floor(r()*51))),value,marketValue:value,morale:58+Math.floor(r()*29),form:58+Math.floor(r()*27),fitness:82+Math.floor(r()*19),youth:age<20,isYouth:age<20,isFreeAgent:free,focus:null,apps:0,goals:0,assists:0,motm:0,yellowCards:0,redCards:0,development:{growthRate:age<21?3+Math.floor(r()*6):age<25?1+Math.floor(r()*5):Math.floor(r()*3),professionalism:35+Math.floor(r()*56),consistency:35+Math.floor(r()*56),injuryProneness:5+Math.floor(r()*31)}};
 };
 function build(){
  const clubs=rows.map((r,i)=>({id:i+1,key:"club.tun."+keys[i],name:r[0],short:r[1],code:r[2],city:r[3],rep:r[4],budget:r[5],wageBudget:r[6],capacity:r[7],ticket:r[8],divisionId:r[9],divisionName:r[9]===1?"الرابطة الأولى":"الرابطة الثانية",tactic:"متوازن",formation:"4-4-2",familiarity:100,confidence:80,sponsor:"none",objective:r[9]===1?(r[4]>=70?"المنافسة على اللقب":"ضمان البقاء"):"الصعود إلى الرابطة الأولى",stadiumId:"stadium.tun."+String(i+1).padStart(2,"0"),trainingLevel:1,academyLevel:1,active:true}));
  const players=[];clubs.forEach(c=>{for(let i=0;i<24;i++)players.push(makePlayer(players.length+1,c,i,false));});
  const freeAgents=[];for(let i=0;i<120;i++)freeAgents.push(makePlayer(players.length+i+1,null,i,true));
  const divisions=[{id:1,key:"division.tun.1",name:"الرابطة التونسية الأولى",level:1,clubIds:clubs.filter(c=>c.divisionId===1).map(c=>c.id),promotionPlaces:0,relegationPlaces:2},{id:2,key:"division.tun.2",name:"الرابطة التونسية الثانية",level:2,clubIds:clubs.filter(c=>c.divisionId===2).map(c=>c.id),promotionPlaces:2,relegationPlaces:0}];
  const stadiums=clubs.map(c=>({id:c.stadiumId,name:"ملعب "+c.name,clubId:c.id,capacity:c.capacity,condition:70,facilities:{training:1,medical:1,academy:1}}));
  return {databaseVersion:VERSION,country:{code:"TUN",name:"تونس"},divisions,clubs,players,freeAgents,stadiums};
 }
 let cached;const get=()=>cached||(cached=build());
 function validate(db=get()){
  const errors=[],clubs=new Set(),players=new Set(),keysSeen=new Set();
  db.clubs.forEach(c=>{if(clubs.has(c.id))errors.push("duplicate club id "+c.id);clubs.add(c.id);if(keysSeen.has(c.key))errors.push("duplicate club key "+c.key);keysSeen.add(c.key);if(![1,2].includes(c.divisionId))errors.push("invalid division "+c.key);});
  [...db.players,...db.freeAgents].forEach(p=>{if(players.has(p.id))errors.push("duplicate player id "+p.id);players.add(p.id);if(Object.values(p.attributes).some(v=>!Number.isFinite(v)||v<1||v>100))errors.push("invalid attributes "+p.id);if(p.isFreeAgent!==(p.clubId===null))errors.push("free-agent mismatch "+p.id);if(p.clubId!==null&&!clubs.has(p.clubId))errors.push("unknown club "+p.id);});
  db.divisions.forEach(d=>d.clubIds.forEach(id=>{if(!clubs.has(id))errors.push("unknown division club "+id);}));
  return {valid:!errors.length,errors,clubCount:db.clubs.length,playerCount:db.players.length+db.freeAgents.length,freeAgentCount:db.freeAgents.length};
 }
 function createWorld(date){
  const db=get(),v=validate(db);if(!v.valid)throw Error("Invalid FM2 database: "+v.errors.join("; "));
  return {version:2,databaseVersion:VERSION,saveSchemaVersion:2,career:false,clubId:1,clubs:db.clubs.map(c=>({...c})),players:[...db.players,...db.freeAgents].map(p=>({...p,attributes:{...p.attributes},secondaryPositions:[...p.secondaryPositions],development:{...p.development}})),divisions:db.divisions.map(d=>({...d,clubIds:[...d.clubIds]})),stadiums:db.stadiums.map(s=>({...s,facilities:{...s.facilities}})),date,season:new Date(date+"T12:00:00").getFullYear(),day:1,fixtures:[],history:[],finance:[],message:"اختر نادياً لبدء مسيرتك.",sacked:false};
 }
 return {VERSION,get,validate,createWorld};
})();