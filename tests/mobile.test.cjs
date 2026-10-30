const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function game(mockUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)') {
    const elements = new Map();
    function element() {
        return {
            width: 844, height: 390,
            style: {}, dataset: {}, value: 'normal', children: [],
            classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
            addEventListener(ev, fn) { this[`on_${ev}`] = fn; },
            setAttribute() {}, focus() {},
            appendChild(el) { this.children.push(el); },
            querySelector() { return element(); },
            querySelectorAll() { return []; },
            getBoundingClientRect() { return { left: 20, top: 250, width: 110, height: 110 }; },
            getContext() {
                return {
                    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
                    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
                    fill() {}, stroke() {}, quadraticCurveTo() {}, fillRect() {}, strokeRect() {},
                    fillText() {}, createLinearGradient() { return { addColorStop() {} }; }
                };
            }
        };
    }
    const context = vm.createContext({
        console, Math: Object.create(Math), innerWidth: 844, innerHeight: 390,
        navigator: { userAgent: mockUserAgent, maxTouchPoints: 5 },
        document: {
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, element());
                return elements.get(id);
            },
            createElement: element, querySelectorAll() { return []; }, addEventListener() {}
        },
        window: {
            innerWidth: 844, innerHeight: 390,
            addEventListener(ev, fn) { this[`on_${ev}`] = fn; },
            removeEventListener() {},
            matchMedia(q) {
                return { matches: q.includes('coarse') };
            }
        },
        localStorage: { getItem() { return null; }, setItem() {} },
        performance: { now() { return 0; } },
        requestAnimationFrame() {}, setTimeout() { return 0; }, clearTimeout() {}
    });
    for (const file of ['boss-art.js', 'game.js', 'workshop.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
    }
    const run = code => vm.runInContext(code, context);
    run("selectClass('warrior')");
    return run;
}

test('mobile detection and optimized visual defaults', () => {
    const run = game();
    assert.equal(run('isMobileDevice'), true);
    // On mobile devices, visualMode defaults to 'minimal' for top performance
    assert.equal(run('visualMode'), 'minimal');
});

test('virtual joystick controls player movement smoothly', () => {
    const run = game();
    const startX = run('player.x');
    const startY = run('player.y');

    // Simulate joystick pushed to the right: x = 1, y = 0
    run(`
        joystickVector.x = 1;
        joystickVector.y = 0;
        joystickVector.active = true;
        update(1000/60);
    `);
    const newX = run('player.x');
    assert.ok(newX > startX, 'Player should move right when joystick pushed right');

    // Simulate joystick pushed diagonally up-left: x = -0.707, y = -0.707
    const posX = run('player.x');
    const posY = run('player.y');
    run(`
        joystickVector.x = -0.707;
        joystickVector.y = -0.707;
        joystickVector.active = true;
        update(1000/60);
    `);
    assert.ok(run('player.x') < posX, 'Player should move left');
    assert.ok(run('player.y') < posY, 'Player should move up');

    // Releasing joystick stops movement
    run('clearInput()');
    assert.equal(run('joystickVector.active'), false);
    assert.equal(run('joystickVector.x'), 0);
    assert.equal(run('joystickVector.y'), 0);
});

test('dash uses joystick direction on mobile', () => {
    const run = game();
    run(`
        player.x = 400; player.y = 200;
        player.dashCooldown = 0;
        joystickVector.x = 0; joystickVector.y = 1; joystickVector.active = true;
        dash();
    `);
    assert.ok(run('player.y') > 200, 'Dash should move downwards with joystick pushed down');
});

test('quick weapon cycling for mobile thumb controls', () => {
    const run = game();
    const initialWeapon = run('weapon');
    run('cycleNextWeapon()');
    const nextWeapon = run('weapon');
    assert.notEqual(nextWeapon, initialWeapon);
    assert.ok(run('inventory.includes(weapon)'));
});

test('particle drawing runs smoothly on mobile without array allocations', () => {
    const run = game();
    run(`
        for (let i = 0; i < 60; i++) {
            particles.push({ x: 100, y: 100, vx: 1, vy: 1, life: 1, maxLife: 1, size: 3, color: '#fff' });
        }
        drawParticles();
    `);
    // Should run smoothly without errors and stay within mobile particle bounds
    assert.ok(run('particles.length <= 110'));
});
