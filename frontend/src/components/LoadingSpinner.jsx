import React from 'react'

export default function LoadingSpinner({ message }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <div className="spinner-wrap__title">
        {message || 'Processing with IBM Granite AI…'}
      </div>
      <div className="spinner-wrap__sub">This may take up to 60 seconds</div>
    </div>
  )
}
