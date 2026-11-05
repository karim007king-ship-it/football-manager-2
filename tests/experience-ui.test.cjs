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
