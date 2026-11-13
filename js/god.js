// ================================================================
//  THE IDOL — ARBITER OF ALL THINGS
//  The final boss, unlocked after The Architect falls. 5,000,000 HP and
//  four phases. It runs on the hard-boss framework in abyss.js and adds
//  nine attacks drawn from a shuffled deck, so every cycle uses them all
//  in a new order:
//    Judgement Beam      a colossal beam down the centre of the arena
//    Glitch Lasers       three locking lasers; the Infinity Edge beam blocks them
//    Heaven Cleaver      huge crescent slashes across the arena
//    Stilled Heavens     a swarm of projectiles that freeze, then all aim at you
//    Divine Winter       a blizzard and huge icicles bursting from the ground
//    Storm at World's Edge  lightning over the edges; only the middle is safe
//    Sundering           the arena is cut in half and one half falls away
//    Heaven's Mirror     the arena shrinks and mirror clones fire at you
//    Seraph Choir        minions track your height, stop, and fire flaming lasers
//  Its look: a faceless crowned figure of white marble and gold, a cracked
//  halo of rotating rings, six wings of light, and a void-black face with a
//  single burning eye. All art is Canvas geometry driven by simulation time,
//  so pausing freezes every pose. Flashes stay local, never full-screen.
// ================================================================
const GOD_INDEX = BOSS_NAMES.length;   // 12
const GOD_WEAPON = weapons.length;
const G_GOLD = '#ffd66b', G_WHITE = '#fff8e6', G_HALO = '#ffe9a8', G_VOID = '#08050f';
const G_GLITCH = '#ff2a6d', G_CYAN = '#2af6ff', G_ICE = '#cdf3ff', G_FIRE = '#ff7a1f', G_BOLT = '#fff27a', G_ROSE = '#ff9ec7';
const G_TAU = Math.PI*2;

// ---------------- Location, lore and data ----------------
LOCATIONS.push({ name:'The Throne Beyond Heaven', title:'The Idol — Arbiter of All Things', color:G_GOLD,
    lore:'The Architect thought it wrote the first page. It never asked who handed it the pen. Beyond the last sky, on a throne of light, something older watched every trial, every boss and every ending. It has no name because nothing existed to name it. Now that you have unwritten its author, it rises to judge you itself.',
    tip:'Leave the centre when the Judgement Beam gathers. Hold the Infinity Edge beam between you and a glitch laser to block it. Stand in the middle when lightning crawls along the edges, and cross to the safe half when the world splits.' });
ABYSS_EPILOGUES.push('The halo shatters and the light goes quiet. Beyond heaven there is only open sky now, and it belongs to no one.');
BOSS_NAMES.push('The Idol');
// The Idol drops no crafting material: its rewards are the weapon and the artifact.
BOSS_DROPS.push([]);
Object.assign(ARTIFACTS, {
    god_eye:{ name:'Eye of the Arbiter', icon:'👁', color:G_GOLD, boss:'The Idol', desc:'+30% damage dealt and 20% less damage taken.' }
});
weapons.push({ name:'Verdict of Heaven', damage:9000, cooldown:700, mana:30, color:G_GOLD, category:'magic' });
while (weaponAdaptation.length < weapons.length){ weaponAdaptation.push(0); weaponAdaptTurned.push(false); }
{
    const el = document.createElement('button');
    el.className = 'weapon hidden'; el.dataset.id = GOD_WEAPON; el.type = 'button';
    el.innerHTML = `<span class="name">${weapons[GOD_WEAPON].name}</span><span class="adapt">Adapt: <span id="adapt${GOD_WEAPON}">0%</span></span>`;
    el.onclick = () => { if (inventory.includes(GOD_WEAPON)){ weapon = GOD_WEAPON; updateWeaponUI(); } };
    document.getElementById('weapons').appendChild(el);
}
ABYSS_DEFS.god = { hp:10000000, radius:84, biome:'heaven', css:'god', contact:110, dmgMult:6.25, cooldown:1150,
    reward:{ weapon:GOD_WEAPON, artifact:'god_eye', maxHp:1000 },
    phases:[.75,.5,.25], phaseNames:['', 'GENESIS', 'REVELATION', 'JUDGEMENT', 'APOTHEOSIS'],
    phaseLines:['', '', '✦ The Idol opens its eye. The heavens answer.', '✦ The halo cracks. Judgement falls without mercy.', '✦ APOTHEOSIS. The Idol unmakes the world around you.'] };
ABYSS_KIND.push('god');

// ---------------- Runtime state and helpers ----------------
const god = { shots:[], hazards:[], fx:[], clones:[], minions:[], arena:null, playerShots:[], blocks:[] };
function godBoss(){ const b = abyss.boss; return b && b.kind === 'god' ? b : null; }
function gPt(x,y){ return { x:clamp(x,50,canvas.width-50), y:clamp(y,150,GROUND()-30) }; }
function gTop(){ return Math.min(130, Math.max(60, canvas.height*.2)); }
function gShot(x,y,a,speed,dmg,r,kind,color,life=4200,extra={}){
    god.shots.push({ x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, speed, angle:a, dmg, r, kind, color, life, age:0, spin:random(0,G_TAU), ...extra });
}
function gHaz(h){ h.age = 0; god.hazards.push(h); }
function gShake(power){ god.shake = Math.max(god.shake || 0, power); }
function gFx(f){ god.fx.push({ age:0, ...f }); }
// Ray from (x,y) along angle a: returns the first distance at which it enters the Infinity Edge column, or Infinity.
function gBeamBlock(x, y, a, len){
    if (typeof inf === 'undefined' || !inf.on || inf.open <= .4) return Infinity;
    const R = INF_RADIUS*.9, dx = Math.cos(a), dy = Math.sin(a);
    // Slab test against the column box [inf.x-R, inf.x+R] × [-1e4, inf.y+R].
    let t0 = 0, t1 = len;
    for (const [o, d, lo, hi] of [[x, dx, inf.x-R, inf.x+R], [y, dy, -1e4, inf.y+R]]){
        if (Math.abs(d) < 1e-9){ if (o < lo || o > hi) return Infinity; continue; }
        let a1 = (lo-o)/d, a2 = (hi-o)/d; if (a1 > a2) [a1, a2] = [a2, a1];
        t0 = Math.max(t0, a1); t1 = Math.min(t1, a2);
        if (t0 > t1) return Infinity;
    }
    return t0;
}

// ================================================================
//  ATTACKS
// ================================================================
// 1. JUDGEMENT BEAM — a colossal column of light pours down the centre of the arena.
function gJudgement(b){
    const W = canvas.width, width = Math.min(W*.3, 300 + b.phase*20);
    gHaz({ kind:'judgement', x:W/2, width, warn:1500, warnMax:1500, life:2600 + b.phase*200, lifeMax:2600 + b.phase*200, dmg:120, tick:0 });
    b.stateTimer = 1500 + 2600 + b.phase*200 + 300;
}
// 2. GLITCH LASERS — three corrupted lasers lock onto you and fire one after another.
function gGlitchLasers(b){
    const W = canvas.width, spots = [[W*.12, 200], [W*.5, 140], [W*.88, 200]];
    const volleys = b.phase >= 3 ? 2 : 1;
    for (let v=0; v<volleys; v++) spots.forEach(([x,y], i) => {
        const warn = 1100 + i*320 + v*1500;
        gHaz({ kind:'glitchLaser', x, y, angle:angleTo({x,y}, player), warn, warnMax:warn, lockAt:380, life:520, lifeMax:520, dmg:120, len:2600, width:34, blocked:Infinity, seed:i*17+v });
    });
    b.stateTimer = 1100 + 2*320 + (volleys-1)*1500 + 900;
}
// 3. HEAVEN CLEAVER — giant crescent slashes carve lines across the arena.
function gSlashes(b){
    const n = 3 + b.phase;
    for (let i=0;i<n;i++){
        const warn = 750 + i*430;
        // Each slash tracks the player, then locks in place shortly before it falls.
        gHaz({ kind:'slash', x:player.x, y:player.y, follow:true, angle:random(0, Math.PI), warn, warnMax:warn, lockAt:420, life:380, lifeMax:380, dmg:120, width:62, len:Math.hypot(canvas.width, canvas.height)*1.1, dir:i%2 ? 1 : -1 });
    }
    b.stateTimer = 750 + n*430 + 700;
}
// 4. STILLED HEAVENS — a swarm of different projectiles spreads out, freezes, then all aim at you.
const G_SWARM = ['orb', 'blade', 'star', 'lance', 'eye'];
function gStill(b){
    const n = 26 + b.phase*6, base = random(0, G_TAU);
    for (let i=0;i<n;i++){
        const a = base + i*G_TAU/n + random(-.08,.08), kind = G_SWARM[i % G_SWARM.length];
        gShot(b.x, b.y, a, random(6, 12), 100, kind === 'lance' ? 9 : 12, kind, [G_GOLD, G_ROSE, G_CYAN, G_WHITE, G_HALO][i%5], 7000,
            { stillAt:G_CLOCK_STOP, still:false, resume:9 + b.phase*.6, aimAt:G_CLOCK_RESUME + (i%6)*90, aimed:false });
    }
    // A great clock fills the sky. Its hands race, then stop, and every shot stops with them.
    gHaz({ kind:'clock', x:canvas.width/2, y:(gTop() + GROUND())/2 - 30, R:Math.min(canvas.width, GROUND()-gTop())*.36,
        life:3500, lifeMax:3500, stopped:false, resumed:false, seed:Math.random()*100 });
    b.stateTimer = 3800;
}
const G_CLOCK_STOP = 1000, G_CLOCK_RESUME = 2000;
// Time is stopped while the clock's hands are frozen; the Idol's own animation freezes too.
function gTimeStopped(){ return god.frozenAt != null; }
function gTime(){ return gTimeStopped() ? god.frozenAt : worldTime; }
// 5. DIVINE WINTER — a blizzard, then huge icicles burst out of the ground beneath you.
function gWinter(b){
    abyss.weather = { kind:'blizzard', life:6200, max:6200, wind:(Math.random() < .5 ? -1 : 1)*1.6, tick:0 };
    const waves = 4 + b.phase;
    for (let w=0; w<waves; w++){
        const delay = 700 + w*720;
        gHaz({ kind:'icewave', delay, count:w%2 ? 3 : 2 + Math.min(2, b.phase-1) });
    }
    b.stateTimer = 700 + waves*720 + 1400;
}
function gIcicle(x, y, warn){
    gHaz({ kind:'icicle', x, y, warn, warnMax:warn, life:900, lifeMax:900, dmg:115, r:58, h:random(170, 240), seed:Math.random()*100, hit:false });
}
// 6. STORM AT WORLD'S EDGE — lightning walks along every edge; only the middle is safe.
function gEdgeStorm(b){
    const W = canvas.width, top = gTop(), bot = GROUND();
    const r = Math.min(W, bot-top)*(b.phase >= 3 ? .2 : .24);
    gHaz({ kind:'edgeStorm', x:W/2, y:(top+bot)/2 + 20, r, warn:1800, warnMax:1800, life:2600, lifeMax:2600, dmg:110, tick:0, bolts:[] });
    b.stateTimer = 1800 + 2600 + 400;
}
// 7. SUNDERING — one cut splits the arena in half, then the marked half falls into the void.
function gSunder(b){
    const W = canvas.width, top = gTop(), bot = GROUND();
    const a = mPick([Math.PI/2, 0, Math.atan2(bot-top, W), -Math.atan2(bot-top, W)]);
    const cx = W/2, cy = (top+bot)/2, nx = -Math.sin(a), ny = Math.cos(a);
    // The half the player stands in falls, so they must cross the cut.
    const side = ((player.x-cx)*nx + (player.y-cy)*ny) >= 0 ? 1 : -1;
    gHaz({ kind:'sunder', cx, cy, angle:a, nx, ny, side, warn:900, warnMax:900, fall:1500, fallMax:1500, life:2200, lifeMax:2200, dmg:130, cut:false });
    b.stateTimer = 900 + 1500 + 2200 + 300;
}
function gInHalf(h, p){ return ((p.x-h.cx)*h.nx + (p.y-h.cy)*h.ny)*h.side > -player.radius*.4; }
// 8. HEAVEN'S MIRROR — the arena closes in and mirror clones join the volley.
function gMirror(b){
    const W = canvas.width, top = gTop(), bot = GROUND();
    god.arena = { t:0, grow:1200, hold:5400, shrink:800, k:0, max:.24, dmg:90 };
    // Clones stand outside the closing walls: on both flanks, then high on each side.
    const spots = [[W*.1, (top+bot)/2 + 40], [W*.9, (top+bot)/2 + 40], [W*.2, top + 110], [W*.8, top + 110]];
    const n = b.phase >= 3 ? 4 : 3;
    for (let i=0;i<n;i++) god.clones.push({ x:spots[i][0], y:spots[i][1], age:0, life:6400, tick:400 + i*230, appear:500 });
    abPortalFx(b.x, b.y, G_GOLD, .8);
    b.tick = 0;
    b.stateTimer = 6400;
}
function gArenaRect(){
    const W = canvas.width, top = gTop(), bot = GROUND(), a = god.arena;
    const ix = W*a.max*a.k, iy = (bot-top)*a.max*a.k;
    return { x0:ix, y0:top+iy*.8, x1:W-ix, y1:bot-iy*.8 };
}
// 9. SERAPH CHOIR — minions follow your height from the edges, stop, then fire flaming lasers.
function gChoir(b){
    const W = canvas.width, n = 3 + Math.min(2, b.phase-1);
    for (let i=0;i<n;i++){
        const left = i%2 === 0, track = 1300 + i*420;
        god.minions.push({ x:left ? -60 : W+60, tx:left ? 46 : W-46, y:player.y + random(-120,120), side:left ? 1 : -1,
            track, trackMax:track, aim:620, fire:900, fireMax:900, dmg:125, age:0, fired:false, seed:i*13 });
    }
    b.stateTimer = 1300 + n*420 + 620 + 900 + 600;
}

