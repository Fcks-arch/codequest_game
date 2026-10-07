  import React, { useRef, useEffect, useState, useCallback } from 'react'
  import { runCodeInWorker, terminateCodeWorker } from '../utils/runCodeInWorker'
  import pipIdleSrc from '../assets/pip-idle.png'
  import { C } from './UI'

  /*
  ┌─────────────────────────────────────────────────────────────┐
  │  ASSET SLOTS                                                 │
  │                                                               │
  │  characterIdle/Walk/Run/Jump/Land each point to a sprite     │
  │  SHEET — multiple animation frames side-by-side in one PNG,  │
  │  not a single pose. FRAME_DATA below records the exact pixel │
  │  rect (x, y, w, h) of every frame in every sheet, so drawScene│
  │  can cut out and draw just one frame at a time instead of    │
  │  squashing the whole strip into the character's bounding box.│
  │                                                               │
  │  If you swap in new art:                                     │
  │  1. Put the file in client/public/assets/ (no spaces in the  │
  │     filename — spaces break image URLs in the browser).      │
  │  2. Re-measure its frames with process_sprites.py (also in   │
  │     this folder) and update FRAME_DATA to match.             │
  │  3. Keep files reasonably small — a sheet should be tens to   │
  │     a few hundred KB, not multiple MB.                       │
  └─────────────────────────────────────────────────────────────┘
  */
  const DEFAULT_ASSETS = {
    characterIdle: pipIdleSrc,
    characterWalk: '/assets/pip-walking.png',
    characterRun:  '/assets/pip-running.png',
    characterJump: '/assets/pip-jumping.png',
    characterLand: '/assets/pip-landing.png',
    background:    '/assets/landscapes/terrain1.jpg',
    groundTile:    null,  // '/assets/tile.png'
    flagSprite:    null,  // '/assets/flag.png'
    golemSprite:   '/assets/golem.png',
    gateSprite:    '/assets/gate.png',
    fireSprite: null,
    bgMusic:       '/assets/music/bgmusic.mp3',
    sfxJump:       null,
    sfxCorrect:    null,
    sfxComplete:   null,
  }
  const FALLBACK_BACKGROUND = '/assets/background.png'

  // Pixel rects of each frame within its sheet — measured directly from the
  // actual artwork (each frame's real non-transparent bounding box), not
  // guessed. Earlier hand-typed values only recorded x/w and assumed the
  // character filled the sheet's full height; in practice these sheets have
  // a lot of blank margin, so that made Pip float above the ground and, in
  // a couple of sheets, slice partway into the neighboring pose. Re-measure
  // with process_sprites.py (kept alongside this component) if you swap in
  // new art.
  //
  // Two sheets also had a real CONTINUITY problem, not just a measurement
  // one: pip-idle.png's 3rd frame is an unrelated arms-crossed/no-sword
  // pose sandwiched between near-identical standing frames, and
  // pip-walking.png's last 4 frames barely move and suddenly show a drawn
  // sword. Looping through every frame in sheet order made the sword pop
  // in and out once per cycle — that's the "different poses" popping the
  // earlier fix didn't catch, since it's a sequencing problem, not a crop
  // one. Both are trimmed below to just the frames that form one coherent,
  // continuous motion.
  const FRAME_DATA = {
    characterIdle: [
      { x: 43,   y: 213, w: 185, h: 309 }, { x: 266,  y: 213, w: 186, h: 309 },
      { x: 490,  y: 213, w: 164, h: 309 }, { x: 713,  y: 213, w: 171, h: 309 },
      { x: 939,  y: 213, w: 188, h: 309 }, { x: 1164, y: 213, w: 190, h: 309 },
      { x: 1395, y: 213, w: 185, h: 309 }, { x: 1623, y: 213, w: 189, h: 309 },
      { x: 1853, y: 213, w: 147, h: 309 },
    ],
    characterWalk: [
      { x: 92,   y: 378, w: 138, h: 236 }, { x: 240,  y: 378, w: 140, h: 236 },
      { x: 389,  y: 378, w: 139, h: 236 }, { x: 537,  y: 378, w: 136, h: 236 },
      { x: 679,  y: 378, w: 144, h: 236 },
    ],
    characterRun: [
      { x: 0,    y: 200, w: 224, h: 313 }, { x: 246,  y: 200, w: 229, h: 313 },
      { x: 486,  y: 200, w: 218, h: 313 }, { x: 717,  y: 200, w: 248, h: 313 },
      { x: 969,  y: 200, w: 228, h: 313 }, { x: 1207, y: 200, w: 251, h: 313 },
      { x: 1469, y: 200, w: 247, h: 313 }, { x: 1726, y: 200, w: 229, h: 313 },
      { x: 1954, y: 200, w: 229, h: 313 },
    ],
    // pip-jumping.png and pip-running.png were swapped for different art at
    // some point and their old rects pointed at fully transparent regions of
    // the new sheets — that's why Pip vanished for the whole jump and only
    // reappeared on landing. These rects were re-measured from the current
    // files. The jump sheet's first two poses touch (no clean pixel gap), so
    // they're split at the column-density minimum between them; the running
    // sheet's last six poses overlap, so they're cut into equal slices and
    // each slice's true bounding box measured.
    characterJump: [
      { x: 12,   y: 378, w: 331, h: 252 }, { x: 343,  y: 334, w: 219, h: 293 },
      { x: 588,  y: 330, w: 240, h: 282 }, { x: 832,  y: 310, w: 219, h: 292 },
      { x: 1064, y: 312, w: 233, h: 291 }, { x: 1299, y: 332, w: 221, h: 282 },
    ],
    characterLand: [
      { x: 62,   y: 0,  w: 177, h: 215 }, { x: 326,  y: 28, w: 187, h: 187 },
      { x: 568,  y: 58, w: 229, h: 156 }, { x: 859,  y: 74, w: 213, h: 141 },
      { x: 1163, y: 3,  w: 170, h: 212 }, { x: 1471, y: 6,  w: 156, h: 209 },
    ],
  }
  // Frames advance roughly this many times per second while animating.
  const FPS = { characterIdle: 6, characterWalk: 15, characterRun: 14, characterJump: 10, characterLand: 14 }
  // Sheet layout constants for pip-walking.png.
  const WALK_SHEET_COLS = 6
  // pip-walking.png is 2170x725. Per-frame boxes measured from the art (x, y, w, h),
  // plus hx = head centre measured from the box's left edge. Anchoring on the head
  // and on each frame's own feet stops the sprite sliding/hopping inside its cell.
  const WALK_SHEET_REF = { w: 2170, h: 725 }
  const WALK_FRAMES = [
    { x: 62,   y: 34,  w: 232, h: 328, hx: 136 }, // 1  sword
    { x: 416,  y: 34,  w: 274, h: 322, hx: 190 }, // 2
    { x: 793,  y: 16,  w: 274, h: 337, hx: 183 }, // 3
    { x: 1163, y: 32,  w: 279, h: 328, hx: 179 }, // 4  sword
    { x: 1542, y: 33,  w: 260, h: 319, hx: 143 }, // 5  sword
    { x: 1866, y: 33,  w: 276, h: 322, hx: 177 }, // 6  sword
    { x: 46,   y: 362, w: 257, h: 332, hx: 155 }, // 7  sword
    { x: 416,  y: 364, w: 274, h: 330, hx: 190 }, // 8
    { x: 806,  y: 362, w: 248, h: 329, hx: 152 }, // 9
    { x: 1162, y: 365, w: 288, h: 329, hx: 177 }, // 10 sword
    { x: 1527, y: 364, w: 253, h: 327, hx: 161 }, // 11
    { x: 1887, y: 365, w: 240, h: 329, hx: 156 }, // 12
  ]
  // Only the frames where the sword is drawn (0-based). For all 12 use [0,1,2,3,4,5,6,7,8,9,10,11].
  const WALK_FRAME_ORDER = [0, 3, 4, 5, 6, 9]
  const WALK_REF_H = 328                 // figure height in the sheet, so walk Pip is 77px like idle
  const WALK_CYCLE_IN_PIP_HEIGHTS = 1.0  // ground covered by one full loop; tune by eye
  const WALK_SHEET_ROWS = 2
  const TOTAL_WALK_FRAMES = 12
  // The idle sheet contains nine horizontal poses. Keep the source order so
  // every supplied pose is shown once per idle cycle.
  const IDLE_FRAME_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  // Running poses have slightly different tight widths. Draw them inside one
  // stable box so Pip does not appear to change size or snap sideways each frame.
  const RUN_FRAME_BOX = { w: 229, h: 313 }
  // Every pose/frame is scaled relative to THIS frame's width, instead of
  // each frame being independently stretched to fill a fixed box. That
  // matters because these frames aren't uniform aspect ratio — an idle
  // frame with arms tucked in is ~15% narrower than the others, and a
  // mid-jump frame is nearly 2x wider-than-tall compared to the takeoff
  // frame. Stretching each one to the same fixed width on its own inflates
  // or shrinks its height to compensate, which read as Pip pulsing in size
  // every frame (idle) or shrinking small enough to nearly vanish (jump).
  // Scaling every frame by the same factor lets width and height both vary
  // naturally with the actual pose, the way the source art intends.
  const SPRITE_REF_W = FRAME_DATA.characterIdle[0].w // eslint-disable-line no-unused-vars

  const imageCache = {}
  function loadImg(src) {
    if (!src) return Promise.resolve(null)
    if (imageCache[src]) return Promise.resolve(imageCache[src])
    return new Promise(res => {
      const img = new Image()
      img.onload  = () => {
        if (img.complete && img.naturalWidth > 0) {
          imageCache[src] = img
          res(img)
        } else {
          res(null)
        }
      }
      img.onerror = () => res(null)
      img.src = src
    })
  }

  let bgAudio = null
  const DEFAULT_MUSIC_VOLUME = 0.35

  export function setBgMusicVolume(value) {
    const volume = Math.max(0, Math.min(1, Number(value) || 0))

    if (bgAudio) {
      bgAudio.volume = volume
    }

    if (window && window._cqAudio) {
      window._cqAudio.volume = volume
    }

    return volume
  }

  function unlockBgMusicOnUserGesture() {
    if (!bgAudio) return
    bgAudio.play().catch(() => {})
  }

  export function startBgMusic() {
    if (!DEFAULT_ASSETS.bgMusic) return

    if (!bgAudio) {
      bgAudio = new Audio(DEFAULT_ASSETS.bgMusic)
      bgAudio.loop = true
      bgAudio.volume = DEFAULT_MUSIC_VOLUME
      window._cqAudio = bgAudio

      if (typeof document !== 'undefined') {
        document.addEventListener('pointerdown', unlockBgMusicOnUserGesture, { once: true })
        document.addEventListener('keydown', unlockBgMusicOnUserGesture, { once: true })
      }
    }

    if (window._cqAudio) {
      window._cqAudio.volume = DEFAULT_MUSIC_VOLUME
    }

    bgAudio.play().catch(() => {})
  }

  export function stopBgMusic() {
    bgAudio?.pause()
    if (window && window._cqAudio) {
      window._cqAudio.pause()
    }
  }

  function playSfx(src) {
    if (!src) return
    try { new Audio(src).play() } catch(_) {}
  }

  const DEFAULT_TILE_COUNT = 10
  /* Movements of this many tiles or more in a single moveRight() call
    use the "run" pose instead of "walk" — a bit of visual variety
    without needing a separate game command. */
  const RUN_THRESHOLD = 3

  /* Default surface row used when a lesson does not provide ground_fraction.
    (as a fraction of the image's full natural height) where the painted
    grass path begins. The art has its own baked-in ground, so instead of
    guessing at a scale/position we solve for whichever puts that exact
    row under Pip's feet — see the background-drawing block below. If
    you swap in a different background image, re-measure this (the top
    edge of its walkable grass strip, as a fraction of total image
    height) or the ground may float or sink relative to the character. */
  const TERRAIN1_BRIDGE_FRACTION = 0.655
  const BG_GRASS_FRACTION = TERRAIN1_BRIDGE_FRACTION
  const TERRAIN1_TILE_SCALE = 1.16
  const TERRAIN1_MAX_VISUAL_TILE = 9.25
  const BASE_PIP_RENDER_WIDTH = 58
  const BASE_PIP_RENDER_HEIGHT = 77
  const pipRenderScaleForWidth = width =>
    width <= 600 ? 0.58 : width <= 820 ? 0.68 : width <= 1100 ? 0.78 : width <= 1366 ? 0.88 : 1
  const START_X = 50
  const WALK_SPEED = 1.2
  const GOLEM_DIALOGUE = 'Hello, Golem!'
  const GOLEM_FRAME_COUNT = 5
  const GOLEM_CORRECT_SNIPPET = 'System.out.println("Hello, Golem!");'
  const GOLEM_DORMANT = 'DORMANT'
  const GOLEM_WAKING = 'WAKING'
  const GOLEM_STANDING = 'STANDING'
  const LEVEL_TWO_CODE = 'int doorCode = 42;'
  const SHARED_START_FRACTION = 0.47
  const ENTRANCE_START_TILES = { 3: 0.5, 4: 0.5, 5: 1.0, 8: 2 }
  const GATE_FRAME_COUNT = 5
  const GATE_MAX_OPEN_FRAME = 3
  const GATE_SCALE = 1.0
  const DEBUG_GATE = false
  const GATE_VIS = { x0: 0.052, y0: 0.193, x1: 0.980, y1: 0.775 }
  const GATE_TARGET = { x0: 0.822, y0: 0.141, x1: 1.0, y1: 0.655 }
  const GOLEM_GAP = -8
  const GOLEM_PILLAR_LEFT_FRAC = 0.82
  const GATE_CONFIGS = {
    default: { asset: '/assets/gate.png', vis: GATE_VIS, target: GATE_TARGET },
  }
  const FIRE_FRAME_COUNT = 15 // eslint-disable-line no-unused-vars
  const FIRE_IGNITE_MS = 110
  const FIRE_LAST_GROW_FRAME = 14   // frame 14 is a full, unclipped flame (ends at x=2163 of 2172)
  const FIRE_FLICKER_FRAMES = [12, 13, 14, 13]
  const FIRE_FLICKER_MS = 120
  const FIRE_FRAMES = [
    { x: 35,   y: 503, w: 34,  h: 33  }, { x: 131,  y: 464, w: 42,  h: 76  },
    { x: 226,  y: 434, w: 69,  h: 113 }, { x: 349,  y: 412, w: 80,  h: 135 },
    { x: 476,  y: 378, w: 92,  h: 169 }, { x: 602,  y: 336, w: 108, h: 211 },
    { x: 744,  y: 308, w: 121, h: 239 }, { x: 900,  y: 291, w: 129, h: 256 },
    { x: 1049, y: 289, w: 133, h: 258 }, { x: 1202, y: 273, w: 136, h: 275 },
    { x: 1357, y: 258, w: 144, h: 290 }, { x: 1518, y: 249, w: 149, h: 299 },
    { x: 1681, y: 246, w: 151, h: 302 }, { x: 1844, y: 239, w: 155, h: 309 },
    { x: 2012, y: 239, w: 151, h: 309 },
  ]
  const FIRE_REF_H = 309            // tallest frame, so hFrac still means "full flame height"
  const FIRE_UNLIT = 'UNLIT'
  const FIRE_IGNITING = 'IGNITING'
  const FIRE_LIT = 'LIT'
  const LEVEL_THREE_CODE = 'int litLanterns = 0;'
  // Level 3: Pip stays put. This is how long the torches take to finish igniting.
  const LEVEL_THREE_DONE_DELAY_MS = FIRE_IGNITE_MS * FIRE_LAST_GROW_FRAME + 200
  const FIRE_CONFIGS = {
    3: {
      asset: '/assets/fire-ignite-level3.png',
      positions: [
        { xFrac: 0.287, yFrac: 0.53, hFrac: 0.10 },
        { xFrac: 0.443, yFrac: 0.53, hFrac: 0.10 },
        { xFrac: 0.736, yFrac: 0.53, hFrac: 0.10 },
      ],
    },
      8: {
      asset: '/assets/fire-ignite-level3.png',   // same sheet as level 3
      positions: [
        { xFrac: 0.12,  yFrac: 0.32, hFrac: 0.10 },
        { xFrac: 0.31,  yFrac: 0.32, hFrac: 0.10 },
        { xFrac: 0.876, yFrac: 0.34, hFrac: 0.10 },
      ],
    },
  }
  const FIRE_LIGHT_STRENGTH = 1.0   // overall brightness of the surrounding light
  const FIRE_LIGHT_RADIUS = 0.32    // light reach, as a fraction of the background height
  const LEVEL4_POPUP_MS = 2200    // how long Pip stands still while "Path is lit!" shows
  const LEVEL4_RUN_MS = 2600      // run across the bridge
  const LEVEL_FOUR_MESSAGE = 'Path is lit!'
  const LEVEL_FOUR_CODE = 'if (litLanterns > 0) { System.out.println("Path is lit!"); }'

  function isLevelFourSolution(src) {
    const code = String(src || '').replace(/\s+/g, ' ').trim()
    if (code === LEVEL_FOUR_CODE) return true
    const m = code.match(/^int litLanterns = (\d+); (.*)$/)
    return !!m && Number(m[1]) > 0 && m[2] === LEVEL_FOUR_CODE
  }

  function getVisualTilePosition(tile, totalTiles, backgroundPath) {
    const isTerrain1Map = String(backgroundPath).endsWith('/terrain1.png') || String(backgroundPath).endsWith('/terrain1.jpg')
    if (!isTerrain1Map) return tile

    return Math.min(
      TERRAIN1_MAX_VISUAL_TILE,
      Math.max(0, tile * TERRAIN1_TILE_SCALE)
    )
  }

  // ── Islands 2 and 3 (module_id 2 and 3): generic "solution matched" scene ──
  // Island 1 has hand-built scenes (golem, torches, forge, bug chasm). Island 2 uses
  // island plays the plain map: when the learner's code matches the lesson's
  // solution_code, Pip shows the output in a bubble and walks to the flag tile.
  const ISLAND_BUBBLE_MS = 2200
  const ISLAND_WALK_DELAY_MS = 1400
  const ISLAND_WALK_FPS = 12
  const ISLAND_ENTRANCE_MS = 1000   // Pip walks in from the left edge when a level loads

  // ── Island 3 boss fight ──
  // Island 3 is 20 levels and TWO bosses: levels 1-10 fight the Syntax Golem and
  // levels 11-20 fight the Literal Titan. Each correct answer takes 1 HP off the
  // current boss; each wrong answer makes the boss strike back (the lives
  // themselves are handled by the lesson page). Boss 1 falls on level 10, boss 2
  // on level 20, and only then is the island cleared.
  const BOSS_HP_PER_CHAPTER = 10      // 10 levels per boss, 1 HP per level
  const BOSS_TOTAL_LEVELS = 20        // 2 bosses x 10 levels
  const ISLAND3_FIRST_LESSON_ID = 119 // lessons 119-138
  const ISLAND3_LAST_LESSON_ID = ISLAND3_FIRST_LESSON_ID + BOSS_TOTAL_LEVELS - 1

  // Every correct answer makes Pip dash at the boss and hit it; every wrong answer
  // makes the boss strike back (the lives themselves are still handled by the lesson page).
  const DASH_MS = 380                 // Pip's run up to the boss
  const DASH_HIT_HOLD_MS = 220        // he stays pressed against the boss for the hit
  const DASH_RETREAT_MS = 450         // hop back to his spot
  const SLASH_FX_MS = 200             // impact flash
  const ENEMY_ATTACK_LOCK_MS = 1600   // ignore a second attack trigger for this long (no double animation)
  const BOSS_HIT_SHAKE_MS = 450
  const BOSS_BUBBLE_MS = 1800 // eslint-disable-line no-unused-vars
  const BOSS_DEFEAT_COLLAPSE_MS = 1400

  // ── Boss golem sheet: 2 rows x 8 frames. Row 1 = idle loop, row 2 = attack
  // (3 wind-up, slam, recoil, dust, recover, stand). Coordinates are in a
  // 1536x1024 reference and scale automatically if your file is a different size.
  // If the golem floats / sinks / clips a neighbouring frame, tune `feet`,
  // `top`, `bottom` and `cuts` below.
  const BOSS_SHEET_SRC = '/assets/golem-boss.png'
  const BOSS_SHEET_REF = { w: 1536, h: 1024 }
  const BOSS_STAND_H_REF = 245     // height of the standing golem in the sheet
  const BOSS_STAND_W_REF = 185
  const BOSS_ROWS = {
    // top/bottom = crop band, feet = the y where his feet touch the ground,
    // cuts = x boundaries between the 8 frames
    idle:   { top: 205, bottom: 470, feet: 463, cuts: [20, 214, 403, 592, 782, 970, 1150, 1340, 1525] },
    attack: { top: 552, bottom: 900, feet: 880, cuts: [20, 208, 398, 555, 760, 965, 1155, 1340, 1525] },
  }
  const BOSS_IDLE_FPS = 8
  const BOSS_ATTACK_FRAMES = 8
  const BOSS_ATTACK_FRAME_MS = 150
  const BOSS_ATTACK_MS = BOSS_ATTACK_FRAME_MS * BOSS_ATTACK_FRAMES   // 1200
  const BOSS_SLAM_AT = BOSS_ATTACK_FRAME_MS * 3                      // fist hits the ground on frame 4
  const BOSS_WAVE_MS = 520                                           // flight time of the thrown rock
  export const BOSS_HIT_DELAY_MS = BOSS_SLAM_AT + BOSS_WAVE_MS       // when Pip actually gets hit
  const BOSS_SFX_DELAY_MS = 100                                      // growl starts a bit into the wind-up so the thud lands on the slam

  // Golem attack sound. Drop your own file at the path below to use it. If the
  // file is missing, a growl + ground thud is synthesized with the Web Audio API.
  const BOSS_ATTACK_SFX = '/assets/sounds/golem-attack.wav'
  let bossAudioCtx = null
  function synthGolemRoar() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      if (!bossAudioCtx) bossAudioCtx = new AC()
      const ac = bossAudioCtx
      if (ac.state === 'suspended') ac.resume()
      const t0 = ac.currentTime
      const master = ac.createGain()
      master.gain.value = 0.9
      master.connect(ac.destination)

      // growl (wind-up)
      const osc = ac.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(110, t0)
      osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.5)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(600, t0)
      lp.frequency.exponentialRampToValueAtTime(140, t0 + 0.5)
      const gg = ac.createGain()
      gg.gain.setValueAtTime(0.0001, t0)
      gg.gain.exponentialRampToValueAtTime(0.5, t0 + 0.06)
      gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6)
      osc.connect(lp); lp.connect(gg); gg.connect(master)
      osc.start(t0); osc.stop(t0 + 0.65)

      // ground thud (lands on the slam)
      const ts = t0 + 0.35
      const thud = ac.createOscillator()
      thud.type = 'sine'
      thud.frequency.setValueAtTime(90, ts)
      thud.frequency.exponentialRampToValueAtTime(30, ts + 0.35)
      const tg = ac.createGain()
      tg.gain.setValueAtTime(0.9, ts)
      tg.gain.exponentialRampToValueAtTime(0.0001, ts + 0.4)
      thud.connect(tg); tg.connect(master)
      thud.start(ts); thud.stop(ts + 0.45)

      // rubble
      const len = Math.floor(ac.sampleRate * 0.4)
      const buf = ac.createBuffer(1, len, ac.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2)
      const noise = ac.createBufferSource()
      noise.buffer = buf
      const nf = ac.createBiquadFilter()
      nf.type = 'lowpass'
      nf.frequency.value = 900
      const ng = ac.createGain()
      ng.gain.value = 0.5
      noise.connect(nf); nf.connect(ng); ng.connect(master)
      noise.start(ts)
    } catch (_) { /* audio is optional */ }
  }
  function playGolemAttackSfx() {
    let fellBack = false
    const fallback = () => { if (!fellBack) { fellBack = true; synthGolemRoar() } }
    try {
      const a = new Audio(BOSS_ATTACK_SFX)
      a.volume = 0.85
      a.addEventListener('error', fallback)
      a.play().catch(fallback)
    } catch (_) { fallback() }
  }

  const newBossFx = () => ({
    hitStart: -Infinity,     // when the boss is hit
    attackStart: -Infinity,  // when the boss's counter-attack leaves
    hurtStart: -Infinity,    // when Pip is hit
    defeatStart: Infinity,   // when the boss starts to collapse
    attackLockUntil: 0,
  })

  function getSolutionOutputText(src) {
    const code = String(src || '')
    // 1) println("...") -> show what the console would print
    const printed = [...code.matchAll(/System\.out\.println\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g)].map(m => m[1])
    if (printed.length) return printed.join('\n')
    // 2) a declaration -> show  name: value
    const decl = code.match(/^(?:final\s+)?(?:int|String|boolean|double|char|long)\s+(\w+)\s*=\s*([^;]+);/)
    if (decl) return `${decl[1]}: ${decl[2].trim()}`
    // 3) anything else (comments, assignments, ...)
    return 'Correct!'
  }

  // ── Level 5: The Coder's Forge ──
  const LEVEL5_KEYNAME_CODE = 'String keyname = "Pip";'
  const LEVEL5_BUBBLE_TEXT = 'keyname: "Pip"'
  const LEVEL5_START_TILE = 1.0          // where Pip stops after coming down the stairs
  const LEVEL5_PIP_SCALE = 1           // Pip is drawn this much bigger on the forge map
  const LEVEL5_GROUND_FRACTION = 0.60    // sandy path, not the cliff face
  const LEVEL5_INTRO_MS = 2600           // door -> stairs -> stop
  // fractions of the background image, measured from the art
  // x0,y0 = top step · x1,y1 = bottom step · x2 = where he settles on the path
  const LEVEL5_STAIRS = { x0: 0.047, y0: 0.508, x1: 0.100, y1: 0.561, x2: 0.145, steps: 3 }
  const LEVEL5_INTRO_FADE_MS = 600
  // Door and stairs, as fractions of the background image (tune to the art)
  const LEVEL5_FLAG_TILE = 5
  const LEVEL5_SPARK_WINDOW_MS = 2600   // how long sparks fly off the anvil
  const LEVEL5_TRAIL_START_MS = 500     // first ember lights up
  const LEVEL5_TRAIL_STEP_MS = 320      // delay between embers
  const LEVEL5_WALK_DELAY_MS = 1000     // Pip starts walking after this
  const LEVEL5_WALK_MS = 3400
  const LEVEL5_WALK_FPS = 12
  const LEVEL5_BUBBLE_MS = 3000
  // Positions as fractions of the background image. Tweak if a glow looks off.
  const LEVEL5_ANVIL = { x: 0.237, y: 0.549 }    // top of the anvil
  const LEVEL5_RUNES = { x: 0.237, y: 0.593 }    // rune band on the plinth
  const LEVEL5_FURNACE = { x: 0.328, y: 0.551 }  // furnace opening

  const rnd = n => Math.abs(Math.sin(n) * 43758.5453) % 1
  const LEVEL5_SPARKS = Array.from({ length: 30 }, (_, i) => ({
    angle: -Math.PI * (0.12 + 0.76 * rnd(i + 1)),   // fan upward from the anvil
    speed: 0.14 + 0.26 * rnd(i + 31),               // background-heights per second
    delay: 0.6 * rnd(i + 61),                       // seconds before first launch
    life: 0.6 + 0.5 * rnd(i + 91),                  // seconds per spark cycle
  }))

  function fillGlow(ctx, cx, cy, r, rgb, a) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r)
    g.addColorStop(0, `rgba(${rgb}, ${a})`)
    g.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }

  // ── Level 6: The Bug Chasm ──
  const LEVEL6_CODE = 'System.out.println("Bridge online");'
  const LEVEL6_BUBBLE_TEXT = 'Bridge online'
  const LEVEL6_END_TILE = 9
  const LEVEL6_BUBBLE_MS = 2200
  const LEVEL6_DECK_START_MS = 500
  const LEVEL6_DECK_STEP_MS = 110
  const LEVEL6_WALK_DELAY_MS = 2000
  const LEVEL6_WALK_MS = 2800
  const LEVEL6_WALK_FPS = 12
  // Positions as fractions of the background image (estimated from the art, so tune them)
  const LEVEL6_WHEEL = { x: 0.716, y: 0.418, r: 0.05 }   // Wheel Bridge's big gear (r = fraction of image height)
  const LEVEL6_RAMP = { x: 0.900, y: 0.430 }             // the jammed Chain Ramp
  const LEVEL6_DECK = { x0: 0.74, x1: 0.91, planks: 12 } // light bridge across the gap

  // ── Level 7: the Archivist's construct ──
  const LIBRARIAN_FRAME_COUNT = 5
  const LIBRARIAN_BLOCK_FRAME = 0        // idle, arm raised
  const LIBRARIAN_LAST_STEP_FRAME = 4    // fully stepped aside
  const LIBRARIAN_STEP_MS = 180          // time between frames while stepping aside
  const LIBRARIAN_DORMANT = 'BLOCKING'
  const LIBRARIAN_STEPPING = 'STEPPING'
  const LIBRARIAN_ASIDE = 'ASIDE'
  const LIBRARIAN_CONFIGS = {
    7: { asset: '/assets/construct.png', tileFraction: 0.55 },
  }
  const LIBRARIAN_HEIGHT_IN_PIPS = 2.8
  const LEVEL7_GROUND_FRACTION = 0.71
  // Fractions of the background image, measured from the art.
  // x0,y0 = top step · x1,y1 = bottom of stairs / landing · x2 = end of landing · x3 = reaches walkway
  const LEVEL7_STAIRS = { x0: 0.040, y0: 0.562, x1: 0.082, y1: 0.636, x2: 0.124, x3: 0.136, steps: 4 }
  const LEVEL7_INTRO_FADE_MS = 600
  const LEVEL7_ENTRY_TILE = 4.2
  const LIBRARIAN_FOOT_OFFSET_FRAC = 0.05
  const LEVEL_SEVEN_DONE_DELAY_MS = LIBRARIAN_STEP_MS * (LIBRARIAN_LAST_STEP_FRAME - LIBRARIAN_BLOCK_FRAME) + 200
  const LEVEL7_WALK_SPEED = 0.075     // background-widths per second (~110px on a 1500px canvas)
  const LEVEL7_INTRO_WALK_FPS = 9     // gait speed; lower = slower steps
  const LEVEL7_WALK_FPS = 9
  const LEVEL7_FADE_ZONE = 0.08       // fade over the last 8% of the background width
  const LEVEL7_RUN_SPEED = 0.16

  // ── Level 8: The Mnemonic Vault (arm bridge) ──
  const LEVEL8_BG = '/assets/landscapes/level8.png'
  const LEVEL8_ARM_ASSET = '/assets/arm.png'
  const LEVEL8_GROUND_FRACTION = 0.648   // top of the platform, as a fraction of the background height
  const LEVEL8_START_TILE = 2
  const LEVEL8_CODE = 'int sum = a + b;'
  const LEVEL8_WALK_FPS = 9
  // x = left edge of the pillar, span = width of the fully extended arm (both as a
  // fraction of the background width), deckY = height of the arm's top edge (the walkway)
  const LEVEL8_ARM = { x: 0.40, span: 0.27, deckY: 0.648 }
  const ARM_FRAME_COUNT = 5
  const ARM_STEP_MS = 220                // time per frame while the arm swings out
  const LEVEL8_DONE_DELAY_MS = ARM_STEP_MS * (ARM_FRAME_COUNT - 1) + 300
  const LEVEL8_INTRO_MS = 2200     // Pip walks in from the left edge to his start tile
  const LEVEL8_RUN_SPEED = 0.16    // background-widths per second for the run across the arm
  const LEVEL8_FADE_ZONE = 0.05    // fade over the last 5% of the background width



  const LEVEL_SEVEN_CODE = "// Source code: Pip's ledger entry"

  // Removes a baked-in checkerboard (if the PNG has one), then measures the real figure
  // in each of the equal-width frames.
  const librarianSheetCache = new WeakMap()
  function prepareLibrarianSheet(img, cols) {
    if (!img || !img.naturalWidth) return null
    if (librarianSheetCache.has(img)) return librarianSheetCache.get(img)
    let result = null
    try {
      const W = img.naturalWidth, H = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      const id = g.getImageData(0, 0, W, H)
      const d = id.data

      const isLightNeutral = i => d[i + 3] > 200 &&
        Math.min(d[i], d[i + 1], d[i + 2]) >= 190 &&
        Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) <= 14
      let removed = 0
      if (isLightNeutral(0)) {
        const c1 = [d[0], d[1], d[2]]
        let c2 = null
        for (let x = 1; x < Math.min(W, 200) && !c2; x++) {
          const i = x * 4
          if (isLightNeutral(i) && Math.abs(d[i] - c1[0]) > 6) c2 = [d[i], d[i + 1], d[i + 2]]
        }
        const near = (i, col) => Math.abs(d[i] - col[0]) <= 6 && Math.abs(d[i + 1] - col[1]) <= 6 && Math.abs(d[i + 2] - col[2]) <= 6
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] === 0) continue
          if (near(i, c1) || (c2 && near(i, c2))) { d[i + 3] = 0; removed++ }
        }
        g.putImageData(id, 0, 0)
      }

      const cw = Math.floor(W / cols)
      const boxes = []
      let ux0 = Infinity, uy0 = Infinity, ux1 = -1, uy1 = -1
      for (let f = 0; f < cols; f++) {
        let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0
        for (let y = 0; y < H; y++) {
          const row = (y * W + f * cw) * 4
          for (let x = 0; x < cw; x++) {
            if (d[row + x * 4 + 3] > 20) {
              n++
              if (x < x0) x0 = x
              if (x > x1) x1 = x
              if (y < y0) y0 = y
              if (y > y1) y1 = y
            }
          }
        }
        if (n > 50) {
          boxes.push({ x0, y0, x1, y1 })
          ux0 = Math.min(ux0, x0); uy0 = Math.min(uy0, y0)
          ux1 = Math.max(ux1, x1); uy1 = Math.max(uy1, y1)
        } else boxes.push(null)
      }
      if (boxes[0]) result = { canvas: c, cw, boxes, ub: { x: ux0, y: uy0, w: ux1 - ux0 + 1, h: uy1 - uy0 + 1 } }
      console.log('[Construct] sheet', W + 'x' + H, 'cell width', cw, 'checker pixels removed', removed, 'frame boxes', JSON.stringify(boxes))
    } catch (e) {
      console.warn('Could not prepare construct sheet:', e)
    }
    librarianSheetCache.set(img, result)
    return result
  }

  const armSheetCache = new WeakMap()
  function prepareArmSheet(img) {
    if (!img || !img.naturalWidth) return null
    if (armSheetCache.has(img)) return armSheetCache.get(img)
    let result = null
    try {
      const W = img.naturalWidth, H = img.naturalHeight
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      const id = g.getImageData(0, 0, W, H)
      const d = id.data

      // 1) Strip a baked-in white/checker background: flood inward from the border
      //    through light, neutral pixels (also harmless if the PNG is already transparent).
      const isBgPixel = p => {
        const i = p * 4
        if (d[i + 3] <= 20) return true
        const mn = Math.min(d[i], d[i + 1], d[i + 2])
        const mx = Math.max(d[i], d[i + 1], d[i + 2])
        return mn >= 185 && mx - mn <= 14
      }
      const seen = new Uint8Array(W * H)
      const stack = []
      const seed = p => { if (!seen[p] && isBgPixel(p)) { seen[p] = 1; stack.push(p) } }
      for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x) }
      for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1) }
      let removed = 0
      while (stack.length) {
        const p = stack.pop()
        const i = p * 4
        if (d[i + 3] !== 0) { d[i + 3] = 0; removed++ }
        const x = p % W
        if (x > 0) seed(p - 1)
        if (x < W - 1) seed(p + 1)
        if (p >= W) seed(p - W)
        if (p < W * (H - 1)) seed(p + W)
      }
      g.putImageData(id, 0, 0)

      // 2) Find the frames: runs of columns that contain artwork, separated by empty gaps
      const colCount = new Uint32Array(W)
      for (let y = 0; y < H; y++) {
        const row = y * W * 4
        for (let x = 0; x < W; x++) if (d[row + x * 4 + 3] > 20) colCount[x]++
      }
      let runs = []
      let runStart = -1, gap = 0
      for (let x = 0; x < W; x++) {
        if (colCount[x] >= 3) {
          if (runStart < 0) runStart = x
          gap = 0
        } else if (runStart >= 0) {
          gap++
          if (gap >= 8) { runs.push([runStart, x - gap]); runStart = -1; gap = 0 }
        }
      }
      if (runStart >= 0) runs.push([runStart, W - 1 - gap])
      runs = runs.filter(([a, b]) => b - a >= 30)
      if (runs.length !== ARM_FRAME_COUNT) {
        const cw = Math.floor(W / ARM_FRAME_COUNT)   // fallback: equal cells
        runs = Array.from({ length: ARM_FRAME_COUNT }, (_, f) => [f * cw, (f + 1) * cw - 1])
      }

      // 3) Tight bounding box of every frame
      const boxes = runs.map(([rx0, rx1]) => {
        let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
        for (let y = 0; y < H; y++) {
          const row = y * W * 4
          for (let x = rx0; x <= rx1; x++) {
            if (d[row + x * 4 + 3] > 20) {
              if (x < x0) x0 = x
              if (x > x1) x1 = x
              if (y < y0) y0 = y
              if (y > y1) y1 = y
            }
          }
        }
        return x1 >= 0 ? { x0, y0, x1, y1 } : null
      })

      // 4) Height of the arm's top edge in the fully extended frame (the walkway),
      //    measured on a column through the middle of the arm.
      const last = boxes[ARM_FRAME_COUNT - 1]
      if (boxes.every(Boolean)) {
        const col = last.x1 - Math.round((last.x1 - last.x0) * 0.12)
        let topY = last.y0
        for (let y = last.y0; y <= last.y1; y++) {
          if (d[(y * W + col) * 4 + 3] > 20) { topY = y; break }
        }
        result = { canvas: c, boxes, armTop: topY - last.y0 }
      }
      console.log('[Arm] sheet', W + 'x' + H, 'background pixels removed', removed, 'frame boxes', JSON.stringify(boxes), 'armTop', result?.armTop)
    } catch (e) {
      console.warn('Could not prepare arm sheet:', e)
    }
    armSheetCache.set(img, result)
    return result
  }
  // Finds the real (non-transparent) bounding box of every golem frame, so the
  // level 1-2 golem can be placed with his FEET on the ground. (No longer used by
  // the Island 3 boss, which has its own sheet with fixed rects, see BOSS_ROWS.)
  const golemMetricsCache = new WeakMap()
  function getGolemMetrics(img) { // eslint-disable-line no-unused-vars
    if (!img || !img.naturalWidth) return null
    if (golemMetricsCache.has(img)) return golemMetricsCache.get(img)
    let result = null
    try {
      const W = img.naturalWidth
      const H = img.naturalHeight
      const fwF = W / GOLEM_FRAME_COUNT
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      const data = g.getImageData(0, 0, W, H).data
      const frames = []
      for (let f = 0; f < GOLEM_FRAME_COUNT; f++) {
        const sx0 = Math.round(f * fwF)
        const sx1 = Math.min(W, Math.round((f + 1) * fwF))
        let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, count = 0
        for (let y = 0; y < H; y++) {
          for (let x = sx0; x < sx1; x++) {
            if (data[(y * W + x) * 4 + 3] > 20) {
              count++
              const lx = x - Math.round(f * fwF)
              if (lx < x0) x0 = lx
              if (lx > x1) x1 = lx
              if (y < y0) y0 = y
              if (y > y1) y1 = y
            }
          }
        }
        frames.push(count > 50 ? { x0, y0, x1, y1 } : null)
      }
      result = { frames }
    } catch (e) {
      console.warn('Could not measure golem sheet:', e)
    }
    golemMetricsCache.set(img, result)
    return result
  }

  const walkMetricsCache = new WeakMap()
  function getWalkMetrics(img) {
    if (!img || !img.naturalWidth) return null
    if (walkMetricsCache.has(img)) return walkMetricsCache.get(img)
    let result = null
    try {
      const W = img.naturalWidth, H = img.naturalHeight
      const cw = Math.floor(W / WALK_SHEET_COLS)
      const ch = Math.floor(H / WALK_SHEET_ROWS)
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      const data = g.getImageData(0, 0, W, H).data
      const cells = []
      let ux0 = Infinity, uy0 = Infinity, ux1 = -1, uy1 = -1
      for (let r = 0; r < WALK_SHEET_ROWS; r++) {
        for (let col = 0; col < WALK_SHEET_COLS; col++) {
          const sx = col * cw, sy = r * ch
          let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, count = 0
          for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
              if (data[((sy + y) * W + sx + x) * 4 + 3] > 20) {
                count++
                if (x < x0) x0 = x
                if (x > x1) x1 = x
                if (y < y0) y0 = y
                if (y > y1) y1 = y
              }
            }
          }
          if (count > 200) {           // skips empty cells and stray pixels
            cells.push({ sx, sy })
            ux0 = Math.min(ux0, x0); uy0 = Math.min(uy0, y0)
            ux1 = Math.max(ux1, x1); uy1 = Math.max(uy1, y1)
          }
        }
      }
      if (cells.length) {
        result = { cells, ub: { x: ux0, y: uy0, w: ux1 - ux0 + 1, h: uy1 - uy0 + 1 } }
      }
    } catch (e) {
      console.warn('Could not measure walk sheet:', e)
    }
    walkMetricsCache.set(img, result)
    return result
  }

  // Bump this string whenever this file changes. Log it (see the mount
  // effect below) so a quick look at the browser console tells you for
  // certain whether the page is actually running this version — several
  // rounds of bug reports turned out to be an old copy of this file still
  // being served (stale dev server, browser cache, or the new file not
  // actually saved to the right path) rather than the bug persisting.
  const BUILD_TAG = 'GameCanvas 2026-10-06a (level 7 construct restored)'

  export default function GameCanvas({ playToken, introToken = 0, replayToken = 0, onIntroComplete, code, onResult, onCharacterPosition, target, lessonData, resetToken = 0, fullHeight, levelLabel, levelTitle, initialPipPosition, eventOffset = 0, lessonId, executionMode = 'guided', hitToken = 0, onBossDefeated, onIslandComplete }) {
    useEffect(() => { console.log('[CodeQuest]', BUILD_TAG) }, [])

    const cvs    = useRef(null)
    const wrap   = useRef(null)
    const raf    = useRef(null)
    const cutsceneRef = useRef(null)
    const idleRaf = useRef(null)
    const imgs   = useRef({})
    const idleImageRef = useRef(null)
    const [bubble,   setBubble]   = useState(null)
    const [bubbleX,  setBubbleX]  = useState(50)
    const [bubbleY,  setBubbleY]  = useState(30)
    const [bubbleOpacity, setBubbleOpacity] = useState(1)
    const [pipX, setPipX] = useState(START_X)
    const [isPlayingCutscene, setIsPlayingCutscene] = useState(false)
    const [isCutscenePlaying, setIsCutscenePlaying] = useState(false)
    const [isMoving, setIsMoving] = useState(false)
    const [dialogueText, setDialogueText] = useState('')
    const [golemState, setGolemState] = useState(GOLEM_DORMANT)
    const [isLevelComplete, setIsLevelComplete] = useState(false)
    const [isGateOpen, setIsGateOpen] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showSpeechBubble, setShowSpeechBubble] = useState(false)
    const pipXRef = useRef(START_X)
    const walkFrameIndexRef = useRef(0)
    const walkTickRef = useRef(0)
      const walkTrackRef = useRef({ x: null, t: 0, dist: 0 })
    const golemWakeIntervalRef = useRef(null)
    const golemFrameRef = useRef(0)
    const golemAnimTimerRef = useRef(null)
    const gateFrameRef = useRef(0)
    const gateAnimTimerRef = useRef(null)
    const golemWakeTimeoutRef = useRef(null)
    const golemStateRef = useRef(GOLEM_DORMANT)
    const fireStateRef = useRef(FIRE_UNLIT)
    const fireFrameRef = useRef(0)
    const fireIgniteTimerRef = useRef(null)
    const librarianStateRef = useRef(LIBRARIAN_DORMANT)
    const librarianFrameRef = useRef(LIBRARIAN_BLOCK_FRAME)
    const librarianStepTimerRef = useRef(null)
    const armFrameRef = useRef(0)
    const armTimerRef = useRef(null)
    const drawSceneRef = useRef(null)
    const isCutsceneRunningRef = useRef(false)
    const [runState, setRunState] = useState('idle')
    const [errMsg,   setErrMsg]   = useState('')
    const [canvasH,  setCanvasH]  = useState(300)
    const [canvasW,  setCanvasW]  = useState(1280)
    const pipRenderScaleRef = useRef(1)
  pipRenderScaleRef.current = pipRenderScaleForWidth(canvasW)
  const getPipRenderWidth = () => BASE_PIP_RENDER_WIDTH * pipRenderScaleRef.current
  const getPipRenderHeight = () => BASE_PIP_RENDER_HEIGHT * pipRenderScaleRef.current
    const [assetsReady, setAssetsReady] = useState(false)
    const [isIdleLoaded, setIsIdleLoaded] = useState(false) // eslint-disable-line no-unused-vars
    const [tileProgress, setTileProgress] = useState(0) // eslint-disable-line no-unused-vars
    const [runMovedTiles, setRunMovedTiles] = useState(0)
    const [currentMap, setCurrentMap] = useState(1)
    const groundLineRef = useRef(0)
    const bgRenderRectRef = useRef({ dx: 0, dy: 0, dw: 0, dh: 0 })
    const golemGlowStartRef = useRef(0)
    const isGateOpenRef = useRef(false)
    const totalTiles = Number(lessonData?.total_tiles) || DEFAULT_TILE_COUNT
    const lessonGroundFraction = Number(lessonData?.ground_fraction)
    const config = typeof lessonData?.mechanics_config === 'string'
      ? JSON.parse(lessonData.mechanics_config)
      : lessonData?.mechanics_config
    const exitAction = config?.exit_action
    const tileElevations = config?.tile_elevations || {}

    // Island 2 (module_id 2) is the ONLY island that uses the new behaviour
    // (entrance walk-in + generic "solution matched" scene). For Island 2 we set
    // currentLevel = 0 so it never triggers Island 1's hand-built scenes (golem,
    // torches, forge, bug chasm). Every other module behaves exactly as before.
    // Island 2 is module 2. As a safety net (in case the API does not send
    // module_id), its lesson ids 109-118 also count. Without this, Island 2's
    // level 2 was treated as Island 1's level 2, which starts in the middle.
    const lessonModuleId = Number(lessonData?.module_id)
    const lessonIdNum = Number(lessonId ?? lessonData?.id)
    const isIsland2 =
      lessonModuleId === 2 || lessonModuleId === 3 ||
      (lessonIdNum >= 109 && lessonIdNum <= ISLAND3_LAST_LESSON_ID)   // Island 2: 109-118, Island 3: 119-138
    const currentLevel = isIsland2
      ? 0
      : Number(
          lessonData?.order_index ||
          lessonData?.level_number ||
          String(lessonData?.level_label || '').match(/\d+/)?.[0]
        )
      const bgPath = currentLevel === 8
      ? LEVEL8_BG
      : (lessonData?.background_image || '/assets/landscapes/terrain1.jpg')
    const isTerrain1Background = bgPath.endsWith('/terrain1.png') || bgPath.endsWith('/terrain1.jpg')
    const groundFraction = isTerrain1Background
      ? TERRAIN1_BRIDGE_FRACTION
      : currentLevel === 8
        ? LEVEL8_GROUND_FRACTION
        : currentLevel === 5
          ? LEVEL5_GROUND_FRACTION
          : lessonGroundFraction || BG_GRASS_FRACTION
    const gateConfig = GATE_CONFIGS.default
    const fireConfig = FIRE_CONFIGS[currentLevel === 4 ? 3 : currentLevel] || null
    const librarianConfig = LIBRARIAN_CONFIGS[currentLevel] || null
    const hasGate = currentLevel === 1
    const isLevelTwo = currentLevel === 2
    const usesSharedStart = currentLevel === 1 || isLevelTwo
    const sharedStartPosition = totalTiles * SHARED_START_FRACTION
    // Island 2 always starts on the lesson's own initial_tile (same for every level).
    const island2StartRaw = lessonData?.initial_tile
    const entranceStartTile = currentLevel === 7 ? LEVEL7_ENTRY_TILE : ENTRANCE_START_TILES[currentLevel] ??
      (isIsland2
        ? (island2StartRaw != null && Number.isFinite(Number(island2StartRaw))
            ? Number(island2StartRaw)
            : (initialPipPosition || 0))
        : (initialPipPosition || 0))
    const skipsWalkCutscene = currentLevel !== 1

    // Island 3 (module 3, lesson ids 119-138) is a boss fight with 20 levels and
    // TWO bosses: levels 1-10 = Syntax Golem, levels 11-20 = Literal Titan.
    const isBossIsland = lessonModuleId === 3 ||
      (lessonIdNum >= ISLAND3_FIRST_LESSON_ID && lessonIdNum <= ISLAND3_LAST_LESSON_ID)
    const bossCfgRaw = config?.boss || {}
    // Level 1-20. Fall back to the lesson id if order_index isn't 1-20.
    const rawOrder = Number(lessonData?.order_index)
    const bossLevelNo = rawOrder >= 1 && rawOrder <= BOSS_TOTAL_LEVELS
      ? rawOrder
      : (lessonIdNum >= ISLAND3_FIRST_LESSON_ID && lessonIdNum <= ISLAND3_LAST_LESSON_ID
          ? lessonIdNum - ISLAND3_FIRST_LESSON_ID + 1
          : 1)
    const bossChapter = bossLevelNo > BOSS_HP_PER_CHAPTER ? 1 : 0
    const bossName = bossCfgRaw.name || (bossChapter === 0 ? 'Syntax Golem' : 'Literal Titan')
    // HP is computed, not read from config, so a bad lesson row can't break the fight.
    // Levels 1-10: 10 -> 0 (boss 1). Levels 11-20: 10 -> 0 (boss 2).
    const bossMaxHp = BOSS_HP_PER_CHAPTER
    const bossHpBefore = bossMaxHp - ((bossLevelNo - 1) % BOSS_HP_PER_CHAPTER)
    const bossHpAfter = Math.max(0, bossHpBefore - 1)
    const isChapterFinale = bossHpAfter <= 0                       // level 10 or 20
    const isIslandFinale = bossLevelNo === BOSS_TOTAL_LEVELS       // level 20
    const bossTint = bossCfgRaw.tint || (bossChapter === 1 ? 'hue-rotate(150deg) saturate(1.4)' : 'none')
    const bossCfgRef = useRef({ enabled: false })
    bossCfgRef.current = { enabled: isBossIsland, name: bossName, maxHp: bossMaxHp, hpAfter: bossHpAfter, tint: bossTint, finale: isIslandFinale }
    const bossFxRef = useRef(newBossFx())
    const bossGeomRef = useRef({ cx: 0, w: 0 })     // where the boss stands on the canvas (set while drawing); Pip dashes to it
    const playBaselineRef = useRef(playToken)   // a Run/hit that is already counted when a level loads is stale, not a new action
    const hitBaselineRef = useRef(hitToken)
    const bossHpRef = useRef(bossHpBefore)         // HP shown on the bar (animated)
    const bossHpTargetRef = useRef(bossHpBefore)   // HP the bar is moving towards
    const popupsRef = useRef([])                    // floating "-1" texts
    const [bossDefeated, setBossDefeated] = useState(false)
    const [bossCongrats, setBossCongrats] = useState(null)   // { chapter, name, finale } shown after a boss falls
    const executionVersionRef = useRef(0)
    const pipAlphaRef = useRef(1)
    const level5FxRef = useRef({ active: false, start: 0 })
    const level6FxRef = useRef({ solved: false, start: 0 })
    const entranceActiveRef = useRef(false)

    useEffect(() => {
      const img = new Image()
      idleImageRef.current = img
      img.onload = () => {
        console.log('Pip Idle Loaded Successfully:', img.naturalWidth, img.naturalHeight)
        setIsIdleLoaded(img.complete && img.naturalWidth > 0)
      }
      img.onerror = () => {
        console.error('Pip idle image failed to load:', pipIdleSrc)
        setIsIdleLoaded(false)
      }
      img.src = pipIdleSrc
      if (img.complete && img.naturalWidth > 0) {
        console.log('Pip Idle Loaded Successfully:', img.naturalWidth, img.naturalHeight)
        setIsIdleLoaded(true)
      }
    }, [])

    const idleLoopRunning = useRef(false)
    const movementRunning = useRef(false)
    const lastPipX = useRef(0)
    const currentTileRef = useRef(0)

    function startIdleLoop() {
      if (idleLoopRunning.current || movementRunning.current) return
      idleLoopRunning.current = true
      function frame(t) {
        if (!idleLoopRunning.current) return
        const ctx = cvs.current?.getContext('2d')
        if (ctx) {
          const bob = Math.sin(t / 500) * 3
          drawScene(ctx, lastPipX.current, 0, false, 'idle', bob, t, pipAlphaRef.current)

          if (onCharacterPosition && cvs.current) {
            const rect = cvs.current.getBoundingClientRect()
            const routeTiles = Math.max(1, totalTiles)
            const posInMap = ((lastPipX.current % routeTiles) + routeTiles) % routeTiles
            const tileWidth = rect.width / routeTiles
            const visualTile = getVisualTilePosition(posInMap, routeTiles, bgPath)
            const characterX = rect.left + visualTile * tileWidth + tileWidth / 2
            const feetY = Number.isFinite(groundLineRef.current)
              ? groundLineRef.current
              : canvasH * 0.72 - 26
            const characterY = rect.top + feetY - getPipRenderHeight() / 2

            onCharacterPosition({ x: characterX, y: characterY })
          }
        }
        idleRaf.current = requestAnimationFrame(frame)
      }
      idleRaf.current = requestAnimationFrame(frame)
    }

    const stopIdleLoop = useCallback(() => {
      idleLoopRunning.current = false
      if (idleRaf.current) cancelAnimationFrame(idleRaf.current)
    }, [])

    const updateDialogueAnchor = useCallback(pipTile => {
      const routeTiles = Math.max(1, totalTiles)
      const localTile = ((Number(pipTile) % routeTiles) + routeTiles) % routeTiles
      const tileWidth = canvasW / routeTiles
      const visualTile = getVisualTilePosition(localTile, routeTiles, bgPath)
      // Level 4/5 (and every Island 2 lesson): idle Pip is centered in his
      // tile plus the grid inset, so match that
      const pipCanvasX = currentLevel === 4 || currentLevel === 5 || isIsland2
        ? Math.max(4, tileWidth * 0.04) + (visualTile + 0.5) * tileWidth
        : visualTile * tileWidth
      const groundY = Number.isFinite(groundLineRef.current)
        ? groundLineRef.current
        : canvasH * 0.72 - 26
      const pipHeadY = groundY - getPipRenderHeight() * (currentLevel === 5 ? LEVEL5_PIP_SCALE : 1) - 15

      setBubbleX(Math.round(pipCanvasX))
      setBubbleY(Math.round(pipHeadY))
    }, [bgPath, canvasH, canvasW, totalTiles, currentLevel, isIsland2])

    const triggerGolemWakeAnimation = useCallback(() => {
      if (golemStateRef.current !== GOLEM_DORMANT) return
      if (golemAnimTimerRef.current) {
        clearInterval(golemAnimTimerRef.current)
        golemAnimTimerRef.current = null
      }
      if (golemWakeTimeoutRef.current) {
        clearTimeout(golemWakeTimeoutRef.current)
        golemWakeTimeoutRef.current = null
      }
      if (golemWakeIntervalRef.current) {
        clearInterval(golemWakeIntervalRef.current)
        golemWakeIntervalRef.current = null
      }

      setIsAnimating(true)
      setIsLevelComplete(true)
      setShowSpeechBubble(true)
      golemStateRef.current = GOLEM_WAKING
      setGolemState(GOLEM_WAKING)
      let currentFrame = 0
      golemFrameRef.current = 0
      console.log('[Golem] Wake-up animation sequence started')
      golemAnimTimerRef.current = setInterval(() => {
        currentFrame += 1
        const nextFrame = Math.min(GOLEM_FRAME_COUNT - 1, currentFrame)
        golemFrameRef.current = nextFrame
        console.log(`[Golem Timer Tick] Updated golemFrameRef.current to: ${golemFrameRef.current}`)
        if (cvs.current && drawSceneRef.current) {
          const ctx = cvs.current.getContext('2d')
          drawSceneRef.current(
            ctx,
            lastPipX.current,
            0,
            false,
            'idle',
            0,
            performance.now(),
            pipAlphaRef.current
          )
        }

        if (nextFrame >= GOLEM_FRAME_COUNT - 1) {
          clearInterval(golemAnimTimerRef.current)
          golemAnimTimerRef.current = null
          golemStateRef.current = GOLEM_STANDING
          setGolemState(GOLEM_STANDING)
          setIsAnimating(false)
          console.log('[Golem] Animation complete - standing pose locked.')
        }
      }, 150)
    }, [])

    const triggerFireIgnite = useCallback(() => {
      if (fireStateRef.current !== FIRE_UNLIT) return
      if (fireIgniteTimerRef.current) {
        clearInterval(fireIgniteTimerRef.current)
        fireIgniteTimerRef.current = null
      }
      fireStateRef.current = FIRE_IGNITING
      fireFrameRef.current = 0

          const redraw = () => {
        if (entranceActiveRef.current) return   // the entrance walk already redraws every frame
        if (cvs.current && drawSceneRef.current) {
          const ctx = cvs.current.getContext('2d')
          drawSceneRef.current(ctx, lastPipX.current, 0, false, 'idle', 0, performance.now(), pipAlphaRef.current)
        }
      }
      redraw()

      fireIgniteTimerRef.current = setInterval(() => {
        fireFrameRef.current += 1
        if (fireFrameRef.current >= FIRE_LAST_GROW_FRAME) {
          fireFrameRef.current = FIRE_LAST_GROW_FRAME
          fireStateRef.current = FIRE_LIT
          clearInterval(fireIgniteTimerRef.current)
          fireIgniteTimerRef.current = null
        }
        redraw()
      }, FIRE_IGNITE_MS)
    }, [])

      const triggerLibrarianStepAside = useCallback(() => {
      if (librarianStateRef.current !== LIBRARIAN_DORMANT) return
      if (librarianStepTimerRef.current) {
        clearInterval(librarianStepTimerRef.current)
        librarianStepTimerRef.current = null
      }
      librarianStateRef.current = LIBRARIAN_STEPPING
      librarianFrameRef.current = LIBRARIAN_BLOCK_FRAME

      const redraw = () => {
        if (cvs.current && drawSceneRef.current) {
          const ctx = cvs.current.getContext('2d')
          drawSceneRef.current(ctx, lastPipX.current, 0, false, 'idle', 0, performance.now(), pipAlphaRef.current)
        }
      }
      redraw()

      librarianStepTimerRef.current = setInterval(() => {
        librarianFrameRef.current += 1
        if (librarianFrameRef.current >= LIBRARIAN_LAST_STEP_FRAME) {
          librarianFrameRef.current = LIBRARIAN_LAST_STEP_FRAME
          librarianStateRef.current = LIBRARIAN_ASIDE
          clearInterval(librarianStepTimerRef.current)
          librarianStepTimerRef.current = null
        }
        redraw()
      }, LIBRARIAN_STEP_MS)
    }, [])

      const triggerArmExtend = useCallback(() => {
      if (armTimerRef.current || armFrameRef.current >= ARM_FRAME_COUNT - 1) return
      const redraw = () => {
        if (cvs.current && drawSceneRef.current) {
          const ctx = cvs.current.getContext('2d')
          drawSceneRef.current(ctx, lastPipX.current, 0, false, 'idle', 0, performance.now(), pipAlphaRef.current)
        }
      }
      armFrameRef.current = 0
      redraw()
      armTimerRef.current = setInterval(() => {
        armFrameRef.current = Math.min(ARM_FRAME_COUNT - 1, armFrameRef.current + 1)
        if (armFrameRef.current >= ARM_FRAME_COUNT - 1) {
          clearInterval(armTimerRef.current)
          armTimerRef.current = null
        }
        redraw()
      }, ARM_STEP_MS)
    }, [])

    const playCompletionSequence = useCallback(() => {
      updateDialogueAnchor(lastPipX.current)
      setIsLevelComplete(true)
      setShowSpeechBubble(true)
      if (golemWakeTimeoutRef.current) {
        clearTimeout(golemWakeTimeoutRef.current)
      }
      golemWakeTimeoutRef.current = setTimeout(() => {
        golemWakeTimeoutRef.current = null
        triggerGolemWakeAnimation()
      }, 400)
    }, [triggerGolemWakeAnimation, updateDialogueAnchor])

    const startGateOpening = useCallback(() => {
      if (gateAnimTimerRef.current) {
        clearInterval(gateAnimTimerRef.current)
      }
      gateFrameRef.current = 0
      gateAnimTimerRef.current = setInterval(() => {
        gateFrameRef.current = Math.min(GATE_MAX_OPEN_FRAME, gateFrameRef.current + 1)
        if (gateFrameRef.current >= GATE_MAX_OPEN_FRAME) {
          clearInterval(gateAnimTimerRef.current)
          gateAnimTimerRef.current = null
        }
      }, 150)
    }, [])

    function runGuidedWalk() {
      const toTilePosition = x => (x / Math.max(1, canvasW)) * Math.max(1, totalTiles)
      const startX = usesSharedStart ? sharedStartPosition : skipsWalkCutscene ? entranceStartTile : START_X
      const targetX = usesSharedStart
        ? startX
        : Math.max(START_X, Math.min(canvasW * 0.48, canvasW - 120))

      pipXRef.current = startX
      walkFrameIndexRef.current = 0
      walkTickRef.current = 0
      setPipX(startX)
      setIsMoving(true)
      setIsCutscenePlaying(true)
      setIsPlayingCutscene(true)
      movementRunning.current = true
      stopIdleLoop()

      if (cutsceneRef.current) {
        cancelAnimationFrame(cutsceneRef.current)
      }

      const ctx = cvs.current?.getContext('2d')
      if (usesSharedStart || skipsWalkCutscene) {
        setIsMoving(false)
        setIsCutscenePlaying(false)
        setIsPlayingCutscene(false)
        movementRunning.current = false
        pipXRef.current = startX
        lastPipX.current = startX
        currentTileRef.current = startX
        setPipX(startX)
        if (ctx && drawSceneRef.current) {
          drawSceneRef.current(ctx, startX, 0, false, 'idle', 0, 0, pipAlphaRef.current)
        }
        startIdleLoop()
        return
      }
      const step = () => {
        if (pipXRef.current < targetX) {
          pipXRef.current += WALK_SPEED
          const clampedX = Math.min(pipXRef.current, targetX)
          pipXRef.current = clampedX
          setPipX(clampedX)
          lastPipX.current = clampedX
          currentTileRef.current = clampedX
          walkTickRef.current += 1
          if (walkTickRef.current % 6 === 0) {
            walkFrameIndexRef.current = (walkFrameIndexRef.current + 1) % TOTAL_WALK_FRAMES
          }
          if (ctx && drawSceneRef.current) {
            const routeTiles = Math.max(1, totalTiles)
            const tilePos = Math.max(0, Math.min(routeTiles, toTilePosition(clampedX)))
            drawSceneRef.current(ctx, tilePos, Math.sin(walkTickRef.current / 8) * 2.2, false, 'walk', 0, 0, 1)
          }
          cutsceneRef.current = requestAnimationFrame(step)
          return
        }

        pipXRef.current = targetX
        setPipX(targetX)
        setIsMoving(false)
        setIsCutscenePlaying(false)
        setIsPlayingCutscene(false)
        movementRunning.current = false
        walkFrameIndexRef.current = 0
        if (ctx && drawSceneRef.current) {
          lastPipX.current = toTilePosition(targetX)
          currentTileRef.current = lastPipX.current
          drawSceneRef.current(ctx, lastPipX.current, 0, false, 'idle', 0, 0, 1)
        }
        cutsceneRef.current = null
        startIdleLoop()
      }

      cutsceneRef.current = requestAnimationFrame(step)
    }

    function triggerCleanReset() {
      level5FxRef.current = { active: false, start: 0 }
      level6FxRef.current = { solved: false, start: 0 }
      if (golemWakeTimeoutRef.current) {
        clearTimeout(golemWakeTimeoutRef.current)
        golemWakeTimeoutRef.current = null
      }
      if (golemWakeIntervalRef.current) {
        clearInterval(golemWakeIntervalRef.current)
        golemWakeIntervalRef.current = null
      }
      if (golemAnimTimerRef.current) {
        clearInterval(golemAnimTimerRef.current)
        golemAnimTimerRef.current = null
      }
      if (gateAnimTimerRef.current) {
        clearInterval(gateAnimTimerRef.current)
        gateAnimTimerRef.current = null
      }
      if (fireIgniteTimerRef.current) {
        clearInterval(fireIgniteTimerRef.current)
        fireIgniteTimerRef.current = null
      }
      fireStateRef.current = currentLevel === 4 ? FIRE_LIT : FIRE_UNLIT
      fireFrameRef.current = currentLevel === 4 ? FIRE_LAST_GROW_FRAME : 0

          if (librarianStepTimerRef.current) {
        clearInterval(librarianStepTimerRef.current)
        librarianStepTimerRef.current = null
      }
      librarianStateRef.current = LIBRARIAN_DORMANT
      librarianFrameRef.current = LIBRARIAN_BLOCK_FRAME

          if (armTimerRef.current) {
        clearInterval(armTimerRef.current)
        armTimerRef.current = null
      }
      armFrameRef.current = 0

      if (cutsceneRef.current) cancelAnimationFrame(cutsceneRef.current)
      cutsceneRef.current = null
      isCutsceneRunningRef.current = false
      movementRunning.current = false

      setIsLevelComplete(false)
      isGateOpenRef.current = false
      setIsGateOpen(false)
      gateFrameRef.current = 0
      setIsMoving(true)
      setIsCutscenePlaying(true)
      setShowSpeechBubble(false)
      golemStateRef.current = isLevelTwo ? GOLEM_STANDING : GOLEM_DORMANT
      setGolemState(isLevelTwo ? GOLEM_STANDING : GOLEM_DORMANT)
      golemFrameRef.current = isLevelTwo ? GOLEM_FRAME_COUNT - 1 : 0
      setIsAnimating(false)
      setDialogueText('')
      setBubble(null)
      setBubbleOpacity(1)
      setRunState('idle')
      lastPipX.current = usesSharedStart ? sharedStartPosition : 0
      currentTileRef.current = usesSharedStart ? sharedStartPosition : 0
      walkFrameIndexRef.current = 0
      walkTickRef.current = 0
      runGuidedWalk()
    }

    function handleResetLevel() { // eslint-disable-line no-unused-vars
      triggerCleanReset()
    }

    const getMapForPosition = (pipX) => {
      return Math.floor(Math.max(0, pipX) / totalTiles) + 1
    }

    const getBackgroundImageForCurrentMap = () => {
      return bgPath
    }

    const ASSETS = {
      ...DEFAULT_ASSETS,
      background: getBackgroundImageForCurrentMap(),
      gateSprite: hasGate ? gateConfig.asset : null,
      fireSprite: fireConfig?.asset || null,
      bossGolemSprite: isBossIsland ? BOSS_SHEET_SRC : null,
      librarianSprite: LIBRARIAN_CONFIGS[currentLevel]?.asset || null,
          armSprite: currentLevel === 8 ? LEVEL8_ARM_ASSET : null,
    }

    // Which lesson/run this position belongs to. The start position is immutable
    // for the lesson; live movement remains in this component between steps.
    const runKey = useRef(null)
    useEffect(() => {
      // Initialize with persistent position or from prop. lastPipX is what
      // BOTH the idle loop and every run actually draw/animate from — without
      // syncing it here, Pip visually teleported back to tile 0 whenever a
      // lesson (re)mounted even though tileProgress knew the saved position.
      const spawnPosition = usesSharedStart
        ? sharedStartPosition
        : skipsWalkCutscene ? entranceStartTile : (initialPipPosition || 0)
      pipXRef.current = spawnPosition
      lastPipX.current = spawnPosition
      currentTileRef.current = spawnPosition
      pipAlphaRef.current = 1
      setPipX(spawnPosition)
      setTileProgress(spawnPosition)
      setRunState('idle')
      setErrMsg('')
      setBubble(null)
      setDialogueText('')
      setIsPlayingCutscene(false)
      setIsCutscenePlaying(false)
      setIsMoving(false)
      golemStateRef.current = isLevelTwo ? GOLEM_STANDING : GOLEM_DORMANT
      setGolemState(isLevelTwo ? GOLEM_STANDING : GOLEM_DORMANT)
      golemFrameRef.current = isLevelTwo ? GOLEM_FRAME_COUNT - 1 : 0
      setIsLevelComplete(false)
      isGateOpenRef.current = false
      setIsGateOpen(false)
      setIsAnimating(false)
      setShowSpeechBubble(false)
      if (golemWakeIntervalRef.current) {
        clearInterval(golemWakeIntervalRef.current)
        golemWakeIntervalRef.current = null
      }
      if (golemAnimTimerRef.current) {
        clearInterval(golemAnimTimerRef.current)
        golemAnimTimerRef.current = null
      }
      if (gateAnimTimerRef.current) {
        clearInterval(gateAnimTimerRef.current)
        gateAnimTimerRef.current = null
      }
      setRunMovedTiles(0)
      if (fireIgniteTimerRef.current) {
        clearInterval(fireIgniteTimerRef.current)
        fireIgniteTimerRef.current = null
      }
      fireStateRef.current = currentLevel === 4 ? FIRE_LIT : FIRE_UNLIT
      fireFrameRef.current = currentLevel === 4 ? FIRE_LAST_GROW_FRAME : 0
      executionVersionRef.current += 1
      if (raf.current) cancelAnimationFrame(raf.current)
      if (idleRaf.current) cancelAnimationFrame(idleRaf.current)
      idleLoopRunning.current = false
      triggerCleanReset()
      const key = `${lessonId}:${target}`
      if (runKey.current !== key) {
        runKey.current = key
        // Start on the map containing Pip's saved absolute position. When a
        // position is exactly at a map boundary, this selects the new map so
        // its local position begins at zero on the left edge.
        setCurrentMap(getMapForPosition(spawnPosition))
      }
    }, [lessonId, target, resetToken, replayToken, assetsReady, isLevelTwo]) // eslint-disable-line

    /* Canvas height was already tracking the container's real size, but
      width was hardcoded to 1280 regardless of how wide the container
      actually was on screen. That's fine when the container happens to be
      roughly that wide, but the <canvas> CSS is width:100%,height:100%
      with object-fit:fill — so whenever the container is narrower (e.g.
      DevTools docked open, eating half the window), the browser squishes
      the full 1280px-wide drawing down to fit, non-uniformly, since only
      height was ever kept in sync. A container as narrow as ~360px CSS
      against a 1280px-wide drawing is a >3x horizontal squash — enough to
      compress a character down to a sliver and make him look like he
      vanished, especially on already-narrow jump-pose frames. Tracking
      width too means the canvas always draws at its true on-screen pixel
      size, so there's never any stretching to begin with. */
    useEffect(() => {
      if (!fullHeight) return
      const ro = new ResizeObserver(entries => {
        for (const e of entries) {
          setCanvasH(e.contentRect.height)
          setCanvasW(e.contentRect.width)
        }
      })
      if (wrap.current) ro.observe(wrap.current)
      return () => ro.disconnect()
    }, [fullHeight])

    /* Preload every image BEFORE the first real draw. This is the fix
      for "character invisible until it moves" — that symptom happens
      when the first paint fires before large images finish decoding,
      and nothing re-triggers a redraw once they're ready. Gating on
      assetsReady guarantees we never draw a frame with a half-loaded
      character. */
    useEffect(() => {
      let cancelled = false
      setAssetsReady(false)

      const bgPath = ASSETS.background
      console.log('[GameCanvas] Loading background:', bgPath, 'currentMap:', currentMap)

      // Preload the following map as well, so crossing a boundary can swap to
      // the continuation without displaying the previous map for a frame.
      const nextMapPath = getBackgroundImageForCurrentMap(currentMap + 1)
      const mapPaths = [bgPath]
      if (nextMapPath !== bgPath) mapPaths.push(nextMapPath)

      // Reload assets whenever the background image changes (map transition)
      const assetsToLoad = Object.entries(ASSETS)
        .filter(([, v]) => v && !v.endsWith('.mp3'))
        .map(([k, v]) => loadImg(v).then(img => {
          if (!img && k === 'background' && ASSETS.background !== FALLBACK_BACKGROUND) {
            return loadImg(FALLBACK_BACKGROUND).then(fallback => ({ key: k, img: fallback }))
          }
          return { key: k, img }
        }).then(({ key, img }) => {
          if (!cancelled) {
            imgs.current[key] = img
            console.log('[GameCanvas] Loaded asset:', key, img ? '' : '(using placeholder)')
          }
        }))
      mapPaths.slice(1).forEach(path => assetsToLoad.push(loadImg(path)))

      Promise.all(assetsToLoad).then(() => {
        if (!cancelled) {
          console.log('[GameCanvas] Assets ready!')
          setAssetsReady(true)
        }
      })
      return () => { cancelled = true }
    }, [ASSETS.background, currentMap, currentLevel, isBossIsland]) // eslint-disable-line

    function getGateRect(gateImg) {
      if (!gateImg || gateImg.naturalWidth <= 0 || gateImg.naturalHeight <= 0) return null

      const frameWidth = gateImg.naturalWidth / GATE_FRAME_COUNT
      const frameHeight = gateImg.naturalHeight
      const { dx, dy, dw, dh } = bgRenderRectRef.current

      // Same crop rectangle every frame — the art's position inside each
      // source frame drifts slightly as the door opens, so a fixed crop is
      // what keeps the arch pinned instead of sliding.
      const srcX0 = gateConfig.vis.x0 * frameWidth
      const srcY0 = gateConfig.vis.y0 * frameHeight
      const srcW  = (gateConfig.vis.x1 - gateConfig.vis.x0) * frameWidth
      const srcH  = (gateConfig.vis.y1 - gateConfig.vis.y0) * frameHeight

      const targetHeight = dh * (gateConfig.target.y1 - gateConfig.target.y0)
      const scale = (targetHeight / srcH) * GATE_SCALE
      const destW = srcW * scale
      const destH = srcH * scale
      const destRight = dx + dw * gateConfig.target.x1
      const destBottom = dy + dh * gateConfig.target.y1
      const destX = Math.round(destRight - destW)
      const destY = Math.round(destBottom - destH)

      return { frameWidth, srcX0, srcY0, srcW, srcH, destX, destY, destW, destH, visibleLeftX: destX }
    }

    function drawLevel5Effects(ctx, now) {
      const fx = level5FxRef.current
      if (!fx.active) return
      const { dx, dy, dw, dh } = bgRenderRectRef.current
      if (!dw) return

      const t = now - fx.start
      const W = ctx.canvas.width
      const tileW = W / Math.max(1, totalTiles)
      const feet = groundLineRef.current
      const ramp = Math.min(1, t / 700)
      const pulse = 0.8 + Math.sin(now / 170) * 0.12

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      fillGlow(ctx, dx + dw * LEVEL5_RUNES.x, dy + dh * LEVEL5_RUNES.y, dh * 0.17, '0, 240, 255', 0.5 * ramp * pulse)
      fillGlow(ctx, dx + dw * LEVEL5_FURNACE.x, dy + dh * LEVEL5_FURNACE.y, dh * 0.2, '255, 140, 40', 0.42 * ramp * pulse)

      if (t < LEVEL5_SPARK_WINDOW_MS) {
        const emitFade = Math.min(1, (LEVEL5_SPARK_WINDOW_MS - t) / 600)
        const size = Math.max(2, dh * 0.006)
        const ax = dx + dw * LEVEL5_ANVIL.x
        const ay = dy + dh * LEVEL5_ANVIL.y
        LEVEL5_SPARKS.forEach((s, i) => {
          const local = t / 1000 - s.delay
          if (local < 0) return
          const age = local % s.life
          const p = age / s.life
          const x = ax + Math.cos(s.angle) * s.speed * dh * age
          const y = ay + Math.sin(s.angle) * s.speed * dh * age + 0.5 * dh * 0.7 * age * age
          const a = (1 - p) * emitFade
          ctx.fillStyle = i % 3 === 0 ? `rgba(255, 235, 170, ${a})` : `rgba(255, 160, 50, ${a})`
          ctx.fillRect(Math.round(x), Math.round(y), size, size)
        })
      }

      const emberSize = Math.max(2, dh * 0.007)
      for (let k = 1; k <= LEVEL5_FLAG_TILE; k++) {
        const litAt = LEVEL5_TRAIL_START_MS + k * LEVEL5_TRAIL_STEP_MS
        if (t < litAt) continue
        const age = t - litAt
        const grow = Math.min(1, age / 350)
        const flash = 1 + Math.max(0, 1 - age / 300) * 0.8
        const flicker = 0.8 + Math.sin(now / 120 + k * 1.7) * 0.15
        const strength = grow * flicker * flash
        const cx = Math.max(4, tileW * 0.04) + (k + 0.5) * tileW

        ctx.save()
        ctx.translate(cx, feet - 2)
        ctx.scale(1, 0.2)
        const r = tileW * 0.55
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r)
        g.addColorStop(0, `rgba(255, 190, 90, ${0.55 * strength})`)
        g.addColorStop(1, 'rgba(255, 120, 40, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        const bob = Math.sin(now / 260 + k) * 3
        ctx.fillStyle = `rgba(255, 230, 150, ${Math.min(1, 0.85 * strength)})`
        ctx.fillRect(Math.round(cx - emberSize / 2), Math.round(feet - dh * 0.02 - 6 + bob), emberSize, emberSize)
      }

      ctx.restore()
    }

    function drawLevel6Effects(ctx, now) { // eslint-disable-line no-unused-vars
      const { dx, dy, dw, dh } = bgRenderRectRef.current
      if (!dw) return
      const fx = level6FxRef.current
      const t = fx.solved ? now - fx.start : 0
      const feet = groundLineRef.current

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      // Chain Ramp: starts, then jams over and over (the runtime-error machine)
      const jam = (Math.floor(now / 170) % 6) < 2 ? 0.34 : 0.07
      fillGlow(ctx, dx + dw * LEVEL6_RAMP.x, dy + dh * LEVEL6_RAMP.y, dh * 0.12, '255, 80, 50', jam)

      // Wheel Bridge
      const wx = dx + dw * LEVEL6_WHEEL.x
      const wy = dy + dh * LEVEL6_WHEEL.y
      const wr = dh * LEVEL6_WHEEL.r

      if (!fx.solved) {
        // won't start: weak amber flicker
        const twitch = (Math.floor(now / 90) % 11) === 0 ? 0.12 : 0
        fillGlow(ctx, wx, wy, wr * 2.2, '255, 170, 60', 0.12 + 0.08 * Math.sin(now / 230) + twitch)
      } else {
        const ramp = Math.min(1, t / 700)
        const pulse = 0.85 + Math.sin(now / 160) * 0.1
        fillGlow(ctx, wx, wy, wr * 2.6, '0, 240, 255', 0.5 * ramp * pulse)

        // spinning rune ring, speeding up
        const angle = (t / 1000) * 3 * Math.min(1, t / 1500)
        ctx.lineWidth = Math.max(2, wr * 0.12)
        ctx.strokeStyle = `rgba(120, 240, 255, ${0.8 * ramp})`
        for (let k = 0; k < 12; k++) {
          const a0 = angle + (k / 12) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(wx, wy, wr * 1.25, a0, a0 + 0.32)
          ctx.stroke()
        }

        // light deck: planks switch on left to right across the gap
        const n = LEVEL6_DECK.planks
        const x0 = dx + dw * LEVEL6_DECK.x0
        const x1 = dx + dw * LEVEL6_DECK.x1
        const pw = (x1 - x0) / n
        const ph = Math.max(4, dh * 0.014)
        for (let i = 0; i < n; i++) {
          const litAt = LEVEL6_DECK_START_MS + i * LEVEL6_DECK_STEP_MS
          if (t < litAt) continue
          const age = t - litAt
          const flash = 1 + Math.max(0, 1 - age / 260) * 1.2
          const a = Math.min(1, 0.55 * flash * (0.85 + Math.sin(now / 200 + i) * 0.1))
          const px0 = Math.round(x0 + i * pw) + 1
          ctx.fillStyle = `rgba(90, 225, 255, ${a})`
          ctx.fillRect(px0, Math.round(feet), Math.ceil(pw) - 2, ph)
          ctx.fillStyle = `rgba(200, 250, 255, ${a * 0.8})`
          ctx.fillRect(px0, Math.round(feet), Math.ceil(pw) - 2, Math.max(1, Math.round(ph * 0.25)))
        }
      }

      ctx.restore()
    }

    function drawSceneInner(ctx, px, bounce, flagHit, pose, idleBob, animMs = 0, characterAlpha = 1, characterFeetY = null, characterCenterX = null) {
      const W = ctx.canvas.width
      const H = ctx.canvas.height
      const routeTiles = Math.max(1, totalTiles)
      const TILE = W / routeTiles
      const tileWidth = W / routeTiles
      const GY = H * 0.72 - 26            // check against your original
      let feetLine = GY
      const renderAlpha = characterAlpha
      const getTileY = tile => {
        const elevation = currentLevel === 8 ? 0 : Number(tileElevations[String(Math.round(tile))])
        return feetLine + (Number.isFinite(elevation) ? elevation : 0)
      }

      const posInMap = ((px % routeTiles) + routeTiles) % routeTiles
      const visualTile = getVisualTilePosition(posInMap, routeTiles, bgPath)

      if (imgs.current.background) {
        const bg = imgs.current.background
        ctx.imageSmoothingEnabled = false
        const s = Math.min(W / bg.naturalWidth, H / bg.naturalHeight)
        const dw = bg.naturalWidth * s
        const dh = bg.naturalHeight * s
        const dx = (W - dw) / 2
        const dy = (H - dh) / 2
        bgRenderRectRef.current = { dx, dy, dw, dh }

        ctx.fillStyle = '#17233B'
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(bg, dx, dy, dw, dh)
        feetLine = dy + groundFraction * dh
        ctx.imageSmoothingEnabled = true
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, GY)
        sky.addColorStop(0, '#C7D2F8')
        sky.addColorStop(1, '#EEF0FF')
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#B8C5F5'
        for (let i = 0; i < 6; i++) {
          ctx.beginPath()
          ctx.ellipse(i * (W/5) + 40, GY + 10, W/9, GY * 0.22, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ;[[80,40],[240,28],[430,50],[600,32]].forEach(([cx,cy]) => {
          ctx.beginPath(); ctx.ellipse(cx, cy, 44, 18, 0, 0, Math.PI*2); ctx.fill()
          ctx.beginPath(); ctx.ellipse(cx+28, cy+4, 30, 14, 0, 0, Math.PI*2); ctx.fill()
          ctx.beginPath(); ctx.ellipse(cx-24, cy+6, 28, 12, 0, 0, Math.PI*2); ctx.fill()
        })
      }
      groundLineRef.current = feetLine

      if (!imgs.current.background) {
        ctx.fillStyle = C.purple
        ctx.fillRect(0, GY + 2, W, H - GY - 2)
        ctx.fillStyle = '#3E37C9'
        ctx.fillRect(0, GY + 2, W, 5)

        for (let i = 0; i < routeTiles; i++) {
          const tx = i * TILE
          if (imgs.current.groundTile) {
            ctx.drawImage(imgs.current.groundTile, tx, GY - 24, TILE, 26)
          } else {
            ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F1EFFE'
            ctx.fillRect(tx + 2, GY - 26, TILE - 4, 26)
            ctx.strokeStyle = '#D8D3FB'; ctx.lineWidth = 1
            ctx.strokeRect(tx + 2, GY - 26, TILE - 4, 26)
          }
        }
      }

      const gateImg = hasGate ? imgs.current.gateSprite : null
      if (gateImg && gateImg.complete && gateImg.naturalWidth > 0 && gateImg.naturalHeight > 0) {
        const gateRect = getGateRect(gateImg)
        const safeFrame = Math.min(Math.max(gateFrameRef.current, 0), GATE_MAX_OPEN_FRAME)
        if (!gateRect) return

        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          gateImg,
          Math.round(safeFrame * gateRect.frameWidth + gateRect.srcX0),
          Math.round(gateRect.srcY0),
          Math.round(gateRect.srcW),
          Math.round(gateRect.srcH),
          gateRect.destX,
          gateRect.destY,
          Math.round(gateRect.destW),
          Math.round(gateRect.destH)
        )
        if (DEBUG_GATE) {
          ctx.strokeStyle = '#00f0ff'
          ctx.lineWidth = 2
          ctx.strokeRect(gateRect.destX, gateRect.destY, gateRect.destW, gateRect.destH)
        }
        ctx.imageSmoothingEnabled = true
        ctx.restore()
      }

      // The golem only exists on levels 1 and 2 (never on Island 2, where currentLevel is 0).
      const golemImg = imgs.current.golemSprite
      if (currentLevel >= 1 && currentLevel <= 2 && golemImg && golemImg.naturalWidth > 0 && golemImg.naturalHeight > 0) {
        const BRIDGE_GROUND_Y = H * 0.745
        const GOLEM_GROUND_X = W * 0.82
        const frameWidth = golemImg.naturalWidth / GOLEM_FRAME_COUNT
        const frameHeight = golemImg.naturalHeight
        const aspectRatio = frameWidth / frameHeight
        const renderedHeight = H * 0.48
        const renderedWidth = renderedHeight * aspectRatio
        const gateRect = getGateRect(imgs.current.gateSprite)
        const gateRelativeDrawX = gateRect
          ? gateRect.visibleLeftX - GOLEM_GAP - renderedWidth
          : GOLEM_GROUND_X - (renderedWidth / 2)
        const pillarSafeDrawX = W * GOLEM_PILLAR_LEFT_FRAC - renderedWidth
        const drawX = Math.round(Math.min(gateRelativeDrawX, pillarSafeDrawX))
        const drawY = Math.round(BRIDGE_GROUND_Y - renderedHeight)
        const currentFrame = Math.max(0, Math.min(GOLEM_FRAME_COUNT - 1, golemFrameRef.current))
        const sourceX = Math.round(currentFrame * frameWidth)

        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          golemImg,
          sourceX,
          0,
          frameWidth,
          frameHeight,
          drawX,
          drawY,
          renderedWidth,
          renderedHeight
        )
        const glowAge = performance.now() - golemGlowStartRef.current
        if (isLevelTwo && isGateOpenRef.current && glowAge >= 0) {
          const pulse = 0.52 + Math.sin(glowAge / 90) * 0.28
          const runeX = drawX + renderedWidth * 0.5
          const runeY = drawY + renderedHeight * 0.42
          const glowWidth = Math.max(8, renderedWidth * 0.16)
          const glowHeight = Math.max(8, renderedHeight * 0.1)
          const glow = ctx.createRadialGradient(
            runeX,
            runeY,
            1,
            runeX,
            runeY,
            glowWidth
          )
          glow.addColorStop(0, `rgba(0, 240, 255, ${Math.max(0.08, pulse * 0.5)})`)
          glow.addColorStop(1, 'rgba(0, 240, 255, 0)')
          ctx.save()
          ctx.fillStyle = glow
          ctx.shadowColor = '#00f0ff'
          ctx.shadowBlur = 15
          ctx.fillRect(runeX - glowWidth, runeY - glowHeight, glowWidth * 2, glowHeight * 2)
          ctx.restore()
        }
        ctx.imageSmoothingEnabled = true
      }

          const librarianSheet = librarianConfig ? prepareLibrarianSheet(imgs.current.librarianSprite, LIBRARIAN_FRAME_COUNT) : null
      if (librarianConfig && librarianSheet) {
        const { dx, dw, dh } = bgRenderRectRef.current
        const { canvas: sheet, cw, boxes, ub } = librarianSheet
        const b0 = boxes[0]
        const scale = (getPipRenderHeight() * LIBRARIAN_HEIGHT_IN_PIPS) / (b0.y1 - b0.y0 + 1)
        const cx0 = (b0.x0 + b0.x1 + 1) / 2
        const by0 = b0.y1 + 1
        const centerX = dx + dw * (librarianConfig.tileFraction ?? 0.5)
        const footY = feetLine + dh * LIBRARIAN_FOOT_OFFSET_FRAC
        const frame = Math.max(0, Math.min(LIBRARIAN_FRAME_COUNT - 1, librarianFrameRef.current))

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(
          sheet,
          frame * cw + ub.x, ub.y, ub.w, ub.h,
          centerX + (ub.x - cx0) * scale, footY - (by0 - ub.y) * scale, ub.w * scale, ub.h * scale
        )
      }

          const armSheet = currentLevel === 8 ? prepareArmSheet(imgs.current.armSprite) : null
      if (armSheet) {
        const { dx, dy, dw, dh } = bgRenderRectRef.current
        const { canvas: sheet, boxes, armTop } = armSheet
        const lastBox = boxes[ARM_FRAME_COUNT - 1]
        const s = (dw * LEVEL8_ARM.span) / (lastBox.x1 - lastBox.x0 + 1)
        const b = boxes[Math.max(0, Math.min(ARM_FRAME_COUNT - 1, armFrameRef.current))]
        const bw = b.x1 - b.x0 + 1
        const bh = b.y1 - b.y0 + 1
        const left = dx + dw * LEVEL8_ARM.x
        const top = dy + dh * LEVEL8_ARM.deckY - armTop * s   // arm's top edge sits on the walkway
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(sheet, b.x0, b.y0, bw, bh, left, top, bw * s, bh * s)
      }

      const fireImg = imgs.current.fireSprite
      if (fireConfig && fireImg && fireImg.naturalWidth > 0 && fireImg.naturalHeight > 0 && fireStateRef.current !== FIRE_UNLIT) {
        const { dx, dy, dw, dh } = bgRenderRectRef.current
        const now = performance.now()
        const fireIsLit = fireStateRef.current === FIRE_LIT
        const fireFrameIndex = fireIsLit
          ? FIRE_FLICKER_FRAMES[Math.floor(now / FIRE_FLICKER_MS) % FIRE_FLICKER_FRAMES.length]
          : Math.min(fireFrameRef.current, FIRE_LAST_GROW_FRAME)
        const fr = FIRE_FRAMES[fireFrameIndex]
        // 0 -> 1 as the flame grows, so the light turns on with the fire
        const fireIntensity = Math.min(1, fr.h / FIRE_REF_H)

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.imageSmoothingEnabled = false

        fireConfig.positions.forEach((pos, idx) => {
          const scale = (dh * pos.hFrac) / FIRE_REF_H
          const destW = fr.w * scale
          const destH = fr.h * scale
          const cx = dx + dw * pos.xFrac
          const destX = cx - destW / 2
          const destY = dy + dh * pos.yFrac - destH

          // each torch flickers on its own rhythm
          const flicker = 0.85 + Math.sin(now / 140 + idx * 2.1) * 0.10 + Math.sin(now / 53 + idx * 4.7) * 0.05
          const light = fireIntensity * flicker * FIRE_LIGHT_STRENGTH
          const cy = destY + destH * 0.6
          const lightR = dh * FIRE_LIGHT_RADIUS

          // 1) wide ambient light washing over the surrounding stone
          const ambient = ctx.createRadialGradient(cx, cy, 4, cx, cy, lightR)
          ambient.addColorStop(0, `rgba(70, 150, 255, ${0.30 * light})`)
          ambient.addColorStop(0.35, `rgba(50, 110, 230, ${0.14 * light})`)
          ambient.addColorStop(1, 'rgba(30, 70, 200, 0)')
          ctx.fillStyle = ambient
          ctx.beginPath()
          ctx.arc(cx, cy, lightR, 0, Math.PI * 2)
          ctx.fill()

          // 2) tight bright halo hugging the flame
          const haloR = dh * 0.09
          const halo = ctx.createRadialGradient(cx, cy + 8, 2, cx, cy + 8, haloR)
          halo.addColorStop(0, `rgba(120, 200, 255, ${0.35 * light})`)
          halo.addColorStop(1, 'rgba(60, 140, 255, 0)')
          ctx.fillStyle = halo
          ctx.beginPath()
          ctx.arc(cx, cy + 8, haloR, 0, Math.PI * 2)
          ctx.fill()

          // 3) light pooling on the walkway below
          ctx.save()
          ctx.translate(cx, feetLine - 2)
          ctx.scale(1, 0.16)
          const floorR = lightR * 0.8
          const floor = ctx.createRadialGradient(0, 0, 2, 0, 0, floorR)
          floor.addColorStop(0, `rgba(60, 140, 255, ${0.22 * light})`)
          floor.addColorStop(1, 'rgba(60, 140, 255, 0)')
          ctx.fillStyle = floor
          ctx.beginPath()
          ctx.arc(0, 0, floorR, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()

          ctx.drawImage(fireImg, fr.x, fr.y, fr.w, fr.h, destX, destY, destW, destH)
        })

        ctx.restore()
      }
      if (currentLevel === 5) drawLevel5Effects(ctx, performance.now())

      const pipScale = currentLevel === 5 ? LEVEL5_PIP_SCALE : 1
      const CW = getPipRenderWidth() * pipScale
      const movementRenderHeight = getPipRenderHeight() * pipScale
      const totalBob = bounce + idleBob
      const centerOverride = Number.isFinite(characterCenterX) ? characterCenterX : null
      const CX = Number.isFinite(centerOverride)
        ? centerOverride - CW / 2
        : Math.max(4, Math.min(W - CW - 4, visualTile * tileWidth - CW / 2))
          const { dy: bgY, dh: bgH } = bgRenderRectRef.current
      const level7PipFeetLine = bgH > 0 ? bgY + LEVEL7_GROUND_FRACTION * bgH : getTileY(px)
      const pipFeetLine = Number.isFinite(characterFeetY)
    ? characterFeetY
    : currentLevel === 7 ? level7PipFeetLine : getTileY(px)
      const CY_base = pipFeetLine - totalBob

      const poseKey = pose === 'jump' ? 'characterJump'
                    : pose === 'land' ? 'characterLand'
                    : pose === 'run'  ? 'characterRun'
                    : pose === 'walk' ? 'characterWalk'
                    : 'characterIdle'
      const idleImg = idleImageRef.current
      const poseImg = poseKey === 'characterIdle' && idleImg?.complete && idleImg.naturalWidth > 0
        ? idleImg
        : imgs.current[poseKey]
      const frames  = FRAME_DATA[poseKey]

      let spriteDrawn = false
      if (poseImg && frames && frames.length) {
        try {
          const rawPos = Math.max(0, animMs) / 1000 * FPS[poseKey]
          const i0 = Math.floor(rawPos)
          const isWalk = poseKey === 'characterWalk'
                  if (isWalk) {
            // Frame comes from DISTANCE walked, so the feet always match the ground speed
            // (works for every caller: moveRight, intros, entrances, level walks).
            const nowT = performance.now()
            const centerNow = CX + CW / 2
            const wt = walkTrackRef.current
            if (wt.x === null || nowT - wt.t > 150 || Math.abs(centerNow - wt.x) > CW * 3) wt.dist = 0
            else wt.dist += Math.abs(centerNow - wt.x)
            wt.x = centerNow
            wt.t = nowT
            const cyclePx = getPipRenderHeight() * WALK_CYCLE_IN_PIP_HEIGHTS
            const n = WALK_FRAME_ORDER.length
            const wf = WALK_FRAMES[WALK_FRAME_ORDER[Math.floor((wt.dist / cyclePx) * n) % n]]

            const k = poseImg.naturalWidth / WALK_SHEET_REF.w      // in case the file is resized
            const s = movementRenderHeight / WALK_REF_H
            const dW = wf.w * s
            const dH = wf.h * s
            const drawX = Math.round(CX + CW / 2 - wf.hx * s)      // head stays on Pip's centre line
            const drawY = Math.round(CY_base - dH)                 // this frame's own feet on the ground

            ctx.imageSmoothingEnabled = false
            ctx.globalAlpha = renderAlpha
            ctx.drawImage(poseImg, wf.x * k, wf.y * k, wf.w * k, wf.h * k, drawX, drawY, dW, dH)
            ctx.globalAlpha = 1
            ctx.imageSmoothingEnabled = true
            spriteDrawn = true
          }

          if (isWalk) return

          const frameOrder = poseKey === 'characterIdle' ? IDLE_FRAME_ORDER
                : null
          const frameIndex = frameOrder ? frameOrder[i0 % frameOrder.length] : i0
          const idxA = ((frameIndex % frames.length) + frames.length) % frames.length
          const currentFrame = frames[idxA]
          if (!currentFrame || !Number.isFinite(currentFrame.x) || !Number.isFinite(currentFrame.y) ||
              !Number.isFinite(currentFrame.w) || !Number.isFinite(currentFrame.h) ||
              currentFrame.w <= 0 || currentFrame.h <= 0) {
            throw new Error(`Invalid sprite frame for ${poseKey}.`)
          }
          const isIdle = poseKey === 'characterIdle'
          const spriteScale = movementRenderHeight / (poseKey === 'characterRun' ? RUN_FRAME_BOX.h : currentFrame.h)
          const drawFrame = (animFrame, alpha) => {
            if (isIdle) {
              const sourceX = animFrame.x
              const sourceY = animFrame.y
              const cropWidth = animFrame.w
              const cropHeight = animFrame.h
              const dHeight = movementRenderHeight
              const dWidth = dHeight * (cropWidth / cropHeight)
              if (!Number.isFinite(dWidth) || !Number.isFinite(dHeight)) throw new Error('Invalid idle sprite dimensions.')
              const tileSize = tileWidth
              const startGridX = Math.max(4, tileSize * 0.04)
              const rawDestX = Number.isFinite(centerOverride)
                ? centerOverride - dWidth / 2
                : startGridX + visualTile * tileSize + (tileSize - dWidth) / 2
              const rawDestY = CY_base - dHeight
              const destX = Number.isFinite(rawDestX) ? rawDestX : 0
              const destY = Number.isFinite(rawDestY) ? rawDestY : feetLine - getPipRenderHeight()
              ctx.globalAlpha = alpha
              ctx.drawImage(
                poseImg,
                sourceX, sourceY, cropWidth, cropHeight,
                destX, destY, dWidth, dHeight
              )
              ctx.globalAlpha = 1
              return
            }
            const box = poseKey === 'characterRun' ? RUN_FRAME_BOX : animFrame
            const fw = box.w * spriteScale
            const fh = box.h * spriteScale
            const fx = CX + (CW - fw) / 2
            const drawX = Number.isFinite(fx) ? fx : 0
            const drawY = Number.isFinite(CY_base - fh) ? CY_base - fh : feetLine - getPipRenderHeight()
            ctx.globalAlpha = renderAlpha
            ctx.drawImage(poseImg, animFrame.x, animFrame.y, animFrame.w, animFrame.h, drawX, drawY, fw, fh)
            ctx.globalAlpha = 1
          }
          ctx.imageSmoothingEnabled = false
          drawFrame(frames[idxA], renderAlpha)
          ctx.globalAlpha = 1
          ctx.imageSmoothingEnabled = true
          spriteDrawn = true
        } catch (e) {
          console.error('Sprite frame draw failed, using placeholder:', e)
        }
      }
      if (!spriteDrawn) {
        if (pose === 'idle') return
        ctx.globalAlpha = renderAlpha
        const CH = CW * 1.1
        ctx.fillStyle = 'rgba(15,23,42,0.14)'
        ctx.beginPath(); ctx.ellipse(CX + CW/2, feetLine, CW * 0.55, Math.max(4, CW*0.09), 0, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = C.emerald
        if (ctx.roundRect) ctx.roundRect(CX, CY_base - CH, CW, CH, CW * 0.18)
        else ctx.rect(CX, CY_base - CH, CW, CH)
        ctx.fill()
        const eyeY = CY_base - CH + CH * 0.38
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(CX + CW*0.3, eyeY, CW*0.12, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(CX + CW*0.7, eyeY, CW*0.12, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = C.onyx
        ctx.beginPath(); ctx.arc(CX + CW*0.3, eyeY, CW*0.06, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(CX + CW*0.7, eyeY, CW*0.06, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle = C.amber
        ctx.fillRect(CX - CW*0.04, CY_base - CH + CH * 0.18, CW * 1.08, CH * 0.1)
        ctx.globalAlpha = 1
      }
    }

    // ── Island 3: boss, HP bar, shockwave, floating damage and hurt effects ──
    // Drawn AFTER Pip, so it works even though the walk pose returns early
    // from drawSceneInner.
    function drawBossOverlay(ctx, now) {
      const cfg = bossCfgRef.current
      const W = ctx.canvas.width
      const H = ctx.canvas.height
      const { dx, dw } = bgRenderRectRef.current
      const fx = bossFxRef.current
      const feet = Number.isFinite(groundLineRef.current) && groundLineRef.current > 0
        ? groundLineRef.current
        : H * 0.72 - 26
      const imgW = dw > 0 ? dw : W
      const imgX = dw > 0 ? dx : 0

      // HP bar glides towards its target
      const targetHp = bossHpTargetRef.current
      bossHpRef.current += (targetHp - bossHpRef.current) * 0.12
      if (Math.abs(targetHp - bossHpRef.current) < 0.02) bossHpRef.current = targetHp
      const hp = Math.max(0, bossHpRef.current)

      const rr = (x, y, w, h, r) => {
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
        else ctx.rect(x, y, w, h)
      }

      // ---- boss geometry (new sheet, feet on the ground) ----
      const sheet = imgs.current.bossGolemSprite
      const SINK = 3                                   // feet sink this many px into the ground
      const u = (H * 0.44) / BOSS_STAND_H_REF          // screen px per sheet px
      const bossH = BOSS_STAND_H_REF * u
      const bossW = BOSS_STAND_W_REF * u
      const bossCx = imgX + imgW * 0.80
      const bossY = feet + SINK - bossH
      bossGeomRef.current = { cx: bossCx, w: bossW }   // Pip reads this to know where to dash to

      const sinceHit = now - fx.hitStart
      const sinceAttack = now - fx.attackStart
      const sinceDefeat = now - fx.defeatStart
      let shakeX = 0
      if (sinceHit >= 0 && sinceHit < BOSS_HIT_SHAKE_MS) {
        shakeX = Math.sin(sinceHit / 22) * 9 * (1 - sinceHit / BOSS_HIT_SHAKE_MS)
      }
      const flash = sinceHit >= 0 && sinceHit < 180

      // Which frame? idle loop, attack sequence, or collapse on defeat
      let rowKey = 'idle'
      let frame = Math.floor(now / (1000 / BOSS_IDLE_FPS)) % 8
      let alpha = 1
      if (sinceDefeat >= 0) {
        rowKey = 'attack'
        const p = Math.min(1, sinceDefeat / BOSS_DEFEAT_COLLAPSE_MS)
        frame = p < 0.34 ? 3 : p < 0.67 ? 4 : 5          // slam -> recoil -> kneeling in dust
        if (sinceDefeat > BOSS_DEFEAT_COLLAPSE_MS) {
          alpha = Math.max(0.3, 1 - (sinceDefeat - BOSS_DEFEAT_COLLAPSE_MS) / 1500)
        }
      } else if (sinceAttack >= 0 && sinceAttack < BOSS_ATTACK_MS) {
        rowKey = 'attack'
        frame = Math.min(BOSS_ATTACK_FRAMES - 1, Math.floor(sinceAttack / BOSS_ATTACK_FRAME_MS))
      }

      if (sheet && sheet.naturalWidth > 0) {
        const row = BOSS_ROWS[rowKey]
        const kx = sheet.naturalWidth / BOSS_SHEET_REF.w
        const ky = sheet.naturalHeight / BOSS_SHEET_REF.h
        const x0 = row.cuts[frame]
        const x1 = row.cuts[frame + 1]
        const dwF = (x1 - x0) * u
        const dhF = (row.bottom - row.top) * u
        const destX = bossCx - dwF / 2 + shakeX
        const destY = feet + SINK - (row.feet - row.top) * u
        ctx.save()
        ctx.imageSmoothingEnabled = false
        ctx.globalAlpha = alpha
        const filters = []
        if (cfg.tint && cfg.tint !== 'none') filters.push(cfg.tint)
        if (flash) filters.push('brightness(2.4)')
        if (filters.length) ctx.filter = filters.join(' ')
        ctx.drawImage(
          sheet,
          x0 * kx, row.top * ky, (x1 - x0) * kx, (row.bottom - row.top) * ky,
          Math.round(destX), Math.round(destY), dwF, dhF
        )
        ctx.restore()
      }

      // ---- HP bar ----
      const barW = Math.max(150, Math.min(240, bossW * 1.25))
      const barH = 14
      const barX = bossCx - barW / 2
      const barY = Math.max(24, bossY - 36)
      ctx.save()
      ctx.textAlign = 'center'
      ctx.font = "700 12px 'JetBrains Mono', monospace"
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'
      ctx.shadowBlur = 4
      ctx.fillText(String(cfg.name || 'Boss').toUpperCase(), bossCx, barY - 7)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(15,23,42,0.88)'
      rr(barX - 2, barY - 2, barW + 4, barH + 4, 8)
      ctx.fill()
      const ratio = Math.max(0, Math.min(1, hp / Math.max(1, cfg.maxHp)))
      if (ratio > 0) {
        const g = ctx.createLinearGradient(barX, 0, barX + barW, 0)
        g.addColorStop(0, '#EF4444')
        g.addColorStop(1, '#F97316')
        ctx.fillStyle = g
        rr(barX, barY, barW * ratio, barH, 6)
        ctx.fill()
      }
      ctx.font = "700 10px 'JetBrains Mono', monospace"
      ctx.fillStyle = '#fff'
      ctx.fillText(`${Math.ceil(hp)} / ${cfg.maxHp}`, bossCx, barY + 11)
      ctx.restore()

      // ---- boss slam + ground shockwave, and Pip's melee impact flash ----
      const routeTiles = Math.max(1, totalTiles)
      const tileW = W / routeTiles
      const pipTile = ((lastPipX.current % routeTiles) + routeTiles) % routeTiles
      const pipCx = Math.max(4, tileW * 0.04) + (getVisualTilePosition(pipTile, routeTiles, bgPath) + 0.5) * tileW
      const bossChest = { x: bossCx - bossW * 0.12, y: bossY + bossH * 0.45 }

      // Slam: dust bursts where his fist lands and a chunk of rock is hurled at Pip.
      const slamX = bossCx - bossW * 0.3
      const slamY = feet - 6
      const sinceSlam = sinceAttack - BOSS_SLAM_AT
      if (sinceSlam >= 0 && sinceSlam < 450) {
        const t = sinceSlam / 450
        ctx.save()
        for (let k = 0; k < 7; k++) {
          const ang = -Math.PI * (0.1 + 0.8 * (k / 6))
          const dist = t * bossH * 0.28 * (0.6 + (k % 3) * 0.25)
          ctx.fillStyle = `rgba(150, 130, 105, ${0.5 * (1 - t)})`
          ctx.beginPath()
          ctx.arc(slamX + Math.cos(ang) * dist, slamY + Math.sin(ang) * dist, 6 + t * 14, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      // A rock with stone body, lit facet and a patch of moss (matches the golem)
      const drawRock = (x, y, size, rot, alpha = 1) => {
        const pts = [[-1, -0.35], [-0.5, -0.95], [0.35, -0.85], [1, -0.3], [0.8, 0.55], [0.05, 0.95], [-0.8, 0.6]]
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(rot)
        ctx.globalAlpha = alpha
        ctx.beginPath()
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * size, py * size) : ctx.moveTo(px * size, py * size)))
        ctx.closePath()
        ctx.fillStyle = '#6B5D4A'
        ctx.fill()
        ctx.lineJoin = 'round'
        ctx.lineWidth = Math.max(2, size * 0.14)
        ctx.strokeStyle = '#2E261C'
        ctx.stroke()
        ctx.fillStyle = '#8F7F66'
        ctx.beginPath()
        ctx.moveTo(-0.5 * size, -0.95 * size)
        ctx.lineTo(0.35 * size, -0.85 * size)
        ctx.lineTo(0.1 * size, -0.2 * size)
        ctx.lineTo(-0.6 * size, -0.3 * size)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#5E8F2A'
        ctx.beginPath()
        ctx.moveTo(0.2 * size, 0.3 * size)
        ctx.lineTo(0.75 * size, 0.5 * size)
        ctx.lineTo(0.1 * size, 0.9 * size)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      const rockStart = fx.attackStart + BOSS_SLAM_AT
      const rockT = (now - rockStart) / BOSS_WAVE_MS
      const rockSize = Math.max(9, bossH * 0.085)
      const rockFrom = { x: slamX, y: slamY - bossH * 0.1 }
      const rockTo = { x: pipCx, y: feet - getPipRenderHeight() * 0.5 }
      const rockArc = bossH * 0.45
      const rockAt = tt => ({
        x: rockFrom.x + (rockTo.x - rockFrom.x) * tt,
        y: rockFrom.y + (rockTo.y - rockFrom.y) * tt - Math.sin(tt * Math.PI) * rockArc
      })
      if (rockT >= 0 && rockT <= 1) {
        // dusty trail behind the rock
        ctx.save()
        for (let k = 4; k >= 1; k--) {
          const p = rockAt(Math.max(0, rockT - k * 0.05))
          ctx.fillStyle = `rgba(150, 130, 105, ${0.35 * (1 - k / 5)})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, rockSize * (0.5 - k * 0.07), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        const p = rockAt(rockT)
        drawRock(p.x, p.y, rockSize, rockT * Math.PI * 6)
      }
      // Impact: the rock bursts into small pieces on Pip
      const sinceRock = now - (rockStart + BOSS_WAVE_MS)
      if (sinceRock >= 0 && sinceRock < 320) {
        const t = sinceRock / 320
        for (let k = 0; k < 6; k++) {
          const ang = -Math.PI * (0.05 + 0.9 * (k / 5))
          const dist = t * rockSize * (2.2 + (k % 3) * 0.7)
          drawRock(
            rockTo.x + Math.cos(ang) * dist,
            rockTo.y + Math.sin(ang) * dist + t * t * rockSize * 1.5,
            rockSize * 0.35,
            t * 6 + k,
            1 - t
          )
        }
      }

      // Pip's melee impact: a quick white slash on the boss
      const sinceSlash = now - fx.hitStart
      if (sinceSlash >= 0 && sinceSlash < SLASH_FX_MS) {
        const t = sinceSlash / SLASH_FX_MS
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 1 - t
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = 6 - t * 4
        ctx.lineCap = 'round'
        const r = bossH * (0.18 + t * 0.12)
        ctx.beginPath()
        ctx.arc(bossChest.x, bossChest.y, r, Math.PI * 0.75, Math.PI * 1.45)
        ctx.stroke()
        ctx.restore()
      }

      // ---- floating damage numbers ----
      popupsRef.current = popupsRef.current.filter(p => now - p.start < 1200)
      popupsRef.current.forEach(p => {
        const age = now - p.start
        if (age < 0) return
        const rise = age / 1200
        const x = p.target === 'boss' ? bossCx : pipCx
        const y0 = p.target === 'boss' ? bossY + bossH * 0.25 : feet - getPipRenderHeight() - 12
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - rise * rise)
        ctx.font = "800 22px 'JetBrains Mono', monospace"
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(15,23,42,0.85)'
        ctx.fillStyle = p.color
        ctx.strokeText(p.text, x, y0 - rise * 46)
        ctx.fillText(p.text, x, y0 - rise * 46)
        ctx.restore()
      })

      // ---- Pip got hit: red vignette ----
      const sinceHurt = now - fx.hurtStart
      if (sinceHurt >= 0 && sinceHurt < 450) {
        const a = 0.3 * (1 - sinceHurt / 450)
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7)
        vg.addColorStop(0, 'rgba(239,68,68,0)')
        vg.addColorStop(1, `rgba(239,68,68,${a * 2})`)
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, W, H)
      }

      // ---- victory banner ----
      if (sinceDefeat >= 300) {
        const t = sinceDefeat - 300
        const a = t < 400 ? t / 400 : t > 3000 ? Math.max(0, 1 - (t - 3000) / 600) : 1
        if (a > 0) {
          ctx.save()
          ctx.globalAlpha = a
          ctx.textAlign = 'center'
          ctx.font = "800 34px 'JetBrains Mono', monospace"
          ctx.lineWidth = 6
          ctx.strokeStyle = 'rgba(15,23,42,0.9)'
          ctx.fillStyle = '#FBBF24'
          const label = `${String(cfg.name || 'Boss').toUpperCase()} DEFEATED!`
          ctx.strokeText(label, W / 2, H * 0.2)
          ctx.fillText(label, W / 2, H * 0.2)
          if (cfg.finale) {
            ctx.font = "800 22px 'JetBrains Mono', monospace"
            ctx.strokeText('ISLAND 3 CLEARED!', W / 2, H * 0.2 + 36)
            ctx.fillText('ISLAND 3 CLEARED!', W / 2, H * 0.2 + 36)
          }
          ctx.restore()
        }
      }
    }

    // The boss slams the ground and the shockwave hits Pip. Safe to call twice:
    // a second call inside the lock window is ignored, so there is never a
    // double animation.
    const triggerBossAttack = useCallback(() => {
      const now = performance.now()
      const fx = bossFxRef.current
      if (now < fx.attackLockUntil) return false
      fx.attackLockUntil = now + ENEMY_ATTACK_LOCK_MS
      fx.attackStart = now
      fx.hurtStart = now + BOSS_HIT_DELAY_MS     // Pip is hurt when the rock lands
      popupsRef.current.push({ target: 'pip', text: '-1 \u2665', color: '#F87171', start: now + BOSS_HIT_DELAY_MS })
      setTimeout(() => {
        if (bossCfgRef.current.enabled) playGolemAttackSfx()
      }, BOSS_SFX_DELAY_MS)
      return true
    }, [])

    // Wrapper so the overlay is always drawn LAST, even though the walk pose
    // returns early from drawSceneInner. On Island 3 it also shakes the screen
    // when Pip is hit.
    function drawScene(...args) {
      const ctx = args[0]
      const boss = bossCfgRef.current.enabled
      let shaken = false
      if (boss) {
        const sinceHurt = performance.now() - bossFxRef.current.hurtStart
        if (sinceHurt >= 0 && sinceHurt < 380) {
          ctx.save()
          shaken = true
          ctx.translate(Math.sin(sinceHurt / 18) * 7 * (1 - sinceHurt / 380), 0)
        }
      }
      drawSceneInner(...args)
      if (boss) drawBossOverlay(ctx, performance.now())
      if (shaken) ctx.restore()
    }

    drawSceneRef.current = drawScene

    // Start idle loop once assets are ready; keep it running whenever idle
    useEffect(() => {
      if (assetsReady) startIdleLoop()
      return () => stopIdleLoop()
    }, [assetsReady, stopIdleLoop]) // eslint-disable-line

    // Level 5 intro: Pip fades in inside the arched door, walks down the stairs, stops by the anvil
    useEffect(() => {
      if (currentLevel !== 5 || !assetsReady) return undefined
      const ctx = cvs.current?.getContext('2d')
      if (!ctx) return undefined

      let cancelled = false
      let frame = 0
      let start = null

      stopIdleLoop()
      movementRunning.current = true
      pipAlphaRef.current = 0
      walkFrameIndexRef.current = 0
      lastPipX.current = LEVEL5_START_TILE
      currentTileRef.current = LEVEL5_START_TILE

      // 0..1 -> stepped 0..1: a quick drop, then flat, repeated for each stair
      const stairStep = t => {
        const s = Math.min(1, Math.max(0, t)) * LEVEL5_STAIRS.steps
        const i = Math.min(LEVEL5_STAIRS.steps - 1, Math.floor(s))
        const u = Math.min(1, (s - i) / 0.4)
        return (i + u * u * (3 - 2 * u)) / LEVEL5_STAIRS.steps
      }

      const finish = () => {
        pipAlphaRef.current = 1
        pipXRef.current = LEVEL5_START_TILE
        lastPipX.current = LEVEL5_START_TILE
        currentTileRef.current = LEVEL5_START_TILE
        setPipX(LEVEL5_START_TILE)
        movementRunning.current = false
        walkFrameIndexRef.current = 0
        startIdleLoop()
        onIntroComplete?.()
      }

          const step = now => {
        if (cancelled) return
        if (level5FxRef.current.active) { pipAlphaRef.current = 1; return }  // code already run
        const { dx, dy, dw, dh } = bgRenderRectRef.current
        if (!dw) { frame = requestAnimationFrame(step); return }
        if (start === null) start = now

        const elapsed = now - start
        const p = Math.min(1, elapsed / LEVEL5_INTRO_MS)

        const tileW = ctx.canvas.width / Math.max(1, totalTiles)
        const xStop   = Math.max(4, tileW * 0.04) + (LEVEL5_START_TILE + 0.5) * tileW
        const xStart  = dx + dw * LEVEL5_STAIRS.x0
        const xLand   = dx + dw * LEVEL5_STAIRS.x1
        const xSettle = Math.min(dx + dw * LEVEL5_STAIRS.x2, xStop)
        const yTop    = dy + dh * LEVEL5_STAIRS.y0
        const yLand   = dy + dh * LEVEL5_STAIRS.y1
        const yGround = groundLineRef.current

        // constant walking speed, so his steps match the ground he covers
        const cx = xStart + p * Math.max(1, xStop - xStart)

        let fy
        if (cx <= xLand) {                       // down the steps
          fy = yTop + (yLand - yTop) * stairStep((cx - xStart) / Math.max(1, xLand - xStart))
        } else if (cx <= xSettle) {              // off the bottom step, forward onto the path
          const t = (cx - xLand) / Math.max(1, xSettle - xLand)
          fy = yLand + (yGround - yLand) * (t * t * (3 - 2 * t))
        } else {
          fy = yGround
        }

        pipAlphaRef.current = Math.min(1, elapsed / LEVEL5_INTRO_FADE_MS)
        walkFrameIndexRef.current = Math.floor((elapsed / 1000) * LEVEL5_WALK_FPS)
        const onStairs = cx > xStart && cx < xLand
        const bounce = onStairs ? 0 : Math.sin(elapsed / 110) * 1.2

        drawScene(ctx, LEVEL5_START_TILE, bounce, false, 'walk', 0, elapsed, pipAlphaRef.current, fy, cx)

        if (p < 1) { frame = requestAnimationFrame(step); return }
        finish()
      }

      frame = requestAnimationFrame(step)
      return () => {
        cancelled = true
        cancelAnimationFrame(frame)
        movementRunning.current = false
        pipAlphaRef.current = 1
      }
    }, [introToken, currentLevel, assetsReady, lessonId, resetToken, replayToken]) // eslint-disable-line

        // Level 7 intro: Pip fades in at the archway, walks down the Ledger Hall's stairs
    // and stops facing the construct.
    useEffect(() => {
      if (currentLevel !== 7 || !assetsReady) return undefined
      const ctx = cvs.current?.getContext('2d')
      if (!ctx) return undefined

      let cancelled = false
      let frame = 0
      let start = null

      stopIdleLoop()
      movementRunning.current = true
      pipAlphaRef.current = 0
      walkFrameIndexRef.current = 0
      lastPipX.current = LEVEL7_ENTRY_TILE
      currentTileRef.current = LEVEL7_ENTRY_TILE

      const stairStep = t => {
        const s = Math.min(1, Math.max(0, t)) * LEVEL7_STAIRS.steps
        const i = Math.min(LEVEL7_STAIRS.steps - 1, Math.floor(s))
        const u = Math.min(1, (s - i) / 0.4)
        return (i + u * u * (3 - 2 * u)) / LEVEL7_STAIRS.steps
      }

      const finish = () => {
        pipAlphaRef.current = 1
        pipXRef.current = LEVEL7_ENTRY_TILE
        lastPipX.current = LEVEL7_ENTRY_TILE
        currentTileRef.current = LEVEL7_ENTRY_TILE
        setPipX(LEVEL7_ENTRY_TILE)
        movementRunning.current = false
        walkFrameIndexRef.current = 0
        startIdleLoop()
        onIntroComplete?.()
      }

        const step = now => {
        if (cancelled) return
        const { dx, dy, dw, dh } = bgRenderRectRef.current
        if (!dw) { frame = requestAnimationFrame(step); return }
        if (start === null) start = now

        const elapsed = now - start
        const tileW = ctx.canvas.width / Math.max(1, totalTiles)
        const xStop  = Math.max(4, tileW * 0.04) + (LEVEL7_ENTRY_TILE + 0.5) * tileW
        const xStart = dx + dw * LEVEL7_STAIRS.x0
        const xLand  = dx + dw * LEVEL7_STAIRS.x1
        const xEdge  = dx + dw * LEVEL7_STAIRS.x2
        const xDrop  = dx + dw * LEVEL7_STAIRS.x3
        const yTop   = dy + dh * LEVEL7_STAIRS.y0
        const yLand  = dy + dh * LEVEL7_STAIRS.y1
        const yGround = dy + dh * LEVEL7_GROUND_FRACTION

        // constant walking speed: duration follows the distance
        const totalDist = Math.max(1, xStop - xStart)
        const introMs = (totalDist / (dw * LEVEL7_WALK_SPEED)) * 1000
        const p = Math.min(1, elapsed / introMs)
        const cx = xStart + p * totalDist

        let fy
        if (cx <= xLand) {                       // down the stairs
          fy = yTop + (yLand - yTop) * stairStep((cx - xStart) / Math.max(1, xLand - xStart))
        } else if (cx <= xEdge) {                // along the landing
          fy = yLand
        } else if (cx <= xDrop) {                // short drop onto the walkway
          const t = (cx - xEdge) / Math.max(1, xDrop - xEdge)
          fy = yLand + (yGround - yLand) * t * t
        } else {
          fy = yGround
        }

        pipAlphaRef.current = Math.min(1, elapsed / LEVEL7_INTRO_FADE_MS)
        walkFrameIndexRef.current = Math.floor((elapsed / 1000) * LEVEL7_INTRO_WALK_FPS)
        const onStairs = cx > xStart && cx < xLand
        const bounce = onStairs ? 0 : Math.sin(elapsed / 110) * 1.2

        drawScene(ctx, LEVEL7_ENTRY_TILE, bounce, false, 'walk', 0, elapsed, pipAlphaRef.current, fy, cx)

        if (p < 1) { frame = requestAnimationFrame(step); return }
        finish()
      }

      frame = requestAnimationFrame(step)
      return () => {
        cancelled = true
        cancelAnimationFrame(frame)
        movementRunning.current = false
        pipAlphaRef.current = 1
      }
    }, [introToken, currentLevel, assetsReady, lessonId, resetToken, replayToken]) // eslint-disable-line
    
      // Level 8: the torches ignite (fire sprite sheet) as the level starts
    useEffect(() => {
      if (currentLevel !== 8 || !assetsReady) return undefined
      const t = setTimeout(() => triggerFireIgnite(), 400)
      return () => clearTimeout(t)
    }, [lessonId, resetToken, replayToken, assetsReady, currentLevel]) // eslint-disable-line

    // Island 3, NEW LEVEL: fresh boss effects, and remember the current tokens so a
    // Run / lost-life that happened on the previous level cannot fire here (this was
    // making the golem attack by itself when a level started).
    useEffect(() => {
      bossFxRef.current = newBossFx()
      popupsRef.current = []
      playBaselineRef.current = playToken
      hitBaselineRef.current = hitToken
    }, [lessonId, isBossIsland]) // eslint-disable-line

    // Island 3, reset / replay / new level: the boss HP bar goes back to the HP he had
    // before this level. The attack animation is NOT cleared here, so a reset right after
    // a wrong answer no longer wipes the golem's counter-attack.
    useEffect(() => {
      bossHpRef.current = bossHpBefore
      bossHpTargetRef.current = bossHpBefore
      bossFxRef.current.defeatStart = Infinity
      setBossDefeated(false)
      setBossCongrats(null)
    }, [lessonId, resetToken, replayToken, isBossIsland, bossHpBefore]) // eslint-disable-line

    // The lesson page can bump hitToken each time the player loses a life, or fire
    //   window.dispatchEvent(new Event('cq:life-lost'))
    // The boss then strikes back.
    useEffect(() => {
      if (!hitToken || !isBossIsland || hitToken === hitBaselineRef.current) return
      triggerBossAttack()
    }, [hitToken]) // eslint-disable-line

    // Tell PlayerDeath (which lives on the lesson page) that the boss is active, so a
    // wrong answer makes the golem attack instead of playing the lightning strike.
    useEffect(() => {
      if (typeof window === 'undefined') return undefined
      window.__cqBossIsland = !!isBossIsland
      window.__cqBossHitDelay = BOSS_HIT_DELAY_MS
      return () => { window.__cqBossIsland = false }
    }, [isBossIsland])

    useEffect(() => {
      if (!isBossIsland) return undefined
      const onLifeLost = () => triggerBossAttack()
      window.addEventListener('cq:life-lost', onLifeLost)
      return () => window.removeEventListener('cq:life-lost', onLifeLost)
    }, [isBossIsland, triggerBossAttack])

    // Island 2 only: entrance. Every time a level loads, Pip walks in from the left
    // edge of the map and stops on his start tile (about one second), then idles.
    useEffect(() => {
      if (!(isIsland2 || currentLevel === 8) || !assetsReady) return undefined
      const ctx = cvs.current?.getContext('2d')
      if (!ctx) return undefined

      let cancelled = false
      let frame = 0
      let start = null
      const startTile = entranceStartTile
      console.log('[Island 2 entrance]', { lessonId, module_id: lessonData?.module_id, initial_tile: lessonData?.initial_tile, initialPipPosition, startTile })

      entranceActiveRef.current = true
      stopIdleLoop()
      movementRunning.current = true
      pipAlphaRef.current = 1
      walkFrameIndexRef.current = 0
      pipXRef.current = startTile
      lastPipX.current = startTile       // a Run pressed mid-entrance starts from the right tile
      currentTileRef.current = startTile

      const finish = () => {
        entranceActiveRef.current = false
        pipAlphaRef.current = 1
        movementRunning.current = false
        walkFrameIndexRef.current = 0
        startIdleLoop()
        onIntroComplete?.()
      }

      const step = now => {
        if (cancelled || !entranceActiveRef.current) return
        if (start === null) start = now

        const elapsed = now - start
        const introMs = currentLevel === 8 ? LEVEL8_INTRO_MS : ISLAND_ENTRANCE_MS
        const p = Math.min(1, elapsed / introMs)
        const eased = 1 - Math.pow(1 - p, 2)   // ease-out: slows down as he arrives

        const routeTiles = Math.max(1, totalTiles)
        const tileW = ctx.canvas.width / routeTiles
        const localTile = ((startTile % routeTiles) + routeTiles) % routeTiles
        const visualTile = getVisualTilePosition(localTile, routeTiles, bgPath)
        // Same spot the idle pose uses, so there is no jump when the walk ends
        const endCenter = Math.max(4, tileW * 0.04) + (visualTile + 0.5) * tileW
        const startCenter = -getPipRenderWidth()
        const cx = startCenter + (endCenter - startCenter) * eased

        walkFrameIndexRef.current = Math.floor((elapsed / 1000) * ISLAND_WALK_FPS)
        drawScene(ctx, startTile, Math.sin(p * Math.PI * 6) * 1.5, false, 'walk', 0, elapsed, 1, null, cx)

        if (p < 1) { frame = requestAnimationFrame(step); return }
        finish()
      }

      frame = requestAnimationFrame(step)
      return () => {
        cancelled = true
        cancelAnimationFrame(frame)
        entranceActiveRef.current = false
        movementRunning.current = false
      }
    }, [introToken, assetsReady, lessonId, resetToken, replayToken, isIsland2, currentLevel, entranceStartTile]) // eslint-disable-line

    useEffect(() => {
        if (currentLevel === 5 || currentLevel === 7 || currentLevel === 8 || isIsland2) return undefined
      if (skipsWalkCutscene && !usesSharedStart) {
        pipXRef.current = entranceStartTile
        lastPipX.current = entranceStartTile
        currentTileRef.current = entranceStartTile
        pipAlphaRef.current = 1
        setPipX(entranceStartTile)
        setTileProgress(Math.round(entranceStartTile))
        setIsMoving(false)
        setIsCutscenePlaying(false)
        setIsPlayingCutscene(false)
        onIntroComplete?.()
        return
      }

      if (usesSharedStart) {
        pipXRef.current = sharedStartPosition
        lastPipX.current = sharedStartPosition
        currentTileRef.current = sharedStartPosition
        pipAlphaRef.current = 1
        setPipX(sharedStartPosition)
        setTileProgress(Math.round(sharedStartPosition))
        setIsMoving(false)
        setIsCutscenePlaying(false)
        setIsPlayingCutscene(false)
        golemStateRef.current = isLevelTwo ? GOLEM_STANDING : GOLEM_DORMANT
        setGolemState(isLevelTwo ? GOLEM_STANDING : GOLEM_DORMANT)
        golemFrameRef.current = isLevelTwo ? GOLEM_FRAME_COUNT - 1 : 0
        onIntroComplete?.()
        return
      }

      movementRunning.current = true
      stopIdleLoop()
      setRunState('running')
      setErrMsg('')
      setBubble(null)
      setRunMovedTiles(0)

      let cancelled = false
      let pipX = 0
      let tile = 0
      let previousTime = null
      let animationClock = 0
      const ctx = cvs.current?.getContext('2d')

      if (!ctx) return undefined

      lastPipX.current = 0
      currentTileRef.current = 0

      const reportIntroProgress = x => {
        lastPipX.current = x
        currentTileRef.current = x
        setTileProgress(Math.round(x))
        if (onCharacterPosition && cvs.current) {
          const rect = cvs.current.getBoundingClientRect()
          const tileWidth = rect.width / Math.max(1, totalTiles)
          const visualTile = getVisualTilePosition(x, totalTiles, bgPath)
          const feetY = Number.isFinite(groundLineRef.current)
            ? groundLineRef.current
            : canvasH * 0.72 - 26
          onCharacterPosition({
            x: rect.left + visualTile * tileWidth + tileWidth / 2,
            y: rect.top + feetY - getPipRenderHeight() / 2
          })
        }
      }

      reportIntroProgress(0)

      const step = () => {
        if (cancelled) return
        if (tile >= 5) {
          movementRunning.current = false
          pipX = 5
          lastPipX.current = pipX
          currentTileRef.current = pipX
          reportIntroProgress(pipX)
          drawScene(ctx, pipX, 0, false, 'idle', 0, 0, 1)
          setRunState('idle')
          onIntroComplete?.()
          startIdleLoop()
          return
        }

        const from = tile
        const to = tile + 1
        const start = performance.now()
        const duration = 520
        previousTime = null

        const frame = time => {
          if (cancelled) return
          if (previousTime === null) previousTime = time
          animationClock += Math.min(50, time - previousTime)
          previousTime = time
          const progress = Math.min(1, (time - start) / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          pipX = from + (to - from) * eased
          reportIntroProgress(pipX)
          drawScene(ctx, pipX, Math.sin(progress * Math.PI * 4) * 2.5, false, 'walk', 0, animationClock, 1)

          if (progress < 1) {
            raf.current = requestAnimationFrame(frame)
          } else {
            tile += 1
            step()
          }
        }

        raf.current = requestAnimationFrame(frame)
      }

      step()

      return () => {
        cancelled = true
        movementRunning.current = false
        if (raf.current) cancelAnimationFrame(raf.current)
      }
    }, [introToken, assetsReady, usesSharedStart, isLevelTwo, sharedStartPosition, skipsWalkCutscene, entranceStartTile]) // eslint-disable-line

    useEffect(() => {
      if (playToken === 0) return
      if (isBossIsland && playToken === playBaselineRef.current) return   // stale Run from a previous level
      entranceActiveRef.current = false   // Run pressed: stop any entrance still playing
      movementRunning.current = true
      stopIdleLoop()
      pipAlphaRef.current = 1
      setRunState('running'); setErrMsg(''); setBubble(null); setDialogueText(''); setBubbleOpacity(1); setRunMovedTiles(0)
      // Guards every rAF/setTimeout callback below. Without this, clicking
      // Run again while a previous run's say() bubble timeout (or jump/land
      // rAF chain) was still pending let that stale callback keep firing
      // afterward — using its own closured `i`/`events`/`pipX` from the OLD
      // run, interleaved with the new one. That's what could make a say()
      // seem to silently do nothing (its bubble got set then immediately
      // clobbered by a stale callback) or an animation look corrupted.
      let cancelled = false
      const executionVersion = executionVersionRef.current
      let events = []
      let executionFinished = false
      const isLocalGolemSuccess = executionMode === 'guided' &&
        String(code || '').trim() === GOLEM_CORRECT_SNIPPET
      const normalizedCode = String(code || '').replace(/\s+/g, ' ').trim()
      const isLocalLevelTwoSuccess = isLevelTwo && normalizedCode === LEVEL_TWO_CODE
      const isLocalLevelThreeSuccess = currentLevel === 3 && normalizedCode === LEVEL_THREE_CODE
      const isLocalLevelFourSuccess = currentLevel === 4 && isLevelFourSolution(code)
      const isLocalLevelFiveSuccess = currentLevel === 5 && normalizedCode === LEVEL5_KEYNAME_CODE
      const isLocalLevelSixSuccess = currentLevel === 6 && normalizedCode === LEVEL6_CODE
      const isLocalLevelSevenSuccess = currentLevel === 7 && normalizedCode === LEVEL_SEVEN_CODE
      const level8SolutionNorm = String(lessonData?.solution_code || '').replace(/\s+/g, ' ').trim()
      const isLocalLevelEightSuccess = currentLevel === 8 &&
        (normalizedCode === LEVEL8_CODE || (!!level8SolutionNorm && normalizedCode === level8SolutionNorm))
      // Island 2 only: the learner's code matches the lesson's stored solution_code
      const islandSolutionNorm = String(lessonData?.solution_code || '').replace(/\s+/g, ' ').trim()
      const isLocalIslandSuccess = isIsland2 && !!islandSolutionNorm && normalizedCode === islandSolutionNorm
      // Island 3 (boss fight): anything that is not the solution is a wrong answer
      const isBossWrong = isBossIsland && !isLocalIslandSuccess

      if (isLocalLevelThreeSuccess) {
        triggerFireIgnite()
      }
          if (isLocalLevelSevenSuccess) {
        triggerLibrarianStepAside()
      }

          if (isLocalLevelEightSuccess) {
        triggerArmExtend()
      }

      if (isLocalGolemSuccess) {
        executionFinished = true
        movementRunning.current = false
        setRunState('success')
        playCompletionSequence()
        onResult && onResult({
          events: [{ type: 'say', text: GOLEM_DIALOGUE }],
          code,
          error: null,
          finalX: lastPipX.current
        })
        startIdleLoop()
          } else if (!isLocalLevelTwoSuccess && !isLocalLevelThreeSuccess && !isLocalLevelFourSuccess && !isLocalLevelFiveSuccess && !isLocalLevelSixSuccess && !isLocalLevelSevenSuccess && !isLocalLevelEightSuccess && !isLocalIslandSuccess && !isBossWrong) {
        runCodeInWorker(code, lessonId, undefined, executionMode).then(res => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          executionFinished = true
          events = (res.events || []).slice(Math.max(0, eventOffset))
          const returnedOutput = String(
            res.stdout || res.output || ''
          ).trim()
          const hasOutputEvent = events.some(event =>
            ['say', 'speak', 'levelOutput', 'output', 'print', 'console', 'stdout']
              .includes(event?.type)
          )

          if (returnedOutput && !hasOutputEvent) {
            events.push({ type: 'say', text: returnedOutput })
          }
          if (res.error) {
            movementRunning.current = false
            setRunState('error'); setErrMsg(res.error)
            onResult && onResult({ events, code, error: res.error })
            startIdleLoop()
            return
          }
          step()
        })
      }

      let pipX = lastPipX.current || 0, i = 0
      let animationClock = 0
      let previousTime = null
      let reportedTile = null
      const reportProgress = x => {
        const nextTile = Math.max(0, Math.round(x))
        const nextMap = getMapForPosition(x)
        setCurrentMap(previousMap => previousMap === nextMap ? previousMap : nextMap)

        if (onCharacterPosition && cvs.current) {
          const rect = cvs.current.getBoundingClientRect()
          const routeTiles = Math.max(1, totalTiles)
          const posInMap = ((x % routeTiles) + routeTiles) % routeTiles
          const tileWidth = rect.width / routeTiles
          const visualTile = getVisualTilePosition(posInMap, routeTiles, bgPath)
          const characterX = rect.left + visualTile * tileWidth + tileWidth / 2
          const feetY = Number.isFinite(groundLineRef.current)
            ? groundLineRef.current
            : canvasH * 0.72 - 26
          const characterY = rect.top + feetY - getPipRenderHeight() / 2

          onCharacterPosition({
            x: characterX,
            y: characterY
          })
        }

        if (nextTile === reportedTile) return
        reportedTile = nextTile
        setTileProgress(nextTile)
      }
      const ctx = cvs.current.getContext('2d')
      reportProgress(pipX)

      if (isLocalLevelTwoSuccess) {
        executionFinished = true
        setBubble('doorCode: 42')
        setDialogueText('')
        setBubbleOpacity(1)
        updateDialogueAnchor(pipX)
        golemGlowStartRef.current = performance.now()
        isGateOpenRef.current = true
        setIsGateOpen(true)
        startGateOpening()
        const startTile = pipX
        const gateTile = totalTiles * 0.91
        const walkStart = performance.now()
        const walkDuration = 2200

        const animateToGate = now => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          const progress = Math.min(1, (now - walkStart) / walkDuration)
          const eased = 1 - Math.pow(1 - progress, 3)
          pipX = startTile + (gateTile - startTile) * eased
          pipXRef.current = pipX
          lastPipX.current = pipX
          setPipX(pipX)
          updateDialogueAnchor(pipX)
          reportProgress(pipX)
          walkTickRef.current += 1
          if (walkTickRef.current % 6 === 0) {
            walkFrameIndexRef.current = (walkFrameIndexRef.current + 1) % TOTAL_WALK_FRAMES
          }
          const localTile = ((pipX % totalTiles) + totalTiles) % totalTiles
          const visualPipX = getVisualTilePosition(localTile, totalTiles, bgPath) * (ctx.canvas.width / totalTiles)
          const gateRectForFade = getGateRect(imgs.current.gateSprite)
          const gateEdgePx = gateRectForFade ? gateRectForFade.visibleLeftX : ctx.canvas.width * 0.905
          const fadeStartPx = gateEdgePx - 150
          pipAlphaRef.current = visualPipX >= fadeStartPx
            ? Math.max(0, 1 - (visualPipX - fadeStartPx) / 140)
            : 1
          drawScene(ctx, pipX, Math.sin(progress * Math.PI * 6) * 2, true, 'walk', 0, now - walkStart, pipAlphaRef.current)

          if (progress < 1) {
            raf.current = requestAnimationFrame(animateToGate)
            return
          }

          movementRunning.current = false
          setIsMoving(false)
          setRunState('success')
          setIsLevelComplete(true)
          onResult && onResult({
            events: [{ type: 'say', text: 'doorCode: 42' }],
            code,
            error: null,
            finalX: pipX
          })
          startIdleLoop()
        }

        movementRunning.current = true
        setIsMoving(true)
        raf.current = requestAnimationFrame(animateToGate)
        return () => {
          cancelled = true
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

      if (isLocalLevelThreeSuccess) {
        executionFinished = true
        pipAlphaRef.current = 1
        movementRunning.current = false
        setIsMoving(false)
        startIdleLoop()   // Pip stays put; idle loop keeps the torch flicker animating

        const doneTimer = setTimeout(() => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          setRunState('idle')
          onResult && onResult({ events: [], code, error: null, finalX: pipX })
        }, LEVEL_THREE_DONE_DELAY_MS)

        return () => {
          cancelled = true
          clearTimeout(doneTimer)
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

      if (isLocalLevelFourSuccess) {
        executionFinished = true
        const popupStart = performance.now()
        const fadeStartFraction = 0.85

        const W = ctx.canvas.width
        const tileW = W / Math.max(1, totalTiles)
        const startVisual = getVisualTilePosition(
          ((pipX % totalTiles) + totalTiles) % totalTiles, totalTiles, bgPath
        )
        const startCenterX = Math.max(4, tileW * 0.04) + (startVisual + 0.5) * tileW
        let bubbleFaded = false
        let bubbleRemoved = false

        setBubble(LEVEL_FOUR_MESSAGE)
        setDialogueText('')
        setBubbleOpacity(1)
        updateDialogueAnchor(pipX)

        const animate = now => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          const sincePopup = now - popupStart

          // Phase 1: Pip stands at his starting point while the popup shows
          if (sincePopup < LEVEL4_POPUP_MS) {
            if (!bubbleFaded && sincePopup > LEVEL4_POPUP_MS - 500) {
              bubbleFaded = true
              setBubbleOpacity(0)
            }
            pipAlphaRef.current = 1
            drawScene(ctx, pipX, 0, false, 'idle', 0, now, 1)
            raf.current = requestAnimationFrame(animate)
            return
          }
          if (!bubbleRemoved) { bubbleRemoved = true; setBubble(null) }

          // Phase 2: Pip runs across the platform and fades at the far edge
          const { dx, dw } = bgRenderRectRef.current
          const endCenterX = dx + dw - getPipRenderWidth() * 0.4
          const elapsed = sincePopup - LEVEL4_POPUP_MS
          const progress = Math.min(1, elapsed / LEVEL4_RUN_MS)
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
          const centerX = startCenterX + (endCenterX - startCenterX) * eased
          const fadeProgress = Math.max(0, (eased - fadeStartFraction) / (1 - fadeStartFraction))
          pipAlphaRef.current = 1 - fadeProgress

          drawScene(ctx, pipX, Math.sin(progress * Math.PI * 10) * 2.5, false, 'run', 0, elapsed, pipAlphaRef.current, null, centerX)

          if (progress < 1) {
            raf.current = requestAnimationFrame(animate)
            return
          }

          pipAlphaRef.current = 0
          movementRunning.current = false
          setIsMoving(false)
          setRunState('success')
          onResult && onResult({
            events: [{ type: 'say', text: LEVEL_FOUR_MESSAGE }],
            code,
            error: null,
            finalX: pipX
          })
          startIdleLoop()
        }

        setIsMoving(true)
        raf.current = requestAnimationFrame(animate)
        return () => {
          cancelled = true
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

      if (isLocalLevelFiveSuccess) {
        executionFinished = true
        const startTile = pipX >= LEVEL5_FLAG_TILE ? LEVEL5_START_TILE : pipX
        const endTile = LEVEL5_FLAG_TILE
        pipX = startTile
        lastPipX.current = startTile

        const W = ctx.canvas.width
        const tileW = W / Math.max(1, totalTiles)
        const centerForTile = tile => Math.max(4, tileW * 0.04) + (tile + 0.5) * tileW

        const t0 = performance.now()
        level5FxRef.current = { active: true, start: t0 }

        const { dx, dy, dw, dh } = bgRenderRectRef.current
        setBubble(LEVEL5_BUBBLE_TEXT)
        setDialogueText('')
        setBubbleOpacity(1)
        setBubbleX(Math.round(dx + dw * LEVEL5_ANVIL.x))
        setBubbleY(Math.round(dy + dh * (LEVEL5_ANVIL.y - 0.03)))

        let bubbleFaded = false
        let bubbleRemoved = false
        let lastCount = -1

        const animate = now => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          const elapsed = now - t0

          if (!bubbleFaded && elapsed > LEVEL5_BUBBLE_MS - 500) { bubbleFaded = true; setBubbleOpacity(0) }
          if (!bubbleRemoved && elapsed > LEVEL5_BUBBLE_MS) { bubbleRemoved = true; setBubble(null) }

          const walkElapsed = elapsed - LEVEL5_WALK_DELAY_MS
          if (walkElapsed < 0) {
            pipAlphaRef.current = 1
            drawScene(ctx, pipX, 0, false, 'idle', 0, now, 1)
            raf.current = requestAnimationFrame(animate)
            return
          }

          const progress = Math.min(1, walkElapsed / LEVEL5_WALK_MS)
          const tile = startTile + (endTile - startTile) * progress
          walkFrameIndexRef.current = Math.floor((walkElapsed / 1000) * LEVEL5_WALK_FPS)
          const count = Math.min(endTile, Math.floor(progress * endTile))
          if (count !== lastCount) { lastCount = count; setRunMovedTiles(count) }

          drawScene(ctx, pipX, Math.sin(progress * Math.PI * 12) * 1.5, false, 'walk', 0, walkElapsed, 1, null, centerForTile(tile))

          if (progress < 1) {
            raf.current = requestAnimationFrame(animate)
            return
          }

          pipX = endTile
          pipXRef.current = endTile
          lastPipX.current = endTile
          currentTileRef.current = endTile
          setPipX(endTile)
          setRunMovedTiles(endTile)
          movementRunning.current = false
          setIsMoving(false)
          setRunState('success')
          onResult && onResult({
            events: [{ type: 'say', text: LEVEL5_BUBBLE_TEXT }],
            code,
            error: null,
            finalX: pipX
          })
          startIdleLoop()
        }

        setIsMoving(true)
        raf.current = requestAnimationFrame(animate)
        return () => {
          cancelled = true
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

      if (isLocalLevelSixSuccess) {
        executionFinished = true
        const startTile = pipX
        const endTile = LEVEL6_END_TILE
        const tileTarget = Number(target) || endTile
        const W = ctx.canvas.width
        const tileW = W / Math.max(1, totalTiles)
        const centerForTile = tile => Math.max(4, tileW * 0.04) + (tile + 0.5) * tileW
        const fadeStartFraction = 0.85

        const t0 = performance.now()
        level6FxRef.current = { solved: true, start: t0 }

        setBubble(LEVEL6_BUBBLE_TEXT)
        setDialogueText('')
        setBubbleOpacity(1)
        setBubbleX(Math.round(centerForTile(startTile)))
        setBubbleY(Math.round(groundLineRef.current - getPipRenderHeight() - 15))

        let bubbleFaded = false
        let bubbleRemoved = false
        let lastCount = -1

        const animate = now => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          const elapsed = now - t0

          if (!bubbleFaded && elapsed > LEVEL6_BUBBLE_MS - 500) { bubbleFaded = true; setBubbleOpacity(0) }
          if (!bubbleRemoved && elapsed > LEVEL6_BUBBLE_MS) { bubbleRemoved = true; setBubble(null) }

          const walkElapsed = elapsed - LEVEL6_WALK_DELAY_MS
          if (walkElapsed < 0) {
            pipAlphaRef.current = 1
            drawScene(ctx, pipX, 0, false, 'idle', 0, now, 1)
            raf.current = requestAnimationFrame(animate)
            return
          }

          const progress = Math.min(1, walkElapsed / LEVEL6_WALK_MS)
          const tile = startTile + (endTile - startTile) * progress
          walkFrameIndexRef.current = Math.floor((walkElapsed / 1000) * LEVEL6_WALK_FPS)
          const count = Math.min(tileTarget, Math.floor(progress * tileTarget))
          if (count !== lastCount) { lastCount = count; setRunMovedTiles(count) }

          const fade = Math.max(0, (progress - fadeStartFraction) / (1 - fadeStartFraction))
          pipAlphaRef.current = 1 - fade
          drawScene(ctx, pipX, Math.sin(progress * Math.PI * 10) * 1.5, false, 'walk', 0, walkElapsed, pipAlphaRef.current, null, centerForTile(tile))

          if (progress < 1) {
            raf.current = requestAnimationFrame(animate)
            return
          }

          pipAlphaRef.current = 0
          pipX = endTile
          pipXRef.current = endTile
          lastPipX.current = endTile
          currentTileRef.current = endTile
          setPipX(endTile)
          setRunMovedTiles(tileTarget)
          movementRunning.current = false
          setIsMoving(false)
          setRunState('success')
          onResult && onResult({
            events: [{ type: 'say', text: LEVEL6_BUBBLE_TEXT }],
            code,
            error: null,
            finalX: pipX
          })
          startIdleLoop()
        }

        setIsMoving(true)
        raf.current = requestAnimationFrame(animate)
        return () => {
          cancelled = true
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

    if (isLocalLevelSevenSuccess || isLocalLevelEightSuccess) {
    executionFinished = true
    const startTile = pipX
    const tileW = ctx.canvas.width / Math.max(1, totalTiles)
    const inset = Math.max(4, tileW * 0.04)
    const startCenterX = inset + (startTile + 0.5) * tileW
    const maxTile = totalTiles - 0.3   // keep tile state inside map 1 so the background never swaps
    const walkStart = performance.now() +
      (isLocalLevelEightSuccess ? LEVEL8_DONE_DELAY_MS : LEVEL_SEVEN_DONE_DELAY_MS)

    const animate = now => {
      if (cancelled || executionVersion !== executionVersionRef.current) return

      // wait for the construct to finish stepping aside
      if (now < walkStart) {
    drawScene(ctx, pipX, 0, false, 'idle', 0, now, pipAlphaRef.current, null, startCenterX)
    raf.current = requestAnimationFrame(animate)
    return
  }

      // far right edge of the platform = right edge of the background art
      const { dx, dw } = bgRenderRectRef.current
      const endCenterX = isLocalLevelEightSuccess ? dx + dw : dx + dw - getPipRenderWidth() * 0.4
      const fadeStartX = endCenterX - dw * (isLocalLevelEightSuccess ? LEVEL8_FADE_ZONE : LEVEL7_FADE_ZONE)
      const walkSpeed = isLocalLevelEightSuccess ? LEVEL8_RUN_SPEED : LEVEL7_RUN_SPEED
      const walkMs = (Math.max(1, endCenterX - startCenterX) / (dw * walkSpeed)) * 1000

      const elapsed = now - walkStart
      const progress = Math.min(1, elapsed / walkMs)
      const centerX = startCenterX + (endCenterX - startCenterX) * progress

      pipX = Math.min(maxTile, Math.max(startTile, (centerX - inset) / tileW - 0.5))
      pipXRef.current = pipX
      lastPipX.current = pipX
      currentTileRef.current = pipX
      setPipX(pipX)
      walkFrameIndexRef.current = Math.floor((elapsed / 1000) * (isLocalLevelEightSuccess ? LEVEL8_WALK_FPS : LEVEL7_WALK_FPS))
      reportProgress(pipX)

      const fade = Math.min(1, Math.max(0, (centerX - fadeStartX) / Math.max(1, endCenterX - fadeStartX)))
      pipAlphaRef.current = 1 - fade

      drawScene(ctx, pipX, isLocalLevelEightSuccess ? 0 : Math.sin(elapsed / 110) * 1.2, false, isLocalLevelEightSuccess ? 'run' : 'walk', 0, elapsed, pipAlphaRef.current, null, centerX)

      if (progress < 1) {
        raf.current = requestAnimationFrame(animate)
        return
      }

      pipAlphaRef.current = 0
      movementRunning.current = false
      setIsMoving(false)
      setRunState('idle')
      onResult && onResult({ events: [], code, error: null, finalX: pipX })
      // No startIdleLoop(): Pip walks off and stays gone.
    }

    setIsMoving(true)
    raf.current = requestAnimationFrame(animate)
    return () => {
      cancelled = true
      movementRunning.current = false
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }
      // ── Island 3: correct answer -> Pip dashes at the boss, hits it, hops back ──
      // Level 10 defeats boss 1 (Syntax Golem), level 20 defeats boss 2 (Literal Titan)
      // and clears the island.
      if (isLocalIslandSuccess && isBossIsland) {
        executionFinished = true
        pipAlphaRef.current = 1
        const outText = getSolutionOutputText(lessonData?.solution_code)
        const defeats = isChapterFinale

        const BUBBLE_SHOW_MS = 1200
        const DASH_AT = 1100
        const IMPACT_AT = DASH_AT + DASH_MS
        const RETREAT_AT = IMPACT_AT + DASH_HIT_HOLD_MS
        const END_AT = defeats
          ? IMPACT_AT + 450 + BOSS_DEFEAT_COLLAPSE_MS + 1100
          : RETREAT_AT + DASH_RETREAT_MS + 400

        // Where Pip stands now, and where he stops in front of the boss
        const W = ctx.canvas.width
        const routeTiles = Math.max(1, totalTiles)
        const tileW = W / routeTiles
        const localTile = ((pipX % routeTiles) + routeTiles) % routeTiles
        const startCx = Math.max(4, tileW * 0.04) +
          (getVisualTilePosition(localTile, routeTiles, bgPath) + 0.5) * tileW

        setBubble(outText)
        setDialogueText('')
        setBubbleOpacity(1)
        updateDialogueAnchor(pipX)

        const t0 = performance.now()
        const fxs = bossFxRef.current
        let bubbleFaded = false
        let bubbleRemoved = false
        let impacted = false

        const animateBoss = now => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          const elapsed = now - t0

          if (!bubbleFaded && elapsed > BUBBLE_SHOW_MS - 500) { bubbleFaded = true; setBubbleOpacity(0) }
          if (!bubbleRemoved && elapsed > BUBBLE_SHOW_MS) { bubbleRemoved = true; setBubble(null) }

          // Stop just in front of the boss (read each frame, the boss geometry is measured while drawing)
          const geom = bossGeomRef.current
          const hitCx = Math.max(
            startCx,
            geom.cx > 0 ? geom.cx - geom.w * 0.5 - getPipRenderWidth() * 0.35 : W * 0.62
          )

          if (!impacted && elapsed >= IMPACT_AT) {
            impacted = true
            fxs.hitStart = now
            bossHpTargetRef.current = Math.max(0, bossHpAfter)
            popupsRef.current.push({ target: 'boss', text: '-1', color: '#FBBF24', start: now })
            if (defeats) {
              fxs.defeatStart = now + 450
              setBossDefeated(true)
            }
          }

          let pose = 'idle'
          let cx = null
          let feetY = null
          let bounce = 0
          let idleBob = Math.sin(now / 500) * 3
          let animMs = now

          if (elapsed >= DASH_AT && elapsed < IMPACT_AT) {
            // dash in
            const p = (elapsed - DASH_AT) / DASH_MS
            const e = p * p                                   // accelerates into the hit
            pose = 'run'
            cx = startCx + (hitCx - startCx) * e
            bounce = Math.sin(p * Math.PI * 6) * 2
            idleBob = 0
            animMs = elapsed - DASH_AT
          } else if (elapsed >= IMPACT_AT && elapsed < RETREAT_AT) {
            // strike: pressed against the boss with a small jab
            pose = 'run'
            cx = hitCx + Math.sin((elapsed - IMPACT_AT) / 30) * 3
            idleBob = 0
            animMs = elapsed - DASH_AT
          } else if (elapsed >= RETREAT_AT && elapsed < RETREAT_AT + DASH_RETREAT_MS) {
            // hop back to the starting spot
            const p = (elapsed - RETREAT_AT) / DASH_RETREAT_MS
            const e = 1 - Math.pow(1 - p, 2)
            pose = 'jump'
            cx = hitCx + (startCx - hitCx) * e
            feetY = groundLineRef.current - Math.sin(p * Math.PI) * 40
            idleBob = 0
            animMs = elapsed - RETREAT_AT
          }

          drawScene(ctx, pipX, bounce, false, pose, idleBob, animMs, 1, feetY, cx)

          if (elapsed < END_AT) {
            raf.current = requestAnimationFrame(animateBoss)
            return
          }

          movementRunning.current = false
          setIsMoving(false)
          setRunState('success')
          onResult && onResult({
            events: [{ type: 'say', text: outText }],
            code,
            error: null,
            finalX: pipX,
            boss: {
              level: bossLevelNo,
              chapter: bossChapter + 1,        // 1 or 2
              name: bossName,
              hpAfter: bossHpAfter,
              defeated: defeats,
              islandComplete: defeats && isIslandFinale,
            },
          })
          if (defeats) setBossCongrats({ chapter: bossChapter + 1, name: bossName, finale: isIslandFinale })
          if (defeats) onBossDefeated?.({ chapter: bossChapter + 1, name: bossName, level: bossLevelNo })
          if (defeats && isIslandFinale) onIslandComplete?.()
          startIdleLoop()
        }

        movementRunning.current = true
        setIsMoving(true)
        raf.current = requestAnimationFrame(animateBoss)
        return () => {
          cancelled = true
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

      // ── Island 3: wrong answer -> the boss slams the ground (the lesson page takes the life) ──
      if (isBossWrong) {
        executionFinished = true
        movementRunning.current = false
        setIsMoving(false)

        // Nothing typed or picked yet: that is not an answer, so no attack.
        if (!normalizedCode) {
          setRunState('idle')
          startIdleLoop()
          return () => { cancelled = true }
        }

        // The attack is driven by timestamps and drawn by the idle loop, so it plays
        // even if the lesson page resets the level right away. We report the wrong
        // answer immediately so the life is taken at the same moment.
        const wrongMsg = `Wrong answer! The ${bossName} strikes back.`
        triggerBossAttack()
        setRunState('error')
        setErrMsg(wrongMsg)
        onResult && onResult({ events: [], code, error: wrongMsg })
        startIdleLoop()
        return () => { cancelled = true }
      }

      // ── Island 2 only: generic scene. Correct code -> bubble with the output,
      //    then Pip walks to the lesson's flag tile.
      if (isLocalIslandSuccess) {
        executionFinished = true
        pipAlphaRef.current = 1
        const startTile = pipX
        const flagTile = Number(lessonData?.flag_tile)
        const endTile = Number.isFinite(flagTile) && flagTile > startTile ? flagTile : startTile
        const willWalk = endTile > startTile
        const tileTarget = Number(target) || endTile
        const walkMs = willWalk ? Math.max(1400, (endTile - startTile) * 450) : 0
        const outText = getSolutionOutputText(lessonData?.solution_code)

        const W = ctx.canvas.width
        const tileW = W / Math.max(1, totalTiles)
        const centerForTile = tile => Math.max(4, tileW * 0.04) + (tile + 0.5) * tileW

        setBubble(outText)
        setDialogueText('')
        setBubbleOpacity(1)
        updateDialogueAnchor(pipX)

        const t0 = performance.now()
        let bubbleFaded = false
        let bubbleRemoved = false
        let lastCount = -1

        const finishIsland = () => {
          pipX = willWalk ? endTile : startTile
          pipXRef.current = pipX
          lastPipX.current = pipX
          currentTileRef.current = pipX
          setPipX(pipX)
          setRunMovedTiles(tileTarget)
          movementRunning.current = false
          setIsMoving(false)
          setRunState('success')
          onResult && onResult({
            events: [{ type: 'say', text: outText }],
            code,
            error: null,
            finalX: pipX
          })
          startIdleLoop()
        }

        const animate = now => {
          if (cancelled || executionVersion !== executionVersionRef.current) return
          const elapsed = now - t0

          if (!bubbleFaded && elapsed > ISLAND_BUBBLE_MS - 500) { bubbleFaded = true; setBubbleOpacity(0) }
          if (!bubbleRemoved && elapsed > ISLAND_BUBBLE_MS) { bubbleRemoved = true; setBubble(null) }

          // No walk needed (Pip already at/after the flag): wait for the bubble, then finish.
          if (!willWalk) {
            drawScene(ctx, pipX, 0, false, 'idle', 0, now, 1)
            if (elapsed < ISLAND_BUBBLE_MS) {
              raf.current = requestAnimationFrame(animate)
              return
            }
            finishIsland()
            return
          }

          const walkElapsed = elapsed - ISLAND_WALK_DELAY_MS
          if (walkElapsed < 0) {
            drawScene(ctx, pipX, 0, false, 'idle', 0, now, 1)
            raf.current = requestAnimationFrame(animate)
            return
          }

          const progress = Math.min(1, walkElapsed / walkMs)
          const tile = startTile + (endTile - startTile) * progress
          walkFrameIndexRef.current = Math.floor((walkElapsed / 1000) * ISLAND_WALK_FPS)
          const count = Math.min(tileTarget, Math.floor(progress * tileTarget))
          if (count !== lastCount) { lastCount = count; setRunMovedTiles(count) }

          drawScene(ctx, pipX, Math.sin(progress * Math.PI * 12) * 1.5, false, 'walk', 0, walkElapsed, 1, null, centerForTile(tile))

          if (progress < 1) {
            raf.current = requestAnimationFrame(animate)
            return
          }
          finishIsland()
        }

        movementRunning.current = true
        setIsMoving(true)
        raf.current = requestAnimationFrame(animate)
        return () => {
          cancelled = true
          movementRunning.current = false
          if (raf.current) cancelAnimationFrame(raf.current)
        }
      }

      function step() {
        if (cancelled || executionVersion !== executionVersionRef.current) return
        if (i >= events.length) {
          movementRunning.current = false
          const hit = pipX >= (usesSharedStart ? sharedStartPosition : (initialPipPosition || 0)) + target
          lastPipX.current = pipX
          reportProgress(pipX)
          drawScene(ctx, pipX, 0, hit, 'idle', 0, 0, pipAlphaRef.current)
          setRunState(hit ? 'success' : 'idle')
          if (hit) {
            playSfx(ASSETS.sfxComplete)
            playCompletionSequence()
          }
          onResult && onResult({ events, code, error: null, finalX: pipX })
          startIdleLoop()
          return
        }
        const ev = events[i]
        if (ev.type === 'moveRight') {
          const from = pipX
          const amount = Number(ev.amount) || 0
          const to = pipX + amount
          const pose = Math.abs(amount) >= RUN_THRESHOLD ? 'run' : 'walk'
          // Short clips used to finish in only three or four rAF callbacks,
          // which moved Pip visibly but left too little time to show a gait.
          // Give each tile enough time for several walk/run frame advances.
          const start = performance.now(), dur = Math.max(900, Math.abs(amount) * 500)
          function fr(t) {
            if (cancelled || executionVersion !== executionVersionRef.current) return
            if (previousTime === null) previousTime = t
            animationClock += Math.min(50, t - previousTime)
            previousTime = t
            const elapsed = t - start
            const p = Math.min(1, elapsed / dur), e2 = 1 - Math.pow(1 - p, 3)
            pipX = from + (to - from) * e2
            reportProgress(pipX)
            const gait = Math.sin(p * Math.PI * 4) * 2.5 // little bounce while moving
            const isFinalStep = to >= (usesSharedStart ? sharedStartPosition : (initialPipPosition || 0)) + target
            const movementProgress = Math.max(0, Math.min(1, (elapsed - (dur - 300)) / 300))
            pipAlphaRef.current = exitAction === 'fade_out' && isFinalStep
              ? 1 - movementProgress
              : 1
            drawScene(ctx, pipX, gait, false, pose, 0, animationClock, pipAlphaRef.current)
            if (p < 1) raf.current = requestAnimationFrame(fr)
            else {
              pipX = to
              if (isFinalStep && exitAction === 'fade_out') pipAlphaRef.current = 0
              reportProgress(pipX)
              setRunMovedTiles(previous => previous + amount)
              i++
              previousTime = null
              step()
            }
          }
          raf.current = requestAnimationFrame(fr)
        } else if (ev.type === 'jump') {
          playSfx(ASSETS.sfxJump)
          const startTile = pipX
          const jumpDistance = Number.isFinite(Number(ev.amount)) && Number(ev.amount) > 0 ? Number(ev.amount) : 1
          const tileWidth = ctx.canvas.width / Math.max(1, totalTiles)
          const groundY = Number.isFinite(groundLineRef.current) && groundLineRef.current > 0
            ? groundLineRef.current
            : ctx.canvas.height * 0.72 - 26
          const getTileY = tile => {
            const elevation = Number(tileElevations[String(Math.round(tile))])
            return groundY + (Number.isFinite(elevation) ? elevation : 0)
          }
          const endTile = startTile + jumpDistance
          const startY = getTileY(startTile)
          const targetY = getTileY(endTile)
          const jumpHeight = Math.max(48, Math.min(120, groundY * 0.22))
          const start = performance.now(), dur = 500
          function fr(t) {
            if (cancelled || executionVersion !== executionVersionRef.current) return
            const progress = Math.min(1, Math.max(0, (t - start) / dur))
            const jumpArcHeight = Math.sin(progress * Math.PI) * jumpHeight
            const currentY = startY + (targetY - startY) * progress - jumpArcHeight
            pipX = startTile + jumpDistance * progress
            reportProgress(pipX)
            drawScene(ctx, pipX, 0, false, 'jump', 0, t - start, pipAlphaRef.current, currentY)
            if (progress < 1) raf.current = requestAnimationFrame(fr)
            else {
              currentTileRef.current = startTile + jumpDistance
              pipX = currentTileRef.current
              lastPipX.current = pipX
              reportProgress(pipX)
              land()
            }
          }
          raf.current = requestAnimationFrame(fr)

          // Brief recovery pose on touchdown — without this, the jump arc
          // (Pip mid-air, cape flying) cut directly to the idle stance in
          // one frame, which read as a pose jumping rather than landing.
          function land() {
            const landStart = performance.now(), landDur = 420 // ~ one full 6-frame cycle at 12fps
            function lfr(t) {
              if (cancelled || executionVersion !== executionVersionRef.current) return
              const p = Math.min(1, (t - landStart) / landDur)
              drawScene(ctx, pipX, 0, false, 'land', 0, t - landStart)
              if (p < 1) raf.current = requestAnimationFrame(lfr)
              else {
                drawScene(ctx, pipX, 0, false, 'idle', 0)
                i++
                previousTime = null
                step()
              }
            }
            raf.current = requestAnimationFrame(lfr)
          }
        } else if (
          ev.type === 'say' ||
          ev.type === 'speak' ||
          ev.type === 'levelOutput' ||
          ev.type === 'output' ||
          ev.type === 'print' ||
          ev.type === 'console' ||
          ev.type === 'stdout'
        ) {
          const outputText = String(
            ev.text ?? ev.message ?? ev.output ?? ev.stdout ?? ''
          ).trim()

          if (!outputText) {
            i++
            step()
            return
          }

          setBubble(outputText)
          setBubbleOpacity(1)
          // Anchor the bubble in canvas pixels, directly above Pip's head.
          updateDialogueAnchor(pipX)
          drawScene(ctx, pipX, 0, false, 'idle', 0)
          setTimeout(() => setBubbleOpacity(0), 2400)
          setTimeout(() => {
            if (cancelled || executionVersion !== executionVersionRef.current) return
            setBubble(null); i++; step()
          }, 3000)
        } else { i++; step() }
      }
      // The worker performs parsing and execution off the UI thread. Animation
      // starts only after it returns the complete, bounded event list.
      return () => {
        cancelled = true
        movementRunning.current = false
        if (raf.current) cancelAnimationFrame(raf.current)
        if (!executionFinished) terminateCodeWorker()
      }
    }, [playToken]) // eslint-disable-line

    // Falls back to a fixed 1280 only in the (currently unused in this app)
    // non-fullHeight case, where there's no ResizeObserver tracking a real
    // container size to match.
    const canvasWidth  = fullHeight ? Math.max(1, Math.round(canvasW)) : 1280
    const canvasHeight = fullHeight ? canvasH : 320

    // Island 2 only: keep the speech bubble fully inside the canvas. Pip stands
    // near the edges on some levels, which used to push the bubble off-screen.
    // The bubble is clamped, and its little tail still points at Pip.
    const BUBBLE_HALF_W = 130
    const bubbleLeft = isIsland2
      ? Math.max(BUBBLE_HALF_W, Math.min(canvasWidth - BUBBLE_HALF_W, bubbleX))
      : bubbleX
    const bubbleTop = isIsland2 ? Math.max(90, bubbleY) : bubbleY
    const bubbleTailShift = isIsland2
      ? Math.max(-90, Math.min(90, bubbleX - bubbleLeft))
      : 0

    return (
      <div ref={wrap} style={{ position:'relative', width:'100%', height:'100%', minHeight: fullHeight ? '100%' : 320, background:'#C7D2F8', pointerEvents:'none' }}>
        {!isBossIsland && <div style={{
          position:'absolute', top:14, left:14,
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(15,23,42,0.56)', color:'#fff',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          padding:'7px 10px', fontSize:12, fontWeight:700,
          letterSpacing:'0.04em', textTransform:'uppercase',
          boxShadow:'0 10px 24px rgba(15,23,42,0.22)', zIndex:2, pointerEvents:'none'
        }}>
          <span style={{ opacity: 0.8 }}>Tiles</span>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:14 }}>{Math.max(0, runMovedTiles)} / {target || 3}</span>
        </div>}

        {/* Map level indicator */}
        <div style={{
          position:'absolute', top:14, left: isBossIsland ? 14 : 140,
          display:'flex', flexDirection:'column', gap:2,
          background:'rgba(79,70,229,0.56)', color:'#fff',
          border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
          padding:'7px 10px', fontSize:11, fontWeight:700,
          letterSpacing:'0.04em', textTransform:'uppercase',
          boxShadow:'0 10px 24px rgba(15,23,42,0.22)', zIndex:2,
          maxWidth:200, pointerEvents:'none'
        }}>
          {levelLabel && <span style={{ opacity: 0.9, fontSize:10 }}>{levelLabel}</span>}
          {levelTitle && <span style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>{levelTitle}</span>}
        </div>

        <canvas
          ref={cvs}
          width={canvasWidth}
          height={canvasHeight}
          style={{ display:'block', width:'100%', height:'100%', objectFit:'fill', imageRendering:'pixelated' }}
        />
        {(dialogueText || bubble || showSpeechBubble || isLevelComplete) && (
          <div className="toast-pop" style={{
            position:'absolute', top:`${bubbleTop}px`, left:`${bubbleLeft}px`, transform:'translate(-50%, -100%)', opacity:(showSpeechBubble || isLevelComplete) ? 1 : bubbleOpacity, transition:'opacity 600ms ease', pointerEvents:'none', zIndex:100, whiteSpace:'pre-wrap',
            background:'#fff', color:C.onyx,
            padding:'10px 16px', borderRadius:12, fontSize:14, fontWeight:500,
            boxShadow:'0 4px 14px rgba(15,23,42,.18)', maxWidth:220, width:'max-content',
            border:`1px solid ${C.onyx100}`, textAlign:'center'
          }}>
            {dialogueText || bubble || GOLEM_DIALOGUE}
            <div style={{
              position:'absolute', bottom:-7, left:`calc(50% + ${bubbleTailShift}px)`, transform:'translateX(-50%)',
              width:0, height:0,
              borderLeft:'7px solid transparent', borderRight:'7px solid transparent',
              borderTop:`7px solid ${C.onyx100}`,
            }} />
            <div style={{
              position:'absolute', bottom:-5.5, left:`calc(50% + ${bubbleTailShift}px)`, transform:'translateX(-50%)',
              width:0, height:0,
              borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
              borderTop:'6px solid #fff',
            }} />
          </div>
        )}
        {bossCongrats && (
          <div style={{
            position:'absolute', inset:0, zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(15,23,42,0.55)', pointerEvents:'auto'
          }}>
            <div className="toast-pop" style={{
              background:'#fff', color:C.onyx, textAlign:'center',
              padding:'28px 36px', borderRadius:20, maxWidth:360, width:'88%',
              boxShadow:'0 20px 60px rgba(15,23,42,.45)', border:'3px solid #FBBF24'
            }}>
              <div style={{ fontSize:48, lineHeight:1 }}>{bossCongrats.finale ? '🏝️' : '🏆'}</div>
              <div style={{ fontSize:22, fontWeight:800, marginTop:10 }}>Congratulations!</div>
              <div style={{ fontSize:16, fontWeight:600, marginTop:8 }}>
                {bossCongrats.finale
                  ? `You defeated the ${bossCongrats.name} and finished the final boss!`
                  : `You defeated the first boss, the ${bossCongrats.name}!`}
              </div>
              <div style={{ fontSize:14, marginTop:8, opacity:0.75 }}>
                {bossCongrats.finale
                  ? 'Both bosses are down. Island 3 is cleared!'
                  : 'Boss 1 of 2 is down. Next up: the Literal Titan in levels 11–20.'}
              </div>
              <button
                onClick={() => setBossCongrats(null)}
                style={{
                  marginTop:18, padding:'10px 28px', borderRadius:12, border:'none',
                  background:C.emerald, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer'
                }}
              >Continue</button>
            </div>
          </div>
        )}
        {runState === 'error' && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            background:'rgba(254,236,236,0.96)', borderTop:`1px solid #EF444455`,
            color:'#EF4444', fontSize:13, padding:'10px 16px',
            fontFamily:"'JetBrains Mono',monospace", pointerEvents:'none'
          }}>⚠ {errMsg}</div>
        )}
        {runState === 'success' && (
          <div className="toast-pop" style={{
            position:'absolute', top:16, right:16,
            background:C.emerald, color:'#fff',
            padding:'11px 20px', borderRadius:20, fontSize:15, fontWeight:700,
            boxShadow:'0 4px 20px rgba(34,197,94,.4)', pointerEvents:'none'
          }}>{isBossIsland ? (bossDefeated ? (isIslandFinale ? '🏝️ Island cleared!' : '🏆 Boss defeated!') : '💥 Direct hit!') : '🏁 Flag reached!'}</div>
        )}
      </div>
    )
  }