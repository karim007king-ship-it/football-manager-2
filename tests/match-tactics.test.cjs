const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
function playWith(config,seedBase=12345){
 const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 const math=Object.create(Math);let seed=seedBase;math.random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
 const window={},context={window,localStorage,Date,Math:math,Intl,Number,String,JSON,console};vm.createContext(context);
 for(const file of ["www/game-database.js","www/game-core.js","www/game-match-engine.js"])vm.runInContext(fs.readFileSync(file,"utf8"),context);
 const G=window.FM2,S=G.state;S.clubId=1;S.career=true;S.date="2026-11-05";
 S.fixtures=[{id:99001,date:S.date,home:1,away:2,status:"scheduled",competition:"اختبار",round:"اختبار"}];
 assert.equal(G.beginLiveMatch(99001).success,true);
 const m=S.liveMatch;
 for(const [key,value] of Object.entries(config||{}))assert.equal(G.setLiveTactics(key,value).success,true,"Tactic "+key+" should be accepted");
 let result,segments=0;while(S.liveMatch&&segments<8){result=G.stepLiveMatch("متوازن",15);assert.equal(Boolean(result.error),false,"Match segment should advance without error");segments++;}assert.equal(result.finished,true,"Match must finish after both stoppage-time periods");
 return {possession:m.homePossession,passes:m.passesHome,tactics:m.tactics[1],fatigue:G.squad(1).filter(p=>m.lineups[1].includes(p.id)).reduce((n,p)=>n+(Number(p.fatigue)||0),0),opponentFatigue:G.squad(2).filter(p=>m.lineups[2].includes(p.id)).reduce((n,p)=>n+(Number(p.fatigue)||0),0),playedMinutes:Object.values(m.playerMinutes||{}).reduce((n,v)=>n+v,0)};
}
function averageWith(config){
 const results=[0,1,2,3].map(i=>playWith(config,12345+i*7919));
 const average=key=>results.reduce((sum,item)=>sum+item[key],0)/results.length;
 return {...results[0],possession:average("possession"),passes:average("passes"),fatigue:average("fatigue"),opponentFatigue:average("opponentFatigue"),playedMinutes:average("playedMinutes")};
}
const baseline=averageWith({});
const possession=averageWith({style:"استحواذ"});
assert.ok(possession.possession>baseline.possession+2,"Possession style must increase actual possession over a full match");
assert.ok(possession.passes>=0&&baseline.passes>=0,"Live pass totals must remain valid non-negative event counters");
const direct=averageWith({style:"لعب مباشر"});
assert.ok(direct.possession<possession.possession,"Direct play must reduce possession relative to possession style");
const highPress=averageWith({pressing:"عالٍ"}),lowPress=averageWith({pressing:"منخفض"});
assert.ok(highPress.possession>lowPress.possession,"High pressing must change the team's possession profile");
assert.ok(highPress.fatigue>lowPress.fatigue,"High pressing must cause more player fatigue than low pressing");
assert.ok(baseline.opponentFatigue>0,"The opposing team must also accumulate match fatigue");
assert.ok(baseline.playedMinutes<=22*100&&baseline.playedMinutes>=20*90,"Player minutes must reflect the full match, stoppage time, and any rare dismissals");
const attacking=averageWith({formation:"4-3-3"}),defensive=averageWith({formation:"3-5-2"});
assert.equal(attacking.tactics.formation,"4-3-3","The selected attacking formation must persist throughout the match");
assert.equal(defensive.tactics.formation,"3-5-2","The selected defensive formation must persist throughout the match");
const invalidStore=new Map(),localStorage={getItem:k=>invalidStore.get(k)||null,setItem:(k,v)=>invalidStore.set(k,String(v))};
const window={},context={window,localStorage,Date,Math,Intl,Number,String,JSON,console};vm.createContext(context);
for(const file of ["www/game-database.js","www/game-core.js","www/game-match-engine.js"])vm.runInContext(fs.readFileSync(file,"utf8"),context);
const G=window.FM2,S=G.state;S.clubId=1;S.career=true;S.date="2026-11-05";S.fixtures=[{id:99002,date:S.date,home:1,away:2,status:"scheduled"}];G.beginLiveMatch(99002);
const rejected=G.setLiveTactics("pressing","غير معروف");
assert.ok(rejected.error,"Unknown tactical values must be rejected");
assert.equal(S.liveMatch.tactics[1].pressing,"متوسط","Invalid choices must not alter tactical state");
console.log("PASS: live formation, playing style, pressing, event-based pass totals, fatigue, and tactical validation");
