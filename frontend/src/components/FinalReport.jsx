import React, { useState } from 'react'

function scoreColor(s) {
  if (s >= 8) return 'var(--success)'
  if (s >= 5.5) return 'var(--warning)'
  return 'var(--danger)'
}

function ScoreBar({ score }) {
  const pct = Math.round((score / 10) * 100)
  const color = scoreColor(score)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 800, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>/10</span>
      </div>
      <div className="score-bar-wrap">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/**
 * Props:
 *   report        — { overall_score, strengths, weak_areas, recommended_topics, improvement_plan }
 *   evaluations   — array of { question, answer, score, ... }
 *   jobRole       — string
 *   onReset       — () => void
 */
export default function FinalReport({ report, evaluations = [], jobRole, onReset }) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const {
    overall_score = 0,
    strengths = [],
    weak_areas = [],
    recommended_topics = [],
    improvement_plan = [],
  } = report

  const avgScore = evaluations.length
    ? Math.round((evaluations.reduce((s, e) => s + (e.score || 0), 0) / evaluations.length) * 10) / 10
    : overall_score

  return (
    <div>
      {/* ── Score card ─────────────────────────────────────────── */}
      <div className="card card--elevated" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: '0.3rem' }}>
              Overall Performance
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              {jobRole}
            </div>
            <ScoreBar score={overall_score} />
          </div>

          {/* Stats */}
          <div className="stats-row" style={{ flex: 'none' }}>
            <div className="stat-card">
              <div className="stat-card__value">{evaluations.length}</div>
              <div className="stat-card__label">Questions</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: scoreColor(avgScore) }}>{avgScore}</div>
              <div className="stat-card__label">Avg Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: scoreColor(overall_score) }}>{overall_score}</div>
              <div className="stat-card__label">Final</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Report details ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card__title">Interview Report</div>

        {strengths.length > 0 && (
          <div className="result-section">
            <div className="result-section__header" style={{ color: 'var(--success)' }}>
              <span>✓</span> Strengths
            </div>
            <ul className="pill-list pill-list--green">
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {weak_areas.length > 0 && (
          <div className="result-section">
            <div className="result-section__header" style={{ color: 'var(--warning)' }}>
              <span>⚠</span> Areas to Improve
            </div>
            <ul className="pill-list pill-list--orange">
              {weak_areas.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {recommended_topics.length > 0 && (
          <div className="result-section">
            <div className="result-section__header" style={{ color: 'var(--accent)' }}>
              <span>📚</span> Recommended Topics
            </div>
            <ul className="pill-list pill-list--blue">
              {recommended_topics.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {improvement_plan.length > 0 && (
          <div className="result-section">
            <div className="result-section__header" style={{ color: 'var(--text-2)' }}>
              <span>🗺</span> Improvement Plan
            </div>
            <ol style={{ paddingLeft: '1.3rem', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.75 }}>
              {improvement_plan.map((step, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{step}</li>)}
            </ol>
          </div>
        )}
      </div>

      {/* ── Per-question breakdown ─────────────────────────────── */}
      {evaluations.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}
            onClick={() => setShowBreakdown(v => !v)}
          >
            <div className="card__title" style={{ marginBottom: showBreakdown ? '1.2rem' : 0, justifyContent: 'space-between' }}>
              <span>Question Breakdown ({evaluations.length})</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--muted-light)' }}>{showBreakdown ? '▲' : '▼'}</span>
            </div>
          </button>

          {showBreakdown && evaluations.map((ev, idx) => (
            <div
              key={idx}
              style={{
                marginTop: idx > 0 ? '1.25rem' : 0,
                paddingTop: idx > 0 ? '1.25rem' : 0,
                borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>
                    Question {idx + 1}
                  </div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55, marginBottom: '0.5rem' }}>
                    {ev.question}
                  </p>
                  {ev.feedback && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>{ev.feedback}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    className={`badge ${ev.score >= 8 ? 'badge-green' : ev.score >= 5.5 ? 'badge-yellow' : 'badge-red'}`}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.7rem' }}
                  >
                    {ev.score}/10
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="btn-group">
        <button className="btn btn-navy btn-lg" onClick={onReset}>
          Start New Interview
        </button>
      </div>
    </div>
  )
}
