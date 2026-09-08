"""
AI Interview flow routes.

POST /api/interview/start
    → AI generates the first question for the selected job role + difficulty.

POST /api/interview/answer
    → AI evaluates the answer and generates the next question (or signals completion).

POST /api/interview/report
    → AI generates a final interview report from all evaluations.
"""

import logging
import traceback

from flask import Blueprint, request, jsonify
from services.ibm_watson import (
    generate_first_question,
    generate_next_question,
    evaluate_answer,
    generate_final_report,
)
from database import save_evaluation

logger = logging.getLogger(__name__)

interview_bp = Blueprint("interview", __name__)

# Total number of questions per interview session.
DEFAULT_TOTAL_QUESTIONS = 5

VALID_DIFFICULTIES = ("easy", "medium", "hard")

VALID_ROLES = [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Data Scientist",
    "Python Developer",
    "Java Developer",
    "Web Developer",
    "DevOps Engineer",
    "Product Manager",
    "Business Analyst",
    "UX Designer",
    "Machine Learning Engineer",
    "Cloud Engineer",
    "Cybersecurity Analyst",
    "Other",
]


def _clean_str(value, default=""):
    return (value or default).strip()


def _log_and_respond_error(exc, label, status=502):
    logger.error("%s failed:\n%s\n%s", label, exc, traceback.format_exc())
    msg = str(exc)
    if "not configured" in msg.lower() or "api key" in msg.lower():
        return jsonify({
            "error": (
                "IBM_API_KEY is not configured. "
                "Open backend/.env and add your real IBM Cloud API key. "
                "Get one at: https://cloud.ibm.com/iam/apikeys"
            )
        }), 400
    if "401" in msg or "403" in msg:
        return jsonify({
            "error": "IBM authentication failed. Check IBM_API_KEY in backend/.env."
        }), 401
    return jsonify({"error": f"AI service error: {msg}"}), status


# ---------------------------------------------------------------------------
# POST /api/interview/start
# ---------------------------------------------------------------------------
@interview_bp.route("/interview/start", methods=["POST"])
def interview_start():
    """
    Start a new interview session.

    Request JSON:
        {
            "job_role":   "Python Developer",
            "difficulty": "medium",            // optional, default "medium"
            "total_questions": 5               // optional, default 5
        }

    Response JSON (200):
        {
            "question":         "...",
            "question_number":  1,
            "total_questions":  5,
            "job_role":         "Python Developer",
            "difficulty":       "medium"
        }

    Error response (400 / 401 / 502):
        { "error": "..." }
    """
    data = request.get_json(force=True, silent=True) or {}

    job_role   = _clean_str(data.get("job_role"), "Software Engineer")
    difficulty = _clean_str(data.get("difficulty"), "medium").lower()
    if difficulty not in VALID_DIFFICULTIES:
        difficulty = "medium"

    try:
        total_questions = int(data.get("total_questions", DEFAULT_TOTAL_QUESTIONS))
        total_questions = max(1, min(10, total_questions))
    except (TypeError, ValueError):
        total_questions = DEFAULT_TOTAL_QUESTIONS

    logger.info(
        "interview/start: role=%r difficulty=%r total_questions=%d",
        job_role, difficulty, total_questions
    )

    try:
        result = generate_first_question(job_role, difficulty)
    except ValueError as exc:
        return _log_and_respond_error(exc, "generate_first_question", 400)
    except Exception as exc:
        return _log_and_respond_error(exc, "generate_first_question", 502)

    return jsonify({
        "question":        result["question"],
        "question_number": 1,
        "total_questions": total_questions,
        "job_role":        job_role,
        "difficulty":      difficulty,
    }), 200


