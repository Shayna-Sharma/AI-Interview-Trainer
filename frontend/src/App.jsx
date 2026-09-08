import React, { useState } from 'react'
import Header from './components/Header'
import InterviewPage from './pages/InterviewPage'
import HistoryPage from './pages/HistoryPage'
import './components/styles.css'

export default function App() {
  const [page, setPage] = useState('interview')

  return (
    <>
      <Header page={page} setPage={setPage} />
      {page === 'interview' ? <InterviewPage /> : <HistoryPage />}
    </>
  )
}
