// Interactive match engine for Football Manager 2
(() => {
  const G=window.FM2;
  if(!G||G.liveMatchEngineLoaded)return;
  const S=G.state;
  const addDays=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  const dayDiff=(a,b)=>Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000));
  const ownFixture=()=>S.fixtures.filter(f=>f.status==="scheduled"&&(f.home===S.clubId||f.away===S.clubId)).sort((a,b)=>a.date.localeCompare(b.date))[0];
  function begin(f){
    if(!f||f.status!=="scheduled")return {error:"المباراة غير متاحة"};
    if(f.date>S.date)return {error:"لم يحن موعد المباراة بعد"};
    S.liveMatch={fixtureId:f.id,minute:0,home:f.home,away:f.away,homeGoals:0,awayGoals:0,
      homeShots:0,awayShots:0,homeOnTarget:0,awayOnTarget:0,homePossession:50,cornersHome:0,cornersAway:0,
      passesHome:0,passesAway:0,events:[{minute:0,text:"صافرة البداية! انطلقت المباراة."}],status:"live",lastChoice:"متوازن",lineups:{},substitutions:{},substitutionLog:[]};
    const m=S.liveMatch;
    [f.home,f.away].forEach(id=>{const eligible=G.squad(id).filter(p=>!p.injured&&!p.suspension);m.lineups[id]=eligible.filter(p=>p.starter).slice(0,11).map(p=>p.id);m.substitutions[id]=0;});
    G.save();return {success:true};
  }
  function step(choice){
    const m=S.liveMatch;if(!m||m.status!=="live")return {error:"لا توجد مباراة مباشرة"};
    const f=S.fixtures.find(x=>x.id===m.fixtureId);if(!f)return {error:"تعذر العثور على المباراة"};
    const userHome=m.home===S.clubId, userId=S.clubId, oppId=userHome?m.away:m.home;
    const choiceKey=choice||"متوازن";m.lastChoice=choiceKey;
    const userStrength=G.strength(userId),oppStrength=G.strength(oppId);
    let attackBoost=choiceKey==="هجومي"?7:choiceKey==="ضغط عالٍ"?4:choiceKey==="دفاعي"?-4:0;
    let defenceBoost=choiceKey==="دفاعي"?7:choiceKey==="ضغط عالٍ"?-3:choiceKey==="هجومي"?-3:0;
    const userAtk=userStrength.atk+attackBoost,userDef=userStrength.def+defenceBoost;
    const homeAtk=userHome?userAtk:oppStrength.atk, awayAtk=userHome?oppStrength.atk:userAtk;
    const homeDef=userHome?userDef:oppStrength.def, awayDef=userHome?oppStrength.def:userDef;
    const start=m.minute,end=Math.min(90,start+15);
    for(let minute=start+1;minute<=end;minute++){
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
    m.minute=end;
    const userPoss=Math.max(28,Math.min(72,Math.round(50+(userStrength.atk-oppStrength.atk)/3+(choiceKey==="استحواذ"?7:0)+(Math.random()*8-4))));
    m.homePossession=userHome?userPoss:100-userPoss;
    m.passesHome+=Math.round((end-start)*5.5*(m.homePossession/50));
    m.passesAway+=Math.round((end-start)*5.5*((100-m.homePossession)/50));
    if(m.minute===45)m.events.unshift({minute:45,text:"نهاية الشوط الأول. حان وقت تعديل الخطة."});
    if(m.minute===90){finish(f,m);return {finished:true,match:m};}
    G.save();return {finished:false,minute:m.minute,match:m};
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
    if(G.createMatchReport)G.createMatchReport(f);
    if(G.progressCompetitions)G.progressCompetitions();
    if(f.home===S.clubId||f.away===S.clubId){
      const won=(f.home===S.clubId?f.hg>f.ag:f.ag>f.hg),draw=f.hg===f.ag;
      G.me().confidence=Math.max(0,Math.min(100,G.me().confidence+(won?3:draw?0:-3)));
      S.lastMatchId=f.id;
    }
    S.liveMatch=null;G.save();
  }
  function substitute(outId,inId){
    const m=S.liveMatch;if(!m||m.status!=="live")return {error:"لا توجد مباراة مباشرة"};
    if(m.minute>=90)return {error:"انتهت المباراة ولا يمكن إجراء تبديل الآن."};
    const id=S.clubId,lineup=m.lineups&&m.lineups[id];
    if(!lineup)return {error:"تعذر العثور على تشكيلة فريقك."};
    if((m.substitutions[id]||0)>=5)return {error:"استهلكت الحد الأقصى: 5 تبديلات."};
    const out=S.players.find(p=>p.id===Number(outId)&&p.clubId===id),inn=S.players.find(p=>p.id===Number(inId)&&p.clubId===id);
    if(!out||!inn||!lineup.includes(out.id)||lineup.includes(inn.id))return {error:"اختيار التبديل غير صالح."};
    if(inn.injured||inn.suspension)return {error:"لا يمكن إشراك لاعب مصاب أو موقوف."};
    lineup[lineup.indexOf(out.id)]=inn.id;
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
  G.liveMatchEngineLoaded=true;
  G.save();
})();