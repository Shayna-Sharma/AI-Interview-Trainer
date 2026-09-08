import React from 'react'

const CIRCUMFERENCE = 2 * Math.PI * 55

function getColor(score) {
  if (score >= 8) return '#16a34a'
  if (score >= 5.5) return '#d97706'
  return '#dc2626'
}

function getGrade(score) {
  if (score >= 9) return { label: 'Excellent', cls: 'badge-green' }
  if (score >= 7.5) return { label: 'Good', cls: 'badge-green' }
  if (score >= 5.5) return { label: 'Fair', cls: 'badge-yellow' }
  return { label: 'Needs Work', cls: 'badge-red' }
}

export default function ScoreRing({ score = 0 }) {
  const pct    = (score / 10) * 100
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE
  const color  = getColor(score)
  const grade  = getGrade(score)

  return (
    <div className="score-ring-wrap">
      <div className="score-ring">
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle
            className="score-ring__track"
            cx="70" cy="70" r="55"
            strokeWidth="10"
          />
          <circle
            className="score-ring__fill"
            cx="70" cy="70" r="55"
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>

        <div className="score-ring__label">
          <span className="score-ring__num" style={{ color }}>{score}</span>
          <span className="score-ring__max">/10</span>
        </div>
      </div>

      <span className={`badge score-grade ${grade.cls}`}>{grade.label}</span>
    </div>
  )
}
