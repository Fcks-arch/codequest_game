import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Ico, Pill } from '../components/UI'
import { isActivityUnlocked } from '../utils/questProgress'

export default function IslandPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [celebration, setCelebration] = useState(null)

  useEffect(() => {
    const savedCelebration = sessionStorage.getItem('codequest_island_complete')
    if (savedCelebration) {
      try { setCelebration(JSON.parse(savedCelebration)) } catch (_) {}
      sessionStorage.removeItem('codequest_island_complete')
    }
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        setModules(moduleResponse.data)
        setProgress(progressResponse.data)
      })
      .catch(() => setError('This island could not be loaded. Please try again.'))
      .finally(() => setLoading(false))
  }, [id])

  const selectedModule = useMemo(
    () => modules.find(module => String(module.id) === String(id)),
    [modules, id]
  )
  const completedIds = useMemo(
    () => new Set(progress.filter(item => item.phase === 'completed').map(item => item.lesson_id)),
    [progress]
  )
  const moduleIndex = modules.findIndex(module => String(module.id) === String(id))
  const previousModulesComplete = moduleIndex <= 0 || modules
    .slice(0, moduleIndex)
    .every(module => module.activities.length > 0 && module.activities.every(activity => completedIds.has(activity.id)))

  if (loading) return <div style={pageMessage}>Preparing the island map…</div>
  if (error || !selectedModule) return <div style={pageMessage}>{error || 'Island not found.'}</div>

  return (
    <main style={{ minHeight:'100vh', color:'#F8FAFC', background:'#0F172A', position:'relative', overflow:'hidden' }}>
      <img src="/assets/background.png" alt="" aria-hidden="true" style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.38, pointerEvents:'none' }} />
      <div style={{ position:'fixed', inset:0, background:'linear-gradient(180deg,rgba(15,23,42,.44),rgba(15,23,42,.9))', pointerEvents:'none' }} />

      <header style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, padding:'17px clamp(18px,4vw,54px)', borderBottom:'1px solid rgba(255,255,255,.13)', background:'rgba(15,23,42,.74)' }}>
        <button type="button" onClick={() => navigate('/quest')} style={backButton}>
          ← All islands
        </button>
        <span style={{ fontSize:12, color:'#CBD5E1' }}>Island {selectedModule.order_index} of {modules.length} · {selectedModule.activities.length} levels</span>
      </header>

      <section style={{ position:'relative', zIndex:1, maxWidth:1120, margin:'0 auto', padding:'42px 22px 64px' }}>
        {celebration && (
          <div className="toast-pop" role="status" style={{ ...panel, marginBottom:20, borderColor:'#4ADE80', background:'rgba(22,163,74,.2)', display:'flex', alignItems:'center', gap:14 }}>
            <Ico n="trophy" s={30} c="#FDE68A" />
            <div>
              <strong style={{ display:'block', fontSize:18 }}>Island complete!</strong>
              <span style={{ color:'#DCFCE7', fontSize:13 }}>You cleared every level on {celebration.title}. The next island is now unlocked.</span>
              {celebration.badges?.length > 0 && <span style={{ display:'block', color:'#FDE68A', fontSize:12, marginTop:4 }}>Badge earned: Island Completion</span>}
            </div>
          </div>
        )}
        <div style={{ maxWidth:720 }}>
          <p style={eyebrow}>Island landing page</p>
          <h1 style={{ margin:'0 0 11px', fontSize:'clamp(30px,5vw,48px)', letterSpacing:'-.04em' }}>{selectedModule.title}</h1>
          <p style={{ margin:0, color:'#D7E0EE', lineHeight:1.65, maxWidth:640 }}>{selectedModule.description}</p>
        </div>

        {!previousModulesComplete ? (
          <div style={{ ...panel, marginTop:28, textAlign:'center' }}>
            <Ico n="lock" s={24} c="#F5D547" />
            <h2 style={{ margin:'12px 0 6px', fontSize:20 }}>This island is locked</h2>
            <p style={{ margin:0, color:'#CBD5E1' }}>Clear every level on the earlier island to unlock this path.</p>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, marginTop:30, marginBottom:12 }}>
              <div>
                <p style={{ ...eyebrow, marginBottom:4 }}>Choose a level</p>
                <h2 style={{ margin:0, fontSize:21 }}>Your learning path</h2>
              </div>
              <Pill bg="rgba(245,213,71,.18)" col="#FDE68A">{selectedModule.activities.filter(activity => completedIds.has(activity.id)).length} / {selectedModule.activities.length} cleared</Pill>
            </div>

            <div style={{ ...panel, padding:'22px', background:'rgba(15,23,42,.9)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(185px, 1fr))', gap:14 }}>
                {selectedModule.activities.map((activity, index) => {
                  const completed = completedIds.has(activity.id)
                  const unlocked = isActivityUnlocked(index, selectedModule.activities, completedIds)
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => navigate(`/lesson/${activity.id}`)}
                      style={{
                        minHeight:164, borderRadius:15, padding:'16px', textAlign:'left', color:'#F8FAFC',
                        border: completed ? '1px solid #4ADE80' : unlocked ? `1px solid ${selectedModule.color}` : '1px solid rgba(148,163,184,.24)',
                        background: completed ? 'rgba(22,163,74,.18)' : unlocked ? 'rgba(30,41,59,.94)' : 'rgba(30,41,59,.58)',
                        cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : .52,
                        boxShadow: unlocked ? '0 10px 22px rgba(2,6,23,.25)' : 'none'
                      }}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <span style={{ width:32, height:32, display:'grid', placeItems:'center', borderRadius:9, background: completed ? '#16A34A' : unlocked ? selectedModule.color : '#475569', fontWeight:800 }}>
                          {completed ? <Ico n="check" s={16} c="#fff" /> : unlocked ? index + 1 : <Ico n="lock" s={15} c="#CBD5E1" />}
                        </span>
                        <span style={{ fontSize:11, color:'#FDE68A', fontWeight:700 }}>+{activity.xp_reward} XP</span>
                      </div>
                      <small style={{ display:'block', color:'#A5B4FC', fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', fontSize:10 }}>{activity.level_label || `Level ${index + 1}`}</small>
                      <strong style={{ display:'block', margin:'5px 0 7px', fontSize:15, lineHeight:1.3 }}>{activity.title}</strong>
                      <span style={{ display:'block', color:'#CBD5E1', fontSize:11.5, lineHeight:1.45 }}>{completed ? 'Cleared — replay anytime' : unlocked ? 'Ready to play' : 'Complete the previous level first'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

const pageMessage = { minHeight:'100vh', display:'grid', placeItems:'center', background:'#0F172A', color:'#E2E8F0', fontSize:14 }
const eyebrow = { margin:'0 0 8px', color:'#A5B4FC', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.14em' }
const panel = { border:'1px solid rgba(255,255,255,.15)', borderRadius:20, background:'rgba(15,23,42,.86)', padding:28, boxShadow:'0 18px 45px rgba(2,6,23,.28)' }
const backButton = { background:'rgba(255,255,255,.09)', color:'#F8FAFC', border:'1px solid rgba(255,255,255,.17)', borderRadius:8, padding:'8px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }
