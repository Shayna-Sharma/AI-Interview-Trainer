# AI Interview Trainer

An AI-powered interview preparation application that helps candidates practice role-specific interviews, receive AI-based answer evaluation and feedback, and continue through a dynamic interview experience.

## 📌 Project Overview

The **AI Interview Trainer** is designed to provide an interactive and personalized interview practice environment.

Instead of depending only on static question banks, the application uses **IBM Granite** to generate relevant interview questions and evaluate candidate responses.

The user selects a job role and difficulty level, answers the generated interview questions, and receives AI-generated evaluation, scoring, feedback, and the next relevant question.

## 🎯 Problem Statement

Candidates often prepare for technical interviews using generic question banks and have limited opportunities to receive immediate, personalized feedback on their answers.

The AI Interview Trainer aims to address this problem by providing an AI-powered environment where candidates can:

* Practice interviews based on their selected job role.
* Select an appropriate difficulty level.
* Receive dynamically generated interview questions.
* Submit answers for AI-based evaluation.
* Receive scores, strengths, weaknesses, and improvement feedback.
* Continue the interview with relevant follow-up questions.
* Review their overall interview performance.

## ✨ Key Features

### Role-Based Interview Questions

Users can select their desired job role, allowing the system to generate questions relevant to that role.

### Difficulty Selection

The interview can be customized according to the selected difficulty level.

### AI Question Generation

IBM Granite is used to generate contextual and role-specific interview questions.

### Answer Evaluation

The system analyzes candidate responses and provides an AI-generated evaluation.

### Scoring and Feedback

Candidates receive scores along with strengths, weaknesses, and actionable feedback.

### Adaptive Interview Flow

The system can generate the next relevant question based on the ongoing interview context.

### Performance Report

The application provides an overall summary of the candidate's interview performance and areas for improvement.

## 🧠 Role of IBM Granite

IBM Granite provides the core AI capabilities used by the application.

It is used for:

* Interview question generation
* Natural language understanding
* Candidate answer evaluation
* Scoring and feedback generation
* Context-aware next-question generation

## 🤖 Role of IBM Bob

**IBM Bob** was used as an AI-assisted development platform during the development of the project.

It supported the development process through:

* Project and code generation
* Backend and frontend development assistance
* Debugging and error resolution
* Code refinement
* Feature implementation
* Testing and improvement of the application

IBM Bob is part of the **development workflow**, while IBM Granite provides the AI capabilities used by the application.

## 🏗️ System Architecture

The application follows a frontend-backend-AI architecture:

```text
User
  ↓
React.js Frontend
  ↓
REST API
  ↓
Flask / Python Backend
  ↓
IBM Granite
  ↓
AI Generated Question / Evaluation / Feedback
  ↓
React.js Frontend
  ↓
User
```

### Main Components

**Frontend**

* React.js
* Vite
* Interview interface
* Answer input
* Evaluation results
* Performance report

**Backend**

* Python
* Flask
* REST APIs
* Interview logic
* Evaluation logic

**AI Layer**

* IBM Granite
* Question generation
* Answer evaluation
* Scoring
* Feedback
* Next-question generation

## 🛠️ Technology Stack

| Technology   | Purpose                                      |
| ------------ | -------------------------------------------- |
| React.js     | Frontend development                         |
| Vite         | Frontend development and build tooling       |
| Python       | Backend and application logic                |
| Flask        | Backend REST APIs                            |
| IBM Granite  | AI question generation and answer evaluation |
| REST API     | Frontend-backend communication               |
| Git & GitHub | Version control and project repository       |
| IBM Bob      | AI-assisted development                      |

## 📁 Project Structure

```text
AI-Interview-Trainer/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── docs/
│   ├── problemstatement.pdf
│   └── AI-Interview-Trainer-Presentation.pptx
│
├── README.md
└── .gitignore
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Shayna-Sharma/AI-Interview-Trainer.git
cd AI-Interview-Trainer
```

### 2. Backend Setup

Create and activate a Python virtual environment.

On Windows:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Install the required Python packages:

```powershell
pip install -r backend/requirements.txt
```

### 3. Configure IBM API Key

Create a `.env` file inside the `backend` folder:

```text
backend/.env
```

Add your IBM API key:

```text
IBM_API_KEY=your_api_key_here
```

**Do not upload the actual `.env` file or API key to GitHub.**

The repository contains `.env.example` as a template.

### 4. Start the Backend

From the project root:

```powershell
python backend/app.py
```

The Flask backend should start locally.

### 5. Start the Frontend

Open another terminal and navigate to the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite in your browser.

## 🔐 Security

Sensitive credentials are not included in the repository.

The following files and folders should remain excluded through `.gitignore`:

```text
backend/.env
venv/
node_modules/
```

Only the environment variable template is included:

```text
backend/.env.example
```

## 🚀 Future Scope

Future versions of the AI Interview Trainer can include:

* Voice-based interview interaction
* Speech and communication analysis
* More advanced personalized interviews
* Dynamic difficulty adjustment
* Detailed interview analytics
* Additional job roles and interview categories
* Improved performance tracking

## 📄 Project Documents

Project-related documents are available in the `docs` folder:

* **Problem Statement:** `docs/problemstatement.pdf`
* **Project Presentation:** `docs/AI-Interview-Trainer-Presentation.pptx`

## 👩‍💻 Project

**Project:** AI Interview Trainer

**Technology:** React.js + Flask/Python + IBM Granite

**Development Assistance:** IBM Bob

**Repository:**
https://github.com/Shayna-Sharma/AI-Interview-Trainer
