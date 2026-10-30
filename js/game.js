
// ================================================================
//  БАЗА
// ================================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const isMobileDevice = (() => {
    if (typeof window === 'undefined') return false;
    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const touchPoints = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return mobileUA || (touchPoints && window.innerWidth <= 1024) || coarsePointer;
})();

const joystickVector = { x: 0, y: 0, active: false };
let joystickTouchId = null;
let aimTouchId = null;

function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Entity coordinates are clamped by the next simulation step after resizing.
}
resize();
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 100));
if (typeof window !== 'undefined' && window.visualViewport){
    window.visualViewport.addEventListener("resize", resize);
}

const GROUND = () => canvas.height - 60;

let keys = {}, mouse = { x: innerWidth/2, y: innerHeight/2, down: false };
let player = null, boss = null, ethernaty1 = null, dragon = null, solarDevourer = null, twoFacedDemon = null;
let projectiles = [], enemyProjectiles = [], particles = [], damageNumbers = [], pickups = [];
let meteors = [], tornadoes = [], shockwaves = [], beams = [], minions = [], geysers = [], embers = [], solarMines = [], demonLightnings = [];
let weapon = 0, inventory = [0,1,2,3,4,15];
let gameOver = false, victory = false;
let bossDefeated = false, firstEthernatyDefeated = false;
let ethernatySpawned = false, dragonSpawned = false, dragonDefeated = false;
let solarDevourerSpawned = false, solarDevourerDefeated = false;
let twoFacedDemonSpawned = false, twoFacedDemonDefeated = false;
let ethernatyTimer = 0, dragonTimer = 0, solarDevourerTimer = 0, twoFacedDemonTimer = 0;
let worldTime = 0, adaptationGlobal = 0, totalDamage = 0;
let weaponAdaptation = new Array(16).fill(0);
let weaponAdaptTurned = new Array(16).fill(false);
let fireGlow = 0;
let currentBiome = 'forest', biomeBlend = 0;
let bgParticles = [];
let currentClass = null;
let classBonus = { damageMelee:1, damageMagic:1, damageRanged:1, damageAll:1, speedMult:1, manaRegenMult:1, hpBonus:0, manaBonus:0 };

// ================================================================
//  АРТЕФАКТЫ БОССОВ
// ================================================================
const ARTIFACTS = {
    mahoraga_fang: { name:"Клык Махораги", icon:"🦴", color:"#dedede", boss:"Махорага",
        desc:"Оружие адаптируется к Махораге вдвое медленнее — сопротивление растёт слабее." },
    ethernaty_core: { name:"Ядро ETHERNATY", icon:"🔮", color:"#cc88ff", boss:"ETHERNATY",
        desc:"Рывок перезаряжается на 40% быстрее, атаки тратят на 20% меньше маны." },
    dragon_heart: { name:"Сердце Дракона", icon:"❤️‍🔥", color:"#ff6622", boss:"FIRE DESTROYER",
        desc:"Похищает 8% нанесённого урона как HP, урон от огня снижен на 25%." },
    solar_core: { name:"Ядро Солнца", icon:"☀️", color:"#ffcc33", boss:"SOLAR DEVOURER",
        desc:"Контактный урон от SOLAR DEVOURER снижен на 20%, пассивная регенерация HP ускорена втрое." },
    demon_core: { name:"Проклятое Ядро", icon:"👹", color:"#ff2255", boss:"THE TWO-FACED DEMON",
        desc:"Весь наносимый урон увеличен на 15%, урон от THE TWO-FACED DEMON снижен на 20%." },
    demon_talisman: { name:"Талисман Демона", icon:"🧿", color:"#bb55ff", boss:"THE TWO-FACED DEMON",
        desc:"Весь получаемый урон снижен на 25%." },
    demon_horn_charm: { name:"Амулет Рога Демона", icon:"📿", color:"#ff3366", boss:"THE TWO-FACED DEMON",
        desc:"Весь наносимый урон увеличен на 20%." }
};
const ARTIFACT_SLOT_COUNT = 5;
let ownedArtifacts = [];
let equippedArtifacts = new Array(ARTIFACT_SLOT_COUNT).fill(null);
let artifactMenuOpen = false;

function hasArtifact(id){ return equippedArtifacts.includes(id); }
function grantArtifact(id, x, y){
    if (ownedArtifacts.includes(id)) return;
    ownedArtifacts.push(id);
    const idx = equippedArtifacts.indexOf(null);
    if (idx !== -1) equippedArtifacts[idx] = id;
    showMessage(`🎖 Артефакт получен: ${ARTIFACTS[id].name}`);
    particle(x, y, ARTIFACTS[id].color, 34, 11, 1);
    updateArtifactBar();
}
function toggleEquip(id){
    const at = equippedArtifacts.indexOf(id);
    if (at !== -1){ equippedArtifacts[at] = null; }
    else {
        const idx = equippedArtifacts.indexOf(null);
        if (idx === -1){ showMessage("⚠ Все слоты заняты! Сначала снимите артефакт."); return; }
        equippedArtifacts[idx] = id;
    }
    renderArtifactModal(); updateArtifactBar();
}
function toggleArtifactModal(){
    if (!currentClass || gameOver || paused || journalOpen || workshopMenuOpen) return;
    clearInput();
    artifactMenuOpen = !artifactMenuOpen;
    document.getElementById("artifactModal").style.display = artifactMenuOpen ? "flex" : "none";
    if (artifactMenuOpen) renderArtifactModal();
}
function updateArtifactBar(){
    const bar = document.getElementById("artifactBar");
    if (!bar) return;
    bar.innerHTML = "";
    for (let i=0;i<ARTIFACT_SLOT_COUNT;i++){
        const id = equippedArtifacts[i];
        const a = id && ARTIFACTS[id];
        const el = document.createElement("div");
        el.className = "artifactSlotMini" + (a ? " filled" : "");
        el.textContent = a ? a.icon : "";
        if (a) el.style.boxShadow = `0 0 10px ${a.color}`;
        bar.appendChild(el);
    }
}
function renderArtifactModal(){
    const slotsRow = document.getElementById("artifactSlotsRow");
    const ownedList = document.getElementById("artifactOwnedList");
    const emptyMsg = document.getElementById("artifactEmptyMsg");
    if (!slotsRow || !ownedList) return;
    slotsRow.innerHTML = "";
    for (let i=0;i<ARTIFACT_SLOT_COUNT;i++){
        const id = equippedArtifacts[i];
        const a = id && ARTIFACTS[id];
        const box = document.createElement("div");
        box.className = "artifactSlotBig" + (a ? " filled" : "");
        box.innerHTML = (a ? a.icon : "＋") + `<span class="slotNum">${i+1}</span>`;
        if (a) box.onclick = () => toggleEquip(id);
        slotsRow.appendChild(box);
    }
    ownedList.innerHTML = "";
    emptyMsg.style.display = ownedArtifacts.length ? "none" : "block";
    for (const id of ownedArtifacts){
        const a = ARTIFACTS[id];
        if (!a) continue;
        const equipped = equippedArtifacts.includes(id);
        const card = document.createElement("div");
        card.className = "artifactCard" + (equipped ? " equipped" : "");
        card.innerHTML = `<div class="aIcon">${a.icon}</div><div class="aName">${a.name}</div>
            <div class="aBoss">Дроп: ${a.boss}</div><div class="aDesc">${a.desc}</div>
            <div class="aStatus">${equipped ? "✅ Экипировано" : "Нажмите, чтобы экипировать"}</div>`;
        card.onclick = () => toggleEquip(id);
        ownedList.appendChild(card);
    }
}

const weapons = [
    { name:"Terra Blade",     damage:18,  cooldown:220, mana:0,  color:"#55ff88", category:"melee"  },
    { name:"Star Cannon",     damage:30,  cooldown:450, mana:4,  color:"#ffff66", category:"ranged" },
    { name:"Demon Scythe",    damage:26,  cooldown:380, mana:12, color:"#bb55ff", category:"magic"  },
    { name:"Solar Burst",     damage:55,  cooldown:800, mana:30, color:"#ff8a00", category:"magic"  },
    { name:"Void Bow",        damage:45,  cooldown:600, mana:18, color:"#55ccff", category:"ranged" },
    { name:"Laser Blade",     damage:70,  cooldown:400, mana:20, color:"#00ffaa", category:"melee"  },
    { name:"Shadow Staff",    damage:90,  cooldown:700, mana:35, color:"#aa00ff", category:"magic"  },
    { name:"Rainbow Blade",   damage:120, cooldown:500, mana:0,  color:"#ff44ff", category:"melee"  },
    { name:"Prismatic Staff", damage:150, cooldown:800, mana:0,  color:"#44ffcc", category:"magic"  },
    { name:"Ashen Blade",     damage:190, cooldown:520, mana:0,  color:"#ff7733", category:"melee"  },
    { name:"Magma Staff",     damage:77,  cooldown:860, mana:0,  color:"#ffaa22", category:"magic"  }
];

// ================================================================
//  УТИЛИТЫ
// ================================================================
const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const angleTo  = (a,b) => Math.atan2(b.y-a.y, b.x-a.x);
const clamp    = (v,a,b) => Math.max(a, Math.min(b, v));
const random   = (a,b) => Math.random()*(b-a)+a;

function particle(x,y,color,count=10,speed=4,life=1,size=null,gravity=0){
    count = Math.min(24, Math.ceil(count * (visualMode === 'minimal' ? .1 : .3)));
    for (let i=0;i<count;i++){
        const a = Math.random()*Math.PI*2, s = Math.random()*speed;
        particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-gravity, life, maxLife:life,
            size: size || random(2,6), color, gravity });
    }
}
function fireBurst(x,y,count=20,power=6,scale=1){
    count = Math.min(28, Math.ceil(count * (visualMode === 'minimal' ? .08 : .25)));
    power = Math.min(power, 7); scale = Math.min(scale, .7);
    for (let i=0;i<count;i++){
        const a = Math.random()*Math.PI*2, s = Math.random()*power;
        particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - random(0,1.5),
            life:1, maxLife:random(.6,1.3), size:random(3,9)*scale,
            color:["#fff3b0","#ffcc33","#ff8800","#ff3c00","#aa1500"][Math.floor(Math.random()*5)], gravity:-0.02 });
    }
}
function damageNumber(x,y,value,color="#fff",big=false){ damageNumbers.push({x,y,value,color,life:1,big}); }
function pointSegDist(px,py,x1,y1,x2,y2){
    const dx=x2-x1, dy=y2-y1, len2=dx*dx+dy*dy;
    let t = len2 ? ((px-x1)*dx + (py-y1)*dy)/len2 : 0;
    t = clamp(t,0,1);
    return Math.hypot(px-(x1+dx*t), py-(y1+dy*t));
}

// ================================================================
//  СУЩНОСТИ
// ================================================================
function createPlayer(){
    return { x: canvas.width/2, y: canvas.height-180, radius:18,
        hp:500+classBonus.hpBonus, maxHp:500+classBonus.hpBonus,
        mana:200+classBonus.manaBonus, maxMana:200+classBonus.manaBonus,
        speed:4.5*classBonus.speedMult, invincible:0, dashCooldown:0, attackCooldown:0, burn:0 };
}
function createMahoraga(){
    return scaleBoss({ x: canvas.width/2, y:210, radius:70, hp:3000, maxHp:3000, phase:1, attackCooldown:1400,
        wheelAngle:0, type:'mahoraga', aiTimer:0, aiAttack:0, strafeDir:1, dashTimer:0,
        adaptWheelAngle:0, adaptWheelTarget:0, adaptWheelFlash:0, adaptWheelLit:0 });
}
function createEthernaty1(){
    return scaleBoss({ x: canvas.width/2, y:180, radius:45, hp:2500, maxHp:2500, attackCooldown:1200,
        coreAngle:0, ringAngle:0, auraPulse:0, type:'ethernaty1', aiTimer:0, aiAttack:0 });
}

// --------- FIRE DESTROYER ---------
function createDragon(){
    return scaleBoss({
        x: canvas.width/2, y: 240, radius: 88,
        hp: 14000, maxHp: 14000,
        phase: 1, facing: 1, wingFlap: 0, tailWave: 0, bob: 0, jawOpen: 0, hitFlash: 0,
        vx: 0, vy: 0, homeX: canvas.width/2, homeY: 240,
        state: 'idle', stateTimer: 0, telegraph: 0, telegraphMax: 1,
        attackCooldown: 2600, attack: null, comboLeft: 0,
        breathAngle: 0, breathTick: 0,
        salvoTick: 0, salvoLeft: 0,
        dashLeft: 0, dashTX: 0, dashTY: 0,
        beamList: [], flameTick: 0, flameLeft: 0,
        diveStage: 0, diveX: 0, roar: 0, alive: true
    });
}
const DRAGON_ATTACKS = {
    1: ['breath','salvo','flames','shockwave','meteors'],
    2: ['breath','salvo','flames','shockwave','meteors','dash','tornado','minions'],
    3: ['breath','salvo','flames','shockwave','meteors','dash','tornado','minions','laser','dive'],
    4: ['breath','salvo','flames','shockwave','meteors','dash','tornado','minions','laser','dive']
};
const ATTACK_LABEL = {
    breath:'⚠ ОГНЕННОЕ ДЫХАНИЕ', salvo:'⚠ ЗАЛП ОГНЕШАРОВ', meteors:'⚠ ПЫЛАЮЩИЕ МЕТЕОРЫ',
    dash:'⚠ РЫВОК ДРАКОНА', tornado:'⚠ ОГНЕННЫЕ СМЕРЧИ', flames:'⚠ ВОЛНА ПЛАМЕНИ',
    shockwave:'⚠ УДАР КРЫЛЬЕВ', minions:'⚠ ПРИЗЫВ ДРАКОНЧИКОВ', laser:'⚠ ЛУЧИ ИЗ ГЛАЗ', dive:'⚠ ПИКИРОВАНИЕ'
};

// --------- SOLAR DEVOURER ---------
function createSolarDevourer(){
    const SEGMENTS = 15, PTS = 5;
    const startX = canvas.width/2, startY = -260;
    const history = [];
    for (let i=0;i<SEGMENTS*PTS+6;i++) history.push({x:startX, y:startY});
    const segRadii = Array.from({length:SEGMENTS}, (_,i)=> Math.max(18, 58 - i*2.6));
    const segCracks = Array.from({length:SEGMENTS}, ()=> Array.from({length:3+Math.floor(Math.random()*3)}, ()=> Math.random()*Math.PI*2));
    return scaleBoss({
        head: { x:startX, y:startY }, x:startX, y:startY,
        history, ptsPerSeg: PTS, segCount: SEGMENTS, segRadii, segCracks,
        hp: 26000, maxHp: 26000, phase: 1,
        angle: Math.PI/2, homeY: 250,
        state: 'emerge', stateTimer: 1600,
        attack: null, lastAttack: null, attackCooldown: 2200,
        telegraph: 0, telegraphMax: 1,
        chargeLeft: 0, chargeAngle: 0, chargeWait: 0, chargeTX: 0, mineTick: 0,
        salvoLeft: 0, salvoTick: 0,
        miniWorms: [],
        underground: false, burrowWait: 0, eruptDone: false,
        hitFlash: 0
    });
}
const SOLAR_ATTACKS = {
    1: ['fireballs','charge','mines'],
    2: ['fireballs','charge','mines','laser','meteors','bursts','burrow'],
    3: ['fireballs','charge','mines','laser','meteors','bursts','burrow','beamring','split']
};
const SOLAR_LABEL = {
    fireballs:'⚠ СОЛНЕЧНЫЕ ОГНЕШАРЫ', charge:'⚠ СОЛНЕЧНЫЙ РЫВОК', mines:'⚠ СОЛНЕЧНЫЕ МИНЫ',
    laser:'⚠ СОЛНЕЧНЫЙ ЛАЗЕР', meteors:'⚠ МЕТЕОРИТНЫЙ ДОЖДЬ', bursts:'⚠ ЭНЕРГЕТИЧЕСКИЙ ВЗРЫВ',
    burrow:'⚠ ПОДЗЕМНАЯ АТАКА', beamring:'⚠ КОЛЬЦО ЛУЧЕЙ', split:'⚠ РАЗДЕЛЕНИЕ СЕГМЕНТОВ'
};

// --------- THE TWO-FACED DEMON ---------
function createTwoFacedDemon(){
    return scaleBoss({
        x: canvas.width/2, y: -260, groundY: 0, radius: 92,
        hp: 36000, maxHp: 36000, phase: 1,
        state: 'emerge', stateTimer: 2000,
        facing: 1, armSwing: 0, auraPulse: 0, roar: 0,
        attack: null, lastAttack: null, attackCooldown: 2000,
        telegraph: 0, telegraphMax: 1,
        teleportCd: 2200,
        salvoLeft: 0, salvoTick: 0,
        hitFlash: 0
    });
}
const DEMON_ATTACKS = {
    1: ['dismantle','melee','lightning'],
    2: ['dismantle','melee','lightning','netDismantle','lightningSpear','dismantleBarrage'],
    3: ['dismantle','melee','lightning','netDismantle','lightningSpear','dismantleBarrage','fourArmed','dualRoar'],
    4: ['dismantle','melee','lightning','netDismantle','lightningSpear','dismantleBarrage','fourArmed','dualRoar']
};
const DEMON_LABEL = {
    dismantle:'⚠ ДЕМОНТАЖ', melee:'⚠ УДАР ЧЕТЫРЁХ РУК', lightning:'⚠ НЕБЕСНАЯ МОЛНИЯ',
    netDismantle:'⚠ СЕТЬ ДЕМОНТАЖА', lightningSpear:'⚠ КОПЬЁ МОЛНИИ', dismantleBarrage:'⚠ ШКВАЛ ДЕМОНТАЖА',
    fourArmed:'⚠ КОМБО ЧЕТЫРЁХ РУК', dualRoar:'⚠ РЁВ ДВУХ ПАСТЕЙ', cataclysm:'⚠ КАТАКЛИЗМ ДВУЛИКОГО'
};

// ================================================================
//  ФОНОВЫЕ ЧАСТИЦЫ
// ================================================================
function initBgParticles(){
    bgParticles = [];
    const countAsh = isMobileDevice ? 12 : 40;
    const countStars = isMobileDevice ? 10 : 30;
    const countEmbers = isMobileDevice ? 20 : 70;
    for (let i=0;i<countAsh;i++) bgParticles.push({ type:'ash', x:Math.random()*canvas.width, y:Math.random()*canvas.height,
        vx:random(-.2,.2), vy:random(-.3,-.1), size:random(1,3), alpha:random(.3,.7) });
    for (let i=0;i<countStars;i++) bgParticles.push({ type:'stardust', x:Math.random()*canvas.width, y:Math.random()*canvas.height,
        vx:random(-.5,.5), vy:random(-.5,-.2), size:random(1,3), alpha:random(.4,.9), hue:Math.random()*360 });
    for (let i=0;i<countEmbers;i++) bgParticles.push({ type:'ember', x:Math.random()*canvas.width, y:Math.random()*canvas.height,
        vx:random(-.4,.4), vy:random(-1.3,-.4), size:random(1.5,4), alpha:random(.5,1), hue:random(10,45) });
}
initBgParticles();
updateArtifactBar();

