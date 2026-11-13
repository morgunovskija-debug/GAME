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
    for(const file of ['boss-art.js','game.js','workshop.js','abyss.js','mythic.js','infinity.js','music.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
    const run=code=>vm.runInContext(code,context);
    run("selectClass('warrior')");
    return {run};
}
const DRAW_ALL='drawBackground(); drawParticles(); drawPickups(); drawHazards(); drawProjectiles(); drawMahoraga(); drawEthernaty(ethernaty1); drawMinions(); drawDragon(); drawSolarDevourer(); drawTwoFacedDemon(); drawWorkshop(); drawCraftedCombat(); drawPlayer(); drawDamageNumbers(); drawLighting();';
// Defeat every boss up to (but not including) the given index.
function clearUpTo(run, last){
    run('boss.hp=0; update(1000/60)');
    for(const [index,name] of [[1,'ethernaty1'],[2,'dragon'],[3,'solarDevourer'],[4,'twoFacedDemon']]){
        run(`summonBoss(${index})`); run(`${name}.hp=0; update(1000/60)`);
    }
    for(let i=5;i<last;i++){ run(`assert(summonBoss(${i}))`); run('abyss.boss.hp=0; update(1000/60)'); }
}

const MYTHIC=[
    { index:9, kind:'knight', name:'Kaelthar', hp:130000, biome:'colosseum', weapon:20, artifact:'eclipse_sigil', phases:3,
      attacks:['eclipseDash','cross','waves','leap','blades','mirror','corona','totalEclipse','blackSun'],
      schedule:[[18,.6],[36,.3],[46,.12]], seconds:62 },
    { index:10, kind:'seraph', name:'Nyxara', hp:160000, biome:'stormspire', weapon:21, artifact:'storm_feather', phases:3,
      attacks:['spears','pillars','feathers','cyclone','grid','dive','ball','tempest','wrath'],
      schedule:[[16,.6],[34,.3],[46,.1]], seconds:64 },
    { index:11, kind:'architect', name:'The Architect', hp:660000, biome:'firstpage', weapon:22, artifact:'architect_quill', phases:4,
      attacks:['lattice','platonic','compass','echo','blueprint','genesis','erasure','redraft','finalPage'],
      schedule:[[14,.7],[26,.45],[38,.2],[46,.08]], seconds:66 }
];

test('mythic bosses unlock after The Glitch, in order, and are registered with lore, drops and rewards', ()=>{
    const {run}=game();
    assert.equal(run('JSON.stringify(BOSS_NAMES.slice(9))'), '["Kaelthar","Nyxara","The Architect"]');
    assert.equal(run('LOCATIONS.length'), 12);
    assert.equal(run('ABYSS_EPILOGUES.length'), 7);
    assert.equal(run('JSON.stringify(BOSS_DROPS.slice(9))'), '[["sun_fragment"],["thunder_plume"],["blank_page"]]');
    assert.equal(run('JSON.stringify(weapons.slice(20,23).map(w=>w.name))'), '["Eclipse Edge","Tempest Bow","Genesis Codex"]');
    clearUpTo(run, 9);
    assert.equal(run('summonBoss(10)'), false, 'Nyxara is locked until Kaelthar falls');
    assert.equal(run('summonBoss(9)'), true);
    assert.equal(run('abyss.boss.kind'), 'knight');
    assert.equal(run('abyss.boss.maxHp'), 130000);
});

for (const m of MYTHIC){
    test(`${m.name}: every attack and the desperation move fire, phases advance, and the kill drops rewards`, ()=>{
        const {run}=game();
        clearUpTo(run, m.index);
        assert.equal(run(`summonBoss(${m.index})`), true);
        assert.equal(run('abyss.boss.kind'), m.kind);
        assert.equal(run('abyss.boss.maxHp'), m.hp);
        assert.equal(run('currentBiome'), m.biome);
        run('player.maxHp=1e9; player.hp=1e9; abyss.attackLog.clear()');
        let hits=0, activity=0;
        for(let s=0;s<m.seconds*60;s++){
            for(const [sec,frac] of m.schedule) if(s===sec*60) run(`abyss.boss.hp=abyss.boss.maxHp*${frac}`);
            const hp=run('player.hp');
            run('update(1000/60)');
            if(run('player.hp')<hp) hits++;
            run('player.hp=1e9');
            if(s%10===0) activity+=run('myth.shots.length+myth.hazards.length+abyss.shots.length+abyss.hazards.length');
            if(s%30===0) run(DRAW_ALL);
        }
        for(const id of m.attacks) assert.ok(run(`abyss.attackLog.has('${id}')`), `attack used: ${id}`);
        assert.equal(run('abyss.boss.phase'), m.phases);
        assert.equal(run('abyss.boss.finalDone'), true);
        assert.ok(hits>0, 'attacks hit the player');
        assert.ok(activity>0, 'attacks spawn projectiles and hazards');
        // Boss positions and projectile coordinates stay finite throughout the fight.
        assert.equal(run('Number.isFinite(abyss.boss.x) && Number.isFinite(abyss.boss.y) && myth.shots.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y))'), true);
        run('abyss.boss.hp=0; update(1000/60)'); run(DRAW_ALL);
        assert.equal(run(`killedBosses.has(${m.index})`), true);
        assert.equal(run(`pickups.some(p=>p.weaponIndex===${m.weapon}) && pickups.some(p=>p.artifactId==='${m.artifact}')`), true);
        assert.equal(run('myth.shots.length+myth.hazards.length'), 0, 'the arena clears on a kill');
        assert.equal(run('myth.weather'), null);
    });
}

test('the desperation move staggers the boss so it takes 50% more damage', ()=>{
    const {run}=game();
    clearUpTo(run, 9);
    run('summonBoss(9); player.maxHp=1e9; player.hp=1e9');
    run('abyss.boss.hp=abyss.boss.maxHp*.1; abyss.boss.phase=3; abyss.boss.state="idle"; abyss.boss.stun=0');
    run('update(1000/60)');
    assert.equal(run('abyss.boss.attack.id'), 'blackSun');
    for(let s=0;s<8*60 && run('!(abyss.boss.stun>0)');s++){ run('player.hp=1e9; update(1000/60)'); }
    assert.ok(run('abyss.boss.stun')>0, 'Kaelthar kneels after the judgement');
    run('abyss.boss.x=640; abyss.boss.y=300');
    const before=run('abyss.boss.hp');
    run('hitBoss({x:640,y:300,radius:4,damage:1000,weaponIdx:0,color:"#fff"})');
    assert.equal(before-run('abyss.boss.hp'), 1500);
});

test('mythic weapons damage the bosses and animate the player', ()=>{
    const {run}=game();
    clearUpTo(run, 9);
    run('summonBoss(9); abyss.boss.state="idle"; abyss.boss.attackCooldown=1e9; abyss.boss.x=640; abyss.boss.y=300');
    run('player.x=340; player.y=300; mouse.x=640; mouse.y=300; player.mana=1e6; player.maxHp=1e9; player.hp=1e9');
    for(const w of [20,21,22]){
        run(`inventory.push(${w}); weapon=${w}; player.attackCooldown=0`);
        const before=run('abyss.boss.hp');
        run('attack()');
        assert.equal(run('playerAnim.attackAt===worldTime'), true);
        for(let i=0;i<90;i++){ run('abyss.boss.x=640; abyss.boss.y=300; abyss.boss.attackCooldown=1e9; abyss.boss.state="idle"; update(1000/60)'); if(i%15===0) run(DRAW_ALL); }
        assert.ok(run('abyss.boss.hp')<before, `weapon ${w} should hit`);
    }
});

test('mythic artifacts: sigil after dash, quill, storm feather lightning and the crafted halo', ()=>{
    const {run}=game();
    // Eclipse Sigil: +25% damage for 2.5 seconds after a dash.
    const base=run('applyClassBonus(100,0)');
    run("grantArtifact('eclipse_sigil',0,0); player.dashCooldown=0; dash()");
    assert.equal(Math.round(run('applyClassBonus(100,0)')*100)/100, Math.round(base*1.25*100)/100);
    for(let s=0;s<2.6*60;s++) run('update(1000/60)');
    assert.equal(run('applyClassBonus(100,0)'), base);
    // Architect's Quill: +20% damage and 15% less damage taken.
    run("equippedArtifacts.fill(null); grantArtifact('architect_quill',0,0)");
    assert.equal(Math.round(run('applyClassBonus(100,0)')*100)/100, Math.round(base*1.2*100)/100);
    run('player.maxHp=1e6; player.hp=1e6; player.invincible=0'); const hp=run('player.hp'); run('hurtPlayer(100)');
    assert.equal(hp-run('player.hp'), 85);
    // Storm Feather: every 5th attack calls lightning on the boss.
    run("equippedArtifacts.fill(null); grantArtifact('storm_feather',0,0); myth.attacks=0; weapon=0; boss.x=640; boss.y=300; boss.radius=70");
    const bossHp=run('boss.hp');
    run('mythOnAttack(); mythOnAttack(); mythOnAttack(); mythOnAttack()');
    assert.equal(run('boss.hp'), bossHp);
    run('mythOnAttack()');
    assert.ok(run('boss.hp')<bossHp, 'the fifth attack strikes');
    assert.ok(run("myth.fx.some(f=>f.kind==='skybolt')"));
    // Ascendant Halo: crafted from one material of each mythic boss; heals 40% and recharges 35% faster.
    assert.equal(run("JSON.stringify(RECIPES.find(r=>r.id==='ascendant_halo').cost)"), '["sun_fragment","thunder_plume","blank_page"]');
    run("equippedArtifacts.fill(null); grantArtifact('ascendant_halo',0,0); boss.hp=0; update(1000/60); pickups=[]");
    run('player.maxHp=1000; player.hp=100; healCooldown=0; healPlayer(); update(1000/60)');
    assert.equal(Math.round(run('player.hp')), 500);
    assert.ok(run('healCooldown')<22000*.66 && run('healCooldown')>22000*.6);
});

test('balance pass: weak weapons are buffed and the first hard boss hits a little softer', ()=>{
    const {run}=game();
    assert.equal(run('JSON.stringify([10,14,16,19].map(i=>weapons[i].damage))'), '[150,240,360,3200]');
    assert.equal(run('ABYSS_DEFS.selene.dmgMult'), 4);
    assert.equal(run("JSON.stringify(['knight','seraph','architect'].map(k=>ABYSS_DEFS[k].dmgMult))"), '[4,4.5,5]');
});

test('restart clears every mythic system', ()=>{
    const {run}=game();
    clearUpTo(run, 10);
    run('summonBoss(10); player.maxHp=1e9; player.hp=1e9');
    for(let s=0;s<10*60;s++) run('update(1000/60)');
    run('restart()');
    assert.equal(run('abyss.boss===null && myth.shots.length===0 && myth.hazards.length===0 && myth.fx.length===0 && myth.weather===null'), true);
});
