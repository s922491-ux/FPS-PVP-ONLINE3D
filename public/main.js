import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";
import { WEAPONS } from "./weapons.js";

const canvas = document.querySelector("#game");
const lobby = document.querySelector("#lobby");
const nameEl = document.querySelector("#name");
const roomsEl = document.querySelector("#rooms");
const notice = document.querySelector("#notice");
const nameView = document.querySelector("#nameView");
const lobbyView = document.querySelector("#lobbyView");
const roomTitle = document.querySelector("#roomTitle");
const roomCount = document.querySelector("#roomCount");
const playersEl = document.querySelector("#players");
const readyBtn = document.querySelector("#ready");
const startBtn = document.querySelector("#start");
const leaveBtn = document.querySelector("#leave");
const weaponGrid = document.querySelector("#weaponGrid");
const weaponFilters = document.querySelector("#weaponFilters");
const result = document.querySelector("#result");
const resultBody = document.querySelector("#resultBody");
const backLobby = document.querySelector("#backLobby");
const refreshBtn = document.querySelector("#refresh");
const createBtn = document.querySelector("#create");
const hud = document.querySelector("#hud");
const deathEl = document.querySelector("#death");
let weaponIndex = 0;
let currentWeapon = WEAPONS[weaponIndex];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b10);
scene.fog = new THREE.Fog(0x080b10, 35, 130);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 250);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

scene.add(new THREE.HemisphereLight(0xb8d0e8, 0x202020, 2));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(30, 50, 20);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9bb7d1, .65); fill.position.set(-35,18,-25); scene.add(fill);
const beacon = new THREE.PointLight(0x6b8fb0, 12, 28); beacon.position.set(0,6,0); scene.add(beacon);

const crateMat = new THREE.MeshStandardMaterial({color:0x343b42,roughness:.72,metalness:.08});
const stripeMat = new THREE.MeshStandardMaterial({color:0xb48a42,roughness:.5});
function crate(x,z,s=2){ const g=new THREE.Group(); const c=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),crateMat); c.position.y=s/2; c.castShadow=c.receiveShadow=true; g.add(c); const stripe=new THREE.Mesh(new THREE.BoxGeometry(s+.02,.16,s+.02),stripeMat); stripe.position.y=s*.62; stripe.castShadow=true; g.add(stripe); g.position.set(x,0,z); scene.add(g); }
crate(-7,-18,2.2); crate(-4,-18,2.2); crate(14,10,2.6); crate(17,10,1.7); crate(-20,4,2.0);
function lightPole(x,z){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.11,5.5,8),darkMat); pole.position.set(x,2.75,z); pole.castShadow=true; scene.add(pole); const l=new THREE.PointLight(0xffd9a3,18,14); l.position.set(x,5.5,z); scene.add(l); }
lightPole(-28,-28); lightPole(28,28); lightPole(-28,28); lightPole(28,-28);


const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({ color: 0x252b31 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x56616b, roughness:.82, metalness:.12 });
function box(x, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  m.position.set(x, h / 2, z);
  scene.add(m);
}
box(0, -35, 70, 5, 3); box(0, 35, 70, 5, 3);
box(-35, 0, 3, 5, 70); box(35, 0, 3, 5, 70);
box(-12, -10, 9, 4, 3); box(10, -5, 4, 3, 13);
box(-5, 14, 13, 3, 3); box(17, 16, 7, 4, 4);
box(-19, 19, 5, 3, 9);
// Multi-level combat lanes: platforms, catwalks, ramps and cover
const platformMat=new THREE.MeshStandardMaterial({color:0x3d454c,roughness:.78,metalness:.28,map:wallTex});
function platform(x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),platformMat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;}
platform(-20,3.2,0,9,.55,5); platform(20,3.2,0,9,.55,5); platform(0,2.6,22,10,.5,5); platform(0,2.6,-22,10,.5,5);
function ramp(x,y,z,w,h,d,rot=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),platformMat);m.position.set(x,y,z);m.rotation.z=rot;m.castShadow=m.receiveShadow=true;scene.add(m);}
ramp(-14,1.5,0,4,2.5,7,.28); ramp(14,1.5,0,4,2.5,7,-.28);
for(const z of [-28,-14,0,14,28]){const line=new THREE.Mesh(new THREE.BoxGeometry(62,.025,.035),new THREE.MeshBasicMaterial({color:0x66717a}));line.position.set(0,.015,z);scene.add(line);}


// --- AAA-style procedural FPS viewmodel / effects ---
const gun = new THREE.Group();
const gunRoot = new THREE.Group(); gun.add(gunRoot);
const gunMat = new THREE.MeshStandardMaterial({ color: 0x171b20, metalness: .88, roughness: .22 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: .55, roughness: .34 });
const polymerMat = new THREE.MeshStandardMaterial({ color: 0x313942, metalness: .08, roughness: .7 });
const accentMat = new THREE.MeshStandardMaterial({ color: 0x8b9aa7, metalness: .8, roughness: .2 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0x9b6c55, roughness: .82 });
let weaponPieces=[];
let reloadAnim=0;
function clearGun(){ while(gunRoot.children.length) gunRoot.remove(gunRoot.children[0]); weaponPieces=[]; }
function gp(geo,mat,pos,rot=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;gunRoot.add(m);weaponPieces.push(m);return m;}
function buildWeaponModel(w){
  clearGun();
  const cat=w.category;
  const variant=(parseInt(String(w.id).replace(/\D/g,''),10)||1)%7;
  const barrel=1+(variant%3)*.08;
  if(cat==='Handgun'){
    gp(new THREE.BoxGeometry(.34,.25,.72),gunMat,[.34,-.27,-.72]);
    gp(new THREE.BoxGeometry(.18,.42,.28),polymerMat,[.34,-.48,-.52],[.12,0,0]);
    gp(new THREE.CylinderGeometry(.065,.06,.48*barrel,14),gunMat,[.34,-.27,-1.28],[Math.PI/2,0,0]);
    gp(new THREE.CylinderGeometry(.09,.07,.11,14),accentMat,[.34,-.27,-1.49],[Math.PI/2,0,0]);
  } else if(cat==='SMG'){
    gp(new THREE.BoxGeometry(.38,.28,1.05),gunMat,[.31,-.25,-.72]);
    gp(new THREE.BoxGeometry(.18,.5,.34),polymerMat,[.31,-.53,-.62],[.12,0,0]);
    gp(new THREE.BoxGeometry(.18,.5,.22),darkMat,[.31,-.48,-.98]);
    gp(new THREE.CylinderGeometry(.055,.055,.68*barrel,14),gunMat,[.31,-.24,-1.58],[Math.PI/2,0,0]);
    gp(new THREE.CylinderGeometry(.09,.075,.1,14),accentMat,[.31,-.24,-1.92],[Math.PI/2,0,0]);
  } else if(cat==='Shotgun'){
    gp(new THREE.BoxGeometry(.46,.3,.9),gunMat,[.31,-.23,-.67]);
    gp(new THREE.BoxGeometry(.2,.48,.34),polymerMat,[.31,-.53,-.5],[.14,0,0]);
    gp(new THREE.CylinderGeometry(.085,.075,1.25*barrel,16),gunMat,[.31,-.21,-1.48],[Math.PI/2,0,0]);
    gp(new THREE.CylinderGeometry(.12,.1,.08,16),accentMat,[.31,-.21,-2.1],[Math.PI/2,0,0]);
  } else if(cat==='Sniper'){
    gp(new THREE.BoxGeometry(.32,.27,1.45),gunMat,[.31,-.23,-.83]);
    gp(new THREE.BoxGeometry(.18,.46,.34),polymerMat,[.31,-.51,-.42],[.1,0,0]);
    gp(new THREE.CylinderGeometry(.055,.055,1.25*barrel,14),gunMat,[.31,-.19,-1.88],[Math.PI/2,0,0]);
    gp(new THREE.CylinderGeometry(.1,.09,.55,16),accentMat,[.31,-.1,-1.08],[Math.PI/2,0,0]);
  } else {
    gp(new THREE.BoxGeometry(.4,.28,1.2),gunMat,[.31,-.24,-.76]);
    gp(new THREE.BoxGeometry(.19,.52,.34),polymerMat,[.31,-.53,-.52],[.13,0,0]);
    gp(new THREE.BoxGeometry(.13,.34,.65),darkMat,[.31,-.42,-1.05]);
    gp(new THREE.CylinderGeometry(.06,.06,.92*barrel,14),gunMat,[.31,-.22,-1.75],[Math.PI/2,0,0]);
    gp(new THREE.CylinderGeometry(.09,.075,.12,14),accentMat,[.31,-.22,-2.2],[Math.PI/2,0,0]);
  }
  gp(new THREE.BoxGeometry(.07,.08,.3),darkMat,[.31,-.08,-.48]);
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),skinMat);hand.position.set(.25,-.42,-.62);gunRoot.add(hand);
  for(let i=0;i<variant;i++){const rail=new THREE.Mesh(new THREE.BoxGeometry(.035,.025,.16),accentMat);rail.position.set(.31,.0,-.62-i*.14);gunRoot.add(rail);}
}
function makeCanvasTexture(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
const floorTex=makeCanvasTexture((x,w,h)=>{x.fillStyle='#24282b';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.045})`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*4,1+Math.random()*4)}for(let i=0;i<16;i++){x.strokeStyle='rgba(0,0,0,.25)';x.strokeRect(i*16,0,16,h)}},512,512);floorTex.repeat.set(7,7);
const wallTex=makeCanvasTexture((x,w,h)=>{x.fillStyle='#4b545b';x.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){x.strokeStyle='rgba(255,255,255,.05)';x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}for(let i=0;i<700;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.12})`;x.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*8,2+Math.random()*8)}},512,512);
wallMat.map=wallTex; wallMat.map.needsUpdate=true; const groundMat=new THREE.MeshStandardMaterial({map:floorTex,color:0x9aa0a3,roughness:.9,metalness:.02}); ground.material=groundMat;
const muzzle = new THREE.PointLight(0xffb85c,0,4); muzzle.position.set(.31,-.22,-2.18); gunRoot.add(muzzle);
const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(.13,.42,8),new THREE.MeshBasicMaterial({color:0xffc45d,transparent:true,opacity:0}));muzzleFlash.rotation.x=-Math.PI/2;muzzleFlash.position.set(.31,-.22,-2.38);gunRoot.add(muzzleFlash);
let recoil=0,bobTime=0,flashTimer=0;
let swapAnim=0, swapFrom=0, ads=false, scopeVisible=false, sprinting=false, crouching=false;
let verticalVelocity=0, grounded=true, footTimer=0, grenadeCooldown=0, recoilStep=0;
const recoilPattern=[{x:.004,y:.018},{x:-.006,y:.022},{x:.009,y:.025},{x:-.011,y:.028},{x:.014,y:.032},{x:-.018,y:.035},{x:.020,y:.038},{x:-.022,y:.041}];
const explosionFx=[]; const grenades=[];
function fireVisual(){
  const r=recoilPattern[Math.min(recoilStep++,recoilPattern.length-1)];
  recoil=Math.min(.28,recoil+.1); yaw+=r.x; pitch=Math.max(-1.45,Math.min(1.45,pitch-r.y));
  flashTimer=.06; muzzle.intensity=12; muzzleFlash.material.opacity=1;
  playShot(currentWeapon); ejectShell(); spawnSmoke();
  setTimeout(()=>{muzzle.intensity=0;muzzleFlash.material.opacity=0},60);
}
function buildShell(){const s=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.12,8),new THREE.MeshStandardMaterial({color:0xb88b45,metalness:.8,roughness:.25}));return s;}
const shells=[];
function ejectShell(){const s=buildShell();s.position.copy(camera.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(.18,-.18,-.4));scene.add(s);s.userData.v=new THREE.Vector3(.8+Math.random()*.5,.9+Math.random()*.5,-.1+Math.random()*.25);s.userData.life=1.5;s.rotation.set(Math.random(),Math.random(),Math.random());shells.push(s);}
function animateShells(dt){for(let i=shells.length-1;i>=0;i--){const s=shells[i];s.userData.life-=dt;s.userData.v.y-=7*dt;s.position.addScaledVector(s.userData.v,dt);s.rotation.x+=dt*9;s.rotation.z+=dt*7;if(s.position.y<.04){s.position.y=.04;s.userData.v.y*=-.25;s.userData.v.x*=.7;s.userData.v.z*=.7}if(s.userData.life<=0){scene.remove(s);shells.splice(i,1)}}}
function startReloadVisual(){reloadAnim=0; recoilStep=0;}
function spawnSmoke(){
  for(let i=0;i<3;i++){
    const s=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.035,7,7),new THREE.MeshBasicMaterial({color:0xc8c8c8,transparent:true,opacity:.22}));
    s.position.copy(muzzleFlash.getWorldPosition(new THREE.Vector3())); s.userData.life=.35+Math.random()*.25;
    s.userData.v=new THREE.Vector3((Math.random()-.5)*.4,.2+Math.random()*.35,-.35-Math.random()*.4); scene.add(s); explosionFx.push(s);
  }
}
function animateSmoke(dt){for(let i=explosionFx.length-1;i>=0;i--){const s=explosionFx[i];s.userData.life-=dt;s.position.addScaledVector(s.userData.v,dt);s.scale.multiplyScalar(1+dt*2);s.material.opacity=Math.max(0,s.userData.life*0.45);if(s.userData.life<=0){scene.remove(s);s.material.dispose();explosionFx.splice(i,1)}}}
function updateWeaponVisual(dt){swapAnim=Math.min(1,swapAnim+dt*5);const swap=Math.sin(swapAnim*Math.PI);const moving=!!(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight);bobTime+=dt*(moving?10:2);const bob=moving?Math.sin(bobTime)*.018:0;recoil=Math.max(0,recoil-dt*.75);reloadAnim=me?.reloading?Math.min(1,reloadAnim+dt/Math.max(.25,currentWeapon.reload)):Math.max(0,reloadAnim-dt*4);gunRoot.position.y=bob-recoil*.12;gunRoot.position.z=recoil;gunRoot.rotation.x=-recoil*.45+swap*.9;gunRoot.rotation.z=moving?Math.sin(bobTime*.5)*.008:0;gunRoot.position.x=swap*.35;if(reloadAnim>0){gunRoot.rotation.x+=Math.sin(reloadAnim*Math.PI)*.75;gunRoot.position.y-=Math.sin(reloadAnim*Math.PI)*.16;gunRoot.position.z+=Math.sin(reloadAnim*Math.PI)*.08}}
buildWeaponModel(currentWeapon);camera.add(gun);scene.add(camera);

let ws = null;
let me = null;
let roomState = null;
const others = new Map();
const keys = {};
let yaw = 0, pitch = 0, locked = false, networkClock = 0, last = performance.now();
let scoreboardOpen=false, firing=false, fireClock=0;
const reloadBar=document.querySelector("#reloadBar"); const hitmarker=document.querySelector("#hitmarker"); const damageFlash=document.querySelector("#damageFlash");
function showHit(){ hitmarker.classList.add("hit-on"); setTimeout(()=>hitmarker.classList.remove("hit-on"),90); }
function showDamage(){ damageFlash.classList.add("damage-on"); setTimeout(()=>damageFlash.classList.remove("damage-on"),90); }
function feed(text){ const el=document.createElement("div"); el.className="feed"; el.textContent=text; document.querySelector("#killfeed").prepend(el); setTimeout(()=>el.remove(),3500); }
function renderScoreboard(){ const rows=[...(roomState?.players||[])].sort((a,b)=>(b.kills-a.kills)||(a.deaths-b.deaths)); document.querySelector("#scoreRows").innerHTML=rows.map(p=>`<div class="scoreRow ${p.id===me?.id?"me":""}"><span>${escapeHtml(p.name)}</span><span>${p.kills} K</span><span>${p.deaths} D</span></div>`).join(""); }