// ================================================================
//  КЛАСС
// ================================================================
function selectClass(cls){
    if (currentClass || !['warrior','mage','ranger','summoner'].includes(cls)) return;
    activeDifficulty = document.getElementById('difficulty').value;
    runElapsed = 0; healCooldown = 0; paused = false; journalOpen = false;

    currentClass = cls;
    classBonus = { damageMelee:1, damageMagic:1, damageRanged:1, damageAll:1, speedMult:1, manaRegenMult:1, hpBonus:0, manaBonus:0 };
    let startWeapon = 0, label = "";
    if (cls==='warrior'){ classBonus.damageMelee=1.25; classBonus.hpBonus=50; startWeapon=0; label="Воин"; }
    else if (cls==='mage'){ classBonus.damageMagic=1.30; classBonus.manaBonus=100; classBonus.manaRegenMult=2; startWeapon=2; label="Маг"; }
    else if (cls==='ranger'){ classBonus.damageRanged=1.20; classBonus.speedMult=1.30; startWeapon=4; label="Стрелок"; }
    else if (cls==='summoner'){ classBonus.damageAll=1.15; classBonus.hpBonus=50; classBonus.manaBonus=50; startWeapon=1; label="Призыватель"; }
    player = createPlayer(); boss = createMahoraga();
    inventory = [0,1,2,3,4,15]; weapon = startWeapon;
    document.getElementById("classNameText").textContent = label;
    document.getElementById("classScreen").style.display = "none";
    document.getElementById("winScreen").style.display = "none";
    document.getElementById("deathScreen").style.display = "none";
    document.getElementById("bossHealth").style.width = "100%";
    updateWeaponUI();
    showMessage(`✅ Класс выбран: ${label}`);
}

// ================================================================
//  ВВОД
// ================================================================
window.addEventListener("keydown", e => {
    if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' && workshopMenuOpen){ closeWorkshop(); return; }
    if (e.code === 'KeyE' && !e.repeat){ interactWorkshop(); return; }
    if (e.code === 'Escape'){ if (!e.repeat) togglePause(); return; }
    if (e.code === 'KeyB'){ if (!e.repeat) toggleJournal(); return; }
    if (e.code === 'KeyH'){ if (!e.repeat) healPlayer(); return; }
    if (paused || journalOpen) return;
    if (e.repeat && e.code === 'KeyI') return;
    const movementKey = ({KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyQ:'q',KeyI:'i'})[e.code];
    if (movementKey) { keys[movementKey] = true; }

    if (e.code === "KeyI"){ toggleArtifactModal(); return; }
    if (workshopMenuOpen || artifactMenuOpen) return;
    keys[e.key.toLowerCase()] = true;
    const num = parseInt(e.key);
    if (num >= 1 && num <= 5){ if (inventory.includes(num-1)){ weapon = num-1; updateWeaponUI(); } }
    else if (num === 6){
        if (inventory.includes(5)){ weapon = 5; updateWeaponUI(); }
        else if (inventory.includes(15)){ weapon = 15; updateWeaponUI(); }
    }
    else if (num >= 7 && num <= 9){ if (inventory.includes(num-1)){ weapon = num-1; updateWeaponUI(); } }
    else if (num === 0){ if (inventory.includes(9)){ weapon = 9; updateWeaponUI(); } }
    else if (e.code === "KeyQ"){ if (inventory.includes(10)){ weapon = 10; updateWeaponUI(); } }
    else if (e.code === "KeyZ" || e.code === "Backquote"){ if (inventory.includes(15)){ weapon = 15; updateWeaponUI(); } }
    if (e.code === "Space"){ e.preventDefault(); dash(); }
});
window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
    const key = ({KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d'})[e.code];
    if (key) keys[key] = false;
});
window.addEventListener('blur', pauseOnBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnBlur(); });
canvas.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener("mousedown", e => { if (e.button === 0 && !paused && !journalOpen && !artifactMenuOpen && !workshopMenuOpen) mouse.down = true; });
window.addEventListener("mouseup", () => mouse.down = false);
document.querySelectorAll(".weapon").forEach(el => {
    el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.id);
        if (inventory.includes(idx)){ weapon = idx; updateWeaponUI(); }
    });
    el.addEventListener("touchstart", () => {
        const idx = parseInt(el.dataset.id);
        if (inventory.includes(idx)){ weapon = idx; updateWeaponUI(); }
    }, { passive: true });
});

function getActiveBossTarget(){
    if (typeof activeBoss === 'function'){
        const ab = activeBoss();
        if (ab) return ab;
    }
    if (twoFacedDemon && !twoFacedDemonDefeated) return twoFacedDemon;
    if (solarDevourer && !solarDevourerDefeated) return solarDevourer.head || solarDevourer;
    if (dragon && !dragonDefeated) return dragon;
    if (ethernaty1 && !firstEthernatyDefeated) return ethernaty1;
    if (boss && !bossDefeated) return boss;
    return null;
}

function cycleNextWeapon(){
    if (!inventory || inventory.length <= 1) return;
    const currentPos = inventory.indexOf(weapon);
    const nextPos = (currentPos + 1) % inventory.length;
    weapon = inventory[nextPos];
    updateWeaponUI();
    if (weapons[weapon]) showMessage(`⚔ ${weapons[weapon].name}`);
}

function initMobileControls(){
    const mc = document.getElementById('mobileControls');
    if (!mc) return;
    if (isMobileDevice) mc.style.display = 'block';

    const onFirstTouch = () => {
        mc.style.display = 'block';
        window.removeEventListener('touchstart', onFirstTouch);
    };
    window.addEventListener('touchstart', onFirstTouch, { passive: true });

    // Canvas touch aim & fire
    canvas.addEventListener("touchstart", e => {
        if (paused || journalOpen || artifactMenuOpen || workshopMenuOpen) return;
        for (let i = 0; i < e.changedTouches.length; i++){
            const t = e.changedTouches[i];
            if (t.clientX < 220 && t.clientY > window.innerHeight - 220) continue;
            aimTouchId = t.identifier;
            mouse.x = t.clientX; mouse.y = t.clientY;
            mouse.down = true;
            e.preventDefault();
            break;
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", e => {
        if (aimTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++){
            const t = e.changedTouches[i];
            if (t.identifier === aimTouchId){
                mouse.x = t.clientX; mouse.y = t.clientY;
                e.preventDefault();
                break;
            }
        }
    }, { passive: false });

    const endAimTouch = e => {
        if (aimTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++){
            if (e.changedTouches[i].identifier === aimTouchId){
                mouse.down = false;
                aimTouchId = null;
                break;
            }
        }
    };
    canvas.addEventListener("touchend", endAimTouch, { passive: false });
    canvas.addEventListener("touchcancel", endAimTouch, { passive: false });

    // Virtual Joystick
    const joystickZone = document.getElementById('joystickZone');
    const joystickBase = document.getElementById('joystickBase');
    const joystickStick = document.getElementById('joystickStick');

    if (joystickZone && joystickBase && joystickStick){
        let baseRect = null;
        const handleJoystick = (clientX, clientY) => {
            if (!baseRect) baseRect = joystickBase.getBoundingClientRect();
            const centerX = baseRect.left + baseRect.width / 2;
            const centerY = baseRect.top + baseRect.height / 2;
            const dx = clientX - centerX, dy = clientY - centerY;
            const dist = Math.hypot(dx, dy);
            const maxR = baseRect.width * 0.42;
            const clampedDist = Math.min(dist, maxR);
            const angle = Math.atan2(dy, dx);

            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;
            joystickStick.style.transform = `translate(${knobX}px, ${knobY}px)`;

            const norm = clampedDist / maxR;
            if (norm > 0.12){
                joystickVector.x = Math.cos(angle) * norm;
                joystickVector.y = Math.sin(angle) * norm;
                joystickVector.active = true;
            } else {
                joystickVector.x = 0; joystickVector.y = 0; joystickVector.active = false;
            }
        };

        joystickZone.addEventListener("touchstart", e => {
            e.preventDefault();
            baseRect = joystickBase.getBoundingClientRect();
            const t = e.changedTouches[0];
            joystickTouchId = t.identifier;
            handleJoystick(t.clientX, t.clientY);
        }, { passive: false });

        joystickZone.addEventListener("touchmove", e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++){
                const t = e.changedTouches[i];
                if (t.identifier === joystickTouchId){
                    handleJoystick(t.clientX, t.clientY);
                    break;
                }
            }
        }, { passive: false });

        const resetJoystick = e => {
            for (let i = 0; i < e.changedTouches.length; i++){
                if (e.changedTouches[i].identifier === joystickTouchId){
                    joystickTouchId = null;
                    joystickVector.x = 0; joystickVector.y = 0; joystickVector.active = false;
                    joystickStick.style.transform = "translate(0px, 0px)";
                    break;
                }
            }
        };
        joystickZone.addEventListener("touchend", resetJoystick, { passive: false });
        joystickZone.addEventListener("touchcancel", resetJoystick, { passive: false });
    }

    // Action buttons
    const btnDash = document.getElementById('btnMobileDash');
    if (btnDash){
        btnDash.addEventListener('touchstart', e => { e.preventDefault(); dash(); }, { passive: false });
    }
    const btnAttack = document.getElementById('btnMobileAttack');
    if (btnAttack){
        btnAttack.addEventListener('touchstart', e => {
            e.preventDefault();
            mouse.down = true;
            const tgt = getActiveBossTarget();
            if (tgt){ mouse.x = tgt.x; mouse.y = tgt.y; }
        }, { passive: false });
        const releaseAttack = e => { e.preventDefault(); mouse.down = false; };
        btnAttack.addEventListener('touchend', releaseAttack, { passive: false });
        btnAttack.addEventListener('touchcancel', releaseAttack, { passive: false });
    }
    const btnHeal = document.getElementById('btnMobileHeal');
    if (btnHeal){
        btnHeal.addEventListener('touchstart', e => { e.preventDefault(); healPlayer(); }, { passive: false });
    }
    const btnWeapon = document.getElementById('btnMobileWeapon');
    if (btnWeapon){
        btnWeapon.addEventListener('touchstart', e => { e.preventDefault(); cycleNextWeapon(); }, { passive: false });
    }
    const btnInteract = document.getElementById('btnMobileInteract');
    if (btnInteract){
        btnInteract.addEventListener('touchstart', e => {
            e.preventDefault();
            if (typeof interactWorkshop === 'function') interactWorkshop();
        }, { passive: false });
    }
}
initMobileControls();

function updateWeaponUI(){
    document.querySelectorAll(".weapon").forEach((el,i) => {
        const active = (i===weapon && inventory.includes(i));
        el.classList.toggle("active", active);
        el.classList.toggle("hidden", !inventory.includes(i));
        if (weapons[i]){
            el.style.borderColor = active ? "#fff" : weapons[i].color;
            el.style.boxShadow = active ? `0 0 14px ${weapons[i].color}` : `0 0 5px ${weapons[i].color}55`;
        }
    });
}
function updateWeaponAdaptUI(){
    for (let i=0;i<weapons.length;i++){
        const el = document.getElementById(`adapt${i}`);
        if (el) el.textContent = Math.min(100, Math.floor(weaponAdaptation[i]*.75)) + '%';
    }
}

function dash(){
    if (!player || !currentClass || player.dashCooldown > 0 || gameOver || workshopMenuOpen || artifactMenuOpen || paused || journalOpen) return;
    let dx=0, dy=0;
    if (keys["w"]||keys["arrowup"]) dy--;
    if (keys["s"]||keys["arrowdown"]) dy++;
    if (keys["a"]||keys["arrowleft"]) dx--;
    if (keys["d"]||keys["arrowright"]) dx++;
    if (joystickVector.active){ dx += joystickVector.x; dy += joystickVector.y; }
    if (!dx && !dy){ const a = angleTo(player, mouse); dx=Math.cos(a); dy=Math.sin(a); }
    else { const l=Math.hypot(dx,dy); dx/=l; dy/=l; }
    const dashStart = {x:player.x, y:player.y};
    const dashRange = hasArtifact('solar_shield') ? 230 : 135;
    player.x = clamp(player.x + dx*dashRange, 30, canvas.width-30);
    player.y = clamp(player.y + dy*dashRange, 120, GROUND()-14);
    player.invincible = hasArtifact('solar_shield') ? 850 : 520;
    if (hasArtifact('solar_shield')) combatVisual = {kind:'dash', x:dashStart.x, y:dashStart.y, tx:player.x, ty:player.y, life:300};
    player.dashCooldown = hasArtifact('ethernaty_core') ? 880*0.6 : 880;
    particle(player.x, player.y, "#44ddff", 26, 8, .8);
}

// ================================================================
//  ОРУЖИЕ В РУКЕ
// ================================================================
function drawWeaponInHand(idx){
    const w = weapons[idx]; if (!w) return;
    ctx.save(); ctx.translate(10,0); ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = w.color;
    if (idx===11){
        ctx.fillStyle='#766959'; ctx.fillRect(-15,-6,23,12);
        ctx.fillStyle='#eee4ce'; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(83,-19); ctx.lineTo(70,12); ctx.lineTo(0,8); ctx.closePath(); ctx.fill();
    } else if (idx===12){
        const g=ctx.createLinearGradient(0,-12,44,12); g.addColorStop(0,'#ff6d9e'); g.addColorStop(.5,'#8bfff5'); g.addColorStop(1,'#c19bff');
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(8,0); ctx.lineTo(28,-20); ctx.lineTo(50,0); ctx.lineTo(28,20); ctx.closePath(); ctx.fill();
    } else if (idx===13){
        ctx.strokeStyle='#b7a2ef'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(42,0); ctx.moveTo(25,-17); ctx.lineTo(36,0); ctx.lineTo(25,17); ctx.stroke();
    } else if (idx===0){
        ctx.rotate(-.08);
        ctx.fillStyle="#183d2b"; ctx.fillRect(-8,-5,48,10);
        ctx.fillStyle="#55ff88"; ctx.beginPath(); ctx.moveTo(5,-10); ctx.lineTo(55,-4); ctx.lineTo(62,0); ctx.lineTo(55,4); ctx.lineTo(5,10); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#eafff2"; ctx.fillRect(18,-2,34,4);
        ctx.fillStyle="#d8a84e"; ctx.fillRect(-15,-6,13,12);
    } else if (idx===1){
        ctx.fillStyle="#26344d"; ctx.fillRect(-8,-7,48,14);
        ctx.fillStyle="#5c7398"; ctx.fillRect(0,-4,42,8);
        ctx.fillStyle="#ffff66"; ctx.beginPath(); ctx.arc(43,0,9,0,7); ctx.fill();
        ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(43,0,4,0,7); ctx.fill();
    } else if (idx===2){
        ctx.fillStyle="#6d3b9e"; ctx.fillRect(-8,-3,48,6);
        ctx.strokeStyle="#d68cff"; ctx.lineWidth=7; ctx.beginPath(); ctx.arc(35,-1,23,-1.15,1.05); ctx.stroke();
        ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(38,0,5,0,7); ctx.fill();
    } else if (idx===3){
        ctx.fillStyle="#7b3510"; ctx.fillRect(-10,-5,48,10);
        ctx.fillStyle="#ff8a00"; ctx.beginPath(); ctx.arc(39,0,13,0,7); ctx.fill();
        ctx.fillStyle="#ffe08a"; ctx.beginPath(); ctx.arc(39,0,6,0,7); ctx.fill();
        for (let k=0;k<8;k++){ const q=k*Math.PI/4; ctx.strokeStyle="#ffcf33"; ctx.lineWidth=3;
            ctx.beginPath(); ctx.moveTo(39+Math.cos(q)*14, Math.sin(q)*14); ctx.lineTo(39+Math.cos(q)*21, Math.sin(q)*21); ctx.stroke(); }
    } else if (idx===4){
        ctx.strokeStyle="#55ccff"; ctx.lineWidth=7; ctx.beginPath(); ctx.arc(18,0,25,-1.05,1.05); ctx.stroke();
        ctx.strokeStyle="#b9f3ff"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,-21); ctx.lineTo(0,21); ctx.stroke();
        ctx.fillStyle="#fff"; ctx.beginPath(); ctx.moveTo(38,0); ctx.lineTo(27,-5); ctx.lineTo(27,5); ctx.closePath(); ctx.fill();
    } else if (idx===5){
        ctx.fillStyle="#143d3a"; ctx.fillRect(-12,-6,22,12);
        ctx.strokeStyle="#00ffaa"; ctx.lineWidth=11; ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(58,0); ctx.stroke();
        ctx.strokeStyle="#d7fff5"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(53,0); ctx.stroke();
    } else if (idx===6){
        ctx.strokeStyle="#32104e"; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(-12,5); ctx.lineTo(30,-2); ctx.stroke();
        ctx.fillStyle="#220038"; ctx.beginPath(); ctx.arc(39,-4,14,0,7); ctx.fill();
        ctx.fillStyle="#e5a8ff"; ctx.beginPath(); ctx.arc(39,-4,6,0,7); ctx.fill();
    } else if (idx===7){
        ctx.fillStyle="#6a245e"; ctx.fillRect(-15,-6,18,12);
        const g=ctx.createLinearGradient(0,-8,60,8);
        g.addColorStop(0,"#ff3355"); g.addColorStop(.3,"#ffcc33"); g.addColorStop(.6,"#55ccff"); g.addColorStop(1,"#ff55dd");
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(62,-2); ctx.lineTo(67,0); ctx.lineTo(62,2); ctx.lineTo(0,9); ctx.closePath(); ctx.fill();
    } else if (idx===8){
        ctx.strokeStyle="#384c68"; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(-12,6); ctx.lineTo(32,-3); ctx.stroke();
        ctx.save(); ctx.translate(41,-5); ctx.rotate(Math.PI/4);
        const g2=ctx.createLinearGradient(-10,-10,10,10); g2.addColorStop(0,"#ff66aa"); g2.addColorStop(.5,"#66ffff"); g2.addColorStop(1,"#ffff66");
        ctx.fillStyle=g2; ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(14,0); ctx.lineTo(0,14); ctx.lineTo(-14,0); ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (idx===9){ // Ashen Blade
        ctx.fillStyle="#3a1c10"; ctx.fillRect(-15,-6,18,12);
        const g=ctx.createLinearGradient(0,0,66,0); g.addColorStop(0,"#661100"); g.addColorStop(.5,"#ff7733"); g.addColorStop(1,"#ffdd88");
        ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(63,-3); ctx.lineTo(69,0); ctx.lineTo(63,3); ctx.lineTo(0,10); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#fff2c2"; ctx.fillRect(12,-2,46,4);
    } else if (idx===10){ // Magma Staff
        ctx.strokeStyle="#2a1208"; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(-12,8); ctx.lineTo(32,-4); ctx.stroke();
        ctx.fillStyle="#3a0f00"; ctx.beginPath(); ctx.arc(42,-7,15,0,7); ctx.fill();
        for (let k=0;k<7;k++){ const q=k*Math.PI*2/7+worldTime*.004; ctx.fillStyle=`hsl(${20+k*5},100%,60%)`;
            ctx.beginPath(); ctx.arc(42+Math.cos(q)*10, -7+Math.sin(q)*10, 2.6, 0, 7); ctx.fill(); }
        ctx.fillStyle="#fff3b0"; ctx.beginPath(); ctx.arc(42,-7,5.5,0,7); ctx.fill();
    } else if (idx===14){ // Demon Staff
        ctx.strokeStyle="#300a42"; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(-10,7); ctx.lineTo(32,-4); ctx.stroke();
        ctx.fillStyle="#520a70"; ctx.beginPath(); ctx.arc(38,-6,13,0,7); ctx.fill();
        ctx.fillStyle="#cc44ff"; ctx.beginPath(); ctx.arc(38,-6,7,0,7); ctx.fill();
        ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(38,-6,3,0,7); ctx.fill();
    } else if (idx===15){ // Dev Stick
        ctx.strokeStyle="#ff0055"; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-10,6); ctx.lineTo(32,-4); ctx.stroke();
        ctx.strokeStyle="#ffff00"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-6,5); ctx.lineTo(30,-3); ctx.stroke();
        const pulse = 10 + Math.sin(worldTime*.01)*3;
        ctx.fillStyle="#ff0055"; ctx.beginPath(); ctx.arc(38,-5,pulse,0,7); ctx.fill();
        ctx.fillStyle="#ffff55"; ctx.beginPath(); ctx.arc(38,-5,pulse*.6,0,7); ctx.fill();
        ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(38,-5,pulse*.3,0,7); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
}

