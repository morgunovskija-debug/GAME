const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function game(){
    const elements=new Map();
    function element(){ return {style:{},dataset:{},value:'normal',children:[],classList:{toggle(){}},
        addEventListener(){},setAttribute(){},focus(){},appendChild(el){this.children.push(el);},
        querySelector(){return element();},querySelectorAll(){return [];},getContext(){return {};}}; }
    const context=vm.createContext({console,Math:Object.create(Math),innerWidth:1280,innerHeight:900,
        document:{getElementById(id){if(!elements.has(id))elements.set(id,element()); return elements.get(id);},
            createElement:element,querySelectorAll(){return [];},addEventListener(){}},
        window:{innerWidth:1280,innerHeight:900,addEventListener(){},matchMedia(){return {matches:false};}},
        localStorage:{getItem(){return null;},setItem(){}},performance:{now(){return 0;}},
        requestAnimationFrame(){},setTimeout(){return 0;},clearTimeout(){}});
    for(const file of ['game.js','workshop.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
    const run=code=>vm.runInContext(code,context);
    run("selectClass('warrior')");
    return run;
}
test('all five bosses unlock in order, repeated fights do not inflate HP, demon opens sanctuary',()=>{
    const run=game();
    assert.equal(run('summonBoss(4)'),false);
    run('boss.hp=0; update(1000/60)');
    assert.equal(run('killedBosses.has(0) && panelProgression'),true);
    const hp=run('player.maxHp');
    assert.equal(run('summonBoss(2)'),false);
    assert.equal(run('summonBoss(0)'),true);
    run('boss.hp=0; update(1000/60)');
    assert.equal(run('player.maxHp'),hp);
    for(const [index,name] of [[1,'ethernaty1'],[2,'dragon'],[3,'solarDevourer'],[4,'twoFacedDemon']]){
        assert.equal(run(`summonBoss(${index})`),true);
        assert.equal(run('summonBoss(0)'),false);
        run(`${name}.hp=0; update(1000/60)`);
    }
    assert.equal(run('workshopUnlocked && !gameOver && killedBosses.size===5'),true);
    assert.equal(run('summonBoss(4)'),true);
});
test('independent 10% drops, both plasma ingredients consumed once, stations and crafting gated',()=>{
    const run=game();
    run('Math.random=()=>.099; recordBossKill(0); recordBossKill(1)');
    assert.equal(run('materials.broken_wheel===1 && materials.handle===1 && materials.rainbow_triangle===1 && materials.energy_sphere===1'),true);
    run('Math.random=()=>.1; recordBossKill(0)');
    assert.equal(run('materials.handle'),1);
    assert.equal(run('craftItem(12)'),false);
    run('workshopUnlocked=true; bossDefeated=true; materials.energy_sphere=0');
    assert.equal(run('craftItem(12)'),false);
    run('materials.energy_sphere=1');
    assert.equal(run('craftItem(12)'),true);
    assert.equal(run('materials.energy_sphere===0 && materials.rainbow_triangle===0 && inventory.includes(12)'),true);
    assert.equal(run('craftItem(12)'),false);
});
test('adaptation reduces each subsequent hit by 2% and resets on kill',()=>{
    const run=game();
    run("equippedArtifacts[0]='adaptation_wheel'; player.maxHp=10000; player.hp=10000; player.invincible=0; hurtPlayer(100)");
    assert.equal(run('player.hp'),9900);
    run('player.invincible=0; hurtPlayer(100)');
    assert.equal(run('player.hp'),9802);
    run('recordBossKill(0)');
    assert.equal(run('playerAdaptation'),0);
});
test('plasma consumes 20 mana/sec; lightning 100 DPS; flame 50 DPS for five seconds',()=>{
    const run=game();
    run('bossDefeated=true; twoFacedDemon=createTwoFacedDemon(); twoFacedDemon.x=500; twoFacedDemon.y=300; player.x=100; player.y=300; mouse.x=500; mouse.y=300; mouse.down=true; weapon=12; player.mana=100; inventory.push(12)');
    const hp=run('twoFacedDemon.hp');
    run('for(let i=0;i<60;i++) updateCraftedCombat(1000/60)');
    assert.ok(Math.abs(run('player.mana')-80)<1e-8);
    assert.ok(Math.abs(run('twoFacedDemon.hp')-(hp-600))<1e-8);
    run('weapon=13; channelTick=0');
    const before=run('twoFacedDemon.hp');
    run('for(let i=0;i<10;i++) updateCraftedCombat(100)');
    assert.equal(run('twoFacedDemon.hp'),before-100);
    run("mouse.down=false; equippedArtifacts[0]='eternal_flame'; igniteTarget(twoFacedDemon)");
    const burn=run('twoFacedDemon.hp');
    run('for(let i=0;i<60;i++) updateCraftedCombat(100)');
    assert.equal(run('twoFacedDemon.hp'),burn-250);
});
test('handblade swings without projectiles; solar dash protects; menus pause combat; restart clears run',()=>{
    const run=game();
    run('inventory.push(11); weapon=11; boss.x=player.x+180; boss.y=player.y; mouse.x=boss.x; mouse.y=boss.y');
    const hp=run('boss.hp');
    run('attack()');
    assert.equal(run('projectiles.length'),0);
    assert.ok(run('boss.hp')<hp);
    run("equippedArtifacts[0]='solar_shield'; player.dashCooldown=0; dash()");
    assert.equal(run('player.invincible'),850);
    run('workshopMenuOpen=true; player.invincible=0');
    assert.equal(run('hurtPlayer(100)'),false);
    run('restart()');
    assert.equal(run('killedBosses.size===0 && !workshopUnlocked && !workshopMenuOpen && inventory.length===5'),true);
});