let audioCtx=null;
function audio(){if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}
function noiseBurst(duration=.06,gain=.06,cut=1800){const c=audio(),n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate*duration,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);n.buffer=b;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;const g=c.createGain();g.gain.value=gain;n.connect(f).connect(g).connect(c.destination);n.start();n.stop(c.currentTime+duration)}
function playShot(w){const c=audio(),o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(w.category==='Sniper'?90:w.category==='Shotgun'?65:130,c.currentTime);o.frequency.exponentialRampToValueAtTime(45,c.currentTime+.09);g.gain.setValueAtTime(.16,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.12);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.12);noiseBurst(w.category==='Shotgun'?.12:.07,.08,w.category==='Sniper'?1200:2400)}
function playFootstep(){
  const c=audio(),o=c.createOscillator(),g=c.createGain();
  const floor=me?.floor||'concrete'; const base=floor==='metal'?115:floor==='wood'?92:floor==='gravel'?70:82;
  o.type=floor==='metal'?'square':'triangle'; o.frequency.value=base+Math.random()*25; g.gain.setValueAtTime(sprinting?.05:.032,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.09); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+.1);
}
function playReload(){const c=audio();[0,.18,.42,.68].forEach((t,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=[180,240,320,210][i];g.gain.setValueAtTime(.035,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.06);o.connect(g).connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+.07)})}

function send(data) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function playerMesh(p) {
  const g=new THREE.Group();
  const armor=new THREE.MeshStandardMaterial({color:0x344653,roughness:.7,metalness:.18});
  const skin=new THREE.MeshStandardMaterial({color:0x8e604c,roughness:.85});
  const body=new THREE.Mesh(new THREE.BoxGeometry(.72,1.15,.5),armor);body.position.y=1.25;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.29,16,12),skin);head.position.y=2.12;head.castShadow=true;g.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.31,16,8,0,Math.PI*2,0,Math.PI*.55),new THREE.MeshStandardMaterial({color:0x1b2329,metalness:.55,roughness:.35}));helmet.position.y=2.17;g.add(helmet);
  const l=new THREE.Mesh(new THREE.BoxGeometry(.22,.85,.22),armor),r=l.clone();l.position.set(-.2,.48,0);r.position.set(.2,.48,0);g.add(l,r);
  const lArm=new THREE.Mesh(new THREE.BoxGeometry(.2,.8,.2),armor),rArm=lArm.clone();lArm.position.set(-.5,1.32,0);rArm.position.set(.5,1.32,0);g.add(lArm,rArm);
  const rifle=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.85),darkMat);rifle.position.set(.42,1.28,-.38);rifle.rotation.x=-.2;g.add(rifle);
  g.userData={target:new THREE.Vector3(),targetYaw:0,player:p,limbs:{l,r,lArm,rArm},walk:0};scene.add(g);return g;
}

function applyPlayer(p) {
  if (!p) return;
  if (me?.id === p.id) {
    me = { ...me, ...p };
    if (me.dead) deathEl.style.display = "flex";
    else deathEl.style.display = "none";
    return;
  }
  let g = others.get(p.id);
  if (!g) { g = playerMesh(p); others.set(p.id, g); }
  g.userData.player = p;
  g.userData.target.set(p.x, p.y||0, p.z);
  g.userData.targetYaw = p.yaw || 0;
  g.visible = !p.dead; g.scale.y = p.crouching ? .72 : 1;
}

