// ================================================================
//  TUTORIAL
//  A short, skippable lesson after you pick a class, before the first
//  boss wakes: move, attack, dash, dash through an attack, and heal.
//  The King of Adaptation waits off stage until it ends. It plays
//  automatically the first time; the checkbox on the class screen
//  turns it on again. Skip it any time with the Skip button or K.
// ================================================================
const TUT_KEY = 'boss-rush-tutorial';
const tut = { active:false, step:0, stepT:0, doneT:0, markers:[], crystal:null, wall:null, attacks:0, lastAttackAt:-1e9,
    dashes:0, dashAt:-1e9, fail:'', failT:0, endT:0, rings:[] };
const TUT_GOLD = '#ffd66b', TUT_CYAN = '#7ff6ff';

function tutSeen(){ try { return localStorage.getItem(TUT_KEY) === 'done'; } catch (e) { return false; } }
function tutMarkSeen(){ try { localStorage.setItem(TUT_KEY, 'done'); } catch (e) {} }
{
    const box = document.getElementById('tutorialToggle');
    if (box) box.checked = !tutSeen();
}
const tutMobile = () => typeof isMobileDevice !== 'undefined' && isMobileDevice;

// Each step: what to do, how to set it up, and when it is complete.
const TUT_STEPS = [
    { title:'Move', text:() => tutMobile() ? 'Drag the joystick on the left to walk. Reach both glowing markers.' : 'Use W A S D or the arrow keys to walk. Reach both glowing markers.',
      start(){
          const y = GROUND() - 170;
          tut.markers = [{ x:canvas.width*.22, y, hit:false }, { x:canvas.width*.78, y, hit:false }];
      },
      check(){
          for (const m of tut.markers) if (!m.hit && distance(m, player) < 46){ m.hit = true; tutRing(m.x, m.y, TUT_GOLD); }
          return tut.markers.every(m => m.hit);
      } },
    { title:'Attack', text:() => tutMobile() ? 'Tap FIRE to attack. Attack the training crystal 3 times.' : 'Aim with the mouse and press or hold the left mouse button to attack. Attack the training crystal 3 times.',
      start(){ tut.crystal = { x:canvas.width/2, y:Math.max(200, GROUND() - 420), cracks:0, hitAt:-1e9 }; tut.attacks = 0; tut.lastAttackAt = playerAnim.attackAt; },
      check(){
          if (playerAnim.attackAt > tut.lastAttackAt){
              tut.lastAttackAt = playerAnim.attackAt; tut.attacks++;
              tut.crystal.cracks = tut.attacks; tut.crystal.hitAt = worldTime;
              particle(tut.crystal.x, tut.crystal.y, TUT_CYAN, 12, 6, .6);
          }
          if (tut.attacks >= 3){ particle(tut.crystal.x, tut.crystal.y, TUT_CYAN, 40, 10, .9); tutRing(tut.crystal.x, tut.crystal.y, TUT_CYAN); tut.crystal = null; return true; }
          return false;
      } },
    { title:'Dash', text:() => tutMobile() ? 'Tap DASH to burst a short distance in the direction you are moving. Dash 2 times.' : 'Press SPACE to burst a short distance in the direction you are moving. Dash 2 times.',
      start(){ tut.dashes = 0; },
      check(){ return tut.dashes >= 2; } },
    { title:'Dash through attacks', text:() => `For a split second during a dash, nothing can hurt you. When the wall of light reaches you, ${tutMobile() ? 'tap DASH' : 'press SPACE'} to dash straight through it.`,
      start(){ tutWall(); },
      check(dt){
          const w = tut.wall;
          if (!w){ return false; }
          if (w.wait > 0){ w.wait -= dt; w.side = Math.sign(w.x - player.x); return false; }
          // Compare with the side the player was on last frame: a dash jumps across between frames.
          w.x += w.vx*dt*.06;
          const side = Math.sign(w.x - player.x), crossed = w.side && side && side !== w.side;
          if (side) w.side = side;   // exactly level with the player counts as not crossed yet
          if (crossed){
              // The wall crossed the player: only a dash makes it safe.
              if (player.invincible > 0 && worldTime - tut.dashAt < 700){ tutRing(player.x, player.y, TUT_CYAN); tut.wall = null; return true; }
              tut.fail = 'Too early or too late. Dash just as the wall reaches you.'; tut.failT = 1800;
              particle(player.x, player.y, '#ff6a6a', 18, 6, .6);
              tutWall(900);
          } else if (w.x < -80 || w.x > canvas.width + 80) tutWall(300);
          return false;
      } },
    { title:'Heal', text:() => `You took a hit. ${tutMobile() ? 'Tap ❤️' : 'Press H'} to heal 30% of your max HP. Healing then needs 22 seconds to recharge, so save it for when it counts.`,
      start(){ player.hp = Math.round(player.maxHp*.55); healCooldown = 0; particle(player.x, player.y, '#ff6a6a', 18, 6, .6); },
      check(){ return healCooldown > 0; } }
];

function tutRing(x, y, color){ tut.rings.push({ x, y, color, age:0 }); }
function tutWall(wait=0){
    // The wall sweeps toward the player from the far side of the arena.
    const fromRight = player.x < canvas.width/2, top = Math.min(130, Math.max(60, canvas.height*.2)), bot = GROUND();
    tut.wall = { x:fromRight ? canvas.width + 40 : -40, vx:fromRight ? -5 : 5, y:(top + bot)/2, h:bot - top + 40, wait };
}
function tutStartStep(i){
    tut.step = i; tut.stepT = 0; tut.doneT = 0; tut.fail = '';
    if (TUT_STEPS[i]) TUT_STEPS[i].start();
    tutPanel();
}
function tutPanel(){
    const el = document.getElementById('tutorial'); if (!el) return;
    el.style.display = tut.active ? 'block' : 'none';
    if (!tut.active) return;
    const s = TUT_STEPS[tut.step], finished = tut.step >= TUT_STEPS.length;
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('tutorialStep', finished ? 'Tutorial complete' : `Step ${tut.step + 1} of ${TUT_STEPS.length} · ${s.title}`);
    set('tutorialText', finished ? 'Watch for attack warnings at the top of the screen. The King of Adaptation awakens!'
        : tut.doneT > 0 ? '✔ Nice!' : tut.fail || s.text());
    const dots = document.getElementById('tutorialDots');
    if (dots) dots.textContent = TUT_STEPS.map((_, i) => i < tut.step || (i === tut.step && tut.doneT > 0) ? '●' : '○').join(' ');
}
function tutHud(hidden){
    for (const id of ['bossName', 'bossBar', 'phase']){ const n = document.getElementById(id); if (n) n.style.display = hidden ? 'none' : ''; }
}
function startTutorial(){
    tut.active = true; tut.endT = 0; tut.rings = []; tut.wall = null; tut.crystal = null; tut.markers = [];
    // Hold back the first boss's title card until the lesson is over.
    const card = document.getElementById('bossWarning'); if (card) card.style.display = 'none';
    if (typeof abyss !== 'undefined'){ clearTimeout(abyss.cardTimer); abyss.fx = []; }
    tutHud(true);
    showMessage('📘 Tutorial: learn the basics, or press Skip.');
    tutStartStep(0);
}
function endTutorial(){
    if (!tut.active) return;
    tut.active = false; tut.wall = null; tut.crystal = null; tut.markers = [];
    tutMarkSeen();
    const box = document.getElementById('tutorialToggle'); if (box) box.checked = false;
    tutHud(false); tutPanel();
    if (player){ player.hp = player.maxHp; player.mana = player.maxMana; player.invincible = 1000; }
    healCooldown = 0; runElapsed = 0;   // the lesson doesn't count against the run timer
    if (typeof showLocationCard === 'function'){ showLocationCard(0); if (typeof abPortalFx === 'function') abPortalFx(canvas.width/2, 210, LOCATIONS[0].color); }
}
function skipTutorial(){ endTutorial(); }

function tutUpdate(dt){
    for (const r of tut.rings) r.age += dt;
    tut.rings = tut.rings.filter(r => r.age < 700);
    if (tut.failT > 0){ tut.failT -= dt; if (tut.failT <= 0){ tut.fail = ''; tutPanel(); } }
    if (tut.step >= TUT_STEPS.length){
        tut.endT -= dt;
        if (tut.endT <= 0) endTutorial();
        return;
    }
    tut.stepT += dt;
    if (tut.doneT > 0){
        tut.doneT -= dt;
        if (tut.doneT <= 0){
            if (tut.step + 1 >= TUT_STEPS.length){ tut.step = TUT_STEPS.length; tut.endT = 2600; tutPanel(); }
            else tutStartStep(tut.step + 1);
        }
        return;
    }
    const wasFail = tut.fail;
    if (TUT_STEPS[tut.step].check(dt)){ tut.doneT = 900; tut.fail = ''; tutPanel(); }
    else if (tut.fail !== wasFail) tutPanel();
}

