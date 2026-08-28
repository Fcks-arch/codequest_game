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
  background:    '/assets/background.png',
  groundTile:    null,  // '/assets/tile.png'
  flagSprite:    null,  // '/assets/flag.png'
  bgMusic:       null,  // '/assets/music/theme.mp3'
  sfxJump:       null,
  sfxCorrect:    null,
  sfxComplete:   null,
}

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
const FPS = { characterIdle: 6, characterWalk: 8, characterRun: 14, characterJump: 10, characterLand: 14 }
// The first five walking poses are the consistent sword-free gait. Playing
// them forward and backward avoids the abrupt snap when the walk cycle loops.
const WALK_FRAME_ORDER = [0, 1, 2, 3, 4, 3, 2, 1]
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

const TILE_COUNT = 10
/* Each map covers this many tiles before transitioning to the next */
const MAP_WIDTH = 15
/* Movements of this many tiles or more in a single moveRight() call
   use the "run" pose instead of "walk" — a bit of visual variety
   without needing a separate game command. */
const RUN_THRESHOLD = 3

/* Measured directly from client/public/assets/background.png: the row
   (as a fraction of the image's full natural height) where the painted
   grass path begins. The art has its own baked-in ground, so instead of
   guessing at a scale/position we solve for whichever puts that exact
   row under Pip's feet — see the background-drawing block below. If
   you swap in a different background image, re-measure this (the top
   edge of its walkable grass strip, as a fraction of total image
   height) or the ground may float or sink relative to the character. */
const BG_GRASS_FRACTION = 717 / 887

// Bump this string whenever this file changes. Log it (see the mount
// effect below) so a quick look at the browser console tells you for
// certain whether the page is actually running this version — several
// rounds of bug reports turned out to be an old copy of this file still
// being served (stale dev server, browser cache, or the new file not
// actually saved to the right path) rather than the bug persisting.
const BUILD_TAG = 'GameCanvas 2026-08-19b (exact map-boundary continuation and next-map preload)'

