import React from 'react'

export default function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner">
      <span className="error-banner__icon">⚠</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          className="error-banner__close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}
