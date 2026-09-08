import React from 'react'

export default function Header({ page, setPage }) {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__brand-icon">✦</div>
        <div className="header__brand-text">
          <span>AI Interview Trainer</span>
          <span className="header__brand-sub">Powered by IBM Granite</span>
        </div>
      </div>

      <nav className="header__nav">
        <button
          className={`header__nav-btn${page === 'interview' ? ' active' : ''}`}
          onClick={() => setPage('interview')}
        >
          Practice
        </button>
        <button
          className={`header__nav-btn${page === 'history' ? ' active' : ''}`}
          onClick={() => setPage('history')}
        >
          History
        </button>
      </nav>
    </header>
  )
}