// ================================================================
//  АТАКА ИГРОКА
// ================================================================
function applyClassBonus(base, wi){
    const cat = weapons[wi].category;
    let m = 1;
    if (cat==="melee") m*=classBonus.damageMelee;
    else if (cat==="magic") m*=classBonus.damageMagic;
    else if (cat==="ranged") m*=classBonus.damageRanged;
    if (hasArtifact('demon_core')) m *= 1.15;
    if (hasArtifact('demon_horn_charm')) m *= 1.20;
    return base * m * classBonus.damageAll;
}
function spawnPlayerProjectile(a,damage,color,wi,speed=10,radius=10,life=1200,extra={}){
    projectiles.push({ x:player.x, y:player.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
        radius, damage, life, color, weaponIdx:wi, trail:[], ...extra });
}
function attack(){
    if (!player || !currentClass || gameOver || paused || journalOpen || workshopMenuOpen || artifactMenuOpen || player.attackCooldown > 0) return;
    if (!inventory.includes(weapon)){ weapon = inventory[0]||0; updateWeaponUI(); return; }
    const w = weapons[weapon];
    if (weapon === 15){
        player.attackCooldown = w.cooldown;
        triggerDevStickExplosion();
        return;
    }
    if (weapon === 14){
        player.attackCooldown = w.cooldown;
        const a = angleTo(player, mouse), dmg = applyClassBonus(w.damage, weapon);
        particle(player.x+Math.cos(a)*25, player.y+Math.sin(a)*25, w.color, 16, 7, .7);
        for(let i=0;i<8;i++) spawnPlayerProjectile(a+(i-3.5)*.09, dmg*.35, "#cc44ff", weapon, 11, 9, 1600, {homing:.025, flame:true});
        return;
    }
    if (weapon >= 11 && weapon <= 13){ attackCraftedWeapon(); return; }
    if (weapon < 7){
        const cost = w.mana * (hasArtifact('ethernaty_core') ? 0.8 : 1);
        if (player.mana < cost) return;
        player.mana -= cost;
    }
    player.attackCooldown = w.cooldown;
    const a = angleTo(player, mouse), dmg = applyClassBonus(w.damage, weapon);
    particle(player.x+Math.cos(a)*25, player.y+Math.sin(a)*25, w.color, 16, 7, .7);

    if (weapon===0)       [-.12,0,.12].forEach(o => spawnPlayerProjectile(a+o,dmg*.72,w.color,weapon,12,10,1100));
    else if (weapon===1)  [-.16,-.08,0,.08,.16].forEach(o => spawnPlayerProjectile(a+o,dmg*.62,w.color,weapon,14,8,1250,{star:true}));
    else if (weapon===2)  [-.18,0,.18].forEach(o => spawnPlayerProjectile(a+o,dmg*.78,w.color,weapon,9,12,1500,{homing:.018}));
    else if (weapon===3)  { for(let i=0;i<7;i++) spawnPlayerProjectile(a+(i-3)*.13,dmg*.48,w.color,weapon,11,9,1050); }
    else if (weapon===4)  [-.07,0,.07].forEach(o => spawnPlayerProjectile(a+o,dmg*.9,w.color,weapon,17,7,1400));
    else if (weapon===5)  [-.2,-.1,0,.1,.2].forEach(o => spawnPlayerProjectile(a+o,dmg*.5,w.color,weapon,15,8,850,{laser:true}));
    else if (weapon===6)  { for(let i=0;i<6;i++) spawnPlayerProjectile(a+(i-2.5)*.16,dmg*.48,w.color,weapon,8,10,1800,{homing:.025}); }
    else if (weapon===7)  { for(let i=0;i<7;i++) spawnPlayerProjectile(a+(i-3)*.09,dmg*.42,`hsl(${(worldTime*.3+i*55)%360},100%,65%)`,weapon,16,9,1300,{homing:.012}); }
    else if (weapon===8)  { for(let i=0;i<9;i++) spawnPlayerProjectile(a+(i-4)*.06,dmg*.38,`hsl(${(worldTime*.4+i*40)%360},100%,70%)`,weapon,13+i*.35,7,1600); }
    else if (weapon===9)  [-.22,-.11,0,.11,.22].forEach(o => spawnPlayerProjectile(a+o,dmg*.62,"#ff8844",weapon,18,11,1450,{star:true}));
    else                  { for(let i=0;i<12;i++) spawnPlayerProjectile(a+(i-5.5)*.075,dmg*.34,`hsl(${18+i*3},100%,${58+i}%)`,weapon,10,8,2200,{homing:.035}); }
}

function triggerDevStickExplosion(){
    const dmg = 9999999;
    const target = typeof activeBoss === 'function' ? activeBoss() : (boss || ethernaty1 || dragon || solarDevourer || twoFacedDemon);
    const enemies = [target, ...(minions || []), ...(solarDevourer?.miniWorms || [])];
    for (const en of enemies){
        if (en && en.hp > 0){
            en.hp -= dmg;
            totalDamage += dmg;
            damageNumber(en.x, en.y - 40, dmg, "#ff0055", true);
            fireBurst(en.x, en.y, 40, 20, 2.5);
        }
    }
    applyLifesteal(dmg);
    const maxR = Math.hypot(canvas.width, canvas.height);
    shockwaves.push({ x: canvas.width/2, y: canvas.height/2, r: 10, max: maxR, speed: 32, band: 90, dmg: 0, hit: true, color: "#ff0055" });
    shockwaves.push({ x: mouse.x, y: mouse.y, r: 10, max: maxR * .8, speed: 36, band: 70, dmg: 0, hit: true, color: "#ffff00" });
    fireGlow = 1;
    particle(mouse.x, mouse.y, "#ff0055", 60, 24, 1.5, 12);
    particle(mouse.x, mouse.y, "#ffff00", 60, 20, 1.5, 10);
    particle(mouse.x, mouse.y, "#ffffff", 40, 26, 1.2, 8);
    for (let c=0; c<8; c++){
        fireBurst(random(0, canvas.width), random(0, canvas.height), 30, 18, 2);
    }
    showMessage("💥 DEV STICK: 9999999 FULL MAP EXPLOSION!");
}

// ================================================================
//  АТАКИ ПРЕДЫДУЩИХ БОССОВ
// ================================================================
function fireEnemyAt(x,y,a,speed,damage,radius,color,life=1800,extra={}){
    enemyProjectiles.push({ x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, radius, damage, life, color, trail:[], ...extra });
}
function mahoragaAttack(){
    if (bossDefeated || gameOver || !player) return;
    const b = boss, a = angleTo(b, player), phase = b.phase;
    const choice = (b.aiAttack++) % (phase>=3?5:phase===2?4:3);
    if (choice===0){
        const lead = distance(b,player)/7;
        const pr = Math.atan2((player.y+Math.sin(a)*lead)-b.y, (player.x+Math.cos(a)*lead)-b.x);
        const count = 5+phase*2;
        for (let i=0;i<count;i++) fireEnemyAt(b.x,b.y,pr+(i-(count-1)/2)*.11, 6+phase*.7, 30+phase*8, 11, "#ff5544", 1700);
    } else if (choice===1){
        const count = 10+phase*4;
        for (let i=0;i<count;i++) fireEnemyAt(b.x,b.y,b.wheelAngle+i*Math.PI*2/count, 4.2+phase*.45, 26+phase*7, 9, "#ffb13b", 2100);
        b.wheelAngle += .28;
    } else if (choice===2){
        for (let i=0;i<8;i++) fireEnemyAt(b.x,b.y,a+i*Math.PI/4, 5.5, 34+phase*5, 10, "#ff3355", 1500);
    } else if (choice===3){
        const side = b.strafeDir*Math.PI/2;
        for (let i=0;i<9;i++) fireEnemyAt(b.x,b.y,a+side+(i-4)*.08, 7.5, 38, 9, "#ff7a22", 1250);
        b.strafeDir *= -1;
    } else {
        for (let i=0;i<18;i++) fireEnemyAt(b.x,b.y,Math.PI*2*i/18+b.wheelAngle, 5.8, 42, 8, i%2 ? "#ff4422" : "#ffa033", 2300);
    }
    b.artAttackAt = worldTime;
    b.attackCooldown = Math.max(520, 1500-phase*180);
}
function ethernaty1Attack(){
    if (!ethernaty1 || !player) return;
    const e = ethernaty1, a = angleTo(e,player), phase = e.hp < e.maxHp*.5 ? 2 : 1;
    const choice = (e.aiAttack++) % (phase===2?4:3);
    if (choice===0) for (let i=0;i<18;i++) fireEnemyAt(e.x,e.y,Math.PI*2*i/18+e.coreAngle, 4.2+phase*.6, 35+phase*12, 7, `hsl(${i*20},90%,60%)`, 2300, {rainbow:true});
    else if (choice===1) for (let i=0;i<9;i++) fireEnemyAt(e.x,e.y,a+(i-4)*.10, 7, 46+phase*10, 9, "#ff66dd", 1500, {homing:.018});
    else if (choice===2) for (let r=0;r<3;r++) for (let i=0;i<8;i++) fireEnemyAt(e.x,e.y,a+r*.7+i*Math.PI/4, 4+r, 32+r*10, 7, "#66ccff", 1700);
    else for (let i=0;i<14;i++) fireEnemyAt(e.x,e.y,a+Math.sin(i)*.8, 8, 55, 8, `hsl(${i*28},100%,65%)`, 1300, {homing:.03, rainbow:true});
    e.artAttackAt = worldTime;
    e.attackCooldown = Math.max(480, 1100-phase*140);
}

// ================================================================
//  FIRE DESTROYER — ЛОГИКА
// ================================================================
function dragonPhaseOf(d){
    const r = d.hp / d.maxHp;
    if (r <= .15) return 4;
    if (r <= .40) return 3;
    if (r <= .70) return 2;
    return 1;
}
function mouthPos(d){
    return { x: d.x + d.facing*96, y: d.y - 34 + Math.sin(d.bob)*6 };
}
function showAttackWarning(text){
    const el = document.getElementById("attackWarning");
    el.textContent = text; el.style.opacity = 1;
    clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = 0, 1100);
}
function startDragonAttack(d){
    const pool = DRAGON_ATTACKS[d.phase];
    let pick = pool[Math.floor(Math.random()*pool.length)];
    if (pick === d.attack && Math.random() < .7) pick = pool[Math.floor(Math.random()*pool.length)];
    d.attack = pick;
    d.state = 'telegraph';
    d.telegraphMax = Math.max(340, 820 - (d.phase-1)*150);
    d.telegraph = d.telegraphMax;
    d.roar = 1;
    showAttackWarning(ATTACK_LABEL[pick]);
}
function executeDragonAttack(d){
    const p = player, ph = d.phase, m = mouthPos(d);
    const dmgScale = 1 + (ph-1)*.18;
    d.state = 'attack';
    switch (d.attack){
        case 'breath':
            d.breathAngle = angleTo(m, p);
            d.stateTimer = 1500 + ph*180;
            d.breathTick = 0;
            break;
        case 'salvo':
            d.salvoLeft = 8 + ph*4; d.salvoTick = 0; d.stateTimer = (d.salvoLeft)*90 + 200;
            break;
        case 'meteors': {
            const n = 6 + ph*3;
            for (let i=0;i<n;i++) spawnMeteor(random(60, canvas.width-60), -random(60, 600), 73*dmgScale, i*90);
            d.stateTimer = 900;
            break;
        }
        case 'dash':
            d.dashLeft = 2 + ph; d.state='dash'; pickDashTarget(d); d.stateTimer = 4000;
            break;
        case 'tornado': {
            const n = 2 + Math.floor(ph/1.5);
            for (let i=0;i<n;i++) tornadoes.push({
                x: random(120, canvas.width-120), y: GROUND()-90, vx: (i%2?1:-1)*random(1.4,2.6),
                r: 46, angle:0, life: 9000, dmg: 57*dmgScale, tick:0 });
            d.stateTimer = 800;
            break;
        }
        case 'flames':
            d.flameLeft = 3 + ph; d.flameTick = 0; d.stateTimer = (d.flameLeft)*260 + 200;
            break;
        case 'shockwave': {
            const rings = ph >= 3 ? 3 : ph >= 2 ? 2 : 1;
            for (let i=0;i<rings;i++) setTimeoutSafe(() => shockwaves.push({
                x:d.x, y:d.y+20, r:60, max: Math.max(canvas.width, canvas.height)*1.05,
                speed: 7.5 + ph*.8, band: 34, dmg: 87*dmgScale, hit:false }), i*420);
            d.stateTimer = 400 + rings*420;
            break;
        }
        case 'minions': {
            const n = 2 + Math.floor(ph*.8);
            for (let i=0;i<n;i++) minions.push({
                x: d.x + random(-140,140), y: d.y + random(-40,60), hp: 260 + ph*60, maxHp: 260+ph*60,
                radius: 22, cd: random(600,1400), facing:1, flap: Math.random()*6, orbit: Math.random()*6.28 });
            d.stateTimer = 700;
            break;
        }
        case 'laser': {
            const n = ph >= 4 ? 4 : 3;
            const base = angleTo(d, p);
            for (let i=0;i<n;i++) beams.push({
                x: d.x + d.facing*70, y: d.y - 46, angle: base + (i-(n-1)/2)*.38,
                sweep: (Math.random()<.5?-1:1)*.00035*(ph), charge: 700, active: 0, dmg: 120*dmgScale, len: 2200 });
            d.stateTimer = 700 + 900 + 200;
            break;
        }
        case 'dive':
            d.state = 'dive'; d.diveStage = 0; d.diveX = p.x; d.stateTimer = 5000;
            break;
    }
}
const pendingTimers = [];
function setTimeoutSafe(fn, ms){ pendingTimers.push({ fn, t: ms }); }
function pickDashTarget(d){
    const p = player;
    const fromLeft = d.x > canvas.width/2;
    d.y = clamp(p.y + random(-40,40), 150, GROUND()-120);
    d.x = fromLeft ? canvas.width + 160 : -160;
    d.dashTX = fromLeft ? -200 : canvas.width + 200;
    d.dashTY = d.y;
    d.facing = fromLeft ? -1 : 1;
    d.dashPhase = 'ready';
    d.dashWait = 420;
}
function spawnMeteor(x, targetY, dmg, delay){
    meteors.push({ x, y: targetY, vx: random(-1.2,1.2), vy: 2.5, dmg, delay, r: 17, warn: 1, targetY: GROUND()-8 });
}

