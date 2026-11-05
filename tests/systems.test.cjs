const fs=require("fs");
const vm=require("vm");
const store=new Map();
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
const window={};
const context={window,localStorage,Date,Math,Intl,Number,String,JSON,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync("www/game-core.js","utf8"),context);
const G=window.FM2,S=G.state;
S.career=true;S.clubId=1;G.schedule();
const originalDate=S.date;
const originalBudget=G.me().budget;
vm.runInContext(fs.readFileSync("www/game-systems.js","utf8"),context);
if(!Array.isArray(S.inbox)||S.inbox.length!==1)throw Error("Inbox migration/initialization failed");
const welcomeCount=S.inbox.length;
vm.runInContext(fs.readFileSync("www/game-systems.js","utf8"),context);
if(S.inbox.length!==welcomeCount)throw Error("Duplicate welcome notification");
G.advance(1);
if(!S.matchReports.length)throw Error("Match report was not generated");
if(!S.inbox.some(x=>x.type==="match"))throw Error("Match notification missing");
const press=S.inbox.find(x=>x.type==="media");
if(!press)throw Error("Press event missing");
const confidence=G.me().confidence;
G.respondToMail(press.id,"positive");
if(G.me().confidence<confidence)throw Error("Press response did not apply effects");
const player=G.squad()[0];
const renew=G.renewContract(player.id,3,player.wage);
if(!renew.success||player.contract!==3)throw Error("Contract renewal failed");
const seller=G.squad().find(x=>x.id!==player.id);
const offer={id:999,type:"offer",playerId:seller.id,amount:1000,resolved:false};
S.inbox.unshift(offer);
G.respondToMail(999,"accept");
if(seller.clubId!==null||!S.transferHistory.length)throw Error("Transfer acceptance/history failed");
// Normalize both test teams to an eligible XI: one goalkeeper and ten outfielders.
// This also handles random injuries produced by the earlier simulated day.
function prepareTestLineup(clubId){
  const eligible=G.squad(clubId).filter(p=>!p.injured&&!p.suspension);
  const keeper=eligible.find(p=>p.pos==="GK");
  const outfield=eligible.filter(p=>p.pos!=="GK").slice(0,10);
  if(!keeper||outfield.length!==10)throw Error("Unable to prepare an eligible test lineup for club "+clubId);
  const selected=new Set([keeper.id,...outfield.map(p=>p.id)]);
  G.squad(clubId).forEach(p=>p.starter=selected.has(p.id));
}
// Interactive match engine: pause on match day, play six explicit 15-minute segments, and verify report persistence.
vm.runInContext(fs.readFileSync("www/game-match-engine.js","utf8"),context);
G.schedule();
const nextMatch=S.fixtures.filter(f=>f.status==="scheduled"&&(f.home===S.clubId||f.away===S.clubId)).sort((a,b)=>a.date.localeCompare(b.date))[0];
if(!nextMatch)throw Error("No upcoming fixture found for the test club");
prepareTestLineup(nextMatch.home);
prepareTestLineup(nextMatch.away);
S.date=nextMatch.date;
const paused=G.advance(1);
if(!paused.paused||!S.liveMatch)throw Error("Match day did not pause for interactive play");
for(const choice of ["هجومي","متوازن","ضغط عالٍ","متوازن","دفاعي","متوازن"]){
  const step=G.stepLiveMatch(choice,15);
  if(step.error)throw Error("Interactive match step failed: "+step.error);
}
if(S.liveMatch||nextMatch.status!=="played")throw Error("Interactive match did not finish");
if(!S.matchReports.some(r=>r.fixtureId===nextMatch.id))throw Error("Interactive match report missing");
const oldYear=Number(S.date.slice(0,4));
S.date=oldYear+"-12-31";
S.fixtures=[{id:++S.fixtureSeq,date:S.date,home:1,away:2,hg:0,ag:0,status:"played",competition:"الدوري",round:"الجولة الأخيرة"}];
const expiring=G.squad().find(x=>x.id===player.id);
expiring.contract=2;
G.advance(2);
if(!S.seasonHistory.length||S.season!==oldYear+1)throw Error("Season rollover/archive failed");
if(expiring.contract!==1)throw Error("Contract year decrement failed");
if(!store.has("fm2-career-v2"))throw Error("Save was not persisted");
console.log("PASS: legacy save migration, inbox, match report, press response, contract renewal, transfer acceptance/history, season rollover and save persistence");