ABYSS_ATTACKS.god = [
    { id:'judgement', label:'JUDGEMENT BEAM', phase:1, telegraph:700, duration:4400,
      start(b){ b.hold = true; b.data.home = { x:canvas.width/2, y:235 }; }, fire:gJudgement,
      tick(b,dt){ const h = b.data.home; b.x += (h.x-b.x)*(1-Math.exp(-dt/200)); b.y += (h.y-b.y)*(1-Math.exp(-dt/200)); } },
    { id:'glitchLasers', label:'GLITCH LASERS', phase:1, telegraph:600, duration:2600, fire:gGlitchLasers },
    { id:'slashes', label:'HEAVEN CLEAVER', phase:1, telegraph:600, duration:3000, fire:gSlashes },
    { id:'still', label:'STILLED HEAVENS', phase:1, telegraph:650, duration:3800, start(b){ b.hold = true; }, fire:gStill },
    { id:'winter', label:'DIVINE WINTER', phase:1, telegraph:700, duration:5000, fire:gWinter },
    { id:'edgeStorm', label:'STORM AT WORLD’S EDGE', phase:1, telegraph:600, duration:4400, fire:gEdgeStorm },
    { id:'sunder', label:'SUNDERING', phase:1, telegraph:600, duration:4900, start(b){ b.hold = true; }, fire:gSunder },
    { id:'mirror', label:'HEAVEN’S MIRROR', phase:1, telegraph:700, duration:6400, fire:gMirror,
      tick(b,dt){ b.tick += dt; if (b.tick >= 1100 && b.stateTimer > 900){ b.tick = 0; gMirrorVolley(b, b); } } },
    { id:'choir', label:'SERAPH CHOIR', phase:1, telegraph:650, duration:4600, fire:gChoir }
];
function gMirrorVolley(src, b){
    // The Idol fires a wide fan; each clone adds a tighter three-shot spread.
    const a = angleTo(src, player), real = src === b, n = real ? (b.phase >= 3 ? 7 : 5) : 3, gap = real ? .2 : .16;
    for (let i=0;i<n;i++) gShot(src.x, src.y, a + (i-(n-1)/2)*gap, 6 + b.phase*.4, 100, 11, 'orb', real ? G_GOLD : G_ROSE, 4000);
}

