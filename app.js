/* Raíces que nos unen — browser application, no build tools required. */
'use strict';
const modules = window.HISTORY_MODULES;
const app = document.getElementById('app');
const $ = (selector, root = document) => root.querySelector(selector);
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const moduleById = (id) => modules.find(m => m.id === id) || modules[1];
const statusText = {lobby:'Sala de espera',question:'Pregunta en curso',reveal:'Resultados de la pregunta',finished:'Partida finalizada'};
let page = 'home';
let selectedModule = 'san-jacinto';
let solo = null;
let live = null;
let eventSource = null;
let timerInterval = null;
let toastTimeout = null;

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('visible'), 3800);
}
function topPage(){ window.scrollTo({top:0,behavior:'instant'}); }
function navigate(next, moduleId){
  if(moduleId) selectedModule = moduleId;
  page = next;
  if(!['room-host','room-player'].includes(next)) detachEvents();
  render(); topPage();
  document.getElementById('mobile-nav').classList.remove('open');
}
function setNav(){
  const active = page==='home'?'home':page==='explore'||page==='detail'?'explore':'play';
  document.querySelectorAll('.desktop-nav .nav-link').forEach(el => el.classList.toggle('active',el.dataset.route===active));
}
function render(){
  setNav();
  if(page==='home') app.innerHTML=homeView();
  else if(page==='explore') app.innerHTML=exploreView();
  else if(page==='detail') app.innerHTML=detailView(moduleById(selectedModule));
  else if(page==='play') app.innerHTML=playView();
  else if(page==='join') app.innerHTML=joinView();
  else if(page==='create') app.innerHTML=createView();
  else if(page==='solo') app.innerHTML=soloView();
  else if(page==='room-host'||page==='room-player') app.innerHTML=roomView();
  if(page==='room-host'||page==='room-player') updateTimer();
}
const landscape = `<svg class="hero-picture" viewBox="0 0 780 510" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración artística de un paisaje nicaragüense con una hacienda histórica">
 <defs><linearGradient id="hill" x1="100" y1="100" x2="700" y2="500"><stop stop-color="#5E7C7D"/><stop offset="1" stop-color="#1E4350"/></linearGradient><linearGradient id="hill2" x1="200" y1="280" x2="670" y2="520"><stop stop-color="#344F53"/><stop offset="1" stop-color="#192B36"/></linearGradient><linearGradient id="facade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#D9BD8C"/><stop offset="1" stop-color="#7C7561"/></linearGradient></defs>
 <circle cx="536" cy="164" r="99" fill="#F0C77D" opacity=".11"/><circle cx="536" cy="164" r="71" fill="#F3CC88" opacity=".34"/><circle cx="536" cy="164" r="53" fill="#FCE1A9" opacity=".91"/>
 <path d="M0 340c75-47 134-70 211-66 58 3 83-68 131-70 58-4 72 83 140 59 54-19 101-88 165-49 48 30 82 75 133 87v209H0z" fill="#304F5E" opacity=".6"/>
 <path d="M0 374c83-10 131-74 198-73 78 2 124 46 190 39 69-8 109-58 179-52 83 7 136 74 213 49v173H0z" fill="url(#hill)"/>
 <path d="M0 423c106-28 187-48 286-14 110 38 195-42 308-14 93 22 130 37 186 21v94H0z" fill="url(#hill2)"/>
 <path d="M272 320h232v113H272z" fill="url(#facade)"/><path d="M251 315 386 243l140 72-10 12H261z" fill="#5F554B"/><path d="m255 309 131-69 136 69" stroke="#C09E76" stroke-width="5"/><path d="M285 322h203v13H285z" fill="#B99E75"/><path d="M297 336h20v97h-20zM349 336h18v97h-18zM405 336h19v97h-19zM457 336h19v97h-19z" fill="#9B8B72"/><path d="M295 359h184" stroke="#CAB18D" stroke-width="3"/><path d="M325 363h24v38h-24zM378 363h24v38h-24zM433 363h24v38h-24z" fill="#35454A"/><path d="M359 394h56v39h-56z" fill="#3A4141"/><path d="M355 390h63" stroke="#BBA580" stroke-width="5"/>
 <path d="M386 240V133" stroke="#D7B88C" stroke-width="3"/><path d="M389 137c23-11 38 13 63 3v48c-25 10-40-15-63-4z" fill="#E3E6D7"/><path d="M389 137c23-11 38 13 63 3v12c-25 10-40-15-63-4zM389 170c23-11 38 13 63 3v15c-25 10-40-15-63-4z" fill="#668B9A"/>
 <path d="M0 451c80-24 130-24 207 3 64 22 141 7 204 2 134-11 263-18 369 17v37H0z" fill="#132734"/>
 <g opacity=".82" fill="#122631"><path d="M130 450V338h9v112zM96 387c10-32 22-65 38-96 21 28 38 62 50 96zM110 371c9-31 17-58 24-98 14 25 25 57 36 98z"/><path d="M636 460V329h11v131zM597 392c12-44 24-87 44-123 24 40 35 77 52 123zM613 375c12-36 17-67 28-103 18 34 24 70 37 103z"/></g>
 <path d="M0 473c158-28 303 7 447-9 139-16 217-9 333 18" stroke="#8A956F" stroke-opacity=".34" stroke-width="3"/></svg>`;

