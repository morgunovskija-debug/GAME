// ================================================================
//  MYTHIC TRIALS
//  Three mythic bosses after The Glitch:
//    Kaelthar, the Eclipse Knight   (The Colosseum of the Black Sun)
//    Nyxara, the Storm Seraph       (The Stormspire Above the Clouds)
//    The Architect, Author of the Trials (The First Page)
//  They run on the hard-boss framework in abyss.js (state machine,
//  phases, HUD, rewards, summon panel and death effects) and add their
//  own projectiles, hazards, weather, arenas, models, weapons and
//  artifacts. Each one ends with a desperation attack and a stagger.
//  All art is Canvas geometry driven by simulation time.
// ================================================================
const MYTH_INDEX = BOSS_NAMES.length;   // first mythic boss index (9)
const MYTH_WEAPON = weapons.length;     // first mythic weapon index (20)
const MYTH_WEAPON_COUNT = 3;
const MYTH_KINDS = ['knight', 'seraph', 'architect'];
const M_SUN = '#ffb347', M_EMBER = '#ff7a3d', M_LIGHT = '#ffe2a8';
const M_SKY = '#8fd3ff', M_BOLT = '#fff27a', M_MIST = '#eaf6ff';
const M_INK = '#ffd98a', M_BLUE = '#9fb8ff', M_PAPER = '#efe6cf';

// ---------------- Locations, lore and data ----------------
LOCATIONS.push(
    { name:'The Colosseum of the Black Sun', title:'Kaelthar — The Eclipse Knight', color:M_SUN,
      lore:'Every champion who reached the end of the trials met Kaelthar in a colosseum under a dead sun. He has never lost a duel, and he has never been allowed to stop fighting. The Architect made him the last door, and the door has learned to hate every key.',
      tip:'Lanes show where he will dash, and his path erupts behind him. Look for the gap in every wave of falling swords, and step out of a shadow’s lane before it locks.' },
    { name:'The Stormspire Above the Clouds', title:'Nyxara — The Storm Seraph', color:M_SKY,
      lore:'Nyxara sang the first storms into the sky and carried the Architect’s word to every guardian. When the Glitch broke the trials, she heard silence where the next verse should have been. She has been screaming lightning into it ever since.',
      tip:'Pillars and grid cells glow before they strike, so read the pattern and stand in the dark squares. Tornadoes pull you in. Ball lightning bursts when it fades.' },
    { name:'The First Page', title:'The Architect — Author of the Trials', color:M_INK,
      lore:'Before the Shrine, before the Void, before the first guardian drew breath, someone wrote the trials. The Architect drew every arena on a single page and gave each boss its attacks. Now that you have beaten them all, it opens the page one last time to write your ending.',
      tip:'It replays the attacks of the bosses it created. Lattice lines strike in sets, and the heart of a blueprint star is safe until its centre ignites. When the margins close in, stay on the page.' }
);
ABYSS_EPILOGUES.push(
    'Kaelthar lowers his blade. For the first time in an age, the black sun sets.',
    'The storm breaks. Nyxara folds her wings, and the sky above the Stormspire is quiet and blue.',
    'The pen falls from the Architect’s hand. The last page is blank, and it is yours to write.'
);
BOSS_NAMES.push('Kaelthar', 'Nyxara', 'The Architect');
Object.assign(MATERIALS, { sun_fragment:'Black Sun Fragment', thunder_plume:'Thunderhead Plume', blank_page:'Blank Page' });
BOSS_DROPS.push(['sun_fragment'], ['thunder_plume'], ['blank_page']);
RECIPES.push({ id:'ascendant_halo', station:'accessory', name:'Ascendant Halo', cost:['sun_fragment','thunder_plume','blank_page'],
    desc:'Healing restores 40% of max HP and recharges 35% faster.' });
Object.assign(ARTIFACTS, {
    eclipse_sigil:{ name:'Eclipse Sigil', icon:'🌑', color:M_SUN, boss:'Kaelthar', desc:'For 2.5 seconds after a dash, deal 25% more damage.' },
    storm_feather:{ name:'Storm Feather', icon:'🪶', color:M_SKY, boss:'Nyxara', desc:'+10% movement speed. Every 5th attack calls lightning on the boss for 150% of your weapon damage.' },
    architect_quill:{ name:'Architect’s Quill', icon:'🖋', color:M_INK, boss:'The Architect', desc:'+20% damage dealt and 15% less damage taken.' },
    ascendant_halo:{ name:'Ascendant Halo', icon:'😇', color:'#fff1b8', boss:'Crafting', desc:'Healing restores 40% of max HP and recharges 35% faster.' }
});
weapons.push(
    { name:'Eclipse Edge',  damage:1500, cooldown:460, mana:0,  color:M_SUN, category:'melee'  },
    { name:'Tempest Bow',   damage:1500, cooldown:560, mana:10, color:M_SKY, category:'ranged' },
    { name:'Genesis Codex', damage:3200, cooldown:800, mana:32, color:M_INK, category:'magic'  }
);
while (weaponAdaptation.length < weapons.length){ weaponAdaptation.push(0); weaponAdaptTurned.push(false); }
for (let i=MYTH_WEAPON;i<weapons.length;i++){
    const el = document.createElement('button');
    el.className = 'weapon hidden'; el.dataset.id = i; el.type = 'button';
    el.innerHTML = `<span class="name">${weapons[i].name}</span><span class="adapt">Adapt: <span id="adapt${i}">0%</span></span>`;
    el.onclick = () => { if (inventory.includes(i)){ weapon = i; updateWeaponUI(); } };
    document.getElementById('weapons').appendChild(el);
}

Object.assign(ABYSS_DEFS, {
    knight:{ hp:130000, radius:70, biome:'colosseum', css:'eclipse', contact:90, dmgMult:4, cooldown:1250,
        reward:{ weapon:MYTH_WEAPON, artifact:'eclipse_sigil', maxHp:500 },
        phaseLines:['', '', '🌑 Kaelthar draws the black sun into his blade.', '🌑 Total eclipse! The knight moves like a storm of shadows.'] },
    seraph:{ hp:160000, radius:66, biome:'stormspire', css:'storm', contact:85, dmgMult:4.5, cooldown:1200,
        reward:{ weapon:MYTH_WEAPON+1, artifact:'storm_feather', maxHp:600 },
        phaseLines:['', '', '⚡ Nyxara unfurls all six wings.', '⚡ The Stormspire screams. The tempest is here.'] },
    architect:{ hp:660000, radius:80, biome:'firstpage', css:'architect', contact:90, dmgMult:5, cooldown:1300,
        reward:{ weapon:MYTH_WEAPON+2, artifact:'architect_quill', maxHp:800 },
        phases:[.75,.5,.25], phaseNames:['', 'FIRST DRAFT', 'REVISION', 'REWRITE', 'FINAL DRAFT'],
        phaseLines:['', '', '📜 The Architect turns the page. Its creations answer.', '📜 The Architect erases the margins of the world.', '📜 FINAL DRAFT. The Architect writes your ending.'] }
});
ABYSS_KIND.push(...MYTH_KINDS);

// ---------------- Runtime state and helpers ----------------
const myth = { shots:[], hazards:[], playerShots:[], fx:[], weather:null, sigilUntil:-1e9, attacks:0, prevHeal:0 };
const mPick = a => a[Math.floor(Math.random()*a.length)];
function mythBoss(){ const b = abyss.boss; return b && MYTH_KINDS.includes(b.kind) ? b : null; }
function mClampPt(x,y){ return { x:clamp(x,50,canvas.width-50), y:clamp(y,140,GROUND()-30) }; }
function mShot(x,y,a,speed,dmg,r,kind,color,life=3200,extra={}){
    myth.shots.push({ x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, speed, angle:a, dmg, r, kind, color, life, age:0, ...extra });
}
function mBlast(x,y,r,warn,dmg,style,color,extra={}){
    myth.hazards.push({ kind:'blast', x, y, r, warn, warnMax:warn, dmg, style, color, life:420, lifeMax:420, fired:false, ...extra });
}
function mLine(x1,y1,x2,y2,width,warn,life,dmg,color,extra={}){
    myth.hazards.push({ kind:'line', x1, y1, x2, y2, width, warn, warnMax:warn, life, lifeMax:life, dmg, color, ...extra });
}
function mLineThrough(cx,cy,a,width,warn,life,dmg,color){
    const L = 2400, dx = Math.cos(a)*L, dy = Math.sin(a)*L;
    mLine(cx-dx, cy-dy, cx+dx, cy+dy, width, warn, life, dmg, color);
}
function mLane(x1,y1,x2,y2,width,warn,color){ myth.hazards.push({ kind:'lane', x1, y1, x2, y2, width, warn, warnMax:warn, color }); }
function mPillar(x,width,warn,life,dmg,color,extra={}){
    myth.hazards.push({ kind:'pillar', x, width, warn, warnMax:warn, life, lifeMax:life, dmg, color, ...extra });
}
function mCell(x,y,w,h,warn,life,dmg,color){ myth.hazards.push({ kind:'cell', x, y, w, h, warn, warnMax:warn, life, lifeMax:life, dmg, color }); }
// Shockwave rings and rotating beams reuse the hard-boss hazards, so they share their collision rules.
function mRing(x,y,dmg,color,extra={}){
    abyss.hazards.push({ kind:'ring', x, y, r:20, speed:7, max:Math.hypot(canvas.width,canvas.height), band:24,
        gap:angleTo({x,y},player)+random(-.7,.7), gapWidth:.8, dmg, delay:0, color, hit:false, ...extra });
}
function mBeam(b,angle,spin,warn,life,width,dmg,color){
    abyss.hazards.push({ kind:'beam', follow:b, x:b.x, y:b.y, angle, spin, len:2000, width, warn, warnMax:warn, life, lifeMax:life, dmg, color });
}

// ---------------- Dashes (Kaelthar and Nyxara) ----------------
// A lane appears, the boss crosses it in a blink, and the path erupts behind it.
function mDashBegin(b, count, opts){
    b.hold = true; b.ghosts = b.ghosts || [];
    b.data.dash = { left:count, active:null, wait:0, opts };
    mDashAim(b, opts.firstWarn);
}
function mDashAim(b, warn){
    const d = b.data.dash, a = angleTo(b, player), reach = distance(b, player) + d.opts.over;
    d.target = mClampPt(b.x + Math.cos(a)*reach, b.y + Math.sin(a)*reach);
    d.wait = warn;
    mLane(b.x, b.y, d.target.x, d.target.y, d.opts.width, warn, d.opts.color);
}
function mGo(b){
    const d = b.data.dash; if (!d) return;
    d.wait = 0; b.stateTimer = d.left*(d.opts.dur + d.opts.nextWarn) + 700;
}
function mDashTick(b, dt){
    const d = b.data.dash; if (!d || d.done) return;
    if (d.active){
        const s = d.active, px = b.x, py = b.y;
        s.t += dt;
        const k = abEase(Math.min(1, s.t/s.dur));
        b.x = s.fx + (s.tx-s.fx)*k; b.y = s.fy + (s.ty-s.fy)*k;
        b.ghosts.push({ x:b.x, y:b.y, age:0 });
        // The swept path also hits, so a fast dash never skips over the player.
        if (pointSegDist(player.x, player.y, px, py, b.x, b.y) < b.radius*.8 + player.radius) hurtPlayer(d.opts.dmg, d.opts.color);
        if (s.t >= s.dur){
            d.active = null; d.left--;
            d.opts.after(b, s);
            if (d.left > 0) mDashAim(b, d.opts.nextWarn); else d.done = true;
        }
    } else {
        d.wait -= dt;
        if (d.wait <= 0) d.active = { fx:b.x, fy:b.y, tx:d.target.x, ty:d.target.y, t:0, dur:d.opts.dur };
    }
}