export default function GameCanvas({ playToken, code, onResult, target, fullHeight, backgroundImage, levelLabel, levelTitle, initialPipPosition, eventOffset = 0, lessonId }) {
  useEffect(() => { console.log('[CodeQuest]', BUILD_TAG) }, [])
  
  const cvs    = useRef(null)
  const wrap   = useRef(null)
  const raf    = useRef(null)
  const idleRaf = useRef(null)
  const imgs   = useRef({})
  const idleImageRef = useRef(null)
  const [bubble,   setBubble]   = useState(null)
  const [bubbleX,  setBubbleX]  = useState(50) 
  const [bubbleY,  setBubbleY]  = useState(30) 
  const [runState, setRunState] = useState('idle')
  const [errMsg,   setErrMsg]   = useState('')
  const [canvasH,  setCanvasH]  = useState(300)
  const [canvasW,  setCanvasW]  = useState(1280)
  const [assetsReady, setAssetsReady] = useState(false)
  const [isIdleLoaded, setIsIdleLoaded] = useState(false)
  const [tileProgress, setTileProgress] = useState(0)
  const [runMovedTiles, setRunMovedTiles] = useState(0)
  const [currentMap, setCurrentMap] = useState(1) 

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
  

  const getMapForPosition = (pipX) => {
    return Math.floor(Math.max(0, pipX) / MAP_WIDTH) + 1
  }
  
  const getBackgroundImageForCurrentMap = (mapNumber = currentMap) => {
    if (!backgroundImage) return DEFAULT_ASSETS.background
    if (mapNumber <= 1) return backgroundImage
    return `/assets/lvl${Math.min(mapNumber, 6)}.png`
  }
  
  const ASSETS = {
    ...DEFAULT_ASSETS,
    background: getBackgroundImageForCurrentMap()
  }

  // Which lesson/run this position belongs to. The start position is immutable
  // for the lesson; live movement remains in this component between steps.
  const runKey = useRef(null)
  useEffect(() => {
    // Initialize with persistent position or from prop. lastPipX is what
    // BOTH the idle loop and every run actually draw/animate from — without
    // syncing it here, Pip visually teleported back to tile 0 whenever a
    // lesson (re)mounted even though tileProgress knew the saved position.
    lastPipX.current = initialPipPosition || 0
    setTileProgress(initialPipPosition || 0)
    const key = `${lessonId}:${target}`
    if (runKey.current !== key) {
      runKey.current = key
      // Start on the map containing Pip's saved absolute position. When a
      // position is exactly at a map boundary, this selects the new map so
      // its local position begins at zero on the left edge.
      setCurrentMap(getMapForPosition(initialPipPosition || 0))
    }
  }, [lessonId, target])

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
        if (!img && k === 'background' && ASSETS.background !== DEFAULT_ASSETS.background) {
          return loadImg(DEFAULT_ASSETS.background).then(fallback => ({ key: k, img: fallback }))
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
  }, [ASSETS.background, currentMap])

  const drawScene = useCallback((ctx, px, bounce, flagHit, pose, idleBob, animMs = 0) => {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    ctx.clearRect(0, 0, W, H)
    const GY = Math.floor(H * 0.72)
    const TILE = Math.floor(W / TILE_COUNT)
    let feetLine = GY - 26

    // Pip carries his absolute position across levels, but each lesson's
    // target_tiles counts from where he STARTED that lesson. The flag (and
    // the win check) therefore sit at offset + target, not at `target`,
    // otherwise any carried-over progress would already count as finished.
    const baseOffset = initialPipPosition || 0
    const goalX = baseOffset + target
    
    // Determine which map we're on based on absolute position
    const mapNum = getMapForPosition(px)
    const posInMap = ((px % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH // Position within current map

    if (imgs.current.background) {
      const bg = imgs.current.background
      ctx.imageSmoothingEnabled = false

      // Show the complete map. The previous cover-style scale enlarged the
      // artwork beyond both canvas edges, so only a cropped half of a map was
      // visible. Letterbox the image when its aspect ratio differs from the
      // game area instead of hiding map content.
      const s = Math.min(W / bg.naturalWidth, H / bg.naturalHeight)
      const dw = bg.naturalWidth * s
      const dh = bg.naturalHeight * s
      const dx = (W - dw) / 2
      const dy = (H - dh) / 2

      ctx.fillStyle = '#17233B'
      ctx.fillRect(0, 0, W, H)
      ctx.drawImage(bg, dx, dy, dw, dh)
      // The playable grass strip is part of the map artwork. Anchor Pip to
      // that source-image row after the image has been fitted to the canvas;
      // a viewport percentage leaves him visibly floating above the ground.
      feetLine = dy + BG_GRASS_FRACTION * dh
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

    // ── Ground strip ── only for the placeholder look. The real
    // background art paints its own grass/dirt ground (aligned to
    // feetLine above), so a second, flat ground drawn on top of it
    // here would just cover it back up.
    if (!imgs.current.background) {
      ctx.fillStyle = C.purple
      ctx.fillRect(0, GY + 2, W, H - GY - 2)
      ctx.fillStyle = '#3E37C9'
      ctx.fillRect(0, GY + 2, W, 5)

      for (let i = 0; i < TILE_COUNT; i++) {
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

    // ── Flag ──
    // Position flag relative to current map view
    const flagPosInMap = ((goalX % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH
    const fx = (flagPosInMap / MAP_WIDTH) * W
    const flagH = TILE * 0.62
    const flagW = TILE * 0.22
    if (imgs.current.flagSprite) {
      ctx.drawImage(imgs.current.flagSprite, fx - flagW, feetLine - flagH, flagW * 2, flagH)
    } else {
      ctx.strokeStyle = flagHit ? C.emerald : '#64748B'
      ctx.lineWidth = Math.max(3, TILE * 0.035)
      ctx.beginPath(); ctx.moveTo(fx, feetLine); ctx.lineTo(fx, feetLine - flagH); ctx.stroke()
      ctx.fillStyle = flagHit ? C.emerald : C.amber
      ctx.beginPath()
      ctx.moveTo(fx, feetLine - flagH)
      ctx.lineTo(fx + flagW, feetLine - flagH * 0.78)
      ctx.lineTo(fx, feetLine - flagH * 0.56)
      ctx.closePath(); ctx.fill()
    }

    // ══════════════════════════════════════════════════════════
    // CHARACTER — always drawn LAST in this function, on every
    // single call, guaranteed. This is what prevents the "behind
    // the platform" bug: there is no code path that draws the
    // ground/flag after this point.
    // ══════════════════════════════════════════════════════════
    const CW = Math.max(42, TILE * 0.72)
    const movementRenderHeight = RUN_FRAME_BOX.h * (CW / RUN_FRAME_BOX.w)
    const totalBob = bounce + idleBob
    const CX = Math.max(4, Math.min(W - CW - 4, (posInMap / MAP_WIDTH) * W - CW / 2))
    const CY_base = feetLine - totalBob

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
        // Pixel-art poses need clean frame boundaries. Blending adjacent
        // transparent sprite crops makes the character look smeared and can
        // hide the leg movement, especially during a short walk.
        const rawPos = Math.max(0, animMs) / 1000 * FPS[poseKey]
        const i0 = Math.floor(rawPos)
        const frameOrder = poseKey === 'characterIdle' ? IDLE_FRAME_ORDER
              : poseKey === 'characterWalk' ? WALK_FRAME_ORDER : null
        const frameIndex = frameOrder ? frameOrder[i0 % frameOrder.length] : i0
        const idxA = ((frameIndex % frames.length) + frames.length) % frames.length

            const isIdle = poseKey === 'characterIdle'
          const referenceWidth = poseKey === 'characterRun' ? RUN_FRAME_BOX.w : SPRITE_REF_W
          const spriteScale = CW / referenceWidth
        const drawFrame = (frame, alpha) => {
          // Scale by the shared factor, not this frame's own aspect ratio,
          // so width and height both track the real pose instead of
          // height being force-stretched to hit a fixed width.
          if (isIdle) {
            // The replacement sheet has uneven padding, so use its measured
            // tight pose box instead of dividing the full image into cells.
            const sourceX = frame.x
            const sourceY = frame.y
            const cropWidth = frame.w
            const cropHeight = frame.h
            const dHeight = movementRenderHeight
            const dWidth = dHeight * (cropWidth / cropHeight)
            const tileSize = W / MAP_WIDTH
            const startGridX = Math.max(4, tileSize * 0.04)
            const destX = startGridX + posInMap * tileSize + (tileSize - dWidth) / 2
            const destY = CY_base - dHeight
            if (!idleDrawDebugLogged) {
              console.log('Drawing Pip at:', { destX, destY, isComplete: idleImageRef.current?.complete })
              idleDrawDebugLogged = true
            }
            ctx.globalAlpha = alpha
            ctx.drawImage(
              poseImg,
              sourceX, sourceY, cropWidth, cropHeight,
              destX, destY, dWidth, dHeight
            )
            return
          }
          const box = poseKey === 'characterRun' ? RUN_FRAME_BOX : frame
          const fw = box.w * spriteScale
          const fh = box.h * spriteScale
          const fx = CX + (CW - fw) / 2
          ctx.globalAlpha = alpha
          ctx.drawImage(poseImg, frame.x, frame.y, frame.w, frame.h, fx, CY_base - fh, fw, fh)
        }
        ctx.imageSmoothingEnabled = false // keep pixel art crisp, not blurry
        drawFrame(frames[idxA], 1)
        ctx.globalAlpha = 1
        ctx.imageSmoothingEnabled = true
        spriteDrawn = true
      } catch (e) {
        // Never let a bad frame take down the whole animation queue —
        // degrade to the placeholder below instead of freezing Pip
        // mid-pose for the rest of the run.
        console.error('Sprite frame draw failed, using placeholder:', e)
      }
    }
    if (!spriteDrawn) {
      // Do not replace Pip with the green placeholder while idle art is
      // loading or unavailable. The cleared scene is preferable to showing
      // an unrelated character graphic that looks like a real game state.
      if (pose === 'idle') return
      // Built-in placeholder while art isn't wired up yet
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
    }
  }, [target, currentMap, initialPipPosition, isIdleLoaded])

  /* Continuous idle "breathing" loop — runs whenever the character
     isn't mid-action, so idle never looks like a frozen screenshot.
     Stops automatically the instant a run/jump sequence starts. */
  const idleLoopRunning = useRef(false)
  const movementRunning = useRef(false)
  const lastPipX = useRef(0)

  const startIdleLoop = useCallback(() => {
    if (idleLoopRunning.current || movementRunning.current) return
    idleLoopRunning.current = true
    function frame(t) {
      if (!idleLoopRunning.current) return
      const ctx = cvs.current?.getContext('2d')
      if (ctx) {
        const bob = Math.sin(t / 500) * 3 // gentle 3px sway, ~1 cycle/sec
        drawScene(ctx, lastPipX.current, 0, false, 'idle', bob, t)
      }
      idleRaf.current = requestAnimationFrame(frame)
    }
    idleRaf.current = requestAnimationFrame(frame)
  }, [drawScene])

  const stopIdleLoop = useCallback(() => {
    idleLoopRunning.current = false
    if (idleRaf.current) cancelAnimationFrame(idleRaf.current)
  }, [])

  // Start idle loop once assets are ready; keep it running whenever idle
  useEffect(() => {
    if (assetsReady) startIdleLoop()
    return () => stopIdleLoop()
  }, [assetsReady, startIdleLoop, stopIdleLoop])

  useEffect(() => {
    if (playToken === 0) return
    movementRunning.current = true
    stopIdleLoop()
    setRunState('running'); setErrMsg(''); setBubble(null); setRunMovedTiles(0)
    // Guards every rAF/setTimeout callback below. Without this, clicking
    // Run again while a previous run's say() bubble timeout (or jump/land
    // rAF chain) was still pending let that stale callback keep firing
    // afterward — using its own closured `i`/`events`/`pipX` from the OLD
    // run, interleaved with the new one. That's what could make a say()
    // seem to silently do nothing (its bubble got set then immediately
    // clobbered by a stale callback) or an animation look corrupted.
    let cancelled = false
    let events = []
    let executionFinished = false
    runCodeInWorker(code, lessonId).then(res => {
      if (cancelled) return
      executionFinished = true
      events = (res.events || []).slice(Math.max(0, eventOffset))
      if (res.error) {
      movementRunning.current = false
      setRunState('error'); setErrMsg(res.error)
      onResult && onResult({ events, code, error: res.error })
      startIdleLoop()
      return
      }
      step()
    })
    let pipX = lastPipX.current || 0, i = 0
    let animationClock = 0
    let previousTime = null
    let reportedTile = null
    const reportProgress = x => {
      const nextTile = Math.max(0, Math.round(x))
      const nextMap = getMapForPosition(x)
      setCurrentMap(previousMap => previousMap === nextMap ? previousMap : nextMap)
      if (nextTile === reportedTile) return
      reportedTile = nextTile
      setTileProgress(nextTile)
    }
    const ctx = cvs.current.getContext('2d')
    reportProgress(pipX)

    function step() {
      if (cancelled) return
      if (i >= events.length) {
        movementRunning.current = false
        const hit = pipX >= (initialPipPosition || 0) + target
        lastPipX.current = pipX
        reportProgress(pipX)
        drawScene(ctx, pipX, 0, hit, 'idle', 0)
        setRunState(hit ? 'success' : 'idle')
        if (hit) playSfx(ASSETS.sfxComplete)
        onResult && onResult({ events, code, error: null, finalX: pipX })
        startIdleLoop()
        return
      }
      const ev = events[i]
      if (ev.type === 'moveRight') {
        const from = pipX, to = pipX + ev.amount
        const pose = Math.abs(ev.amount) >= RUN_THRESHOLD ? 'run' : 'walk'
        // Short clips used to finish in only three or four rAF callbacks,
        // which moved Pip visibly but left too little time to show a gait.
        // Give each tile enough time for several walk/run frame advances.
        const start = performance.now(), dur = Math.max(900, Math.abs(ev.amount) * 500)
        function fr(t) {
          if (cancelled) return
          if (previousTime === null) previousTime = t
          animationClock += Math.min(50, t - previousTime)
          previousTime = t
          const p = Math.min(1, (t - start) / dur), e2 = 1 - Math.pow(1 - p, 3)
          pipX = from + (to - from) * e2
          reportProgress(pipX)
          const gait = Math.sin(p * Math.PI * 4) * 2.5 // little bounce while moving
          drawScene(ctx, pipX, gait, false, pose, 0, animationClock)
          if (p < 1) raf.current = requestAnimationFrame(fr)
          else {
            pipX = to
            reportProgress(pipX)
            setRunMovedTiles(previous => previous + ev.amount)
            i++
            step()
          }
        }
        raf.current = requestAnimationFrame(fr)
      } else if (ev.type === 'jump') {
        playSfx(ASSETS.sfxJump)
        const startX = pipX
        const jumpDistance = Number.isFinite(ev.amount) ? ev.amount : 0
        const start = performance.now(), dur = 500
        function fr(t) {
          if (cancelled) return
          const p = Math.min(1, (t - start) / dur)
          const arc = Math.sin(p * Math.PI) * 48
          const drift = jumpDistance * p * 1.2
          pipX = startX + drift
          reportProgress(pipX)
          drawScene(ctx, pipX, arc, false, 'jump', 0, t - start)
          if (p < 1) raf.current = requestAnimationFrame(fr)
          else { reportProgress(pipX); land() }
        }
        raf.current = requestAnimationFrame(fr)

        // Brief recovery pose on touchdown — without this, the jump arc
        // (Pip mid-air, cape flying) cut directly to the idle stance in
        // one frame, which read as a pose jumping rather than landing.
        function land() {
          const landStart = performance.now(), landDur = 420 // ~ one full 6-frame cycle at 12fps
          function lfr(t) {
            if (cancelled) return
            const p = Math.min(1, (t - landStart) / landDur)
            drawScene(ctx, pipX, 0, false, 'land', 0, t - landStart)
            if (p < 1) raf.current = requestAnimationFrame(lfr)
            else { drawScene(ctx, pipX, 0, false, 'idle', 0); i++; step() }
          }
          raf.current = requestAnimationFrame(lfr)
        }
      } else if (ev.type === 'say') {
        setBubble(ev.text)
        // Same horizontal placement as the character (see CX in drawScene):
        // centered over Pip's current tile, clamped so the bubble can't
        // overflow past the edge of the game area when he's near either side.
        const localX = ((pipX % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH
        const bubbleLeft = (localX / MAP_WIDTH) * 100
        const mapImage = imgs.current.background
        const mapScale = mapImage ? Math.min(canvasW / mapImage.naturalWidth, canvasH / mapImage.naturalHeight) : 1
        const mapHeight = mapImage ? mapImage.naturalHeight * mapScale : canvasH
        const mapTop = mapImage ? (canvasH - mapHeight) / 2 : 0
        const mapFeet = mapImage ? mapTop + BG_GRASS_FRACTION * mapHeight : canvasH * 0.72 - 26
        const characterHeight = FRAME_DATA.characterIdle[0].h * (Math.max(38, (canvasW / TILE_COUNT) * 0.62) / SPRITE_REF_W)
        setBubbleX(Math.min(94, Math.max(6, bubbleLeft)))
        setBubbleY(Math.min(82, Math.max(8, ((mapFeet - characterHeight - 16) / canvasH) * 100)))
        drawScene(ctx, pipX, 0, false, 'idle', 0)
        setTimeout(() => {
          if (cancelled) return
          setBubble(null); i++; step()
        }, 1100)
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
    <div ref={wrap} style={{ position:'relative', width:'100%', height:'100%', minHeight: fullHeight ? '100%' : 320, background:'#C7D2F8' }}>
      <div style={{
        position:'absolute', top:14, left:14,
        display:'flex', alignItems:'center', gap:8,
        background:'rgba(15,23,42,0.56)', color:'#fff',
        border:'1px solid rgba(255,255,255,0.2)', borderRadius:12,
        padding:'7px 10px', fontSize:12, fontWeight:700,
        letterSpacing:'0.04em', textTransform:'uppercase',
        boxShadow:'0 10px 24px rgba(15,23,42,0.22)', zIndex:2
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
        maxWidth:200
      }}>
        {levelLabel && <span style={{ opacity: 0.9, fontSize:10 }}>{levelLabel}</span>}
        {levelTitle && <span style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>{levelTitle}</span>}
      </div>

      <canvas
        ref={cvs}
        width={canvasWidth}
        height={canvasHeight}
        style={{ display:'block', width:'100%', height:'100%', objectFit:'fill' }}
      />
      {bubble && (
        <div className="toast-pop" style={{
          position:'absolute', top:`${bubbleY}%`, left:`${bubbleX}%`, transform:'translate(-50%, -100%)',
          background:'#fff', color:C.onyx,
          padding:'10px 16px', borderRadius:12, fontSize:14, fontWeight:500,
          boxShadow:'0 4px 14px rgba(15,23,42,.18)', maxWidth:220, width:'max-content',
          border:`1px solid ${C.onyx100}`, textAlign:'center'
        }}>
          {bubble}
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
          fontFamily:"'JetBrains Mono',monospace"
        }}>⚠ {errMsg}</div>
      )}
      {runState === 'success' && (
        <div className="toast-pop" style={{
          position:'absolute', top:16, right:16,
          background:C.emerald, color:'#fff',
          padding:'11px 20px', borderRadius:20, fontSize:15, fontWeight:700,
          boxShadow:'0 4px 20px rgba(34,197,94,.4)'
        }}>🏁 Flag reached!</div>
      )}
    </div>
  )
}