function renderRoomList(list) {
  roomsEl.innerHTML = "";
  if (!list.length) {
    roomsEl.innerHTML = `<div class="roomrow"><div class="muted">参加可能なルームがありません。「ルーム作成」から作成できます。</div></div>`;
    return;
  }
  for (const r of list) {
    const row = document.createElement("div");
    row.className = "roomrow";
    row.innerHTML = `<div><div class="roomname">${escapeHtml(r.name)}</div><div class="muted">ID: ${r.id}</div></div><div>${r.count} / ${r.max}</div><button>参加</button>`;
    row.querySelector("button").onclick = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      send({ type: "join_room", roomId: r.id, playerName: nameEl.value || "Player" });
    };
    roomsEl.appendChild(row);
  }
}

function renderLobby() {
  if (!roomState) return;
  nameView.style.display = "none";
  lobbyView.style.display = "block";
  roomTitle.textContent = roomState.roomName;
  roomCount.textContent = `${roomState.players.length} / ${roomState.max}`;
  playersEl.innerHTML = "";

  for (const p of roomState.players) {
    const row = document.createElement("div");
    row.className = "player";
    const badges = [];
    if (p.id === roomState.hostId) badges.push(`<span class="badge">HOST</span>`);
    if (p.ready) badges.push(`<span class="badge ready">READY</span>`);
    row.innerHTML = `<span>${escapeHtml(p.name)}${badges.join("")}</span><span>${p.id === me?.id ? "あなた" : ""}</span>`;
    playersEl.appendChild(row);
  }

  const isHost = roomState.hostId === me?.id;
  readyBtn.style.display = isHost ? "none" : "inline-block";
  readyBtn.textContent = me?.ready ? "準備を取り消す" : "準備完了";
  startBtn.style.display = isHost ? "inline-block" : "none";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function selectWeapon(index) {
  if (!WEAPONS[index]) return;
  weaponIndex = index;
  currentWeapon = WEAPONS[index];
  buildWeaponModel(currentWeapon);
  document.querySelector("#weaponName").textContent = currentWeapon.name;
  document.querySelector("#weaponMeta").textContent = `${currentWeapon.category} · ${currentWeapon.rarity} · ${currentWeapon.damage} DMG · ${currentWeapon.magazine} MAG`;
  if (me && !roomState?.started) {
    me.mag = currentWeapon.magazine;
    me.reserve = currentWeapon.reserve;
  }
  if (me && roomState?.started) send({ type: "select_weapon", weaponId: currentWeapon.id });
  document.querySelectorAll("[data-weapon]").forEach(b => b.style.outline = "none");
  const selected = document.querySelector(`[data-weapon="${currentWeapon.id}"]`);
  if (selected) selected.style.outline = "2px solid #fff";
}

function swapWeapon(){
  const candidates=WEAPONS.map((w,i)=>({w,i})).filter(o=>o.w.slot!==currentWeapon.slot);
  if(!candidates.length)return;
  const next=candidates[0];
  const targetIndex=next.i;
  swapFrom=weaponIndex; swapAnim=0; selectWeapon(targetIndex); playWeaponSwap();
}
function playWeaponSwap(){
  const c=audio();
  [0,.12,.25].forEach((t,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=[150,240,190][i];g.gain.setValueAtTime(.035,c.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+t+.055);o.connect(g).connect(c.destination);o.start(c.currentTime+t);o.stop(c.currentTime+t+.06)});
}
function throwGrenade(){
  if(!me||me.dead||grenadeCooldown>0)return;
  grenadeCooldown=1.1; const dir=new THREE.Vector3(Math.sin(yaw),.15,-Math.cos(yaw));
  send({type:'grenade',x:me.x,y:camera.position.y,z:me.z,dx:dir.x,dy:dir.y,dz:dir.z}); playGrenadeThrow();
}
function playGrenadeThrow(){const c=audio(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(280,c.currentTime);o.frequency.exponentialRampToValueAtTime(90,c.currentTime+.18);g.gain.setValueAtTime(.06,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.2);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.21)}
function showDamageDirection(x,z){
  if(!me)return; const a=Math.atan2(x-me.x,z-me.z)-yaw; const el=document.querySelector('#damageDir'); if(!el)return; el.style.transform=`translate(-50%,-50%) rotate(${a}rad)`; el.classList.add('damage-dir-on'); setTimeout(()=>el.classList.remove('damage-dir-on'),260);
}
function grenadeVisual(x,y,z,dx,dy,dz){
  const g=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),new THREE.MeshStandardMaterial({color:0x252a2e,roughness:.55,metalness:.3}));
  g.position.set(x,y,z); g.userData.v=new THREE.Vector3(dx*9,dy*9,dz*9); g.userData.life=.7; scene.add(g); grenades.push(g);
}
function animateGrenades(dt){for(let i=grenades.length-1;i>=0;i--){const g=grenades[i];g.userData.life-=dt;g.userData.v.y-=10*dt;g.position.addScaledVector(g.userData.v,dt);g.rotation.x+=dt*8;g.rotation.z+=dt*6;if(g.position.y<.15){g.position.y=.15;g.userData.v.y*=-.42;g.userData.v.x*=.75;g.userData.v.z*=.75;}if(g.userData.life<=0){scene.remove(g);g.material.dispose();grenades.splice(i,1)}}}

