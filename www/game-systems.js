// Football Manager 2: management systems expansion (save-compatible)
(() => {
  const G = window.FM2;
  if (!G || G.systemsLoaded) return;
  const S = G.state;
  const ensure = () => {
    S.inbox ||= [];
    S.transferHistory ||= [];
    S.seasonHistory ||= [];
    S.matchReports ||= [];
    S.mediaReputation ??= 50;
    S.lastSystemDate ||= S.date;
    S.inboxSeq ||= 1;
    S.players.forEach(p => {
      p.contract ??= 2; p.apps ??= 0; p.goals ??= 0; p.assists ??= 0;
      p.yellowCards ??= 0; p.redCards ??= 0; p.cleanSheets ??= 0;
      p.injuryDays ??= p.injured ? 7 : 0; p.suspension ??= 0;
    });
  };
  ensure();
  const addMail = (type, title, body, data = {}) => {
    S.inbox.unshift({ id:S.inboxSeq++, type, title, body, date:S.date, read:false, ...data });
    if (S.inbox.length > 120) S.inbox.length = 120;
  };
  const own = () => G.me();
  const rand = (a,b) => G.rand(a,b);
  const pick = a => G.pick(a);
  const money = n => Math.round(n);
  function report(f, matchData) {
    const home=G.club(f.home), away=G.club(f.away);
    const hs=G.strength(f.home), as=G.strength(f.away);
    const live=matchData&&matchData.fixtureId===f.id?matchData:null;
    const homeShots=live?live.homeShots:rand(Math.max(3,Math.round(7+hs.atk/9)),22);
    const awayShots=live?live.awayShots:rand(Math.max(3,Math.round(7+as.atk/9)),22);
    const homePoss=live?live.homePossession:Math.max(28,Math.min(72,Math.round(50+(hs.atk-as.atk)/3+rand(-9,9))));
    const report={fixtureId:f.id,date:f.date,competition:f.competition,round:f.round,home:f.home,away:f.away,
      homeGoals:f.hg,awayGoals:f.ag,homeShots,awayShots,homeOnTarget:live?live.homeOnTarget:Math.min(homeShots,Math.max(f.hg,rand(1,Math.max(1,Math.ceil(homeShots*.55))))),
      awayOnTarget:live?live.awayOnTarget:Math.min(awayShots,Math.max(f.ag,rand(1,Math.max(1,Math.ceil(awayShots*.55))))),
      possessionHome:homePoss,possessionAway:100-homePoss,cornersHome:live?live.cornersHome:rand(1,10),cornersAway:live?live.cornersAway:rand(1,9),
      passesHome:live?live.passesHome:rand(250,520),passesAway:live?live.passesAway:rand(250,520),attendance:live&&live.attendance?live.attendance:rand(3500,Math.max(3501,Math.min(home.capacity||30000,home.capacity||30000))),
      playerRatings:[]};
    const participantIds=live?new Set([...(live.lineups?.[f.home]||[]),...(live.lineups?.[f.away]||[]),...(live.substitutedOut||[]),...(live.sentOff||[])]):null;
    const participants=live?S.players.filter(p=>participantIds.has(p.id)&&(p.clubId===f.home||p.clubId===f.away)):S.players.filter(p=>(p.clubId===f.home||p.clubId===f.away)&&p.apps>0).slice(0,22);
    report.playerRatings=participants.map(p=>{
      const st=live?.playerStats?.[String(p.id)]||{};
      const rating=live?Math.min(9.8,Math.max(5.0,Number((6+((Number(p.form)||65)-65)/35+(st.goals||0)*1.15+(st.assists||0)*.65+(st.onTarget||0)*.18+(st.passesCompleted||0)*.025+(st.tackles||0)*.12+(st.interceptions||0)*.1+(st.saves||0)*.35-(st.turnovers||0)*.12-(st.yellowCards||0)*.25-(st.redCards||0)*1).toFixed(1)))):Math.min(9.8,Math.max(5.5,Number((6.2+rand(0,25)/10+(p.goals?0.5:0)).toFixed(1))));
      return {playerId:p.id,rating,stats:live?{...st}:undefined};
    });
    S.matchReports.unshift(report); if(S.matchReports.length>80)S.matchReports.length=80;
    const mine=f.home===S.clubId||f.away===S.clubId;
    if(mine){
      const won=(f.home===S.clubId?f.hg>f.ag:f.ag>f.hg), draw=f.hg===f.ag;
      addMail("match",won?"انتصار جديد":"تقرير المباراة",
        home.name+" "+f.hg+" - "+f.ag+" "+away.name+" · "+f.competition,
        {fixtureId:f.id});
      addMail("media",won?"الإعلام يشيد بالفريق":draw?"تعادل يثير النقاش":"انتقادات بعد المباراة",
        won?"أشاد المحللون بأداء الفريق، وارتفعت الثقة الإعلامية.":draw?"طالبت الصحافة بمزيد من الفاعلية الهجومية.":"تنتظر الجماهير ردة فعل في المباراة القادمة.",
        {fixtureId:f.id,choices:[{label:"تصريح إيجابي",effect:"positive"},{label:"تحمل المسؤولية",effect:"responsible"},{label:"انتقاد الأداء",effect:"negative"}]});
      S.mediaReputation=Math.max(0,Math.min(100,S.mediaReputation+(won?2:draw?0:-2)));
    }
  }
  function offer() {
    const candidates=S.players.filter(p=>p.clubId===S.clubId&&p.age>=25&&!p.injured&&p.value>0);
    if(!candidates.length||Math.random()>.28)return;
    const p=pick(candidates), amount=money(p.value*(.72+Math.random()*.38));
    addMail("offer","عرض انتقال وارد","قدم "+G.club(S.clubId).short+" عرضاً لضم "+p.name+" بقيمة "+amount.toLocaleString("ar-TN")+" د.ت.",
      {playerId:p.id,amount,choices:[{label:"قبول العرض",effect:"accept"},{label:"رفض العرض",effect:"reject"}]});
  }
  function processYear(oldYear,newYear) {
    const table=G.standings();
    S.seasonHistory.unshift({season:oldYear,champion:table[0]?.name||"غير محدد",standings:table,
      played:S.history.filter(x=>String(x.date||"").startsWith(String(oldYear))).length,
      results:S.history.filter(x=>String(x.date||"").startsWith(String(oldYear))).slice(0,100)});
    S.players.forEach(p=>{
      if(p.clubId!==null&&p.clubId!==undefined&&p.contract>0)p.contract--;
      if(p.contract===0&&p.clubId!==null&&p.clubId!==undefined){
        if(p.clubId===S.clubId)addMail("contract","انتهاء عقد لاعب",p.name+" أصبح عقده منتهياً. يمكنك تجديده أو تركه يغادر.",{playerId:p.id});
        else {p.clubId=null;p.starter=false;}
      }
      if(p.age<40)p.age++;
    });
    S.season=newYear;
    S.clubs.forEach(c=>{c.familiarity=Math.max(45,c.familiarity-18);c.confidence=Math.max(35,c.confidence-5)});
    G.schedule();
    addMail("season","انطلاق موسم جديد","بدأ موسم "+newYear+". تم حفظ نتائج الموسم السابق وترتيب الدوري في السجل.");
  }
  const baseAdvance=G.advance.bind(G);
  G.advance=function(days){
    ensure();
    const beforeDate=S.date, beforeHistory=S.history.length;
    const injuries=new Set(S.players.filter(p=>p.injured).map(p=>p.id));
    const result=baseAdvance(days);
    S.players.forEach(p=>{
      if(p.injured&&!injuries.has(p.id))addMail("injury","إصابة لاعب",p.name+" تعرض لإصابة. المدة المتوقعة: "+(p.injuryDays||7)+" أيام.",{playerId:p.id});
    });
    const newMatches=S.fixtures.filter(f=>f.status==="played"&&!S.matchReports.some(r=>r.fixtureId===f.id));
    newMatches.forEach(report);
    const seasonComplete=S.fixtures.length>0&&S.fixtures.every(f=>f.status==="played");
    if(seasonComplete){const currentSeason=Number(S.season)||Number(beforeDate.slice(0,4));processYear(currentSeason,currentSeason+1);}
    const weeks=Math.floor((new Date(S.date+"T12:00:00")-new Date(beforeDate+"T12:00:00"))/604800000);
    for(let i=0;i<Math.min(weeks,5);i++)offer();
    if(S.date.slice(5,7)!==beforeDate.slice(5,7))addMail("club","ملخص شهري","الميزانية الحالية: "+money(own().budget).toLocaleString("ar-TN")+" د.ت · ثقة الإدارة "+own().confidence+"%.");
    S.lastSystemDate=S.date; G.save(); return result;
  };
  G.respondToMail=function(id,choice){
    const m=S.inbox.find(x=>x.id===id); if(!m||m.resolved)return {error:"الرسالة غير متاحة"};
    if(m.type==="media"){
      if(choice==="positive"){own().confidence=Math.min(100,own().confidence+2);S.mediaReputation=Math.min(100,S.mediaReputation+3)}
      if(choice==="responsible"){own().confidence=Math.min(100,own().confidence+1);S.mediaReputation=Math.min(100,S.mediaReputation+2)}
      if(choice==="negative"){own().confidence=Math.max(0,own().confidence-2);S.mediaReputation=Math.max(0,S.mediaReputation-4)}
    } else if(m.type==="offer"){
      const p=S.players.find(x=>x.id===m.playerId);
      if(choice==="accept"&&p&&p.clubId===S.clubId){
        G.transaction(S.clubId,m.amount,"بيع "+p.name+" (عرض وارد)");
        S.transferHistory.unshift({date:S.date,player:p.name,from:own().name,to:"نادٍ خارجي",fee:m.amount,type:"بيع"});
        p.clubId=null;p.starter=false;
      }
    }
    m.resolved=true;m.response=choice;G.save();return {success:true};
  };
  G.markMailRead=function(id){const m=S.inbox.find(x=>x.id===id);if(m){m.read=true;G.save()}};
  G.renewContract=function(playerId,years,wage){
    const p=S.players.find(x=>x.id===playerId&&x.clubId===S.clubId);
    if(!p||!Number.isInteger(years)||years<1||years>5)return {error:"بيانات العقد غير صالحة"};
    wage=money(wage||p.wage*1.1);
    if(G.wages()-p.wage+wage>own().wageBudget)return {error:"سقف الرواتب لا يسمح"};
    p.contract=years;p.wage=wage;
    addMail("contract","تم تجديد العقد","تم تمديد عقد "+p.name+" لمدة "+years+" سنوات.");
    G.save();return {success:true};
  };
  G.getReport=id=>S.matchReports.find(r=>r.fixtureId===id)||null;
  G.createMatchReport=report;
  G.systemsLoaded=true;
  if(!S.systemsInitialized){ addMail("club","مركز الرسائل جاهز","ستظهر هنا عروض الانتقالات والإصابات ونتائج المباريات وأخبار النادي."); S.systemsInitialized=true; }
  G.save();
})();