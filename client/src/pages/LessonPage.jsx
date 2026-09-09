import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import GameCanvas, { startBgMusic, stopBgMusic } from '../components/GameCanvas'
import CodeEditor, { lintJava } from '../components/CodeEditor'
import { getLevelStartSpawn, markLessonCompleted } from '../utils/GameStateManager'
import { getLessonByIslandAndLevel } from '../data/lessons'
import IslandClearedModal from '../components/IslandClearedModal'
import { C, Ico, Pill, Toast } from '../components/UI'

function javaLabel(value) {
  return String(value || '').replace(/JavaScript Foundations/g, 'JAVA FOUNDATIONS').replace(/JavaScript/g, 'Java')
}

function getActiveIslandId(lesson, location) {
  const stateIslandId = Number(location?.state?.islandId)
  const lessonIslandId = Number(lesson?.moduleId ?? lesson?.module_id ?? lesson?.islandId)
  const storedIslandId = Number(window.localStorage.getItem('activeIslandId'))
  if (Number.isFinite(stateIslandId) && stateIslandId > 0) return stateIslandId
  if (Number.isFinite(lessonIslandId) && lessonIslandId > 0) return lessonIslandId
  if (Number.isFinite(storedIslandId) && storedIslandId > 0) return storedIslandId
  return Number(location?.pathname?.match(/\/island\/(\d+)/)?.[1])
}

function getIslandRoute(lesson, location) {
  const islandId = getActiveIslandId(lesson, location)
  return Number.isFinite(islandId) && islandId > 0 ? `/island/${islandId}` : '/quest'
}

/* ── Shuffle helper for guided step choices ── */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function lessonSummary(lesson) {
  const raw = String(lesson?.briefing || lesson?.description || lesson?.goal || '').trim()
  if (raw) {
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (normalized.length > 220) return normalized.slice(0, 220).trim() + '…'
    return normalized
  }
  return lesson?.title
    ? `This Java lesson uses ordered statements and method calls to complete ${lesson.title}.`
    : 'This Java lesson uses ordered statements and method calls to complete the task.'
}

function guidedJavaSummary(code) {
  if (/\bint\s+\w+\s*=/.test(code) && /moveRight\s*\(\s*\w+\s*\)/.test(code)) {
    return 'You declared an integer variable in Java and passed it as a parameter to move Pip.'
  }
  if (/\b(?:int|double|float|long|short|byte|char|boolean|String)\s+\w+\s*=/.test(code)) {
    return 'You declared a typed variable in Java and used it in a method call.'
  }
  return 'You built a Java sequence from method calls, using explicit parameters and semicolons.'
}

function briefingNotes(lesson) {
  const notes = (lesson?.concepts || [])
    .map(concept => String(concept.note || '').trim())
    .filter(Boolean)
  return notes.length > 0 ? notes : [guidedJavaSummary('')]
}

function LessonBriefing({ lesson }) {
  return (
    <div style={{ marginTop:14, borderTop:`1px solid ${C.onyx100}`, paddingTop:12 }}>
      <div style={{ fontSize:11, fontWeight:700, color:C.onyx400, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:7 }}>
        Briefing
      </div>
      <p style={{ fontSize:12.5, color:C.onyx600, lineHeight:1.7, margin:'0 0 7px' }}>
        {lessonSummary(lesson)}
      </p>
      {briefingNotes(lesson).map((note, index) => (
        <p key={index} style={{ fontSize:12, color:C.onyx600, lineHeight:1.55, margin:'0 0 5px' }}>{note}</p>
      ))}
    </div>
  )
}

function NextLevelButton({ onNext, isFinalLevel = false, isCleared = false, completed = false }) {
  return (
    <button type="button" onClick={onNext} disabled={!isCleared && !completed} style={{
      width:'100%', background:C.emerald, color:'#fff', border:'none', borderRadius:10,
      padding:'12px 10px', fontSize:13, fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center', gap:5,
      cursor:!isCleared && !completed ? 'not-allowed' : 'pointer', opacity:!isCleared && !completed ? .45 : 1
    }}>
      <span>{isFinalLevel ? 'Return to Map 🏆' : 'Next Level >'}</span>
      <Ico n={isFinalLevel ? 'trophy' : 'chevRight'} s={12} c="#fff"/>
    </button>
  )
}