function explosionVisual(x,y,z){
  const g=new THREE.Group();g.position.set(x,y||1,z);scene.add(g);
  const ring=new THREE.Mesh(new THREE.SphereGeometry(.35,16,10),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.8}));g.add(ring);
  const light=new THREE.PointLight(0xff7a33,25,12);g.add(light);
  const started=performance.now(); const tick=()=>{const p=(performance.now()-started)/420;ring.scale.setScalar(1+p*10);ring.material.opacity=.8*(1-p);light.intensity=25*(1-p);if(p<1)requestAnimationFrame(tick);else{scene.remove(g);ring.material.dispose();}};tick();
  noiseBurst(.2,.16,900);
}

function renderWeaponGrid(filter = "All") {
  if (!weaponGrid) return;
  weaponGrid.innerHTML = "";
  for (let i = 0; i < WEAPONS.length; i++) {
    const w = WEAPONS[i];
    if (filter !== "All" && w.category !== filter) continue;
    const b = document.createElement("button");
    b.dataset.weapon = w.id;
    b.style.textAlign = "left";
    b.style.padding = "9px";
    b.innerHTML = `<b>${i < 9 ? i + 1 : ""} ${escapeHtml(w.name)}</b><br><small>${escapeHtml(w.category)} · ${escapeHtml(w.rarity)}<br>DMG ${w.damage} · RPM ${w.fireRate} · MAG ${w.magazine}</small>`;
    b.onclick = () => selectWeapon(i);
    weaponGrid.appendChild(b);
  }
  selectWeapon(weaponIndex);
}

function renderWeaponFilters() {
  if (!weaponFilters) return;
  weaponFilters.innerHTML = "";
  ["All","Handgun","Rifle","SMG","Sniper","Shotgun"].forEach(cat => {
    const b = document.createElement("button");
    b.textContent = cat === "All" ? "全部" : cat;
    b.onclick = () => renderWeaponGrid(cat);
    weaponFilters.appendChild(b);
  });
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    notice.textContent = "接続しました。ルームを選ぶか作成してください。";
    send({ type: "quick_match", playerName: nameEl.value || "Player" });
  };

  ws.onmessage = e => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }

    if (m.type === "room_list") {
      renderRoomList(m.rooms || []);
      return;
    }

    if (m.type === "joined") {
      me = { id: m.id, name: nameEl.value || "Player", hp: 100, mag: currentWeapon.magazine, reserve: currentWeapon.reserve, kills: 0, deaths: 0, dead: false, weaponId: currentWeapon.id };
      return;
    }

    if (m.type === "lobby_state") {
      roomState = m;
      const mine = m.players.find(p => p.id === me?.id);
      if (mine) me = { ...me, ...mine };
      renderLobby();
      return;
    }

    if (m.type === "match_end") {
      resultBody.innerHTML = `<ol>${m.ranking.map((p, i) => `<li><b>${escapeHtml(p.name)}</b> — ${p.kills} K / ${p.deaths} D</li>`).join("")}</ol>`;
      result.style.display = "flex";
      lobby.style.display = "none";
      document.exitPointerLock?.();
      return;
    }

    if (m.type === "match_start") {
      lobby.style.display = "none";
      hud.style.display = "block";
      deathEl.style.display = "none";
      document.querySelector("#killfeed").innerHTML="";
      canvas.requestPointerLock();
      return;
    }

    if (m.type === "player_join") {
      applyPlayer(m.player);
      return;
    }

    if (m.type === "player_leave") {
      const g = others.get(m.id);
      if (g) { scene.remove(g); others.delete(m.id); }
      return;
    }

    if (m.type === "state" || m.type === "player_update" || m.type === "respawn") {
      applyPlayer(m.player);
      return;
    }

    if (m.type === "death") {
      const g = others.get(m.victim);
      if (g) g.visible = false;
      if (m.victim === me?.id) deathEl.style.display = "flex";
      const victimName = m.victim === me?.id ? me.name : (roomState?.players.find(p=>p.id===m.victim)?.name || "Player");
      const killerName = m.killer === me?.id ? me.name : (roomState?.players.find(p=>p.id===m.killer)?.name || "Player");
      feed(`${killerName}  ›  ${victimName}`);
      return;
    }

    if (m.type === "hit") {
      if (m.victim === me?.id) { showDamage(); showDamageDirection(m.attackerX ?? 0,m.attackerZ ?? 0); }
      if (m.killer === me?.id) showHit();
      return;
    }

    if (m.type === 'grenade') { grenadeVisual(m.x,m.y,m.z,m.dx,m.dy,m.dz); return; }
    if (m.type === 'explosion') { explosionVisual(m.x,m.y,m.z); return; }

    if (m.type === "shoot") {
      if (m.id === me?.id) { fireVisual(); }
      else { const g=others.get(m.id); if(g){ g.userData.shootKick=.16; } }
      return;
    }

    if (m.type === "error") {
      notice.textContent = m.message;
      return;
    }
  };

  ws.onclose = () => {
    notice.textContent = "サーバーから切断されました。再接続しています…";
    setTimeout(connect, 1500);
  };
}

