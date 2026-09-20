import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import GameCanvas, { startBgMusic, stopBgMusic } from '../components/GameCanvas'
import CodeEditor, { lintJava } from '../components/CodeEditor'
import {
  getIslandLives,
  markLessonCompleted,
  resetIslandLives,
  setIslandLives
} from '../utils/GameStateManager'
import { getLessonByIslandAndLevel } from '../data/lessons'
import IslandClearedModal from '../components/IslandClearedModal'
import PlayerDeath from '../components/PlayerDeath'
import { C, Ico, Pill, Toast } from '../components/UI'
import './LessonPage.css'
import {
  FREE_CODE_SAFETY_MESSAGE,
  validateFreeCode
} from '../utils/validateFreeCode'

const FREE_CODE_PROMPT = '// Write your Java code here...'

function javaLabel(value) {
  return String(value || '')
    .replace(/JavaScript Foundations/g, 'JAVA FOUNDATIONS')
    .replace(/JavaScript/g, 'Java')
}

function getActiveIslandId(lesson, location) {
  const stateIslandId = Number(location?.state?.islandId)
  const lessonIslandId = Number(
    lesson?.moduleId ??
    lesson?.module_id ??
    lesson?.islandId
  )
  const storedIslandId = Number(
    window.localStorage.getItem('activeIslandId')
  )

  if (Number.isFinite(stateIslandId) && stateIslandId > 0) {
    return stateIslandId
  }

  if (Number.isFinite(lessonIslandId) && lessonIslandId > 0) {
    return lessonIslandId
  }

  if (Number.isFinite(storedIslandId) && storedIslandId > 0) {
    return storedIslandId
  }

  return Number(
    location?.pathname?.match(/\/island\/(\d+)/)?.[1]
  )
}

function getIslandRoute(lesson, location) {
  const islandId = getActiveIslandId(lesson, location)

  return Number.isFinite(islandId) && islandId > 0
    ? `/island/${islandId}`
    : '/quest'
}

function shuffle(arr) {
  const a = [...arr]

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[a[i], a[j]] = [a[j], a[i]]
  }

  return a
}

function lessonSummary(lesson) {
  const raw = String(
    lesson?.briefing ||
    lesson?.description ||
    lesson?.goal ||
    ''
  ).trim()

  if (raw) {
    const normalized = raw.replace(/\s+/g, ' ').trim()

    if (normalized.length > 220) {
      return normalized.slice(0, 220).trim() + '…'
    }

    return normalized
  }

  return lesson?.title
    ? `This Java lesson uses ordered statements and method calls to complete ${lesson.title}.`
    : 'This Java lesson uses ordered statements and method calls to complete the task.'
}

function guidedJavaSummary(code) {
  if (
    /\b(?:int|double|float|long|short|byte|char|boolean|String)\s+\w+\s*=/
      .test(code)
  ) {
    return 'You declared a typed variable in Java and used it in a method call.'
  }

  return 'You built a Java statement using explicit types, values, and semicolons.'
}

function briefingNotes(lesson) {
  const notes = (lesson?.concepts || [])
    .map(concept => String(concept.note || '').trim())
    .filter(Boolean)

  return notes.length > 0
    ? notes
    : [guidedJavaSummary('')]
}

function LessonBriefing({ lesson }) {
  return (
    <div
      style={{
        marginTop: 14,
        borderTop: `1px solid ${C.onyx100}`,
        paddingTop: 12
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.onyx400,
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          marginBottom: 7
        }}
      >
        Briefing
      </div>

      <p
        style={{
          fontSize: 12.5,
          color: C.onyx600,
          lineHeight: 1.7,
          margin: '0 0 7px'
        }}
      >
        {lessonSummary(lesson)}
      </p>

      {briefingNotes(lesson).map((note, index) => (
        <p
          key={index}
          style={{
            fontSize: 12,
            color: C.onyx600,
            lineHeight: 1.55,
            margin: '0 0 5px'
          }}
        >
          {note}
        </p>
      ))}
    </div>
  )
}

function NextLevelButton({
  onNext,
  isFinalLevel = false,
  isCleared = false,
  completed = false
}) {
  const enabled = isCleared || completed

  return (
    <button
      type="button"
      onClick={onNext}
      disabled={!enabled}
      style={{
        width: '100%',
        background: C.emerald,
        color: '#fff',
        border: 'none',
        borderRadius: 10,
        padding: '12px 10px',
        fontSize: 13,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        cursor: enabled ? 'pointer' : 'not-allowed',
        opacity: enabled ? 1 : 0.45
      }}
    >
      <span>
        {isFinalLevel ? 'Return to Map 🏆' : 'Next Level >'}
      </span>

      <Ico
        n={isFinalLevel ? 'trophy' : 'chevRight'}
        s={12}
        c="#fff"
      />
    </button>
  )
}

function explainCodeLine(line, lesson) {
  const code = String(line || '').trim()

  if (!code) return null

  if (
    /^(?:int|let|const|String|double|float|long|boolean)\s+\w+\s*=/
      .test(code)
  ) {
    return `${code} declares a typed variable value that can be reused later in the program.`
  }

  return `${code} runs as the next Java statement in the lesson.`
}

function CompletionReview({ lesson, code }) {
  const selectedCode =
    String(code || '').trim() ||
    '// No code was captured for this completion.'

  const codeBreakdown = selectedCode
    .split('\n')
    .map(line => explainCodeLine(line, lesson))
    .filter(Boolean)

  return (
    <div style={{ marginTop: 14 }}>
      <LessonBriefing lesson={lesson} />

      <div
        style={{
          marginTop: 12,
          background: '#0B1220',
          borderRadius: 9,
          padding: '10px 11px',
          maxHeight: 142,
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: '#94A3B8',
            fontFamily: "'JetBrains Mono',monospace",
            marginBottom: 6,
            letterSpacing: '.06em'
          }}
        >
          SELECTED ANSWERS / CODE
        </div>

        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12,
            color: '#86EFAC',
            lineHeight: '20px'
          }}
        >
          {selectedCode}
        </pre>
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 10,
            color: C.onyx400,
            fontWeight: 700,
            letterSpacing: '.05em',
            marginBottom: 7
          }}
        >
          LINE-BY-LINE CODE BREAKDOWN
        </div>

        {codeBreakdown.map((explanation, index) => (
          <p
            key={index}
            style={{
              margin: '0 0 6px',
              fontSize: 12,
              color: C.onyx600,
              lineHeight: 1.5
            }}
          >
            <b style={{ color: C.purple }}>
              Line {index + 1}:
            </b>{' '}
            {explanation}
          </p>
        ))}
      </div>
    </div>
  )
}