// ================================================================
//  KAELTHAR — THE ECLIPSE KNIGHT
// ================================================================
function kDash(b, count, warn){
    mDashBegin(b, count, { firstWarn:warn, nextWarn:b.phase >= 3 ? 380 : 460, dur:240, over:180, width:b.radius*1.3, dmg:110, color:M_SUN, after:kTrail });
}
function kTrail(b, s){
    const n = Math.max(1, Math.floor(Math.hypot(s.tx-s.fx, s.ty-s.fy)/80));
    for (let i=1;i<=n;i++){ const q = i/n; mBlast(s.fx+(s.tx-s.fx)*q, s.fy+(s.ty-s.fy)*q, 40, 380+i*40, 80, 'eclipse', M_SUN); }
    if (b.phase >= 2){ const off = random(0,1); for (let i=0;i<8;i++) mShot(s.tx, s.ty, off+i*AB_TAU/8, 4.2, 70, 10, 'dark', M_SUN, 3200); }
}
function kWaves(b, off){
    const n = 3 + (b.phase >= 2 ? 2 : 0), a = angleTo(b, player);
    for (let i=0;i<n;i++) mShot(b.x, b.y, a+off+(i-(n-1)/2)*.38, 7.2, 95, 30, 'wave', M_SUN, 3200, { pierce:true });
}
function kLeapMark(b, warn){
    mBlast(player.x, player.y, 110, warn, 120, 'sunfall', M_SUN, { follow:true, lockAt:380, onFire:h => kSlam(b, h) });
}
function kSlam(b, h){
    b.x = h.x; b.y = clamp(h.y - 20, 130, GROUND()-90); b.data.air = false;
    mRing(h.x, h.y, 100, M_SUN);
    if (b.phase >= 2) mRing(h.x, h.y, 100, M_EMBER, { delay:380 });
    particle(h.x, h.y, M_SUN, 24, 8, .9);
    if (--b.data.slams > 0) b.data.again = 650;
}
ABYSS_ATTACKS.knight = [
    { id:'eclipseDash', label:'ECLIPSE DASH', phase:1, telegraph:650, duration:1000,
      start(b){ kDash(b, Math.min(3, b.phase), b.telegraphMax); }, fire(b){ mGo(b); }, tick:mDashTick },
    { id:'cross', label:'CROSS OF THE BLACK SUN', phase:1, telegraph:550, duration:1700, fire(b){
        const cx = player.x, cy = player.y, r = random(0, Math.PI);
        for (const o of [Math.PI/4, -Math.PI/4]) mLineThrough(cx, cy, r+o, 34, 700, 380, 100, M_SUN);
        if (b.phase >= 2) for (const o of [0, Math.PI/2]) mLineThrough(cx, cy, r+o, 34, 1250, 380, 100, M_EMBER);
    }},
    { id:'waves', label:'CRESCENT WAVES', phase:1, telegraph:550, duration:1500,
      fire(b){ kWaves(b, 0); b.data.n = 1; b.tick = 0; },
      tick(b,dt){ b.tick += dt; if (b.phase >= 2 && b.data.n < (b.phase >= 3 ? 3 : 2) && b.tick >= 520){ b.tick = 0; kWaves(b, b.data.n++ % 2 ? .19 : 0); } } },
    { id:'leap', label:'SUNFALL LEAP', phase:1, telegraph:420, duration:2300,
      start(b){ b.hold = true; },
      fire(b){ b.data.air = true; b.data.slams = b.phase >= 3 ? 2 : 1; kLeapMark(b, 1150); b.stateTimer = 1150 + (b.data.slams-1)*1600 + 900; },
      tick(b,dt){
          if (b.data.again > 0){ b.data.again -= dt; if (b.data.again <= 0){ b.data.air = true; kLeapMark(b, 900); } }
          if (b.data.air) b.y += (-260-b.y)*(1-Math.pow(.86, dt/16.67));
      } },
    { id:'blades', label:'THOUSAND BLADES', phase:2, telegraph:600, duration:3200, fire(b){
        const cols = 16, waves = b.phase >= 3 ? 4 : 3;
        let gapAt = Math.floor(random(2, cols-3));
        for (let w=0; w<waves; w++){
            if (w) gapAt = clamp(gapAt + mPick([-3,-2,2,3]), 1, cols-3);
            for (let i=0;i<cols;i++){
                if (i === gapAt || i === gapAt+1) continue;
                const x = 30 + (canvas.width-60)*i/(cols-1);
                mShot(x, 70, Math.PI/2, 0, 100, 12, 'sword', M_LIGHT, 4000, { delay:650 + w*820 + (w%2 ? cols-1-i : i)*28, speed:12.5, pierce:true });
            }
        }
        b.stateTimer = 650 + waves*820 + 1200;
    }},
    { id:'mirror', label:'UMBRAL MIRROR', phase:2, telegraph:500, duration:2800, fire(b){
        const n = b.phase >= 3 ? 5 : 3, base = random(0, AB_TAU);
        for (let i=0;i<n;i++){
            const a = base + i*AB_TAU/n, p = mClampPt(player.x+Math.cos(a)*320, player.y+Math.sin(a)*260), warn = 750 + i*300;
            myth.hazards.push({ kind:'clone', x:p.x, y:p.y, sx:p.x, sy:p.y, angle:a+Math.PI, warn, warnMax:warn, lockAt:260, t:0, dur:300, len:640, fade:350, dmg:100, color:M_SUN });
        }
        b.stateTimer = 750 + n*300 + 900;
    }},
    { id:'corona', label:'CORONA BURST', phase:2, telegraph:700, duration:3000,
      start(b){ b.hold = true; },
      tick(b,dt){
          b.tick += dt; b.data.ring = (b.data.ring || 0) + dt;
          while (b.tick >= 120){ b.tick -= 120; b.spin += .21; const arms = b.phase >= 3 ? 3 : 2;
              for (let i=0;i<arms;i++){
                  mShot(b.x, b.y, b.spin+i*AB_TAU/arms, 4.1, 70, 9, 'dark', M_SUN, 3600);
                  mShot(b.x, b.y, -b.spin+i*AB_TAU/arms+.4, 3.4, 70, 9, 'dark', M_EMBER, 3600);
              } }
          if (b.data.ring >= 1000){ b.data.ring = 0; const off = random(0,1); for (let i=0;i<14;i++) mShot(b.x, b.y, off+i*AB_TAU/14, 2.6, 70, 12, 'dark', M_LIGHT, 4200); }
      } },
    { id:'totalEclipse', label:'TOTAL ECLIPSE', phase:3, telegraph:900, duration:5200,
      start(b){ kDash(b, 5, b.telegraphMax); b.data.dash.opts.nextWarn = 540; },
      fire(b){ abyss.weather = { kind:'eclipse', life:5600, max:5600 }; mGo(b); },
      tick:mDashTick }
];
const KNIGHT_FINAL = { id:'blackSun', special:true, label:'BLACK SUN JUDGEMENT', phase:3, telegraph:900, duration:6400,
    start(b){
        b.hold = true; abPortalFx(b.x, b.y, M_SUN, .8);
        b.x = canvas.width/2; b.y = 250; abPortalFx(b.x, b.y, M_SUN, 1.2);
        showMessage('🌑 Kaelthar raises the black sun. Survive its judgement!');
    },
    fire(b){
        const dir = Math.random() < .5 ? 1 : -1, a = angleTo(b, player) + Math.PI/4;
        for (let k=0;k<4;k++) mBeam(b, a+k*Math.PI/2, .00075*dir, 1100, 5600, 30, 110, M_SUN);
        b.charging = 1100; b.chargeMax = 1100; b.tick = 0; b.data.ring = 0;
    },
    tick(b,dt){
        b.charging = Math.max(0, (b.charging || 0) - dt); b.tick += dt; b.data.ring += dt;
        if (b.charging <= 0 && b.tick >= 260){ b.tick = 0; b.spin += .5; for (let i=0;i<2;i++) mShot(b.x, b.y, b.spin+i*Math.PI, 3.6, 70, 9, 'dark', M_EMBER, 3800); }
        if (b.data.ring >= 1500 && b.stateTimer > 900){ b.data.ring = 0; mRing(b.x, b.y, 100, M_LIGHT); }
        if (b.stateTimer <= 0 && !b.data.done){ b.data.done = true; b.stun = 2800; showMessage('🌑 Kaelthar kneels. He takes 50% more damage!'); }
    } };
ABYSS_ATTACKS.knight.push(KNIGHT_FINAL);

// ================================================================
//  NYXARA — THE STORM SERAPH
// ================================================================
function nSpears(b){
    const n = 3 + b.phase;
    for (let i=0;i<n;i++){
        const a = -Math.PI/2 + (i-(n-1)/2)*.45;
        mShot(b.x+Math.cos(a)*100, b.y+Math.sin(a)*75, 0, 0, 90, 8, 'spear', M_BOLT, 3000, { warn:620+i*90, lockAt:220, speed:14 });
    }
}
function nDiveTrail(b, s){
    const n = Math.max(1, Math.floor(Math.hypot(s.tx-s.fx, s.ty-s.fy)/90));
    for (let i=1;i<=n;i++){ const q = i/n; mBlast(s.fx+(s.tx-s.fx)*q, s.fy+(s.ty-s.fy)*q, 44, 300+i*40, 80, 'bolt', M_BOLT); }
    if (b.phase >= 3){ const off = random(0,1); for (let i=0;i<6;i++) mShot(s.tx, s.ty, off+i*AB_TAU/6, 7.5, 70, 5, 'zap', M_BOLT, 1600); }
}
ABYSS_ATTACKS.seraph = [
    { id:'spears', label:'THUNDER SPEARS', phase:1, telegraph:450, duration:1500,
      fire(b){ nSpears(b); b.data.n = 1; b.tick = 0; },
      tick(b,dt){ b.tick += dt; if (b.phase >= 2 && b.data.n < 2 && b.tick >= 750){ b.data.n++; nSpears(b); } } },
    { id:'pillars', label:'THUNDER PILLARS', phase:1, telegraph:500, duration:2400, fire(b){
        const W = canvas.width;
        if (Math.random() < .5){
            const n = 11, dir = Math.random() < .5 ? 1 : -1;
            for (let i=0;i<n;i++){ const k = dir > 0 ? i : n-1-i; mPillar(40 + (W-80)*k/(n-1), 60, 650 + i*120, 380, 95, M_BOLT); }
            if (b.phase >= 2) for (let i=0;i<n-1;i++){ const k = dir > 0 ? n-2-i : i; mPillar(40 + (W-80)*(k+.5)/(n-1), 60, 650 + n*120 + 200 + i*120, 380, 95, M_SKY); }
        } else {
            const shots = 4 + b.phase;
            for (let i=0;i<shots;i++) mPillar(player.x, 90, 600 + i*360, 380, 100, M_BOLT, { hunt:true });
        }
        b.stateTimer = 2600 + (b.phase >= 2 ? 1400 : 0);
    }},
    { id:'feathers', label:'FEATHER STORM', phase:1, telegraph:550, duration:1900,
      fire(b){ b.data.w = 0; b.tick = 1e9; },
      tick(b,dt){
          b.tick += dt;
          if (b.data.w < 4 + b.phase && b.tick >= 280){
              b.tick = 0;
              const a = angleTo(b, player), n = 7, off = b.data.w % 2 ? .11 : -.11, turn = b.data.w % 2 ? 1 : -1;
              for (let i=0;i<n;i++) mShot(b.x, b.y, a+off+(i-(n-1)/2)*.22, 6.4, 75, 7, 'feather', i%2 ? M_MIST : M_SKY, 3000, { curve:turn*.0006 });
              b.data.w++;
          }
      } },
    { id:'cyclone', label:'CYCLONE', phase:2, telegraph:600, duration:1100, fire(b){
        const n = b.phase >= 3 ? 3 : 2;
        for (let i=0;i<n;i++){
            const p = mClampPt(i === 0 ? player.x + random(-200,200) : random(120, canvas.width-120), random(220, GROUND()-80));
            myth.hazards.push({ kind:'tornado', x:p.x, y:p.y, vx:0, vy:0, warn:700, warnMax:700, life:6500, lifeMax:6500, tick:0, dmg:85, spin:random(0,6) });
        }
    }},
    { id:'grid', label:'JUDGMENT GRID', phase:2, telegraph:600, duration:2800, fire(b){
        const size = 128, top = 130, bottom = GROUND(), cols = Math.ceil(canvas.width/size), rows = Math.ceil((bottom-top)/size);
        const waves = b.phase >= 3 ? 3 : 2;
        for (let w=0; w<waves; w++) for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){
            if ((r+c+w) % 2) continue;
            const y = top + r*size;
            mCell(c*size, y, size, Math.min(size, bottom-y), 850 + w*900, 360, 95, w%2 ? M_SKY : M_BOLT);
        }
        b.stateTimer = 850 + waves*900 + 600;
    }},
    { id:'dive', label:'STORM DIVE', phase:2, telegraph:650, duration:1000,
      start(b){ mDashBegin(b, b.phase >= 3 ? 3 : 2, { firstWarn:b.telegraphMax, nextWarn:420, dur:200, over:220, width:70, dmg:100, color:M_BOLT, after:nDiveTrail }); },
      fire(b){ mGo(b); }, tick:mDashTick },
    { id:'ball', label:'BALL LIGHTNING', phase:3, telegraph:600, duration:1400, fire(b){
        const a = angleTo(b, player);
        for (const o of [-.5, 0, .5]) mShot(b.x, b.y, a+o, 2.1, 95, 22, 'ball', M_BOLT, 4400, { zapT:500, pierce:true });
    }},
    { id:'tempest', label:'TEMPEST', phase:3, telegraph:700, duration:5000,
      fire(){ myth.weather = { kind:'storm', life:6200, max:6200, tick:0 }; },
      tick(b,dt){ b.tick += dt; while (b.tick >= 170){ b.tick -= 170; b.spin += .33; for (let i=0;i<2;i++) mShot(b.x, b.y, b.spin+i*Math.PI, 4.2, 70, 7, 'feather', M_MIST, 3400); } } }
];
const SERAPH_FINAL = { id:'wrath', special:true, label:'WRATH OF HEAVEN', phase:3, telegraph:1000, duration:7600,
    start(b){
        b.hold = true; abPortalFx(b.x, b.y, M_SKY, .8);
        b.x = canvas.width/2; b.y = 170;
        showMessage('⚡ Nyxara calls down the WRATH OF HEAVEN! Find the gap in the storm wall.');
    },
    fire(b){
        const W = canvas.width, sweep = 3000, gapY = () => random(220, GROUND()-140);
        mPillar(-20, 150, 900, sweep, 120, M_BOLT, { vx:(W+100)/sweep, gapY:gapY(), gapH:150 });
        mPillar(W+20, 150, 900+sweep+300, sweep, 120, M_SKY, { vx:-(W+100)/sweep, gapY:gapY(), gapH:150 });
        myth.weather = { kind:'storm', life:7600, max:7600, tick:0 };
        b.tick = 0;
    },
    tick(b,dt){
        b.tick += dt;
        if (b.tick >= 1100 && b.stateTimer > 900){ b.tick = 0; nSpears(b); }
        if (b.stateTimer <= 0 && !b.data.done){ b.data.done = true; b.stun = 2800; showMessage('⚡ Nyxara’s wings falter. She takes 50% more damage!'); }
    } };
ABYSS_ATTACKS.seraph.push(SERAPH_FINAL);

