// ================================================================
//  INFINITY EDGE
//  The final crafted weapon, made at the weapon station from every
//  material dropped by the bosses after The Two-Faced Demon.
//  Hold attack to call a colossal prismatic beam down from a rift in
//  the sky onto your cursor. The beam deals 50,000 base damage per
//  second to anything inside it.
//  All art is Canvas geometry driven by simulation time.
// ================================================================
const INF_WEAPON = weapons.length;
const INF_DPS = 50000;
const INF_RADIUS = 72;          // damage radius of the beam column and impact
const INF_TICK = 100;           // damage tick in ms
const INF_COLOR = '#c9a6ff';

weapons.push({ name:'Infinity Edge', damage:INF_DPS, cooldown:0, mana:0, color:INF_COLOR, category:'magic' });
while (weaponAdaptation.length < weapons.length){ weaponAdaptation.push(0); weaponAdaptTurned.push(false); }
{
    const el = document.createElement('button');
    el.className = 'weapon hidden'; el.dataset.id = INF_WEAPON; el.type = 'button';
    el.innerHTML = `<span class="name">${weapons[INF_WEAPON].name}</span><span class="adapt">Adapt: <span id="adapt${INF_WEAPON}">0%</span></span>`;
    el.onclick = () => { if (inventory.includes(INF_WEAPON)){ weapon = INF_WEAPON; updateWeaponUI(); } };
    document.getElementById('weapons').appendChild(el);
}
// One of every material dropped from Selene Vey onward.
const INF_COST = [...new Set(BOSS_DROPS.slice(ABYSS_INDEX).flat())];
RECIPES.push({ id:INF_WEAPON, station:'weapon', name:'Infinity Edge', cost:INF_COST,
    desc:'Hold attack to call a colossal prismatic beam from a rift in the sky onto your cursor: 50,000 DPS.' });

// ---------------- Runtime state ----------------
const inf = { on:false, open:0, x:0, y:0, tick:0, age:0, dmgAcc:0, dmgT:0, ringT:0, motes:[], rings:[], cracks:[] };
const INF_TAU = Math.PI*2;
const infHue = (off=0) => (worldTime*.06 + off) % 360;
const infCol = (off, a, l=70) => `hsla(${infHue(off).toFixed(1)},100%,${l}%,${Math.max(0,Math.min(1,a)).toFixed(3)})`;
function infEase(k){ return 1 - Math.pow(1-k, 3); }
function infReset(){ inf.on = false; inf.open = 0; inf.tick = 0; inf.dmgAcc = 0; inf.motes = []; inf.rings = []; inf.cracks = []; }
function infLemniscate(a, steps=48){
    const pts = [];
    for (let i=0;i<=steps;i++){
        const t = i/steps*INF_TAU, s = Math.sin(t), d = 1 + s*s;
        pts.push([a*Math.cos(t)/d, a*s*Math.cos(t)/d]);
    }
    return pts;
}
function infPath(pts){ ctx.beginPath(); pts.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); }
// Deterministic jagged arc so lightning flickers on a fixed beat instead of every frame.
function infArc(x1,y1,x2,y2,seed,jag){
    const pts = [[x1,y1]], n = 7;
    for (let i=1;i<n;i++){
        const k = i/n, r = Math.sin(seed*12.9898 + i*78.233)*43758.5453;
        const off = ((r - Math.floor(r)) - .5) * jag * 2;
        const nx = -(y2-y1), ny = x2-x1, L = Math.hypot(nx,ny) || 1;
        pts.push([x1+(x2-x1)*k + nx/L*off, y1+(y2-y1)*k + ny/L*off]);
    }
    pts.push([x2,y2]);
    return pts;
}