// ---------------- Art ----------------
function drawTutorial(){
    if (!tut.active) return;
    const t = worldTime;
    ctx.save();
    for (const m of tut.markers){
        if (m.hit) continue;
        const pulse = 1 + Math.sin(t*.006)*.12;
        ctx.save(); ctx.translate(m.x, m.y);
        ctx.globalAlpha = .25; ctx.fillStyle = TUT_GOLD; ctx.beginPath(); ctx.ellipse(0, 10, 40*pulse, 14*pulse, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = .9; ctx.strokeStyle = TUT_GOLD; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t*.05;
        ctx.beginPath(); ctx.ellipse(0, 10, 40*pulse, 14*pulse, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
        // A bouncing arrow above the marker.
        const by = -40 + Math.sin(t*.008)*8;
        ctx.fillStyle = TUT_GOLD; ctx.beginPath(); ctx.moveTo(-12, by-18); ctx.lineTo(12, by-18); ctx.lineTo(0, by); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    const c = tut.crystal;
    if (c){
        const shake = Math.max(0, 1 - (t - c.hitAt)/200)*4;
        ctx.save(); ctx.translate(c.x + Math.sin(t*.09)*shake, c.y + Math.sin(t*.003)*6);
        ctx.globalAlpha = .3; ctx.fillStyle = TUT_CYAN; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#d9fbff'; ctx.strokeStyle = TUT_CYAN; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(26, -6); ctx.lineTo(14, 40); ctx.lineTo(-14, 40); ctx.lineTo(-26, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(40,110,140,.8)'; ctx.lineWidth = 1.5;
        for (let i=0;i<c.cracks;i++){ ctx.beginPath(); ctx.moveTo(0, -10 + i*10); ctx.lineTo((i%2 ? 1 : -1)*20, -20 + i*14); ctx.lineTo((i%2 ? 1 : -1)*8, 4 + i*12); ctx.stroke(); }
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${c.cracks} / 3`, 0, 66);
        ctx.restore();
        // A dashed aim line from the player to the crystal.
        ctx.globalAlpha = .35; ctx.strokeStyle = TUT_CYAN; ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const w = tut.wall;
    if (w && w.wait <= 0){
        const g = ctx.createLinearGradient(w.x - 30, 0, w.x + 30, 0);
        g.addColorStop(0, 'rgba(255,214,107,0)'); g.addColorStop(.5, 'rgba(255,240,200,.95)'); g.addColorStop(1, 'rgba(255,214,107,0)');
        ctx.fillStyle = g; ctx.fillRect(w.x - 30, w.y - w.h/2, 60, w.h);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w.x, w.y - w.h/2); ctx.lineTo(w.x, w.y + w.h/2); ctx.stroke();
        // Arrows show which way it travels.
        ctx.fillStyle = TUT_GOLD; const d = Math.sign(w.vx);
        for (let i=0;i<5;i++){ const y = w.y - w.h/2 + (i+.5)*w.h/5; ctx.beginPath(); ctx.moveTo(w.x + d*40, y); ctx.lineTo(w.x + d*22, y - 10); ctx.lineTo(w.x + d*22, y + 10); ctx.closePath(); ctx.fill(); }
    }
    for (const r of tut.rings){
        const k = r.age/700;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = 4*(1-k) + 1;
        ctx.beginPath(); ctx.arc(r.x, r.y, 20 + k*70, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
}

// ================================================================
//  HOOKS INTO THE GAME
// ================================================================
const tutBase = { selectClass, update, activeBoss, dash, restart, drawMahoraga, drawHazards };

selectClass = function(cls){
    const had = currentClass;
    tutBase.selectClass(cls);
    const box = document.getElementById('tutorialToggle');
    if (!had && currentClass && box && box.checked) startTutorial();
};
update = function(dt){
    if (!tut.active) return tutBase.update(dt);
    const running = !(gameOver || !currentClass || workshopMenuOpen || artifactMenuOpen || paused || journalOpen);
    // The first boss waits off stage: hide it from this frame's simulation.
    const held = boss; boss = null;
    try { tutBase.update(dt); } finally { boss = held; }
    if (running && player) tutUpdate(dt);
};
// No boss is "active" during the lesson, so the music stays calm and nothing targets it.
activeBoss = function(){ return tut.active ? null : tutBase.activeBoss(); };
dash = function(){
    const cd = player ? player.dashCooldown : 0;
    tutBase.dash();
    if (tut.active && player && player.dashCooldown > cd){ tut.dashes++; tut.dashAt = worldTime; }
};
restart = function(){
    tut.active = false; tut.wall = null; tut.crystal = null; tut.markers = []; tut.rings = [];
    tutHud(false); tutPanel();
    tutBase.restart();
    const box = document.getElementById('tutorialToggle'); if (box) box.checked = !tutSeen();
};
drawMahoraga = function(){ if (!tut.active) tutBase.drawMahoraga(); };
drawHazards = function(){ tutBase.drawHazards(); drawTutorial(); };

if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', e => {
    if (e.code !== 'KeyK' || e.repeat || !tut.active || ['INPUT','SELECT','TEXTAREA'].includes(e.target && e.target.tagName)) return;
    skipTutorial();
});
{
    const btn = document.getElementById('tutorialSkip');
    if (btn && btn.addEventListener) btn.addEventListener('click', () => skipTutorial());
}
