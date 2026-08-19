import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import GameCanvas, { startBgMusic, stopBgMusic } from '../components/GameCanvas'
import CodeEditor from '../components/CodeEditor'
import { C, Ico, Pill, Toast } from '../components/UI'

/* ── Get background image for lesson based on module_id ── */
function getBackgroundForLesson(lesson) {
  if (!lesson?.module_id) return '/assets/background.png'
  // Map module_id to background: module 1 = lvl1 (background.png), module 2 = lvl2.png, etc.
  const levelNum = lesson.module_id
  if (levelNum === 1) return '/assets/background.png'
  return `/assets/lvl${levelNum}.png`
}

/* ── shuffle helper ── */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── quest checks per lesson id ── */
const totalMoved = events => events
  .filter(event => event.type === 'moveRight')
  .reduce((total, event) => total + event.amount, 0)

const requirement = (label, ok) => ({ label, ok })

// Legacy checks keep older saved activities playable. New activity validation
// comes from each JavaScript level's data in the database.
const CHECKS = {
  1: events => {
    const reached = totalMoved(events) >= 3
    return { passed: reached, items: [requirement('Move Pip 3 tiles to the flag', reached)] }
  },
  2: (events, code) => {
    const variable = /\b(let|const|var)\s+steps\s*=\s*4\b/.test(code)
    const reached = totalMoved(events) >= 4
    return { passed: variable && reached, items: [requirement('Declare steps = 4', variable), requirement('Use it to reach the flag', reached)] }
  },
  3: (events, code) => {
    const plan = /\b(let|const|var)\s+speed\s*=\s*2\b/.test(code)
    const jumped = events.some(event => event.type === 'jump')
    const moved = totalMoved(events) >= 4
    return { passed: plan && jumped && moved, items: [requirement('Set speed to 2', plan), requirement('Include a jump in your algorithm', jumped), requirement('Follow the movement steps', moved)] }
  },
  4: (events, code) => {
    const messages = events.filter(event => event.type === 'say').length >= 2
    const ordered = /say\([\s\S]*moveRight\([\s\S]*say\(/.test(code)
    const reached = totalMoved(events) >= 5
    return { passed: messages && ordered && reached, items: [requirement('Show a message before and after moving', messages && ordered), requirement('Reach the flag', reached)] }
  },
  5: (events, code) => {
    const x = /\b(let|const|var)\s+x\s*=\s*3\b/.test(code)
    const y = /\b(let|const|var)\s+y\s*=\s*4\b/.test(code)
    const expression = /moveRight\(\s*x\s*\+\s*y\s*\)/.test(code)
    return { passed: x && y && expression, items: [requirement('Declare x = 3', x), requirement('Declare y = 4', y), requirement('Use x + y for movement', expression)] }
  },
  6: (events, code) => {
    const text = /\b(let|const|var)\s+\w+\s*=\s*["'`]/.test(code)
    const number = /\b(let|const|var)\s+\w+\s*=\s*\d/.test(code)
    const said = events.some(event => event.type === 'say')
    const reached = totalMoved(events) >= 6
    return { passed: text && number && said && reached, items: [requirement('Declare text and number variables', text && number), requirement('Display the text with say()', said), requirement('Reach the flag with the number', reached)] }
  },
  7: (events, code) => {
    const variable = /\b(let|const|var)\s+x\s*=\s*3\b/.test(code)
    const arithmetic = /moveRight\(\s*x\s*[+*]\s*\d+\s*\)/.test(code)
    const reached = totalMoved(events) >= 8
    return { passed: variable && arithmetic && reached, items: [requirement('Declare x = 3', variable), requirement('Use an arithmetic expression', arithmetic), requirement('Reach the flag', reached)] }
  },
  8: events => {
    const messages = events.filter(event => event.type === 'say').length >= 2
    const jumped = events.some(event => event.type === 'jump')
    const reached = totalMoved(events) >= 7
    return { passed: messages && jumped && reached, items: [requirement('Display two output messages', messages), requirement('Make Pip jump', jumped), requirement('Reach the flag', reached)] }
  },
  9: (events, code) => {
    const decision = /if\s*\([^)]*\)\s*\{[\s\S]*moveRight/.test(code)
    const reached = totalMoved(events) >= 5
    return { passed: decision && reached, items: [requirement('Use an if statement to control movement', decision), requirement('Reach the flag', reached)] }
  },
  10: (events, code) => {
    const decision = /if\s*\([^)]*\)\s*\{[\s\S]*\}\s*else\s*\{/.test(code)
    const reached = totalMoved(events) >= 6
    return { passed: decision && reached, items: [requirement('Use an if-else decision', decision), requirement('Reach the flag', reached)] }
  },
  11: (events, code) => {
    const loop = /while\s*\([^)]*\)\s*\{[\s\S]*(\+\+|\+=\s*1)/.test(code)
    const reached = totalMoved(events) >= 6
    return { passed: loop && reached, items: [requirement('Use a while loop with a counter update', loop), requirement('Reach the flag', reached)] }
  },
  12: (events, code) => {
    const loop = /for\s*\(.*;.*;.*\)\s*\{/.test(code)
    const reached = totalMoved(events) >= 8
    return { passed: loop && reached, items: [requirement('Use a for loop', loop), requirement('Reach the flag', reached)] }
  },
  13: (events, code) => {
    const loop = /for\s*\(/.test(code)
    const branching = /\b(break|continue)\b/.test(code)
    const moved = totalMoved(events) >= 3
    return { passed: loop && branching && moved, items: [requirement('Use a for loop', loop), requirement('Use break or continue', branching), requirement('Move Pip through the loop', moved)] }
  },
  14: (events, code) => {
    const text = /\b(let|const|var)\s+\w+\s*=\s*["'`]/.test(code)
    const combined = /say\([^)]*\+[^)]*\)/.test(code)
    const reached = totalMoved(events) >= 7
    return { passed: text && combined && reached, items: [requirement('Declare a string variable', text), requirement('Join text with + and say()', combined), requirement('Reach the flag', reached)] }
  }
}

// New curriculum levels carry their own requirements from the database. This
// keeps every island's ten levels testable without tying validation to IDs.
function validateLesson(lesson, events, code) {
  const hasConfiguredRules = lesson && (
    lesson.required_code_pattern || Number(lesson.min_moves) > 0 ||
    Number(lesson.min_says) > 0 || Number(lesson.min_jumps) > 0
  )
  if (!hasConfiguredRules) {
    const legacyCheck = CHECKS[lesson?.id] || CHECKS[1]
    return legacyCheck(events, code)
  }

  const minMoves = Number(lesson.min_moves || 0)
  const minSays = Number(lesson.min_says || 0)
  const minJumps = Number(lesson.min_jumps || 0)
  const moves = totalMoved(events)
  const says = events.filter(event => event.type === 'say').length
  const jumps = events.filter(event => event.type === 'jump').length
  const items = []

  if (minMoves) items.push(requirement(`Move Pip at least ${minMoves} tile${minMoves === 1 ? '' : 's'}`, moves >= minMoves))
  if (minSays) items.push(requirement(`Use say() ${minSays} time${minSays === 1 ? '' : 's'}`, says >= minSays))
  if (minJumps) items.push(requirement(`Use jump() ${minJumps} time${minJumps === 1 ? '' : 's'}`, jumps >= minJumps))

  if (lesson.required_code_pattern) {
    let patternMatches = false
    try { patternMatches = new RegExp(lesson.required_code_pattern, 'm').test(code) } catch (_) {}
    items.push(requirement(lesson.required_code_label || 'Use the required JavaScript construct', patternMatches))
  }

  return { passed: items.length > 0 && items.every(item => item.ok), items }
}

// The curriculum can be installed before optional guided rows are added to
// the database. These small, lesson-aware starters keep every activity
// playable and give students a useful example to edit instead of a blank
// editor.
function starterForLesson(lesson) {
  const moves = Math.max(Number(lesson?.min_moves || lesson?.target_tiles || 3), 1)
  const title = `${lesson?.title || ''} ${lesson?.track || ''}`.toLowerCase()
  const pattern = `${lesson?.required_code_pattern || ''}`.toLowerCase()
  const needsSay = Number(lesson?.min_says || 0) > 0 || pattern.includes('say')
  const needsJump = Number(lesson?.min_jumps || 0) > 0 || pattern.includes('jump')

  const hasTwoMoves = pattern.indexOf('moveright') !== -1 && pattern.indexOf('moveright') !== pattern.lastIndexOf('moveright')
  if (hasTwoMoves || title.includes('two-step')) {
    const firstPart = Math.max(1, Math.floor(moves / 2))
    return `moveRight(${firstPart});\nmoveRight(${moves - firstPart});`
  }
  if (pattern.includes('break') || title.includes('break')) {
    return `for (let i = 0; i <= ${moves}; i++) {\n  if (i === ${moves}) break;\n  moveRight(1);\n}`
  }
  if (pattern.includes('continue') || title.includes('continue')) {
    return `for (let i = 0; i <= ${moves}; i++) {\n  if (i === 2) continue;\n  moveRight(1);\n}`
  }
  if (pattern.includes('%')) {
    return `const score = 7;\nif (score % 2 === 1) {\n  moveRight(${moves});\n}`
  }
  if (pattern.includes('&&')) {
    return `const hasKey = true;\nconst gateOpen = true;\nif (hasKey && gateOpen) {\n  moveRight(${moves});\n}`
  }
  if (pattern.includes('||')) {
    return `const hasKey = false;\nconst knowsRoute = true;\nif (hasKey || knowsRoute) {\n  moveRight(${moves});\n}`
  }
  if (pattern.includes('+=')) {
    return `let steps = ${Math.max(1, moves - 2)};\nsteps += 2;\nmoveRight(steps);`
  }
  if (title.includes('while')) {
    return `let i = 0;\nwhile (i < ${moves}) {\n  moveRight(1);\n  i++;\n}`
  }
  if (title.includes('do once') || title.includes('do-while')) {
    return `let i = 0;\ndo {\n  moveRight(1);\n  i++;\n} while (i < ${moves});`
  }
  if (title.includes('for') || title.includes('loop') || pattern.includes('for')) {
    return `for (let i = 0; i < ${moves}; i++) {\n  moveRight(1);\n}`
  }
  if (pattern.includes('if') || title.includes('decision') || title.includes('condition') || title.includes('gate') || title.includes('route')) {
    return `const ready = true;\nif (ready) {\n  moveRight(${moves});\n} else {\n  say("Try again");\n}`
  }
  if (title.includes('string') || title.includes('text') || title.includes('template') || title.includes('message') || title.includes('hello')) {
    return `const name = "Pip";\nsay(\`Hello, \${name}\`);${moves > 0 ? `\nmoveRight(${moves});` : ''}`
  }
  if (needsSay && needsJump) return `say("Start!");\njump();\nmoveRight(${moves});\nsay("Done!");`
  if (needsSay) return `say("Start!");\nmoveRight(${moves});`
  if (needsJump) return `jump();\nmoveRight(${moves});`
  if (pattern.includes('const')) return `const steps = ${moves};\nmoveRight(steps);`
  if (pattern.includes('let') || pattern.includes('variable') || title.includes('value') || title.includes('math') || title.includes('operator')) {
    return `let steps = ${moves};\nmoveRight(steps);`
  }
  return `moveRight(${moves});`
}

function lessonSummary(lesson) {
  const raw = String(lesson?.briefing || lesson?.goal || '').trim()
  if (raw) {
    const normalized = raw.replace(/\s+/g, ' ').trim()
    if (normalized.length > 220) return normalized.slice(0, 220).trim() + '…'
    return normalized
  }

  const title = lesson?.title || 'this activity'
  return `This activity teaches ${title.toLowerCase()} by helping Pip solve a small task through a short sequence of actions. Students learn to think step by step, choose the right command, and test whether the plan reaches the goal.`
}

function scenarioPrompt(lesson, index) {
  const title = String(lesson?.title || 'this challenge').trim()

  if (index === 0) {
    return `Step ${index + 1} — Pip is waiting at the start of the path. Think about the very first instruction that gets him moving toward the goal. You are choosing the start of the plan, not the whole solution.`
  }

  if (/(loop|repeat|while|for)/i.test(title)) {
    return `Pip needs to do the same action more than once. Look for the idea of repeating a small step in a safe order so the route keeps moving without getting stuck.`
  }

  if (/(if|decision|choice|condition|gate|route)/i.test(title)) {
    return `Pip reaches a fork in the road. Decide which action should happen when the condition is true, and keep the logic simple enough for the program to follow.`
  }

  return `Pip is working through ${title.toLowerCase()} and needs a clear next step. Choose the action that best moves him toward the goal while keeping the sequence easy to follow and easy to test.`
}

function fallbackGuided(lesson, starterCode) {
  const lines = starterCode.split('\n').map(line => line.trimEnd()).filter(Boolean)
  const snippets = lines.length > 3 ? [lines[0], lines.slice(1).join('\n')] : lines
  return snippets.map((snippet, index) => ({
    id: `fallback-${lesson.id}-${index}`,
    step_order: index + 1,
    prompt: scenarioPrompt(lesson, index),
    correct_snippet: snippet,
    distractor_1: 'say("This is not the right step");',
    distractor_2: 'moveRight("three");',
    distractor_3: '// leave this step empty'
  }))
}

function fallbackConcepts(lesson, starterCode) {
  const topic = `${lesson?.track || ''} ${lesson?.title || ''}`.toLowerCase()
  const summary = lessonSummary(lesson)

  const extra = topic.includes('loop') || topic.includes('while') || topic.includes('for')
    ? 'Focus on repeating a pattern until a goal is met.'
    : topic.includes('condition') || topic.includes('if') || topic.includes('decision')
      ? 'Focus on deciding between two actions based on the situation.'
      : 'Focus on choosing the clearest sequence of actions to reach the goal.'

  return [
    { code_snippet: '', note: summary },
    { code_snippet: '', note: extra }
  ]
}

/* ════════════════════════════════
   GUIDED PANEL
   ════════════════════════════════ */
function GuidedPanel({ lesson, onUnlock, onAutoRun, nextLesson, onNext }) {
  const [stepIdx,  setStepIdx]  = useState(0)
  const [chosen,   setChosen]   = useState(null)
  const [built,    setBuilt]    = useState([])
  const [shakeKey, setShakeKey] = useState(0)
  const [allDone,  setAllDone]  = useState(false)
  const builtRef = useRef([])

  useEffect(() => {
    setStepIdx(0)
    setChosen(null)
    setBuilt([])
    setShakeKey(0)
    setAllDone(false)
    builtRef.current = []
  }, [lesson.id])

  const step = lesson.guided[stepIdx]
  const options = useMemo(() =>
    step ? shuffle([
      step.correct_snippet,
      step.distractor_1,
      step.distractor_2,
      step.distractor_3,
    ].filter(Boolean)) : []
  , [stepIdx, lesson.id]) // eslint-disable-line

  const pick = (opt) => {
    if (chosen) return
    if (opt === step.correct_snippet) {
      const newBuilt = [...builtRef.current, opt]
      builtRef.current = newBuilt
      setChosen({ text: opt, correct: true })
      setTimeout(() => {
        setBuilt([...newBuilt])
        setChosen(null)
        if (stepIdx + 1 >= lesson.guided.length) {
          setAllDone(true)
          setTimeout(() => onAutoRun(newBuilt.join('\n')), 500)
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

  const progress = allDone ? lesson.guided.length : stepIdx
  const pct = lesson.guided.length > 0 ? (progress / lesson.guided.length) * 100 : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Progress */}
      <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${C.onyx100}`, flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:'uppercase', letterSpacing:'.06em' }}>
            Guided Mode
          </span>
          <span style={{ fontSize:11, color:C.onyx400, fontWeight:500 }}>
            {progress} / {lesson.guided.length}
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

      {/* Step area */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
        {!allDone && step && (
          <>
            <div style={{
              fontSize:13, color:C.onyx700, fontWeight:600, lineHeight:1.6,
              marginBottom:12, background:C.purpleLight, borderRadius:10, padding:'10px 12px'
            }}>
              <b>Step {stepIdx + 1} — </b>{step.prompt}
            </div>
            <div
              style={{ display:'flex', flexDirection:'column', gap:7 }}
              key={`${lesson.id}-${stepIdx}-${shakeKey}`}
            >
              {options.map((opt, i) => {
                const isChosen  = chosen && chosen.text === opt
                const isCorrect = isChosen && chosen.correct
                const isWrong   = isChosen && !chosen.correct
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
              })}
            </div>
          </>
        )}

        {allDone && (
          <div className="toast-pop" style={{
            background:C.emeraldLight, color:C.emeraldDark, borderRadius:12,
            padding:'12px 14px', fontSize:13, fontWeight:600,
            display:'flex', alignItems:'center', gap:8, marginBottom:12
          }}>
            <Ico n="check" s={15} c={C.emeraldDark}/>
            All steps done! Watch Pip run…
          </div>
        )}

        {/* Briefing and code reference, matching the guided learning flow. */}
        <div style={{ marginTop:14, borderTop:`1px solid ${C.onyx100}`, paddingTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.onyx400, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:7 }}>
            Briefing
          </div>
          <p style={{ fontSize:12.5, color:C.onyx600, lineHeight:1.7, margin:'0 0 10px' }}>
            {lessonSummary(lesson)}
          </p>
          {lesson.concepts?.filter(Boolean).map((c, i) => (
            <div key={i} style={{ background:C.onyx50, borderRadius:8, padding:'7px 10px', marginBottom:6 }}>
              {c.note && <div style={{ fontSize:11, color:C.onyx500, lineHeight:1.5 }}>{c.note}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Program so far */}
      <div style={{
        flexShrink:0, background:'#0B1220', borderTop:`1px solid #1E293B`,
        padding:'10px 14px', maxHeight:120, overflowY:'auto'
      }}>
        <div style={{ fontSize:10, color:'#475569', fontFamily:"'JetBrains Mono',monospace", marginBottom:4, letterSpacing:'.06em' }}>
          YOUR PROGRAM SO FAR
        </div>
        {built.map((line, i) => (
          <div key={i} className="slide-up" style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'#86EFAC', lineHeight:'20px' }}>
            {line}
          </div>
        ))}
        {!allDone && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'#334155' }}>█</div>}
      </div>

      {/* Unlock button */}
      {allDone && (
        <div style={{ display:'flex', gap:7, padding:'10px 12px', flexShrink:0, borderTop:`1px solid ${C.onyx100}` }}>
          <button onClick={() => onUnlock(builtRef.current.join('\n'))} className="toast-pop"
            style={{
              flex:1, background:C.purple, color:'#fff', border:'none',
              padding:'12px 10px', fontSize:13, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer',
              borderRadius:10
            }}>
            <Ico n="unlock" s={15} c="#fff"/> Continue to Free Code
          </button>
          <button onClick={onNext} style={{
            flex:1, background:C.emerald, color:'#fff', border:'none',
            borderRadius:10, padding:'12px 10px', fontSize:13, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            cursor:'pointer'
          }}>
            <span>{nextLesson ? 'Next level' : 'Island map'}</span>
            <Ico n="chevRight" s={15} c="#fff"/>
          </button>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════
   FREE CODE PANEL
   ════════════════════════════════ */
function FreeCodePanel({ lesson, starterCode, check, onRun, hint, onHint, completed, nextLesson, onNext, onContinue }) {
  const [code, setCode] = useState(starterCode)

  useEffect(() => setCode(starterCode), [starterCode, lesson.id])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Lesson briefing remains visible in Free Code mode too. */}
      <div style={{ flexShrink:0, padding:'11px 14px 9px', borderBottom:`1px solid ${C.onyx100}`, background:C.onyx50 }}>
        <div style={{ fontSize:10, fontWeight:800, color:C.purple, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Lesson briefing</div>
        <div style={{ fontSize:12, color:C.onyx600, lineHeight:1.6 }}>{lessonSummary(lesson)}</div>
        {lesson.concepts?.slice(0, 2).filter(Boolean).map((concept, index) => (
          <div key={index} style={{ marginTop:6, fontSize:11, color:C.onyx500, lineHeight:1.5 }}>
            {concept.note || 'Focus on how this task teaches movement, decision-making, or repetition in a simple pattern.'}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:'12px 12px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.onyx400, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>
          Your Code
        </div>
        <div style={{ flex:1, minHeight:0, borderRadius:10, overflow:'hidden' }}>
          <CodeEditor value={code} onChange={setCode} fillHeight />
        </div>
      </div>

      {/* Buttons */}
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
        <button onClick={onNext} title={nextLesson ? 'Go to next level' : 'Go to island map'}
          style={{
            background:C.emerald, color:'#fff', border:'none', borderRadius:9,
            padding:'10px 12px', fontSize:13, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
            cursor:'pointer'
          }}>
          <span>Next</span><Ico n="chevRight" s={13} c="#fff"/>
        </button>
        <button onClick={() => setCode(starterCode)}
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
          💡 {lesson.hint}
        </div>
      )}

      {/* Checklist */}
      <div style={{ flexShrink:0, padding:'12px 14px', borderTop:`1px solid ${C.onyx100}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.onyx400, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:9 }}>
          Quest Checklist
        </div>
        {check ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {check.items.map((item, i) => (
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
            {check.passed && (
              <>
                <div style={{
                  marginTop:8, background:C.emeraldLight, color:C.emeraldDark,
                  borderRadius:9, padding:'9px 12px', fontSize:12.5, fontWeight:600,
                  display:'flex', alignItems:'center', gap:7
                }}>
                  <Ico n="trophy" s={14} c={C.emeraldDark}/> Quest cleared!
                </div>
                {completed && (
                  <div style={{ marginTop:9, display:'flex', gap:7 }}>
                    <button onClick={onContinue} style={{
                      flex:1, background:'#fff', color:C.purple, border:`1px solid ${C.purple}`,
                      borderRadius:9, padding:'11px 9px', fontSize:12, fontWeight:700, cursor:'pointer'
                    }}>
                      Continue free code
                    </button>
                    <button onClick={onNext} style={{
                      flex:1, background:C.emerald, color:'#fff', border:'none',
                      borderRadius:9, padding:'11px 9px', fontSize:12, fontWeight:700,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer'
                    }}>
                      <span>{nextLesson ? 'Next level' : 'Island map'}</span>
                      <Ico n="chevRight" s={12} c="#fff"/>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.onyx400, lineHeight:1.6 }}>
            <b style={{ color:C.onyx600 }}>Goal:</b> {lesson.goal}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════
   LESSON PAGE — full viewport
   ════════════════════════════════ */
export default function LessonPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
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
  const [nextLesson,  setNextLesson]  = useState(null)
  // Pip progresses within an island, but every island starts its first lesson
  // at the beginning of its own map.
  const [pipPosition, setPipPosition] = useState(0)
  const completingRef = useRef(false)

  const PANEL_W = 340

  useEffect(() => {
    completingRef.current = false
    setLesson(null)
    setCompleted(false)
    setNextLesson(null)
    setPhase('guided')
    setStarterCode('')
    setLiveCode('')
    setCheck(null)
    axios.get(`/api/lessons/${id}`)
      .then(res => {
        const fetchedLesson = res.data
        const isFirstLesson = /^\s*level\s*1\b/i.test(String(fetchedLesson.level_label || ''))
        const positionKey = `pip_position_island_${fetchedLesson.module_id}`
        const saved = isFirstLesson ? null : localStorage.getItem(positionKey)
        setPipPosition(saved ? parseInt(saved, 10) : 0)
        const generatedStarter = starterForLesson(fetchedLesson)
        const concepts = fetchedLesson.concepts?.length
          ? fetchedLesson.concepts
          : fallbackConcepts(fetchedLesson, generatedStarter)
        const preparedLesson = {
          ...fetchedLesson,
          concepts,
          guided: fetchedLesson.guided?.length
            ? fetchedLesson.guided
            : fallbackGuided(fetchedLesson, generatedStarter)
        }
        setLesson(preparedLesson)
        setStarterCode(generatedStarter)
      })
      .catch(console.error)
    startBgMusic()
    setMusicOn(true)
    return () => stopBgMusic()
  }, [id])

  /* Save progress separately for each island. */
  useEffect(() => {
    if (!lesson?.module_id) return
    const isFirstLesson = /^\s*level\s*1\b/i.test(String(lesson.level_label || ''))
    if (isFirstLesson && pipPosition === 0) return
    localStorage.setItem(`pip_position_island_${lesson.module_id}`, pipPosition.toString())
  }, [lesson, pipPosition])

  /* Guided: auto-run after all steps done */
  const handleAutoRun = useCallback((code) => {
    setLiveCode(code)
    setPlayToken(t => t + 1)
  }, [])

  /* Guided: unlock free code mode */
  const handleUnlock = useCallback((builtCode) => {
    setStarterCode(builtCode)
    setLiveCode(builtCode)
    setCheck(null)
    setPhase('free')
  }, [])

  /* Free code: run button */
  const handleFreeRun = useCallback((code) => {
    setCheck(null)
    setLiveCode(code)
    setPlayToken(t => t + 1)
  }, [])

  /* Canvas result — only used in free code mode */
  const handleResult = useCallback((res) => {
    if (res?.error) return

    const r = validateLesson(lesson, res.events, res.code ?? liveCode)
    setCheck(r)
    if (r.passed && !completed) handleComplete()
  }, [lesson, liveCode, completed]) // eslint-disable-line

  const handleComplete = async () => {
    if (completingRef.current || !lesson) return
    completingRef.current = true
    try {
      const res = await axios.post('/api/progress/complete', { lesson_id: lesson.id })
      const next = await axios.get(`/api/lessons/${lesson.id}/next`)
      setNextLesson(next.data.nextLesson)
      setCompleted(true)
      if (res.data.islandComplete) {
        sessionStorage.setItem('codequest_island_complete', JSON.stringify({
          title: res.data.moduleTitle || lesson.module_title || 'Island',
          badges: res.data.awardedBadges || []
        }))
        setToast({ msg:'Island complete! Badge earned — next island unlocked.', tone:'emerald', k:Date.now() })
        setTimeout(() => setToast(null), 4500)
      }
      if (!res.data.alreadyDone) {
        updateXp(res.data.newXp, res.data.newLevel)
        if (!res.data.islandComplete) {
          setToast({ msg:`+${res.data.xpAwarded} XP — quest cleared!`, tone:'emerald', k:Date.now() })
        }
        setTimeout(() => setToast(null), 3000)
      }
    } catch (err) {
      console.error(err)
      completingRef.current = false
    }
  }

  const goToNext = () => {
    if (nextLesson) navigate(`/lesson/${nextLesson.id}`)
    else navigate(lesson?.module_id ? `/island/${lesson.module_id}` : '/quest')
  }

  const toggleMusic = () => {
    if (window._cqAudio) {
      window._cqAudio.paused ? window._cqAudio.play() : window._cqAudio.pause()
    }
    setMusicOn(m => !m)
  }

  /* ── Loading state ── */
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

      {/* ══ TOP BAR ══ */}
      <div style={{
        flexShrink:0, height:50,
        background:'rgba(15,23,42,0.95)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 14px', gap:10, zIndex:20
      }}>
        {/* Left */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => navigate(lesson.module_id ? `/island/${lesson.module_id}` : '/')}
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
              {lesson.level_label} · {lesson.track}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.9)', fontWeight:600 }}>
              {lesson.title}
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Phase switcher */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.07)', borderRadius:999, padding:3, gap:2 }}>
            {['guided', 'free'].map(p => (
              <button key={p} type="button" onClick={() => setPhase(p)} style={{
                padding:'4px 13px', borderRadius:999, fontSize:11, fontWeight:600,
                background: phase === p ? C.purple : 'transparent',
                color: phase === p ? '#fff' : 'rgba(255,255,255,0.4)',
                transition:'all .2s', display:'flex', alignItems:'center', gap:4,
                userSelect:'none', border:'none', cursor:'pointer'
              }}>
                {p === 'guided' ? 'Guided' : 'Free Code'}
              </button>
            ))}
          </div>

          <Pill bg={C.amberLight} col={C.amberDark}>+{lesson.xp_reward} XP</Pill>

          {/* Music */}
          <button onClick={toggleMusic} title="Toggle music"
            style={{
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:7, width:32, height:32, cursor:'pointer', fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
            {musicOn ? '🎵' : '🔇'}
          </button>

          {/* Panel toggle */}
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

      {/* ══ MAIN AREA ══ */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Game canvas — fills everything left of panel */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', minWidth:0 }}>
          <GameCanvas
            playToken={playToken}
            code={liveCode}
            onResult={handleResult}
            target={lesson.target_tiles}
            backgroundImage={getBackgroundForLesson(lesson)}
            levelLabel={lesson.level_label}
            levelTitle={lesson.title}
            initialPipPosition={pipPosition}
            onPipPositionChange={setPipPosition}
            lessonId={lesson.id}
            fullHeight
          />
        </div>

        {/* Right panel */}
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
              onAutoRun={handleAutoRun}
              nextLesson={nextLesson}
              onNext={goToNext}
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
              nextLesson={nextLesson}
              onNext={goToNext}
              onContinue={() => setCompleted(false)}
            />
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} tone={toast.tone} key={toast.k}/>}
    </div>
  )
}