// ================================================================
//  THE ARCHITECT — AUTHOR OF THE TRIALS
// ================================================================
// Echoes: the Architect replays the signature attacks of the bosses it wrote, in its own gold ink.
const ARCH_ECHOES = [
    { label:'MOONFALL', boss:'selene', id:'moonfall' }, { label:'AVALANCHE', boss:'vael', id:'avalanche' },
    { label:'FROST SPIKES', boss:'vael', id:'spikes' }, { label:'GEAR AVALANCHE', boss:'horologue', id:'gears' },
    { label:'MIDNIGHT', boss:'horologue', id:'midnight' }, { label:'GLITCH BONES', boss:'glitch', id:'bones' }
];
function aEcho(b, e){
    const atk = ABYSS_ATTACKS[e.boss].find(a => a.id === e.id); if (!atk || !atk.fire) return;
    const s0 = abyss.shots.length, h0 = abyss.hazards.length, ph = b.phase, data = b.data, tick = b.tick;
    b.phase = Math.min(3, ph); b.data = {};
    try { atk.fire(b); } finally { b.phase = ph; b.data = data; b.tick = tick; }
    for (const x of [...abyss.shots.slice(s0), ...abyss.hazards.slice(h0)]){
        if (x.dmg > 100) x.dmg = 100;
        if (x.color && x.kind !== 'bone') x.color = M_INK;
    }
    abPortalFx(b.x, b.y, M_INK, .7);
}
function aStar(cx,cy,R,n,k,rot,warn){
    const pts = Array.from({ length:n }, (_,i) => ({ x:cx+Math.cos(rot+i*AB_TAU/n)*R, y:cy+Math.sin(rot+i*AB_TAU/n)*R }));
    for (let i=0;i<n;i++){ const p = pts[i], q = pts[(i+k)%n]; mLine(p.x, p.y, q.x, q.y, 18, warn, 420, 100, M_INK); }
    myth.hazards.push({ kind:'circle', x:cx, y:cy, r:R, life:warn+420, lifeMax:warn+420 });
}
function aLattice(b, delay=0){
    const W = canvas.width, top = 120, bot = GROUND(), sp = 150, ox = random(20,sp), oy = random(20,sp);
    for (let x=ox; x<W; x+=sp) mLine(x, top, x, bot+30, 16, 800+delay, 420, 95, M_INK);
    for (let y=top+oy; y<bot; y+=sp) mLine(-20, y, W+20, y, 16, 1500+delay, 420, 95, M_BLUE);
    if (b.phase >= 3) for (let x=-bot; x<W; x+=260) mLine(x, top, x+(bot-top), bot, 14, 2200+delay, 420, 95, M_INK);
}
function aMargin(max, hold){ myth.hazards.push({ kind:'margin', t:0, grow:1300, hold, shrink:800, max, k:0, dmg:80 }); }
ABYSS_ATTACKS.architect = [
    { id:'lattice', label:'LATTICE', phase:1, telegraph:600, duration:2700, fire(b){ aLattice(b); } },
    { id:'platonic', label:'PLATONIC VOLLEY', phase:1, telegraph:500, duration:2600, fire(b){
        const n = 6 + b.phase*2;
        for (let i=0;i<n;i++) mShot(b.x, b.y, 0, 0, 85, 13, 'poly', i%2 ? M_INK : M_BLUE, 5200,
            { sides:3+i%4, orbit:b, orbA:i*AB_TAU/n, orbR:0, release:850+i*90, speed:7.2+b.phase*.3 });
    }},
    { id:'compass', label:'DIVINE COMPASS', phase:1, telegraph:950, duration:3900, start(b){
        const dir = Math.random() < .5 ? 1 : -1, a = angleTo(b, player) + Math.PI/4, m = b.phase >= 3 ? 1.5 : 1;
        for (let k=0;k<4;k++) mBeam(b, a+k*Math.PI/2, .0007*m*dir, 950, 3700, 22, 95, M_INK);
        if (b.phase >= 2) for (let k=0;k<2;k++) mBeam(b, a+Math.PI/4+k*Math.PI, -.0011*m*dir, 950, 3700, 12, 90, M_BLUE);
        b.hold = true;
    }},
    { id:'echo', label:'ECHO OF CREATION', phase:2, telegraph:650, duration:2600,
      start(b){ b.data.echo = mPick(ARCH_ECHOES); showAttackWarning('⚠ ECHO: ' + b.data.echo.label); },
      fire(b){ aEcho(b, b.data.echo); } },
    { id:'blueprint', label:'BLUEPRINT', phase:2, telegraph:600, duration:2800, fire(b){
        const cx = player.x, cy = player.y, rot = random(0, AB_TAU);
        aStar(cx, cy, 270, 5, 2, rot, 1000);
        if (b.phase >= 3) aStar(cx, cy, 270, 5, 2, rot + Math.PI/5, 2000);
        mBlast(cx, cy, 90, b.phase >= 3 ? 2500 : 1900, 100, 'glyph', M_INK);
    }},
    { id:'genesis', label:'GENESIS SPIRAL', phase:3, telegraph:600, duration:3200,
      start(b){ b.hold = true; },
      tick(b,dt){
          b.tick += dt;
          while (b.tick >= 50){ b.tick -= 50; b.data.k = (b.data.k || 0) + 1;
              mShot(b.x, b.y, b.data.k*2.39996323, 3.2, 80, 8, 'glyph', b.data.k % 2 ? M_INK : M_BLUE, 4200); }
      } },
    { id:'erasure', label:'ERASURE', phase:3, telegraph:800, duration:4200,
      fire(b){ aMargin(.27, 4400); b.tick = 0; },
      tick(b,dt){ b.tick += dt; if (b.tick >= 800){ b.tick = 0; const off = random(0,1); for (let i=0;i<10;i++) mShot(b.x, b.y, off+i*AB_TAU/10, 3, 80, 12, 'poly', M_INK, 4000, { sides:4 }); } } },
    { id:'redraft', label:'REDRAFT', phase:4, telegraph:500, duration:3600,
      start(b){ b.hold = true; },
      fire(b){
          const W = canvas.width, spots = [{ x:W*.2, y:200 }, { x:W*.5, y:170 }, { x:W*.8, y:200 }], real = Math.floor(Math.random()*3);
          abPortalFx(b.x, b.y, M_INK, .7);
          b.x = spots[real].x; b.y = spots[real].y;
          spots.forEach((p,i) => { if (i !== real){ myth.fx.push({ kind:'decoy', x:p.x, y:p.y, age:0, life:3700 }); abPortalFx(p.x, p.y, M_INK, .7); } });
          b.tick = 600;
      },
      tick(b,dt){
          b.tick += dt;
          if (b.tick >= 900 && b.stateTimer > 500){
              b.tick = 0;
              for (const src of [b, ...myth.fx.filter(f => f.kind === 'decoy')]){
                  const a = angleTo(src, player);
                  for (let i=0;i<5;i++) mShot(src.x, src.y, a+(i-2)*.24, 6.4, 85, 12, 'poly', src === b ? M_INK : M_BLUE, 4000, { sides:3+i%3 });
              }
          }
      } }
];
const ARCH_FINAL = { id:'finalPage', special:true, label:'THE FINAL PAGE', phase:4, telegraph:1000, duration:9000,
    start(b){
        b.hold = true; abPortalFx(b.x, b.y, M_INK, .8);
        b.x = canvas.width/2; b.y = 220; abPortalFx(b.x, b.y, M_INK, 1.4);
        showMessage('📜 The Architect begins THE FINAL PAGE...');
    },
    fire(b){
        aMargin(.16, 7400);
        const dir = Math.random() < .5 ? 1 : -1, a = angleTo(b, player);
        for (let k=0;k<3;k++) mBeam(b, a+Math.PI/3+k*AB_TAU/3, .0006*dir, 1200, 8000, 20, 95, M_INK);
        b.tick = 0; b.data.n = 0; b.charging = 1200; b.chargeMax = 1200;
    },
    tick(b,dt){
        b.charging = Math.max(0, (b.charging || 0) - dt); b.tick += dt;
        if (b.tick >= 2300 && b.stateTimer > 1500){
            b.tick = 0; b.data.n++;
            if (b.data.n % 2){ const e = mPick(ARCH_ECHOES); showAttackWarning('⚠ ECHO: ' + e.label); aEcho(b, e); }
            else aStar(player.x, player.y, 240, 5, 2, random(0, AB_TAU), 900);
        }
        if (b.stateTimer <= 0 && !b.data.done){
            b.data.done = true; b.stun = 3500;
            myth.hazards = myth.hazards.filter(h => h.kind !== 'margin');
            showMessage('📜 The Architect is UNWRITTEN. It takes 50% more damage!');
        }
    } };
ABYSS_ATTACKS.architect.push(ARCH_FINAL);

// Desperation attacks fire once, when a mythic boss is idle in its last phase below the threshold.
const MYTH_FINALS = { knight:[KNIGHT_FINAL, 3, .15], seraph:[SERAPH_FINAL, 3, .12], architect:[ARCH_FINAL, 4, .10] };
function mythDesperation(b){
    const f = MYTH_FINALS[b.kind];
    if (!f || b.finalDone || b.state !== 'idle' || b.stun > 0) return;
    if (b.phase >= f[1] && b.hp/b.maxHp <= f[2]){ b.finalDone = true; abStartAttack(b, f[0]); }
}

// ---------------- Movement ----------------
const abMoveOrig = abMoveBoss;
abMoveBoss = function(b, dt){
    if (!MYTH_KINDS.includes(b.kind)) return abMoveOrig(b, dt);
    if (b.hold || b.stun > 0) return;
    const W = canvas.width, slow = b.state === 'telegraph' ? .4 : 1;
    let tx, ty, k;
    if (b.kind === 'knight'){
        // He stalks the player from one side and switches sides when they get close.
        b.side = b.side || 1;
        if (Math.abs(b.x - player.x) < 120 && Math.random() < dt/1500) b.side = -b.side;
        tx = clamp(player.x + b.side*230, 100, W-100); ty = clamp(player.y - 170, 170, GROUND()-150); k = .028;
    } else if (b.kind === 'seraph'){
        tx = W/2 + Math.sin(b.age*.00062)*W*.34; ty = 250 + Math.sin(b.age*.00124)*45; k = .045;
    } else {
        tx = W/2 + Math.sin(b.age*.00028)*W*.16; ty = 215 + Math.sin(b.age*.00056)*28; k = .02;
    }
    const f = 1 - Math.pow(1-k*slow, dt/16.67);
    b.x += (tx-b.x)*f; b.y += (ty-b.y)*f;
    b.x = clamp(b.x, 90, W-90); b.y = clamp(b.y, 120, GROUND()-120);
};

