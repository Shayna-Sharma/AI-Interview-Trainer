# AI Interview Trainer

A full-stack AI interview practice application using React + Vite,
Python + Flask, SQLite, and IBM watsonx.ai Granite.

## Project structure

```text
AI-Interview-Trainer/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── database.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── __init__.py
│   │   └── evaluate.py
│   └── services/
│       ├── __init__.py
│       └── ibm_watson.py
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── ErrorBanner.jsx
│       │   ├── EvaluationResult.jsx
│       │   ├── Header.jsx
│       │   ├── LoadingSpinner.jsx
│       │   ├── ScoreRing.jsx
│       │   └── styles.css
│       ├── pages/
│       │   ├── InterviewPage.jsx
│       │   └── HistoryPage.jsx
│       └── services/
│           └── api.js
│
└── .gitignore
```

Do not include `.env`, `venv`, `node_modules`, `dist`, `__pycache__`,
or the SQLite database when submitting the source project.

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Put the real IBM Cloud API key in `backend/.env`:

```text
IBM_API_KEY=your_real_key_here
```

Then:

```bash
python app.py
```

Backend: `http://localhost:5000`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

The Vite development proxy sends `/api` requests to Flask.

## Main features

- User enters any interview question and answer.
- IBM Granite evaluates the supplied question/answer dynamically.
- Score from 0–10.
- Strengths, missing points, feedback and improved answer.
- Evaluation history stored in SQLite.
- IBM prompt-template endpoints for question generation and final report.

## API

`POST /api/evaluate`

```json
{
  "question": "Explain REST API.",
  "answer": "A REST API allows applications to communicate over HTTP using resources and HTTP methods.",
  "role": "Backend Developer",
  "difficulty": "medium"
}
```

The backend sends the actual runtime question and answer to IBM as prompt variables.
The response is returned to React and stored in SQLite.

## IBM deployment

Current deployment ID in `backend/config.py`:

```text
01a07830-0f21-77a6-bb18-45d8292ccff7
```

If the IBM prompt is redeployed to a new deployment, update this ID with the
new deployment's API endpoint.

Never commit the real IBM API key.