function moduleCard(m){
  return `<article class="module-card"><div class="module-art ${m.theme}"><span class="art-number">${m.chapter}</span><svg class="icon art-symbol"><use href="#i-${m.icon}"/></svg><span class="art-epoch">${safe(m.period)}</span></div><div class="module-body"><span class="module-badge">${safe(m.tag)}</span><h3>${safe(m.title)}</h3><p>${safe(m.summary)}</p><div class="module-bottom"><small>${m.questions.length} preguntas de práctica</small><button class="circle-arrow" data-action="module" data-module="${m.id}" aria-label="Explorar ${safe(m.shortTitle)}">${icon('arrow')}</button></div></div></article>`;
}
function homeView(){
  return `<div class="page-shell"><section class="hero"><div class="wrap hero-inner"><div class="hero-copy"><span class="eyebrow light">UNA EXPERIENCIA PARA DESCUBRIR NICARAGUA</span><h1>Nuestra historia.<br/><em>Tu aventura.</em></h1><p class="hero-lead">Viaja por las etapas que forjaron nuestra identidad. Aprende con historias, responde desafíos y compite en tiempo real con tus compañeros.</p><div class="hero-actions"><button class="btn btn-primary" data-route="explore">Explorar la historia ${icon('arrow')}</button><button class="btn btn-outline" data-route="play">${icon('play')} Iniciar desafío</button></div><div class="hero-meta"><span>${icon('book')} Aprende a tu ritmo</span><span>${icon('users')} Juega con amigos</span></div></div><div class="hero-illustration">${landscape}<div class="hero-chapter"><span>${icon('flag')}</span><div><small>CAPÍTULO DESTACADO</small><strong>Batalla de San Jacinto · 1856</strong></div></div><span class="hero-ribbon">Memoria · Identidad · Historia</span></div></div></section>
  <section class="stats-section"><div class="wrap stats-inner"><div class="stat"><span class="stat-icon">${icon('book')}</span><div><strong>05</strong><span>Etapas históricas</span></div></div><div class="stat"><span class="stat-icon">${icon('target')}</span><div><strong>${modules.reduce((sum,m)=>sum+m.questions.length,0)}</strong><span>Preguntas de muestra</span></div></div><div class="stat"><span class="stat-icon">${icon('users')}</span><div><strong>02</strong><span>Formas de jugar</span></div></div></div></section>
  <section class="section"><div class="wrap"><div class="section-heading"><div><span class="eyebrow">TU RECORRIDO COMIENZA AQUÍ</span><h2>Explora nuestra historia</h2><p>Cada capítulo es una puerta al pasado. Conoce los acontecimientos y pon a prueba lo aprendido.</p></div><button class="section-link" data-route="explore">Ver todas las etapas ${icon('arrow')}</button></div><div class="module-grid">${modules.slice(0,3).map(moduleCard).join('')}</div></div></section>
  <section class="feature-section"><div class="wrap feature-grid"><div class="feature-panel"><svg class="icon illustrative-icon"><use href="#i-users"/></svg><div class="feature-panel-content"><span class="eyebrow light">APRENDER JUGANDO</span><h3>El conocimiento<br/>se comparte.</h3><p>Invita a tus compañeros, entra con un código y participa en partidas con puntuaciones en vivo.</p><button class="btn btn-primary" data-action="join">Unirme a una partida ${icon('arrow')}</button></div></div><div class="feature-panel light-panel"><svg class="icon illustrative-icon"><use href="#i-book"/></svg><div class="feature-panel-content"><span class="eyebrow">A TU PROPIO RITMO</span><h3>Tu siguiente descubrimiento<br/>te espera.</h3><p>Lee relatos breves, recorre fechas clave y resuelve actividades cuando quieras.</p><button class="btn btn-dark" data-route="explore">Comenzar a explorar ${icon('arrow')}</button></div></div></div></section></div>`;
}
function exploreView(){return `<div class="page-shell"><div class="wrap"><div class="page-heading"><span class="eyebrow">UN VIAJE A TRAVÉS DEL TIEMPO</span><h1>Etapas de nuestra historia</h1><p>Selecciona un período, descubre sus acontecimientos principales y completa un desafío interactivo.</p></div><div class="explore-grid">${modules.map(moduleCard).join('')}</div></div></div>`;}
function detailView(m){return `<div class="page-shell"><section class="detail-hero"><div class="wrap"><button class="back-link" data-route="explore">${icon('back')} Todas las etapas</button><span class="eyebrow light">ETAPA ${m.chapter} · ${safe(m.tag)}</span><h1>${safe(m.title)}</h1><p>${safe(m.summary)}</p><div class="detail-meta"><span>${icon('clock')} ${safe(m.period)}</span><span>${icon('target')} ${m.questions.length} preguntas</span><span>${icon('book')} Lectura breve</span></div></div></section><div class="wrap detail-content"><article class="content-panel"><span class="eyebrow">ANTES DE JUGAR</span><h2>Conoce la historia</h2><p>${safe(m.story)}</p><div class="detail-callout">${icon('info')} Este contenido es demostrativo. Para la versión universitaria se incorporarán las lecturas y documentos oficiales que valide la docente.</div><div class="detail-actions"><button class="btn btn-primary" data-action="solo" data-module="${m.id}">${icon('play')} Practicar ahora</button><button class="btn btn-outline-dark" data-action="create-from-module" data-module="${m.id}">${icon('users')} Crear partida</button></div></article><aside class="content-panel"><span class="eyebrow">MOMENTOS IMPORTANTES</span><h2>Línea de tiempo</h2><div class="timeline">${m.keyDates.map(([y,v])=>`<div class="timeline-event"><b>${safe(y)}</b><span>${safe(v)}</span></div>`).join('')}</div></aside></div></div>`;}
function playView(){return `<div class="page-shell"><div class="wrap"><div class="page-heading centered"><span class="eyebrow">ELIGE TU EXPERIENCIA</span><h1>¡La historia también se juega!</h1><p>Enfréntate a un reto individual o reúne a tus amigos en una partida en vivo.</p></div><div class="play-options"><article class="option-card"><span class="option-icon">${icon('target')}</span><h2>Desafío individual</h2><p>Aprende y responde a tu ritmo. Recibirás retroalimentación después de cada pregunta, sin necesitar Internet ni crear una cuenta.</p><div class="select-row"><label for="solo-module">Etapa histórica</label><select class="select-input" id="solo-module">${modules.map(m=>`<option value="${m.id}" ${selectedModule===m.id?'selected':''}>${safe(m.title)}</option>`).join('')}</select></div><button class="btn btn-dark" data-action="start-solo">Empezar a jugar ${icon('arrow')}</button></article><article class="option-card"><span class="option-icon">${icon('users')}</span><h2>Partida multijugador</h2><p>Crea una sala con un PIN y permite que otras personas entren desde su celular. Todos responderán las mismas preguntas al mismo tiempo.</p><div style="margin-top:auto;display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-route="create">Crear sala ${icon('arrow')}</button><button class="btn btn-outline-dark" data-action="join">Tengo un código</button></div></article></div></div></div>`;}
function createView(){return `<div class="page-shell"><div class="wrap"><div class="page-heading centered"><button class="back-link" data-route="play">${icon('back')} Volver a desafíos</button><h1>Crea tu partida</h1><p>Tú controlas el inicio de cada ronda. Comparte un código con las personas que quieran participar.</p></div><form id="create-form" class="form-panel"><h2>Configurar sala</h2><p>Selecciona el capítulo que será protagonista de la competencia.</p><div class="field"><label for="create-module">Módulo</label><select class="select-input" name="moduleId" id="create-module">${modules.map(m=>`<option value="${m.id}" ${selectedModule===m.id?'selected':''}>${safe(m.title)} (${m.questions.length} preguntas)</option>`).join('')}</select></div><button class="btn btn-primary" type="submit">${icon('users')} Generar código de partida</button><div class="form-hint">Para salas multijugador debes abrir la web desde el servidor incluido. El modo individual funciona sin servidor.</div></form></div></div>`;}
function joinView(){
 const prefill = new URLSearchParams(location.search).get('room')||'';
 return `<div class="page-shell"><div class="wrap"><div class="page-heading centered"><button class="back-link" data-route="play">${icon('back')} Volver a desafíos</button><h1>Entra a la aventura</h1><p>Escribe el PIN que te compartió el organizador y el nombre con el que aparecerás en la sala.</p></div><form id="join-form" class="form-panel"><h2>Unirse a partida</h2><p>¡No necesitas registrarte!</p><div class="field"><label for="join-pin">Código de 6 dígitos</label><input id="join-pin" name="pin" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="Ej. 482916" value="${safe(prefill)}" required autocomplete="off" /></div><div class="field"><label for="join-name">Tu apodo</label><input id="join-name" name="nickname" type="text" minlength="2" maxlength="24" placeholder="Ej. Historiador21" required autocomplete="off" /></div><button type="submit" class="btn btn-primary">Entrar a la sala ${icon('arrow')}</button><div class="form-hint">Las salas se comparten mediante PIN o enlace. Si el organizador reinicia el servidor, la sala se cierra.</div></form></div></div>`;
}
function startSolo(moduleId){ selectedModule=moduleId;solo={moduleId,index:0,selected:null,score:0,streak:0,done:false};navigate('solo'); }
function soloView(){
 if(!solo)return playView(); const m=moduleById(solo.moduleId);
 if(solo.done) return `<div class="page-shell"><div class="quiz-wrap"><div class="quiz-panel center-result"><span class="medal">${icon('trophy')}</span><span class="eyebrow">DESAFÍO COMPLETADO</span><h2>¡Misión cumplida!</h2><p>Terminaste «${safe(m.title)}».</p><div class="big-points">${solo.score}/${m.questions.length*100}</div><p>${solo.score===m.questions.length*100?'¡Excelente! Respondiste todo correctamente.':'¡Cada pregunta es un aprendizaje! Puedes volver a intentarlo.'}</p><div class="result-actions"><button class="btn btn-primary" data-action="solo" data-module="${m.id}">Volver a jugar</button><button class="btn btn-outline-dark" data-action="module" data-module="${m.id}">Revisar el módulo</button></div></div></div></div>`;
 const q=m.questions[solo.index],selected=solo.selected,correct=selected===q.c;
 return `<div class="page-shell"><div class="quiz-wrap"><button class="back-link" data-action="module" data-module="${m.id}">${icon('back')} Volver al capítulo</button><div class="quiz-topline"><span>${safe(m.shortTitle)}</span><span>Pregunta ${solo.index+1} de ${m.questions.length}</span></div><div class="quiz-progress"><span style="width:${(solo.index+1)/m.questions.length*100}%"></span></div><div class="quiz-panel"><span class="tag-pill">${icon('book')} EL RETO DE HOY</span><h2>${safe(q.q)}</h2><div class="quiz-answers">${q.a.map((ans,i)=>`<button class="answer-btn ${selected!==null?(i===q.c?'correct':i===selected?'incorrect':''):''}" data-action="solo-answer" data-choice="${i}" ${selected!==null?'disabled':''}><span class="answer-letter">${'ABCD'[i]}</span><span>${safe(ans)}</span></button>`).join('')}</div>${selected===null?'':`<div class="feedback ${correct?'':'wrong'}"><strong>${correct?'¡Respuesta correcta!':'Seguimos aprendiendo'}</strong>${safe(q.e)}</div>`}<div class="quiz-footer"><span class="quiz-score">${solo.score} puntos</span>${selected===null?'<span class="muted">Elige una respuesta para continuar.</span>':`<button class="btn btn-dark" data-action="solo-next">${solo.index+1===m.questions.length?'Ver mi resultado':'Siguiente pregunta'} ${icon('arrow')}</button>`}</div></div></div></div>`;
}
function detachEvents(){if(eventSource){eventSource.close();eventSource=null;} clearInterval(timerInterval);timerInterval=null;}
async function send(path,body){
 let res;
 try{res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}catch(e){throw new Error('No se puede conectar con el servidor de partidas. Abre la web con «node server.js».');}
 let data;try{data=await res.json();}catch(e){throw new Error('El servidor no devolvió una respuesta válida.');}
 if(!res.ok)throw new Error(data.error||'No se pudo completar la operación.');
 return data;
}
function liveSave(){try{sessionStorage.setItem('raices-room',JSON.stringify({role:live.role,pin:live.pin,token:live.token,nickname:live.nickname,lanUrl:live.lanUrl}));}catch(e){}}
function liveForget(){try{sessionStorage.removeItem('raices-room');}catch(e){}}
function enterLive(info){
 detachEvents(); live={...info,snapshot:null,selectedAnswer:null,previousIndex:-1};liveSave();
 const qs=new URLSearchParams(live.role==='host'?{role:'host',token:live.token}:{role:'player',token:live.token});
 eventSource=new EventSource(`/api/rooms/${encodeURIComponent(live.pin)}/events?${qs}`);
 eventSource.addEventListener('snapshot', e=>{try{
  const snapshot=JSON.parse(e.data);
  if(snapshot.index!==live.previousIndex){live.selectedAnswer=null;live.previousIndex=snapshot.index;}
  live.snapshot=snapshot; if(page!=='room-'+live.role)page='room-'+live.role;
  render();
 }catch(err){toast('No se pudo leer el estado de la sala.');}});
 eventSource.addEventListener('close',()=>{toast('La sala ya no está disponible.');leaveLive();});
 eventSource.onerror=()=>{if(page==='room-host'||page==='room-player') $('#room-connection')?.replaceChildren(document.createTextNode('Reconectando…'));};
 navigate('room-'+info.role);
 timerInterval=setInterval(updateTimer,250);
}
function leaveLive(){detachEvents();live=null;liveForget();navigate('play');}
function shareLink(){const base=(['localhost','127.0.0.1'].includes(location.hostname)&&live.lanUrl)?live.lanUrl:window.location.href;const url=new URL(window.location.pathname,base);url.searchParams.set('room',live.pin);return url.toString();}
function copyLink(){const url=shareLink();if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url).then(()=>toast('Enlace copiado.')).catch(()=>legacyCopy(url));}else legacyCopy(url);}
function legacyCopy(text){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();let copied=false;try{copied=document.execCommand('copy')}catch(e){}ta.remove();toast(copied?'Enlace copiado.':'Copia el enlace que aparece en pantalla.');}
function remaining(){if(!live?.snapshot?.endsAt || live.snapshot.status!=='question')return null;return Math.max(0,Math.ceil((live.snapshot.endsAt-Date.now())/1000));}
function updateTimer(){let el=$('#live-timer');if(!el)return;const sec=remaining();if(sec===null)return;el.textContent=sec+' s';el.classList.toggle('danger',sec<=7);}
function roomView(){
 if(!live)return playView();const snap=live.snapshot;if(!snap)return `<div class="wrap loading">Conectando con tu partida…</div>`;
 const m=moduleById(snap.moduleId),isHost=live.role==='host';
 const header=`<div class="live-head"><div><span class="eyebrow">${isHost?'PANEL DEL ORGANIZADOR':'SALA MULTIJUGADOR'}</span><h1 style="font:800 31px Outfit;margin:8px 0">${safe(m.title)}</h1><span id="room-connection" class="muted" style="font-size:12px">${safe(statusText[snap.status])}</span></div><button class="btn btn-outline-dark btn-small" data-action="leave">Salir de la sala</button></div>`;
 const pinPanel=isHost?`<div class="room-head"><div><small>CÓDIGO PARA TUS PARTICIPANTES</small><div class="room-pin">${safe(live.pin)}</div><span class="room-link">${safe(shareLink())}</span></div><div><button class="btn btn-primary btn-small" data-action="copy">${icon('link')} Copiar invitación</button></div></div>`:`<div class="room-head"><div><small>ESTÁS PARTICIPANDO EN LA SALA</small><div class="room-pin">${safe(live.pin)}</div><span style="font-size:12px;color:#c7d4dc">Jugando como <strong>${safe(live.nickname)}</strong></span></div><span class="tag-pill">${safe(statusText[snap.status])}</span></div>`;
 let body='';
 if(snap.status==='lobby'){
  body=isHost?`<div class="room-grid"><div class="live-card"><h3>Participantes conectados · ${snap.players.length}</h3>${snap.players.length?`<div class="player-list">${snap.players.map(p=>`<span class="player-chip"><span class="player-avatar">${safe(p.name.slice(0,1).toUpperCase())}</span>${safe(p.name)}</span>`).join('')}</div>`:'<p class="empty-text">Todavía no hay nadie en la sala. Comparte el PIN o el enlace.</p>'}<div class="live-actions"><button class="btn btn-primary" data-action="start-live" ${snap.players.length===0?'disabled':''}>Iniciar partida ${icon('arrow')}</button></div></div><aside class="live-card"><h3>Cómo funciona</h3><div class="live-facts"><span class="fact-item">${icon('target')} ${snap.totalQuestions} preguntas</span><span class="fact-item">${icon('clock')} 25 segundos por pregunta</span><span class="fact-item">${icon('users')} Todos responden en su dispositivo</span><span class="fact-item">${icon('trophy')} Puntos por precisión y rapidez</span></div></aside></div>`:`<div class="live-card player-state"><span class="large-icon">${icon('users')}</span><h2>¡Ya estás dentro!</h2><p>Espera a que el organizador inicie la partida. Hay <strong>${snap.players.length}</strong> participante(s) conectados.</p><div class="player-list" style="justify-content:center">${snap.players.map(p=>`<span class="player-chip">${safe(p.name)}</span>`).join('')}</div></div>`;
 }else if(snap.status==='question'||snap.status==='reveal'){
  const q=snap.question,answered=snap.answered||false,reveal=snap.status==='reveal';
  body=`<section class="live-question"><div class="question-meta"><span class="tag-pill">${icon('target')} PREGUNTA ${snap.index+1}/${snap.totalQuestions}</span>${!reveal?`<span class="timer" id="live-timer">${remaining()} s</span>`:`<span class="tag-pill">${icon('check')} RESPUESTAS REVELADAS</span>`}</div><h2>${safe(q.q)}</h2><div class="quiz-answers">${q.a.map((ans,i)=>`<button class="answer-btn ${reveal?(i===q.correct?'correct':(!isHost&&snap.yourAnswer===i?'incorrect':'')):''}" ${isHost||answered||reveal?'disabled':''} data-action="live-answer" data-choice="${i}"><span class="answer-letter">${'ABCD'[i]}</span><span>${safe(ans)}</span></button>`).join('')}</div>${reveal?`<div class="reveal-note"><strong>Respuesta: ${safe(q.a[q.correct])}</strong><br/>${safe(q.explanation)}</div>`:`<p class="answer-tracker">${isHost?`${snap.answersCount} de ${snap.players.length} participantes respondieron.`:answered?'Respuesta enviada. ¡Espera los resultados!':'Elige la opción correcta antes de que termine el tiempo.'}</p>`}${isHost?`<div class="live-actions"><button class="btn ${reveal?'btn-primary':'btn-dark'}" data-action="${reveal?'next-live':'reveal-live'}">${reveal?(snap.index+1===snap.totalQuestions?'Finalizar partida':'Siguiente pregunta'):'Mostrar respuestas'} ${icon('arrow')}</button></div>`:''}</section>${reveal?`<div class="live-card" style="margin-top:18px"><h3>Clasificación actual</h3>${rankView(snap.players)}</div>`:''}`;
 }else if(snap.status==='finished'){
  const winner=[...snap.players].sort((a,b)=>b.score-a.score)[0];
  body=`<div class="live-card center-result" style="margin-top:19px"><span class="medal">${icon('trophy')}</span><span class="eyebrow">FIN DE LA PARTIDA</span><h2>¡Qué gran recorrido!</h2><p>${winner?`Primer lugar: <strong>${safe(winner.name)}</strong> con ${winner.score} puntos.`:'La partida ha terminado.'}</p><div style="max-width:480px;margin:20px auto;text-align:left">${rankView(snap.players)}</div><button class="btn btn-dark" data-action="leave">Volver a desafíos</button></div>`;
 }
 return `<div class="page-shell"><div class="wrap live-wrap">${header}${pinPanel}${body}<p class="room-disclaimer">Prototipo académico · Las salas son temporales y no almacenan datos personales permanentemente.</p></div></div>`;
}
function rankView(players){return `<ol class="leaderboard">${[...players].sort((a,b)=>b.score-a.score).map((p,i)=>`<li><span><small>${i+1}.</small>${safe(p.name)}</span><b>${p.score} pts</b></li>`).join('')}</ol>`;}
async function performLive(action){if(!live)return;const pin=live.pin,auth={token:live.token};try{
 if(action==='start-live')await send(`/api/rooms/${pin}/start`,auth);
 if(action==='reveal-live')await send(`/api/rooms/${pin}/reveal`,auth);
 if(action==='next-live')await send(`/api/rooms/${pin}/next`,auth);
 }catch(e){toast(e.message);}}

