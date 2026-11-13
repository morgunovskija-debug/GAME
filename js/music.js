// ================================================================
//  CINEMATIC BOSS MUSIC
//  A live orchestral score built with the Web Audio API. No audio files.
//  Every boss has its own theme. The score builds in layers as the boss
//  loses health or changes phase:
//  Each theme is arranged like a trailer cue: verse, chorus, breakdown,
//  build-up and drop, over a driving bass and string ostinatos.
//    level 0  verse and chorus, war drums, bass and the melody in the chorus
//    level 1  choir, brass stabs and sixteenth-note strings in the chorus
//    level 2  the melody everywhere, braams and doubled brass
//    level 3  non-stop chorus, four-on-the-floor drums and the fastest tempo
//  The three mythic bosses add war horns and anvils, thunder, timpani,
//  and a finale that quotes the earlier bosses' leitmotifs.
//  The Idol gets its own hijaz-scale theme with horns, organ, a high choir,
//  timpani, thunder and cascading bells.
//  A kill ends in a victory fanfare; the sanctuary has a calm theme.
//  M mutes. The Music slider sets the volume. Pausing ducks the score.
// ================================================================
const bossMusic = (() => {
    const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    const LOOKAHEAD = .16;
    const SCALES = {
        minor:[0,2,3,5,7,8,10], harmonic:[0,2,3,5,7,8,11], phrygian:[0,1,3,5,7,8,10],
        lydian:[0,2,4,6,7,9,11], insen:[0,1,5,7,10], dorian:[0,2,3,5,7,9,10],
        hijaz:[0,1,4,5,7,8,10]
    };
    const _ = null;
    // Melodies over two bars: [step, chord-relative degree, length in steps].
    const HEROIC = [[0,7,6],[6,6,2],[8,4,8],[16,5,6],[22,4,2],[24,2,8]];
    const DARK   = [[0,0,4],[4,1,4],[8,2,8],[16,1,4],[20,0,4],[24,-1,8]];
    const SOAR   = [[0,4,8],[8,7,4],[12,6,4],[16,4,12],[28,2,4]];
    const WHEEL  = [[0,5,6],[6,4,2],[8,3,8],[16,2,4],[20,3,4],[24,1,8]];
    // Mythic leitmotifs: a galloping knight's call, a soaring storm line and a slow hymn for the finale.
    const KNIGHT = [[0,0,3],[3,0,1],[4,2,4],[8,4,6],[14,3,2],[16,2,3],[19,1,1],[20,0,4],[24,-1,4],[28,0,4]];
    const STORM  = [[0,7,2],[2,6,2],[4,4,4],[8,7,2],[10,8,2],[12,9,4],[16,7,4],[20,4,4],[24,6,8]];
    const FINALE = [[0,0,8],[8,4,4],[12,5,4],[16,7,10],[26,6,2],[28,4,4]];
    // The Idol: a call that climbs to the octave and falls back through the flattened second.
    const GODLY  = [[0,0,3],[3,2,1],[4,4,4],[8,7,6],[14,8,2],[16,7,4],[20,5,2],[22,4,2],[24,1,4],[28,0,4]];

    const THEMES = [
        { name:'The King of Adaptation — Eight Spokes', bpm:112, root:50, scale:'insen', prog:[0,0,3,1], pad:'strings', lead:'flute', leadOct:2,
          ost:'staccato', ostPat:[0,_,_,0,_,_,2,_,0,_,_,0,_,4,_,2], motif:WHEEL, special:'wheel',
          drums:['X.......x.......','X..x..x.X...x.x.','X.xx..x.X.x.x.xx','XxxsX.xsXxx.Xsxs'] },
        { name:'Ethernaty — Prismatic Void', bpm:100, root:52, scale:'lydian', prog:[0,1,4,5], pad:'choir', lead:'strings', leadOct:2,
          ost:'pluck', ostOct:1, ostPat:[0,2,4,7,9,7,4,2,0,2,4,7,11,9,7,4], motif:SOAR, special:'stars',
          drums:['................','x.......x...s...','X...x.s.X..x..s.','X.x.s.xsX.xxs.ss'] },
        { name:'Fire Destroyer — Ashfall', bpm:128, root:48, scale:'phrygian', prog:[0,1,0,6], pad:'strings', lead:'brass', leadOct:1,
          ost:'staccato', ostPat:[0,0,_,0,0,_,0,_,0,0,_,0,1,_,0,_], motif:HEROIC, special:'embers',
          drums:['X...x...X...x...','X.x.x.s.X.x.x.s.','XxX.xsx.XxX.xsxs','XxXsxsXsXxXsxsXs'] },
        { name:'Solar Devourer — Sunken Sun', bpm:104, root:42, scale:'harmonic', prog:[0,5,3,4], pad:'strings', lead:'brass', leadOct:2,
          ost:'staccato', ostPat:[0,_,7,_,0,_,7,_,0,_,7,_,0,4,7,4], motif:DARK, special:'pulse',
          drums:['X.......X.......','X...x...X...x.s.','X..xx.s.X..xx.s.','X.xxs.xsX.xxs.xx'] },
        { name:'Two-Faced Demon — The Gate', bpm:120, root:47, scale:'harmonic', prog:[0,0,5,4], pad:'organ', choir:true, lead:'brass', leadOct:1,
          ost:'staccato', ostPat:[0,_,0,1,_,0,_,4,0,_,0,1,_,0,3,_], motif:DARK, special:'toll',
          drums:['X.......x.......','X..x..s.X..x..s.','X.xx.ss.X.xx.sxs','XsxxXssxXsxxXsxs'] },
        { name:'Selene Vey — Drowned Observatory', bpm:84, root:45, scale:'minor', prog:[0,5,2,6], pad:'choir', lead:'strings', leadOct:2,
          ost:'pluck', ostOct:1, ostPat:[0,4,7,9,7,4,2,4,0,4,7,11,9,7,4,2], motif:SOAR, special:'bells',
          drums:['................','X.......x.......','X.....x.X...s...','X..x..x.X.x.s.ss'] },
        { name:'Vael’Khor — Glacier of Hrim', bpm:90, root:43, scale:'minor', prog:[0,3,5,4], pad:'strings', choir:true, lead:'brass', leadOct:1,
          ost:'staccato', ostPat:[0,_,0,_,0,_,2,_,0,_,0,_,4,_,2,_], motif:HEROIC, special:'ice',
          drums:['X.......x.......','X.....x.X.......','X...x.x.X...x.s.','X.x.x.xsX.xsx.ss'] },
        { name:'Horologue — The Clock Spire', bpm:116, root:49, scale:'harmonic', prog:[0,3,4,0], pad:'strings', choir:true, lead:'organ', leadOct:1,
          ost:'staccato', ostOct:1, ostPat:[0,2,4,2,0,2,4,2,0,2,4,2,0,2,4,2], motif:SOAR, special:'ticks',
          drums:['................','X.......X.......','X...x...X...x.s.','X.x.x.s.X.x.xss.'] },
        { name:'The Glitch — Null Sector', bpm:148, root:40, scale:'phrygian', prog:[0,1,6,4], pad:'choir', choir:true, lead:'square', leadOct:2,
          ost:'square', ostOct:1, ostPat:[0,0,7,0,0,1,0,7,0,0,7,0,4,3,1,0], motif:DARK, special:'glitch',
          drums:['X...x...X...x...','X.x.s.x.X.x.s.xh','XhxhshxhXhxhsxsh','XxxhsxXhXxshsxss'] },
        { name:'Kaelthar — Colosseum of the Black Sun', bpm:132, root:45, scale:'harmonic', prog:[0,5,3,4], pad:'strings', choir:true, lead:'brass', leadOct:1,
          ost:'staccato', ostPat:[0,0,_,0,0,_,0,_,0,0,_,0,4,_,2,_], motif:KNIGHT, special:'blackSun',
          drums:['X..x....X..x....','X..x..s.X..x..s.','X.xx..s.X.xx.xs.','XxxsXxxsXxxsXsss'] },
        { name:'Nyxara — The Stormspire', bpm:142, root:50, scale:'dorian', prog:[0,6,5,4], pad:'choir', choir:true, lead:'strings', leadOct:2,
          ost:'pluck', ostOct:1, ostPat:[0,4,7,4,9,7,4,7,0,4,7,4,11,9,7,4], motif:STORM, special:'storm',
          drums:['X.......x.......','X...s...X.x.s...','X.x.s.xsX.x.s.xs','XxxsXxxsXxxsXxss'] },
        { name:'The Architect — The First Page', bpm:120, root:41, scale:'harmonic', prog:[0,5,1,4], pad:'organ', choir:true, lead:'brass', leadOct:1,
          ost:'staccato', ostOct:1, ostPat:[0,2,4,7,4,2,0,2,0,2,4,7,9,7,4,2], motif:FINALE, special:'finale',
          drums:['X.......X.......','X...x.s.X...x.s.','X.xx.xs.X.xx.xsx','XsxsXsxsXsxsXsss'] },
        { name:'The Idol — Throne Beyond Heaven', bpm:138, root:45, scale:'hijaz', prog:[0,1,5,4], pad:'choir', choir:true, lead:'brass', leadOct:1,
          ost:'staccato', ostOct:1, ostPat:[0,0,4,0,0,1,0,4,0,0,4,0,7,4,1,0], motif:GODLY, special:'divine',
          drums:['X.......X..x....','X..x..s.X..x.xs.','X.xx.xs.XxX.xxs.','XxxsXxxsXxxsXsxs'] }
    ];
    const CALM = { name:'The Sanctuary', bpm:66, root:53, scale:'lydian', prog:[0,4,5,3], pad:'strings', calm:true, gain:.55,
        ost:'pluck', ostOct:1, ostPat:[0,_,_,2,_,_,4,_,7,_,_,4,_,_,2,_], special:'stars', drums:['................'] };
    for (const T of [...THEMES, CALM]){
        T.motifMap = {};
        for (const [s, d, len] of T.motif || []) T.motifMap[s] = [d, len];
    }

    let ctx = null, master = null, verbIn = null, noiseBuf = null, driveCurve = null, crushCurve = null;
    let bus = null, cur = null, theme = null, themeKey = null, step = 0, nextTime = 0, lastLevel = 0;
    let timer = null, holdUntil = 0, lastBossObj = null, duck = false, lastError = null;
    const prefs = loadPrefs();

    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const pick = a => a[Math.floor(Math.random() * a.length)];

    function loadPrefs(){
        try {
            const p = JSON.parse(localStorage.getItem('boss-rush-music') || 'null');
            if (p && typeof p.volume === 'number') return { volume:Math.min(1, Math.max(0, p.volume)), muted:!!p.muted };
        } catch (e) {}
        return { volume:.6, muted:false };
    }
    function savePrefs(){ try { localStorage.setItem('boss-rush-music', JSON.stringify(prefs)); } catch (e) {} }

    // ---------------- audio graph ----------------
    function init(external){
        if (ctx && !external) return true;
        if (!external && !AC) return false;
        try { ctx = external || new AC(); } catch (e) { ctx = null; return false; }
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .008; comp.release.value = .3;
        master = ctx.createGain(); master.gain.value = 0;
        master.connect(comp); comp.connect(ctx.destination);
        const verb = ctx.createConvolver(); verb.buffer = impulse(3.4, 2.4);
        verbIn = ctx.createGain(); verbIn.gain.value = .6; verbIn.connect(verb); verb.connect(master);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        driveCurve = new Float32Array(1024); crushCurve = new Float32Array(1024);
        for (let i = 0; i < 1024; i++){ const x = i / 511.5 - 1; driveCurve[i] = Math.tanh(x * 3); crushCurve[i] = Math.round(x * 5) / 5; }
        bus = null; theme = null; themeKey = null; vib = null; vibWide = null;
        applyVolume(true);
        return true;
    }
    function impulse(sec, decay){
        const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++){
            const d = b.getChannelData(c);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return b;
    }
    function makeBus(level){
        const dry = ctx.createGain(), wet = ctx.createGain(), t = ctx.currentTime;
        for (const g of [dry, wet]){ g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + .6); }
        dry.connect(master); wet.connect(verbIn);
        return { dry, wet, pans:new Map(), sends:new Map() };
    }
    function fadeBus(b, sec){
        if (!b || !ctx) return;
        const t = ctx.currentTime;
        for (const g of [b.dry, b.wet]){ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.setTargetAtTime(0, t, sec / 4); }
        if (typeof setTimeout === 'function') setTimeout(() => { try { b.dry.disconnect(); b.wet.disconnect(); } catch (e) {} }, sec * 1000 + 600);
    }
    function applyVolume(now){
        if (!ctx || !master) return;
        const v = prefs.muted ? 0 : prefs.volume * (duck ? .4 : 1) * .9;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(v, ctx.currentTime, now ? .01 : .2);
    }

    // ---------------- building blocks ----------------
    // Panners and reverb sends are shared per bus, so a note adds no routing nodes.
    function out(node, wet, pan){
        const b = cur;
        let dest = b.dry;
        if (pan && ctx.createStereoPanner){
            dest = b.pans.get(pan);
            if (!dest){ dest = ctx.createStereoPanner(); dest.pan.value = pan; dest.connect(b.dry); b.pans.set(pan, dest); }
        }
        node.connect(dest);
        if (wet > 0){
            let send = b.sends.get(wet);
            if (!send){ send = ctx.createGain(); send.gain.value = wet; send.connect(b.wet); b.sends.set(wet, send); }
            node.connect(send);
        }
    }
    function osc(type, freq, t, end, detune){
        const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
        if (detune) o.detune.setValueAtTime(detune, t);
        o.start(t); o.stop(end); return o;
    }
    function amp(v){ const g = ctx.createGain(); if (v != null) g.gain.value = v; return g; }
    function filter(type, freq, q){ const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; return f; }
    function noise(t, end){ const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(end); return s; }
    function shaper(curve){ const s = ctx.createWaveShaper(); s.curve = curve; return s; }
    // Attack, hold, then an exponential release. Returns when the voice is silent.
    function envelope(g, t, a, peak, hold, rel){
        const p = g.gain, h = t + Math.max(a, hold);
        p.setValueAtTime(.0001, t); p.linearRampToValueAtTime(peak, t + a);
        p.setValueAtTime(peak, h); p.setTargetAtTime(.0001, h, rel);
        return h + rel * 4;
    }
    function hit(g, t, peak, decay){
        const p = g.gain;
        p.setValueAtTime(.0001, t); p.linearRampToValueAtTime(peak, t + .004); p.exponentialRampToValueAtTime(.0001, t + decay);
        return t + decay + .03;
    }
    // Vibrato comes from two shared LFOs, so each note costs no extra oscillator.
    let vib = null, vibWide = null;
    function lfo(t, end, depth){
        if (!vib){
            const o = ctx.createOscillator(); o.frequency.value = 5.2; o.start();
            vib = ctx.createGain(); vib.gain.value = 6; o.connect(vib);
            vibWide = ctx.createGain(); vibWide.gain.value = 14; o.connect(vibWide);
        }
        return depth > 10 ? vibWide : vib;
    }

    // ---------------- the orchestra ----------------
    const INST = {
        strings(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', Math.min(4200, mtof(m) * 3.2), .6);
            const end = envelope(g, t, .32, .06 * vel, dur, .3), v = lfo(t, end, 6, 5.2);
            for (const d of [-9, 9]){ const o = osc('sawtooth', mtof(m), t, end, d); v.connect(o.detune); o.connect(f); }
            f.connect(g); out(g, .5, pan);
        },
        choir(t, m, dur, vel, pan){
            const g = amp(), src = amp(1), end = envelope(g, t, .55, .16 * vel, dur, .5), v = lfo(t, end, 7, 4.6);
            for (const d of [-7, 6]){ const o = osc('sawtooth', mtof(m), t, end, d); v.connect(o.detune); o.connect(src); }
            for (const [fr, q, a] of [[730, 8, 1.2], [1150, 10, .6]]){
                const f = filter('bandpass', fr, q), fg = amp(a); src.connect(f); f.connect(fg); fg.connect(g);
            }
            out(g, .75, pan);
        },
        brass(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', 300, 1.2), top = Math.min(5000, mtof(m) * 5);
            const end = envelope(g, t, .06, .065 * vel, dur, .25);
            f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(top, t + .1); f.frequency.setTargetAtTime(top * .45, t + .12, .3);
            for (const d of [-6, 5]) osc('sawtooth', mtof(m), t, end, d).connect(f);
            const sq = osc('square', mtof(m - 12), t, end), sg = amp(.35); sq.connect(sg); sg.connect(f);
            f.connect(g); out(g, .45, pan);
        },
        staccato(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', Math.min(3000, mtof(m) * 4), .8);
            const end = hit(g, t, .075 * vel, Math.max(.08, dur * .9));
            osc('sawtooth', mtof(m), t, end, pan ? pan * 14 : 0).connect(f);
            f.connect(g); out(g, .3, pan);
        },
        organ(t, m, dur, vel, pan){
            const g = amp(), end = envelope(g, t, .08, .05 * vel, dur, .5);
            for (const [r, a] of [[.5, .55], [1, 1], [2, .65], [4, .3]]){
                const o = osc('sine', mtof(m) * r, t, end), og = amp(a); o.connect(og); og.connect(g);
            }
            out(g, .65, pan);
        },
        bell(t, m, dur, vel, pan){
            const g = amp(.07 * vel);
            for (const [r, a, d] of [[1, 1, 2.6], [2.76, .5, 1.6], [5.4, .25, .9]]){
                const og = amp(), o = osc('sine', mtof(m) * r, t, hit(og, t, a, d)); o.connect(og); og.connect(g);
            }
            out(g, .7, pan);
        },
        flute(t, m, dur, vel, pan){
            const g = amp(), end = envelope(g, t, .09, .09 * vel, dur, .3), v = lfo(t, end, 14, 5.5);
            const o = osc('sine', mtof(m - 1), t, end); o.frequency.exponentialRampToValueAtTime(mtof(m), t + .09); v.connect(o.detune); o.connect(g);
            const tri = osc('triangle', mtof(m), t, end), tg = amp(.3); tri.connect(tg); tg.connect(g);
            const n = noise(t, end), bf = filter('bandpass', mtof(m) * 2, 4), ng = amp(.25); n.connect(bf); bf.connect(ng); ng.connect(g);
            out(g, .6, pan);
        },
        pluck(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', mtof(m) * 6, .5), end = hit(g, t, .07 * vel, 1.1);
            f.frequency.setValueAtTime(Math.min(12000, mtof(m) * 8), t); f.frequency.exponentialRampToValueAtTime(mtof(m) * 1.5, t + .6);
            osc('triangle', mtof(m), t, end).connect(f);
            const s = osc('sawtooth', mtof(m), t, end, 4), sg = amp(.25); s.connect(sg); sg.connect(f);
            f.connect(g); out(g, .55, pan);
        },
        bass(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', 900, 5), end = hit(g, t, .11 * vel, Math.max(.12, dur));
            f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(200, t + Math.max(.12, dur));
            osc('sawtooth', mtof(m), t, end).connect(f);
            const sq = osc('square', mtof(m - 12), t, end), sg = amp(.6); sq.connect(sg); sg.connect(f);
            f.connect(g); out(g, .08, pan);
        },
        // A war horn: the filter opens slowly, so each note swells like a call across a battlefield.
        horn(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', 200, 2), end = envelope(g, t, .22, .085 * vel, dur, .5);
            f.frequency.setValueAtTime(180, t); f.frequency.linearRampToValueAtTime(Math.min(2400, mtof(m) * 6), t + .35); f.frequency.setTargetAtTime(mtof(m) * 3, t + .4, .6);
            for (const d of [-8, 0, 7]) osc('sawtooth', mtof(m), t, end, d).connect(f);
            const s = osc('sine', mtof(m - 12), t, end), sg = amp(.5); s.connect(sg); sg.connect(g);
            f.connect(g); out(g, .55, pan);
        },
        square(t, m, dur, vel, pan){
            const g = amp(), f = filter('lowpass', 3800, .7), end = hit(g, t, .055 * vel, Math.max(.06, dur));
            osc('square', mtof(m), t, end, pan ? pan * 20 : 0).connect(f);
            f.connect(g); out(g, .35, pan);
        }
    };
    function drone(t, m, dur){
        const g = amp(), end = envelope(g, t, .8, .1, dur, .6), f = filter('lowpass', 220, .5);
        osc('sine', mtof(m), t, end).connect(g);
        const s = osc('sawtooth', mtof(m), t, end, -4), sg = amp(.35); s.connect(f); f.connect(sg); sg.connect(g);
        out(g, .3);
    }
    // The huge low brass blast from film trailers.
    function braam(t, m, vel = 1){
        const g = amp(), f = filter('lowpass', 120, 2.5), sh = shaper(driveCurve);
        const end = envelope(g, t, .04, .085 * vel, 1.6, .5);
        f.frequency.setValueAtTime(110, t); f.frequency.exponentialRampToValueAtTime(1700, t + .35); f.frequency.exponentialRampToValueAtTime(260, t + 2.2);
        for (const [i, d] of [[0, -8], [0, 8], [7, 0], [12, -5], [-12, 0]]) osc('sawtooth', mtof(m + i), t, end, d).connect(f);
        f.connect(sh); sh.connect(g); out(g, .5);
    }
    function taiko(t, big, vel){
        const g = amp(), o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(big ? 150 : 230, t); o.frequency.exponentialRampToValueAtTime(big ? 44 : 88, t + (big ? .32 : .18));
        const end = hit(g, t, (big ? .55 : .32) * vel, big ? 1.1 : .5); o.start(t); o.stop(end); o.connect(g);
        const n = noise(t, t + .2), lp = filter('lowpass', big ? 700 : 1400, .7), ng = amp(); hit(ng, t, (big ? .35 : .25) * vel, .14);
        n.connect(lp); lp.connect(ng); ng.connect(g);
        out(g, .4);
    }
    function snare(t, vel){
        const g = amp(), n = noise(t, t + .3), bp = filter('bandpass', 1900, .9); hit(g, t, .22 * vel, .22);
        n.connect(bp); bp.connect(g);
        const og = amp(), o = osc('triangle', 210, t, hit(og, t, .8, .1)); o.connect(og); og.connect(g);
        out(g, .45);
    }
    function hat(t, vel, pan){ const g = amp(), n = noise(t, t + .08), hp = filter('highpass', 7500); hit(g, t, .07 * vel, .05); n.connect(hp); hp.connect(g); out(g, .15, pan); }
    function tick(t, tock){
        const g = amp(), n = noise(t, t + .06), bp = filter('bandpass', tock ? 2200 : 3300, 7); hit(g, t, .3, .035);
        n.connect(bp); bp.connect(g);
        const bg = amp(), o = osc('sine', tock ? 1800 : 2400, t, hit(bg, t, .08, .03)); o.connect(bg); bg.connect(g);
        out(g, .25);
    }
    function crash(t, vel){ const g = amp(), n = noise(t, t + 2.6), hp = filter('highpass', 3200); hit(g, t, .12 * vel, 2.4); n.connect(hp); hp.connect(g); out(g, .5); }
    function swell(t, len){
        const g = amp(), n = noise(t, t + len + .1), hp = filter('highpass', 600);
        hp.frequency.setValueAtTime(600, t); hp.frequency.exponentialRampToValueAtTime(7000, t + len);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.13, t + len); g.gain.linearRampToValueAtTime(0, t + len + .04);
        n.connect(hp); hp.connect(g); out(g, .6);
    }
    function sub(t, m, dur){ const g = amp(), o = osc('sine', mtof(m), t, hit(g, t, .16, dur)); o.connect(g); out(g, 0); }
    function shimmer(t, m){
        const g = amp(), end = envelope(g, t, .6, .025, .5, 1.2);
        osc('sine', mtof(m), t, end).connect(g); osc('sine', mtof(m), t, end, 7).connect(g);
        out(g, .9);
    }
    function crunch(t){
        const g = amp(), n = noise(t, t + .1), bp = filter('bandpass', 400 + Math.random() * 3600, 3), sh = shaper(crushCurve);
        hit(g, t, .12, .07); n.connect(bp); bp.connect(sh); sh.connect(g); out(g, .2);
    }
    function tapeStop(t, m, len){
        const g = amp(), o = osc('square', mtof(m), t, t + len + .05), f = filter('lowpass', 2400, .7);
        o.frequency.exponentialRampToValueAtTime(mtof(m - 24), t + len);
        g.gain.setValueAtTime(.04, t); g.gain.linearRampToValueAtTime(0, t + len);
        o.connect(f); f.connect(g); out(g, .3);
    }
    // Mythic percussion: an anvil strike, rolling thunder and tuned timpani.
    function anvil(t, m){
        const g = amp(.05);
        for (const [r, a, d] of [[1, 1, .5], [2.76, .6, .3], [5.4, .4, .2], [8.9, .25, .12]]){
            const og = amp(), o = osc('sine', mtof(m) * r, t, hit(og, t, a, d)); o.connect(og); og.connect(g);
        }
        const n = noise(t, t + .05), hp = filter('highpass', 5000), ng = amp(); hit(ng, t, .5, .03); n.connect(hp); hp.connect(ng); ng.connect(g);
        out(g, .4, .2);
    }
    function thunder(t, vel){
        for (const [delay, cut, peak] of [[0, 320, .22], [.3, 140, .18]]){
            const s = t + delay, g = amp(), n = noise(s, s + 3.5), f = filter('lowpass', cut, .5);
            g.gain.setValueAtTime(.0001, s); g.gain.linearRampToValueAtTime(peak * vel, s + .06); g.gain.setTargetAtTime(.0001, s + .1, .9);
            n.connect(f); f.connect(g); out(g, .5);
        }
    }
    function timpani(t, m, vel){
        const g = amp(), end = hit(g, t, .14 * vel, 1.2), o = osc('sine', mtof(m) * 1.04, t, end);
        o.frequency.exponentialRampToValueAtTime(mtof(m), t + .1);
        const tr = osc('triangle', mtof(m) * 1.5, t, end), tg = amp(.25); tr.connect(tg); tg.connect(g);
        o.connect(g); out(g, .35);
    }
    function impact(T, t){
        taiko(t, true, 1.3); braam(t, T.root - 12); crash(t, 1);
    }

    // Boss-specific colour on top of the shared score.
    const SPECIAL = {
        wheel(T, p, bar, t, note){ if (p === 0 && bar % 4 === 0){ INST.bell(t, note(0, 0), 3, 1.2); INST.bell(t, note(0, 0) + 1, 3, .5); } },
        stars(T, p, bar, t, note, chord){ if (p % 2 === 0 && Math.random() < (T.calm ? .08 : .2)) INST.bell(t, note(chord + pick([0, 2, 4, 7]), 2), 2, .45, pick([-.6, .6])); },
        embers(T, p, bar, t, note, chord, sb, lv){ if (lv >= 1 && bar % 2 === 1 && (p === 0 || p === 3 || p === 6)) INST.brass(t, note(chord, 0), sb * 1.6, .9); },
        pulse(T, p, bar, t, note, chord, sb){ if (p % 4 === 0) sub(t, note(chord, -1), sb * 3); },
        toll(T, p, bar, t, note, chord){ if (p === 0 && bar % 2 === 0) INST.bell(t, note(chord, 0), 3, 1); },
        bells(T, p, bar, t, note, chord){ if (p % 4 === 0 && (p === 0 || Math.random() < .45)) INST.bell(t, note(chord + pick([0, 2, 4, 7]), 2), 2, .7, pick([-.5, .5])); },
        ice(T, p, bar, t, note, chord){ if (p === 0 || p === 10) shimmer(t, note(chord + pick([0, 2, 4, 7, 9]), 3)); },
        ticks(T, p, bar, t, note){ if (p % 2 === 0) tick(t, (p / 2) % 2 === 1); if (p === 0 && bar % 4 === 0) INST.bell(t, note(0, 1), 3, .9); },
        blackSun(T, p, bar, t, note, chord, sb, lv){
            if (p === 0 && bar % 2 === 0) INST.horn(t, note(chord, -1), sb * 14, 1, -.2);
            if (lv >= 1 && (p === 4 || p === 12)) anvil(t, note(chord + 4, 2));
            if (lv >= 2 && p === 14) timpani(t, note(chord, -1), .8);
        },
        storm(T, p, bar, t, note, chord, sb, lv){
            if (p === 0 && bar % 4 === 0) thunder(t, 1);
            if (p === 0 && bar % 4 === 2 && Math.random() < .6) thunder(t, .6);
            if (lv >= 1 && p % 2 === 0) INST.pluck(t, note(chord + [0, 2, 4, 7, 9, 7, 4, 2][p / 2], 3), sb * .8, .45, p % 4 ? .5 : -.5);
        },
        // The finale quotes the leitmotifs of the bosses the Architect created, one per phrase, on bells.
        finale(T, p, bar, t, note, chord, sb, lv){
            const phrase = bar % 16;
            if (p === 0 && bar % 4 === 0){ INST.bell(t, note(chord, 1), 3, 1); INST.horn(t, note(chord, -1), sb * 16, .9); }
            if (p === 0) timpani(t, note(chord, -1), lv >= 2 ? 1 : .7);
            if (p === 0 && (phrase === 12 || phrase === 13)){
                const q = THEMES[Math.floor(bar / 16) % 9], half = phrase === 12 ? 0 : 16;
                for (const [s, d, len] of q.motif || []) if (s >= half && s < half + 16) INST.bell(t + (s - half) * sb, note(chord + d, 2), len * sb, .8, .2);
            }
        },
        // The Idol: horns and organ on every phrase, a high choir of angels, timpani on each bar,
        // heavenly anvils, thunder and cascading bells as the fight grows, and a braam on every bar at the end.
        divine(T, p, bar, t, note, chord, sb, lv){
            if (p === 0 && bar % 4 === 0){
                INST.horn(t, note(chord, -1), sb * 16, 1, -.25); INST.horn(t, note(chord + 4, -1), sb * 16, .8, .25);
                for (const k of [0, 4, 7]) INST.organ(t, note(chord + k, 0), sb * 15, .9);
                INST.bell(t, note(chord + 7, 2), 3, 1);
            }
            if (p === 0) timpani(t, note(chord, -1), lv >= 2 ? 1.1 : .75);
            if (p === 8 && lv >= 1) timpani(t, note(chord + 4, -1), .7);
            if (p === 0 && bar % 2 === 0) INST.choir(t, note(chord + 7, 2), sb * 30, lv >= 2 ? 1 : .7, .1);
            if (lv >= 1 && (p === 4 || p === 12)) anvil(t, note(chord + 4, 3));
            if (lv >= 2 && p === 0 && bar % 4 === 2) thunder(t, .8);
            if (lv >= 2 && p % 4 === 0) INST.bell(t, note(chord + [7, 4, 2, 0][p / 4], 3), 1.6, .5, p % 8 ? .5 : -.5);
            if (lv >= 3 && p === 0 && bar % 2 === 1) braam(t, note(chord, -1), 1.1);
        },
        glitch(T, p, bar, t, note, chord, sb){
            if (Math.random() < .1){ const m = note(chord + pick([0, 7, 1]), 2); for (let k = 0; k < 4; k++) INST.square(t + k * sb / 4, m, sb / 5, .7); }
            if (Math.random() < .06) crunch(t);
            if (bar % 4 === 3 && p === 12) tapeStop(t, note(chord, 1), sb * 4);
        }
    };

    const ENERGY = 1.18, LEVEL_TEMPO = [1, 1.02, 1.04, 1.08];
    function stepDur(T, lv){ return T.calm ? 60 / T.bpm / 4 : 60 / (T.bpm * ENERGY * LEVEL_TEMPO[lv]) / 4; }

    function calmStep(T, s, t, lv){
        cur = bus;
        const sc = SCALES[T.scale], n = sc.length, sb = stepDur(T, lv), p = s % 16, bar = Math.floor(s / 16);
        const chord = T.prog[bar % T.prog.length], barDur = sb * 16;
        const note = (d, oct = 0) => T.root + 12 * (Math.floor(d / n) + oct) + sc[((d % n) + n) % n];
        if (p === 0){
            for (const k of [0, 2, 4]) INST[T.pad](t, note(chord + k, 1), barDur, T.calm ? .6 : .9);
            if (bar % 2 === 0) drone(t, note(chord, -1), barDur * 2);
            if (!T.calm && (lv >= 1 || T.choir)) for (const k of [4, 7]) INST.choir(t, note(chord + k, 1), barDur, .8);
            if (!T.calm && ((lv >= 3 && bar % 2 === 0) || (lv === 2 && bar % 4 === 0))) braam(t, note(chord, -1));
            if (!T.calm && lv >= 2 && bar % 4 === 0) crash(t, .8);
        }
        if (!T.calm && lv >= 1 && bar % 4 === 3 && p === 0) swell(t, barDur);
        const pat = T.drums[Math.min(lv, T.drums.length - 1)], ch = pat[p];
        if (ch === 'X') taiko(t, true, 1);
        else if (ch === 'x') taiko(t, false, p % 4 === 0 ? 1 : .75);
        else if (ch === 's') snare(t, .9);
        else if (ch === 'h') hat(t, .8);
        if (!T.calm && lv >= 3 && p % 2 === 1 && ch !== 'h') hat(t, .5);
        if (T.ostPat){ const d = T.ostPat[p]; if (d !== null) INST[T.ost](t, note(chord + d, T.ostOct || 0), sb * .9, p % 4 === 0 ? 1 : .72); }
        const m = lv >= 2 && T.motifMap[s % 32];
        if (m){
            INST[T.lead](t, note(chord + m[0], T.leadOct), m[1] * sb, 1);
            if (lv >= 3 && T.lead !== 'brass') INST.brass(t, note(chord + m[0], 1), m[1] * sb, .8);
        }
        if (T.special) SPECIAL[T.special](T, p, bar, t, note, chord, sb, lv);
    }

    // A 16-bar arrangement for every boss theme:
    //   bars 0-3 verse, 4-11 chorus (melody, brass stabs, backbeat),
    //   12-13 breakdown (drums drop, choir and bells), 14-15 build (snare roll and riser),
    //   then the drop back to bar 0 with a braam, crash and sub boom.
    // The boss's intensity level raises everything; at level 3 the chorus never stops.
    function playStep(T, s, t, lv){
        if (T.calm) return calmStep(T, s, t, lv);
        cur = bus;
        const sc = SCALES[T.scale], n = sc.length, sb = stepDur(T, lv), p = s % 16, bar = Math.floor(s / 16);
        const chord = T.prog[bar % T.prog.length], barDur = sb * 16;
        const note = (d, oct = 0) => T.root + 12 * (Math.floor(d / n) + oct) + sc[((d % n) + n) % n];
        const phrase = bar % 16;
        const build = phrase === 14 || phrase === 15;
        const breakdown = lv < 3 && (phrase === 12 || phrase === 13);
        const chorus = !build && !breakdown && ((phrase >= 4 && phrase < 12) || lv >= 3);
        const drive = Math.min(3, lv + 1 + (chorus ? 1 : 0));

        if (p === 0){
            [0, 2, 4].forEach((k, i) => INST[T.pad](t, note(chord + k, 1), barDur, .9, [-.35, 0, .35][i]));
            if (bar % 2 === 0 || breakdown) drone(t, note(chord, -1), barDur * 2);
            if (T.pad !== 'choir' && (chorus || breakdown || lv >= 1 || T.choir)) [4, 7].forEach((k, i) => INST.choir(t, note(chord + k, 1), barDur, breakdown ? 1 : .8, i ? .4 : -.4));
            const drop = phrase === 0 && bar > 0, lift = phrase === 4;
            if (drop || lift || (lv >= 3 && bar % 2 === 0) || (lv === 2 && bar % 4 === 0)) braam(t, note(chord, -1), drop ? 1.2 : 1);
            if (drop || lift || (lv >= 2 && bar % 4 === 0)) crash(t, drop ? 1.2 : .9);
            if (drop){ taiko(t, true, 1.4); sub(t, note(chord, -2), 1.6); }
            if (phrase === 3) swell(t, barDur);
            if (phrase === 14) swell(t, barDur * 2);
            if (breakdown) INST.bell(t, note(chord + (phrase === 12 ? 0 : 4), 2), 3, .8, phrase === 12 ? -.3 : .3);
        }

        // Drums.
        if (build){
            const last = phrase === 15, every = last ? 1 : 2;
            if (p % every === 0) snare(t, last ? .55 + p * .03 : .35 + p * .015);
            if (p % 4 === 0) taiko(t, true, .7 + (last ? .4 : .1) + p * .01);
            if (last && p >= 12) taiko(t, false, 1);
        } else if (breakdown){
            if (p === 0) taiko(t, true, .7);
            if (phrase === 13 && p % 4 === 0) sub(t, note(chord, -1), sb * 3);
        } else {
            const ch = T.drums[Math.min(drive, T.drums.length - 1)][p];
            if (ch === 'X') taiko(t, true, 1);
            else if (ch === 'x') taiko(t, false, p % 4 === 0 ? 1 : .75);
            else if (ch === 's') snare(t, .9);
            else if (ch === 'h') hat(t, .8, .3);
            if (lv >= 3){
                if (p % 4 === 0 && ch !== 'X') taiko(t, true, .8);
                if (ch !== 'h' && p % 2 === 1) hat(t, .6, p % 4 === 1 ? .3 : -.3);
            } else if (chorus && p % 2 === 1 && ch !== 'h') hat(t, .45, .3);
            if (chorus && (p === 4 || p === 12) && ch !== 's') snare(t, .75);
            if ((phrase === 3 || phrase === 7 || phrase === 11) && p >= 12) taiko(t, false, .6 + (p - 12) * .12);
        }

        // Driving bass in octaves on every eighth note.
        if (!breakdown && p % 2 === 0) INST.bass(t, note(chord, p % 4 === 2 ? 0 : -1), sb * 1.6, p % 4 === 0 ? 1 : .8);

        // Ostinatos: the theme's own figure, plus a sixteenth-note pulse in the chorus.
        const d = T.ostPat[p];
        if (d !== null && (!breakdown || p % 4 === 0)) INST[T.ost](t, note(chord + d, T.ostOct || 0), sb * .9, (p % 4 === 0 ? 1 : .72) * (breakdown ? .7 : 1), p % 2 ? .35 : -.35);
        if ((chorus && lv >= 1) || (lv >= 2 && !breakdown) || (build && phrase === 15))
            INST.staccato(t, note(chord + (p % 8 === 6 ? 4 : 0), 1), sb * .7, p % 4 === 0 ? .9 : .55, p % 2 ? -.45 : .45);

        // Brass stabs on a syncopated rhythm.
        if (chorus && lv >= 1 && bar % 2 === 1 && [0, 3, 6, 10].includes(p))
            [0, 4].forEach((k, i) => INST.brass(t, note(chord + k, 0), sb * 1.4, .65, i ? .3 : -.3));

        // The melody: in every chorus, and always from level 2.
        const m = !breakdown && !build && (chorus || lv >= 2) && T.motifMap[s % 32];
        if (m){
            INST[T.lead](t, note(chord + m[0], T.leadOct), m[1] * sb, 1, 0);
            if (((lv >= 2 && chorus) || lv >= 3) && T.lead !== 'brass') INST.brass(t, note(chord + m[0], 1), m[1] * sb, .8, 0);
        }
        if (T.special) SPECIAL[T.special](T, p, bar, t, note, chord, sb, lv);
    }

    function victory(T, t){
        cur = makeBus(1);
        const r = T.root + 12;
        for (let i = 0; i < 14; i++) taiko(t + i * .09, false, .3 + i * .05);
        const h = t + 1.3;
        for (const k of [0, 4, 7, 12]) INST.brass(h, r + k, 3.2, .9);
        for (const k of [12, 16, 19]) INST.choir(h, r + k, 3.6, 1);
        for (const k of [12, 19]) INST.strings(h, r + k, 3.6, 1);
        taiko(h, true, 1.4); crash(h, 1.2); drone(h, r - 24, 3.5);
        const done = cur; if (typeof setTimeout === 'function') setTimeout(() => fadeBus(done, 2.5), 6500);
    }
    function defeat(T, t){
        cur = makeBus(1);
        const r = T.root + 12;
        for (const k of [0, 3, 7]) INST.choir(t, r + k, 4, 1);
        for (const [i, k] of [7, 5, 3, 0].entries()) INST.strings(t + i * .9, r + 12 + k, 1.2, .9);
        drone(t, r - 24, 5); taiko(t, true, 1.2);
        const done = cur; if (typeof setTimeout === 'function') setTimeout(() => fadeBus(done, 3), 7000);
    }

    // ---------------- following the game ----------------
    function bossIndex(b){
        if (typeof abyss !== 'undefined' && b === abyss.boss) return b.index;
        try { return [boss, ethernaty1, dragon, solarDevourer, twoFacedDemon].indexOf(b); } catch (e) { return -1; }
    }
    function levelOf(b){
        const f = b.maxHp ? b.hp / b.maxHp : 1;
        const hpLevel = f > .75 ? 0 : f > .5 ? 1 : f > .25 ? 2 : 3;
        const phaseLevel = typeof abyss !== 'undefined' && b === abyss.boss ? (b.phase || 1) - 1 : 0;
        return Math.min(3, Math.max(hpLevel, phaseLevel));
    }
    function target(){
        if (typeof currentClass === 'undefined' || !currentClass) return { key:'calm', level:0 };
        if (typeof gameOver !== 'undefined' && gameOver) return { key:'defeat', level:0 };
        const b = typeof activeBoss === 'function' ? activeBoss() : null, i = b ? bossIndex(b) : -1;
        if (i >= 0 && THEMES[i]){ lastBossObj = b; return { key:i, level:levelOf(b) }; }
        if (typeof themeKey === 'number' && lastBossObj && lastBossObj.hp <= 0) return { key:'victory', level:0 };
        if (themeKey === 'victory' && ctx.currentTime < holdUntil) return { key:'victory', level:0 };
        return { key:'calm', level:0 };
    }
    function switchTo(tg){
        const prev = theme || THEMES[0];
        fadeBus(bus, 1.8); bus = null; theme = null;
        themeKey = tg.key; lastLevel = tg.level; step = 0; nextTime = ctx.currentTime + .08;
        if (tg.key === 'victory'){ victory(prev, nextTime); holdUntil = nextTime + 5.5; return; }
        if (tg.key === 'defeat'){ defeat(prev, nextTime); return; }
        theme = typeof tg.key === 'number' ? THEMES[tg.key] : CALM;
        bus = makeBus(theme.gain || 1); cur = bus;
        if (!theme.calm) impact(theme, nextTime);
    }
    function pump(){
        if (!ctx || ctx.state === 'closed') return;
        try {
            const tg = target();
            if (tg.key !== themeKey) switchTo(tg);
            const d = (typeof paused !== 'undefined' && paused) || (typeof journalOpen !== 'undefined' && journalOpen);
            if (d !== duck){ duck = d; applyVolume(); }
            if (!theme) return;
            const lv = tg.level || 0;
            if (lv > lastLevel && !theme.calm){ cur = bus; impact(theme, Math.max(nextTime, ctx.currentTime + .03)); }
            lastLevel = lv;
            if (nextTime < ctx.currentTime - .3) nextTime = ctx.currentTime + .05;
            while (nextTime < ctx.currentTime + LOOKAHEAD){ playStep(theme, step, nextTime, lv); nextTime += stepDur(theme, lv); step++; }
        } catch (e) {
            if (!lastError){ lastError = String(e && e.stack || e); if (typeof console !== 'undefined') console.warn('Boss music error', e); }
        }
    }

    function unlock(){
        if (!init()) return false;
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        if (!timer && typeof setInterval === 'function') timer = setInterval(pump, 25);
        return true;
    }
    // Renders one theme into an OfflineAudioContext, for checking the mix.
    // Notes are scheduled in half-second chunks, as in live play, so the
    // render cost matches what the game asks of the browser.
    function renderTheme(offline, key, level, seconds){
        init(offline);
        theme = key === 'calm' ? CALM : THEMES[key]; themeKey = key;
        bus = makeBus(theme.gain || 1); cur = bus; step = 0; nextTime = .05;
        if (!theme.calm) impact(theme, nextTime);
        const T = theme, b = bus, end = seconds - 2;
        const schedule = until => { cur = b; while (nextTime < Math.min(until, end)){ playStep(T, step, nextTime, level); nextTime += stepDur(T, level); step++; } };
        schedule(.5 + LOOKAHEAD);
        for (let s = .5; s < end; s += .5) offline.suspend(s).then(() => { schedule(s + .5 + LOOKAHEAD); offline.resume(); });
        return offline.startRendering();
    }

    return {
        unlock, pump, renderTheme, themes:THEMES, calm:CALM,
        setVolume(v){ prefs.volume = Math.min(1, Math.max(0, Number(v) || 0)); if (prefs.volume > 0) prefs.muted = false; savePrefs(); applyVolume(); },
        toggleMute(){ prefs.muted = !prefs.muted; savePrefs(); applyVolume(); return prefs.muted; },
        visibility(hidden){ if (!ctx) return; if (hidden && ctx.suspend) ctx.suspend(); else if (!hidden && ctx.resume) ctx.resume(); },
        state(){ return { key:themeKey, level:lastLevel, step, muted:prefs.muted, volume:prefs.volume, error:lastError, name:theme ? theme.name : null }; }
    };
})();

if (typeof window !== 'undefined' && window.addEventListener){
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => bossMusic.unlock(), { passive:true });
    window.addEventListener('keydown', e => {
        if (e.code !== 'KeyM' || e.repeat || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target && e.target.tagName)) return;
        const muted = bossMusic.toggleMute();
        if (typeof showMessage === 'function') showMessage(muted ? '🔇 Music muted · M' : '🎵 Music on · M');
    });
}
if (typeof document !== 'undefined'){
    if (document.addEventListener) document.addEventListener('visibilitychange', () => bossMusic.visibility(document.hidden));
    const musicSlider = document.getElementById && document.getElementById('musicVolume');
    if (musicSlider){
        musicSlider.value = String(Math.round(bossMusic.state().volume * 100));
        musicSlider.addEventListener('input', e => { bossMusic.setVolume(Number(e.target.value) / 100); bossMusic.unlock(); });
    }
}