# ---------------------------------------------------------------------------
# POST /api/interview/answer
# ---------------------------------------------------------------------------
@interview_bp.route("/interview/answer", methods=["POST"])
def interview_answer():
    """
    Submit an answer; get evaluation and the next question (or completion flag).

    Request JSON:
        {
            "job_role":           "Python Developer",
            "difficulty":         "medium",
            "question":           "...",
            "answer":             "...",
            "question_number":    2,
            "total_questions":    5,
            "previous_questions": ["q1", "q2", ...],  // all questions so far incl. current
            "previous_answers":   ["a1", "a2", ...]   // all answers so far incl. current
        }

    Response JSON (200) — mid-interview:
        {
            "score":          7,
            "feedback":       "...",
            "strengths":      [...],
            "missing_points": [...],
            "improved_answer":"...",
            "next_question":  "...",
            "question_number": 3,
            "total_questions": 5,
            "is_complete":    false
        }

    Response JSON (200) — final answer:
        {
            "score":          8,
            "feedback":       "...",
            "strengths":      [...],
            "missing_points": [...],
            "improved_answer":"...",
            "next_question":  null,
            "question_number": 5,
            "total_questions": 5,
            "is_complete":    true
        }

    Error response (400 / 401 / 502):
        { "error": "..." }
    """
    data = request.get_json(force=True, silent=True) or {}

    job_role   = _clean_str(data.get("job_role"), "Software Engineer")
    difficulty = _clean_str(data.get("difficulty"), "medium").lower()
    question   = _clean_str(data.get("question"))
    answer     = _clean_str(data.get("answer"))

    if difficulty not in VALID_DIFFICULTIES:
        difficulty = "medium"

    if not question:
        return jsonify({"error": "Field 'question' is required."}), 400
    if not answer:
        return jsonify({"error": "Field 'answer' is required."}), 400
    if len(question) > 2000:
        return jsonify({"error": "Question exceeds 2000 characters."}), 400
    if len(answer) > 5000:
        return jsonify({"error": "Answer exceeds 5000 characters."}), 400

    try:
        question_number = int(data.get("question_number", 1))
        total_questions = int(data.get("total_questions", DEFAULT_TOTAL_QUESTIONS))
        total_questions = max(1, min(10, total_questions))
        question_number = max(1, min(total_questions, question_number))
    except (TypeError, ValueError):
        question_number = 1
        total_questions = DEFAULT_TOTAL_QUESTIONS

    previous_questions = data.get("previous_questions") or []
    previous_answers   = data.get("previous_answers")   or []

    # Ensure these are lists of strings.
    previous_questions = [str(q) for q in previous_questions if q]
    previous_answers   = [str(a) for a in previous_answers   if a]

    logger.info(
        "interview/answer: role=%r diff=%r q_num=%d/%d",
        job_role, difficulty, question_number, total_questions,
    )

    # Step 1 — Evaluate the answer.
    try:
        evaluation = evaluate_answer(question, answer, job_role, difficulty)
    except ValueError as exc:
        return _log_and_respond_error(exc, "evaluate_answer", 400)
    except Exception as exc:
        return _log_and_respond_error(exc, "evaluate_answer", 502)

    # Persist to DB (non-fatal).
    try:
        row_id = save_evaluation(
            question, answer, job_role, difficulty,
            evaluation.get("score", 0), evaluation
        )
        evaluation["id"] = row_id
    except Exception as exc:
        logger.warning("DB save failed (non-fatal): %s", exc)

    is_complete   = (question_number >= total_questions)
    next_question = None
    next_q_number = question_number + 1

    # Step 2 — Generate next question if not done.
    if not is_complete:
        try:
            nq_result = generate_next_question(
                job_role=job_role,
                difficulty=difficulty,
                previous_questions=previous_questions,
                previous_answers=previous_answers,
                question_number=next_q_number,
                total_questions=total_questions,
            )
            next_question = nq_result["question"]
        except ValueError as exc:
            return _log_and_respond_error(exc, "generate_next_question", 400)
        except Exception as exc:
            return _log_and_respond_error(exc, "generate_next_question", 502)

    return jsonify({
        "score":           evaluation.get("score", 0),
        "feedback":        evaluation.get("feedback", ""),
        "strengths":       evaluation.get("strengths", []),
        "missing_points":  evaluation.get("missing_points", []),
        "improved_answer": evaluation.get("improved_answer", ""),
        "next_question":   next_question,
        "question_number": question_number,
        "total_questions": total_questions,
        "is_complete":     is_complete,
    }), 200


# ---------------------------------------------------------------------------
# POST /api/interview/report
# ---------------------------------------------------------------------------
@interview_bp.route("/interview/report", methods=["POST"])
def interview_report():
    """
    Generate a final interview report.

    Request JSON:
        {
            "job_role":    "Python Developer",
            "evaluations": [
                {
                    "question":        "...",
                    "answer":          "...",
                    "score":           7,
                    "feedback":        "...",
                    "strengths":       [...],
                    "missing_points":  [...],
                    "improved_answer": "..."
                },
                ...
            ]
        }

    Response JSON (200):
        {
            "overall_score":       7,
            "strengths":           [...],
            "weak_areas":          [...],
            "recommended_topics":  [...],
            "improvement_plan":    [...]
        }
    """
    data = request.get_json(force=True, silent=True) or {}

    job_role    = _clean_str(data.get("job_role"), "Software Engineer")
    evaluations = data.get("evaluations") or []

    if not isinstance(evaluations, list) or len(evaluations) == 0:
        return jsonify({"error": "At least one evaluation is required."}), 400

    logger.info("interview/report: role=%r evaluations=%d", job_role, len(evaluations))

    try:
        result = generate_final_report(job_role, evaluations)
    except ValueError as exc:
        return _log_and_respond_error(exc, "generate_final_report", 400)
    except Exception as exc:
        return _log_and_respond_error(exc, "generate_final_report", 502)

    return jsonify(result), 200
