const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

// A canvas context that accepts every call, so draw code runs end to end.
function mockContext(){
    const gradient={addColorStop(){}};
    return new Proxy({}, {
        get(target, prop){ return prop in target ? target[prop] : () => gradient; },
        set(target, prop, value){ target[prop]=value; return true; }
    });
}
function game(opts={}){
    const assertInGame=v=>{ if(!v) throw new Error('assertion failed in game'); };
    const elements=new Map();
    function element(){ return {width:1280,height:900,style:{},dataset:{},value:'',children:[],textContent:'',className:'',
        classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},focus(){},
        appendChild(el){this.children.push(el);},querySelector(){return element();},querySelectorAll(){return [];},
        getContext(){return mockContext();}}; }
    const context=vm.createContext({console,Math:Object.create(Math),innerWidth:1280,innerHeight:900,
        document:{getElementById(id){if(!elements.has(id))elements.set(id,element()); return elements.get(id);},
            createElement:element,querySelectorAll(){return [];},addEventListener(){}},
        window:{innerWidth:1280,innerHeight:900,addEventListener(){},matchMedia(){return {matches:false};},AudioContext:opts.audio},
        localStorage:{getItem(){return null;},setItem(){}},performance:{now(){return 0;}},
        requestAnimationFrame(){},setTimeout(){return 0;},clearTimeout(){},assert:assertInGame});
    for(const file of ['boss-art.js','game.js','workshop.js','abyss.js','mythic.js','infinity.js','god.js','music.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
    const run=code=>vm.runInContext(code,context);
    run("selectClass('warrior')");
    return {run, elements};
}
const DRAW_ALL='drawBackground(); drawParticles(); drawPickups(); drawHazards(); drawProjectiles(); drawMahoraga(); drawEthernaty(ethernaty1); drawMinions(); drawDragon(); drawSolarDevourer(); drawTwoFacedDemon(); drawWorkshop(); drawCraftedCombat(); drawPlayer(); drawDamageNumbers(); drawLighting();';
function clearMainBosses(run){
    run('boss.hp=0; update(1000/60)');
    for(const [index,name] of [[1,'ethernaty1'],[2,'dragon'],[3,'solarDevourer'],[4,'twoFacedDemon']]){
        run(`summonBoss(${index})`); run(`${name}.hp=0; update(1000/60)`);
    }
}

test('the Two-Faced Demon drops only the Demon Staff and the Cursed Core',()=>{
    const {run}=game();
    run('boss.hp=0; update(1000/60)');
    for(const [index,name] of [[1,'ethernaty1'],[2,'dragon'],[3,'solarDevourer']]){ run(`summonBoss(${index})`); run(`${name}.hp=0; update(1000/60)`); }
    run('summonBoss(4); pickups=[]; ownedArtifacts=[]; twoFacedDemon.hp=0; update(1000/60)');
    assert.deepEqual(run('JSON.stringify(ownedArtifacts)'),'["demon_core"]');
    assert.equal(run('pickups.length'),1);
    assert.equal(run('pickups[0].weaponIndex'),14);
    assert.equal(run("RECIPES.some(r=>r.id==='demon_talisman'||r.id==='demon_horn_charm')"),false);
    assert.equal(run("'demon_talisman' in ARTIFACTS || 'demon_horn_charm' in ARTIFACTS"),false);
});

test('difficulty is gone: bosses use their base health',()=>{
    const {run}=game();
    assert.equal(run("typeof DIFFICULTIES"),'undefined');
    assert.equal(run('createDragon().maxHp'),14000);
    assert.equal(run('boss.maxHp'),3000);
});

test('hard bosses unlock after the demon, in order, and fight, animate and drop rewards',()=>{
    const {run}=game();
    assert.equal(run('summonBoss(5)'),false);
    clearMainBosses(run);
    assert.equal(run('workshopUnlocked'),true);
    assert.equal(run('summonBoss(6)'),false);
    const expected=[[5,16,'moon_tear','observatory',3],[6,17,'frost_crown','glacier',3],[7,18,'stopped_hourglass','clockwork',3],[8,19,'null_core','nullsector',4]];
    for(const [index,weaponIndex,artifact,biome,phases] of expected){
        assert.equal(run(`summonBoss(${index})`),true);
        assert.equal(run('currentBiome'),biome);
        assert.equal(run('activeBoss()===abyss.boss'),true);
        // Fight for 40 simulated seconds through every phase; the player cannot die.
        run('player.maxHp=1e9; player.hp=1e9');
        let activity=0;
        for(let s=0;s<(phases===4?60:40)*60;s++){
            // Step health down through every phase threshold, ending inside the final 10%.
            if(s===600) run('abyss.boss.hp=abyss.boss.maxHp*.6');
            if(s===1200) run('abyss.boss.hp=abyss.boss.maxHp*.4');
            if(s===1800) run('abyss.boss.hp=abyss.boss.maxHp*.08');
            run('player.hp=1e9; update(1000/60)');
            if(s%10===0) activity+=run('abyss.shots.length+abyss.hazards.length');
            if(s%30===0) run(DRAW_ALL);
        }
        assert.equal(run('abyss.boss.phase'),phases);
        assert.ok(activity>0,'boss should attack');
        run('abyss.boss.hp=0; update(1000/60)');
        run(DRAW_ALL);
        assert.equal(run(`killedBosses.has(${index})`),true);
        assert.equal(run(`pickups.some(p=>p.weaponIndex===${weaponIndex}) && pickups.some(p=>p.artifactId==='${artifact}')`),true);
        assert.equal(run('abyss.fx.some(f=>f.kind==="death")'),true);
    }
});

test('new weapons damage the hard bosses and animate the player',()=>{
    const {run}=game();
    clearMainBosses(run);
    run('summonBoss(5); abyss.boss.state="idle"; abyss.boss.attackCooldown=1e9; abyss.boss.x=640; abyss.boss.y=300; abyss.boss.age=0');
    run('player.x=340; player.y=300; mouse.x=640; mouse.y=300; player.mana=1e6; player.maxHp=1e9; player.hp=1e9');
    for(const w of [16,17,18,19]){
        run(`inventory.push(${w}); weapon=${w}; player.attackCooldown=0`);
        const before=run('abyss.boss.hp');
        run('abyss.boss.x=640; abyss.boss.y=300; attack()');
        assert.equal(run('playerAnim.attackAt===worldTime'),true);
        for(let i=0;i<120;i++){ run('abyss.boss.x=640; abyss.boss.y=300; abyss.boss.attackCooldown=1e9; update(1000/60)'); if(i%20===0) run(DRAW_ALL); }
        assert.ok(run('abyss.boss.hp')<before, `weapon ${w} should hit`);
    }
});

test('stopped hourglass saves one lethal hit per fight; restart clears the expansion',()=>{
    const {run}=game();
    clearMainBosses(run);
    run("assert(summonBoss(5)); equippedArtifacts[0]='stopped_hourglass'; player.hp=10; player.invincible=0; hurtPlayer(500)");
    assert.equal(run('gameOver'),false);
    assert.equal(run('player.hp'),1);
    run('player.invincible=0; hurtPlayer(500)');
    assert.equal(run('gameOver'),true);
    run('restart()');
    assert.equal(run('abyss.boss===null && abyss.shots.length===0 && abyss.fx.length===0 && killedBosses.size===0'),true);
});

test('THE GLITCH comes after Horologue: 100,000 HP, 400 damage hits, every attack and the final NULL BEAM',()=>{
    const {run}=game();
    clearMainBosses(run);
    for(const index of [5,6]){ run(`summonBoss(${index})`); run('abyss.boss.hp=0; update(1000/60)'); }
    assert.equal(run('summonBoss(8)'),false,'locked until Horologue falls');
    run('summonBoss(7); abyss.boss.hp=0; update(1000/60)');
    assert.equal(run('summonBoss(8)'),true);
    assert.equal(run('abyss.boss.kind'),'glitch');
    assert.equal(run('abyss.boss.maxHp'),100000);
    assert.equal(run("BOSS_NAMES[8]"),'The Glitch');
    run('player.maxHp=1e9; player.hp=1e9; player.invincible=0');
    const before=run('player.hp'); run('hurtPlayer(200)');
    assert.equal(before-run('player.hp'),400);
    run('abyss.attackLog.clear()');
    let hits=0;
    for(let s=0;s<90*60;s++){
        if(s===600) run('abyss.boss.hp=74000');
        if(s===1800) run('abyss.boss.hp=49000');
        if(s===3200) run('abyss.boss.hp=24000');
        if(s===4200) run('abyss.boss.hp=9000');
        const hp=run('player.hp');
        run('update(1000/60)');
        if(run('player.hp')<hp) hits++;
        run('player.hp=1e9');
        if(s%45===0) run(DRAW_ALL);
    }
    for(const id of ['bones','blasters','distortion','rain','barrage','nullbeam','finalBeam'])
        assert.ok(run(`abyss.attackLog.has('${id}')`), `attack used: ${id}`);
    assert.equal(run('abyss.boss.phase'),4);
    assert.ok(hits>0,'attacks hit the player');
    run('abyss.boss.hp=0; update(1000/60)'); run(DRAW_ALL);
    assert.equal(run("killedBosses.has(8) && pickups.some(p=>p.weaponIndex===19) && pickups.some(p=>p.artifactId==='null_core')"),true);
});

test('hard boss and weapon damage multipliers', ()=>{
    const {run}=game();
    assert.equal(run("JSON.stringify([16,17,18,19].map(i=>weapons[i].damage))"),"[360,1200,950,3200]");
    assert.equal(run("JSON.stringify(['selene','vael','horologue','glitch'].map(k=>ABYSS_DEFS[k].dmgMult))"),"[4,5,5,2]");
    clearMainBosses(run);
    run('summonBoss(5); player.maxHp=1e9; player.hp=1e9; player.invincible=0');
    const before=run('player.hp'); run('hurtPlayer(10)');
    assert.equal(before-run('player.hp'),40);
});

test('life steal is gone; Rift Step is crafted from the Glitch fragment and teleports to the cursor on a 3s cooldown', ()=>{
    const {run}=game();
    assert.equal(run('typeof applyLifesteal'),'undefined');
    assert.ok(!run("ARTIFACTS.dragon_heart.desc").includes('Steals'));
    assert.equal(run("JSON.stringify(RECIPES.find(r=>r.id==='rift_step'))").includes('"station":"accessory"'),true);
    assert.equal(run("JSON.stringify(RECIPES.find(r=>r.id==='rift_step').cost)"),'["corrupted_fragment"]');
    assert.equal(run('riftStep()'),false,'needs the accessory');
    run("grantArtifact('rift_step', player.x, player.y)");
    assert.equal(run("hasArtifact('rift_step')"),true);
    run('mouse.x=400; mouse.y=300');
    assert.equal(run('riftStep()'),true);
    assert.equal(run('player.x'),400); assert.equal(run('player.y'),300);
    run('mouse.x=600');
    assert.equal(run('riftStep()'),false,'on cooldown');
    for(let s=0;s<3.1*60;s++) run('update(1000/60)');
    assert.equal(run('riftStep()'),true);
    assert.equal(run('player.x'),600);
});

// A Web Audio stand-in: every node, param and method accepts any call.
function mockAudio(clock, stats){
    const node = new Proxy(function(){}, {
        get(t, p){
            if (p === 'currentTime') return clock.t;
            if (p === 'sampleRate') return 8000;
            if (p === 'state') return 'running';
            if (p === 'getChannelData') return () => new Float32Array(16);
            if (typeof p === 'string' && p.startsWith('create')) stats[p] = (stats[p] || 0) + 1;
            return node;
        },
        apply(){ return node; }, set(){ return true; }
    });
    return function AudioContext(){ return node; };
}

test('cinematic music: each boss has its own theme that builds with the fight and ends in a fanfare', ()=>{
    const clock={t:0}, stats={};
    const {run}=game({audio:mockAudio(clock, stats)});
    assert.equal(run('bossMusic.unlock()'), true);
    const play=(sec=1)=>{ for(let i=0;i<sec*40;i++){ clock.t+=.025; run('bossMusic.pump()'); } };
    play();
    assert.equal(run('bossMusic.state().key'), 0, 'The King of Adaptation theme at the start');
    const before=stats.createOscillator;
    for (const [frac, level] of [[.7,1],[.4,2],[.1,3]]){
        run(`boss.hp=boss.maxHp*${frac}`); play(2);
        assert.equal(run('bossMusic.state().level'), level);
    }
    assert.ok(stats.createOscillator > before + 50, 'notes are scheduled');
    run('boss.hp=0; update(1000/60)'); play();
    assert.equal(run('bossMusic.state().key'), 'victory');
    play(6);
    assert.equal(run('bossMusic.state().key'), 'calm');
    const kill = { 1:'ethernaty1', 2:'dragon', 3:'solarDevourer', 4:'twoFacedDemon' };
    for (let i=1;i<=12;i++){
        assert.equal(run(`summonBoss(${i})`), true);
        play(1.5);
        assert.equal(run('bossMusic.state().key'), i, `theme for boss ${i}`);
        for (const frac of [.6,.35,.05]){ run(`(activeBoss()).hp=(activeBoss()).maxHp*${frac}`); play(2.5); }
        assert.equal(run('bossMusic.state().level'), 3);
        if (kill[i]) run(`${kill[i]}.hp=0; update(1000/60)`); else run('abyss.boss.hp=0; update(1000/60)');
        play(7);
    }
    assert.equal(run('bossMusic.state().error'), null);
    assert.equal(run('bossMusic.themes.length'), 13);
    run('paused=true'); play(); run('paused=false');
    assert.equal(run('bossMusic.toggleMute()'), true);
    assert.equal(run('bossMusic.toggleMute()'), false);
    run('player.hp=1; player.invincible=0; hurtPlayer(1e9)'); play();
    assert.equal(run('bossMusic.state().key'), 'defeat');
    assert.equal(run('bossMusic.state().error'), null);
});

test('music stays silent and harmless without Web Audio', ()=>{
    const {run}=game();
    assert.equal(run('bossMusic.unlock()'), false);
    run('bossMusic.pump(); bossMusic.toggleMute(); bossMusic.toggleMute(); bossMusic.setVolume(.3)');
    assert.equal(run('bossMusic.state().key'), null);
});
