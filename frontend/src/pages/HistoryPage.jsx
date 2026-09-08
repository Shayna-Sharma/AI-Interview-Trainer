import React, { useEffect, useState } from 'react'
import { fetchHistory } from '../services/api'
import ErrorBanner from '../components/ErrorBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import EvaluationResult from '../components/EvaluationResult'

function ScoreDot({ score }) {
  const color = score >= 8 ? 'var(--success)' : score >= 5.5 ? 'var(--warning)' : 'var(--danger)'
  const cls   = score >= 8 ? 'badge-green' : score >= 5.5 ? 'badge-yellow' : 'badge-red'
  return (
    <span className={`badge ${cls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {score}/10
    </span>
  )
}

function DiffBadge({ difficulty }) {
  const map = { easy: 'badge-green', medium: 'badge-yellow', hard: 'badge-red' }
  return (
    <span className={`badge ${map[difficulty] || 'badge-blue'}`}>
      {difficulty || 'medium'}
    </span>
  )
}

export default function HistoryPage() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchHistory(50)
      .then(setRecords)
      .catch((e) => setError(e?.response?.data?.error || e.message || 'Failed to load history.'))
      .finally(() => setLoading(false))
  }, [])

  if (selected) {
    return (
      <div className="layout">
        <div style={{ marginBottom: '1.75rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelected(null)}
            style={{ marginBottom: '0.75rem', paddingLeft: 0 }}
          >
            ← Back to History
          </button>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>
            Evaluation Detail
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            {selected.question}
          </p>
        </div>
        <EvaluationResult result={selected.result} onReset={() => setSelected(null)} showResetLabel="← Back to History" />
      </div>
    )
  }

  return (
    <div className="layout">
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', marginBottom: '0.3rem' }}>
          Practice Log
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Evaluation History
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Review your past interview practice sessions and track improvement.
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {loading && <LoadingSpinner message="Loading your history…" />}

      {!loading && records.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem' }}>
            No evaluations yet
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Go to Practice, select a role, and complete your first interview.
          </p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="card card--flush">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
              Past Evaluations
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 99, padding: '0.2rem 0.65rem', fontWeight: 600 }}>
              {records.length} total
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.5rem' }}>#</th>
                  <th>Question</th>
                  <th>Role</th>
                  <th>Difficulty</th>
                  <th>Score</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--muted-light)', fontSize: '0.78rem', paddingLeft: '1.5rem' }}>
                      {r.id}
                    </td>
                    <td style={{ maxWidth: '260px' }}>
                      <span
                        title={r.question}
                        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500 }}
                      >
                        {r.question}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {r.role || '—'}
                    </td>
                    <td><DiffBadge difficulty={r.difficulty} /></td>
                    <td><ScoreDot score={r.score} /></td>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelected(r)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