function explainCodeLine(line, lesson) {
  const code = String(line || '').trim()
  if (!code) return null
  const isIsland2 = lesson?.module_id === 2 || (Number(lesson?.id) >= 11 && Number(lesson?.id) <= 20)
  if (/^say\s*\(/.test(code)) {
    return isIsland2
      ? `${code} — Pip calls out to announce his approach across the bridge and bypass the trap.`
      : `${code} tells Pip to display this message before continuing.`
  }
  if (/^moveRight\s*\(/.test(code)) {
    return isIsland2
      ? `${code} — Pip strides across the bridge tiles toward the next checkpoint.`
      : `${code} moves Pip right by the supplied number of tiles.`
  }
  if (/^jump\s*\(/.test(code)) {
    return isIsland2
      ? `${code} — Pip springs into the air to dodge the spike trap blocking the path.`
      : `${code} makes Pip jump over the next obstacle or gap.`
  }
  if (/^(?:int|let|const|String|double|float|long|boolean)\s+\w+\s*=/.test(code)) {
    return isIsland2
      ? `${code} — Pip calculates the precise bridge span distance and stores it in memory.`
      : `${code} declares a typed variable value that can be reused later in the program.`
  }
  return isIsland2
    ? `${code} — Pip executes this step of the algorithm along the bridge route.`
    : `${code} runs as the next statement in the program's sequence.`
}

function CompletionReview({ lesson, code }) {
  const selectedCode = String(code || '').trim() || '// No code was captured for this completion.'
  const codeBreakdown = selectedCode
    .split('\n')
    .map(line => explainCodeLine(line, lesson))
    .filter(Boolean)

  return (
    <div style={{ marginTop:14 }}>
      <LessonBriefing lesson={lesson} />

      <div style={{ marginTop:12, background:'#0B1220', borderRadius:9, padding:'10px 11px', maxHeight:142, overflowY:'auto' }}>
        <div style={{ fontSize:10, color:'#94A3B8', fontFamily:"'JetBrains Mono',monospace", marginBottom:6, letterSpacing:'.06em' }}>
          SELECTED ANSWERS / CODE
        </div>
        <pre style={{ margin:0, whiteSpace:'pre-wrap', fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'#86EFAC', lineHeight:'20px' }}>
          {selectedCode}
        </pre>
      </div>

      <div style={{ marginTop:12 }}>
        <div style={{ fontSize:10, color:C.onyx400, fontWeight:700, letterSpacing:'.05em', marginBottom:7 }}>
          LINE-BY-LINE CODE BREAKDOWN
        </div>
        {codeBreakdown.map((explanation, index) => (
          <p key={index} style={{ margin:'0 0 6px', fontSize:12, color:C.onyx600, lineHeight:1.5 }}>
            <b style={{ color:C.purple }}>Line {index + 1}:</b> {explanation}
          </p>
        ))}
      </div>

    </div>
  )
}

/* ── Dynamic validation using database schema attributes ── */
function validateLesson(lesson, events = [], code = '') {
  if (!lesson) return { passed: false, items: [] }

  const minMoves = Number(lesson.min_moves || 0)
  const minSays = Number(lesson.min_says || 0)
  const minJumps = Number(lesson.min_jumps || 0)

  const moves = events
    .filter(event => event.type === 'moveRight')
    .reduce((total, event) => total + (event.amount || 1), 0)
  const says = events.filter(event => event.type === 'say').length
  const jumps = events.filter(event => event.type === 'jump').length

  const items = []

  if (minMoves > 0) {
    items.push({
      label: `Move Pip at least ${minMoves} tile${minMoves === 1 ? '' : 's'}`,
      ok: moves >= minMoves
    })
  }

  if (minSays > 0) {
    items.push({
      label: `Use say() ${minSays} time${minSays === 1 ? '' : 's'}`,
      ok: says >= minSays
    })
  }

  if (minJumps > 0) {
    items.push({
      label: `Use jump() ${minJumps} time${minJumps === 1 ? '' : 's'}`,
      ok: jumps >= minJumps
    })
  }

  if (lesson.required_code_pattern) {
    let patternMatches = false
    try {
      patternMatches = new RegExp(lesson.required_code_pattern, 'm').test(code)
    } catch (_) {}
    items.push({
      label: lesson.required_code_label || 'Use required code pattern',
      ok: patternMatches
    })
  }

  if (items.length === 0) {
    const target = Number(lesson.target_tiles || 1)
    if (target > 1) {
      items.push({ label: `Reach tile ${target}`, ok: moves >= target })
    } else {
      items.push({ label: 'Complete the task', ok: code.trim().length > 0 })
    }
  }

  return {
    passed: items.length > 0 && items.every(item => item.ok),
    items
  }
}

/* ════════════════════════════════
   GUIDED PANEL
   ════════════════════════════════ */
function GuidedPanel({ lesson, onUnlock, onNext, onStepCorrect, onAllStepsDone, taskComplete, completedCode, isFinalLevel }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [built, setBuilt] = useState([])
  const [shakeKey, setShakeKey] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const builtRef = useRef([])

  const guidedSteps = lesson.guided || []

  useEffect(() => {
    setStepIdx(0)
    setChosen(null)
    setBuilt([])
    setShakeKey(0)
    setAllDone(false)
    builtRef.current = []
  }, [lesson.id])

  const step = guidedSteps[stepIdx]
  const stepPrompt = String(step?.prompt || step?.question || '').trim()
  const stepBriefing = String(step?.briefing || lesson?.briefing || '').trim()

  const options = useMemo(() => {
    if (!step) return []

    if (Array.isArray(step.options) && step.options.length > 0) {
      return shuffle(step.options)
    }

    const dbChoices = [
      step.correct_snippet,
      step.distractor_1,
      step.distractor_2,
      step.distractor_3
    ].filter(val => val !== null && val !== undefined && String(val).trim() !== '')

    return shuffle(dbChoices)
  }, [stepIdx, lesson.id, step])

  const pick = (opt) => {
    if (chosen) return
    const correctTarget = step.correct_snippet || step.correct_answer

    if (opt === correctTarget) {
      const newBuilt = [...builtRef.current, opt]
      builtRef.current = newBuilt
      setChosen({ text: opt, correct: true })

      if (onStepCorrect) {
        onStepCorrect(opt, newBuilt.join('\n'), stepIdx + 1 >= guidedSteps.length)
      }

      setTimeout(() => {
        setBuilt([...newBuilt])
        setChosen(null)
        if (stepIdx + 1 >= guidedSteps.length) {
          setAllDone(true)
          onAllStepsDone?.(newBuilt.join('\n'))
        } else {
          setStepIdx(s => s + 1)
        }
      }, 550)
    } else {
      setChosen({ text: opt, correct: false })
      setShakeKey(k => k + 1)
      setTimeout(() => setChosen(null), 650)
    }
  }

  const progress = allDone ? guidedSteps.length : stepIdx
  const pct = guidedSteps.length > 0 ? (progress / guidedSteps.length) * 100 : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
      <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${C.onyx100}`, flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:'uppercase', letterSpacing:'.06em' }}>
            Guided Mode
          </span>
          <span style={{ fontSize:11, color:C.onyx400, fontWeight:500 }}>
            {progress} / {guidedSteps.length}
          </span>
        </div>
        <div style={{ height:5, background:C.onyx100, borderRadius:999, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${pct}%`,
            background:`linear-gradient(90deg,${C.purple},${C.emerald})`,
            borderRadius:999, transition:'width .4s ease'
          }}/>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
        {guidedSteps.length === 0 && (
          <div style={{ fontSize:13, color:C.onyx500, textAlign:'center', marginTop:20, lineHeight:1.5 }}>
            No guided steps found for this lesson. You can proceed directly to Free Code mode below!
          </div>
        )}

        {!allDone && step && (
          <>
            {stepBriefing && (
              <div style={{
                marginBottom:12,
                background:'#F4F1FF',
                border:`1px solid ${C.purpleLight}`,
                borderRadius:12,
                padding:'10px 12px'
              }}>
                <div style={{
                  fontSize:10,
                  color:C.purple,
                  fontWeight:700,
                  letterSpacing:'.06em',
                  textTransform:'uppercase',
                  marginBottom:6
                }}>
                  Level Briefing
                </div>
                <div style={{
                  fontSize:12.5,
                  color:C.onyx700,
                  lineHeight:1.6,
                  whiteSpace:'pre-wrap'
                }}>
                  {stepBriefing}
                </div>
              </div>
            )}
            <div style={{
              fontSize:13, color:C.onyx700, fontWeight:600, lineHeight:1.6,
              marginBottom:12, background:C.purpleLight, borderRadius:10, padding:'10px 12px'
            }}>
              <b>Step {stepIdx + 1} — </b>{stepPrompt}
            </div>
            <div
              style={{ display:'flex', flexDirection:'column', gap:7 }}
              key={`${lesson.id}-${stepIdx}-${shakeKey}`}
            >
              {options.length === 0 ? (
                <div style={{ fontSize:12, color:C.onyx400 }}>No options available for this step.</div>
              ) : (
                options.map((opt, i) => {
                  const isChosen = chosen && chosen.text === opt
                  const isCorrect = isChosen && chosen.correct
                  const isWrong = isChosen && !chosen.correct
                  return (
                    <button key={i} onClick={() => pick(opt)}
                      className={isWrong ? 'shake' : ''}
                      style={{
                        background: isCorrect ? C.emeraldLight : isWrong ? '#FEECEC' : '#fff',
                        border: `1.5px solid ${isCorrect ? C.emerald : isWrong ? '#EF4444' : C.onyx100}`,
                        borderRadius:10, padding:'10px 12px', textAlign:'left',
                        fontFamily:"'JetBrains Mono',monospace", fontSize:12.5,
                        color: isCorrect ? C.emeraldDark : isWrong ? '#EF4444' : C.onyx700,
                        fontWeight:500, cursor: chosen ? 'default' : 'pointer',
                        transition:'all .12s', lineHeight:1.5, width:'100%', whiteSpace:'pre-wrap'
                      }}>
                      {opt}
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}

        {allDone && (
          <>
            <div className="toast-pop" style={{
              background:C.emeraldLight, color:C.emeraldDark, borderRadius:12,
              padding:'12px 14px', fontSize:13, fontWeight:600,
              display:'flex', alignItems:'center', gap:8, marginBottom:12
            }}>
              <Ico n="check" s={15} c={C.emeraldDark}/>
              All steps done!
            </div>

            {taskComplete && <CompletionReview lesson={lesson} code={completedCode || built.join('\n')} />}
          </>
        )}
      </div>

      {!taskComplete && (
        <div style={{
          flexShrink:0, background:'#0B1220', borderTop:`1px solid #1E293B`,
          padding:'10px 14px', maxHeight:120, overflowY:'auto'
        }}>
          <div style={{ fontSize:10, color:'#475569', fontFamily:"'JetBrains Mono',monospace", marginBottom:4, letterSpacing:'.06em' }}>
            SELECTED ANSWERS / CODE
          </div>
          {built.map((line, i) => (
            <div key={i} className="slide-up" style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'#86EFAC', lineHeight:'20px' }}>
              {line}
            </div>
          ))}
          {!allDone && guidedSteps.length > 0 && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'#334155' }}>█</div>}
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:7, padding:'10px 12px', flexShrink:0, borderTop:`1px solid ${C.onyx100}` }}>
        {(allDone || taskComplete || guidedSteps.length === 0) && (
          <button onClick={() => onUnlock(builtRef.current.join('\n'))} className="toast-pop"
            style={{
              width:'100%', background:C.purple, color:'#fff', border:'none',
              padding:'12px 10px', fontSize:13, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer',
              borderRadius:10
            }}>
            <Ico n="unlock" s={15} c="#fff"/> Continue to Free Code
          </button>
        )}
        {!taskComplete && <div style={{ marginBottom:8, fontSize:11, color:C.onyx400, textAlign:'center' }}>Select the correct code step above to complete the level.</div>}
        <NextLevelButton onNext={onNext} isFinalLevel={isFinalLevel} isCleared={taskComplete} completed={taskComplete} />
      </div>
    </div>
  )
}

/* ════════════════════════════════
   FREE CODE PANEL
   ════════════════════════════════ */
function FreeCodePanel({ lesson, starterCode, check, onRun, hint, onHint, completed, completedCode, onNext, onResetReplay, onResetCanvas, isFinalLevel }) {
  const [code, setCode] = useState(starterCode)

  useEffect(() => setCode(starterCode), [starterCode, lesson.id])

  const activeCheck = useMemo(() => {
    if (check) return check
    return validateLesson(lesson, [], code)
  }, [check, lesson, code])

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
      <div style={{ flexShrink:0, padding:'11px 14px 9px', borderBottom:`1px solid ${C.onyx100}`, background:C.onyx50 }}>
        <div style={{ fontSize:10, fontWeight:800, color:C.purple, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Lesson briefing</div>
        <div style={{ fontSize:12, color:C.onyx600, lineHeight:1.6 }}>{lessonSummary(lesson)}</div>
        {lesson.concepts?.slice(0, 2).filter(Boolean).map((concept, index) => (
          <div key={index} style={{ marginTop:6, fontSize:11, color:C.onyx500, lineHeight:1.5 }}>
            {concept.note || concept.code_snippet}
          </div>
        ))}
        {completed && (
          <button type="button" onClick={onResetReplay} style={{
            marginTop:8, background:'transparent', color:C.purple, border:`1px solid ${C.purple}`,
            borderRadius:7, padding:'6px 9px', fontSize:11, fontWeight:700, cursor:'pointer'
          }}>
            Reset &amp; Replay Guided Mode
          </button>
        )}
      </div>

      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:'12px 12px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.onyx400, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>
          Your Code
        </div>
        <div style={{ flex:1, minHeight:0, borderRadius:10, overflow:'hidden' }}>
          <CodeEditor value={code} onChange={setCode} fillHeight />
        </div>
      </div>

      <div style={{ flexShrink:0, padding:'10px 12px', display:'flex', gap:7, borderTop:`1px solid ${C.onyx100}` }}>
        <button onClick={() => onRun(code)}
          style={{
            flex:1, background:C.purple, color:'#fff', border:'none', borderRadius:9,
            padding:'10px', fontSize:13, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow:'0 4px 12px rgba(79,70,229,.3)', cursor:'pointer'
          }}>
          <Ico n="play" s={14} c="#fff"/> Run
        </button>
        <button onClick={() => { setCode(starterCode); onResetCanvas() }}
          style={{
            background:'#fff', color:C.onyx600, border:`1px solid ${C.onyx100}`,
            borderRadius:9, padding:'10px 12px', cursor:'pointer',
            display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600
          }}>
          <Ico n="refresh" s={14} c={C.onyx600}/>
        </button>
        <button onClick={onHint}
          style={{
            background: hint ? C.amberLight : '#fff', color:C.amberDark,
            border:`1px solid ${hint ? C.amber+'66' : C.onyx100}`,
            borderRadius:9, padding:'10px 12px', cursor:'pointer',
            display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600
          }}>
          <Ico n="tip" s={14} c={C.amberDark}/>
        </button>
      </div>

      {hint && (
        <div style={{
          flexShrink:0, background:C.amberLight, color:C.amberDark,
          fontSize:12.5, padding:'9px 14px', lineHeight:1.6, borderTop:`1px solid ${C.amber}44`
        }}>
          💡 {lesson.hint || 'No extra hint available for this level.'}
        </div>
      )}

      <div style={{ flexShrink:0, padding:'12px 14px', borderTop:`1px solid ${C.onyx100}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.onyx400, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:9 }}>
          Quest Checklist
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {activeCheck.items.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:16, height:16, borderRadius:'50%', flexShrink:0,
                background: item.ok ? C.emerald : C.onyx100,
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                {item.ok && <Ico n="check" s={10} c="#fff"/>}
              </div>
              <span style={{ fontSize:12, color: item.ok ? C.onyx : C.onyx400, fontWeight: item.ok ? 600 : 500 }}>
                {item.label}
              </span>
            </div>
          ))}

          {activeCheck.passed && (
            <>
              <div style={{
                marginTop:8, background:C.emeraldLight, color:C.emeraldDark,
                borderRadius:9, padding:'9px 12px', fontSize:12.5, fontWeight:600,
                display:'flex', alignItems:'center', gap:7
              }}>
                <Ico n="trophy" s={14} c={C.emeraldDark}/> Quest cleared!
              </div>
               {completed && <CompletionReview lesson={lesson} code={completedCode} />}
            </>
          )}
        </div>
      </div>
      <div style={{ flexShrink:0, padding:'12px 14px', borderTop:`1px solid ${C.onyx100}` }}>
        {!completed && <div style={{ marginBottom:8, fontSize:11, color:C.onyx400, textAlign:'center' }}>Complete the level to continue.</div>}
        <NextLevelButton onNext={onNext} isFinalLevel={isFinalLevel} isCleared={completed} completed={completed} />
      </div>
    </div>
  )
}

/* ════════════════════════════════
   MAIN LESSON PAGE
   ════════════════════════════════ */
export default function LessonPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const activeIslandId = Number(location.state?.islandId || searchParams.get('island') || window.localStorage.getItem('activeIslandId') || 1)
  const relativeLevel = Number(location.state?.relativeLevel || id)
  const { updateXp } = useAuth()

  const [lesson,      setLesson]      = useState(null)
  const [phase,       setPhase]       = useState('guided')
  const [starterCode, setStarterCode] = useState('')
  const [playToken,   setPlayToken]   = useState(0)
  const [liveCode,    setLiveCode]    = useState('')
  const [check,       setCheck]       = useState(null)
  const [hint,        setHint]        = useState(false)
  const [toast,       setToast]       = useState(null)
  const [musicOn,     setMusicOn]     = useState(false)
  const [panelOpen,   setPanelOpen]   = useState(true)
  const [completed,   setCompleted]   = useState(false)
  const [completedCode, setCompletedCode] = useState('')
  const [islandCleared, setIslandCleared] = useState(false)
  const [xpGained, setXpGained] = useState(0)
  const [nextLesson, setNextLesson] = useState(null)
  const [pipStartPosition, setPipStartPosition] = useState(0)
  const [eventOffset, setEventOffset] = useState(0)
  const [canvasResetToken, setCanvasResetToken] = useState(0)
  const completionPromiseRef = useRef(null)
  const guidedCodeRef = useRef('')
  const guidedEventsRef = useRef([])
  const guidedFinalStepRef = useRef(false)

  const PANEL_W = 340

  const saveProgress = useCallback(() => {
    if (!lesson) return Promise.resolve()
    if (completionPromiseRef.current) return completionPromiseRef.current

    const request = axios.post('/api/progress/complete', { lesson_id: Number(lesson.id) })
      .then(res => {
        setCompleted(true)
        markLessonCompleted(lesson.id)
        if (!res.data.alreadyDone) {
          setXpGained(res.data.xpAwarded || lesson.xp_reward || 0)
          updateXp(res.data.newXp, res.data.newLevel, res.data.unlocked_module)
          setToast({ msg:`+${res.data.xpAwarded || lesson.xp_reward} XP — quest cleared!`, tone:'emerald', k:Date.now() })
          setTimeout(() => setToast(null), 3000)
        } else setXpGained(0)
      })
      .catch(err => {
        console.error(err)
        setToast({ msg:'Level cleared locally. Progress will sync when you run it again.', tone:'amber', k:Date.now() })
        setTimeout(() => setToast(null), 3500)
      })
      .finally(() => {
        if (completionPromiseRef.current === request) completionPromiseRef.current = null
      })

    completionPromiseRef.current = request
    return request
  }, [lesson, updateXp])

  useEffect(() => {
    completionPromiseRef.current = null
    setCompleted(false)
    setCompletedCode('')
    setIslandCleared(false)
    setXpGained(0)
    setToast(null)
    setNextLesson(null)
    setPhase('guided')
    setStarterCode('')
    setLiveCode('')
    setEventOffset(0)
    guidedCodeRef.current = ''
    guidedEventsRef.current = []
    guidedFinalStepRef.current = false
    setCheck(null)
    const spawn = getLevelStartSpawn(id)
    setPipStartPosition(spawn.tileX)

    const applyLessonData = (sourceLesson, nextLessonData = null) => {
      if (!sourceLesson) return

      let guidedData = sourceLesson.guided ?? sourceLesson.guidedSteps ?? sourceLesson.steps
      if (typeof guidedData === 'string') {
        try { guidedData = JSON.parse(guidedData) } catch (_) { guidedData = [] }
      }

      let conceptsData = sourceLesson.concepts
      if (typeof conceptsData === 'string') {
        try { conceptsData = JSON.parse(conceptsData) } catch (_) { conceptsData = [] }
      }

      setLesson({
        ...sourceLesson,
        moduleId: sourceLesson.moduleId ?? sourceLesson.module_id ?? sourceLesson.islandId ?? activeIslandId,
        guided: Array.isArray(guidedData) ? guidedData : [],
        concepts: Array.isArray(conceptsData) ? conceptsData : [],
        initialCode: sourceLesson.initialCode ?? sourceLesson.starter_code ?? '',
        checklist: Array.isArray(sourceLesson.checklist) ? sourceLesson.checklist : []
      })

      setPipStartPosition(Number.isFinite(Number(sourceLesson.initial_tile))
        ? Number(sourceLesson.initial_tile)
        : spawn.tileX)

      setStarterCode(sourceLesson.starter_code || sourceLesson.initialCode || '')
      if (Number(sourceLesson.module_id) === 1 && Number(sourceLesson.order_index) === 2 && !sourceLesson.starter_code && !sourceLesson.initialCode) {
        setStarterCode('jump(4);')
      }
      setNextLesson(nextLessonData || null)
    }

    const fallbackLesson = getLessonByIslandAndLevel(activeIslandId, relativeLevel)

    const loadLesson = async () => {
      try {
        const [lessonResponse, progressResponse] = await Promise.all([
          axios.get('/api/lessons', { params: { island: activeIslandId, level: relativeLevel } }),
          axios.get('/api/progress')
        ])

        const fetchedLesson = lessonResponse.data?.[0]
        if (!fetchedLesson) throw new Error('Lesson not found for the selected island and level.')
        const serverCompleted = (progressResponse.data || []).some(item => {
          const progressLessonId = Number(item.lesson_id ?? item.activity_id)
          return progressLessonId === Number(fetchedLesson.id) && (
            item.phase === 'completed' || item.completed === true || item.is_completed === true
          )
        })
        if (serverCompleted) {
          setCompleted(true)
          setPhase('free')
        }

        const localLesson = getLessonByIslandAndLevel(activeIslandId, relativeLevel)
        applyLessonData({
          ...fetchedLesson,
          guided: Array.isArray(fetchedLesson.guided) && fetchedLesson.guided.length > 0
            ? fetchedLesson.guided
            : localLesson?.guided || localLesson?.steps || [],
          briefing: fetchedLesson.briefing || localLesson?.briefing,
          starter_code: fetchedLesson.starter_code || localLesson?.starter_code || localLesson?.initialCode || ''
        }, null)
      } catch (error) {
        console.error('Lesson fetch failed. Falling back to local lesson data.', error)

        if (fallbackLesson) {
          applyLessonData({
            ...fallbackLesson,
            guided: Array.isArray(fallbackLesson.guided) ? fallbackLesson.guided : [],
            concepts: Array.isArray(fallbackLesson.concepts) ? fallbackLesson.concepts : []
          })
          setCompleted(false)
          setPhase('guided')
          setNextLesson(null)
          return
        }

        setLesson(null)
      }
    }

    loadLesson()

    startBgMusic()
    setMusicOn(true)
    return () => stopBgMusic()
  }, [id, activeIslandId, relativeLevel])

  const handleStepCorrect = useCallback((snippet, currentFullCode, isFinalStep) => {
    if (lintJava(currentFullCode).length > 0) return
    guidedCodeRef.current = currentFullCode
    guidedFinalStepRef.current = isFinalStep
    setEventOffset(guidedEventsRef.current.length)
    setLiveCode(currentFullCode)
    setPlayToken(t => t + 1)
  }, [])

  const handleUnlock = useCallback((builtCode) => {
    if (!completed) {
      setToast({ msg:'Complete Guided Mode first to unlock Free Code.', tone:'amber', k:Date.now() })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setStarterCode(builtCode)
    setLiveCode(builtCode)
    setCheck(null)
    handlePhaseChange('free')
  }, [completed])

  const handleFreeRun = useCallback((code) => {
    const diagnostics = lintJava(code)
    if (diagnostics.length > 0) {
      setToast({ msg: diagnostics[0].message, tone:'amber', k:Date.now() })
      setTimeout(() => setToast(null), 3000)
      return
    }
    guidedCodeRef.current = ''
    guidedEventsRef.current = []
    guidedFinalStepRef.current = false
    setEventOffset(0)
    setCheck(null)
    setLiveCode(code)
    setPlayToken(t => t + 1)
  }, [])

  const resetCanvasForReplay = useCallback(() => {
    setCheck(null)
    setLiveCode(starterCode)
    setEventOffset(0)
    guidedCodeRef.current = ''
    guidedEventsRef.current = []
    guidedFinalStepRef.current = false
    setCanvasResetToken(token => token + 1)
  }, [starterCode])

  const handleResult = useCallback((res) => {
    if (res?.error || !lesson) return
    const isGuidedRun = phase === 'guided'
    guidedEventsRef.current = isGuidedRun
      ? [...guidedEventsRef.current, ...(res.events || [])]
      : res.events || []
    const executedCode = isGuidedRun ? guidedCodeRef.current : (res.code || liveCode)
    const validation = validateLesson(
      lesson,
      guidedEventsRef.current,
      executedCode
    )
    setCheck(validation)
    if (validation.passed && (!isGuidedRun || guidedFinalStepRef.current)) {
      setCompletedCode(executedCode)
      saveProgress()
    }
  }, [lesson, liveCode, phase, saveProgress])

  const handleAllStepsDone = useCallback((code) => {
    setCompletedCode(code)
    saveProgress()
  }, [saveProgress])

  const goToNext = async () => {
    if (!lesson) return
    await saveProgress()
    const currentLevel = Number(lesson.order_index || lesson.level_label?.match(/\d+/)?.[0] || relativeLevel)
    const currentIslandId = getActiveIslandId(lesson, location) || activeIslandId
    if (currentLevel === 10) {
      setIslandCleared(true)
      return
    }
    const nextLevel = currentLevel + 1
    if (nextLevel <= 10) {
      navigate(`/lesson/${nextLevel}?island=${currentIslandId}`, { state: { islandId: currentIslandId, relativeLevel: nextLevel } })
    }
  }

  const toggleMusic = () => {
    if (window._cqAudio) {
      window._cqAudio.paused ? window._cqAudio.play() : window._cqAudio.pause()
    }
    setMusicOn(m => !m)
  }

  const handlePhaseChange = phaseName => {
    if (phaseName === 'free' && !completed) {
      setToast({ msg:'Complete Guided Mode first to unlock Free Code.', tone:'amber', k:Date.now() })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setPhase(phaseName)
  }

  if (!lesson) return (
    <div style={{
      height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:C.onyx50, flexDirection:'column', gap:12
    }}>
      <div style={{ width:36, height:36, borderRadius:10, background:C.purple, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Ico n="bolt" s={18} c="#fff"/>
      </div>
      <div style={{ fontSize:14, color:C.onyx400, fontWeight:500 }}>Loading lesson…</div>
    </div>
  )

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'#0F172A' }}>
      {/* Top Bar */}
      <div style={{
        flexShrink:0, height:50,
        background:'rgba(15,23,42,0.95)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 14px', gap:10, zIndex:20
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate(getIslandRoute(lesson, location))}
            style={{
              background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:7, padding:'5px 11px', color:'rgba(255,255,255,0.65)',
              fontSize:12, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:4
            }}>
            ← Back
          </button>
          <div style={{ width:1, height:18, background:'rgba(255,255,255,0.1)' }}/>
          <div>
            <div style={{ fontSize:10, color:C.purple, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {`ISLAND ${activeIslandId} - ${javaLabel(lesson.module_title || lesson.track || `Module ${activeIslandId}`)}`}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.9)', fontWeight:600 }}>
              {lesson.title}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.07)', borderRadius:999, padding:3, gap:2 }}>
            {['guided', 'free'].map(p => (
              <button key={p} type="button" onClick={() => handlePhaseChange(p)} disabled={p === 'free' && !completed} style={{
                padding:'4px 13px', borderRadius:999, fontSize:11, fontWeight:600,
                background: phase === p ? C.purple : 'transparent',
                color: phase === p ? '#fff' : 'rgba(255,255,255,0.4)',
                transition:'all .2s', display:'flex', alignItems:'center', gap:4,
                userSelect:'none', border:'none', cursor:p === 'free' && !completed ? 'not-allowed' : 'pointer', opacity:p === 'free' && !completed ? .45 : 1
              }}>
                {p === 'guided' ? 'Guided' : 'Free Code'}
              </button>
            ))}
          </div>

          <Pill bg={C.amberLight} col={C.amberDark}>+{lesson.xp_reward} XP</Pill>

          <button onClick={toggleMusic} title="Toggle music"
            style={{
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:7, width:32, height:32, cursor:'pointer', fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
            {musicOn ? '🎵' : '🔇'}
          </button>

          <button onClick={() => setPanelOpen(o => !o)} title="Toggle panel"
            style={{
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:7, width:32, height:32, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
            <Ico n="chevRight" s={15} c="rgba(255,255,255,0.6)"/>
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <div style={{ flex:1, position:'relative', overflow:'hidden', minWidth:0 }}>
          <GameCanvas
            playToken={playToken}
            code={liveCode}
            onResult={handleResult}
            target={lesson.target_tiles}
            lessonData={lesson}
            resetToken={canvasResetToken}
            levelLabel={lesson.level_label}
            levelTitle={lesson.title}
            initialPipPosition={pipStartPosition}
            eventOffset={eventOffset}
            lessonId={lesson.id}
            fullHeight
          />
        </div>

        <div style={{
          width: panelOpen ? PANEL_W : 0,
          minWidth: panelOpen ? PANEL_W : 0,
          flexShrink:0,
          background:'#fff',
          borderLeft:`1px solid ${C.onyx100}`,
          display:'flex', flexDirection:'column',
          overflow:'hidden',
          transition:'width .22s ease, min-width .22s ease'
        }}>
          {panelOpen && phase === 'guided' && (
            <GuidedPanel
              lesson={lesson}
              onUnlock={handleUnlock}
              onNext={goToNext}
              onStepCorrect={handleStepCorrect}
              onAllStepsDone={handleAllStepsDone}
              taskComplete={completed}
              completedCode={completedCode}
              isFinalLevel={Number(lesson.order_index || lesson.level_label?.match(/\d+/)?.[0] || lesson.id) === 10}
            />
          )}
          {panelOpen && phase === 'free' && (
            <FreeCodePanel
              lesson={lesson}
              starterCode={starterCode}
              check={check}
              hint={hint}
              onRun={handleFreeRun}
              onHint={() => setHint(h => !h)}
              completed={completed}
              completedCode={completedCode}
              onNext={goToNext}
              onResetReplay={() => {
                resetCanvasForReplay()
                setPhase('guided')
              }}
              onResetCanvas={resetCanvasForReplay}
              isFinalLevel={Number(lesson.order_index || lesson.level_label?.match(/\d+/)?.[0] || lesson.id) === 10}
            />
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tone={toast.tone} key={toast.k}/>}
      {islandCleared && (
        <IslandClearedModal
          islandName={`Island ${lesson.module_id}`}
          xpGained={xpGained}
          onReturn={() => navigate('/quest', { state: { islandId: getActiveIslandId(lesson, location) } })}
        />
      )}
    </div>
  )
}
