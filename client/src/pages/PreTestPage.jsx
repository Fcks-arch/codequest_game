import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { C, Ico, Pill } from '../components/UI'

/* ══════════════════════════════════════════════════════════════
   PRE-TEST QUESTIONS
   Strictly based on IT 102A — Fundamentals of Programming Syllabus
   ISPSC Tagudin Campus
   8 Topics × 4 Questions = 32 total questions
   ══════════════════════════════════════════════════════════════ */
const TOPICS = [
  { id: 1, key: 'intro_programming',      label: 'Introduction to Programming',       island: 1, color: '#6366F1', icon: '🗺️' },
  { id: 2, key: 'program_logic',          label: 'Program Logic Design',               island: 2, color: '#8B5CF6', icon: '📐' },
  { id: 3, key: 'intro_java',             label: 'Introduction to Java Programming',   island: 3, color: '#EC4899', icon: '☕' },
  { id: 4, key: 'input_output',           label: 'Basic Input/Output Statements',      island: 4, color: '#F59E0B', icon: '💬' },
  { id: 5, key: 'decision_structures',    label: 'Control Structures: Decision',       island: 5, color: '#10B981', icon: '🔀' },
  { id: 6, key: 'repetition_structures',  label: 'Control Structures: Repetition',     island: 6, color: '#3B82F6', icon: '🔁' },
  { id: 7, key: 'branching_structures',   label: 'Control Structures: Branching',      island: 7, color: '#EF4444', icon: '⛳' },
  { id: 8, key: 'java_strings',           label: 'Java Strings',                       island: 8, color: '#14B8A6', icon: '📝' },
]

