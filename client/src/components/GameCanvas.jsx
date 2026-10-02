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
    bgMusic:       null,  // '/assets/music/theme.mp3'
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
  const WALK_SHEET_ROWS = 2
  const TOTAL_WALK_FRAMES = 12
  // The idle sheet contains nine horizontal poses. Keep the source order so
  // every supplied pose is shown once per idle cycle.
  const IDLE_FRAME_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  let idleDrawDebugLogged = false
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
  const SPRITE_REF_W = FRAME_DATA.characterIdle[0].w


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
  export function startBgMusic() {
    if (!DEFAULT_ASSETS.bgMusic) return
    if (bgAudio) { bgAudio.play(); return }
    bgAudio = new Audio(DEFAULT_ASSETS.bgMusic)
    bgAudio.loop   = true
    bgAudio.volume = 0.35
    bgAudio.play().catch(() => {})
    window._cqAudio = bgAudio
  }
  export function stopBgMusic() { bgAudio?.pause() }

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
  const PIP_RENDER_WIDTH = 58
  const PIP_RENDER_HEIGHT = 77
  const START_X = 50
  const WALK_SPEED = 1.2
  const WAYPOINT_TARGET_X = 620
  const GOLEM_DIALOGUE = 'Hello, Golem!'
  const GOLEM_FRAME_COUNT = 5
  const GOLEM_CORRECT_SNIPPET = 'System.out.println("Hello, Golem!");'
  const GOLEM_DORMANT = 'DORMANT'
  const GOLEM_WAKING = 'WAKING'
  const GOLEM_STANDING = 'STANDING'
  const LEVEL_TWO_CODE = 'int doorCode = 42;'
  const SHARED_START_FRACTION = 0.47
  const ENTRANCE_START_TILES = { 3: 0.5, 4: 0.5, 5: 1.0 }
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
  const FIRE_FRAME_COUNT = 15
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
  // Tile whose visual position lands on the far-right edge of the bridge
  // (getVisualTilePosition clamps at TERRAIN1_MAX_VISUAL_TILE).
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

