const fs = require("node:fs");
const assert = require("node:assert/strict");

const ui = fs.readFileSync("www/game-experience-ui.js", "utf8");

assert.ok(ui.includes('btn("🏋️ التدريب","training")'), "Training shortcut should be present");
assert.ok(ui.includes('btn("🎙️ الصحافة","press")'), "Press shortcut should be present");
assert.ok(ui.includes('btn("🏟️ الجماهير","fans")'), "Fans shortcut should be present");
assert.ok(
  ui.includes('if(k==="training"||k==="press"||k==="fans"){page=k;render();return}'),
  "Training, press and fans shortcuts must route to their pages"
);

console.log("Experience UI navigation tests passed.");

assert.ok(ui.includes('"حراسة"'), "Goalkeepers should have a dedicated training focus");
assert.ok(ui.includes('p.trainingProgress'), "Training UI should expose the progression system");
assert.ok(ui.includes('إلغاء البرنامج'), "Training UI should allow removing an individual focus");

assert.ok(ui.includes("function startMatchClock()"), "Live match should have an automatic clock");
assert.ok(ui.includes("window.setInterval"), "The match clock should advance automatically");
assert.ok(ui.includes('btn(matchPlaying?"⏸ إيقاف مؤقت"'), "The match should expose pause and resume controls");
assert.ok(ui.includes('btn("2× سرعة مضاعفة"'), "The match should expose playback speed controls");
assert.ok(ui.includes('match-choice:'), "In-match actions should be queued for the next automatic minute");
assert.ok(ui.includes('match-plan:'), "Team mentality should be selectable during automatic play");
assert.ok(ui.includes('visibilitychange'), "The match clock should pause safely when the app is backgrounded");
assert.ok(!ui.includes('btn("تقدم دقيقة واحدة","step:متوازن:1"'), "The main match UI should not require pressing a button for every minute");
assert.ok(ui.includes("players.filter(p=>positionGroup(p)===pos)"), "The live lineup must group all natural position variants correctly");
assert.ok(ui.includes('x.id===p.ballCarrierId?" carrier":""'), "The live pitch must highlight the player carrying the ball");
