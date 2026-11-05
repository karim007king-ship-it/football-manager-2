const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
const window={},context={window,localStorage,Date,Math,Intl,Number,String,JSON,console};vm.createContext(context);
for(const file of ["www/game-database.js","www/game-core.js"])vm.runInContext(fs.readFileSync(file,"utf8"),context);
const G=window.FM2,S=G.state;S.date="2026-11-05";S.season=2026;G.schedule();
const league=S.fixtures.filter(f=>f.competition==="الدوري");
assert.equal(league.length,264,"two 12-team divisions must have 132 matches each");
const divisions=[...new Set(league.map(f=>f.divisionId))];
assert.equal(divisions.length,2);
for(const divisionId of divisions){
 const rows=league.filter(f=>f.divisionId===divisionId);
 const rounds=[...new Set(rows.map(f=>f.round))];
 assert.equal(rounds.length,22,"each division must have 22 rounds");
 for(const round of rounds){
  const matches=rows.filter(f=>f.round===round);
  assert.equal(matches.length,6,"a 12-team round must contain six matches");
  const participants=matches.flatMap(f=>[f.home,f.away]);
  assert.equal(new Set(participants).size,12,"each club must play once per round");
 }
 const counts=new Map();
 rows.forEach(f=>[f.home,f.away].forEach(id=>counts.set(id,(counts.get(id)||0)+1)));
 assert.ok([...counts.values()].every(n=>n===22),"every club must play 22 league fixtures");
 const dates=rounds.map(r=>rows.find(f=>f.round===r).date);
 const offsets=dates.map(d=>Date.parse(d+"T12:00:00Z"));
 for(let i=1;i<offsets.length;i++)assert.equal(offsets[i]-offsets[i-1],7*86400000,"league rounds must be spaced one week apart");
}
const lastLeague=league.reduce((latest,f)=>f.date>latest?f.date:latest,"");
const cup=S.fixtures.filter(f=>f.competition==="الكأس");
const continental=S.fixtures.filter(f=>f.competition==="قارية");
assert.ok(cup.length>0,"cup quarter-finals must be generated");
const cupDate=cup[0].date,continentalDate=continental[0].date;
const add=(d,n)=>{const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
assert.equal(cupDate,add(lastLeague,7),"cup quarter-finals must start after the league schedule");
assert.equal(continentalDate,add(lastLeague,42),"continental semi-finals must be placed after domestic cup rounds");
const perClubDate=new Set();
for(const f of S.fixtures){for(const id of [f.home,f.away]){const key=id+"|"+f.date;assert.ok(!perClubDate.has(key),"a club must not have two scheduled matches on the same day: "+key);perClubDate.add(key)}}
assert.equal(new Set(S.fixtures.map(f=>f.id)).size,S.fixtures.length,"fixture IDs must be unique");
console.log("PASS: full double round-robin, weekly spacing, and non-overlapping cup/continental dates");
