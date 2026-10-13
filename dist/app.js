
(function () {
  "use strict";
  const bank = window.EXAM_BANK || [];
  const passages = window.EXAM_PASSAGES || {};
  const labels = {grammar:"????????",vocabulary:"???????",dialogue:"???????",reading:"Reading"};
  const letters = ["A","B","C","D"];
  const $ = function (id) { return document.getElementById(id); };
  const screens = {start:$("start-screen"),exam:$("exam-screen"),result:$("result-screen")};
  let attempt = null;
  let timerId = null;

  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }
  function shuffle(list) {
    const a = list.slice();
    for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function sample(list, n) { return shuffle(list).slice(0,n); }
  function showScreen(key) {
    Object.keys(screens).forEach(function(k){screens[k].hidden=(k!==key);});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function makeExam() {
    const g=sample(bank.filter(function(q){return q.type==="grammar";}),22);
    const v=sample(bank.filter(function(q){return q.type==="vocabulary";}),8);
    const d=sample(bank.filter(function(q){return q.type==="dialogue";}),10);
    const groupIds=shuffle(Object.keys(passages)).slice(0,2);
    const units=g.concat(v,d).map(function(q){return {questions:[q]};});
    groupIds.forEach(function(pid){
      units.push({questions:shuffle(bank.filter(function(q){return q.type==="reading"&&q.passageId===pid;}))});
    });
    return shuffle(units).reduce(function(all,unit){return all.concat(unit.questions);},[]);
  }
  function startExam() {
    const duration=Number($("duration-select").value)||60;
    attempt={questions:makeExam(),answers:Object.create(null),flags:new Set(),duration:duration,secondsLeft:duration*60,startedAt:Date.now(),finishedAt:null};
    $("exam-number").textContent=String(attempt.questions.length);
    renderTest();
    showScreen("exam");
    tick();
    clearInterval(timerId);
    timerId=setInterval(tick,1000);
  }
  function timeText(seconds) {
    const m=Math.floor(Math.max(0,seconds)/60), s=Math.max(0,seconds)%60;
    return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
  }
  function tick() {
    if (!attempt) return;
    $("timer").textContent=timeText(attempt.secondsLeft);
    $("timer-box").classList.toggle("timer-urgent",attempt.secondsLeft<=300);
    if (attempt.secondsLeft<=0) { attempt.secondsLeft=0; finishExam(true); return; }
    attempt.secondsLeft-=1;
  }
  function makePassage(p, review) {
    const box=node("article","passage-card");
    const head=node("div","passage-heading");
    head.appendChild(node("span","passage-label","READING PASSAGE"));
    head.appendChild(node("h3","",p.title));
    box.appendChild(head);
    box.appendChild(node("p","passage-text",p.text));
    if (review) {
      const details=node("details","translation");
      details.appendChild(node("summary","","??????????????"));
      details.appendChild(node("p","",p.translation));
      box.appendChild(details);
    }
    return box;
  }
  function makeQuestion(q,index,review) {
    const card=node("article","question-card"+(review?(attempt.answers[q.id]===q.answer?" review-correct":" review-wrong"):""));
    card.id="question-card-"+index;
    const top=node("div","question-top");
    const title=node("span","question-number","??? "+(index+1));
    const topic=node("span","topic-pill",q.topic);
    top.append(title,topic);
    if (!review) {
      const flag=node("button","flag-button"+(attempt.flags.has(q.id)?" is-flagged":""),attempt.flags.has(q.id)?"???????????":"????????????");
      flag.type="button"; flag.setAttribute("aria-pressed",attempt.flags.has(q.id)?"true":"false");
      flag.addEventListener("click",function(){if(attempt.flags.has(q.id))attempt.flags.delete(q.id);else attempt.flags.add(q.id);renderNav();renderProgress();renderTest();const target=$("question-card-"+index);if(target)target.scrollIntoView({block:"nearest"});});
      top.appendChild(flag);
    } else {
      const status=attempt.answers[q.id]===q.answer?"√ ???????":"? ????????";
      top.appendChild(node("span","answer-status",status));
    }
    card.appendChild(top);
    card.appendChild(node("h3","question-prompt",q.stem));
    const options=node("div",review?"review-options":"answer-options");
    q.options.forEach(function(opt,i){
      const choice=node(review?"div":"label","option"+(review?(i===q.answer?" option-correct":(i===attempt.answers[q.id]?" option-incorrect":"")):""));
      if (!review) {
        const radio=document.createElement("input"); radio.type="radio"; radio.name="question-"+q.id; radio.value=String(i);
        radio.checked=attempt.answers[q.id]===i;
        radio.addEventListener("change",function(){attempt.answers[q.id]=i;renderNav();renderProgress();});
        choice.appendChild(radio);
      }
      choice.appendChild(node("span","option-letter",letters[i]));
      choice.appendChild(node("span","option-text",opt));
      if (review&&i===q.answer) choice.appendChild(node("span","choice-mark","????"));
      if (review&&i===attempt.answers[q.id]&&i!==q.answer) choice.appendChild(node("span","choice-mark","???????????"));
      options.appendChild(choice);
    });
    card.appendChild(options);
    if (review) {
      const explain=node("div","explanation");
      explain.appendChild(node("strong","","???????????????????"));
      explain.appendChild(node("p","",q.explanation));
      card.appendChild(explain);
      const details=node("details","translation");
      details.appendChild(node("summary","","??????????????"));
      details.appendChild(node("p","",q.translation));
      card.appendChild(details);
    }
    return card;
  }
  function renderTest() {
    const list=$("question-list"); list.replaceChildren();
    let lastPassage="";
    attempt.questions.forEach(function(q,i){
      if(q.passageId&&q.passageId!==lastPassage){list.appendChild(makePassage(passages[q.passageId],false));lastPassage=q.passageId;}
      if(!q.passageId)lastPassage="";
      list.appendChild(makeQuestion(q,i,false));
    });
    renderNav(); renderProgress();
  }
  function renderNav() {
    const nav=$("question-nav"); nav.replaceChildren();
    attempt.questions.forEach(function(q,i){
      const b=node("button","nav-question"+(attempt.answers[q.id]!==undefined?" is-answered":"")+(attempt.flags.has(q.id)?" is-flagged":"") ,String(i+1));
      b.type="button"; b.setAttribute("aria-label","????? "+(i+1)+(attempt.answers[q.id]!==undefined?", ???????":""));
      b.addEventListener("click",function(){const target=$("question-card-"+i);if(target)target.scrollIntoView({behavior:"smooth",block:"center"});});
      nav.appendChild(b);
    });
    $("flagged-count").textContent="??????? "+attempt.flags.size;
  }
  function renderProgress() {
    const done=Object.keys(attempt.answers).length;
    const pct=Math.round(done/attempt.questions.length*100);
    $("answered-count").textContent="??????? "+done+" / "+attempt.questions.length;
    $("progress-percent").textContent=pct+"%";
    $("progress-fill").style.width=pct+"%";
  }
  function finishExam(auto) {
    if(!attempt||attempt.finishedAt)return;
    const unanswered=attempt.questions.length-Object.keys(attempt.answers).length;
    if(!auto&&unanswered>0&&!window.confirm("???????????? "+unanswered+" ??? ??????????????????????"))return;
    clearInterval(timerId);
    attempt.finishedAt=Date.now();
    renderResults(auto);
    showScreen("result");
  }
  function renderResults(auto) {
    const qs=attempt.questions;
    const correct=qs.filter(function(q){return attempt.answers[q.id]===q.answer;}).length;
    const pct=Math.round(correct/qs.length*100);
    $("score-number").textContent=String(correct);
    $("score-ring").style.setProperty("--score-angle",(pct*3.6)+"deg");
    $("result-badge").textContent=pct>=60?"??????????? 60%":"?????????????????? 60%";
    $("result-title").textContent=pct>=80?"?????????":pct>=60?"???????":"?????????????????";
    $("result-message").textContent="??? "+pct+"% · "+(auto?"??????????? ???????????????":"?????????????????")+(Object.keys(attempt.answers).length<qs.length?" · ???????? "+(qs.length-Object.keys(attempt.answers).length)+" ???":"");
    const elapsed=Math.round((attempt.finishedAt-attempt.startedAt)/1000);
    $("time-taken").textContent="??????? "+timeText(elapsed);
    const breakdown=$("category-breakdown"); breakdown.replaceChildren();
    ["grammar","vocabulary","dialogue","reading"].forEach(function(type){
      const list=qs.filter(function(q){return q.type===type;});
      const n=list.filter(function(q){return attempt.answers[q.id]===q.answer;}).length;
      const row=node("div","breakdown-row");
      const meta=node("div","breakdown-meta"); meta.append(node("span","",labels[type]),node("strong","",n+" / "+list.length));
      const track=node("div","breakdown-track"); const fill=node("div","breakdown-fill"); fill.style.width=(list.length?Math.round(n/list.length*100):0)+"%"; track.appendChild(fill);
      row.append(meta,track); breakdown.appendChild(row);
    });
    renderReview();
    try{localStorage.setItem("ee-english-practice-last",JSON.stringify({score:correct,total:qs.length,pct:pct,date:new Date().toLocaleDateString("th-TH")}));}catch(e){}
  }
  function renderReview() {
    const list=$("review-list"); list.replaceChildren(); let last="";
    attempt.questions.forEach(function(q,i){
      if(q.passageId&&q.passageId!==last){list.appendChild(makePassage(passages[q.passageId],true));last=q.passageId;}
      if(!q.passageId)last="";
      list.appendChild(makeQuestion(q,i,true));
    });
  }
  function loadLastResult() {
    try{
      const last=JSON.parse(localStorage.getItem("ee-english-practice-last")||"null");
      if(last)$("last-result").textContent="????????????? · "+last.score+"/"+last.total+" ????? ("+last.pct+"%) · "+last.date;
    }catch(e){}
  }
  $("start-btn").addEventListener("click",startExam);
  $("start-btn-secondary").addEventListener("click",startExam);
  $("submit-btn-side").addEventListener("click",function(){finishExam(false);});
  $("submit-btn-bottom").addEventListener("click",function(){finishExam(false);});
  $("retake-btn").addEventListener("click",function(){startExam();});
  $("home-btn").addEventListener("click",function(){clearInterval(timerId);attempt=null;loadLastResult();showScreen("start");});
  loadLastResult();
})();

