import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import QuestScene from '../components/QuestScene'
import { Ico } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { normalizeSection } from '../utils/section'

const REFRESH_MS = 30000

function rankLabel(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

const getSection = (row) => normalizeSection(row?.section) || 'No section'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [section, setSection] = useState('all')

  const load = useCallback(() => {
    axios.get('/api/progress/leaderboard')
      .then(res => {
        setRows(Array.isArray(res.data) ? res.data : [])
        setUpdatedAt(new Date())
        setError('')
      })
      .catch(() => setError('The hall of knights could not be loaded.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  // Unique sections found in the data, sorted naturally (BSIT 2A, BSIT 10A...)
  const sections = useMemo(
    () =>
      [...new Set(rows.map(getSection))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [rows]
  )

  // If the chosen section disappears after an auto-refresh, fall back to "all".
  const activeSection = sections.includes(section) ? section : 'all'

  const visibleRows = useMemo(
    () =>
      activeSection === 'all'
        ? rows
        : rows.filter((row) => getSection(row) === activeSection),
    [rows, activeSection]
  )

  return (
    <QuestScene>
      <div className="quest-panel-page">
        <header className="quest-panel-page__header">
          <div>
            <p className="landing-eyebrow">Hall of Knights</p>
            <h1>Leaderboard</h1>
            <p className="quest-panel-page__sub">
              Real-time rankings by XP · refreshes every 30 seconds
              {updatedAt && <> · Updated {updatedAt.toLocaleTimeString()}</>}
            </p>
          </div>
          <Ico n="trophy" s={42} c="#f5d547" />
        </header>

        {loading ? (
          <div className="landing-quest__message">Summoning the rankings…</div>
        ) : error ? (
          <div className="landing-quest__message landing-quest__message--error">{error}</div>
        ) : (
          <div className="leaderboard-table-wrap">
            {sections.length > 1 && (
              <div className="leaderboard-filter">
                <label htmlFor="leaderboard-section">Section</label>
                <select
                  id="leaderboard-section"
                  value={activeSection}
                  onChange={(event) => setSection(event.target.value)}
                >
                  <option value="all">All sections</option>
                  {sections.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <span className="leaderboard-filter__count">
                  {visibleRows.length} knight{visibleRows.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Knight</th>
                  <th>Section</th>
                  <th>Level</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const rank = index + 1
                  const isYou = row.id === user?.id
                  return (
                    <tr key={row.id} className={isYou ? 'leaderboard-table__you' : ''}>
                      <td>{rankLabel(rank)}</td>
                      <td>
                        {row.name}
                        {isYou && <span className="leaderboard-table__badge">You</span>}
                      </td>
                      <td>{normalizeSection(row.section) || '—'}</td>
                      <td>{row.level}</td>
                      <td>{row.xp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {visibleRows.length === 0 && (
              <p className="quest-panel-page__empty">
                {rows.length === 0
                  ? 'No knights on the board yet. Clear an activity to claim your spot.'
                  : 'No knights in this section yet.'}
              </p>
            )}
          </div>
        )}
      </div>
    </QuestScene>
  )
}