function updateDragon(dt){
    const d = dragon, p = player;
    d.wingFlap += dt * (d.state==='dash' ? .018 : .006);
    d.tailWave += dt * .004;
    d.bob += dt * .002;
    d.hitFlash = Math.max(0, d.hitFlash - dt*.004);
    d.roar = Math.max(0, d.roar - dt*.002);
    if (p) d.facing = (p.x < d.x) ? -1 : 1;

    const newPhase = dragonPhaseOf(d);
    if (newPhase !== d.phase){
        d.phase = newPhase;
        fireGlow = 1;
        fireBurst(d.x, d.y, 90, 13, 1.6);
        const names = { 2:"ФАЗА II — ЯРОСТЬ РАСТЁТ", 3:"ФАЗА III — ДРАКОН В ЯРОСТИ", 4:"ФИНАЛ — АРЕНА В ОГНЕ" };
        showMessage("🔥 " + (names[newPhase]||""));
        d.attackCooldown = Math.min(d.attackCooldown, 500);
    }
    document.getElementById("phase").textContent =
        `🔥 ФАЗА ${d.phase} — ${['','ПРОБУЖДЕНИЕ','УСКОРЕНИЕ','ЯРОСТЬ','АРЕНА В ОГНЕ'][d.phase]} · HP ${Math.max(0,Math.ceil(d.hp))}`;

    // --- фоновое пламя тела
    if (Math.random() < .5 + d.phase*.12){
        const ox = random(-70,70), oy = random(-40,40);
        particles.push({ x:d.x+ox, y:d.y+oy, vx:random(-.4,.4), vy:random(-1.6,-.5),
            life:1, maxLife:random(.5,1), size:random(3,8)*(1+d.phase*.12),
            color:["#ffdd66","#ff9922","#ff4400"][Math.floor(Math.random()*3)], gravity:-.02 });
    }

    // --- финальная фаза: постоянные опасности арены
    if (d.phase === 4){
        d.arenaTick = (d.arenaTick||0) + dt;
        if (d.arenaTick > 620){
            d.arenaTick = 0;
            if (meteors.length < 14) spawnMeteor(random(60, canvas.width-60), -random(40,300), 66, 0);
            if (geysers.length < 3 && Math.random() < .5) geysers.push({ x: random(80, canvas.width-80), warn: 800, active: 0, dmg: 91 });
        }
    } else if (d.phase === 3){
        d.arenaTick = (d.arenaTick||0) + dt;
        if (d.arenaTick > 1500){ d.arenaTick = 0; spawnMeteor(random(60, canvas.width-60), -random(40,300), 57, 0); }
    }

    // --- состояния
    if (d.state === 'idle'){
        // парение вокруг цели
        const targetX = clamp(p.x - d.facing*250 + Math.sin(worldTime*.0007)*90, 140, canvas.width-140);
        const targetY = clamp(240 + Math.sin(worldTime*.0011)*50, 150, canvas.height*.45);
        const spd = .0022 + d.phase*.0009;
        d.vx += (targetX - d.x) * spd; d.vy += (targetY - d.y) * spd;
        d.vx *= .92; d.vy *= .92;
        d.x += d.vx * dt * .06; d.y += d.vy * dt * .06;
        d.attackCooldown -= dt;
        if (d.attackCooldown <= 0) startDragonAttack(d);
    }
    else if (d.state === 'telegraph'){
        d.telegraph -= dt;
        if (Math.random() < .4) fireBurst(mouthPos(d).x, mouthPos(d).y, 2, 2, .7);
        if (d.telegraph <= 0) executeDragonAttack(d);
    }
    else if (d.state === 'attack'){
        d.stateTimer -= dt;
        runActiveAttack(d, dt);
        if (d.stateTimer <= 0) endDragonAttack(d);
    }
    else if (d.state === 'dash'){
        d.stateTimer -= dt;
        if (d.dashPhase === 'ready'){
            d.dashWait -= dt;
            if (d.dashWait <= 0) d.dashPhase = 'run';
        } else {
            const sp = (13 + d.phase*2.2) * dt * .06;
            const dir = Math.sign(d.dashTX - d.x) || 1;
            d.x += dir * sp;
            d.y += (d.dashTY - d.y) * .04;
            fireBurst(d.x - dir*40, d.y+random(-30,30), 3, 3, 1.1);
            if (p && distance(d,p) < d.radius*.85) hurtPlayer(112 + d.phase*18, "#ff5500", true);
            if ((dir > 0 && d.x > d.dashTX) || (dir < 0 && d.x < d.dashTX)){
                d.dashLeft--;
                if (d.dashLeft > 0) pickDashTarget(d);
                else endDragonAttack(d);
            }
        }
        if (d.stateTimer <= 0) endDragonAttack(d);
    }
    else if (d.state === 'dive'){
        d.stateTimer -= dt;
        if (d.diveStage === 0){ // взлёт
            d.y -= dt * .55;
            if (d.y < -200){ d.diveStage = 1; d.diveWait = 850; d.diveX = p.x; }
        } else if (d.diveStage === 1){ // тень-предупреждение
            d.diveWait -= dt;
            d.x += (p.x - d.x) * .01;
            if (d.diveWait <= 0){ d.diveStage = 2; d.diveX = d.x; }
        } else if (d.diveStage === 2){ // падение
            d.y += dt * 2.0;
            fireBurst(d.x, d.y-40, 5, 4, 1.4);
            if (d.y >= GROUND() - 70){
                d.y = GROUND() - 70;
                shockwaves.push({ x:d.x, y:d.y+40, r:70, max:canvas.width*1.1, speed:11, band:40, dmg:97, hit:false });
                for (let i=0;i<8;i++) spawnMeteor(d.x + random(-350,350), -random(20,240), 66, i*70);
                d.diveStage = 3; d.diveRest = 700;
            }
        } else {
            d.diveRest -= dt;
            d.y -= dt*.12;
            if (d.diveRest <= 0) endDragonAttack(d);
        }
        if (d.stateTimer <= 0 && d.diveStage < 3) endDragonAttack(d);
    }

    d.x = clamp(d.x, -200, canvas.width+200);
    if (d.state !== 'dive') d.y = clamp(d.y, 130, canvas.height*.55);
}
function endDragonAttack(d){
    d.state = 'idle';
    d.attackCooldown = Math.max(520, [0,2000,1550,1150,800][d.phase]);
    d.jawOpen = 0;
    if (d.phase >= 3 && d.comboLeft <= 0 && Math.random() < (d.phase===4?.65:.35)){
        d.comboLeft = 1; d.attackCooldown = 300;
    } else if (d.comboLeft > 0) d.comboLeft--;
}
function runActiveAttack(d, dt){
    const p = player, m = mouthPos(d), ph = d.phase;
    switch (d.attack){
        case 'breath': {
            d.jawOpen = 1;
            const target = angleTo(m, p);
            let diff = Math.atan2(Math.sin(target-d.breathAngle), Math.cos(target-d.breathAngle));
            d.breathAngle += clamp(diff, -.0011*dt, .0011*dt);
            d.breathTick += dt;
            while (d.breathTick > 26){
                d.breathTick -= 26;
                const a = d.breathAngle + random(-.13,.13);
                const sp = random(9,13);
                enemyProjectiles.push({ x:m.x, y:m.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
                    radius: random(9,17), damage: 34+ph*9, life: 1000+ph*80, color:"#ff7a11", flame:true, trail:[] });
            }
            fireBurst(m.x, m.y, 2, 2, 1.2);
            break;
        }
        case 'salvo': {
            d.jawOpen = .7;
            d.salvoTick += dt;
            while (d.salvoTick > 90 && d.salvoLeft > 0){
                d.salvoTick -= 90; d.salvoLeft--;
                const a = angleTo(m, p) + random(-.75,.75);
                enemyProjectiles.push({ x:m.x, y:m.y, vx:Math.cos(a)*random(5,8), vy:Math.sin(a)*random(5,8),
                    radius: 14, damage: 73+ph*13, life: 2200, color:"#ff5511", flame:true, trail:[] });
            }
            break;
        }
        case 'flames': {
            d.jawOpen = .8;
            d.flameTick += dt;
            while (d.flameTick > 260 && d.flameLeft > 0){
                d.flameTick -= 260; d.flameLeft--;
                const base = angleTo(m, p), n = 7 + ph*2;
                for (let i=0;i<n;i++) enemyProjectiles.push({
                    x:m.x, y:m.y, vx:Math.cos(base+(i-(n-1)/2)*.15)*6.5, vy:Math.sin(base+(i-(n-1)/2)*.15)*6.5,
                    radius: 10, damage: 52+ph*10, life: 2600, color:"#ffaa22", homing:.022, flame:true, trail:[] });
            }
            break;
        }
        case 'laser': {
            d.jawOpen = .4;
            break;
        }
    }
}

// ================================================================
//  SOLAR DEVOURER — ЛОГИКА
// ================================================================
function getSolarSegment(w, i){
    const idx = Math.min(w.history.length-1, i*w.ptsPerSeg);
    return w.history[idx] || w.head;
}
function solarPhaseOf(w){
    const r = w.hp / w.maxHp;
    if (r <= .25) return 3;
    if (r <= .60) return 2;
    return 1;
}
function pushSolarHistory(w){
    w.history.unshift({x:w.head.x, y:w.head.y});
    const maxLen = w.segCount*w.ptsPerSeg + 6;
    if (w.history.length > maxLen) w.history.length = maxLen;
}
function spawnSolarMine(x,y,dmg){
    solarMines.push({ x, y, r:16, armDelay:400, life:6000, dmg, pulse:Math.random()*6 });
}
function startSolarAttack(w){
    const pool = SOLAR_ATTACKS[w.phase];
    let pick = pool[Math.floor(Math.random()*pool.length)];
    if (pick === w.lastAttack && pool.length>1 && Math.random()<.7) pick = pool[Math.floor(Math.random()*pool.length)];
    w.lastAttack = pick; w.attack = pick;
    if (pick === 'charge'){
        w.state = 'charge_wait';
        w.chargeLeft = 2 + w.phase;
        pickSolarChargeTarget(w);
        showAttackWarning(SOLAR_LABEL.charge);
    } else if (pick === 'burrow'){
        w.state = 'burrow_down'; w.stateTimer = 700;
        showAttackWarning(SOLAR_LABEL.burrow);
    } else if (pick === 'split'){
        w.state = 'split_active'; w.stateTimer = w.phase>=3 ? 5200 : 4200;
        spawnMiniWorms(w);
        showAttackWarning(SOLAR_LABEL.split);
    } else {
        w.state = 'telegraph';
        w.telegraphMax = Math.max(360, 780 - (w.phase-1)*140);
        w.telegraph = w.telegraphMax;
        showAttackWarning(SOLAR_LABEL[pick]);
    }
}
function executeSolarAttack(w){
    const p = player, ph = w.phase, h = w.head;
    w.state = 'attack';
    const dmgScale = 1 + (ph-1)*.22;
    switch (w.attack){
        case 'fireballs':
            w.salvoLeft = 6 + ph*3; w.salvoTick = 0; w.stateTimer = w.salvoLeft*130 + 300;
            break;
        case 'laser': {
            const n = ph >= 3 ? 3 : 2;
            const base = angleTo(h, p);
            for (let i=0;i<n;i++) beams.push({
                x: h.x, y: h.y, angle: base + (i-(n-1)/2)*.5,
                sweep: (Math.random()<.5?-1:1)*.0004*ph, charge: 650, active: 0,
                dmg: 402*dmgScale, len: 2200, solarOwner: true });
            w.stateTimer = 650 + 1000 + 200;
            break;
        }
        case 'meteors': {
            const n = 5 + ph*3;
            for (let i=0;i<n;i++) spawnMeteor(random(60, canvas.width-60), -random(60,500), 276*dmgScale, i*95);
            w.stateTimer = 900;
            break;
        }
        case 'bursts': {
            const picks = ph>=3?5:3;
            for (let k=0;k<picks;k++){
                const idx = Math.floor(random(0, w.segCount));
                setTimeoutSafe(() => {
                    const seg = getSolarSegment(w, idx);
                    fireBurst(seg.x, seg.y, 40, 10, 1.4);
                    shockwaves.push({ x:seg.x, y:seg.y, r:20, max:280, speed:8.5, band:30, dmg:294*dmgScale, hit:false });
                }, k*220);
            }
            w.stateTimer = picks*220 + 500;
            break;
        }
        case 'mines': {
            const n = 6 + ph*2;
            for (let i=0;i<n;i++){
                const a = Math.PI*2*i/n;
                spawnSolarMine(p.x+Math.cos(a)*180, p.y+Math.sin(a)*180, 384*dmgScale);
            }
            w.stateTimer = 500;
            break;
        }
        case 'beamring': {
            const n = ph >= 3 ? 8 : 6;
            const sweep = (Math.random()<.5?-1:1)*.0009;
            for (let i=0;i<n;i++) beams.push({
                x: h.x, y: h.y, angle: Math.PI*2*i/n, sweep, charge: 700, active: 0,
                dmg: 348*dmgScale, len: 520, solarOwner: true, ring:true });
            w.stateTimer = 700 + 1500 + 200;
            break;
        }
    }
}
function runActiveSolarAttack(w, dt){
    const p = player, ph = w.phase, h = w.head;
    if (w.attack === 'fireballs'){
        w.salvoTick += dt;
        while (w.salvoTick > 130 && w.salvoLeft > 0){
            w.salvoTick -= 130; w.salvoLeft--;
            const a = angleTo(h, p) + random(-.45,.45);
            fireEnemyAt(h.x, h.y, a, random(6.5,9.5), 210+ph*60, 15, "#ff5500", 2400, {flame:true});
        }
    }
}
function endSolarAttack(w){
    w.state = 'roam';
    w.attack = null;
    w.attackCooldown = Math.max(500, [0,1900,1350,900][w.phase]);
    if (w.phase >= 3 && Math.random() < .5) w.attackCooldown = 300;
}
function pickSolarChargeTarget(w){
    const p = player;
    const fromLeft = Math.random() < .5;
    w.head.x = fromLeft ? -160 : canvas.width+160;
    w.head.y = clamp(p.y + random(-70,70), 150, GROUND()-100);
    w.chargeAngle = fromLeft ? 0 : Math.PI;
    w.chargeTX = fromLeft ? canvas.width+160 : -160;
    w.chargeWait = 480;
}
function spawnMiniWorms(w){
    const n = 3 + w.phase;
    for (let i=0;i<n;i++){
        const a = Math.PI*2*i/n;
        w.miniWorms.push({
            x: w.head.x + Math.cos(a)*260, y: clamp(w.head.y + Math.sin(a)*180, 150, GROUND()-60),
            vx:0, vy:0, hp: 220 + w.phase*70, maxHp: 220+w.phase*70, radius: 24,
            cd: random(500,1100), tail: []
        });
    }
}
function updateMiniWorms(w, dt){
    const p = player;
    for (let i=w.miniWorms.length-1;i>=0;i--){
        const mw = w.miniWorms[i];
        const a = angleTo(mw, p), d = distance(mw, p);
        const spd = (d>140?2.6:0.6) * (w.phase>=3?1.4:1);
        mw.vx += Math.cos(a)*spd*.02; mw.vy += Math.sin(a)*spd*.02;
        mw.vx *= .93; mw.vy *= .93;
        mw.x += mw.vx*dt*.06; mw.y += mw.vy*dt*.06;
        mw.x = clamp(mw.x, 40, canvas.width-40); mw.y = clamp(mw.y, 130, GROUND()-20);
        mw.tail.unshift({x:mw.x,y:mw.y}); if (mw.tail.length>8) mw.tail.shift();
        mw.cd -= dt;
        if (mw.cd <= 0){
            mw.cd = random(900,1500);
            fireEnemyAt(mw.x, mw.y, a, 6, 138+w.phase*36, 10, "#ff8822", 1800, {flame:true});
        }
        if (player && player.invincible<=0 && distance(mw,p) < mw.radius+p.radius) hurtPlayer(138+w.phase*42, "#ff8800", true);
        if (mw.hp <= 0){ fireBurst(mw.x, mw.y, 26, 8, 1); w.miniWorms.splice(i,1); }
    }
}
function solarContactDamage(w){
    if (w.underground || !player || player.invincible > 0) return;
    const baseDmg = (156 + w.phase*78) * (hasArtifact('solar_core') ? .8 : 1);
    let hit = distance(w.head, player) < 50 + player.radius;
    if (!hit){
        for (let i=0;i<w.segCount;i++){
            const seg = getSolarSegment(w, i);
            if (distance(seg, player) < w.segRadii[i] + player.radius){ hit = true; break; }
        }
    }
    if (hit) hurtPlayer(baseDmg, "#ff7700", true);
}
function updateSolarDevourer(dt){
    const w = solarDevourer, p = player;
    if (!w || solarDevourerDefeated) return;
    w.hitFlash = Math.max(0, w.hitFlash - dt*.004);
    const newPhase = solarPhaseOf(w);
    if (newPhase !== w.phase){
        w.phase = newPhase;
        fireGlow = Math.max(fireGlow,.8);
        showMessage(newPhase===3 ? "☀️ SOLAR DEVOURER В ЯРОСТИ!" : "☀️ АРЕНА НАПОЛНЯЕТСЯ СОЛНЕЧНОЙ ЭНЕРГИЕЙ!");
        fireBurst(w.head.x, w.head.y, 100, 16, 1.8);
        w.attackCooldown = Math.min(w.attackCooldown, 500);
    }
    document.getElementById("phase").textContent =
        `☀️ ФАЗА ${w.phase} — ${['','ПРОБУЖДЕНИЕ','СОЛНЕЧНЫЙ ШТОРМ','ЯРОСТЬ ПОЖИРАТЕЛЯ'][w.phase]} · HP ${Math.max(0,Math.ceil(w.hp))}`;

    if (w.state === 'emerge'){
        w.stateTimer -= dt;
        w.head.y += (w.homeY - w.head.y) * .02;
        pushSolarHistory(w);
        if (w.stateTimer <= 0){ w.state = 'roam'; w.attackCooldown = 2000; }
    }
    else if (w.state === 'roam'){
        const targetAngle = angleTo(w.head, p) + Math.sin(worldTime*.0016)*.5;
        let diff = Math.atan2(Math.sin(targetAngle-w.angle), Math.cos(targetAngle-w.angle));
        w.angle += clamp(diff, -.0026*dt, .0026*dt);
        const spd = (2.6 + w.phase*.5) * dt * .06;
        w.head.x += Math.cos(w.angle)*spd; w.head.y += Math.sin(w.angle)*spd;
        w.head.x = clamp(w.head.x, 80, canvas.width-80);
        w.head.y = clamp(w.head.y, 140, canvas.height*.62);
        pushSolarHistory(w);
        solarContactDamage(w);
        w.attackCooldown -= dt;
        if (w.attackCooldown <= 0) startSolarAttack(w);
    }
    else if (w.state === 'telegraph'){
        w.telegraph -= dt;
        pushSolarHistory(w);
        solarContactDamage(w);
        if (Math.random()<.4) particle(w.head.x, w.head.y, "#ffee88", 2, 3, .5);
        if (w.telegraph <= 0) executeSolarAttack(w);
    }
    else if (w.state === 'attack'){
        w.stateTimer -= dt;
        pushSolarHistory(w);
        solarContactDamage(w);
        runActiveSolarAttack(w, dt);
        if (w.stateTimer <= 0) endSolarAttack(w);
    }
    else if (w.state === 'charge_wait'){
        w.chargeWait -= dt;
        w.angle = w.chargeAngle;
        pushSolarHistory(w);
        if (w.chargeWait <= 0) w.state = 'charge_run';
    }
    else if (w.state === 'charge_run'){
        const spd = (12 + w.phase*2.4) * dt * .06;
        const dir = Math.sign(w.chargeTX - w.head.x) || 1;
        w.head.x += dir*spd;
        w.head.y += (p.y - w.head.y)*.01;
        pushSolarHistory(w);
        solarContactDamage(w);
        w.mineTick -= dt;
        if (w.mineTick <= 0){
            w.mineTick = 260;
            const tail = getSolarSegment(w, w.segCount-1);
            spawnSolarMine(tail.x, tail.y, 264+w.phase*54);
        }
        if ((dir>0 && w.head.x > w.chargeTX) || (dir<0 && w.head.x < w.chargeTX)){
            w.chargeLeft--;
            if (w.chargeLeft > 0) pickSolarChargeTarget(w);
            else endSolarAttack(w);
        }
    }
    else if (w.state === 'burrow_down'){
        w.stateTimer -= dt;
        w.head.y += dt*.5;
        pushSolarHistory(w);
        if (w.head.y > GROUND()+80 || w.stateTimer <= 0){
            w.underground = true; w.burrowWait = 1300 + w.phase*150;
            w.state = 'burrowed';
        }
    }
    else if (w.state === 'burrowed'){
        w.burrowWait -= dt;
        w.head.x += (p.x - w.head.x) * .01;
        if (Math.random()<.5) particles.push({ x:w.head.x+random(-30,30), y:GROUND()-random(0,10), vx:random(-.5,.5), vy:random(-1.4,-.4),
            life:1, maxLife:.6, size:random(3,7), color:"#ff8822", gravity:-.02 });
        if (w.burrowWait <= 0){
            w.underground = false; w.state = 'burrow_up'; w.head.y = GROUND()+60;
        }
    }
    else if (w.state === 'burrow_up'){
        w.head.y += (w.homeY - w.head.y) * .12;
        pushSolarHistory(w);
        solarContactDamage(w);
        if (!w.eruptDone){
            w.eruptDone = true;
            explode(w.head.x, GROUND(), 200, 522+w.phase*102, 1.8);
            shockwaves.push({ x:w.head.x, y:GROUND(), r:60, max:canvas.width, speed:10, band:36, dmg:384+w.phase*72, hit:false });
            }
        if (Math.abs(w.head.y - w.homeY) < 6){ w.eruptDone=false; endSolarAttack(w); }
    }
    else if (w.state === 'split_active'){
        w.stateTimer -= dt;
        const targetAngle = angleTo(w.head, p);
        w.angle += clamp(Math.atan2(Math.sin(targetAngle-w.angle),Math.cos(targetAngle-w.angle)), -.001*dt, .001*dt);
        w.head.x += Math.cos(w.angle)*1*dt*.06; w.head.y += Math.sin(w.angle)*1*dt*.06;
        w.head.x = clamp(w.head.x, 80, canvas.width-80); w.head.y = clamp(w.head.y, 140, canvas.height*.5);
        pushSolarHistory(w);
        solarContactDamage(w);
        updateMiniWorms(w, dt);
        if (w.stateTimer <= 0){
            for (const mw of w.miniWorms) fireBurst(mw.x, mw.y, 20, 6, 1);
            w.miniWorms = [];
            endSolarAttack(w);
        }
    }
    w.x = w.head.x; w.y = w.head.y;
}

