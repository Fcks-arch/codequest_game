import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Ico, Pill } from './UI'

const TABS = [
  { to: '/', end: true, label: 'Home' },
  { to: '/quest', label: 'Quest Map' },
  { to: '/profile', label: 'Profile' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/progress', label: 'My Progress' },
]

export default function QuestNav() {
  const { user, logout } = useAuth()

  return (
    <nav className="quest-nav">
      <Link to="/" className="brand brand--medieval">
        <span className="brand__shield" aria-hidden="true">⚔</span>
        CodeQuest
      </Link>

      <div className="quest-nav__tabs">
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `quest-nav__tab ${isActive ? 'quest-nav__tab--active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className="quest-nav__stats">
        <Pill bg="rgba(245,213,71,.18)" col="#f5d547">
          <Ico n="flame" s={13} c="#f5d547" /> {user?.streak || 0} day streak
        </Pill>
        <Pill bg="rgba(126,200,255,.15)" col="#7ec8ff">
          <Ico n="star" s={13} c="#7ec8ff" /> Level {user?.level || 1}
        </Pill>
        <Pill bg="rgba(58,140,50,.2)" col="#86efac">
          <Ico n="bolt" s={13} c="#86efac" /> {user?.xp || 0} XP
        </Pill>
        <button type="button" className="landing-login landing-login--logout" onClick={logout}>
          Log out
        </button>
      </div>
    </nav>
  )
}