function validateLesson(lesson, events = [], code = '') {
  if (!lesson) {
    return {
      passed: false,
      items: []
    }
  }

  const items = []

  if (lesson.required_code_pattern) {
    let patternMatches = false

    try {
      patternMatches = new RegExp(
        lesson.required_code_pattern,
        'm'
      ).test(code)
    } catch (_) {}

    items.push({
      label:
        lesson.required_code_label ||
        'Use required code pattern',
      ok: patternMatches
    })
  }

  if (lesson.solution_code) {
    const normalize = value =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim()

    items.push({
      label: 'Match the lesson solution',
      ok:
        normalize(code) ===
        normalize(lesson.solution_code)
    })
  }

  if (items.length === 0) {
    items.push({
      label: 'Complete the Java solution',
      ok: String(code || '').trim().length > 0
    })
  }

  return {
    passed:
      items.length > 0 &&
      items.every(item => item.ok),
    items
  }
}

/* =========================================================
   GUIDED PANEL
   ========================================================= */

function GuidedPanel({
  lesson,
  onUnlock,
  onNext,
  onStepCorrect,
  onWrongAnswer,
  onAllStepsDone,
  taskComplete,
  completedCode,
  isFinalLevel,
  lives
}) {
  const [stepIdx, setStepIdx] = useState(0)
  const [chosen, setChosen] = useState(null)
  const [built, setBuilt] = useState([])
  const [shakeKey, setShakeKey] = useState(0)
  const [allDone, setAllDone] = useState(false)

  const builtRef = useRef([])

  const guidedSteps = Array.isArray(lesson.guided)
    ? lesson.guided
    : []

  /* Reset the Guided Panel whenever the lesson changes */
  useEffect(() => {
    setStepIdx(0)
    setChosen(null)
    setBuilt([])
    setShakeKey(0)
    setAllDone(false)

    builtRef.current = []
  }, [lesson.id])

  const step = guidedSteps[stepIdx]

  const stepPrompt = String(
    step?.prompt ||
    step?.question ||
    ''
  ).trim()

  const stepBriefing = String(
    step?.briefing ||
    lesson?.briefing ||
    ''
  ).trim()

  const options = useMemo(() => {
    if (!step) return []

    if (
      Array.isArray(step.options) &&
      step.options.length > 0
    ) {
      return shuffle(
        step.options.filter(
          value =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ''
        )
      )
    }

    const dbChoices = [
      step.correct_snippet,
      step.correct_answer,
      step.distractor_1,
      step.distractor_2,
      step.distractor_3
    ].filter(
      value =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ''
    )

    return shuffle(dbChoices)
  }, [stepIdx, lesson.id, step])

  /* =========================================================
     ANSWER PICKER
     ========================================================= */

  const pick = useCallback(
    opt => {
      /*
       * Prevent multiple clicks while the current
       * answer animation is running.
       */
      if (chosen) return

      if (!step) return

      const correctTarget =
        step.correct_snippet ??
        step.correct_answer

      const selected = String(opt ?? '')
      const correct = String(correctTarget ?? '')

      /* -------------------------
         CORRECT ANSWER
         ------------------------- */
      if (selected === correct) {
        const newBuilt = [
          ...builtRef.current,
          selected
        ]

        builtRef.current = newBuilt

        setChosen({
          text: selected,
          correct: true
        })

        const isFinalStep =
          stepIdx + 1 >= guidedSteps.length

        if (onStepCorrect) {
          onStepCorrect(
            selected,
            newBuilt.join('\n'),
            isFinalStep
          )
        }

        setTimeout(() => {
          setBuilt([...newBuilt])
          setChosen(null)

          if (isFinalStep) {
            setAllDone(true)

            onAllStepsDone?.(
              newBuilt.join('\n')
            )
          } else {
            setStepIdx(current => current + 1)
          }
        }, 550)

        return
      }

      /* -------------------------
         WRONG ANSWER
         ------------------------- */

      setChosen({
        text: selected,
        correct: false
      })

      setShakeKey(key => key + 1)

      /*
       * Tell LessonPage that the player
       * made another wrong answer.
       */
      onWrongAnswer?.()

      setTimeout(() => {
        setChosen(null)
      }, 650)
    },
    [
      chosen,
      step,
      stepIdx,
      guidedSteps.length,
      onStepCorrect,
      onWrongAnswer,
      onAllStepsDone
    ]
  )

  const progress = allDone
    ? guidedSteps.length
    : stepIdx

  const pct =
    guidedSteps.length > 0
      ? (progress / guidedSteps.length) * 100
      : 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* PROGRESS HEADER */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: `1px solid ${C.onyx100}`,
          flexShrink: 0
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.purple,
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}
          >
            Guided Mode
          </span>

          <span
            style={{
              fontSize: 11,
              color: C.onyx400,
              fontWeight: 500
            }}
          >
            {progress} / {guidedSteps.length}
          </span>
        </div>

        <div
          style={{
            height: 5,
            background: C.onyx100,
            borderRadius: 999,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg,${C.purple},${C.emerald})`,
              borderRadius: 999,
              transition: 'width .4s ease'
            }}
          />
        </div>

        <div className="lesson-lives">
          <span className="lesson-lives-label">
            LIVES
          </span>

          <div className="lesson-hearts">
            {[0, 1, 2].map(index => (
              <span
                key={index}
                className={
                  index < lives
                    ? 'life-heart active'
                    : 'life-heart lost'
                }
              >
                ♥
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px'
        }}
      >
        {guidedSteps.length === 0 && (
          <div
            style={{
              fontSize: 13,
              color: C.onyx500,
              textAlign: 'center',
              marginTop: 20,
              lineHeight: 1.5
            }}
          >
            No guided steps found for this lesson.
            You can proceed directly to Free Code mode
            below.
          </div>
        )}

        {!allDone && step && (
          <>
            {/* BRIEFING */}
            {stepBriefing && (
              <div
                style={{
                  marginBottom: 12,
                  background: '#F4F1FF',
                  border: `1px solid ${C.purpleLight}`,
                  borderRadius: 12,
                  padding: '10px 12px'
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.purple,
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    marginBottom: 6
                  }}
                >
                  Level Briefing
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: C.onyx700,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {stepBriefing}
                </div>
              </div>
            )}

            {/* QUESTION */}
            <div
              style={{
                fontSize: 13,
                color: C.onyx700,
                fontWeight: 600,
                lineHeight: 1.6,
                marginBottom: 12,
                background: C.purpleLight,
                borderRadius: 10,
                padding: '10px 12px'
              }}
            >
              <b>
                Step {stepIdx + 1} —{' '}
              </b>

              {stepPrompt}
            </div>

            {/* ANSWERS */}
            <div
              key={`${lesson.id}-${stepIdx}-${shakeKey}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7
              }}
            >
              {options.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: C.onyx400
                  }}
                >
                  No options available for this step.
                </div>
              ) : (
                options.map((opt, i) => {
                  const isChosen =
                    chosen &&
                    String(chosen.text) ===
                      String(opt)

                  const isCorrect =
                    isChosen &&
                    chosen.correct

                  const isWrong =
                    isChosen &&
                    !chosen.correct

                  return (
                    <button
                      key={`${String(opt)}-${i}`}
                      type="button"
                      disabled={!!chosen}
                      onClick={() => pick(opt)}
                      className={
                        isWrong ? 'shake' : ''
                      }
                      style={{
                        background: isCorrect
                          ? C.emeraldLight
                          : isWrong
                            ? '#FEECEC'
                            : '#fff',

                        border: `1.5px solid ${
                          isCorrect
                            ? C.emerald
                            : isWrong
                              ? '#EF4444'
                              : C.onyx100
                        }`,

                        borderRadius: 10,
                        padding: '10px 12px',
                        textAlign: 'left',

                        fontFamily:
                          "'JetBrains Mono',monospace",

                        fontSize: 12.5,

                        color: isCorrect
                          ? C.emeraldDark
                          : isWrong
                            ? '#EF4444'
                            : C.onyx700,

                        fontWeight: 500,

                        cursor: chosen
                          ? 'default'
                          : 'pointer',

                        transition: 'all .12s',
                        lineHeight: 1.5,
                        width: '100%',
                        whiteSpace: 'pre-wrap',

                        /*
                         * Makes sure the button remains
                         * above accidental overlapping
                         * canvas elements.
                         */
                        position: 'relative',
                        zIndex: 2,

                        pointerEvents: chosen
                          ? 'none'
                          : 'auto'
                      }}
                    >
                      {opt}
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* COMPLETED GUIDED MODE */}
        {allDone && (
          <>
            <div
              className="toast-pop"
              style={{
                background: C.emeraldLight,
                color: C.emeraldDark,
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12
              }}
            >
              <Ico
                n="check"
                s={15}
                c={C.emeraldDark}
              />

              All steps done!
            </div>

            {taskComplete && (
              <CompletionReview
                lesson={lesson}
                code={
                  completedCode ||
                  built.join('\n')
                }
              />
            )}
          </>
        )}
      </div>

      {/* SELECTED CODE */}
      {!taskComplete && (
        <div
          style={{
            flexShrink: 0,
            background: '#0B1220',
            borderTop: '1px solid #1E293B',
            padding: '10px 14px',
            maxHeight: 120,
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#475569',
              fontFamily:
                "'JetBrains Mono',monospace",
              marginBottom: 4,
              letterSpacing: '.06em'
            }}
          >
            SELECTED ANSWERS / CODE
          </div>

          {built.map((line, i) => (
            <div
              key={i}
              className="slide-up"
              style={{
                fontFamily:
                  "'JetBrains Mono',monospace",
                fontSize: 12,
                color: '#86EFAC',
                lineHeight: '20px'
              }}
            >
              {line}
            </div>
          ))}

          {!allDone &&
            guidedSteps.length > 0 && (
              <div
                style={{
                  fontFamily:
                    "'JetBrains Mono',monospace",
                  fontSize: 12,
                  color: '#334155'
                }}
              >
                █
              </div>
            )}
        </div>
      )}

      {/* BOTTOM BUTTONS */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          padding: '10px 12px',
          flexShrink: 0,
          borderTop: `1px solid ${C.onyx100}`
        }}
      >
        {(allDone ||
          taskComplete ||
          guidedSteps.length === 0) && (
          <button
            type="button"
            onClick={() =>
              onUnlock(
                builtRef.current.join('\n')
              )
            }
            className="toast-pop"
            style={{
              width: '100%',
              background: C.purple,
              color: '#fff',
              border: 'none',
              padding: '12px 10px',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              borderRadius: 10
            }}
          >
            <Ico
              n="unlock"
              s={15}
              c="#fff"
            />

            Continue to Free Code
          </button>
        )}

        {!taskComplete && (
          <div
            style={{
              marginBottom: 8,
              fontSize: 11,
              color: C.onyx400,
              textAlign: 'center'
            }}
          >
            Select the correct code step above
            to complete the level.
          </div>
        )}

        <NextLevelButton
          onNext={onNext}
          isFinalLevel={isFinalLevel}
          isCleared={taskComplete}
          completed={taskComplete}
        />
      </div>
    </div>
  )
}