// ================================================================
//  THE TWO-FACED DEMON — ЛОГИКА
// ================================================================
function demonPhaseOf(w){
    const r = w.hp / w.maxHp;
    if (r <= .15) return 4;
    if (r <= .40) return 3;
    if (r <= .70) return 2;
    return 1;
}
function spawnDemonLightning(x, dmg){
    demonLightnings.push({ x: clamp(x, 60, canvas.width-60), warn: 750, active: -1, dmg });
}
function startDemonAttack(w){
    const pool = DEMON_ATTACKS[Math.min(4, w.phase)];
    let pick = pool[Math.floor(Math.random()*pool.length)];
    if (pick === w.lastAttack && pool.length>1 && Math.random()<.7) pick = pool[Math.floor(Math.random()*pool.length)];
    if (w.phase >= 4 && Math.random() < .3) pick = 'cataclysm';
    w.lastAttack = pick; w.attack = pick;
    w.state = 'telegraph';
    w.telegraphMax = Math.max(320, 760 - (w.phase-1)*140);
    w.telegraph = w.telegraphMax;
    w.roar = 1;
    showAttackWarning(DEMON_LABEL[pick]);
}
function executeDemonAttack(w){
    const p = player, ph = w.phase;
    w.state = 'attack';
    const dmgScale = (1 + (ph-1)*.2) * 5;
    switch (w.attack){
        case 'dismantle':
            w.salvoLeft = 5 + ph*2; w.salvoTick = 0; w.stateTimer = w.salvoLeft*160 + 300;
            break;
        case 'dismantleBarrage':
            w.salvoLeft = 14 + ph*4; w.salvoTick = 0; w.stateTimer = w.salvoLeft*90 + 300;
            break;
        case 'melee':
            w.stateTimer = 700;
            setTimeoutSafe(() => {
                if (!w || twoFacedDemonDefeated) return;
                shockwaves.push({ x:w.x, y:w.y, r:20, max:230, speed:10, band:30, dmg:(30+ph*8)*dmgScale, hit:false });
                fireBurst(w.x, w.y, 30, 10, 1.1);
                }, 260);
            break;
        case 'lightning': {
            const n = 4 + ph*2;
            for (let i=0;i<n;i++) setTimeoutSafe(() => spawnDemonLightning(p.x+random(-220,220), 30*dmgScale), i*250);
            w.stateTimer = n*250 + 700;
            break;
        }
        case 'lightningSpear': {
            const a = angleTo({x:w.x,y:w.y-60}, p);
            enemyProjectiles.push({ x:w.x, y:w.y-60, vx:Math.cos(a)*7, vy:Math.sin(a)*7,
                radius:20, damage:55*dmgScale, life:2600, color:"#bb66ff", demonSpear:true, explosive:true, trail:[] });
            w.stateTimer = 900;
            break;
        }
        case 'netDismantle': {
            const margin = 60;
            const lines = [
                { x:margin, y:random(150,400), angle:0, vx:2.2, vy:0 },
                { x:canvas.width-margin, y:random(150,400), angle:Math.PI, vx:-2.2, vy:0 },
                { x:random(200,canvas.width-200), y:120, angle:Math.PI/2, vx:0, vy:1.6 },
                { x:random(200,canvas.width-200), y:GROUND()-40, angle:-Math.PI/2, vx:0, vy:-1.6 }
            ];
            for (const ln of lines) beams.push({ x:ln.x, y:ln.y, angle:ln.angle, sweep:0, vx:ln.vx, vy:ln.vy,
                charge:600, active:0, dmg:38*dmgScale, len: Math.max(canvas.width,canvas.height), demonNet:true });
            w.stateTimer = 600 + 2600 + 300;
            break;
        }
        case 'fourArmed': {
            const a = () => angleTo(w, p);
            setTimeoutSafe(() => { for (let i=0;i<5;i++) fireEnemyAt(w.x-55, w.y-40, a()+(i-2)*.15, 13, 32*dmgScale, 9, "#ff2244", 1400, {slash:true}); }, 0);
            setTimeoutSafe(() => { shockwaves.push({ x:w.x, y:w.y, r:20, max:240, speed:9, band:30, dmg:34*dmgScale, hit:false }); }, 380);
            setTimeoutSafe(() => { for (let i=0;i<5;i++) fireEnemyAt(w.x+55, w.y-40, a()+(i-2)*.15, 13, 32*dmgScale, 9, "#ff2244", 1400, {slash:true}); }, 680);
            setTimeoutSafe(() => spawnDemonLightning(p.x, 40*dmgScale), 1050);
            w.stateTimer = 1900;
            break;
        }
        case 'dualRoar': {
            const base = angleTo(w, p);
            beams.push({ x:w.x-46, y:w.y-72, angle:base-.22, sweep:.0006, charge:800, active:0, dmg:48*dmgScale, len:2200, demonFace:'left' });
            beams.push({ x:w.x+46, y:w.y-72, angle:base+.22, sweep:.0006, charge:800, active:0, dmg:48*dmgScale, len:2200, demonFace:'right' });
            w.stateTimer = 800 + 1400 + 300;
            break;
        }
        case 'cataclysm': {
            const margin = 50;
            const lines = [
                { x:margin, y:random(150,400), angle:0, vx:1.8, vy:0 },
                { x:canvas.width-margin, y:random(150,400), angle:Math.PI, vx:-1.8, vy:0 },
                { x:random(200,canvas.width-200), y:110, angle:Math.PI/2, vx:0, vy:1.3 },
                { x:random(200,canvas.width-200), y:GROUND()-30, angle:-Math.PI/2, vx:0, vy:-1.3 }
            ];
            for (const ln of lines) beams.push({ x:ln.x, y:ln.y, angle:ln.angle, sweep:0, vx:ln.vx, vy:ln.vy,
                charge:700, active:0, dmg:42*dmgScale, len: Math.max(canvas.width,canvas.height), demonNet:true });
            for (let i=0;i<10;i++) setTimeoutSafe(() => spawnDemonLightning(random(60,canvas.width-60), 34*dmgScale), i*260);
            const base = angleTo(w, p);
            setTimeoutSafe(() => {
                if (!w || twoFacedDemonDefeated) return;
                beams.push({ x:w.x-46, y:w.y-72, angle:base-.2, sweep:.0008, charge:500, active:0, dmg:44*dmgScale, len:2200, demonFace:'left' });
                beams.push({ x:w.x+46, y:w.y-72, angle:base+.2, sweep:.0008, charge:500, active:0, dmg:44*dmgScale, len:2200, demonFace:'right' });
            }, 900);
            w.stateTimer = 4400;
            break;
        }
    }
}
function runActiveDemonAttack(w, dt){
    const p = player, ph = w.phase;
    if (w.attack === 'dismantle' || w.attack === 'dismantleBarrage'){
        w.salvoTick += dt;
        const rate = w.attack === 'dismantleBarrage' ? 90 : 160;
        while (w.salvoTick > rate && w.salvoLeft > 0){
            w.salvoTick -= rate; w.salvoLeft--;
            const originX = w.x + (Math.random()<.5 ? -55 : 55), originY = w.y - 40;
            const a = angleTo({x:originX,y:originY}, p) + random(-.3,.3);
            fireEnemyAt(originX, originY, a, random(13,17), (26+ph*6)*(w.attack==='dismantleBarrage'?.7:1) * 5, 9,
                Math.random()<.5?"#ff2244":"#661122", 1500, {slash:true});
        }
    }
}
function endDemonAttack(w){
    w.state = 'roam';
    w.attack = null;
    w.attackCooldown = Math.max(400, [0,1700,1200,850,550][w.phase]);
    if (w.phase >= 3 && Math.random() < .5) w.attackCooldown = 260;
}
function updateTwoFacedDemon(dt){
    const w = twoFacedDemon, p = player;
    if (!w || twoFacedDemonDefeated) return;
    w.hitFlash = Math.max(0, w.hitFlash - dt*.004);
    w.auraPulse += dt*.003;
    w.armSwing += dt*.006;
    w.roar = Math.max(0, w.roar - dt*.0022);
    const newPhase = demonPhaseOf(w);
    if (newPhase !== w.phase){
        w.phase = newPhase;
        showMessage(newPhase===4 ? "👹 ДВА ЛИЦА КРИЧАТ ОДНОВРЕМЕННО! КАТАКЛИЗМ!" :
            newPhase===3 ? "👹 ЗЛОБНЫЙ ДЕМОН ПРОБУЖДАЕТСЯ ПОЛНОСТЬЮ!" : "👹 ПРОКЛЯТАЯ ЯРОСТЬ НАРАСТАЕТ!");
        fireBurst(w.x, w.y, 90, 16, 1.6);
        w.attackCooldown = Math.min(w.attackCooldown, 500);
    }
    document.getElementById("phase").textContent =
        `👹 ФАЗА ${w.phase} — ${['','ПРОБУЖДЕНИЕ ДЕМОНА','ПРОКЛЯТАЯ ЯРОСТЬ','ЗЛОБНЫЙ ДЕМОН','КАТАКЛИЗМ ДВУЛИКОГО'][w.phase]} · HP ${Math.max(0,Math.ceil(w.hp))}`;

    if (w.state === 'emerge'){
        w.stateTimer -= dt;
        w.y += (GROUND()-150 - w.y) * .02;
        if (w.stateTimer <= 0){ w.state = 'roam'; w.attackCooldown = 2000; w.y = GROUND()-150; }
    }
    else if (w.state === 'roam'){
        const desiredX = clamp(p.x + (p.x < w.x ? 230 : -230), 100, canvas.width-100);
        w.x += (desiredX - w.x) * .0022 * dt;
        w.y = GROUND() - 150;
        w.teleportCd -= dt;
        if (w.teleportCd <= 0 && w.phase >= 2){
            fireBurst(w.x, w.y, 26, 8, 1);
            w.x = clamp(p.x + (Math.random()<.5?-1:1)*random(140,240), 100, canvas.width-100);
            fireBurst(w.x, w.y, 26, 8, 1);
            w.teleportCd = random(2200 - w.phase*250, 3600 - w.phase*300);
        }
        if (player.invincible <= 0 && distance(w, p) < w.radius + p.radius){
            hurtPlayer((20 + w.phase*8) * 5, "#aa1133", true);
        }
        w.attackCooldown -= dt;
        if (w.attackCooldown <= 0) startDemonAttack(w);
    }
    else if (w.state === 'telegraph'){
        w.telegraph -= dt;
        if (Math.random() < .4) particle(w.x, w.y-40, "#ff3355", 2, 3, .5);
        if (player.invincible <= 0 && distance(w, p) < w.radius + p.radius) hurtPlayer((20 + w.phase*8) * 5, "#aa1133", true);
        if (w.telegraph <= 0) executeDemonAttack(w);
    }
    else if (w.state === 'attack'){
        w.stateTimer -= dt;
        runActiveDemonAttack(w, dt);
        if (player.invincible <= 0 && distance(w, p) < w.radius + p.radius) hurtPlayer((20 + w.phase*8) * 5, "#aa1133", true);
        if (w.stateTimer <= 0) endDemonAttack(w);
    }
}

// ================================================================
//  ОПАСНОСТИ АРЕНЫ
// ================================================================
function hurtPlayer(amount, color="#ff3333", fireSource=false){
    if (!player || player.invincible > 0 || gameOver || paused || journalOpen || artifactMenuOpen || workshopMenuOpen) return false;
    amount *= DIFFICULTIES[activeDifficulty].damage;
    if (fireSource && hasArtifact('dragon_heart')) amount *= 0.75;
    if (hasArtifact('demon_talisman')) amount *= 0.75;
    if (hasArtifact('adaptation_wheel')){
        amount *= Math.max(0, 1 - playerAdaptation * .02);
        playerAdaptation = Math.min(50, playerAdaptation + 1);
    }
    player.hp -= amount; player.invincible = 680;
    damageNumber(player.x, player.y-26, Math.floor(amount), color, true);
    particle(player.x, player.y, color, 18, 6);
    if (player.hp <= 0){
        player.hp = 0; gameOver = true;
        document.getElementById("deathScreen").style.display = "flex";
    }
    return true;
}
function explode(x,y,radius,dmg,scale=1){
    fireBurst(x, y, 40*scale, 11, scale);
    particle(x, y, "#331100", 14, 6, 1, 10);
    fireGlow = Math.max(fireGlow, .5);
    if (player && distance({x,y}, player) < radius) hurtPlayer(dmg, "#ff6600", true);
}
function updateHazards(dt){
    // отложенные таймеры
    for (let i=pendingTimers.length-1;i>=0;i--){
        pendingTimers[i].t -= dt;
        if (pendingTimers[i].t <= 0){ pendingTimers[i].fn(); pendingTimers.splice(i,1); }
    }
    // метеоры
    for (let i=meteors.length-1;i>=0;i--){
        const m = meteors[i];
        if (m.delay > 0){ m.delay -= dt; continue; }
        m.vy = Math.min(m.vy + .05*dt*.06, 14);
        m.x += m.vx * dt * .06; m.y += m.vy * dt * .06;
        if (Math.random() < .8) particles.push({ x:m.x+random(-6,6), y:m.y+random(-6,6), vx:random(-.6,.6), vy:random(-1.5,-.3),
            life:1, maxLife:.7, size:random(3,8), color:["#ffdd66","#ff8800","#ff3300"][Math.floor(Math.random()*3)], gravity:-.02 });
        if (player && distance(m, player) < m.r + player.radius){
            explode(m.x, m.y, 74, m.dmg); meteors.splice(i,1); continue;
        }
        if (m.y >= m.targetY){ explode(m.x, m.targetY, 90, m.dmg*.8); meteors.splice(i,1); continue; }
        if (m.x < -120 || m.x > canvas.width+120) meteors.splice(i,1);
    }
    // смерчи
    for (let i=tornadoes.length-1;i>=0;i--){
        const t = tornadoes[i];
        t.life -= dt; t.angle += dt*.012;
        t.x += t.vx * dt * .06;
        if (t.x < 80 || t.x > canvas.width-80) t.vx *= -1;
        t.y = GROUND() - 90 + Math.sin(worldTime*.002 + i)*22;
        if (Math.random() < .7) particles.push({ x:t.x+random(-t.r,t.r), y:t.y+random(-90,90), vx:random(-1,1), vy:random(-2.5,-.8),
            life:1, maxLife:.8, size:random(3,8), color:["#ffcc44","#ff7711","#ff3300"][Math.floor(Math.random()*3)], gravity:-.03 });
        t.tick -= dt;
        if (player && Math.abs(player.x-t.x) < t.r && Math.abs(player.y-t.y) < 110 && t.tick <= 0){
            if (hurtPlayer(t.dmg, "#ff8800", true)) t.tick = 700;
        }
        if (t.life <= 0) tornadoes.splice(i,1);
    }
    // ударные волны
    for (let i=shockwaves.length-1;i>=0;i--){
        const s = shockwaves[i];
        s.r += s.speed * dt * .06;
        if (player && !s.hit){
            const dd = Math.abs(distance(s, player) - s.r);
            if (dd < s.band){ if (hurtPlayer(s.dmg, "#ffaa33", true)) s.hit = true; }
        }
        if (s.r > s.max) shockwaves.splice(i,1);
    }
    // лучи
    for (let i=beams.length-1;i>=0;i--){
        const b = beams[i];
        if (b.vx || b.vy){ b.x += b.vx*dt*.06; b.y += b.vy*dt*.06; }
        if (b.solarOwner && solarDevourer && !solarDevourerDefeated){ b.x = solarDevourer.head.x; b.y = solarDevourer.head.y; }
        else if (b.demonFace && twoFacedDemon && !twoFacedDemonDefeated){
            b.x = twoFacedDemon.x + (b.demonFace === 'left' ? -46 : 46);
            b.y = twoFacedDemon.y - 72;
        }
        else if (dragon && !dragonDefeated){ b.x = dragon.x + dragon.facing*70; b.y = dragon.y - 46; }
        if (b.charge > 0){
            b.charge -= dt;
            if (b.charge <= 0) b.active = 900;
        } else {
            b.active -= dt;
            b.angle += b.sweep * dt;
            const ex = b.x + Math.cos(b.angle)*b.len, ey = b.y + Math.sin(b.angle)*b.len;
            if (player && pointSegDist(player.x, player.y, b.x, b.y, ex, ey) < 20 + player.radius) hurtPlayer(b.dmg, "#ffdd55", true);
            for (let k=0;k<2;k++){
                const t = Math.random();
                particles.push({ x:b.x+(ex-b.x)*t, y:b.y+(ey-b.y)*t, vx:random(-1,1), vy:random(-1,1),
                    life:1, maxLife:.4, size:random(2,6), color:"#ffee99", gravity:0 });
            }
            if (b.active <= 0) beams.splice(i,1);
        }
    }
    // гейзеры
    for (let i=geysers.length-1;i>=0;i--){
        const g = geysers[i];
        if (g.warn > 0){ g.warn -= dt; if (g.warn <= 0) g.active = 900; continue; }
        g.active -= dt;
        for (let k=0;k<3;k++) particles.push({ x:g.x+random(-22,22), y:GROUND()-random(0,300), vx:random(-.8,.8), vy:random(-4,-1.5),
            life:1, maxLife:.8, size:random(4,10), color:["#ffee88","#ffaa22","#ff4400"][Math.floor(Math.random()*3)], gravity:-.05 });
        if (player && Math.abs(player.x-g.x) < 34 && player.y > GROUND()-320) hurtPlayer(g.dmg, "#ffaa33", true);
        if (g.active <= 0) geysers.splice(i,1);
    }
    // молнии Двуликого Демона
    for (let i=demonLightnings.length-1;i>=0;i--){
        const l = demonLightnings[i];
        if (l.warn > 0){
            l.warn -= dt;
            if (Math.random() < .6) particles.push({ x:l.x+random(-8,8), y:random(120, GROUND()-40), vx:random(-.3,.3), vy:random(3,7),
                life:1, maxLife:.35, size:random(2,5), color:"#cc99ff", gravity:0 });
            if (l.warn <= 0) l.active = 260;
            continue;
        }
        l.active -= dt;
        if (player && Math.abs(player.x-l.x) < 36 && player.y > 110) hurtPlayer(l.dmg, "#cc88ff", true);
        for (let k=0;k<3;k++) particles.push({ x:l.x+random(-14,14), y:random(120, GROUND()), vx:random(-1,1), vy:random(-1,1),
            life:1, maxLife:.4, size:random(3,7), color:["#dd99ff","#8844ff","#ffffff"][Math.floor(Math.random()*3)], gravity:0 });
        if (l.active <= 0) demonLightnings.splice(i,1);
    }
    // миньоны
    for (let i=minions.length-1;i>=0;i--){
        const mn = minions[i];
        mn.flap += dt*.012; mn.orbit += dt*.0009;
        if (player){
            const want = { x: player.x + Math.cos(mn.orbit)*200, y: player.y + Math.sin(mn.orbit)*150 - 60 };
            mn.x += (want.x - mn.x) * .02; mn.y += (want.y - mn.y) * .02;
            mn.facing = player.x < mn.x ? -1 : 1;
            mn.cd -= dt;
            if (mn.cd <= 0){
                mn.cd = random(1100, 1900);
                const a = angleTo(mn, player);
                enemyProjectiles.push({ x:mn.x, y:mn.y, vx:Math.cos(a)*6.5, vy:Math.sin(a)*6.5,
                    radius:9, damage:52, life:2200, color:"#ff8822", flame:true, trail:[] });
            }
        }
        if (mn.hp <= 0){
            explode(mn.x, mn.y, 0, 0, .9); fireBurst(mn.x, mn.y, 30, 8, 1);
            minions.splice(i,1);
        }
    }
    // солнечные мины
    for (let i=solarMines.length-1;i>=0;i--){
        const mn = solarMines[i];
        mn.armDelay -= dt; mn.life -= dt; mn.pulse += dt*.006;
        if (Math.random() < .4) particles.push({ x:mn.x+random(-6,6), y:mn.y+random(-6,6), vx:random(-.3,.3), vy:random(-.6,-.1),
            life:1, maxLife:.5, size:random(2,5), color:"#ffcc33", gravity:0 });
        let pop = false;
        if (mn.armDelay <= 0 && player && distance(mn, player) < mn.r + player.radius + 14) pop = true;
        if (mn.life <= 0) pop = true;
        if (pop){ explode(mn.x, mn.y, 90, mn.dmg, 1.1); solarMines.splice(i,1); }
    }
}

