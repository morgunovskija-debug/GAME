// Run-local progression, recipes and crafted equipment.
const BOSS_NAMES = ['Mahoraga', 'Ethernaty', 'Fire Destroyer', 'Solar Devourer', 'The Two-Faced Demon'];
const MATERIALS = {
    broken_wheel:'Broken Wheel', handle:'Handle', rainbow_triangle:'Rainbow Triangle',
    energy_sphere:'Energy Sphere', inactive_flame:'Inactive Eternal Flame',
    shield_piece:'Broken Shield Piece', lightning_fragment:'Lightning Fragment',
    demon_horn:'Demon Horn', cursed_relic:'Cursed Relic'
};
const BOSS_DROPS = [
    ['broken_wheel','handle'],
    ['rainbow_triangle','energy_sphere'],
    ['inactive_flame'],
    ['shield_piece'],
    ['lightning_fragment','demon_horn','cursed_relic']
];
const RECIPES = [
    {id:'adaptation_wheel', station:'accessory', name:'Adaptation Wheel', cost:['broken_wheel'], desc:'Each boss hit reduces subsequent damage by 2%, up to 100%. Resets on boss death.'},
    {id:'eternal_flame', station:'accessory', name:'Eternal Flame', cost:['inactive_flame'], desc:'Your attacks ignite enemies: 50 DPS for 5 seconds. Hits refresh the duration.'},
    {id:'solar_shield', station:'accessory', name:'Solar Shield', cost:['shield_piece'], desc:'Solar dash: longer range and protection when dashing into bosses.'},
    {id:'demon_talisman', station:'accessory', name:'Demon Talisman', cost:['cursed_relic'], desc:'Reduces all incoming damage by 25%.'},
    {id:'demon_horn_charm', station:'accessory', name:'Demon Horn Charm', cost:['demon_horn'], desc:'Boosts all damage dealt by 20%.'},
    {id:11, station:'weapon', name:'Handblade', cost:['handle'], desc:'A wide, 260-range melee swing. 300 base damage. No projectiles.'},
    {id:12, station:'weapon', name:'Plasma Crystal', cost:['rainbow_triangle','energy_sphere'], desc:'Hold attack for a rainbow beam: 600 base DPS, consuming exactly 20 mana/second.'},
    {id:13, station:'weapon', name:'Kumatoke', cost:['lightning_fragment'], desc:'Hold attack to call a massive yellow lightning beam from the sky at your cursor: 1000 DPS.'}
];
Object.assign(ARTIFACTS, {
    adaptation_wheel:{name:'Adaptation Wheel', icon:'☸', color:'#e7d491', boss:'Crafting', desc:RECIPES[0].desc},
    eternal_flame:{name:'Eternal Flame', icon:'🔥', color:'#ff8b40', boss:'Crafting', desc:RECIPES[1].desc},
    solar_shield:{name:'Solar Shield', icon:'🛡', color:'#ffd966', boss:'Crafting', desc:RECIPES[2].desc},
    demon_talisman:{name:'Demon Talisman', icon:'🧿', color:'#bb55ff', boss:'Crafting', desc:'Reduces all incoming damage by 25%.'},
    demon_horn_charm:{name:'Demon Horn Charm', icon:'📿', color:'#ff3366', boss:'Crafting', desc:'Boosts all damage dealt by 20%.'}
});
weapons.push(
    {name:'Handblade', damage:300, cooldown:650, mana:0, color:'#e7dbc0', category:'melee'},
    {name:'Plasma Crystal', damage:600, cooldown:0, mana:20, color:'#88eeff', category:'magic'},
    {name:'Kumatoke', damage:1000, cooldown:0, mana:0, color:'#ffee00', category:'magic'},
    {name:'Demon Staff', damage:76, cooldown:600, mana:0, color:'#cc44ff', category:'magic'},
    {name:'Dev Stick', damage:9999999, cooldown:350, mana:0, color:'#ff0055', category:'magic'}
);
let killedBosses = new Set(), materials = {}, panelProgression = false, workshopUnlocked = false;
let workshopMenuOpen = false, workshopTab = 'summon', firstBossKill = false;
let playerAdaptation = 0, combatVisual = null, channelActive = false, channelTick = 0;

