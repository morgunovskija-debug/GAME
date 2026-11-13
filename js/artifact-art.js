// ================================================================
//  ARTIFACT ART
//  Every artifact is painted procedurally on a canvas instead of using an emoji.
//  Each painter draws in a 100x100 space centred on (0,0); `t` is time in seconds.
//  - drawArtifactArt(ctx, id, size, t): draws the artifact live (world pickups, menu cards)
//  - artifactTextureURL(id): a cached PNG texture of the artifact (HUD slots)
// ================================================================
const ARTIFACT_ART = (function(){
    const TAU = Math.PI * 2;

    // ---------- small helpers ----------
    function rand(seed){ let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
    function halo(c, r, rgb, a, x = 0, y = 0){
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.45, `rgba(${rgb},${a * .45})`); g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    function twinkle(c, x, y, r, color, a){
        if (!(r > 0) || !(a > 0)) return;
        c.save(); c.globalAlpha = Math.min(1, a); c.fillStyle = color;
        c.beginPath(); c.moveTo(x, y - r);
        c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
        c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
        c.fill(); c.restore();
    }
    // A flame whose round bulb is centred on (x,y), with its tip `h` above it.
    function flamePath(c, x, y, w, h, sway){
        c.beginPath();
        c.moveTo(x + sway, y - h);
        c.bezierCurveTo(x + w * .25 + sway * .4, y - h * .55, x + w * .62, y - h * .25, x + w * .5, y);
        c.arc(x, y, w * .5, 0, Math.PI, false);
        c.bezierCurveTo(x - w * .62, y - h * .25, x - w * .25 + sway * .4, y - h * .55, x + sway, y - h);
        c.closePath();
    }
    // Layered flame: colours go from the outer layer to the hot inner core.
    function flames(c, x, y, w, h, t, cols, seed = 0){
        cols.forEach((col, i) => {
            const k = 1 - i / (cols.length + .6);
            const sway = Math.sin(t * 6 + seed + i) * w * .2 * k;
            const fh = h * k * (.9 + .1 * Math.sin(t * 9 + seed * 2 + i));
            flamePath(c, x, y + i * w * .04, w * k, fh, sway);
            c.fillStyle = col; c.fill();
        });
    }
    // Flame pointing outward along `angle` from (x,y).
    function flameOut(c, x, y, angle, w, h, t, cols, seed){
        c.save(); c.translate(x, y); c.rotate(angle + Math.PI / 2);
        flames(c, 0, 0, w, h, t, cols, seed); c.restore();
    }
    function bolt(c, x1, y1, x2, y2, seed, color, w){
        const r = rand(seed), n = 7, len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        c.beginPath(); c.moveTo(x1, y1);
        for (let i = 1; i < n; i++){
            const f = i / n, off = (r() - .5) * len * .35;
            c.lineTo(x1 + (x2 - x1) * f + nx * off, y1 + (y2 - y1) * f + ny * off);
        }
        c.lineTo(x2, y2);
        c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
        c.shadowColor = color; c.shadowBlur = 8; c.strokeStyle = color; c.lineWidth = w; c.stroke();
        c.shadowBlur = 0; c.strokeStyle = '#ffffff'; c.lineWidth = w * .4; c.stroke(); c.restore();
    }
    // A star whose every point is split into a lit and a shaded half, so it reads as 3D.
    function facetStar(c, n, R, r, rot, light, dark){
        for (let i = 0; i < n; i++){
            const a = rot + i * TAU / n, al = a - Math.PI / n, ar = a + Math.PI / n;
            const tx = Math.cos(a) * R, ty = Math.sin(a) * R;
            c.fillStyle = light; c.beginPath(); c.moveTo(0, 0); c.lineTo(tx, ty); c.lineTo(Math.cos(al) * r, Math.sin(al) * r); c.closePath(); c.fill();
            c.fillStyle = dark;  c.beginPath(); c.moveTo(0, 0); c.lineTo(tx, ty); c.lineTo(Math.cos(ar) * r, Math.sin(ar) * r); c.closePath(); c.fill();
        }
    }
    function sphere(c, x, y, r, stops){
        const g = c.createRadialGradient(x - r * .35, y - r * .38, r * .05, x, y, r);
        stops.forEach(([o, col]) => g.addColorStop(o, col));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    function specular(c, x, y, rx, ry, a){
        const g = c.createRadialGradient(x, y, 0, x, y, rx);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.save(); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, -.6, 0, TAU); c.fill(); c.restore();
    }
    function poly(c, pts){ c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }
    function bez(p0, p1, p2, p3, s){
        const u = 1 - s;
        return [u*u*u*p0[0] + 3*u*u*s*p1[0] + 3*u*s*s*p2[0] + s*s*s*p3[0],
                u*u*u*p0[1] + 3*u*u*s*p1[1] + 3*u*s*s*p2[1] + s*s*s*p3[1]];
    }
    function embers(c, t, n, seed, rgb, area){
        const r = rand(seed);
        for (let i = 0; i < n; i++){
            const x0 = (r() - .5) * area, speed = .25 + r() * .35, ph = r();
            const life = (t * speed + ph) % 1;
            const x = x0 + Math.sin(t * 3 + i) * 3, y = 30 - life * 80;
            c.fillStyle = `rgba(${rgb},${(1 - life) * .9})`;
            c.beginPath(); c.arc(x, y, .8 + (1 - life) * 1.6, 0, TAU); c.fill();
        }
    }
    // A feather along the vertical axis: base at the bottom, tip at the top.
    function feather(c, o){
        const L = o.len, W = o.w, start = .2;
        const pt = s => [o.bend * Math.sin(Math.PI * s), L / 2 - L * s];
        const wp = s => { const u = Math.max(0, Math.min(1, (s - start) / (1 - start))); return W * Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .7) * (1 - .3 * u); };
        const edge = (s, side) => { const [x, y] = pt(s), w = wp(s); return [x + side * w * (side < 0 ? 1 : .9), y - w * .45]; };
        // vane
        c.beginPath(); c.moveTo(...pt(start));
        for (let i = 0; i <= 28; i++) c.lineTo(...edge(start + (1 - start) * i / 28, -1));
        for (let i = 28; i >= 0; i--) c.lineTo(...edge(start + (1 - start) * i / 28, 1));
        c.closePath();
        const g = c.createLinearGradient(0, L / 2, 0, -L / 2);
        o.vane.forEach(([off, col]) => g.addColorStop(off, col));
        c.fillStyle = g; c.fill();
        c.save(); c.clip();
        // barbs
        c.lineWidth = .7; c.strokeStyle = o.barb;
        for (let i = 0; i < 34; i++){
            const s = start + (1 - start) * i / 34;
            for (const side of [-1, 1]){
                const [x, y] = pt(s), [ex, ey] = edge(Math.min(1, s + .06), side);
                c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + ex) / 2, y - 2, ex + side * 3, ey - 1); c.stroke();
            }
        }
        // a few splits in the vane
        c.strokeStyle = o.split; c.lineWidth = 1.3;
        for (const [s, side] of [[.42, -1], [.63, 1], [.78, -1]]){
            const [x, y] = pt(s), [ex, ey] = edge(Math.min(1, s + .07), side);
            c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo((x + ex) / 2, y - 3, ex + side * 4, ey - 2); c.stroke();
        }
        // sheen
        const sh = c.createLinearGradient(-W, 0, W, 0);
        sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.42, 'rgba(255,255,255,.28)'); sh.addColorStop(.55, 'rgba(255,255,255,0)');
        c.fillStyle = sh; c.fillRect(-W - 10, -L, W * 2 + 20, L * 2);
        c.restore();
        // down fluff near the base
        c.strokeStyle = o.fluff; c.lineWidth = .8;
        for (let i = 0; i < 9; i++){
            const s = .1 + i * .012, [x, y] = pt(s), side = i % 2 ? 1 : -1;
            c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + side * 5, y - 2, x + side * 8, y + 3, x + side * 10, y - 1); c.stroke();
        }
        // shaft (thick at the base, thin at the tip)
        for (let i = 0; i < 20; i++){
            const s0 = i / 20, s1 = (i + 1) / 20;
            c.strokeStyle = s0 < start ? o.quill : o.shaft; c.lineWidth = 2.8 * (1 - s0 * .8); c.lineCap = 'round';
            c.beginPath(); c.moveTo(...pt(s0)); c.lineTo(...pt(s1)); c.stroke();
        }
        return pt;
    }

    // ---------- the artifacts ----------
    const ART = {};

    // Fang of the King: a curved, sharp predator fang set in a gold root band.
    ART.mahoraga_fang = (c, t) => {
        halo(c, 50, '255,236,200', .35);
        const O = [[-22, -36], [-30, 4], [-6, 38], [32, 30]];     // outer edge, root → hooked tip
        const I = [[32, 30], [4, 28], [-2, -4], [2, -40]];        // inner edge, tip → root
        const path = () => { c.beginPath(); c.moveTo(...O[0]); c.bezierCurveTo(...O[1], ...O[2], ...O[3]); c.bezierCurveTo(...I[1], ...I[2], ...I[3]); c.quadraticCurveTo(-9, -45, -22, -36); c.closePath(); };
        c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
        path(); const g = c.createLinearGradient(-24, -40, 28, 42);
        g.addColorStop(0, '#cbbd99'); g.addColorStop(.3, '#efe5cc'); g.addColorStop(.7, '#fffaf0'); g.addColorStop(1, '#ffffff');
        c.fillStyle = g; c.fill(); c.restore();
        c.save(); path(); c.clip();
        // inner-curve shadow gives the fang its round, conical body
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(110,85,50,.45)'; c.lineWidth = 12; c.beginPath(); c.moveTo(...I[0]); c.bezierCurveTo(...I[1], ...I[2], ...I[3]); c.stroke();
        c.strokeStyle = 'rgba(110,85,50,.25)'; c.lineWidth = 22; c.stroke();
        // enamel shine along the outer curve
        c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-21, -18); c.bezierCurveTo(-23, 10, -4, 32, 24, 31); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 6; c.stroke();
        // growth ridges across the fang
        c.strokeStyle = 'rgba(140,115,80,.35)'; c.lineWidth = .8;
        for (let i = 1; i < 7; i++){
            const s = i / 8, a = bez(...O, s), b = bez(...I, 1 - s);
            c.beginPath(); c.moveTo(...a); c.quadraticCurveTo((a[0] + b[0]) / 2 + 3, (a[1] + b[1]) / 2 + 4, ...b); c.stroke();
        }
        // a hairline crack
        c.strokeStyle = 'rgba(90,70,45,.55)'; c.lineWidth = .7;
        c.beginPath(); c.moveTo(-10, -20); c.lineTo(-7, -12); c.lineTo(-9, -6); c.lineTo(-4, 2); c.stroke();
        // dark, bloodied root torn from the jaw
        const root = c.createLinearGradient(0, -46, 0, -34);
        root.addColorStop(0, '#3a0a0a'); root.addColorStop(.6, '#7a1e18'); root.addColorStop(1, 'rgba(160,60,40,0)');
        c.fillStyle = root; c.fillRect(-40, -50, 60, 16);
        // thin gold ring of the King
        const gb = c.createLinearGradient(0, -36, 0, -30);
        gb.addColorStop(0, '#fff2b0'); gb.addColorStop(.5, '#d9a63a'); gb.addColorStop(1, '#6a4508');
        c.fillStyle = gb; c.fillRect(-40, -36, 60, 5);
        c.strokeStyle = '#3b2604'; c.lineWidth = .8; c.beginPath(); c.moveTo(-40, -31); c.lineTo(20, -31); c.stroke();
        c.restore();
        sphere(c, -10, -33.5, 2.4, [[0, '#ffd0d0'], [.35, '#ff3344'], [1, '#5a0010']]);
        path(); c.strokeStyle = '#5e4b2c'; c.lineWidth = 1.4; c.stroke();
        twinkle(c, 31, 30, 6 + 2 * Math.sin(t * 4), '#ffffff', .8 + .2 * Math.sin(t * 4));
    };

    // Ethernaty Core: the prismatic faceted crystal from Ethernaty's chest.
    ART.ethernaty_core = (c, t) => {
        const h = (t * 50) % 360;
        halo(c, 50, '210,150,255', .45);
        // rotating rune ring
        c.save(); c.rotate(t * .3);
        for (let i = 0; i < 36; i++){
            const a = i * TAU / 36, r0 = i % 3 ? 39 : 36;
            c.strokeStyle = `hsl(${(h + i * 10) % 360},95%,70%)`; c.lineWidth = i % 3 ? 1.2 : 2;
            c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * 43, Math.sin(a) * 43); c.stroke();
        }
        c.strokeStyle = `hsla(${h},90%,75%,.5)`; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 44.5, 0, TAU); c.stroke();
        c.restore();
        const shard = (i, front) => {
            const a = t * .9 + i * TAU / 6, z = Math.sin(a);
            if ((z >= 0) !== front) return;
            const x = Math.cos(a) * 40, y = z * 13 + 4, s = .75 + z * .25, hh = (h + i * 60) % 360;
            c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
            poly(c, [[-8, 0], [0, -4.5], [11, 0], [0, 4.5]]);
            const g = c.createLinearGradient(-8, 0, 11, 0); g.addColorStop(0, `hsl(${hh},95%,72%)`); g.addColorStop(1, `hsl(${(hh + 40) % 360},90%,45%)`);
            c.fillStyle = g; c.fill(); c.strokeStyle = `hsl(${(hh + 80) % 360},80%,25%)`; c.lineWidth = .8; c.stroke();
            c.restore();
        };
        for (let i = 0; i < 6; i++) shard(i, false);
        // crystal body
        const body = [[0, -40], [19, -17], [24, 10], [0, 40], [-24, 10], [-19, -17]];
        const rg = c.createLinearGradient(0, -40, 0, 40);
        for (let i = 0; i <= 5; i++) rg.addColorStop(i / 5, `hsl(${(h + i * 60) % 360},95%,62%)`);
        c.save(); c.shadowColor = `hsl(${h},100%,70%)`; c.shadowBlur = 10;
        poly(c, body); c.fillStyle = rg; c.fill(); c.restore();
        poly(c, [[0, -33], [0, 26], [-17, 8], [-13, -15]]); c.fillStyle = `hsla(${(h + 40) % 360},90%,80%,.45)`; c.fill();
        poly(c, [[0, -33], [15, -13], [17, 8], [0, 26]]);   c.fillStyle = `hsla(${(h + 200) % 360},90%,28%,.4)`; c.fill();
        // facet lines
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .8;
        for (const [x, y] of body){ c.beginPath(); c.moveTo(x, y); c.lineTo(0, 0); c.stroke(); }
        poly(c, body); c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.stroke();
        // inner rune ring and heart diamond
        c.save(); c.rotate(-t * .8); c.setLineDash([2.5, 2]); c.strokeStyle = `hsl(${(h + 150) % 360},95%,80%)`; c.lineWidth = 1.2;
        c.beginPath(); c.arc(0, 0, 15, 0, TAU); c.stroke(); c.restore();
        poly(c, [[0, -11], [9, 0], [0, 11], [-9, 0]]);
        const cg = c.createRadialGradient(0, 0, 0, 0, 0, 11); cg.addColorStop(0, '#ffffff'); cg.addColorStop(.4, `hsl(${(h + 90) % 360},95%,75%)`); cg.addColorStop(1, `hsl(${(h + 180) % 360},95%,50%)`);
        c.fillStyle = cg; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
        for (let i = 0; i < 6; i++) shard(i, true);
        twinkle(c, -10, -24, 5, '#ffffff', .9);
        twinkle(c, 14, 16, 3.5 + Math.sin(t * 5) * 1.5, '#ffffff', .8);
        // orbiting motes
        for (let i = 0; i < 8; i++){
            const a = -t * .7 + i * TAU / 8;
            c.fillStyle = `hsl(${(h + i * 45) % 360},100%,75%)`;
            c.beginPath(); c.arc(Math.cos(a) * 47, Math.sin(a) * 18, 1.6, 0, TAU); c.fill();
        }
    };

    // Dragon Heart: a molten, scaled heart wreathed in fire.
    ART.dragon_heart = (c, t) => {
        halo(c, 52, '255,90,20', .5);
        const heart = () => { c.beginPath(); c.moveTo(0, -10); c.bezierCurveTo(-8, -26, -38, -24, -36, 0); c.bezierCurveTo(-34, 20, -12, 32, 0, 46); c.bezierCurveTo(12, 32, 34, 20, 36, 0); c.bezierCurveTo(38, -24, 8, -26, 0, -10); c.closePath(); };
        const FIRE = ['rgba(200,30,0,.85)', '#ff5a00', '#ff9a1a', '#ffd54a', '#fff6c8'];
        // big flames rising behind the heart
        flames(c, -18, -8, 26, 44, t, FIRE, 1);
        flames(c, 18, -8, 26, 44, t, FIRE, 3);
        flames(c, 0, -4, 30, 56, t, FIRE, 5);
        // vessels at the top
        for (const [x, w] of [[-9, 7], [6, 6]]){
            const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, '#5a0606'); g.addColorStop(.5, '#c9301a'); g.addColorStop(1, '#3a0303');
            c.fillStyle = g; c.beginPath(); c.ellipse(x, -18, w / 2, 9, x < 0 ? -.25 : .2, 0, TAU); c.fill();
            c.fillStyle = '#ffb43a'; c.beginPath(); c.ellipse(x + (x < 0 ? -2 : 2), -26, w / 2.4, 2, 0, 0, TAU); c.fill();
        }
        // heart body
        heart();
        const g = c.createRadialGradient(-8, 4, 2, 0, 8, 44);
        g.addColorStop(0, '#ffcf5a'); g.addColorStop(.22, '#ff6a1c'); g.addColorStop(.55, '#c0180e'); g.addColorStop(.85, '#5a0606'); g.addColorStop(1, '#2a0202');
        c.fillStyle = g; c.fill();
        c.save(); heart(); c.clip();
        // dragon scales
        c.strokeStyle = 'rgba(40,0,0,.35)'; c.lineWidth = .9;
        for (let row = 0; row < 9; row++) for (let col = -5; col <= 5; col++){
            const x = col * 8 + (row % 2) * 4, y = -14 + row * 7;
            c.beginPath(); c.arc(x, y, 4.5, .15 * Math.PI, .85 * Math.PI); c.stroke();
        }
        // magma veins
        const pulse = .65 + .35 * Math.sin(t * 4);
        const veins = [[[0, -8], [-6, 6], [-16, 12], [-26, 8]], [[-6, 6], [-4, 20], [-10, 30]], [[0, -8], [8, 8], [20, 10], [28, 2]], [[8, 8], [6, 24], [2, 38]], [[20, 10], [22, 22]]];
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (const [w, col] of [[4, 'rgba(30,0,0,.7)'], [2.2, `rgba(255,140,30,${pulse})`], [.9, `rgba(255,240,170,${pulse})`]]){
            c.strokeStyle = col; c.lineWidth = w;
            for (const v of veins){ c.beginPath(); v.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
        }
        // inner furnace glow
        halo(c, 18 + pulse * 4, '255,220,120', .55 * pulse, -2, 8);
        c.restore();
        heart(); c.strokeStyle = '#2a0202'; c.lineWidth = 2; c.stroke();
        specular(c, -18, -6, 9, 5, .55);
        // small flames licking the sides of the heart
        const LICK = ['rgba(255,80,0,.7)', 'rgba(255,190,40,.8)', 'rgba(255,250,200,.9)'];
        flameOut(c, -33, 8, Math.PI * 1.1, 9, 14, t, LICK, 7);
        flameOut(c, 33, 8, -Math.PI * .1, 9, 14, t, LICK, 9);
        flameOut(c, -20, 30, Math.PI * .8, 7, 10, t, LICK, 11);
        flameOut(c, 20, 30, Math.PI * .2, 7, 10, t, LICK, 13);
        embers(c, t, 14, 21, '255,190,80', 70);
    };

    // Solar Core: a blazing, erupting star.
    ART.solar_core = (c, t) => {
        halo(c, 52, '255,170,40', .6);
        // looping prominences
        for (let i = 0; i < 5; i++){
            const a = i * TAU / 5 + .4 + Math.sin(t * .5 + i) * .1, rise = 40 + 6 * Math.sin(t * 2 + i * 1.7);
            const a0 = a - .32, a1 = a + .32;
            c.beginPath(); c.moveTo(Math.cos(a0) * 27, Math.sin(a0) * 27);
            c.bezierCurveTo(Math.cos(a0) * rise, Math.sin(a0) * rise, Math.cos(a1) * rise, Math.sin(a1) * rise, Math.cos(a1) * 27, Math.sin(a1) * 27);
            c.strokeStyle = 'rgba(255,90,10,.75)'; c.lineWidth = 4.5; c.stroke();
            c.strokeStyle = 'rgba(255,220,90,.9)'; c.lineWidth = 1.6; c.stroke();
        }
        // corona of flame tongues
        const CORONA = ['rgba(255,70,0,.75)', 'rgba(255,150,20,.9)', 'rgba(255,230,120,.95)'];
        for (let i = 0; i < 18; i++){
            const a = i * TAU / 18 + t * .15, len = 11 + 6 * Math.sin(t * 5 + i * 2.3);
            flameOut(c, Math.cos(a) * 26, Math.sin(a) * 26, a, 10, len, t, CORONA, i);
        }
        // the sphere
        sphere(c, 0, 0, 30, [[0, '#fffbe0'], [.25, '#ffe066'], [.6, '#ff9a1a'], [.88, '#d9420b'], [1, '#8a1d05']]);
        c.save(); c.beginPath(); c.arc(0, 0, 30, 0, TAU); c.clip();
        // granulation and sunspots
        const r = rand(5);
        for (let i = 0; i < 70; i++){
            const x = (r() - .5) * 60, y = (r() - .5) * 60, rr = 1 + r() * 2.6, bright = r() > .5;
            c.fillStyle = bright ? 'rgba(255,255,200,.22)' : 'rgba(150,40,0,.22)';
            c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
        }
        for (const [x, y, s] of [[10, 8, 3.2], [-12, 14, 2.2]]){
            sphere(c, x, y, s * 1.8, [[0, 'rgba(120,30,0,.5)'], [1, 'rgba(120,30,0,0)']]);
            c.fillStyle = '#3a0d02'; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
        }
        // swirling plasma streaks
        c.strokeStyle = 'rgba(255,250,210,.4)'; c.lineWidth = 1.2;
        for (let i = 0; i < 4; i++){
            const a = t * .4 + i * 1.6;
            c.beginPath(); c.arc(0, 0, 10 + i * 5, a, a + 1.4); c.stroke();
        }
        c.restore();
        // eruption: a jet bursting out of the top-right with molten droplets
        const ea = -Math.PI / 4, ph = (t * .6) % 1;
        flameOut(c, Math.cos(ea) * 27, Math.sin(ea) * 27, ea, 13, 24 + 8 * Math.sin(t * 7), t, ['rgba(255,60,0,.85)', '#ffaa22', '#fff4b0', '#ffffff'], 42);
        for (let i = 0; i < 6; i++){
            const p = (ph + i / 6) % 1, d = 34 + p * 22, spread = (i - 2.5) * .12;
            c.fillStyle = `rgba(255,${200 - p * 120},60,${1 - p})`;
            c.beginPath(); c.arc(Math.cos(ea + spread) * d, Math.sin(ea + spread) * d, 2.2 * (1 - p) + .5, 0, TAU); c.fill();
        }
        specular(c, -11, -12, 9, 5, .45);
    };

    // Cursed Core: a two-toned demonic core crackling with energy.
    ART.demon_core = (c, t) => {
        halo(c, 52, '255,30,80', .45);
        const ring = (rot, front, col) => {
            c.save(); c.rotate(rot);
            c.beginPath(); c.ellipse(0, 0, 44, 12, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
            c.shadowColor = col; c.shadowBlur = 8; c.strokeStyle = col; c.lineWidth = 2; c.stroke();
            c.shadowBlur = 0; c.strokeStyle = 'rgba(255,230,240,.8)'; c.lineWidth = .7; c.stroke();
            // a spark racing along the ring
            const a = t * 2.4 + rot * 3, sx = Math.cos(a) * 44, sy = Math.sin(a) * 12;
            if ((Math.sin(a) >= 0) === front){ c.fillStyle = '#ffffff'; c.beginPath(); c.arc(sx, sy, 2, 0, TAU); c.fill(); }
            c.restore();
        };
        const rings = [[t * .4, '#ff2255'], [t * .4 + TAU / 3, '#b33cff'], [t * .4 + TAU * 2 / 3, '#ff5a2a']];
        rings.forEach(([r, col]) => ring(r, false, col));
        // the core sphere
        sphere(c, 0, 0, 26, [[0, '#ff8a9a'], [.25, '#d0163a'], [.65, '#4a0016'], [1, '#120006']]);
        c.save(); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.clip();
        // the second face: the right half is tinted violet
        c.fillStyle = 'rgba(120,20,200,.35)'; c.fillRect(0, -30, 30, 60);
        c.strokeStyle = 'rgba(255,200,220,.4)'; c.lineWidth = .8; c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(4, -8, -4, 8, 0, 26); c.stroke();
        // hex lattice etched into the shell
        c.strokeStyle = 'rgba(255,120,150,.18)'; c.lineWidth = .6;
        for (let y = -28; y < 30; y += 7) for (let x = -30; x < 30; x += 8){
            const ox = x + ((y / 7) % 2 ? 4 : 0);
            c.beginPath(); for (let k = 0; k < 6; k++){ const a = k * TAU / 6; const px = ox + Math.cos(a) * 4, py = y + Math.sin(a) * 4; k ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke();
        }
        // glowing cracks
        const pulse = .6 + .4 * Math.sin(t * 5);
        c.lineCap = 'round';
        for (const [w, col] of [[2.6, `rgba(255,40,90,${pulse})`], [1, 'rgba(255,220,230,.9)']]){
            c.strokeStyle = col; c.lineWidth = w;
            for (const v of [[[0, 0], [-10, -8], [-14, -20]], [[0, 0], [12, -6], [20, -16]], [[0, 0], [-6, 12], [-16, 18]], [[0, 0], [8, 14], [12, 24]], [[-10, -8], [-22, -4]]]){
                c.beginPath(); v.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
            }
        }
        c.restore();
        // nucleus: a slit eye
        halo(c, 12, '255,60,110', .9 * pulse);
        c.fillStyle = '#ffe0e8'; c.beginPath(); c.ellipse(0, 0, 3.5, 7.5, 0, 0, TAU); c.fill();
        c.fillStyle = '#2a0010'; c.beginPath(); c.ellipse(0, 0, 1.2, 6, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.strokeStyle = '#ff6a8a'; c.lineWidth = 1; c.stroke();
        specular(c, -10, -11, 8, 4.5, .5);
        rings.forEach(([r, col]) => ring(r, true, col));
        // arcs of energy jumping off the core
        const seed = Math.floor(t * 7);
        for (let i = 0; i < 3; i++){
            const a = (seed * 1.7 + i * 2.1) % TAU;
            bolt(c, Math.cos(a) * 25, Math.sin(a) * 25, Math.cos(a + .3) * 44, Math.sin(a + .3) * 44, seed * 3 + i, i % 2 ? '#c05aff' : '#ff3366', 1.4);
        }
    };

    // Eternal Flame: a deep green, glossy flame.
    ART.eternal_flame = (c, t) => {
        halo(c, 52, '40,255,120', .5);
        // glowing base ember bed
        c.fillStyle = 'rgba(20,120,60,.6)'; c.beginPath(); c.ellipse(0, 34, 22, 5, 0, 0, TAU); c.fill();
        const layers = [['#02260f', '#054a1d'], ['#076b2a', '#0c9a3e'], ['#11c457', '#1fe06c'], ['#5cff9a', '#a6ffc6'], ['#e2fff0', '#ffffff']];
        layers.forEach(([dark, light], i) => {
            const k = 1 - i / 5.6, w = 52 * k, h = 78 * k * (.92 + .08 * Math.sin(t * 8 + i));
            const sway = Math.sin(t * 5 + i * .8) * 5 * k, y = 18 + i * 2;
            flamePath(c, 0, y, w, h, sway);
            const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, dark); g.addColorStop(.45, light); g.addColorStop(1, dark);
            c.save(); if (i === 0){ c.shadowColor = '#22ff77'; c.shadowBlur = 14; }
            c.fillStyle = g; c.fill(); c.restore();
        });
        // glossy highlights
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(-14, 22); c.quadraticCurveTo(-18, 2, -6 + Math.sin(t * 5) * 2, -24); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(10, 18); c.quadraticCurveTo(14, 6, 9, -6); c.stroke();
        // sparkles and rising green embers
        embers(c, t, 12, 31, '120,255,170', 60);
        for (let i = 0; i < 4; i++){
            const a = t * 1.2 + i * 1.57, tw = .5 + .5 * Math.sin(t * 6 + i * 2);
            twinkle(c, Math.cos(a) * 30, -6 + Math.sin(a) * 26, 3 + tw * 3, '#d9ffe8', tw);
        }
    };

    // Solar Shield: a gold-rimmed heater shield with a sun crest, wreathed in flame.
    ART.solar_shield = (c, t) => {
        halo(c, 52, '255,160,40', .5);
        const shape = s => { c.beginPath(); c.moveTo(0, -36 * s); c.bezierCurveTo(14 * s, -30 * s, 24 * s, -32 * s, 32 * s, -35 * s); c.lineTo(32 * s, -6 * s); c.bezierCurveTo(32 * s, 18 * s, 16 * s, 32 * s, 0, 44 * s); c.bezierCurveTo(-16 * s, 32 * s, -32 * s, 18 * s, -32 * s, -6 * s); c.lineTo(-32 * s, -35 * s); c.bezierCurveTo(-24 * s, -32 * s, -14 * s, -30 * s, 0, -36 * s); c.closePath(); };
        const FIRE = ['rgba(220,40,0,.8)', 'rgba(255,120,10,.9)', 'rgba(255,210,70,.95)', '#fff3c0'];
        for (const [x, y, a, i] of [[-32, -30, -2.4, 0], [32, -30, -.75, 1], [0, -37, -Math.PI / 2, 2], [-33, -10, Math.PI, 3], [33, -10, 0, 4], [-30, 12, 2.6, 5], [30, 12, .55, 6], [-16, 32, 2.1, 7], [16, 32, 1.05, 8], [0, 43, Math.PI / 2, 9]]){
            flameOut(c, x, y, a, 14, 16 + 6 * Math.sin(t * 6 + i * 1.9), t, FIRE, i * 2);
        }
        // gold rim
        c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 5;
        shape(1); const rim = c.createLinearGradient(-32, -36, 32, 44);
        rim.addColorStop(0, '#fff3b0'); rim.addColorStop(.3, '#e7b53e'); rim.addColorStop(.6, '#9b6a12'); rim.addColorStop(1, '#f5cf62');
        c.fillStyle = rim; c.fill(); c.restore();
        shape(1); c.strokeStyle = '#4a2f04'; c.lineWidth = 1.2; c.stroke();
        // inner field
        shape(.82); const f = c.createRadialGradient(-6, -8, 2, 0, 4, 44);
        f.addColorStop(0, '#ff8a2a'); f.addColorStop(.4, '#c4320e'); f.addColorStop(1, '#4a0a04');
        c.fillStyle = f; c.fill(); c.strokeStyle = '#ffdc7a'; c.lineWidth = 1; c.stroke();
        // sun crest
        c.save(); c.translate(0, 0); c.rotate(t * .25);
        for (let i = 0; i < 16; i++){
            const a = i * TAU / 16, R = i % 2 ? 18 : 25;
            poly(c, [[Math.cos(a - .14) * 10, Math.sin(a - .14) * 10], [Math.cos(a) * R, Math.sin(a) * R], [Math.cos(a + .14) * 10, Math.sin(a + .14) * 10]]);
            c.fillStyle = i % 2 ? '#ffb43a' : '#ffe27a'; c.fill();
        }
        c.restore();
        sphere(c, 0, 0, 11, [[0, '#fffbe0'], [.4, '#ffd24a'], [1, '#c26a06']]);
        c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.strokeStyle = '#6a3a02'; c.lineWidth = 1; c.stroke();
        halo(c, 16, '255,240,170', .5 + .2 * Math.sin(t * 4));
        // rivets around the rim
        for (const [x, y] of [[-28, -30], [28, -30], [-29, -4], [29, -4], [-22, 20], [22, 20], [0, 38]]) sphere(c, x, y, 1.8, [[0, '#ffffff'], [.4, '#f0c85a'], [1, '#6a4506']]);
        // bevel shine
        c.save(); shape(1); c.clip();
        const sh = c.createLinearGradient(-40, -40, 10, 20);
        sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.48, 'rgba(255,255,255,.35)'); sh.addColorStop(.55, 'rgba(255,255,255,0)');
        c.fillStyle = sh; c.fillRect(-40, -40, 80, 90); c.restore();
        embers(c, t, 10, 41, '255,200,90', 80);
    };

    // Starforged Compass: a brass compass with a faceted star in place of the needle.
    ART.starforged_compass = (c, t) => {
        halo(c, 52, '255,230,170', .35);
        // hanging loop
        c.strokeStyle = '#b8892d'; c.lineWidth = 3; c.beginPath(); c.arc(0, -47, 4.5, 0, TAU); c.stroke();
        c.strokeStyle = '#fff0b8'; c.lineWidth = 1; c.beginPath(); c.arc(0, -47, 4.5, Math.PI, Math.PI * 1.6); c.stroke();
        // brass bezel
        sphere(c, 0, 0, 44, [[0, '#fff3c4'], [.55, '#d9a744'], [.85, '#8a5c14'], [1, '#4a2f06']]);
        c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.strokeStyle = '#3a2404'; c.lineWidth = 1.2; c.stroke();
        // degree ticks on the bezel
        for (let i = 0; i < 72; i++){
            const a = i * TAU / 72, r0 = i % 6 ? 39.5 : 37;
            c.strokeStyle = i % 6 ? 'rgba(60,35,5,.7)' : '#3a2404'; c.lineWidth = i % 6 ? .6 : 1.3;
            c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); c.stroke();
        }
        // diamond studs on the diagonals
        for (let i = 0; i < 4; i++){
            const a = Math.PI / 4 + i * Math.PI / 2;
            c.save(); c.translate(Math.cos(a) * 40.5, Math.sin(a) * 40.5); c.rotate(a);
            poly(c, [[-2.4, 0], [0, -2.4], [2.4, 0], [0, 2.4]]); c.fillStyle = '#9fe7ff'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = .5; c.stroke(); c.restore();
        }
        // night-sky face
        const face = c.createRadialGradient(0, 0, 2, 0, 0, 35);
        face.addColorStop(0, '#2a3f8a'); face.addColorStop(.6, '#121c4a'); face.addColorStop(1, '#060a20');
        c.fillStyle = face; c.beginPath(); c.arc(0, 0, 35, 0, TAU); c.fill();
        c.strokeStyle = '#e8c56a'; c.lineWidth = 1.4; c.stroke();
        c.save(); c.beginPath(); c.arc(0, 0, 35, 0, TAU); c.clip();
        const r = rand(17);
        for (let i = 0; i < 40; i++){
            const x = (r() - .5) * 70, y = (r() - .5) * 70, tw = .4 + .6 * Math.abs(Math.sin(t * 2 + i));
            c.fillStyle = `rgba(255,255,255,${tw * .8})`; c.beginPath(); c.arc(x, y, .4 + r() * .7, 0, TAU); c.fill();
        }
        // slowly turning constellation ring
        c.rotate(t * .15); c.strokeStyle = 'rgba(170,200,255,.35)'; c.lineWidth = .6;
        c.setLineDash([1.5, 2.5]); c.beginPath(); c.arc(0, 0, 25, 0, TAU); c.stroke(); c.setLineDash([]);
        for (let i = 0; i < 12; i++){ const a = i * TAU / 12; c.fillStyle = 'rgba(220,235,255,.7)'; c.beginPath(); c.arc(Math.cos(a) * 25, Math.sin(a) * 25, .9, 0, TAU); c.fill(); }
        c.restore();
        // cardinal letters
        c.fillStyle = '#ffe08a'; c.font = 'bold 8px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        [['N', 0, -29], ['E', 29, 0], ['S', 0, 29], ['W', -29, 0]].forEach(([l, x, y]) => c.fillText(l, x, y));
        // the star at the heart of the compass
        halo(c, 24, '255,240,190', .55 + .15 * Math.sin(t * 3));
        c.save(); c.rotate(Math.PI / 4); facetStar(c, 4, 15, 3.5, -Math.PI / 2, '#fdf2c8', '#c79a3c'); c.restore();
        c.save(); c.shadowColor = '#fff2b0'; c.shadowBlur = 8;
        facetStar(c, 4, 24, 4.5, -Math.PI / 2, '#fffbe8', '#e0b04c'); c.restore();
        c.strokeStyle = 'rgba(90,60,10,.6)'; c.lineWidth = .5;
        for (let i = 0; i < 4; i++){ const a = -Math.PI / 2 + i * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); c.stroke(); }
        sphere(c, 0, 0, 3.6, [[0, '#ffffff'], [.5, '#ffe9a0'], [1, '#c78a1c']]);
        twinkle(c, 0, 0, 9 + 3 * Math.sin(t * 4), '#ffffff', .85);
        specular(c, -18, -22, 14, 6, .35);
    };

    // Rift Step: an open, swirling portal.
    ART.rift_step = (c, t) => {
        halo(c, 54, '120,240,255', .5);
        const RX = 29, RY = 41;
        // outer energy cracks
        const seed = Math.floor(t * 6);
        for (let i = 0; i < 4; i++){
            const a = i * TAU / 4 + .5 + (seed % 5) * .2;
            bolt(c, Math.cos(a) * RX, Math.sin(a) * RY, Math.cos(a) * (RX + 16), Math.sin(a) * (RY + 10), seed * 7 + i, i % 2 ? '#b98cff' : '#7ff6ff', 1.1);
        }
        // the interior
        c.save(); c.beginPath(); c.ellipse(0, 0, RX, RY, 0, 0, TAU); c.clip();
        const bg = c.createRadialGradient(0, 0, 0, 0, 0, RY);
        bg.addColorStop(0, '#e9ffff'); bg.addColorStop(.12, '#58d8ff'); bg.addColorStop(.35, '#2a3fa8'); bg.addColorStop(.7, '#120a3a'); bg.addColorStop(1, '#03020f');
        c.fillStyle = bg; c.fillRect(-RX, -RY, RX * 2, RY * 2);
        const r = rand(23);
        for (let i = 0; i < 35; i++){ c.fillStyle = `rgba(255,255,255,${.3 + r() * .6})`; c.beginPath(); c.arc((r() - .5) * 58, (r() - .5) * 82, .3 + r() * .8, 0, TAU); c.fill(); }
        c.save(); c.scale(RX / RY, 1); c.lineCap = 'round';
        for (let arm = 0; arm < 6; arm++){
            c.beginPath();
            for (let k = 0; k <= 40; k++){
                const rr = 2 + k * 1.02, a = arm * TAU / 6 + t * 1.6 + rr * .1;
                k ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            c.strokeStyle = `hsla(${185 + arm * 22},100%,72%,.55)`; c.lineWidth = 3; c.stroke();
            c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = .8; c.stroke();
        }
        c.restore();
        halo(c, 12, '255,255,255', .9);
        c.restore();
        // jagged glowing rim
        const rimPath = (amp, ph) => {
            c.beginPath();
            for (let k = 0; k <= 72; k++){
                const a = k / 72 * TAU, n = 1 + amp * (Math.sin(a * 7 + t * 5 + ph) * .6 + Math.sin(a * 13 - t * 7 + ph) * .4);
                const x = Math.cos(a) * RX * n, y = Math.sin(a) * RY * n;
                k ? c.lineTo(x, y) : c.moveTo(x, y);
            }
            c.closePath();
        };
        c.save(); rimPath(.06, 0); c.strokeStyle = 'rgba(170,110,255,.55)'; c.lineWidth = 6; c.stroke();
        c.shadowColor = '#7ff6ff'; c.shadowBlur = 10; rimPath(.04, 1); c.strokeStyle = '#7ff6ff'; c.lineWidth = 2.4; c.stroke();
        c.shadowBlur = 0; rimPath(.03, 2); c.strokeStyle = '#ffffff'; c.lineWidth = .8; c.stroke(); c.restore();
        // particles being pulled into the rift
        for (let i = 0; i < 16; i++){
            const p = (t * .45 + i / 16) % 1, a = i * 2.4 + p * 2.2, k = 1.55 - p * .6;
            c.fillStyle = `rgba(${i % 2 ? '190,150,255' : '150,250,255'},${p})`;
            c.beginPath(); c.arc(Math.cos(a) * RX * k, Math.sin(a) * RY * k, .8 + p * 1.6, 0, TAU); c.fill();
        }
    };

    // Ascendant Halo: a radiant, flashing golden halo.
    ART.ascendant_halo = (c, t) => {
        halo(c, 54, '255,240,170', .55);
        // turning god-rays
        c.save(); c.rotate(t * .2);
        for (let i = 0; i < 14; i++){
            const a = i * TAU / 14, w = .09;
            const g = c.createLinearGradient(0, 0, Math.cos(a) * 50, Math.sin(a) * 50);
            g.addColorStop(0, 'rgba(255,245,200,.5)'); g.addColorStop(1, 'rgba(255,245,200,0)');
            c.fillStyle = g; poly(c, [[0, 0], [Math.cos(a - w) * 52, Math.sin(a - w) * 52], [Math.cos(a + w) * 52, Math.sin(a + w) * 52]]); c.fill();
        }
        c.restore();
        // a soft beam of light falling from the halo
        const beam = c.createLinearGradient(0, 0, 0, 46);
        beam.addColorStop(0, 'rgba(255,248,210,.45)'); beam.addColorStop(1, 'rgba(255,248,210,0)');
        c.fillStyle = beam; poly(c, [[-26, 2], [26, 2], [34, 48], [-34, 48]]); c.fill();
        // the ring: back half, then front half drawn brighter
        const ringHalf = front => {
            c.save(); c.translate(0, -6); c.rotate(-.12);
            const g = c.createLinearGradient(-38, 0, 38, 0);
            g.addColorStop(0, '#b8862a'); g.addColorStop(.3, '#ffe27a'); g.addColorStop(.5, '#fffbe6'); g.addColorStop(.7, '#ffd65a'); g.addColorStop(1, '#a8761c');
            c.beginPath(); c.ellipse(0, 0, 36, 13, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
            c.shadowColor = '#ffe9a0'; c.shadowBlur = front ? 14 : 6;
            c.strokeStyle = front ? g : 'rgba(200,150,50,.85)'; c.lineWidth = 8; c.stroke();
            c.shadowBlur = 0; c.strokeStyle = front ? 'rgba(255,255,255,.9)' : 'rgba(255,230,160,.6)'; c.lineWidth = 2; c.stroke();
            c.restore();
        };
        ringHalf(false);
        // inner glow
        c.save(); c.translate(0, -6); c.scale(1, .36); halo(c, 32, '255,250,220', .45); c.restore();
        ringHalf(true);
        // glints running around the ring
        for (let i = 0; i < 6; i++){
            const a = t * 1.3 + i * TAU / 6, tw = .5 + .5 * Math.sin(t * 7 + i * 1.3);
            const x = Math.cos(a) * 36, y = Math.sin(a) * 13;
            const rx = x * Math.cos(-.12) - y * Math.sin(-.12), ry = x * Math.sin(-.12) + y * Math.cos(-.12) - 6;
            twinkle(c, rx, ry, 3 + tw * 4, '#ffffff', tw);
        }
        // a big lens-flare flash that pulses
        const fl = Math.max(0, Math.sin(t * 2.2)), fx = 26, fy = -14;
        twinkle(c, fx, fy, 6 + fl * 12, '#ffffff', .4 + fl * .6);
        halo(c, 8 + fl * 6, '255,255,240', .7 * fl + .2, fx, fy);
        for (let i = 0; i < 6; i++){ const a = t * .8 + i * 1.05; twinkle(c, Math.cos(a) * 46, Math.sin(a) * 40, 2 + (i % 3), '#fff4c8', .5 + .5 * Math.sin(t * 5 + i)); }
    };

    // Moon Tear: a glittering, faceted crystal tear holding a crescent moon.
    ART.moon_tear = (c, t) => {
        halo(c, 52, '160,225,255', .5);
        const tear = () => { c.beginPath(); c.moveTo(0, -44); c.bezierCurveTo(6, -28, 28, -6, 28, 14); c.bezierCurveTo(28, 32, 14, 42, 0, 42); c.bezierCurveTo(-14, 42, -28, 32, -28, 14); c.bezierCurveTo(-28, -6, -6, -28, 0, -44); c.closePath(); };
        c.save(); c.shadowColor = '#9fe3ff'; c.shadowBlur = 12;
        tear(); const g = c.createRadialGradient(-8, 6, 2, 0, 12, 40);
        g.addColorStop(0, '#f4fdff'); g.addColorStop(.3, '#a6e6ff'); g.addColorStop(.7, '#3f86cc'); g.addColorStop(1, '#16306e');
        c.fillStyle = g; c.fill(); c.restore();
        c.save(); tear(); c.clip();
        // facets
        const top = [0, -44], pts = [[-20, 4], [-8, 10], [8, 6], [22, 12], [0, 26], [-18, 28], [16, 30]];
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = .8;
        for (const p of pts.slice(0, 4)){ c.beginPath(); c.moveTo(...top); c.lineTo(...p); c.stroke(); }
        poly(c, [[-20, 4], [-8, 10], [0, 26], [-18, 28]]); c.stroke();
        poly(c, [[8, 6], [22, 12], [16, 30], [0, 26]]); c.stroke();
        poly(c, [[-8, 10], [8, 6], [0, 26]]); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(); c.stroke();
        poly(c, [[0, -44], [8, 6], [22, 12]]); c.fillStyle = 'rgba(10,30,90,.22)'; c.fill();
        // the crescent moon inside
        c.save(); c.translate(1, 14);
        c.shadowColor = '#ffffff'; c.shadowBlur = 8;
        c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.arc(5, -3, 10, 0, TAU, true);
        const mg = c.createLinearGradient(-12, -12, 8, 12); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#c9ecff');
        c.fillStyle = mg; c.fill('evenodd'); c.restore();
        // tiny stars trapped inside
        const r = rand(11);
        for (let i = 0; i < 12; i++){
            const tw = .4 + .6 * Math.abs(Math.sin(t * 2.5 + i * 1.3));
            c.fillStyle = `rgba(255,255,255,${tw})`; c.beginPath(); c.arc((r() - .5) * 40, -10 + r() * 46, .5 + r() * .7, 0, TAU); c.fill();
        }
        c.restore();
        tear(); c.strokeStyle = 'rgba(230,248,255,.9)'; c.lineWidth = 1.2; c.stroke();
        // gloss
        c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(-6, -30); c.quadraticCurveTo(-20, -8, -21, 12); c.stroke();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-16, 24, 1.8, 0, TAU); c.fill();
        // sparkles
        twinkle(c, 18, -20, 5 + 2 * Math.sin(t * 4), '#ffffff', .9);
        twinkle(c, -26, -14, 3 + 2 * Math.sin(t * 5 + 2), '#dff6ff', .8);
        twinkle(c, 24, 34, 3 + 2 * Math.sin(t * 3 + 1), '#ffffff', .7);
    };

    // Frost Crown: a crown carved from crystal ice.
    ART.frost_crown = (c, t) => {
        halo(c, 52, '190,240,255', .5);
        const ICE = (x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#f2fdff'); g.addColorStop(.4, '#a9e7ff'); g.addColorStop(.8, '#4aa7d8'); g.addColorStop(1, '#1d5f92'); return g; };
        const spike = (x, h, w) => {
            const base = 8, tip = [x, base - h], mid = base - h * .55;
            poly(c, [[x - w / 2, base], [x - w * .32, mid], tip, [x + w * .32, mid], [x + w / 2, base]]);
            c.fillStyle = ICE(x, base - h, x, base); c.fill();
            poly(c, [[x - w / 2, base], [x - w * .32, mid], tip, [x, base]]); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
            poly(c, [[x + w / 2, base], [x + w * .32, mid], tip, [x, base]]); c.fillStyle = 'rgba(20,70,130,.25)'; c.fill();
            poly(c, [[x - w / 2, base], [x - w * .32, mid], tip, [x + w * .32, mid], [x + w / 2, base]]);
            c.strokeStyle = 'rgba(235,252,255,.9)'; c.lineWidth = .8; c.stroke();
        };
        c.save(); c.shadowColor = '#bfefff'; c.shadowBlur = 8;
        // small shards behind, tall spikes in front
        for (const [x, h, w] of [[-24, 22, 8], [-9, 30, 8], [9, 30, 8], [24, 22, 8]]) spike(x, h, w);
        c.restore();
        for (const [x, h, w] of [[-33, 24, 11], [-17, 36, 13], [0, 50, 15], [17, 36, 13], [33, 24, 11]]) spike(x, h, w);
        // band
        c.beginPath(); c.moveTo(-38, 6); c.quadraticCurveTo(0, 12, 38, 6); c.lineTo(38, 22); c.quadraticCurveTo(0, 30, -38, 22); c.closePath();
        c.fillStyle = ICE(0, 4, 0, 28); c.fill(); c.strokeStyle = '#eafaff'; c.lineWidth = 1; c.stroke();
        // frosted texture on the band
        c.save(); c.clip();
        const r = rand(9);
        for (let i = 0; i < 30; i++){ c.fillStyle = `rgba(255,255,255,${.15 + r() * .3})`; c.beginPath(); c.arc((r() - .5) * 76, 6 + r() * 22, .4 + r() * 1.2, 0, TAU); c.fill(); }
        c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = .7; c.beginPath(); c.moveTo(-38, 10); c.quadraticCurveTo(0, 16, 38, 10); c.stroke();
        c.restore();
        // gems set in the band
        for (const [x, s] of [[-22, 3.2], [0, 5], [22, 3.2]]){
            c.save(); c.translate(x, 16 + (x ? 0 : 1));
            poly(c, [[0, -s], [s * .8, 0], [0, s], [-s * .8, 0]]);
            const g = c.createLinearGradient(-s, -s, s, s); g.addColorStop(0, '#ffffff'); g.addColorStop(.4, '#5fd0ff'); g.addColorStop(1, '#0b3f8a');
            c.fillStyle = g; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = .6; c.stroke(); c.restore();
        }
        // icicles hanging from the band
        for (const [x, l] of [[-30, 7], [-20, 11], [-10, 6], [-2, 13], [8, 8], [18, 12], [28, 6]]){
            const y = 23 + Math.abs(x) * .05 + (Math.abs(x) < 20 ? 3 : 1);
            poly(c, [[x - 2.4, y - 1], [x + 2.4, y - 1], [x, y + l]]); c.fillStyle = ICE(x, y, x, y + l); c.fill();
            c.fillStyle = 'rgba(255,255,255,.7)'; poly(c, [[x - 1.6, y - 1], [x - .4, y - 1], [x - .3, y + l * .7]]); c.fill();
        }
        // glints and drifting snowflakes
        twinkle(c, 0, -42, 6 + 2 * Math.sin(t * 4), '#ffffff', .9);
        twinkle(c, -17, -28, 3 + 2 * Math.sin(t * 5 + 1), '#ffffff', .8);
        twinkle(c, 17, -28, 3 + 2 * Math.sin(t * 5 + 3), '#ffffff', .8);
        for (let i = 0; i < 6; i++){
            const p = (t * .15 + i / 6) % 1, x = -40 + i * 16 + Math.sin(t + i) * 4, y = -46 + p * 92, s = 2.2;
            c.save(); c.translate(x, y); c.rotate(t + i); c.strokeStyle = `rgba(235,250,255,${Math.sin(p * Math.PI) * .8})`; c.lineWidth = .6;
            for (let k = 0; k < 3; k++){ c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.stroke(); }
            c.restore();
        }
    };

    // Stopped Hourglass: sand frozen mid-fall, grains hanging in the air.
    ART.stopped_hourglass = (c, t) => {
        halo(c, 52, '242,196,107', .4);
        // faint frozen clock behind it
        c.strokeStyle = 'rgba(160,220,255,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.stroke();
        for (let i = 0; i < 12; i++){ const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); c.lineTo(Math.cos(a) * 44, Math.sin(a) * 44); c.stroke(); }
        const glass = () => { c.beginPath(); c.moveTo(-17, -36); c.bezierCurveTo(-19, -14, -4, -6, -2.5, 0); c.bezierCurveTo(-4, 6, -19, 14, -17, 36); c.lineTo(17, 36); c.bezierCurveTo(19, 14, 4, 6, 2.5, 0); c.bezierCurveTo(4, -6, 19, -14, 17, -36); c.closePath(); };
        // back posts
        const post = x => {
            const g = c.createLinearGradient(x - 2.5, 0, x + 2.5, 0); g.addColorStop(0, '#6a4310'); g.addColorStop(.5, '#f2cc6a'); g.addColorStop(1, '#5a3608');
            c.fillStyle = g; c.fillRect(x - 2.2, -38, 4.4, 76);
            for (const y of [-20, 0, 20]){ c.beginPath(); c.ellipse(x, y, 3.4, 2, 0, 0, TAU); c.fill(); }
        };
        post(0);
        // glass and sand
        glass(); c.fillStyle = 'rgba(200,235,255,.14)'; c.fill();
        c.save(); glass(); c.clip();
        const sand = c.createLinearGradient(0, -20, 0, 36); sand.addColorStop(0, '#ffe7a6'); sand.addColorStop(.5, '#e9b453'); sand.addColorStop(1, '#a8701e');
        c.fillStyle = sand;
        c.beginPath(); c.moveTo(-20, -18); c.quadraticCurveTo(0, -11, 20, -18); c.lineTo(20, 0); c.lineTo(-20, 0); c.closePath(); c.fill();   // top: sand with a dished surface
        c.beginPath(); c.moveTo(-20, 37); c.lineTo(-18, 30); c.quadraticCurveTo(-6, 20, 0, 17); c.quadraticCurveTo(6, 20, 18, 30); c.lineTo(20, 37); c.closePath(); c.fill(); // bottom mound
        c.restore();
        // the frozen stream: grains hanging motionless between the bulbs
        const r = rand(13);
        for (let i = 0; i < 9; i++){
            const y = 1 + i * 1.8, x = (r() - .5) * 1.4;
            c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(x, y, .9, 0, TAU); c.fill();
        }
        for (let i = 0; i < 22; i++){
            const inTop = i < 7;
            const x = (r() - .5) * (inTop ? 22 : 26), y = inTop ? -30 + r() * 10 : 4 + r() * 12;
            const bob = Math.sin(t * 1.2 + i) * .5;
            c.fillStyle = `rgba(255,${210 + r() * 40},${120 + r() * 60},.95)`; c.beginPath(); c.arc(x, y + bob, .6 + r() * .9, 0, TAU); c.fill();
            if (i % 5 === 0) twinkle(c, x, y + bob, 2.5, '#d8f4ff', .4 + .4 * Math.sin(t * 3 + i));
        }
        // a cold, time-stopped sheen over the glass
        glass(); c.fillStyle = 'rgba(150,215,255,.08)'; c.fill();
        c.strokeStyle = 'rgba(220,245,255,.85)'; c.lineWidth = 1; c.stroke();
        c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.8;
        c.beginPath(); c.moveTo(-13, -32); c.bezierCurveTo(-14, -18, -7, -10, -5, -5); c.stroke();
        c.beginPath(); c.moveTo(-5, 6); c.bezierCurveTo(-8, 12, -14, 18, -13, 30); c.stroke();
        // front posts and the end plates
        post(-22); post(22);
        for (const y of [-42, 36]){
            const g = c.createLinearGradient(0, y, 0, y + 7); g.addColorStop(0, '#fff0b0'); g.addColorStop(.4, '#d9a440'); g.addColorStop(1, '#5c3a08');
            c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(-27, y, 54, 7, 2.5) : c.rect(-27, y, 54, 7); c.fill();
            c.strokeStyle = '#3a2404'; c.lineWidth = .8; c.stroke();
            for (const x of [-20, 0, 20]) sphere(c, x, y + 3.5, 1.4, [[0, '#ffffff'], [1, '#a6741c']]);
        }
    };

    // Null Core: a glass sphere glowing green inside, with "001" burning in its heart.
    ART.null_core = (c, t) => {
        halo(c, 52, '60,255,120', .45);
        // floating bits
        c.font = 'bold 6px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < 10; i++){
            const a = t * .5 + i * TAU / 10, rr = 42 + Math.sin(t * 2 + i) * 3;
            c.fillStyle = `rgba(${i % 3 ? '120,255,160' : '200,120,255'},${.45 + .35 * Math.sin(t * 3 + i)})`;
            c.fillText((i * 7 + Math.floor(t * 2)) % 2 ? '1' : '0', Math.cos(a) * rr, Math.sin(a) * rr);
        }
        const R = 34;
        // dark glass shell
        sphere(c, 0, 0, R, [[0, '#1d4a2a'], [.5, '#06200f'], [.9, '#020a05'], [1, '#000000']]);
        c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
        // the green glow inside
        const ig = c.createRadialGradient(0, 2, 0, 0, 2, R);
        ig.addColorStop(0, 'rgba(200,255,200,.95)'); ig.addColorStop(.22, 'rgba(60,255,110,.85)'); ig.addColorStop(.6, 'rgba(10,140,50,.45)'); ig.addColorStop(1, 'rgba(0,40,15,0)');
        c.fillStyle = ig; c.fillRect(-R, -R, R * 2, R * 2);
        // a wireframe globe gives it depth
        c.strokeStyle = 'rgba(120,255,160,.3)'; c.lineWidth = .6;
        for (let k = -3; k <= 3; k++){ const y = k * R / 4, rx = Math.sqrt(Math.max(0, R * R - y * y)); c.beginPath(); c.ellipse(0, y, rx, rx * .22, 0, 0, TAU); c.stroke(); }
        for (let k = 0; k < 6; k++){ const ph = t * .5 + k * Math.PI / 6, rx = Math.abs(Math.cos(ph)) * R; c.beginPath(); c.ellipse(0, 0, rx, R, 0, 0, TAU); c.stroke(); }
        // scanlines
        c.fillStyle = 'rgba(0,0,0,.18)';
        for (let y = -R; y < R; y += 3) c.fillRect(-R, y, R * 2, 1.2);
        // glitch slices
        const g = Math.floor(t * 9), r = rand(g + 1);
        for (let i = 0; i < 3; i++){ const y = (r() - .5) * 50, h = 1 + r() * 3, dx = (r() - .5) * 10; c.fillStyle = `rgba(${i % 2 ? '120,255,150' : '200,90,255'},.35)`; c.fillRect(-R + dx, y, R * 2, h); }
        c.restore();
        // "001"
        c.font = 'bold 19px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const jit = Math.sin(t * 23) > .7 ? 1.6 : 0;
        c.fillStyle = 'rgba(255,60,220,.55)'; c.fillText('001', -1.4 - jit, 1);
        c.fillStyle = 'rgba(60,240,255,.55)'; c.fillText('001', 1.4 + jit, -1);
        c.save(); c.shadowColor = '#3cff6a'; c.shadowBlur = 10; c.fillStyle = '#d8ffd8'; c.fillText('001', 0, 0); c.restore();
        // glass highlights and rim
        specular(c, -13, -16, 13, 7, .55);
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-15, -19, 4, 2, -.6, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(120,255,170,.6)'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, R - .5, .1 * Math.PI, .7 * Math.PI); c.stroke();
        c.strokeStyle = 'rgba(180,255,200,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
    };

    // Eclipse Sigil: a realistic total solar eclipse.
    ART.eclipse_sigil = (c, t) => {
        const R = 23;
        // faint sigil ring
        c.save(); c.rotate(t * .1);
        c.strokeStyle = 'rgba(255,210,140,.35)'; c.lineWidth = .7; c.beginPath(); c.arc(0, 0, 47, 0, TAU); c.stroke();
        for (let i = 0; i < 24; i++){ const a = i * TAU / 24; c.beginPath(); c.moveTo(Math.cos(a) * 45, Math.sin(a) * 45); c.lineTo(Math.cos(a) * (i % 2 ? 47 : 49), Math.sin(a) * (i % 2 ? 47 : 49)); c.stroke(); }
        c.restore();
        // outer corona
        const cg = c.createRadialGradient(0, 0, R, 0, 0, 50);
        cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(.12, 'rgba(255,248,225,.7)'); cg.addColorStop(.35, 'rgba(255,215,150,.3)'); cg.addColorStop(1, 'rgba(255,180,90,0)');
        c.fillStyle = cg; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.fill();
        // coronal streamers
        const r = rand(7); c.lineCap = 'round';
        for (let i = 0; i < 70; i++){
            const a = r() * TAU, len = 6 + Math.pow(r(), 2) * 24 * (Math.abs(Math.cos(a)) * .8 + .4), shimmer = .85 + .15 * Math.sin(t * 2 + i);
            const x0 = Math.cos(a) * R, y0 = Math.sin(a) * R, x1 = Math.cos(a + .05) * (R + len * shimmer), y1 = Math.sin(a + .05) * (R + len * shimmer);
            const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,240,210,0)');
            c.strokeStyle = g; c.lineWidth = .6 + r() * 1.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        }
        // chromosphere with tiny pink prominences
        c.strokeStyle = 'rgba(255,90,120,.85)'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 0, R + .6, 0, TAU); c.stroke();
        for (const a of [2.2, 3.4, 4.6]){
            flameOut(c, Math.cos(a) * R, Math.sin(a) * R, a, 3, 4 + Math.sin(t * 3 + a) * 1.2, t, ['rgba(255,80,120,.85)', 'rgba(255,170,190,.9)'], a * 10);
        }
        // the moon's disc with faint earthshine
        sphere(c, 0, 0, R, [[0, '#15161c'], [.7, '#07080c'], [1, '#020203']]);
        // diamond-ring flash
        const da = -.8, dx = Math.cos(da) * R, dy = Math.sin(da) * R, fl = .75 + .25 * Math.sin(t * 3);
        halo(c, 14 * fl, '255,255,255', 1, dx, dy);
        c.save(); c.translate(dx, dy); c.globalAlpha = fl;
        for (const [rot, len] of [[0, 30], [Math.PI / 2, 22], [Math.PI / 4, 10], [-Math.PI / 4, 10]]){
            c.save(); c.rotate(rot); const g = c.createLinearGradient(-len, 0, len, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = g; c.fillRect(-len, -.7, len * 2, 1.4); c.restore();
        }
        c.restore();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(dx, dy, 2.6, 0, TAU); c.fill();
    };

    // Storm Feather: a feather crackling with lightning.
    ART.storm_feather = (c, t) => {
        halo(c, 52, '120,190,255', .45);
        c.save(); c.rotate(.45);
        feather(c, { len: 92, w: 16, bend: 5,
            vane: [[0, '#1b2f6a'], [.4, '#3f7fe0'], [.75, '#9fd2ff'], [1, '#f2fbff']],
            barb: 'rgba(230,245,255,.45)', split: 'rgba(10,25,60,.7)', fluff: 'rgba(200,225,255,.7)', shaft: '#eaf6ff', quill: '#c9d9ee' });
        // electricity running along the shaft
        c.strokeStyle = `rgba(160,240,255,${.5 + .5 * Math.sin(t * 20)})`; c.lineWidth = 1; c.shadowColor = '#9fe8ff'; c.shadowBlur = 6;
        c.beginPath(); c.moveTo(0, 30); for (let y = 30; y > -44; y -= 6) c.lineTo(Math.sin(y * 1.7 + t * 30) * 1.6 + 5 * Math.sin(Math.PI * (46 - y) / 92), y); c.stroke();
        c.restore();
        // lightning bolts around the feather
        const seed = Math.floor(t * 8);
        bolt(c, -40, -36, -18, -6, seed, '#9fe8ff', 1.6);
        bolt(c, 38, -20, 22, 8, seed + 50, '#c8b0ff', 1.3);
        bolt(c, -30, 38, -8, 26, seed + 99, '#9fe8ff', 1.1);
        // electric particles
        const r = rand(seed + 5);
        for (let i = 0; i < 14; i++){
            const a = r() * TAU, d = 24 + r() * 22;
            c.fillStyle = r() > .5 ? '#e8fbff' : '#8fdcff';
            c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, .6 + r() * 1.3, 0, TAU); c.fill();
        }
        twinkle(c, 22, -38, 5 + 2 * Math.sin(t * 6), '#ffffff', .9);
    };

    // Architect's Quill: an enchanted quill with a gold nib and glowing ink.
    ART.architect_quill = (c, t) => {
        halo(c, 52, '170,130,255', .45);
        // a faint drafting circle behind
        c.save(); c.rotate(-t * .2); c.strokeStyle = 'rgba(200,170,255,.35)'; c.lineWidth = .7;
        c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 39, 0, TAU); c.stroke();
        c.font = '6px Georgia, serif'; c.fillStyle = 'rgba(220,200,255,.55)'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
        for (let i = 0; i < 12; i++){ const a = i * TAU / 12; c.save(); c.rotate(a); c.fillText(runes[i], 0, -41.5); c.restore(); }
        c.restore();
        c.save(); c.rotate(-.55); c.translate(0, -6);
        const pt = feather(c, { len: 78, w: 15, bend: -4,
            vane: [[0, '#2a1060'], [.35, '#5a2fc0'], [.7, '#9a6cff'], [1, '#efe2ff']],
            barb: 'rgba(240,225,255,.4)', split: 'rgba(20,5,50,.7)', fluff: 'rgba(220,200,255,.6)', shaft: '#ffe9a6', quill: '#f5d77a' });
        // gold vein on the vane
        c.strokeStyle = 'rgba(255,215,110,.7)'; c.lineWidth = .7;
        for (let i = 0; i < 4; i++){ const [x, y] = pt(.35 + i * .14); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - 6, y - 3, x - 9, y - 9); c.stroke(); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 3, x + 8, y - 9); c.stroke(); }
        // gold nib
        const [bx, by] = pt(0);
        c.save(); c.translate(bx, by);
        poly(c, [[-3.4, -2], [3.4, -2], [3.2, 6], [0, 16], [-3.2, 6]]);
        const ng = c.createLinearGradient(-4, 0, 4, 0); ng.addColorStop(0, '#8a5a0c'); ng.addColorStop(.45, '#fff0b0'); ng.addColorStop(1, '#a8701a');
        c.fillStyle = ng; c.fill(); c.strokeStyle = '#4a2f04'; c.lineWidth = .6; c.stroke();
        c.strokeStyle = '#3a2404'; c.lineWidth = .6; c.beginPath(); c.moveTo(0, 5); c.lineTo(0, 15); c.stroke();
        c.fillStyle = '#3a2404'; c.beginPath(); c.arc(0, 4.5, 1, 0, TAU); c.fill();
        c.fillStyle = '#e7b53e'; c.fillRect(-3.8, -4, 7.6, 2.4);
        // glowing ink drop at the tip
        const drip = (t * .7) % 1;
        halo(c, 7, '190,140,255', .9, 0, 17);
        c.fillStyle = '#e6d6ff'; c.beginPath(); c.arc(0, 16.5, 1.6, 0, TAU); c.fill();
        c.fillStyle = `rgba(200,160,255,${1 - drip})`; c.beginPath(); c.arc(0, 18 + drip * 12, 1.6 * (1 - drip * .5), 0, TAU); c.fill();
        c.restore();
        c.restore();
        // a swirl of magic ink spiralling around the quill
        c.lineCap = 'round';
        for (let k = 0; k < 40; k++){
            const s = k / 40, a = t * 2 + s * TAU * 1.4, rr = 12 + s * 26;
            c.fillStyle = `hsla(${265 + s * 40},100%,${70 + s * 15}%,${(1 - s) * .9})`;
            c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr * .8, 1.6 * (1 - s) + .4, 0, TAU); c.fill();
        }
        for (let i = 0; i < 5; i++){ const a = t * .9 + i * 1.26; twinkle(c, Math.cos(a) * 34, Math.sin(a) * 30, 2.5 + 1.5 * Math.sin(t * 4 + i), '#f2e6ff', .7 + .3 * Math.sin(t * 5 + i)); }
    };

    // Adaptation Wheel: the King's eight-spoked golden wheel.
    ART.adaptation_wheel = (c, t) => {
        halo(c, 52, '231,212,145', .45);
        c.save(); c.rotate(t * .35);
        const GOLD = (r0, r1) => { const g = c.createRadialGradient(-8, -8, r0, 0, 0, r1); g.addColorStop(0, '#fff6c8'); g.addColorStop(.5, '#e2b64a'); g.addColorStop(1, '#7a5110'); return g; };
        // spokes with knobbed handles
        for (let i = 0; i < 8; i++){
            const a = i * TAU / 8;
            c.save(); c.rotate(a);
            const g = c.createLinearGradient(0, -2.5, 0, 2.5); g.addColorStop(0, '#fff0b0'); g.addColorStop(.5, '#c99a32'); g.addColorStop(1, '#6a4510');
            c.fillStyle = g; c.fillRect(8, -2.4, 40, 4.8);
            sphere(c, 47, 0, 3.6, [[0, '#fffbe0'], [.5, '#e2b64a'], [1, '#6a4510']]);
            c.restore();
        }
        // rim
        c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.arc(0, 0, 28, 0, TAU, true); c.fillStyle = GOLD(28, 38); c.fill('evenodd');
        c.strokeStyle = '#4a2f04'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, 28, 0, TAU); c.stroke();
        c.strokeStyle = 'rgba(255,250,220,.7)'; c.lineWidth = .8; c.beginPath(); c.arc(0, 0, 32, 0, TAU); c.stroke();
        for (let i = 0; i < 16; i++){ const a = i * TAU / 16 + TAU / 32; sphere(c, Math.cos(a) * 32, Math.sin(a) * 32, 1.3, [[0, '#ffffff'], [1, '#8a5c14']]); }
        // hub
        sphere(c, 0, 0, 11, [[0, '#fffbe0'], [.5, '#e2b64a'], [1, '#6a4510']]);
        c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.strokeStyle = '#4a2f04'; c.lineWidth = 1; c.stroke();
        c.restore();
        sphere(c, 0, 0, 5, [[0, '#ffe6e6'], [.4, '#d61a3a'], [1, '#4a0010']]);
        specular(c, -1.5, -2, 2.4, 1.4, .8);
        twinkle(c, -20, -24, 4 + 2 * Math.sin(t * 4), '#ffffff', .8);
    };

    // Eye of the Arbiter: a radiant all-seeing golden eye.
    ART.god_eye = (c, t) => {
        halo(c, 54, '255,215,110', .5);
        c.save(); c.rotate(t * .15);
        for (let i = 0; i < 24; i++){
            const a = i * TAU / 24, len = i % 2 ? 40 : 50;
            c.strokeStyle = i % 2 ? 'rgba(255,225,150,.45)' : 'rgba(255,240,190,.75)'; c.lineWidth = i % 2 ? 1 : 1.8;
            c.beginPath(); c.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); c.lineTo(Math.cos(a) * len, Math.sin(a) * len); c.stroke();
        }
        c.restore();
        const eye = () => { c.beginPath(); c.moveTo(-40, 0); c.quadraticCurveTo(0, -34, 40, 0); c.quadraticCurveTo(0, 34, -40, 0); c.closePath(); };
        eye(); const sg = c.createRadialGradient(0, 0, 4, 0, 0, 40); sg.addColorStop(0, '#ffffff'); sg.addColorStop(.7, '#f1ead6'); sg.addColorStop(1, '#b8a67a');
        c.fillStyle = sg; c.fill();
        c.save(); eye(); c.clip();
        const look = Math.sin(t * .8) * 4;
        // iris with striations
        sphere(c, look, 0, 15, [[0, '#fff3b0'], [.35, '#ffc23a'], [.75, '#b0640a'], [1, '#4a2604']]);
        c.strokeStyle = 'rgba(90,45,0,.45)'; c.lineWidth = .6;
        for (let i = 0; i < 28; i++){ const a = i * TAU / 28; c.beginPath(); c.moveTo(look + Math.cos(a) * 6, Math.sin(a) * 6); c.lineTo(look + Math.cos(a) * 14.5, Math.sin(a) * 14.5); c.stroke(); }
        c.strokeStyle = '#3a1c02'; c.lineWidth = 1.2; c.beginPath(); c.arc(look, 0, 15, 0, TAU); c.stroke();
        c.fillStyle = '#0a0602'; c.beginPath(); c.arc(look, 0, 5.5 + .8 * Math.sin(t * 2), 0, TAU); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(look - 4, -5, 2.6, 0, TAU); c.fill();
        c.beginPath(); c.arc(look + 4, 4, 1.1, 0, TAU); c.fill();
        // lid shadow
        const ls = c.createLinearGradient(0, -20, 0, 0); ls.addColorStop(0, 'rgba(80,50,0,.35)'); ls.addColorStop(1, 'rgba(80,50,0,0)');
        c.fillStyle = ls; c.fillRect(-40, -20, 80, 20);
        c.restore();
        // golden lids and lashes
        c.save(); c.shadowColor = '#ffd76a'; c.shadowBlur = 10;
        eye(); c.strokeStyle = '#e8b13a'; c.lineWidth = 3; c.stroke(); c.restore();
        eye(); c.strokeStyle = '#fff2b8'; c.lineWidth = 1; c.stroke();
        c.strokeStyle = '#d9a030'; c.lineWidth = 1.4; c.lineCap = 'round';
        for (let i = -3; i <= 3; i++){ const x = i * 9, y = -17 * (1 - (x / 40) ** 2); c.beginPath(); c.moveTo(x, y); c.lineTo(x * 1.15, y - 7); c.stroke(); }
        twinkle(c, 0, -40, 6 + 2 * Math.sin(t * 3), '#ffffff', .9);
    };

    return ART;
})();