const QUESTIONS = [
  /* ── TOPIC 1: Introduction to Programming (CO1) ── */
  {
    id: 1, topic: 1,
    question: 'What is computer programming?',
    a: 'The process of designing and building computer hardware components',
    b: 'The process of writing a set of instructions that a computer can execute to perform specific tasks',
    c: 'The process of installing and configuring software applications',
    d: 'The process of connecting computers to a network',
    answer: 'b',
  },
  {
    id: 2, topic: 1,
    question: 'Which of the following correctly describes the difference between low-level and high-level programming languages?',
    a: 'Low-level languages are easier to read; high-level languages use binary code',
    b: 'Low-level languages are closer to machine code; high-level languages are closer to human language',
    c: 'Low-level languages run slower than high-level languages',
    d: 'There is no difference between low-level and high-level languages',
    answer: 'b',
  },
  {
    id: 3, topic: 1,
    question: 'What is the main difference between Procedural Programming and Object-Oriented Programming (OOP)?',
    a: 'Procedural programming organizes code into objects; OOP organizes code into functions',
    b: 'Procedural programming is only used for web development; OOP is only for mobile apps',
    c: 'Procedural programming organizes code into reusable functions/procedures; OOP organizes code into objects that combine data and behavior',
    d: 'Procedural programming and OOP produce the same type of programs',
    answer: 'c',
  },
  {
    id: 4, topic: 1,
    question: 'Which of the following correctly lists the phases of the Program Development Life Cycle (PDLC)?',
    a: 'Plan, Code, Submit, Grade',
    b: 'Analyze, Design, Code, Test, Maintain',
    c: 'Write, Debug, Compile, Print',
    d: 'Install, Configure, Run, Update',
    answer: 'b',
  },

  /* ── TOPIC 2: Program Logic Design (CO2) ── */
  {
    id: 5, topic: 2,
    question: 'What is an algorithm in programming?',
    a: 'A specific programming language used for mathematical computations',
    b: 'A type of computer hardware that speeds up processing',
    c: 'A step-by-step, well-defined procedure or set of rules used to solve a problem',
    d: 'A graphical tool used to design database tables',
    answer: 'c',
  },
  {
    id: 6, topic: 2,
    question: 'In a flowchart, which shape is used to represent a DECISION or condition?',
    a: 'Rectangle (process)',
    b: 'Oval (start/end)',
    c: 'Parallelogram (input/output)',
    d: 'Diamond',
    answer: 'd',
  },
  {
    id: 7, topic: 2,
    question: 'What is pseudocode?',
    a: 'A formal programming language similar to Java',
    b: 'An informal, plain-language description of the steps of an algorithm, not actual executable code',
    c: 'A type of encrypted or scrambled code used for security',
    d: 'Another name for compiled machine code',
    answer: 'b',
  },
  {
    id: 8, topic: 2,
    question: 'The top-down stepwise refinement approach to algorithm design means:',
    a: 'Writing the most detailed code first before planning',
    b: 'Starting with the simplest possible solution and ignoring edge cases',
    c: 'Beginning with a high-level solution overview, then progressively breaking it into smaller, more detailed steps',
    d: 'Writing code from the bottom of the file to the top',
    answer: 'c',
  },

  /* ── TOPIC 3: Introduction to Java Programming (CO1, CO3) ── */
  {
    id: 9, topic: 3,
    question: 'Which of the following is the correct way to declare an integer variable in Java?',
    a: 'variable myAge = 20;',
    b: 'integer myAge = 20;',
    c: 'int myAge = 20;',
    d: 'myAge := 20;',
    answer: 'c',
  },
  {
    id: 10, topic: 3,
    question: 'Which Java primitive data type is used to store a single character like \'A\' or \'z\'?',
    a: 'String',
    b: 'char',
    c: 'text',
    d: 'letter',
    answer: 'b',
  },
  {
    id: 11, topic: 3,
    question: 'What is the result of the Java expression: 17 % 5 ?',
    a: '3',
    b: '2',
    c: '12',
    d: '85',
    answer: 'b',
  },
  {
    id: 12, topic: 3,
    question: 'Which of the following is a valid Java identifier (variable name)?',
    a: '2ndScore',
    b: 'my score',
    c: 'final',
    d: 'studentGrade',
    answer: 'd',
  },

  /* ── TOPIC 4: Basic Input/Output Statements (CO3) ── */
  {
    id: 13, topic: 4,
    question: 'Which Java statement is used to print a line of text followed by a new line?',
    a: 'Console.print()',
    b: 'System.out.println()',
    c: 'print.out.ln()',
    d: 'output.println()',
    answer: 'b',
  },
  {
    id: 14, topic: 4,
    question: 'What is the key difference between System.out.print() and System.out.println() in Java?',
    a: 'print() can only output numbers; println() can only output text',
    b: 'They function identically with no difference in output',
    c: 'println() automatically adds a newline character at the end of output; print() does not',
    d: 'print() adds a newline; println() does not',
    answer: 'c',
  },
  {
    id: 15, topic: 4,
    question: 'Which Java class is most commonly used to read input from the user via the keyboard?',
    a: 'System.in',
    b: 'KeyboardReader',
    c: 'InputHandler',
    d: 'Scanner',
    answer: 'd',
  },
  {
    id: 16, topic: 4,
    question: 'What will the following Java code output?\nSystem.out.print("Hello ");\nSystem.out.print("World");',
    a: 'Hello\nWorld',
    b: 'Hello World',
    c: 'HelloWorld',
    d: '"Hello" "World"',
    answer: 'b',
  },

  /* ── TOPIC 5: Control Structures — Decision (CO3, CO4, CO5) ── */
  {
    id: 17, topic: 5,
    question: 'What does an if statement do in Java?',
    a: 'It repeats a block of code a fixed number of times',
    b: 'It declares and initializes a new variable',
    c: 'It executes a specific block of code only when a given condition evaluates to true',
    d: 'It terminates the execution of the entire program',
    answer: 'c',
  },
  {
    id: 18, topic: 5,
    question: 'Which Java comparison operator is used to check if two values are NOT equal?',
    a: '<>',
    b: '=/=',
    c: '!=',
    d: 'not==',
    answer: 'c',
  },
  {
    id: 19, topic: 5,
    question: 'What will the following Java code display?\nint x = 4;\nif (x > 10) {\n  System.out.println("Big");\n} else {\n  System.out.println("Small");\n}',
    a: 'Big',
    b: 'BigSmall',
    c: 'Nothing is displayed',
    d: 'Small',
    answer: 'd',
  },
  {
    id: 20, topic: 5,
    question: 'In a Java switch statement, what happens if a matching case does NOT have a break statement?',
    a: 'The program exits immediately',
    b: 'Execution falls through and continues into the next case block',
    c: 'An error is thrown at runtime',
    d: 'Only the default case runs',
    answer: 'b',
  },

  /* ── TOPIC 6: Control Structures — Repetition (CO3, CO4, CO5) ── */
  {
    id: 21, topic: 6,
    question: 'What is an infinite loop?',
    a: 'A loop that is nested inside another loop',
    b: 'A loop that executes exactly 1000 times',
    c: 'A loop whose condition never becomes false, causing the loop to run indefinitely',
    d: 'A loop that uses the continue statement',
    answer: 'c',
  },
  {
    id: 22, topic: 6,
    question: 'What will the following Java code output?\nfor (int i = 1; i <= 4; i++) {\n  System.out.print(i + " ");\n}',
    a: '0 1 2 3',
    b: '1 2 3 4 5',
    c: '1 2 3 4',
    d: '0 1 2 3 4',
    answer: 'c',
  },
  {
    id: 23, topic: 6,
    question: 'Which of the following is the main difference between a while loop and a do-while loop?',
    a: 'A while loop runs faster than a do-while loop',
    b: 'A do-while loop always executes its body at least once, even if the condition is false from the start',
    c: 'A while loop always executes at least once; a do-while loop may not execute at all',
    d: 'There is no functional difference between while and do-while loops',
    answer: 'b',
  },
  {
    id: 24, topic: 6,
    question: 'In a Java for loop — for(int i=0; i<5; i++) — which part executes only ONCE at the very beginning?',
    a: 'i < 5 (the condition)',
    b: 'i++ (the update expression)',
    c: 'The entire loop body',
    d: 'int i = 0 (the initialization)',
    answer: 'd',
  },

  /* ── TOPIC 7: Control Structures — Branching (CO3, CO4, CO5) ── */
  {
    id: 25, topic: 7,
    question: 'What does the break statement do when used inside a loop in Java?',
    a: 'It pauses the loop and resumes it after a short delay',
    b: 'It skips only the current iteration and moves to the next one',
    c: 'It immediately exits the loop entirely, regardless of the remaining iterations',
    d: 'It restarts the loop from the first iteration',
    answer: 'c',
  },
  {
    id: 26, topic: 7,
    question: 'What does the continue statement do inside a Java loop?',
    a: 'It terminates the entire program',
    b: 'It exits the loop permanently',
    c: 'It skips the remaining statements in the current iteration and jumps to the next iteration',
    d: 'It repeats the current iteration without checking the condition',
    answer: 'c',
  },
  {
    id: 27, topic: 7,
    question: 'What is the primary function of the return statement in a Java method?',
    a: 'It creates and initializes a new variable inside the method',
    b: 'It exits the method and optionally sends a value back to the calling code',
    c: 'It repeats the method execution from the beginning',
    d: 'It imports an external class into the current method',
    answer: 'b',
  },
  {
    id: 28, topic: 7,
    question: 'In which situation would you use a break statement inside a for loop?',
    a: 'When you want the loop to repeat an extra time',
    b: 'When you want to skip the current iteration only',
    c: 'When you want to stop the loop early once a specific condition is met',
    d: 'When you want to declare a variable inside the loop',
    answer: 'c',
  },

  /* ── TOPIC 8: Java Strings (CO3, CO4) ── */
  {
    id: 29, topic: 8,
    question: 'How are String values enclosed in Java?',
    a: 'Single quotes: \'text\'',
    b: 'Square brackets: [text]',
    c: 'Double quotes: "text"',
    d: 'Curly braces: {text}',
    answer: 'c',
  },
  {
    id: 30, topic: 8,
    question: 'Which operator is used to concatenate (combine) two String values in Java?',
    a: '&',
    b: '+',
    c: '*',
    d: '|',
    answer: 'b',
  },
  {
    id: 31, topic: 8,
    question: 'What will the following Java code output?\nString first = "Code";\nString second = "Quest";\nSystem.out.println(first + second);',
    a: 'Code Quest',
    b: 'first + second',
    c: 'CodeQuest',
    d: 'Error: cannot add strings',
    answer: 'c',
  },
  {
    id: 32, topic: 8,
    question: 'Which of the following correctly declares a Java String variable?',
    a: 'string name = "Maria";',
    b: 'String name = "Maria";',
    c: 'String = name "Maria";',
    d: 'text name = "Maria";',
    answer: 'b',
  },
]