// ── Level 5: The Coder's Forge ──
const LEVEL5_KEYNAME_CODE = 'String keyname = "Pip";'
const LEVEL5_BUBBLE_TEXT = 'keyname: "Pip"'
const LEVEL5_START_TILE = 1.0          // where Pip stops after coming down the stairs
const LEVEL5_PIP_SCALE = 1           // Pip is drawn this much bigger on the forge map
const LEVEL5_INTRO_MS = 3400           // door -> stairs -> stop
const LEVEL5_INTRO_FADE_MS = 600
// Door and stairs, as fractions of the background image (tune to the art)
const LEVEL5_DOOR = { x: 0.050 }       // where Pip appears inside the arch
const LEVEL5_STAIRS = { topX: 0.076, bottomX: 0.140, topY: 0.590, steps: 3 }
const LEVEL5_FLAG_TILE = 5
const LEVEL5_FADE_IN_MS = 700
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
  const BUILD_TAG = 'GameCanvas 2026-09-30f (L5 intro: door, stairs, Pip scale)'

  export default function GameCanvas({ playToken, introToken = 0, replayToken = 0, onIntroComplete, code, onResult, onCharacterPosition, target, lessonData, resetToken = 0, fullHeight, levelLabel, levelTitle, initialPipPosition, eventOffset = 0, lessonId, executionMode = 'guided' }) {
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
    const drawSceneRef = useRef(null)
    const isCutsceneRunningRef = useRef(false)
    const [runState, setRunState] = useState('idle')
    const [errMsg,   setErrMsg]   = useState('')
    const [canvasH,  setCanvasH]  = useState(300)
    const [canvasW,  setCanvasW]  = useState(1280)
    const [assetsReady, setAssetsReady] = useState(false)
    const [isIdleLoaded, setIsIdleLoaded] = useState(false)
    const [tileProgress, setTileProgress] = useState(0)
    const [runMovedTiles, setRunMovedTiles] = useState(0)
    const [currentMap, setCurrentMap] = useState(1) 
    const groundLineRef = useRef(0)
    const bgRenderRectRef = useRef({ dx: 0, dy: 0, dw: 0, dh: 0 })
    const golemGlowStartRef = useRef(0)
    const isGateOpenRef = useRef(false)
    const bgPath = lessonData?.background_image || '/assets/landscapes/terrain1.jpg'
    const totalTiles = Number(lessonData?.total_tiles) || DEFAULT_TILE_COUNT
    const lessonGroundFraction = Number(lessonData?.ground_fraction)
    const isTerrain1Background = bgPath.endsWith('/terrain1.png') || bgPath.endsWith('/terrain1.jpg')
    const groundFraction = isTerrain1Background
      ? TERRAIN1_BRIDGE_FRACTION
      : lessonGroundFraction || BG_GRASS_FRACTION
    const config = typeof lessonData?.mechanics_config === 'string'
      ? JSON.parse(lessonData.mechanics_config)
      : lessonData?.mechanics_config
    const exitAction = config?.exit_action
    const tileElevations = config?.tile_elevations || {}
    const currentLevel = Number(
      lessonData?.order_index ||
      lessonData?.level_number ||
      String(lessonData?.level_label || '').match(/\d+/)?.[0]
    )
    const gateConfig = GATE_CONFIGS.default
    const fireConfig = FIRE_CONFIGS[currentLevel === 4 ? 3 : currentLevel] || null
    const hasGate = currentLevel === 1
    const isLevelTwo = currentLevel === 2
    const usesSharedStart = currentLevel === 1 || isLevelTwo
    const sharedStartPosition = totalTiles * SHARED_START_FRACTION
    const entranceStartTile = ENTRANCE_START_TILES[currentLevel] ?? (initialPipPosition || 0)
    const skipsWalkCutscene = currentLevel !== 1
    const executionVersionRef = useRef(0)
    const pipAlphaRef = useRef(1)
    const level5FxRef = useRef({ active: false, start: 0 })
     

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
            const characterY = rect.top + feetY - PIP_RENDER_HEIGHT / 2

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
  // Level 4's idle Pip is centered in his tile plus the grid inset, so match that
  const pipCanvasX = currentLevel === 4 || currentLevel === 5
    ? Math.max(4, tileWidth * 0.04) + (visualTile + 0.5) * tileWidth
    : visualTile * tileWidth
  const groundY = Number.isFinite(groundLineRef.current)
    ? groundLineRef.current
    : canvasH * 0.72 - 26
    const pipHeadY = groundY - PIP_RENDER_HEIGHT * (currentLevel === 5 ? LEVEL5_PIP_SCALE : 1) - 15

  setBubbleX(Math.round(pipCanvasX))
  setBubbleY(Math.round(pipHeadY))
}, [bgPath, canvasH, canvasW, totalTiles, currentLevel])

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

    function handleResetLevel() {
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
    }, [lessonId, target, resetToken, replayToken, assetsReady, isLevelTwo])

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
    }, [ASSETS.background, currentMap, currentLevel])

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
      const elevation = Number(tileElevations[String(Math.round(tile))])
      return feetLine + (Number.isFinite(elevation) ? elevation : 0)
    }

      const baseOffset = usesSharedStart ? sharedStartPosition : (initialPipPosition || 0)
      const goalX = baseOffset + target
      const mapNum = getMapForPosition(px)
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

      const golemImg = imgs.current.golemSprite
      if (currentLevel <= 2 && golemImg && golemImg.naturalWidth > 0 && golemImg.naturalHeight > 0) {
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
      const CW = PIP_RENDER_WIDTH * pipScale
      const movementRenderHeight = PIP_RENDER_HEIGHT * pipScale
      const totalBob = bounce + idleBob
      const centerOverride = Number.isFinite(characterCenterX) ? characterCenterX : null
      const CX = Number.isFinite(centerOverride)
      ? centerOverride - CW / 2
      : Math.max(4, Math.min(W - CW - 4, visualTile * tileWidth - CW / 2))
      const pipFeetLine = Number.isFinite(characterFeetY) ? characterFeetY : getTileY(px)
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
            const wm = getWalkMetrics(poseImg)
            if (!wm) throw new Error('Walk sheet has no visible frames.')
            const cell = wm.cells[walkFrameIndexRef.current % wm.cells.length]
            const drawHeight = movementRenderHeight
            const drawWidth = drawHeight * (wm.ub.w / wm.ub.h)
            const drawX = Math.round(CX + (CW - drawWidth) / 2)
            const drawY = Math.round(CY_base - drawHeight)

            ctx.imageSmoothingEnabled = false
            ctx.globalAlpha = renderAlpha
            ctx.drawImage(
              poseImg,
              cell.sx + wm.ub.x, cell.sy + wm.ub.y, wm.ub.w, wm.ub.h,
              drawX, drawY, drawWidth, drawHeight
            )
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
              const destY = Number.isFinite(rawDestY) ? rawDestY : feetLine - PIP_RENDER_HEIGHT
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
            const drawY = Number.isFinite(CY_base - fh) ? CY_base - fh : feetLine - PIP_RENDER_HEIGHT
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

      // Wrapper so the vault overlay is always drawn LAST, even though the
  // walk pose returns early from drawSceneInner.
  function drawScene(...args) {
  drawSceneInner(...args)
}

    drawSceneRef.current = drawScene

    // Start idle loop once assets are ready; keep it running whenever idle
    useEffect(() => {
      if (assetsReady) startIdleLoop()
      return () => stopIdleLoop()
    }, [assetsReady, stopIdleLoop])

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
        const e = p * p * (3 - 2 * p)

        const tileW = ctx.canvas.width / Math.max(1, totalTiles)
        const xStop = Math.max(4, tileW * 0.04) + (LEVEL5_START_TILE + 0.5) * tileW
        const xDoor = dx + dw * LEVEL5_DOOR.x
        const xTop = dx + dw * LEVEL5_STAIRS.topX
        const xBottom = Math.min(dx + dw * LEVEL5_STAIRS.bottomX, xStop)
        const yTop = dy + dh * LEVEL5_STAIRS.topY
        const yGround = groundLineRef.current

        const L1 = Math.max(1, xTop - xDoor)
        const L2 = Math.max(1, xBottom - xTop)
        const d = e * Math.max(1, xStop - xDoor)
        const cx = xDoor + d
        const fy = d <= L1 ? yTop
          : d <= L1 + L2 ? yTop + (yGround - yTop) * stairStep((d - L1) / L2)
          : yGround

        pipAlphaRef.current = Math.min(1, elapsed / LEVEL5_INTRO_FADE_MS)
        walkFrameIndexRef.current = Math.floor((elapsed / 1000) * LEVEL5_WALK_FPS)
        const onStairs = d > L1 && d < L1 + L2
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

    useEffect(() => {
      if (currentLevel === 5) return undefined
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
            y: rect.top + feetY - PIP_RENDER_HEIGHT / 2
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

      if (isLocalLevelThreeSuccess) {
        triggerFireIgnite()
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
    } else if (!isLocalLevelTwoSuccess && !isLocalLevelThreeSuccess && !isLocalLevelFourSuccess && !isLocalLevelFiveSuccess) {
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
        const characterY = rect.top + feetY - PIP_RENDER_HEIGHT / 2

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
    const endCenterX = dx + dw - PIP_RENDER_WIDTH * 0.4
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
            const startX = getVisualTilePosition(startTile, totalTiles, bgPath) * tileWidth
            const targetX = getVisualTilePosition(startTile + jumpDistance, totalTiles, bgPath) * tileWidth
            const currentX = startX + (targetX - startX) * progress
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

    return (
      <div ref={wrap} style={{ position:'relative', width:'100%', height:'100%', minHeight: fullHeight ? '100%' : 320, background:'#C7D2F8', pointerEvents:'none' }}>
        <div style={{
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
        </div>

        {/* Map level indicator */}
        <div style={{
          position:'absolute', top:14, left:140,
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
            position:'absolute', top:`${bubbleY}px`, left:`${bubbleX}px`, transform:'translate(-50%, -100%)', opacity:(showSpeechBubble || isLevelComplete) ? 1 : bubbleOpacity, transition:'opacity 600ms ease', pointerEvents:'none', zIndex:100, whiteSpace:'pre-wrap',
            background:'#fff', color:C.onyx,
            padding:'10px 16px', borderRadius:12, fontSize:14, fontWeight:500,
            boxShadow:'0 4px 14px rgba(15,23,42,.18)', maxWidth:220, width:'max-content',
            border:`1px solid ${C.onyx100}`, textAlign:'center'
          }}>
            {dialogueText || bubble || GOLEM_DIALOGUE}
            <div style={{
              position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)',
              width:0, height:0,
              borderLeft:'7px solid transparent', borderRight:'7px solid transparent',
              borderTop:`7px solid ${C.onyx100}`,
            }} />
            <div style={{
              position:'absolute', bottom:-5.5, left:'50%', transform:'translateX(-50%)',
              width:0, height:0,
              borderLeft:'6px solid transparent', borderRight:'6px solid transparent',
              borderTop:'6px solid #fff',
            }} />
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
          }}>🏁 Flag reached!</div>
        )}
      </div>
    )
  }
