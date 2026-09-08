import React, { useState, useRef } from 'react'
import { startInterview, submitAnswer, getInterviewReport } from '../services/api'
import EvaluationResult from '../components/EvaluationResult'
import FinalReport from '../components/FinalReport'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = [
  { label: 'Software Engineer',     icon: '⚙️' },
  { label: 'Frontend Developer',    icon: '🖥' },
  { label: 'Backend Developer',     icon: '🔧' },
  { label: 'Full Stack Developer',  icon: '⚡' },
  { label: 'Data Scientist',        icon: '📊' },
  { label: 'Python Developer',      icon: '🐍' },
  { label: 'Java Developer',        icon: '☕' },
  { label: 'Web Developer',         icon: '🌐' },
  { label: 'Machine Learning Engr', icon: '🤖' },
  { label: 'DevOps Engineer',       icon: '🚀' },
  { label: 'Cloud Engineer',        icon: '☁️' },
  { label: 'Product Manager',       icon: '🗂' },
  { label: 'Business Analyst',      icon: '📈' },
  { label: 'Cybersecurity Analyst', icon: '🔒' },
  { label: 'UX Designer',           icon: '🎨' },
  { label: 'Other',                 icon: '◦' },
]

const DIFFICULTY_OPTS = [
  { value: 'easy',   label: 'Easy',   desc: 'Beginner-friendly',   dot: '#16a34a' },
  { value: 'medium', label: 'Medium', desc: 'Industry standard',   dot: '#d97706' },
  { value: 'hard',   label: 'Hard',   desc: 'Senior-level depth',  dot: '#dc2626' },
]

const TOTAL_OPTIONS = [3, 5, 7, 10]

// ---------------------------------------------------------------------------
// Interview state machine
// SETUP → LOADING_Q → ANSWERING → LOADING_EVAL → SHOW_EVAL → LOADING_REPORT → REPORT
// ---------------------------------------------------------------------------

const PHASE = {
  SETUP:          'setup',
  LOADING_Q:      'loading_q',
  ANSWERING:      'answering',
  LOADING_EVAL:   'loading_eval',
  SHOW_EVAL:      'show_eval',
  LOADING_REPORT: 'loading_report',
  REPORT:         'report',
}

const initialSetup = {
  jobRole:        '',
  difficulty:     'medium',
  totalQuestions: 5,
}

