import React from 'react'
import ScoreRing from './ScoreRing'

export default function EvaluationResult({ result, onReset, showResetLabel }) {
  const {
    score = 0,
    strengths = [],
    missing_points = [],
    feedback = '',
    improved_answer = '',
  } = result

  return (
    <div className="card card--elevated" style={{ marginTop: '1.25rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: '0.25rem' }}>
            AI Evaluation
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Answer Feedback
          </div>
        </div>
        <ScoreRing score={score} />
      </div>

      <hr className="divider" style={{ margin: '0 0 1.25rem' }} />

      {/* Feedback */}
      {feedback && (
        <div className="result-section">
          <div className="result-section__header" style={{ color: 'var(--text-2)' }}>
            <span>💬</span> AI Feedback
          </div>
          <p>{feedback}</p>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="result-section">
          <div className="result-section__header" style={{ color: 'var(--success)' }}>
            <span>✓</span> Strengths
          </div>
          <ul className="pill-list pill-list--green">
            {strengths.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {/* Missing points */}
      {missing_points.length > 0 && (
        <div className="result-section">
          <div className="result-section__header" style={{ color: 'var(--warning)' }}>
            <span>⚠</span> Areas to Improve
          </div>
          <ul className="pill-list pill-list--orange">
            {missing_points.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {/* Improved answer */}
      {improved_answer && (
        <div className="result-section">
          <div className="result-section__header" style={{ color: 'var(--accent)' }}>
            <span>💡</span> Model Answer
          </div>
          <div className="suggested-box">{improved_answer}</div>
        </div>
      )}

      {onReset && (
        <div className="btn-group">
          <button className="btn btn-ghost btn-sm" onClick={onReset}>
            {showResetLabel || '↩ Abandon Interview'}
          </button>
        </div>
      )}
    </div>
  )
}