// ================================================================
//  СТОЛКНОВЕНИЯ СНАРЯДОВ ИГРОКА
// ================================================================
function applyLifesteal(damage){
    if (player && hasArtifact('dragon_heart')) player.hp = Math.min(player.maxHp, player.hp + damage*0.08);
}
function hitBoss(p){
    if (!bossDefeated && boss){
        if (Math.hypot(p.x-boss.x, p.y-boss.y) < boss.radius + p.radius){
            const wi = p.weaponIdx ?? weapon;
            const adaptGain = hasArtifact('mahoraga_fang') ? 0.5 : 1;
            weaponAdaptation[wi] = Math.min(100, weaponAdaptation[wi]+adaptGain);
            const resist = Math.min(.75, weaponAdaptation[wi]*.0075);
            const dispPct = Math.min(100, weaponAdaptation[wi]*.75);
            if (dispPct >= 50 && !weaponAdaptTurned[wi]){
                weaponAdaptTurned[wi] = true;
                boss.adaptWheelTarget += Math.PI/4;
                boss.adaptWheelFlash = 1;
                boss.adaptWheelLit = Math.min(8, (boss.adaptWheelLit||0)+1);
                showMessage(`🔯 АДАПТАЦИЯ 50%: ${weapons[wi].name} — колесо Махораги поворачивается!`);
                }
            const damage = Math.max(1, Math.floor(p.damage*(1-resist)));
            boss.hp -= damage; igniteTarget(boss); totalDamage += damage;
            damageNumber(boss.x+random(-30,30), boss.y+random(-20,20), damage, p.color, true);
            particle(p.x, p.y, p.color, 12, 6, .6);
            applyLifesteal(damage);
            adaptationGlobal++;
            if (adaptationGlobal >= 25 && boss.phase === 1) boss.phase = 2;
            if (adaptationGlobal >= 60 && boss.phase === 2) boss.phase = 3;
            return true;
        }
    }
    if (ethernaty1 && !firstEthernatyDefeated){
        if (Math.hypot(p.x-ethernaty1.x, p.y-ethernaty1.y) < ethernaty1.radius + p.radius){
            const damage = Math.max(1, Math.floor(p.damage*.7));
            ethernaty1.hp -= damage; igniteTarget(ethernaty1); totalDamage += damage;
            damageNumber(ethernaty1.x, ethernaty1.y, damage, p.color, true);
            particle(p.x, p.y, p.color, 16, 8, .6);
            applyLifesteal(damage);
            return true;
        }
    }
    // миньоны — приоритетно, они ближе
    for (const mn of minions){
        if (Math.hypot(p.x-mn.x, p.y-mn.y) < mn.radius + p.radius){
            const damage = Math.max(1, Math.floor(p.damage));
            mn.hp -= damage; igniteTarget(mn); totalDamage += damage;
            damageNumber(mn.x, mn.y, damage, "#ffcc66");
            particle(p.x, p.y, "#ffaa44", 10, 6, .5);
            applyLifesteal(damage);
            return true;
        }
    }
    if (dragon && !dragonDefeated){
        const dx = p.x - dragon.x, dy = p.y - dragon.y;
        // вытянутый хитбокс под силуэт дракона
        if ((dx*dx)/((120+p.radius)**2) + (dy*dy)/((74+p.radius)**2) < 1){
            const damage = Math.max(1, Math.floor(p.damage*.8));
            dragon.hp -= damage; igniteTarget(dragon); totalDamage += damage;
            dragon.hitFlash = 1;
            damageNumber(dragon.x+random(-50,50), dragon.y+random(-30,30), damage, p.color, true);
            fireBurst(p.x, p.y, 8, 5, .8);
            applyLifesteal(damage);
            return true;
        }
    }
    if (solarDevourer && !solarDevourerDefeated){
        const w = solarDevourer;
        let hitSeg = !w.underground && distance(p, w.head) < 62 + p.radius;
        if (!hitSeg && !w.underground){
            for (let i=0;i<w.segCount;i++){
                const seg = getSolarSegment(w, i);
                if (distance(p, seg) < w.segRadii[i] + p.radius){ hitSeg = true; break; }
            }
        }
        if (hitSeg){
            const damage = Math.max(1, Math.floor(p.damage));
            w.hp -= damage; igniteTarget(w); totalDamage += damage; w.hitFlash = 1;
            damageNumber(w.head.x+random(-40,40), w.head.y+random(-30,30), damage, p.color, true);
            fireBurst(p.x, p.y, 8, 5, .8);
            applyLifesteal(damage);
            return true;
        }
        for (const mw of w.miniWorms){
            if (distance(p, mw) < mw.radius + p.radius){
                const damage = Math.max(1, Math.floor(p.damage*.8));
                mw.hp -= damage; igniteTarget(mw); igniteTarget(w); totalDamage += damage;
                damageNumber(mw.x, mw.y, damage, p.color);
                fireBurst(p.x, p.y, 6, 4, .6);
                applyLifesteal(damage);
                return true;
            }
        }
    }
    if (twoFacedDemon && !twoFacedDemonDefeated){
        const w = twoFacedDemon;
        if (distance(p, w) < w.radius + p.radius){
            const damage = Math.max(1, Math.floor(p.damage));
            w.hp -= damage; igniteTarget(w); totalDamage += damage; w.hitFlash = 1;
            damageNumber(w.x+random(-40,40), w.y+random(-50,10), damage, p.color, true);
            fireBurst(p.x, p.y, 8, 5, .8);
            applyLifesteal(damage);
            return true;
        }
    }
    return false;
}
function hitPlayerProjectile(p){
    if (!player) return false;
    if (Math.hypot(p.x-player.x, p.y-player.y) < p.radius + player.radius){
        if (player.invincible > 0) return false;
        hurtPlayer(p.damage, p.flame ? "#ff7700" : "#ff3333", !!p.flame);
        if (p.explosive) explode(p.x, p.y, 90, p.damage*.4, 1.2);
        return true;
    }
    return false;
}

// ================================================================
//  ОБНОВЛЕНИЕ
// ================================================================
function update(dt){
    if (gameOver || !currentClass || workshopMenuOpen || artifactMenuOpen || paused || journalOpen) return;
    runElapsed += dt;
    healCooldown = Math.max(0, healCooldown - dt);
    updateRunHUD();
    updateWorkshopHUD();
    worldTime += dt;
    const maxCap = isMobileDevice ? 110 : 260;
    if (particles.length > maxCap) particles.splice(0, particles.length - maxCap);
    if (fireGlow > 0) fireGlow = Math.max(0, fireGlow - dt*.0012);

    const targetBlend = currentBiome==='forest' ? 0 : currentBiome==='cosmic' ? 1 : 2;
    biomeBlend += (targetBlend - biomeBlend) * .02;

    for (const p of bgParticles){
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = canvas.width+10;
        if (p.x > canvas.width+10) p.x = -10;
        if (p.y < -10) p.y = canvas.height+10;
        if (p.y > canvas.height+10) p.y = -10;
    }

    // --- игрок
    let dx=0, dy=0;
    if (keys["w"]||keys["arrowup"]) dy--;
    if (keys["s"]||keys["arrowdown"]) dy++;
    if (keys["a"]||keys["arrowleft"]) dx--;
    if (keys["d"]||keys["arrowright"]) dx++;
    if (joystickVector.active){ dx += joystickVector.x; dy += joystickVector.y; }
    if (dx||dy){ const l=Math.hypot(dx,dy); player.x += dx/l*player.speed; player.y += dy/l*player.speed; }
    player.x = clamp(player.x, 25, canvas.width-25);
    player.y = clamp(player.y, Math.min(130, Math.max(60, canvas.height * 0.2)), GROUND()-14);
    if (mouse.down) attack();
    player.attackCooldown -= dt; player.invincible -= dt; player.dashCooldown -= dt;
    updateCraftedCombat(dt);
    if (!(weapon === 12 && mouse.down && channelActive)) player.mana = clamp(player.mana + dt*.015*classBonus.manaRegenMult, 0, player.maxMana);
    player.hp = Math.min(player.hp + dt/1000*(hasArtifact('solar_core')?3:1), player.maxHp);

    // --- Махорага
    if (!bossDefeated && boss){
        const a = angleTo(boss, player), dist = distance(boss, player);
        const desired = boss.phase>=3 ? 310 : boss.phase===2 ? 280 : 250;
        boss.aiTimer += dt;
        if (dist > desired+35){ boss.x += Math.cos(a)*(1.45+boss.phase*.18); boss.y += Math.sin(a)*(1.45+boss.phase*.18); }
        else if (dist < desired-35){ boss.x -= Math.cos(a)*(1.1+boss.phase*.12); boss.y -= Math.sin(a)*(1.1+boss.phase*.12); }
        else {
            const o = a + boss.strafeDir*Math.PI/2;
            boss.x += Math.cos(o)*(1+boss.phase*.18); boss.y += Math.sin(o)*(1+boss.phase*.18);
            if (Math.sin(boss.aiTimer*.002) > .98) boss.strafeDir *= -1;
        }
        boss.dashTimer -= dt;
        if (boss.phase >= 2 && boss.dashTimer <= 0){
            boss.x = clamp(player.x - Math.cos(a)*260, 100, canvas.width-100);
            boss.y = clamp(player.y - Math.sin(a)*260, 140, canvas.height/2);
            particle(boss.x, boss.y, "#ff8844", 30, 9, .5);
            boss.dashTimer = boss.phase===3 ? 3200 : 4800;
        }
        boss.x = clamp(boss.x, 100, canvas.width-100);
        boss.y = clamp(boss.y, 140, canvas.height/2);
        boss.attackCooldown -= dt;
        if (boss.attackCooldown <= 0) mahoragaAttack();
        boss.adaptWheelAngle += (boss.adaptWheelTarget - boss.adaptWheelAngle) * .08;
        boss.adaptWheelFlash = Math.max(0, (boss.adaptWheelFlash||0) - dt*.0018);
        if (player.invincible <= 0 && distance(boss, player) < boss.radius + player.radius){
            hurtPlayer(14 + boss.phase*5, "#ff6644", true);
        }
        document.getElementById("phase").textContent =
            `ФАЗА ${boss.phase} — АДАПТАЦИЯ: ${Math.min(100, Math.floor(adaptationGlobal/60*100))}%`;
        document.getElementById("bossHealth").style.width = `${Math.max(0, boss.hp/boss.maxHp*100)}%`;
        if (boss.hp <= 0){
            recordBossKill(0);
            bossDefeated = true; currentBiome = 'cosmic';
            showMessage("Boss defeated! Use the summon panel: Ethernaty is unlocked.");
            particle(boss.x, boss.y, "#ffd700", 90, 20, 1);
            pickups.push({ x: boss.x-150, y: boss.y-50, weaponIndex:5, color:"#00ffaa" });
            pickups.push({ x: boss.x+150, y: boss.y-50, weaponIndex:6, color:"#aa00ff" });
            pickups.push({ x: boss.x, y: boss.y-90, artifactId:'mahoraga_fang' });
            if (firstBossKill) player.maxHp += 200;
            player.hp = player.maxHp;
            ethernatyTimer = 0;
            document.getElementById("bossName").textContent = "SUMMON PANEL - ETHERNATY UNLOCKED";
            document.getElementById("bossName").className = "ethernaty";
        }
    }

    // --- ETHERNATY
    if (ethernaty1 && !firstEthernatyDefeated){
        const e = ethernaty1;
        e.coreAngle += dt*.005; e.ringAngle += dt*.008; e.auraPulse += dt*.003; e.aiTimer += dt;
        const d1 = distance(e, player), a1 = angleTo(e, player);
        const tR = 260 + Math.sin(e.aiTimer*.001)*45;
        e.x += Math.cos(a1+Math.PI/2)*.65 + Math.cos(a1)*((d1-tR)*.002);
        e.y += Math.sin(a1+Math.PI/2)*.65 + Math.sin(a1)*((d1-tR)*.002);
        e.x = clamp(e.x, 90, canvas.width-90); e.y = clamp(e.y, 130, canvas.height/2);
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) ethernaty1Attack();
        if (player.invincible <= 0 && distance(e, player) < e.radius + player.radius){
            hurtPlayer(23 + Math.floor((1-e.hp/e.maxHp)*14), "#ff66ff", true);
        }
        document.getElementById("phase").textContent = `✨ ETHERNATY — HP ${Math.max(0,Math.ceil(e.hp))}`;
        document.getElementById("bossHealth").style.width = `${Math.max(0, e.hp/e.maxHp*100)}%`;
        if (e.hp <= 0){
            recordBossKill(1);
            firstEthernatyDefeated = true;
            currentBiome = 'volcanic';
            enemyProjectiles = [];
            showMessage("Boss defeated! Use the summon panel: Fire Destroyer is unlocked.");
            particle(e.x, e.y, "#ffd700", 130, 25, 1.5); if (firstBossKill) player.maxHp += 200;
            player.hp = player.maxHp;
            pickups.push({ x: e.x-160, y: e.y-40, weaponIndex:7, color:"#ff44ff" });
            pickups.push({ x: e.x+160, y: e.y-40, weaponIndex:8, color:"#44ffcc" });
            pickups.push({ x: e.x, y: e.y-90, artifactId:'ethernaty_core' });
            dragonTimer = 0;
            document.getElementById("bossName").textContent = "SUMMON PANEL - FIRE DESTROYER UNLOCKED";
            document.getElementById("bossName").className = "fire";
            document.getElementById("message").className = "fire";
            document.getElementById("phase").className = "fire";
        }
    }

    // --- FIRE DESTROYER
    if (dragon && !dragonDefeated){
        updateDragon(dt);
        if (player.invincible <= 0){
            const dx = player.x-dragon.x, dy = player.y-dragon.y;
            const rx = 120+player.radius, ry = 74+player.radius;
            if ((dx*dx)/(rx*rx) + (dy*dy)/(ry*ry) < 1) hurtPlayer(43 + dragon.phase*13, "#ff8800", true);
        }
        document.getElementById("bossHealth").style.width = `${Math.max(0, dragon.hp/dragon.maxHp*100)}%`;
        if (dragon.hp <= 0){
            recordBossKill(2);
            dragonDefeated = true;
            enemyProjectiles = []; meteors = []; tornadoes = []; beams = []; shockwaves = []; minions = []; geysers = [];
            showMessage("Boss defeated! Use the summon panel: Solar Devourer is unlocked.");
            for (let i=0;i<10;i++) setTimeoutSafe(() => fireBurst(dragon.x+random(-150,150), dragon.y+random(-90,90), 50, 14, 2), i*120);
            fireBurst(dragon.x, dragon.y, 220, 22, 2.6);
            pickups.push({ x: dragon.x-180, y: dragon.y+40, weaponIndex:9, color:"#ff7733" });
            pickups.push({ x: dragon.x+180, y: dragon.y+40, weaponIndex:10, color:"#ffaa22" });
            grantArtifact('dragon_heart', dragon.x, dragon.y+70);
            if (firstBossKill) player.maxHp += 250;
            player.hp = player.maxHp;
            solarDevourerTimer = 0;
            document.getElementById("bossName").textContent = "SUMMON PANEL - SOLAR DEVOURER UNLOCKED";
            document.getElementById("bossName").className = "solar";
            document.getElementById("message").className = "solar";
            document.getElementById("phase").className = "solar";
        }
    }

    // --- SOLAR DEVOURER
    if (solarDevourer && !solarDevourerDefeated){
        updateSolarDevourer(dt);
        document.getElementById("bossHealth").style.width = `${Math.max(0, solarDevourer.hp/solarDevourer.maxHp*100)}%`;
        if (solarDevourer.hp <= 0){
            recordBossKill(3);
            solarDevourerDefeated = true;
            enemyProjectiles = []; meteors = []; tornadoes = []; beams = []; shockwaves = []; minions = []; geysers = []; solarMines = [];
            solarDevourer.miniWorms = [];
            showMessage("Boss defeated! Use the summon panel: The Two-Faced Demon is unlocked.");
            for (let i=0;i<12;i++) setTimeoutSafe(() => fireBurst(solarDevourer.head.x+random(-220,220), solarDevourer.head.y+random(-130,130), 55, 16, 2.4), i*100);
            fireBurst(solarDevourer.head.x, solarDevourer.head.y, 260, 24, 3);
            pickups.push({ x: solarDevourer.head.x, y: solarDevourer.head.y+60, artifactId:'solar_core' });
            if (firstBossKill) player.maxHp += 300;
            player.hp = player.maxHp;
            twoFacedDemonTimer = 0;
            document.getElementById("bossName").textContent = "SUMMON PANEL - THE TWO-FACED DEMON UNLOCKED";
            document.getElementById("bossName").className = "demon";
            document.getElementById("message").className = "demon";
            document.getElementById("phase").className = "demon";
        }
    }

    // --- THE TWO-FACED DEMON
    if (twoFacedDemon && !twoFacedDemonDefeated){
        updateTwoFacedDemon(dt);
        document.getElementById("bossHealth").style.width = `${Math.max(0, twoFacedDemon.hp/twoFacedDemon.maxHp*100)}%`;
        if (twoFacedDemon.hp <= 0){
            twoFacedDemonDefeated = true;
            if (!killedBosses.has(4)){ victory = true; saveRecord(); }
            grantArtifact('demon_core', twoFacedDemon.x, twoFacedDemon.y);
            pickups.push({ x: twoFacedDemon.x - 140, y: twoFacedDemon.y + 30, artifactId: 'demon_talisman' });
            pickups.push({ x: twoFacedDemon.x + 140, y: twoFacedDemon.y + 30, artifactId: 'demon_horn_charm' });
            pickups.push({ x: twoFacedDemon.x, y: twoFacedDemon.y + 50, weaponIndex: 14, color: '#cc44ff' });
            recordBossKill(4);
            workshopUnlocked = true;
            player.x = canvas.width/2; player.y = canvas.height * .65;
            player.hp = player.maxHp; player.mana = player.maxMana;
            currentBiome = 'forest';
            document.getElementById('bossName').textContent = 'CRAFTING SANCTUARY';
            document.getElementById('phase').textContent = 'E near a station - Summon bosses to farm materials';
            refreshWorkshopButtons();
            showMessage('Sanctuary unlocked: accessory station, weapon station and summon panel!');
            return;
        }
    }

    updateHazards(dt);

    // --- пикапы
    for (let i=pickups.length-1;i>=0;i--){
        const pk = pickups[i];
        if (distance(player, pk) < player.radius+22){
            if (pk.artifactId){
                grantArtifact(pk.artifactId, pk.x, pk.y);
            } else if (!inventory.includes(pk.weaponIndex)){
                inventory.push(pk.weaponIndex); updateWeaponUI();
                showMessage(`✅ Подобрано: ${weapons[pk.weaponIndex].name}`);
                particle(pk.x, pk.y, "#ffdd44", 26, 10, .8);
            }
            pickups.splice(i,1);
        }
    }

    // --- снаряды игрока
    for (let i=projectiles.length-1;i>=0;i--){
        const p = projectiles[i];
        if (p.homing){
            let tgt = null;
            if (twoFacedDemon && !twoFacedDemonDefeated) tgt = twoFacedDemon;
            else if (solarDevourer && !solarDevourerDefeated) tgt = solarDevourer;
            else if (dragon && !dragonDefeated) tgt = dragon;
            else if (ethernaty1 && !firstEthernatyDefeated) tgt = ethernaty1;
            else if (boss && !bossDefeated) tgt = boss;
            if (tgt){
                const ha = Math.atan2(tgt.y-p.y, tgt.x-p.x), hs = Math.hypot(p.vx,p.vy), ca = Math.atan2(p.vy,p.vx);
                const da = Math.atan2(Math.sin(ha-ca), Math.cos(ha-ca));
                const na = ca + clamp(da, -p.homing, p.homing);
                p.vx = Math.cos(na)*hs; p.vy = Math.sin(na)*hs;
            }
        }
        p.x += p.vx; p.y += p.vy; p.life -= dt;
        p.trail.push({x:p.x,y:p.y}); if (p.trail.length > 8) p.trail.shift();
        if (hitBoss(p) || p.life <= 0 || p.x < -100 || p.x > canvas.width+100 || p.y < -100 || p.y > canvas.height+100)
            projectiles.splice(i,1);
    }
    // --- снаряды врага
    for (let i=enemyProjectiles.length-1;i>=0;i--){
        const p = enemyProjectiles[i];
        if (p.homing && player){
            const ha = Math.atan2(player.y-p.y, player.x-p.x), hs = Math.hypot(p.vx,p.vy), ca = Math.atan2(p.vy,p.vx);
            const da = Math.atan2(Math.sin(ha-ca), Math.cos(ha-ca));
            const na = ca + clamp(da, -p.homing, p.homing);
            p.vx = Math.cos(na)*hs; p.vy = Math.sin(na)*hs;
        }
        p.x += p.vx; p.y += p.vy; p.life -= dt;
        if (p.trail){ p.trail.push({x:p.x,y:p.y}); if (p.trail.length > 6) p.trail.shift(); }
        if (p.flame && Math.random() < .5) particles.push({ x:p.x, y:p.y, vx:random(-.5,.5), vy:random(-1.2,-.2),
            life:1, maxLife:.5, size:random(2,6), color:["#ffdd66","#ff8800"][Math.random()<.5?0:1], gravity:-.02 });
        const dead = hitPlayerProjectile(p);
        if (dead || p.life <= 0 || p.x < -150 || p.x > canvas.width+150 || p.y < -150 || p.y > canvas.height+150){
            if (!dead && p.explosive && p.life <= 0) explode(p.x, p.y, 90, p.damage*.4, 1.2);
            enemyProjectiles.splice(i,1);
        }
    }
    // --- частицы
    for (let i=particles.length-1;i>=0;i--){
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= .96; p.vy = p.vy*.96 + (p.gravity||0);
        p.life -= dt/(p.maxLife||1)*.03;
        if (p.life <= 0) particles.splice(i,1);
    }
    for (let i=damageNumbers.length-1;i>=0;i--){
        const d = damageNumbers[i];
        d.y -= d.big ? 1.2 : .6; d.life -= .025;
        if (d.life <= 0) damageNumbers.splice(i,1);
    }

    document.getElementById("damageCounter").textContent = `💥 Урон: ${totalDamage}`;
    document.getElementById("playerHealth").style.width = `${player.hp/player.maxHp*100}%`;
    document.getElementById("playerMana").style.width = `${player.mana/player.maxMana*100}%`;
    document.getElementById("hpText").textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    document.getElementById("manaText").textContent = `${Math.ceil(player.mana)} / ${player.maxMana}`;
    updateWeaponAdaptUI();
}