/* ── score per topic ── */
function scoreByTopic(answers) {
  const scores = {}
  TOPICS.forEach(t => { scores[t.id] = { correct: 0, total: 0, topic: t } })
  QUESTIONS.forEach(q => {
    scores[q.topic].total++
    if (answers[q.id] === q.answer) scores[q.topic].correct++
  })
  return scores
}

/* ── determine weak topics (below 50%) ── */
function getWeakTopics(scores) {
  return Object.values(scores).filter(s => s.correct / s.total < 0.5)
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function PreTestPage() {
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [phase, setPhase]     = useState('intro')   // intro | test | result
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const [scores, setScores]   = useState(null)
  const [saving, setSaving]   = useState(false)

  const q = QUESTIONS[current]
  const progress = ((current) / QUESTIONS.length) * 100
  const topicInfo = TOPICS.find(t => t.id === q?.topic)

  const pick = (opt) => {
    if (selected) return
    setSelected(opt)
    setTimeout(() => {
      const newAnswers = { ...answers, [q.id]: opt }
      setAnswers(newAnswers)
      setSelected(null)
      if (current + 1 < QUESTIONS.length) {
        setCurrent(c => c + 1)
      } else {
        // all done — compute scores
        const sc = scoreByTopic(newAnswers)
        setScores(sc)
        setPhase('result')
        saveResult(newAnswers, sc)
      }
    }, 700)
  }

  const saveResult = async (ans, sc) => {
    setSaving(true)
    try {
      const weak = getWeakTopics(sc).map(s => s.topic.key)
      const topicScores = {}
      Object.values(sc).forEach(s => {
        topicScores[s.topic.key] = {
          correct: s.correct,
          total:   s.total,
          percent: Math.round((s.correct / s.total) * 100)
        }
      })
      await axios.post('/api/progress/pretest', {
        answers: ans,
        topicScores,
        weakTopics: weak,
        totalScore: Object.values(sc).reduce((a, b) => a + b.correct, 0),
        totalItems: QUESTIONS.length
      })
    } catch (err) {
      console.error('Failed to save pre-test:', err)
    } finally {
      setSaving(false)
    }
  }

  const total    = scores ? Object.values(scores).reduce((a, b) => a + b.correct, 0) : 0
  const weakList = scores ? getWeakTopics(scores) : []
  const pct      = scores ? Math.round((total / QUESTIONS.length) * 100) : 0

  /* ── INTRO SCREEN ── */
  if (phase === 'intro') return (
    <div style={{
      minHeight:'100vh', background:`linear-gradient(135deg, #EEF0FF 0%, #fff 60%, #E8FCEF 100%)`,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24
    }}>
      <div style={{
        background:'#fff', borderRadius:24, padding:44, maxWidth:540, width:'100%',
        boxShadow:'0 20px 60px rgba(79,70,229,.12)', textAlign:'center'
      }}>
        <div style={{
          width:70, height:70, borderRadius:20, background:C.purple,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 20px', fontSize:32
        }}>📋</div>

        <h1 style={{ fontSize:24, fontWeight:800, margin:'0 0 8px', letterSpacing:'-.02em' }}>
          Pre-Test
        </h1>
        <p style={{ fontSize:13, color:C.onyx400, margin:'0 0 24px', lineHeight:1.6 }}>
          <b style={{ color:C.onyx }}>IT 102A — Fundamentals of Programming</b><br/>
          ISPSC Tagudin Campus · BSIT 1st Year
        </p>

        <div style={{
          background:C.purpleLight, borderRadius:14, padding:'16px 20px',
          marginBottom:24, textAlign:'left'
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.purpleDark, marginBottom:10 }}>
            Before you start:
          </div>
          {[
            '32 questions covering all 8 topics from your syllabus',
            'This helps us find which topics you need to focus on',
            'No time limit — read each question carefully',
            'Your results will guide which island to start from',
            'You can only take this pre-test once',
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:7 }}>
              <div style={{
                width:18, height:18, borderRadius:'50%', background:C.purple,
                flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                marginTop:1
              }}>
                <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>{i+1}</span>
              </div>
              <span style={{ fontSize:13, color:C.onyx600, lineHeight:1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:28 }}>
          {TOPICS.map(t => (
            <div key={t.id} style={{
              background:`${t.color}15`, borderRadius:10, padding:'10px 6px', textAlign:'center'
            }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{t.icon}</div>
              <div style={{ fontSize:10, fontWeight:600, color:t.color, lineHeight:1.3 }}>{t.label.split(':')[0]}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setPhase('test')} style={{
          width:'100%', background:C.purple, color:'#fff', border:'none',
          borderRadius:12, padding:'14px', fontSize:15, fontWeight:700,
          boxShadow:'0 6px 20px rgba(79,70,229,.3)', cursor:'pointer'
        }}>
          Start Pre-Test →
        </button>
      </div>
    </div>
  )

  /* ── TEST SCREEN ── */
  if (phase === 'test') return (
    <div style={{ minHeight:'100vh', background:C.onyx50 }}>
      {/* Top bar */}
      <div style={{
        background:'#fff', borderBottom:`1px solid ${C.onyx100}`,
        padding:'14px 24px', display:'flex', alignItems:'center',
        justifyContent:'space-between', position:'sticky', top:0, zIndex:10
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8, background:C.purple,
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <Ico n="bolt" s={16} c="#fff"/>
          </div>
          <div style={{ fontSize:14, fontWeight:700 }}>CodeQuest Pre-Test</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:13, color:C.onyx400, fontWeight:500 }}>
            Question <b style={{ color:C.onyx }}>{current + 1}</b> of {QUESTIONS.length}
          </div>
          <div style={{
            background: topicInfo?.color + '20',
            color: topicInfo?.color,
            padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700
          }}>
            {topicInfo?.icon} {topicInfo?.label}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:4, background:C.onyx100 }}>
        <div style={{
          height:'100%', width:`${progress}%`,
          background:`linear-gradient(90deg, ${C.purple}, ${C.emerald})`,
          transition:'width .3s ease'
        }}/>
      </div>

      {/* Question card */}
      <div style={{
        maxWidth:680, margin:'40px auto', padding:'0 20px'
      }}>
        <div style={{
          background:'#fff', borderRadius:20, padding:32,
          boxShadow:'0 4px 24px rgba(15,23,42,.06)',
          border:`1px solid ${C.onyx100}`
        }}>
          {/* Topic badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background: topicInfo?.color + '15',
            color: topicInfo?.color,
            padding:'5px 12px', borderRadius:999, fontSize:11, fontWeight:700,
            marginBottom:18
          }}>
            {topicInfo?.icon} Topic {topicInfo?.id}: {topicInfo?.label}
          </div>

          {/* Question text */}
          <div style={{
            fontSize:16, fontWeight:600, color:C.onyx,
            lineHeight:1.6, marginBottom:24, whiteSpace:'pre-line'
          }}>
            {q.question}
          </div>

          {/* Options */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {['a','b','c','d'].map(opt => {
              const isSelected = selected === opt
              const isCorrect  = isSelected && opt === q.answer
              const isWrong    = isSelected && opt !== q.answer
              const revealed   = selected && opt === q.answer

              let bg     = '#fff'
              let border = C.onyx100
              let color  = C.onyx700

              if (isCorrect || revealed) { bg = C.emeraldLight; border = C.emerald; color = C.emeraldDark }
              if (isWrong)               { bg = '#FEECEC';       border = '#EF4444'; color = '#EF4444' }

              return (
                <button key={opt} onClick={() => pick(opt)}
                  className={isWrong ? 'shake' : ''}
                  style={{
                    background:bg, border:`1.5px solid ${border}`,
                    borderRadius:12, padding:'13px 16px', textAlign:'left',
                    fontSize:13.5, color, fontWeight:500,
                    cursor: selected ? 'default' : 'pointer',
                    transition:'all .15s', display:'flex', alignItems:'center', gap:12
                  }}>
                  <span style={{
                    width:26, height:26, borderRadius:'50%', flexShrink:0,
                    background: (isCorrect || revealed) ? C.emerald : isWrong ? '#EF4444' : C.onyx100,
                    color: (isCorrect || revealed || isWrong) ? '#fff' : C.onyx600,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:700, textTransform:'uppercase'
                  }}>{opt}</span>
                  {q[opt]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mini topic progress indicators */}
        <div style={{
          display:'flex', gap:6, marginTop:20, justifyContent:'center', flexWrap:'wrap'
        }}>
          {TOPICS.map(t => {
            const topicQs = QUESTIONS.filter(q => q.topic === t.id)
            const answered = topicQs.filter(q => answers[q.id]).length
            return (
              <div key={t.id} style={{
                fontSize:10, fontWeight:600, padding:'4px 8px',
                borderRadius:999, background: answered === topicQs.length ? t.color + '25' : C.onyx100,
                color: answered === topicQs.length ? t.color : C.onyx400
              }}>
                {t.icon} {answered}/{topicQs.length}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  /* ── RESULT SCREEN ── */
  if (phase === 'result') return (
    <div style={{
      minHeight:'100vh', background:C.onyx50, padding:'32px 20px 64px'
    }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        {/* Header */}
        <div style={{
          background:'#fff', borderRadius:20, padding:32,
          textAlign:'center', marginBottom:20,
          boxShadow:'0 4px 24px rgba(15,23,42,.06)', border:`1px solid ${C.onyx100}`
        }}>
          <div style={{ fontSize:48, marginBottom:12 }}>
            {pct >= 75 ? '🏆' : pct >= 50 ? '📊' : '📋'}
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, margin:'0 0 6px' }}>Pre-Test Complete!</h2>
          <p style={{ fontSize:13, color:C.onyx400, margin:'0 0 20px' }}>
            IT 102A — Fundamentals of Programming · ISPSC Tagudin
          </p>

          {/* Score ring */}
          <div style={{
            width:110, height:110, borderRadius:'50%', margin:'0 auto 20px',
            background:`conic-gradient(${pct >= 75 ? C.emerald : pct >= 50 ? C.amber : C.purple} ${pct * 3.6}deg, ${C.onyx100} 0deg)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative'
          }}>
            <div style={{
              width:84, height:84, borderRadius:'50%', background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexDirection:'column'
            }}>
              <div style={{ fontSize:22, fontWeight:800, color:C.onyx }}>{total}</div>
              <div style={{ fontSize:10, color:C.onyx400, fontWeight:500 }}>/ {QUESTIONS.length}</div>
            </div>
          </div>

          <div style={{ fontSize:15, fontWeight:700, color:C.onyx }}>
            {pct}% — {pct >= 75 ? 'Great foundation!' : pct >= 50 ? 'Some areas need attention' : 'Several topics need focus'}
          </div>

          {weakList.length > 0 && (
            <div style={{
              background:'#FFF6E5', border:`1px solid ${C.amber}44`,
              borderRadius:12, padding:'12px 16px', marginTop:16, textAlign:'left'
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.amberDark, marginBottom:8 }}>
                ⚠️ Topics that need extra attention:
              </div>
              {weakList.map(s => (
                <div key={s.topic.id} style={{
                  fontSize:12, color:C.amberDark, marginBottom:4,
                  display:'flex', alignItems:'center', gap:6
                }}>
                  {s.topic.icon} {s.topic.label} — {s.correct}/{s.total} correct ({Math.round(s.correct/s.total*100)}%)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-topic breakdown */}
        <div style={{
          background:'#fff', borderRadius:20, padding:24,
          marginBottom:20, border:`1px solid ${C.onyx100}`
        }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Topic Breakdown</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {TOPICS.map(t => {
              const s    = scores[t.id]
              const tpct = Math.round((s.correct / s.total) * 100)
              const weak = tpct < 50
              return (
                <div key={t.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:15 }}>{t.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:C.onyx }}>{t.label}</span>
                      {weak && (
                        <span style={{
                          background:'#FFF6E5', color:C.amberDark,
                          fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999
                        }}>⚠️ Weak</span>
                      )}
                    </div>
                    <span style={{
                      fontSize:12, fontWeight:700,
                      color: tpct >= 75 ? C.emeraldDark : tpct >= 50 ? C.amberDark : C.red
                    }}>
                      {s.correct}/{s.total} ({tpct}%)
                    </span>
                  </div>
                  <div style={{ height:7, background:C.onyx100, borderRadius:999, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:999,
                      width:`${tpct}%`,
                      background: tpct >= 75 ? C.emerald : tpct >= 50 ? C.amber : C.red,
                      transition:'width .6s ease'
                    }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommendation box */}
        <div style={{
          background: C.purpleLight, border:`1px solid ${C.purple}33`,
          borderRadius:20, padding:24, marginBottom:20
        }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.purpleDark, marginBottom:8 }}>
            🎯 Your personalized starting point
          </div>
          {weakList.length === 0 ? (
            <p style={{ fontSize:13, color:C.purpleDark, margin:0, lineHeight:1.6 }}>
              Excellent! You scored well across all topics. We recommend starting from Island 1 and progressing through all lessons to reinforce your knowledge.
            </p>
          ) : (
            <p style={{ fontSize:13, color:C.purpleDark, margin:0, lineHeight:1.6 }}>
              Based on your pre-test results, we recommend paying extra attention to{' '}
              <b>{weakList.map(s => s.topic.label).join(', ')}</b>.
              These islands will be highlighted on your map. Start from Island 1 and take your time on the highlighted topics.
            </p>
          )}
        </div>

        {/* Go to island map */}
        <button
          onClick={() => navigate('/dashboard')}
          disabled={saving}
          style={{
            width:'100%', background:C.purple, color:'#fff', border:'none',
            borderRadius:14, padding:'16px', fontSize:15, fontWeight:700,
            boxShadow:'0 6px 20px rgba(79,70,229,.3)', cursor:'pointer',
            opacity: saving ? 0.7 : 1
          }}>
          {saving ? 'Saving results...' : '🗺️ Go to Island Map →'}
        </button>
      </div>
    </div>
  )
}
