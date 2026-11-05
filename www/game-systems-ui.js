// Additional management screens for Football Manager 2
(() => {
 const G=window.FM2,S=G.state,$=s=>document.querySelector(s);
 if(!G)return;
 const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const num=n=>new Intl.NumberFormat("ar-TN").format(Math.round(n||0));
 let active="inbox", selectedReport=null;
 const box=h=>'<div class="card fm2-extra-card">'+h+'</div>';
 const section=(t,h)=>'<section class="section"><h2>'+t+'</h2>'+h+'</section>';
 const btn=(label,act,cls="secondary")=>'<button class="'+cls+'" data-sys-act="'+act+'">'+label+'</button>';
 function inbox(){
  const rows=S.inbox||[];
  return section("📨 البريد والإشعارات",box('<div class="fm2-meta">رسائل غير مقروءة: '+rows.filter(x=>!x.read).length+' · السمعة الإعلامية: '+(S.mediaReputation??50)+'/100</div>')+
   (rows.length?rows.map(m=>'<article class="fm2-mail '+(!m.read?'unread':'')+'"><div class="fm2-mail-head"><b>'+esc(m.title)+'</b><small>'+esc(m.date)+' · '+esc(m.type)+'</small></div><p>'+esc(m.body)+'</p><div class="fm2-actions">'+(m.choices&&!m.resolved?m.choices.map(c=>btn(c.label,'respond:'+m.id+':'+c.effect,"tiny")).join(""):m.resolved?'<small>تمت معالجة الرسالة</small>':'')+btn(m.read?"مقروءة":"تحديد كمقروءة","read:"+m.id,"tiny")+'</div></article>').join(""):'<p>لا توجد رسائل حالياً. تقدّم في المسيرة لتصل الأخبار والعروض.</p>'));
 }
 function reports(){
  const list=S.matchReports||[];
  const chosen=list.find(x=>x.fixtureId===selectedReport)||list[0];
  let detail=chosen?'<div class="fm2-score"><small>'+esc(chosen.competition)+' · '+esc(chosen.date)+'</small><h3>'+esc(G.club(chosen.home).name)+'</h3><strong>'+chosen.homeGoals+' - '+chosen.awayGoals+'</strong><h3>'+esc(G.club(chosen.away).name)+'</h3></div>'+
   '<div class="fm2-stat-grid">'+[['التسديدات',chosen.homeShots,chosen.awayShots],['على المرمى',chosen.homeOnTarget,chosen.awayOnTarget],['الاستحواذ',chosen.possessionHome+"%",chosen.possessionAway+"%"],['الركنيات',chosen.cornersHome,chosen.cornersAway],['التمريرات',chosen.passesHome,chosen.passesAway]].map(x=>'<div class="fm2-stat-row"><b>'+x[1]+'</b><span>'+x[0]+'</span><b>'+x[2]+'</b></div>').join("")+'</div>'
   :'<p>لا توجد تقارير بعد. ستظهر التقارير بعد لعب المباريات.</p>';
  return section("📊 تقارير المباريات",box((list.length?'<div class="fm2-report-list">'+list.slice(0,12).map(r=>btn(esc(G.club(r.home).short)+' '+r.homeGoals+' - '+r.awayGoals+' '+esc(G.club(r.away).short)+' · '+r.date,'report:'+r.fixtureId,"tiny")).join("")+'</div>':'')+detail));
 }
 function management(){
  const players=G.squad().slice().sort((a,b)=>a.contract-b.contract);
  return section("📝 العقود",box(players.map(p=>'<div class="fm2-contract"><div><b>'+esc(p.name)+'</b><small>'+p.ovr+' تقييم · '+num(p.wage)+' د.ت أسبوعياً</small><small class="'+(p.contract<=1?'negative':'')+'">متبقي '+p.contract+' سنة</small></div>'+btn("تجديد العقد","renew:"+p.id,"tiny")+'</div>').join("")||"لا يوجد لاعبون."))+
   section("🔁 سجل الانتقالات",box((S.transferHistory||[]).slice(0,30).map(x=>'<div class="fm2-contract"><div><b>'+esc(x.player)+'</b><small>'+esc(x.from)+' ← '+esc(x.to)+'</small><small>'+esc(x.date)+' · '+esc(x.type)+'</small></div><b>'+num(x.fee)+' د.ت</b></div>').join("")||"لم تسجل انتقالات إضافية بعد."));
 }
 function seasons(){
  return section("🏅 التاريخ الرياضي",box((S.seasonHistory||[]).map(x=>'<div class="fm2-season"><h3>موسم '+x.season+'</h3><p>بطل الدوري: <b>'+esc(x.champion)+'</b></p><small>عدد النتائج المسجلة: '+(x.results||[]).length+'</small><div class="fm2-table">'+(x.standings||[]).map((r,i)=>'<div><span>'+(i+1)+'. '+esc(r.name)+'</span><b>'+r.pts+' نقطة</b></div>').join("")+'</div></div>').join("")||'<p>لم ينتهِ أي موسم بعد. سيظهر ترتيب كل موسم هنا بعد نهايته.</p>'));
 }
 function render(){
  const views={inbox,reports,management,seasons};
  $("#app").innerHTML='<div class="fm2-extra-head"><span>مركز الإدارة المتقدم</span><span>⚽ FM2</span></div>'+views[active]();
  document.querySelectorAll("[data-sys-tab]").forEach(x=>x.classList.toggle("active",x.dataset.sysTab===active));
 }
 function action(a){
  const [k,id,val]=a.split(":");
  if(k==="read"){G.markMailRead(+id);render();return}
  if(k==="respond"){const r=G.respondToMail(+id,val);if(r.error)alert(r.error);render();return}
  if(k==="report"){selectedReport=+id;active="reports";render();return}
  if(k==="renew"){
   const p=S.players.find(x=>x.id===+id);if(!p)return;
   const years=Number(prompt("مدة العقد الجديدة بالسنوات (1 إلى 5)",3));
   if(!Number.isInteger(years)||years<1||years>5)return;
   const wage=Number(prompt("الأجر الأسبوعي الجديد بالدينار التونسي",Math.round(p.wage*1.1)));
   if(!Number.isFinite(wage)||wage<0)return;
   const r=G.renewContract(p.id,years,wage);if(r.error)alert(r.error);else alert("تم تجديد العقد.");render();
  }
 }
 let pendingTransfer=null;
 document.addEventListener("click",e=>{
  const x=e.target.closest("[data-act]");
  if(!x)return;
  const [kind,id]=x.dataset.act.split(":");
  if(kind==="sell"||kind==="offer"){
   const p=S.players.find(z=>z.id===Number(id));
   if(p)pendingTransfer={kind,id:p.id,name:p.name,oldClub:p.clubId,value:p.value};
  }
 },true);
 document.addEventListener("click",e=>{
  if(pendingTransfer){
   const p=S.players.find(z=>z.id===pendingTransfer.id);
   if(p&&p.clubId!==pendingTransfer.oldClub){
    const buying=pendingTransfer.kind==="offer";
    S.transferHistory.unshift({date:S.date,player:pendingTransfer.name,
     from:buying?G.club(pendingTransfer.oldClub)?.name||"نادٍ آخر":G.me().name,
     to:buying?G.me().name:"نادٍ آخر",fee:buying?Math.round(pendingTransfer.value*1.2):Math.round(pendingTransfer.value*.85),
     type:buying?"شراء":"بيع"});
    G.save();
   }
   pendingTransfer=null;
  }
  const t=e.target.closest("[data-sys-tab]");if(t){active=t.dataset.sysTab;render();return}
  const a=e.target.closest("[data-sys-act]");if(a)action(a.dataset.sysAct);
 });
 const nav=document.querySelector("nav");
 [["inbox","📨 الرسائل"],["reports","📊 التقارير"],["management","📝 العقود"],["seasons","🏅 التاريخ"]].forEach(([id,label])=>{
  const b=document.createElement("button");b.dataset.sysTab=id;b.textContent=label;nav.appendChild(b);
 });
 const style=document.createElement("style");style.textContent=`
 .fm2-extra-head{display:flex;justify-content:space-between;color:var(--gold);font-weight:900;padding:8px 2px}
 .fm2-extra-card{padding:13px}.fm2-meta{color:var(--muted);font-size:12px;margin-bottom:8px}
 .fm2-mail{padding:13px 0;border-bottom:1px solid #294153}.fm2-mail.unread{border-right:3px solid var(--gold);padding-right:10px}
 .fm2-mail-head,.fm2-contract{display:flex;justify-content:space-between;align-items:center;gap:10px}.fm2-mail-head small,.fm2-contract small{display:block;color:var(--muted);font-size:11px}
 .fm2-mail p{font-size:13px;line-height:1.8}.fm2-actions{display:flex;gap:6px;flex-wrap:wrap}
 .fm2-score{text-align:center;padding:12px}.fm2-score h3{font-size:14px}.fm2-score strong{display:block;color:var(--gold);font-size:36px}
 .fm2-stat-grid{margin-top:10px}.fm2-stat-row{display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;padding:10px;border-bottom:1px solid #294153}.fm2-stat-row span{color:var(--muted);font-size:12px}
 .fm2-report-list{display:flex;gap:6px;overflow:auto;padding-bottom:12px}.fm2-report-list button{white-space:nowrap}
 .fm2-contract{padding:11px 0;border-bottom:1px solid #294153}.fm2-season{padding:12px 0;border-bottom:1px solid #294153}.fm2-table>div{display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid #294153;font-size:12px}
 nav{overflow-x:auto;justify-content:flex-start;gap:3px}nav button{min-width:max-content}
 `;document.head.appendChild(style);
})();