/* =========================================================
   FREE CODE PANEL
   ========================================================= */

function FreeCodePanel({
  lesson,
  starterCode,
  check,
  onRun,
  hint,
  onHint,
  completed,
  completedCode,
  onNext,
  onResetReplay,
  onResetCanvas,
  isFinalLevel
}) {
  const [code, setCode] = useState(
    starterCode
  )

  useEffect(() => {
    setCode(starterCode)
  }, [starterCode, lesson.id])

  const activeCheck = useMemo(() => {
    if (check) return check

    return validateLesson(
      lesson,
      [],
      code
    )
  }, [check, lesson, code])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* BRIEFING */}
      <div
        style={{
          flexShrink: 0,
          padding: '11px 14px 9px',
          borderBottom: `1px solid ${C.onyx100}`,
          background: C.onyx50
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.purple,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: 4
          }}
        >
          Lesson briefing
        </div>

        <div
          style={{
            fontSize: 12,
            color: C.onyx600,
            lineHeight: 1.6
          }}
        >
          {lessonSummary(lesson)}
        </div>

        {lesson.concepts
          ?.slice(0, 2)
          .filter(Boolean)
          .map((concept, index) => (
            <div
              key={index}
              style={{
                marginTop: 6,
                fontSize: 11,
                color: C.onyx500,
                lineHeight: 1.5
              }}
            >
              {concept.note ||
                concept.code_snippet}
            </div>
          ))}

        <button
          type="button"
          onClick={() => {
            setCode(starterCode)
            onResetReplay()
          }}
          style={{
            marginTop: 8,
            background: 'transparent',
            color: C.purple,
            border: `1px solid ${C.purple}`,
            borderRadius: 7,
            padding: '6px 9px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Reset &amp; Replay Guided Mode
        </button>
      </div>

      {/* CODE EDITOR */}
      <div
        style={{
          flex: '1 1 260px',
          minHeight: 260,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 12px 0'
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.onyx400,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 6
          }}
        >
          Your Code
        </div>

        <div
          data-testid="free-code-editor"
          style={{
            flex: '1 1 auto',
            minHeight: 220,
            height: 260,
            borderRadius: 10,
            overflow: 'hidden',
            border: `1px solid ${C.onyx100}`
          }}
        >
          <CodeEditor
            value={code}
            onChange={setCode}
            fillHeight
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 12px',
          display: 'flex',
          gap: 7,
          borderTop: `1px solid ${C.onyx100}`
        }}
      >
        <button
          type="button"
          onClick={() => onRun(code)}
          style={{
            flex: 1,
            background: C.purple,
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            padding: '10px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow:
              '0 4px 12px rgba(79,70,229,.3)',
            cursor: 'pointer'
          }}
        >
          <Ico
            n="play"
            s={14}
            c="#fff"
          />

          Run
        </button>

        <button
          type="button"
          onClick={() => {
            setCode(starterCode)
            onResetCanvas()
          }}
          style={{
            background: '#fff',
            color: C.onyx600,
            border: `1px solid ${C.onyx100}`,
            borderRadius: 9,
            padding: '10px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <Ico
            n="refresh"
            s={14}
            c={C.onyx600}
          />
        </button>

        <button
          type="button"
          onClick={onHint}
          style={{
            background: hint
              ? C.amberLight
              : '#fff',
            color: C.amberDark,
            border: `1px solid ${
              hint
                ? C.amber + '66'
                : C.onyx100
            }`,
            borderRadius: 9,
            padding: '10px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <Ico
            n="tip"
            s={14}
            c={C.amberDark}
          />
        </button>
      </div>

      {/* HINT */}
      {hint && (
        <div
          style={{
            flexShrink: 0,
            background: C.amberLight,
            color: C.amberDark,
            fontSize: 12.5,
            padding: '9px 14px',
            lineHeight: 1.6,
            borderTop: `1px solid ${C.amber}44`
          }}
        >
          💡{' '}
          {lesson.hint ||
            'No extra hint available for this level.'}
        </div>
      )}

      {/* CHECKLIST */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 14px',
          borderTop: `1px solid ${C.onyx100}`
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.onyx400,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 9
          }}
        >
          Quest Checklist
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {activeCheck.items.map(
            (item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: item.ok
                      ? C.emerald
                      : C.onyx100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {item.ok && (
                    <Ico
                      n="check"
                      s={10}
                      c="#fff"
                    />
                  )}
                </div>

                <span
                  style={{
                    fontSize: 12,
                    color: item.ok
                      ? C.onyx
                      : C.onyx400,
                    fontWeight: item.ok
                      ? 600
                      : 500
                  }}
                >
                  {item.label}
                </span>
              </div>
            )
          )}

          {activeCheck.passed && (
            <>
              <div
                style={{
                  marginTop: 8,
                  background: C.emeraldLight,
                  color: C.emeraldDark,
                  borderRadius: 9,
                  padding: '9px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                <Ico
                  n="trophy"
                  s={14}
                  c={C.emeraldDark}
                />

                Quest cleared!
              </div>

              {completed && (
                <CompletionReview
                  lesson={lesson}
                  code={completedCode}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* NEXT */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 14px',
          borderTop: `1px solid ${C.onyx100}`
        }}
      >
        {!completed && (
          <div
            style={{
              marginBottom: 8,
              fontSize: 11,
              color: C.onyx400,
              textAlign: 'center'
            }}
          >
            Complete the level to continue.
          </div>
        )}

        <NextLevelButton
          onNext={onNext}
          isFinalLevel={isFinalLevel}
          isCleared={completed}
          completed={completed}
        />
      </div>
    </div>
  )
}

/* =========================================================
   LESSON PAGE
   ========================================================= */

export default function LessonPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const searchParams = new URLSearchParams(
    location.search
  )

  const activeIslandId = Number(
    location.state?.islandId ||
      searchParams.get('island') ||
      window.localStorage.getItem(
        'activeIslandId'
      ) ||
      1
  )

  const relativeLevel = Number(
    location.state?.relativeLevel || id
  )

  const { user, updateXp } = useAuth()

  const [lesson, setLesson] = useState(null)
  const [phase, setPhase] = useState('guided')

  const [starterCode, setStarterCode] =
    useState('')

  const [playToken, setPlayToken] =
    useState(0)

  const [liveCode, setLiveCode] =
    useState('')

  const [check, setCheck] =
    useState(null)

  const [hint, setHint] =
    useState(false)

  const [toast, setToast] =
    useState(null)

  const [musicOn, setMusicOn] =
    useState(false)

  const [panelOpen, setPanelOpen] =
    useState(true)

  const [completed, setCompleted] =
    useState(false)

  const [completedCode, setCompletedCode] =
    useState('')

  const [islandCleared, setIslandCleared] =
    useState(false)

  const [xpGained, setXpGained] =
    useState(0)

  const [nextLesson, setNextLesson] =
    useState(null)

  const [canvasResetToken, setCanvasResetToken] =
    useState(0)

  /* NEW: wrong-answer/death state */
const MAX_LIVES = 3

const [wrongAnswers, setWrongAnswers] = useState(() =>
  MAX_LIVES - getIslandLives(activeIslandId, MAX_LIVES)
)
const [isDying, setIsDying] = useState(false)
const [showGameOver, setShowGameOver] = useState(false)
const lives = Math.max(0, MAX_LIVES - wrongAnswers)
const [deathPosition, setDeathPosition] = useState(null)
const [guidedResetKey, setGuidedResetKey] = useState(0)
  const completionPromiseRef = useRef(null)
const guidedCodeRef = useRef('')
const guidedEventsRef = useRef([])
const guidedFinalStepRef = useRef(false)

const deathResolveRef = useRef(null)

  const PANEL_W = 340

  /* =========================================================
     SAVE PROGRESS
     ========================================================= */

  const saveProgress = useCallback(() => {
    if (!lesson) {
      return Promise.resolve()
    }

    if (completionPromiseRef.current) {
      return completionPromiseRef.current
    }

    const request = axios
      .post('/api/progress/complete', {
        lesson_id: Number(lesson.id)
      })
      .then(res => {
        setCompleted(true)

        markLessonCompleted(
          lesson.id,
          user?.id
        )

        if (!res.data.alreadyDone) {
          setXpGained(
            res.data.xpAwarded ||
              lesson.xp_reward ||
              0
          )

          updateXp(
            res.data.newXp,
            res.data.newLevel,
            res.data.unlocked_module
          )

          setToast({
            msg: `+${
              res.data.xpAwarded ||
              lesson.xp_reward
            } XP — quest cleared!`,
            tone: 'emerald',
            k: Date.now()
          })

          setTimeout(
            () => setToast(null),
            3000
          )
        } else {
          setXpGained(0)
        }
      })
      .catch(err => {
        console.error(err)

        setToast({
          msg:
            'Level cleared locally. Progress will sync when you run it again.',
          tone: 'amber',
          k: Date.now()
        })

        setTimeout(
          () => setToast(null),
          3500
        )
      })
      .finally(() => {
        if (
          completionPromiseRef.current ===
          request
        ) {
          completionPromiseRef.current =
            null
        }
      })

    completionPromiseRef.current = request

    return request
  }, [lesson, updateXp, user?.id])

  /* =========================================================
     LOAD LESSON
     ========================================================= */

  useEffect(() => {
    completionPromiseRef.current = null

    setCompleted(false)
    setCompletedCode('')
    setIslandCleared(false)
    setShowGameOver(false)
    setXpGained(0)
    setToast(null)
    setNextLesson(null)

    setPhase('guided')
    setStarterCode('')
    setLiveCode('')

    setWrongAnswers(
      MAX_LIVES -
        getIslandLives(activeIslandId, MAX_LIVES)
    )
    setIsDying(false)
    setDeathPosition(null)
    setGuidedResetKey(0)

    guidedCodeRef.current = ''
    guidedEventsRef.current = []
    guidedFinalStepRef.current = false

    setCheck(null)

    const applyLessonData = (
      sourceLesson,
      nextLessonData = null
    ) => {
      if (!sourceLesson) return

      let guidedData =
        sourceLesson.guided ??
        sourceLesson.guidedSteps ??
        sourceLesson.steps

      if (typeof guidedData === 'string') {
        try {
          guidedData =
            JSON.parse(guidedData)
        } catch (_) {
          guidedData = []
        }
      }

      let conceptsData =
        sourceLesson.concepts

      if (typeof conceptsData === 'string') {
        try {
          conceptsData =
            JSON.parse(conceptsData)
        } catch (_) {
          conceptsData = []
        }
      }

      setLesson({
        ...sourceLesson,

        moduleId:
          sourceLesson.moduleId ??
          sourceLesson.module_id ??
          sourceLesson.islandId ??
          activeIslandId,

        guided: Array.isArray(guidedData)
          ? guidedData
          : [],

        concepts: Array.isArray(conceptsData)
          ? conceptsData
          : [],

        initialCode:
          sourceLesson.initialCode ??
          sourceLesson.starter_code ??
          '',

        checklist: Array.isArray(
          sourceLesson.checklist
        )
          ? sourceLesson.checklist
          : []
      })

      setStarterCode(
        sourceLesson.starter_code ||
          sourceLesson.initialCode ||
          FREE_CODE_PROMPT
      )

      setNextLesson(
        nextLessonData || null
      )
    }

    const fallbackLesson =
      getLessonByIslandAndLevel(
        activeIslandId,
        relativeLevel
      )

    const loadLesson = async () => {
      try {
        const [
          lessonResponse,
          progressResponse
        ] = await Promise.all([
          axios.get('/api/lessons', {
            params: {
              island: activeIslandId,
              level: relativeLevel
            }
          }),

          axios.get('/api/progress')
        ])

        const fetchedLesson =
          lessonResponse.data?.[0]

        if (!fetchedLesson) {
          throw new Error(
            'Lesson not found for the selected island and level.'
          )
        }

        const serverCompleted =
          (progressResponse.data || [])
            .some(item => {
              const progressLessonId =
                Number(
                  item.lesson_id ??
                  item.activity_id
                )

              return (
                progressLessonId ===
                  Number(
                    fetchedLesson.id
                  ) &&
                (
                  item.phase ===
                    'completed' ||
                  item.completed ===
                    true ||
                  item.is_completed ===
                    true
                )
              )
            })

        if (serverCompleted) {
          setCompleted(true)
          setPhase('free')
        }

        const localLesson =
          getLessonByIslandAndLevel(
            activeIslandId,
            relativeLevel
          )

        applyLessonData({
          ...fetchedLesson,

          guided:
            Array.isArray(
              fetchedLesson.guided
            ) &&
            fetchedLesson.guided.length > 0
              ? fetchedLesson.guided
              : localLesson?.guided ||
                localLesson?.steps ||
                [],

          briefing:
            fetchedLesson.briefing ||
            localLesson?.briefing,

          starter_code:
            fetchedLesson.starter_code ||
            localLesson?.starter_code ||
            localLesson?.initialCode ||
            ''
        })
      } catch (error) {
        console.error(
          'Lesson fetch failed. Falling back to local lesson data.',
          error
        )

        if (fallbackLesson) {
          applyLessonData({
            ...fallbackLesson,

            guided: Array.isArray(
              fallbackLesson.guided
            )
              ? fallbackLesson.guided
              : [],

            concepts: Array.isArray(
              fallbackLesson.concepts
            )
              ? fallbackLesson.concepts
              : []
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

    return () => {
      stopBgMusic()
    }
  }, [
    id,
    activeIslandId,
    relativeLevel
  ])

  useEffect(() => {
    if (wrongAnswers >= MAX_LIVES && !isDying) {
      setShowGameOver(true)
    }
  }, [isDying, wrongAnswers])

  /* =========================================================
     PHASE CHANGE
     ========================================================= */

  const handlePhaseChange =
    useCallback(
      phaseName => {
        if (
          phaseName === 'free' &&
          !starterCode
        ) {
          setStarterCode(
            FREE_CODE_PROMPT
          )
        }

        setPhase(phaseName)
      },
      [starterCode]
    )

  /* =========================================================
     CORRECT GUIDED STEP
     ========================================================= */

  const handleStepCorrect =
    useCallback(
      (
        snippet,
        currentFullCode,
        isFinalStep
      ) => {
        const diagnostics =
          lintJava(currentFullCode)

        if (diagnostics.length > 0) {
          setToast({
            msg:
              diagnostics[0].message,
            tone: 'amber',
            k: Date.now()
          })

          setTimeout(
            () => setToast(null),
            3000
          )

          return
        }

        guidedCodeRef.current =
          currentFullCode

        guidedFinalStepRef.current =
          isFinalStep

        setLiveCode(
          currentFullCode
        )

        setPlayToken(
          token => token + 1
        )
      },
      []
    )

  /* =========================================================
     WRONG ANSWER
     ========================================================= */

  const triggerLightningDeath =
    useCallback(() => {
      setIsDying(true)

      return new Promise(resolve => {
        deathResolveRef.current = resolve
      })
    }, [])

  const finishLightningDeath =
    useCallback(() => {
      setIsDying(false)
      setShowGameOver(true)

      const resolve = deathResolveRef.current

      deathResolveRef.current = null

      if (resolve) {
        resolve()
      }
    }, [])

  const resetToFirstLevel =
    useCallback(() => {
      setShowGameOver(false)
      setWrongAnswers(0)
      resetIslandLives(activeIslandId, MAX_LIVES)
      setIsDying(false)
      setDeathPosition(null)
      setCompleted(false)
      setIslandCleared(false)
      setCompletedCode('')
      setCheck(null)
      setLiveCode('')
      setPhase('guided')
      setToast(null)
      setGuidedResetKey(current => current + 1)
      setCanvasResetToken(current => current + 1)

      guidedCodeRef.current = ''
      guidedEventsRef.current = []
      guidedFinalStepRef.current = false

      navigate(
        `/lesson/1?island=${activeIslandId}`,
        {
          state: {
            islandId: activeIslandId,
            relativeLevel: 1
          }
        }
      )
    }, [activeIslandId, navigate])

  const returnToMapAfterGameOver =
    useCallback(() => {
      setShowGameOver(false)
      setWrongAnswers(
        MAX_LIVES -
          getIslandLives(activeIslandId, MAX_LIVES)
      )
      setIsDying(false)
      setDeathPosition(null)
      deathResolveRef.current = null

      navigate(getIslandRoute(lesson, location))
    }, [lesson, location, navigate])

  const handleWrongAnswer =
    useCallback(() => {
      if (isDying || wrongAnswers >= MAX_LIVES) return

      const nextWrongAnswers = Math.min(
        wrongAnswers + 1,
        MAX_LIVES
      )

      setWrongAnswers(nextWrongAnswers)
      setIslandLives(
        activeIslandId,
        MAX_LIVES - nextWrongAnswers
      )

      if (MAX_LIVES - nextWrongAnswers === 0) {
        void triggerLightningDeath()
      }
    }, [
      isDying,
      triggerLightningDeath,
      wrongAnswers
    ])

  /* =========================================================
     PLAYER DEATH / GAME OVER
     ========================================================= */

  /* =========================================================
     UNLOCK FREE CODE
     ========================================================= */

  const handleUnlock =
    useCallback(
      builtCode => {
        if (!completed) {
          setToast({
            msg:
              'Complete Guided Mode first to unlock Free Code.',
            tone: 'amber',
            k: Date.now()
          })

          setTimeout(
            () => setToast(null),
            3000
          )

          return
        }

        setStarterCode(
          builtCode ||
            FREE_CODE_PROMPT
        )

        setLiveCode(
          builtCode || ''
        )

        setCheck(null)

        handlePhaseChange('free')
      },
      [
        completed,
        handlePhaseChange
      ]
    )

  /* =========================================================
     FREE CODE RUN
     ========================================================= */

  const handleFreeRun =
    useCallback(code => {
      const safety =
        validateFreeCode(code)

      if (!safety.valid) {
        setToast({
          msg:
            safety.message ||
            FREE_CODE_SAFETY_MESSAGE,
          tone: 'amber',
          k: Date.now()
        })

        setTimeout(
          () => setToast(null),
          3000
        )

        return
      }

      const diagnostics =
        lintJava(code)

      if (diagnostics.length > 0) {
        setToast({
          msg:
            diagnostics[0].message,
          tone: 'amber',
          k: Date.now()
        })

        setTimeout(
          () => setToast(null),
          3000
        )

        return
      }

      guidedCodeRef.current = ''
      guidedEventsRef.current = []
      guidedFinalStepRef.current = false

      setCheck(null)

      setLiveCode(code)

      setPlayToken(
        token => token + 1
      )
    }, [])

  /* =========================================================
     RESET CANVAS
     ========================================================= */

  const resetCanvasForReplay =
    useCallback(() => {
      setCheck(null)

      setLiveCode(
        starterCode
      )

      guidedCodeRef.current = ''
      guidedEventsRef.current = []
      guidedFinalStepRef.current = false

      setWrongAnswers(
        MAX_LIVES -
          getIslandLives(activeIslandId, MAX_LIVES)
      )
      setIsDying(false)

      setGuidedResetKey(
        key => key + 1
      )

      setCanvasResetToken(
        token => token + 1
      )
    }, [activeIslandId, starterCode])

  /* =========================================================
     GAME CANVAS RESULT
     ========================================================= */

  const handleResult =
    useCallback(
      res => {
        if (res?.error) {
          setToast({
            msg: res.error,
            tone: 'amber',
            k: Date.now()
          })

          setTimeout(
            () => setToast(null),
            3000
          )

          return
        }

        if (!lesson) return

        const isGuidedRun =
          phase === 'guided'

        guidedEventsRef.current =
          isGuidedRun
            ? [
                ...guidedEventsRef.current,
                ...(res.events || [])
              ]
            : res.events || []

        const executedCode =
          isGuidedRun
            ? guidedCodeRef.current
            : res.code ||
              liveCode

        const validation =
          validateLesson(
            lesson,
            guidedEventsRef.current,
            executedCode
          )

        setCheck(validation)

        if (
          validation.passed &&
          (
            !isGuidedRun ||
            guidedFinalStepRef.current
          )
        ) {
          setCompletedCode(
            executedCode
          )

          saveProgress()
        }
      },
      [
        lesson,
        liveCode,
        phase,
        saveProgress
      ]
    )

  /* =========================================================
     ALL GUIDED STEPS DONE
     ========================================================= */

  const handleAllStepsDone =
    useCallback(
      code => {
        setCompletedCode(code)
        saveProgress()
      },
      [saveProgress]
    )

  /* =========================================================
     NEXT LEVEL
     ========================================================= */

  const goToNext =
    async () => {
      if (!lesson) return

      await saveProgress()

      const currentLevel =
        Number(
          lesson.order_index ||
            lesson.level_label
              ?.match(/\d+/)?.[0] ||
            relativeLevel
        )

      const currentIslandId =
        getActiveIslandId(
          lesson,
          location
        ) ||
        activeIslandId

      if (currentLevel === 10) {
        setIslandCleared(true)
        return
      }

      const nextLevel =
        currentLevel + 1

      if (nextLevel <= 10) {
        navigate(
          `/lesson/${nextLevel}?island=${currentIslandId}`,
          {
            state: {
              islandId:
                currentIslandId,
              relativeLevel:
                nextLevel
            }
          }
        )
      }
    }

  /* =========================================================
     MUSIC
     ========================================================= */

  const toggleMusic = () => {
    if (window._cqAudio) {
      if (window._cqAudio.paused) {
        window._cqAudio.play()
      } else {
        window._cqAudio.pause()
      }
    }

    setMusicOn(
      music => !music
    )
  }

  /* =========================================================
     LOADING
     ========================================================= */

  if (!lesson) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.onyx50,
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: C.purple,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Ico
            n="bolt"
            s={18}
            c="#fff"
          />
        </div>

        <div
          style={{
            fontSize: 14,
            color: C.onyx400,
            fontWeight: 500
          }}
        >
          Loading lesson…
        </div>
      </div>
    )
  }

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0F172A'
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          flexShrink: 0,
          height: 50,
          background:
            'rgba(15,23,42,0.95)',
          borderBottom:
            '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',
          padding: '0 14px',
          gap: 10,
          zIndex: 20
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                getIslandRoute(
                  lesson,
                  location
                )
              )
            }
            style={{
              background:
                'rgba(255,255,255,0.08)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7,
              padding: '5px 11px',
              color:
                'rgba(255,255,255,0.65)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            ← Back
          </button>

          <div
            style={{
              width: 1,
              height: 18,
              background:
                'rgba(255,255,255,0.1)'
            }}
          />

          <div>
            <div
              style={{
                fontSize: 10,
                color: C.purple,
                fontWeight: 700,
                textTransform:
                  'uppercase',
                letterSpacing: '.06em'
              }}
            >
              {`ISLAND ${activeIslandId} - ${javaLabel(
                lesson.module_title ||
                  lesson.track ||
                  `Module ${activeIslandId}`
              )}`}
            </div>

            <div
              style={{
                fontSize: 13,
                color:
                  'rgba(255,255,255,0.9)',
                fontWeight: 600
              }}
            >
              {lesson.title}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {/* MODE SWITCH */}
          <div
            style={{
              display: 'flex',
              background:
                'rgba(255,255,255,0.07)',
              borderRadius: 999,
              padding: 3,
              gap: 2
            }}
          >
            {['guided', 'free'].map(
              p => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    handlePhaseChange(p)
                  }
                  style={{
                    padding:
                      '4px 13px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background:
                      phase === p
                        ? C.purple
                        : 'transparent',
                    color:
                      phase === p
                        ? '#fff'
                        : 'rgba(255,255,255,0.4)',
                    transition:
                      'all .2s',
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: 4,
                    userSelect: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {p === 'guided'
                    ? 'Guided'
                    : 'Free Code'}
                </button>
              )
            )}
          </div>

          <Pill
            bg={C.amberLight}
            col={C.amberDark}
          >
            +{lesson.xp_reward} XP
          </Pill>

          {/* MUSIC */}
          <button
            type="button"
            onClick={toggleMusic}
            title="Toggle music"
            style={{
              background:
                'rgba(255,255,255,0.07)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center'
            }}
          >
            {musicOn
              ? '🎵'
              : '🔇'}
          </button>

          {/* PANEL */}
          <button
            type="button"
            onClick={() =>
              setPanelOpen(
                open => !open
              )
            }
            title="Toggle panel"
            style={{
              background:
                'rgba(255,255,255,0.07)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: 7,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center'
            }}
          >
            <Ico
              n="chevRight"
              s={15}
              c="rgba(255,255,255,0.6)"
            />
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        {/* GAME CANVAS */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minwidth: 0
          }}
        >
          <GameCanvas
            playToken={playToken}
            code={liveCode}
            onResult={handleResult}
            onCharacterPosition={setDeathPosition}
            target={lesson.target_tiles}
            lessonData={lesson}
            resetToken={
              canvasResetToken
            }
            levelLabel={
              lesson.level_label
            }
            levelTitle={lesson.title}
            lessonId={lesson.id}
            executionMode={phase}
            levelState={
              completed
                ? 'cleared'
                : playToken > 0
                  ? 'coding'
                  : 'idle'
            }
            fullHeight
          />
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            width: panelOpen
              ? PANEL_W
              : 0,

            minWidth: panelOpen
              ? PANEL_W
              : 0,

            flexShrink: 0,

            background: '#fff',

            borderLeft:
              `1px solid ${C.onyx100}`,

            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',

            transition:
              'width .22s ease, min-width .22s ease',

            /*
             * IMPORTANT FIX:
             * Keeps Guided Mode above the
             * GameCanvas and prevents the
             * canvas from stealing clicks.
             */
            position: 'relative',
            zIndex: 50
          }}
        >
          {panelOpen &&
            phase === 'guided' && (
              <GuidedPanel
                key={`${lesson.id}-${guidedResetKey}`}
                lesson={lesson}
                onUnlock={
                  handleUnlock
                }
                onNext={goToNext}
                onStepCorrect={
                  handleStepCorrect
                }
                onWrongAnswer={
                  handleWrongAnswer
                }
                lives={lives}
                onAllStepsDone={
                  handleAllStepsDone
                }
                taskComplete={
                  completed
                }
                completedCode={
                  completedCode
                }
                isFinalLevel={
                  Number(
                    lesson.order_index ||
                      lesson.level_label
                        ?.match(
                          /\d+/
                        )?.[0] ||
                      lesson.id
                  ) === 10
                }
              />
            )}

          {panelOpen &&
            phase === 'free' && (
              <FreeCodePanel
                key={`${lesson.id}-${starterCode}`}
                lesson={lesson}
                starterCode={
                  starterCode
                }
                check={check}
                hint={hint}
                onRun={
                  handleFreeRun
                }
                onHint={() =>
                  setHint(
                    h => !h
                  )
                }
                completed={
                  completed
                }
                completedCode={
                  completedCode
                }
                onNext={
                  goToNext
                }
                onResetReplay={() => {
                  resetCanvasForReplay()
                  setPhase('guided')
                }}
                onResetCanvas={
                  resetCanvasForReplay
                }
                isFinalLevel={
                  Number(
                    lesson.order_index ||
                      lesson.level_label
                        ?.match(
                          /\d+/
                        )?.[0] ||
                      lesson.id
                  ) === 10
                }
              />
            )}
        </div>
      </div>

      {/* PLAYER DEATH */}
      <PlayerDeath
        wrongAnswers={wrongAnswers}
        isDying={isDying}
        position={deathPosition}
        onAnimationComplete={finishLightningDeath}
      />

      {showGameOver && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(15,23,42,0.72)'
          }}
        >
          <div
            style={{
              width: 'min(100%, 390px)',
              padding: 28,
              borderRadius: 16,
              background: '#fff',
              textAlign: 'center',
              boxShadow: '0 24px 70px rgba(15,23,42,0.3)'
            }}
          >
            <div
              style={{
                fontSize: 32,
                marginBottom: 10
              }}
              aria-hidden="true"
            >
              💔
            </div>
            <h2
              id="game-over-title"
              style={{
                margin: '0 0 8px',
                color: C.onyx,
                fontSize: 24
              }}
            >
              Game Over
            </h2>
            <p
              style={{
                margin: '0 0 22px',
                color: C.onyx600,
                lineHeight: 1.5
              }}
            >
              Your three hearts are gone. Restart this island from Level 1?
            </p>
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'center'
              }}
            >
              <button
                type="button"
                onClick={returnToMapAfterGameOver}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  border: `1px solid ${C.onyx100}`,
                  borderRadius: 8,
                  background: '#fff',
                  color: C.onyx600,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Back to Map
              </button>
              <button
                type="button"
                onClick={resetToFirstLevel}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  border: 'none',
                  borderRadius: 8,
                  background: C.purple,
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Restart to Level 1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <Toast
          msg={toast.msg}
          tone={toast.tone}
          key={toast.k}
        />
      )}

      {/* ISLAND CLEARED */}
      {islandCleared && (
        <IslandClearedModal
          islandName={`Island ${lesson.module_id}`}
          xpGained={xpGained}
          onReturn={() =>
            navigate('/quest', {
              state: {
                islandId:
                  getActiveIslandId(
                    lesson,
                    location
                  )
              }
            })
          }
        />
      )}
    </div>
  )
}