// ================================================================
//  ФОН
// ================================================================
function drawBackground(){
    let top, mid, bot;
    if (biomeBlend < 1){
        const t = biomeBlend;
        top = `rgb(${5+t*10|0},${3+t*2|0},${18+t*20|0})`;
        mid = `rgb(${10+t*20|0},${5+t*5|0},${24+t*30|0})`;
        bot = `rgb(${10+t*5|0},${5+t*2|0},${16+t*20|0})`;
    } else {
        const t = biomeBlend-1;
        top = `rgb(${15+t*30|0},${5+t*3|0},${38-t*28|0})`;
        mid = `rgb(${30+t*12|0},${10+t*5|0},${54-t*44|0})`;
        bot = `rgb(${15+t*15|0},${7+t*8|0},${36-t*30|0})`;
    }
    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0, top); g.addColorStop(.42, mid); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);

    // звёзды
    if (biomeBlend < 1.6){
        ctx.save(); ctx.globalAlpha = clamp(1.6-biomeBlend, 0, 1);
        for (let i=0;i<90;i++){
            const x = (i*137+42) % canvas.width;
            const y = (i*73+13) % (canvas.height*.7);
            const a = .3 + .7*Math.sin(i*1.7 + worldTime*.0005);
            ctx.fillStyle = `rgba(255,255,255,${a*.55})`;
            ctx.fillRect(x, y, 1+(i%3), 1+(i%3));
        }
        ctx.restore();
    }

    // лес
    if (biomeBlend < 1){
        ctx.save(); ctx.globalAlpha = (1-biomeBlend)*.5; ctx.fillStyle = "#0a0812";
        for (let i=0;i<12;i++){
            const bx = (i*150 + worldTime*.0025) % (canvas.width+300) - 150, by = canvas.height-60;
            ctx.fillRect(bx, by-180, 20, 180);
            ctx.beginPath(); ctx.arc(bx+10, by-200, 50, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(bx-20, by-180, 35, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.arc(bx+40, by-180, 35, 0, 7); ctx.fill();
        }
        ctx.restore();
    }
    // космос
    if (biomeBlend >= .5 && biomeBlend < 1.5){
        const alpha = biomeBlend >= 1 ? 1-(biomeBlend-1) : biomeBlend;
        ctx.save(); ctx.globalAlpha = alpha;
        const px = canvas.width*.75, py = 150;
        const pg = ctx.createRadialGradient(px,py,10,px,py,100);
        pg.addColorStop(0,"#8844ff"); pg.addColorStop(.5,"#4400aa"); pg.addColorStop(1,"#100025");
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px,py,100,0,7); ctx.fill();
        ctx.strokeStyle = "rgba(200,150,255,.4)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(px,py,140,30,.3,0,7); ctx.stroke();
        ctx.restore();
    }
    // ВУЛКАН
    if (biomeBlend >= .9){
        const alpha = clamp((biomeBlend-.9)/.9, 0, 1);
        ctx.save(); ctx.globalAlpha = alpha;

        // тёмно-красные облака
        for (let layer=0; layer<3; layer++){
            const yBase = 40 + layer*70, speed = .004 + layer*.003, alp = .22 - layer*.05;
            ctx.fillStyle = `rgba(${120-layer*20},${20-layer*4},${14},${alp*.4})`;
            for (let i=0;i<7;i++){
                const cx = ((i*260 + worldTime*speed*10) % (canvas.width+400)) - 200;
                ctx.beginPath();
                ctx.ellipse(cx, yBase + Math.sin(i+layer)*18, 170, 44, 0, 0, 7);
                ctx.fill();
            }
        }
        // горящие горы (2 слоя)
        for (let layer=0; layer<2; layer++){
            const base = canvas.height - 130 + layer*40;
            const h = 230 - layer*70;
            ctx.fillStyle = layer === 0 ? "#180505" : "#2a0a06";
            ctx.beginPath(); ctx.moveTo(-50, base+120);
            const step = 170 + layer*40;
            for (let x=-50; x < canvas.width+200; x += step){
                const peak = base - h*(.55 + .45*Math.abs(Math.sin(x*.013+layer)));
                ctx.lineTo(x + step/2, peak);
                ctx.lineTo(x + step, base + 40);
            }
            ctx.lineTo(canvas.width+200, base+140); ctx.closePath(); ctx.fill();
            // кратерное свечение
            if (layer === 1){
                for (let x=-50; x < canvas.width+200; x += step){
                    const peak = base - h*(.55 + .45*Math.abs(Math.sin(x*.013+layer)));
                    const gg = ctx.createRadialGradient(x+step/2, peak, 2, x+step/2, peak, 70);
                    gg.addColorStop(0, `rgba(255,140,40,${.18})`);
                    gg.addColorStop(1, "rgba(255,60,0,0)");
                    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x+step/2, peak, 70, 0, 7); ctx.fill();
                }
            }
        }
        // парящие скалы
        for (let i=0;i<6;i++){
            const rx = ((i*230 + worldTime*.012) % (canvas.width+260)) - 130;
            const ry = 180 + Math.sin(worldTime*.0012 + i*1.7)*26 + (i%3)*70;
            const rw = 40 + (i%4)*16;
            ctx.fillStyle = "#1c0d0a";
            ctx.beginPath();
            ctx.moveTo(rx-rw, ry); ctx.lineTo(rx-rw*.5, ry-18); ctx.lineTo(rx+rw*.6, ry-13);
            ctx.lineTo(rx+rw, ry+6); ctx.lineTo(rx+rw*.2, ry+22); ctx.lineTo(rx-rw*.7, ry+15);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = "rgba(255,90,20,.5)";
            ctx.fillRect(rx-rw*.5, ry-3, rw*1.0, 3);
        }
        ctx.restore();
    }

    // фоновые частицы
    for (const [index,p] of bgParticles.entries()){
        if (visualMode === 'minimal' || index % 3 !== 0) continue;
        let show = false, color = "#fff";
        if (p.type==='ash' && biomeBlend < 1){ show = true; color = `rgba(180,160,140,${p.alpha*.35})`; }
        else if (p.type==='stardust' && biomeBlend >= .5 && biomeBlend < 1.5){ show = true; color = `hsla(${p.hue},80%,70%,${p.alpha*.35})`; }
        else if (p.type==='ember' && biomeBlend >= .9){ show = true; color = `hsla(${p.hue},100%,${55+Math.sin(worldTime*.005+p.x)*10}%,${p.alpha*.35})`; }
        if (show){
            ctx.fillStyle = color; ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = color;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.min(1.5,p.size), 0, 7); ctx.fill();
        }
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // ЗЕМЛЯ / ЛАВА
    if (biomeBlend >= .9){
        const gy = GROUND();
        // лава под ареной
        const lg = ctx.createLinearGradient(0, gy, 0, canvas.height);
        lg.addColorStop(0, "#8a4e2c"); lg.addColorStop(.4, "#633322"); lg.addColorStop(1, "#301c1b");
        ctx.fillStyle = lg; ctx.fillRect(0, gy, canvas.width, canvas.height-gy);
        // рябь лавы
        ctx.strokeStyle = "rgba(255,230,140,.5)"; ctx.lineWidth = 2;
        for (let k=0;k<3;k++){
            ctx.beginPath();
            for (let x=0; x<=canvas.width; x+=18)
                ctx.lineTo(x, gy + 14 + k*16 + Math.sin(x*.03 + worldTime*.003 + k)*4);
            ctx.stroke();
        }
        // платформа
        ctx.fillStyle = "#1a0b08"; ctx.fillRect(0, gy-16, canvas.width, 18);
        ctx.fillStyle = "#3a1710"; ctx.fillRect(0, gy-16, canvas.width, 5);
        for (let x=0; x<canvas.width; x+=34){
            ctx.fillStyle = (x/34)%2 ? "#241009" : "#2c1410";
            ctx.fillRect(x, gy-11, 32, 12);
        }
        ctx.fillStyle = `rgba(255,120,30,${.35+.15*Math.sin(worldTime*.004)})`;
        ctx.fillRect(0, gy-18, canvas.width, 3);
        // парящие платформы
        for (let x=90; x<canvas.width-90; x+=250){
            ctx.fillStyle = "#1c0d0a"; ctx.fillRect(x, canvas.height-230, 130, 16);
            ctx.fillStyle = "#5a2410"; ctx.fillRect(x, canvas.height-230, 130, 4);
        }
    } else {
        ctx.fillStyle = biomeBlend < 1 ? "#17140e" : "#1a1028";
        ctx.fillRect(0, canvas.height-60, canvas.width, 60);
        ctx.fillStyle = biomeBlend < 1 ? "#44361e" : "#3a2050";
        ctx.fillRect(0, canvas.height-60, canvas.width, 5);
    }
}

// ================================================================
//  РИСОВАНИЕ: ИГРОК
// ================================================================
function drawPlayer(){
    if (!currentClass || !player) return;
    ctx.save(); ctx.translate(player.x, player.y);
    ctx.rotate(angleTo(player, mouse));
    if (player.invincible > 0){
        ctx.strokeStyle = '#91c7d3'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0,0,27,0,Math.PI*2); ctx.stroke();
    }
    let cloak = "#1c2944";
    if (currentClass==='warrior') cloak = "#4a1a1a";
    else if (currentClass==='mage') cloak = "#2a1a4a";
    else if (currentClass==='ranger') cloak = "#1a3a4a";
    else if (currentClass==='summoner') cloak = "#3a2a1a";
    ctx.fillStyle = cloak;
    ctx.beginPath(); ctx.moveTo(-15,-18); ctx.lineTo(-28,25); ctx.lineTo(5,20); ctx.lineTo(18,-10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3c78c7"; ctx.fillRect(-13,-13,26,28);
    ctx.fillStyle = "#e7b58c"; ctx.beginPath(); ctx.arc(12,0,11,0,7); ctx.fill();
    drawWeaponInHand(weapon);
    ctx.restore();
}

// ================================================================
//  РИСОВАНИЕ: СТАРЫЕ БОССЫ
// ================================================================
function drawMahoraga(){
    BossArt.guardian(boss);
}

function drawEthernaty(e){
    BossArt.cosmic(e);
}

function drawDragon(){
    BossArt.dragon(dragon);
}

function segTangentAngle(w, i){
    const idx = i*w.ptsPerSeg;
    const aheadIdx = Math.max(0, idx-4);
    const behindIdx = Math.min(w.history.length-1, idx+4);
    const ahead = w.history[aheadIdx], behind = w.history[behindIdx];
    return Math.atan2(ahead.y-behind.y, ahead.x-behind.x);
}
function drawSolarDevourer(){
    BossArt.worm(solarDevourer);
}

function drawMinions(){
    for (const mn of minions){
        ctx.save(); ctx.translate(mn.x, mn.y); ctx.scale(mn.facing, 1);
        const f = Math.sin(mn.flap)*.6;
        ctx.fillStyle = "#8a1c06";
        ctx.save(); ctx.rotate(-.4+f); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-36,-24); ctx.lineTo(-30,10); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.save(); ctx.rotate(.4-f); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-34,22); ctx.lineTo(-28,-6); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#cc3a0d"; ctx.beginPath(); ctx.ellipse(0,0,20,12,0,0,7); ctx.fill();
        ctx.fillStyle = "#5b1a7a"; ctx.fillRect(-4,-9,10,18);
        ctx.fillStyle = "#e2510f"; ctx.beginPath(); ctx.ellipse(18,-4,11,8,0,0,7); ctx.fill();
        ctx.fillStyle = "#efd276"; ctx.beginPath(); ctx.moveTo(12,-10); ctx.lineTo(4,-24); ctx.lineTo(18,-11); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor="#ffdd44"; ctx.fillStyle="#ffee88";
        ctx.beginPath(); ctx.arc(21,-5,3,0,7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle="#8a1c06"; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-18,2); ctx.lineTo(-40,10); ctx.stroke();
        ctx.restore();
        // хп-бар
        ctx.fillStyle="rgba(0,0,0,.6)"; ctx.fillRect(mn.x-22, mn.y-32, 44, 5);
        ctx.fillStyle="#ff7722"; ctx.fillRect(mn.x-22, mn.y-32, 44*clamp(mn.hp/mn.maxHp,0,1), 5);
    }
}

function drawTwoFacedDemon(){
    BossArt.demon(twoFacedDemon);
}