// ---------------- Combat ----------------
function infTargets(){
    const list = [];
    const boss = activeBoss();
    if (boss && boss.hp > 0) list.push(boss);
    for (const m of [...(minions || []), ...((solarDevourer && solarDevourer.miniWorms) || [])]) if (m && m.hp > 0) list.push(m);
    return list;
}
function infHits(target){
    const pts = target === activeBoss() ? bossHitPoints(target) : [{ x:target.x, y:target.y, radius:target.radius || 20 }];
    // The beam is a vertical column from the top of the screen down to the impact point.
    return pts.some(p => pointSegDist(p.x, p.y, inf.x, 0, inf.x, inf.y) < p.radius + INF_RADIUS);
}
function updateInfinity(dt){
    const wants = player && weapon === INF_WEAPON && inventory.includes(INF_WEAPON) && mouse.down;
    if (wants && !inf.on){ inf.x = mouse.x; inf.y = mouse.y; inf.age = 0; }
    inf.on = !!wants;
    inf.open = inf.on ? Math.min(1, inf.open + dt/380) : Math.max(0, inf.open - dt/260);
    if (inf.open <= 0){ inf.tick = 0; }
    // The beam drags slightly behind the cursor, so it feels heavy.
    const follow = 1 - Math.exp(-dt/55);
    inf.x += (mouse.x - inf.x)*follow; inf.y += (clamp(mouse.y, 40, canvas.height) - inf.y)*follow;
    inf.age += dt;
    if (inf.on){
        channelActive = true;
        // Damage starts once the rift is mostly open.
        if (inf.open > .4){
            inf.tick += dt;
            while (inf.tick >= INF_TICK){
                inf.tick -= INF_TICK;
                for (const t of infTargets()){
                    if (!infHits(t)) continue;
                    const dmg = applyClassBonus(INF_DPS*INF_TICK/1000, INF_WEAPON) * (t.stun > 0 ? 1.5 : 1);
                    t.hp -= dmg; totalDamage += dmg; igniteTarget(t);
                    inf.dmgAcc += dmg;
                    if (Math.random() < .5) particle(t.x + random(-30,30), t.y + random(-30,30), infCol(random(0,120), 1), 6, 7, .6);
                }
            }
        }
        // Rolled-up damage numbers so the screen is not buried in digits.
        inf.dmgT += dt;
        if (inf.dmgT >= 300){
            inf.dmgT = 0;
            if (inf.dmgAcc > 0){ damageNumber(inf.x + random(-40,40), inf.y - 60, Math.round(inf.dmgAcc), infCol(0,1,78), true); inf.dmgAcc = 0; }
        }
        inf.ringT -= dt;
        if (inf.ringT <= 0){ inf.ringT = 240; inf.rings.push({ x:inf.x, y:inf.y, r:INF_RADIUS*.5, life:600, max:600, hue:infHue() }); }
        const rate = visualMode === 'minimal' ? 1 : 4;
        for (let i=0;i<rate;i++){
            const a = random(0, INF_TAU);
            inf.motes.push({ x:inf.x + Math.cos(a)*random(10,INF_RADIUS), y:inf.y + Math.sin(a)*random(4,18),
                vx:random(-.08,.08), vy:random(-.32,-.1), life:random(600,1200), max:1200, size:random(1.5,3.5), hue:infHue(random(0,180)), down:false });
            if (Math.random() < .5) inf.motes.push({ x:inf.x + random(-INF_RADIUS*.6, INF_RADIUS*.6), y:random(0, inf.y*.8),
                vx:0, vy:random(.5,.9), life:random(400,800), max:800, size:random(1,2.5), hue:infHue(random(0,180)), down:true });
        }
        if (Math.random() < dt/90) inf.cracks.push({ x:inf.x, y:inf.y, a:random(0,INF_TAU), len:random(50,120), life:500, max:500, seed:Math.random()*1000 });
    }
    for (const m of inf.motes){ m.x += m.vx*dt; m.y += m.vy*dt; m.life -= dt; }
    for (const r of inf.rings){ r.r += dt*.32; r.life -= dt; }
    for (const c of inf.cracks) c.life -= dt;
    inf.motes = inf.motes.filter(m => m.life > 0 && (!m.down || m.y < inf.y)).slice(-220);
    inf.rings = inf.rings.filter(r => r.life > 0);
    inf.cracks = inf.cracks.filter(c => c.life > 0).slice(-14);
}

