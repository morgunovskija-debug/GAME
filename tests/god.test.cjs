const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

// A canvas context that accepts every call but, like a real canvas, throws on negative or
// non-finite radii and on invalid gradient stops, so broken geometry fails the tests.
const COLOR=/^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;
function fail(msg){ throw new Error('canvas: '+msg); }
function mockContext(){
    const gradient={addColorStop(o,c){ if(!(o>=0&&o<=1)) fail('stop offset '+o); if(!COLOR.test(String(c))) fail('stop color '+c); }};
    const radius=(name,...r)=>{ for(const v of r) if(!Number.isFinite(v)||v<0) fail(`${name} radius ${v}`); };
    const strict={
        arc(x,y,r){ radius('arc',r); }, ellipse(x,y,rx,ry){ radius('ellipse',rx,ry); },
        createRadialGradient(x0,y0,r0,x1,y1,r1){ radius('radial gradient',r0,r1); return gradient; },
        createLinearGradient(...a){ if(!a.every(Number.isFinite)) fail('linear gradient '+a); return gradient; }
    };
    return new Proxy({}, {
        get(target, prop){ return prop in target ? target[prop] : prop in strict ? strict[prop] : () => gradient; },
        set(target, prop, value){ target[prop]=value; return true; }
    });
}
function game(){
    const assertInGame=v=>{ if(!v) throw new Error('assertion failed in game'); };
    const elements=new Map();
    function element(){ return {width:1280,height:900,style:{},dataset:{},value:'',children:[],textContent:'',className:'',
        classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},focus(){},
        appendChild(el){this.children.push(el);},querySelector(){return element();},querySelectorAll(){return [];},
        getContext(){return mockContext();}}; }
    const context=vm.createContext({console,Math:Object.create(Math),innerWidth:1280,innerHeight:900,
        document:{getElementById(id){if(!elements.has(id))elements.set(id,element()); return elements.get(id);},
            createElement:element,querySelectorAll(){return [];},addEventListener(){}},
        window:{innerWidth:1280,innerHeight:900,addEventListener(){},matchMedia(){return {matches:false};}},
        localStorage:{getItem(){return null;},setItem(){}},performance:{now(){return 0;}},
        requestAnimationFrame(){},setTimeout(){return 0;},clearTimeout(){},assert:assertInGame});
    for(const file of ['boss-art.js','game.js','workshop.js','abyss.js','mythic.js','infinity.js','god.js','music.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
    const run=code=>vm.runInContext(code,context);
    run("selectClass('warrior')");
    return {run};
}
const DRAW_ALL='drawBackground(); drawParticles(); drawPickups(); drawHazards(); drawProjectiles(); drawMahoraga(); drawEthernaty(ethernaty1); drawMinions(); drawDragon(); drawSolarDevourer(); drawTwoFacedDemon(); drawWorkshop(); drawCraftedCombat(); drawPlayer(); drawDamageNumbers(); drawLighting();';
function clearUpTo(run, last){
    run('boss.hp=0; update(1000/60)');
    for(const [index,name] of [[1,'ethernaty1'],[2,'dragon'],[3,'solarDevourer'],[4,'twoFacedDemon']]){
        run(`summonBoss(${index})`); run(`${name}.hp=0; update(1000/60)`);
    }
    for(let i=5;i<last;i++){ run(`assert(summonBoss(${i}))`); run('abyss.boss.hp=0; update(1000/60)'); }
}
// Summons The Idol, skips the descent and parks it so a forced attack can be tested on its own.
function arena(){
    const g=game(), {run}=g;
    clearUpTo(run, 12);
    run('assert(summonBoss(12)); player.maxHp=1e9; player.hp=1e9; equippedArtifacts.fill(null); ownedArtifacts.length=0');
    run('abyss.boss.state="idle"; abyss.boss.attackCooldown=1e9; abyss.boss.x=640; abyss.boss.y=200');
    return g;
}
const force=id=>`abStartAttack(abyss.boss, ABYSS_ATTACKS.god.find(a=>a.id==='${id}'))`;
// Runs n frames, keeping the boss idle afterwards so no other attack starts. Returns hits taken.
function frames(run, n, each=''){
    let hits=0;
    for(let i=0;i<n;i++){
        const hp=run('player.hp'); run(`${each}; abyss.boss.attackCooldown=1e9; update(1000/60)`);
        if(run('player.hp')<hp) hits++;
        run('player.hp=1e9');
        if(i%20===0) run(DRAW_ALL);
    }
    return hits;
}
const ATTACKS=['judgement','glitchLasers','slashes','still','winter','edgeStorm','sunder','mirror','choir'];

test('The Idol is the 13th boss: 10,000,000 HP, unlocked after The Architect, with its own arena, lore and rewards', ()=>{
    const {run}=game();
    assert.equal(run('BOSS_NAMES[12]'), 'The Idol');
    assert.equal(run('LOCATIONS[12].name'), 'The Throne Beyond Heaven');
    assert.equal(run('ABYSS_EPILOGUES.length'), 8);
    assert.equal(run('JSON.stringify(BOSS_DROPS[12])'), '[]');
    assert.equal(run('weapons[GOD_WEAPON].name'), 'Verdict of Heaven');
    assert.equal(run('JSON.stringify(ABYSS_ATTACKS.god.map(a=>a.id))'), JSON.stringify(ATTACKS));
    clearUpTo(run, 11);
    assert.equal(run('summonBoss(12)'), false, 'locked until The Architect falls');
    run('assert(summonBoss(11)); abyss.boss.hp=0; update(1000/60)');
    assert.equal(run('summonBoss(12)'), true);
    assert.equal(run('abyss.boss.kind'), 'god');
    assert.equal(run('abyss.boss.maxHp'), 10000000);
    assert.equal(run('currentBiome'), 'heaven');
    assert.equal(run('document.getElementById("bossHealth").className'), 'god');
});

test('a full fight: every attack fires, all four phases arrive, art stays valid, and the kill drops rewards', ()=>{
    const {run}=game();
    clearUpTo(run, 12);
    assert.equal(run('summonBoss(12)'), true);
    run('player.maxHp=1e9; player.hp=1e9; abyss.attackLog.clear()');
    let hits=0, activity=0;
    const schedule=[[30,.7],[60,.45],[90,.2]];
    for(let s=0;s<130*60;s++){
        for(const [sec,frac] of schedule) if(s===sec*60) run(`abyss.boss.hp=abyss.boss.maxHp*${frac}`);
        const hp=run('player.hp');
        run('update(1000/60)');
        if(run('player.hp')<hp) hits++;
        run('player.hp=1e9');
        if(s%10===0) activity+=run('god.shots.length+god.hazards.length+god.minions.length+god.clones.length');
        if(s%30===0) run(DRAW_ALL);
        if(s===40*60) run('visualMode="minimal"');
        if(s===50*60) run('visualMode="calm"');
    }
    for(const id of ATTACKS) assert.ok(run(`abyss.attackLog.has('${id}')`), `attack used: ${id}`);
    assert.equal(run('abyss.boss.phase'), 4);
    assert.ok(hits>0, 'attacks hit the player');
    assert.ok(activity>0, 'attacks spawn projectiles and hazards');
    assert.equal(run('Number.isFinite(abyss.boss.x) && Number.isFinite(abyss.boss.y) && god.shots.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y))'), true);
    run('abyss.boss.hp=0; update(1000/60)'); run(DRAW_ALL);
    assert.equal(run('killedBosses.has(12)'), true);
    assert.equal(run('pickups.some(p=>p.weaponIndex===GOD_WEAPON) && pickups.some(p=>p.artifactId==="god_eye")'), true);
    assert.equal(run('god.shots.length+god.hazards.length+god.minions.length+god.clones.length'), 0, 'the arena clears on a kill');
    assert.equal(run('god.arena===null && abyss.weather===null'), true);
    for(let i=0;i<120;i++) run('update(1000/60)');
    run(DRAW_ALL);
});

test('attacks are drawn from a shuffled deck: each cycle of nine is a new order and nothing repeats back to back', ()=>{
    const {run}=arena();
    const order=[];
    for(let i=0;i<45;i++){ run('abyss.boss.state="idle"; abStartAttack(abyss.boss)'); order.push(run('abyss.boss.attack.id')); run('godClear(); abyss.hazards=[]; abyss.weather=null'); }
    for(let c=0;c<5;c++) assert.deepEqual([...order.slice(c*9,c*9+9)].sort(), [...ATTACKS].sort(), `cycle ${c} uses every attack once`);
    for(let i=1;i<order.length;i++) assert.notEqual(order[i], order[i-1], 'no attack twice in a row');
    const cycles=new Set([0,1,2,3,4].map(c=>order.slice(c*9,c*9+9).join()));
    assert.ok(cycles.size>1, 'the order changes between cycles');
});

test('Judgement Beam burns the centre of the arena, and the sides are safe', ()=>{
    const {run}=arena();
    run(`player.x=640; player.y=600; ${force('judgement')}`);
    assert.ok(frames(run, 200, 'player.x=640')>0, 'standing in the centre is punished');
    const g=arena(); g.run(`player.x=100; player.y=600; ${force('judgement')}`);
    assert.equal(frames(g.run, 280, 'player.x=100'), 0, 'the edge is safe');
});

test('glitch lasers hit you, but the Infinity Edge beam blocks them', ()=>{
    const {run}=arena();
    run(`player.x=640; player.y=700; ${force('glitchLasers')}`);
    assert.ok(frames(run, 200, 'player.x=640; player.y=700')>0, 'the lasers land without a shield');
    // Same attack, with the Infinity Edge column parked between the player and the lasers.
    const g=arena();
    g.run('inventory.push(INF_WEAPON); weapon=INF_WEAPON; mouse.x=640; mouse.y=640; mouse.down=true; player.x=640; player.y=700');
    for(let i=0;i<40;i++) g.run('abyss.boss.attackCooldown=1e9; update(1000/60)');
    g.run(force('glitchLasers'));
    let blocked=0;
    for(let i=0;i<200;i++){
        const hp=g.run('player.hp');
        g.run('player.x=640; player.y=700; mouse.x=640; mouse.y=640; abyss.boss.attackCooldown=1e9; update(1000/60)');
        assert.equal(g.run('player.hp'), hp, `frame ${i}: the beam shields the player`);
        blocked=Math.max(blocked, g.run('god.hazards.filter(h=>h.kind==="glitchLaser" && h.warn<=0 && h.blocked<h.len).length'));
        if(i%20===0) g.run(DRAW_ALL);
    }
    assert.ok(blocked>0, 'the lasers are cut short at the beam');
});

test('Heaven Cleaver and Stilled Heavens: slashes lock before falling; the swarm freezes, then flies at you', ()=>{
    const {run}=arena();
    run(`player.x=640; player.y=500; ${force('slashes')}`);
    assert.ok(frames(run, 150, 'player.x=640; player.y=500')>0, 'a slash through you hurts');
    const g=arena(); g.run(`player.x=640; player.y=700; ${force('still')}`);
    frames(g.run, 40+70);
    assert.ok(g.run('god.shots.length')>=28, 'a swarm of projectiles');
    assert.equal(g.run('new Set(god.shots.map(s=>s.kind)).size'), 5, 'five different kinds');
    assert.ok(g.run('god.shots.filter(s=>s.still && !s.aimed && s.vx===0 && s.vy===0).length')>=24, 'they all stop');
    // Each shot must head at the player on the frame it launches.
    let launched=0;
    for(let i=0;i<80;i++){
        g.run('player.hp=1e9; player.x=640; player.y=700; abyss.boss.attackCooldown=1e9; update(1000/60)');
        const fresh=JSON.parse(g.run(`JSON.stringify(god.shots.filter(s=>s.aimed && s.age-s.aimAt<17).map(s=>{ const a=Math.atan2(700-s.y,640-s.x), d=Math.atan2(s.vy,s.vx); return Math.abs(Math.atan2(Math.sin(a-d),Math.cos(a-d))); }))`));
        for(const off of fresh) assert.ok(off<.2, `a launched shot heads at the player (off by ${off})`);
        launched+=fresh.length;
    }
    assert.ok(launched>=20, 'then they launch');
});

test('Stilled Heavens summons a stopped clock: time freezes the swarm and the Idol, then the clock shatters', ()=>{
    const {run}=arena();
    run(`player.x=640; player.y=700; ${force('still')}`);
    frames(run, 40);
    assert.equal(run('god.hazards.filter(h=>h.kind==="clock").length'), 1, 'the clock appears');
    assert.equal(run('gTimeStopped()'), false, 'its hands are still running');
    for(let i=0;i<70 && !run('gTimeStopped()');i++) frames(run, 1, 'player.x=640; player.y=700');
    assert.equal(run('gTimeStopped()'), true, 'time stops');
    assert.equal(run('god.shots.every(s=>s.still && s.vx===0 && s.vy===0)'), true, 'every shot stops on the same tick');
    const frozen=run('gTime()');
    frames(run, 30, 'player.x=640; player.y=700');
    assert.equal(run('gTime()'), frozen, 'the Idol is frozen mid-motion');
    for(let i=0;i<90 && run('gTimeStopped()');i++) frames(run, 1, 'player.x=640; player.y=700');
    assert.equal(run('gTimeStopped()'), false, 'time resumes');
    assert.ok(run('god.fx.some(f=>f.kind==="shatter")'), 'the clock shatters');
    frames(run, 120, 'player.x=640; player.y=700');
    assert.equal(run('god.hazards.some(h=>h.kind==="clock") || god.frozenAt!==null'), false, 'the clock is gone');
    run('visualMode="minimal"'); run(`${force('still')}`); frames(run, 110); run('restart()');
    assert.equal(run('god.frozenAt'), null, 'restart releases stopped time');
});

test('Divine Winter calls a blizzard and icicles from the ground under you', ()=>{
    const {run}=arena();
    run(`player.x=500; player.y=600; ${force('winter')}`);
    frames(run, 60);
    assert.equal(run('abyss.weather && abyss.weather.kind'), 'blizzard');
    let icicles=0, hits=0;
    for(let i=0;i<300;i++){
        hits+=frames(run, 1, 'player.x=500; player.y=600');
        icicles=Math.max(icicles, run('god.hazards.filter(h=>h.kind==="icicle").length'));
    }
    assert.ok(icicles>=2, 'several icicles at once');
    assert.ok(hits>0, 'icicles erupt under a player who stands still');
});

test('Storm at World’s Edge: the edges are lethal and only the middle is safe', ()=>{
    const {run}=arena();
    run(`${force('edgeStorm')}`);
    assert.equal(frames(run, 280, 'for (const h of god.hazards) if (h.kind==="edgeStorm"){ player.x=h.x; player.y=h.y; }'), 0, 'the middle is safe');
    const g=arena(); g.run(`player.x=60; player.y=200; ${force('edgeStorm')}`);
    assert.ok(frames(g.run, 280, 'player.x=60; player.y=200')>0, 'the edge is struck');
});

// Starts a Sundering and returns a point deep in the falling half (side 1) or the safe half (side -1).
function sunder(side){
    const g=arena(), {run}=g;
    run(`player.x=300; player.y=500; ${force('sunder')}`);
    frames(run, 40);
    const h=JSON.parse(run('JSON.stringify(god.hazards.find(h=>h.kind==="sunder")||null)'));
    assert.ok(h, 'the cut appears');
    const k=h.side*side*220, x=h.cx+h.nx*k, y=Math.max(300, Math.min(800, h.cy+h.ny*k));
    return { run, at:`player.x=${x}; player.y=${y}; abyss.boss.x=640; abyss.boss.y=150` };
}
test('Sundering cuts the arena in half and the half you stood on falls away', ()=>{
    const doom=sunder(1);
    assert.ok(frames(doom.run, 300, doom.at)>0, 'the falling half hurts');
    const safe=sunder(-1);
    assert.equal(frames(safe.run, 300, safe.at), 0, 'the other half is safe');
});

test('Heaven’s Mirror shrinks the arena and its clones fire at you', ()=>{
    const {run}=arena();
    run(`player.x=640; player.y=500; ${force('mirror')}`);
    frames(run, 120, 'player.x=640; player.y=500');
    assert.ok(run('god.arena && god.arena.k>.9'), 'the walls close in');
    assert.ok(run('god.clones.length')>=3, 'clones appear');
    assert.ok(run('god.shots.some(s=>s.color===G_ROSE)'), 'clones shoot');
    assert.ok(frames(run, 120, 'player.x=40; player.y=500')>0, 'outside the walls hurts');
});

test('Seraph Choir: minions follow your height, stop following, then fire a flaming laser', ()=>{
    const {run}=arena();
    run(`player.x=640; player.y=400; ${force('choir')}`);
    frames(run, 36+60, 'player.y=400');
    assert.ok(run('god.minions.length')>=3, 'minions are summoned');
    assert.ok(run('god.minions.every(m=>Math.abs(m.y-400)<40)'), 'they track the player’s height');
    // Wait until the first minion locks, then move away: its laser stays on the old line.
    for(let i=0;i<200 && run('god.minions[0].track>0');i++) run('player.hp=1e9; player.y=400; abyss.boss.attackCooldown=1e9; update(1000/60)');
    const lockedY=run('god.minions[0].y');
    frames(run, 20, 'player.y=650');
    assert.ok(Math.abs(run('god.minions[0].y')-lockedY)<1, 'a locked minion stops following');
    const g=arena(); g.run(`player.x=640; player.y=400; ${force('choir')}`);
    assert.ok(frames(g.run, 360, 'player.y=400')>0, 'standing still in the laser line burns');
});

test('Verdict of Heaven damages The Idol, and the Eye of the Arbiter adds damage and protection', ()=>{
    const {run}=arena();
    run('player.x=340; player.y=300; mouse.x=640; mouse.y=300; player.mana=1e6; abyss.boss.x=640; abyss.boss.y=300');
    run('inventory.push(GOD_WEAPON); weapon=GOD_WEAPON; player.attackCooldown=0');
    const before=run('abyss.boss.hp');
    run('attack()');
    assert.equal(run('playerAnim.attackAt===worldTime'), true);
    frames(run, 60, 'abyss.boss.x=640; abyss.boss.y=300');
    assert.ok(run('abyss.boss.hp')<before, 'the spear hits');
    const base=run('applyClassBonus(100,0)');
    run('grantArtifact("god_eye",0,0); if(!equippedArtifacts.includes("god_eye")) equippedArtifacts[0]="god_eye"');
    assert.ok(Math.abs(run('applyClassBonus(100,0)')/base-1.3)<1e-9);
    run('player.invincible=0; player.hp=1000; abyss.boss.hp=abyss.boss.maxHp'); run('hurtPlayer(100)');
    assert.equal(1000-run('player.hp'), 100*6.25*.8, 'boss damage multiplier, then 20% less');
});

test('restart clears every system of the fight', ()=>{
    const {run}=arena();
    run(`${force('mirror')}`); frames(run, 120);
    run(`${force('choir')}`); frames(run, 80);
    run('restart()');
    assert.equal(run('god.shots.length+god.hazards.length+god.minions.length+god.clones.length+god.playerShots.length'), 0);
    assert.equal(run('god.arena'), null);
    assert.equal(run('abyss.boss'), null);
});