const workshopControls = document.createElement('div');
workshopControls.id = 'workshopControls';
document.getElementById('ui').appendChild(workshopControls);
const workshopModal = document.createElement('div');
workshopModal.id = 'workshopModal';
workshopModal.className = 'overlay';
workshopModal.setAttribute('role','dialog');
workshopModal.setAttribute('aria-modal','true');
workshopModal.setAttribute('aria-label','Crafting and boss summoning');
document.getElementById('ui').appendChild(workshopModal);
for (let i=11;i<weapons.length;i++){
    if (document.querySelector && document.querySelector(`.weapon[data-id="${i}"]`)) continue;
    const el = document.createElement('button');
    el.className = 'weapon hidden'; el.dataset.id = i;
    el.innerHTML = `<span class="name">${weapons[i].name}</span><span class="adapt" id="adapt${i}">Crafted</span>`;
    el.onclick = () => { if (inventory.includes(i)){ weapon=i; updateWeaponUI(); } };
    document.getElementById('weapons').appendChild(el);
}
function activeBoss(){
    return [!bossDefeated && boss, !firstEthernatyDefeated && ethernaty1, !dragonDefeated && dragon,
        !solarDevourerDefeated && solarDevourer, !twoFacedDemonDefeated && twoFacedDemon].find(b => b && b.hp > 0) || null;
}
function clearArena(){
    projectiles=[]; enemyProjectiles=[]; meteors=[]; tornadoes=[]; shockwaves=[]; beams=[];
    minions=[]; geysers=[]; embers=[]; solarMines=[]; demonLightnings=[];
    pendingTimers.length=0;
    if (solarDevourer) solarDevourer.miniWorms=[];
    combatVisual=null; channelTick=0; channelActive=false;
    document.getElementById('bossWarning').style.display='none';
    document.getElementById('attackWarning').style.opacity=0;
}
function recordBossKill(index){
    firstBossKill = !killedBosses.has(index);
    killedBosses.add(index); panelProgression=true; playerAdaptation=0;
    clearArena();
    const drops=[];
    for (const id of BOSS_DROPS[index]) if (Math.random() < .1){
        materials[id]=(materials[id] || 0)+1; drops.push(MATERIALS[id]);
    }
    document.getElementById('lootReport').textContent = drops.length ? `Material drops: ${drops.join(', ')}` : `${BOSS_NAMES[index]}: no materials this time (10% each).`;
    refreshWorkshopButtons();
    updateMobileInteractBtn();
    showMessage(`${BOSS_NAMES[index]} defeated! Use the summon panel to fight again or continue.`);
}
function updateMobileInteractBtn(){
    const btn = document.getElementById('btnMobileInteract');
    if (!btn) return;
    const show = panelProgression && (!activeBoss() || workshopUnlocked);
    btn.style.display = show ? 'flex' : 'none';
    if (btn.classList && typeof btn.classList.toggle === 'function'){
        btn.classList.toggle('pulse', !!show);
    }
}
function updateWorkshopHUD(){
    updateMobileInteractBtn();
    if (!panelProgression || activeBoss()) return;
    document.getElementById('bossName').textContent=workshopUnlocked ? 'CRAFTING SANCTUARY' : 'BOSS DEFEATED · SUMMON PANEL READY';
    document.getElementById('phase').textContent=workshopUnlocked ? 'E near a station · Craft equipment or summon a boss' : 'E · Open summon panel';
    document.getElementById('bossHealth').style.width='0%';
}
function refreshWorkshopButtons(){
    workshopControls.innerHTML='';
    if (!panelProgression) return;
    for (const [tab,label] of [['summon','Summon panel'],['accessory','Accessory station'],['weapon','Weapon station']]){
        if (tab !== 'summon' && !workshopUnlocked) continue;
        const button=document.createElement('button'); button.textContent=label;
        button.onclick=()=>openWorkshop(tab); workshopControls.appendChild(button);
    }
}
function openWorkshop(tab){
    if (!currentClass || gameOver || paused || journalOpen || artifactMenuOpen || !panelProgression) return;
    if (tab!=='summon' && (!workshopUnlocked || activeBoss())) return;
    clearInput(); workshopTab=tab; workshopMenuOpen=true;
    renderWorkshop(); workshopModal.style.display='flex';
    workshopModal.querySelector('button').focus();
}
function closeWorkshop(){ workshopMenuOpen=false; workshopModal.style.display='none'; clearInput(); }
workshopModal.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons=[...workshopModal.querySelectorAll('button:not(:disabled)')];
    const first=buttons[0], last=buttons[buttons.length-1];
    if (event.shiftKey && document.activeElement===first){ event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement===last){ event.preventDefault(); first.focus(); }
});
function recipeOwned(recipe){ return typeof recipe.id==='number' ? inventory.includes(recipe.id) : ownedArtifacts.includes(recipe.id); }
function craftItem(id){
    const recipe=RECIPES.find(r=>r.id===id);
    if (!recipe || !workshopUnlocked || activeBoss() || recipeOwned(recipe) || !recipe.cost.every(m=>materials[m]>0)) return false;
    for (const m of recipe.cost) materials[m]--;
    if (typeof id==='number'){ inventory.push(id); weapon=id; updateWeaponUI(); }
    else grantArtifact(id,player.x,player.y);
    renderWorkshop(); return true;
}
function renderWorkshop(){
    workshopModal.innerHTML=`<div class="workshopWindow"><button class="closeWorkshop" type="button">Close · Esc</button><h1>${workshopTab==='summon' ? 'Boss summon panel' : workshopTab==='accessory' ? 'Accessory crafting station' : 'Weapon crafting station'}</h1><p>Materials: ${Object.entries(MATERIALS).map(([id,name])=>`${name}: ${materials[id]||0}`).join(' · ')}</p><div class="workshopList"></div><p>Each material rolls independently at 10% per kill. Accessories use your five artifact slots (I).</p></div>`;
    workshopModal.querySelector('button').onclick=closeWorkshop;
    const list=workshopModal.querySelector('.workshopList');
    if (workshopTab==='summon') BOSS_NAMES.forEach((name,index)=>{
        const unlocked=index===0 || killedBosses.has(index-1);
        const row=document.createElement('article');
        row.innerHTML=`<div><strong>${name}</strong><p>${killedBosses.has(index)?'Defeated · Repeatable':unlocked?'Available':`Locked · Defeat ${BOSS_NAMES[index-1]}`}<br>Drops: ${BOSS_DROPS[index].map(id=>`${MATERIALS[id]} (10%)`).join(', ')}</p></div>`;
        const button=document.createElement('button'); button.textContent='Summon'; button.disabled=!unlocked || !!activeBoss();
        button.onclick=()=>summonBoss(index); row.appendChild(button); list.appendChild(row);
    });
    else for (const recipe of RECIPES.filter(r=>r.station===workshopTab)){
        const row=document.createElement('article');
        row.innerHTML=`<div><strong>${recipe.name}</strong><p>${recipe.desc}</p><p>Requires: ${recipe.cost.map(id=>`1 ${MATERIALS[id]} (${materials[id]||0}/1)`).join(' + ')}</p></div>`;
        const button=document.createElement('button'); button.textContent=recipeOwned(recipe)?'Crafted':'Craft';
        button.disabled=recipeOwned(recipe) || !!activeBoss() || !recipe.cost.every(m=>materials[m]>0);
        button.onclick=()=>craftItem(recipe.id); row.appendChild(button); list.appendChild(row);
    }
}
function summonBoss(index){
    if (!Number.isInteger(index) || index<0 || index>=BOSS_NAMES.length || !panelProgression || activeBoss() || (index>0 && !killedBosses.has(index-1))) return false;
    // Collect old rewards before replacing the arena, including off-screen drops.
    for (const pk of pickups){
        if (pk.artifactId) grantArtifact(pk.artifactId,player.x,player.y);
        else if (!inventory.includes(pk.weaponIndex)) inventory.push(pk.weaponIndex);
    }
    pickups=[]; clearArena(); closeWorkshop();
    boss=null; ethernaty1=null; dragon=null; solarDevourer=null; twoFacedDemon=null;
    bossDefeated=firstEthernatyDefeated=dragonDefeated=solarDevourerDefeated=twoFacedDemonDefeated=true;
    ethernatySpawned=dragonSpawned=solarDevourerSpawned=twoFacedDemonSpawned=true;
    if (index===0){ boss=createMahoraga(); bossDefeated=false; }
    if (index===1){ ethernaty1=createEthernaty1(); firstEthernatyDefeated=false; }
    if (index===2){ dragon=createDragon(); dragonDefeated=false; }
    if (index===3){ solarDevourer=createSolarDevourer(); solarDevourerDefeated=false; }
    if (index===4){ twoFacedDemon=createTwoFacedDemon(); twoFacedDemonDefeated=false; }
    adaptationGlobal=0; weaponAdaptation.fill(0); weaponAdaptTurned.fill(false); playerAdaptation=0;
    currentBiome=['forest','cosmic','volcanic','volcanic','volcanic'][index];
    player.x=canvas.width/2; player.y=GROUND()-100; player.invincible=1000;
    document.getElementById('bossName').textContent=BOSS_NAMES[index];
    for (const id of ['bossName','bossBar','bossHealth','phase']) document.getElementById(id).className=['','ethernaty','fire','solar','demon'][index];
    document.getElementById('bossHealth').style.width='100%';
    updateWeaponUI(); updateWeaponAdaptUI(); updateMobileInteractBtn(); return true;
}
function stationPositions(){
    return [{tab:'accessory',label:'Accessory station',x:canvas.width*.27,y:canvas.height*.47},
        {tab:'summon',label:'Summon panel',x:canvas.width*.5,y:canvas.height*.35},
        {tab:'weapon',label:'Weapon station',x:canvas.width*.73,y:canvas.height*.47}];
}
function interactWorkshop(){
    if (!panelProgression || workshopMenuOpen) return;
    if (!workshopUnlocked){ openWorkshop('summon'); return; }
    const nearest=stationPositions().sort((a,b)=>distance(a,player)-distance(b,player))[0];
    if (distance(nearest,player)<120) openWorkshop(nearest.tab);
}
function drawWorkshop(){
    if (!player || !workshopUnlocked || activeBoss()) return;
    ctx.save(); ctx.textAlign='center';
    for (const s of stationPositions()){
        ctx.fillStyle='#182331'; ctx.strokeStyle=s.tab==='summon'?'#b7a2ed':'#c8a96b'; ctx.lineWidth=2;
        ctx.fillRect(s.x-43,s.y-25,86,50); ctx.strokeRect(s.x-43,s.y-25,86,50);
        ctx.fillStyle='#e2d9bd'; ctx.font='22px sans-serif'; ctx.fillText(s.tab==='summon'?'◇':s.tab==='weapon'?'⚔':'☸',s.x,s.y+8);
        ctx.font='13px sans-serif'; ctx.fillText(s.label,s.x,s.y+46);
        if (distance(s,player)<120) ctx.fillText('E · Open',s.x,s.y+65);
    }
    ctx.restore();
}
function igniteTarget(target){ if (hasArtifact('eternal_flame')) target.eternalBurn=5000; }
function bossHitPoints(target){
    if (target===solarDevourer){
        if (target.underground) return [];
        return Array.from({length:target.segCount},(_,i)=>({...getSolarSegment(target,i),radius:target.segRadii[i]}));
    }
    return [{x:target.x,y:target.y,radius:target.radius || 88}];
}
function attackCraftedWeapon(){
    if (weapon!==11) return;
    const a=angleTo(player,mouse), target=activeBoss();
    combatVisual={kind:'swing',x:player.x,y:player.y,angle:a,life:300};
    player.attackCooldown=weapons[11].cooldown;
    if (!target) return;
    const point=bossHitPoints(target).find(p=>distance(player,p)<260+p.radius && Math.abs(Math.atan2(Math.sin(angleTo(player,p)-a),Math.cos(angleTo(player,p)-a)))<1.2);
    if (point) hitBoss({...point,radius:2,damage:applyClassBonus(300,11),weaponIdx:11,color:weapons[11].color});
}
function updateCraftedCombat(dt){
    if (combatVisual){ combatVisual.life-=dt; if (combatVisual.life<=0) combatVisual=null; }
    const target=activeBoss();
    for (const enemy of [target,...minions,...(solarDevourer?.miniWorms || [])]){
        if (!enemy || enemy.hp<=0 || !(enemy.eternalBurn>0)) continue;
        const damage=Math.min(dt,enemy.eternalBurn)*.05;
        enemy.eternalBurn=Math.max(0,enemy.eternalBurn-dt); enemy.hp-=damage; totalDamage+=damage;
    }
    channelActive=false;
    if (!mouse.down || (weapon!==12 && weapon!==13)){ channelTick=0; return; }
    let duration=dt;
    if (weapon===12){ duration=Math.min(dt,player.mana/.02); player.mana=Math.max(0,player.mana-duration*.02); }
    if (duration<=0){ channelTick=0; return; }
    channelActive=true;
    const a=angleTo(player,mouse), length=Math.hypot(canvas.width,canvas.height);
    const visual=weapon===12 ? {kind:'plasma',x:player.x,y:player.y,tx:player.x+Math.cos(a)*length,ty:player.y+Math.sin(a)*length} : {kind:'lightning',x:mouse.x,y:0,tx:mouse.x,ty:mouse.y};
    combatVisual={...visual,life:100}; channelTick+=duration;
    while (channelTick>=100){
        channelTick-=100;
        if (!target || target.hp<=0) continue;
        const beamRadius = weapon===13 ? 42 : 14;
        const hit=bossHitPoints(target).some(p=>pointSegDist(p.x,p.y,visual.x,visual.y,visual.tx,visual.ty)<p.radius+beamRadius);
        if (hit){
            const damage=weapon===12?applyClassBonus(60,12):applyClassBonus(100,13);
            target.hp-=damage; totalDamage+=damage; igniteTarget(target); applyLifesteal(damage);
            damageNumber(target.x,target.y-30,Math.round(damage),weapons[weapon].color);
        }
    }
}
function drawCraftedCombat(){
    if (player && hasArtifact('adaptation_wheel')){
        ctx.save(); ctx.translate(player.x,player.y-43); ctx.rotate(playerAdaptation*Math.PI/4);
        ctx.strokeStyle='#e7d491'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2);
        for (let i=0;i<8;i++){ const a=i*Math.PI/4; ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*21,Math.sin(a)*21); }
        ctx.stroke(); ctx.restore();
    }
    if (!combatVisual) return;
    const v=combatVisual;
    ctx.save(); ctx.globalAlpha=Math.min(1,v.life/150); ctx.lineCap='round';
    if (v.kind==='swing'){
        ctx.strokeStyle='#f0e4c7'; ctx.lineWidth=18; ctx.beginPath();
        ctx.arc(v.x,v.y,250,v.angle-1.2,v.angle+1.2); ctx.stroke();
    } else if (v.kind==='lightning'){
        // Kumatoke: 3x bigger yellow lightning beam from the sky
        ctx.lineWidth=36;
        ctx.strokeStyle='#ffe600';
        ctx.beginPath(); ctx.moveTo(v.x,v.y); ctx.lineTo(v.tx,v.ty); ctx.stroke();
        ctx.lineWidth=18;
        ctx.strokeStyle='#fff766';
        ctx.stroke();
        ctx.lineWidth=6;
        ctx.strokeStyle='#ffffff';
        ctx.stroke();
    } else {
        ctx.lineWidth=24;
        const gradient=ctx.createLinearGradient(v.x,v.y,v.tx,v.ty);
        ['#ff5d87','#ffc857','#82f8bb','#68cfff','#b89bff'].forEach((c,i)=>gradient.addColorStop(i/4,c));
        ctx.strokeStyle=v.kind==='dash'?'#ffcf62':gradient;
        ctx.beginPath(); ctx.moveTo(v.x,v.y); ctx.lineTo(v.tx,v.ty); ctx.stroke();
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=3; ctx.stroke();
    }
    ctx.restore();
}
function resetWorkshop(){
    killedBosses.clear(); materials={}; panelProgression=false; workshopUnlocked=false;
    playerAdaptation=0; combatVisual=null; channelTick=0; channelActive=false;
    closeWorkshop(); refreshWorkshopButtons(); document.getElementById('lootReport').textContent='';
}
const lootReport=document.createElement('div'); lootReport.id='lootReport'; lootReport.setAttribute('role','status');
document.getElementById('ui').appendChild(lootReport);