// ---------------- Beam art ----------------
function drawInfinityBeam(){
    if (inf.open <= 0 && !inf.rings.length && !inf.motes.length) return;
    const t = worldTime, k = infEase(inf.open), x = inf.x, y = inf.y;
    const pulse = 1 + Math.sin(t*.022)*.06 + Math.sin(t*.057)*.03;
    const W = INF_RADIUS*1.15*k*pulse;
    const fancy = visualMode !== 'minimal';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    if (k > 0.01){
        // Rift in the sky the beam pours out of.
        ctx.save(); ctx.translate(x, 0);
        const rift = ctx.createRadialGradient(0, 0, 0, 0, 0, 170*k);
        rift.addColorStop(0, 'rgba(255,255,255,.95)'); rift.addColorStop(.25, infCol(0, .8*k));
        rift.addColorStop(.6, infCol(140, .35*k, 55)); rift.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rift; ctx.beginPath(); ctx.ellipse(0, 0, 190*k, 70*k, 0, 0, INF_TAU); ctx.fill();
        // Rotating rays around the rift.
        for (let i=0;i<14;i++){
            const a = i/14*INF_TAU + t*.0011, len = (110 + Math.sin(t*.004 + i*1.7)*30)*k;
            ctx.strokeStyle = infCol(i*25, .45*k); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(Math.cos(a)*40*k, Math.sin(a)*14*k); ctx.lineTo(Math.cos(a)*len*1.6, Math.sin(a)*len*.5); ctx.stroke();
        }
        ctx.restore();

        // Outer glow column with rippling edges.
        const grad = ctx.createLinearGradient(x - W*1.6, 0, x + W*1.6, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(.18, infCol(200, .25*k, 55));
        grad.addColorStop(.35, infCol(60, .55*k));
        grad.addColorStop(.5, `rgba(255,255,255,${(.9*k).toFixed(3)})`);
        grad.addColorStop(.65, infCol(300, .55*k));
        grad.addColorStop(.82, infCol(140, .25*k, 55));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        const seg = 22, left = [], right = [];
        for (let yy=0; yy<=y; yy+=seg){
            const wob = Math.sin(yy*.035 - t*.018)*7 + Math.sin(yy*.011 + t*.009)*5;
            const flare = 1 + Math.max(0, 1 - (y-yy)/160)*.55; // widens near the impact
            left.push([x - W*1.6*flare + wob, yy]); right.push([x + W*1.6*flare + wob, yy]);
        }
        left.push([x - W*2.1, y]); right.push([x + W*2.1, y]);
        infPath([...left, ...right.reverse()]); ctx.closePath(); ctx.fill();

        // Inner column.
        const inner = ctx.createLinearGradient(x - W*.6, 0, x + W*.6, 0);
        inner.addColorStop(0, infCol(30, 0)); inner.addColorStop(.3, infCol(30, .8*k, 75));
        inner.addColorStop(.5, 'rgba(255,255,255,1)'); inner.addColorStop(.7, infCol(250, .8*k, 75)); inner.addColorStop(1, infCol(250, 0));
        ctx.fillStyle = inner; ctx.fillRect(x - W*.6, 0, W*1.2, y);

        // Two helix strands wrapping the core, thicker on the near side.
        if (fancy) for (const ph of [0, Math.PI]){
            let prev = null;
            for (let yy=0; yy<=y; yy+=10){
                const a = yy*.03 - t*.012 + ph, px = x + Math.sin(a)*W*.9, depth = (Math.cos(a)+1)/2;
                if (prev){
                    ctx.strokeStyle = infCol(yy*.4 + ph*60, (.25 + depth*.7)*k, 72);
                    ctx.lineWidth = 1.5 + depth*4.5;
                    ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(px, yy); ctx.stroke();
                }
                prev = [px, yy];
            }
        }

        // Blazing white core with flicker.
        const flick = .8 + Math.sin(t*.09)*.1 + Math.sin(t*.23)*.1;
        ctx.strokeStyle = `rgba(255,255,255,${(.95*k).toFixed(3)})`; ctx.lineWidth = Math.max(1, 16*k*flick);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke();

        // Infinity glyphs streaming down the beam.
        if (fancy) for (let i=0;i<6;i++){
            const yy = ((t*.55 + i*(y/6)) % Math.max(1, y));
            ctx.save(); ctx.translate(x + Math.sin(yy*.02 + i)*W*.3, yy); ctx.rotate(Math.sin(t*.003 + i)*.3);
            ctx.strokeStyle = infCol(i*55, .7*k, 80); ctx.lineWidth = 2;
            infPath(infLemniscate(10 + W*.12, 28)); ctx.stroke(); ctx.restore();
        }

        // Lightning arcs along the column edges.
        if (fancy){
            const beat = Math.floor(t/70);
            for (let i=0;i<3;i++){
                const y1 = ((beat*97 + i*331) % Math.max(1, Math.floor(y))), y2 = Math.min(y, y1 + 90);
                const side = i%2 ? 1 : -1;
                ctx.strokeStyle = infCol(i*90 + 180, .8*k, 80); ctx.lineWidth = 1.6;
                infPath(infArc(x + side*W*.4, y1, x + side*W*1.3, y2, beat + i, 14)); ctx.stroke();
            }
        }

        // ---------------- Impact ----------------
        ctx.save(); ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, INF_RADIUS*2.4*k);
        glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(.2, infCol(0, .85*k, 75));
        glow.addColorStop(.55, infCol(160, .35*k, 60)); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.ellipse(0, 0, INF_RADIUS*2.4*k, INF_RADIUS*1.1*k, 0, 0, INF_TAU); ctx.fill();

        // Rune circle on the ground (flattened for perspective).
        ctx.save(); ctx.scale(1, .42);
        const R = INF_RADIUS*1.45*k;
        ctx.rotate(t*.0016);
        ctx.strokeStyle = infCol(40, .9*k, 75); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, INF_TAU); ctx.stroke();
        ctx.strokeStyle = infCol(220, .7*k, 75); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, R*.82, 0, INF_TAU); ctx.stroke();
        for (let i=0;i<24;i++){
            const a = i/24*INF_TAU, l = i%3 ? 6 : 14;
            ctx.beginPath(); ctx.moveTo(Math.cos(a)*R*.82, Math.sin(a)*R*.82); ctx.lineTo(Math.cos(a)*(R*.82+l), Math.sin(a)*(R*.82+l)); ctx.stroke();
        }
        ctx.rotate(-t*.0038);
        ctx.strokeStyle = infCol(300, .8*k, 78); ctx.lineWidth = 2;
        for (let i=0;i<2;i++){ // two interlocked triangles
            ctx.beginPath();
            for (let j=0;j<=3;j++){ const a = j/3*INF_TAU + i*Math.PI/3; const px = Math.cos(a)*R*.78, py = Math.sin(a)*R*.78; j ? ctx.lineTo(px,py) : ctx.moveTo(px,py); }
            ctx.stroke();
        }
        ctx.restore();

        // Big rotating infinity sigil hovering over the impact.
        ctx.save(); ctx.translate(0, -18 + Math.sin(t*.004)*4);
        ctx.scale(1, .55 + Math.sin(t*.003)*.08); ctx.rotate(Math.sin(t*.0012)*.25);
        const sig = infLemniscate(INF_RADIUS*1.05*k*pulse, 64);
        ctx.strokeStyle = infCol(0, .35*k, 70); ctx.lineWidth = 14; infPath(sig); ctx.stroke();
        ctx.strokeStyle = infCol(120, .9*k, 80); ctx.lineWidth = 4; infPath(sig); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; infPath(sig); ctx.stroke();
        // A spark racing around the sigil.
        const si = Math.floor((t*.05) % sig.length), sp = sig[si];
        ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.beginPath(); ctx.arc(sp[0], sp[1], 5*k + .1, 0, INF_TAU); ctx.fill();
        ctx.restore();

        // Ground cracks of light.
        for (const c of inf.cracks){
            const a = c.life/c.max;
            ctx.strokeStyle = infCol(c.seed % 360, a*k, 78); ctx.lineWidth = 2;
            infPath(infArc(0, 0, Math.cos(c.a)*c.len, Math.sin(c.a)*c.len*.42, c.seed, 10)); ctx.stroke();
        }
        ctx.restore();
    }

    // Shock rings (fade out even after release).
    for (const r of inf.rings){
        const a = r.life/r.max;
        ctx.strokeStyle = `hsla(${r.hue.toFixed(1)},100%,75%,${(a*.8).toFixed(3)})`; ctx.lineWidth = 2 + a*5;
        ctx.beginPath(); ctx.ellipse(r.x, r.y, Math.max(.1, r.r), Math.max(.1, r.r*.42), 0, 0, INF_TAU); ctx.stroke();
    }
    // Rising and falling motes.
    for (const m of inf.motes){
        const a = Math.min(1, m.life/m.max*1.4);
        ctx.fillStyle = `hsla(${m.hue.toFixed(1)},100%,78%,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(m.x, m.y, Math.max(.1, m.size*(m.down ? 1 : a)), 0, INF_TAU); ctx.fill();
    }
    ctx.restore();
}

// ---------------- Weapon in hand ----------------
// Local space: +x points along the aim, origin at the hand.
function drawInfinityEdge(){
    const t = worldTime, ch = inf.open, fancy = visualMode !== 'minimal';
    ctx.save(); ctx.translate(8, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ch > 0) ctx.translate(Math.sin(t*.09)*ch*1.2, Math.cos(t*.11)*ch*1.2);

    // Aura behind the blade, stronger while channeling.
    if (fancy){
        const aura = ctx.createRadialGradient(46, 0, 0, 46, 0, 60);
        aura.addColorStop(0, infCol(0, .28 + ch*.4)); aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura; ctx.beginPath(); ctx.ellipse(46, 0, 62, 22 + ch*10, 0, 0, INF_TAU); ctx.fill();
    }

    // Pommel: ring holding a prismatic gem.
    ctx.strokeStyle = '#d8c48a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-20, 0, 5, 0, INF_TAU); ctx.stroke();
    abGlow(8, infCol(0, 1)); ctx.fillStyle = infCol(0, 1, 72);
    ctx.beginPath(); ctx.arc(-20, 0, 3, 0, INF_TAU); ctx.fill(); ctx.shadowBlur = 0;

    // Grip with a diagonal leather wrap.
    ctx.fillStyle = '#1c1430'; ctx.fillRect(-15, -3.5, 16, 7);
    ctx.strokeStyle = '#6b55a8'; ctx.lineWidth = 1.2;
    for (let i=-14;i<0;i+=3.5){ ctx.beginPath(); ctx.moveTo(i, -3.5); ctx.lineTo(i+3, 3.5); ctx.stroke(); }

    // Crossguard shaped like a standing infinity loop.
    ctx.save(); ctx.translate(3, 0); ctx.rotate(Math.PI/2);
    const guard = infLemniscate(15, 40);
    ctx.fillStyle = '#2a2140'; infPath(guard); ctx.fill();
    abGlow(6, '#e8d28f'); ctx.strokeStyle = '#e8d28f'; ctx.lineWidth = 2.2; infPath(guard); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = infCol(90, .9, 75); ctx.lineWidth = 1; infPath(infLemniscate(10, 32)); ctx.stroke();
    ctx.restore();
    // Center gem of the guard.
    abGlow(10, infCol(180, 1)); ctx.fillStyle = infCol(180, 1, 78);
    ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(7, 0); ctx.lineTo(3, 4); ctx.lineTo(-1, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;

    // Blade: a sliver of night sky with a prismatic edge.
    const blade = [[8,-5.5],[64,-4.5],[84,-1.5],[94,0],[84,1.5],[64,4.5],[8,5.5]];
    const bg = ctx.createLinearGradient(8, 0, 94, 0);
    bg.addColorStop(0, '#120b26'); bg.addColorStop(.5, '#1d1446'); bg.addColorStop(1, '#3a2a7a');
    ctx.fillStyle = bg; infPath(blade); ctx.closePath(); ctx.fill();
    abGlow(10 + ch*14, infCol(0, 1)); ctx.strokeStyle = infCol(0, .95, 72); ctx.lineWidth = 1.8 + ch;
    infPath(blade); ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0;
    // Fuller line.
    ctx.strokeStyle = infCol(200, .7, 80); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(80, 0); ctx.stroke();

    ctx.save(); infPath(blade); ctx.closePath(); ctx.clip();
    // Stars twinkling inside the blade.
    for (let i=0;i<14;i++){
        const sx = 12 + ((i*37) % 74), sy = ((i*53) % 9) - 4.5, tw = (Math.sin(t*.006 + i*2.3) + 1)/2;
        ctx.fillStyle = `rgba(255,255,255,${(.25 + tw*.75).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(sx, sy, .5 + tw*1.1, 0, INF_TAU); ctx.fill();
    }
    // Shimmer sweeping toward the tip.
    const sweep = 8 + ((t*(.09 + ch*.25)) % 120) - 15;
    const sh = ctx.createLinearGradient(sweep - 14, 0, sweep + 14, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.75)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(sweep - 14, -8, 28, 16);
    ctx.restore();

    // Motes orbiting the blade.
    if (fancy) for (let i=0;i<3;i++){
        const a = t*.005 + i*INF_TAU/3, ox = 50 + Math.cos(a)*40, oy = Math.sin(a)*9, front = Math.sin(a) > 0;
        ctx.fillStyle = infCol(i*120, front ? 1 : .45, 78);
        ctx.beginPath(); ctx.arc(ox, oy, front ? 2.2 : 1.4, 0, INF_TAU); ctx.fill();
    }

    // Tip: a spinning rune that blooms while the beam is active.
    ctx.save(); ctx.translate(94, 0); ctx.rotate(t*.006);
    const tr = 5 + ch*9 + Math.sin(t*.02)*1.5;
    abGlow(12, infCol(60, 1)); ctx.strokeStyle = infCol(60, .6 + ch*.4, 80); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, tr, 0, INF_TAU); ctx.stroke();
    for (let i=0;i<4;i++){ const a = i*Math.PI/2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*tr*.4, Math.sin(a)*tr*.4); ctx.lineTo(Math.cos(a)*tr*1.5, Math.sin(a)*tr*1.5); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(0, 0, 1.8 + ch*2, 0, INF_TAU); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();

    ctx.restore();
}

// ================================================================
//  HOOKS INTO THE GAME
// ================================================================
const infBase = { update, attack, clearArena, restart, drawCraftedCombat, drawWeaponInHand };

update = function(dt){
    const running = !(gameOver || !currentClass || workshopMenuOpen || artifactMenuOpen || paused || journalOpen);
    infBase.update(dt);
    if (!running || !player){ inf.on = false; return; }
    updateInfinity(dt);
};
// The Infinity Edge only channels; the base attack would fire stray projectiles.
attack = function(){ if (weapon === INF_WEAPON) return; infBase.attack(); };
clearArena = function(){ infBase.clearArena(); infReset(); };
restart = function(){ infReset(); infBase.restart(); };
drawCraftedCombat = function(){ infBase.drawCraftedCombat(); drawInfinityBeam(); };
drawWeaponInHand = function(idx){ if (idx === INF_WEAPON) drawInfinityEdge(); else infBase.drawWeaponInHand(idx); };
