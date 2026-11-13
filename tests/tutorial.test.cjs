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
    for(const file of ['boss-art.js','game.js','workshop.js','abyss.js','mythic.js','infinity.js','god.js','tutorial.js','music.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
    const run=code=>vm.runInContext(code,context);
    run("selectClass('warrior')");
    return {run};
}
const DRAW_ALL='drawBackground(); drawParticles(); drawPickups(); drawHazards(); drawProjectiles(); drawMahoraga(); drawEthernaty(ethernaty1); drawMinions(); drawDragon(); drawSolarDevourer(); drawTwoFacedDemon(); drawWorkshop(); drawCraftedCombat(); drawPlayer(); drawDamageNumbers(); drawLighting();';
const step=(run,n=1,each='')=>{ for(let i=0;i<n;i++) run(`${each}; update(1000/60)`); };

test('the first boss is renamed The King of Adaptation', ()=>{
    const {run}=game();
    assert.equal(run('BOSS_NAMES[0]'), 'The King of Adaptation');
    assert.equal(run('LOCATIONS[0].title'), 'The King of Adaptation — The Divine General');
    assert.equal(run('ARTIFACTS.mahoraga_fang.boss'), 'The King of Adaptation');
});

test('the tutorial runs after picking a class, teaches every basic, and holds the boss back until it ends', ()=>{
    const {run}=game();
    assert.equal(run('tut.active'), true, 'starts automatically the first time');
    assert.equal(run('activeBoss()'), null, 'no boss is active during the lesson');
    const bx=run('boss.x'), by=run('boss.y'), bossHp=run('boss.hp');
    // 1. Move: walk onto both markers.
    assert.equal(run('TUT_STEPS[tut.step].title'), 'Move');
    for(let i=0;i<2;i++){ run(`player.x=tut.markers[${i}].x; player.y=tut.markers[${i}].y`); step(run); }
    step(run, 60);
    // 2. Attack three times.
    assert.equal(run('TUT_STEPS[tut.step].title'), 'Attack');
    run('mouse.x=tut.crystal.x; mouse.y=tut.crystal.y; player.mana=1e6');
    for(let i=0;i<3;i++){ run('player.attackCooldown=0; attack()'); step(run, 2); }
    step(run, 60);
    // 3. Dash twice.
    assert.equal(run('TUT_STEPS[tut.step].title'), 'Dash');
    for(let i=0;i<2;i++){ run('player.dashCooldown=0; dash()'); step(run, 2); }
    step(run, 60);
    // 4. Dash through the wall. Standing still fails and the wall comes again.
    assert.equal(run('TUT_STEPS[tut.step].title'), 'Dash through attacks');
    run('player.x=640; player.y=500');
    for(let i=0;i<400 && !run('tut.fail');i++) step(run, 1, 'player.x=640; player.y=500');
    assert.match(run('tut.fail'), /Too early or too late/, 'getting hit by the wall explains the timing');
    assert.equal(run('player.hp'), run('player.maxHp'), 'the practice wall does no real damage');
    let dodged=false;
    for(let i=0;i<600 && !dodged;i++){
        run('player.y=500');
        if(run('!!tut.wall && tut.wall.wait<=0 && Math.abs(tut.wall.x-player.x)<30')){
            run('mouse.x=player.x+Math.sign(tut.wall.x-player.x)*300; mouse.y=player.y; player.dashCooldown=0; dash()');
        }
        step(run);
        dodged=run('tut.doneT>0 || TUT_STEPS[tut.step].title!=="Dash through attacks"');
    }
    assert.ok(dodged, 'dashing through the wall completes the step');
    step(run, 60);
    // 5. Heal.
    assert.equal(run('TUT_STEPS[tut.step].title'), 'Heal');
    assert.ok(run('player.hp<player.maxHp'), 'the player is hurt so healing does something');
    run('healPlayer()'); step(run, 60);
    assert.equal(run('tut.step'), run('TUT_STEPS.length'), 'every step is complete');
    // The boss never moved or fought during the lesson.
    assert.equal(run('boss.x'), bx); assert.equal(run('boss.y'), by); assert.equal(run('boss.hp'), bossHp);
    for(let i=0;i<400 && run('tut.active');i++) step(run);
    assert.equal(run('tut.active'), false, 'the tutorial ends by itself');
    assert.equal(run('activeBoss()===boss'), true, 'the King of Adaptation wakes up');
    assert.equal(run('healCooldown'), 0, 'heal is ready for the real fight');
    assert.equal(run('player.hp'), run('player.maxHp'));
    assert.ok(run('runElapsed')<100, 'the lesson does not count toward the run timer');
    step(run, 180);
    assert.ok(run('boss.x')!==bx || run('boss.y')!==by, 'the boss now moves');
    run(DRAW_ALL);
});

test('the tutorial can be skipped at any step, and draws without errors', ()=>{
    const {run}=game();
    for(let i=0;i<30;i++){ step(run); if(i%10===0) run(DRAW_ALL); }
    run('player.x=tut.markers[0].x; player.y=tut.markers[0].y'); step(run, 70); run(DRAW_ALL);
    run('visualMode="minimal"'); run(DRAW_ALL);
    run('skipTutorial()');
    assert.equal(run('tut.active'), false);
    assert.equal(run('document.getElementById("tutorial").style.display'), 'none');
    assert.equal(run('document.getElementById("bossBar").style.display'), '');
    assert.equal(run('activeBoss()===boss'), true);
    // The normal game continues: the boss can be beaten as before.
    run('boss.hp=0; update(1000/60)');
    assert.equal(run('killedBosses.has(0)'), true);
});

test('unchecking the box skips the tutorial; restart turns it back off once it has been seen', ()=>{
    const {run}=game();
    run('skipTutorial(); restart()');
    assert.equal(run('tut.active'), false);
    run('document.getElementById("tutorialToggle").checked=false; selectClass("mage")');
    assert.equal(run('tut.active'), false, 'no tutorial when unchecked');
    assert.equal(run('activeBoss()===boss'), true);
    run('restart(); document.getElementById("tutorialToggle").checked=true; selectClass("ranger")');
    assert.equal(run('tut.active'), true, 'checking the box plays it again');
    run('restart()');
    assert.equal(run('tut.active'), false);
    assert.equal(run('document.getElementById("tutorial").style.display'), 'none');
});
