const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function game(){
    const elements=new Map();
    function element(){ return {width:1280,height:900,style:{},dataset:{},value:'',children:[],textContent:'',className:'',
        classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},focus(){},
        appendChild(el){this.children.push(el);},querySelector(){return element();},querySelectorAll(){return [];},
        getContext(){return new Proxy({}, {get(target,key){return key in target?target[key]:()=>({addColorStop(){}});}});}}; }
    const context=vm.createContext({console,Math:Object.create(Math),innerWidth:1280,innerHeight:900,
        document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},
            createElement:element,querySelectorAll(){return [];},addEventListener(){}},
        window:{innerWidth:1280,innerHeight:900,addEventListener(){},matchMedia(){return {matches:false};}},
        localStorage:{getItem(){return 'done';},setItem(){}},performance:{now(){return 0;}},
        requestAnimationFrame(){},setTimeout(){return 0;},clearTimeout(){}});
    for(const file of ['boss-art.js','game.js','workshop.js','abyss.js','mythic.js','infinity.js','god.js','tutorial.js']){
        vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
    }
    return code=>vm.runInContext(code,context);
}

test('practice mode restores the latest boss checkpoint and progression after death',()=>{
    const run=game();
    run("document.getElementById('tutorialToggle').checked=false; document.getElementById('practiceModeToggle').checked=true; selectClass('warrior')");
    assert.equal(run('practiceMode'),true);
    assert.equal(run('practiceCheckpoint.lastBoss'),-1);

    run('boss.hp=0; update(1000/60)');
    assert.equal(run('practiceCheckpoint.lastBoss'),0);
    assert.equal(run('killedBosses.has(0)'),true);
    assert.equal(run('summonBoss(1)'),true);
    run('player.hp=1; player.invincible=0; hurtPlayer(2)');
    assert.equal(run('gameOver'),true);

    run('respawn()');
    assert.equal(run('currentClass'),'warrior');
    assert.equal(run('gameOver'),false);
    assert.equal(run('player.hp'),run('player.maxHp'));
    assert.equal(run('activeBoss()'),null);
    assert.equal(run('panelProgression'),true);
    assert.equal(run('killedBosses.has(0)'),true);
    assert.equal(run('summonBoss(1)'),true,'the next boss remains unlocked');
});

test('practice mode can respawn at the class-start checkpoint and normal mode still restarts',()=>{
    const run=game();
    run("document.getElementById('tutorialToggle').checked=false; document.getElementById('practiceModeToggle').checked=true; selectClass('mage'); player.hp=1; player.invincible=0; hurtPlayer(2)");
    run('respawn()');
    assert.equal(run('currentClass'),'mage');
    assert.equal(run('activeBoss()===boss'),true);
    assert.equal(run('killedBosses.size'),0);

    run('restart(); document.getElementById("practiceModeToggle").checked=false; selectClass("ranger"); player.hp=1; player.invincible=0; hurtPlayer(2); respawn()');
    assert.equal(run('currentClass'),null);
    assert.equal(run('gameOver'),false);
    assert.equal(run('practiceMode'),false);
});
