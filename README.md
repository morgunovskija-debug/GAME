# Boss Rush

A browser Canvas game: four classes, thirteen bosses across thirteen locations, twenty-three weapons, artifacts and crafting.

## Running

Open `index.html` in a modern browser, or serve the project folder:

```sh
python3 -m http.server 8000
```

Then go to http://localhost:8000 and choose a class.

For Vercel deployment, `npm run build` copies the static site into `public`, the configured deployment output directory.

## Files

- `index.html` — screens and interface elements.
- `css/styles.css` — styling and responsive menus.
- `js/game.js` — simulation, the first five bosses, weapons, controls and the best-run record.
- `js/boss-art.js` — procedural Canvas models and animations for the first five bosses.
- `js/workshop.js` — summon panel, materials and crafting.
- `js/abyss.js` — the four hard bosses, their locations and lore, three new weapons, and the animation layers for the player, weapons and bosses.
- `js/mythic.js` — the three mythic bosses, their arenas, attacks, weapons and artifacts.
- `js/god.js` — The Idol, the final boss: its arena, nine attacks, model, reward weapon and artifact.
- `js/tutorial.js` — the skippable tutorial that runs before the first fight.
- `js/music.js` — the cinematic boss score, generated live with the Web Audio API.
- `assets/fantasy-atlas.png` — 12 generated illustrations.

## Controls

WASD or arrow keys to move. Left mouse button attacks toward the cursor. Space dashes. Use 1–9, 0, Q, Z, F or click the weapon bar to switch weapons. I opens artifacts, R teleports to your cursor with the Rift Step accessory, H heals, M mutes the music, Esc pauses and B opens the Boss Codex. Mobile devices get a virtual joystick and action buttons.

Healing restores 30% of maximum HP and has a 22 second cooldown. Run time only counts during play. The fastest full victory is stored in this browser's localStorage. The game works without storage if it is unavailable.

## Tutorial

After you choose a class, a short tutorial plays before the first boss wakes up. It has five steps:

1. **Move** with WASD or the arrow keys (the joystick on mobile) onto two glowing markers.
2. **Attack** a training crystal 3 times with the left mouse button (FIRE on mobile).
3. **Dash** twice with Space (DASH on mobile).
4. **Dash through an attack**: for a split second during a dash nothing can hurt you, so dash through a sweeping wall of light as it reaches you. The practice wall does no damage, and it comes back if your timing is off.
5. **Heal** with H (❤️ on mobile). Healing restores 30% of max HP and then recharges for 22 seconds.

Press **Skip tutorial** or **K** to skip it at any time. The King of Adaptation waits off stage until the tutorial ends. The tutorial does not count toward the run timer, and you start the fight at full HP with heal ready. It plays automatically the first time. After that, tick **Play the tutorial first** on the class screen to play it again.

## Practice mode

Enable **Practice mode** on the class selection screen to save a checkpoint at the start of the run and after every boss victory. If you die, **Respawn at checkpoint** restores your class, equipment, rewards, and boss unlocks to the most recent checkpoint so you can continue from the summon panel. Practice checkpoints last for the current run; restarting starts a fresh run.

## Bosses and locations

| # | Boss | Location | Drops |
| --- | --- | --- | --- |
| 1 | The King of Adaptation | Shrine of the Eight Spokes | Laser Blade, Shadow Staff, Fang of the King |
| 2 | Ethernaty | The Prismatic Void | Rainbow Blade, Prismatic Staff, Ethernaty Core |
| 3 | Fire Destroyer | Caldera of Ashfall | Ashen Blade, Magma Staff, Dragon Heart |
| 4 | Solar Devourer | The Sunken Sun Pit | Solar Core |
| 5 | Two-Faced Demon | Gate of Two Faces | Demon Staff, Cursed Core |
| 6 | Selene Vey (hard) | The Drowned Observatory | Lunar Glaive, Moon Tear |
| 7 | Vael'Khor (hard) | The Shattered Glacier of Hrim | Frostbite Lance, Frost Crown |
| 8 | Horologue (hard) | The Clock Spire at World's End | Chrono Scepter, Stopped Hourglass |
| 9 | The Glitch (hard) | The Null Sector | Null Blaster, Null Core |
| 10 | Kaelthar (mythic) | The Colosseum of the Black Sun | Eclipse Edge, Eclipse Sigil |
| 11 | Nyxara (mythic) | The Stormspire Above the Clouds | Tempest Bow, Storm Feather |
| 12 | The Architect (mythic) | The First Page | Genesis Codex, Architect's Quill |
| 13 | The Idol (divine) | The Throne Beyond Heaven | Verdict of Heaven, Eye of the Arbiter |

