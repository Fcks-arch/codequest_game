import React, { useEffect, useRef, useState } from 'react'
import './PlayerDeath.css'

export default function PlayerDeath({
  wrongAnswers = 0,
  strikeToken = 0,
  isDying = false,
  position = null,
  onAnimationComplete,
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

    setShowLightning(true)

    const audio = strikeAudioRef.current
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(error => {
        console.warn('[CodeQuest] Lightning sound could not play:', error)
      })
    }

    if (isDying) return

    const timer = setTimeout(() => {
      setShowLightning(false)
    }, 700)

    return () => clearTimeout(timer)
  }, [strikeToken])

  useEffect(() => {
    if (!isDying) return

    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete()
      }
    }, 1800)

    return () => clearTimeout(timer)
  }, [isDying, onAnimationComplete])

  if (!showLightning && !isDying) {
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