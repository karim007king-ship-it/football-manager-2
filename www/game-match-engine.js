// Interactive match engine for Football Manager 2
(() => {
  const G=window.FM2;
  if(!G||G.liveMatchEngineLoaded)return;
  const S=G.state;
  const addDays=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  const dayDiff=(a,b)=>Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000));
  const ownFixture=()=>S.fixtures.filter(f=>f.status==="scheduled"&&(f.home===S.clubId||f.away===S.clubId)).sort((a,b)=>a.date.localeCompare(b.date))[0];
  function buildPitch(m){
    const groups=["GK","DEF","MID","FWD"],home=[],away=[];
    for(const [teamId,target,reverse] of [[m.home,home,false],[m.away,away,true]]){
      const players=(m.lineups[teamId]||[]).map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
      for(const group of groups){
        const list=players.filter(p=>positionGroup(p)===group);
        const base=({GK:8,DEF:27,MID:50,FWD:73})[group];
        list.forEach((p,i)=>target.push({id:p.id,name:p.name,team:teamId,x:reverse?100-base:base,y:(i+1)*100/(list.length+1)}));
      }
    }
    m.pitch={ballX:50,ballY:50,possession:m.home,phase:"وسط الملعب",homePlayers:home,awayPlayers:away,minute:0};
  }
  function movePitch(m,minute){
    const p=m.pitch;
    const homeHasBall=Math.random()<(Number(m.homePossession)||50)/100;
    p.possession=homeHasBall?m.home:m.away;
    p.ballX=Math.max(4,Math.min(96,p.ballX+(homeHasBall?1:-1)*(4+Math.random()*13)));
    p.ballY=Math.max(8,Math.min(92,p.ballY+(Math.random()*22-11)));
    p.phase=homeHasBall?(p.ballX>=67?"الثلث الهجومي":p.ballX<=33?"الثلث الدفاعي":"وسط الملعب"):(p.ballX<=33?"الثلث الهجومي":p.ballX>=67?"الثلث الدفاعي":"وسط الملعب");
    p.minute=minute;
    for(const player of p.homePlayers)player.x=Math.max(7,Math.min(93,player.x+(homeHasBall?0.6:-0.45)));
    for(const player of p.awayPlayers)player.x=Math.max(7,Math.min(93,player.x+(homeHasBall?-0.45:0.6)));
  }
  function begin(f){
    if(!f||f.status!=="scheduled")return {error:"المباراة غير متاحة"};
    if(f.date>S.date)return {error:"لم يحن موعد المباراة بعد"};
    const validatedLineups={};
    for(const id of [f.home,f.away]){
      const club=G.club(id),eligible=G.squad(id).filter(p=>!p.injured&&!p.suspension),starters=eligible.filter(p=>p.starter);
      if(starters.length!==11)return {error:"لا يمكن بدء المباراة: يجب أن تضم تشكيلة "+(club?.short||club?.name||"الفريق")+" 11 لاعباً مؤهلاً بالضبط. التشكيلة الحالية: "+starters.length+"."};
      if(new Set(starters.map(p=>p.id)).size!==11)return {error:"لا يمكن بدء المباراة: يوجد لاعب مكرر في تشكيلة "+(club?.short||club?.name||"الفريق")+"."};
      const goalkeepers=starters.filter(p=>p.pos==="GK").length;
      if(goalkeepers!==1)return {error:"لا يمكن بدء المباراة: يجب اختيار حارس مرمى واحد بالضبط لفريق "+(club?.short||club?.name||"الفريق")+"."};
      validatedLineups[id]=starters.map(p=>p.id);
    }
    S.liveMatch={fixtureId:f.id,minute:0,home:f.home,away:f.away,homeGoals:0,awayGoals:0,
      homeShots:0,awayShots:0,homeOnTarget:0,awayOnTarget:0,homePossession:50,possessionHomeTotal:0,possessionMinutes:0,cornersHome:0,cornersAway:0,
      passesHome:0,passesAway:0,events:[{minute:0,text:"صافرة البداية! انطلقت المباراة."}],status:"live",lastChoice:"متوازن",lineups:validatedLineups,substitutions:{},substitutionLog:[],substitutedOut:[],tactics:{[S.clubId]:{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازن"}}};
    const m=S.liveMatch;
    buildPitch(m);
    const opponentId=f.home===S.clubId?f.away:f.home;
    m.tactics[opponentId]={formation:(G.club(opponentId).formation||"4-4-2"),style:"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
    m.aiLastUpdateMinute=0;
    [f.home,f.away].forEach(id=>{m.substitutions[id]=0;});
    G.save();return {success:true};
  }
  function step(choice,minutes){
    const m=S.liveMatch;if(!m||m.status!=="live")return {error:"لا توجد مباراة مباشرة"};
    const f=S.fixtures.find(x=>x.id===m.fixtureId);if(!f)return {error:"تعذر العثور على المباراة"};
    const userHome=m.home===S.clubId, userId=S.clubId, oppId=userHome?m.away:m.home;
    const choiceKey=choice||"متوازن";m.lastChoice=choiceKey;
    m.tactics=m.tactics||{};
    m.tactics[userId]=m.tactics[userId]||{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
    m.tactics[oppId]=m.tactics[oppId]||{formation:G.club(oppId).formation||"4-4-2",style:"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
    const userTactics=m.tactics[userId],ai=m.tactics[oppId];
    const userScore=userHome?m.homeGoals:m.awayGoals,oppScore=userHome?m.awayGoals:m.homeGoals;
    const previousAI=JSON.stringify(ai);
    const userPossBefore=userHome?m.homePossession:100-m.homePossession;
    if(m.minute>=30){
      if(oppScore<userScore&&m.minute>=45){
        Object.assign(ai,{formation:"4-3-3",style:"لعب مباشر",pressing:"عالٍ",defensiveLine:"متقدمة",width:"واسعة"});
      }else if(oppScore>userScore&&m.minute>=60){
        Object.assign(ai,{formation:"4-2-3-1",style:"مرتدات",pressing:"منخفض",defensiveLine:"متأخرة",width:"ضيقة"});
      }else if(userPossBefore>=59||userTactics.style==="استحواذ"){
        Object.assign(ai,{formation:"4-2-3-1",style:"مرتدات",pressing:"متوسط",defensiveLine:"متوسطة",width:"ضيقة"});
      }else if(userTactics.pressing==="عالٍ"||userTactics.defensiveLine==="متقدمة"){
        Object.assign(ai,{formation:"4-4-2",style:"لعب مباشر",pressing:"متوسط",defensiveLine:"متأخرة",width:"واسعة"});
      }else{
        Object.assign(ai,{formation:G.club(oppId).formation||"4-4-2",style:"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"});
      }
    }
    if(JSON.stringify(ai)!==previousAI){
      const reason=oppScore<userScore?"الفريق متأخر في النتيجة":oppScore>userScore?"الفريق يحافظ على تقدمه":userPossBefore>=59||userTactics.style==="استحواذ"?"مواجهة استحواذ فريقك":"مواجهة ضغط فريقك";
      m.events.unshift({minute:m.minute,text:"🧠 المدرب المنافس يغيّر خطته ("+reason+"): "+ai.formation+"، "+ai.style+"، ضغط "+ai.pressing+"."});
      m.aiLastUpdateMinute=m.minute;
    }
    const userStrength=G.strength(userId),rawOppStrength=G.strength(oppId);
    const oppFormationEffect=({"4-4-2":{atk:0,def:0,pos:0},"4-3-3":{atk:3,def:-1,pos:2},"4-2-3-1":{atk:1,def:2,pos:1},"3-5-2":{atk:2,def:-2,pos:0}})[ai.formation]||{atk:0,def:0,pos:0};
    const oppStyleEffect=({"متوازن":{atk:0,def:0,pos:0},"استحواذ":{atk:1,def:0,pos:8},"مرتدات":{atk:3,def:1,pos:-5},"لعب مباشر":{atk:2,def:-1,pos:-4},"الأطراف":{atk:2,def:0,pos:1}})[ai.style]||{atk:0,def:0,pos:0};
    const oppPressEffect=({"منخفض":{atk:-1,def:2,pos:-2},"متوسط":{atk:0,def:0,pos:0},"عالٍ":{atk:1,def:4,pos:4}})[ai.pressing]||{atk:0,def:0,pos:0};
    const oppLineEffect=({"متأخرة":{atk:-1,def:3},"متوسطة":{atk:0,def:0},"متقدمة":{atk:1,def:1}})[ai.defensiveLine]||{atk:0,def:0};
    const oppWidthEffect=({"متوازنة":{atk:0,def:0},"واسعة":{atk:2,def:-1},"ضيقة":{atk:0,def:2}})[ai.width]||{atk:0,def:0};
    const oppStrength={atk:rawOppStrength.atk+oppFormationEffect.atk+oppStyleEffect.atk+oppPressEffect.atk+oppLineEffect.atk+oppWidthEffect.atk,def:rawOppStrength.def+oppFormationEffect.def+oppStyleEffect.def+oppPressEffect.def+oppLineEffect.def+oppWidthEffect.def};
    const tactics=userTactics;
    const formationEffect=({"4-4-2":{atk:0,def:0,pos:0},"4-3-3":{atk:3,def:-1,pos:2},"4-2-3-1":{atk:1,def:2,pos:1},"3-5-2":{atk:2,def:-2,pos:0}})[tactics.formation]||{atk:0,def:0,pos:0};
    const styleEffect=({"متوازن":{atk:0,def:0,pos:0},"استحواذ":{atk:1,def:0,pos:8},"مرتدات":{atk:3,def:1,pos:-5},"لعب مباشر":{atk:2,def:-1,pos:-4},"الأطراف":{atk:2,def:0,pos:1}})[tactics.style]||{atk:0,def:0,pos:0};
    const pressEffect=({"منخفض":{atk:-1,def:2,pos:-2,fatigue:.35},"متوسط":{atk:0,def:0,pos:0,fatigue:.8},"عالٍ":{atk:1,def:4,pos:4,fatigue:2.1}})[tactics.pressing]||{atk:0,def:0,pos:0,fatigue:.8};
    const lineEffect=({"متأخرة":{atk:-1,def:3},"متوسطة":{atk:0,def:0},"متقدمة":{atk:1,def:1}})[tactics.defensiveLine]||{atk:0,def:0};
    const widthEffect=({"متوازنة":{atk:0,def:0},"واسعة":{atk:2,def:-1},"ضيقة":{atk:0,def:2}})[tactics.width]||{atk:0,def:0};
    const mentalityAtk=choiceKey==="هجومي"?7:choiceKey==="ضغط عالٍ"?4:choiceKey==="دفاعي"?-4:0;
    const mentalityDef=choiceKey==="دفاعي"?7:choiceKey==="ضغط عالٍ"?-3:choiceKey==="هجومي"?-3:0;
    const activePlayers=(m.lineups[userId]||[]).map(pid=>S.players.find(p=>p.id===pid)).filter(Boolean);
    const averageFatigue=activePlayers.length?activePlayers.reduce((n,p)=>n+(Number(p.fatigue)||0),0)/activePlayers.length:0;
    const fatiguePenalty=Math.min(5,averageFatigue/18);
    const userAtk=userStrength.atk+mentalityAtk+formationEffect.atk+styleEffect.atk+pressEffect.atk+lineEffect.atk+widthEffect.atk-fatiguePenalty;
    const userDef=userStrength.def+mentalityDef+formationEffect.def+styleEffect.def+pressEffect.def+lineEffect.def+widthEffect.def-fatiguePenalty*.55;
    const homeAtk=userHome?userAtk:oppStrength.atk, awayAtk=userHome?oppStrength.atk:userAtk;
    const homeDef=userHome?userDef:oppStrength.def, awayDef=userHome?oppStrength.def:userDef;
    const start=m.minute,requestedMinutes=Math.max(1,Math.min(15,Math.floor(Number(minutes)||1))),end=Math.min(90,start+requestedMinutes,start<45?45:90);
    for(let minute=start+1;minute<=end;minute++){
      movePitch(m,minute);
      const homeChance=Math.max(.025,Math.min(.20,.075+(homeAtk-awayDef)/420));
      const awayChance=Math.max(.025,Math.min(.20,.075+(awayAtk-homeDef)/420));
      if(Math.random()<homeChance){
        m.homeShots++;const on=Math.random()<.48;if(on){m.homeOnTarget++;if(Math.random()<Math.max(.08,Math.min(.42,.19+(homeAtk-awayDef)/250))){m.homeGoals++;m.events.unshift({minute,text:"⚽ هدف لأصحاب الأرض! "+G.club(m.home).short+" يهز الشباك."})}else m.events.unshift({minute,text:"تسديدة خطيرة من "+G.club(m.home).short+" والحارس يتصدى."})}
        else if(Math.random()<.35){m.cornersHome++;m.events.unshift({minute,text:"ركنية لصالح "+G.club(m.home).short+"."})}
      }
      if(Math.random()<awayChance){
        m.awayShots++;const on=Math.random()<.46;if(on){m.awayOnTarget++;if(Math.random()<Math.max(.08,Math.min(.42,.18+(awayAtk-homeDef)/250))){m.awayGoals++;m.events.unshift({minute,text:"⚽ هدف للفريق الضيف! "+G.club(m.away).short+" يسجل."})}else m.events.unshift({minute,text:"محاولة قوية من "+G.club(m.away).short+" يتصدى لها الحارس."})}
        else if(Math.random()<.32){m.cornersAway++;m.events.unshift({minute,text:"ركنية للفريق الضيف."})}
      }
    }
    if(!Number.isFinite(Number(m.possessionMinutes))){m.possessionMinutes=start;m.possessionHomeTotal=(Number(m.homePossession)||50)*start;}
    const possessionFactor=styleEffect.pos>0?1.12:styleEffect.pos<0?.92:1;
    for(let minute=start+1;minute<=end;minute++){
      const minuteUserPoss=Math.max(28,Math.min(72,Math.round(50+(userStrength.atk-oppStrength.atk)/3+formationEffect.pos+styleEffect.pos+pressEffect.pos+(choiceKey==="استحواذ"?7:0)-oppFormationEffect.pos-oppStyleEffect.pos-oppPressEffect.pos+(Math.random()*8-4))));
      const minuteHomePoss=userHome?minuteUserPoss:100-minuteUserPoss;
      m.possessionHomeTotal+=minuteHomePoss;
      m.possessionMinutes++;
      m.homePossession=Math.round(m.possessionHomeTotal/m.possessionMinutes);
      m.passesHome+=Math.round(5.5*(minuteHomePoss/50)*(userHome?possessionFactor:1));
      m.passesAway+=Math.round(5.5*((100-minuteHomePoss)/50)*(userHome?1:possessionFactor));
    }
    m.minute=end;
    activePlayers.forEach(p=>{p.fatigue=Math.min(100,(Number(p.fatigue)||0)+pressEffect.fatigue*(end-start));});
    if(m.minute===45&&start<45)m.events.unshift({minute:45,text:"نهاية الشوط الأول. حان وقت تعديل الخطة."});
    if(m.minute===90){finish(f,m);return {finished:true,match:m};}
    G.save();return {finished:false,halfTime:m.minute===45&&start<45,minute:m.minute,match:m};
  }
  function finish(f,m){
    f.hg=m.homeGoals;f.ag=m.awayGoals;f.status="played";f.weather="أجواء ملعب";
    const home=G.club(f.home),away=G.club(f.away);
    const attendance=Math.round((home.capacity||30000)*Math.max(.35,Math.min(.95,.55+(home.confidence||60)/250+(S.mediaReputation||50)/600-(home.ticket||10)/180)));
    G.transaction(home.id,(home.ticket||10)*attendance,"مداخيل مباراة تفاعلية");
    const suspendedBefore=new Set(S.players.filter(p=>(p.clubId===home.id||p.clubId===away.id)&&Number(p.suspension)>0).map(p=>p.id));
    [[home.id,m.homeGoals],[away.id,m.awayGoals]].forEach(([id,goals])=>{
      const lineupIds=(m.lineups&&m.lineups[id])||G.squad(id).filter(p=>p.starter&&!p.injured&&!p.suspension).map(p=>p.id);const starters=lineupIds.map(pid=>S.players.find(p=>p.id===pid&&p.clubId===id)).filter(p=>p&&!p.injured&&!p.suspension);
      starters.forEach(p=>{p.apps=(p.apps||0)+1;p.form=Math.max(30,Math.min(100,(p.form||65)+G.rand(-2,4)));if(Math.random()<.008){p.injured=true;p.injuryDays=G.rand(3,20)}if(Math.random()<.025)p.suspension=Math.max(1,Number(p.suspension)||0)});
      for(let i=0;i<goals;i++){const scorers=starters.filter(p=>p.pos==="FWD"||p.pos==="MID");if(scorers.length){const p=G.pick(scorers);p.goals=(p.goals||0)+1}}
    });
    suspendedBefore.forEach(pid=>{const p=S.players.find(x=>x.id===pid);if(p)p.suspension=Math.max(0,Number(p.suspension)-1)});
    if(m.homeGoals>m.awayGoals)G.transaction(home.id,180000,"منحة فوز");
    else if(m.homeGoals===m.awayGoals)G.transaction(home.id,90000,"منحة تعادل");
    if(m.awayGoals>m.homeGoals)G.transaction(away.id,180000,"منحة فوز خارج الأرض");
    S.history.unshift({date:S.date,competition:f.competition,home:home.name,away:away.name,score:m.homeGoals+" - "+m.awayGoals,round:f.round});
    m.attendance=attendance;m.status="finished";m.finishedDate=S.date;
    if(G.createMatchReport)G.createMatchReport(f,m);
    if(G.progressCompetitions)G.progressCompetitions();
    if(f.home===S.clubId||f.away===S.clubId){
      const won=(f.home===S.clubId?f.hg>f.ag:f.ag>f.hg),draw=f.hg===f.ag;
      G.me().confidence=Math.max(0,Math.min(100,G.me().confidence+(won?3:draw?0:-3)));
      S.lastMatchId=f.id;
    }
    S.liveMatch=null;G.save();
  }
  function setLiveTactics(key,value){
    const m=S.liveMatch;if(!m||m.status!=="live")return {error:"لا توجد مباراة مباشرة"};
    if(m.minute>=90)return {error:"انتهت المباراة ولا يمكن تعديل التكتيك الآن."};
    const allowed={formation:["4-4-2","4-3-3","4-2-3-1","3-5-2"],style:["متوازن","استحواذ","مرتدات","لعب مباشر","الأطراف"],pressing:["منخفض","متوسط","عالٍ"],defensiveLine:["متأخرة","متوسطة","متقدمة"],width:["متوازنة","واسعة","ضيقة"]};
    if(!allowed[key]||!allowed[key].includes(value))return {error:"الخيار التكتيكي غير صالح."};
    m.tactics=m.tactics||{};
    m.tactics[S.clubId]=m.tactics[S.clubId]||{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
    if(m.tactics[S.clubId][key]===value)return {success:true,unchanged:true};
    m.tactics[S.clubId][key]=value;
    const labels={formation:"الخطة",style:"أسلوب اللعب",pressing:"الضغط",defensiveLine:"خط الدفاع",width:"عرض اللعب"};
    m.events.unshift({minute:m.minute,text:"🎯 تعديل تكتيكي: "+labels[key]+" — "+value+"."});
    G.save();return {success:true,tactics:m.tactics[S.clubId]};
  }
  function positionGroup(p){
    const pos=p&&(p.primaryPosition||p.pos);
    if(pos==="GK")return "GK";
    if(["CB","LB","RB","DEF"].includes(pos))return "DEF";
    if(["DM","CM","AM","MID"].includes(pos))return "MID";
    if(["LW","RW","ST","FWD"].includes(pos))return "FWD";
    return null;
  }
  function substitute(outId,inId){
    const m=S.liveMatch;if(!m||m.status!=="live")return {error:"لا توجد مباراة مباشرة"};
    if(m.minute>=90)return {error:"انتهت المباراة ولا يمكن إجراء تبديل الآن."};
    const id=S.clubId,lineup=m.lineups&&m.lineups[id];
    if(!lineup)return {error:"تعذر العثور على تشكيلة فريقك."};
    if((m.substitutions[id]||0)>=5)return {error:"استهلكت الحد الأقصى: 5 تبديلات."};
    const out=S.players.find(p=>p.id===Number(outId)&&p.clubId===id),inn=S.players.find(p=>p.id===Number(inId)&&p.clubId===id);
    if(!out||!inn||!lineup.includes(out.id)||lineup.includes(inn.id))return {error:"اختيار التبديل غير صالح."};
    m.substitutedOut=m.substitutedOut||[];
    if(m.substitutedOut.includes(inn.id))return {error:"هذا اللاعب سبق استبداله ولا يمكنه العودة إلى الملعب."};
    if(inn.injured||inn.suspension)return {error:"لا يمكن إشراك لاعب مصاب أو موقوف."};
    const outGroup=positionGroup(out),inGroup=positionGroup(inn);
    if(!outGroup||!inGroup||outGroup!==inGroup)return {error:"مركز البديل غير مناسب. اختر لاعباً من نفس خط اللعب: "+({GK:"حراسة المرمى",DEF:"الدفاع",MID:"الوسط",FWD:"الهجوم"}[outGroup]||"المركز نفسه")+"."};
    lineup[lineup.indexOf(out.id)]=inn.id;
    m.substitutedOut.push(out.id);
    // Persist the live substitution in the club starting XI for future matches.
    out.starter=false;
    inn.starter=true;
    m.substitutions[id]=(m.substitutions[id]||0)+1;
    m.substitutionLog=m.substitutionLog||[];
    m.substitutionLog.unshift({minute:m.minute,out:out.id,in:inn.id,outName:out.name,inName:inn.name});
    m.events.unshift({minute:m.minute,text:"🔁 تبديل: خروج "+out.name+" ودخول "+inn.name+"."});
    G.save();return {success:true,count:m.substitutions[id]};
  }
  const baseAdvance=G.advance.bind(G);
  G.advance=function(days){
    days=Math.max(0,Math.min(365,Math.floor(Number(days)||0)));
    if(S.liveMatch)return {paused:true,reason:"match-in-progress",fixtureId:S.liveMatch.fixtureId};
    let f=ownFixture();
    if(f&&f.date<=S.date){begin(f);return {paused:true,reason:"match-day",fixtureId:f.id};}
    if(f&&days>0){
      const until=dayDiff(S.date,f.date);
      if(until<=days){
        const result=baseAdvance(until);
        if(f.date<=S.date&&f.status==="scheduled"){begin(f);return {paused:true,reason:"match-day",fixtureId:f.id,advanced:until};}
        return result;
      }
    }
    return baseAdvance(days);
  };
  G.beginLiveMatch=id=>begin(S.fixtures.find(f=>f.id===Number(id))||ownFixture());
  G.stepLiveMatch=step;
  G.substituteLiveMatch=substitute;
  G.setLiveTactics=setLiveTactics;
  G.liveMatchEngineLoaded=true;
  G.save();
})();
// Stage 2: live pitch and user-controlled match decisions are developed in isolated, tested increments.