function drawHazards(){
    // гейзеры
    for (const g of geysers){
        if (g.warn > 0){
            ctx.save();
            ctx.globalAlpha = .65;
            ctx.fillStyle = "#ff5500";
            ctx.fillRect(g.x-30, GROUND()-14, 60, 8);
            ctx.restore();
        } else {
            const gg = ctx.createLinearGradient(0, GROUND(), 0, GROUND()-340);
            gg.addColorStop(0, "rgba(255,240,150,.9)");
            gg.addColorStop(.5, "rgba(255,140,20,.6)");
            gg.addColorStop(1, "rgba(255,60,0,0)");
            ctx.fillStyle = gg; ctx.fillRect(g.x-26, GROUND()-340, 52, 340);
        }
    }
    // смерчи
    for (const t of tornadoes){
        ctx.save(); ctx.translate(t.x, t.y);
        for (let i=0;i<10;i++){
            const yy = -95 + i*20, rr = t.r*(.35 + i*.075);
            ctx.strokeStyle = `hsla(${20+i*3},100%,${55+i*2}%,${.55 - i*.03})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.ellipse(Math.sin(t.angle+i*.6)*7, yy, rr, 9, 0, 0, 7);
            ctx.stroke();
        }
        ctx.restore();
    }
    // метеоры
    for (const m of meteors){
        if (m.delay > 0) continue;
        ctx.save();
        // маркер падения
        ctx.globalAlpha = .55;
        ctx.fillStyle = "#ff4400";
        ctx.beginPath(); ctx.ellipse(m.x, m.targetY, 30, 8, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        const gg = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, m.r*2.4);
        gg.addColorStop(0, "#fff6c0"); gg.addColorStop(.35, "#ffa322"); gg.addColorStop(1, "rgba(255,40,0,0)");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(m.x, m.y, m.r*2.4, 0, 7); ctx.fill();
        ctx.fillStyle = "#3a1408"; ctx.beginPath(); ctx.arc(m.x, m.y, m.r*.72, 0, 7); ctx.fill();
        ctx.restore();
    }
    // ударные волны
    for (const s of shockwaves){
        ctx.save();
        ctx.strokeStyle = `rgba(255,${140+Math.sin(worldTime*.02)*40|0},40,${clamp(1-s.r/s.max,0,1)*.85})`;
        ctx.lineWidth = s.band*.8; ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = "#ff6600";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.stroke();
        ctx.strokeStyle = `rgba(255,240,180,${clamp(1-s.r/s.max,0,1)*.7})`;
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.stroke();
        ctx.restore();
    }
    // лучи
    for (const b of beams){
        const ex = b.x + Math.cos(b.angle)*b.len, ey = b.y + Math.sin(b.angle)*b.len;
        ctx.save();
        const isDemon = b.demonFace || b.demonNet;
        if (b.charge > 0){
            ctx.strokeStyle = isDemon ? `rgba(200,80,255,${.65})` : `rgba(255,200,60,${.65})`;
            ctx.lineWidth = 2; ctx.setLineDash([12,10]);
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = isDemon ? "#ffccff" : "#fff0a0"; ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor= isDemon ? "#cc44ff" : "#ffcc33";
            ctx.beginPath(); ctx.arc(b.x, b.y, 8*(1-b.charge/700)+4, 0, 7); ctx.fill();
        } else if (isDemon){
            ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = "#ff2255";
            ctx.strokeStyle = "rgba(30,0,10,.85)"; ctx.lineWidth = 20;
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
            ctx.strokeStyle = "rgba(255,20,60,.8)"; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
            ctx.strokeStyle = "#ffd0e0"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
        } else {
            ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = "#ff8800";
            ctx.strokeStyle = "rgba(255,90,0,.75)"; ctx.lineWidth = 34;
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
            ctx.strokeStyle = "rgba(255,190,60,.9)"; ctx.lineWidth = 18;
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
            ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(ex,ey); ctx.stroke();
        }
        ctx.restore();
    }
    // молнии Двуликого Демона
    for (const l of demonLightnings){
        ctx.save();
        if (l.warn > 0){
            ctx.globalAlpha = .65;
            ctx.strokeStyle = "#cc66ff"; ctx.lineWidth = 3; ctx.setLineDash([10,8]);
            ctx.beginPath(); ctx.moveTo(l.x, 100); ctx.lineTo(l.x, GROUND()); ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            ctx.fillStyle = "rgba(180,80,255,.3)";
            ctx.beginPath(); ctx.ellipse(l.x, GROUND()-4, 34, 10, 0, 0, 7); ctx.fill();
        } else {
            ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = "#aa44ff";
            ctx.strokeStyle = "rgba(160,60,255,.85)"; ctx.lineWidth = 22;
            ctx.beginPath(); ctx.moveTo(l.x+Math.sin(worldTime*.004)*3, 100); ctx.lineTo(l.x, GROUND()); ctx.stroke();
            ctx.strokeStyle = "#f0e0ff"; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(l.x, 100); ctx.lineTo(l.x, GROUND()); ctx.stroke();
        }
        ctx.restore();
    }
    // солнечные мины
    for (const mn of solarMines){
        ctx.save();
        const armed = mn.armDelay <= 0;
        const pulse = .8 + Math.sin(mn.pulse)*.25;
        ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = armed ? "#ff3300" : "#ffcc33";
        const mg = ctx.createRadialGradient(mn.x, mn.y, 1, mn.x, mn.y, mn.r*pulse);
        mg.addColorStop(0, "#fff6c0");
        mg.addColorStop(.5, armed ? "#ff6600" : "#ffaa22");
        mg.addColorStop(1, "rgba(255,60,0,0)");
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(mn.x, mn.y, mn.r*pulse, 0, 7); ctx.fill();
        ctx.fillStyle = armed ? "#ffdd88" : "#fff3c4";
        ctx.beginPath(); ctx.arc(mn.x, mn.y, mn.r*.35, 0, 7); ctx.fill();
        ctx.restore();
    }
    // тень пикирования
    if (dragon && dragon.state === 'dive' && dragon.diveStage === 1){
        ctx.save();
        ctx.globalAlpha = .6;
        ctx.fillStyle = "#ff3300";
        ctx.beginPath(); ctx.ellipse(dragon.x, GROUND()-10, 120, 22, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ffcc55"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(dragon.x, GROUND()-10, 120, 22, 0, 0, 7); ctx.stroke();
        ctx.restore();
    }
}

function drawPickups(){
    for (const p of pickups){
        ctx.save();
        if (p.artifactId){
            const a = ARTIFACTS[p.artifactId];
            const bob = Math.sin(worldTime*.004 + p.x)*6;
            ctx.translate(p.x, p.y + bob);
            ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = a.color; ctx.fillStyle = a.color;
            ctx.globalAlpha = .5 + .35*Math.sin(worldTime*.006);
            ctx.rotate(Math.PI/4);
            ctx.beginPath(); ctx.rect(-15,-15,30,30); ctx.fill();
            ctx.rotate(-Math.PI/4);
            ctx.globalAlpha = 1; ctx.font = "22px Arial"; ctx.textAlign = "center";
            ctx.fillText(a.icon, 0, 8);
        } else {
            ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
            ctx.globalAlpha = .6 + .3*Math.sin(worldTime*.005);
            ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, 7); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.font = "20px Arial"; ctx.textAlign = "center";
            ctx.fillText("⚔️", p.x, p.y+8);
        }
        ctx.restore();
    }
}
function drawProjectiles(){
    for (const p of projectiles){
        ctx.save();
        if (p.trail.length){
            ctx.globalAlpha = .28; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2, p.radius*.55);
            ctx.beginPath(); p.trail.forEach((t,i) => i?ctx.lineTo(t.x,t.y):ctx.moveTo(t.x,t.y)); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx));
        ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = p.color; ctx.fillStyle = p.color;
        if (p.star){
            ctx.beginPath();
            for (let i=0;i<10;i++){ const r = i%2 ? p.radius*.45 : p.radius, q = i*Math.PI/5; ctx.lineTo(Math.cos(q)*r, Math.sin(q)*r); }
            ctx.closePath(); ctx.fill();
        } else if (p.laser){
            ctx.fillRect(-p.radius*2, -2, p.radius*4, 4);
            ctx.fillStyle = "#fff"; ctx.fillRect(-p.radius, -1, p.radius*2, 2);
        } else {
            ctx.beginPath(); ctx.arc(0,0,p.radius,0,7); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.globalAlpha = .8;
            ctx.beginPath(); ctx.arc(-p.radius*.3, -p.radius*.3, p.radius*.28, 0, 7); ctx.fill();
        }
        ctx.restore();
    }
    for (const p of enemyProjectiles){
        ctx.save();
        if (p.trail && p.trail.length){
            ctx.globalAlpha = .3; ctx.strokeStyle = p.color; ctx.lineWidth = p.radius*.8;
            ctx.beginPath(); p.trail.forEach((t,i) => i?ctx.lineTo(t.x,t.y):ctx.moveTo(t.x,t.y)); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx));
        ctx.shadowBlur = visualMode === "minimal" ? 0 : 4;
        if (p.flame){
            const fg = ctx.createRadialGradient(0,0,1,0,0,p.radius*1.3);
            fg.addColorStop(0,"#fff6c0"); fg.addColorStop(.35,"#ffb02e"); fg.addColorStop(1,"rgba(255,40,0,0)");
            ctx.shadowColor = "#ff7700"; ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(0,0,p.radius*1.3,0,7); ctx.fill();
            ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(0,0,p.radius*.45,0,7); ctx.fill();
        } else if (p.slash){
            const L = p.radius*6.5;
            const tg2 = ctx.createLinearGradient(-L*2.2,0,0,0);
            tg2.addColorStop(0,"rgba(255,20,60,0)"); tg2.addColorStop(1,"rgba(255,20,60,.5)");
            ctx.fillStyle = tg2;
            ctx.beginPath(); ctx.moveTo(-L*2.2,0); ctx.lineTo(-L*.3,-p.radius*.9); ctx.lineTo(-L*.3,p.radius*.9); ctx.closePath(); ctx.fill();
            ctx.shadowColor = "#ff1a3d"; ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.fillStyle = "#ff2244";
            ctx.beginPath(); ctx.moveTo(-L*.55,0); ctx.quadraticCurveTo(L*.05,-p.radius*2.1,L*.65,0); ctx.quadraticCurveTo(L*.05,-p.radius*.5,-L*.55,0); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = "#0a0004";
            ctx.beginPath(); ctx.moveTo(-L*.45,0); ctx.quadraticCurveTo(L*.05,-p.radius*1.4,L*.55,0); ctx.quadraticCurveTo(L*.05,-p.radius*.55,-L*.45,0); ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.globalAlpha = .85;
            ctx.beginPath(); ctx.moveTo(-L*.55,0); ctx.quadraticCurveTo(L*.05,-p.radius*2.1,L*.65,0); ctx.stroke();
            ctx.globalAlpha = 1;
        } else if (p.demonSpear){
            ctx.shadowColor = "#cc66ff"; ctx.fillStyle = "#e0b0ff";
            ctx.beginPath();
            ctx.moveTo(p.radius*2.4,0); ctx.lineTo(p.radius*.4,-p.radius*.7); ctx.lineTo(-p.radius*2,-p.radius*.25);
            ctx.lineTo(-p.radius*1.4,0); ctx.lineTo(-p.radius*2,p.radius*.25); ctx.lineTo(p.radius*.4,p.radius*.7);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.stroke();
        } else {
            ctx.fillStyle = p.rainbow ? `hsl(${(worldTime*.05+p.x*.01)%360},90%,60%)` : p.color;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath(); ctx.moveTo(p.radius*1.7,0); ctx.lineTo(0,p.radius*.75); ctx.lineTo(-p.radius,0); ctx.lineTo(0,-p.radius*.75); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
}
function drawParticles(){
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    const maxDraw = (visualMode === 'minimal' || isMobileDevice) ? 45 : 180;
    const startIdx = Math.max(0, particles.length - maxDraw);
    for (let i = startIdx; i < particles.length; i++){
        const p = particles[i];
        ctx.globalAlpha = clamp(p.life,0,1) * .5;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.5, Math.min(3, p.size*p.life)), 0, 7); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}
function drawDamageNumbers(){
    ctx.textAlign = "center";
    for (const d of damageNumbers){
        ctx.globalAlpha = d.life * .85; ctx.fillStyle = d.color;
        ctx.font = d.big ? "bold 18px Arial" : "14px Arial";
        ctx.shadowBlur = visualMode === "minimal" ? 0 : 4; ctx.shadowColor = d.color;
        ctx.fillText("-"+d.value, d.x, d.y);
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}
function drawLighting(){
    // Static, low-contrast edge shading. No additive light or full-screen flashes.
    const v = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*.4,canvas.width/2,canvas.height/2,canvas.height);
    v.addColorStop(0,'rgba(4,7,13,0)'); v.addColorStop(1,'rgba(4,7,13,.16)');
    ctx.save(); ctx.fillStyle=v; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
}

let messageTimeout;
function showMessage(text){
    const el = document.getElementById("message");
    el.textContent = text; el.style.opacity = 1;
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => el.style.opacity = 0, 3000);
}

// ================================================================
//  ЦИКЛ
// ================================================================

// Difficulty and run controls. Storage is optional (private browsing/file URLs).
let visualMode = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || isMobileDevice ? 'minimal' : 'calm';
try { const saved = localStorage.getItem('boss-rush-visuals'); if (saved === 'calm' || saved === 'minimal') visualMode = saved; } catch {}
function setVisualMode(value){
    visualMode = value === 'minimal' ? 'minimal' : 'calm';
    document.getElementById('visualMode').value = visualMode;
    try { localStorage.setItem('boss-rush-visuals',visualMode); } catch {}
}
document.getElementById('visualMode').addEventListener('change',e=>setVisualMode(e.target.value));
setVisualMode(visualMode);
const DIFFICULTIES = {
    easy: { label:'Легка', hp:.7, damage:.6, heal:.4, healWait:16000 },
    normal: { label:'Звичайна', hp:1, damage:1, heal:.3, healWait:22000 },
    hard: { label:'Важка', hp:1.4, damage:1.45, heal:.2, healWait:30000 }
};
let activeDifficulty = 'normal', paused = false, journalOpen = false;
let runElapsed = 0, healCooldown = 0;
function scaleBoss(entity){
    entity.hp = Math.round(entity.hp * DIFFICULTIES[activeDifficulty].hp);
    entity.maxHp = entity.hp; return entity;
}
function clearInput(){
    keys = {}; mouse.down = false;
    joystickVector.x = 0; joystickVector.y = 0; joystickVector.active = false;
    const stick = document.getElementById('joystickStick');
    if (stick) stick.style.transform = 'translate(0px, 0px)';
}
function togglePause(){
    if (!currentClass || gameOver || workshopMenuOpen || artifactMenuOpen || journalOpen) return;
    paused = !paused; clearInput();
    document.getElementById('pauseScreen').style.display = paused ? 'flex' : 'none';
}
function pauseOnBlur(){
    clearInput();
    if (currentClass && !gameOver && !paused && !artifactMenuOpen && !journalOpen) togglePause();
}
function toggleJournal(){
    if (!currentClass || gameOver || workshopMenuOpen || artifactMenuOpen || paused) return;
    journalOpen = !journalOpen; clearInput();
    document.getElementById('journalScreen').style.display = journalOpen ? 'flex' : 'none';
}
function healPlayer(){
    if (!player || gameOver || paused || journalOpen || workshopMenuOpen || artifactMenuOpen || healCooldown > 0 || player.hp >= player.maxHp) return;
    const config = DIFFICULTIES[activeDifficulty];
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp*config.heal);
    healCooldown = config.healWait;
    particle(player.x,player.y,'#73ffc0',30,5);
    showMessage('✚ Здоров’я відновлено'); updateRunHUD();
}
function formatTime(ms){ const seconds = Math.floor(ms/1000); return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`; }
function readRecords(){ try { const value=JSON.parse(localStorage.getItem('boss-rush-records') || '{}'); return value && typeof value==='object' ? value : {}; } catch { return {}; } }
function saveRecord(){
    const records = readRecords(); const best = records[activeDifficulty];
    if (!Number.isFinite(best) || runElapsed < best) { records[activeDifficulty] = runElapsed; try { localStorage.setItem('boss-rush-records',JSON.stringify(records)); } catch {} }
}
function refreshDifficulty(){
    const choice = document.getElementById('difficulty').value;
    const d = DIFFICULTIES[choice];
    document.getElementById('difficultyInfo').textContent = `Здоров’я босів ×${d.hp} · Вхідна шкода ×${d.damage} · Лікування ${Math.round(d.heal*100)}%`;
    const best = readRecords()[choice];
    document.getElementById('bestRun').textContent = Number.isFinite(best) && best > 0 ? `Найкраща перемога: ${formatTime(best)}` : 'Рекорд: здолай усіх п’ятьох босів';
}
function updateRunHUD(){
    document.getElementById('runStatus').textContent = `${DIFFICULTIES[activeDifficulty].label} · ${formatTime(runElapsed)}`;
    const button = document.getElementById('healButton');
    button.disabled = healCooldown > 0 || player.hp >= player.maxHp;
    button.textContent = healCooldown > 0 ? `H · ${Math.ceil(healCooldown/1000)} с` : 'H · Лікування';

    const mobileDash = document.getElementById('btnMobileDash');
    if (mobileDash && player){
        mobileDash.classList.toggle('cooldown', player.dashCooldown > 0);
    }
    const mobileHeal = document.getElementById('btnMobileHeal');
    if (mobileHeal){
        mobileHeal.classList.toggle('cooldown', healCooldown > 0 || (player && player.hp >= player.maxHp));
    }
}
document.getElementById('difficulty').addEventListener('change',refreshDifficulty);
document.getElementById('pauseButton').addEventListener('click',togglePause);
document.getElementById('healButton').addEventListener('click',healPlayer);
document.getElementById('journalButton').addEventListener('click',toggleJournal);
document.querySelectorAll('.classCard').forEach(card => card.addEventListener('keydown',event => {
    if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); card.click(); }
}));
refreshDifficulty();

let last = performance.now(), accumulator = 0;
const STEP = 1000 / 60;
function loop(now){
    try {
        const dt = Math.min(Math.max(0, now-last), 100); last = now;
        accumulator += dt;
        while (accumulator >= STEP) { update(STEP); accumulator -= STEP; }
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();
        drawBackground();
        drawParticles();
        drawPickups();
        drawHazards();
        drawProjectiles();
        drawMahoraga();
        drawEthernaty(ethernaty1);
        drawMinions();
        drawDragon();
        drawSolarDevourer();
        drawTwoFacedDemon();
        drawWorkshop();
        drawCraftedCombat();
        drawPlayer();
        drawDamageNumbers();
        drawLighting();
        ctx.restore();
    } catch (err){ console.error("❌", err); }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ================================================================
//  ПЕРЕЗАПУСК
// ================================================================
function restart(){
    resetWorkshop();
    clearInput(); clearTimeout(messageTimeout);
    document.getElementById('message').style.opacity = 0;
    document.getElementById('attackWarning').style.opacity = 0;
    clearTimeout(document.getElementById("attackWarning")._t);
    paused = false; journalOpen = false; runElapsed = 0; healCooldown = 0; accumulator = 0;
    document.getElementById('pauseScreen').style.display = 'none';
    document.getElementById('journalScreen').style.display = 'none';
    document.getElementById('runStatus').textContent = '';
    document.getElementById('healButton').disabled = false;
    document.getElementById('healButton').textContent = 'H · Лікування';
    refreshDifficulty();

    player = null; boss = null; ethernaty1 = null; dragon = null; solarDevourer = null; twoFacedDemon = null;
    projectiles = []; enemyProjectiles = []; particles = []; damageNumbers = []; pickups = [];
    meteors = []; tornadoes = []; shockwaves = []; beams = []; minions = []; geysers = []; embers = []; solarMines = []; demonLightnings = [];
    pendingTimers.length = 0;
    inventory = [0,1,2,3,4,15]; weapon = 0;
    adaptationGlobal = 0; totalDamage = 0;
    weaponAdaptation = new Array(16).fill(0);
    weaponAdaptTurned = new Array(16).fill(false);
    gameOver = false; victory = false; bossDefeated = false; firstEthernatyDefeated = false;
    ethernatySpawned = false; dragonSpawned = false; dragonDefeated = false;
    solarDevourerSpawned = false; solarDevourerDefeated = false;
    twoFacedDemonSpawned = false; twoFacedDemonDefeated = false;
    ethernatyTimer = 0; dragonTimer = 0; solarDevourerTimer = 0; twoFacedDemonTimer = 0; worldTime = 0;
    fireGlow = 0; currentClass = null;
    currentBiome = 'forest'; biomeBlend = 0;
    classBonus = { damageMelee:1, damageMagic:1, damageRanged:1, damageAll:1, speedMult:1, manaRegenMult:1, hpBonus:0, manaBonus:0 };
    ownedArtifacts = []; equippedArtifacts = new Array(ARTIFACT_SLOT_COUNT).fill(null);
    artifactMenuOpen = false;
    document.getElementById("artifactModal").style.display = "none";
    updateArtifactBar();
    document.getElementById("deathScreen").style.display = "none";
    document.getElementById("winScreen").style.display = "none";
    document.getElementById("winScreen").querySelector("h1").textContent = "🔥 ПОЛНАЯ ПОБЕДА!";
    document.getElementById("winScreen").querySelector("p").textContent = "FIRE DESTROYER повержен. Вулкан затих.";
    document.getElementById("bossWarning").style.display = "none";
    document.getElementById("bossWarning").querySelector(".warnTitle").textContent = "FIRE DESTROYER";
    document.getElementById("bossWarning").querySelector(".warnSub").textContent = "ПРОБУЖДЁН";
    document.getElementById("bossHealth").style.width = "100%";
    document.getElementById("finalDamage").textContent = "Общий урон: 0";
    document.getElementById("phase").textContent = "ФАЗА I — АДАПТАЦИЯ: 0%";
    document.getElementById("phase").className = "";
    document.getElementById("bossName").textContent = "MAHORAGA — БОЖЕСТВЕННЫЙ ГЕНЕРАЛ";
    document.getElementById("bossName").className = "";
    document.getElementById("bossBar").className = "";
    document.getElementById("bossHealth").className = "";
    document.getElementById("message").className = "";
    document.getElementById("classNameText").textContent = "—";
    document.getElementById("classScreen").style.display = "flex";
    updateWeaponUI(); updateWeaponAdaptUI();
    document.getElementById("damageCounter").textContent = "💥 Урон: 0";
}

