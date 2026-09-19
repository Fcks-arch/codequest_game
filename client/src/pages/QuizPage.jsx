import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  ClipboardList,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  RotateCcw,
  Code2
} from 'lucide-react'
import QuestNav from '../components/QuestNav'

/* =========================================================
   HELPERS
========================================================= */

const parseCodeBlanks = (value) => {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

const getCodeBlanks = (question) => {
  return parseCodeBlanks(
    question?.code_blanks ?? question?.blanks
  )
}

const getStarterCode = (question) => {
  return String(
    question?.starter_code ??
    question?.template ??
    ''
  )
}

const getBlankOptions = (blank) => {
  if (Array.isArray(blank?.options)) {
    return blank.options.map((option) => String(option))
  }

  return []
}

const isCompleteCode = (question) => {
  const type = String(
    question?.question_type ?? question?.type ?? ''
  ).toLowerCase()

  return (
    type === 'complete_code' ||
    type === 'code_completion'
  )
}

const renderCodeTemplate = (
  template,
  selectedTokens = []
) => {
  const parts = String(template || '').split('____')

  if (parts.length === 1) {
    return (
      <>
        {template || 'No code template provided.'}
      </>
    )
  }

  return parts.map((part, index) => (
    <React.Fragment key={index}>
      <span>{part}</span>

      {index < parts.length - 1 && (
        <span className="cq-student-blank">
          {selectedTokens[index] || '______'}
        </span>
      )}
    </React.Fragment>
  ))
}

const hasQuestionAnswer = (
  question,
  answer
) => {
  if (isCompleteCode(question)) {
    const blanks = getCodeBlanks(question)

    if (!blanks.length || !Array.isArray(answer)) {
      return false
    }

    return blanks.every((_, index) =>
      Boolean(answer[index])
    )
  }

  return Boolean(answer)
}

const formatDate = (value) => {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString()
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState([])
  const [selected, setSelected] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* =========================================================
     LOAD QUIZ LIST
  ========================================================= */

  const load = async () => {
    try {
      setLoading(true)
      setError('')

      const { data } = await axios.get(
        '/api/quizzes'
      )

      setQuizzes(
        Array.isArray(data)
          ? data
          : []
      )
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load quizzes.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  /* =========================================================
     OPEN QUIZ

     IMPORTANT:
     Opening a quiz does NOT create an attempt.

     The backend only creates a quiz_attempts record
     when POST /api/quizzes/:id/submit succeeds.

     If the backend reports that the student already
     submitted the quiz previously, we display the saved
     result instead of allowing another attempt.
  ========================================================= */

  const openQuiz = async (id) => {
    try {
      setError('')
      setResult(null)
      setAnswers({})
      setCurrentQuestion(0)

      const { data } = await axios.get(
        `/api/quizzes/${id}`
      )

      const quizData = data?.quiz
        ? {
            ...data.quiz,
            questions: Array.isArray(
              data.questions
            )
              ? data.questions
              : []
          }
        : data

      setSelected(quizData)

      /*
       * IMPORTANT:
       * This does NOT create an attempt.
       *
       * It only checks whether an attempt already
       * exists in quiz_attempts.
       */
      if (
        data?.attempted &&
        data?.attempt
      ) {
        const attempt = data.attempt

        setResult({
          quiz:
            data.quiz?.title ||
            quizData?.title ||
            'CodeQuest Quiz',

          score:
            Number(attempt.score) || 0,

          total:
            Number(
              attempt.total ??
              attempt.total_points
            ) || 0,

          percentage:
            Number(
              attempt.percentage
            ) || 0,

          submitted_at:
            attempt.submitted_at,

          attempted: true
        })
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'This quiz is unavailable.'
      )
    }
  }

  /* =========================================================
     MULTIPLE CHOICE / TRUE-FALSE
  ========================================================= */

  const selectAnswer = (value) => {
    if (!selected) return

    const question =
      selected.questions?.[
        currentQuestion
      ]

    if (!question) return

    setAnswers((prev) => ({
      ...prev,
      [question.id]: value
    }))
  }

  /* =========================================================
     COMPLETE THE CODE
  ========================================================= */

  const selectCodeToken = (
    question,
    blankIndex,
    option
  ) => {
    if (!question) return

    setAnswers((prev) => {
      const current =
        Array.isArray(
          prev[question.id]
        )
          ? [...prev[question.id]]
          : []

      current[blankIndex] = option

      return {
        ...prev,
        [question.id]: current
      }
    })
  }

  /* =========================================================
     NEXT QUESTION
  ========================================================= */

  const nextQuestion = () => {
    if (
      !selected?.questions?.length
    ) {
      return
    }

    if (
      currentQuestion <
      selected.questions.length - 1
    ) {
      setCurrentQuestion(
        (prev) => prev + 1
      )

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  /* =========================================================
     PREVIOUS QUESTION
  ========================================================= */

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(
        (prev) => prev - 1
      )

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  /* =========================================================
     SUBMIT QUIZ

     The attempt is FINISHED here.

     Opening the quiz does not create an attempt.

     The backend is responsible for:
     1. Checking if an attempt already exists
     2. Calculating the score
     3. Saving quiz_attempts
     4. Saving quiz_results
     5. Preventing duplicate submissions
  ========================================================= */

  const submit = async () => {
    if (
      !selected?.id ||
      submitting
    ) {
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const { data } =
        await axios.post(
          `/api/quizzes/${selected.id}/submit`,
          {
            answers
          }
        )

      /*
       * Successful submission.
       *
       * At this point the backend has created
       * the quiz_attempts record.
       */

      setResult({
        ...data,

        quiz:
          data.quiz ||
          selected.title ||
          'CodeQuest Quiz',

        score:
          Number(data.score) || 0,

        total:
          Number(
            data.total ??
            data.total_points
          ) || 0,

        percentage:
          Number(
            data.percentage
          ) || 0,

        submitted_at:
          data.submitted_at ||
          new Date().toISOString(),

        attempted: true
      })
    } catch (err) {
      /*
       * HTTP 409 means the student already
       * submitted the quiz.
       *
       * Instead of showing an error, show
       * the saved result.
       */

      if (
        err.response?.status === 409
      ) {
        const saved =
          err.response?.data?.result

        if (saved) {
          setResult({
            ...saved,

            quiz:
              saved.quiz ||
              selected.title ||
              'CodeQuest Quiz',

            score:
              Number(
                saved.score
              ) || 0,

            total:
              Number(
                saved.total ??
                saved.total_points
              ) || 0,

            percentage:
              Number(
                saved.percentage
              ) || 0,

            attempted: true
          })

          setAnswers({})
          return
        }
      }

      setError(
        err.response?.data?.message ||
        'Unable to submit quiz.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* =========================================================
     RETURN TO QUIZ LIST
  ========================================================= */

  const restart = () => {
    setSelected(null)
    setResult(null)
    setAnswers({})
    setCurrentQuestion(0)
    setError('')

    load()
  }

  /* =========================================================
     RESULT SCREEN

     This screen is shown after:
     - A student successfully submits a quiz
     - A student opens a quiz they already submitted

     It will NOT be shown merely because they opened
     the quiz for the first time.
  ========================================================= */

  if (
    selected &&
    result
  ) {
    return (
      <div className="student-quiz-page">

        <QuestNav />

        <main className="student-quiz-main">

          <div className="cq-result-screen">

            {/* Result icon */}
            <div className="cq-result-icon">
              <CheckCircle2
                size={54}
              />
            </div>

            {/* Status */}
            <span className="w3-kicker">
              {result.attempted
                ? 'QUIZ ALREADY COMPLETED'
                : 'QUEST COMPLETE'}
            </span>

            {/* Quiz title */}
            <h1>
              {result.quiz}
            </h1>

            {/* Score */}
            <div className="cq-score">
              {result.score}

              <span>
                {' '}
                / {result.total}
              </span>
            </div>

            {/* Percentage */}
            <div className="cq-percentage">
              {result.percentage}%
            </div>

            {/* Main message */}
            <p className="cq-result-message">
              {result.attempted
                ? 'You have already submitted this quiz.'
                : 'You completed the quiz and earned your result.'}
            </p>

            {/* Submission date */}
            {result.submitted_at && (
              <p className="cq-result-date">
                Submitted:{' '}
                {formatDate(
                  result.submitted_at
                )}
              </p>
            )}

            {/* One-attempt notice */}
            {result.attempted && (
              <p className="cq-result-attempt-notice">
                You can only attempt this quiz once.
              </p>
            )}

            {/* Back button */}
            <div className="cq-result-actions">

              <button
                type="button"
                className="cq-primary-button"
                onClick={restart}
              >
                <ArrowLeft
                  size={18}
                />

                Back to Quizzes
              </button>

            </div>

          </div>

        </main>

      </div>
    )
  }

  /* =========================================================
     QUIZ QUESTION SCREEN
  ========================================================= */

  if (selected) {

    const questions =
      Array.isArray(
        selected.questions
      )
        ? selected.questions
        : []

    /*
     * This message is now ONLY for a genuinely
     * empty quiz.
     *
     * An already-completed quiz will never reach
     * this section because result is displayed first.
     */

    if (!questions.length) {
      return (
        <div className="student-quiz-page">

          <QuestNav />

          <main className="student-quiz-main">

            <div className="quiz-alert error">
              This quiz does not contain any questions.
            </div>

            <button
              type="button"
              className="cq-secondary-button"
              onClick={restart}
            >
              <ArrowLeft
                size={17}
              />

              Back to Quizzes
            </button>

          </main>

        </div>
      )
    }

    const question =
      questions[currentQuestion]

    const totalQuestions =
      questions.length

    const selectedAnswer =
      answers[question.id]

    const progress =
      (
        (currentQuestion + 1) /
        totalQuestions
      ) * 100

    const isLastQuestion =
      currentQuestion ===
      totalQuestions - 1

    const answeredCount =
      questions.filter((q) =>
        hasQuestionAnswer(
          q,
          answers[q.id]
        )
      ).length

    const completeCode =
      isCompleteCode(question)

    const codeBlanks =
      completeCode
        ? getCodeBlanks(question)
        : []

    const starterCode =
      getStarterCode(question)

    const selectedTokens =
      Array.isArray(
        selectedAnswer
      )
        ? selectedAnswer
        : []

    return (
      <div className="student-quiz-page">

        <QuestNav />

        <main className="student-quiz-main">

          {/* =================================================
              TOP BAR
          ================================================= */}

          <div className="cq-quiz-topbar">

            <button
              type="button"
              className="cq-back-button"
              onClick={() => {
                setSelected(null)
                setAnswers({})
                setCurrentQuestion(0)
                setError('')
              }}
            >
              <ArrowLeft
                size={17}
              />

              All Quizzes
            </button>

            <span className="cq-question-counter">
              Question{' '}
              {currentQuestion + 1}{' '}
              of {totalQuestions}
            </span>

          </div>

          {/* =================================================
              QUIZ HEADING
          ================================================= */}

          <div className="cq-quiz-heading">

            <span className="w3-kicker">
              CODEQUEST QUIZ
            </span>

            <h1>
              {selected.title}
            </h1>

            <p>
              Choose the best answer
              and continue through
              the quest.
            </p>

          </div>

          {/* Error */}
          {error && (
            <div className="quiz-alert error">
              {error}
            </div>
          )}

          {/* =================================================
              PROGRESS
          ================================================= */}

          <div className="cq-progress-container">

            <div className="cq-progress-label">

              <span>
                Progress
              </span>

              <span>
                {currentQuestion + 1}
                {' / '}
                {totalQuestions}
              </span>

            </div>

            <div className="cq-progress-track">

              <div
                className="cq-progress-fill"
                style={{
                  width:
                    `${progress}%`
                }}
              />

            </div>

          </div>

          {/* =================================================
              QUESTION CARD
          ================================================= */}

          <section className="cq-question-card">

            <div className="cq-question-number">
              {currentQuestion + 1}
            </div>

            <div className="cq-question-content">

              {/* Question type */}
              <div className="cq-question-type">

                {completeCode ? (
                  <>
                    <Code2
                      size={15}
                    />

                    COMPLETE THE CODE
                  </>
                ) : (
                  'MULTIPLE CHOICE'
                )}

              </div>

              {/* Question */}
              <h2>
                {question.question}
              </h2>

              {/* =================================================
                  COMPLETE THE CODE
              ================================================= */}

              {completeCode ? (

                <div className="cq-code-question">

                  <div className="cq-code-label">
                    Code snippet
                  </div>

                  <pre className="cq-code-block">

                    <code>
                      {renderCodeTemplate(
                        starterCode,
                        selectedTokens
                      )}
                    </code>

                  </pre>

                  {/* Code blanks */}
                  {codeBlanks.length ? (

                    <div className="cq-token-groups">

                      {codeBlanks.map(
                        (
                          blank,
                          blankIndex
                        ) => {

                          const options =
                            getBlankOptions(
                              blank
                            )

                          const selectedToken =
                            selectedTokens[
                              blankIndex
                            ]

                          return (
                            <div
                              className="cq-token-group"
                              key={
                                blank?.id ??
                                blankIndex
                              }
                            >

                              <div className="cq-token-label">
                                Blank{' '}
                                {blankIndex + 1}
                              </div>

                              <div className="cq-token-choices">

                                {options.map(
                                  (option) => (

                                    <button
                                      key={option}
                                      type="button"
                                      className={
                                        `cq-token-choice ${
                                          selectedToken ===
                                          option
                                            ? 'selected'
                                            : ''
                                        }`
                                      }
                                      onClick={() =>
                                        selectCodeToken(
                                          question,
                                          blankIndex,
                                          option
                                        )
                                      }
                                    >
                                      {option}
                                    </button>

                                  )
                                )}

                              </div>

                            </div>
                          )
                        }
                      )}

                    </div>

                  ) : (

                    <div className="cq-code-empty">
                      No code blanks were configured for this question.
                    </div>

                  )}

                  {/* Hint */}
                  {question.code_hint && (
                    <div className="cq-code-hint">

                      <strong>
                        Hint:
                      </strong>{' '}

                      {question.code_hint}

                    </div>
                  )}

                </div>

              ) : (

                /* =================================================
                   MULTIPLE CHOICE / TRUE-FALSE
                ================================================= */

                <div className="cq-answer-grid">

                  {[
                    'a',
                    'b',
                    'c',
                    'd'
                  ].map((letter) => {

                    const option =
                      question[
                        `option_${letter}`
                      ]

                    if (
                      option ===
                        null ||
                      option ===
                        undefined ||
                      option === ''
                    ) {
                      return null
                    }

                    const isSelected =
                      selectedAnswer ===
                      letter

                    return (

                      <button
                        key={letter}
                        type="button"
                        className={
                          `cq-answer-option ${
                            isSelected
                              ? 'selected'
                              : ''
                          }`
                        }
                        onClick={() =>
                          selectAnswer(
                            letter
                          )
                        }
                      >

                        <span className="cq-answer-letter">
                          {letter.toUpperCase()}
                        </span>

                        <span className="cq-answer-text">
                          {option}
                        </span>

                      </button>

                    )
                  })}

                </div>

              )}

            </div>

          </section>

          {/* =================================================
              NAVIGATION
          ================================================= */}

          <div className="cq-quiz-navigation">

            {/* Previous */}
            <button
              type="button"
              className="cq-secondary-button"
              onClick={
                previousQuestion
              }
              disabled={
                currentQuestion === 0
              }
            >
              <ArrowLeft
                size={17}
              />

              Previous
            </button>

            {/* Answer count */}
            <div className="cq-answer-status">
              {answeredCount}
              {' / '}
              {totalQuestions}
              {' '}
              answered
            </div>

            {/* Next / Submit */}
            {!isLastQuestion ? (

              <button
                type="button"
                className="cq-primary-button"
                onClick={
                  nextQuestion
                }
                disabled={
                  !hasQuestionAnswer(
                    question,
                    selectedAnswer
                  )
                }
              >
                Next Question

                <ArrowRight
                  size={17}
                />
              </button>

            ) : (

              <button
                type="button"
                className="cq-primary-button"
                onClick={submit}
                disabled={
                  answeredCount !==
                    totalQuestions ||
                  submitting
                }
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit Quiz'}

                <ArrowRight
                  size={17}
                />
              </button>

            )}

          </div>

        </main>

      </div>
    )
  }

  /* =========================================================
     QUIZ LIST
  ========================================================= */

  return (
    <div className="student-quiz-page">

      <QuestNav />

      <main className="student-quiz-main">

        {/* =================================================
            PAGE HEADING
        ================================================= */}

        <div className="cq-quiz-heading">

          <span className="w3-kicker">
            LEARN · PRACTICE · TEST
          </span>

          <h1>
            Quizzes
          </h1>

          <p>
            Test what you've learned
            through your CodeQuest
            challenges.
          </p>

        </div>

        {/* Error */}
        {error && (
          <div className="quiz-alert error">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (

          <div className="quiz-loading">
            Loading quizzes...
          </div>

        ) : quizzes.length ? (

          /* =================================================
             QUIZ CARDS
          ================================================= */

          <div className="student-quiz-grid">

            {quizzes.map((q) => {

              const attempted =
                q.last_score !== null &&
                q.last_score !==
                  undefined

              return (

                <button
                  type="button"
                  className={
                    `student-quiz-card ${
                      attempted
                        ? 'quiz-completed'
                        : ''
                    }`
                  }
                  key={q.id}
                  onClick={() =>
                    openQuiz(q.id)
                  }
                >

                  {/* Icon */}
                  <div className="student-quiz-icon">

                    {attempted ? (
                      <CheckCircle2
                        size={23}
                      />
                    ) : (
                      <ClipboardList
                        size={23}
                      />
                    )}

                  </div>

                  {/* Information */}
                  <div className="student-quiz-card-info">

                    <span>
                      {q.lesson_title ||
                        'General Quiz'}
                    </span>

                    <h2>
                      {q.title}
                    </h2>

                    <p>

                      {q.question_count}
                      {' questions'}
                      {' · '}

                      {attempted
                        ? `Completed · ${q.last_score}/${q.attempt_total}`
                        : 'Not attempted'}

                    </p>

                  </div>

                  {/* Right icon */}
                  {attempted ? (

                    <CheckCircle2
                      size={20}
                    />

                  ) : (

                    <ArrowRight
                      size={20}
                    />

                  )}

                </button>

              )
            })}

          </div>

        ) : (

          /* =================================================
             NO QUIZZES
          ================================================= */

          <div className="quiz-empty student-empty">

            <Lock
              size={32}
            />

            <strong>
              No quizzes are available.
            </strong>

            <span>
              Your teacher has not
              published a quiz yet.
            </span>

          </div>

        )}

      </main>

    </div>
  )
}