export default function InterviewPage() {
  const [setup, setSetup]           = useState(initialSetup)
  const [phase, setPhase]           = useState(PHASE.SETUP)
  const [currentQuestion, setCurrent]     = useState('')
  const [questionNumber, setQNum]         = useState(1)
  const [totalQuestions, setTotalQ]       = useState(5)
  const [answer, setAnswer]               = useState('')
  const [evaluation, setEvaluation]       = useState(null)
  const [allEvaluations, setAllEvals]     = useState([])
  const [report, setReport]               = useState(null)
  const [error, setError]                 = useState('')

  const prevQs = useRef([])
  const prevAs = useRef([])

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const extractErrorMsg = (err) =>
    err?.response?.data?.error || err?.message || 'An unexpected error occurred.'

  // ---------------------------------------------------------------------------
  // Phase transitions  (ALL LOGIC IDENTICAL — only JSX changes below)
  // ---------------------------------------------------------------------------

  const handleStartInterview = async (e) => {
    e.preventDefault()
    if (!setup.jobRole) { setError('Please select a job role.'); return }

    setError('')
    setPhase(PHASE.LOADING_Q)
    prevQs.current = []
    prevAs.current = []
    setAllEvals([])
    setAnswer('')

    try {
      const res = await startInterview({
        jobRole:        setup.jobRole,
        difficulty:     setup.difficulty,
        totalQuestions: Number(setup.totalQuestions),
      })
      setCurrent(res.question)
      setQNum(res.question_number)
      setTotalQ(res.total_questions)
      setPhase(PHASE.ANSWERING)
    } catch (err) {
      setError(extractErrorMsg(err))
      setPhase(PHASE.SETUP)
    }
  }

  const handleSubmitAnswer = async (e) => {
    e.preventDefault()
    if (!answer.trim()) { setError('Please enter your answer.'); return }

    setError('')
    setPhase(PHASE.LOADING_EVAL)

    const questionsWithCurrent = [...prevQs.current, currentQuestion]
    const answersWithCurrent   = [...prevAs.current, answer.trim()]

    try {
      const res = await submitAnswer({
        jobRole:           setup.jobRole,
        difficulty:        setup.difficulty,
        question:          currentQuestion,
        answer:            answer.trim(),
        questionNumber,
        totalQuestions,
        previousQuestions: questionsWithCurrent,
        previousAnswers:   answersWithCurrent,
      })

      const evalEntry = {
        question:        currentQuestion,
        answer:          answer.trim(),
        score:           res.score,
        feedback:        res.feedback,
        strengths:       res.strengths,
        missing_points:  res.missing_points,
        improved_answer: res.improved_answer,
      }
      const updatedEvals = [...allEvaluations, evalEntry]
      setAllEvals(updatedEvals)
      setEvaluation(res)

      prevQs.current = questionsWithCurrent
      prevAs.current = answersWithCurrent

      setPhase(PHASE.SHOW_EVAL)

      if (res.is_complete) {
        setTimeout(() => fetchReport(setup.jobRole, updatedEvals), 800)
      }
    } catch (err) {
      setError(extractErrorMsg(err))
      setPhase(PHASE.ANSWERING)
    }
  }

  const handleNextQuestion = () => {
    if (!evaluation || !evaluation.next_question) return
    setCurrent(evaluation.next_question)
    setQNum((n) => n + 1)
    setAnswer('')
    setEvaluation(null)
    setError('')
    setPhase(PHASE.ANSWERING)
  }

  const fetchReport = async (jobRole, evaluations) => {
    setPhase(PHASE.LOADING_REPORT)
    try {
      const res = await getInterviewReport({ jobRole, evaluations })
      setReport(res)
      setPhase(PHASE.REPORT)
    } catch (err) {
      setError(extractErrorMsg(err))
      setPhase(PHASE.SHOW_EVAL)
    }
  }

  const handleReset = () => {
    setSetup(initialSetup)
    setPhase(PHASE.SETUP)
    setCurrent('')
    setQNum(1)
    setTotalQ(5)
    setAnswer('')
    setEvaluation(null)
    setAllEvals([])
    setReport(null)
    setError('')
    prevQs.current = []
    prevAs.current = []
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (phase === PHASE.SETUP) {
    return (
      <div className="layout">
        {/* Hero */}
        <div className="hero">
          <div className="hero__eyebrow">IBM Granite AI</div>
          <h1 className="hero__title">
            Ace Your Next<br /><span>Technical Interview</span>
          </h1>
          <p className="hero__sub">
            Practice smarter with AI-generated questions tailored to your target role.
            Get instant feedback, scoring, and a personalised performance report.
          </p>
          <div className="hero__features">
            <span className="hero__feature">✦ Role-specific questions</span>
            <span className="hero__feature">✦ AI answer evaluation</span>
            <span className="hero__feature">✦ Performance report</span>
          </div>
        </div>

        {/* Setup card */}
        <div className="card card--elevated">
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>
              Configure Your Interview
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Choose a role and IBM Granite will generate real interview questions for you.
            </p>
          </div>

          {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleStartInterview}>
            {/* Role grid */}
            <div className="form-group">
              <div className="form-label">
                Job Role <span style={{ color: 'var(--danger)' }}>*</span>
              </div>
              <div className="role-grid">
                {ROLES.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    className={`role-card${setup.jobRole === r.label ? ' selected' : ''}`}
                    onClick={() => setSetup(s => ({ ...s, jobRole: r.label }))}
                  >
                    <span className="role-card__icon">{r.icon}</span>
                    <span className="role-card__label">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="form-group">
              <div className="form-label">Difficulty</div>
              <div className="diff-pills">
                {DIFFICULTY_OPTS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`diff-pill${setup.difficulty === d.value ? ' selected' : ''}`}
                    onClick={() => setSetup(s => ({ ...s, difficulty: d.value }))}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.dot, display: 'inline-block', flexShrink: 0 }} />
                    {d.label}
                    <span style={{ fontSize: '0.7rem', color: setup.difficulty === d.value ? 'rgba(255,255,255,0.65)' : 'var(--muted-light)', fontWeight: 400 }}>
                      — {d.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of questions */}
            <div className="form-group">
              <div className="form-label">Number of Questions</div>
              <div className="qcount-pills">
                {TOTAL_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`qcount-pill${setup.totalQuestions === n ? ' selected' : ''}`}
                    onClick={() => setSetup(s => ({ ...s, totalQuestions: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="form-hint">
                Each question is generated by AI and evaluated individually.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-navy btn-lg btn-block"
              disabled={!setup.jobRole}
              style={{ marginTop: '0.75rem' }}
            >
              Start Interview →
            </button>
          </form>
        </div>

        {/* How it works */}
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <div className="card__title">How It Works</div>
          <ol className="steps-list">
            <li>Select a <strong>job role</strong> and difficulty level.</li>
            <li>IBM Granite AI <strong>generates a tailored question</strong> for that role.</li>
            <li>Type your answer and click <strong>Submit Answer</strong>.</li>
            <li>AI scores your answer and gives <strong>detailed feedback</strong>.</li>
            <li>AI generates the <strong>next contextual question</strong>.</li>
            <li>After all questions, receive a <strong>full performance report</strong>.</li>
          </ol>
        </div>
      </div>
    )
  }

  // ── Loading screens ────────────────────────────────────────────────────────
  if (phase === PHASE.LOADING_Q) {
    return (
      <div className="layout">
        <LoadingSpinner message={`Generating your first ${setup.jobRole} question…`} />
      </div>
    )
  }

  if (phase === PHASE.LOADING_EVAL) {
    return (
      <div className="layout">
        <LoadingSpinner message="Evaluating your answer with IBM Granite…" />
      </div>
    )
  }

  if (phase === PHASE.LOADING_REPORT) {
    return (
      <div className="layout">
        <LoadingSpinner message="Generating your final interview report…" />
      </div>
    )
  }

  // ── Answering screen ───────────────────────────────────────────────────────
  if (phase === PHASE.ANSWERING) {
    const pct = Math.round(((questionNumber - 1) / totalQuestions) * 100)
    const diffColor = setup.difficulty === 'easy' ? 'badge-green' : setup.difficulty === 'hard' ? 'badge-red' : 'badge-yellow'

    return (
      <div className="layout">
        {/* Top bar */}
        <div className="interview-topbar">
          <div className="interview-topbar__left">
            <div className="interview-topbar__role">{setup.jobRole}</div>
            <div className="interview-topbar__meta">
              <span className={`badge ${diffColor}`}>{setup.difficulty}</span>
              <span>·</span>
              <span>IBM Granite AI</span>
            </div>
          </div>
          <div className="interview-topbar__qcount">
            Question {questionNumber} / {totalQuestions}
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>

        <div className="card card--elevated">
          {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

          {/* AI-generated question */}
          <div className="question-box">
            <div className="question-box__label">Interview Question</div>
            <div className="question-box__text">{currentQuestion}</div>
          </div>

          {/* Answer area */}
          <form onSubmit={handleSubmitAnswer}>
            <div className="form-group">
              <label className="form-label" htmlFor="answer" style={{ fontSize: '0.8rem' }}>
                Your Answer
              </label>
              <textarea
                id="answer"
                className="answer-textarea"
                placeholder="Type your answer here…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={5000}
                autoFocus
              />
              <div className="char-count">{answer.length} / 5000</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={!answer.trim()}
                style={{ flex: '1 1 auto' }}
              >
                Submit Answer →
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
                style={{ alignSelf: 'center' }}
              >
                Abandon
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── Show evaluation result ─────────────────────────────────────────────────
  if (phase === PHASE.SHOW_EVAL && evaluation) {
    const isLast     = evaluation.is_complete
    const diffColor  = setup.difficulty === 'easy' ? 'badge-green' : setup.difficulty === 'hard' ? 'badge-red' : 'badge-yellow'
    const pct        = Math.round((questionNumber / totalQuestions) * 100)

    return (
      <div className="layout">
        {/* Top bar */}
        <div className="interview-topbar">
          <div className="interview-topbar__left">
            <div className="interview-topbar__role">{setup.jobRole}</div>
            <div className="interview-topbar__meta">
              <span className={`badge ${diffColor}`}>{setup.difficulty}</span>
            </div>
          </div>
          <div className="interview-topbar__qcount">
            Question {questionNumber} / {totalQuestions}
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>

        {/* Question recap */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="question-box" style={{ marginBottom: 0 }}>
            <div className="question-box__label">Question {questionNumber}</div>
            <div className="question-box__text">{currentQuestion}</div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '0.4rem' }}>
              Your Answer
            </div>
            <div className="answer-recap">
              {prevAs.current[prevAs.current.length - 1] || answer}
            </div>
          </div>
        </div>

        <EvaluationResult result={evaluation} />

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {/* Navigation buttons */}
        <div className="btn-group" style={{ marginTop: '1.25rem' }}>
          {!isLast && evaluation.next_question && (
            <button className="btn btn-navy btn-lg" onClick={handleNextQuestion}>
              Next Question ({questionNumber + 1}/{totalQuestions}) →
            </button>
          )}
          {isLast && phase === PHASE.SHOW_EVAL && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => fetchReport(setup.jobRole, allEvaluations)}
            >
              View Final Report →
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={handleReset} style={{ marginLeft: 'auto' }}>
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // ── Final report ───────────────────────────────────────────────────────────
  if (phase === PHASE.REPORT && report) {
    const diffColor = setup.difficulty === 'easy' ? 'badge-green' : setup.difficulty === 'hard' ? 'badge-red' : 'badge-yellow'

    return (
      <div className="layout">
        {/* Hero bar */}
        <div style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem 2.5rem',
          marginBottom: '1.75rem',
          color: '#fff',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
            Interview Complete
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Well done! 🎉
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{setup.jobRole}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span className={`badge ${diffColor}`}>{setup.difficulty}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{totalQuestions} questions</span>
          </div>
        </div>

        <FinalReport
          report={report}
          evaluations={allEvaluations}
          jobRole={setup.jobRole}
          onReset={handleReset}
        />
      </div>
    )
  }

  return null
}
