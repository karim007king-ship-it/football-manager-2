const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
const window={},context={window,localStorage,Date,Math,Intl,Number,String,JSON,console};vm.createContext(context);
for(const file of ["www/game-database.js","www/game-core.js","www/game-match-engine.js"])vm.runInContext(fs.readFileSync(file,"utf8"),context);
const G=window.FM2,S=G.state;S.clubId=1;S.career=true;S.date="2026-11-05";S.fixtures=[{id:88001,date:S.date,home:1,away:2,status:"scheduled",competition:"اختبار",round:"اختبار"}];
const group=p=>p.primaryPosition==="GK"?"GK":["CB","LB","RB"].includes(p.primaryPosition)?"DEF":["DM","CM","AM"].includes(p.primaryPosition)?"MID":["LW","RW","ST"].includes(p.primaryPosition)?"FWD":null;
const team=G.squad(1),starters=team.filter(p=>p.starter&&!p.injured&&!p.suspension),bench=team.filter(p=>!p.starter&&!p.injured&&!p.suspension);
assert.equal(starters.length,11,"Test requires a full starting eleven");
for(const g of ["GK","DEF","MID","FWD"])assert.ok(bench.some(p=>group(p)===g),"Bench must include a substitute for "+g);
assert.equal(G.beginLiveMatch(88001).success,true,"Match should begin");
const m=S.liveMatch;assert.equal(m.lineups[1].length,11,"Live lineup should contain eleven players");
const keeperOut=m.lineups[1].find(id=>group(team.find(p=>p.id===id))==="GK");
const wrong=bench.find(p=>group(p)!=="GK");
assert.ok(keeperOut&&wrong,"Test requires goalkeeper and outfield options");
const rejected=G.substituteLiveMatch(keeperOut,wrong.id);
assert.ok(rejected.error&&rejected.error.includes("مركز البديل غير مناسب"),"Goalkeeper must not be replaced by an outfield player");
assert.equal(m.substitutions[1],0,"Rejected position mismatch must not consume a substitution");
const plans=[["DEF",2],["MID",2],["FWD",1]];
for(const [g,count] of plans){
 const outs=starters.filter(p=>group(p)===g),ins=bench.filter(p=>group(p)===g);
 assert.ok(outs.length>=count&&ins.length>=count,"Need enough real "+g+" starters and substitutes");
 for(let n=0;n<count;n++){
  const outgoing=outs[n],incoming=ins[n];
  assert.ok(m.lineups[1].includes(outgoing.id),"Outgoing "+g+" player must be on the pitch");
  assert.ok(!m.lineups[1].includes(incoming.id),"Incoming "+g+" player must be on the bench");
  assert.equal(G.substituteLiveMatch(outgoing.id,incoming.id).success,true,"Position-compatible "+g+" substitution should succeed");
  assert.equal(outgoing.starter,false,"Outgoing player must leave the club starting XI");
  assert.equal(incoming.starter,true,"Incoming substitute must become a club starter");
  assert.equal(team.filter(p=>p.starter).length,11,"Club starting XI must remain at eleven");
 }
}
assert.equal(m.substitutions[1],5,"Five substitutions should be counted");
assert.equal(m.lineups[1].length,11,"Team must retain eleven players after five substitutions");
const sixthOut=m.lineups[1].find(id=>group(team.find(p=>p.id===id))!=="GK");
const sixth=G.substituteLiveMatch(sixthOut,bench.find(p=>!m.lineups[1].includes(p.id)).id);
assert.ok(sixth.error&&sixth.error.includes("الحد الأقصى"),"Sixth substitution must be rejected by the five-substitution limit");
assert.equal(team.filter(p=>p.starter).length,11,"Persistent starting XI must still contain eleven players");
assert.equal(m.substitutionLog.length,5,"Only five successful substitutions should be recorded");
console.log("PASS: balanced reserve positions, compatible substitutions, lineup persistence, and five-substitution limit");