// Attacks come from a shuffled deck: every attack once per cycle, in a new random order each time,
// and never the same attack twice in a row across cycles.
function gDraw(b){
    if (!b.deck || !b.deck.length){
        const ids = ABYSS_ATTACKS.god.map(a => a.id);
        for (let i=ids.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        if (ids[ids.length-1] === b.lastAttack && ids.length > 1) [ids[0], ids[ids.length-1]] = [ids[ids.length-1], ids[0]];
        b.deck = ids;
    }
    const id = b.deck.pop();
    return ABYSS_ATTACKS.god.find(a => a.id === id);
}
const gStartOrig = abStartAttack;
abStartAttack = function(b, forced){
    if (b.kind !== 'god' || forced) return gStartOrig(b, forced);
    return gStartOrig(b, gDraw(b));
};

// ---------------- Movement ----------------
const gMoveOrig = abMoveBoss;
abMoveBoss = function(b, dt){
    if (b.kind !== 'god') return gMoveOrig(b, dt);
    if (b.hold || b.stun > 0) return;
    // It drifts in a slow figure-eight high above the arena, as if the throne carries it.
    const W = canvas.width, slow = b.state === 'telegraph' ? .4 : 1;
    const tx = W/2 + Math.sin(b.age*.00033)*W*.24, ty = 245 + Math.sin(b.age*.00066)*30;
    const f = 1 - Math.pow(1-.022*slow, dt/16.67);
    b.x += (tx-b.x)*f; b.y += (ty-b.y)*f;
    b.x = clamp(b.x, 110, W-110); b.y = clamp(b.y, 120, GROUND()-140);
};

// ================================================================
//  COMBAT UPDATE
// ================================================================
function gUpdate(dt){
    const step = dt*.06, W = canvas.width, top = gTop(), bot = GROUND(), b = godBoss();
    if (god.shake > 0) god.shake = Math.max(0, god.shake - dt*.02);
    god.blocks = god.blocks.filter(k => (k.life -= dt) > 0);

    for (let i=god.shots.length-1;i>=0;i--){
        const s = god.shots[i];
        s.age += dt; s.spin += dt*.008;
        if (s.stillAt != null){
            if (!s.still && s.age >= s.stillAt){ s.still = true; s.vx = s.vy = 0; gFx({ kind:'freeze', x:s.x, y:s.y, life:380, color:s.color }); }
            if (s.still && !s.aimed){
                s.angle = angleTo(s, player);
                if (s.age >= s.aimAt){ s.aimed = true; s.vx = Math.cos(s.angle)*s.resume; s.vy = Math.sin(s.angle)*s.resume; }
            } else if (!s.still){ s.vx *= Math.pow(.982, dt/16.67); s.vy *= Math.pow(.982, dt/16.67); }
        }
        if (s.vx || s.vy) s.angle = Math.atan2(s.vy, s.vx);
        s.x += s.vx*step; s.y += s.vy*step; s.life -= dt;
        if (s.life <= 0 || s.x < -200 || s.x > W+200 || s.y < -200 || s.y > canvas.height+200){ god.shots.splice(i,1); continue; }
        const touching = Math.hypot(s.x-player.x, s.y-player.y) < s.r + player.radius*.8;
        if (player.invincible <= 0 && touching && hurtPlayer(s.dmg, s.color)) god.shots.splice(i,1);
    }

    for (let i=god.hazards.length-1;i>=0;i--){
        const h = god.hazards[i];
        h.age += dt;
        if (h.kind === 'clock'){
            if (!h.stopped && h.age >= G_CLOCK_STOP){
                h.stopped = true; god.frozenAt = worldTime; gShake(10);
                gFx({ kind:'timestop', x:h.x, y:h.y, life:700, r:h.R });
                showAttackWarning('⏸ TIME STOP');
            }
            if (!h.resumed && h.age >= G_CLOCK_RESUME){
                h.resumed = true; god.frozenAt = null; gShake(14);
                gFx({ kind:'shatter', x:h.x, y:h.y, life:900, r:h.R, seed:h.seed });
            }
            h.life -= dt;
            if (h.life <= 0){ god.hazards.splice(i,1); if (!h.resumed) god.frozenAt = null; }
            continue;
        }
        if (h.kind === 'judgement'){
            if (h.warn > 0){ h.warn -= dt; if (h.warn <= 0){ gShake(14); gFx({ kind:'shock', x:h.x, y:bot-10, life:900, color:G_GOLD, r:h.width }); } continue; }
            h.life -= dt; h.tick += dt;
            if (Math.abs(player.x - h.x) < h.width/2 + player.radius*.5) hurtPlayer(h.dmg, G_GOLD);
            // Sparks spill out of the impact from the second phase.
            if (b && b.phase >= 2 && h.tick >= 420){ h.tick = 0; for (const s of [-1,1]) gShot(h.x + s*h.width*.5, bot-30, s > 0 ? random(-.5,-.1) : Math.PI + random(.1,.5), 6, 90, 9, 'star', G_HALO, 2600); }
            if (h.life <= 0) god.hazards.splice(i,1);
        } else if (h.kind === 'glitchLaser'){
            if (h.warn > 0){
                h.warn -= dt;
                if (h.warn > h.lockAt) h.angle = angleTo(h, player);
                if (h.warn <= 0) gShake(5);
                continue;
            }
            h.life -= dt;
            // The Infinity Edge beam blocks the laser where it crosses the column.
            h.blocked = gBeamBlock(h.x, h.y, h.angle, h.len);
            const reach = Math.min(h.len, h.blocked), ex = h.x + Math.cos(h.angle)*reach, ey = h.y + Math.sin(h.angle)*reach;
            if (h.blocked < h.len && Math.random() < dt/40) god.blocks.push({ x:ex, y:ey, life:260, max:260, a:h.angle });
            if (pointSegDist(player.x, player.y, h.x, h.y, ex, ey) < h.width/2 + player.radius*.6) hurtPlayer(h.dmg, G_GLITCH);
            if (h.life <= 0) god.hazards.splice(i,1);
        } else if (h.kind === 'slash'){
            if (h.warn > 0){
                if (h.follow && h.warn > h.lockAt){ const f = 1-Math.exp(-dt/90); h.x += (player.x-h.x)*f; h.y += (player.y-h.y)*f; }
                h.warn -= dt;
                if (h.warn <= 0){ gShake(9); particle(h.x, h.y, G_WHITE, 18, 9, .7); }
                continue;
            }
            h.life -= dt;
            const L = h.len/2, dx = Math.cos(h.angle)*L, dy = Math.sin(h.angle)*L;
            const k = 1 - h.life/h.lifeMax;
            if (k < .55 && pointSegDist(player.x, player.y, h.x-dx, h.y-dy, h.x+dx, h.y+dy) < h.width/2 + player.radius*.6) hurtPlayer(h.dmg, G_WHITE);
            if (h.life <= 0) god.hazards.splice(i,1);
        } else if (h.kind === 'icewave'){
            h.delay -= dt;
            if (h.delay <= 0){
                gIcicle(player.x, player.y, 820);
                for (let k=1;k<h.count;k++){ const p = gPt(player.x + random(-360,360), player.y + random(-200,200)); gIcicle(p.x, p.y, 820 + k*90); }
                god.hazards.splice(i,1);
            }
        } else if (h.kind === 'icicle'){
            if (h.warn > 0){ h.warn -= dt; if (h.warn > 0) continue; }
            if (!h.hit){
                h.hit = true; gShake(6);
                if (distance(h, player) < h.r + player.radius*.6) hurtPlayer(h.dmg, G_ICE);
                particle(h.x, h.y, G_ICE, 20, 7, .8);
                for (let k=0;k<6;k++) gShot(h.x, h.y-20, -Math.PI/2 + (k-2.5)*.5, 5.5, 80, 6, 'shard', G_ICE, 1100);
            }
            h.life -= dt; if (h.life <= 0) god.hazards.splice(i,1);
        } else if (h.kind === 'edgeStorm'){
            if (h.warn > 0){ h.warn -= dt; if (h.warn <= 0) gShake(10); continue; }
            h.life -= dt; h.tick += dt;
            if (h.tick >= 70){
                h.tick = 0;
                // A new bolt lands somewhere outside the safe circle.
                for (let n=0;n<3;n++){
                    let x, y, tries = 0;
                    do { x = random(0, W); y = random(top-20, bot); tries++; } while (Math.hypot(x-h.x, y-h.y) < h.r + 40 && tries < 8);
                    h.bolts.push({ x, y, life:220, seed:Math.random()*1000 });
                }
            }
            for (const bolt of h.bolts) bolt.life -= dt;
            h.bolts = h.bolts.filter(bolt => bolt.life > 0);
            if (Math.hypot(player.x-h.x, player.y-h.y) > h.r - player.radius*.4) hurtPlayer(h.dmg, G_BOLT);
            if (h.life <= 0) god.hazards.splice(i,1);
        } else if (h.kind === 'sunder'){
            if (h.warn > 0){
                h.warn -= dt;
                if (h.warn <= 0){ h.cut = true; gShake(16); }
                continue;
            }
            if (h.fall > 0){
                h.fall -= dt;
                // The cut itself hurts while it is fresh.
                const L = 2400, dx = Math.cos(h.angle)*L, dy = Math.sin(h.angle)*L;
                if (h.fallMax - h.fall < 300 && pointSegDist(player.x, player.y, h.cx-dx, h.cy-dy, h.cx+dx, h.cy+dy) < 24 + player.radius*.6) hurtPlayer(h.dmg, G_WHITE);
                if (h.fall <= 0) gShake(12);
                continue;
            }
            h.life -= dt;
            if (gInHalf(h, player)) hurtPlayer(h.dmg, G_GOLD);
            if (h.life <= 0) god.hazards.splice(i,1);
        }
    }

    const a = god.arena;
    if (a){
        a.t += dt;
        const end = a.grow + a.hold + a.shrink;
        a.k = a.t < a.grow ? abEase(a.t/a.grow) : a.t < a.grow + a.hold ? 1 : 1 - abEase((a.t-a.grow-a.hold)/a.shrink);
        if (a.t >= end) god.arena = null;
        else {
            const r = gArenaRect(), m = player.radius*.5;
            if (a.k > .05 && (player.x < r.x0-m || player.x > r.x1+m || player.y < r.y0-m || player.y > r.y1+m)) hurtPlayer(a.dmg, G_GOLD);
        }
    }

    for (let i=god.clones.length-1;i>=0;i--){
        const c = god.clones[i];
        c.age += dt; c.tick -= dt;
        if (b && c.tick <= 0 && c.age > c.appear && c.life - c.age > 700){ c.tick = 1100; gMirrorVolley(c, b); }
        if (c.age >= c.life){ abPortalFx(c.x, c.y, G_ROSE, .5); god.clones.splice(i,1); }
    }

    for (let i=god.minions.length-1;i>=0;i--){
        const m = god.minions[i];
        m.age += dt;
        m.x += (m.tx-m.x)*(1-Math.exp(-dt/220));
        if (m.track > 0){
            // Follows your height until it locks.
            m.track -= dt;
            m.y += (clamp(player.y, top, bot) - m.y)*(1-Math.exp(-dt/140));
        } else if (m.aim > 0){
            m.aim -= dt;
        } else if (m.fire > 0){
            if (!m.fired){ m.fired = true; gShake(8); }
            m.fire -= dt;
            if (Math.abs(player.y - m.y) < 34 + player.radius*.5) hurtPlayer(m.dmg, G_FIRE, true);
        } else { god.minions.splice(i,1); abPortalFx(m.x, m.y, G_FIRE, .4); }
    }
    for (let i=god.fx.length-1;i>=0;i--){ const f = god.fx[i]; f.age += dt; if (f.age >= f.life) god.fx.splice(i,1); }
}

// ---------------- Reward weapon: Verdict of Heaven ----------------
// Throws a spear of light that pierces, then calls a pillar of judgement where it stops.
function godWeaponAttack(){
    const w = weapons[GOD_WEAPON], cost = w.mana * (hasArtifact('ethernaty_core') ? .8 : 1);
    if (player.mana < cost) return;
    player.mana -= cost; player.attackCooldown = w.cooldown;
    const a = angleTo(player, mouse), dmg = applyClassBonus(w.damage, GOD_WEAPON);
    god.playerShots.push({ kind:'verdict', x:player.x, y:player.y, vx:Math.cos(a)*19, vy:Math.sin(a)*19, angle:a, age:0, life:560, dmg, hit:new Set() });
    playerAnim.attackAt = worldTime; playerAnim.attackWeapon = GOD_WEAPON;
}
function gUpdateWeapon(dt){
    const step = dt*.06;
    for (let i=god.playerShots.length-1;i>=0;i--){
        const s = god.playerShots[i];
        s.age += dt;
        if (s.kind === 'verdict'){
            s.x += s.vx*step; s.y += s.vy*step;
            if (!s.hit.size && hitBoss({ x:s.x, y:s.y, radius:16, damage:s.dmg*.4, weaponIdx:GOD_WEAPON, color:G_GOLD })) s.hit.add(1);
            if (s.age >= s.life || s.x < -50 || s.x > canvas.width+50 || s.y < -50 || s.y > canvas.height+50){
                god.playerShots[i] = { kind:'pillar', x:s.x, y:s.y, age:0, life:520, dmg:s.dmg*.6, done:false };
            }
        } else if (s.kind === 'pillar'){
            if (!s.done && s.age >= 180){ s.done = true; hitBoss({ x:s.x, y:s.y, radius:90, damage:s.dmg, weaponIdx:GOD_WEAPON, color:G_GOLD }); particle(s.x, s.y, G_GOLD, 16, 7, .7); }
            if (s.age >= s.life) god.playerShots.splice(i,1);
        }
    }
}

// ================================================================
//  HOOKS INTO THE GAME
// ================================================================
const gBase = { update, attack, hurtPlayer, applyClassBonus, clearArena, restart, renderWorkshop, abResetFight,
    drawBackground, drawHazards, drawProjectiles, drawTwoFacedDemon, drawLighting, drawWeaponInHand };

function godClear(){
    god.shots = []; god.hazards = []; god.fx = []; god.clones = []; god.minions = []; god.arena = null;
    god.playerShots = []; god.blocks = []; god.shake = 0; god.phase = 0; god.landed = false; god.frozenAt = null;
}

update = function(dt){
    const running = !(gameOver || !currentClass || workshopMenuOpen || artifactMenuOpen || paused || journalOpen);
    const had = !!godBoss();
    gBase.update(dt);
    if (!running || !player) return;
    const b = godBoss();
    if (had && !b){
        // The kill clears the arena, the blizzard and its snow.
        godClear(); abyss.weather = null; abyss.shots = []; abyss.hazards = [];
        document.getElementById('lootReport').textContent = 'The Idol has fallen. Rewards: Verdict of Heaven and the Eye of the Arbiter.';
        showMessage('✦ THE IDOL HAS FALLEN. The heavens are silent.');
        // Final boss: freeze the run and show the victory screen with a restart button.
        gameOver = true; victory = true;
        const win = document.getElementById('idolWinScreen');
        if (win) win.style.display = 'flex';
        return;
    }
    if (b){
        // Each new phase: the halo flares, light floods outward and the camera shakes.
        if (god.phase && b.phase > god.phase){ gShake(20); gFx({ kind:'ascend', x:b.x, y:b.y-92, life:1600 }); abPortalFx(b.x, b.y, G_GOLD, 1.5); }
        god.phase = b.phase;
        // Landing after the descent.
        if (b.state !== 'emerge' && !god.landed){ god.landed = true; gShake(12); gFx({ kind:'shock', x:b.x, y:GROUND()-10, life:900, color:G_GOLD, r:120 }); }
    }
    if (gameOver) return;
    gUpdateWeapon(dt);
    if (godBoss() || god.shots.length || god.hazards.length || god.minions.length || god.clones.length || god.arena) gUpdate(dt);
};
attack = function(){
    if (weapon === GOD_WEAPON){ if (abCanAttack()) godWeaponAttack(); return; }
    gBase.attack();
};
hurtPlayer = function(amount, color, fireSource){
    if (hasArtifact('god_eye')) amount *= .8;
    return gBase.hurtPlayer(amount, color, fireSource);
};
applyClassBonus = function(base, wi){ return gBase.applyClassBonus(base, wi) * (hasArtifact('god_eye') ? 1.3 : 1); };
abResetFight = function(){ gBase.abResetFight(); godClear(); };
clearArena = function(){ gBase.clearArena(); godClear(); };
restart = function(){
    const win = document.getElementById('idolWinScreen');
    if (win) win.style.display = 'none';
    godClear(); gBase.restart();
};
renderWorkshop = function(){
    gBase.renderWorkshop();
    if (workshopTab !== 'summon' || !workshopModal.querySelectorAll) return;
    workshopModal.querySelectorAll('.workshopList article').forEach((row, index) => {
        if (index !== GOD_INDEX) return;
        const p = row.querySelector('.summonLocation');
        if (p) p.textContent = String(p.textContent).replace('· Mythic', '· Divine').replace('· Hard', '· Divine');
        const info = row.querySelector('p');
        if (info && info.innerHTML) info.innerHTML = String(info.innerHTML).replace(/Drops: $/, 'Rewards: Verdict of Heaven, Eye of the Arbiter');
    });
};

// ================================================================
//  ART: THE IDOL
// ================================================================
// Soft radial glow, skipped in Minimal mode.
function gGlow(x, y, r, color, a){
    if (visualMode === 'minimal' || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, G_TAU); ctx.fill(); ctx.restore();
}
// One wing of light. A curved gold bone sweeps out from the shoulder; primaries hang off it,
// longest at the tip, with a row of short covert feathers over their roots.
// Angles: 0 points straight out from the body, negative is up. s mirrors the wing.
function gFeather(x, y, a, L, w, alpha, rim){
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    let fill = 'rgba(255,246,222,.9)';
    if (visualMode !== 'minimal'){
        fill = ctx.createLinearGradient(0, 0, L, 0);
        fill.addColorStop(0, 'rgba(255,226,150,.95)'); fill.addColorStop(.35, 'rgba(255,252,240,.95)'); fill.addColorStop(1, 'rgba(255,250,235,.15)');
    }
    const A0 = ctx.globalAlpha; ctx.globalAlpha = A0*alpha;
    ctx.beginPath(); ctx.moveTo(0, -w*.3);
    ctx.quadraticCurveTo(L*.45, -w, L, 0); ctx.quadraticCurveTo(L*.5, w*.7, 0, w*.3); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.strokeStyle = 'rgba(201,150,60,.55)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(L*.88, -w*.05); ctx.stroke();
    ctx.globalAlpha = A0; ctx.restore();
}
function gWing(s, base, sweep, len, count, t, alpha){
    ctx.save(); ctx.scale(s, 1); ctx.translate(16, -50);
    // The bone: a gentle arc from the shoulder to the wrist of the wing.
    const boneA = base + sweep*.35, bone = len*.42, bx = Math.cos(boneA)*bone, by = Math.sin(boneA)*bone;
    const mx = Math.cos(boneA - .35)*bone*.55, my = Math.sin(boneA - .35)*bone*.55;
    for (let i=count-1;i>=0;i--){
        // Primaries spread from base to base+sweep; roots sit along the bone.
        const q = i/(count-1), a = base + q*sweep + Math.sin(t*1.4 + i*.55)*.035;
        const rx = bx*(.25 + .75*(1-q)), ry = by*(.25 + .75*(1-q));
        gFeather(rx, ry, a, len*(.55 + .45*(1-q*.65)), 11 + 5*(1-q), alpha, 'rgba(255,200,90,.85)');
    }
    // Coverts over the roots.
    for (let i=0;i<count-1;i++){
        const q = (i+.5)/(count-1), a = base + q*sweep*.85;
        gFeather(bx*(.15 + .7*(1-q)), by*(.15 + .7*(1-q)), a, len*.3, 8, alpha*.95, 'rgba(255,214,107,.9)');
    }
    abGlow(10, G_GOLD);
    ctx.strokeStyle = G_GOLD; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke(); ctx.shadowBlur = 0;
    abOval(bx, by, 3.2, 3.2, G_WHITE);
    ctx.restore();
}
// A flowing sleeve from the shoulder that widens into a bell cuff, and an open hand of light.
function gArm(s, hx, hy, cast, t){
    const sx = s*36, sy = -50, ex = s*58, ey = (sy + hy)/2 + 10;
    const a = Math.atan2(hy-ey, hx-ex), px = -Math.sin(a), py = Math.cos(a);
    // Upper sleeve.
    abLine([[sx, sy],[ex, ey]], '#d8c9a3', 20); abLine([[sx, sy],[ex, ey]], '#fbf4e2', 15);
    // Bell sleeve: narrow at the elbow, wide and swaying at the cuff.
    const sway = Math.sin(t*2 + s)*3, cw = 17;
    const cx = hx - Math.cos(a)*10, cy = hy - Math.sin(a)*10;
    const sg = ctx.createLinearGradient(ex, ey, cx, cy); sg.addColorStop(0, '#fbf4e2'); sg.addColorStop(1, '#e6d8b4');
    abShape([[ex + px*8, ey + py*8],[cx + px*cw + sway, cy + py*cw + 6],[cx - px*cw + sway, cy - py*cw + 6],[ex - px*8, ey - py*8]], sg, 'rgba(201,162,74,.85)', 1.2);
    abGlow(6, G_GOLD); abLine([[cx + px*cw + sway, cy + py*cw + 6],[cx - px*cw + sway, cy - py*cw + 6]], G_GOLD, 3); ctx.shadowBlur = 0;
    // The hand: a palm and four fingers, open toward the player.
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
    abOval(2, 0, 6.5, 5.5, '#fffaf0');
    for (let f=0;f<4;f++){ const fa = (f-1.5)*.32; abLine([[5, Math.sin(fa)*3],[5 + Math.cos(fa)*10, Math.sin(fa)*10]], '#fffaf0', 2.6); }
    abLine([[0, -4*s],[4, -10*s]], '#fffaf0', 2.6);   // thumb
    if (cast > .1){ abGlow(18, G_GOLD); abOval(10, 0, 3 + cast*6, 3 + cast*6, 'rgba(255,250,225,.95)'); ctx.shadowBlur = 0; }
    ctx.restore();
}
// Sigils down the stole: an eye, a triangle, a sun, a crescent and a key.
function gSigil(i, x, y){
    ctx.strokeStyle = G_VOID; ctx.fillStyle = G_VOID; ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (i === 0){ ctx.moveTo(x-6, y); ctx.quadraticCurveTo(x, y-6, x+6, y); ctx.quadraticCurveTo(x, y+6, x-6, y); ctx.stroke(); abOval(x, y, 1.8, 1.8, G_VOID); }
    else if (i === 1){ ctx.moveTo(x, y-6); ctx.lineTo(x+6, y+5); ctx.lineTo(x-6, y+5); ctx.closePath(); ctx.stroke(); }
    else if (i === 2){ ctx.arc(x, y, 3, 0, G_TAU); ctx.stroke(); for (let k=0;k<8;k++){ const q = k*G_TAU/8; abLine([[x+Math.cos(q)*4.5, y+Math.sin(q)*4.5],[x+Math.cos(q)*7, y+Math.sin(q)*7]], G_VOID, 1.2); } }
    else if (i === 3){ ctx.arc(x, y, 6, -1.2, 1.2, true); ctx.arc(x+3, y, 4.6, 1.6, -1.6); ctx.closePath(); ctx.fill(); }
    else { ctx.arc(x, y-3, 3, 0, G_TAU); ctx.moveTo(x, y); ctx.lineTo(x, y+7); ctx.moveTo(x, y+4); ctx.lineTo(x+3, y+4); ctx.stroke(); }
}
// The cracked halo: three rings of gold script turning at different speeds, with a gap that widens in later phases.
function gHalo(x, y, R, t, ph, cast){
    ctx.save(); ctx.translate(x, y);
    gGlow(0, 0, R*1.8, 'rgba(255,230,160,.55)', .7 + cast*.3);
    const rings = [[R, .18, 2.6, 48], [R*.78, -.32, 1.6, 24], [R*1.22, .1, 1.2, 72]];
    rings.forEach(([r, sp, w, ticks], k) => {
        ctx.save(); ctx.rotate(t*sp*(1 + cast*1.5));
        const gap = ph >= 3 ? .35 + (ph-3)*.25 : 0;
        abGlow(12, G_GOLD); ctx.strokeStyle = k === 1 ? G_WHITE : G_GOLD; ctx.lineWidth = w;
        ctx.beginPath(); ctx.arc(0, 0, r, gap, G_TAU - gap); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        for (let i=0;i<ticks;i++){
            const q = i/ticks*G_TAU; if (q < gap || q > G_TAU-gap) continue;
            const l = i%4 ? 3 : 8;
            ctx.beginPath(); ctx.moveTo(Math.cos(q)*r, Math.sin(q)*r); ctx.lineTo(Math.cos(q)*(r+l*(k === 2 ? -1 : 1)), Math.sin(q)*(r+l*(k === 2 ? -1 : 1))); ctx.stroke();
        }
        ctx.restore();
    });
    // Seven floating crown spikes, the centre one tallest.
    for (let i=0;i<7;i++){
        const q = -Math.PI/2 + (i-3)*.32, r1 = R*.62, r2 = R*(1.02 + (i === 3 ? .35 : i%2 ? .12 : .22));
        abGlow(10, G_GOLD);
        abShape([[Math.cos(q-.05)*r1, Math.sin(q-.05)*r1], [Math.cos(q)*r2, Math.sin(q)*r2], [Math.cos(q+.05)*r1, Math.sin(q+.05)*r1]], i === 3 ? G_WHITE : G_GOLD);
        ctx.shadowBlur = 0;
    }
    ctx.restore();
}
// The single eye in the void-black face. It follows the player and burns brighter while casting.
function gEye(x, y, t, cast, look){
    ctx.save(); ctx.translate(x, y);
    const open = .55 + cast*.45 + Math.max(0, Math.sin(t*.7))*.05;
    abGlow(18, G_GOLD);
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(0, -9*open, 11, 0); ctx.quadraticCurveTo(0, 9*open, -11, 0); ctx.closePath();
    ctx.fillStyle = '#fff4cc'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.save(); ctx.clip();
    const px = Math.cos(look)*4, py = Math.sin(look)*2.4;
    abOval(px, py, 4.6, 4.6, G_GOLD); abOval(px, py, 2.4, 2.4, G_VOID);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(px-1.4, py-1.4, 1, 0, G_TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
}
function drawGod(b){
    // While time is stopped the Idol freezes mid-motion: wings, halo and robe hold still.
    const t = gTime()/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const ph = b.phase || 1, A0 = ctx.globalAlpha, look = player ? angleTo(b, player) : Math.PI/2;
    const bob = Math.sin(t*1.2)*6;
    ctx.save(); ctx.translate(b.x, b.y + bob); ctx.rotate(hit*.025); ctx.lineJoin = 'round';

    // Sacred geometry turning behind it.
    if (visualMode !== 'minimal'){
        ctx.save(); ctx.translate(0, -30); ctx.rotate(t*.06);
        ctx.globalAlpha = A0*(.25 + cast*.25);
        ctx.strokeStyle = G_GOLD; ctx.lineWidth = 1;
        for (let i=0;i<6;i++){ const q = i*G_TAU/6; ctx.beginPath(); ctx.arc(Math.cos(q)*60, Math.sin(q)*60, 60, 0, G_TAU); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, 120, 0, G_TAU); ctx.stroke();
        ctx.rotate(-t*.14);
        for (let i=0;i<2;i++){ ctx.beginPath(); for (let j=0;j<=3;j++){ const q = j/3*G_TAU + i*Math.PI/3 - Math.PI/2; j ? ctx.lineTo(Math.cos(q)*150, Math.sin(q)*150) : ctx.moveTo(Math.cos(q)*150, Math.sin(q)*150); } ctx.stroke(); }
        ctx.restore(); ctx.globalAlpha = A0;
        gGlow(0, -20, 230, 'rgba(255,225,150,.42)', .8 + cast*.4);
    }
    // The halo sits behind the head and wings.
    gHalo(0, -92, 48 + cast*6, t, ph, cast);

    // Six wings of light in three pairs: the high pair rises as it gathers power, the low pair folds.
    const open = cast*.3 + strike*.15, flap = Math.sin(t*1.6)*.06;
    for (const s of [-1, 1]){
        gWing(s, .35 + flap*.5 + open*.2, .55, 105, 6, t + 2, .7);
        gWing(s, -.55 + flap - open*.25, .7, 138, 7, t + 1, .85);
        gWing(s, -1.3 + flap*1.4 - open*.3, .8, 150, 8, t, .9);
    }

    // Flowing robe of white marble, veined with gold. The hem dissolves into light.
    const hem = i => 120 + Math.sin(t*2 + i*.9)*7;
    const rg = ctx.createLinearGradient(0, -60, 0, 130);
    rg.addColorStop(0, '#fffdf6'); rg.addColorStop(.5, '#e8dcc0'); rg.addColorStop(1, 'rgba(255,214,107,.15)');
    const robe = [[-26,-58],[26,-58],[42,0],[58,hem(0)]];
    for (let i=1;i<8;i++) robe.push([58 - i*16.6, hem(i) + (i%2 ? 10 : 0)]);
    robe.push([-58, hem(8)], [-42, 0]);
    abShape(robe, rg, 'rgba(201,162,74,.8)', 1.5);
    ctx.save(); ctx.beginPath(); robe.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.clip();
    // Gold veins like cracks in marble.
    ctx.strokeStyle = 'rgba(201,150,50,.55)'; ctx.lineWidth = 1.2;
    for (let i=0;i<6;i++){
        ctx.beginPath(); let x = -40 + i*16, y = -50;
        ctx.moveTo(x, y);
        for (let k=0;k<6;k++){ x += (abHash(i*9+k)-.5)*18; y += 28; ctx.lineTo(x, y); }
        ctx.stroke();
    }
    // A vertical stole with sigils.
    abShape([[-9,-56],[9,-56],[12,128],[-12,128]], 'rgba(255,214,107,.85)');
    for (let i=0;i<5;i++) gSigil(i, 0, -28 + i*30);
    abLine([[-9,-56],[-12,128]], 'rgba(138,100,32,.8)', 1); abLine([[9,-56],[12,128]], 'rgba(138,100,32,.8)', 1);
    ctx.restore();
    // Light motes rising from the hem.
    for (let i=0;i<14;i++){
        const q = (t*.45 + abHash(i+3)) % 1, x = -54 + abHash(i+11)*108 + Math.sin(t*1.5+i)*5, y = 124 - q*70;
        ctx.globalAlpha = A0*(1-q)*.85; abOval(x, y, 2 + (i%3), 2 + (i%3), i%3 ? G_HALO : G_WHITE);
    }
    ctx.globalAlpha = A0;

    // Gilded mantle over the shoulders.
    abShape([[-52,-52],[-20,-70],[0,-58],[20,-70],[52,-52],[44,-28],[0,-38],[-44,-28]], G_GOLD, '#8a6420', 1.5);
    for (const s of [-1, 1]) abShape([[s*20,-68],[s*48,-54],[s*42,-34],[s*16,-44]], '#ffe7a0');
    abGlow(14, G_WHITE); abOval(0, -46, 7, 7, G_WHITE); ctx.shadowBlur = 0; abOval(0, -46, 3.5, 3.5, G_GOLD);

    // Arms: open palms raised while it casts, a sceptre of light in the right hand.
    for (const s of [-1, 1]){
        const raise = cast*40 + strike*s*10, hx = s*(74 + cast*10), hy = 4 - raise + Math.sin(t*1.4 + s)*4;
        if (cast > .1) gGlow(hx, hy, 30 + cast*30, 'rgba(255,240,190,.9)', cast);
        gArm(s, hx, hy, cast, t);
        if (s > 0){
            ctx.save(); ctx.translate(hx, hy); ctx.rotate(-.18 - cast*.4 + strike*.6);
            abGlow(14, G_GOLD); abLine([[0, 40],[0, -150]], G_GOLD, 4); ctx.shadowBlur = 0;
            abLine([[0, 36],[0, -146]], G_WHITE, 1.5);
            // A small sun at the sceptre's tip.
            ctx.translate(0, -162); ctx.rotate(t*.8);
            for (let i=0;i<8;i++){ const q = i*G_TAU/8; abShape([[Math.cos(q-.18)*8, Math.sin(q-.18)*8],[Math.cos(q)*(18 + (i%2)*6), Math.sin(q)*(18 + (i%2)*6)],[Math.cos(q+.18)*8, Math.sin(q+.18)*8]], G_HALO); }
            abGlow(16, G_WHITE); abOval(0, 0, 8, 8, G_WHITE); ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // Hood and the void face.
    const hg = ctx.createLinearGradient(0, -120, 0, -60);
    hg.addColorStop(0, '#fffdf6'); hg.addColorStop(1, '#d8c9a3');
    ctx.beginPath(); ctx.moveTo(-26,-62); ctx.quadraticCurveTo(-30,-112,0,-122); ctx.quadraticCurveTo(30,-112,26,-62); ctx.quadraticCurveTo(0,-54,-26,-62); ctx.closePath();
    ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = 'rgba(201,162,74,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-17,-66); ctx.quadraticCurveTo(-19,-104,0,-110); ctx.quadraticCurveTo(19,-104,17,-66); ctx.quadraticCurveTo(0,-60,-17,-66); ctx.closePath();
    const fg = ctx.createRadialGradient(0, -88, 2, 0, -88, 24); fg.addColorStop(0, '#1a0f2e'); fg.addColorStop(1, G_VOID);
    ctx.fillStyle = fg; ctx.fill();
    // Stars inside the face.
    ctx.save(); ctx.clip();
    for (let i=0;i<12;i++){ const tw = (Math.sin(t*2 + i*1.9)+1)/2; ctx.globalAlpha = A0*(.3 + tw*.7); abOval(-14 + abHash(i)*28, -106 + abHash(i+5)*40, .6 + tw, .6 + tw, '#ffffff'); }
    ctx.globalAlpha = A0; ctx.restore();
    gEye(0, -88, t, cast, look);
    // Cracks of light spread across the face in later phases.
    if (ph >= 3){ abGlow(8, G_GOLD); abLine([[6,-104],[10,-94],[7,-86],[13,-74]], 'rgba(255,214,107,.9)', 1.3); ctx.shadowBlur = 0; }
    if (ph >= 4){ abGlow(8, G_GOLD); abLine([[-5,-108],[-10,-96],[-6,-84],[-12,-70]], 'rgba(255,214,107,.9)', 1.3); ctx.shadowBlur = 0; }
    ctx.restore();

    if (b.stun > 0){ ctx.save(); ctx.fillStyle = G_GOLD; ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('HUMBLED', b.x, b.y - 170); ctx.restore(); }
    // Descent: a pillar of light lowers it onto the battlefield.
    if (b.state === 'emerge'){
        const k = clamp(b.stateTimer/1800, 0, 1);
        ctx.save(); ctx.globalAlpha = k*.6;
        const pg = ctx.createLinearGradient(b.x-90, 0, b.x+90, 0);
        pg.addColorStop(0, 'rgba(255,230,160,0)'); pg.addColorStop(.5, 'rgba(255,248,220,.9)'); pg.addColorStop(1, 'rgba(255,230,160,0)');
        ctx.fillStyle = pg; ctx.fillRect(b.x-90, 0, 180, GROUND());
        ctx.restore();
    }
}
function gCloneBody(c){
    return { x:c.x, y:c.y, phase:3, stun:0, hp:1, maxHp:1, kind:'god', state:'idle', data:{}, anim:{ wind:.5, strike:0, hitAt:-1e9 } };
}
ABYSS_DRAW.god = drawGod;

// ================================================================
//  ART: THE THRONE BEYOND HEAVEN
// ================================================================
function bgHeaven(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime/1000, b = godBoss(), late = b && b.phase >= 4;
    const sky = ctx.createLinearGradient(0, 0, 0, g);
    sky.addColorStop(0, late ? '#1a0610' : '#0b0a22'); sky.addColorStop(.45, late ? '#5a1a22' : '#3a2a5a'); sky.addColorStop(1, late ? '#e09a5a' : '#f0c88a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Distant stars.
    for (let i=0;i<70;i++){ const tw = (Math.sin(t*1.3 + i*2.1)+1)/2; ctx.globalAlpha = A*(.2 + tw*.6)*(1 - (abHash(i+2)*g*.6)/g); abOval(abHash(i)*W, abHash(i+2)*g*.6, .7 + tw, .7 + tw, '#ffffff'); }
    ctx.globalAlpha = A;
    // God rays fanning from a light source above the throne.
    if (visualMode !== 'minimal'){
        ctx.save(); ctx.translate(W/2, -60); ctx.globalCompositeOperation = 'lighter';
        for (let i=0;i<14;i++){
            const q = Math.PI/2 + (i-6.5)*.12 + Math.sin(t*.2 + i)*.02, w = .03 + abHash(i)*.03;
            ctx.globalAlpha = A*(.05 + .05*Math.sin(t*.6 + i*1.3));
            ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(q-w)*H*1.6, Math.sin(q-w)*H*1.6); ctx.lineTo(Math.cos(q+w)*H*1.6, Math.sin(q+w)*H*1.6); ctx.closePath(); ctx.fill();
        }
        ctx.restore(); ctx.globalAlpha = A;
    }
    // A colossal halo hangs on the horizon like a sun.
    ctx.save(); ctx.translate(W/2, g-170);
    gGlow(0, 0, 360, 'rgba(255,220,150,.45)', 1);
    ctx.strokeStyle = 'rgba(255,214,107,.45)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 230, Math.PI, G_TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.setLineDash([3,9]); ctx.rotate(t*.03); ctx.beginPath(); ctx.arc(0, 0, 260, 0, G_TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // Cloud banks drifting past.
    for (const [y, sp, col, n, s] of [[g*.42,5,'rgba(255,236,210,.18)',7,1.3],[g*.66,10,'rgba(255,226,190,.28)',8,1.1],[g-60,18,'rgba(255,245,230,.5)',10,1]]){
        ctx.fillStyle = col;
        for (let i=0;i<n;i++){
            const x = ((abHash(i+y)*W + t*sp) % (W+400)) - 200, r = (70 + abHash(i+y+5)*80)*s;
            ctx.beginPath(); ctx.ellipse(x, y + Math.sin(t*.25+i)*6, r*1.7, r*.42, 0, 0, G_TAU); ctx.fill();
        }
    }
    // Broken marble columns rising out of the clouds.
    for (const [x, h, w] of [[W*.06,330,46],[W*.94,300,46],[W*.2,210,34],[W*.8,230,34]]){
        const cg = ctx.createLinearGradient(x-w/2, 0, x+w/2, 0);
        cg.addColorStop(0, '#b9ab8e'); cg.addColorStop(.45, '#fff8e8'); cg.addColorStop(1, '#8e8068');
        ctx.fillStyle = cg; ctx.fillRect(x-w/2, g-h, w, h);
        ctx.strokeStyle = 'rgba(120,100,70,.35)'; ctx.lineWidth = 1;
        for (let k=1;k<4;k++){ ctx.beginPath(); ctx.moveTo(x-w/2 + k*w/4, g-h); ctx.lineTo(x-w/2 + k*w/4, g); ctx.stroke(); }
        ctx.fillStyle = '#e9dcc0'; ctx.fillRect(x-w/2-8, g-h-12, w+16, 14);
        // Broken top.
        ctx.fillStyle = sky; ctx.beginPath(); ctx.moveTo(x-w/2-10, g-h-14); ctx.lineTo(x-w/6, g-h-2); ctx.lineTo(x+w/5, g-h-16); ctx.lineTo(x+w/2+10, g-h-6); ctx.lineTo(x+w/2+10, g-h-30); ctx.lineTo(x-w/2-10, g-h-30); ctx.fill();
        abGlow(10, G_GOLD); ctx.strokeStyle = G_GOLD; ctx.lineWidth = 2; ctx.strokeRect(x-w/2, g-h+40, w, 3); ctx.shadowBlur = 0;
    }
    // The floor: a gold and marble mosaic.
    const fl = ctx.createLinearGradient(0, g-16, 0, H);
    fl.addColorStop(0, '#fff5dc'); fl.addColorStop(.3, '#d9c69c'); fl.addColorStop(1, '#6a5634');
    ctx.fillStyle = fl; ctx.fillRect(0, g-16, W, H-g+16);
    ctx.strokeStyle = 'rgba(160,120,50,.5)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x=-W; x<=W*2; x+=70){ ctx.moveTo(W/2 + (x-W/2)*.35, g-16); ctx.lineTo(x, H); }
    ctx.stroke();
    abGlow(10, G_GOLD); abLine([[0, g-16],[W, g-16]], G_GOLD, 2.5); ctx.shadowBlur = 0;
    // Floating feathers of light.
    for (let i=0;i<22;i++){
        const sp = .3 + abHash(i)*.6, y = ((t*22*sp + abHash(i+9)*g) % g), x = (abHash(i+20)*W + Math.sin(t*.7+i)*40) % W;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t+i)*.6); ctx.globalAlpha = A*.5;
        ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 2, 0, 0, G_TAU); ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = A;
}
ABYSS_BIOME_DRAW.heaven = bgHeaven;

// ================================================================
//  ART: HAZARDS, SHOTS, MINIONS AND CLONES
// ================================================================
// Deterministic jagged line; seeds come from simulation time so lightning freezes on pause.
function gJag(x1, y1, x2, y2, seed, segs, amp){
    const dx = x2-x1, dy = y2-y1, L = Math.hypot(dx, dy) || 1, nx = -dy/L, ny = dx/L, pts = [[x1, y1]];
    for (let i=1;i<segs;i++){ const q = i/segs, o = (abHash(seed*7.13 + i)-.5)*2*amp; pts.push([x1+dx*q+nx*o, y1+dy*q+ny*o]); }
    pts.push([x2, y2]); return pts;
}
function gBolt(pts, color, width){ abGlow(12, color); abLine(pts, color, width); ctx.shadowBlur = 0; abLine(pts, '#ffffff', Math.max(1, width*.4)); }

function drawJudgement(h){
    const t = worldTime, bot = GROUND(), x = h.x, W2 = h.width/2;
    if (h.warn > 0){
        const k = 1 - h.warn/h.warnMax;
        ctx.globalAlpha = .1 + k*.22; ctx.fillStyle = G_GOLD; ctx.fillRect(x-W2, 0, h.width, bot);
        ctx.globalAlpha = .8; ctx.strokeStyle = G_GOLD; ctx.lineWidth = 2; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t*.08;
        ctx.beginPath(); ctx.moveTo(x-W2, 0); ctx.lineTo(x-W2, bot); ctx.moveTo(x+W2, 0); ctx.lineTo(x+W2, bot); ctx.stroke(); ctx.setLineDash([]);
        // The heavens gather light: a narrowing core and a rune seal on the floor.
        ctx.globalAlpha = k*.9; abGlow(20, G_WHITE); abLine([[x, 0],[x, bot]], G_WHITE, 2 + k*10); ctx.shadowBlur = 0;
        ctx.save(); ctx.translate(x, bot-20); ctx.scale(1, .3); ctx.rotate(t*.002);
        ctx.globalAlpha = .4 + k*.5; ctx.strokeStyle = G_GOLD; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, W2*(.4 + k*.6), 0, G_TAU); ctx.stroke();
        for (let i=0;i<12;i++){ const q = i*G_TAU/12; ctx.beginPath(); ctx.moveTo(Math.cos(q)*W2*.5, Math.sin(q)*W2*.5); ctx.lineTo(Math.cos(q)*W2*(.4+k*.6), Math.sin(q)*W2*(.4+k*.6)); ctx.stroke(); }
        ctx.restore();
        // Motes rushing in toward the centre.
        for (let i=0;i<24;i++){ const q = (abHash(i)*bot + t*.4*(1+abHash(i+1))) % bot, side = i%2 ? 1 : -1, off = W2*1.6*(1-k)*abHash(i+3);
            ctx.globalAlpha = .7*k; abOval(x + side*off, q, 2, 2, G_HALO); }
        ctx.globalAlpha = 1;
        return;
    }
    const k = h.life/h.lifeMax, rise = Math.min(1, (h.lifeMax-h.life)/160), fade = Math.min(1, h.life/300);
    const pulse = 1 + Math.sin(t*.03)*.04 + Math.sin(t*.071)*.02, Wd = W2*rise*pulse;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade;
    // Outer glow.
    const og = ctx.createLinearGradient(x-Wd*1.6, 0, x+Wd*1.6, 0);
    og.addColorStop(0, 'rgba(255,200,90,0)'); og.addColorStop(.25, 'rgba(255,200,90,.35)'); og.addColorStop(.5, 'rgba(255,250,230,.95)');
    og.addColorStop(.75, 'rgba(255,200,90,.35)'); og.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = og; ctx.fillRect(x-Wd*1.6, 0, Wd*3.2, bot);
    // Body with rippling edges.
    const body = ctx.createLinearGradient(x-Wd, 0, x+Wd, 0);
    body.addColorStop(0, 'rgba(255,214,107,.55)'); body.addColorStop(.3, 'rgba(255,240,190,.9)'); body.addColorStop(.5, 'rgba(255,255,255,1)');
    body.addColorStop(.7, 'rgba(255,240,190,.9)'); body.addColorStop(1, 'rgba(255,214,107,.55)');
    ctx.fillStyle = body; ctx.beginPath();
    for (let y=0; y<=bot; y+=20) ctx.lineTo(x - Wd + Math.sin(y*.03 - t*.02)*6, y);
    for (let y=bot; y>=0; y-=20) ctx.lineTo(x + Wd + Math.sin(y*.03 - t*.02 + 1)*6, y);
    ctx.closePath(); ctx.fill();
    // Spiralling bands of script falling down the beam.
    if (visualMode !== 'minimal'){
        for (let i=0;i<10;i++){
            const y = ((t*.9 + i*bot/10) % bot);
            ctx.strokeStyle = `rgba(255,214,107,${.6*fade})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(x, y, Wd*.95, 10, 0, 0, Math.PI); ctx.stroke();
        }
        for (const ph of [0, Math.PI]){
            let prev = null;
            for (let y=0; y<=bot; y+=12){
                const q = y*.025 - t*.01 + ph, px = x + Math.sin(q)*Wd*.75, depth = (Math.cos(q)+1)/2;
                if (prev){ ctx.strokeStyle = `rgba(255,255,255,${(.3 + depth*.6)*fade})`; ctx.lineWidth = 1 + depth*4; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(px, y); ctx.stroke(); }
                prev = [px, y];
            }
        }
        const beat = Math.floor(t/60);
        for (let i=0;i<4;i++){ const side = i%2 ? 1 : -1, y1 = (beat*131 + i*241) % Math.max(1, bot-120); gBolt(gJag(x + side*Wd*.8, y1, x + side*Wd*1.5, y1 + 110, beat+i, 6, 14), G_HALO, 2); }
    }
    abLine([[x, 0],[x, bot]], '#ffffff', Math.max(2, Wd*.35));
    // Impact: a blinding ellipse, a rotating seal and debris.
    ctx.save(); ctx.translate(x, bot-14);
    const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, Wd*2.4);
    ig.addColorStop(0, 'rgba(255,255,255,1)'); ig.addColorStop(.3, 'rgba(255,220,140,.75)'); ig.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(0, 0, Wd*2.4, Wd*.7, 0, 0, G_TAU); ctx.fill();
    ctx.scale(1, .3); ctx.rotate(t*.003); ctx.strokeStyle = 'rgba(255,214,107,.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, Wd*1.6, 0, G_TAU); ctx.stroke();
    for (let i=0;i<2;i++){ ctx.beginPath(); for (let j=0;j<=3;j++){ const q = j/3*G_TAU + i*Math.PI/3; j ? ctx.lineTo(Math.cos(q)*Wd*1.5, Math.sin(q)*Wd*1.5) : ctx.moveTo(Math.cos(q)*Wd*1.5, Math.sin(q)*Wd*1.5); } ctx.stroke(); }
    ctx.restore();
    ctx.restore();
}
function drawGlitchLaser(h){
    const t = worldTime;
    // The emitter: a broken, flickering cube.
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(t*.004 + h.seed);
    const jit = Math.floor(t/50) % 3 === 0 ? 3 : 0;
    ctx.globalAlpha = .9; abShape([[-14+jit,-14],[14,-14+jit],[14,14],[-14,14-jit]], '#140616', G_GLITCH, 2);
    ctx.fillStyle = G_CYAN; ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
    if (h.warn > 0){
        const k = 1 - h.warn/h.warnMax, locked = h.warn <= h.lockAt;
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angle);
        ctx.globalAlpha = .25 + k*.5; ctx.strokeStyle = locked ? '#ffffff' : G_GLITCH; ctx.lineWidth = 1 + k*3;
        ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t*.1; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(h.len, 0); ctx.stroke(); ctx.setLineDash([]);
        // Glitch blocks crawl along the aim line.
        for (let i=0;i<8;i++){ const q = abHash(Math.floor(t/80)+i+h.seed)*Math.min(h.len, 1600); ctx.globalAlpha = .5*k; ctx.fillStyle = i%2 ? G_CYAN : G_GLITCH; ctx.fillRect(q, -6 + (i%3)*4, 10 + (i%4)*6, 3); }
        ctx.restore();
        return;
    }
    const reach = Math.min(h.len, h.blocked), k = h.life/h.lifeMax, w = h.width*Math.min(1, (1-k)*8 + .2);
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angle);
    // RGB split: three offset copies make the laser look torn.
    const shift = (abHash(Math.floor(t/40)+h.seed)-.5)*8;
    ctx.globalAlpha = Math.min(1, k*2);
    ctx.fillStyle = 'rgba(255,42,109,.55)'; ctx.fillRect(0, -w/2 + shift, reach, w);
    ctx.fillStyle = 'rgba(42,246,255,.55)'; ctx.fillRect(0, -w/2 - shift, reach, w);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -w*.2, reach, w*.4);
    // Torn slices that jump sideways.
    for (let i=0;i<10;i++){
        const x = abHash(Math.floor(t/45)*3 + i + h.seed)*reach, dy = (abHash(i+Math.floor(t/45))-.5)*w*1.6;
        ctx.fillStyle = i%2 ? G_CYAN : G_GLITCH; ctx.fillRect(x, dy - 2, 20 + (i%3)*14, 4);
    }
    ctx.restore();
    if (h.blocked < h.len){
        const ex = h.x + Math.cos(h.angle)*reach, ey = h.y + Math.sin(h.angle)*reach;
        gGlow(ex, ey, 70, 'rgba(255,255,255,.95)', 1);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(t*.02);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        for (let i=0;i<6;i++){ const q = i*G_TAU/6; ctx.beginPath(); ctx.moveTo(Math.cos(q)*10, Math.sin(q)*10); ctx.lineTo(Math.cos(q)*30, Math.sin(q)*30); ctx.stroke(); }
        ctx.restore();
    }
}
function drawSlash(h){
    const t = worldTime, L = h.len/2, dx = Math.cos(h.angle)*L, dy = Math.sin(h.angle)*L;
    if (h.warn > 0){
        const k = 1 - h.warn/h.warnMax, locked = h.warn <= h.lockAt;
        ctx.globalAlpha = .2 + k*.55; ctx.strokeStyle = locked ? '#ffffff' : G_ROSE; ctx.lineWidth = 1 + k*h.width*.3;
        ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t*.1;
        ctx.beginPath(); ctx.moveTo(h.x-dx, h.y-dy); ctx.lineTo(h.x+dx, h.y+dy); ctx.stroke(); ctx.setLineDash([]);
        return;
    }
    const k = 1 - h.life/h.lifeMax, sweep = Math.min(1, k*3), fade = 1 - Math.max(0, (k-.4)/.6);
    // The blade crosses the arena in a fraction of a second, leaving a crescent wake.
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.angle); ctx.globalAlpha = fade;
    const head = -L + sweep*2*L, w = h.width;
    const g = ctx.createLinearGradient(-L, 0, head, 0);
    g.addColorStop(0, 'rgba(255,158,199,0)'); g.addColorStop(.7, 'rgba(255,200,230,.6)'); g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo((head-L)/2, -w*h.dir, head, 0); ctx.quadraticCurveTo((head-L)/2, w*.25*h.dir, -L, 0); ctx.fill();
    abGlow(18, G_ROSE); abLine([[-L, 0],[head, 0]], '#ffffff', 3 + (1-k)*6); ctx.shadowBlur = 0;
    // The crescent blade itself at the head.
    ctx.translate(head, 0);
    abGlow(20, G_WHITE);
    ctx.beginPath(); ctx.arc(0, 0, w*1.4, -1.3, 1.3); ctx.arc(-w*.8, 0, w*1.3, 1.1, -1.1, true); ctx.closePath();
    ctx.fillStyle = 'rgba(255,250,245,.95)'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
}
function drawIcicle(h){
    const t = worldTime;
    if (h.warn > 0){
        const k = 1 - h.warn/h.warnMax;
        ctx.save(); ctx.translate(h.x, h.y); ctx.scale(1, .45);
        ctx.globalAlpha = .25 + k*.4; ctx.fillStyle = G_ICE; ctx.beginPath(); ctx.arc(0, 0, h.r*k, 0, G_TAU); ctx.fill();
        ctx.globalAlpha = .8; ctx.strokeStyle = G_ICE; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, h.r, 0, G_TAU); ctx.stroke(); ctx.setLineDash([]);
        // Frost cracks spreading through the ground.
        for (let i=0;i<7;i++){ const q = i*G_TAU/7 + h.seed; abLine(gJag(0, 0, Math.cos(q)*h.r*k, Math.sin(q)*h.r*k, h.seed+i, 4, 6), 'rgba(230,250,255,.9)', 1.5); }
        ctx.restore();
        return;
    }
    const age = h.lifeMax - h.life, up = Math.min(1, age/110), fade = Math.min(1, h.life/260);
    ctx.save(); ctx.translate(h.x, h.y); ctx.globalAlpha = fade;
    gGlow(0, -h.h*.4, h.h*.6, 'rgba(200,240,255,.6)', 1);
    // A cluster of crystal spikes, the centre one tallest.
    for (const [ox, sc, lean] of [[-30,.55,-.25],[28,.62,.22],[-12,.8,-.08],[14,.75,.1],[0,1,0]]){
        const H = h.h*sc*up, w = 18*sc + 6;
        ctx.save(); ctx.translate(ox, 0); ctx.rotate(lean);
        const g = ctx.createLinearGradient(-w, 0, w, 0);
        g.addColorStop(0, '#7fc8e8'); g.addColorStop(.45, '#f4fdff'); g.addColorStop(1, '#5aa8d0');
        abShape([[-w, 0],[-w*.35, -H*.7],[0, -H],[w*.35, -H*.72],[w, 0]], g, 'rgba(255,255,255,.9)', 1.5);
        abLine([[0, -H],[0, -4]], 'rgba(255,255,255,.7)', 1.2);
        ctx.restore();
    }
    ctx.restore();
}
function drawEdgeStorm(h){
    const t = worldTime, W = canvas.width, H = canvas.height;
    const k = h.warn > 0 ? 1 - h.warn/h.warnMax : 1;
    // Darken and charge everything outside the safe circle.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(h.x, h.y, h.r, 0, G_TAU, true);
    ctx.fillStyle = h.warn > 0 ? `rgba(40,30,0,${.12 + k*.18})` : 'rgba(30,24,60,.38)'; ctx.fill('evenodd');
    ctx.restore();
    // The safe circle.
    ctx.save(); ctx.translate(h.x, h.y);
    ctx.globalAlpha = .9; abGlow(14, G_BOLT); ctx.strokeStyle = h.warn > 0 ? G_BOLT : '#ffffff'; ctx.lineWidth = 3;
    ctx.setLineDash(h.warn > 0 ? [12, 8] : []); ctx.lineDashOffset = -t*.05;
    ctx.beginPath(); ctx.arc(0, 0, h.r, 0, G_TAU); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
    ctx.globalAlpha = .7; ctx.fillStyle = G_BOLT; ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'center';
    if (h.warn > 0) ctx.fillText('SANCTUARY', 0, -h.r - 12);
    ctx.restore();
    if (h.warn > 0){
        // Lightning crawls inward along the edges as the storm gathers.
        const seed = Math.floor(t/70), inset = 40 + k*90;
        ctx.globalAlpha = .4 + k*.5;
        gBolt(gJag(0, inset, W, inset, seed, 18, 14), G_BOLT, 2);
        gBolt(gJag(0, GROUND()-inset*.5, W, GROUND()-inset*.5, seed+1, 18, 14), G_BOLT, 2);
        gBolt(gJag(inset, 0, inset, H, seed+2, 14, 14), G_BOLT, 2);
        gBolt(gJag(W-inset, 0, W-inset, H, seed+3, 14, 14), G_BOLT, 2);
        ctx.globalAlpha = 1;
        return;
    }
    // Live current crawls along all four edges for the whole storm.
    const seed = Math.floor(t/50);
    ctx.globalAlpha = .9;
    gBolt(gJag(0, 40, W, 40, seed, 22, 18), G_BOLT, 2.5);
    gBolt(gJag(0, GROUND()-20, W, GROUND()-20, seed+1, 22, 18), G_BOLT, 2.5);
    gBolt(gJag(30, 0, 30, H, seed+2, 16, 18), G_BOLT, 2.5);
    gBolt(gJag(W-30, 0, W-30, H, seed+3, 16, 18), G_BOLT, 2.5);
    for (const bolt of h.bolts){
        const a = bolt.life/220;
        ctx.globalAlpha = a;
        gBolt(gJag(bolt.x + (abHash(bolt.seed)-.5)*80, -10, bolt.x, bolt.y, bolt.seed, 9, 22), G_BOLT, 3*a + 1);
        ctx.strokeStyle = G_BOLT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bolt.x, bolt.y, 6 + (1-a)*26, 0, G_TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
}
function drawSunder(h){
    const t = worldTime, W = canvas.width, H = canvas.height, L = 2400;
    const dx = Math.cos(h.angle)*L, dy = Math.sin(h.angle)*L;
    // The doomed half.
    ctx.save();
    ctx.beginPath();
    const ox = h.nx*h.side*L, oy = h.ny*h.side*L;
    ctx.moveTo(h.cx-dx, h.cy-dy); ctx.lineTo(h.cx+dx, h.cy+dy); ctx.lineTo(h.cx+dx+ox, h.cy+dy+oy); ctx.lineTo(h.cx-dx+ox, h.cy-dy+oy); ctx.closePath();
    ctx.clip();
    if (h.warn > 0 || h.fall > 0){
        const k = h.warn > 0 ? 1 - h.warn/h.warnMax : 1;
        ctx.globalAlpha = .12 + k*.2 + (h.fall > 0 ? .15*Math.abs(Math.sin(t*.012)) : 0);
        ctx.fillStyle = '#ff4060'; ctx.fillRect(0, 0, W, H);
        // Cracks spreading across the doomed half.
        ctx.globalAlpha = .7;
        for (let i=0;i<9;i++){
            const q = i/8, px = h.cx + (q-.5)*dx*.6, py = h.cy + (q-.5)*dy*.6;
            abLine(gJag(px, py, px + h.nx*h.side*(80 + abHash(i)*200), py + h.ny*h.side*(80 + abHash(i)*200), i+3, 5, 12), 'rgba(255,240,220,.8)', 1.5);
        }
    } else {
        // The half has fallen away into a starry void.
        const k = Math.min(1, (h.lifeMax-h.life)/250, h.life/300);
        ctx.globalAlpha = .92*k; ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, W, H);
        for (let i=0;i<60;i++){ ctx.globalAlpha = k*(.3 + abHash(i+4)*.6); abOval(abHash(i)*W, abHash(i+1)*H, 1 + abHash(i+2), 1 + abHash(i+2), '#ffffff'); }
        // Falling chunks of floor.
        for (let i=0;i<10;i++){
            const age = (h.lifeMax - h.life)/1000, px = h.cx + (abHash(i+20)-.5)*dx*.8 + h.nx*h.side*(60 + abHash(i)*260), py = h.cy + (abHash(i+20)-.5)*dy*.8 + h.ny*h.side*(60 + abHash(i)*260) + age*age*400;
            ctx.save(); ctx.translate(px, py); ctx.rotate(age*(abHash(i)-.5)*4); ctx.globalAlpha = k*.9;
            abShape([[-22,-10],[18,-14],[24,8],[-16,14]], '#d9c69c', G_GOLD, 1); ctx.restore();
        }
    }
    ctx.restore();
    // The cut: a white-hot line with sparks.
    ctx.save();
    if (h.warn > 0){
        const k = 1 - h.warn/h.warnMax;
        ctx.globalAlpha = .3 + k*.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1 + k*4; ctx.setLineDash([20, 12]); ctx.lineDashOffset = -t*.12;
        ctx.beginPath(); ctx.moveTo(h.cx-dx, h.cy-dy); ctx.lineTo(h.cx+dx, h.cy+dy); ctx.stroke(); ctx.setLineDash([]);
    } else {
        const fresh = h.fall > 0 ? Math.max(0, 1 - (h.fallMax-h.fall)/400) : 0;
        abGlow(20, G_WHITE); abLine([[h.cx-dx, h.cy-dy],[h.cx+dx, h.cy+dy]], 'rgba(255,240,220,.95)', 4 + fresh*28); ctx.shadowBlur = 0;
        abLine([[h.cx-dx, h.cy-dy],[h.cx+dx, h.cy+dy]], '#ffffff', 2 + fresh*10);
    }
    ctx.restore();
}
// The stopped clock of Stilled Heavens, in the bronze-and-gold style of Horologue's spire.
// Its hands race while the swarm spreads, lock and shudder while time is stopped,
// then spin backwards as the face cracks and shatters.
const G_NUMERALS = ['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
function drawClock(h){
    const age = h.age, R = h.R, stopped = h.stopped && !h.resumed;
    const appear = abEase(Math.min(1, age/350)), gone = h.resumed ? Math.max(0, 1 - (age - G_CLOCK_RESUME)/220) : 1;
    if (appear*gone <= 0) return;
    // Clock time: runs fast, holds still while stopped, then runs backwards.
    const tm = age < G_CLOCK_STOP ? age : age < G_CLOCK_RESUME ? G_CLOCK_STOP : G_CLOCK_STOP - (age - G_CLOCK_RESUME)*4;
    const twitch = stopped ? (abHash(Math.floor(worldTime/280) + h.seed) - .5)*.08 : 0;
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(.85 + .15*appear, .85 + .15*appear);
    ctx.globalAlpha = .85*appear*gone;
    // Pendulum behind the face.
    const swing = Math.sin(tm*.006)*.45;
    ctx.save(); ctx.rotate(swing);
    abLine([[0, R*.6],[0, R*1.45]], '#8a6a2e', 5); abLine([[0, R*.6],[0, R*1.45]], '#d9a75c', 2);
    abOval(0, R*1.5, R*.13, R*.13, '#d9a75c'); abOval(-R*.04, R*1.46, R*.04, R*.04, 'rgba(255,255,255,.5)');
    ctx.restore();
    // Side gears turn with the clock.
    for (const [gx, gy, gr, teeth, dir] of [[-R*1.02, -R*.45, R*.26, 12, 1], [R*1.05, -R*.3, R*.2, 10, -1], [-R*.92, R*.42, R*.16, 9, -1], [R*.95, R*.5, R*.22, 11, 1]])
        abGear(gx, gy, gr, teeth, tm*.004*dir, '#6e5226', '#2a1a0a');
    // Bronze rim and cream face.
    const rim = ctx.createRadialGradient(0, 0, R*.8, 0, 0, R*1.08);
    rim.addColorStop(0, '#5a3d1a'); rim.addColorStop(.5, '#e8c07a'); rim.addColorStop(1, '#5a3d1a');
    abGlow(stopped ? 26 : 16, stopped ? '#9fd7ff' : G_GOLD);
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(0, 0, R*1.08, 0, G_TAU); ctx.fill(); ctx.shadowBlur = 0;
    const face = ctx.createRadialGradient(-R*.2, -R*.25, R*.05, 0, 0, R*.9);
    face.addColorStop(0, '#fffaf0'); face.addColorStop(1, '#e9d6a8');
    abOval(0, 0, R*.9, R*.9, face);
    // A turning ring of gear teeth inside the face.
    ctx.save(); ctx.rotate(-tm*.0015);
    ctx.strokeStyle = 'rgba(138,106,46,.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(0, 0, R*.42, 0, G_TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // Minute ticks and Roman numerals.
    for (let i=0;i<60;i++){
        const q = i*G_TAU/60 - Math.PI/2, big = i%5 === 0;
        abLine([[Math.cos(q)*R*(big ? .78 : .83), Math.sin(q)*R*(big ? .78 : .83)],[Math.cos(q)*R*.87, Math.sin(q)*R*.87]], '#3b250d', big ? 3 : 1.2);
    }
    ctx.fillStyle = '#3b250d'; ctx.font = `bold ${Math.round(R*.11)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    G_NUMERALS.forEach((s, i) => { const q = i*G_TAU/12 - Math.PI/2; ctx.fillText(s, Math.cos(q)*R*.64, Math.sin(q)*R*.64); });
    // Hands: hour, minute and a red second hand that twitches in place while time is stopped.
    const hour = -Math.PI/2 + tm*.0011, minute = -Math.PI/2 + tm*.0125, second = -Math.PI/2 + tm*.04 + twitch;
    abLine([[0, 0],[Math.cos(hour)*R*.42, Math.sin(hour)*R*.42]], '#3b250d', 9);
    abLine([[0, 0],[Math.cos(minute)*R*.68, Math.sin(minute)*R*.68]], '#3b250d', 5);
    abShape([[Math.cos(minute)*R*.76, Math.sin(minute)*R*.76],[Math.cos(minute+.06)*R*.62, Math.sin(minute+.06)*R*.62],[Math.cos(minute-.06)*R*.62, Math.sin(minute-.06)*R*.62]], '#3b250d');
    abLine([[-Math.cos(second)*R*.15, -Math.sin(second)*R*.15],[Math.cos(second)*R*.8, Math.sin(second)*R*.8]], '#a3262a', 2.2);
    abOval(0, 0, R*.05, R*.05, '#d9a75c'); abOval(0, 0, R*.02, R*.02, '#3b250d');
    if (stopped){
        // Frozen time: the face frosts over and a cold ring holds the clock still.
        const k = Math.min(1, (age - G_CLOCK_STOP)/250);
        ctx.globalAlpha = .85*appear*k;
        abOval(0, 0, R*.9, R*.9, 'rgba(159,215,255,.28)');
        for (let i=0;i<7;i++){ const q = i*G_TAU/7 + h.seed; abLine(gJag(Math.cos(q)*R*.9, Math.sin(q)*R*.9, Math.cos(q)*R*.45, Math.sin(q)*R*.45, h.seed+i, 4, 8), 'rgba(230,248,255,.9)', 1.6); }
        abGlow(14, '#9fd7ff'); ctx.strokeStyle = 'rgba(159,215,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = 0;
        ctx.beginPath(); ctx.arc(0, 0, R*1.2, 0, G_TAU); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
    }
    if (h.resumed){
        // The face cracks from the centre just before it shatters.
        ctx.globalAlpha = gone;
        for (let i=0;i<9;i++){ const q = i*G_TAU/9 + h.seed*.3; abLine(gJag(0, 0, Math.cos(q)*R*1.05, Math.sin(q)*R*1.05, h.seed*3+i, 6, 12), '#ffffff', 2.5); }
    }
    ctx.restore();
}
function drawGodHazards(){
    for (const h of god.hazards){
        ctx.save();
        if (h.kind === 'clock') drawClock(h);
        else if (h.kind === 'judgement') drawJudgement(h);
        else if (h.kind === 'glitchLaser') drawGlitchLaser(h);
        else if (h.kind === 'slash') drawSlash(h);
        else if (h.kind === 'icicle') drawIcicle(h);
        else if (h.kind === 'edgeStorm') drawEdgeStorm(h);
        else if (h.kind === 'sunder') drawSunder(h);
        ctx.restore();
    }
    const a = god.arena;
    if (a){
        const r = gArenaRect(), W = canvas.width, H = canvas.height, t = worldTime;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(r.x0, r.y0, r.x1-r.x0, r.y1-r.y0); ctx.clip('evenodd');
        ctx.globalAlpha = .45*a.k; ctx.fillStyle = '#1a0a20'; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = .35*a.k; ctx.strokeStyle = G_GOLD; ctx.lineWidth = 2; ctx.beginPath();
        for (let x=-H; x<W; x+=26){ const o = (t*.04) % 26; ctx.moveTo(x+o, 0); ctx.lineTo(x+o+H, H); }
        ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.globalAlpha = .95*a.k; abGlow(16, G_GOLD); ctx.strokeStyle = G_GOLD; ctx.lineWidth = 4;
        ctx.strokeRect(r.x0, r.y0, r.x1-r.x0, r.y1-r.y0); ctx.shadowBlur = 0;
        ctx.strokeStyle = G_WHITE; ctx.lineWidth = 1.5; ctx.strokeRect(r.x0+6, r.y0+6, r.x1-r.x0-12, r.y1-r.y0-12);
        ctx.restore();
    }
}
function drawGodShot(s){
    const t = worldTime, frozen = s.still && !s.aimed;
    ctx.save(); ctx.translate(s.x, s.y);
    if (frozen){
        // Frozen shots shiver and show where they will fly.
        ctx.save(); ctx.rotate(s.angle); ctx.globalAlpha = .35; ctx.strokeStyle = s.color; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(120, 0); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        ctx.translate(Math.sin(t*.09 + s.spin)*1.2, 0);
    }
    if (s.kind === 'orb'){
        gGlow(0, 0, s.r*2.4, s.color, .7);
        abOval(0, 0, s.r, s.r, '#fffaf0'); ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, G_TAU); ctx.stroke();
    } else if (s.kind === 'blade'){
        ctx.rotate(s.angle);
        abGlow(10, s.color); abShape([[18,0],[4,-5],[-14,-3],[-14,3],[4,5]], '#fffaf0', s.color, 1.5); ctx.shadowBlur = 0;
        abShape([[-14,-7],[-10,-7],[-10,7],[-14,7]], G_GOLD);
    } else if (s.kind === 'star'){
        ctx.rotate(s.spin);
        abGlow(12, s.color);
        ctx.beginPath(); for (let i=0;i<10;i++){ const r = i%2 ? s.r*.45 : s.r*1.2, q = i*Math.PI/5; i ? ctx.lineTo(Math.cos(q)*r, Math.sin(q)*r) : ctx.moveTo(Math.cos(q)*r, Math.sin(q)*r); } ctx.closePath();
        ctx.fillStyle = '#fffbe6'; ctx.fill(); ctx.shadowBlur = 0;
    } else if (s.kind === 'lance'){
        ctx.rotate(s.angle);
        abGlow(12, s.color); abLine([[-26,0],[16,0]], s.color, 4); ctx.shadowBlur = 0; abLine([[-24,0],[14,0]], '#ffffff', 1.5);
        abShape([[26,0],[14,-6],[14,6]], '#ffffff', s.color, 1);
    } else if (s.kind === 'eye'){
        gGlow(0, 0, s.r*2.2, s.color, .6);
        ctx.beginPath(); ctx.moveTo(-s.r*1.2, 0); ctx.quadraticCurveTo(0, -s.r, s.r*1.2, 0); ctx.quadraticCurveTo(0, s.r, -s.r*1.2, 0); ctx.closePath();
        ctx.fillStyle = '#fff4cc'; ctx.fill(); ctx.strokeStyle = G_GOLD; ctx.lineWidth = 1.5; ctx.stroke();
        const look = player ? angleTo(s, player) : 0;
        abOval(Math.cos(look)*3, Math.sin(look)*2, 3.5, 3.5, G_VOID);
    } else if (s.kind === 'shard'){
        ctx.rotate(s.angle); abShape([[9,0],[0,-3],[-6,0],[0,3]], '#f4fdff', '#8fd8f8', 1);
    }
    ctx.restore();
}
function drawGodMinion(m){
    const t = worldTime/1000, W = canvas.width, x = m.x, y = m.y;
    // The flaming laser across the whole arena.
    if (m.track <= 0 && m.aim > 0){
        const k = 1 - m.aim/620;
        ctx.save(); ctx.globalAlpha = .3 + k*.6; ctx.strokeStyle = k > .6 ? '#ffffff' : G_FIRE; ctx.lineWidth = 2 + k*6; ctx.setLineDash([14, 8]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(m.side > 0 ? W : 0, y); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    } else if (m.track > 0){
        ctx.save(); ctx.globalAlpha = .18; ctx.strokeStyle = G_FIRE; ctx.lineWidth = 1; ctx.setLineDash([4, 10]);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(m.side > 0 ? W : 0, y); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
    if (m.fire > 0 && m.track <= 0 && m.aim <= 0){
        const k = m.fire/m.fireMax, w = 52*Math.min(1, (1-k)*6 + .3)*(.6 + .4*k), end = m.side > 0 ? W + 40 : -40;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k*2);
        const g = ctx.createLinearGradient(0, y - w, 0, y + w);
        g.addColorStop(0, 'rgba(255,60,0,0)'); g.addColorStop(.3, 'rgba(255,120,20,.8)'); g.addColorStop(.5, 'rgba(255,250,220,1)');
        g.addColorStop(.7, 'rgba(255,120,20,.8)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x, y - w*.4);
        for (let i=0;i<=24;i++){ const q = i/24, px = x + (end-x)*q; ctx.lineTo(px, y - w*(.7 + .3*Math.sin(q*30 - worldTime*.03))); }
        for (let i=24;i>=0;i--){ const q = i/24, px = x + (end-x)*q; ctx.lineTo(px, y + w*(.7 + .3*Math.sin(q*27 - worldTime*.035 + 2))); }
        ctx.closePath(); ctx.fill();
        // Flame tongues licking off the beam.
        if (visualMode !== 'minimal') for (let i=0;i<16;i++){
            const q = abHash(i + Math.floor(worldTime/60)), px = x + (end-x)*q, up = (abHash(i+7)-.5)*2;
            ctx.fillStyle = `rgba(255,${Math.floor(140 + q*100)},40,.7)`; ctx.beginPath(); ctx.ellipse(px, y + up*w*.9, 14, 6, 0, 0, G_TAU); ctx.fill();
        }
        ctx.restore();
    }
    // The minion: a burning seraph — a ring of fire with wings and one eye.
    ctx.save(); ctx.translate(x, y + Math.sin(t*4 + m.seed)*3);
    gGlow(0, 0, 60, 'rgba(255,140,40,.6)', 1);
    for (const s of [-1, 1]) for (let i=0;i<3;i++){
        const a = (-.7 + i*.55)*s + Math.sin(t*8 + i)*.1*s;
        ctx.save(); ctx.scale(s, 1); ctx.rotate(a);
        abShape([[6,0],[34 - i*4,-8],[44 - i*6,0],[34 - i*4,6]], i === 1 ? '#ffd29a' : '#ff9a3d', 'rgba(255,240,200,.8)', 1);
        ctx.restore();
    }
    abGlow(14, G_FIRE); ctx.strokeStyle = G_FIRE; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 15, 0, G_TAU); ctx.stroke(); ctx.shadowBlur = 0;
    abOval(0, 0, 10, 10, '#2a0a04');
    const charge = m.track <= 0 ? 1 : .5;
    abGlow(10, '#ffffff'); abOval(m.side*2, 0, 4 + charge*2, 4 + charge*2, '#fff0c0'); ctx.shadowBlur = 0;
    ctx.restore();
}
function drawGodProjectiles(){
    for (const s of god.shots) drawGodShot(s);
    for (const c of god.clones){
        const k = Math.min(1, c.age/c.appear, (c.life-c.age)/400);
        // Smaller, rose-tinted and translucent, so the real Idol stays easy to pick out.
        ctx.save(); ctx.globalAlpha = .6*k;
        ctx.translate(c.x, c.y); ctx.scale(.7, .7); ctx.translate(-c.x, -c.y);
        drawGod(gCloneBody(c));
        ctx.globalAlpha = .5*k; abGlow(12, G_ROSE); ctx.strokeStyle = G_ROSE; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -worldTime*.05;
        ctx.beginPath(); ctx.ellipse(c.x, c.y-30, 90, 150, 0, 0, G_TAU); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
        ctx.restore();
    }
    for (const m of god.minions) drawGodMinion(m);
    for (const k of god.blocks){
        const a = k.life/k.max;
        ctx.save(); ctx.globalAlpha = a;
        for (let i=0;i<4;i++){ const q = k.a + Math.PI + (abHash(i + k.x)-.5)*2.2, d = (1-a)*40; abLine([[k.x, k.y],[k.x + Math.cos(q)*d, k.y + Math.sin(q)*d]], i%2 ? G_CYAN : '#ffffff', 2); }
        ctx.restore();
    }
    for (const s of god.playerShots){
        ctx.save(); ctx.translate(s.x, s.y);
        if (s.kind === 'verdict'){
            ctx.rotate(s.angle); abGlow(16, G_GOLD); abLine([[-40,0],[16,0]], G_GOLD, 5); ctx.shadowBlur = 0;
            abLine([[-38,0],[14,0]], '#ffffff', 2); abShape([[28,0],[14,-7],[18,0],[14,7]], '#ffffff', G_GOLD, 1.2);
        } else {
            const k = s.age/s.life, open = Math.sin(Math.min(1, k*1.4)*Math.PI);
            ctx.globalAlpha = 1 - k*.6;
            const g = ctx.createLinearGradient(-50*open, 0, 50*open + .01, 0);
            g.addColorStop(0, 'rgba(255,214,107,0)'); g.addColorStop(.5, 'rgba(255,250,230,.95)'); g.addColorStop(1, 'rgba(255,214,107,0)');
            ctx.fillStyle = g; ctx.fillRect(-50*open, -s.y, 100*open, s.y + 10);
            ctx.scale(1, .32); ctx.strokeStyle = G_GOLD; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 30 + k*70, 0, G_TAU); ctx.stroke();
        }
        ctx.restore();
    }
}
function drawGodFx(){
    for (const f of god.fx){
        const k = f.age/f.life;
        ctx.save(); ctx.globalAlpha = 1-k;
        if (f.kind === 'freeze'){
            ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 8 + k*22, 0, G_TAU); ctx.stroke();
        } else if (f.kind === 'shock'){
            ctx.translate(f.x, f.y); ctx.scale(1, .3); abGlow(16, f.color); ctx.strokeStyle = f.color; ctx.lineWidth = 8*(1-k) + 1;
            ctx.beginPath(); ctx.arc(0, 0, f.r*(.5 + k*2.5), 0, G_TAU); ctx.stroke();
        } else if (f.kind === 'timestop'){
            // A cold shockwave snaps inward onto the clock as time stops.
            ctx.translate(f.x, f.y);
            for (const [d, w] of [[0, 5], [.15, 2.5]]){
                const q = clamp((k-d)/(1-d), 0, 1);
                abGlow(16, '#9fd7ff'); ctx.strokeStyle = q < .4 ? '#ffffff' : '#9fd7ff'; ctx.lineWidth = w*(1-q) + .5;
                ctx.beginPath(); ctx.arc(0, 0, f.r*(2.6 - q*1.5), 0, G_TAU); ctx.stroke();
            }
        } else if (f.kind === 'shatter'){
            // The clock face bursts into spinning bronze and glass shards.
            ctx.translate(f.x, f.y);
            for (let i=0;i<26;i++){
                const q = abHash(i + f.seed)*G_TAU, sp = .4 + abHash(i + f.seed + 9)*.8, d = f.r*(.2 + k*1.6*sp), fall = k*k*160;
                ctx.save(); ctx.translate(Math.cos(q)*d, Math.sin(q)*d + fall); ctx.rotate(k*6*(abHash(i)-.5)*2);
                const s = 6 + abHash(i + 3)*14;
                abShape([[-s, -s*.4],[s*.8, -s*.6],[s*.4, s*.7],[-s*.6, s*.5]], i%3 ? 'rgba(255,250,235,.9)' : '#c99a4a', i%2 ? '#8a6a2e' : 'rgba(159,215,255,.9)', 1.2);
                ctx.restore();
            }
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4*(1-k) + .5;
            ctx.beginPath(); ctx.arc(0, 0, f.r*(1 + k*.8), 0, G_TAU); ctx.stroke();
        } else if (f.kind === 'ascend'){
            // Phase change: rings of gold flood outward and rays burst from the halo.
            ctx.translate(f.x, f.y);
            for (const [d, w] of [[0, 6], [.12, 3], [.24, 1.5]]){
                const q = clamp((k-d)/(1-d), 0, 1);
                abGlow(18, G_GOLD); ctx.strokeStyle = q < .5 ? G_WHITE : G_GOLD; ctx.lineWidth = w*(1-q) + .5;
                ctx.beginPath(); ctx.arc(0, 0, 40 + q*520, 0, G_TAU); ctx.stroke();
            }
            ctx.shadowBlur = 0; ctx.rotate(k*.6);
            for (let i=0;i<16;i++){ const q = i*G_TAU/16, r1 = 60 + k*80, r2 = r1 + 120*(1-k) + 20; abLine([[Math.cos(q)*r1, Math.sin(q)*r1],[Math.cos(q)*r2, Math.sin(q)*r2]], i%2 ? G_HALO : G_WHITE, 3*(1-k) + 1); }
        }
        ctx.restore();
    }
}

drawBackground = function(){
    // Big impacts shake the camera. The offset moves the whole world for this frame, not the HUD.
    if (god.shake > 0 && visualMode !== 'minimal'){
        const s = god.shake, t = worldTime;
        ctx.translate(Math.sin(t*.9)*s*.5, Math.cos(t*1.3)*s*.4);
    }
    gBase.drawBackground();
};
drawHazards = function(){ gBase.drawHazards(); drawGodHazards(); };
drawProjectiles = function(){ gBase.drawProjectiles(); drawGodProjectiles(); };
drawTwoFacedDemon = function(){ gBase.drawTwoFacedDemon(); drawGodFx(); };
// Divine Winter: wind-driven snow streaks and frost creeping in from the edges.
function drawGodBlizzard(){
    const w = abyss.weather; if (!w || w.kind !== 'blizzard') return;
    const W = canvas.width, H = canvas.height, t = worldTime/1000;
    const fade = Math.min(1, (w.max-w.life)/600, w.life/600), wind = w.wind || 1;
    ctx.save();
    const fr = ctx.createRadialGradient(W/2, H/2, H*.3, W/2, H/2, H*.95);
    fr.addColorStop(0, 'rgba(210,240,255,0)'); fr.addColorStop(1, `rgba(200,235,255,${.4*fade})`);
    ctx.fillStyle = fr; ctx.fillRect(0, 0, W, H);
    const n = visualMode === 'minimal' ? 40 : 140;
    ctx.strokeStyle = `rgba(245,252,255,${.75*fade})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i=0;i<n;i++){
        const sp = 300 + abHash(i)*400, y = ((t*sp*.6 + abHash(i+1)*H) % (H+40)) - 20;
        const x = (((abHash(i+2)*W + t*sp*wind) % (W+80)) + W + 80) % (W+80) - 40, len = 8 + abHash(i+3)*14;
        ctx.moveTo(x, y); ctx.lineTo(x - wind*len, y - len*.35);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${.85*fade})`;
    for (let i=0;i<n/2;i++){
        const y = ((t*60*(1 + abHash(i+7)) + abHash(i+8)*H) % H), x = (((abHash(i+9)*W + t*90*wind + Math.sin(t*2 + i)*20) % W) + W) % W, r = 1.2 + abHash(i+10)*2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, G_TAU); ctx.fill();
    }
    ctx.restore();
}
drawLighting = function(){
    gBase.drawLighting();
    const b = godBoss();
    if (b) drawGodBlizzard();
    // Stopped time drains the colour from the arena, like Horologue's time stop but colder.
    if (gTimeStopped()){
        const W = canvas.width, H = canvas.height;
        const v = ctx.createRadialGradient(W/2, H/2, H*.25, W/2, H/2, H);
        v.addColorStop(0, 'rgba(120,150,190,.12)'); v.addColorStop(1, 'rgba(60,90,140,.32)');
        ctx.save(); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    // Phase four bathes the arena in a slow, warm vignette.
    if (b && b.phase >= 4){
        const W = canvas.width, H = canvas.height;
        const v = ctx.createRadialGradient(W/2, H/2, H*.35, W/2, H/2, H);
        v.addColorStop(0, 'rgba(255,200,120,0)'); v.addColorStop(1, `rgba(120,30,20,${.22 + .06*Math.sin(worldTime*.002)})`);
        ctx.save(); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
};

drawWeaponInHand = function(idx){
    if (idx !== GOD_WEAPON){ gBase.drawWeaponInHand(idx); return; }
    // Verdict of Heaven: a gold spear with a tiny halo at its head.
    const t = worldTime;
    ctx.save(); ctx.translate(6, 0); ctx.lineCap = 'round';
    abLine([[-16,0],[60,0]], '#8a6420', 4); abLine([[-16,0],[60,0]], G_GOLD, 2);
    abGlow(12, G_GOLD); abShape([[82,0],[60,-7],[64,0],[60,7]], '#fffaf0', G_GOLD, 1.4); ctx.shadowBlur = 0;
    ctx.save(); ctx.translate(56, 0); ctx.rotate(t*.004); ctx.scale(.45, 1);
    ctx.strokeStyle = G_HALO; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, G_TAU); ctx.stroke(); ctx.restore();
    abOval(-18, 0, 4, 4, G_WHITE);
    ctx.restore();
};
