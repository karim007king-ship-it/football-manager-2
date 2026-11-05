const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
function boot(entries={}){
 const store=new Map(Object.entries(entries));
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
 const window={},context={window,localStorage,Date,Math,Intl,Number,String,JSON,console};
 vm.createContext(context);
 for(const file of ["www/game-database.js","www/game-core.js"])vm.runInContext(fs.readFileSync(file,"utf8"),context);
 return {G:window.FM2,store};
}
const clean=boot(),good=JSON.stringify(clean.G.state);
const corrupted="{not valid save";
const restored=boot({"fm2-career-v2":corrupted,"fm2-career-v2-backup":good});
assert.equal(restored.G.state.date,clean.G.state.date,"valid backup must be restored");
assert.equal(restored.store.get("fm2-career-v2"),good,"restored backup must become the active save");
assert.equal(restored.store.get("fm2-career-v2-recovery"),corrupted,"corrupted original must be preserved separately");
assert.equal(restored.G.saveRecoveryStatus,"","successful backup recovery must unblock saving");
const protectedSave=boot({"fm2-career-v2":corrupted});
assert.ok(protectedSave.G.saveRecoveryStatus,"missing valid backup must expose a recovery warning");
assert.equal(protectedSave.G.save(),false,"automatic saves must be blocked while the primary save is untrusted");
assert.equal(protectedSave.store.get("fm2-career-v2"),corrupted,"blocked save must never overwrite the original data");
const started=protectedSave.G.startNewCareer();
assert.equal(started.success,true,"explicit new-career action should permit a fresh save");
assert.equal(protectedSave.store.get("fm2-career-v2-recovery"),corrupted,"explicit reset must retain the old raw save");
assert.equal(JSON.parse(protectedSave.store.get("fm2-career-v2")).version,2,"new save must be valid");
const edited=boot({"fm2-career-v2":good});
edited.G.state.message="تغيير اختباري";
assert.equal(edited.G.save(),true);
assert.equal(edited.store.get("fm2-career-v2-backup"),good,"the previous valid save must be backed up before replacement");
console.log("PASS: backup rotation, corrupted-save preservation, safe recovery, and explicit reset");
