// Interactive match engine for Football Manager 2
(() => {
  const G=window.FM2;
  if(!G||G.liveMatchEngineLoaded)return;
  const S=G.state;
  const addDays=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  const dayDiff=(a,b)=>Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000));
  const ownFixture=()=>S.fixtures.filter(f=>f.status==="scheduled"&&(f.home===S.clubId||f.away===S.clubId)).sort((a,b)=>a.date.localeCompare(b.date))[0];
  function buildPitch(m){
    const home=[],away=[],formationLines={"4-4-2":[4,4,2],"4-3-3":[4,3,3],"4-2-3-1":[4,5,1],"3-5-2":[3,5,2]};
    for(const [teamId,target,reverse] of [[m.home,home,false],[m.away,away,true]]){
      const players=(m.lineups[teamId]||[]).map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
      const keeper=players.find(p=>positionGroup(p)==="GK");
      if(keeper){const x=reverse?92:8;target.push({id:keeper.id,name:keeper.name,team:teamId,group:"GK",baseX:x,baseY:50,x,y:50});}
      const outfield=players.filter(p=>positionGroup(p)!=="GK").sort((a,b)=>({DEF:0,MID:1,FWD:2}[positionGroup(a)]??1)-({DEF:0,MID:1,FWD:2}[positionGroup(b)]??1));
      const formation=m.tactics?.[teamId]?.formation||"4-4-2",lines=formationLines[formation]||formationLines["4-4-2"];
      const xs=[reverse?78:22,reverse?61:39,reverse?41:59];let cursor=0;
      lines.forEach((count,line)=>{
        const linePlayers=outfield.slice(cursor,cursor+count);cursor+=count;
        linePlayers.forEach((p,i)=>{
          const y=(i+1)*100/(linePlayers.length+1),x=xs[line];
          target.push({id:p.id,name:p.name,team:teamId,group:positionGroup(p)||"MID",baseX:x,baseY:y,x,y});
        });
      });
      outfield.slice(cursor).forEach((p,i)=>{const y=(i+1)*100/(outfield.length-cursor+1);target.push({id:p.id,name:p.name,team:teamId,group:positionGroup(p)||"MID",baseX:50,baseY:y,x:50,y});});
    }
    m.pitch={ballX:50,ballY:50,possession:m.home,ballCarrierId:null,phase:"وسط الملعب",homePlayers:home,awayPlayers:away,minute:0};
  }
  function syncPitchLineups(m){
    const old=m.pitch||{};
    buildPitch(m);
    const next=m.pitch;
    for(const key of ["ballX","ballY","possession","ballCarrierId","phase","minute","setPiece"]){
      if(old[key]!==undefined&&old[key]!==null)next[key]=old[key];
    }
    if(next.ballCarrierId&&!((next.homePlayers||[]).concat(next.awayPlayers||[]).some(p=>p.id===next.ballCarrierId)))next.ballCarrierId=null;
  }
  function positionPitchPlayers(m){
    const p=m.pitch;
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
      const width=m.tactics?.[player.team]?.width||"متوازنة";
      const widthScale=width==="واسعة"?1.22:width==="ضيقة"?.78:1;
      player.y=Math.max(5,Math.min(95,50+(player.baseY-50)*widthScale+(p.ballY-50)*.12));
    }
  }
  function movePitch(m,minute,homeHasBall){
    const p=m.pitch;
    const previousPossession=p.possession;
    p.possession=homeHasBall?m.home:m.away;
    const direction=homeHasBall?1:-1,changed=previousPossession!==p.possession;
    if(changed)p.ballCarrierId=null;
    if(!p.ballCarrierId){
      const active=(m.lineups[p.possession]||[]).map(id=>S.players.find(player=>player.id===id)).filter(Boolean);
      const options=active.filter(player=>positionGroup(player)==="MID"||positionGroup(player)==="FWD");
      const carrier=G.pick(options.length?options:active);
      p.ballCarrierId=carrier?.id||null;
    }
    const travel=changed?(4+Math.random()*5):(1+Math.random()*3);
    p.ballX=Math.max(4,Math.min(96,p.ballX+direction*travel));
    p.ballY=Math.max(8,Math.min(92,p.ballY+(Math.random()*10-5)));
    p.phase=homeHasBall?(p.ballX>=67?"الثلث الهجومي":p.ballX<=33?"الثلث الدفاعي":"وسط الملعب"):(p.ballX<=33?"الثلث الهجومي":p.ballX>=67?"الثلث الدفاعي":"وسط الملعب");
    p.minute=minute;
    positionPitchPlayers(m);
  }
  function playerMatchStats(m,p){
    m.playerStats=m.playerStats||{};
    const key=String(p.id);
    if(!m.playerStats[key])m.playerStats[key]={playerId:p.id,passes:0,passesCompleted:0,dribbles:0,shots:0,onTarget:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,turnovers:0,fouls:0,yellowCards:0,redCards:0};
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
    const ballX=Number(m.pitch?.ballX??50);
    const attackingThird=teamId===m.home?ballX>=68:ballX<=32;
    let carrier=players.find(p=>p.id===m.pitch?.ballCarrierId)||G.pick(attackingThird?(forwards.length?forwards:mids.length?mids:players):(mids.length?mids:forwards.length?forwards:players));
    const receiver=G.pick([...forwards,...mids].filter(p=>p&&p.id!==carrier?.id));
    const marker=G.pick(backs.length?backs:defenders);
    const keeper=defenders.find(p=>positionGroup(p)==="GK")||defenders[0];
    if(!carrier||!keeper)return;
    const action=userAction&&teamId===S.clubId?userAction:"";
    const defensiveAction=userAction&&defendingId===S.clubId?userAction:"";
    const attr=(p,k)=>Math.max(1,Number(p?.attributes?.[k]??p?.ovr??60)-(p?.injured?14:0));
    const cs=playerMatchStats(m,carrier),ds=playerMatchStats(m,marker||keeper),ks=playerMatchStats(m,keeper);
    const defensivePressure=defensiveAction==="تراجع دفاعي"?.12:0;
    if(defensiveAction==="افتكاك الكرة"||defensiveAction==="ضغط على حامل الكرة"){
      const tackler=marker||keeper,ts=playerMatchStats(m,tackler);
      const tackleChance=clamp(.18+(attr(tackler,"tackling")-60)*.006+(defensiveAction==="افتكاك الكرة"?.24:.12),.08,.68);
      if(Math.random()<tackleChance){
        ts.tackles++;ts.interceptions++;
        matchEvent(m,minute,"🛡️ "+tackler.name+" ينجح في إيقاف الهجمة بعد قرارك: "+defensiveAction+".",{kind:"tackle",playerId:tackler.id,targetId:carrier.id});
        m.pitch.possession=defendingId;m.pitch.ballCarrierId=tackler.id;return;
      }
    }
    // A small chance of a foul during a defensive challenge. Cards are
    // tracked per match and on the player's season record.
    if(Math.random()>.80){
      const offender=marker||keeper,offenderStats=playerMatchStats(m,offender);
      offenderStats.fouls++;
      const inArea=(teamId===m.home?ballX>=84:ballX<=16)&&Number(m.pitch.ballY||50)>=20&&Number(m.pitch.ballY||50)<=80;
      const penalty=inArea;
      matchEvent(m,minute,penalty?"🚨 مخالفة داخل منطقة الجزاء! ركلة جزاء.":"🚩 مخالفة من "+offender.name+" على "+carrier.name+"؛ ركلة حرة للفريق المنافس.",{kind:penalty?"penalty-awarded":"foul",playerId:offender.id,targetId:carrier.id});
      m.pitch.possession=teamId;m.pitch.ballCarrierId=carrier.id;
      m.pitch.setPiece={type:penalty?"penalty":"free-kick",teamId,awardedMinute:minute,direct:penalty||Math.random()<.48,takerId:carrier.id};
      if(!carrier.injured&&Math.random()<.18){
        carrier.injured=true;
        carrier.injuryDays=Math.max(Number(carrier.injuryDays)||0,G.rand(5,18));
        m.injuries=m.injuries||[];
        m.injuries.push({playerId:carrier.id,minute,days:carrier.injuryDays});
        matchEvent(m,minute,"🩹 إصابة "+carrier.name+" بعد التدخل! يعاني من إصابة متوقعة لمدة "+carrier.injuryDays+" أيام؛ يمكنك استبداله.",{kind:"injury",playerId:carrier.id,injuryDays:carrier.injuryDays});
      }
      if(Math.random()>.70){
        offenderStats.yellowCards++;
        offender.yellowCards=(Number(offender.yellowCards)||0)+1;
        if(offenderStats.yellowCards>=2){
          matchEvent(m,minute,"🟨 الإنذار الثاني لـ "+offender.name+" بعد مخالفة جديدة.",{kind:"yellow-card",playerId:offender.id,second:true});
          offenderStats.redCards++;
          offender.redCards=(Number(offender.redCards)||0)+1;
          offender.suspension=Math.max(2,Number(offender.suspension)||0);
          // Count the dismissal minute and its exertion before removing the player.
          m.playerMinutes=m.playerMinutes||{};
          m.playerMinutes[offender.id]=(Number(m.playerMinutes[offender.id])||0)+1;
          const offenderPressing=m.tactics?.[defendingId]?.pressing||"متوسط";
          const offenderFatigueRate=offenderPressing==="عالٍ"?2.1:offenderPressing==="منخفض"?.35:.8;
          offender.fatigue=Math.min(100,(Number(offender.fatigue)||0)+offenderFatigueRate);
          m.sentOff=m.sentOff||[];
          if(!m.sentOff.includes(offender.id))m.sentOff.push(offender.id);
          m.lineups[defendingId]=(m.lineups[defendingId]||[]).filter(id=>id!==offender.id);
          matchEvent(m,minute,"🟥 بطاقة حمراء! "+offender.name+" يُطرد بعد إنذار ثانٍ، وفريقه يكمل المباراة بعشرة لاعبين.",{kind:"red-card",playerId:offender.id});
          syncPitchLineups(m);
        }else{
          matchEvent(m,minute,"🟨 بطاقة صفراء لـ "+offender.name+" بسبب التدخل على "+carrier.name+".",{kind:"yellow-card",playerId:offender.id});
        }
      }
      return;
    }
    // Outside the attacking third, resolve build-up play first; shots are only
    // possible after the ball has progressed into the opponent's final third.
    if(!attackingThird){
      const buildMarker=marker||keeper;
      const buildAction=action==="مراوغة"?"مراوغة":action==="تمريرة بينية"?"تمريرة بينية":"تمرير";
      if(buildAction==="مراوغة"){
        cs.dribbles++;
        const dribbleChance=clamp(.48+(attr(carrier,"dribbling")-attr(buildMarker,"tackling"))*.006,.25,.84);
        if(Math.random()>dribbleChance){
          cs.turnovers++;ds.tackles++;
          m.pitch.possession=defendingId;m.pitch.ballCarrierId=buildMarker.id;
          matchEvent(m,minute,"🛡️ "+buildMarker.name+" يوقف تقدم "+carrier.name+" قبل الوصول إلى الثلث الهجومي.",{kind:"tackle",playerId:buildMarker.id,targetId:carrier.id});
          return;
        }
        matchEvent(m,minute,"✨ "+carrier.name+" يتجاوز لاعباً ويتقدم بالكرة نحو الثلث الهجومي.",{kind:"dribble",playerId:carrier.id,targetId:buildMarker.id});
      }else{
        cs.passes++;
        const passChance=clamp(.61+(attr(carrier,"passing")-attr(buildMarker,"positioning"))*.004+(buildAction==="تمريرة بينية"?.1:0),.3,.91);
        if(Math.random()>passChance){
          cs.turnovers++;ds.interceptions++;
          m.pitch.possession=defendingId;m.pitch.ballCarrierId=buildMarker.id;
          matchEvent(m,minute,"⛔ "+buildMarker.name+" يقطع محاولة بناء اللعب من "+carrier.name+".",{kind:"interception",playerId:buildMarker.id,targetId:carrier.id});
          return;
        }
        cs.passesCompleted++;
        if(teamId===m.home)m.passesHome++;else m.passesAway++;
        if(receiver){
          matchEvent(m,minute,buildAction==="تمريرة بينية"?"🎯 "+carrier.name+" يرسل تمريرة بينية إلى "+receiver.name+" لتجاوز خط الوسط.":"🔄 "+carrier.name+" يمرر إلى "+receiver.name+" لبناء الهجمة.",{kind:buildAction==="تمريرة بينية"?"through-ball":"pass",playerId:carrier.id,targetId:receiver.id});
        }else{
          matchEvent(m,minute,"🔄 "+carrier.name+" يحتفظ بالكرة ويتقدم بها نحو الثلث الهجومي.",{kind:"build-up",playerId:carrier.id});
        }
      }
      const progress=buildAction==="تمريرة بينية"?15:buildAction==="مراوغة"?12:10;
      m.pitch.ballX=clamp(ballX+(teamId===m.home?1:-1)*(progress+Math.random()*4),4,96);
      m.pitch.ballY=clamp(Number(m.pitch.ballY||50)+(Math.random()*12-6),8,92);
      m.pitch.possession=teamId;m.pitch.ballCarrierId=(receiver||carrier).id;
      m.pitch.phase=(teamId===m.home?m.pitch.ballX>=68:m.pitch.ballX<=32)?"الثلث الهجومي":(teamId===m.home?m.pitch.ballX<=32:m.pitch.ballX>=68)?"الثلث الدفاعي":"وسط الملعب";
      return;
    }
    let advanced=true,assister=null;
    if(action==="مراوغة"){
      cs.dribbles++;
      const chance=clamp(.5+(attr(carrier,"dribbling")-attr(marker,"tackling"))*.006, .28,.86);
      if(Math.random()>chance){
        cs.turnovers++;ds.tackles++;ds.interceptions++;
        matchEvent(m,minute,"🛡️ "+marker.name+" ينجح في افتكاك الكرة من "+carrier.name+".",{kind:"tackle",playerId:marker.id,targetId:carrier.id});
        m.pitch.possession=defendingId;m.pitch.ballCarrierId=marker.id;advanced=false;
      }else matchEvent(m,minute,"✨ "+carrier.name+" يتجاوز "+marker.name+" بمراوغة ناجحة.",{kind:"dribble",playerId:carrier.id,targetId:marker.id});
    }else if(action==="عرضية"){
      cs.passes++;const chance=clamp(.58+(attr(carrier,"crossing")-attr(marker,"marking"))*.005,.3,.9);
      if(Math.random()>chance){
        cs.turnovers++;ds.interceptions++;
        matchEvent(m,minute,"🛡️ "+marker.name+" يقطع عرضية "+carrier.name+".",{kind:"interception",playerId:marker.id,targetId:carrier.id});
        m.pitch.possession=defendingId;m.pitch.ballCarrierId=marker.id;advanced=false;
      }else{
        cs.passesCompleted++;if(teamId===m.home)m.passesHome++;else m.passesAway++;assister=carrier;
        matchEvent(m,minute,"📨 "+carrier.name+" يرسل عرضية متقنة إلى منطقة الجزاء.",{kind:"cross",playerId:carrier.id});
        const aerial=G.pick(forwards.length?forwards:players);
        if(aerial){const aerialStat=playerMatchStats(m,aerial);const duel=clamp(.48+(attr(aerial,"heading")-attr(marker,"heading"))*.006,.25,.85);
          if(Math.random()>duel){aerialStat.turnovers++;ds.interceptions++;m.pitch.ballCarrierId=marker.id;matchEvent(m,minute,"المدافع يبعد الكرة قبل وصولها إلى "+aerial.name+".",{kind:"clearance",playerId:marker.id,targetId:aerial.id});advanced=false;}
          else{carrier=aerial;m.pitch.ballCarrierId=aerial.id;}
        }
      }
    }else if(action==="تمريرة بينية"||!action){
      cs.passes++;
      const chance=clamp(.64+(attr(carrier,"passing")-attr(marker,"positioning"))*.004+(action==="تمريرة بينية"?.12:0),.32,.92);
      if(Math.random()>chance){
        cs.turnovers++;ds.interceptions++;
        matchEvent(m,minute,"⛔ "+marker.name+" يقرأ التمريرة ويعترض الكرة من "+carrier.name+".",{kind:"interception",playerId:marker.id,targetId:carrier.id});
        m.pitch.possession=defendingId;m.pitch.ballCarrierId=marker.id;advanced=false;
      }else{
        cs.passesCompleted++;if(teamId===m.home)m.passesHome++;else m.passesAway++;assister=carrier;
        if(receiver)matchEvent(m,minute,action==="تمريرة بينية"?"🎯 "+carrier.name+" يخترق الدفاع بتمريرة بينية إلى "+receiver.name+".":"🔄 "+carrier.name+" يمرر الكرة إلى "+receiver.name+".",{kind:action==="تمريرة بينية"?"through-ball":"pass",playerId:carrier.id,targetId:receiver.id});
        if(receiver){carrier=receiver;m.pitch.ballCarrierId=receiver.id;}
      }
    }
    if(!advanced)return;
    const shotPlayer=carrier,shotStats=playerMatchStats(m,shotPlayer),keeperSkill=attr(keeper,"goalkeeping");
    m.pitch.ballCarrierId=shotPlayer.id;
    shotStats.shots++;
    if(teamId===m.home)m.homeShots++;else m.awayShots++;
    matchEvent(m,minute,"⚽ "+shotPlayer.name+" يستعد للتسديد على المرمى.",{kind:"shot",playerId:shotPlayer.id});
    const accuracy=clamp(.39+(attr(shotPlayer,"finishing")-60)*.005+(attr(shotPlayer,"shotPower")-60)*.002-defensivePressure,.2,.88);
    if(Math.random()>accuracy){
      matchEvent(m,minute,"تسديدة "+shotPlayer.name+" تمر خارج المرمى، وتتحول الكرة إلى ضربة مرمى.",{kind:"shot-off-target",playerId:shotPlayer.id});
      m.pitch.possession=defendingId;m.pitch.ballCarrierId=keeper.id;
      m.pitch.ballX=teamId===m.home?92:8;
      m.pitch.phase=teamId===m.home?"الثلث الدفاعي":"الثلث الدفاعي";
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
      // Restart from the centre with the conceding team in possession.
      m.pitch.possession=defendingId;m.pitch.ballCarrierId=null;m.pitch.ballX=50;m.pitch.ballY=50;m.pitch.phase="وسط الملعب";
    }else{
      ks.saves++;
      matchEvent(m,minute,"🧤 "+keeper.name+" يتصدى لتسديدة "+shotPlayer.name+" ويحافظ على شباكه.",{kind:"save",playerId:keeper.id,targetId:shotPlayer.id});
      const corner=Math.random()<.18;
      if(corner){
        if(teamId===m.home)m.cornersHome++;else m.cornersAway++;
        matchEvent(m,minute,"🚩 ركنية للفريق المهاجم بعد إبعاد الحارس للكرة.",{kind:"corner",teamId});
        m.pitch.possession=teamId;m.pitch.ballCarrierId=null;m.pitch.ballX=teamId===m.home?96:4;m.pitch.phase="الثلث الهجومي";
        m.pitch.setPiece={type:"corner",teamId,awardedMinute:minute};
      }else{
        m.pitch.possession=defendingId;m.pitch.ballCarrierId=keeper.id;m.pitch.ballX=teamId===m.home?92:8;m.pitch.phase="الثلث الدفاعي";
      }
    }
  }

  function resolveSetPiece(m,minute){
    const sp=m.pitch&&m.pitch.setPiece;
    if(!sp)return false;
    m.pitch.setPiece=null;
    const teamId=sp.teamId,defendingId=teamId===m.home?m.away:m.home;
    const players=(m.lineups[teamId]||[]).map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
    const defenders=(m.lineups[defendingId]||[]).map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
    const taker=players.find(p=>p.id===sp.takerId)||G.pick(players);
    const target=G.pick(players.filter(p=>p.id!==taker?.id&&(positionGroup(p)==="FWD"||positionGroup(p)==="MID")));
    const keeper=defenders.find(p=>positionGroup(p)==="GK")||defenders[0];
    if(!taker||!keeper){m.pitch.possession=defendingId;m.pitch.ballCarrierId=keeper?.id||null;return true;}
    const ts=playerMatchStats(m,taker),ks=playerMatchStats(m,keeper);
    const attr=(p,k)=>Number(p?.attributes?.[k]??p?.ovr??60);
    if(sp.type==="penalty"){
      ts.shots++;ts.onTarget++;
      if(teamId===m.home){m.homeShots++;m.homeOnTarget++;}else{m.awayShots++;m.awayOnTarget++;}
      const scored=Math.random()<clamp(.72+(attr(taker,"finishing")-65)*.003-(attr(keeper,"goalkeeping")-65)*.002,.58,.88);
      if(scored){if(teamId===m.home)m.homeGoals++;else m.awayGoals++;ts.goals++;matchEvent(m,minute,"🥅 ركلة جزاء ناجحة! "+taker.name+" يسجل.",{kind:"penalty-goal",playerId:taker.id});}
      else{ks.saves++;matchEvent(m,minute,"🧤 الحارس "+keeper.name+" يتصدى لركلة الجزاء!",{kind:"penalty-save",playerId:keeper.id,targetId:taker.id});}
      m.pitch.possession=defendingId;m.pitch.ballCarrierId=scored?null:keeper.id;m.pitch.ballX=50;m.pitch.ballY=50;m.pitch.phase="وسط الملعب";
      return true;
    }
    if(sp.type==="corner"){
      matchEvent(m,minute,"🚩 "+taker.name+" ينفذ الركنية ويرسل الكرة إلى منطقة الجزاء.",{kind:"corner-kick",teamId,playerId:taker.id});
      const aerial=target||taker,marker=G.pick(defenders.filter(p=>positionGroup(p)==="DEF"))||keeper;
      const won=Math.random()<clamp(.48+(attr(aerial,"heading")-attr(marker,"heading"))*.006,.25,.82);
      if(won){
        const as=playerMatchStats(m,aerial);as.shots++;as.onTarget++;
        if(teamId===m.home){m.homeShots++;m.homeOnTarget++;}else{m.awayShots++;m.awayOnTarget++;}
        if(Math.random()<clamp(.13+(attr(aerial,"heading")-65)*.004-(attr(keeper,"goalkeeping")-65)*.002,.04,.32)){
          if(teamId===m.home)m.homeGoals++;else m.awayGoals++;as.goals++;
          matchEvent(m,minute,"⚽ هدف من الركنية! "+aerial.name+" يسجل برأسية.",{kind:"corner-goal",playerId:aerial.id});
          m.pitch.possession=defendingId;m.pitch.ballCarrierId=null;m.pitch.ballX=50;m.pitch.ballY=50;
        }else{ks.saves++;matchEvent(m,minute,"🧤 "+keeper.name+" يتصدى للرأسية.",{kind:"corner-save",playerId:keeper.id,targetId:aerial.id});m.pitch.possession=defendingId;m.pitch.ballCarrierId=keeper.id;}
      }else{matchEvent(m,minute,"🛡️ الدفاع يبعد الركنية قبل وصولها للمهاجم.",{kind:"corner-clearance",playerId:marker?.id||null});m.pitch.possession=defendingId;m.pitch.ballCarrierId=marker?.id||keeper.id;}
      return true;
    }
    matchEvent(m,minute,"🎯 "+taker.name+" ينفذ الركلة الحرة.",{kind:"free-kick",playerId:taker.id});
    if(sp.direct!==false){
      ts.shots++;if(teamId===m.home)m.homeShots++;else m.awayShots++;
      if(Math.random()<clamp(.38+(attr(taker,"finishing")-65)*.004,.2,.68)){
        ts.onTarget++;if(teamId===m.home)m.homeOnTarget++;else m.awayOnTarget++;
        if(Math.random()<clamp(.12+(attr(taker,"finishing")-65)*.003-(attr(keeper,"goalkeeping")-65)*.002,.035,.28)){
          if(teamId===m.home)m.homeGoals++;else m.awayGoals++;ts.goals++;
          matchEvent(m,minute,"🥅 هدف رائع من ركلة حرة مباشرة! "+taker.name+" يسجل.",{kind:"free-kick-goal",playerId:taker.id});
          m.pitch.possession=defendingId;m.pitch.ballCarrierId=null;m.pitch.ballX=50;m.pitch.ballY=50;
        }else{ks.saves++;matchEvent(m,minute,"🧤 "+keeper.name+" يتصدى للركلة الحرة.",{kind:"free-kick-save",playerId:keeper.id});m.pitch.possession=defendingId;m.pitch.ballCarrierId=keeper.id;}
      }else{matchEvent(m,minute,"الركلة الحرة تمر خارج المرمى.",{kind:"free-kick-wide",playerId:taker.id});m.pitch.possession=defendingId;m.pitch.ballCarrierId=keeper.id;}
    }else{matchEvent(m,minute,"📨 "+taker.name+" يرسل الركلة الحرة إلى منطقة الجزاء.",{kind:"free-kick-cross",playerId:taker.id});m.pitch.possession=teamId;m.pitch.ballCarrierId=target?.id||taker.id;m.pitch.ballX=teamId===m.home?84:16;m.pitch.phase="الثلث الهجومي";}
    return true;
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
      homeShots:0,awayShots:0,homeOnTarget:0,awayOnTarget:0,homePossession:50,possessionHomeTotal:0,possessionMinutes:0,cornersHome:0,cornersAway:0,stoppage:{first:G.rand(1,4),second:G.rand(2,5)},injuries:[],
      passesHome:0,passesAway:0,playerMinutes:{},events:[{minute:0,text:"صافرة البداية! انطلقت المباراة."}],playerStats:{},status:"live",lastChoice:"متوازن",lineups:validatedLineups,substitutions:{},substitutionLog:[],substitutedOut:[],sentOff:[],tactics:{[S.clubId]:{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازن"}}};
    const m=S.liveMatch;
    const opponentId=f.home===S.clubId?f.away:f.home;
    m.tactics[opponentId]={formation:(G.club(opponentId).formation||"4-4-2"),style:"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
    buildPitch(m);
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
    const userAttacking=userHasBall&&(userHome?Number(p.ballX)>=68:Number(p.ballX)<=32);
    const userDefending=!userHasBall&&(userHome?Number(p.ballX)<=32:Number(p.ballX)>=68);
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
      syncPitchLineups(m);
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
    const opponentPlayers=(m.lineups[oppId]||[]).map(pid=>S.players.find(p=>p.id===pid)).filter(Boolean);
    const opponentAverageFatigue=opponentPlayers.length?opponentPlayers.reduce((n,p)=>n+(Number(p.fatigue)||0),0)/opponentPlayers.length:0;
    const opponentFatiguePenalty=Math.min(5,opponentAverageFatigue/18);
    const opponentManpowerPenalty=Math.max(0,11-(m.lineups[oppId]||[]).length)*5;
    const oppStrength={atk:rawOppStrength.atk+oppFormationEffect.atk+oppStyleEffect.atk+oppPressEffect.atk+oppLineEffect.atk+oppWidthEffect.atk-opponentFatiguePenalty-opponentManpowerPenalty,def:rawOppStrength.def+oppFormationEffect.def+oppStyleEffect.def+oppPressEffect.def+oppLineEffect.def+oppWidthEffect.def-opponentFatiguePenalty-opponentManpowerPenalty};
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
    const userManpowerPenalty=Math.max(0,11-(m.lineups[userId]||[]).length)*5;
    const userAtk=userStrength.atk+mentalityAtk+formationEffect.atk+styleEffect.atk+pressEffect.atk+lineEffect.atk+widthEffect.atk-fatiguePenalty-userManpowerPenalty;
    const userDef=userStrength.def+mentalityDef+formationEffect.def+styleEffect.def+pressEffect.def+lineEffect.def+widthEffect.def-fatiguePenalty*.55-userManpowerPenalty;
    const homeAtk=userHome?userAtk:oppStrength.atk, awayAtk=userHome?oppStrength.atk:userAtk;
    const homeDef=userHome?userDef:oppStrength.def, awayDef=userHome?oppStrength.def:userDef;
    const start=m.minute,requestedMinutes=Math.max(1,Math.min(15,Math.floor(Number(minutes)||1))),firstEnd=45+(m.stoppage?.first||0),finalEnd=90+(m.stoppage?.second||0),periodEnd=start<firstEnd?firstEnd:finalEnd,end=Math.min(periodEnd,start+requestedMinutes);
    if(!Number.isFinite(Number(m.possessionMinutes))){m.possessionMinutes=start;m.possessionHomeTotal=(Number(m.homePossession)||50)*start;}
    for(let minute=start+1;minute<=end;minute++){
      if(m.pitch&&m.pitch.setPiece){
        const setPieceTeam=m.pitch.setPiece.teamId;
        m.pitch.possession=setPieceTeam;
        resolveSetPiece(m,minute);
        m.playerMinutes=m.playerMinutes||{};
        [m.home,m.away].forEach(teamId=>{
          const pressing=m.tactics?.[teamId]?.pressing||"متوسط";
          const rate=pressing==="عالٍ"?2.1:pressing==="منخفض"?.35:.8;
          (m.lineups[teamId]||[]).forEach(pid=>{m.playerMinutes[pid]=(Number(m.playerMinutes[pid])||0)+1;const pl=S.players.find(p=>p.id===pid);if(pl)pl.fatigue=Math.min(100,(Number(pl.fatigue)||0)+rate);});
        });
        m.possessionMinutes++;m.possessionHomeTotal+=setPieceTeam===m.home?100:0;
        m.homePossession=Math.round(m.possessionHomeTotal/m.possessionMinutes);
        positionPitchPlayers(m);
        continue;
      }
      const minuteUserPoss=Math.max(28,Math.min(72,Math.round(50+(userStrength.atk-oppStrength.atk)/3+formationEffect.pos+styleEffect.pos+pressEffect.pos+(choiceKey==="استحواذ"?7:0)-oppFormationEffect.pos-oppStyleEffect.pos-oppPressEffect.pos+(Math.random()*8-4))));
      const minuteHomePoss=userHome?minuteUserPoss:100-minuteUserPoss;
      // Keep the current carrier team unless pressure or a failed action causes a turnover.
      const currentHome=m.pitch.possession===m.home;
      const expectedAgainst=currentHome?100-minuteHomePoss:minuteHomePoss;
      const opponentPress=currentHome?ai.pressing:tactics.pressing;
      const pressBonus=opponentPress==="عالٍ"?.045:opponentPress==="منخفض"?-.015:0;
      const possessionTeam=currentHome?m.home:m.away;
      const possessionTactics=m.tactics[possessionTeam]||{};
      const styleRetention=possessionTactics.style==="استحواذ"?-.055:possessionTactics.style==="لعب مباشر"?.035:possessionTactics.style==="مرتدات"?.015:0;
      const formationRetention=({"4-4-2":0,"4-3-3":-.02,"4-2-3-1":-.012,"3-5-2":-.004})[possessionTactics.formation]||0;
      const turnoverChance=clamp(.075+expectedAgainst*.0012+pressBonus+styleRetention+formationRetention,.035,.28);
      const homeHasBall=Math.random()<(currentHome?1-turnoverChance:turnoverChance);
      movePitch(m,minute,homeHasBall);
      const homeChance=clamp(.07+(homeAtk-awayDef)/520+(userHome?actionBoost:0)-(userHome?0:defenseBoost),.025,.24);
      const awayChance=clamp(.07+(awayAtk-homeDef)/520+(userHome?0:actionBoost)-(userHome?defenseBoost:0),.025,.24);
      const userAction=["تسديد","تمريرة بينية","مراوغة","عرضية","ضغط على حامل الكرة","تراجع دفاعي","افتكاك الكرة"].includes(choiceKey)?choiceKey:"";
      if(homeHasBall&&Math.random()<homeChance)resolveAttack(m,m.home,minute,homeAtk,awayDef,userAction);
      if(!homeHasBall&&Math.random()<awayChance)resolveAttack(m,m.away,minute,awayAtk,homeDef,userAction);
      // Count the team that actually controlled the ball this minute,
      // not the pre-match probability estimate used by the turnover model.
      m.possessionHomeTotal+=homeHasBall?100:0;
      m.playerMinutes=m.playerMinutes||{};
      [m.home,m.away].forEach(teamId=>{
        const pressing=m.tactics?.[teamId]?.pressing||"متوسط";
        const fatigueRate=pressing==="عالٍ"?2.1:pressing==="منخفض"?.35:.8;
        (m.lineups[teamId]||[]).forEach(pid=>{
          m.playerMinutes[pid]=(Number(m.playerMinutes[pid])||0)+1;
          const player=S.players.find(p=>p.id===pid);
          if(player)player.fatigue=Math.min(100,(Number(player.fatigue)||0)+fatigueRate);
        });
      });
      m.possessionMinutes++;
      m.homePossession=Math.round(m.possessionHomeTotal/m.possessionMinutes);
      positionPitchPlayers(m);
      if(minute%3===0&&!m.events.some(e=>e.minute===minute)){
        const possessionTeam=homeHasBall?m.home:m.away;
        const active=(m.lineups[possessionTeam]||[]).map(id=>S.players.find(p=>p.id===id)).filter(Boolean);
        const carriers=active.filter(p=>positionGroup(p)==="MID"||positionGroup(p)==="FWD");
        const narrator=G.pick(carriers.length?carriers:active);
        if(narrator){
          const teamName=G.club(possessionTeam)?.short||"الفريق";
          const phase=m.pitch.phase||"وسط الملعب";
          const line=phase==="الثلث الهجومي"?"يتقدم "+narrator.name+" بالكرة نحو منطقة الجزاء ويبحث عن خيار هجومي.":
            phase==="الثلث الدفاعي"?"يتراجع "+narrator.name+" للمساندة ويحاول فريقه الخروج بالكرة.":
            "يتبادل "+teamName+" التمريرات في وسط الملعب، والكرة مع "+narrator.name+".";
          matchEvent(m,minute,"🎙️ "+line,{kind:"commentary",playerId:narrator.id});
        }
      }
    }
    m.minute=end;
    if(start<45&&m.minute>=45&&start<45)m.events.unshift({minute:45,text:"⏱️ الحكم يعلن "+(m.stoppage?.first||0)+" دقائق وقتاً بدل ضائع للشوط الأول."});
    const halfTime=m.minute===firstEnd&&start<firstEnd;
    if(halfTime)m.events.unshift({minute:m.minute,text:"⏸️ نهاية الشوط الأول بعد الوقت بدل الضائع. حان وقت الاستراحة وتعديل الخطة."});
    if(m.minute===finalEnd){m.events.unshift({minute:m.minute,text:"🏁 صافرة النهاية بعد احتساب "+(m.stoppage?.second||0)+" دقائق وقتاً بدل ضائع."});finish(f,m);return {finished:true,match:m};}
    G.save();return {finished:false,halfTime,minute:m.minute,match:m};
  }
  function finish(f,m){
    f.hg=m.homeGoals;f.ag=m.awayGoals;f.status="played";f.weather="أجواء ملعب";
    const home=G.club(f.home),away=G.club(f.away);
    const attendance=Math.round((home.capacity||30000)*Math.max(.35,Math.min(.95,.55+(home.confidence||60)/250+(S.mediaReputation||50)/600-(home.ticket||10)/180)));
    G.transaction(home.id,(home.ticket||10)*attendance,"مداخيل مباراة تفاعلية");
    const suspendedBefore=new Set(S.players.filter(p=>(p.clubId===home.id||p.clubId===away.id)&&Number(p.suspension)>0).map(p=>p.id));
    [[home.id,m.homeGoals],[away.id,m.awayGoals]].forEach(([id,goals])=>{
      const lineupIds=[...new Set([...(m.lineups&&m.lineups[id]||[]),...(m.substitutedOut||[]).filter(pid=>S.players.find(p=>p.id===pid)?.clubId===id),...(m.sentOff||[]).filter(pid=>S.players.find(p=>p.id===pid)?.clubId===id)])];
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
    if(m.minute>=90+(m.stoppage?.second||0))return {error:"انتهت المباراة ولا يمكن تعديل التكتيك الآن."};
    const allowed={formation:["4-4-2","4-3-3","4-2-3-1","3-5-2"],style:["متوازن","استحواذ","مرتدات","لعب مباشر","الأطراف"],pressing:["منخفض","متوسط","عالٍ"],defensiveLine:["متأخرة","متوسطة","متقدمة"],width:["متوازنة","واسعة","ضيقة"]};
    if(!allowed[key]||!allowed[key].includes(value))return {error:"الخيار التكتيكي غير صالح."};
    m.tactics=m.tactics||{};
    m.tactics[S.clubId]=m.tactics[S.clubId]||{formation:G.me().formation||"4-4-2",style:G.me().tactic||"متوازن",pressing:"متوسط",defensiveLine:"متوسطة",width:"متوازنة"};
    if(m.tactics[S.clubId][key]===value)return {success:true,unchanged:true};
    m.tactics[S.clubId][key]=value;
    syncPitchLineups(m);
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
    if(m.minute>=90+(m.stoppage?.second||0))return {error:"انتهت المباراة ولا يمكن إجراء تبديل الآن."};
    const id=S.clubId,lineup=m.lineups&&m.lineups[id];
    if(!lineup)return {error:"تعذر العثور على تشكيلة فريقك."};
    if((m.substitutions[id]||0)>=5)return {error:"استهلكت الحد الأقصى: 5 تبديلات."};
    const out=S.players.find(p=>p.id===Number(outId)&&p.clubId===id),inn=S.players.find(p=>p.id===Number(inId)&&p.clubId===id);
    if(!out||!inn||!lineup.includes(out.id)||lineup.includes(inn.id))return {error:"اختيار التبديل غير صالح."};
    if((m.sentOff||[]).includes(inn.id))return {error:"لا يمكن إعادة لاعب طُرد بالبطاقة الحمراء إلى المباراة."};
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
