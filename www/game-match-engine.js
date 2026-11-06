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
        list.forEach((p,i)=>{
          const x=reverse?100-base:base,y=(i+1)*100/(list.length+1);
          target.push({id:p.id,name:p.name,team:teamId,group,baseX:x,baseY:y,x,y});
        });
      }
    }
    m.pitch={ballX:50,ballY:50,possession:m.home,phase:"وسط الملعب",homePlayers:home,awayPlayers:away,minute:0};
  }
  function syncPitchLineups(m){
    const old=m.pitch||{};
    buildPitch(m);
    const next=m.pitch;
    for(const key of ["ballX","ballY","possession","phase","minute"]){
      if(old[key]!==undefined&&old[key]!==null)next[key]=old[key];
    }
  }
  function movePitch(m,minute,homeHasBall){
    const p=m.pitch;
    p.possession=homeHasBall?m.home:m.away;
    p.ballX=Math.max(4,Math.min(96,p.ballX+(homeHasBall?1:-1)*(4+Math.random()*13)));
    p.ballY=Math.max(8,Math.min(92,p.ballY+(Math.random()*22-11)));
    p.phase=homeHasBall?(p.ballX>=67?"الثلث الهجومي":p.ballX<=33?"الثلث الدفاعي":"وسط الملعب"):(p.ballX<=33?"الثلث الهجومي":p.ballX>=67?"الثلث الدفاعي":"وسط الملعب");
    p.minute=minute;
    for(const player of [...p.homePlayers,...p.awayPlayers]){
      const ownBall=player.team===p.possession;
      if(player.group==="GK"){
        player.x=player.baseX;
        player.y=Math.max(43,Math.min(57,50+(p.ballY-50)*.2));
        continue;
      }
      const direction=player.team===m.home?1:-1;
      const linePush=({DEF:3,MID:6,FWD:8})[player.group]||0;
      const tacticalPush=ownBall?linePush:-linePush*.55;
      const ballShift=(player.team===m.home?p.ballX-50:50-p.ballX)*.08;
      player.x=Math.max(7,Math.min(93,player.baseX+direction*tacticalPush+ballShift));
      player.y=Math.max(7,Math.min(93,player.baseY+(p.ballY-50)*.12));
    }
  }
  function playerMatchStats(m,p){
    m.playerStats=m.playerStats||{};
    const key=String(p.id);
    if(!m.playerStats[key])m.playerStats[key]={playerId:p.id,passes:0,passesCompleted:0,dribbles:0,shots:0,onTarget:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,turnovers:0};
    return m.playerStats[key];
  }
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function matchEvent(m,minute,text,extra={}){
    m.events.unshift({minute,text,...extra});
    if(m.events.length>100)m.events.length=100;
  }
  function resolveAttack(m,teamId,minute,attack,defense,userAction){
    const defendingId=teamId===m.home?m.away:m.home;
    const ids=m.lineups[teamId]||[],defIds=m.lineups[defendingId]||[];
    const players=ids.map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
    const defenders=defIds.map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
    const forwards=players.filter(p=>positionGroup(p)==="FWD"),mids=players.filter(p=>positionGroup(p)==="MID");
    const backs=defenders.filter(p=>positionGroup(p)==="DEF"||positionGroup(p)==="MID");
    const carrier=G.pick(forwards.length?forwards:mids.length?mids:players);
    const receiver=G.pick([...forwards,...mids].filter(p=>p&&p.id!==carrier?.id));
    const marker=G.pick(backs.length?backs:defenders);
    const keeper=defenders.find(p=>positionGroup(p)==="GK")||defenders[0];
    if(!carrier||!keeper)return;
    const action=userAction&&teamId===S.clubId?userAction:"";
    const defensiveAction=userAction&&defendingId===S.clubId?userAction:"";
    const attr=(p,k)=>Number(p?.attributes?.[k]??p?.ovr??60);
    const cs=playerMatchStats(m,carrier),ds=playerMatchStats(m,marker||keeper),ks=playerMatchStats(m,keeper);
    if(defensiveAction){
      const tackler=marker||keeper,ts=playerMatchStats(m,tackler);
      const tackleChance=clamp(.18+(attr(tackler,"tackling")-60)*.006+(defensiveAction==="افتكاك الكرة"?.24:defensiveAction==="ضغط على حامل الكرة"?.12:0),.08,.68);
      if(Math.random()<tackleChance){
        ts.tackles++;ts.interceptions++;
        matchEvent(m,minute,"🛡️ "+tackler.name+" ينجح في إيقاف الهجمة بعد قرارك: "+defensiveAction+".",{kind:"tackle",playerId:tackler.id,targetId:carrier.id});
        m.pitch.possession=defendingId;return;
      }
    }
    let advanced=true,assister=null;
    if(action==="مراوغة"){
      cs.dribbles++;
      const chance=clamp(.5+(attr(carrier,"dribbling")-attr(marker,"tackling"))*.006, .28,.86);
      if(Math.random()>chance){
        cs.turnovers++;ds.tackles++;ds.interceptions++;
        matchEvent(m,minute,"🛡️ "+marker.name+" ينجح في افتكاك الكرة من "+carrier.name+".",{kind:"tackle",playerId:marker.id,targetId:carrier.id});
        m.pitch.possession=defendingId;advanced=false;
      }else matchEvent(m,minute,"✨ "+carrier.name+" يتجاوز "+marker.name+" بمراوغة ناجحة.",{kind:"dribble",playerId:carrier.id,targetId:marker.id});
    }else if(action==="عرضية"){
      cs.passes++;const chance=clamp(.58+(attr(carrier,"crossing")-attr(marker,"marking"))*.005,.3,.9);
      if(Math.random()>chance){
        cs.turnovers++;ds.interceptions++;
        matchEvent(m,minute,"🛡️ "+marker.name+" يقطع عرضية "+carrier.name+".",{kind:"interception",playerId:marker.id,targetId:carrier.id});
        m.pitch.possession=defendingId;advanced=false;
      }else{
        cs.passesCompleted++;assister=carrier;
        matchEvent(m,minute,"📨 "+carrier.name+" يرسل عرضية متقنة إلى منطقة الجزاء.",{kind:"cross",playerId:carrier.id});
        const aerial=G.pick(forwards.length?forwards:players);
        if(aerial){const aerialStat=playerMatchStats(m,aerial);const duel=clamp(.48+(attr(aerial,"heading")-attr(marker,"heading"))*.006,.25,.85);
          if(Math.random()>duel){aerialStat.turnovers++;ds.interceptions++;matchEvent(m,minute,"المدافع يبعد الكرة قبل وصولها إلى "+aerial.name+".",{kind:"clearance",playerId:marker.id,targetId:aerial.id});advanced=false;}
          else{carrier=aerial;}
        }
      }
    }else if(action==="تمريرة بينية"||!action){
      cs.passes++;
      const chance=clamp(.64+(attr(carrier,"passing")-attr(marker,"positioning"))*.004+(action==="تمريرة بينية"?.12:0),.32,.92);
      if(Math.random()>chance){
        cs.turnovers++;ds.interceptions++;
        matchEvent(m,minute,"⛔ "+marker.name+" يقرأ التمريرة ويعترض الكرة من "+carrier.name+".",{kind:"interception",playerId:marker.id,targetId:carrier.id});
        m.pitch.possession=defendingId;advanced=false;
      }else{
        cs.passesCompleted++;assister=carrier;
        if(receiver)matchEvent(m,minute,action==="تمريرة بينية"?"🎯 "+carrier.name+" يخترق الدفاع بتمريرة بينية إلى "+receiver.name+".":"🔄 "+carrier.name+" يمرر الكرة إلى "+receiver.name+".",{kind:action==="تمريرة بينية"?"through-ball":"pass",playerId:carrier.id,targetId:receiver.id});
        if(receiver)carrier=receiver;
      }
    }
    if(!advanced)return;
    const shotPlayer=carrier,shotStats=playerMatchStats(m,shotPlayer),keeperSkill=attr(keeper,"goalkeeping");
    shotStats.shots++;
    if(teamId===m.home)m.homeShots++;else m.awayShots++;
    matchEvent(m,minute,"⚽ "+shotPlayer.name+" يستعد للتسديد على المرمى.",{kind:"shot",playerId:shotPlayer.id});
    const accuracy=clamp(.39+(attr(shotPlayer,"finishing")-60)*.005+(attr(shotPlayer,"shotPower")-60)*.002,.2,.88);
    if(Math.random()>accuracy){
      if(teamId===m.home){if(Math.random()<.28)m.cornersHome++;}else if(Math.random()<.28)m.cornersAway++;
      matchEvent(m,minute,"تسديدة "+shotPlayer.name+" تمر بجوار المرمى.",{kind:"shot-off-target",playerId:shotPlayer.id});
      return;
    }
    shotStats.onTarget++;
    if(teamId===m.home)m.homeOnTarget++;else m.awayOnTarget++;
    const goalChance=clamp(.25+(attr(shotPlayer,"finishing")-65)*.004+(attr(shotPlayer,"shotPower")-65)*.002-(keeperSkill-65)*.003,.055,.58);
    if(Math.random()<goalChance){
      if(teamId===m.home)m.homeGoals++;else m.awayGoals++;
      shotStats.goals++;
      if(assister&&assister.id!==shotPlayer.id)playerMatchStats(m,assister).assists++;
      matchEvent(m,minute,"🥅 هدف! "+shotPlayer.name+" يسجل بعد هجمة منظمة، والحارس "+keeper.name+" لم يتمكن من التصدي.",{kind:"goal",playerId:shotPlayer.id,assistId:assister&&assister.id||null});
    }else{
      ks.saves++;
      matchEvent(m,minute,"🧤 "+keeper.name+" يتصدى لتسديدة "+shotPlayer.name+" ويحافظ على شباكه.",{kind:"save",playerId:keeper.id,targetId:shotPlayer.id});
    }
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
      passesHome:0,passesAway:0,events:[{minute:0,text:"صافرة البداية! انطلقت المباراة."}],playerStats:{},status:"live",lastChoice:"متوازن",lineups:validatedLineups,substitutions:{},substitutionLog:[],substitutedOut:[],tactics:{[S.clubId]:{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازن"}}};
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
    let actionBoost=0,defenseBoost=0;
    const p=m.pitch||{},userHasBall=p.possession===userId;
    const userAttacking=userHasBall&&(userHome?Number(p.ballX)>=62:Number(p.ballX)<=38);
    const userDefending=!userHasBall&&(userHome?Number(p.ballX)<=38:Number(p.ballX)>=62);
    if(userAttacking&&["تسديد","تمريرة بينية","مراوغة","عرضية"].includes(choiceKey)){
      actionBoost=choiceKey==="تسديد"?.15:choiceKey==="تمريرة بينية"?.09:choiceKey==="عرضية"?.08:.06;
    }else if(userDefending&&["ضغط على حامل الكرة","تراجع دفاعي","افتكاك الكرة"].includes(choiceKey)){
      defenseBoost=choiceKey==="افتكاك الكرة"?.12:choiceKey==="ضغط على حامل الكرة"?.10:.06;
    }else if(["تسديد","تمريرة بينية","مراوغة","عرضية","ضغط على حامل الكرة","تراجع دفاعي","افتكاك الكرة"].includes(choiceKey)){
      m.events.unshift({minute:m.minute,text:"القرار "+choiceKey+" غير مناسب لموقع الكرة الحالي؛ تابع اللعب واختر قراراً مناسباً."});
    }
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
    if(!Number.isFinite(Number(m.possessionMinutes))){m.possessionMinutes=start;m.possessionHomeTotal=(Number(m.homePossession)||50)*start;}
    const possessionFactor=styleEffect.pos>0?1.12:styleEffect.pos<0?.92:1;
    for(let minute=start+1;minute<=end;minute++){
      const minuteUserPoss=Math.max(28,Math.min(72,Math.round(50+(userStrength.atk-oppStrength.atk)/3+formationEffect.pos+styleEffect.pos+pressEffect.pos+(choiceKey==="استحواذ"?7:0)-oppFormationEffect.pos-oppStyleEffect.pos-oppPressEffect.pos+(Math.random()*8-4))));
      const minuteHomePoss=userHome?minuteUserPoss:100-minuteUserPoss;
      const homeHasBall=Math.random()<minuteHomePoss/100;
      movePitch(m,minute,homeHasBall);
      const homeChance=clamp(.07+(homeAtk-awayDef)/520+(userHome?actionBoost:0)-(userHome?0:defenseBoost),.025,.24);
      const awayChance=clamp(.07+(awayAtk-homeDef)/520+(userHome?0:actionBoost)-(userHome?defenseBoost:0),.025,.24);
      const userAction=["تسديد","تمريرة بينية","مراوغة","عرضية","ضغط على حامل الكرة","تراجع دفاعي","افتكاك الكرة"].includes(choiceKey)?choiceKey:"";
      if(homeHasBall&&Math.random()<homeChance)resolveAttack(m,m.home,minute,homeAtk,awayDef,userAction);
      if(!homeHasBall&&Math.random()<awayChance)resolveAttack(m,m.away,minute,awayAtk,homeDef,userAction);
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
      const lineupIds=[...new Set([...(m.lineups&&m.lineups[id]||[]),...(m.substitutedOut||[]).filter(pid=>S.players.find(p=>p.id===pid)?.clubId===id)])];
      const starters=lineupIds.map(pid=>S.players.find(p=>p.id===pid&&p.clubId===id)).filter(Boolean);
      starters.forEach(p=>{p.apps=(p.apps||0)+1;p.form=Math.max(30,Math.min(100,(p.form||65)+G.rand(-2,4)));if(Math.random()<.008){p.injured=true;p.injuryDays=G.rand(3,20)}if(Math.random()<.025)p.suspension=Math.max(1,Number(p.suspension)||0)});
      starters.forEach(p=>{const st=m.playerStats?.[String(p.id)];if(st){p.goals=(p.goals||0)+(st.goals||0);p.assists=(p.assists||0)+(st.assists||0)}});
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
    syncPitchLineups(m);
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
