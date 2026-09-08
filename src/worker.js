import { WEAPONS } from './weapons.js';

const MAX_PLAYERS = 8;
const KILL_LIMIT = 10;
const SOLIDS = [
  [-6, 6, -4, 4], [-24, -14, -6, 6], [14, 24, -6, 6],
  [-6, 6, 14, 24], [-6, 6, -24, -14], [-24, -14, 14, 24], [14, 24, 14, 24]
];
const SPAWNS = [[-25,-25],[25,-25],[-25,25],[25,25],[0,20],[0,-20],[-20,0],[20,0]];
const uid = () => crypto.randomUUID().replaceAll('-','').slice(0,12);
const cleanName = v => String(v || 'Player').replace(/[<>]/g,'').trim().slice(0,16) || 'Player';
const cleanRoomName = v => String(v || 'Quick Match').replace(/[<>]/g,'').trim().slice(0,24) || 'Quick Match';
const spawnPoint = () => SPAWNS[Math.floor(Math.random()*SPAWNS.length)];
const blocked = (x,z,r=.45) => SOLIDS.some(([a,b,c,d]) => x>a-r&&x<b+r&&z>c-r&&z<d+r);
const moveValid = (fx,fz,tx,tz) => { const n=Math.max(1,Math.ceil(Math.hypot(tx-fx,tz-fz)/.35)); for(let i=1;i<=n;i++){const t=i/n;if(blocked(fx+(tx-fx)*t,fz+(tz-fz)*t))return false;} return true; };
const segmentHitsSolid = (x1,z1,x2,z2) => { const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/.3)); for(let i=1;i<=n;i++){const t=i/n;if(blocked(x1+(x2-x1)*t,z1+(z2-z1)*t,0))return true;} return false; };
const getWeapon = id => WEAPONS.find(w=>w.id===id) || WEAPONS[0];