The Boss Codex (B) holds the lore for every boss and location. Each fight opens with a title card naming the location.

### Hard bosses

The hard bosses unlock in the summon panel after the Two-Faced Demon falls, one after another. Each has its own phases and mechanics:

- **Selene Vey** throws returning crescents and calls moonfall strikes and gravity wells. In later phases she adds an eclipse that darkens the arena outside a circle around you, spiral tides, and twin rotating tidal beams.
- **Vael'Khor** fires ice lance volleys and frost spike lines, and slams avalanche rings that each have one gap. In later phases he adds a slowing blizzard, a glacial prison of converging icicles, and shatter novas.
- **The Glitch** has 100,000 HP and four phases, and every hit it lands deals 400 damage. It teleports constantly and leaves afterimages. It throws glitch bones, some of which curve toward you, and summons skull blasters that lock on and fire beams. It also leaves corrupted zones, rains cubes from portals, and runs an error barrage of teleport volleys. In phase three it charges a NULL BEAM. At 25% HP it enters SYSTEM FAILURE. At 10% it fires a final tracking NULL BEAM, then reboots and takes 50% more damage for a few seconds.
- **Horologue** fires ticking spirals and sweeps two clock-hand beams, then sends gears rolling across lanes. In later phases he adds a time stop that freezes bolts and then turns them toward you, a rewind teleport that leaves an exploding afterimage, and midnight, twelve strikes in clock order around you.

### Mythic bosses

The mythic bosses unlock one after another once The Glitch falls. Each one has eight attacks across its phases and a desperation move near death. Surviving that move staggers the boss, and it takes 50% more damage while it recovers.

- **Kaelthar, the Eclipse Knight** (130,000 HP) is a duelist. Glowing lanes show where he will dash, and his path erupts behind him. He throws crescent waves, carves a cross of beams through your position and leaps into a sunfall slam with shockwave rings. Later he adds a thousand falling swords with a gap in each wave, shadow clones that dash through you, a corona of spiralling orbs and a total eclipse full of dashes. At 15% HP he raises the black sun: four rotating beams, rings and orb spirals.
- **Nyxara, the Storm Seraph** (160,000 HP) is a six-winged angel. She throws locking thunder spears, sweeps or hunts you with lightning pillars and fans out feather storms. Later she adds roaming tornadoes that pull you in, a checkerboard judgment grid, storm dives and ball lightning that bursts when it fades. Her tempest calls lightning around you. At 12% HP she calls the Wrath of Heaven, two lightning walls that sweep the arena, each with one gap.
- **The Architect, Author of the Trials** (220,000 HP, four phases) wrote every arena. It fires lattice lines in sets, orbiting polygon volleys and a rotating divine compass. Later it replays its creations' attacks in gold ink: Moonfall, Avalanche, Frost Spikes, Gear Avalanche, Midnight and Glitch Bones. It also draws blueprint stars, a golden-angle spiral and margins that close in on the arena, and it splits into decoys. At 10% HP it writes the Final Page, which combines all of it.

### The Idol

The Idol unlocks after The Architect falls. It has **10,000,000 HP**, its hits deal a 6.25× damage multiplier (the mythic bosses use 4–5×), and it has four phases: Genesis, Revelation, Judgement and Apotheosis. Its nine attacks come from a shuffled deck: every cycle uses each attack once in a new random order, and the same attack never comes twice in a row. Later phases add more waves, sparks and clones.

