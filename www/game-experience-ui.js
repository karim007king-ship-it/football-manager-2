// Visual dashboard and interactive match centre for Football Manager 2
(() => {
 const G=window.FM2;if(!G||G.experienceUiLoaded)return;const S=G.state,$=s=>document.querySelector(s);
 let page=S.liveMatch?"match":"home",selectedSubOut=null,matchTimer=null,matchPlaying=false,matchSpeed=1200,matchPlan="متوازن",pendingMatchAction=null,autoResumeAfterVisibility=false;
 const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const num=n=>new Intl.NumberFormat("ar-TN").format(Math.round(n||0));
 const card=h=>'<div class="ex-card">'+h+'</div>';
 const section=(t,h)=>'<section class="ex-section"><h2>'+t+'</h2>'+h+'</section>';
 const btn=(t,a,c="")=>'<button class="ex-btn '+c+'" data-ex-act="'+a+'">'+t+'</button>';
 const pct=n=>Math.max(0,Math.min(100,Number(n)||0));
 const matchStat=(m,teamId,key)=>Object.values(m.playerStats||{}).reduce((sum,st)=>sum+(S.players.find(p=>p.id===st.playerId)?.clubId===teamId?(Number(st[key])||0):0),0);
 function stopMatchClock(){if(matchTimer!==null){window.clearInterval(matchTimer);matchTimer=null;}matchPlaying=false;}
 function matchFinalMinute(m){return 90+(Number(m?.stoppage?.second)||0);}
 function matchFirstEnd(m){return 45+(Number(m?.stoppage?.first)||0);}
 function minuteLabel(m){const n=Number(m?.minute)||0;if(n>45&&n<=matchFirstEnd(m))return "45+"+(n-45)+"′";if(n>90&&n<=matchFinalMinute(m))return "90+"+(n-90)+"′";return n+"′";}
 function startMatchClock(){
  if(!S.liveMatch||S.liveMatch.status!=="live"||S.liveMatch.minute>=matchFinalMinute(S.liveMatch)||matchTimer!==null||document.hidden)return;
  matchPlaying=true;
  matchTimer=window.setInterval(()=>{
   const live=S.liveMatch;
   if(!live||live.status!=="live"||page!=="match"||document.hidden){stopMatchClock();render();return;}
   const choice=pendingMatchAction||matchPlan;pendingMatchAction=null;
   const result=G.stepLiveMatch(choice,1);
   if(result.error){stopMatchClock();render();return;}
   if(result.finished||result.halfTime)stopMatchClock();
   render();
   if(result.finished)setTimeout(()=>alert("انتهت المباراة. النتيجة: "+result.match.homeGoals+" - "+result.match.awayGoals),30);
  },matchSpeed);
 }
 function setMatchSpeed(speed){matchSpeed=speed;if(matchPlaying){stopMatchClock();startMatchClock();}render();}
 const fixture=()=>S.fixtures.filter(f=>f.status==="scheduled"&&(f.home===S.clubId||f.away===S.clubId)).sort((a,b)=>a.date.localeCompare(b.date))[0];
 const bar=(label,value,color="gold")=>'<div class="ex-meter-label"><span>'+label+'</span><b>'+value+'%</b></div><div class="ex-meter"><i class="'+color+'" style="width:'+pct(value)+'%"></i></div>';
 function home(){
  const c=G.me(),f=fixture(),table=G.standings(),division=table.filter(x=>x.divisionId===(c.divisionId||1)),rank=division.findIndex(x=>x.id===S.clubId)+1,points=table.find(x=>x.id===S.clubId)?.pts||0;
  const next=f?'<div class="ex-fixture"><div class="ex-fixture-top"><span>'+esc(f.competition)+' · '+esc(f.round)+'</span><b>'+esc(f.date)+'</b></div><div class="ex-versus"><div><span class="ex-crest">⚽</span><b>'+esc(G.club(f.home).short)+'</b></div><strong>VS</strong><div><span class="ex-crest">⚽</span><b>'+esc(G.club(f.away).short)+'</b></div></div><div class="ex-fixture-bottom">'+(f.date<=S.date?btn("افتح مركز المباراة","open-match","gold"):('<span>تبقى '+Math.max(0,Math.round((new Date(f.date)-new Date(S.date))/86400000))+' أيام</span>'))+'</div></div>':'<p>لا توجد مباراة مجدولة.</p>';
  return '<div class="ex-hero"><div class="ex-hero-shade"></div><div class="ex-hero-content"><span class="ex-kicker">FOOTBALL MANAGER 2 · CAREER MODE</span><h1>'+esc(c.name)+'</h1><p>إدارة النادي تبدأ من هنا</p><div class="ex-hero-chips"><span>الموسم '+S.season+'</span><span>'+esc(S.date)+'</span><span>'+esc(c.divisionName||"الدوري")+" · المركز "+rank+"/"+division.length+'</span></div></div></div>'+
   '<div class="ex-kpis"><div><small>الميزانية</small><b>'+num(c.budget)+'</b><small>دينار تونسي</small></div><div><small>قوة الفريق</small><b>'+G.strength(c.id).atk.toFixed(0)+'</b><small>تقييم هجومي</small></div><div><small>النقاط</small><b>'+points+'</b><small>في الدوري</small></div></div>'+
   section("المباراة القادمة",card(next))+
   section("مؤشرات النادي",card(bar("ثقة مجلس الإدارة",c.confidence)+bar("انسجام الفريق",c.familiarity,"green")+bar("السمعة الإعلامية",S.mediaReputation??50)))+
   section("مركز الإدارة",'<div class="ex-shortcuts">'+btn("👥 الفريق","base:team")+btn("🎯 التكتيكات","tactics")+btn("🏋️ التدريب","training")+btn("🎙️ الصحافة","press")+btn("🏟️ الجماهير","fans")+btn("📨 الرسائل","base:inbox")+'</div>')+
   section("تقدم في المسيرة",card('<div class="ex-time-actions">'+btn("يوم واحد","advance:1")+btn("أسبوع","advance:7")+btn("حتى المباراة القادمة","advance:30","gold")+'</div><p class="ex-muted">'+esc(S.message||"اختر قرارك التالي لإدارة النادي.")+'</p>'))+
   section("إدارة المسيرة",card(btn("بدء مسيرة جديدة بقاعدة البيانات الموسعة","new-career","gold")+(G.hasArchivedCareer()?btn("تبديل إلى المسيرة المحفوظة","swap-career"):"")));
 }
 function setup(){
  return section("اختر النادي لبدء مسيرتك",'<div class="ex-clubs">'+S.clubs.map(c=>'<button class="ex-club" data-ex-act="club:'+c.id+'"><span>⚽</span><b>'+esc(c.name)+'</b><small>'+esc(c.divisionName||"الدوري")+' · السمعة '+c.rep+' · '+num(c.budget)+' د.ت</small><small>'+esc(c.objective)+'</small></button>').join("")+'</div>')+(G.hasArchivedCareer()?section("مسيرة محفوظة",card(btn("العودة إلى المسيرة السابقة","swap-career"))):"");
 }
 function team(){
  const starters=G.squad().filter(p=>p.starter).sort((a,b)=>["GK","DEF","MID","FWD"].indexOf(a.pos)-["GK","DEF","MID","FWD"].indexOf(b.pos));
  const roster=G.squad().slice().sort((a,b)=>b.ovr-a.ovr);
  return section("التشكيلة الأساسية",card('<div class="ex-pitch">'+starters.map(p=>'<div><b>'+esc(p.name.split(" ")[0])+'</b><small>'+p.ovr+' · '+p.pos+'</small></div>').join("")+'</div><p class="ex-muted">اللاعبون الأساسيون: '+starters.length+'/11</p>'))+
   section("قائمة اللاعبين",card(roster.map(p=>'<div class="ex-player"><div><b>'+esc(p.name)+'</b><small>'+({GK:"حارس",DEF:"دفاع",MID:"وسط",FWD:"هجوم"}[p.pos])+' · '+p.age+' سنة · تقييم '+p.ovr+' / '+p.potential+'</small><small>'+(p.injured?"مصاب "+(p.injuryDays||0)+" يوم":p.suspension?"موقوف":"العقد "+p.contract+" سنة")+' · الفورمة '+(p.form||65)+'</small></div><div class="ex-training-actions">'+btn(p.starter?"إخراج من التشكيلة":"إشراك","starter:"+p.id,"mini")+btn("تجديد العقد","renew:"+p.id,"mini")+'</div></div>').join("")));
 }
 function positionGroup(p){const pos=p&&(p.primaryPosition||p.pos);if(pos==="GK")return "GK";if(["CB","LB","RB","DEF"].includes(pos))return "DEF";if(["DM","CM","AM","MID"].includes(pos))return "MID";if(["LW","RW","ST","FWD"].includes(pos))return "FWD";return null;}
 function positionLabel(p){return ({GK:"حارس",DEF:"دفاع",MID:"وسط",FWD:"هجوم"}[positionGroup(p)]||"غير محدد");}
 function match(){
  let m=S.liveMatch;
  if(!m){const f=fixture();return section("مركز المباراة",card(f?'<div class="ex-fixture"><small>'+esc(f.competition)+' · '+esc(f.round)+' · '+esc(f.date)+'</small><div class="ex-versus"><b>'+esc(G.club(f.home).short)+'</b><strong>VS</strong><b>'+esc(G.club(f.away).short)+'</b></div><p>'+(f.date<=S.date?"موعد المباراة حان. ابدأ التحضير.":"المباراة لم يحن موعدها بعد.")+'</p>'+btn("تهيئة المباراة","begin-match","gold")+'</div>':'لا توجد مباراة قادمة.'));}
  const h=G.club(m.home),a=G.club(m.away),userHome=m.home===S.clubId;
  const liveTactics=(m.tactics&&m.tactics[S.clubId])||{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
  const tacticalGroup=(label,key,options)=>'<div class="ex-tactic-group"><b>'+label+'</b><div class="ex-shortcuts">'+options.map(v=>btn(v,"live-tactic:"+key+":"+v,liveTactics[key]===v?"gold":"")).join("")+'</div></div>';
  return '<div class="ex-match-banner"><span>LIVE MATCH CENTRE</span><b>'+minuteLabel(m)+'</b></div>'+
   '<div class="ex-scoreboard"><small>'+esc(S.fixtures.find(f=>f.id===m.fixtureId)?.competition||"مباراة")+'</small><div class="ex-score-teams"><div><span>🛡️</span><b>'+esc(h.short)+'</b></div><strong>'+m.homeGoals+' : '+m.awayGoals+'</strong><div><span>🛡️</span><b>'+esc(a.short)+'</b></div></div><div class="ex-progress"><i style="width:'+Math.min(100,m.minute/matchFinalMinute(m)*100)+'%"></i></div><small>'+m.minute+' من '+matchFinalMinute(m)+' دقيقة محتسبة</small></div>'+
   section("ملعب المباراة المباشر",card((()=>{
      const p=m.pitch||{ballX:50,ballY:50,possession:m.home,phase:"وسط الملعب",homePlayers:[],awayPlayers:[]};
      const pitchPlayers=[...(p.homePlayers||[]).map(x=>({...x,side:"home"})),...(p.awayPlayers||[]).map(x=>({...x,side:"away"}))];
      const dots=pitchPlayers.map(x=>'<span class="ex-pitch-player '+x.side+(x.id===p.ballCarrierId?" carrier":"")+'" style="left:'+pct(x.x)+'%;top:'+pct(x.y)+'%" title="'+esc(x.name)+'">'+(x.side==="home"?"●":"◆")+'</span>').join("");
      const carrier=pitchPlayers.find(x=>x.id===p.ballCarrierId);
      const ball='<span class="ex-match-ball" style="left:'+pct(carrier?carrier.x:p.ballX)+'%;top:'+pct(carrier?carrier.y:p.ballY)+'%">⚽</span>';
      return '<div class="ex-live-pitch"><div class="ex-pitch-half"></div><div class="ex-pitch-circle"></div><div class="ex-pitch-box left"></div><div class="ex-pitch-box right"></div>'+dots+ball+'</div><div class="ex-pitch-legend"><span>● '+esc(h.short)+'</span><span>◆ '+esc(a.short)+'</span></div><p class="ex-muted">الكرة لدى: <b>'+esc(G.club(p.possession)?.short||"—")+'</b> · '+esc(p.phase||"وسط الملعب")+'</p>';
    })()))+
   section("قراراتك داخل الملعب",card((()=>{
      const p=m.pitch||{},hasBall=p.possession===S.clubId,attacking=hasBall&&(userHome?Number(p.ballX)>=68:Number(p.ballX)<=32),defending=!hasBall&&(userHome?Number(p.ballX)<=32:Number(p.ballX)>=68);
      if(attacking)return '<p class="ex-muted">فريقك في الثلث الهجومي. اختر الإجراء القادم؛ سيُنفّذ مع الدقيقة التالية تلقائياً.</p><div class="ex-shortcuts">'+btn("⚽ تسديد","match-choice:تسديد",pendingMatchAction==="تسديد"?"gold":"")+btn("تمريرة بينية","match-choice:تمريرة بينية",pendingMatchAction==="تمريرة بينية"?"gold":"")+btn("مراوغة","match-choice:مراوغة",pendingMatchAction==="مراوغة"?"gold":"")+btn("عرضية","match-choice:عرضية",pendingMatchAction==="عرضية"?"gold":"")+'</div>';
      if(defending)return '<p class="ex-muted">المنافس يهاجم. اختر طريقة التعامل مع حامل الكرة.</p><div class="ex-shortcuts">'+btn("ضغط على حامل الكرة","match-choice:ضغط على حامل الكرة",pendingMatchAction==="ضغط على حامل الكرة"?"gold":"")+btn("تراجع دفاعي","match-choice:تراجع دفاعي",pendingMatchAction==="تراجع دفاعي"?"gold":"")+btn("محاولة افتكاك الكرة","match-choice:افتكاك الكرة",pendingMatchAction==="افتكاك الكرة"?"gold":"")+'</div>';
      return '<p class="ex-muted">اللعب في وسط الملعب. اختر عقلية فريقك؛ وسيستمر الوقت تلقائياً.</p><div class="ex-shortcuts">'+btn("هجومي","match-plan:هجومي",matchPlan==="هجومي"?"gold":"")+btn("متوازن","match-plan:متوازن",matchPlan==="متوازن"?"gold":"")+btn("دفاعي","match-plan:دفاعي",matchPlan==="دفاعي"?"gold":"")+btn("ضغط عالٍ","match-plan:ضغط عالٍ",matchPlan==="ضغط عالٍ"?"gold":"")+'</div>';
    })()))+
   section("عقلية الفريق",card('<p class="ex-muted">يمكنك تغيير أسلوب الفريق في أي لحظة أثناء اللعب، ويستمر الاختيار حتى تغييره مجدداً.</p><div class="ex-shortcuts">'+btn("هجومي","match-plan:هجومي",matchPlan==="هجومي"?"gold":"")+btn("متوازن","match-plan:متوازن",matchPlan==="متوازن"?"gold":"")+btn("دفاعي","match-plan:دفاعي",matchPlan==="دفاعي"?"gold":"")+btn("ضغط عالٍ","match-plan:ضغط عالٍ",matchPlan==="ضغط عالٍ"?"gold":"")+'</div>'))+
   section("التشكيلة الحالية",card((()=>{
      const ids=(m.lineups&&m.lineups[S.clubId])||[],team=G.squad(S.clubId),players=ids.map(id=>team.find(p=>p.id===id)).filter(Boolean),groups=[["حارس","GK"],["الدفاع","DEF"],["الوسط","MID"],["الهجوم","FWD"]];
      return '<p class="ex-muted">اللاعبون الموجودون حالياً على أرض الملعب: '+players.length+'/11</p><div class="ex-live-lineup">'+groups.map(([label,pos])=>{const list=players.filter(p=>positionGroup(p)===pos);return list.length?'<div class="ex-live-lineup-row"><b>'+label+'</b><div>'+list.map(p=>'<span>'+esc(p.name)+'</span>').join("")+'</div></div>':""}).join("")+'</div>';
    })()))+
   section("إيقاع المباراة",card('<p class="ex-muted">الوقت يتقدم تلقائياً دقيقة بدقيقة، مع تعليق أحداث اللعب. '+(matchPlaying?"المباراة جارية الآن.":"المباراة متوقفة مؤقتاً.")+'</p><div class="ex-shortcuts">'+btn(matchPlaying?"⏸ إيقاف مؤقت":(m.minute===matchFirstEnd(m)?"▶ استئناف الشوط الثاني":"▶ استئناف اللعب"),"match-toggle","gold")+btn("1× سرعة عادية","match-speed:1200",matchSpeed===1200?"gold":"")+btn("2× سرعة مضاعفة","match-speed:600",matchSpeed===600?"gold":"")+btn("4× سرعة سريعة","match-speed:300",matchSpeed===300?"gold":"")+'</div><p class="ex-muted">كل دقيقة في المباراة تستغرق '+(matchSpeed/1000).toFixed(1)+' ثانية في السرعة المختارة. تتوقف المباراة عند نهاية الشوط الأول بعد '+(m.stoppage?.first||0)+' دقائق بدل ضائع، وعند نهاية المباراة بعد '+(m.stoppage?.second||0)+' دقائق بدل ضائع.</p>'))+
    section("التكتيك أثناء المباراة",card('<p class="ex-muted">تُطبّق التعديلات فوراً على الفترة التالية، وتؤثر في الهجوم والدفاع والاستحواذ والإرهاق.</p>'+tacticalGroup("الخطة","formation",["4-4-2","4-3-3","4-2-3-1","3-5-2"])+tacticalGroup("أسلوب اللعب","style",["متوازن","استحواذ","مرتدات","لعب مباشر","الأطراف"])+tacticalGroup("الضغط","pressing",["منخفض","متوسط","عالٍ"])+tacticalGroup("خط الدفاع","defensiveLine",["متأخرة","متوسطة","متقدمة"])+tacticalGroup("عرض اللعب","width",["متوازنة","واسعة","ضيقة"])))+
   section("التبديلات",card((()=>{
      const ids=(m.lineups&&m.lineups[S.clubId])||[],team=G.squad(S.clubId),starters=ids.map(id=>team.find(p=>p.id===id)).filter(Boolean),substitutedOut=new Set(m.substitutedOut||[]),bench=team.filter(p=>!ids.includes(p.id)&&!substitutedOut.has(p.id)&&!p.injured&&!p.suspension),used=(m.substitutions&&m.substitutions[S.clubId])||0;
      if(used>=5)return '<p class="ex-muted">استهلكت التبديلات الخمسة المسموح بها.</p>';
      if(selectedSubOut===null)return '<p class="ex-muted">اختر لاعباً أساسياً لإخراجه، ثم اختر بديلاً من خط اللعب نفسه. المتبقي: '+(5-used)+'</p>'+(starters.some(p=>p.injured)?'<p class="ex-muted">🩹 لاعبون مصابون: '+starters.filter(p=>p.injured).map(p=>esc(p.name)).join("، ")+' — يُنصح باستبدالهم.</p>':'')+starters.map(p=>btn((p.injured?"🩹 خروج مصاب: ":"خروج: ")+esc(p.name)+" · "+positionLabel(p),"sub-out:"+p.id,"mini")).join("");
      const outgoing=team.find(p=>p.id===selectedSubOut),compatible=bench.filter(p=>outgoing&&positionGroup(p)===positionGroup(outgoing));
      return '<p class="ex-muted">اختر بديلاً للاعب '+esc((outgoing||{}).name||"")+' · المركز: '+positionLabel(outgoing)+' · المتبقي: '+(5-used)+'</p>'+(compatible.length?compatible.map(p=>btn("دخول: "+esc(p.name)+" · "+positionLabel(p),"sub-in:"+p.id,"mini")).join(""):'<p class="ex-muted">لا يوجد بديل متاح من خط اللعب نفسه في قائمة الفريق.</p>')+btn("إلغاء الاختيار","sub-cancel","mini");
    })()))+
   section("أحداث المباراة",card('<div class="ex-events">'+m.events.slice(0,18).map(e=>'<div><b>'+e.minute+'′</b><span>'+esc(e.text)+'</span></div>').join("")+'</div>'))+
   section("إحصائيات مباشرة",card('<div class="ex-live-stats">'+[['الاستحواذ',m.homePossession+"%",(100-m.homePossession)+"%"],['التمريرات الناجحة',m.passesHome||0,m.passesAway||0],['التسديدات',m.homeShots,m.awayShots],['على المرمى',m.homeOnTarget,m.awayOnTarget],['الركنيات',m.cornersHome,m.cornersAway],['الأخطاء',matchStat(m,m.home,"fouls"),matchStat(m,m.away,"fouls")],['البطاقات الصفراء',matchStat(m,m.home,"yellowCards"),matchStat(m,m.away,"yellowCards")],['البطاقات الحمراء',matchStat(m,m.home,"redCards"),matchStat(m,m.away,"redCards")]].map(x=>'<div><b>'+x[1]+'</b><span>'+x[0]+'</span><b>'+x[2]+'</b></div>').join("")+'</div>'));
 }
 function training(){
  const players=G.squad().slice().sort((a,b)=>a.pos.localeCompare(b.pos));
  return section("مركز التدريب",card('<p class="ex-muted">اختر تخصص اللاعب. تُنفّذ الحصة آلياً مرة أسبوعياً عند تقدم اليوم، وتكلف 800 د.ت لكل لاعب. اختيار البرنامج وحده لا يمنح نقاطاً.</p>'+players.map(p=>{
   const a=p.attributes||{},focus=p.focus||"دون برنامج",progress=Object.values(p.trainingProgress||{}).reduce((n,v)=>n+(Number(v)||0),0);
   return '<div class="ex-player"><div><b>'+esc(p.name)+'</b><small>'+({GK:"حارس",DEF:"دفاع",MID:"وسط",FWD:"هجوم"}[p.pos])+' · التقييم '+p.ovr+'/'+p.potential+' · البرنامج: '+focus+'</small><small>تقدم المهارات: '+Math.min(99,Math.round(progress*100))+'% · اللياقة '+(Number.isFinite(Number(p.fitness))?Math.round(p.fitness):85)+'% · الإرهاق '+(Number(p.fatigue)||0)+'%</small>'+bar("الفورمة",p.form||65)+bar("اللياقة",p.fitness??85,"green")+'<small>المهارات: تسديد '+(a.finishing??"—")+' · تمرير '+(a.passing??"—")+' · دفاع '+(a.tackling??"—")+' · سرعة '+(a.pace??"—")+'</small></div><div class="ex-training-actions">'+["تسديد","تمرير","دفاع","سرعة","بدني","حراسة"].map(x=>btn(x,"focus:"+p.id+":"+x,"mini")).join("")+btn("إلغاء البرنامج","focus:"+p.id+":إلغاء","mini")+'</div></div>';
  }).join("")))+section("تدريب جماعي",card('<p>الانسجام الحالي: '+G.me().familiarity+'%</p>'+btn("حصة تكتيكية جماعية","team-training","gold")));
 }
 function tactics(){
  const c=G.me();
  return section("غرفة التكتيك",card('<p class="ex-muted">اختر أسلوب اللعب والتشكيلة. تتغير قوة الفريق حسب الخطة والانسجام.</p><h3>أسلوب اللعب</h3><div class="ex-shortcuts">'+["متوازن","هجومي","دفاعي","استحواذ","مرتدات"].map(x=>btn(x,"set-tactic:"+x,c.tactic===x?"gold":"")).join("")+'</div><h3>التشكيلة</h3><div class="ex-shortcuts">'+["4-4-2","4-3-3","4-2-3-1","3-5-2"].map(x=>btn(x,"set-formation:"+x,c.formation===x?"gold":"")).join("")+'</div><p class="ex-muted">الانسجام: '+c.familiarity+'%</p>'));
 }
 function press(){
  return section("المركز الإعلامي",card('<div class="ex-press-head"><span>🎙️</span><div><b>المؤتمر الصحفي</b><small>قراراتك تؤثر في ثقة الإدارة والسمعة الإعلامية.</small></div></div><div class="ex-shortcuts">'+btn("نعد الجماهير بالفوز","press:promise")+btn("نحمي اللاعبين من الضغط","press:protect")+btn("نحمّل أنفسنا المسؤولية","press:responsible")+btn("ننتقد التحكيم","press:referee")+'</div><p class="ex-muted">السمعة الإعلامية الحالية: '+(S.mediaReputation??50)+'/100</p>'));
 }
 function fans(){
  const c=G.me(),mood=pct(Math.round(c.confidence*.65+(S.mediaReputation??50)*.2+(G.standings().findIndex(x=>x.id===S.clubId)===0?15:0)));
  return section("الجماهير والملعب",card('<div class="ex-fans"><div class="ex-fans-icon">🏟️</div><div><b>'+esc(c.name)+'</b><small>سعة الملعب: '+num(c.capacity)+'</small><small>سعر التذكرة الحالي: '+num(c.ticket)+' د.ت</small></div></div>'+bar("رضا الجماهير",mood)+
   '<div class="ex-shortcuts">'+btn("رفع سعر التذكرة","ticket:up")+btn("خفض سعر التذكرة","ticket:down")+'</div><p class="ex-muted">سعر التذكرة يؤثر في دخل المباريات وإقبال الجمهور.</p>'));
 }
 function render(){
  if(!S.career){$("#app").innerHTML='<div class="ex-page-head"><span>⚽ مدير كرة القدم 2</span><small>اختر ناديك</small></div>'+setup();return;}
  const views={home,match,training,press,fans,tactics,team};$("#app").innerHTML='<div class="ex-page-head"><span>⚽ مدير كرة القدم 2</span><small>'+esc(G.me().short||"النادي")+'</small></div>'+views[page]();
  document.querySelectorAll("[data-ex-tab]").forEach(x=>x.classList.toggle("active",x.dataset.exTab===page));
  document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",page==="home"&&x.dataset.tab==="home"));
 }
 function action(a){
  const [k,id,val]=a.split(":");
  if(k==="new-career"){if(!confirm("سيتم حفظ مسيرتك الحالية في الأرشيف ثم إنشاء مسيرة جديدة بقاعدة البيانات الموسعة. هل تريد المتابعة؟"))return;G.startNewCareer();page="home";render();return}
  if(k==="swap-career"){if(!confirm("سيتم التبديل بين المسيرة الحالية والمسيرة المحفوظة. هل تريد المتابعة؟"))return;const result=G.swapArchivedCareer();if(result.error)alert(result.error);page="home";render();return}
  if(k==="club"){S.clubId=Number(id);S.career=true;S.date=new Date().toISOString().slice(0,10);G.schedule();S.message="بدأت مسيرتك مع "+G.me().name;G.save();page="home";render();return}
  if(k==="team"){page="team";render();return}
  if(k==="training"||k==="press"||k==="fans"){page=k;render();return}
  if(k==="starter"){const p=S.players.find(x=>x.id===Number(id));if(!p)return;if(!p.starter&&G.squad().filter(x=>x.starter).length>=11){alert("لا يمكن اختيار أكثر من 11 لاعباً.");return}if(p.injured||p.suspension){alert("لا يمكن إشراك لاعب مصاب أو موقوف.");return}p.starter=!p.starter;G.save();render();return}
  if(k==="renew"){const p=S.players.find(x=>x.id===Number(id));if(!p)return;const years=Number(prompt("مدة العقد الجديدة (1 إلى 5 سنوات)",3));if(!Number.isInteger(years)||years<1||years>5)return;const wage=Number(prompt("الأجر الأسبوعي الجديد",Math.round(p.wage*1.1)));const result=G.renewContract(p.id,years,wage);if(result.error)alert(result.error);render();return}
  if(k==="tactics"){page="tactics";render();return}
  if(k==="set-tactic"){G.me().tactic=id;G.save();render();return}
  if(k==="set-formation"){G.me().formation=id;G.me().familiarity=Math.max(25,G.me().familiarity-5);G.save();render();return}
  if(k==="open-match"){page="match";if(!S.liveMatch&&fixture()&&fixture().date<=S.date){const r=G.beginLiveMatch(fixture().id);if(r.error)alert(r.error)}render();if(S.liveMatch)startMatchClock();return}
  if(k==="begin-match"){const r=G.beginLiveMatch(fixture()?.id);if(r.error)alert(r.error);page="match";render();if(S.liveMatch)startMatchClock();return}
  if(k==="sub-out"){selectedSubOut=Number(id);render();return}
  if(k==="sub-cancel"){selectedSubOut=null;render();return}
  if(k==="sub-in"){if(selectedSubOut===null)return;const r=G.substituteLiveMatch(selectedSubOut,Number(id));selectedSubOut=null;if(r.error)alert(r.error);render();return}
  if(k==="live-tactic"){const r=G.setLiveTactics(id,val);if(r.error)alert(r.error);render();return}
  if(k==="match-choice"){pendingMatchAction=id;render();return}
  if(k==="match-plan"){matchPlan=id;pendingMatchAction=null;render();return}
  if(k==="match-speed"){setMatchSpeed(Number(id)||1200);return}
  if(k==="match-toggle"){if(matchPlaying)stopMatchClock();else startMatchClock();render();return}
  if(k==="step"){const r=G.stepLiveMatch(id,Number(val)||1);if(r.error)alert(r.error);if(r.finished||r.halfTime)stopMatchClock();render();if(r.finished)setTimeout(()=>alert("انتهت المباراة. النتيجة: "+r.match.homeGoals+" - "+r.match.awayGoals),30);return}
  if(k==="advance"){G.advance(Number(id));if(S.liveMatch)page="match";render();return}
  if(k==="focus"){const p=S.players.find(x=>x.id===Number(id));if(p){p.focus=val==="إلغاء"?null:val;G.save()}render();return}
  if(k==="team-training"){if(G.me().budget<5000){alert("الميزانية لا تكفي للحصة الجماعية.");return}G.transaction(S.clubId,-5000,"حصة تدريب تكتيكية جماعية");G.me().familiarity=Math.min(100,G.me().familiarity+8);G.save();render();return}
  if(k==="press"){const c=G.me();if(id==="promise"){c.confidence=Math.max(0,c.confidence-1);S.mediaReputation=Math.min(100,(S.mediaReputation||50)+2)}if(id==="protect"){c.confidence=Math.min(100,c.confidence+2);S.mediaReputation=Math.min(100,(S.mediaReputation||50)+1)}if(id==="responsible"){c.confidence=Math.min(100,c.confidence+1);S.mediaReputation=Math.min(100,(S.mediaReputation||50)+2)}if(id==="referee"){c.confidence=Math.max(0,c.confidence-2);S.mediaReputation=Math.max(0,(S.mediaReputation||50)-3)}S.inbox.unshift({id:S.inboxSeq++,type:"media",title:"تصريح صحفي جديد",body:"اتخذت قراراً في المؤتمر الصحفي. السمعة الإعلامية الآن "+S.mediaReputation+"/100.",date:S.date,read:false});G.save();render();return}
  if(k==="ticket"){G.me().ticket=Math.max(3,Math.min(80,(G.me().ticket||10)+(id==="up"?2:-2)));G.save();render();return}
  if(k==="base"){page=null;if(id==="inbox")document.querySelector('[data-sys-tab="inbox"]')?.click();else document.querySelector('[data-tab="'+id+'"]')?.click();return}
 }
 document.addEventListener("click",e=>{
  const ex=e.target.closest("[data-ex-tab]");if(ex){e.preventDefault();e.stopImmediatePropagation();page=ex.dataset.exTab;if(page==="match"&&S.liveMatch)startMatchClock();else stopMatchClock();render();return}
  const old=e.target.closest("[data-tab]");if(old&&old.dataset.tab==="team"){e.preventDefault();e.stopImmediatePropagation();page="team";stopMatchClock();render();return}if(old&&old.dataset.tab==="home"){e.preventDefault();e.stopImmediatePropagation();page="home";stopMatchClock();render();return}
  const a=e.target.closest("[data-ex-act]");if(a){e.preventDefault();e.stopImmediatePropagation();action(a.dataset.exAct);return}
 },true);
 const nav=$("nav");
 [["match","⚽ المباراة"],["training","🏋️ التدريب"],["press","🎙️ الإعلام"],["fans","🏟️ الجماهير"]].forEach(([id,label])=>{const b=document.createElement("button");b.dataset.exTab=id;b.textContent=label;nav.appendChild(b)});
 document.addEventListener("visibilitychange",()=>{if(document.hidden){autoResumeAfterVisibility=matchPlaying;stopMatchClock();}else if(autoResumeAfterVisibility&&page==="match"&&S.liveMatch){autoResumeAfterVisibility=false;startMatchClock();}});
 const style=document.createElement("style");style.textContent=`
 :root{--ex-gold:#e9bf58;--ex-green:#39c889;--ex-line:#294454}
 body{background:radial-gradient(ellipse at 50% -15%,#1d4651 0,#0a1722 58%,#07111a 100%)}
 header{background:#08131bea;backdrop-filter:blur(14px);border-bottom:1px solid #294454}
 main{max-width:920px;padding:12px 12px 105px}
  .ex-clubs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ex-club{display:grid;gap:6px;text-align:right;padding:14px;background:linear-gradient(145deg,#1b3948,#102431);border:1px solid #355768;border-radius:15px;color:#fff}.ex-club span{font-size:23px}.ex-club small{color:#9db4c0;font-size:10px}.ex-pitch{min-height:185px;padding:12px;border:1px solid #6b9878;border-radius:12px;background:repeating-linear-gradient(0deg,#1b6549 0 30px,#1e704f 31px 60px);display:flex;flex-wrap:wrap;align-content:space-around;justify-content:space-around;gap:8px}.ex-pitch>div{min-width:65px;text-align:center;background:#0a2520c9;border:1px solid #c8b66b;border-radius:9px;padding:7px 4px}.ex-pitch b{display:block;font-size:10px}.ex-pitch small{font-size:9px;color:#f2d27a}.ex-page-head{display:flex;justify-content:space-between;align-items:center;color:var(--ex-gold);font-weight:900;padding:5px 3px 12px}
 .ex-page-head small{color:#9db5c1}
 .ex-hero{position:relative;min-height:210px;border-radius:22px;overflow:hidden;margin:4px 0 13px;background:linear-gradient(115deg,#143c38,#102b3a 55%,#182b3a);border:1px solid #41604e;box-shadow:0 15px 32px #0005}
 .ex-hero:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 34px,#ffffff08 35px 36px),linear-gradient(0deg,#06131ddd,transparent 70%)}
 .ex-hero:after{content:"⚽";position:absolute;left:7%;top:13%;font-size:112px;opacity:.13;transform:rotate(-17deg)}
 .ex-hero-content{position:relative;z-index:1;padding:22px 19px}.ex-kicker{font-size:9px;letter-spacing:2px;color:#e9bf58;font-weight:900}
 .ex-hero h1{font-size:25px;margin:24px 0 4px;color:#fff}.ex-hero p{margin:0;color:#b8cbd1;font-size:12px}
 .ex-hero-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:16px}.ex-hero-chips span{border:1px solid #ffffff30;background:#07192388;border-radius:20px;padding:5px 10px;font-size:10px}
 .ex-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 17px}.ex-kpis>div{background:linear-gradient(145deg,#1b3543,#102432);border:1px solid #2d4c5c;border-radius:15px;padding:11px 8px;text-align:center;min-width:0}
 .ex-kpis small{display:block;color:#9db2be;font-size:10px}.ex-kpis b{display:block;color:#f1c65f;font-size:17px;overflow-wrap:anywhere}
 .ex-section{margin:17px 0}.ex-section h2{font-size:15px;color:#f2f5f7;margin:0 2px 9px}
 .ex-card{background:linear-gradient(145deg,#183140,#102331);border:1px solid #2b4a5b;border-radius:17px;padding:13px;box-shadow:0 7px 20px #0002}
 .ex-muted{font-size:11px;color:#9eb4c0;line-height:1.8}
 .ex-fixture{padding:3px}.ex-fixture-top,.ex-fixture-bottom{display:flex;justify-content:space-between;align-items:center;color:#a9bdc7;font-size:11px;gap:8px}
 .ex-versus{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;text-align:center;gap:8px;padding:15px 0}.ex-versus>div{display:grid;gap:6px}.ex-versus b{font-size:17px}.ex-versus>strong{color:#e9bf58;font-size:13px}
 .ex-crest{display:grid;place-items:center;width:48px;height:48px;margin:auto;border-radius:15px;background:linear-gradient(145deg,#274d5a,#122936);border:1px solid #55707b;font-size:25px}
 .ex-btn{border:1px solid #3a5a69;background:#223f4d;color:#f4f7f8;border-radius:11px;padding:10px 12px;font-size:12px;font-weight:800;min-height:39px}
 .ex-btn.gold{background:linear-gradient(135deg,#f1ce70,#d5a63e);color:#17232a;border:0}.ex-btn.mini{padding:6px 8px;min-height:31px;font-size:10px}
 .ex-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
 .ex-time-actions{display:flex;gap:7px;flex-wrap:wrap}.ex-time-actions .ex-btn{flex:1}
 .ex-meter-label{display:flex;justify-content:space-between;font-size:11px;color:#c2d1d8;margin:9px 0 5px}.ex-meter-label b{color:#e9bf58}
 .ex-meter{height:7px;border-radius:10px;background:#263e4b;overflow:hidden}.ex-meter i{display:block;height:100%;background:linear-gradient(90deg,#2eae79,#8bd59c);border-radius:10px}.ex-meter i.gold{background:linear-gradient(90deg,#bd8c2d,#f1d176)}
 .ex-live-pitch{position:relative;height:245px;overflow:hidden;border:2px solid #c4d6b9;border-radius:12px;background:repeating-linear-gradient(90deg,#1c6948 0 12.2%,#217451 12.3% 24.5%);box-shadow:inset 0 0 0 1px #ffffff55}
 .ex-live-pitch:before{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:2px solid #ffffff9c}
 .ex-pitch-half{position:absolute;left:50%;top:50%;width:58px;height:58px;border:2px solid #ffffff9c;border-radius:50%;transform:translate(-50%,-50%)}
 .ex-pitch-circle{position:absolute;inset:5px;border:1px solid #ffffff35;border-radius:8px;pointer-events:none}
 .ex-pitch-box{position:absolute;top:27%;height:46%;width:11%;border:2px solid #ffffff9c}
 .ex-pitch-box.left{left:0;border-left:0}.ex-pitch-box.right{right:0;border-right:0}
 .ex-pitch-player{position:absolute;z-index:2;transform:translate(-50%,-50%);display:grid;place-items:center;width:17px;height:17px;border-radius:50%;font-size:13px;text-shadow:0 1px 2px #000;transition:left .35s ease,top .35s ease}
 .ex-pitch-player.home{color:#ffe17c;background:#173d2b;border:1px solid #fff0a8}.ex-pitch-player.away{color:#d9ecff;background:#1b3556;border:1px solid #d9ecff}.ex-pitch-player.carrier{box-shadow:0 0 0 3px #f1c65f,0 0 10px #f1c65f;z-index:3}
 .ex-match-ball{position:absolute;z-index:4;transform:translate(-50%,-50%);font-size:19px;filter:drop-shadow(0 1px 2px #000);transition:left .35s ease,top .35s ease}
 .ex-pitch-legend{display:flex;justify-content:space-between;font-size:10px;color:#cbd9df;margin-top:7px}
 .ex-match-banner{display:flex;justify-content:space-between;color:#f1c65f;font-size:11px;font-weight:900;padding:7px 3px}
 .ex-scoreboard{border-radius:20px;background:radial-gradient(ellipse at center,#235044,#102c35 70%);border:1px solid #4a6a55;text-align:center;padding:17px 12px;box-shadow:0 12px 28px #0005}
 .ex-scoreboard>small{color:#c3d4cb}.ex-score-teams{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:17px 0}.ex-score-teams div{display:grid;gap:6px}.ex-score-teams div span{font-size:28px}.ex-score-teams div b{font-size:15px}.ex-score-teams>strong{font-size:35px;color:#f4d16d}
 .ex-progress{height:6px;background:#142b30;border-radius:9px;overflow:hidden}.ex-progress i{display:block;height:100%;background:#f1c65f}
 .ex-scoreboard>small:last-child{display:block;margin-top:8px}
 .ex-tactic-group{padding:9px 0;border-bottom:1px solid #2a4553}.ex-tactic-group:last-child{border:0}.ex-tactic-group>b{display:block;color:#e9bf58;font-size:11px;margin-bottom:7px}.ex-tactic-group .ex-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}
 .ex-live-lineup{display:grid;gap:9px}.ex-live-lineup-row{display:grid;grid-template-columns:65px minmax(0,1fr);gap:8px;align-items:start;padding-bottom:8px;border-bottom:1px solid #2a4553}.ex-live-lineup-row:last-child{border:0;padding-bottom:0}.ex-live-lineup-row>b{color:#e9bf58;font-size:11px;padding-top:5px}.ex-live-lineup-row>div{display:flex;flex-wrap:wrap;gap:5px}.ex-live-lineup-row span{display:inline-block;padding:6px 8px;border-radius:8px;background:#1d493c;border:1px solid #49765c;color:#f2f7f4;font-size:10px;font-weight:700}\n .ex-events>div{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #2a4553;font-size:12px}.ex-events>div:last-child{border:0}.ex-events b{color:#e9bf58;min-width:34px}.ex-events span{line-height:1.6}
 .ex-live-stats>div{display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;padding:10px;border-bottom:1px solid #2a4553}.ex-live-stats>div:last-child{border:0}.ex-live-stats span{color:#9db4c0;font-size:11px}
 .ex-player{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:12px 0;border-bottom:1px solid #2a4553}.ex-player small{display:block;color:#9db4c0;font-size:10px}.ex-training-actions{display:flex;gap:5px;flex-wrap:wrap}
 .ex-press-head,.ex-fans{display:flex;align-items:center;gap:12px;margin-bottom:15px}.ex-press-head>span,.ex-fans-icon{font-size:35px}.ex-press-head small,.ex-fans small{display:block;color:#9db4c0;font-size:11px;margin-top:4px}
 nav{overflow-x:auto;justify-content:flex-start;gap:2px;scrollbar-width:none}nav button{min-width:max-content;padding:8px 9px;font-size:10px}nav button.active{color:#f1c65f;border-top:2px solid #e9bf58}
 @media(min-width:650px){.ex-player{grid-template-columns:1fr auto;align-items:center}.ex-shortcuts{grid-template-columns:repeat(3,minmax(0,1fr))}.ex-hero{min-height:235px}.ex-hero h1{font-size:31px}}
 @media(max-width:380px){.ex-kpis{gap:5px}.ex-kpis>div{padding:9px 4px}.ex-kpis b{font-size:14px}.ex-hero h1{font-size:21px}.ex-score-teams div b{font-size:12px}}
 `;document.head.appendChild(style);
 G.experienceUiLoaded=true;render();if(page==="match"&&S.liveMatch)startMatchClock();
})();