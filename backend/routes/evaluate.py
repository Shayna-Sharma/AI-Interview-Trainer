"""
Legacy evaluation routes — kept for backwards compatibility.
New interview flow uses routes/interview.py.
"""

import logging
import traceback

from flask import Blueprint, request, jsonify
from services.ibm_watson import (
    evaluate_answer,
    generate_questions,
    generate_final_report,
)
from database import save_evaluation, get_history

logger = logging.getLogger(__name__)

evaluate_bp = Blueprint("evaluate", __name__)


# ---------------------------------------------------------------------------
# POST /api/evaluate
# ---------------------------------------------------------------------------
@evaluate_bp.route("/evaluate", methods=["POST"])
def evaluate():
    data = request.get_json(force=True, silent=True) or {}

    question   = (data.get("question")   or "").strip()
    answer     = (data.get("answer")     or "").strip()
    role       = (data.get("role")       or "").strip()
    difficulty = (data.get("difficulty") or "medium").strip().lower()

    if not question:
        return jsonify({"error": "Interview question is required."}), 400
    if not answer:
        return jsonify({"error": "Candidate answer is required."}), 400
    if len(question) > 2000:
        return jsonify({"error": "Question is too long (max 2000 characters)."}), 400
    if len(answer) > 5000:
        return jsonify({"error": "Answer is too long (max 5000 characters)."}), 400
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    try:
        result = evaluate_answer(question, answer, role, difficulty)
    except ValueError as exc:
        logger.error("evaluate_answer ValueError: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        logger.error("evaluate_answer RuntimeError: %s\n%s", exc, traceback.format_exc())
        error_msg = str(exc)
        if "401" in error_msg or "403" in error_msg:
            return jsonify({"error": "IBM authentication failed. Check your IBM_API_KEY in backend/.env."}), 401
        return jsonify({"error": f"AI service error: {error_msg}"}), 502
    except Exception as exc:
        logger.error("evaluate_answer unexpected: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": f"Unexpected error: {str(exc)}"}), 500

    try:
        row_id = save_evaluation(
            question, answer, role, difficulty, result.get("score", 0), result
        )
        result["id"] = row_id
    except Exception as exc:
        logger.warning("DB save failed (non-fatal): %s", exc)

    return jsonify(result), 200


# ---------------------------------------------------------------------------
# POST /api/generate-questions  (legacy)
# ---------------------------------------------------------------------------
@evaluate_bp.route("/generate-questions", methods=["POST"])
def generate_interview_questions():
    data = request.get_json(force=True, silent=True) or {}

    candidate_profile = (data.get("candidate_profile") or "").strip()
    job_role          = (data.get("job_role") or "Software Engineer").strip()

    if not candidate_profile:
        return jsonify({"error": "Candidate profile is required."}), 400

    try:
        result = generate_questions(candidate_profile, job_role)
        return jsonify(result), 200
    except ValueError as exc:
        logger.error("generate_questions ValueError: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        logger.error("generate_questions RuntimeError: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        logger.error("generate_questions unexpected: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": f"Unexpected error: {str(exc)}"}), 500


# ---------------------------------------------------------------------------
# POST /api/final-report  (legacy)
# ---------------------------------------------------------------------------
@evaluate_bp.route("/final-report", methods=["POST"])
def final_report():
    data = request.get_json(force=True, silent=True) or {}

    job_role    = (data.get("job_role") or "Software Engineer").strip()
    evaluations = data.get("evaluations") or []

    if not evaluations:
        return jsonify({"error": "At least one evaluation is required."}), 400

    try:
        result = generate_final_report(job_role, evaluations)
        return jsonify(result), 200
    except ValueError as exc:
        logger.error("generate_final_report ValueError: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        logger.error("generate_final_report RuntimeError: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        logger.error("generate_final_report unexpected: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": f"Unexpected error: {str(exc)}"}), 500


# ---------------------------------------------------------------------------
# GET /api/history
# ---------------------------------------------------------------------------
@evaluate_bp.route("/history", methods=["GET"])
def history():
    try:
        limit = min(int(request.args.get("limit", 20)), 100)
    except (TypeError, ValueError):
        limit = 20

    try:
        records = get_history(limit)
    except Exception as exc:
        logger.error("get_history failed: %s\n%s", exc, traceback.format_exc())
        return jsonify({"error": str(exc)}), 500

    return jsonify(records), 200