- **Judgement Beam**: a colossal column of light pours down the centre of the arena. Get to the sides.
- **Glitch Lasers**: three corrupted emitters lock on and fire in turn. Dodge them, or hold the **Infinity Edge** beam between you and a laser to block it.
- **Heaven Cleaver**: huge crescent slashes carve lines across the arena. Each one tracks you, then locks just before it falls.
- **Stilled Heavens**: a swarm of orbs, blades, stars, lances and eyes spreads out while a giant bronze clock appears in the sky, its hands racing. Then the clock stops: time freezes, every shot stops on the same tick, the arena goes cold and the Idol freezes mid-motion. When time resumes, the hands spin backwards, the clock shatters, and every shot aims at you and launches.
- **Divine Winter**: a blizzard slows you while huge icicles burst out of the ground beneath you.
- **Storm at World's Edge**: lightning crawls along every edge and strikes everywhere outside a safe circle in the middle.
- **Sundering**: one cut splits the arena in half, and the half you were standing on falls into the void. Cross the cut.
- **Heaven's Mirror**: golden walls close in on the arena while mirror clones outside them join The Idol's volleys.
- **Seraph Choir**: burning seraphs at the edges follow your height, stop following, then fire flaming lasers across the arena.

It descends in a pillar of light. Each new phase floods the arena with a burst of light and cracks its face and halo. The sky turns blood amber in the final phase. Big impacts shake the camera, except in Minimal effects mode.

### New weapons and artifacts

- **Lunar Glaive** (melee) throws two glaives that hit on the way out and on the way back.
- **Frostbite Lance** (ranged) fires a fast lance that shatters into ice shards on impact.
- **Chrono Scepter** (magic) gathers five clock orbs around you, then launches them as homing bolts.
- **Null Blaster** (magic) fires an instant null ray that hits the first boss along your aim.
- **Eclipse Edge** (melee) sends a black crescent wave that passes through and strikes once.
- **Tempest Bow** (ranged) fires three arrows. The first to land calls a lightning bolt on the target.
- **Genesis Codex** (magic) throws a glyph seed that detonates into a hexagram and three homing sparks.
- **Eclipse Sigil** gives +25% damage for 2.5 seconds after a dash.
- **Storm Feather** gives +10% movement speed. Every 5th attack calls lightning on the boss for 150% of your weapon damage.
- **Architect's Quill** gives +20% damage and reduces damage taken by 15%.
- **Verdict of Heaven** (magic) throws a piercing spear of light that calls down a pillar of judgement where it stops.
- **Eye of the Arbiter** gives +30% damage and reduces damage taken by 20%.
- **Ascendant Halo** is crafted from one material of each mythic boss. Healing restores 40% of max HP and recharges 35% faster.
- **Null Core** gives +12% damage and makes dash recharge 15% faster.
- **Moon Tear** makes dash recharge 25% faster.
- **Frost Crown** grants immunity to the blizzard chill and reduces damage taken by 10%.
- **Stopped Hourglass** saves you from one lethal hit per fight.
- **Starforged Compass** is crafted from one material of each hard boss and gives +15% damage and +15% movement speed.
- **Rift Step** is crafted from the Corrupted Fragment that The Glitch drops. Press R to teleport to your cursor, with a 3 second cooldown.

## Crafting and boss summons

After the first boss victory, use **E** or the **Summon panel** to choose a fight. Defeating a boss unlocks the next, and defeated bosses can be fought again.

Defeat the Two-Faced Demon to enter the crafting sanctuary with an accessory station, a weapon station and the summon panel. Materials go directly into your inventory, with an independent **10%** roll for each listed drop on every kill:

| Boss | Material and crafted equipment |
| --- | --- |
| The King of Adaptation | Broken Wheel for the Adaptation Wheel, Handle for the Handblade |
| Ethernaty | Rainbow Triangle and Energy Sphere for the Plasma Crystal |
| Fire Destroyer | Inactive Eternal Flame for the Eternal Flame |
| Solar Devourer | Broken Shield Piece for the Solar Shield |
| Two-Faced Demon | Lightning Fragment for Kumatoke |
| Selene Vey, Vael'Khor, Horologue | Hollow Moon Shard, Everfrost Shard and Broken Mainspring for the Starforged Compass |
| The Glitch | Corrupted Fragment for the Rift Step |
| Kaelthar, Nyxara, The Architect | Black Sun Fragment, Thunderhead Plume and Blank Page for the Ascendant Halo |

Crafted accessories use the five artifact slots. Press **I** to equip them when your slots are full. Materials, crafted items and boss unlocks last for the current run.

## Music

