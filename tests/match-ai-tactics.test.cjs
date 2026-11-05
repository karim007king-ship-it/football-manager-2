const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
function setup(){
 const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 const math=Object.create(Math);math.random=()=>0.5;
 const window={},context={window,localStorage,Date,Math:math,Intl,Number,String,JSON,console};vm.createContext(context);
 for(const file of ["www/game-database.js","www/game-core.js","www/game-match-engine.js"])vm.runInContext(fs.readFileSync(file,"utf8"),context);
 const G=window.FM2,S=G.state;S.clubId=1;S.career=true;S.date="2026-11-05";
 S.fixtures=[{id:99101,date:S.date,home:1,away:2,status:"scheduled",competition:"اختبار",round:"اختبار"}];
 assert.equal(G.beginLiveMatch(99101).success,true);
 return {G,S,m:S.liveMatch,opponentId:2};
}
{
 const {G,S,m,opponentId}=setup();
 assert.equal(m.tactics[opponentId].style,"متوازن","AI should start balanced");
 assert.equal(G.setLiveTactics("style","استحواذ").success,true);
 G.stepLiveMatch("متوازن",15);G.stepLiveMatch("متوازن",15);G.stepLiveMatch("متوازن",15);
 assert.equal(m.minute,45);
 assert.equal(m.tactics[opponentId].style,"مرتدات","AI should counter user's possession style");
 assert.ok(m.events.some(e=>e.text.includes("المدرب المنافس يغيّر خطته")),"AI adjustment should be reported in match events");
}
{
 const {G,S,m,opponentId}=setup();
 G.stepLiveMatch("متوازن",15);G.stepLiveMatch("متوازن",15);
 m.homeGoals=1;m.awayGoals=0;
 G.stepLiveMatch("متوازن",15);
 assert.equal(m.tactics[opponentId].style,"لعب مباشر","AI should become more attacking when trailing");
 assert.equal(m.tactics[opponentId].pressing,"عالٍ");
 assert.equal(m.tactics[opponentId].formation,"4-3-3");
}
{
 const {G,S,m,opponentId}=setup();
 G.stepLiveMatch("متوازن",15);G.stepLiveMatch("متوازن",15);
 m.homeGoals=0;m.awayGoals=1;
 G.stepLiveMatch("متوازن",15);G.stepLiveMatch("متوازن",15);
 m.minute=60;
 G.stepLiveMatch("متوازن",15);
 assert.equal(m.tactics[opponentId].style,"مرتدات","AI should protect a lead with counter-attacking play");
 assert.equal(m.tactics[opponentId].pressing,"منخفض");
 assert.equal(m.tactics[opponentId].defensiveLine,"متأخرة");
}
console.log("PASS: opponent AI adapts to possession, scoreline, and match phase");