function publicPlayer(p){
  return {id:p.id,name:p.name,x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch,hp:p.hp,y:p.y||0,crouching:!!p.crouching,sprinting:!!p.sprinting,floor:p.floor||'concrete',mag:p.mag,reserve:p.reserve,reloading:p.reloading,weaponId:p.weaponId,dead:p.dead,kills:p.kills,deaths:p.deaths,ready:p.ready};
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response(JSON.stringify({ok:true,service:'fps-pvp',version:'cloudflare'}),{headers:{'content-type':'application/json'}});
    if (url.pathname === '/ws-check') {
    if (url.pathname === '/do-check') {
  try {
    const id = env.GAME_SERVER.idFromName('debug-check');
    const res = await env.GAME_SERVER.get(id).fetch(
      new Request(new URL('/debug', request.url))
    );
    return new Response(JSON.stringify({
      ok: true,
      status: res.status
    }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(e)
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
  return new Response(JSON.stringify({
    gameServer: !!env.GAME_SERVER
  }), {
    headers: { 'content-type': 'application/json' }
  });
}
    if (request.headers.get('Upgrade') === 'websocket') {
      const id = env.GAME_SERVER.idFromName('global-match-server');
      return env.GAME_SERVER.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};

export class GameServer {
  constructor(state, env){ this.state=state; this.env=env; this.rooms=new Map(); this.players=new Map(); }
  send(ws,data){ try{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));}catch{} }
  sendPlayer(p,data){this.send(p.ws,data)}
  broadcast(room,data,exceptId=null){for(const p of room.players.values())if(p.id!==exceptId)this.sendPlayer(p,data)}
  roomSummary(room){return {id:room.id,name:room.name,count:room.players.size,max:MAX_PLAYERS,started:room.started}}
  roomList(){return [...this.rooms.values()].filter(r=>!r.started&&r.players.size<MAX_PLAYERS).map(r=>this.roomSummary(r))}
  broadcastRoomList(){const data={type:'room_list',rooms:this.roomList()};for(const p of this.players.values())this.sendPlayer(p,data)}
  lobbyState(room){return {type:'lobby_state',roomId:room.id,roomName:room.name,hostId:room.hostId,max:MAX_PLAYERS,started:room.started,players:[...room.players.values()].map(publicPlayer)}}
  broadcastLobby(room){this.broadcast(room,this.lobbyState(room),null)}
  createRoom(name){const room={id:uid(),name:cleanRoomName(name),players:new Map(),hostId:null,max:MAX_PLAYERS,started:false};this.rooms.set(room.id,room);return room}
  resetPlayer(p){[p.x,p.z]=spawnPoint();p.hp=100;p.y=0;p.crouching=false;p.sprinting=false;p.floor='concrete';const w=getWeapon(p.weaponId);p.mag=w.magazine;p.reserve=w.reserve;p.reloading=false;p.dead=false;p.ready=false}
  addPlayer(ws,name,room){const [x,z]=spawnPoint();const p={ws,id:uid(),name:cleanName(name),x,z,yaw:0,pitch:0,hp:100,y:0,crouching:false,sprinting:false,floor:'concrete',mag:WEAPONS[0].magazine,reserve:WEAPONS[0].reserve,reloading:false,dead:false,weaponId:WEAPONS[0].id,kills:0,deaths:0,lastShot:0,ready:false,room};room.players.set(p.id,p);this.players.set(p.id,p);this.sendPlayer(p,{type:'joined',id:p.id,roomId:room.id});return p}
  removePlayer(p){const room=p.room;if(!room)return;room.players.delete(p.id);this.players.delete(p.id);if(room.hostId===p.id){room.hostId=room.players.keys().next().value||null;if(room.hostId){const h=room.players.get(room.hostId);h.ready=true;}}if(room.players.size===0)this.rooms.delete(room.id);else this.broadcastLobby(room);this.broadcastRoomList()}
  leave(p){const room=p.room;const id=p.id;this.removePlayer(p);if(room)this.broadcast(room,{type:'player_leave',id})}
  startMatch(room,requester){if(room.started)return;if(room.players.size<2){this.sendPlayer(requester,{type:'error',message:'2人以上で開始してください。'});return;}if(room.hostId!==requester.id){this.sendPlayer(requester,{type:'error',message:'ホストだけが開始できます。'});return;}room.started=true;for(const p of room.players.values()){p.kills=0;p.deaths=0;this.resetPlayer(p);p.ready=true;this.sendPlayer(p,{type:'match_start',roomId:room.id});this.sendPlayer(p,{type:'player_update',player:publicPlayer(p)})}this.broadcastLobby(room);this.broadcastRoomList()}
  finishMatch(room){if(!room?.started)return;room.started=false;const ranking=[...room.players.values()].sort((a,b)=>b.kills-a.kills).map(p=>({id:p.id,name:p.name,kills:p.kills,deaths:p.deaths}));for(const p of room.players.values()){p.ready=p.id===room.hostId;this.sendPlayer(p,{type:'match_end',ranking})}this.broadcastLobby(room);this.broadcastRoomList()}
  quickMatch(name){let room=[...this.rooms.values()].find(r=>!r.started&&r.players.size>0&&r.players.size<MAX_PLAYERS);if(!room)room=this.createRoom('QUICK MATCH');return room}
  async fetch(request){
    if(request.headers.get('Upgrade')!=='websocket')return new Response('Expected WebSocket',{status:426});
    const pair=new WebSocketPair();const [client,server]=Object.values(pair);server.accept();
    let player=null;
    this.send(server,{type:'room_list',rooms:this.roomList()});
    server.addEventListener('message',ev=>{let m;try{m=JSON.parse(ev.data)}catch{return}
      if(m.type==='list_rooms'){this.send(server,{type:'room_list',rooms:this.roomList()});return}
      if(m.type==='quick_match'){
        if(player?.room)this.leave(player);
        const room=this.quickMatch(m.playerName);player=this.addPlayer(server,m.playerName,room);this.broadcastLobby(room);this.broadcastRoomList();
        if(room.players.size>=2&&!room.started){room.hostId=room.hostId||player.id;this.startMatch(room,room.players.get(room.hostId))}
        return;
      }
      if(m.type==='create_room'){
        if(player?.room)this.leave(player);const room=this.createRoom(m.name);player=this.addPlayer(server,m.playerName,room);room.hostId=player.id;player.ready=true;this.broadcastLobby(room);this.broadcastRoomList();return;
      }
      if(m.type==='join_room'){
        if(player?.room)this.leave(player);const room=this.rooms.get(String(m.roomId));if(!room)return this.send(server,{type:'error',message:'ルームが見つかりません。'});if(room.started)return this.send(server,{type:'error',message:'この対戦はすでに開始されています。'});if(room.players.size>=MAX_PLAYERS)return this.send(server,{type:'error',message:'ルームが満員です。'});player=this.addPlayer(server,m.playerName,room);if(!room.hostId)room.hostId=player.id;this.broadcastLobby(room);this.broadcastRoomList();return;
      }
      if(!player)return;const room=player.room;
      if(m.type==='leave_room'){this.leave(player);player=null;return}
      if(m.type==='ready'){if(room.started)return;player.ready=Boolean(m.ready);this.broadcastLobby(room);return}
      if(m.type==='start_match'){this.startMatch(room,player);return}
      if(!room.started)return;
      if(m.type==='state'){
        const x=Number(m.x),z=Number(m.z);if(Number.isFinite(x)&&Number.isFinite(z)){const d=Math.hypot(x-player.x,z-player.z);if(d<=1.2&&moveValid(player.x,player.z,x,z)){player.x=Math.max(-31,Math.min(31,x));player.z=Math.max(-31,Math.min(31,z));}}
        player.yaw=Number.isFinite(Number(m.yaw))?Number(m.yaw):player.yaw;player.pitch=Math.max(-1.45,Math.min(1.45,Number(m.pitch)||0));if(Number.isFinite(Number(m.y)))player.y=Math.max(0,Math.min(2.6,Number(m.y)));player.crouching=!!m.crouching;player.sprinting=!!m.sprinting;player.floor=String(m.floor||'concrete').slice(0,16);this.broadcast(room,{type:'state',player:publicPlayer(player)},player.id);return;
      }
      if(m.type==='select_weapon'){const w=getWeapon(m.weaponId);if(player.dead||player.reloading)return;player.weaponId=w.id;player.mag=w.magazine;player.reserve=w.reserve;this.broadcast(room,{type:'player_update',player:publicPlayer(player)});return}
      if(m.type==='reload'){const w=getWeapon(player.weaponId);if(player.reloading||player.dead||player.mag>=w.magazine||player.reserve<=0)return;player.reloading=true;this.broadcast(room,{type:'player_update',player:publicPlayer(player)});setTimeout(()=>{if(!player.room||player.room.id!==room.id||!room.players.has(player.id))return;const w2=getWeapon(player.weaponId);const n=Math.min(w2.magazine-player.mag,player.reserve);player.mag+=n;player.reserve-=n;player.reloading=false;this.broadcast(room,{type:'player_update',player:publicPlayer(player)})},Math.round(w.reload*1000));return}
      if(m.type==='grenade'){if(player.dead)return;const dx=Number(m.dx)||0,dz=Number(m.dz)||0,len=Math.hypot(dx,dz)||1;const ex=Math.max(-30,Math.min(30,player.x+(dx/len)*10)),ez=Math.max(-30,Math.min(30,player.z+(dz/len)*10));this.broadcast(room,{type:'grenade',x:player.x,y:player.y||1.2,z:player.z,dx:dx/len,dy:Number(m.dy)||.15,dz:dz/len});setTimeout(()=>{if(!room.started)return;this.broadcast(room,{type:'explosion',x:ex,y:1,z:ez});for(const q of room.players.values()){if(q.dead)continue;const d=Math.hypot(q.x-ex,q.z-ez);if(d<=6){const dmg=Math.max(8,Math.round(70*(1-d/6)));q.hp-=dmg;this.broadcast(room,{type:'hit',victim:q.id,hp:Math.max(0,q.hp),killer:player.id,attackerX:player.x,attackerZ:player.z});this.sendPlayer(q,{type:'player_update',player:publicPlayer(q)});if(q.hp<=0){q.hp=0;q.dead=true;q.deaths++;player.kills++;this.broadcast(room,{type:'death',victim:q.id,killer:player.id});if(player.kills>=KILL_LIMIT)setTimeout(()=>this.finishMatch(room),250);setTimeout(()=>{if(!room.players.has(q.id))return;this.resetPlayer(q);this.broadcast(room,{type:'respawn',player:publicPlayer(q)})},2000)}}}this.sendPlayer(player,{type:'player_update',player:publicPlayer(player)})},700);return}
      if(m.type==='shoot'){const w=getWeapon(player.weaponId),now=Date.now(),minInterval=Math.max(45,Math.round(60000/w.fireRate));if(player.reloading||player.dead||player.mag<=0||now-player.lastShot<minInterval)return;player.lastShot=now;player.mag--;this.broadcast(room,{type:'shoot',id:player.id});let target=null,best=Infinity;const eyeY=(player.y||0)+(player.crouching?1.15:1.72),dirX=Math.sin(player.yaw)*Math.cos(player.pitch),dirY=-Math.sin(player.pitch),dirZ=-Math.cos(player.yaw)*Math.cos(player.pitch);for(const q of room.players.values()){if(q===player||q.dead)continue;const tx=q.x-player.x,tz=q.z-player.z,d=Math.hypot(tx,tz);if(d>w.range||segmentHitsSolid(player.x,player.z,q.x,q.z))continue;const bodyY=(q.y||0)+(q.crouching?1.05:1.55),vx=q.x-player.x,vy=bodyY-eyeY,vz=q.z-player.z,len=Math.hypot(vx,vy,vz)||1,dot=(vx/len)*dirX+(vy/len)*dirY+(vz/len)*dirZ,tol=Math.max(.035,.34/Math.max(1,d));if(dot>1-tol&&d<best){best=d;target=q}}
        if(target){const bodyY=(target.y||0)+(target.crouching?1.05:1.55),d=Math.hypot(target.x-player.x,target.z-player.z)||1,headExpected=Math.atan2((target.y||0)+(target.crouching?1.45:2.05)-eyeY,d),headShot=Math.abs(player.pitch-headExpected)<.075;let damage=w.damage*(w.pellets||1);if(headShot)damage*=Number(w.headMultiplier||1.5);target.hp-=damage;if(target.hp<=0){target.hp=0;target.dead=true;target.deaths++;player.kills++;this.broadcast(room,{type:'death',victim:target.id,killer:player.id});if(player.kills>=KILL_LIMIT)setTimeout(()=>this.finishMatch(room),250);this.sendPlayer(player,{type:'player_update',player:publicPlayer(player)});setTimeout(()=>{if(!room.players.has(target.id))return;this.resetPlayer(target);this.broadcast(room,{type:'respawn',player:publicPlayer(target)})},2000)}else{this.broadcast(room,{type:'hit',victim:target.id,hp:target.hp,killer:player.id,attackerX:player.x,attackerZ:player.z});this.sendPlayer(target,{type:'player_update',player:publicPlayer(target)})}}
        this.sendPlayer(player,{type:'player_update',player:publicPlayer(player)});return}
    });
    server.addEventListener('close',()=>{if(player?.room)this.leave(player)});
    return new Response(null,{status:101,webSocket:client});
  }
}
