import React from 'react'
import QuestNav from './QuestNav'

export default function QuestScene({ children, className = '', currentTile = 0, TILE_SIZE = 40, totalMapTiles = 45 }) {
  const activeTile = Number(currentTile) || 0
  const tileSize = Number(TILE_SIZE) || 40
  const maxTiles = Number(totalMapTiles) || 45

  // Calculate camera horizontal offset based on Pip's tile position (currentTile * TILE_SIZE)
  // When Pip moves past tile 15, smoothly scroll or chunk-shift the camera viewport so Pip remains visible at all times. Clamp bounds to total map tiles.
  const pastTile15 = Math.max(0, activeTile - 15)
  const rawOffset = pastTile15 * tileSize
  const maxOffset = Math.max(0, (maxTiles - 15) * tileSize)
  const cameraOffset = Math.min(rawOffset, maxOffset)

  return (
    <main className={`landing-page landing-page--quest ${className}`.trim()}>
      <div
        className="landing-scene"
        aria-hidden="true"
        style={{
          transform: `translateX(-${cameraOffset}px)`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <img className="landing-scene__bg" src="/assets/background.png" alt="" />
        <div className="landing-scene__veil landing-scene__veil--quest" />
      </div>

      <QuestNav />
      <div
        style={{
          transform: `translateX(-${cameraOffset}px)`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}
      >
        {children}
      </div>

      <footer className="landing-footer">
        <span>ISPSC Tagudin · BSIT</span>
      </footer>
    </main>
  )
}