// Draws an artifact centred on the current origin, `size` pixels across. Returns false if it has no art.
function drawArtifactArt(ctx, id, size, t){
    const paint = ARTIFACT_ART[id];
    if (!paint) return false;
    ctx.save();
    ctx.scale(size / 100, size / 100);
    paint(ctx, t || 0);
    ctx.restore();
    return true;
}

// A cached PNG texture of the artifact for small, static slots. Returns null if it cannot be made.
const artifactTextureCache = {};
function artifactTextureURL(id){
    if (id in artifactTextureCache) return artifactTextureCache[id];
    let url = null;
    try {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const c = cv.getContext && cv.getContext('2d');
        if (c && ARTIFACT_ART[id] && typeof cv.toDataURL === 'function'){
            c.translate(64, 64);
            drawArtifactArt(c, id, 124, 1.7);
            url = cv.toDataURL('image/png');
        }
    } catch (e){ url = null; }
    return (artifactTextureCache[id] = url);
}

// Animates every artifact canvas that is on screen (menu cards and slots).
(function animateArtifactCanvases(){
    if (typeof requestAnimationFrame !== 'function' || typeof document === 'undefined' || !document.querySelectorAll) return;
    function frame(now){
        const list = document.querySelectorAll('canvas[data-art]');
        for (const cv of list){
            if (!cv.offsetParent) continue;   // hidden (menu closed)
            const c = cv.getContext('2d');
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, cv.width, cv.height);
            c.translate(cv.width / 2, cv.height / 2);
            drawArtifactArt(c, cv.dataset.art, cv.width * .97, now / 1000);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
