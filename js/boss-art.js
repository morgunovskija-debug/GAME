/* Procedural boss models. All geometry is hand-drawn Canvas; no image assets.
   Animation uses simulation time, so pausing freezes poses and rendering is deterministic. */
const BossArt = (() => {
    const TAU = Math.PI * 2;
    const poses = new WeakMap();
    const mix = (a,b,t) => a+(b-a)*t;
    const sat = v => Math.max(0,Math.min(1,v));
    function pose(entity){
        const time = worldTime / 1000;
        const state = entity.state || '';
        const rhythmic = entity.type === 'mahoraga' || entity.type === 'ethernaty1';
        const ready = state === 'telegraph' || state === 'charge_wait' || (rhythmic && entity.attackCooldown > 0 && entity.attackCooldown < 350);
        const striking = ['attack','dash','charge_run','dive','burrow_up'].includes(state) || entity.dashTimer > 0 || (rhythmic && worldTime-(entity.artAttackAt ?? -Infinity) < 240);
        const charge = ready ? (rhythmic ? sat(1-entity.attackCooldown/350) : sat(1-(entity.telegraph||0)/Math.max(1,entity.telegraphMax||1))) : 0;
        let p = poses.get(entity);
        if (!p) { p={last:worldTime,wind:0,strike:0,hp:entity.hp,hitAt:-Infinity}; poses.set(entity,p); }
        if(entity.hp < p.hp)p.hitAt=worldTime;
        p.hp=entity.hp;
        const hit=Math.exp(-(worldTime-p.hitAt)/150);
        const elapsed = Math.max(0,Math.min(100,worldTime-p.last));
        const blend = 1-Math.exp(-elapsed/110);
        p.wind=mix(p.wind,ready ? .3+.7*charge : 0,blend);
        p.strike=mix(p.strike,striking ? 1 : 0,blend); p.last=worldTime;
        return {time,wind:p.wind,strike:p.strike,breathe:Math.sin(time*2.1),hit};
    }
    function shape(points,fill,stroke='#222b31',width=1.5){
        ctx.beginPath(); points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
        ctx.fillStyle=fill;ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
    }
    function oval(x,y,rx,ry,fill,stroke=null,rotation=0){
        ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);
        ctx.fillStyle=fill;ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}
    }
    function line(points,color,width=1){
        ctx.beginPath();points.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
        ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
    }
    function metal(x,y,r,light,dark){
        const g=ctx.createLinearGradient(x-r,y-r,x+r,y+r);g.addColorStop(0,light);g.addColorStop(.48,dark);g.addColorStop(1,light);return g;
    }
    function joint(x,y,r,color='#a6ac9e'){
        oval(x,y,r,r,color,'#374441');oval(x-2,y-2,r*.48,r*.48,'#c2c5b0');
    }
    function limb(a,b,c,width,color,armored=false){
        line([a,b,c],'#252b30',width+4);line([a,b,c],color,width);
        line([[a[0]-3,a[1]], [b[0]-3,b[1]],[c[0]-2,c[1]]],'rgba(235,227,198,.2)',width*.2);
        if(armored){joint(...b,width*.53,'#58666a');line([[b[0]-width*.5,b[1]-3],[b[0]+width*.5,b[1]+3]],'#b2a781',2);}
    }
    function claw(x,y,angle,color='#b6b5a0'){
        ctx.save();ctx.translate(x,y);ctx.rotate(angle);
        oval(0,0,12,10,color,'#303539');
        for(let i=0;i<3;i++)shape([[4,i*6-7],[22-i*2,i*7-9],[11,i*6-2]],'#d2cfb4','#656b65',1);
        ctx.restore();
    }
    function runeRing(radius,angle,count,color){
        ctx.save();ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.stroke();
        for(let i=0;i<count;i++){
            ctx.save();ctx.rotate(i/count*TAU);line([[radius-4,-3],[radius+2,0],[radius-3,4]],color,1);
            line([[radius+4,-4],[radius+4,4]],color,.8);ctx.restore();
        }ctx.restore();
    }
    function guardian(b){
        if(!b || bossDefeated)return;
        const p=pose(b),t=p.time,step=Math.sin(t*3.2)*3;
        const lift=p.strike*.85-p.wind*.4;
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(p.hit*.035);ctx.lineJoin='round';
        // Eight carved spokes turn independently behind the guardian's shoulders.
        ctx.save();ctx.translate(0,-58);ctx.rotate((b.adaptWheelAngle||0)+t*.035);
        runeRing(77,0,32,'#a8ab91');runeRing(65,0,24,'#626f65');
        for(let i=0;i<8;i++){
            ctx.save();ctx.rotate(i*TAU/8);line([[0,-63],[0,-85]],'#7e8572',5);
            shape([[-8,-79],[0,-88],[8,-79],[0,-72]],i<(b.adaptWheelLit||0)?'#d4c591':'#929e8a');
            oval(0,-80,2,2,'#414f49');ctx.restore();
        }ctx.restore();
        // Asymmetric walking, layered greaves and a moving cloth hem.
        for(const side of [-1,1]){
            const knee=[side*22,58+side*step],foot=[side*26,91-side*step];
            limb([side*18,27],knee,foot,18,'#828f84',true);
            shape([[side*22-13,56],[side*22+13,56],[side*26+11,84],[side*26-11,84]],metal(side*22,65,18,'#b8beaa','#697b74'));
            oval(foot[0]+2,foot[1]+3,18,7,'#52655d','#293a36');
        }
        ctx.save();ctx.translate(0,p.breathe*1.5);ctx.rotate(-lift*.1);
        const skin=metal(0,-12,65,'#d1d3bd','#86978b');
        shape([[-37,-39],[-21,-48],[21,-48],[37,-39],[29,2],[19,32],[-19,32],[-29,2]],skin);
        for(const side of [-1,1]){
            oval(side*19,-24,16,11,'#a7b4a3','#74887c',side*.17);
            for(let i=0;i<3;i++)oval(side*9,-5+i*10,7,4,'#9baa98','#758777');
            // Bone shoulder plates, layered rather than flat circles.
            shape([[side*28,-42],[side*48,-45],[side*58,-30],[side*39,-19]],'#bfc4ad');
            for(let j=0;j<3;j++)line([[side*(33+j*5),-40],[side*(42+j*5),-28]],'#7b8c80',1);
            const swing=side*(Math.sin(t*2.4)*.08)+lift*(side===1?-1.05:.25);
            ctx.save();ctx.translate(side*39,-30);ctx.rotate(swing);
            limb([0,0],[side*10,28],[side*5,52],17,'#a1afa0',true);claw(side*5,54,side*.25);
            if(side===1){
                ctx.save();ctx.translate(8,44);ctx.rotate(.16-lift*.3);
                shape([[-5,0],[-4,-77],[3,-101],[9,-76],[7,0]],metal(0,-40,40,'#d2ded5','#637f7f'));
                line([[2,-86],[2,-7]],'#e2e6d7',1);shape([[-17,-2],[19,-2],[16,4],[-15,4]],'#9c9476');
                line([[2,5],[2,23]],'#444c44',6);ctx.restore();
            }ctx.restore();
        }
        const hem=Math.sin(t*2.4)*4;
        shape([[-28,20],[29,20],[38,57+hem],[14,51],[-2,65-hem],[-34,54]],'#394c49');
        for(let i=-2;i<=2;i++)line([[i*10,26],[i*12,50+Math.sin(t*2+i)*3]],'#60746a',1);
        shape([[-29,19],[29,19],[29,26],[-29,26]],'#a79c72');joint(0,22,5,'#9c997b');
        ctx.save();ctx.translate(0,-57);ctx.rotate(Math.sin(t*.8)*.035-lift*.08);
        shape([[-21,-16],[-13,-27],[14,-27],[23,-12],[17,13],[0,21],[-17,12]],skin);
        for(const side of [-1,1]){
            shape([[side*13,-15],[side*34,-32],[side*28,-9],[side*16,6]],'#c7ceba');
            line([[side*16,-9],[side*26,-20]],'#85998b',1);
            line([[side*4,-5],[side*15,-8]],'#344d43',3);
            line([[side*6,5],[side*13,7]],'#748b7e',1);
        }
        line([[0,-8],[-3,3],[2,4]],'#697f72',1);line([[-7,11],[7,11]],'#4d6758',1);
        ctx.restore();ctx.restore();ctx.restore();
    }
    function cosmic(e){
        if(!e || firstEthernatyDefeated)return;
        const p=pose(e),t=p.time,cast=p.wind*.7+p.strike*.35;
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(p.hit*.045);ctx.lineJoin='round';
        // Rainbow astrolabe bands cycling through full spectrum
        for(let ring=0;ring<3;ring++){
            ctx.save();ctx.rotate(t*(ring%2?-.18:.14)+ring*1.02);
            ctx.scale(1,.36+.1*Math.sin(t*.5+ring));
            const ringHue = (t*45 + ring*120) % 360;
            runeRing(72+ring*9,0,24,`hsl(${ringHue},95%,65%)`);ctx.restore();
        }
        // Floating rainbow shards
        for(let i=0;i<6;i++){
            const a=i*TAU/6+t*.22,r=60+cast*9;
            const shardHue = (i*60 + t*50) % 360;
            ctx.save();ctx.translate(Math.cos(a)*r,Math.sin(a)*r*.65);ctx.rotate(a);
            shape([[-12,0],[0,-7],[18,0],[0,7]],metal(0,0,15,`hsl(${shardHue},95%,70%)`,`hsl(${(shardHue+40)%360},90%,45%)`),`hsl(${(shardHue+80)%360},80%,25%)`);
            line([[-4,0],[5,0]],`hsl(${shardHue},100%,88%)`,1.5);ctx.restore();
        }
        ctx.save();ctx.translate(0,Math.sin(t*1.8)*3);
        // Prismatic faceted rainbow core body
        const rainbowGrad = ctx.createLinearGradient(0,-57,0,58);
        rainbowGrad.addColorStop(0,   `hsl(${(t*50)%360},95%,62%)`);
        rainbowGrad.addColorStop(0.2, `hsl(${(t*50+60)%360},95%,62%)`);
        rainbowGrad.addColorStop(0.4, `hsl(${(t*50+120)%360},95%,62%)`);
        rainbowGrad.addColorStop(0.6, `hsl(${(t*50+180)%360},95%,62%)`);
        rainbowGrad.addColorStop(0.8, `hsl(${(t*50+240)%360},95%,62%)`);
        rainbowGrad.addColorStop(1,   `hsl(${(t*50+300)%360},95%,62%)`);
        shape([[0,-57],[26,-24],[33,14],[0,58],[-33,14],[-26,-24]],rainbowGrad,'#ffffff',2);
        shape([[0,-47],[0,36],[-24,11],[-18,-22]],`hsla(${(t*50+40)%360},90%,75%,0.45)`,null);
        shape([[0,-47],[21,-19],[24,11],[0,36]],`hsla(${(t*50+200)%360},90%,30%,0.35)`,null);
        for(let side of [-1,1]){
            const wingHue = (t*50 + (side>0?100:260)) % 360;
            line([[side*20,-18],[side*11,4],[side*21,13]],`hsl(${wingHue},100%,80%)`,2);
            shape([[side*22,-27],[side*41,-43],[side*33,-12]],`hsl(${wingHue},90%,60%)`);
        }
        ctx.save();ctx.rotate(-t*.3);
        const centerHue = (t*70)%360;
        shape([[0,-17],[14,0],[0,17],[-14,0]],`hsl(${centerHue},95%,68%)`,`hsl(${(centerHue+180)%360},100%,85%)`);
        shape([[0,-9],[7,0],[0,9],[-7,0]],'#ffffff',null);ctx.restore();
        runeRing(23,t*.14,12,`hsl(${(t*60+150)%360},95%,75%)`);ctx.restore();
        // Orbiting rainbow light motes
        for(let i=0;i<3;i++){
            const a=t*.4+i*TAU/3;
            const moteHue = (i*120 + t*60) % 360;
            oval(Math.cos(a)*87,Math.sin(a)*39,4,4,`hsl(${moteHue},100%,70%)`,'#ffffff');
        }ctx.restore();
    }
    function wing(t,near,fold){
        ctx.save();ctx.translate(-32,-26);ctx.rotate(-.08+Math.sin(t*2.4+(near?0:.6))*.16+fold*.32);
        if(!near)ctx.scale(-.76,.82);
        const tipX=-125+fold*45,tipY=-137+fold*40;
        ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-35,-82,tipX,tipY);
        ctx.lineTo(-93,-52);ctx.quadraticCurveTo(-56,-77,-62,-9);
        ctx.quadraticCurveTo(-24,-43,0,0);ctx.closePath();
        ctx.fillStyle=metal(-50,-55,100,near?'#ff7700':'#e65100',near?'#bf360c':'#871c00');ctx.fill();ctx.strokeStyle='#3e1500';ctx.lineWidth=2;ctx.stroke();
        line([[0,0],[-43,-74],[tipX,tipY]],'#ffa726',4);
        line([[-43,-74],[-93,-52]],'#ff9800',2);line([[-43,-74],[-62,-9]],'#ff9800',2);
        for(let i=0;i<5;i++){
            const x=-35-i*12,y=-49-i*13;
            line([[x,y],[x-11,y+16]],'rgba(255,167,38,.35)',1);
        }
        shape([[tipX+5,tipY+10],[tipX-8,tipY-8],[tipX+15,tipY+8]],'#ffe082');ctx.restore();
    }
    function dragonModel(d){
        if(!d || dragonDefeated)return;
        const p=pose(d),t=p.time,jaw=Math.max(d.jawOpen||0,p.wind*.3),fold=p.strike*.75;
        ctx.save();ctx.translate(d.x,d.y+Math.sin(d.bob)*6);ctx.rotate(-p.hit*.025);ctx.scale(d.facing||1,1);ctx.lineJoin='round';
        wing(t,false,fold);
        // Flexible tail with vibrant segmented orange movement and amber plates.
        let previous=[-57,24];
        for(let i=0;i<10;i++){
            const next=[-65-i*13,27+Math.sin(t*2-i*.42)*12+i*2];
            line([previous,next],'#3e1400',Math.max(3,24-i*2));line([previous,next],'#e65100',Math.max(1,19-i*1.8));
            if(i%2===0)shape([[next[0]+4,next[1]-5],[next[0]-6,next[1]-19],[next[0]-10,next[1]-4]],'#ffa726');previous=next;
        }
        oval(-25,2,66,43,metal(-30,0,65,'#ff8f00','#b23c00'),'#3e1400');
        for(let row=0;row<5;row++)for(let col=0;col<8;col++){
            const x=-76+col*13+(row%2)*6,y=-25+row*13;
            if(((x+25)/60)**2+(y/40)**2<.92){
                ctx.beginPath();ctx.arc(x,y,6,.1,Math.PI-.1);ctx.strokeStyle=row%2?'#ffb74d':'#e65100';ctx.lineWidth=1;ctx.stroke();
            }
        }
        for(let i=0;i<6;i++)shape([[-66+i*15,-29],[-68+i*15,-48-(i%2)*6],[-53+i*15,-34]],'#ffa000');
        for(const side of [-1,1]){
            const stride=Math.sin(t*2.1+side)*5;
            limb([-38+side*22,25],[-40+side*30,48+stride],[-15+side*31,55+stride],13,'#e65100',true);
            claw(-15+side*31,55+stride,-.1,'#ffcc80');
        }
        wing(t,true,fold);
        // Orange flame dragon neck, eyebrow, nostrils and hinged lower jaw.
        ctx.save();ctx.translate(33,-23);ctx.rotate(-p.wind*.09+p.strike*.04);
        shape([[-18,17],[-13,-25],[12,-40],[37,-33],[62,-15],[69,-4],[20,7],[8,26]],metal(20,-10,55,'#ff9100','#bf360c'));
        for(let i=0;i<4;i++)line([[-11+i*10,-20],[4+i*10,-7]],'#e65100',2);
        shape([[-9,-28],[-18,-62],[9,-38]],'#ffb300');shape([[13,-37],[23,-62],[30,-34]],'#ffa000');
        line([[15,-23],[34,-26],[43,-21]],'#4e1700',5);oval(29,-20,7,4,'#ffe082');line([[30,-23],[30,-17]],'#260a00',2);
        oval(58,-9,3,2,'#260a00');line([[38,-3],[64,-3]],'#4e1700',2);
        ctx.save();ctx.translate(12,5);ctx.rotate(jaw*.42);
        shape([[0,0],[54,-7],[47,8],[9,16]],'#d84315');
        for(let i=0;i<6;i++)shape([[15+i*6,0],[18+i*6,-7],[21+i*6,0]],'#fff3e0',null);
        ctx.restore();
        for(let i=0;i<6;i++)shape([[25+i*6,-4],[28+i*6,3+jaw*3],[31+i*6,-5]],'#fff3e0',null);
        ctx.restore();ctx.restore();
    }
    function worm(w){
        if(!w || solarDevourerDefeated)return;
        const p=pose(w),t=p.time;
        for(const mini of w.miniWorms){
            ctx.save();
            for(let i=mini.tail.length-1;i>=0;i--){
                const point=mini.tail[i],r=Math.max(3,mini.radius*(1-i/Math.max(1,mini.tail.length))*.75);
                oval(point.x,point.y,r,r*.8,'#b71c1c','#3e0505');
                line([[point.x-r*.35,point.y-r*.4],[point.x+r*.35,point.y+r*.4]],'#ff5252',1);
            }
            oval(mini.x,mini.y,mini.radius,mini.radius*.8,'#d32f2f','#490808');
            oval(mini.x+4,mini.y-3,3,3,'#ff8a80');ctx.restore();
        }
        if(w.underground)return;
        ctx.save();ctx.lineJoin='round';
        // Interlocking curved armor follows the simulated spine: fiery scarlet red
        for(let i=w.segCount-1;i>=1;i--){
            const segment=getSolarSegment(w,i),r=w.segRadii[i],flex=Math.sin(t*2-i*.55);
            ctx.save();ctx.translate(segment.x,segment.y);ctx.rotate(segTangentAngle(w,i));
            oval(-r*.4,0,r*.7,r*.76,'#280404','#160000');
            for(const side of [-1,1]){
                shape([[-r*.5,side*r*.45],[-r*.85,side*(r*1.14+flex*3)], [r*.15,side*r*.64]],'#d32f2f','#470606');
                // Small flame vent plates open in a traveling wave during charging.
                const gap=2+p.wind*4+Math.max(0,flex)*2;
                line([[-r*.5,side*r*.45],[r*.1,side*(r*.5+gap)]],'#ff3d00',2);
            }
            shape([[-r*.7,0],[-r*.38,-r*.73],[r*.34,-r*.67],[r*.75,0],[r*.34,r*.67],[-r*.38,r*.73]],metal(0,0,r,'#e53935','#5e0808'));
            line([[-r*.22,-r*.58],[r*.22,0],[-r*.22,r*.58]],'#ff8a80',1.5);
            for(let j=-1;j<=1;j++){
                shape([[j*r*.3-r*.14,-r*.2],[j*r*.3+r*.13,-r*.2],[j*r*.3+r*.19,r*.14],[j*r*.3-r*.09,r*.14]],'#9b111e','#470606',1);
                oval(j*r*.3,0,1.5,1.5,'#ff6e40');
            }
            ctx.restore();
        }
        ctx.save();ctx.translate(w.head.x,w.head.y);ctx.rotate(w.angle+p.hit*.04);
        const open=.12+p.wind*.25+p.strike*.18;
        // Jaw pincers articulate around a recessed fiery red mechanical eye.
        for(const side of [-1,1]){
            ctx.save();ctx.rotate(side*open);
            shape([[-24,side*16],[12,side*43],[68,side*40],[89,side*13],[51,side*24],[12,side*19]],metal(25,0,50,'#f44336','#660808'));
            for(let k=0;k<5;k++)shape([[21+k*10,side*28],[26+k*10,side*17],[30+k*10,side*28]],'#ff8a80','#5e0808',.7);
            ctx.restore();
        }
        shape([[-60,0],[-31,-43],[22,-36],[51,0],[22,36],[-31,43]],metal(-5,0,60,'#e53935','#5e0808'));
        for(const side of [-1,1]){
            shape([[-32,side*30],[-46,side*70],[-6,side*39]],'#d32f2f');
            shape([[-7,side*34],[5,side*60],[23,side*29]],'#b71c1c');
            line([[-35,side*22],[0,side*29],[22,side*14]],'#ff8a80',1.5);
        }
        oval(-6,0,25,27,'#240404','#ff1744');
        ctx.save();ctx.translate(-6,0);runeRing(22,t*.22,16,'#ff3d00');
        shape([[0,-17],[13,0],[0,17],[-13,0]],'#ff1744','#ff8a80');
        oval(0,0,4,8,'#360404');ctx.restore();
        line([[22,-11],[40,-3],[23,12]],'#ff3d00',2);
        ctx.restore();ctx.restore();
    }
    function demon(w){
        if(!w || twoFacedDemonDefeated)return;
        const p=pose(w),t=p.time,attack=p.strike,wind=p.wind;
        ctx.save();ctx.translate(w.x,w.y);ctx.rotate(p.hit*.025);ctx.lineJoin='round';
        const torso=metal(0,-35,95,'#b2937d','#735d58');
        // A staggered stance and weighted shoulder roll, independent of arm gestures.
        for(const side of [-1,1]){
            const step=Math.sin(t*1.8+side)*2;
            limb([side*27,38],[side*36,92+step],[side*42,140],27,'#4e4b50',true);
            shape([[side*36-17,81],[side*36+17,81],[side*42+14,126],[side*42-14,126]],metal(side*36,104,25,'#77737a','#393f48'));
            oval(side*43+3,142,24,9,'#303942','#1f2832');
        }
        ctx.save();ctx.translate(0,p.breathe*1.8);ctx.rotate(Math.sin(t*.9)*.015-attack*.035);
        shape([[-70,-77],[-46,-98],[44,-98],[72,-77],[58,-18],[39,49],[-39,49],[-58,-18]],torso,'#3e3c40',2);
        for(const side of [-1,1]){
            oval(side*32,-55,28,17,'#a18673','#6f5e57',side*.14);
            for(let row=0;row<3;row++)oval(side*14,-24+row*17,12,7,'#927968','#6b5d58');
            line([[side*43,-79],[side*33,-55],[side*47,-35],[side*28,-12]],'#3a3b43',5);
            for(let i=0;i<4;i++)line([[side*(41+i*4),-69+i*5],[side*(48+i*4),-64+i*5]],'#c2a28a',.8);
        }
        // Four arms perform different casts: raised upper arms and opposing lower guards.
        for(const upper of [false,true])for(const side of [-1,1]){
            const rhythm=Math.sin(t*2+(upper?0:1.4)+side)*4;
            const sh=[side*(upper?63:50),upper?-76:-25];
            const el=[side*(upper?104:91), (upper?-42:14)+rhythm-wind*(upper?32:8)];
            const reach=attack*(upper?45:25),hd=[side*((upper?71:32)+reach), (upper?-80:9)-wind*20+attack*(upper?38:-25)];
            limb(sh,el,hd,upper?29:23,upper?'#a58a76':'#8b7568',true);
            for(let j=0;j<3;j++){
                const u=.3+j*.2,x=mix(el[0],hd[0],u),y=mix(el[1],hd[1],u);
                line([[x-7,y-7],[x+7,y+7]],'#3f4149',3);
            }
            claw(...hd,side>0?-.8:Math.PI+.8,'#b1947d');
            oval(sh[0],sh[1],upper?18:12,upper?18:12,'#7b6b61','#3a3e45');
            oval(sh[0],sh[1],upper?10:6,upper?10:6,'#a48975','#575252');
        }
        // Layered belt, engraved buckle and flexible cloth panels.
        shape([[-45,31],[44,31],[55,76+Math.sin(t*2)*3],[15,68],[0,88],[-48,76]],'#53515b');
        for(let i=-2;i<=2;i++)line([[i*16,44],[i*19,70+Math.sin(t*2+i)*3]],'#85808c',1);
        shape([[-47,29],[47,29],[47,42],[-47,42]],'#9b8d73');
        shape([[-10,28],[10,28],[14,37],[0,46],[-14,37]],'#c0aa80');
        // Belly mouth and independently animated face masks.
        oval(0,10,21,8+attack*3,'#36313a','#6a5856');
        for(let i=-3;i<=3;i++)shape([[i*5-2,4],[i*5,10],[i*5+2,4]],'#c2b5a0',null);
        ctx.save();ctx.translate(0,-114);ctx.rotate(Math.sin(t*.8)*.025-wind*.04);
        for(const side of [-1,1]){
            ctx.save();ctx.translate(side*20,0);ctx.rotate(side*(.05+wind*.07));
            shape([[-22,-27],[-11,-39],[14,-36],[24,-16],[17,18],[0,30],[-19,17]],metal(0,0,36,side===1?'#b79d85':'#8b8380','#665959'));
            shape([[-22,-21],[-32,-57],[-5,-32]],'#9c9183');shape([[13,-28],[29,-54],[24,-13]],'#c2b49a');
            line([[-14,-6],[-4,-9]],'#363b43',4);line([[5,-9],[15,-5]],'#363b43',4);
            line([[-12,-6],[-6,-7]],'#be9d82',1);line([[7,-7],[13,-5]],'#be9d82',1);
            line([[0,-7],[-3,3],[2,5]],'#564e50',1.4);
            const mouthOpen=2+(w.attack==='dualRoar'?attack*9:attack*3);
            oval(0,14,12,mouthOpen,'#353039');
            for(let i=-2;i<=2;i++)shape([[i*4-1,12-mouthOpen],[i*4,15],[i*4+2,12-mouthOpen]],'#c2b4a0',null);
            line([[-15,-22],[-8,-15],[-15,0],[-10,8]],'#4c4650',2);ctx.restore();
        }
        for(let i=0;i<9;i++){
            const x=(i-4)*8,sw=Math.sin(t*1.5+i*.5)*2;
            shape([[x-7,-26],[x+sw,-57-Math.sin(i)*8],[x+8,-28]],i%2?'#77727c':'#91848c','#4d4c58',1);
        }
        ctx.restore();ctx.restore();ctx.restore();
    }
    return {guardian,cosmic,dragon:dragonModel,worm,demon};
})();
