const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function scene(){
    let operations=[],depth=0;
    const gradient=type=>({type,stops:[],addColorStop(...args){this.stops.push(args);}});
    const ctx=new Proxy({}, {
        get(target,key){
            if(key==='createLinearGradient')return (...args)=>{operations.push([key,...args]);return gradient(key)};
            return (...args)=>{
                operations.push([key,...args]);
                if(key==='save')depth++;
                if(key==='restore')depth--;
                assert.ok(depth>=0,'balanced context stack');
                for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${key} uses finite coordinates`);
            };
        },
        set(target,key,value){operations.push([key,value]);return true;}
    });
    const scope={ctx,Math,worldTime:1000,bossDefeated:false,firstEthernatyDefeated:false,dragonDefeated:false,solarDevourerDefeated:false,twoFacedDemonDefeated:false,
        getSolarSegment:(w,i)=>({x:w.head.x-i*32,y:w.head.y+Math.sin(i*.5)*20}),segTangentAngle:()=>0};
    vm.createContext(scope);
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/boss-art.js'),'utf8')+'\nglobalThis.art=BossArt;',scope);
    return {scope,render(name,entity){operations=[];scope.art[name](entity);assert.equal(depth,0);assert.ok(operations.length>30);assert.ok(!operations.some(op=>op[0]==='drawImage'));return JSON.stringify(operations);}};
}
function entity(name){
    return {type:name==='guardian'?'mahoraga':name==='cosmic'?'ethernaty1':name,x:400,y:300,hp:100,maxHp:100,phase:1,state:'idle',attackCooldown:1000,telegraph:800,telegraphMax:1000,
        bob:0,facing:1,jawOpen:0,head:{x:400,y:300},angle:0,segCount:8,segRadii:Array(8).fill(25),miniWorms:[]};
}
for(const name of ['guardian','cosmic','dragon','worm','demon']){
    test(`${name}: deterministic animation, attack, damage reaction and pause`,()=>{
        const s=scene(),e=entity(name);
        const idle=s.render(name,e);
        assert.equal(s.render(name,e),idle,'same simulation time freezes the pose');
        s.scope.worldTime+=200;
        assert.notEqual(s.render(name,e),idle,'idle animation advances');
        e.state='telegraph';e.attackCooldown=100;e.telegraph=100;
        s.scope.worldTime+=200;const wind=s.render(name,e);
        e.state='attack';e.artAttackAt=s.scope.worldTime;e.dashTimer=100;
        s.scope.worldTime+=100;const attack=s.render(name,e);
        assert.notEqual(attack,wind,'attack has a distinct articulated pose');
        e.hp-=10;const hit=s.render(name,e);
        assert.notEqual(hit,attack,'damage reaction changes geometry');
        assert.equal(s.render(name,e),hit,'pause also freezes damage reaction');
    });
}
test('worm: split minions use the simulated tail and render below ground',()=>{
    const s=scene(),e=entity('worm');e.underground=true;
    e.miniWorms=[{x:200,y:200,radius:20,tail:[{x:180,y:200},{x:160,y:200}]}];
    s.render('worm',e);
});