window.addEventListener('DOMContentLoaded',()=>{
 document.addEventListener('click',async event=>{
  const menu=event.target.closest('#mobile-menu');if(menu){$('#mobile-nav').classList.toggle('open');return;}
  const btn=event.target.closest('[data-action], [data-route]');if(!btn)return;
  const {route,action,module:moduleId,choice}=btn.dataset;
  if(route){navigate(route);return;}
  if(action==='home'){navigate('home');return;}
  if(action==='module'){navigate('detail',moduleId);return;}
  if(action==='join'){navigate('join');return;}
  if(action==='create-from-module'){navigate('create',moduleId);return;}
  if(action==='start-solo'){startSolo($('#solo-module')?.value||selectedModule);return;}
  if(action==='solo'){startSolo(moduleId);return;}
  if(action==='solo-answer'&&solo&&solo.selected===null){solo.selected=Number(choice);if(solo.selected===moduleById(solo.moduleId).questions[solo.index].c)solo.score+=100;render();return;}
  if(action==='solo-next'&&solo){solo.index++;solo.selected=null;if(solo.index>=moduleById(solo.moduleId).questions.length)solo.done=true;render();return;}
  if(action==='leave'){leaveLive();return;}
  if(action==='copy'){copyLink();return;}
  if(['start-live','reveal-live','next-live'].includes(action)){await performLive(action);return;}
  if(action==='live-answer'&&live?.role==='player'&&live.snapshot?.status==='question'&&!live.snapshot?.answered){
   try{await send(`/api/rooms/${live.pin}/answer`,{token:live.token,choice:Number(choice)});}catch(e){toast(e.message);}return;
  }
 });
 document.addEventListener('submit',async event=>{
  const form=event.target;if(!['create-form','join-form'].includes(form.id))return;event.preventDefault();
  const submit=$('button[type="submit"]',form);submit.disabled=true;
  const values=Object.fromEntries(new FormData(form));
  try{if(form.id==='create-form'){
    const result=await send('/api/rooms',{moduleId:values.moduleId});selectedModule=values.moduleId;enterLive({role:'host',pin:result.pin,token:result.hostToken,lanUrl:result.lanUrls?.[0]||null});
   }else{
    const result=await send(`/api/rooms/${values.pin}/join`,{nickname:values.nickname});
    enterLive({role:'player',pin:values.pin,token:result.playerToken,nickname:result.name});
   }}catch(e){toast(e.message);submit.disabled=false;}
 });
 let stored=null;try{stored=sessionStorage.getItem('raices-room')}catch(e){}let recovered=null;try{recovered=JSON.parse(stored)}catch(e){}
 const linkPin=new URLSearchParams(location.search).get('room');
 if(linkPin&&/^\d{6}$/.test(linkPin)){navigate('join');return;}
 if(recovered?.pin&&recovered?.role&&recovered?.token&&location.protocol!=='file:'){
   enterLive(recovered);
 }else{render();}
});
