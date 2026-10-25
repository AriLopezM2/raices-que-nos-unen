/* Real-time classroom server. Node.js 18+; zero external dependencies. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const MODULES = require('./data.js');
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = __dirname;
const rooms = new Map();
const allowed = new Map([['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],['/app.js','app.js'],['/data.js','data.js'],['/learning.js','learning.js'],['/learning.css','learning.css']]);
const contentTypes = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const QUESTION_SECONDS = 25;
const ROOM_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function interfaces(){const ips=[];for(const list of Object.values(os.networkInterfaces()))for(const n of list||[])if(n.family==='IPv4'&&!n.internal)ips.push(n.address);return ips;}
function accessUrls(){return interfaces().map(ip=>`http://${ip}:${PORT}`);}
function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
function fail(res,code,message){json(res,code,{error:message});}
function newToken(){return crypto.randomBytes(24).toString('hex');}
function pinCode(){let pin;do{pin=String(crypto.randomInt(100000,999999));}while(rooms.has(pin));return pin;}
function findModule(id){return MODULES.find(m=>m.id===id);}
function playerByToken(room,token){return room.players.find(p=>p.token===token);}
function roomAccess(room,role,token){return role==='host'?room.hostToken===token:role==='player'&&Boolean(playerByToken(room,token));}
function visibleSnapshot(room,role,token){
 const reveal=['reveal','finished'].includes(room.status),p=role==='player'?playerByToken(room,token):null;
 const players=room.players.map(x=>({name:x.name,score:x.score}));
 const raw=room.module.questions[room.index];
 return {pin:room.pin,moduleId:room.module.id,status:room.status,index:room.index,totalQuestions:room.module.questions.length,endsAt:room.status==='question'?room.endsAt:null,
   players,answersCount:room.status==='question'?Object.keys(room.answers).length:null,
   answered:p?Object.prototype.hasOwnProperty.call(room.answers,p.token):false,
   yourAnswer:p&&Object.prototype.hasOwnProperty.call(room.answers,p.token)?room.answers[p.token].choice:null,
   question:room.status==='question'||room.status==='reveal'?{q:raw.q,a:raw.a,...(reveal?{correct:raw.c,explanation:raw.e}:{})}:null};
}
function emit(room){
 for(const listener of room.listeners){
  try{listener.res.write(`event: snapshot\ndata: ${JSON.stringify(visibleSnapshot(room,listener.role,listener.token))}\n\n`);}catch(e){room.listeners.delete(listener);}
 }
}
function clearQuestionTimer(room){if(room.timer){clearTimeout(room.timer);room.timer=null;}}
function reveal(room){if(room.status!=='question')return;clearQuestionTimer(room);room.status='reveal';room.endsAt=null;emit(room);}
function launchQuestion(room){
 clearQuestionTimer(room);room.answers={};room.status='question';room.endsAt=Date.now()+QUESTION_SECONDS*1000;room.timer=setTimeout(()=>reveal(room),QUESTION_SECONDS*1000);emit(room);
}
async function readBody(req){
 let content='';for await(const chunk of req){content+=chunk;if(content.length>16000)throw new Error('Solicitud demasiado grande.');}
 if(!content) return {};try{return JSON.parse(content);}catch(e){throw new Error('Los datos de la solicitud no son válidos.');}
}
function removeRoom(room){clearQuestionTimer(room);for(const listener of room.listeners){try{listener.res.write('event: close\ndata: {}\n\n');listener.res.end();}catch(e){}}room.listeners.clear();rooms.delete(room.pin);}
setInterval(()=>{for(const room of rooms.values())if(Date.now()-room.createdAt>ROOM_MAX_AGE_MS)removeRoom(room);},15*60*1000).unref();

const server=http.createServer(async(req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost');}catch(e){return fail(res,400,'Dirección no válida.');}
 const parts=url.pathname.split('/').filter(Boolean);
 try{
  if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{status:'ok',rooms:rooms.size,lanUrls:accessUrls()});
  if(req.method==='POST'&&url.pathname==='/api/rooms'){
   const body=await readBody(req),mod=findModule(body.moduleId);
   if(!mod)return fail(res,400,'Selecciona un módulo válido.');
   const room={pin:pinCode(),module:mod,hostToken:newToken(),players:[],answers:{},status:'lobby',index:0,endsAt:null,timer:null,listeners:new Set(),createdAt:Date.now()};
   rooms.set(room.pin,room);
   return json(res,201,{pin:room.pin,hostToken:room.hostToken,lanUrls:accessUrls()});
  }
  if(parts[0]==='api'&&parts[1]==='rooms'&&parts[2]&&/^\d{6}$/.test(parts[2])){
   const room=rooms.get(parts[2]);if(!room)return fail(res,404,'No existe una partida activa con ese código.');
   if(req.method==='GET'&&parts[3]==='events'){
    const role=url.searchParams.get('role'),token=url.searchParams.get('token');
    if(!roomAccess(room,role,token))return fail(res,403,'Acceso no autorizado.');
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write('retry: 1500\n\n');
    const listener={role,token,res};room.listeners.add(listener);
    res.write(`event: snapshot\ndata: ${JSON.stringify(visibleSnapshot(room,role,token))}\n\n`);
    const keepAlive=setInterval(()=>{try{res.write(': ping\n\n');}catch(e){}},20000);
    req.on('close',()=>{clearInterval(keepAlive);room.listeners.delete(listener);});
    return;
   }
   if(req.method!=='POST')return fail(res,405,'Método no permitido.');
   const body=await readBody(req);
   if(parts[3]==='join'){
    if(room.status!=='lobby')return fail(res,409,'Esta partida ya comenzó.');
    const name=String(body.nickname||'').trim().replace(/\s+/g,' ');
    if(name.length<2||name.length>24)return fail(res,400,'Tu apodo debe tener entre 2 y 24 caracteres.');
    if(room.players.length>=40)return fail(res,409,'La sala está llena (máximo 40 participantes).');
    if(room.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))return fail(res,409,'Ese apodo ya está en uso.');
    const p={name,token:newToken(),score:0};room.players.push(p);emit(room);
    return json(res,200,{name,playerToken:p.token});
   }
   if(['start','reveal','next'].includes(parts[3])){
    if(body.token!==room.hostToken)return fail(res,403,'Solo el organizador puede controlar la partida.');
    if(parts[3]==='start'){
     if(room.status!=='lobby')return fail(res,409,'La partida ya comenzó.');
     if(room.players.length===0)return fail(res,409,'Esperá a que ingrese al menos una persona.');
     launchQuestion(room);return json(res,200,{ok:true});
    }
    if(parts[3]==='reveal'){
     if(room.status!=='question')return fail(res,409,'No hay una pregunta activa.');
     reveal(room);return json(res,200,{ok:true});
    }
    if(parts[3]==='next'){
     if(room.status!=='reveal')return fail(res,409,'Primero hay que mostrar la respuesta.');
     if(room.index+1>=room.module.questions.length){room.status='finished';emit(room);}else{room.index++;launchQuestion(room);}
     return json(res,200,{ok:true});
    }
   }
   if(parts[3]==='answer'){
    const player=playerByToken(room,body.token);
    if(!player)return fail(res,403,'Participante no reconocido.');
    if(room.status!=='question'||Date.now()>room.endsAt)return fail(res,409,'El tiempo de esta pregunta ya terminó.');
    if(Object.prototype.hasOwnProperty.call(room.answers,player.token))return fail(res,409,'Ya enviaste una respuesta.');
    const q=room.module.questions[room.index],choice=body.choice;
    if(!Number.isInteger(choice)||choice<0||choice>=q.a.length)return fail(res,400,'Elige una respuesta válida.');
    room.answers[player.token]={choice};
    if(choice===q.c){const remaining=Math.max(0,room.endsAt-Date.now());player.score+=Math.round(600+400*(remaining/(QUESTION_SECONDS*1000)));}
    emit(room);return json(res,200,{ok:true});
   }
   return fail(res,404,'Acción no disponible.');
  }
  if(req.method!=='GET')return fail(res,405,'Método no permitido.');
  let file=allowed.get(url.pathname);
  if(!file&&url.pathname.startsWith('/?'))file='index.html';
  if(!file)return fail(res,404,'Página no encontrada.');
  const filepath=path.join(PUBLIC_DIR,file),ext=path.extname(file);
  res.writeHead(200,{'Content-Type':contentTypes[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(filepath).pipe(res);
 }catch(e){console.error('[Error]',e.message);if(!res.headersSent)fail(res,400,e.message||'Error del servidor.');}
});
server.listen(PORT,'0.0.0.0',()=>{
 console.log('\n==============================================');
 console.log(' RAÍCES QUE NOS UNEN · servidor iniciado');
 console.log('==============================================');
 console.log(` En esta PC: http://localhost:${PORT}`);
 const addresses=accessUrls();
 if(addresses.length)addresses.forEach(url=>console.log(' Celulares en la misma Wi-Fi: '+url));
 else console.log(' Consulta tu dirección IPv4 con: ipconfig');
 console.log(' Compartí el PIN de la partida al crearla.');
 console.log(' Presioná Ctrl+C para detener el servidor.\n');
});
