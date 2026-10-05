import React, { useEffect, useRef, useState } from 'react'
import './PlayerDeath.css'

/*
  Props added for the boss island (Island 3):
    strikeEnabled  - false = a normal wrong answer does NOT play the lightning
                     (the golem's attack is the hit instead). The lightning
                     animation itself is untouched and still plays everywhere
                     else, and still plays when Pip dies (isDying).
    delayMs        - waits this long before the lightning/death plays, so the
                     golem's slam lands first (use BOSS_HIT_DELAY_MS).
*/
export default function PlayerDeath({
  wrongAnswers = 0,
  strikeToken = 0,
  isDying = false,
  position = null,
  onAnimationComplete,
  strikeEnabled = true,
  delayMs = 0,
}) {
  const [showLightning, setShowLightning] = useState(false)
  const strikeAudioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio('/assets/sounds/lightning-strike.mp4')
    audio.preload = 'auto'
    audio.volume = 0.85
    strikeAudioRef.current = audio

    return () => {
      audio.pause()
      audio.currentTime = 0
      strikeAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (strikeToken <= 0) return
    // GameCanvas publishes window.__cqBossIsland while Island 3 is on screen, so
    // this works even if the lesson page does not pass strikeEnabled / delayMs.
    const bossActive = typeof window !== 'undefined' && !!window.__cqBossIsland
    const golemHits = bossActive || !strikeEnabled
    const hitDelay = delayMs || (bossActive ? (window.__cqBossHitDelay || 0) : 0)

    if (golemHits) {
      // The golem attacks. GameCanvas ignores a duplicate trigger (attack lock).
      window.dispatchEvent(new Event('cq:life-lost'))
      // Normal wrong answer on the boss island: the golem hits, not the sky.
      if (!isDying) return
    }

    let hideTimer = null
    const startTimer = setTimeout(() => {
      setShowLightning(true)

      const audio = strikeAudioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(error => {
          console.warn('[CodeQuest] Lightning sound could not play:', error)
        })
      }

      if (!isDying) {
        hideTimer = setTimeout(() => setShowLightning(false), 700)
      }
    }, hitDelay)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(hideTimer)
    }
  }, [strikeToken])

  useEffect(() => {
    if (!isDying) return

    // Death always shows the lightning, after the golem's hit has landed.
    const bossActive = typeof window !== 'undefined' && !!window.__cqBossIsland
    const deathDelay = delayMs || (bossActive ? (window.__cqBossHitDelay || 0) : 0)
    const showTimer = setTimeout(() => setShowLightning(true), deathDelay)
    const doneTimer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete()
      }
    }, deathDelay + 1800)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(doneTimer)
      setShowLightning(false)
    }
  }, [isDying, onAnimationComplete])

  if (!showLightning) {
    return null
  }

  const overlayStyle = position
    ? {
        '--player-x': `${position.x}px`,
        '--player-y': `${position.y}px`
      }
    : undefined

  return (
    <div
      key={`lightning-strike-${wrongAnswers}`}
      className={`player-lightning-overlay${
        isDying ? ' is-death' : ''
      }`}
      style={overlayStyle}
      aria-hidden="true"
    >
      <div className="lightning-flash" />
      <div className="lightning-vignette" />
      <div className="lightning-halo" />
      <div className="lightning-sprite" />
      <div className="lightning-bolt" />
      <div className="lightning-branch lightning-branch-left" />
      <div className="lightning-branch lightning-branch-right" />
      <div className="lightning-core" />
      <div className="electric-sparks" />
      <div className="electric-arcs" />
      <div className="lightning-particles" />
    </div>
  )
}