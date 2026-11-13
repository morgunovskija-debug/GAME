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


test('Infinity Edge is crafted from every post-Demon material and its beam deals 50,000 DPS at the cursor',()=>{
    const {run}=game();
    clearUpTo(run, 12);
    assert.equal(run('ABYSS_DEFS.architect.hp'), 660000);
    assert.equal(run('weapons[INF_WEAPON].name'), 'Infinity Edge');
    const cost=JSON.parse(run('JSON.stringify(RECIPES.find(r=>r.id===INF_WEAPON).cost)'));
    assert.deepEqual(cost, ['moon_shard','everfrost_shard','broken_mainspring','corrupted_fragment','sun_fragment','thunder_plume','blank_page']);
    assert.equal(run('RECIPES.find(r=>r.id===INF_WEAPON).station'), 'weapon');
    assert.equal(run('dropChance(4)'), .1);
    assert.equal(run('dropChance(5)'), .5);
    assert.equal(run('dropChance(11)'), .5);
    run('workshopUnlocked=true; for (const k in MATERIALS) materials[k]=0');
    assert.equal(run('craftItem(INF_WEAPON)'), false, 'needs every material');
    run('for (const m of RECIPES.find(r=>r.id===INF_WEAPON).cost) materials[m]=1');
    assert.equal(run('craftItem(INF_WEAPON)'), true);
    assert.equal(run('inventory.includes(INF_WEAPON) && weapon===INF_WEAPON'), true);
    // Fight the Architect with the beam parked on it; artifacts off so the base DPS is measurable.
    run('equippedArtifacts.fill(null); ownedArtifacts.length=0; assert(summonBoss(11)); player.maxHp=1e9; player.hp=1e9');
    run('abyss.boss.state="idle"; abyss.boss.attackCooldown=1e9; abyss.boss.x=640; abyss.boss.y=400; mouse.x=640; mouse.y=400; mouse.down=true');
    const proj=run('projectiles.length'); run('attack()');
    assert.equal(run('projectiles.length'), proj, 'no stray projectiles');
    for(let i=0;i<60;i++) run('update(1000/60)'); // open the rift
    const before=run('abyss.boss.hp'), mult=run('applyClassBonus(1,INF_WEAPON)');
    for(let i=0;i<120;i++) run('abyss.boss.x=640; abyss.boss.y=400; update(1000/60)');
    const dealt=before-run('abyss.boss.hp');
    assert.ok(Math.abs(dealt-100000*mult) <= 5000*mult+1, `two seconds dealt ${dealt}, expected ~${100000*mult}`);
    assert.equal(run('channelActive'), true);
    run(DRAW_ALL); // beam and blade art must be valid canvas geometry
    run('mouse.x=100; mouse.y=200');
    for(let i=0;i<60;i++) run('update(1000/60)');
    const away=run('abyss.boss.hp'); for(let i=0;i<30;i++) run('abyss.boss.x=640; abyss.boss.y=400; update(1000/60)');
    assert.equal(run('abyss.boss.hp'), away, 'misses when the beam is elsewhere');
    run('mouse.down=false'); for(let i=0;i<10;i++){ run('update(1000/60)'); run(DRAW_ALL); }
    run('visualMode="minimal"; mouse.down=true'); for(let i=0;i<10;i++){ run('update(1000/60)'); run(DRAW_ALL); }
});
