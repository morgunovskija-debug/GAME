// ================================================================
//  ABYSS EXPANSION
//  Three hard post-game bosses (Selene Vey, Vael'Khor, Horologue), each with
//  its own location and lore, three new weapons, and animation layers for the
//  player, weapons and every boss. All art is Canvas geometry driven by
//  simulation time, so pausing freezes every pose.
// ================================================================
const AB_TAU = Math.PI * 2;
const ABYSS_INDEX = BOSS_NAMES.length; // first new boss index (5)
const abEase = t => t < 0 ? 0 : t > 1 ? 1 : t*t*(3-2*t);
const abHash = i => { const v = Math.sin(i*127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------------- Locations and lore ----------------
const LOCATIONS = [
    { name:'Shrine of the Eight Spokes', title:'The King of Adaptation — The Divine General', color:'#d4c591',
      lore:'Eight priests sealed the Divine General inside a forest shrine. Every spoke of its wheel remembers a blade that once wounded it, and turns so that blade never will again.' },
    { name:'The Prismatic Void', title:'Ethernaty — Light of the First Crack', color:'#d9a6ff',
      lore:'When the first star cracked, light leaked into a fold of space and learned to think. Ethernaty guards that fold and bends every color into a weapon.' },
    { name:'Caldera of Ashfall', title:'Fire Destroyer — Wyrm of the Old Volcano', color:'#ff8a3d',
      lore:'The dragon nested in the world’s oldest volcano and burned the northern kingdoms until only the ice of Hrim still held.' },
    { name:'The Sunken Sun Pit', title:'Solar Devourer — Eater of the Fallen Sun', color:'#ffd34d',
      lore:'When the old sun fell, a worm fed on its embers for a thousand years and learned to swallow light itself.' },
    { name:'Gate of Two Faces', title:'The Two-Faced Demon — Warden of the Sanctuary', color:'#ff4d7a',
      lore:'One face judges and the other forgives, never at the same time. It guarded the road to the Sanctuary for an age.' },
    { name:'The Drowned Observatory', title:'Selene Vey — The Hollow Moon', color:'#9fe3ff',
      lore:'Selene Vey was the Sanctuary’s last astronomer. She charted the Demon’s birth in the stars and tried to close the sky’s eye. The moon answered by hollowing her out. Now the tide obeys her, and the observatory sleeps beneath it.',
      tip:'Gravity wells pull you toward their core, so dash outward. Her crescents always return to her hand.' },
    { name:'The Shattered Glacier of Hrim', title:'Vael’Khor — The Frost Tyrant', color:'#bfefff',
      lore:'When the Fire Destroyer burned the north, King Vael’Khor froze his own kingdom to save it. The ice kept the dragon out and his people in. Centuries later he still holds his throne, waiting for a war that ended without him.',
      tip:'Blizzards slow you. Spike lines and impact circles fill up before they erupt. Look for the gap in every avalanche ring.' },
    { name:'The Clock Spire at World’s End', title:'Horologue — The Last Hour', color:'#f2c46b',
      lore:'The artificer who forged the King of Adaptation’s wheel built one more machine: a clock that counts down to the end of every fight. To keep it running, Horologue became its pendulum. Each victory moves the hands closer to midnight.',
      tip:'When time stops, every frozen bolt will turn toward you, so find the gap in the ring. At midnight, escape the circle through the hours that have already struck.' }
];
const ABYSS_EPILOGUES = [
    'The tide recedes. For the first time in centuries, the Drowned Observatory sees the stars.',
    'The throne cracks. Vael’Khor lays down his sword, and the glacier finally begins to thaw.',
    'Midnight passes and nothing ends. The last hand falls still. The trials are yours.'
];

// ---------------- Data registration ----------------
BOSS_NAMES.push('Selene Vey', 'Vael’Khor', 'Horologue', 'The Glitch');
Object.assign(MATERIALS, { moon_shard:'Hollow Moon Shard', everfrost_shard:'Everfrost Shard', broken_mainspring:'Broken Mainspring', corrupted_fragment:'Corrupted Fragment' });
BOSS_DROPS.push(['moon_shard'], ['everfrost_shard'], ['broken_mainspring'], ['corrupted_fragment']);
RECIPES.push({ id:'starforged_compass', station:'accessory', name:'Starforged Compass',
    cost:['moon_shard','everfrost_shard','broken_mainspring'], desc:'+15% damage dealt and +15% movement speed.' });
RECIPES.push({ id:'rift_step', station:'accessory', name:'Rift Step', cost:['corrupted_fragment'],
    desc:'Press R to teleport to your cursor. 3 second cooldown.' });
Object.assign(ARTIFACTS, {
    moon_tear:{ name:'Moon Tear', icon:'🌙', color:'#9fe3ff', boss:'Selene Vey', desc:'Dash recharges 25% faster.' },
    frost_crown:{ name:'Frost Crown', icon:'👑', color:'#bfefff', boss:'Vael’Khor', desc:'Immune to the blizzard chill. All damage taken reduced by 10%.' },
    null_core:{ name:'Null Core', icon:'👾', color:'#b63cff', boss:'The Glitch', desc:'+12% damage dealt. Dash recharges 15% faster.' },
    stopped_hourglass:{ name:'Stopped Hourglass', icon:'⏳', color:'#f2c46b', boss:'Horologue', desc:'Once per fight, a lethal hit leaves you at 1 HP with 2 seconds of protection.' },
    starforged_compass:{ name:'Starforged Compass', icon:'🧭', color:'#e6d3a3', boss:'Crafting', desc:'+15% damage dealt and +15% movement speed.' },
    rift_step:{ name:'Rift Step', icon:'🌀', color:'#7ff6ff', boss:'Crafting', desc:'Press R to teleport to your cursor. 3 second cooldown.' }
});
const ABYSS_WEAPON = 16;
weapons.push(
    { name:'Lunar Glaive',    damage:360, cooldown:520, mana:0,  color:'#cfe3ff', category:'melee'  },
    { name:'Frostbite Lance', damage:1200, cooldown:680, mana:8,  color:'#8fe8ff', category:'ranged' },
    { name:'Chrono Scepter',  damage:950, cooldown:760, mana:22, color:'#f2c46b', category:'magic'  },
    { name:'Null Blaster',    damage:3200, cooldown:900, mana:30, color:'#b63cff', category:'magic'  }
);
const ABYSS_WEAPON_COUNT = 4;
while (weaponAdaptation.length < weapons.length){ weaponAdaptation.push(0); weaponAdaptTurned.push(false); }
for (let i=ABYSS_WEAPON;i<weapons.length;i++){
    const el = document.createElement('button');
    el.className = 'weapon hidden'; el.dataset.id = i; el.type = 'button';
    el.innerHTML = `<span class="name">${weapons[i].name}</span><span class="adapt">Adapt: <span id="adapt${i}">0%</span></span>`;
    el.onclick = () => { if (inventory.includes(i)){ weapon = i; updateWeaponUI(); } };
    document.getElementById('weapons').appendChild(el);
}

// ---------------- Runtime state ----------------
const abyss = { boss:null, lastBoss:null, shots:[], hazards:[], weather:null, fx:[], playerShots:[],
    biomeAlpha:0, biomeKey:null, hourglassUsed:false, riftCd:0, cardTimer:0, phaseSeen:new WeakMap(), errors:[], attackLog:new Set() };
const playerAnim = { walk:0, move:0, lastX:null, lastY:null, prevHp:null, attackAt:-1e9, attackWeapon:0,
    hurtAt:-1e9, dashAt:-1e9, dashFrom:null, dashTo:null, moveAngle:0 };

// ---------------- Small drawing helpers ----------------
function abShape(points, fill, stroke=null, width=1.5){
    ctx.beginPath(); points.forEach(([x,y],i)=> i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function abOval(x,y,rx,ry,fill,rot=0){ ctx.beginPath(); ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,AB_TAU); ctx.fillStyle=fill; ctx.fill(); }
function abLine(points,color,width=1){
    ctx.beginPath(); points.forEach(([x,y],i)=> i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.lineCap='round'; ctx.stroke();
}
function abGear(x,y,r,teeth,rot,fill,stroke){
    const w = AB_TAU/teeth;
    ctx.beginPath();
    for (let i=0;i<teeth;i++){
        const a = rot+i*w;
        for (const [k,rr] of [[0,r],[.22,r*1.2],[.5,r*1.2],[.72,r]]) ctx.lineTo(x+Math.cos(a+w*k)*rr, y+Math.sin(a+w*k)*rr);
    }
    ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    if (stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=1.5; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x,y,r*.35,0,AB_TAU); ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fill();
}
function abGlow(blur, color){ ctx.shadowBlur = visualMode === 'minimal' ? 0 : blur; ctx.shadowColor = color; }

// ================================================================
//  BOSS CREATION AND AI
// ================================================================
const ABYSS_DEFS = {
    selene:{ hp:48000, radius:64, biome:'observatory', css:'moon', contact:65, dmgMult:4, cooldown:1500, reward:{ weapon:16, artifact:'moon_tear', maxHp:300 },
        phaseLines:['', '', '🌙 The tide rises. The eclipse awakens.', '🌙 Full tide! The Hollow Moon overflows.'] },
    vael:{ hp:60000, radius:86, biome:'glacier', css:'frost', contact:80, dmgMult:5, cooldown:1450, reward:{ weapon:17, artifact:'frost_crown', maxHp:350 },
        phaseLines:['', '', '❄ The Frost Tyrant calls the blizzard.', '❄ The glacier shatters around its king!'] },
    horologue:{ hp:75000, radius:78, biome:'clockwork', css:'clock', contact:75, dmgMult:5, cooldown:1350, reward:{ weapon:18, artifact:'stopped_hourglass', maxHp:400 },
        phaseLines:['', '', '⏳ The gears reverse. Time bends around Horologue.', '⏳ The clock strikes eleven. Midnight approaches!'] },
    glitch:{ hp:100000, radius:70, biome:'nullsector', css:'glitch', contact:200, dmgMult:2, cooldown:1400, reward:{ weapon:19, artifact:'null_core', maxHp:500 },
        phases:[.75,.5,.25], phaseNames:['', 'PHASE I', 'PHASE II', 'PHASE III', 'SYSTEM FAILURE'],
        phaseLines:['', '', '👾 THE GLITCH is accelerating...', '👾 THE GLITCH has lost control!', '👾 SYSTEM FAILURE. Reality is collapsing.'] }
};
const ABYSS_KIND = ['selene','vael','horologue','glitch'];

function createAbyssBoss(index){
    const kind = ABYSS_KIND[index-ABYSS_INDEX], def = ABYSS_DEFS[kind];
    return scaleBoss({ kind, index, type:kind, x:canvas.width/2, y:-170, homeY:210, radius:def.radius,
        hp:def.hp, maxHp:def.hp, phase:1, state:'emerge', stateTimer:1800, age:0,
        attack:null, lastAttack:null, attackCooldown:1400, telegraph:0, telegraphMax:1, tick:0, spin:0,
        data:{}, timeStop:0, trail:[], trailTick:0, stun:0, side:1, hold:false, charging:0,
        anim:{ wind:0, strike:0, hitAt:-1e9, hp:def.hp } });
}

function abShot(x,y,a,speed,dmg,r,kind,color,life=2400,extra={}){
    abyss.shots.push({ x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, dmg, r, kind, color, life, age:0, ...extra });
}
function abStrike(x,y,r,warn,dmg,style,color,extra={}){
    abyss.hazards.push({ kind:'strike', x, y, r, warn, warnMax:warn, dmg, style, color, life:450, lifeMax:450, fired:false, ...extra });
}
function arenaPoint(x,y){ return { x:clamp(x,40,canvas.width-40), y:clamp(y,140,GROUND()-20) }; }

const ABYSS_ATTACKS = {
    selene:[
        { id:'crescents', label:'CRESCENT RETURN', phase:1, telegraph:650, duration:900, fire(b){
            const n = 3+b.phase, a = angleTo(b,player);
            for (let i=0;i<n;i++) abShot(b.x,b.y,a+(i-(n-1)/2)*.32,7.5,55,15,'crescent','#dfeaff',3200,{ owner:b, turnAt:700 });
        }},
        { id:'moonfall', label:'MOONFALL', phase:1, telegraph:500, duration:1400, fire(b){
            const n = 6+b.phase*2;
            for (let i=0;i<n;i++){
                const p = i===0 ? {x:player.x,y:player.y} : arenaPoint(player.x+random(-260,260), player.y+random(-200,160));
                abStrike(p.x,p.y,70,900+i*90,95,'moon','#cfe3ff');
            }
        }},
        { id:'wells', label:'TIDAL GRAVITY', phase:1, telegraph:600, duration:1800, fire(b){
            const k = Math.min(3,1+b.phase);
            for (let i=0;i<k;i++){
                const p = i===0 ? arenaPoint(player.x+random(-120,120), player.y+random(-90,90)) : arenaPoint(random(120,canvas.width-120), random(200,GROUND()-80));
                abyss.hazards.push({ kind:'well', x:p.x, y:p.y, r:60, warn:800, warnMax:800, life:3200, lifeMax:3200, pull:2.4, dmg:70, color:'#7fd8e8' });
            }
        }},
        { id:'eclipse', label:'ECLIPSE', phase:2, telegraph:800, duration:5000,
          fire(){ abyss.weather = { kind:'eclipse', life:5400, max:5400 }; },
          tick(b,dt){ b.tick += dt; while (b.tick >= 280){ b.tick -= 280; b.spin += .35; for (let i=0;i<4;i++) abShot(b.x,b.y,b.spin+i*AB_TAU/4,3.6,45,9,'orb','#9fe3ff',3600); } } },
        { id:'tide', label:'SPIRAL TIDE', phase:2, telegraph:500, duration:2200,
          tick(b,dt){ b.tick += dt; while (b.tick >= 120){ b.tick -= 120; b.spin += .27; const arms = b.phase>=3 ? 3 : 2;
              for (let i=0;i<arms;i++) abShot(b.x,b.y,b.spin+i*AB_TAU/arms,4.4,42,8,'orb','#7fd8e8',3200); } } },
        { id:'fullTide', label:'FULL TIDE', phase:3, telegraph:1100, duration:3300, start(b){
            const a = angleTo(b,player)+Math.PI/2, dir = Math.random() < .5 ? 1 : -1;
            for (const k of [0, Math.PI]) abyss.hazards.push({ kind:'beam', follow:b, x:b.x, y:b.y, angle:a+k, spin:.0011*dir,
                len:1800, width:34, warn:1100, warnMax:1100, life:3200, lifeMax:3200, dmg:80, color:'#bfefff' });
        }}
    ],
    vael:[
        { id:'lances', label:'ICE LANCES', phase:1, telegraph:550, duration:950,
          fire(b){ abVolley(b); }, tick(b,dt){ b.tick += dt; while (b.tick >= 300){ b.tick -= 300; abVolley(b); } } },
        { id:'spikes', label:'FROST SPIKES', phase:1, telegraph:700, duration:1500, fire(b){
            const base = angleTo(b,player), offsets = b.phase>=3 ? [-.6,-.3,0,.3,.6] : [-.35,0,.35];
            for (const o of offsets) for (let j=0;j<10;j++){
                const x = b.x+Math.cos(base+o)*(80+j*70), y = b.y+Math.sin(base+o)*(80+j*70);
                if (x < 0 || x > canvas.width || y > GROUND() || y < 100) continue;
                abStrike(x,y,34,450+j*70,100,'ice','#bfefff');
            }
        }},
        { id:'avalanche', label:'AVALANCHE', phase:1, telegraph:800, duration:1600, fire(b){
            for (let i=0;i<b.phase;i++) abyss.hazards.push({ kind:'ring', x:b.x, y:b.y+60, r:20, speed:6.5, max:Math.hypot(canvas.width,canvas.height),
                band:26, gap:angleTo({x:b.x,y:b.y+60},player)+random(-.6,.6)+i*.9, gapWidth:.75, dmg:110, delay:i*450, color:'#cfefff', hit:false });
        }},
        { id:'blizzard', label:'BLIZZARD', phase:2, telegraph:600, duration:700, fire(){
            abyss.weather = { kind:'blizzard', life:6500, max:6500, wind:Math.random() < .5 ? -1.4 : 1.4, tick:0 };
        }},
        { id:'prison', label:'GLACIAL PRISON', phase:2, telegraph:900, duration:1500,
          start(b){ b.data = { x:player.x, y:player.y }; abyss.hazards.push({ kind:'marker', x:player.x, y:player.y, r:300, life:900, lifeMax:900, color:'#bfefff' }); },
          fire(b){ const n = 24, gap = Math.floor(Math.random()*n);
              for (let i=0;i<n;i++){ if ((i-gap+n)%n < 3) continue; const a = i*AB_TAU/n;
                  abShot(b.data.x+Math.cos(a)*300, b.data.y+Math.sin(a)*300, a+Math.PI, 3.4, 70, 10, 'icicle', '#dff6ff', 3000); } } },
        { id:'nova', label:'SHATTER NOVA', phase:3, telegraph:700, duration:1800, fire(){
            for (let i=0;i<5;i++){ const p = arenaPoint(player.x+random(-240,240), player.y+random(-180,140));
                abStrike(p.x,p.y,80,900+i*150,110,'ice','#bfefff',{ burst:8 }); }
        }}
    ],
    horologue:[
        { id:'spiral', label:'TICKING SPIRAL', phase:1, telegraph:500, duration:2400,
          tick(b,dt){ b.tick += dt; while (b.tick >= 90){ b.tick -= 90; b.spin += .23; const arms = 2+b.phase;
              for (let i=0;i<arms;i++) abShot(b.x,b.y,b.spin+i*AB_TAU/arms,4.8,44,8,'bolt','#f2c46b',3000); } } },
        { id:'hands', label:'CLOCK HANDS', phase:1, telegraph:1000, duration:3600, start(b){
            const a = angleTo(b,player)+random(.6,1.2)*(Math.random() < .5 ? 1 : -1), m = b.phase>=3 ? 1.4 : 1;
            abyss.hazards.push({ kind:'beam', follow:b, x:b.x, y:b.y, angle:a, spin:.0007*m, len:1800, width:26, warn:1000, warnMax:1000, life:3500, lifeMax:3500, dmg:85, color:'#f2c46b' });
            abyss.hazards.push({ kind:'beam', follow:b, x:b.x, y:b.y, angle:a+Math.PI*.6, spin:-.0016*m, len:1800, width:18, warn:1000, warnMax:1000, life:3500, lifeMax:3500, dmg:85, color:'#ffe2a0' });
        }},
        { id:'gears', label:'GEAR AVALANCHE', phase:1, telegraph:500, duration:2400, fire(b){
            const n = 3+b.phase;
            for (let i=0;i<n;i++){ const side = i%2 ? 1 : -1, r = random(24,38), y = random(170, GROUND()-r);
                abyss.hazards.push({ kind:'gear', x: side < 0 ? -r-10 : canvas.width+r+10, y, r, vx:-side*random(5,7), rot:0,
                    warn:700+i*350, warnMax:700, dmg:75, color:'#c9a45c' }); }
        }},
        { id:'timeStop', label:'TIME STOP', phase:2, telegraph:700, duration:1800, fire(b){
            b.timeStop = 1600;
            for (const s of abyss.shots){ s.resume = Math.hypot(s.vx,s.vy) || 5; s.frozen = true; }
            const n = 20, gap = Math.floor(Math.random()*n);
            for (let i=0;i<n;i++){ if ((i-gap+n)%n < 4) continue; const a = i*AB_TAU/n;
                abShot(player.x+Math.cos(a)*280, player.y+Math.sin(a)*280, a+Math.PI, 0, 60, 9, 'bolt', '#f2c46b', 4200, { frozen:true, resume:5.5 }); }
        }},
        { id:'rewind', label:'REWIND', phase:2, telegraph:450, duration:900, fire(b){
            const past = b.trail[0] || { x:b.x, y:b.y };
            abStrike(b.x,b.y,130,650,120,'clock','#f2c46b',{ ghost:true });
            abPortalFx(b.x,b.y,'#f2c46b',.6); abPortalFx(past.x,past.y,'#f2c46b',.6);
            b.x = past.x; b.y = past.y; b.trail = [];
        }},
        { id:'midnight', label:'MIDNIGHT', phase:3, telegraph:600, duration:2600, fire(){
            const cx = player.x, cy = player.y;
            for (let i=0;i<12;i++){ const a = -Math.PI/2+i*AB_TAU/12; abStrike(cx+Math.cos(a)*210, cy+Math.sin(a)*210, 75, 700+i*110, 110, 'clock', '#f2c46b'); }
            abStrike(cx,cy,115,700+12*110+250,120,'clock','#ffd98a');
        }}
    ]
};
function abVolley(b){
    const a = angleTo(b,player);
    for (let i=0;i<5;i++) abShot(b.x,b.y+10,a+(i-2)*.12,10,60,9,'icicle','#dff6ff',2000);
}

function abStartAttack(b, forced){
    // New attacks are introduced first when a phase unlocks them, then the choice is random without repeats.
    b.seen = b.seen || new Set();
    const usable = ABYSS_ATTACKS[b.kind].filter(a => a.phase <= b.phase && !a.special);
    const fresh = usable.filter(a => !b.seen.has(a.id));
    const pool = usable.filter(a => a.id !== b.lastAttack);
    const atk = forced || fresh[0] || pool[Math.floor(Math.random()*pool.length)] || usable[0];
    b.seen.add(atk.id); abyss.attackLog.add(atk.id);
    b.attack = atk; b.lastAttack = atk.id; b.state = 'telegraph'; b.tick = 0; b.data = {};
    b.telegraph = b.telegraphMax = atk.telegraph * (b.phase >= 3 ? .85 : 1);
    showAttackWarning('⚠ ' + atk.label);
    if (atk.start) atk.start(b);
}

function abMoveBoss(b, dt){
    if (b.hold || b.stun > 0) return;
    const W = canvas.width, slow = b.state === 'telegraph' ? .4 : 1;
    let tx = b.x, ty = b.y, k = .03;
    if (b.kind === 'glitch'){ tx = clamp(player.x + (b.side||1)*260, 90, W-90); ty = clamp(player.y - 210, 130, canvas.height/2); k = .03 + b.phase*.008; }
    else
    if (b.kind === 'selene'){ tx = W/2 + Math.sin(b.age*.00045)*W*.3; ty = 190 + Math.sin(b.age*.0009)*55; }
    else if (b.kind === 'vael'){ tx = clamp(player.x, 160, W-160); ty = 215 + Math.sin(b.age*.0015)*8; k = .008; }
    else if (b.kind === 'horologue'){ tx = W/2 + Math.cos(b.age*.0004)*W*.28; ty = 200 + Math.sin(b.age*.0008)*60; }
    const f = 1 - Math.pow(1-k*slow, dt/16.67);
    b.x += (tx-b.x)*f; b.y += (ty-b.y)*f;
    b.x = clamp(b.x, 90, W-90); b.y = clamp(b.y, 120, canvas.height/2);
    if (b.kind === 'horologue'){
        b.trailTick += dt;
        if (b.trailTick >= 100){ b.trailTick = 0; b.trail.push({ x:b.x, y:b.y }); if (b.trail.length > 30) b.trail.shift(); }
    }
}

function updateAbyssBoss(dt){
    const b = abyss.boss; if (!b || !player) return;
    const def = ABYSS_DEFS[b.kind];
    b.age += dt;
    // Pose blending for animation: wind-up while telegraphing, strike while attacking, recoil on hit.
    const a = b.anim, k = 1-Math.exp(-dt/110);
    const ready = b.state === 'telegraph' ? .3+.7*clamp(1-b.telegraph/b.telegraphMax,0,1) : 0;
    a.wind += (ready-a.wind)*k; a.strike += ((b.state === 'attack' ? 1 : 0)-a.strike)*k;
    if (b.hp < a.hp) a.hitAt = worldTime;
    a.hp = b.hp;

    if (b.state === 'emerge'){
        b.stateTimer -= dt;
        b.y += (b.homeY-b.y)*(1-Math.pow(.96, dt/16.67));
        if (b.stateTimer <= 0) b.state = 'idle';
    } else {
        abMoveBoss(b, dt);
        if (b.state === 'idle'){
            b.attackCooldown -= dt;
            if (b.kind === 'glitch' && b.phase >= 4 && !b.finalDone && b.hp/b.maxHp <= .1){ b.finalDone = true; abStartAttack(b, GLITCH_FINAL); }
            else if (b.attackCooldown <= 0 && b.stun <= 0) abStartAttack(b);
            if (b.kind === 'glitch' && b.stun <= 0){
                b.tpCd = (b.tpCd ?? 3000) - dt;
                if (b.tpCd <= 0){ const p = glitchPoint(); glitchTeleport(b, p.x, p.y); b.side = -(b.side||1); b.tpCd = [0,4500,3400,2500,1300][b.phase] + random(0,800); }
            }
        } else if (b.state === 'telegraph'){
            b.telegraph -= dt;
            if (b.telegraph <= 0){ b.state = 'attack'; b.stateTimer = b.attack.duration; if (b.attack.fire) b.attack.fire(b); }
        } else if (b.state === 'attack'){
            b.stateTimer -= dt;
            if (b.attack.tick) b.attack.tick(b, dt);
            if (b.stateTimer <= 0){ b.state = 'idle'; b.hold = false; b.attackCooldown = def.cooldown - b.phase*230; }
        }
    }
    if (b.timeStop > 0){
        b.timeStop -= dt;
        if (b.timeStop <= 0) for (const s of abyss.shots) if (s.frozen){
            const ang = angleTo(s, player); s.vx = Math.cos(ang)*s.resume; s.vy = Math.sin(ang)*s.resume; s.frozen = false;
        }
    }
    if (b.stun > 0) b.stun -= dt;
    const ratio = b.hp/b.maxHp, phase = 1 + (def.phases || [.66,.33]).filter(t => ratio <= t).length;
    if (phase > b.phase){
        b.phase = phase; abPhaseFx(b, LOCATIONS[b.index].color); showMessage(def.phaseLines[phase]);
        if (b.kind === 'glitch'){ const p = glitchPoint(); glitchTeleport(b, p.x, p.y); glitchErrors(b.phase); }
    }
    if (b.kind === 'glitch' && b.phase >= 4 && Math.random() < dt/2500) glitchErrors(1);

    if (player.invincible <= 0 && distance(b, player) < b.radius + player.radius) hurtPlayer(b.kind === 'glitch' ? def.contact : def.contact + b.phase*15, LOCATIONS[b.index].color);

    const loc = LOCATIONS[b.index];
    document.getElementById('bossName').textContent = loc.title.toUpperCase();
    document.getElementById('phase').textContent = `${loc.name} · ${def.phaseNames ? def.phaseNames[b.phase] : 'PHASE ' + b.phase}${b.stun > 0 ? ' · REBOOTING' : ''} · HP ${Math.max(0,Math.ceil(b.hp))}`;
    document.getElementById('bossHealth').style.width = `${Math.max(0, ratio*100)}%`;

    if (b.hp <= 0){
        abyss.lastBoss = b; abyss.boss = null;
        recordBossKill(b.index);
        const r = def.reward;
        pickups.push({ x:b.x-120, y:b.y+40, weaponIndex:r.weapon, color:weapons[r.weapon].color });
        pickups.push({ x:b.x+120, y:b.y+40, artifactId:r.artifact });
        if (firstBossKill) player.maxHp += r.maxHp;
        player.hp = player.maxHp; player.mana = player.maxMana;
        currentBiome = 'forest';
        for (const id of ['bossName','bossBar','bossHealth','phase','message']) document.getElementById(id).className = '';
        showLocationCard(b.index, ABYSS_EPILOGUES[b.index-ABYSS_INDEX], 5200);
    }
}

// ---------------- Hazards, shots and weather ----------------
function updateAbyssCombat(dt){
    const step = dt*.06;
    for (let i=abyss.shots.length-1;i>=0;i--){
        const s = abyss.shots[i];
        s.age += dt;
        if (s.delay > 0){ s.delay -= dt; if (s.delay > 0) continue; s.vx = s.launchVx || 0; s.vy = s.speed; }
        if (s.warn > 0){
            s.warn -= dt;
            if (s.fixedAngle == null) s.angle = angleTo(s, player);
            if (s.warn <= 0){ const a = s.fixedAngle ?? angleTo(s, player); s.vx = Math.cos(a)*s.speed; s.vy = Math.sin(a)*s.speed; s.angle = a; }
            continue;
        }
        if (s.curve && s.homingT > 0){
            s.homingT -= dt;
            const want = angleTo(s, player), cur = Math.atan2(s.vy, s.vx);
            const na = cur + clamp(Math.atan2(Math.sin(want-cur), Math.cos(want-cur)), -.032*step, .032*step);
            s.vx = Math.cos(na)*s.speed; s.vy = Math.sin(na)*s.speed;
        }
        if (s.kind === 'bone') s.angle = Math.atan2(s.vy, s.vx);
        if (s.wobble != null){ s.wobble += .09*step; s.vx = Math.sin(s.wobble)*2.2; }
        if (!s.frozen){
            if (s.kind === 'crescent' && s.age > s.turnAt && s.owner){
                const ang = angleTo(s, s.owner);
                s.vx += Math.cos(ang)*.35*step; s.vy += Math.sin(ang)*.35*step;
                const sp = Math.hypot(s.vx,s.vy); if (sp > 9){ s.vx *= 9/sp; s.vy *= 9/sp; }
                if (s.age > s.turnAt+250 && distance(s, s.owner) < 50){ abyss.shots.splice(i,1); continue; }
            }
            s.x += s.vx*step; s.y += s.vy*step; s.life -= dt;
        }
        if (s.life <= 0 || s.x < -200 || s.x > canvas.width+200 || s.y < -200 || s.y > canvas.height+200){ abyss.shots.splice(i,1); continue; }
        let touching;
        if (s.kind === 'bone'){
            const hx = Math.cos(s.angle)*s.len/2, hy = Math.sin(s.angle)*s.len/2;
            touching = pointSegDist(player.x, player.y, s.x-hx, s.y-hy, s.x+hx, s.y+hy) < s.r + player.radius*.6;
        } else touching = Math.hypot(s.x-player.x, s.y-player.y) < s.r + player.radius*(s.kind === 'cube' || s.kind === 'gorb' ? .6 : 1);
        if (player.invincible <= 0 && touching){
            if (hurtPlayer(s.dmg, s.color)) abyss.shots.splice(i,1);
        }
    }
    for (let i=abyss.hazards.length-1;i>=0;i--){
        const h = abyss.hazards[i];
        if (h.kind === 'strike'){
            if (h.warn > 0){ h.warn -= dt; if (h.warn > 0) continue; }
            if (!h.fired){
                h.fired = true;
                if (distance(h, player) < h.r + player.radius) hurtPlayer(h.dmg, h.color);
                particle(h.x, h.y, h.color, 18, 6, .7);
                if (h.burst) for (let k=0;k<h.burst;k++) abShot(h.x,h.y,k*AB_TAU/h.burst,5.5,45,8,'icicle','#dff6ff',1800);
            }
            h.life -= dt; if (h.life <= 0) abyss.hazards.splice(i,1);
        } else if (h.kind === 'well'){
            if (h.warn > 0){ h.warn -= dt; continue; }
            h.life -= dt;
            const d = distance(h, player), reach = h.r*2.4;
            if (d < reach && d > 1){
                const pull = h.pull*step*(1-d/reach)*1.6;
                player.x += (h.x-player.x)/d*pull; player.y += (h.y-player.y)/d*pull;
            }
            if (d < h.r*.4 + player.radius) hurtPlayer(h.dmg, h.color);
            if (h.life <= 0) abyss.hazards.splice(i,1);
        } else if (h.kind === 'beam'){
            if (h.follow){ h.x = h.follow.x; h.y = h.follow.y; }
            if (h.warn > 0){
                h.warn -= dt;
                if (h.lockAt != null && h.warn > h.lockAt) h.angle = angleTo(h, player);
                if (h.lockAt != null && h.warn <= h.lockAt && !h.lockSounded){ h.lockSounded = true; }
                continue;
            }
            h.life -= dt; h.angle += (h.spin||0)*dt;
            if (h.track){ const want = angleTo(h, player); h.angle += clamp(Math.atan2(Math.sin(want-h.angle), Math.cos(want-h.angle)), -h.track*step, h.track*step); }
            const tx = h.x+Math.cos(h.angle)*h.len, ty = h.y+Math.sin(h.angle)*h.len;
            if (pointSegDist(player.x,player.y,h.x,h.y,tx,ty) < h.width/2 + player.radius) hurtPlayer(h.dmg, h.color);
            if (h.life <= 0 || (h.follow && h.follow.hp <= 0)) abyss.hazards.splice(i,1);
        } else if (h.kind === 'ring'){
            if (h.delay > 0){ h.delay -= dt; continue; }
            h.r += h.speed*step;
            if (!h.hit){
                const d = distance(h, player);
                const off = Math.atan2(Math.sin(angleTo(h,player)-h.gap), Math.cos(angleTo(h,player)-h.gap));
                if (Math.abs(d-h.r) < h.band/2 + player.radius && Math.abs(off) > h.gapWidth/2){ if (hurtPlayer(h.dmg, h.color)) h.hit = true; }
            }
            if (h.r > h.max) abyss.hazards.splice(i,1);
        } else if (h.kind === 'gear'){
            if (h.warn > 0){ h.warn -= dt; continue; }
            h.x += h.vx*step; h.rot += h.vx*step/h.r;
            if (distance(h, player) < h.r + player.radius) hurtPlayer(h.dmg, h.color);
            if (h.x < -120 || h.x > canvas.width+120) abyss.hazards.splice(i,1);
        } else if (h.kind === 'marker'){
            h.life -= dt; if (h.life <= 0) abyss.hazards.splice(i,1);
        } else if (h.kind === 'skull'){
            h.age += dt; h.life -= dt; if (h.life <= 0) abyss.hazards.splice(i,1);
        } else if (h.kind === 'zone'){
            if (h.warn > 0){ h.warn -= dt; continue; }
            h.life -= dt;
            if (player.x + 10 > h.x && player.x - 10 < h.x + h.w && player.y + 10 > h.y && player.y - 10 < h.y + h.h) hurtPlayer(h.dmg, '#b63cff');
            if (h.life <= 0) abyss.hazards.splice(i,1);
        } else if (h.kind === 'portal'){
            h.life -= dt; if (h.life <= 0) abyss.hazards.splice(i,1);
        }
    }
    const w = abyss.weather;
    if (w){
        w.life -= dt;
        if (w.kind === 'blizzard'){
            if (!hasArtifact('frost_crown')) player.x = clamp(player.x + w.wind*step*.5, 25, canvas.width-25);
            w.tick += dt;
            while (w.tick >= 420){ w.tick -= 420; abShot(random(0,canvas.width), -20, Math.PI/2 - w.wind*.25, 5, 40, 12, 'snow', '#f4fbff', 4000); }
        }
        if (w.life <= 0) abyss.weather = null;
    }
}

// ---------------- New weapons ----------------
function abCanAttack(){
    return player && currentClass && !gameOver && !paused && !journalOpen && !workshopMenuOpen && !artifactMenuOpen
        && player.attackCooldown <= 0 && inventory.includes(weapon);
}
function abyssWeaponAttack(){
    const w = weapons[weapon], cost = w.mana * (hasArtifact('ethernaty_core') ? .8 : 1);
    if (player.mana < cost) return;
    player.mana -= cost; player.attackCooldown = w.cooldown;
    const a = angleTo(player, mouse), dmg = applyClassBonus(w.damage, weapon);
    if (weapon === 16){
        for (const o of [-.25,.25]) abyss.playerShots.push({ kind:'glaive', x:player.x, y:player.y, vx:Math.cos(a+o)*13, vy:Math.sin(a+o)*13,
            curve:-o*.0025, age:0, out:420, lastHit:-1e9, dmg:dmg*.6 });
    } else if (weapon === 17){
        abyss.playerShots.push({ kind:'lance', x:player.x, y:player.y, vx:Math.cos(a)*20, vy:Math.sin(a)*20, age:0, dmg });
    } else if (weapon === 19){
        // A short-lived null ray: hits the first boss body along the aim line.
        const len = 1100, ex = player.x + Math.cos(a)*len, ey = player.y + Math.sin(a)*len;
        const target = activeBoss();
        if (target){
            const hitPoint = bossHitPoints(target).find(q => pointSegDist(q.x, q.y, player.x, player.y, ex, ey) < q.radius + 18);
            if (hitPoint) hitBoss({ x:hitPoint.x, y:hitPoint.y, radius:2, damage:dmg, weaponIdx:19, color:'#b63cff' });
        }
        abyss.fx.push({ kind:'nullray', x:player.x, y:player.y, ex, ey, age:0, life:260 });
    } else {
        for (let i=0;i<5;i++) abyss.playerShots.push({ kind:'chrono', idx:i, x:player.x, y:player.y, age:0, delay:450+i*70, dmg:dmg*.5 });
    }
    playerAnim.attackAt = worldTime; playerAnim.attackWeapon = weapon;
}
function updateAbyssWeapons(dt){
    const step = dt*.06;
    for (let i=abyss.playerShots.length-1;i>=0;i--){
        const s = abyss.playerShots[i];
        s.age += dt;
        if (s.kind === 'glaive'){
            if (s.age < s.out){
                const c = Math.cos(s.curve*dt), sn = Math.sin(s.curve*dt);
                [s.vx, s.vy] = [s.vx*c - s.vy*sn, s.vx*sn + s.vy*c];
            } else {
                const ang = angleTo(s, player);
                s.vx += Math.cos(ang)*.9*step; s.vy += Math.sin(ang)*.9*step;
                const sp = Math.hypot(s.vx,s.vy); if (sp > 15){ s.vx *= 15/sp; s.vy *= 15/sp; }
                if (distance(s, player) < 26){ abyss.playerShots.splice(i,1); continue; }
            }
            s.x += s.vx*step; s.y += s.vy*step;
            if (worldTime - s.lastHit > 220 && hitBoss({ x:s.x, y:s.y, radius:16, damage:s.dmg, weaponIdx:16, color:'#cfe3ff' })) s.lastHit = worldTime;
            if (s.age > 2400) abyss.playerShots.splice(i,1);
        } else if (s.kind === 'lance'){
            s.x += s.vx*step; s.y += s.vy*step;
            if (hitBoss({ x:s.x, y:s.y, radius:10, damage:s.dmg, weaponIdx:17, color:'#8fe8ff' })){
                abyss.fx.push({ kind:'shards', x:s.x, y:s.y, angle:Math.atan2(s.vy,s.vx), age:0, life:420 });
                abyss.playerShots.splice(i,1); continue;
            }
            if (s.x < -60 || s.x > canvas.width+60 || s.y < -60 || s.y > canvas.height+60) abyss.playerShots.splice(i,1);
        } else if (s.kind === 'chrono'){
            const ang = -Math.PI/2 + s.idx*AB_TAU/5 + s.age*.004;
            s.x = player.x + Math.cos(ang)*34; s.y = player.y + Math.sin(ang)*34;
            if (s.age >= s.delay){
                const a = angleTo(s, mouse);
                projectiles.push({ x:s.x, y:s.y, vx:Math.cos(a)*15, vy:Math.sin(a)*15, radius:9, damage:s.dmg, life:1500,
                    color:'#f2c46b', weaponIdx:18, trail:[], homing:.03, star:true });
                abyss.playerShots.splice(i,1);
            }
        }
    }
    // Homing projectiles also track the new bosses.
    const b = abyss.boss;
    if (b) for (const p of projectiles){
        if (!p.homing) continue;
        const ha = Math.atan2(b.y-p.y, b.x-p.x), hs = Math.hypot(p.vx,p.vy), ca = Math.atan2(p.vy,p.vx);
        const na = ca + clamp(Math.atan2(Math.sin(ha-ca), Math.cos(ha-ca)), -p.homing, p.homing);
        p.vx = Math.cos(na)*hs; p.vy = Math.sin(na)*hs;
    }
}

// ---------------- Boss effects for every boss ----------------
function abPortalFx(x,y,color,scale=1){ abyss.fx.push({ kind:'portal', x, y, color, scale, age:0, life:1400 }); }
function abPhaseFx(entity,color){ const p = entity.head || entity; abyss.fx.push({ kind:'phase', x:p.x, y:p.y, color, age:0, life:900 }); }
function withFlag(get, set, fn){ const old = get(); set(false); try { fn(); } finally { set(old); } }
const DEATH_DRAW = [
    e => withFlag(() => bossDefeated, v => bossDefeated = v, () => BossArt.guardian(e)),
    e => withFlag(() => firstEthernatyDefeated, v => firstEthernatyDefeated = v, () => BossArt.cosmic(e)),
    e => withFlag(() => dragonDefeated, v => dragonDefeated = v, () => BossArt.dragon(e)),
    e => withFlag(() => solarDevourerDefeated, v => solarDevourerDefeated = v, () => BossArt.worm(e)),
    e => withFlag(() => twoFacedDemonDefeated, v => twoFacedDemonDefeated = v, () => BossArt.demon(e))
];
function abDeathFx(index, entity){
    const c = entity.head || entity;
    let top = c.y-190, bottom = c.y+170, left = c.x-150, right = c.x+150;
    if (entity.history){
        const ys = entity.history.map(p=>p.y), xs = entity.history.map(p=>p.x);
        top = Math.min(...ys)-70; bottom = Math.max(...ys)+70; left = Math.min(...xs)-60; right = Math.max(...xs)+60;
    }
    abyss.fx.push({ kind:'death', index, entity, x:c.x, y:c.y, top, bottom, left, right, color:LOCATIONS[index].color, age:0, life:1700 });
}
function updateBossFx(dt){
    for (let i=abyss.fx.length-1;i>=0;i--){ const f = abyss.fx[i]; f.age += dt; if (f.age >= f.life) abyss.fx.splice(i,1); }
    for (let i=abyss.errors.length-1;i>=0;i--){ abyss.errors[i].life -= dt; if (abyss.errors[i].life <= 0) abyss.errors.splice(i,1); }
    const tracked = [[boss, boss && boss.phase, '#d4c591'],
        [ethernaty1, ethernaty1 && (ethernaty1.hp < ethernaty1.maxHp*.5 ? 2 : 1), '#d9a6ff'],
        [dragon, dragon && dragon.phase, '#ff8a3d'], [solarDevourer, solarDevourer && solarDevourer.phase, '#ffd34d'],
        [twoFacedDemon, twoFacedDemon && twoFacedDemon.phase, '#ff4d7a']];
    for (const [ent, ph, color] of tracked){
        if (!ent || ent.hp <= 0) continue;
        const prev = abyss.phaseSeen.get(ent);
        if (prev !== undefined && ph > prev) abPhaseFx(ent, color);
        abyss.phaseSeen.set(ent, ph);
    }
}

// ---------------- Location title card ----------------
function showLocationCard(index, subtitle, ms=2800){
    const loc = LOCATIONS[index]; if (!loc) return;
    const card = document.getElementById('bossWarning');
    card.querySelector('.warnTitle').textContent = loc.name;
    card.querySelector('.warnSub').textContent = (subtitle || loc.title).toUpperCase();
    card.style.display = 'flex';
    clearTimeout(abyss.cardTimer);
    abyss.cardTimer = setTimeout(() => { card.style.display = 'none'; }, ms);
}

// ================================================================
//  HOOKS INTO THE BASE GAME
// ================================================================
const abBase = { update, attack, dash, hitBoss, hurtPlayer, applyClassBonus, summonBoss, activeBoss, clearArena,
    recordBossKill, restart, renderWorkshop, selectClass, drawPlayer, drawWeaponInHand, drawBackground,
    drawHazards, drawProjectiles, drawTwoFacedDemon, drawLighting };

activeBoss = function(){ return abBase.activeBoss() || (abyss.boss && abyss.boss.hp > 0 ? abyss.boss : null); };

update = function(dt){
    const running = !(gameOver || !currentClass || workshopMenuOpen || artifactMenuOpen || paused || journalOpen);
    const before = running && player ? { x:player.x, y:player.y } : null;
    abBase.update(dt);
    if (!running || !player) return;
    if (abyss.riftCd > 0) abyss.riftCd = Math.max(0, abyss.riftCd - dt);
    // Movement modifiers: blizzard chill slows, the Starforged Compass speeds up. Teleports are ignored.
    let mult = 1;
    if (abyss.weather && abyss.weather.kind === 'blizzard' && !hasArtifact('frost_crown')) mult *= .6;
    if (hasArtifact('starforged_compass')) mult *= 1.15;
    if (before && mult !== 1 && Math.hypot(player.x-before.x, player.y-before.y) < 12){
        player.x = clamp(before.x + (player.x-before.x)*mult, 25, canvas.width-25);
        player.y = clamp(before.y + (player.y-before.y)*mult, Math.min(130, Math.max(60, canvas.height*.2)), GROUND()-14);
    }
    const target = ABYSS_BIOME_DRAW[currentBiome] ? 1 : 0;
    if (target) abyss.biomeKey = currentBiome;
    abyss.biomeAlpha += (target-abyss.biomeAlpha)*(1-Math.exp(-dt/450));
    updatePlayerAnim(dt);
    updateBossFx(dt);
    if (gameOver) return;
    updateAbyssWeapons(dt);
    updateAbyssCombat(dt);
    updateAbyssBoss(dt);
};

attack = function(){
    if (weapon >= ABYSS_WEAPON && weapon < ABYSS_WEAPON+ABYSS_WEAPON_COUNT){ if (abCanAttack()) abyssWeaponAttack(); return; }
    const before = player ? player.attackCooldown : 0;
    abBase.attack();
    if (player && player.attackCooldown > before + 1){ playerAnim.attackAt = worldTime; playerAnim.attackWeapon = weapon; }
};

dash = function(){
    const from = player ? { x:player.x, y:player.y } : null, cd = player ? player.dashCooldown : 0;
    abBase.dash();
    if (player && player.dashCooldown > cd){
        playerAnim.dashAt = worldTime; playerAnim.dashFrom = from; playerAnim.dashTo = { x:player.x, y:player.y };
        if (hasArtifact('moon_tear')) player.dashCooldown *= .75;
        if (hasArtifact('null_core')) player.dashCooldown *= .85;
    }
};

hitBoss = function(p){
    if (abBase.hitBoss(p)) return true;
    const b = abyss.boss;
    if (b && b.hp > 0 && Math.hypot(p.x-b.x, p.y-b.y) < b.radius + p.radius){
        const damage = Math.max(1, Math.floor(p.damage * (b.stun > 0 ? 1.5 : 1)));
        b.hp -= damage; igniteTarget(b); totalDamage += damage;
        damageNumber(b.x+random(-40,40), b.y+random(-40,20), damage, p.color, true);
        particle(p.x, p.y, p.color, 10, 6, .6);
        return true;
    }
    return false;
};

hurtPlayer = function(amount, color, fireSource){
    const ab = abyss.boss; if (ab && ab.hp > 0 && ABYSS_DEFS[ab.kind].dmgMult) amount *= ABYSS_DEFS[ab.kind].dmgMult;
    if (hasArtifact('frost_crown')) amount *= .9;
    const wasOver = gameOver;
    const result = abBase.hurtPlayer(amount, color, fireSource);
    if (!wasOver && gameOver && hasArtifact('stopped_hourglass') && !abyss.hourglassUsed && activeBoss()){
        abyss.hourglassUsed = true; gameOver = false;
        player.hp = 1; player.invincible = 2000;
        document.getElementById('deathScreen').style.display = 'none';
        showMessage('⏳ The Stopped Hourglass holds back your last moment!');
    }
    return result;
};

applyClassBonus = function(base, wi){
    return abBase.applyClassBonus(base, wi) * (hasArtifact('starforged_compass') ? 1.15 : 1) * (hasArtifact('null_core') ? 1.12 : 1);
};

function abResetFight(){
    abyss.boss = null; abyss.shots = []; abyss.hazards = []; abyss.weather = null; abyss.playerShots = [];
    abyss.hourglassUsed = false; abyss.errors = [];
}
clearArena = function(){
    abBase.clearArena();
    abyss.shots = []; abyss.hazards = []; abyss.weather = null; abyss.playerShots = [];
};

recordBossKill = function(index){
    const entity = index >= ABYSS_INDEX ? abyss.lastBoss : [boss, ethernaty1, dragon, solarDevourer, twoFacedDemon][index];
    abBase.recordBossKill(index);
    if (entity) abDeathFx(index, entity);
};

summonBoss = function(index){
    if (Number.isInteger(index) && index >= ABYSS_INDEX) return summonAbyssBoss(index);
    if (activeBoss()) return false;
    const ok = abBase.summonBoss(index);
    if (ok){
        abResetFight();
        abyss.fx = abyss.fx.filter(f => f.kind !== 'death');
        abPortalFx(canvas.width/2, 230, LOCATIONS[index].color);
        showLocationCard(index);
    }
    return ok;
};
function summonAbyssBoss(index){
    if (index >= BOSS_NAMES.length || !panelProgression || activeBoss() || !killedBosses.has(index-1)) return false;
    for (const pk of pickups){
        if (pk.artifactId) grantArtifact(pk.artifactId, player.x, player.y);
        else if (!inventory.includes(pk.weaponIndex)) inventory.push(pk.weaponIndex);
    }
    pickups = []; clearArena(); closeWorkshop(); abResetFight();
    boss = null; ethernaty1 = null; dragon = null; solarDevourer = null; twoFacedDemon = null;
    bossDefeated = firstEthernatyDefeated = dragonDefeated = solarDevourerDefeated = twoFacedDemonDefeated = true;
    ethernatySpawned = dragonSpawned = solarDevourerSpawned = twoFacedDemonSpawned = true;
    abyss.boss = createAbyssBoss(index);
    adaptationGlobal = 0; weaponAdaptation.fill(0); weaponAdaptTurned.fill(false); playerAdaptation = 0;
    const def = ABYSS_DEFS[abyss.boss.kind];
    currentBiome = def.biome;
    player.x = canvas.width/2; player.y = GROUND()-100; player.invincible = 1000;
    for (const id of ['bossName','bossBar','bossHealth','phase','message']) document.getElementById(id).className = def.css;
    document.getElementById('bossHealth').style.width = '100%';
    abyss.fx = abyss.fx.filter(f => f.kind !== 'death');
    abPortalFx(canvas.width/2, abyss.boss.homeY, LOCATIONS[index].color, 1.3);
    showLocationCard(index);
    updateWeaponUI(); updateWeaponAdaptUI(); updateMobileInteractBtn();
    return true;
}

renderWorkshop = function(){
    abBase.renderWorkshop();
    if (workshopTab !== 'summon' || !workshopModal.querySelectorAll) return;
    workshopModal.querySelectorAll('.workshopList article').forEach((row, index) => {
        const loc = LOCATIONS[index]; if (!loc) return;
        const p = document.createElement('p'); p.className = 'summonLocation';
        p.textContent = `📍 ${loc.name}${index >= ABYSS_INDEX ? ' · Hard' : ''}`;
        const info = row.querySelector('div'); if (info) info.appendChild(p);
    });
};

selectClass = function(cls){
    const had = currentClass;
    abBase.selectClass(cls);
    if (!had && currentClass){ abPortalFx(canvas.width/2, 210, LOCATIONS[0].color); showLocationCard(0); }
};

restart = function(){
    abResetFight(); abyss.fx = []; abyss.lastBoss = null; abyss.biomeAlpha = 0; abyss.biomeKey = null;
    Object.assign(playerAnim, { lastX:null, lastY:null, prevHp:null, attackAt:-1e9, hurtAt:-1e9, dashAt:-1e9, dashFrom:null });
    clearTimeout(abyss.cardTimer); abyss.riftCd = 0;
    abBase.restart();
};

window.addEventListener('keydown', e => {
    if (e.code !== 'KeyF' || e.repeat || ['INPUT','SELECT','TEXTAREA'].includes(e.target && e.target.tagName)) return;
    if (!currentClass || paused || journalOpen || workshopMenuOpen || artifactMenuOpen) return;
    cycleNextWeapon();
});

// Rift Step accessory: R teleports the player to the cursor, with a 3 second cooldown.
const RIFT_COOLDOWN = 3000;
function riftStep(){
    if (!player || !currentClass || !hasArtifact('rift_step') || abyss.riftCd > 0) return false;
    if (gameOver || paused || journalOpen || workshopMenuOpen || artifactMenuOpen) return false;
    const from = { x:player.x, y:player.y };
    player.x = clamp(mouse.x, 30, canvas.width-30);
    player.y = clamp(mouse.y, 120, GROUND()-14);
    player.invincible = Math.max(player.invincible, 250);
    abyss.riftCd = RIFT_COOLDOWN;
    abyss.fx.push({ kind:'gbolt', pts:[from, { x:player.x, y:player.y }], age:0, life:240 });
    particle(from.x, from.y, '#7ff6ff', 18, 6, .7);
    particle(player.x, player.y, '#7ff6ff', 22, 7, .8);
    Object.assign(playerAnim, { lastX:player.x, lastY:player.y });
    return true;
}
window.addEventListener('keydown', e => {
    if (e.code !== 'KeyR' || e.repeat || ['INPUT','SELECT','TEXTAREA'].includes(e.target && e.target.tagName)) return;
    if (!hasArtifact('rift_step')) return;
    if (abyss.riftCd > 0){ showMessage(`🌀 Rift Step recharging: ${(abyss.riftCd/1000).toFixed(1)}s`); return; }
    riftStep();
});

// ================================================================
//  PLAYER ANIMATION
// ================================================================
const CLASS_LOOK = {
    warrior:{ cloak:'#5a1e1e', body:'#8a8f99', trim:'#d8a84e', hair:'#3b2a1e', skin:'#e7b58c' },
    mage:{ cloak:'#2c1d52', body:'#43307a', trim:'#c9a8ff', hair:'#1f1440', skin:'#efc9a8' },
    ranger:{ cloak:'#1d4a3e', body:'#4f6b3a', trim:'#9fd3a8', hair:'#d8c48a', skin:'#efc6a0' },
    summoner:{ cloak:'#4a3418', body:'#8a6a2e', trim:'#ffd27a', hair:'#6b4a2a', skin:'#b07a52' }
};
function updatePlayerAnim(dt){
    const pa = playerAnim;
    if (pa.lastX === null){ pa.lastX = player.x; pa.lastY = player.y; pa.prevHp = player.hp; }
    const moved = Math.hypot(player.x-pa.lastX, player.y-pa.lastY);
    const moving = moved > .3 && moved < 30;
    pa.move += ((moving ? Math.min(1, moved/4.5) : 0) - pa.move) * (1-Math.exp(-dt/90));
    pa.walk += dt*.013*(.35 + pa.move);
    if (moving) pa.moveAngle = Math.atan2(player.y-pa.lastY, player.x-pa.lastX);
    pa.lastX = player.x; pa.lastY = player.y;
    if (player.hp < pa.prevHp - .5) pa.hurtAt = worldTime;
    pa.prevHp = player.hp;
}
function drawGhost(x,y,ang,look,alpha){
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x,y); ctx.rotate(ang);
    abShape([[-2,-15],[-24,-17],[-28,0],[-24,17],[-2,15]], look.cloak);
    abOval(0,0,10,15,look.trim); abOval(2,0,9,9,look.skin);
    ctx.restore();
}
drawPlayer = function(){
    if (!currentClass || !player) return;
    const pa = playerAnim, t = worldTime, look = CLASS_LOOK[currentClass] || CLASS_LOOK.warrior;
    const aim = angleTo(player, mouse);
    // Dash afterimages trail from the start of the dash to the landing point.
    const dashAge = t - pa.dashAt;
    if (pa.dashFrom && pa.dashTo && dashAge < 280){
        for (let k=1;k<=4;k++){
            const q = k/5;
            drawGhost(pa.dashFrom.x+(pa.dashTo.x-pa.dashFrom.x)*q, pa.dashFrom.y+(pa.dashTo.y-pa.dashFrom.y)*q, aim, look, (1-dashAge/280)*.3*q);
        }
    }
    const bob = Math.sin(pa.walk*2)*1.6*pa.move + Math.sin(t*.0025)*.8*(1-pa.move);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath();
    ctx.ellipse(player.x, player.y+21, 17-bob*.5, 6, 0, 0, AB_TAU); ctx.fill(); ctx.restore();

    const hurt = Math.exp(-(t-pa.hurtAt)/140);
    ctx.save();
    ctx.translate(player.x - Math.cos(aim)*hurt*5, player.y - Math.sin(aim)*hurt*5 + bob);
    ctx.rotate(aim);
    if (player.invincible > 0){
        ctx.save(); ctx.rotate(t*.004); ctx.strokeStyle = '#91c7d3'; ctx.lineWidth = 1.5; ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.arc(0,0,28,0,AB_TAU); ctx.stroke(); ctx.restore();
    }
    // Feet step alternately along the facing axis.
    const step = Math.sin(pa.walk)*pa.move;
    abOval(-2+step*7,-8,6,4,'#2a2420'); abOval(-2-step*7,8,6,4,'#2a2420');
    // Cloak trails behind the movement direction and sways while idle.
    const rel = pa.moveAngle - aim, lag = pa.move*6;
    const sway = Math.sin(t*.004)*2.5 + Math.sin(pa.walk*2)*2*pa.move;
    const tx = -Math.cos(rel)*lag, ty = -Math.sin(rel)*lag;
    abShape([[-2,-15],[-22+tx,-19+ty+sway*.5],[-29+tx,sway],[-22+tx,19+ty+sway*.5],[-2,15]], look.cloak, 'rgba(0,0,0,.35)', 1);
    // Class details behind the torso.
    if (currentClass === 'ranger'){
        ctx.save(); ctx.translate(-9,-5); ctx.rotate(-.5); ctx.fillStyle = '#5a3b1f'; ctx.fillRect(-4,-12,8,22);
        for (let i=0;i<3;i++){ ctx.fillStyle = i===1 ? '#e8e2c8' : '#9fd3a8'; ctx.fillRect(-3+i*2,-17,2,6); } ctx.restore();
    }
    // Torso with breathing.
    const breathe = 1 + Math.sin(t*.003)*.03;
    abOval(0,0,10*breathe,15*breathe,look.body);
    abLine([[-4,-13],[-4,13]], look.trim, 2);
    if (currentClass === 'warrior') for (const s of [-1,1]){
        ctx.beginPath(); ctx.arc(1,s*13,7,s<0?Math.PI:0,s<0?AB_TAU:Math.PI); ctx.fillStyle = '#b8bec8'; ctx.fill();
        abLine([[-5,s*13],[7,s*13]], look.trim, 1.5);
    }
    if (currentClass === 'summoner'){
        const oa = t*.003;
        abGlow(8, look.trim); abOval(Math.cos(oa)*26, Math.sin(oa)*26, 4, 4, look.trim); ctx.shadowBlur = 0;
    }
    // Off hand and head.
    abOval(7,-12,4,4,look.skin);
    abOval(2,0,9,9,look.skin);
    if (currentClass === 'mage'){
        abOval(0,0,12,13,look.hair); abShape([[-8,-5],[-24,0],[-8,5]], look.hair); abOval(2,0,4,4,look.trim);
    } else {
        ctx.beginPath(); ctx.arc(2,0,9.5,Math.PI/2,Math.PI*1.5); ctx.fillStyle = look.hair; ctx.fill();
    }
    if (hurt > .05){ ctx.strokeStyle = `rgba(255,80,80,${hurt*.6})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,20,0,AB_TAU); ctx.stroke(); }
    drawAnimatedWeapon(look);
    ctx.restore();
};

function drawAnimatedWeapon(look){
    const pa = playerAnim, t = worldTime, w = weapons[weapon];
    if (!w) return;
    const cat = w.category, age = t - pa.attackAt;
    let rot = Math.sin(t*.003)*.04*(1-pa.move) + Math.sin(pa.walk)*.06*pa.move, kx = 0;
    let swing = null, flash = 0, rune = 0;
    if (age < 340 && pa.attackWeapon === weapon){
        const k = age/340;
        if (cat === 'melee'){
            // Wind back, sweep through, then settle.
            if (k < .15) rot += -1.0*abEase(k/.15);
            else if (k < .6) rot += -1.0 + 2.1*abEase((k-.15)/.45);
            else rot += 1.1*(1-abEase((k-.6)/.4));
            if (k > .15 && k < .75) swing = clamp((k-.15)/.45, 0, 1);
        } else if (cat === 'ranged'){
            kx = -9*Math.exp(-age/70); rot += -.14*Math.exp(-age/90); flash = Math.exp(-age/60);
        } else {
            rot += -.3*Math.sin(Math.min(1,k*1.4)*Math.PI); rune = k;
        }
    }
    if (channelActive){ kx += Math.sin(t*.06)*1.2; rune = (t%600)/600; }
    if (swing !== null){
        ctx.save(); ctx.globalAlpha = .45*(1-Math.abs(swing-.5)*1.2);
        ctx.strokeStyle = w.color; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0,0,62,-1.0+0.3*swing, -1.0+2.1*swing+.2); ctx.stroke();
        ctx.globalAlpha *= .6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.translate(8+kx, 11); ctx.rotate(rot);
    drawWeaponInHand(weapon);
    abOval(2,0,4.5,4.5,look.skin);
    if (flash > .02){
        ctx.globalAlpha = flash*.8; ctx.strokeStyle = w.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(72,0,6+(1-flash)*10,0,AB_TAU); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(72,0,3*flash+1,0,AB_TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (rune > 0){
        ctx.save(); ctx.translate(60,-4); ctx.rotate(t*.006); ctx.globalAlpha = (1-rune)*.85;
        ctx.strokeStyle = w.color; ctx.lineWidth = 1.5; const R = 8 + rune*18;
        ctx.beginPath(); ctx.arc(0,0,R,0,AB_TAU); ctx.stroke();
        for (let i=0;i<6;i++){ const a = i*AB_TAU/6; abLine([[Math.cos(a)*R*.6,Math.sin(a)*R*.6],[Math.cos(a+.5)*R,Math.sin(a+.5)*R]], w.color, 1); }
        ctx.restore();
    }
    ctx.restore();
}

drawWeaponInHand = function(idx){
    if (idx < ABYSS_WEAPON || idx >= ABYSS_WEAPON+ABYSS_WEAPON_COUNT){ abBase.drawWeaponInHand(idx); return; }
    const t = worldTime;
    ctx.save(); ctx.translate(10,0); ctx.lineCap = 'round'; abGlow(5, weapons[idx].color);
    if (idx === 16){ // Lunar Glaive: haft with twin crescent blades
        const thrown = abyss.playerShots.some(s => s.kind === 'glaive');
        abLine([[-12,0],[40,0]], '#3d4a66', 5);
        if (!thrown) for (const s of [-1,1]){
            ctx.save(); ctx.translate(44,0); ctx.rotate(s*.5 + Math.sin(t*.004)*.05);
            ctx.beginPath(); ctx.arc(0,0,15,-1.3,1.3); ctx.arc(-6,0,12,1.2,-1.2,true); ctx.closePath();
            ctx.fillStyle = '#e4eeff'; ctx.fill(); ctx.restore();
        }
        abOval(40,0,4,4,'#9fe3ff');
    } else if (idx === 17){ // Frostbite Lance: long shaft and crystal head
        abLine([[-14,0],[52,0]], '#2b4a63', 6); abLine([[-10,0],[48,0]], '#6fb5d6', 2);
        abShape([[50,-8],[78,0],[50,8],[56,0]], '#c8f4ff', '#ffffff', 1);
        for (let i=0;i<3;i++){ const a = t*.003+i*2.1; abOval(64+Math.cos(a)*10, Math.sin(a)*10, 1.5, 1.5, '#e8fbff'); }
    } else if (idx === 19){ // Null Blaster: a corrupted skull on a dark grip
        ctx.fillStyle = '#1b0f38'; ctx.fillRect(-12,-5,40,10);
        ctx.fillStyle = '#e9e6ff'; ctx.fillRect(26,-9,16,18);
        ctx.fillStyle = '#07050c'; ctx.fillRect(30,-6,4,4); ctx.fillRect(36,-6,4,4); ctx.fillRect(40,-2,4,4);
        ctx.fillStyle = Math.floor(t/120)%2 ? '#00f0ff' : '#b63cff'; ctx.fillRect(-8,-2,30,2);
    } else { // Chrono Scepter: rod topped by a ticking clock face
        abLine([[-12,6],[30,-3]], '#5a3d1a', 6);
        abOval(40,-6,13,13,'#f2c46b'); abOval(40,-6,10,10,'#fff6dc');
        for (let i=0;i<12;i++){ const a = i*AB_TAU/12; abLine([[40+Math.cos(a)*8,-6+Math.sin(a)*8],[40+Math.cos(a)*9.5,-6+Math.sin(a)*9.5]], '#5a3d1a', 1); }
        const tick = Math.floor(t/250)*AB_TAU/60;
        abLine([[40,-6],[40+Math.cos(tick-Math.PI/2)*8,-6+Math.sin(tick-Math.PI/2)*8]], '#3b250d', 1.5);
    }
    ctx.shadowBlur = 0; ctx.restore();
};

// ================================================================
//  LOCATIONS: BACKGROUNDS
// ================================================================
function bgObservatory(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime;
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#040a1c'); sky.addColorStop(.55,'#0c2140'); sky.addColorStop(1,'#10324a');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    for (let i=0;i<80;i++){
        ctx.globalAlpha = A*(.25+.5*Math.abs(Math.sin(i*1.3+t*.0006)));
        ctx.fillStyle = '#dfefff'; ctx.fillRect(abHash(i)*W, abHash(i+50)*H*.6, 1+(i%2), 1+(i%2));
    }
    ctx.globalAlpha = A;
    // The hollow moon: a pale ring with a dark tide-filled core.
    const mx = W*.72, my = H*.24, R = Math.min(W,H)*.15;
    const mg = ctx.createRadialGradient(mx-R*.3,my-R*.3,R*.2,mx,my,R);
    mg.addColorStop(0,'#f4f8ff'); mg.addColorStop(1,'#8fa9cc');
    ctx.beginPath(); ctx.arc(mx,my,R,0,AB_TAU); ctx.arc(mx,my,R*.68,0,AB_TAU,true); ctx.fillStyle = mg; ctx.fill();
    ctx.beginPath(); ctx.arc(mx,my,R*.68,0,AB_TAU); ctx.fillStyle = '#071a30'; ctx.fill();
    ctx.strokeStyle = 'rgba(127,216,232,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx,my,R*.68,0,AB_TAU); ctx.stroke();
    // Ruined observatory dome and telescope.
    ctx.fillStyle = '#081426';
    const dx = W*.18, dy = g-120;
    ctx.beginPath(); ctx.moveTo(dx-120,g); ctx.lineTo(dx-120,dy); ctx.arc(dx,dy,120,Math.PI,Math.PI*1.72); ctx.lineTo(dx+40,dy-60); ctx.lineTo(dx+120,dy); ctx.lineTo(dx+120,g); ctx.fill();
    ctx.save(); ctx.translate(dx+10,dy-70); ctx.rotate(-.55); ctx.fillRect(0,-9,150,18); ctx.fillRect(150,-12,22,24); ctx.restore();
    for (let i=0;i<5;i++){ const cx = W*.4 + i*W*.12; ctx.fillRect(cx, g-90-(i%2)*40, 18, 90+(i%2)*40); ctx.fillRect(cx-6, g-96-(i%2)*40, 30, 8); }
    // Tidal floor with the moon's reflection.
    const wg = ctx.createLinearGradient(0,g-16,0,H);
    wg.addColorStop(0,'#0f3a52'); wg.addColorStop(1,'#061a28');
    ctx.fillStyle = wg; ctx.fillRect(0,g-16,W,H-g+16);
    for (let k=0;k<6;k++){
        const y = g-8+k*9, w = R*(1.4-k*.15);
        ctx.globalAlpha = A*(.35-k*.04); ctx.fillStyle = '#cfe3ff';
        ctx.fillRect(mx-w/2+Math.sin(t*.002+k)*8, y, w, 2);
    }
    ctx.globalAlpha = A*.5; ctx.strokeStyle = '#7fd8e8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let x=0;x<=W;x+=16) ctx.lineTo(x, g-16+Math.sin(x*.025+t*.002)*2.5); ctx.stroke();
    if (visualMode !== 'minimal') for (let i=0;i<22;i++){
        const y = g - ((t*.02 + i*67) % (H*.75)), x = abHash(i+9)*W + Math.sin(t*.001+i)*10;
        ctx.globalAlpha = A*.35; ctx.fillStyle = '#9fe3ff'; ctx.beginPath(); ctx.arc(x,y,1.5+(i%3),0,AB_TAU); ctx.fill();
    }
    ctx.globalAlpha = A;
}
function bgGlacier(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime;
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#0a1730'); sky.addColorStop(.5,'#1d3b5c'); sky.addColorStop(1,'#7fa8c2');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    // Aurora bands.
    for (let k=0;k<3;k++){
        ctx.globalAlpha = A*.13; ctx.strokeStyle = ['#7dffc4','#6fd8ff','#b79bff'][k]; ctx.lineWidth = 26-k*6;
        ctx.beginPath();
        for (let x=0;x<=W;x+=20) ctx.lineTo(x, 80+k*34 + Math.sin(x*.004 + t*.0004 + k*1.7)*30);
        ctx.stroke();
    }
    ctx.globalAlpha = A;
    // Far and near ice ridges.
    for (const [layer,color,h] of [[0,'#3d5f80',260],[1,'#2a4663',170]]){
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0,g);
        for (let x=0;x<=W+80;x+=80){ const peak = h*(.5+.5*abHash(x*.01+layer*7)); ctx.lineTo(x, g-peak); ctx.lineTo(x+40, g-peak*.55); }
        ctx.lineTo(W,g); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(220,245,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Frozen throne silhouette.
    ctx.fillStyle = '#1b3350'; const tx = W*.82, ty = g-40;
    abShape([[tx-60,ty+40],[tx-50,ty-80],[tx-30,ty-140],[tx,ty-110],[tx+30,ty-150],[tx+50,ty-80],[tx+60,ty+40]], '#1b3350', 'rgba(200,240,255,.3)', 1.5);
    // Ice floor with cracks.
    const fg = ctx.createLinearGradient(0,g-16,0,H);
    fg.addColorStop(0,'#bfe3f2'); fg.addColorStop(.25,'#6f9fbd'); fg.addColorStop(1,'#2b4a63');
    ctx.fillStyle = fg; ctx.fillRect(0,g-16,W,H-g+16);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
    for (let i=0;i<14;i++){ const x = abHash(i+3)*W; abLine([[x,g-14],[x+18,g+4],[x+6,g+22],[x+28,g+40]], 'rgba(255,255,255,.35)', 1); }
    // Snowfall, heavier during a blizzard.
    const storm = abyss.weather && abyss.weather.kind === 'blizzard' ? abyss.weather.wind : 0;
    const flakes = visualMode === 'minimal' ? 20 : storm ? 90 : 50;
    ctx.fillStyle = '#f4fbff';
    for (let i=0;i<flakes;i++){
        const sp = 1+(i%3);
        const x = ((abHash(i)*W + t*.01*sp + storm*t*.06) % W + W) % W, y = (abHash(i+90)*H + t*.04*sp) % H;
        ctx.globalAlpha = A*(.35+.15*(i%3)); ctx.beginPath(); ctx.arc(x,y,1+(i%3)*.6,0,AB_TAU); ctx.fill();
    }
    ctx.globalAlpha = A;
}
function bgClockwork(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime;
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#170d1c'); sky.addColorStop(.55,'#3f2427'); sky.addColorStop(1,'#a8673a');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    // Giant clock face; the hands follow the arena's own time.
    const cx = W*.5, cy = H*.36, R = Math.min(W,H)*.3;
    ctx.globalAlpha = A*.4; ctx.strokeStyle = '#d9a75c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx,cy,R,0,AB_TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx,cy,R*.86,0,AB_TAU); ctx.stroke();
    for (let i=0;i<12;i++){ const a = i*AB_TAU/12; abLine([[cx+Math.cos(a)*R*.78,cy+Math.sin(a)*R*.78],[cx+Math.cos(a)*R*.95,cy+Math.sin(a)*R*.95]], '#d9a75c', i%3 ? 3 : 7); }
    const hb = abyss.boss && abyss.boss.kind === 'horologue' ? 1-abyss.boss.hp/abyss.boss.maxHp : 0;
    const hour = -Math.PI/2 + (11 + hb)/12*AB_TAU, minute = -Math.PI/2 + t*.0002;
    abLine([[cx,cy],[cx+Math.cos(hour)*R*.5,cy+Math.sin(hour)*R*.5]], '#e8c07a', 9);
    abLine([[cx,cy],[cx+Math.cos(minute)*R*.75,cy+Math.sin(minute)*R*.75]], '#e8c07a', 5);
    ctx.globalAlpha = A;
    // Corner gears.
    for (const [x,y,r,s] of [[0,H*.15,120,1],[W,H*.3,150,-1],[W*.12,g-40,80,-1],[W*.9,g-60,70,1]])
        abGear(x,y,r,14,t*.0003*s,'rgba(40,24,22,.85)','rgba(217,167,92,.25)');
    // Spire towers.
    ctx.fillStyle = '#21141a';
    for (const [x,w,h] of [[W*.05,60,320],[W*.27,40,240],[W*.7,50,280],[W*.95,70,360]]){
        ctx.fillRect(x-w/2,g-h,w,h); abShape([[x-w/2-6,g-h],[x,g-h-70],[x+w/2+6,g-h]], '#21141a');
        ctx.fillStyle = 'rgba(255,200,110,.35)'; ctx.fillRect(x-4,g-h+40,8,12); ctx.fillStyle = '#21141a';
    }
    // Bronze tiled floor with a clock-ring inlay.
    ctx.fillStyle = '#2d1c16'; ctx.fillRect(0,g-16,W,H-g+16);
    for (let x=0;x<W;x+=48){ ctx.fillStyle = (x/48)%2 ? '#3a251b' : '#33201a'; ctx.fillRect(x,g-12,46,12); }
    ctx.fillStyle = 'rgba(242,196,107,.5)'; ctx.fillRect(0,g-18,W,2);
    if (visualMode !== 'minimal') for (let i=0;i<12;i++){
        const x = abHash(i+20)*W, y = (abHash(i+40)*H*.7 + t*.008*(1+i%2)) % (H*.8);
        abGear(x, H*.8-y, 5+(i%3)*2, 8, t*.002*(i%2 ? 1 : -1), 'rgba(217,167,92,.35)');
    }
}
const ABYSS_BIOME_DRAW = { observatory:bgObservatory, glacier:bgGlacier, clockwork:bgClockwork };

drawBackground = function(){
    const A = abyss.biomeAlpha;
    if (A < .999) abBase.drawBackground();
    if (A > .001 && abyss.biomeKey){
        ctx.save(); ctx.globalAlpha = A; ABYSS_BIOME_DRAW[abyss.biomeKey](A); ctx.restore();
    }
};

// ================================================================
//  NEW BOSS MODELS
//  Drawn with BossKit (js/boss-art.js) so they share the first bosses' look: ink outlines,
//  metal sheen, articulated limbs with armoured joints, engraved detail and rune rings.
// ================================================================
function drawSelene(b){
    const K = BossKit, t = worldTime/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const INK = '#0c1630', prevInk = K.ink(INK), red = b.phase >= 3;
    ctx.save(); ctx.translate(b.x, b.y + Math.sin(t*1.6)*6); ctx.rotate(Math.sin(t*.7)*.03 + hit*.05); ctx.lineJoin = 'round';
    // Moon-dial behind her: two turning rune rings and a hollow silver moon engraved with its phases.
    ctx.save(); ctx.translate(0,-60);
    K.runeRing(78 + cast*8, t*.12, 28, 'rgba(159,227,255,.7)');
    K.runeRing(66 + cast*6, -t*.18, 20, 'rgba(120,160,210,.75)');
    const R = 54 + cast*6;
    ctx.beginPath(); ctx.arc(0,0,R,0,AB_TAU); ctx.arc(0,0,R*.8,0,AB_TAU,true);
    ctx.fillStyle = K.metal(0,0,R,'#f4f8ff','#7f9cc4'); ctx.fill();
    ctx.save(); ctx.clip(); K.oval(R*.5,-R*.2,R*.95,R*.95,'rgba(8,20,45,.5)',null); ctx.restore();
    K.oval(0,0,R,R,null,INK,0,1.6); K.oval(0,0,R*.8,R*.8,null,INK,0,1.2);
    for (let i=0;i<8;i++){
        const q = i*AB_TAU/8 + t*.15, x = Math.cos(q)*R*.9, y = Math.sin(q)*R*.9;
        K.oval(x,y,3.4,3.4,'#e8f2ff',INK,0,.8); K.oval(x + Math.cos(i*.8)*1.8, y, 2.6, 3, 'rgba(12,22,48,.65)', null);
    }
    ctx.restore();
    // Water tendrils below the robe.
    for (let i=0;i<5;i++){
        const x0 = (i-2)*10, sw = Math.sin(t*2+i)*14, pts = [[x0,60],[x0*1.4+sw*.5,100],[x0*1.8+sw,140+Math.sin(t*1.3+i)*8]];
        K.inked(pts, '#2f7f96', 7-i*.6); K.line(pts, 'rgba(190,240,255,.55)', 1.3);
    }
    // Silver hair streaming behind her, with strands.
    const hs = Math.sin(t*1.4)*8;
    K.shape([[-6,-66],[-30,-40+hs*.3],[-52,hs],[-58,40+hs*1.4],[-36,20+hs],[-20,-20],[-4,-40]], K.metal(-30,-10,40,'#f6f9ff','#a9b8d6'));
    for (let i=0;i<4;i++) K.line([[-8-i*4,-58],[-26-i*6,-14+hs*.6],[-38-i*4,24+hs*1.2]], 'rgba(90,110,150,.55)', 1);
    // Layered robe: outer mantle, a front panel with gold trim, folds and a tide pattern at the hem.
    const hem = Math.sin(t*2.2)*6;
    K.shape([[-18,-30],[18,-30],[34,40],[46,92+hem],[18,84],[0,98-hem],[-20,86],[-46,94-hem],[-32,40]], K.grad(0,-30,0,96,[[0,'#24407a'],[1,'#1a5f78']]), INK, 1.8);
    for (let i=-3;i<=3;i++) if (i) K.line([[i*6,0],[i*13 + Math.sin(t*2+i)*2, 84]], 'rgba(8,16,40,.5)', 1.1);
    K.shape([[-10,-4],[10,-4],[16,88-hem*.5],[0,96-hem],[-16,88+hem*.5]], K.metal(0,46,44,'#3e70ae','#1b3563'));
    K.line([[-10,-4],[-16,88+hem*.5]], '#d9c58a', 1.4); K.line([[10,-4],[16,88-hem*.5]], '#d9c58a', 1.4);
    K.line([[-14,66],[-7,62],[0,66],[7,62],[14,66]], 'rgba(159,227,255,.8)', 1.2);
    K.line([[-15,76],[-7,72],[0,76],[7,72],[15,76]], 'rgba(159,227,255,.6)', 1);
    for (let i=0;i<9;i++){ ctx.globalAlpha = .4 + .4*Math.sin(t*2+i); K.oval((abHash(i)-.5)*60, 10+abHash(i+7)*70, 1.4, 1.4, '#e8f6ff', null); }
    ctx.globalAlpha = 1;
    // Belt with a moonstone clasp.
    K.plate([[-22,-3],[22,-3],[20,6],[-20,6]], '#efe0aa', '#8a7440', 1.2);
    K.oval(0,1.5,4.5,4.5,'#9fe3ff',INK,0,1); K.oval(-1.2,.3,1.6,1.6,'rgba(255,255,255,.7)',null);
    // Arms: rest at her sides, rise during the wind-up, thrust forward on release.
    for (const s of [-1,1]){
        const hx = s*(30 + cast*14 + strike*20), hy = 6 - cast*56 + strike*30;
        const el = [s*(28 + cast*6), -10 - cast*24 + strike*8];
        K.limb([s*18,-26], el, [hx,hy], 8, '#2b4c8c', { armor:'#c9d6ea', bands:2, trim:'#d9c58a' });
        K.hand(hx, hy, Math.atan2(hy-el[1], hx-el[0]), '#eef2fa', .75 + cast*.25, .8);
        ctx.save(); ctx.translate(hx, hy-12);
        if (cast > .1) abGlow(8 + cast*10, '#9fe3ff');
        ctx.beginPath(); ctx.arc(0,0,8,-1.2,1.2); ctx.arc(-3,0,6.5,1.1,-1.1,true); ctx.closePath();
        ctx.fillStyle = '#e4f2ff'; ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
    }
    // Bodice and crescent pauldrons.
    K.plate([[-16,-34],[16,-34],[13,-2],[0,4],[-13,-2]], '#dce7f6', '#5a7aa8', 1.6);
    K.line([[0,-30],[0,0]], 'rgba(20,40,80,.55)', 1);
    K.line([[-12,-22],[0,-16],[12,-22]], 'rgba(20,40,80,.45)', 1);
    K.oval(0,-20,5,5,'#9fe3ff',INK,0,1); K.oval(2,-21,4,4,'#6f8cb8',null);
    for (const s of [-1,1]){
        K.plate([[s*10,-36],[s*26,-41],[s*35,-28],[s*25,-20],[s*12,-26]], '#eef4ff', '#7d95bd');
        K.line([[s*14,-34],[s*29,-30]], 'rgba(20,40,80,.5)', 1);
        K.rivet(s*25,-29,1.5,'#d9c58a');
    }
    K.plate([[-10,-37],[10,-37],[6,-31],[-6,-31]], '#f2e2a8', '#8a7440', 1);
    // Head: neck, face with closed glowing eyes, silver hair cap and a crescent diadem.
    K.oval(0,-38,5,6,'#dde5f2');
    K.oval(0,-48,12,15,K.metal(0,-48,14,'#f8fafd','#c4cee0'),INK,0,1.6);
    abGlow(6,'#9fe3ff');
    K.line([[-8,-50],[-5,-48.6],[-2,-50]], '#7fd0ff', 1.6); K.line([[2,-50],[5,-48.6],[8,-50]], '#7fd0ff', 1.6);
    ctx.shadowBlur = 0;
    K.line([[0,-47],[-1,-42.5],[1,-41.5]], 'rgba(80,90,120,.6)', 1); K.line([[-3,-37.5],[0,-36.6],[3,-37.5]], '#8a6a8a', 1.2);
    K.shape([[-13,-50],[-12,-60],[-4,-64],[6,-63],[13,-56],[12,-47],[8,-55],[0,-57],[-8,-54]], K.metal(0,-58,14,'#ffffff','#b9c6de'), INK, 1.2);
    ctx.beginPath(); ctx.arc(0,-66,8,Math.PI*.1,Math.PI*.9,true);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.stroke(); ctx.strokeStyle = '#ecdca4'; ctx.lineWidth = 2.6; ctx.stroke();
    K.shape([[0,-77],[3,-71],[0,-67.5],[-3,-71]], '#9fe3ff', INK, 1);
    // Orbiting moons, blood red in the final phase.
    for (let i=0;i<3;i++){
        const q = t*.6 + i*AB_TAU/3, x = Math.cos(q)*84, y = -10 + Math.sin(q)*34;
        K.oval(x,y,7,7,K.metal(x,y,7,red ? '#ffb0bc' : '#e8f0ff', red ? '#a03848' : '#7f96c0'),INK,0,1.2);
        K.oval(x+2,y-2,4.4,4.4,'rgba(6,18,40,.45)',null); K.oval(x-2.6,y+2.4,1.3,1.3,'rgba(6,18,40,.45)',null);
    }
    ctx.restore(); K.ink(prevInk);
}

function drawVael(b){
    const K = BossKit, t = worldTime/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const INK = '#121d2b', prevInk = K.ink(INK);
    ctx.save(); ctx.translate(b.x, b.y + Math.sin(t*1.2)*3); ctx.rotate(hit*.035); ctx.lineJoin = 'round';
    // Floating ice slab with hanging icicles.
    K.shape([[-80,92],[-60,80],[60,78],[84,92],[60,104],[-56,106]], K.metal(0,92,70,'#eefaff','#7fb8d6'), INK, 1.8);
    K.line([[-60,83],[-22,92],[8,84],[50,93]], 'rgba(255,255,255,.65)', 1);
    for (let i=0;i<8;i++){ const x = -60+i*17; K.shape([[x-5,104],[x,118+(i%3)*8+Math.sin(t*2+i)],[x+5,104]], K.grad(x,104,x,126,[[0,'#eafbff'],[1,'#7fc4e6']]), INK, 1); }
    // Cape with an inner trim line and heavy folds.
    const cs = Math.sin(t*1.5)*6;
    K.shape([[-36,-50],[36,-50],[60,40+cs],[52,84-cs],[0,78],[-52,84+cs],[-60,40-cs]], K.grad(0,-50,0,90,[[0,'#24406a'],[1,'#0f1f38']]), INK, 2);
    K.shape([[-31,-44],[31,-44],[52,40+cs],[45,77-cs],[0,72],[-45,77+cs],[-52,40-cs]], null, 'rgba(191,230,255,.35)', 1);
    for (let i=-2;i<=2;i++) K.line([[i*12,-40],[i*20 + Math.sin(t*1.5+i)*3, 72]], 'rgba(5,12,24,.5)', 1.2);
    // Legs: armoured knees, greaves and sabatons.
    for (const s of [-1,1]){
        const step = Math.sin(t*1.6+s)*2;
        K.limb([s*16,24], [s*20,54+step], [s*22,82], 15, '#6d88a4', { armor:'#b9d1e6' });
        K.plate([[s*20-9,58+step],[s*20+9,58+step],[s*22+8,77],[s*22-8,77]], '#dbe8f3', '#56708a', 1.2);
        K.oval(s*24+2,85,14,6,K.metal(s*24,85,14,'#a6bed2','#3e566e'));
    }
    // Hip plates.
    for (let i=0;i<4;i++){ const x = -24+i*12; K.plate([[x,16],[x+12,16],[x+11,33],[x+1,33]], '#cfe0ee', '#56708a', 1.2); }
    // Breastplate with pecs, ab plates and a glowing frost rune.
    K.plate([[-34,-46],[34,-46],[28,20],[0,34],[-28,20]], '#e6f0f8', '#56708a', 2.2);
    K.line([[-26,-22],[0,-13],[26,-22]], 'rgba(18,29,43,.55)', 1.2);
    for (let r=0;r<3;r++) K.line([[-15+r*2,2+r*8],[15-r*2,2+r*8]], 'rgba(18,29,43,.45)', 1);
    abGlow(8,'#7fe0ff');
    K.line([[0,-36],[0,18]], '#7fe0ff', 2); K.line([[-12,-14],[0,-6],[12,-14]], '#7fe0ff', 1.5); K.line([[-8,6],[0,11],[8,6]], '#7fe0ff', 1.2);
    ctx.shadowBlur = 0;
    // Frost collar.
    for (let i=0;i<7;i++){ const x = -30+i*10; K.oval(x,-48,7,6,K.metal(x,-48,7,'#ffffff','#bcd8ea'),INK,0,1); }
    // Layered ice pauldrons with spikes.
    for (const s of [-1,1]){
        K.plate([[s*24,-52],[s*52,-56],[s*60,-38],[s*46,-26],[s*28,-34]], '#eef8ff', '#5f7f9c');
        K.plate([[s*30,-49],[s*52,-51],[s*54,-41],[s*32,-39]], '#ffffff', '#8fb0c8', 1);
        K.shape([[s*39,-54],[s*45,-78],[s*50,-54]], K.grad(0,-78,0,-54,[[0,'#ffffff'],[1,'#9fd8f2']]), INK, 1);
        K.shape([[s*52,-52],[s*65,-70],[s*58,-46]], K.grad(0,-70,0,-46,[[0,'#ffffff'],[1,'#9fd8f2']]), INK, 1);
        K.rivet(s*36,-41,1.5,'#bfe6ff'); K.rivet(s*48,-39,1.5,'#bfe6ff');
    }
    // Left arm: a clawed gauntlet that gathers frost during the wind-up.
    const lx = -50 - cast*10, ly = -6 - cast*30;
    K.limb([-40,-40], [-52,-18], [lx,ly], 13, '#6d88a4', { armor:'#b9d1e6', bands:1, trim:'#bfe6ff' });
    K.claw(lx, ly, -Math.PI/2 - .5 - cast*.3, '#8fa9c0', '#e8fbff');
    if (cast > .1){ abGlow(14,'#9fe9ff'); K.oval(lx-4, ly-16, 6+cast*6, 6+cast*6, 'rgba(200,245,255,.85)', null); ctx.shadowBlur = 0; }
    // Right arm and the greatsword: raised overhead on wind-up, slammed down on strike.
    const swordRot = .35 - cast*2.4 + strike*1.1;
    ctx.save(); ctx.translate(38,-40); ctx.rotate(swordRot);
    K.limb([0,0], [14,22], [10,44], 13, '#6d88a4', { armor:'#b9d1e6', bands:1, trim:'#bfe6ff' });
    K.oval(10,47,8,7,K.metal(10,47,8,'#d6e8f2','#56708a'));
    ctx.translate(10,46); ctx.rotate(-.35);
    K.inked([[0,10],[0,-12]], '#5a3e28', 5);
    for (let i=0;i<4;i++) K.line([[-2.5,6-i*5],[2.5,3-i*5]], '#c9a26a', 1);
    K.oval(0,13,4,4,'#9fe9ff',INK,0,1);
    K.plate([[-18,-12],[18,-12],[13,-19],[-13,-19]], '#eef6fb', '#5f7f9c', 1.4);
    abGlow(6,'#9fe9ff');
    K.shape([[-10,-19],[10,-19],[8,-150],[0,-172],[-8,-150]], K.grad(-10,0,10,0,[[0,'#8fd6f2'],[.5,'#f4fdff'],[1,'#6fb8d8']]), INK, 1.6);
    ctx.shadowBlur = 0;
    K.line([[0,-24],[0,-150]], 'rgba(60,120,160,.55)', 1.8);
    for (let i=0;i<4;i++){ const y = -44 - i*28; K.line([[-4,y],[0,y-6],[4,y]], 'rgba(127,224,255,.85)', 1.2); }
    ctx.restore();
    // Helm: ridged dome, cheek guards, glowing visor, icicle crown and a frozen beard.
    K.plate([[-18,-84],[18,-84],[20,-60],[0,-50],[-20,-60]], '#dbe8f3', '#4f6a86', 2);
    K.line([[0,-84],[0,-74]], 'rgba(18,29,43,.6)', 1.2);
    K.shape([[-14,-74],[14,-74],[12,-66],[-12,-66]], '#08111c', INK, 1);
    abGlow(8,'#7fe0ff'); K.line([[-11,-70],[11,-70]], '#7fe0ff', 2.4); ctx.shadowBlur = 0;
    for (const s of [-1,1]) K.plate([[s*16,-66],[s*23,-60],[s*15,-53]], '#eef6fb', '#56708a', 1);
    for (let i=0;i<5;i++){
        const x = -16+i*8, h = [14,20,28,20,14][i] + Math.sin(t*2+i)*1.5;
        K.shape([[x-4,-84],[x,-84-h],[x+4,-84]], K.grad(0,-84-h,0,-84,[[0,'#ffffff'],[1,'#a6dcf2']]), INK, 1);
    }
    for (let i=0;i<5;i++) K.shape([[-14+i*7,-56],[-10.5+i*7,-42-(i%2)*6],[-7+i*7,-56]], '#f2fbff', INK, .9);
    if (visualMode !== 'minimal'){ const m = (t*.8)%1; ctx.globalAlpha = (1-m)*.35; K.oval(16+m*20,-60-m*10,6+m*8,4+m*5,'#eaf8ff',null); ctx.globalAlpha = 1; }
    ctx.restore(); K.ink(prevInk);
}

function drawHorologue(b){
    const K = BossKit, t = worldTime/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const frozen = b.timeStop > 0, INK = '#22140a', prevInk = K.ink(INK);
    const brass = (x,y,r) => K.metal(x,y,r,'#f6d58c','#7a5220');
    ctx.save(); ctx.translate(b.x, b.y + Math.sin(t*1.8)*5); ctx.rotate(hit*.04); ctx.lineJoin = 'round';
    // Halo of roman ticks behind the head.
    ctx.save(); ctx.translate(0,-66); ctx.rotate(-t*.2);
    K.runeRing(50, 0, 24, 'rgba(242,196,107,.65)');
    for (let i=0;i<12;i++){ const q = i*AB_TAU/12; K.inked([[Math.cos(q)*41,Math.sin(q)*41],[Math.cos(q)*53,Math.sin(q)*53]], '#f2c46b', i%3 ? 1.4 : 3); }
    ctx.restore();
    // A brass cage hangs below the body; the pendulum swings inside it and stops while time is stopped.
    const swing = frozen ? 0 : Math.sin(t*2.4)*.35;
    for (let i=-3;i<=3;i++) K.inked([[i*9,38],[i*15,100]], '#b8893a', 2);
    ctx.save(); ctx.translate(0,34); ctx.rotate(swing);
    K.inked([[0,0],[0,104]], '#c99a46', 3.5);
    K.oval(0,118,18,18,brass(0,118,18),INK,0,2);
    K.oval(0,118,11,11,null,'rgba(60,35,10,.6)',0,1);
    for (let i=0;i<8;i++){ const q = i*AB_TAU/8; K.line([[Math.cos(q)*4,118+Math.sin(q)*4],[Math.cos(q)*9,118+Math.sin(q)*9]], 'rgba(60,35,10,.6)', 1); }
    K.oval(-5,113,5,5,'rgba(255,255,255,.45)',null);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0,100,46,7,0,0,AB_TAU); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#d9a75c'; ctx.lineWidth = 3; ctx.stroke();
    // Gear wings on brass struts.
    const gs = frozen ? 0 : t*(1+strike);
    for (const s of [-1,1]){
        const tip1 = [s*(110+cast*20), -80-cast*20], tip2 = [s*(118+cast*14), 20-cast*10];
        K.line([tip1, tip2], 'rgba(232,192,122,.5)', 1);
        K.inked([[s*50,-40], tip1], '#e8c07a', 3.5); K.inked([[s*60,4], tip2], '#e8c07a', 2.8);
        K.shape([[tip1[0],tip1[1]-5],[tip1[0]+s*12,tip1[1]-2],[tip1[0],tip1[1]+5]], brass(tip1[0],tip1[1],6), INK, 1);
        K.shape([[tip2[0],tip2[1]-4],[tip2[0]+s*10,tip2[1]],[tip2[0],tip2[1]+4]], brass(tip2[0],tip2[1],6), INK, 1);
        abGear(s*56,-42,24,10,gs*s,brass(s*56,-42,28),INK);
        abGear(s*74,6,16,8,-gs*s*1.5,K.metal(s*74,6,18,'#e0b468','#5a3a14'),INK);
        K.oval(s*56,-42,5,5,'#3b250d',INK); K.rivet(s*74,6,2.6,'#e8c07a');
    }
    // Arms wield clock-hand blades that sweep on strike.
    for (const s of [-1,1]){
        const ang = s*(.6 + cast*.9 - strike*1.4);
        ctx.save(); ctx.translate(s*30,-30); ctx.rotate(ang);
        K.limb([0,0], [s*12,26], [s*8,48], 8, '#8a6230', { armor:'#e0b468' });
        ctx.translate(s*8,48); ctx.rotate(-s*.8);
        K.shape([[-3.5,0],[3.5,0],[2.6,-70],[0,-86],[-2.6,-70]], s < 0 ? K.metal(0,-40,20,'#6a4a22','#2a1808') : brass(0,-40,20), INK, 1.4);
        K.oval(0,-62,4.5,4.5,s < 0 ? '#e8c07a' : '#3b250d',INK,0,1);
        K.oval(0,0,5,5,brass(0,0,5),INK,0,1.2);
        ctx.restore();
    }
    // Shoulder plates and collar.
    for (const s of [-1,1]){ K.plate([[s*20,-40],[s*40,-43],[s*45,-28],[s*30,-22]], '#f6d58c', '#7a5220'); K.rivet(s*34,-34,1.5,'#fff0c0'); }
    K.plate([[-14,-46],[14,-46],[10,-38],[-10,-38]], '#f6d58c', '#7a5220', 1.2);
    // Clock-face torso in a riveted brass case; the hands spin faster during attacks.
    K.oval(0,0,46,46,brass(0,0,46),INK,0,2.2);
    for (let i=0;i<12;i++){ const q = i*AB_TAU/12 + AB_TAU/24; K.rivet(Math.cos(q)*42, Math.sin(q)*42, 1.6, '#fff0c0'); }
    K.oval(0,0,38,38,K.grad(0,-38,0,38,[[0,'#fffaf0'],[1,'#e6d8b8']]),INK,0,1.6);
    K.oval(0,0,33,33,null,'rgba(59,37,13,.35)',0,.8);
    for (let i=0;i<12;i++){ const q = i*AB_TAU/12; K.line([[Math.cos(q)*29,Math.sin(q)*29],[Math.cos(q)*36,Math.sin(q)*36]], '#3b250d', i%3 ? 1.4 : 3); }
    // Sub-dial.
    K.oval(0,15,7,7,'#f2e6c8','rgba(59,37,13,.6)',0,.8);
    const spin = frozen ? 0 : t*(.3 + strike*3);
    K.line([[0,15],[Math.cos(spin*2)*5,15+Math.sin(spin*2)*5]], '#3b250d', 1);
    K.inked([[0,0],[Math.cos(spin*.2-Math.PI/2)*20,Math.sin(spin*.2-Math.PI/2)*20]], '#3b250d', 2.6);
    K.inked([[0,0],[Math.cos(spin-Math.PI/2)*30,Math.sin(spin-Math.PI/2)*30]], '#8a2424', 1.4);
    K.oval(0,0,4.5,4.5,brass(0,0,5),INK,0,1);
    // Porcelain mask with a single eye that dilates as it winds up, gold tear lines and a grille mouth.
    K.shape([[-14,-80],[14,-80],[17,-62],[10,-46],[-10,-46],[-17,-62]], K.metal(0,-64,18,'#ffffff','#d8cfbc'), INK, 1.6);
    K.line([[-14,-80],[0,-84],[14,-80]], 'rgba(138,106,46,.7)', 1.2);
    abGlow(10,'#ffcf6a'); K.oval(0,-66,5+cast*3,5+cast*3,frozen ? '#9fd7ff' : '#ffcf6a',INK,0,1); ctx.shadowBlur = 0;
    K.oval(0,-66,2,2,'#3b250d',null);
    for (const s of [-1,1]) K.line([[s*7,-60],[s*8,-52],[s*7,-47]], 'rgba(217,167,92,.8)', 1);
    K.shape([[-5,-53],[5,-53],[4,-48],[-4,-48]], '#3b250d', INK, .8);
    for (let i=-1;i<=1;i++) K.line([[i*2.4,-53],[i*2.4,-48]], '#d9a75c', .7);
    if (frozen){
        ctx.strokeStyle = 'rgba(159,215,255,.6)'; ctx.lineWidth = 2; ctx.setLineDash([4,6]);
        ctx.beginPath(); ctx.arc(0,0,110,0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore(); K.ink(prevInk);
}
const ABYSS_DRAW = { selene:drawSelene, vael:drawVael, horologue:drawHorologue };

// ================================================================
//  DRAW HOOKS
// ================================================================
drawHazards = function(){
    abBase.drawHazards();
    const t = worldTime;
    for (const h of abyss.hazards){
        ctx.save();
        if (h.kind === 'strike'){
            if (h.warn > 0){
                const k = 1 - h.warn/h.warnMax;
                ctx.globalAlpha = .7; ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.setLineDash([6,5]);
                ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
                ctx.globalAlpha = .18 + k*.22; ctx.fillStyle = h.color;
                ctx.beginPath(); ctx.arc(h.x,h.y,h.r*k,0,AB_TAU); ctx.fill();
                if (h.ghost){ ctx.globalAlpha = .35; ctx.strokeStyle = '#f2c46b'; ctx.beginPath(); ctx.arc(h.x,h.y,40,0,AB_TAU); ctx.stroke(); }
            } else {
                const k = 1 - h.life/h.lifeMax;
                ctx.globalAlpha = 1-k;
                if (h.style === 'moon'){
                    const pg = ctx.createLinearGradient(h.x,0,h.x,h.y);
                    pg.addColorStop(0,'rgba(207,227,255,0)'); pg.addColorStop(1,'rgba(230,242,255,.8)');
                    ctx.fillStyle = pg; ctx.fillRect(h.x-h.r*.45*(1-k*.5), 0, h.r*.9*(1-k*.5), h.y);
                    ctx.fillStyle = '#eef6ff'; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r*(.6+k*.5),h.r*.3*(.6+k*.5),0,0,AB_TAU); ctx.fill();
                } else if (h.style === 'ice'){
                    const rise = Math.min(1, k*4);
                    for (let i=0;i<4;i++){
                        const ox = (i-1.5)*h.r*.45, hh = h.r*(1.2+abHash(i+h.x)*.8)*rise;
                        abShape([[h.x+ox-7,h.y+6],[h.x+ox+(i-1.5)*3,h.y-hh],[h.x+ox+7,h.y+6]], '#dff6ff', '#ffffff', 1);
                    }
                } else {
                    ctx.strokeStyle = h.color; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.arc(h.x,h.y,h.r*(.6+k*.6),0,AB_TAU); ctx.stroke();
                    abLine([[h.x,h.y],[h.x+Math.cos(t*.01)*h.r*.6,h.y+Math.sin(t*.01)*h.r*.6]], h.color, 3);
                }
            }
        } else if (h.kind === 'well'){
            const reach = h.r*2.4;
            if (h.warn > 0){
                ctx.globalAlpha = .6; ctx.strokeStyle = h.color; ctx.setLineDash([5,6]); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(h.x,h.y,reach*(h.warn/h.warnMax)+h.r*.4,0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
            } else {
                const fade = Math.min(1, h.life/400);
                ctx.globalAlpha = .25*fade; ctx.strokeStyle = h.color; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(h.x,h.y,reach,0,AB_TAU); ctx.stroke();
                for (let i=0;i<4;i++){
                    const r = reach*(1-((t*.0006+i/4)%1));
                    ctx.globalAlpha = .45*fade*(1-r/reach); ctx.beginPath(); ctx.arc(h.x,h.y,r,t*.004+i,t*.004+i+2.2); ctx.stroke();
                }
                ctx.globalAlpha = .9*fade; abOval(h.x,h.y,h.r*.4,h.r*.4,'#04101e');
                ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*.4,0,AB_TAU); ctx.stroke();
            }
        } else if (h.kind === 'beam'){
            const tx = h.x+Math.cos(h.angle)*h.len, ty = h.y+Math.sin(h.angle)*h.len;
            if (h.warn > 0 && h.skull && h.skull.age < 0){ /* blaster not summoned yet */ }
            else if (h.warn > 0 && h.lockAt != null && h.warn <= h.lockAt){
                // Locked on: a solid, widening line shows exactly where the beam will fire.
                const k = 1 - h.warn/h.lockAt;
                ctx.globalAlpha = .45 + .3*Math.sin(worldTime*.03); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 + k*h.width*.35;
                ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(tx,ty); ctx.stroke();
            } else if (h.warn > 0){
                ctx.globalAlpha = .55*(1-h.warn/h.warnMax)+.15; ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.setLineDash([10,8]);
                ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(tx,ty); ctx.stroke(); ctx.setLineDash([]);
            } else if (h.glitchy){
                const grow = Math.min(1, (h.lifeMax - h.life)/80), w = h.width*grow*Math.min(1, h.life/130);
                const j = visualMode === 'minimal' ? 0 : random(-2,2);
                ctx.globalAlpha = .55; abLine([[h.x+j,h.y],[tx+j,ty]], '#b63cff', w + 12);
                ctx.globalAlpha = .75; abLine([[h.x-j,h.y],[tx-j,ty]], '#00f0ff', w + 3);
                ctx.globalAlpha = 1; abLine([[h.x,h.y],[tx,ty]], '#ffffff', w*.7);
                const nx = Math.cos(h.angle), ny = Math.sin(h.angle);
                for (let k=0;k<(h.big ? 22 : 10);k++){
                    const d = random(0, 1000), o = random(-1,1)*(w/2 + 6);
                    ctx.fillStyle = ['#00f0ff','#b63cff','#07050c','#ffffff'][k%4];
                    ctx.fillRect(h.x + nx*d - ny*o, h.y + ny*d + nx*o, random(3,10), 3);
                }
            } else {
                ctx.globalAlpha = Math.min(1, h.life/300);
                abGlow(10, h.color); abLine([[h.x,h.y],[tx,ty]], h.color, h.width); ctx.shadowBlur = 0;
                abLine([[h.x,h.y],[tx,ty]], 'rgba(255,255,255,.85)', h.width*.3);
            }
        } else if (h.kind === 'ring' && !(h.delay > 0)){
            ctx.globalAlpha = .85; ctx.strokeStyle = h.color; ctx.lineWidth = h.band;
            ctx.beginPath(); ctx.arc(h.x,h.y,h.r,h.gap+h.gapWidth/2,h.gap-h.gapWidth/2+AB_TAU); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.stroke();
        } else if (h.kind === 'gear'){
            if (h.warn > 0){
                const ex = h.vx > 0 ? 24 : canvas.width-24, dir = Math.sign(h.vx);
                ctx.globalAlpha = .5+.4*(1-h.warn/h.warnMax);
                abShape([[ex-dir*14,h.y-h.r*.6],[ex+dir*12,h.y],[ex-dir*14,h.y+h.r*.6]], h.color);
                ctx.globalAlpha = .25; ctx.fillStyle = h.color; ctx.fillRect(Math.min(ex, ex+dir*canvas.width), h.y-2, canvas.width, 4);
            } else abGear(h.x,h.y,h.r,10,h.rot,'#a87a3a','#3b250d');
        } else if (h.kind === 'skull'){
            if (h.age >= 0) drawBlasterSkull(h);
        } else if (h.kind === 'zone'){
            drawCorruptedZone(h);
        } else if (h.kind === 'portal'){
            const open = Math.min(1, (h.lifeMax - h.life)/300) * Math.min(1, h.life/300);
            ctx.fillStyle = '#07050c'; ctx.fillRect(h.x - 14*open, h.y - 5, 28*open, 10);
            ctx.fillStyle = '#b63cff'; ctx.fillRect(h.x - 14*open, h.y - 6, 28*open, 2);
            ctx.fillStyle = '#00f0ff'; ctx.fillRect(h.x - 14*open, h.y + 4, 28*open, 2);
        } else if (h.kind === 'marker'){
            const k = h.life/h.lifeMax;
            ctx.globalAlpha = .6; ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.setLineDash([8,6]);
            ctx.beginPath(); ctx.arc(h.x,h.y,h.r*(.7+.3*k),0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
    }
};

function drawAbyssShots(alpha=1){
    const t = worldTime;
    for (const s of abyss.shots){
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(s.x,s.y);
        const col = s.frozen ? '#9fb3c8' : s.color;
        abGlow(6, col);
        if (s.delay > 0){
            // Glitch Rain: the portal brightens just before the cube drops.
            const k = clamp(1 - s.delay/450, 0, 1);
            ctx.globalAlpha = alpha*(.25 + k*.75); ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, 8, 6, 30*k);
            ctx.restore(); continue;
        }
        if (s.kind === 'bone'){
            ctx.rotate(s.angle);
            if (s.warn > 0){
                ctx.globalAlpha = alpha*.35; ctx.strokeStyle = s.curve ? '#00f0ff' : '#ffffff'; ctx.setLineDash([5,5]);
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(140,0); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = alpha;
            }
            const L = s.len/2;
            ctx.fillStyle = s.curve ? '#b9f9ff' : '#f2f0ff';
            ctx.fillRect(-L,-3,s.len,6); ctx.fillRect(-L-3,-6,6,5); ctx.fillRect(-L-3,1,6,5); ctx.fillRect(L-3,-6,6,5); ctx.fillRect(L-3,1,6,5);
            ctx.fillStyle = s.curve ? '#00f0ff' : '#b63cff'; ctx.fillRect(-L+5+((worldTime/80|0)%3)*5,-3,4,6);
        } else if (s.kind === 'cube'){
            ctx.rotate(Math.round(s.age/120)*Math.PI/4);
            ctx.fillStyle = '#07050c'; ctx.fillRect(-9,-9,18,18);
            ctx.fillStyle = (s.age/160|0)%2 ? '#00f0ff' : '#b63cff'; ctx.fillRect(-7,-7,14,14);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-3,-3,5,5);
        } else if (s.kind === 'gorb'){
            ctx.fillStyle = 'rgba(182,60,255,.35)'; ctx.fillRect(-9,-9,18,18);
            ctx.fillStyle = '#b63cff'; ctx.fillRect(-6,-6,12,12); ctx.fillStyle = '#ffffff'; ctx.fillRect(-2,-2,5,5);
        } else if (s.kind === 'crescent'){
            ctx.rotate(s.age*.012);
            ctx.beginPath(); ctx.arc(0,0,s.r,-1.4,1.4); ctx.arc(-s.r*.45,0,s.r*.85,1.2,-1.2,true); ctx.closePath();
            ctx.fillStyle = col; ctx.fill();
        } else if (s.kind === 'icicle'){
            ctx.rotate(Math.atan2(s.vy,s.vx));
            abShape([[s.r*2.2,0],[0,-s.r*.6],[-s.r*1.4,0],[0,s.r*.6]], col, '#ffffff', 1);
        } else if (s.kind === 'snow'){
            abOval(0,0,s.r,s.r,'rgba(244,251,255,.9)'); abOval(-s.r*.3,-s.r*.3,s.r*.35,s.r*.35,'#ffffff');
        } else if (s.kind === 'bolt'){
            ctx.rotate(s.frozen ? t*.002 : Math.atan2(s.vy,s.vx));
            abShape([[s.r*2,0],[0,-s.r*.5],[-s.r*1.2,0],[0,s.r*.5]], col, '#3b250d', 1);
            if (s.frozen){ ctx.strokeStyle = 'rgba(159,215,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,0,s.r*1.6,0,AB_TAU); ctx.stroke(); }
        } else {
            abOval(0,0,s.r,s.r,col);
            ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0,0,s.r*.6,0,AB_TAU); ctx.stroke();
        }
        ctx.restore();
    }
}
drawProjectiles = function(){
    abBase.drawProjectiles();
    drawAbyssShots();
    const t = worldTime;
    for (const s of abyss.playerShots){
        ctx.save(); ctx.translate(s.x,s.y); abGlow(8, '#cfe3ff');
        if (s.kind === 'glaive'){
            ctx.rotate(s.age*.03);
            for (const k of [0,Math.PI]){ ctx.save(); ctx.rotate(k);
                ctx.beginPath(); ctx.arc(0,0,16,-1.3,1.3); ctx.arc(-6,0,13,1.2,-1.2,true); ctx.closePath(); ctx.fillStyle = '#e4eeff'; ctx.fill(); ctx.restore(); }
            abOval(0,0,4,4,'#9fe3ff');
        } else if (s.kind === 'lance'){
            ctx.rotate(Math.atan2(s.vy,s.vx));
            ctx.globalAlpha = .35; abLine([[-50,0],[0,0]], '#8fe8ff', 6); ctx.globalAlpha = 1;
            abShape([[24,0],[4,-6],[-20,-2],[-20,2],[4,6]], '#c8f4ff', '#ffffff', 1);
        } else if (s.kind === 'chrono'){
            ctx.shadowColor = '#f2c46b'; abOval(0,0,7,7,'#f2c46b'); abOval(0,0,4,4,'#fff6dc');
            abLine([[0,0],[Math.cos(t*.02)*4,Math.sin(t*.02)*4]], '#3b250d', 1);
        }
        ctx.restore();
    }
};

drawTwoFacedDemon = function(){
    abBase.drawTwoFacedDemon();
    const t = worldTime;
    // Enrage aura: embers orbit any early boss below 25% HP.
    const active = activeBoss();
    if (active && active !== abyss.boss && active.hp/active.maxHp < .25){
        const c = active.head || active, r = (active.radius || 88) + 26;
        ctx.save();
        for (let i=0;i<8;i++){
            const q = t*.0025 + i*AB_TAU/8;
            ctx.globalAlpha = .55; abOval(c.x+Math.cos(q)*r, c.y+Math.sin(q)*r*.7, 3.5, 3.5, '#ff6a4d');
        }
        ctx.restore();
    }
    if (abyss.boss){
        const b = abyss.boss;
        ctx.save();
        if (b.state === 'emerge') ctx.globalAlpha = clamp(1 - b.stateTimer/1800 + .2, 0, 1);
        ABYSS_DRAW[b.kind](b);
        ctx.restore();
    }
    for (const f of abyss.fx){
        const k = f.age/f.life;
        ctx.save();
        if (f.kind === 'portal'){
            const open = Math.sin(Math.min(1,k)*Math.PI);
            ctx.translate(f.x,f.y); ctx.globalAlpha = open*.8;
            const pg = ctx.createLinearGradient(0,-400,0,0);
            pg.addColorStop(0,'rgba(255,255,255,0)'); pg.addColorStop(1,f.color);
            ctx.fillStyle = pg; ctx.globalAlpha = open*.25; ctx.fillRect(-40*f.scale*open,-400,80*f.scale*open,400);
            ctx.globalAlpha = open*.8;
            for (let i=0;i<3;i++){
                ctx.save(); ctx.rotate(t*.002*(i%2 ? -1 : 1)); ctx.scale(1,.35);
                ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.setLineDash([10+i*4,8]);
                ctx.beginPath(); ctx.arc(0,0,(60+i*30)*f.scale*open,0,AB_TAU); ctx.stroke(); ctx.restore();
            }
        } else if (f.kind === 'phase'){
            ctx.globalAlpha = (1-k)*.8; ctx.strokeStyle = f.color;
            for (const [d,w] of [[0,4],[.18,2]]){
                const q = clamp(k-d,0,1); ctx.lineWidth = w;
                ctx.beginPath(); ctx.arc(f.x,f.y,40+q*220,0,AB_TAU); ctx.stroke();
            }
        } else if (f.kind === 'death'){
            // The model dissolves from the bottom up while ash and a soul light rise.
            const cut = f.bottom - (f.bottom-f.top)*abEase(k);
            ctx.save(); ctx.beginPath(); ctx.rect(-1e4,-1e4,2e4,cut+1e4); ctx.clip();
            ctx.globalAlpha = 1-k*.5; ctx.translate(0,-k*14);
            if (f.index < ABYSS_INDEX) DEATH_DRAW[f.index](f.entity); else ABYSS_DRAW[f.entity.kind](f.entity);
            ctx.restore();
            ctx.globalAlpha = (1-k);
            for (let i=0;i<16;i++){
                const x = f.left + abHash(i+f.index*31)*(f.right-f.left), y = cut - ((f.age*.06 + i*13) % 46);
                ctx.fillStyle = i%3 ? f.color : '#2a2a2a'; ctx.fillRect(x, y, 3, 3);
            }
            const sy = f.y - k*170;
            const sg = ctx.createRadialGradient(f.x,sy,1,f.x,sy,24);
            sg.addColorStop(0,'rgba(255,255,255,.9)'); sg.addColorStop(1,'rgba(255,255,255,0)');
            ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(f.x,sy,24,0,AB_TAU); ctx.fill();
        } else if (f.kind === 'gghost'){
            ctx.globalAlpha = (1-k)*.45; drawGlitchSprite(f.x + random(-2,2), f.y, 1);
        } else if (f.kind === 'gbolt'){
            ctx.globalAlpha = 1-k;
            for (const [col, w] of [['#b63cff',5],['#00f0ff',2.5],['#ffffff',1]]){
                ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
                f.pts.forEach((q,i) => i ? ctx.lineTo(q.x,q.y) : ctx.moveTo(q.x,q.y)); ctx.stroke();
            }
        } else if (f.kind === 'nullray'){
            ctx.globalAlpha = 1-k;
            abLine([[f.x,f.y],[f.ex,f.ey]], '#b63cff', 14*(1-k)+2); abLine([[f.x,f.y],[f.ex,f.ey]], '#00f0ff', 6*(1-k)+1);
            abLine([[f.x,f.y],[f.ex,f.ey]], '#ffffff', 2);
        } else if (f.kind === 'shards'){
            ctx.globalAlpha = 1-k;
            for (let i=0;i<7;i++){
                const a = f.angle + Math.PI + (i-3)*.45, d = 10 + k*60;
                ctx.save(); ctx.translate(f.x+Math.cos(a)*d, f.y+Math.sin(a)*d); ctx.rotate(a);
                abShape([[8,0],[0,-3],[-5,0],[0,3]], '#dff6ff', '#ffffff', 1); ctx.restore();
            }
        }
        ctx.restore();
    }
};

drawLighting = function(){
    abBase.drawLighting();
    const w = abyss.weather;
    if (w && player){
        const fade = Math.min(1, (w.max-w.life)/600, w.life/600);
        if (w.kind === 'eclipse'){
            const hole = 190;
            const g = ctx.createRadialGradient(player.x,player.y,hole*.55,player.x,player.y,hole);
            g.addColorStop(0,'rgba(2,6,16,0)'); g.addColorStop(1,`rgba(2,6,16,${.82*fade})`);
            ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(player.x,player.y,hole,0,AB_TAU); ctx.fill();
            ctx.fillStyle = `rgba(2,6,16,${.82*fade})`;
            ctx.beginPath(); ctx.rect(0,0,canvas.width,canvas.height); ctx.arc(player.x,player.y,hole,0,AB_TAU,true); ctx.fill('evenodd');
            ctx.restore();
            // Threats stay visible through the dark.
            drawAbyssShots(.9);
            if (abyss.boss){ ctx.save(); ctx.globalAlpha = .5*fade; ABYSS_DRAW[abyss.boss.kind](abyss.boss); ctx.restore(); }
        } else if (w.kind === 'blizzard'){
            ctx.save(); ctx.fillStyle = `rgba(220,240,255,${.12*fade})`; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
        }
    }
    drawGlitchErrors();
    if (abyss.boss && abyss.boss.timeStop > 0){
        ctx.save(); ctx.fillStyle = 'rgba(120,150,190,.12)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    }
};

// ================================================================
//  THE GLITCH — ninth boss, unlocked after Horologue
//  Four phases, 100,000 HP, and every hit deals 400 damage. Attacks:
//  Glitch Bones, Corrupted Blasters, Reality Distortion, Glitch Rain,
//  Error Barrage, NULL BEAM, and a final tracking NULL BEAM at 10% HP.
// ================================================================
LOCATIONS.push({ name:'The Null Sector', title:'The Glitch — Error in Reality', color:'#b63cff',
    lore:'When Horologue’s clock struck midnight, the trials should have ended. They did not. Something that was never written slipped through the gap between one hour and the next: a shadow made of every boss that was ever deleted. It has no name, so the world calls it what it is.',
    tip:'Every hit deals 400 damage. Warnings always come first: aim lines, red outlines, glowing portals and a marker where it will appear next.' });
ABYSS_EPILOGUES.push('THE GLITCH collapses into static. The error is resolved, and the world finally saves.');
const GLITCH_ERRORS = ['FATAL ERROR 0x0000G1TCH', 'reality.dll NOT FOUND', 'SEGMENTATION FAULT (core dumped)',
    'player.exe IS NOT RESPONDING', 'NullReferenceException: hope', 'STACK OVERFLOW IN SECTOR 7',
    'ERR: ENTITY OUT OF BOUNDS', 'ACCESS VIOLATION AT 0xDEADBEEF', 'WORLD SAVE CORRUPTED', 'UNHANDLED EXCEPTION: YOU'];
const glitchCanvas = document.createElement('canvas'); glitchCanvas.width = 200; glitchCanvas.height = 220;
const gx = glitchCanvas.getContext('2d');
let glitchCorruption = 0, glitchPulseOn = false;

function glitchPoint(){
    for (let i=0;i<30;i++){
        const x = random(100, canvas.width-100), y = random(130, canvas.height*.5);
        if (Math.hypot(x-player.x, y-player.y) > 220) return { x, y };
    }
    return { x:clamp(player.x + (player.x < canvas.width/2 ? 280 : -280), 100, canvas.width-100), y:clamp(player.y-240, 130, canvas.height*.5) };
}
function glitchTeleport(b, x, y){
    abyss.fx.push({ kind:'gghost', x:b.x, y:b.y, age:0, life:650 });
    const pts = [];
    for (let i=0;i<=10;i++){ const q = i/10; pts.push({ x:b.x+(x-b.x)*q + (i && i<10 ? random(-18,18) : 0), y:b.y+(y-b.y)*q + (i && i<10 ? random(-18,18) : 0) }); }
    abyss.fx.push({ kind:'gbolt', pts, age:0, life:240 });
    particle(b.x, b.y, '#b63cff', 18, 5, .6); particle(x, y, '#00f0ff', 18, 5, .6);
    b.x = x; b.y = y; b.lastTp = worldTime;
}
function glitchErrors(n){
    for (let i=0;i<n;i++) abyss.errors.push({ x:random(.08,.68), y:random(.22,.72), text:GLITCH_ERRORS[Math.floor(Math.random()*GLITCH_ERRORS.length)], life:1300, max:1300 });
}
function glitchBones(b){
    const n = 4 + b.phase;
    for (let i=0;i<n;i++){
        const a = -Math.PI/2 + (i-(n-1)/2)*.42 + random(-.08,.08), r = random(80,110);
        abShot(b.x+Math.cos(a)*r, b.y+Math.sin(a)*r*.8, 0, 0, 200, 8, 'bone', '#f2f0ff', 4500,
            { warn:600+i*60, speed:6.6+b.phase*.45, curve:i%2 === 1, homingT:1100, len:26 });
    }
}
function glitchBlasters(b){
    const n = [0,2,3,3,5][b.phase], base = random(0, AB_TAU);
    for (let i=0;i<n;i++){
        const a = base + i*AB_TAU/n + random(-.3,.3), r = random(270,320);
        const x = clamp(player.x + Math.cos(a)*r, 40, canvas.width-40), y = clamp(player.y + Math.sin(a)*r, 110, GROUND()-30);
        const delay = i*260;
        const skull = { kind:'skull', x, y, age:-delay, life:delay+1150+420+300 };
        const beam = { kind:'beam', x, y, angle:angleTo({x,y},player), len:1800, width:40, warn:1150+delay, warnMax:1150+delay, lockAt:650,
            life:420, lifeMax:420, dmg:200, color:'#e9e6ff', glitchy:true, skull };
        skull.beam = beam;
        abyss.hazards.push(beam, skull);
    }
}
function glitchRain(b){
    const cols = 12, waves = b.phase >= 4 ? 4 : 3, gap = b.phase >= 4 ? 600 : 760, top = 110;
    const pattern = ['walls','diagonal','wave'][Math.floor(Math.random()*3)];
    const xs = Array.from({ length:cols }, (_,i) => 40 + (canvas.width-80)*i/(cols-1));
    for (const x of xs) abyss.hazards.push({ kind:'portal', x, y:top, life:700 + waves*gap + 900, lifeMax:700 + waves*gap + 900 });
    for (let w=0; w<waves; w++){
        const gapAt = Math.floor(random(1, cols-2));
        xs.forEach((x,i) => {
            let d = 0;
            if (pattern === 'walls' && Math.abs(i-gapAt) <= (b.phase >= 4 ? 0 : 1)) return;
            if (pattern === 'diagonal') d = (w%2 ? cols-1-i : i)*70;
            if (pattern === 'wave' && i%2 !== w%2) return;
            abShot(x, top+8, Math.PI/2, 0, 200, 8, 'cube', '#00f0ff', 7000, { delay:700 + w*gap + d, speed:5.4 + b.phase*.35,
                launchVx:pattern === 'diagonal' ? (w%2 ? -1.8 : 1.8) : 0, wobble:pattern === 'wave' ? random(0,6) : null });
        });
    }
}
ABYSS_ATTACKS.glitch = [
    { id:'bones', label:'GLITCH BONES', phase:1, telegraph:450, duration:1800,
      fire(b){ glitchBones(b); b.data.wave = 1; b.tick = 0; },
      tick(b,dt){ b.tick += dt; if (b.data.wave < (b.phase >= 4 ? 3 : 2) && b.tick >= 700){ b.tick = 0; b.data.wave++; glitchBones(b); } } },
    { id:'blasters', label:'CORRUPTED BLASTERS', phase:1, telegraph:400, duration:2600, fire(b){ glitchBlasters(b); } },
    { id:'distortion', label:'REALITY DISTORTION', phase:2, telegraph:350, duration:3000,
      fire(b){ b.data.n = 0; b.tick = 1e9; },
      tick(b,dt){
          const count = b.phase >= 4 ? 8 : 5, gap = b.phase >= 4 ? 330 : 450, size = b.phase >= 4 ? 150 : 120;
          b.tick += dt;
          if (b.data.n < count && b.tick >= gap){
              b.tick = 0; b.data.n++;
              const old = { x:b.x, y:b.y }, p = glitchPoint();
              glitchTeleport(b, p.x, p.y);
              abyss.hazards.push({ kind:'zone', x:old.x-size/2, y:old.y-size/2, w:size, h:size, warn:700, warnMax:700, life:3200, lifeMax:3200, dmg:200 });
          }
      } },
    { id:'rain', label:'GLITCH RAIN', phase:2, telegraph:500, duration:3200, fire(b){ glitchRain(b); } },
    { id:'barrage', label:'ERROR BARRAGE', phase:3, telegraph:300, duration:4800,
      fire(b){ b.hold = true; b.data.k = 0; b.tick = 0; },
      tick(b,dt){
          const count = b.phase >= 4 ? 9 : 6, gap = b.phase >= 4 ? 470 : 600;
          b.tick += dt;
          if (b.data.k >= count) return;
          if (!b.data.next && b.tick >= gap-370){
              const a = random(0, AB_TAU);
              b.data.next = { x:clamp(player.x+Math.cos(a)*240, 70, canvas.width-70), y:clamp(player.y+Math.sin(a)*240, 120, GROUND()-40) };
              abyss.hazards.push({ kind:'marker', x:b.data.next.x, y:b.data.next.y, r:60, life:370, lifeMax:370, color:'#ff2d6f' });
          }
          if (b.data.next && b.tick >= gap){
              glitchTeleport(b, b.data.next.x, b.data.next.y);
              const a = angleTo(b, player);
              for (let i=0;i<5;i++){ const s = a + (i-2)*.17;
                  abShot(b.x+Math.cos(s)*34, b.y+Math.sin(s)*34, s, 0, 200, 8, 'bone', '#f2f0ff', 3000, { warn:200, fixedAngle:s, speed:7.4, len:26 }); }
              const off = random(0,1);
              for (let i=0;i<8;i++) abShot(b.x, b.y, off+i*AB_TAU/8, 3.1, 200, 7, 'gorb', '#b63cff', 4500);
              b.data.next = null; b.data.k++; b.tick = 0;
          }
      } },
    { id:'nullbeam', label:'NULL BEAM', phase:3, telegraph:300, duration:2900,
      fire(b){
          b.hold = true; const charge = b.phase >= 4 ? 1400 : 1650;
          abyss.hazards.push({ kind:'beam', follow:b, x:b.x, y:b.y, angle:angleTo(b,player), len:2600, width:b.phase >= 4 ? 100 : 80,
              warn:charge, warnMax:charge, lockAt:850, life:950, lifeMax:950, dmg:200, color:'#ffffff', glitchy:true, big:true });
          b.charging = charge; b.chargeMax = charge;
          showMessage('👾 THE GLITCH is charging a NULL BEAM!');
      },
      tick(b,dt){ b.charging = Math.max(0, b.charging - dt); } }
];
const GLITCH_FINAL = { id:'finalBeam', special:true, label:'FINAL NULL BEAM', phase:4, telegraph:600, duration:6800,
    fire(b){
        b.hold = true;
        glitchTeleport(b, canvas.width/2, Math.max(230, canvas.height*.32));
        glitchErrors(4);
        abyss.hazards.push({ kind:'beam', follow:b, x:b.x, y:b.y, angle:angleTo(b,player), len:2800, width:130,
            warn:2300, warnMax:2300, lockAt:0, track:.0045, life:4200, lifeMax:4200, dmg:200, color:'#ffffff', glitchy:true, big:true });
        b.charging = 2300; b.chargeMax = 2300; b.tick = 0;
        showMessage('👾 FINAL NULL BEAM. RUN.');
    },
    tick(b,dt){
        b.charging = Math.max(0, b.charging - dt); b.tick += dt;
        if (b.charging <= 0 && b.tick >= 420 && b.stateTimer > 600){
            b.tick = 0;
            const side = Math.random() < .5 ? -1 : 1;
            abShot(clamp(player.x + side*320, 40, canvas.width-40), clamp(player.y - random(40,140), 110, GROUND()-30), 0, 0, 200, 8, 'bone', '#f2f0ff', 3000,
                { warn:400, speed:7, len:26 });
        }
        if (b.stateTimer <= 0 && !b.data.done){ b.data.done = true; b.stun = 2600; showMessage('👾 THE GLITCH is rebooting. It takes 50% more damage!'); }
    } };
ABYSS_ATTACKS.glitch.push(GLITCH_FINAL);

// ---------------- THE GLITCH: model ----------------
function glitchPoints(t, c){
    const arm = Math.sin(t*.06)*4, arm2 = Math.cos(t*.05)*4, tw = i => Math.sin(t*.12 + i)*5;
    const pts = [[-10,-50],[-3,-58],[6,-55],[14,-48],[16,-36],[11,-28],[24,-24],[33,-6],[38+arm,14],[42,34],[48,42],[40,38],[43,47],[35,40],[33,34],
        [28,12],[21,-4],[19,12],[15,34],[11,52+tw(1)],[6,38],[1,56+tw(2)],[-4,38],[-8,52+tw(3)],[-12,34],[-19,12],[-22,-4],[-28,12],[-33,34],
        [-35,40],[-43,47],[-40,38],[-48,42],[-42,34],[-38+arm2,14],[-33,-6],[-24,-24],[-12,-30],[-16,-40]];
    if (c > .15) for (const p of pts) if (Math.random() < c*.25){ p[0] += random(-3,3)*c*2; p[1] += random(-3,3)*c*2; }
    return pts;
}
function glitchPath(points, ox, oy, s){
    gx.beginPath(); points.forEach(([x,y],i) => i ? gx.lineTo(ox + x*s, oy + y*s) : gx.moveTo(ox + x*s, oy + y*s)); gx.closePath();
}
function renderGlitchCanvas(b){
    const c = clamp(1 - b.hp/b.maxHp, 0, 1), s = 1.45, ox = 100, oy = 110, t = worldTime/16.67;
    const minimal = visualMode === 'minimal';
    glitchCorruption = c; glitchPulseOn = worldTime - (b.lastTp ?? -1e9) < 300;
    gx.clearRect(0, 0, 200, 220);
    const pts = glitchPoints(t, c);
    const split = 2 + Math.round(c*4) + (glitchPulseOn && !minimal ? Math.round(random(0,3)) : 0);
    gx.globalAlpha = .75;
    gx.fillStyle = '#00f0ff'; glitchPath(pts, ox - split, oy, s); gx.fill();
    gx.fillStyle = '#b63cff'; glitchPath(pts, ox + split, oy, s); gx.fill();
    gx.globalAlpha = 1;
    const hit = Math.exp(-(worldTime - b.anim.hitAt)/150);
    gx.fillStyle = hit > .5 ? '#2a2440' : '#07050c'; glitchPath(pts, ox, oy, s); gx.fill();
    gx.strokeStyle = '#3d1580'; gx.lineWidth = 1; gx.stroke();
    // Static inside the body, and missing chunks as it takes damage.
    gx.save(); glitchPath(pts, ox, oy, s); gx.clip();
    const n = (minimal ? 25 : 50) + Math.round(c*(minimal ? 40 : 120));
    for (let i=0;i<n;i++){
        gx.fillStyle = ['#ffffff','#00f0ff','#b63cff','#2a2a3a'][i%4]; gx.globalAlpha = random(.2,.8);
        gx.fillRect(Math.round(random(30,170)), Math.round(random(20,200)), Math.random() < .2 ? 3 : 1, 1);
    }
    gx.globalAlpha = 1; gx.restore();
    // Inked armour over the shadow body, in the first bosses' style: a heavy outline, shoulder
    // plates, armoured joints, glowing rib seams and a corrupted core.
    const K = BossKit, prevInk = K.ink('#000000');
    K.target(gx); gx.save(); gx.translate(ox, oy); gx.scale(s, s);
    K.shape(pts, null, '#000000', 1.8); K.shape(pts, null, 'rgba(182,60,255,.55)', .6);
    for (const sd of [-1,1]){
        K.plate([[sd*11,-31],[sd*24,-26],[sd*33,-8],[sd*22,-13]], '#3a1f6a', '#07050c', .9);
        K.line([[sd*15,-27],[sd*26,-17]], 'rgba(0,240,255,.45)', .6);
        K.joint(sd*33, -5, 3, '#1a1030', 'rgba(0,240,255,.55)');
        K.joint(sd*17, 24, 3, '#1a1030', 'rgba(182,60,255,.6)');
        K.joint(sd*40, 30, 2.4, '#1a1030', 'rgba(0,240,255,.55)');
    }
    for (let i=0;i<3;i++) K.line([[-10,-15+i*7],[0,-12+i*7],[10,-15+i*7]], 'rgba(0,240,255,.5)', .7);
    K.line([[0,-24],[0,8]], 'rgba(182,60,255,.6)', .8);
    K.shape([[0,-27],[4.5,-21.5],[0,-16],[-4.5,-21.5]], glitchPulseOn ? '#ffffff' : '#00f0ff', '#000000', .8);
    K.line([[-8,-52],[-4,-46],[-7,-41]], 'rgba(182,60,255,.6)', .7);
    gx.restore(); K.target(null); K.ink(prevInk);
    for (let i=0;i<Math.round(c*6);i++) gx.clearRect(Math.round(random(40,160)), Math.round(random(30,190)), Math.round(random(4,14)), Math.round(random(2,5)));
    // Eyes and a jagged grin burn cyan while a NULL BEAM charges.
    const glow = b.charging > 0 ? 1 - b.charging/(b.chargeMax||1) : 0;
    const eyeOff = c > .4 && Math.random() < c*.3 ? Math.round(random(-3,3)) : 0;
    gx.fillStyle = glow > 0 ? '#00f0ff' : '#ffffff';
    const ex = ox - 11, ey = oy - 58, ew = 7 + Math.round(glow*4), eh = 5 + Math.round(glow*3);
    gx.fillRect(ex, ey, ew, eh); gx.fillRect(ex + 15 + eyeOff, ey - 1 + eyeOff, ew, eh);
    gx.fillStyle = '#000000'; gx.fillRect(ex + 2, ey + 1, 2, 2); gx.fillRect(ex + 17 + eyeOff, ey + eyeOff, 2, 2);
    gx.fillStyle = glow > 0 ? '#00f0ff' : '#ffffff';
    for (let i=0;i<8;i++) gx.fillRect(ox - 13 + i*3, oy - 44 + (i%2 ? 2 : 0), 2, 3);
    if (glow > 0){ gx.globalAlpha = .4*glow; gx.fillStyle = '#00f0ff'; gx.fillRect(ox - 20, oy - 66, 40, 30); gx.globalAlpha = 1; }
}
// Draw the rendered model in horizontal slices; the slices slip sideways more as it is corrupted.
function drawGlitchSprite(x, y){
    const bx = Math.round(x - 100), by = Math.round(y - 110);
    const p = visualMode === 'minimal' ? .03 : .08 + glitchCorruption*.35 + (glitchPulseOn ? .25 : 0);
    for (let sy=0; sy<220; sy+=6){
        const dx = Math.random() < p ? Math.round(random(-1,1)*(4 + glitchCorruption*16)) : 0;
        ctx.drawImage(glitchCanvas, 0, sy, 200, 6, bx + dx, by + sy, 200, 6);
    }
}
function drawGlitch(b){
    renderGlitchCanvas(b);
    const y = b.y + Math.sin(worldTime*.003)*3;
    ctx.save();
    if (b.stun > 0) ctx.globalAlpha *= .75;
    drawGlitchSprite(b.x, y);
    if (visualMode !== 'minimal' && Math.random() < .03 + glitchCorruption*.08){
        ctx.globalAlpha *= .3; ctx.drawImage(glitchCanvas, Math.round(b.x - 100 + random(-30,30)), Math.round(y - 110 + random(-14,14)));
    }
    ctx.restore();
    if (visualMode !== 'minimal' && Math.random() < .5){
        ctx.fillStyle = ['#ffffff','#00f0ff','#b63cff'][Math.floor(Math.random()*3)];
        ctx.fillRect(Math.round(b.x + random(-50,50)), Math.round(b.y + random(-70,70)), 3, 3);
    }
    if (b.stun > 0){ ctx.save(); ctx.fillStyle = '#7ff6ff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText('REBOOTING...', b.x, b.y - 100); ctx.restore(); }
}
function drawBlasterSkull(h){
    const appear = Math.min(1, h.age/250), beam = h.beam;
    const charging = beam.warn > 0 && beam.warn <= beam.lockAt, firing = beam.warn <= 0 && beam.life > 0;
    const open = firing ? 7 : charging ? 2 + (1 - beam.warn/beam.lockAt)*5 : 0;
    ctx.save(); ctx.globalAlpha *= appear*Math.min(1, h.life/300); ctx.translate(h.x, h.y); ctx.rotate(beam.angle); ctx.scale(1.3, 1.3);
    ctx.fillStyle = '#e9e6ff'; ctx.fillRect(-14,-12,22,10-open/2); ctx.fillRect(-14,2+open/2,22,10-open/2);
    ctx.fillRect(-18,-8,4,16); ctx.fillRect(8,-10,6,8-open/2); ctx.fillRect(8,2+open/2,6,8-open/2);
    ctx.fillStyle = '#07050c'; ctx.fillRect(-6,-9,5,4); ctx.fillRect(-6,5,5,4);
    ctx.fillStyle = charging || firing ? '#00f0ff' : '#b63cff'; ctx.fillRect(-5,-8,3,2); ctx.fillRect(-5,6,3,2);
    if (charging || firing){ ctx.fillStyle = firing ? '#ffffff' : '#00f0ff'; ctx.fillRect(10,-open/2,8,open); }
    ctx.fillStyle = 'rgba(0,240,255,.5)'; ctx.fillRect(-14, -12 + ((worldTime/30|0)%22), 22, 1);
    ctx.restore();
}
function drawCorruptedZone(z){
    if (z.warn > 0){
        const k = 1 - z.warn/z.warnMax;
        ctx.globalAlpha = .7; ctx.strokeStyle = '#ff2d6f'; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
        ctx.strokeRect(z.x+1, z.y+1, z.w-2, z.h-2); ctx.setLineDash([]);
        ctx.globalAlpha = .12 + k*.18; ctx.fillStyle = '#b63cff'; ctx.fillRect(z.x + z.w*(1-k)/2, z.y + z.h*(1-k)/2, z.w*k, z.h*k);
        return;
    }
    const fade = Math.min(1, z.life/300);
    ctx.globalAlpha = .55*fade; ctx.fillStyle = '#120022'; ctx.fillRect(z.x, z.y, z.w, z.h);
    for (let i=0;i<14;i++){
        ctx.fillStyle = ['#b63cff','#00f0ff','#07050c','#ff2d6f'][i%4]; ctx.globalAlpha = random(.3,.8)*fade;
        ctx.fillRect(z.x + Math.round(random(0, z.w-10)), z.y + Math.round(random(0, z.h-3)), Math.round(random(3,12)), 3);
    }
    ctx.globalAlpha = .8*fade; ctx.strokeStyle = '#b63cff'; ctx.lineWidth = 2; ctx.strokeRect(z.x+1, z.y+1, z.w-2, z.h-2);
}
// Retro error windows: they fade in and out and never flash.
function drawGlitchErrors(){
    for (const e of abyss.errors){
        const x = e.x*canvas.width, y = e.y*canvas.height;
        ctx.save(); ctx.globalAlpha = clamp(Math.min(e.life, e.max - e.life)/200, 0, 1)*.92;
        ctx.font = "bold 13px 'Courier New', monospace"; ctx.textBaseline = 'middle';
        const tw = (ctx.measureText(e.text) || {}).width || 200;
        ctx.fillStyle = '#d4d0c8'; ctx.fillRect(x, y-26, tw+28, 50);
        ctx.fillStyle = '#0a246a'; ctx.fillRect(x+2, y-24, tw+24, 14);
        ctx.fillStyle = '#fff'; ctx.font = "bold 10px 'Courier New', monospace"; ctx.fillText('ERROR', x+6, y-17);
        ctx.fillStyle = '#000'; ctx.font = "bold 13px 'Courier New', monospace"; ctx.fillText(e.text, x+14, y+8);
        ctx.restore();
    }
}

// ---------------- The Null Sector ----------------
function bgNullSector(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime;
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#04020a'); sky.addColorStop(.6,'#120726'); sky.addColorStop(1,'#1d0b36');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    // A broken pixel moon.
    const mx = W*.78, my = H*.18;
    for (let y=-40; y<=40; y+=6) for (let x=-40; x<=40; x+=6){
        if (x*x + y*y > 1600) continue;
        const hole = ((x*7 + y*13) & 15) === 3 || (x > 10 && y < -8);
        ctx.fillStyle = hole ? '#140a26' : ((x+y) & 4 ? '#e9e4ff' : '#c9c0f0');
        ctx.fillRect(mx+x, my+y, 6, 6);
    }
    // Falling binary columns.
    ctx.font = '12px monospace'; ctx.textBaseline = 'top';
    for (let i=0; i<Math.ceil(W/46); i++){
        const sp = .02 + (i%5)*.008;
        for (let k=0; k<6; k++){
            const y = ((t*sp + i*97 + k*16) % (H+80)) - 40;
            ctx.globalAlpha = A*(k === 5 ? .35 : .06 + k*.035); ctx.fillStyle = k === 5 ? '#c8aaff' : '#8c50e6';
            ctx.fillText(((i + k + Math.floor(t/330)) & 1) ? '1' : '0', i*46 + 10, y);
        }
    }
    ctx.globalAlpha = A;
    // Floating corrupted blocks.
    for (let i=0; i<12; i++){
        const x = ((i*230 + t*.012*(i%2 ? 1 : -1)) % (W+100) + W+100) % (W+100) - 50;
        const y = 60 + (i*53 % 260) + Math.sin(t*.0012 + i)*8, sz = 14 + (i%3)*6;
        ctx.fillStyle = i%3 ? '#1b0d33' : '#24104a'; ctx.fillRect(x, y, sz, sz);
        ctx.fillStyle = 'rgba(0,240,255,.25)'; ctx.fillRect(x, y, sz, 2);
    }
    // Digital grid floor.
    ctx.fillStyle = '#0d0619'; ctx.fillRect(0, g-16, W, H-g+16);
    ctx.strokeStyle = 'rgba(182,60,255,.25)'; ctx.lineWidth = 1;
    for (let x=0; x<=W; x+=40){ ctx.beginPath(); ctx.moveTo(x, g-16); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y=g-16; y<=H; y+=14){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x=0; x<W; x+=16){ ctx.fillStyle = (x/16)%5 === 1 ? '#00f0ff' : '#b63cff'; ctx.fillRect(x, g-18, 6, 2); }
    // SYSTEM FAILURE: faint corrupted bands across the arena.
    const b = abyss.boss;
    if (b && b.kind === 'glitch' && b.phase >= 4 && visualMode !== 'minimal'){
        for (let i=0; i<5; i++){
            ctx.globalAlpha = A*random(.05,.14); ctx.fillStyle = ['#00f0ff','#b63cff','#ff2d6f','#ffffff','#000000'][i];
            ctx.fillRect(random(0,W), random(0,H), random(20,160), random(3,12));
        }
        ctx.globalAlpha = A;
    }
}
ABYSS_DRAW.glitch = drawGlitch;
ABYSS_BIOME_DRAW.nullsector = bgNullSector;