refreshBtn.onclick = () => send({ type: "list_rooms" });
createBtn.onclick = () => {
  const roomName = prompt("ルーム名を入力してください", "My Arena");
  if (roomName?.trim()) send({ type: "create_room", name: roomName, playerName: nameEl.value || "Player" });
};
readyBtn.onclick = () => {
  if (me) send({ type: "ready", ready: !me.ready });
};
startBtn.onclick = () => send({ type: "start_match" });
backLobby.onclick = () => {
  result.style.display = "none";
  lobby.style.display = "flex";
  hud.style.display = "none";
  if (roomState) renderLobby();
};

leaveBtn.onclick = () => {
  send({ type: "leave_room" });
  roomState = null;
  nameView.style.display = "block";
  lobbyView.style.display = "none";
  notice.textContent = "ルームを退出しました。";
};

addEventListener("keydown", e => {
  keys[e.code] = true;
  if(e.repeat && ['KeyE','KeyR','KeyG','Space'].includes(e.code)) return;
  if (/^Digit[1-9]$/.test(e.code)) { const n=Number(e.code.slice(-1))-1; if(WEAPONS[n]) selectWeapon(n); }
  if(e.code==='Digit0') selectWeapon(9);
  if(e.code==='KeyE') swapWeapon();
  if(e.code==='KeyR'){ playReload(); startReloadVisual(); send({type:'reload'}); }
  if(e.code==='KeyF') fireOnce();
  if(e.code==='KeyG') throwGrenade();
  if(e.code==='ShiftRight'){ ads=true; }
  if(e.code==='ShiftLeft'){ sprinting=true; }
  if(e.code==='KeyC' || e.code==='ControlLeft' || e.code==='ControlRight'){ crouching=true; }
  if(e.code==='Space' && grounded && !crouching){ verticalVelocity=5.2; grounded=false; }
  if(e.code==='Tab'){e.preventDefault();scoreboardOpen=true;document.querySelector('#scoreboard').style.display='block';renderScoreboard();}
});
addEventListener("keyup", e => {
  keys[e.code]=false;
  if(e.code==='ShiftRight') ads=false;
  if(e.code==='ShiftLeft') sprinting=false;
  if(e.code==='KeyC' || e.code==='ControlLeft' || e.code==='ControlRight') crouching=false;
  if(e.code==='Tab'){scoreboardOpen=false;document.querySelector('#scoreboard').style.display='none';}
});

canvas.onclick = () => {
  if (hud.style.display !== "none") canvas.requestPointerLock();
};
document.onpointerlockchange = () => { locked = document.pointerLockElement === canvas; if(!locked) firing=false; };
document.onmousemove = e => {
  if (locked) {
    yaw -= e.movementX * .0022;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * .0022));
  }
};
addEventListener("mousedown", e => {
  if (locked && e.button === 0) { firing=true; fireOnce(); }
});
addEventListener("mouseup", e => { if(e.button===0) firing=false; });

const SOLIDS=[[-6,6,-4,4],[-24,-14,-6,6],[14,24,-6,6],[-6,6,14,24],[-6,6,-24,-14],[-24,-14,14,24],[14,24,14,24]];
function clientBlocked(x,z,r=.45){return SOLIDS.some(([a,b,c,d])=>x>a-r&&x<b+r&&z>c-r&&z<d+r);}
function tryMove(dx,dz){const nx=Math.max(-31,Math.min(31,(me.x||0)+dx));const nz=Math.max(-31,Math.min(31,(me.z||0)+dz));if(!clientBlocked(nx,me.z||0))me.x=nx;if(!clientBlocked(me.x||0,nz))me.z=nz;}
function fireOnce(){if(!me||me.dead||!roomState?.started||me.reloading)return;send({type:'shoot'});}