// ---------------- Combat update ----------------
function mMarginRect(h){
    const W = canvas.width, top = 120, bot = GROUND(), ix = W*h.max*h.k, iy = (bot-top)*h.max*h.k;
    return { x0:ix, y0:top+iy, x1:W-ix, y1:bot-iy*.5 };
}
function updateMythCombat(dt){
    const step = dt*.06;
    for (let i=myth.shots.length-1;i>=0;i--){
        const s = myth.shots[i];
        s.age += dt;
        if (s.delay > 0){ s.delay -= dt; if (s.delay > 0) continue; s.vx = 0; s.vy = s.speed; }
        if (s.warn > 0){
            s.warn -= dt;
            if (s.warn > s.lockAt) s.angle = angleTo(s, player);
            if (s.warn <= 0){ s.vx = Math.cos(s.angle)*s.speed; s.vy = Math.sin(s.angle)*s.speed; }
            else continue;
        }
        if (s.orbit){
            if (s.age < s.release){
                s.orbR += (115-s.orbR)*(1-Math.exp(-dt/160)); s.orbA += .0028*dt;
                s.x = s.orbit.x + Math.cos(s.orbA)*s.orbR; s.y = s.orbit.y + Math.sin(s.orbA)*s.orbR;
            } else {
                const a = angleTo(s, player); s.vx = Math.cos(a)*s.speed; s.vy = Math.sin(a)*s.speed; s.orbit = null;
            }
        }
        if (s.curve && s.age < 900){
            const c = Math.cos(s.curve*dt), sn = Math.sin(s.curve*dt);
            [s.vx, s.vy] = [s.vx*c - s.vy*sn, s.vx*sn + s.vy*c];
        }
        if (s.kind === 'ball'){
            s.zapT -= dt;
            if (s.zapT <= 0){ s.zapT = 650; mShot(s.x, s.y, angleTo(s, player), 8.5, 70, 5, 'zap', M_BOLT, 1600); }
            if (s.life <= dt){ const off = random(0,1); for (let k=0;k<10;k++) mShot(s.x, s.y, off+k*AB_TAU/10, 6, 70, 5, 'zap', M_BOLT, 1600); }
        }
        if (!s.orbit){ s.x += s.vx*step; s.y += s.vy*step; }
        s.life -= dt;
        if (s.life <= 0 || s.x < -200 || s.x > canvas.width+200 || s.y < -200 || s.y > canvas.height+200){ myth.shots.splice(i,1); continue; }
        let touching;
        if (s.kind === 'sword') touching = pointSegDist(player.x, player.y, s.x, s.y-8, s.x, s.y+50) < 8 + player.radius*.7;
        else touching = Math.hypot(s.x-player.x, s.y-player.y) < s.r*(s.kind === 'wave' ? .85 : 1) + player.radius*.8;
        if (player.invincible <= 0 && touching && hurtPlayer(s.dmg, s.color) && !s.pierce) myth.shots.splice(i,1);
    }
    for (let i=myth.hazards.length-1;i>=0;i--){
        const h = myth.hazards[i];
        if (h.kind === 'blast'){
            if (h.warn > 0){
                if (h.follow && h.warn > h.lockAt){ const f = 1-Math.exp(-dt/120); h.x += (player.x-h.x)*f; h.y += (player.y-h.y)*f; }
                h.warn -= dt; if (h.warn > 0) continue;
            }
            if (!h.fired){
                h.fired = true;
                if (distance(h, player) < h.r + player.radius*.7) hurtPlayer(h.dmg, h.color);
                particle(h.x, h.y, h.color, 16, 6, .7);
                if (h.onFire) h.onFire(h);
            }
            h.life -= dt; if (h.life <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'line'){
            if (h.warn > 0){ h.warn -= dt; continue; }
            h.life -= dt;
            if (pointSegDist(player.x, player.y, h.x1, h.y1, h.x2, h.y2) < h.width/2 + player.radius*.7) hurtPlayer(h.dmg, h.color);
            if (h.life <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'lane'){
            h.warn -= dt; if (h.warn <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'circle'){
            h.life -= dt; if (h.life <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'pillar'){
            if (h.warn > 0){
                if (h.hunt && h.warn > 300) h.x += (player.x-h.x)*(1-Math.exp(-dt/90));
                h.warn -= dt; continue;
            }
            h.life -= dt;
            if (h.vx) h.x += h.vx*dt;
            const inGap = h.gapH && Math.abs(player.y - h.gapY) < h.gapH/2 - player.radius*.5;
            if (Math.abs(player.x - h.x) < h.width/2 + player.radius*.6 && !inGap) hurtPlayer(h.dmg, h.color);
            if (h.life <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'cell'){
            if (h.warn > 0){ h.warn -= dt; continue; }
            h.life -= dt;
            const m = player.radius*.4;
            if (player.x > h.x-m && player.x < h.x+h.w+m && player.y > h.y-m && player.y < h.y+h.h+m) hurtPlayer(h.dmg, h.color);
            if (h.life <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'tornado'){
            if (h.warn > 0){ h.warn -= dt; continue; }
            h.life -= dt; h.tick += dt;
            const a = angleTo(h, player);
            h.vx += Math.cos(a)*.0035*dt; h.vy += Math.sin(a)*.0035*dt;
            const sp = Math.hypot(h.vx, h.vy); if (sp > 1.6){ h.vx *= 1.6/sp; h.vy *= 1.6/sp; }
            h.x = clamp(h.x + h.vx*step, 60, canvas.width-60); h.y = clamp(h.y + h.vy*step, 200, GROUND()-40);
            const d = distance(h, player), reach = 190;
            if (d < reach && d > 1){ const pull = 1.3*step*(1-d/reach); player.x += (h.x-player.x)/d*pull; player.y += (h.y-player.y)/d*pull; }
            if (pointSegDist(player.x, player.y, h.x, h.y+30, h.x, h.y-90) < 26 + player.radius*.6) hurtPlayer(h.dmg, M_SKY);
            if (h.tick >= 750){ h.tick = 0; h.spin += .7; for (let k=0;k<3;k++) mShot(h.x, h.y-30, h.spin+k*AB_TAU/3, 3.6, 70, 7, 'feather', M_MIST, 2500); }
            if (h.life <= 0) myth.hazards.splice(i,1);
        } else if (h.kind === 'clone'){
            if (h.warn > 0){
                h.warn -= dt;
                if (h.warn > h.lockAt) h.angle = angleTo({ x:h.sx, y:h.sy }, player);
                continue;
            }
            if (h.t < h.dur){
                h.t += dt;
                const k = abEase(Math.min(1, h.t/h.dur));
                h.x = h.sx + Math.cos(h.angle)*h.len*k; h.y = h.sy + Math.sin(h.angle)*h.len*k;
                if (distance(h, player) < 34 + player.radius) hurtPlayer(h.dmg, h.color);
            } else { h.fade -= dt; if (h.fade <= 0) myth.hazards.splice(i,1); }
        } else if (h.kind === 'margin'){
            h.t += dt;
            const end = h.grow + h.hold + h.shrink;
            h.k = h.t < h.grow ? abEase(h.t/h.grow) : h.t < h.grow + h.hold ? 1 : 1 - abEase((h.t-h.grow-h.hold)/h.shrink);
            if (h.t >= end){ myth.hazards.splice(i,1); continue; }
            const r = mMarginRect(h), m = player.radius*.5;
            if (h.k > .05 && (player.x < r.x0-m || player.x > r.x1+m || player.y < r.y0-m || player.y > r.y1+m)) hurtPlayer(h.dmg, M_INK);
        }
    }
    const w = myth.weather;
    if (w){
        w.life -= dt;
        if (w.kind === 'storm'){
            w.tick += dt;
            if (w.tick >= 720){
                w.tick = 0;
                const p = mClampPt(player.x + random(-80,80), player.y + random(-60,60));
                mBlast(p.x, p.y, 58, 620, 90, 'bolt', M_BOLT);
            }
        }
        if (w.life <= 0) myth.weather = null;
    }
}
function updateMythFx(dt){
    for (let i=myth.fx.length-1;i>=0;i--){ const f = myth.fx[i]; f.age += dt; if (f.age >= f.life) myth.fx.splice(i,1); }
    const b = abyss.boss;
    if (b && b.ghosts){ for (const g of b.ghosts) g.age += dt; b.ghosts = b.ghosts.filter(g => g.age < 320); }
}

// ---------------- Weapons ----------------
function mythWeaponAttack(){
    const idx = weapon, w = weapons[idx], cost = w.mana * (hasArtifact('ethernaty_core') ? .8 : 1);
    if (player.mana < cost) return;
    player.mana -= cost; player.attackCooldown = w.cooldown;
    const a = angleTo(player, mouse), dmg = applyClassBonus(w.damage, idx), cx = Math.cos(a), cy = Math.sin(a);
    if (idx === MYTH_WEAPON){
        // Eclipse Edge: a black crescent wave that passes through and strikes once.
        myth.playerShots.push({ kind:'edge', x:player.x+cx*20, y:player.y+cy*20, vx:cx*15, vy:cy*15, angle:a, age:0, life:620, dmg, hit:false });
    } else if (idx === MYTH_WEAPON+1){
        // Tempest Bow: three arrows; the first to land calls a lightning bolt down on the target.
        const volley = { bolt:false, dmg:dmg*.6 };
        for (const o of [-.07, 0, .07]) myth.playerShots.push({ kind:'arrow', x:player.x, y:player.y, vx:Math.cos(a+o)*22, vy:Math.sin(a+o)*22, age:0, life:900, dmg:dmg*.35, volley });
    } else {
        // Genesis Codex: a glyph seed that detonates into a hexagram and three homing sparks.
        myth.playerShots.push({ kind:'seed', x:player.x+cx*24, y:player.y+cy*24, vx:cx*11, vy:cy*11, tx:mouse.x, ty:mouse.y, age:0, dmg });
    }
    playerAnim.attackAt = worldTime; playerAnim.attackWeapon = idx;
}
function mSeedDetonate(s){
    hitBoss({ x:s.x, y:s.y, radius:150, damage:s.dmg*.8, weaponIdx:MYTH_WEAPON+2, color:M_INK });
    for (let k=0;k<3;k++){
        const a = k*AB_TAU/3 - Math.PI/2;
        projectiles.push({ x:s.x, y:s.y, vx:Math.cos(a)*9, vy:Math.sin(a)*9, radius:8, damage:s.dmg*.25, life:1400,
            color:M_INK, weaponIdx:MYTH_WEAPON+2, trail:[], homing:.05, star:true });
    }
    myth.fx.push({ kind:'hexburst', x:s.x, y:s.y, age:0, life:520 });
}
function updateMythWeapons(dt){
    const step = dt*.06;
    for (let i=myth.playerShots.length-1;i>=0;i--){
        const s = myth.playerShots[i];
        s.age += dt; s.x += s.vx*step; s.y += s.vy*step;
        const off = s.x < -80 || s.x > canvas.width+80 || s.y < -80 || s.y > canvas.height+80;
        if (s.kind === 'edge'){
            if (!s.hit && hitBoss({ x:s.x, y:s.y, radius:44, damage:s.dmg, weaponIdx:MYTH_WEAPON, color:M_SUN })){ s.hit = true; particle(s.x, s.y, M_SUN, 14, 6, .6); }
            if (s.age > s.life || off) myth.playerShots.splice(i,1);
        } else if (s.kind === 'arrow'){
            if (hitBoss({ x:s.x, y:s.y, radius:8, damage:s.dmg, weaponIdx:MYTH_WEAPON+1, color:M_SKY })){
                if (!s.volley.bolt){
                    s.volley.bolt = true;
                    hitBoss({ x:s.x, y:s.y, radius:30, damage:s.volley.dmg, weaponIdx:MYTH_WEAPON+1, color:M_BOLT });
                    myth.fx.push({ kind:'skybolt', x:s.x, y:s.y, age:0, life:320 });
                }
                myth.playerShots.splice(i,1); continue;
            }
            if (s.age > s.life || off) myth.playerShots.splice(i,1);
        } else if (s.kind === 'seed'){
            const target = activeBoss();
            const near = target && bossHitPoints(target).some(p => Math.hypot(p.x-s.x, p.y-s.y) < p.radius + 20);
            if (near || s.age >= 650 || Math.hypot(s.tx-s.x, s.ty-s.y) < 14 || off){ mSeedDetonate(s); myth.playerShots.splice(i,1); }
        }
    }
}
function mythOnAttack(){
    if (!hasArtifact('storm_feather')) return;
    myth.attacks++;
    if (myth.attacks % 5) return;
    const target = activeBoss(), p = target && bossHitPoints(target)[0];
    if (!p) return;
    hitBoss({ x:p.x, y:p.y, radius:4, damage:applyClassBonus(weapons[weapon].damage*1.5, weapon), weaponIdx:weapon, color:M_BOLT });
    myth.fx.push({ kind:'skybolt', x:p.x, y:p.y, age:0, life:320 });
}

// ================================================================
//  HOOKS INTO THE GAME
// ================================================================
const myBase = { update, attack, dash, hurtPlayer, applyClassBonus, clearArena, restart, renderWorkshop, abResetFight,
    drawHazards, drawProjectiles, drawTwoFacedDemon, drawLighting, drawWeaponInHand };

update = function(dt){
    const running = !(gameOver || !currentClass || workshopMenuOpen || artifactMenuOpen || paused || journalOpen);
    const mb = running ? mythBoss() : null;
    if (mb) mythDesperation(mb);
    // Healing happens on a key press between frames, so compare with the previous frame's cooldown.
    if (player && healCooldown > myth.prevHeal + 1000 && hasArtifact('ascendant_halo')){
        healCooldown *= .65; player.hp = Math.min(player.maxHp, player.hp + player.maxHp*.1);
    }
    const before = running && player ? { x:player.x, y:player.y } : null;
    myBase.update(dt);
    myth.prevHeal = healCooldown;
    if (!running || !player) return;
    if (before && hasArtifact('storm_feather')){
        const dx = player.x-before.x, dy = player.y-before.y;
        if (Math.hypot(dx,dy) < 14){
            player.x = clamp(before.x + dx*1.1, 25, canvas.width-25);
            player.y = clamp(before.y + dy*1.1, Math.min(130, Math.max(60, canvas.height*.2)), GROUND()-14);
        }
    }
    updateMythFx(dt);
    if (gameOver) return;
    updateMythWeapons(dt);
    updateMythCombat(dt);
    const b = mythBoss();
    if (b && b.stun > 0){ const el = document.getElementById('phase'); el.textContent = String(el.textContent).replace('REBOOTING', 'STAGGERED'); }
};

attack = function(){
    if (weapon >= MYTH_WEAPON && weapon < MYTH_WEAPON+MYTH_WEAPON_COUNT){
        if (abCanAttack()){ const before = player.attackCooldown; mythWeaponAttack(); if (player.attackCooldown > before + 1) mythOnAttack(); }
        return;
    }
    const before = player ? player.attackCooldown : 0;
    myBase.attack();
    if (player && player.attackCooldown > before + 1) mythOnAttack();
};

dash = function(){
    const cd = player ? player.dashCooldown : 0;
    myBase.dash();
    if (player && player.dashCooldown > cd && hasArtifact('eclipse_sigil')) myth.sigilUntil = worldTime + 2500;
};

hurtPlayer = function(amount, color, fireSource){
    if (hasArtifact('architect_quill')) amount *= .85;
    return myBase.hurtPlayer(amount, color, fireSource);
};

applyClassBonus = function(base, wi){
    let v = myBase.applyClassBonus(base, wi);
    if (hasArtifact('architect_quill')) v *= 1.2;
    if (hasArtifact('eclipse_sigil') && worldTime < myth.sigilUntil) v *= 1.25;
    return v;
};

function mythClear(){ myth.shots = []; myth.hazards = []; myth.playerShots = []; myth.weather = null; myth.fx = myth.fx.filter(f => f.kind !== 'decoy'); }
abResetFight = function(){ myBase.abResetFight(); mythClear(); };
clearArena = function(){ myBase.clearArena(); mythClear(); };
restart = function(){ mythClear(); myth.fx = []; myth.sigilUntil = -1e9; myth.attacks = 0; myBase.restart(); };

renderWorkshop = function(){
    myBase.renderWorkshop();
    if (workshopTab !== 'summon' || !workshopModal.querySelectorAll) return;
    workshopModal.querySelectorAll('.workshopList article').forEach((row, index) => {
        if (index < MYTH_INDEX) return;
        const p = row.querySelector('.summonLocation');
        if (p) p.textContent = String(p.textContent).replace('· Hard', '· Mythic');
    });
};

// ================================================================
//  ART: SHARED PIECES
// ================================================================
function aPoly(x,y,r,n,rot,stroke,fill,width=1.5){
    ctx.beginPath();
    for (let i=0;i<n;i++){ const q = rot + i*AB_TAU/n, px = x+Math.cos(q)*r, py = y+Math.sin(q)*r; i ? ctx.lineTo(px,py) : ctx.moveTo(px,py); }
    ctx.closePath();
    if (fill){ ctx.fillStyle = fill; ctx.fill(); }
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
// Jagged lightning between two points. The seed comes from simulation time, so it freezes on pause.
function nBolt(x1,y1,x2,y2,seed,segs=7,amp=10){
    const dx = x2-x1, dy = y2-y1, L = Math.hypot(dx,dy) || 1, nx = -dy/L, ny = dx/L, pts = [[x1,y1]];
    for (let i=1;i<segs;i++){ const q = i/segs, o = (abHash(seed*13.7+i)-.5)*2*amp; pts.push([x1+dx*q+nx*o, y1+dy*q+ny*o]); }
    pts.push([x2,y2]); return pts;
}
function drawBolt(pts, color, width){
    abGlow(10, color); abLine(pts, color, width); ctx.shadowBlur = 0;
    abLine(pts, '#ffffff', Math.max(1, width*.4));
}
function kBlackSun(x,y,R,t){
    ctx.save(); ctx.translate(x,y);
    const g = ctx.createRadialGradient(0,0,R*.8,0,0,R*2.3);
    g.addColorStop(0,'rgba(255,200,110,.75)'); g.addColorStop(.35,'rgba(255,120,40,.32)'); g.addColorStop(1,'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,R*2.3,0,AB_TAU); ctx.fill();
    ctx.beginPath();
    for (let i=0;i<18;i++){
        const q = i*AB_TAU/18 + t*.25, len = R*(1.35 + .25*Math.sin(t*3+i*1.7) + (i%2 ? .15 : .35));
        ctx.moveTo(Math.cos(q-.07)*R*.95, Math.sin(q-.07)*R*.95); ctx.lineTo(Math.cos(q)*len, Math.sin(q)*len); ctx.lineTo(Math.cos(q+.07)*R*.95, Math.sin(q+.07)*R*.95);
    }
    ctx.fillStyle = 'rgba(255,190,90,.85)'; ctx.fill();
    abGlow(18, M_SUN); abOval(0,0,R,R,'#07040a'); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0,0,R,0,AB_TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0,0,R-1,-2.2+Math.sin(t)*.2,-1.2+Math.sin(t)*.2); ctx.stroke();
    ctx.restore();
}
function kSilhouette(){
    abShape([[-30,-48],[30,-48],[60,96],[-60,96]], 'rgba(36,8,26,.92)');
    abOval(0,-80,19,21,'rgba(36,8,26,.92)');
    abShape([[38,-40],[52,-60],[30,-210],[22,-206]], 'rgba(255,179,71,.55)');
    abGlow(8, M_SUN); abLine([[-12,-84],[12,-84]], M_SUN, 3); ctx.shadowBlur = 0;
}
function mSword(){
    abLine([[0,-24],[0,-10]], '#2a1a12', 5); abOval(0,-26,3.5,3.5,M_SUN);
    abShape([[-14,-10],[14,-10],[10,-6],[-10,-6]], '#c8913a');
    abGlow(8, M_SUN);
    abShape([[-6,-6],[6,-6],[4,40],[0,52],[-4,40]], '#1a1420', M_LIGHT, 1.4);
    ctx.shadowBlur = 0;
    abLine([[0,-2],[0,38]], 'rgba(255,170,80,.8)', 1.5);
}

// ================================================================
//  ART: KAELTHAR
//  The mythic bosses are drawn with BossKit (js/boss-art.js) in the first bosses' style.
// ================================================================
function drawKaelthar(b){
    const K = BossKit, t = worldTime/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const d = b.data && b.data.dash, dashing = d && d.active, kneel = b.stun > 0 ? 1 : 0, A0 = ctx.globalAlpha;
    const INK = '#0a0710', GOLD = '#c8913a', prevInk = K.ink(INK);
    for (const g of b.ghosts || []){ ctx.save(); ctx.globalAlpha = A0*(1-g.age/320)*.4; ctx.translate(g.x, g.y); kSilhouette(); ctx.restore(); }
    const lean = dashing ? clamp((d.active.tx-d.active.fx)/400, -1, 1)*.35 : 0;
    ctx.save(); ctx.translate(b.x, b.y + Math.sin(t*1.6)*3*(1-kneel) + kneel*24); ctx.rotate(hit*.04 + lean); ctx.lineJoin = 'round';
    kBlackSun(0, -80, 40 + cast*12 + (b.phase-1)*3, t);
    // Tattered cape with folds and a gold-trimmed collar.
    const cs = Math.sin(t*1.7)*6;
    const cape = [[-30,-48],[30,-48],[56,24+cs],[64,98-cs]];
    for (let i=1;i<8;i++) cape.push([64-i*16, 104 + (i%2 ? -16 : 4) + Math.sin(t*2.2+i)*4]);
    cape.push([-64,98+cs],[-56,24-cs]);
    K.shape(cape, K.grad(0,-50,0,112,[[0,'#5a1220'],[1,'#14050a']]), INK, 2);
    for (let i=-3;i<=3;i++) if (i) K.line([[i*8,-40],[i*17 + Math.sin(t*1.7+i)*3, 92]], 'rgba(0,0,0,.45)', 1.2);
    // Armoured legs; the right knee drops when he kneels.
    for (const s of [-1,1]){
        const k = kneel && s > 0 ? 1 : 0, knee = [s*20,58-k*10], foot = [s*22+k*s*10,90-k*30];
        K.limb([s*14,26], knee, foot, 15, '#3b3346', { armor:GOLD, trim:'#ffe2a8' });
        K.plate([[knee[0]-8,knee[1]+5],[knee[0]+8,knee[1]+5],[foot[0]+7,foot[1]-6],[foot[0]-7,foot[1]-6]], '#6a6078', '#17121d', 1.2);
        K.plate([[s*10,86-k*30],[s*34,86-k*30],[s*30,98-k*30],[s*8,98-k*30]], '#5a5068', '#120e17', 1.4);
        K.line([[s*12,89-k*30],[s*31,89-k*30]], GOLD, 1);
    }
    for (let i=0;i<3;i++){ const x = -24+i*16; K.plate([[x,16],[x+16,16],[x+14,40],[x+2,40]], '#5a5068', '#16121c', 1.2); K.line([[x+3,22],[x+13,22]], GOLD, 1); }
    // Breastplate with pecs, ab plates and the eclipse emblem.
    K.plate([[-32,-48],[32,-48],[28,8],[14,22],[-14,22],[-28,8]], '#6a6078', '#17121d', 2.2);
    K.line([[-30,-46],[30,-46]], GOLD, 1.6);
    K.line([[0,-44],[0,16]], 'rgba(200,145,58,.5)', 1.4);
    K.line([[-24,-30],[0,-24],[24,-30]], 'rgba(0,0,0,.5)', 1.2);
    for (let r=0;r<2;r++) K.line([[-14,0+r*8],[14,0+r*8]], 'rgba(0,0,0,.45)', 1);
    abGlow(12, M_SUN); ctx.strokeStyle = M_SUN; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0,-20,10,0,AB_TAU); ctx.stroke(); ctx.shadowBlur = 0;
    K.oval(2,-20,7.5,7.5,'#07040a',INK,0,1);
    // Layered spiked pauldrons.
    for (const s of [-1,1]){
        K.plate([[s*20,-52],[s*56,-58],[s*68,-38],[s*54,-22],[s*26,-30]], '#5a5068', '#120e17');
        K.plate([[s*28,-45],[s*58,-49],[s*62,-37],[s*30,-34]], '#7a7090', '#2a2433', 1);
        K.line([[s*24,-50],[s*58,-56]], GOLD, 1.2);
        K.shape([[s*42,-56],[s*52,-88],[s*55,-56]], K.grad(0,-88,0,-56,[[0,'#fff0c8'],[1,'#b07a2a']]), INK, 1.2);
        K.shape([[s*56,-54],[s*73,-78],[s*66,-47]], K.grad(0,-78,0,-47,[[0,'#fff0c8'],[1,'#b07a2a']]), INK, 1.2);
        K.rivet(s*38,-40,1.7,GOLD); K.rivet(s*52,-39,1.7,GOLD);
    }
    // Left arm: a clawed gauntlet gathering sunfire while he winds up.
    const lx = -54 - cast*8, ly = 8 - cast*34;
    K.limb([-46,-34], [-56,-8], [lx,ly], 12, '#3b3346', { armor:GOLD, bands:2, trim:GOLD });
    K.claw(lx, ly, Math.PI/2 + .3 - cast*1.6, '#4a4058', '#e2c088');
    if (cast > .1){ abGlow(16, M_SUN); K.oval(lx, ly-8, 5+cast*7, 5+cast*7, 'rgba(255,200,110,.85)', null); ctx.shadowBlur = 0; }
    // Crescent-crested helm with a burning T visor.
    for (const s of [-1,1]){
        ctx.beginPath(); ctx.moveTo(s*10,-94); ctx.quadraticCurveTo(s*36,-104,s*32,-136); ctx.quadraticCurveTo(s*24,-110,s*4,-100); ctx.closePath();
        ctx.fillStyle = K.grad(0,-96,s*30,-136,[[0,'#8a5a1e'],[1,'#ffe2a8']]); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    }
    K.plate([[-18,-100],[18,-100],[21,-72],[10,-58],[-10,-58],[-21,-72]], '#7a7090', '#17121d', 2);
    K.line([[-18,-99],[18,-99]], GOLD, 1.5); K.line([[0,-99],[0,-90]], 'rgba(0,0,0,.5)', 1.2);
    for (const s of [-1,1]) K.line([[s*20,-74],[s*12,-62]], 'rgba(200,145,58,.7)', 1);
    K.shape([[-15,-87],[15,-87],[15,-81],[3,-81],[3,-65],[-3,-65],[-3,-81],[-15,-81]], '#07040a', INK, 1);
    const eye = Math.min(1, .6 + cast*.4 + (b.phase >= 3 ? .2 : 0));
    abGlow(10, M_SUN); K.line([[-13,-84],[13,-84]], `rgba(255,207,107,${eye})`, 3); K.line([[0,-84],[0,-67]], `rgba(255,207,107,${eye*.8})`, 2.2); ctx.shadowBlur = 0;
    // The greatsword: raised on wind-up, brought down on the strike, planted when he kneels.
    const swordRot = kneel ? 1.9 : .55 - cast*2.6 + strike*1.25;
    ctx.save(); ctx.translate(42,-36); ctx.rotate(swordRot);
    K.limb([0,0], [12,24], [8,46], 12, '#3b3346', { armor:GOLD, bands:1, trim:GOLD });
    K.oval(8,48,8,8,K.metal(8,48,8,'#7a7090','#17121d'));
    ctx.translate(8,48); ctx.rotate(-.3);
    K.inked([[0,12],[0,-10]], '#2a1a12', 6);
    for (let i=0;i<4;i++) K.line([[-3,8-i*5],[3,5-i*5]], '#8a5a1e', 1);
    K.oval(0,15,5,5,M_SUN,INK,0,1);
    ctx.beginPath(); ctx.moveTo(-24,-8); ctx.quadraticCurveTo(0,-26,24,-8); ctx.lineTo(18,-13); ctx.quadraticCurveTo(0,-19,-18,-13); ctx.closePath();
    ctx.fillStyle = K.metal(0,-12,24,'#ffe2a8','#8a5a1e'); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    abGlow(8 + cast*14, M_SUN);
    K.shape([[-11,-16],[11,-16],[9,-170],[0,-198],[-9,-170]], K.grad(-11,0,11,0,[[0,'#3b3346'],[.5,'#120e17'],[1,'#2a2433']]), INK, 1.8);
    ctx.shadowBlur = 0;
    K.line([[-10,-18],[-8,-168]], 'rgba(255,179,71,.6)', 1);
    const glow = Math.min(1, .45 + cast*.5 + strike*.3);
    K.line([[0,-22],[0,-168]], `rgba(255,170,80,${glow})`, 2.5);
    for (let i=0;i<5;i++){ const y = -40 - i*26; K.line([[-4,y],[0,y-6],[4,y]], `rgba(255,226,168,${glow*.8})`, 1.2); }
    ctx.restore();
    ctx.restore(); K.ink(prevInk);
}

// ================================================================
//  ART: NYXARA
// ================================================================
function nFeather(x,y,ang,len,w,tip){
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    let fill = M_MIST;
    if (visualMode !== 'minimal'){
        fill = ctx.createLinearGradient(0,0,len,0);
        fill.addColorStop(0,'#ffffff'); fill.addColorStop(.55,'#d6ecff'); fill.addColorStop(1,tip);
    }
    ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(len*.35,-w,len,-w*.12); ctx.quadraticCurveTo(len*.6,w*.75,0,0); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#1d2f5c'; ctx.lineWidth = 1.3; ctx.stroke();
    abLine([[len*.08,0],[len*.9,-w*.1]], 'rgba(60,90,140,.7)', 1);
    for (let i=1;i<4;i++){ const q = i/4; abLine([[len*q,-w*.1*q],[len*q + len*.08,-w*.55*(1-q*.5)]], 'rgba(60,90,140,.35)', .7); }
    ctx.restore();
}
// One wing: an inked arm bone runs out from the shoulder and feathers hang along it.
function nWing(s, armA, len, count, droop, tip){
    const sx = s*12, sy = -40, armL = len*.55, dx = Math.cos(armA), dy = Math.sin(armA), feathers = [];
    for (let i=0;i<count;i++){
        const q = i/(count-1), a = armA + (1-q)*droop;
        feathers.push({ x:sx + s*dx*armL*(.2 + .8*q), y:sy + dy*armL*(.2 + .8*q), a:s > 0 ? a : Math.PI - a, L:len*(.45 + .55*q), w:10 + 5*q });
    }
    const wx = sx + s*dx*armL, wy = sy + dy*armL;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(wx, wy);
    for (let i=count-1;i>=0;i--){ const f = feathers[i]; ctx.lineTo(f.x + Math.cos(f.a)*f.L*.85, f.y + Math.sin(f.a)*f.L*.85); }
    ctx.closePath(); ctx.fillStyle = 'rgba(200,230,255,.22)'; ctx.fill();
    for (let i=0;i<count;i++){ const f = feathers[i]; nFeather(f.x, f.y, f.a, f.L, f.w, tip); }
    BossKit.inked([[sx,sy],[sx + s*dx*armL*.5, sy + dy*armL*.5 - 4],[wx,wy]], '#f4f9ff', 4);
    BossKit.joint(wx, wy, 3.8, tip);
}
function drawNyxara(b){
    const K = BossKit, t = worldTime/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const d = b.data && b.data.dash, diving = d && d.active, stun = b.stun > 0 ? 1 : 0, seed = Math.floor(worldTime/70), A0 = ctx.globalAlpha;
    const INK = '#1d2f5c', prevInk = K.ink(INK);
    for (const g of b.ghosts || []){ ctx.save(); ctx.globalAlpha = A0*(1-g.age/320)*.35; abOval(g.x, g.y, 30, 46, M_SKY); ctx.restore(); }
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(t*2)*6 + stun*14);
    ctx.rotate(hit*.05 + (diving ? clamp((d.active.tx-d.active.fx)/400, -1, 1)*.4 : 0));
    ctx.lineJoin = 'round';
    if (visualMode !== 'minimal'){
        const ag = ctx.createRadialGradient(0,-20,10,0,-20,150);
        ag.addColorStop(0,'rgba(143,211,255,.3)'); ag.addColorStop(1,'rgba(143,211,255,0)');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0,-20,150,0,AB_TAU); ctx.fill();
    }
    // Storm rune ring behind her.
    ctx.save(); ctx.translate(0,-30); ctx.scale(1,.5); K.runeRing(96, t*.2, 30, 'rgba(255,242,122,.45)'); ctx.restore();
    // Six wings in three pairs; they spread wide as she winds up and droop when she falters.
    const flap = Math.sin(t*3.2)*.16*(1-stun) - stun*.35, open = cast*.35 + strike*.15;
    for (const s of [-1,1]){
        nWing(s, .45 + flap*.6 + open*.2, 92, 6, .9, M_BLUE);
        nWing(s, -.2 + flap*.8 - open*.15, 120, 7, 1.15, M_SKY);
        nWing(s, -.8 + flap - open*.35, 150, 8, 1.3 + open*.3, M_BOLT);
    }
    // Long hair streams behind her like a storm cloud.
    const hw = Math.sin(t*2.2)*8;
    ctx.beginPath(); ctx.moveTo(-12,-92); ctx.quadraticCurveTo(-30+hw,-70,-40+hw*1.4,-30);
    ctx.quadraticCurveTo(-22+hw,-46,-8,-56); ctx.quadraticCurveTo(14,-60,14,-88); ctx.closePath();
    ctx.fillStyle = K.metal(-14,-60,30,'#ffffff','#b9d6f5'); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
    for (let i=0;i<3;i++) K.line([[-8-i*3,-84],[-22-i*4+hw*.6,-62],[-30-i*3+hw,-40]], 'rgba(90,120,170,.5)', .9);
    // Flowing robe with folds, gold trim and a lightning sigil.
    const hem = i => 92 + Math.sin(t*2.4+i)*6;
    const robe = [[-14,-46],[14,-46],[24,0],[36,hem(0)]];
    for (let i=1;i<6;i++) robe.push([36-i*14.4, hem(i) + (i%2 ? 6 : 0)]);
    robe.push([-36,hem(6)],[-24,0]);
    K.shape(robe, K.grad(0,-46,0,96,[[0,'#f4f9ff'],[.45,'#9cc6f2'],[1,'#1d2f5c']]), INK, 1.8);
    for (let i=-2;i<=2;i++) if (i) K.line([[i*7,0],[i*14 + Math.sin(t*2.4+i)*3, 88]], 'rgba(29,47,92,.4)', 1.1);
    K.line([[-24,0],[-36,hem(6)]], '#ffd98a', 1.2); K.line([[24,0],[36,hem(0)]], '#ffd98a', 1.2);
    K.inked([[-18,-4],[0,4],[18,-4]], M_INK, 2.4);
    abGlow(6, M_BOLT); K.line([[0,8],[-5,30],[3,32],[-3,58]], 'rgba(255,217,138,.9)', 1.8); ctx.shadowBlur = 0;
    // Silver bodice and shoulder guards.
    K.plate([[-14,-46],[14,-46],[12,-10],[0,-4],[-12,-10]], '#ffffff', '#9cb6d8', 1.6);
    K.line([[-10,-30],[0,-25],[10,-30]], 'rgba(29,47,92,.45)', 1);
    K.oval(0,-38,3.4,3.4,M_BOLT,INK,0,1);
    for (const s of [-1,1]){ K.plate([[s*8,-48],[s*22,-50],[s*26,-38],[s*14,-34]], '#f4f9ff', '#8fb0d8'); K.rivet(s*18,-42,1.4,M_INK); }
    // Left arm charges a storm orb.
    const lh = [-36, 8-cast*16];
    K.limb([-14,-40], [-26,-16], lh, 7, '#e9f2ff', { armor:'#c9dcf2', bands:2, trim:M_INK });
    K.hand(lh[0], lh[1], -Math.PI/2 - .4, '#f3f6ff', .5 + cast*.5, .75);
    if (cast > .1){ abGlow(18, M_BOLT); K.oval(-40, 2-cast*16, 4+cast*8, 4+cast*8, 'rgba(255,248,180,.9)', null); ctx.shadowBlur = 0; }
    // Lightning spear.
    ctx.save(); ctx.translate(16,-38); ctx.rotate(-cast*1.1 + strike*.9);
    K.limb([0,0], [10,8], [16,30], 7, '#e9f2ff', { armor:'#c9dcf2', bands:1, trim:M_INK });
    ctx.translate(18,30);
    K.inked([[0,60],[0,-150]], '#fff4c0', 3.4);
    abGlow(14, M_BOLT); K.line([[0,58],[0,-148]], '#fffbe0', 1.6); ctx.shadowBlur = 0;
    drawBolt(nBolt(0,60,0,-150,seed,9,6), 'rgba(255,242,122,.85)', 1.6);
    K.plate([[-6,-140],[6,-140],[4,-132],[-4,-132]], '#ffe9a0', '#a8862a', 1);
    K.shape([[0,-186],[10,-150],[0,-140],[-10,-150]], K.metal(0,-160,12,'#ffffff','#bcd8f2'), INK, 1.5);
    K.line([[0,-182],[0,-144]], 'rgba(29,47,92,.5)', .8);
    K.hand(0, -2, Math.PI, '#f3f6ff', .1, .75);
    ctx.restore();
    // Halo with arcing lightning.
    const hr = b.phase >= 3 ? 1.2 : 1;
    ctx.save(); ctx.translate(0,-98); ctx.scale(1,.32);
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0,0,30*hr,0,AB_TAU); ctx.stroke();
    abGlow(14, M_BOLT); ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 4; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.restore();
    for (let i=0;i<3;i++){
        const q = t*2 + i*AB_TAU/3;
        drawBolt(nBolt(Math.cos(q)*30*hr, -98+Math.sin(q)*10*hr, Math.cos(q+.9)*44, -104+Math.sin(q+.9)*16, seed+i, 4, 5), 'rgba(255,242,122,.8)', 1.2);
    }
    // Head: neck, face with glowing eyes, a circlet with a storm gem.
    K.oval(0,-62,4.5,6,'#e6eef8');
    K.oval(0,-78,13,16,K.metal(0,-78,15,'#ffffff','#cfdcef'),INK,0,1.6);
    K.inked([[-13,-84],[0,-90],[13,-84]], M_INK, 1.8); K.oval(0,-89.5,2.8,2.8,M_BOLT,INK,0,.9);
    const eg = .5 + cast*.5;
    abGlow(8, M_SKY); K.line([[-8,-78],[-3,-77]], `rgba(143,211,255,${eg})`, 2.2); K.line([[3,-77],[8,-78]], `rgba(143,211,255,${eg})`, 2.2); ctx.shadowBlur = 0;
    K.line([[0,-76],[-1,-71],[1,-70.5]], 'rgba(80,100,140,.6)', .9); K.line([[-3,-66.5],[3,-66.5]], '#8a7aa8', 1.1);
    for (let i=0;i<5;i++){ const q = t*1.6 + i*AB_TAU/5; K.oval(Math.cos(q)*78, -20+Math.sin(q)*34, 2.6, 2.6, i%2 ? M_BOLT : '#ffffff', INK, 0, .8); }
    ctx.restore(); K.ink(prevInk);
}

// ================================================================
//  ART: THE ARCHITECT
// ================================================================
function drawArchitect(b){
    const K = BossKit, t = worldTime/1000, a = b.anim, hit = Math.exp(-(worldTime-a.hitAt)/150), cast = a.wind, strike = a.strike;
    const ph = b.phase || 1, stun = b.stun > 0, A0 = ctx.globalAlpha;
    const INK = '#070b22', prevInk = K.ink(INK);
    ctx.save(); ctx.translate(b.x, b.y + Math.sin(t*1.1)*5); ctx.rotate(hit*.03); ctx.lineJoin = 'round';
    if (stun) ctx.globalAlpha = A0*(.65 + .2*Math.sin(t*5));
    const A1 = ctx.globalAlpha;
    // Astrolabe rings behind it, turning faster while it casts.
    ctx.save(); ctx.translate(0,-40);
    for (const [r, sp, ticks, col] of [[128,.12,36,'rgba(255,217,138,.55)'],[100,-.2,24,'rgba(159,184,255,.5)'],[74,.32,12,'rgba(255,217,138,.7)']]){
        ctx.save(); ctx.rotate(t*sp*(1+cast*2));
        K.runeRing(r, 0, ticks, col, 1.2);
        for (let i=0;i<4;i++){ const q = i*AB_TAU/4 + .4; aPoly(Math.cos(q)*r, Math.sin(q)*r, 7, 3+i%3, t*2, INK, M_INK, 1.5); }
        ctx.restore();
    }
    ctx.save(); ctx.rotate(-t*.4);
    aPoly(0,0,52,3,0,'rgba(255,217,138,.45)',null,1.2); aPoly(0,0,52,3,Math.PI,'rgba(255,217,138,.45)',null,1.2);
    ctx.restore();
    ctx.restore();
    // Robe drawn like a blueprint, with an inked outline, side panels and fold lines.
    const robe = [[-24,-54],[24,-54],[40,20],[56,112],[-56,112],[-40,20]];
    K.shape(robe, K.grad(0,-56,0,116,[[0,'#2a3a8a'],[.6,'#141d52'],[1,'#0a1030']]), INK, 2);
    ctx.save(); K.trace(robe); ctx.clip();
    ctx.strokeStyle = 'rgba(159,184,255,.2)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x=-60;x<=60;x+=12){ ctx.moveTo(x,-60); ctx.lineTo(x,120); }
    for (let y=-60;y<=120;y+=12){ ctx.moveTo(-60,y); ctx.lineTo(60,y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,217,138,.45)'; ctx.beginPath(); ctx.arc(0,40,34,0,AB_TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,40,34,t,t+1.2); ctx.stroke();
    K.line([[-40,40],[40,40]], 'rgba(255,217,138,.35)', 1); K.line([[0,0],[0,80]], 'rgba(255,217,138,.35)', 1);
    for (const s of [-1,1]) K.line([[s*18,-40],[s*30,20],[s*44,110]], 'rgba(3,6,20,.6)', 2);
    ctx.restore();
    K.line([[-56,112],[56,112]], M_INK, 1.4);
    // The hem comes apart into drifting squares.
    for (let i=0;i<16;i++){
        const q = (t*.5 + abHash(i)) % 1, x = -54 + abHash(i+7)*108 + Math.sin(t+i)*4, y = 108 + q*46, s = 3 + (i%3)*2;
        ctx.globalAlpha = A1*(1-q)*.8; ctx.fillStyle = i%3 ? '#141d52' : M_INK; ctx.fillRect(x, y, s, s);
        ctx.strokeStyle = INK; ctx.lineWidth = .8; ctx.strokeRect(x, y, s, s);
    }
    ctx.globalAlpha = A1;
    // Folded-paper mantle with creases, and a crown of floating triangles.
    K.shape([[-46,-50],[-10,-64],[0,-44],[10,-64],[46,-50],[36,-22],[0,-30],[-36,-22]], K.metal(0,-44,40,'#fffaf0','#cbbd98'), INK, 1.8);
    K.line([[-10,-64],[-20,-26]], 'rgba(120,95,50,.6)', 1); K.line([[10,-64],[20,-26]], 'rgba(120,95,50,.6)', 1);
    K.line([[-46,-50],[-28,-38],[-36,-22]], 'rgba(120,95,50,.4)', 1); K.line([[46,-50],[28,-38],[36,-22]], 'rgba(120,95,50,.4)', 1);
    K.line([[-40,-47],[-10,-60]], '#c9a24a', 1.2); K.line([[40,-47],[10,-60]], '#c9a24a', 1.2);
    for (let i=0;i<5;i++){
        const q = (i-2)*.42, x = Math.sin(q)*34, y = -100 - Math.cos(q)*14 + Math.sin(t*2+i)*3, r = i === 2 ? 9 : 6;
        aPoly(x, y, r, 3, -Math.PI/2, INK, M_INK, 1.4);
        abGlow(6, M_INK); aPoly(x, y, r*.5, 3, -Math.PI/2, null, '#fff4d0'); ctx.shadowBlur = 0;
    }
    // Porcelain mask with a single eye glyph. It cracks in the later drafts.
    K.oval(0,-82,18,23,K.grad(-12,-104,12,-60,[[0,'#ffffff'],[1,'#cfc6b0']]),INK,0,1.8);
    K.line([[-14,-90],[-6,-93]], 'rgba(120,100,60,.5)', 1); K.line([[14,-90],[6,-93]], 'rgba(120,100,60,.5)', 1);
    aPoly(0,-82,10,3,-Math.PI/2,M_INK,null,1.6);
    const eye = Math.min(1, .55 + cast*.45);
    abGlow(10, M_INK); K.oval(0,-80,4.2,2.6+cast*1.2,`rgba(255,217,138,${eye})`,INK,0,.8); ctx.shadowBlur = 0; K.oval(0,-80,1.4,1.4,'#0a1030',null);
    if (ph >= 3) K.line([[6,-102],[3,-92],[8,-86],[4,-78]], 'rgba(60,40,20,.75)', 1.3);
    if (ph >= 4){
        K.line([[-8,-98],[-4,-88],[-9,-80],[-6,-70]], 'rgba(60,40,20,.75)', 1.3);
        const drip = (t*.6) % 1; K.line([[0,-77],[0,-77+drip*24]], 'rgba(150,20,40,.85)', 2); K.oval(0,-77+drip*24,2,2.6,'rgba(150,20,40,.85)',null);
    }
    // Floating gauntleted hands: a quill in the left, a drafting compass in the right.
    for (const s of [-1,1]){
        const hx = s*(74 + cast*6), hy = -6 - cast*34 + Math.sin(t*1.7+s)*6 - strike*s*8;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(s*.2);
        // A floating cuff of folded paper.
        K.plate([[-9,10],[9,10],[7,22],[-7,22]], '#fffaf0', '#c4b48a', 1.2);
        K.line([[-8,14],[8,14]], '#c9a24a', 1);
        abGlow(6, M_INK); K.hand(0, 4, -Math.PI/2, M_PAPER, .55 + cast*.35, 1.1); ctx.shadowBlur = 0;
        if (s < 0){
            ctx.save(); ctx.translate(0,-8); ctx.rotate(-.5);
            ctx.beginPath(); ctx.moveTo(0,10); ctx.quadraticCurveTo(-16,-30,2,-76); ctx.quadraticCurveTo(12,-30,0,10); ctx.closePath();
            ctx.fillStyle = K.grad(-10,0,10,0,[[0,'#d8ccb0'],[.5,'#fffaf0'],[1,'#c4b48a']]); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
            K.line([[0,8],[1,-70]], 'rgba(201,162,74,.85)', 1);
            for (let i=1;i<6;i++){ const y = 4 - i*12; K.line([[0.5,y],[-6,y-6]], 'rgba(120,95,50,.5)', .7); K.line([[0.5,y],[5,y-5]], 'rgba(120,95,50,.5)', .7); }
            K.inked([[0,10],[0,26]], M_INK, 2); K.shape([[-3,24],[3,24],[0,35]], K.metal(0,28,4,'#fff0b0','#8a5a0c'), INK, 1);
            ctx.restore();
        } else {
            ctx.save(); ctx.translate(0,-8); ctx.rotate(.3);
            const spread = .25 + cast*.35;
            K.inked([[0,-30],[Math.sin(-spread)*56, -30+Math.cos(spread)*56]], M_INK, 2.2);
            K.inked([[0,-30],[Math.sin(spread)*56, -30+Math.cos(spread)*56]], M_INK, 2.2);
            K.oval(0,-30,4.5,4.5,K.metal(0,-30,4.5,'#fff0b0','#8a5a0c'),INK,0,1.2);
            ctx.restore();
        }
        ctx.restore();
    }
    if (cast > .15){ ctx.strokeStyle = `rgba(255,217,138,${cast*.8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,-40,100,-Math.PI/2-cast*2,-Math.PI/2+cast*2); ctx.stroke(); }
    ctx.restore(); K.ink(prevInk);
    if (stun){ ctx.save(); ctx.fillStyle = M_INK; ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('UNWRITTEN', b.x, b.y - 150); ctx.restore(); }
}
function mDecoy(f){
    return { x:f.x, y:f.y, phase:4, stun:0, hp:1, maxHp:1, kind:'architect', data:{}, anim:{ wind:.4, strike:0, hitAt:-1e9 } };
}
Object.assign(ABYSS_DRAW, { knight:drawKaelthar, seraph:drawNyxara, architect:drawArchitect });

// ================================================================
//  ART: ARENAS
// ================================================================
function mArchWall(top, h, aw, color){
    const W = canvas.width, n = Math.ceil(W/aw);
    ctx.beginPath();
    ctx.moveTo(0, top+h); ctx.lineTo(0, top);
    for (let x=0; x<=W; x+=40) ctx.lineTo(x, top - abHash(x*.1+top)*26);
    ctx.lineTo(W, top+h); ctx.closePath();
    for (let i=0;i<n;i++){
        const cx = i*aw + aw/2, w = aw*.62, y0 = top + h*.25, y1 = top + h*.92;
        ctx.moveTo(cx-w/2, y1); ctx.lineTo(cx-w/2, y0+w/2); ctx.arc(cx, y0+w/2, w/2, Math.PI, 0); ctx.lineTo(cx+w/2, y1); ctx.closePath();
    }
    ctx.fillStyle = color; ctx.fill('evenodd');
}
function bgColosseum(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime/1000;
    const sky = ctx.createLinearGradient(0,0,0,g);
    sky.addColorStop(0,'#12030a'); sky.addColorStop(.5,'#3a0b12'); sky.addColorStop(1,'#7a2412');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    kBlackSun(W*.76, H*.17, Math.min(W,H)*.07, t*.4);
    mArchWall(g-300, 130, 70, '#2a0a10');
    mArchWall(g-170, 170, 96, '#1a060b');
    for (let i=0;i<6;i++){
        const x = W*(.1 + i*.16), top = g-300, sw = Math.sin(t*1.2+i)*6;
        abShape([[x-14,top],[x+14,top],[x+14+sw,top+90],[x+4+sw,top+80],[x+sw*.5,top+96],[x-6+sw,top+80],[x-14+sw,top+90]], '#5a0d16', 'rgba(255,179,71,.5)', 1);
        ctx.strokeStyle = M_SUN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x+sw*.4, top+34, 7, 0, AB_TAU); ctx.stroke();
        abOval(x+sw*.4+1.5, top+34, 5, 5, '#07040a');
    }
    for (const [x, h, w] of [[W*.04,340,64],[W*.94,300,70],[W*.22,170,44],[W*.78,200,48]]){
        ctx.fillStyle = '#0d0307'; ctx.fillRect(x-w/2, g-h, w, h);
        ctx.fillStyle = '#1e080d'; ctx.fillRect(x-w/2-8, g-h-10, w+16, 12);
        ctx.beginPath(); ctx.moveTo(x-w/2, g-h-10); ctx.lineTo(x-w/4, g-h-30); ctx.lineTo(x, g-h-14); ctx.lineTo(x+w/3, g-h-26); ctx.lineTo(x+w/2, g-h-10); ctx.fill();
        ctx.fillStyle = 'rgba(255,140,60,.08)';
        for (let k=0;k<3;k++) ctx.fillRect(x-w/2+8+k*(w-16)/3, g-h+8, 4, h-16);
    }
    const fl = ctx.createLinearGradient(0,g-16,0,H); fl.addColorStop(0,'#4a1d12'); fl.addColorStop(1,'#140705');
    ctx.fillStyle = fl; ctx.fillRect(0,g-16,W,H-g+16);
    ctx.strokeStyle = 'rgba(255,170,80,.45)'; ctx.lineWidth = 1.5;
    for (let i=0;i<9;i++){ const x = abHash(i+3)*W; ctx.beginPath(); ctx.moveTo(x,g-14); ctx.lineTo(x+18,g+4); ctx.lineTo(x+6,g+18); ctx.lineTo(x+30,H); ctx.stroke(); }
    for (let i=0;i<46;i++){
        const sp = .3 + abHash(i)*.7, y = g - ((t*40*sp + abHash(i+9)*g) % g), x = (abHash(i+20)*W + Math.sin(t*.8+i)*30 + t*12*sp) % W;
        ctx.globalAlpha = A*(.35 + .5*abHash(i+40))*(y/g); ctx.fillStyle = i%4 ? '#ff9a3d' : '#2a2a2a'; ctx.fillRect(x, y, 2+(i%2), 2+(i%2));
    }
    ctx.globalAlpha = A;
}
function bgStormspire(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime/1000;
    const sky = ctx.createLinearGradient(0,0,0,g);
    sky.addColorStop(0,'#070d1a'); sky.addColorStop(.55,'#16243d'); sky.addColorStop(1,'#33496b');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    // Distant lightning: a single bolt in the sky, never a full-screen flash.
    const bucket = Math.floor(worldTime/1900), age = worldTime - bucket*1900;
    if (abHash(bucket) > .45 && age < 260 && visualMode !== 'minimal'){
        const x = abHash(bucket+1)*W, k = 1 - age/260;
        ctx.globalAlpha = A*k; drawBolt(nBolt(x, 0, x+(abHash(bucket+2)-.5)*160, g*.55, bucket, 9, 26), 'rgba(220,240,255,.9)', 2);
        ctx.globalAlpha = A;
    }
    for (const [x, h, w] of [[W*.5,520,26],[W*.08,420,46],[W*.9,460,52],[W*.26,260,30],[W*.72,300,34]]){
        const far = h > 500;
        ctx.fillStyle = far ? '#1a2a45' : '#0f1a2e';
        ctx.beginPath(); ctx.moveTo(x-w/2,g); ctx.lineTo(x-w*.3,g-h*.8); ctx.lineTo(x,g-h); ctx.lineTo(x+w*.3,g-h*.8); ctx.lineTo(x+w/2,g); ctx.fill();
        ctx.fillStyle = 'rgba(143,211,255,.12)';
        for (let k=1;k<4;k++) ctx.fillRect(x-w*.42+k*2, g-h*k*.2-4, w*.84-k*4, 3);
        abGlow(12, M_BOLT); abOval(x, g-h-6, 4, 7, far ? 'rgba(255,242,122,.5)' : M_BOLT); ctx.shadowBlur = 0;
    }
    for (const [y, sp, col, n, s] of [[g*.3,6,'rgba(30,46,74,.7)',8,1.2],[g*.55,12,'rgba(42,60,94,.75)',9,1],[g-40,22,'rgba(70,92,130,.8)',10,.9]]){
        ctx.fillStyle = col;
        for (let i=0;i<n;i++){
            const x = ((abHash(i+y)*W + t*sp) % (W+300)) - 150, r = (60 + abHash(i+y+5)*70)*s;
            ctx.beginPath(); ctx.ellipse(x, y+Math.sin(t*.3+i)*6, r*1.6, r*.5, 0, 0, AB_TAU); ctx.fill();
        }
    }
    const fl = ctx.createLinearGradient(0,g-16,0,H);
    fl.addColorStop(0,'#d7e2f2'); fl.addColorStop(.25,'#8ea3c4'); fl.addColorStop(1,'#2a3a5a');
    ctx.fillStyle = fl; ctx.fillRect(0,g-16,W,H-g+16);
    ctx.strokeStyle = 'rgba(30,50,90,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x=0;x<=W;x+=80){ ctx.moveTo(x,g-16); ctx.lineTo(x+(x-W/2)*.15,H); }
    ctx.stroke();
    abGlow(10, M_SKY); abLine([[0,g-16],[W,g-16]], 'rgba(191,230,255,.8)', 2); ctx.shadowBlur = 0;
    const storm = myth.weather && myth.weather.kind === 'storm', drops = storm ? 110 : 45;
    ctx.strokeStyle = 'rgba(190,220,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i=0;i<drops;i++){
        const sp = 600 + abHash(i)*400, y = ((t*sp + abHash(i+3)*H) % (H+40)) - 20, x = ((abHash(i+11)*W*1.2 - y*.25) % W + W) % W;
        ctx.moveTo(x,y); ctx.lineTo(x-5,y+16);
    }
    ctx.globalAlpha = A*(storm ? .8 : .45); ctx.stroke(); ctx.globalAlpha = A;
}
function bgFirstPage(A){
    const W = canvas.width, H = canvas.height, g = GROUND(), t = worldTime/1000;
    const b = abyss.boss, late = b && b.kind === 'architect' && b.phase >= 4;
    const bg = ctx.createRadialGradient(W/2,H*.4,40,W/2,H*.4,Math.max(W,H)*.75);
    bg.addColorStop(0,'#1a2a6a'); bg.addColorStop(1,'#070b22');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    ctx.lineWidth = 1;
    for (const [sp, col] of [[24,'rgba(159,184,255,.07)'],[120,'rgba(159,184,255,.16)']]){
        ctx.strokeStyle = col; ctx.beginPath();
        for (let x=0;x<=W;x+=sp){ ctx.moveTo(x,0); ctx.lineTo(x,H); }
        for (let y=0;y<=H;y+=sp){ ctx.moveTo(0,y); ctx.lineTo(W,y); }
        ctx.stroke();
    }
    ctx.save(); ctx.translate(W/2, H*.38);
    for (const [r, sp, dash] of [[150,.05,[4,8]],[250,-.03,[12,10]],[360,.02,[2,6]]]){
        ctx.save(); ctx.rotate(t*sp); ctx.setLineDash(dash); ctx.strokeStyle = 'rgba(255,217,138,.22)';
        ctx.beginPath(); ctx.arc(0,0,r,0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
        for (let i=0;i<12;i++){ const q = i*AB_TAU/12; abLine([[Math.cos(q)*(r-6), Math.sin(q)*(r-6)],[Math.cos(q)*(r+6), Math.sin(q)*(r+6)]], 'rgba(255,217,138,.3)', 1); }
        ctx.restore();
    }
    // A golden spiral, the shape every arena was drawn from.
    ctx.strokeStyle = 'rgba(255,217,138,.18)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let q=0; q<=13.8; q+=.05){ const r = 4*Math.exp(.3063*q), a = q + t*.05; q ? ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
    ctx.stroke();
    ctx.restore();
    for (let i=0;i<9;i++){
        const x = ((abHash(i)*W + t*10*(i%2 ? 1 : -1)) % W + W) % W, y = 80 + abHash(i+4)*(g-260) + Math.sin(t*.6+i)*12;
        ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(t*.4+i)*.3);
        ctx.globalAlpha = A*.16; ctx.fillStyle = M_PAPER; ctx.fillRect(-22,-30,44,60);
        ctx.globalAlpha = A*.25; for (let k=0;k<6;k++) abLine([[-16,-22+k*9],[12-(k%3)*5,-22+k*9]], '#0a1030', 1);
        ctx.restore();
    }
    ctx.globalAlpha = A;
    if (late){
        ctx.globalAlpha = A*.4;
        for (let i=0;i<7;i++){ const x = abHash(i+30)*W, len = 60 + ((t*20 + abHash(i)*200) % 260); abLine([[x,0],[x+Math.sin(i)*10,len]], 'rgba(150,20,40,.8)', 3); }
        ctx.globalAlpha = A;
    }
    const fl = ctx.createLinearGradient(0,g-16,0,H);
    fl.addColorStop(0,M_PAPER); fl.addColorStop(.2,'#c9b98f'); fl.addColorStop(1,'#5a4a2a');
    ctx.fillStyle = fl; ctx.fillRect(0,g-16,W,H-g+16);
    ctx.strokeStyle = 'rgba(60,40,20,.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x=0;x<=W;x+=12){ const l = x%120 === 0 ? 12 : x%60 === 0 ? 8 : 4; ctx.moveTo(x,g-16); ctx.lineTo(x,g-16+l); }
    ctx.stroke();
    abLine([[0,g-16],[W,g-16]], M_INK, 2);
}
Object.assign(ABYSS_BIOME_DRAW, { colosseum:bgColosseum, stormspire:bgStormspire, firstpage:bgFirstPage });

// ================================================================
//  ART: SHOTS, HAZARDS AND EFFECTS
// ================================================================
function drawMythShots(alpha=1){
    const t = worldTime;
    for (const s of myth.shots){
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(s.x, s.y);
        if (s.kind === 'sword'){
            if (s.delay > 0){
                const k = clamp(1 - s.delay/600, 0, 1);
                ctx.globalAlpha = alpha*(.2 + k*.8);
                if (k > 0){
                    ctx.save(); ctx.globalAlpha = alpha*.35*k; ctx.strokeStyle = M_SUN; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
                    ctx.beginPath(); ctx.moveTo(0,30); ctx.lineTo(0,GROUND()-s.y); ctx.stroke(); ctx.restore();
                }
            }
            mSword();
        } else if (s.kind === 'wave'){
            ctx.rotate(Math.atan2(s.vy, s.vx)); const r = s.r;
            abGlow(16, s.color);
            ctx.beginPath(); ctx.arc(-r*.4,0,r*1.25,-1.15,1.15); ctx.arc(-r,0,r*1.05,1.0,-1.0,true); ctx.closePath();
            const g = ctx.createLinearGradient(-r,0,r,0); g.addColorStop(0,'rgba(20,6,14,.9)'); g.addColorStop(1,s.color);
            ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-r*.4,0,r*1.25,-1.05,1.05); ctx.stroke();
        } else if (s.kind === 'dark'){
            abGlow(10, s.color); abOval(0,0,s.r,s.r,'#140818'); ctx.shadowBlur = 0;
            ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0,0,s.r,0,AB_TAU); ctx.stroke();
            abOval(-s.r*.3,-s.r*.3,s.r*.25,s.r*.25,'rgba(255,226,168,.7)');
        } else if (s.kind === 'spear'){
            if (s.warn > 0){
                ctx.save(); ctx.rotate(s.angle); ctx.globalAlpha = alpha*.4; ctx.strokeStyle = s.warn <= s.lockAt ? '#ffffff' : s.color;
                ctx.setLineDash([6,6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(30,0); ctx.lineTo(220,0); ctx.stroke(); ctx.restore();
            }
            ctx.rotate(s.angle);
            abGlow(12, s.color); abLine([[-26,0],[22,0]], '#fff9c9', 3); ctx.shadowBlur = 0;
            abShape([[34,0],[20,-5],[16,0],[20,5]], '#ffffff', s.color, 1);
            drawBolt(nBolt(-26,0,22,0,Math.floor(t/60)+(s.x|0),5,4), s.color, 1.2);
        } else if (s.kind === 'feather'){
            ctx.rotate(Math.atan2(s.vy, s.vx)); nFeather(-13,0,0,26,5,s.color === M_MIST ? M_SKY : M_BOLT);
        } else if (s.kind === 'zap'){
            ctx.rotate(Math.atan2(s.vy, s.vx)); drawBolt(nBolt(-10,0,10,0,Math.floor(t/50)+(s.x|0),4,4), s.color, 2);
        } else if (s.kind === 'ball'){
            const R = s.r*(1 + Math.sin(s.age*.012)*.12);
            if (visualMode !== 'minimal'){
                const g = ctx.createRadialGradient(0,0,2,0,0,R*1.8);
                g.addColorStop(0,'rgba(255,255,255,.95)'); g.addColorStop(.35,'rgba(255,242,122,.75)'); g.addColorStop(1,'rgba(143,211,255,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,R*1.8,0,AB_TAU); ctx.fill();
            }
            abOval(0,0,R*.6,R*.6,'#fffbe0');
            for (let k=0;k<3;k++){ const q = abHash(Math.floor(t/80)+k+(s.x|0))*AB_TAU; drawBolt(nBolt(0,0,Math.cos(q)*R*1.5,Math.sin(q)*R*1.5,Math.floor(t/80)+k,4,5), M_BOLT, 1.2); }
        } else if (s.kind === 'poly'){
            ctx.rotate(s.age*.005*(s.sides % 2 ? 1 : -1));
            abGlow(8, s.color); aPoly(0,0,s.r,s.sides,0,s.color,'rgba(10,16,48,.75)',2); ctx.shadowBlur = 0;
            aPoly(0,0,s.r*.45,s.sides,Math.PI/s.sides,s.color,null,1);
        } else if (s.kind === 'glyph'){
            ctx.rotate(s.age*.004);
            abGlow(8, s.color); ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,s.r,0,AB_TAU); ctx.stroke(); ctx.shadowBlur = 0;
            abLine([[-s.r*.6,0],[s.r*.6,0]], s.color, 1.2); abLine([[0,-s.r*.6],[0,s.r*.6]], s.color, 1.2); abOval(0,0,2,2,'#ffffff');
        }
        ctx.restore();
    }
}
function drawMythHazards(){
    const t = worldTime, W = canvas.width, H = canvas.height;
    for (const h of myth.hazards){
        ctx.save();
        if (h.kind === 'blast'){
            if (h.warn > 0){
                const k = 1 - h.warn/h.warnMax;
                if (h.style === 'sunfall'){ ctx.globalAlpha = .35 + k*.4; abOval(h.x, h.y+6, h.r*(.5+k*.5), h.r*.32*(.5+k*.5), 'rgba(10,2,6,.85)'); }
                ctx.globalAlpha = .75; ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.setLineDash([7,5]);
                ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
                ctx.globalAlpha = .14 + k*.24; ctx.fillStyle = h.color; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*k,0,AB_TAU); ctx.fill();
                if (h.style === 'glyph'){ ctx.globalAlpha = .5; ctx.translate(h.x,h.y); ctx.rotate(t*.003); aPoly(0,0,h.r*.7,6,0,h.color,null,1.2); }
                if (h.style === 'bolt'){ ctx.globalAlpha = .5*k; abLine([[h.x,h.y],[h.x,0]], h.color, 1); }
            } else {
                const k = 1 - h.life/h.lifeMax;
                ctx.globalAlpha = 1-k;
                if (h.style === 'bolt'){
                    drawBolt(nBolt(h.x+(abHash(h.x)-.5)*60, -10, h.x, h.y, Math.floor(h.x+h.y), 10, 18), h.color, 3*(1-k)+1);
                    ctx.strokeStyle = h.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*(.4+k*.8),0,AB_TAU); ctx.stroke();
                } else if (h.style === 'glyph'){
                    ctx.translate(h.x,h.y); ctx.rotate(k*1.5); abGlow(12, h.color);
                    aPoly(0,0,h.r*(.6+k*.6),3,0,h.color,null,3); aPoly(0,0,h.r*(.6+k*.6),3,Math.PI,h.color,null,3);
                } else {
                    const R = h.r*(.5 + k*.8);
                    abGlow(14, h.color); ctx.strokeStyle = h.color; ctx.lineWidth = 5*(1-k)+1; ctx.beginPath(); ctx.arc(h.x,h.y,R,0,AB_TAU); ctx.stroke(); ctx.shadowBlur = 0;
                    ctx.globalAlpha = (1-k)*.8; abOval(h.x,h.y,R*.7,R*.7,'#0a0306');
                    if (h.style === 'sunfall') for (let i=0;i<10;i++){ const q = i*AB_TAU/10; abLine([[h.x+Math.cos(q)*R*.6, h.y+Math.sin(q)*R*.6],[h.x+Math.cos(q)*R*1.3, h.y+Math.sin(q)*R*1.3]], h.color, 3); }
                }
            }
        } else if (h.kind === 'line'){
            if (h.warn > 0){
                const k = 1 - h.warn/h.warnMax;
                ctx.globalAlpha = .25 + k*.5; ctx.strokeStyle = h.color; ctx.lineWidth = 1 + k*h.width*.35; ctx.setLineDash([12,9]); ctx.lineDashOffset = -t*.05;
                ctx.beginPath(); ctx.moveTo(h.x1,h.y1); ctx.lineTo(h.x2,h.y2); ctx.stroke(); ctx.setLineDash([]);
            } else {
                const k = h.life/h.lifeMax, w = h.width*Math.min(1, (1-k)*6 + .2)*(.5 + .5*k);
                ctx.globalAlpha = Math.min(1, k*2); abGlow(14, h.color); abLine([[h.x1,h.y1],[h.x2,h.y2]], h.color, w); ctx.shadowBlur = 0;
                abLine([[h.x1,h.y1],[h.x2,h.y2]], 'rgba(255,255,255,.9)', w*.35);
            }
        } else if (h.kind === 'lane'){
            const k = 1 - h.warn/h.warnMax, L = Math.hypot(h.x2-h.x1, h.y2-h.y1);
            ctx.translate(h.x1,h.y1); ctx.rotate(Math.atan2(h.y2-h.y1, h.x2-h.x1));
            ctx.globalAlpha = .12 + k*.22; ctx.fillStyle = h.color; ctx.fillRect(0,-h.width/2,L,h.width);
            ctx.globalAlpha = .6; ctx.strokeStyle = h.color; ctx.lineWidth = 1.5; ctx.setLineDash([10,7]); ctx.strokeRect(0,-h.width/2,L,h.width); ctx.setLineDash([]);
            ctx.globalAlpha = .7;
            for (let i=0;i<5;i++){ const x = ((k*1.5 + i/5) % 1)*L; abLine([[x-10,-12],[x,0],[x-10,12]], h.color, 3); }
        } else if (h.kind === 'circle'){
            ctx.globalAlpha = .45*Math.min(1, h.life/300); ctx.strokeStyle = M_INK; ctx.lineWidth = 1.5; ctx.setLineDash([4,6]);
            ctx.beginPath(); ctx.arc(h.x,h.y,h.r,0,AB_TAU); ctx.stroke(); ctx.setLineDash([]);
        } else if (h.kind === 'pillar'){
            const bot = GROUND();
            if (h.warn > 0){
                const k = 1 - h.warn/h.warnMax;
                ctx.globalAlpha = .1 + k*.25; ctx.fillStyle = h.color; ctx.fillRect(h.x-h.width/2, 0, h.width, bot);
                ctx.globalAlpha = .6; ctx.strokeStyle = h.color; ctx.setLineDash([8,6]); ctx.lineWidth = 1.5; ctx.beginPath();
                ctx.moveTo(h.x-h.width/2,0); ctx.lineTo(h.x-h.width/2,bot); ctx.moveTo(h.x+h.width/2,0); ctx.lineTo(h.x+h.width/2,bot); ctx.stroke(); ctx.setLineDash([]);
                if (h.gapH){ ctx.globalAlpha = .9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(h.x-h.width/2, h.gapY-h.gapH/2, h.width, h.gapH); }
            } else {
                const A1 = Math.min(1, (h.life/h.lifeMax)*3, (h.lifeMax-h.life)/80), seed = Math.floor(t/60);
                const parts = h.gapH ? [[0, h.gapY-h.gapH/2],[h.gapY+h.gapH/2, bot]] : [[0, bot]];
                for (const [y1,y2] of parts){
                    ctx.globalAlpha = A1*.35; ctx.fillStyle = h.color; ctx.fillRect(h.x-h.width/2, y1, h.width, y2-y1);
                    ctx.globalAlpha = A1;
                    for (let j=0;j<3;j++) drawBolt(nBolt(h.x+(j-1)*h.width*.25, y1, h.x+(j-1)*h.width*.2, y2, seed+j+(h.x|0), 12, h.width*.25), h.color, 2.5);
                }
            }
        } else if (h.kind === 'cell'){
            if (h.warn > 0){
                const k = 1 - h.warn/h.warnMax;
                ctx.globalAlpha = .08 + k*.22; ctx.fillStyle = h.color; ctx.fillRect(h.x+3,h.y+3,h.w-6,h.h-6);
                ctx.globalAlpha = .55; ctx.strokeStyle = h.color; ctx.lineWidth = 1.5; ctx.strokeRect(h.x+3,h.y+3,h.w-6,h.h-6);
            } else {
                const k = h.life/h.lifeMax;
                ctx.globalAlpha = .5*k + .2; ctx.fillStyle = h.color; ctx.fillRect(h.x,h.y,h.w,h.h);
                ctx.globalAlpha = k; drawBolt(nBolt(h.x+h.w/2, h.y-20, h.x+h.w/2, h.y+h.h, Math.floor(h.x*7+h.y), 6, 14), '#ffffff', 2);
            }
        } else if (h.kind === 'tornado'){
            if (h.warn > 0){
                ctx.globalAlpha = .6; ctx.strokeStyle = M_SKY; ctx.setLineDash([6,6]); ctx.lineWidth = 2;
                ctx.beginPath(); ctx.ellipse(h.x, h.y+30, 60*(1-h.warn/h.warnMax)+10, 16, 0, 0, AB_TAU); ctx.stroke(); ctx.setLineDash([]);
            } else {
                const fade = Math.min(1, h.life/500, (h.lifeMax-h.life)/400);
                for (let i=0;i<9;i++){
                    const q = i/8, y = h.y + 30 - q*150, rx = 14 + q*58, sway = Math.sin(t*.004 + q*4 + h.spin)*12*q;
                    ctx.globalAlpha = fade*(.25 + .35*(1-q)); ctx.strokeStyle = i%2 ? '#dfeeff' : '#9fb8d8'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.ellipse(h.x+sway, y, rx, rx*.28, 0, t*.01+i, t*.01+i+4.4); ctx.stroke();
                }
                ctx.fillStyle = '#c9d6e6';
                for (let i=0;i<6;i++){ const q = t*.006 + i*AB_TAU/6, r = 30 + (i%3)*14; ctx.globalAlpha = fade*.8; ctx.fillRect(h.x+Math.cos(q)*r, h.y-40-i*14+Math.sin(q)*r*.25, 3, 3); }
                ctx.globalAlpha = fade*.4; ctx.strokeStyle = M_SKY; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(h.x, h.y+30, 46, 12, 0, 0, AB_TAU); ctx.stroke();
            }
        } else if (h.kind === 'clone'){
            if (h.warn > 0){
                const k = 1 - h.warn/h.warnMax, locked = h.warn <= h.lockAt;
                ctx.save(); ctx.translate(h.sx, h.sy); ctx.rotate(h.angle);
                ctx.globalAlpha = .12 + k*.2; ctx.fillStyle = h.color; ctx.fillRect(0,-35,h.len,70);
                ctx.globalAlpha = .6; ctx.strokeStyle = locked ? '#ffffff' : h.color; ctx.setLineDash([10,7]); ctx.lineWidth = 1.5; ctx.strokeRect(0,-35,h.len,70); ctx.setLineDash([]);
                ctx.restore();
            }
            ctx.globalAlpha = h.warn > 0 ? .45 + .45*(1-h.warn/h.warnMax) : h.t < h.dur ? .9 : .9*Math.max(0, h.fade)/350;
            ctx.translate(h.x, h.y); kSilhouette();
        } else if (h.kind === 'margin'){
            const r = mMarginRect(h);
            ctx.beginPath(); ctx.rect(0,0,W,H); ctx.rect(r.x0, r.y0, r.x1-r.x0, r.y1-r.y0); ctx.clip('evenodd');
            ctx.globalAlpha = .28*h.k; ctx.fillStyle = M_PAPER; ctx.fillRect(0,0,W,H);
            ctx.globalAlpha = .45*h.k; ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2; ctx.beginPath();
            for (let x=-H; x<W; x+=22){ ctx.moveTo(x,0); ctx.lineTo(x+H,H); }
            ctx.stroke();
            ctx.restore(); ctx.save();
            ctx.globalAlpha = .9*h.k; abGlow(12, M_INK); ctx.strokeStyle = M_INK; ctx.lineWidth = 3; ctx.strokeRect(r.x0, r.y0, r.x1-r.x0, r.y1-r.y0); ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
}
function drawMythFx(){
    for (const f of myth.fx){
        const k = f.age/f.life;
        ctx.save();
        if (f.kind === 'skybolt'){
            ctx.globalAlpha = 1-k;
            drawBolt(nBolt(f.x+(abHash(f.x)-.5)*80, -10, f.x, f.y, Math.floor(f.x+f.y), 10, 20), M_BOLT, 3*(1-k)+1);
            ctx.strokeStyle = M_BOLT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x,f.y,10+k*40,0,AB_TAU); ctx.stroke();
        } else if (f.kind === 'hexburst'){
            ctx.globalAlpha = 1-k; ctx.translate(f.x,f.y); ctx.rotate(k*1.2); abGlow(14, M_INK);
            const R = 30 + k*120; aPoly(0,0,R,3,0,M_INK,null,3); aPoly(0,0,R,3,Math.PI,M_INK,null,3);
            ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0,0,R*.9,0,AB_TAU); ctx.stroke();
        } else if (f.kind === 'decoy'){
            ctx.globalAlpha = .72*Math.min(1, f.age/300, (f.life-f.age)/300);
            drawArchitect(mDecoy(f));
        }
        ctx.restore();
    }
}
function drawMythPlayerShots(){
    const t = worldTime;
    for (const s of myth.playerShots){
        ctx.save(); ctx.translate(s.x, s.y);
        if (s.kind === 'edge'){
            ctx.rotate(s.angle); ctx.globalAlpha = Math.max(0, 1 - s.age/s.life);
            abGlow(14, M_SUN);
            ctx.beginPath(); ctx.arc(-14,0,40,-1.1,1.1); ctx.arc(-34,0,34,1.0,-1.0,true); ctx.closePath();
            ctx.fillStyle = 'rgba(30,10,20,.85)'; ctx.fill(); ctx.strokeStyle = M_SUN; ctx.lineWidth = 2.5; ctx.stroke(); ctx.shadowBlur = 0;
        } else if (s.kind === 'arrow'){
            ctx.rotate(Math.atan2(s.vy, s.vx));
            ctx.globalAlpha = .4; abLine([[-40,0],[-10,0]], M_SKY, 4); ctx.globalAlpha = 1;
            abLine([[-14,0],[12,0]], '#eaf6ff', 2.5); abShape([[20,0],[10,-4],[10,4]], M_BOLT);
            abShape([[-14,0],[-20,-5],[-16,0],[-20,5]], M_SKY);
        } else if (s.kind === 'seed'){
            ctx.rotate(t*.01); abGlow(12, M_INK);
            aPoly(0,0,10,3,0,M_INK,null,2); aPoly(0,0,10,3,Math.PI,M_INK,null,2); ctx.shadowBlur = 0; abOval(0,0,3,3,'#ffffff');
        }
        ctx.restore();
    }
}

drawHazards = function(){ myBase.drawHazards(); drawMythHazards(); };
drawProjectiles = function(){ myBase.drawProjectiles(); drawMythShots(); drawMythPlayerShots(); };
drawTwoFacedDemon = function(){ myBase.drawTwoFacedDemon(); drawMythFx(); };
drawLighting = function(){
    myBase.drawLighting();
    if (abyss.weather && abyss.weather.kind === 'eclipse' && mythBoss()){
        // In Kaelthar's total eclipse, warnings and shots still show through the dark.
        drawMythHazards(); drawMythShots(.9);
    }
    const w = myth.weather;
    if (w && w.kind === 'storm'){
        const fade = Math.min(1, (w.max-w.life)/600, w.life/600);
        ctx.save(); ctx.fillStyle = `rgba(8,16,34,${.22*fade})`; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.restore();
    }
};

drawWeaponInHand = function(idx){
    if (idx < MYTH_WEAPON || idx >= MYTH_WEAPON+MYTH_WEAPON_COUNT){ myBase.drawWeaponInHand(idx); return; }
    const t = worldTime;
    ctx.save(); ctx.translate(10,0); ctx.lineCap = 'round';
    if (idx === MYTH_WEAPON){ // Eclipse Edge: obsidian blade with a molten edge and a black-sun pommel
        abLine([[-12,0],[6,0]], '#2a1a12', 6); abShape([[6,-11],[10,-11],[10,11],[6,11]], '#c8913a');
        abGlow(8, M_SUN); abShape([[10,-6],[62,-4],[76,0],[62,4],[10,6]], '#120e17', M_SUN, 1.4); ctx.shadowBlur = 0;
        abLine([[14,0],[60,0]], 'rgba(255,170,80,.8)', 1.5);
        abOval(-14,0,4,4,'#07040a'); ctx.strokeStyle = M_SUN; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-14,0,4,0,AB_TAU); ctx.stroke();
    } else if (idx === MYTH_WEAPON+1){ // Tempest Bow: pale limbs with a lightning string
        ctx.strokeStyle = '#dfeeff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-6,0,30,-1.2,1.2); ctx.stroke();
        drawBolt(nBolt(4.9,-28,4.9,28,Math.floor(t/60),6,3), M_BOLT, 1.2);
        abOval(24,0,4,7,M_INK);
        for (const s of [-1,1]) nFeather(4.9, s*28, s*2.3, 12, 3, M_SKY);
    } else { // Genesis Codex: an open book circled by a turning hexagon
        ctx.translate(30, Math.sin(t*.004)*2);
        abShape([[-16,-12],[0,-9],[0,11],[-16,8]], M_PAPER, '#c9a24a', 1); abShape([[16,-12],[0,-9],[0,11],[16,8]], '#fff8e6', '#c9a24a', 1);
        for (let k=0;k<3;k++){ abLine([[-13,-5+k*5],[-3,-4+k*5]], 'rgba(60,40,20,.6)', 1); abLine([[3,-4+k*5],[13,-5+k*5]], 'rgba(60,40,20,.6)', 1); }
        ctx.save(); ctx.rotate(t*.002); abGlow(8, M_INK); aPoly(0,0,22,6,0,'rgba(255,217,138,.7)',null,1.2); ctx.restore();
    }
    ctx.shadowBlur = 0; ctx.restore();
};
