import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---------------------------------------------------------------------------
// AI Interview flow
// ---------------------------------------------------------------------------

/**
 * Start an interview session.  The backend asks IBM Granite to generate
 * the first question for the selected job role.
 *
 * @param {object} params
 * @param {string} params.jobRole          e.g. "Python Developer"
 * @param {string} [params.difficulty]     "easy" | "medium" | "hard"
 * @param {number} [params.totalQuestions] default 5
 * @returns {Promise<{question:string, question_number:number, total_questions:number, job_role:string, difficulty:string}>}
 */
export async function startInterview({ jobRole, difficulty = 'medium', totalQuestions = 5 }) {
  const { data } = await api.post('/interview/start', {
    job_role:        jobRole,
    difficulty,
    total_questions: totalQuestions,
  })
  return data
}

/**
 * Submit an answer to the current question.
 * The backend evaluates it and (if not the last question) generates the next one.
 *
 * @param {object} params
 * @param {string}   params.jobRole
 * @param {string}   params.difficulty
 * @param {string}   params.question           The current question text
 * @param {string}   params.answer             The candidate's answer
 * @param {number}   params.questionNumber     1-based index of the current question
 * @param {number}   params.totalQuestions
 * @param {string[]} params.previousQuestions  All questions asked so far (including current)
 * @param {string[]} params.previousAnswers    All answers given so far (including current)
 * @returns {Promise<{
 *   score:number, feedback:string, strengths:string[], missing_points:string[],
 *   improved_answer:string, next_question:string|null,
 *   question_number:number, total_questions:number, is_complete:boolean
 * }>}
 */
export async function submitAnswer({
  jobRole,
  difficulty,
  question,
  answer,
  questionNumber,
  totalQuestions,
  previousQuestions,
  previousAnswers,
}) {
  const { data } = await api.post('/interview/answer', {
    job_role:           jobRole,
    difficulty,
    question,
    answer,
    question_number:    questionNumber,
    total_questions:    totalQuestions,
    previous_questions: previousQuestions,
    previous_answers:   previousAnswers,
  })
  return data
}

/**
 * Generate the final interview report from all completed evaluations.
 *
 * @param {object}   params
 * @param {string}   params.jobRole
 * @param {object[]} params.evaluations   Array of per-question evaluation objects
 * @returns {Promise<{overall_score:number, strengths:string[], weak_areas:string[], recommended_topics:string[], improvement_plan:string[]}>}
 */
export async function getInterviewReport({ jobRole, evaluations }) {
  const { data } = await api.post('/interview/report', {
    job_role:    jobRole,
    evaluations,
  })
  return data
}

// ---------------------------------------------------------------------------
// Legacy / individual endpoints (kept for History page)
// ---------------------------------------------------------------------------

export async function evaluateAnswer({ question, answer, role, difficulty }) {
  const { data } = await api.post('/evaluate', { question, answer, role, difficulty })
  return data
}

export async function fetchHistory(limit = 20) {
  const { data } = await api.get(`/history?limit=${limit}`)
  return data
}