function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000);
  last = t;
  if(firing && locked && me && roomState?.started && !me.dead){ fireClock-=dt; const interval=60/Math.max(120,currentWeapon.fireRate||600)/1000; if(fireClock<=0){fireOnce(); fireClock=interval;} } else { fireClock=0; }

  if (me && roomState?.started && !me.dead) {
    const d = new THREE.Vector3();
    if (keys.KeyW || keys.ArrowUp) d.z--;
    if (keys.KeyS || keys.ArrowDown) d.z++;
    if (keys.KeyA || keys.ArrowLeft) d.x--;
    if (keys.KeyD || keys.ArrowRight) d.x++;
    if (d.lengthSq()) d.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const speed = crouching ? 3.4 : (sprinting && !ads ? 11.5 : 7.5);
    tryMove(d.x * speed * dt,d.z * speed * dt);
    verticalVelocity -= 14*dt; me.y=(me.y||0)+verticalVelocity*dt;
    if(me.y<=0){me.y=0;verticalVelocity=0;grounded=true;} else grounded=false;
    camera.position.set(me.x, (crouching?1.15:1.72)+(me.y||0), me.z);
    const targetFov=ads?(currentWeapon.category==='Sniper'?34:50):72; camera.fov += (targetFov-camera.fov)*Math.min(1,dt*10); camera.updateProjectionMatrix();
    camera.rotation.y = yaw; camera.rotation.x = pitch;
    me.crouching=crouching; me.sprinting=sprinting; me.floor=((Math.floor(me.x)+Math.floor(me.z))%3===0?'concrete':((Math.floor(me.x)+Math.floor(me.z))%3===1?'metal':'gravel'));

    networkClock += dt;
    if (networkClock >= .05) {
      networkClock = 0;
      send({ type:'state', x:me.x, y:me.y||0, z:me.z, yaw, pitch, crouching, sprinting, floor:me.floor });
    }
  }

  if (me && roomState?.started && !me.dead) {
    const moving = (keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight);
    if(moving) bobTime += dt*10; else bobTime += dt*2;
    const bob = moving ? Math.sin(bobTime)*.018 : 0;
    recoil = Math.max(0,recoil-dt*.7);
    gun.position.y = bob - recoil*.12 - (ads?.06:0); gun.position.z = recoil + (ads?.12:0); gun.rotation.x = -recoil*.45 + (ads?.02:0); gun.position.x = ads?.08:0;
    if(me.reloading){ reloadBar.style.opacity="1"; const pct=Math.min(100,(reloadAnim/Math.max(.01,currentWeapon.reload))*100); reloadBar.firstElementChild.style.width=pct+"%"; document.querySelector("#reloadLabel").style.opacity=".8"; } else { reloadBar.style.opacity="0"; reloadBar.firstElementChild.style.width="0"; document.querySelector("#reloadLabel").style.opacity="0"; }
  }

  let footMoving=false;
  for (const g of others.values()) {
    g.position.lerp(g.userData.target, Math.min(1, dt * 12));
    g.rotation.y += Math.atan2(Math.sin(g.userData.targetYaw - g.rotation.y),Math.cos(g.userData.targetYaw - g.rotation.y))*Math.min(1,dt*12);
    const speed=g.position.distanceTo(g.userData.lastPos||g.position); g.userData.lastPos=g.position.clone();
    g.userData.walk=(g.userData.walk||0)+(speed>0.001?dt*9:dt*2);
    if(g.userData.limbs){const a=Math.sin(g.userData.walk)*(speed>0.001?.45:.06);g.userData.limbs.l.rotation.x=a;g.userData.limbs.r.rotation.x=-a;g.userData.limbs.lArm.rotation.x=-a;g.userData.limbs.rArm.rotation.x=a;}
    g.userData.shootKick=Math.max(0,(g.userData.shootKick||0)-dt*1.8); g.position.y-=g.userData.shootKick*.03;
  }
  animateShells(dt); animateGrenades(dt); updateWeaponVisual(dt);
  if(me&&roomState?.started&&!me.dead){const mv=keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight; footTimer-=dt; if(mv&&footTimer<=0){playFootstep();footTimer=crouching?.48:(sprinting?.22:.34);}} grenadeCooldown=Math.max(0,grenadeCooldown-dt); animateSmoke(dt);

  document.querySelector("#hp").textContent = me?.hp ?? 100;
  document.querySelector("#mag").textContent = me?.mag ?? 30;
  document.querySelector("#reserve").textContent = me?.reserve ?? 90;
  document.querySelector("#kd").textContent = `${me?.kills ?? 0} / ${me?.deaths ?? 0}`;
  document.querySelector("#roomHud").textContent = roomState?.roomName || ""; document.querySelector("#scope").style.display=(ads&&currentWeapon.category==='Sniper')?'block':'none'; document.querySelector("#stance").textContent=crouching?'CROUCH':(sprinting?'SPRINT':'READY');

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
renderWeaponFilters();
renderWeaponGrid();
selectWeapon(0);
requestAnimationFrame(loop);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

connect();