Every boss has its own cinematic theme, synthesized live with the Web Audio API, so the game needs no audio files. The score is built from string pads, choir, brass, war drums, braams and a hall reverb. Each boss adds its own colour:

| Boss | Theme |
| --- | --- |
| The King of Adaptation | Japanese pentatonic, shakuhachi lead, a metal clang for the wheel |
| Ethernaty | Bright lydian choir and harp arpeggios under starlight bells |
| Fire Destroyer | Galloping phrygian strings and brass stabs |
| Solar Devourer | Harmonic minor with a pulsing sub bass |
| Two-Faced Demon | Pipe organ, choir and tolling bells |
| Selene Vey | Slow choir, harp and moonlit bells |
| Vael'Khor | Heavy brass over icy shimmer |
| Horologue | A clockwork string ostinato, ticking clocks and organ |
| The Glitch | Fast square-wave arpeggios, stutters, bit-crushed noise and tape stops |
| Kaelthar | A galloping harmonic-minor march with war horns, anvil strikes and timpani |
| Nyxara | A fast dorian storm with soaring strings, rolling thunder and harp arpeggios |
| The Architect | A finale for organ, choir and brass that quotes the earlier bosses' leitmotifs on bells |
| The Idol | A hijaz-scale hymn for brass, war horns, organ and a high choir, with timpani, heavenly anvils, thunder and cascading bells |

Each theme is arranged like a film trailer cue over a driving octave bass and string ostinatos. It runs through a verse, then a chorus with the melody, brass stabs and a backbeat. Next comes a breakdown where the drums drop out under choir and bells, then a build-up with a snare roll and a riser, and finally a drop that hits with a braam, a crash and a sub boom.

The music also grows with the fight. Each quarter of boss health, or each new phase for the hard bosses, raises the intensity:

1. Verse and chorus with war drums, bass and the melody.
2. Choir, brass stabs and sixteenth-note strings.
3. The melody throughout, braams and doubled brass.
4. A non-stop chorus with a drum on every beat and the fastest tempo.

Every rise opens with a drum and braam impact. A kill ends in a victory fanfare, a defeat in a fading choir, and the sanctuary has a calm theme.

Music starts on the first click or key press, as browsers require. The **Music** slider sets the volume and **M** mutes. Pausing or opening the codex lowers the score. The settings are kept in localStorage.

## Balance changes

- **Magma Staff** damage rises from 77 to 150. It was the weakest weapon of its tier, at about a third of the Ashen Blade from the same boss.
- **Demon Staff** damage rises from 76 to 240. As the fifth boss's reward it was weaker than the third boss's Ashen Blade.
- **Lunar Glaive** damage rises from 280 to 360. It was the weakest hard-boss weapon.
- **Null Blaster** damage rises from 2,700 to 3,200, so the hardest hard boss's reward beats the Chrono Scepter.
- **Selene Vey** hits 4× instead of 5×. Her Moonfall took a third of your HP, a big jump right after the Demon.

## Animation and comfort

Every model is drawn with Canvas geometry and animated from simulation time, so pausing freezes every pose.

- **Player**: walking steps, a cloak that trails your movement, breathing, class details, hit recoil, dash afterimages and a rotating protection ring.
- **Weapons**: melee weapons wind back and sweep with a trail. Ranged weapons recoil with a muzzle ring. Magic weapons raise and cast a rune circle. Channeled weapons hum while held.
- **Bosses**: every summon opens a portal. Phase changes send out a pulse. Early bosses below 25% HP gain an orbiting ember aura. Defeated bosses dissolve from the bottom up as ash and a rising light.

The **Effects** switch offers Calm or Minimal. Neither mode uses camera shake, full-screen flashes or player flicker. Minimal removes glow and ambient particles. Warnings, projectiles and hazards stay visible in both modes, including during the eclipse.

## Tests

Run the tests with Node.js:

```sh
npm test
```

The tests cover crafting, mobile controls, the demon's drops, and every hard boss through all of its phases, including THE GLITCH's final NULL BEAM, with all draw code executed. The mythic tests run every attack and desperation move of the three mythic bosses on a strict canvas stand-in that rejects negative radii and invalid gradients, and check their weapons, artifacts and the balance values. A stand-in audio context drives the music through every boss theme, level, victory and defeat.
