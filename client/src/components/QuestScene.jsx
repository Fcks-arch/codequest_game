import React from 'react'
import QuestNav from './QuestNav'

export default function QuestScene({ children, className = '' }) {
  return (
    <main className={`landing-page landing-page--quest ${className}`.trim()}>
      <div className="landing-scene" aria-hidden="true">
        <img className="landing-scene__bg" src="/assets/background.png" alt="" />
        <div className="landing-scene__veil landing-scene__veil--quest" />
      </div>

      <QuestNav />
      {children}

      <footer className="landing-footer">
        <span>ISPSC Tagudin · BSIT</span>
      </footer>
    </main>
  )
}
