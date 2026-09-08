"""
IBM watsonx.ai Granite service.

Architecture
------------
This project uses TWO IBM endpoints:

1. _call_granite_chat()
   POST /ml/v1/text/chat  (foundation model chat API)
   Used for: generate_first_question, generate_next_question, generate_final_report
   Granite-4-h-small is an instruction-tuned chat model; the /text/generation endpoint
   returns empty text for it — the chat endpoint is required.

2. _call_granite_deployment()
   POST /ml/v1/deployments/{id}/text/generation  (prompt-template deployment)
   Used for: evaluate_answer
   The deployed prompt template is hard-wired to produce evaluate_answer JSON
   ({score, strengths, missing_points, feedback, improved_answer}), so it is
   only used for the task it was designed for.
"""

import json
import logging
import re
import time
import traceback

import requests

from config import Config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# IAM token cache
# ---------------------------------------------------------------------------

_token_cache = {
    "access_token": None,
    "expires_at": 0,
}

# ---------------------------------------------------------------------------
# Placeholder detection
# ---------------------------------------------------------------------------

_PLACEHOLDER_KEYS = frozenset({
    "",
    "<my key here>",
    "<upload your api key here>",
    "your_real_ibm_cloud_api_key_here",
    "your_api_key_here",
    "placeholder",
})


def _api_key_is_real() -> bool:
    return (
        bool(Config.IBM_API_KEY)
        and Config.IBM_API_KEY.lower().strip() not in _PLACEHOLDER_KEYS
    )


def _get_iam_token() -> str:
    """Get and cache an IBM IAM bearer token."""
    if (
        _token_cache["access_token"]
        and time.time() < _token_cache["expires_at"] - 60
    ):
        return _token_cache["access_token"]

    if not _api_key_is_real():
        raise ValueError(
            "IBM_API_KEY is not configured. "
            "Open backend/.env and replace the placeholder value with your "
            "real IBM Cloud API key (https://cloud.ibm.com/iam/apikeys)."
        )

    logger.debug("Requesting new IBM IAM token…")

    response = requests.post(
        Config.IBM_IAM_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": Config.IBM_API_KEY,
        },
        timeout=30,
    )

    if response.status_code != 200:
        logger.error(
            "IBM IAM token request failed (%s): %s",
            response.status_code,
            response.text,
        )
        raise RuntimeError(
            f"IBM IAM token request failed ({response.status_code}). "
            "Check that IBM_API_KEY in backend/.env is a valid IBM Cloud API key."
        )

    try:
        data = response.json()
        token = data["access_token"]
    except (ValueError, KeyError, TypeError) as exc:
        logger.error("IBM IAM unexpected response: %s", response.text)
        raise RuntimeError("IBM IAM returned an unexpected response.") from exc

    _token_cache["access_token"] = token
    _token_cache["expires_at"] = time.time() + int(data.get("expires_in", 3600))
    logger.debug("IBM IAM token obtained, expires in %ss", data.get("expires_in", 3600))
    return token


# ---------------------------------------------------------------------------
# Chat endpoint  (/ml/v1/text/chat)
# Used for question generation and final report.
# granite-4-h-small is a chat/instruction model; /text/generation returns
# empty output for it — chat is the correct endpoint.
# ---------------------------------------------------------------------------

def _call_granite_chat(
    system_prompt: str,
    user_message: str,
    max_new_tokens: int = 500,
    temperature: float = 0.4,
) -> str:
    """
    Call the foundation model via the chat API.
    Returns the assistant message text (stripped).
    """
    token = _get_iam_token()

    payload = {
        "model_id": Config.IBM_MODEL_ID,
        "space_id": Config.IBM_SPACE_ID,
        "messages": [
            {"role": "system",    "content": system_prompt},
            {"role": "user",      "content": user_message},
        ],
        "parameters": {
            "max_new_tokens": max_new_tokens,
            "temperature":    temperature,
        },
    }

    logger.debug(
        "Calling IBM Granite chat. model=%s user_msg_preview=%r",
        Config.IBM_MODEL_ID,
        user_message[:120],
    )

    response = requests.post(
        Config.IBM_CHAT_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        },
        json=payload,
        timeout=120,
    )

    # Refresh token once on 401.
    if response.status_code == 401:
        logger.warning("IBM 401 on chat endpoint – refreshing IAM token and retrying…")
        _token_cache["access_token"] = None
        _token_cache["expires_at"] = 0
        token = _get_iam_token()
        payload["model_id"] = Config.IBM_MODEL_ID  # unchanged but keeps payload fresh
        response = requests.post(
            Config.IBM_CHAT_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
                "Accept":        "application/json",
            },
            json=payload,
            timeout=120,
        )

    if response.status_code != 200:
        logger.error(
            "IBM Granite chat API error (%s):\n%s",
            response.status_code,
            response.text,
        )
        raise RuntimeError(
            f"IBM Granite chat API returned {response.status_code}. "
            f"Detail: {response.text[:300]}"
        )

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected IBM Granite chat response format: %s", response.text)
        raise RuntimeError(
            f"IBM Granite chat returned an unexpected response format: {response.text[:300]}"
        ) from exc

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("IBM Granite chat returned an empty response.")

    content = content.strip()
    logger.debug("IBM Granite chat response:\n%s", content)
    return content


# ---------------------------------------------------------------------------
# Deployment template endpoint  (/ml/v1/deployments/{id}/text/generation)
# Used ONLY for evaluate_answer — the template was trained for this task.
# ---------------------------------------------------------------------------

def _send_deployment_request(token: str, payload: dict) -> requests.Response:
    return requests.post(
        Config.IBM_DEPLOYMENT_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        },
        json=payload,
        timeout=120,
    )


def _call_granite_deployment(prompt_variables: dict) -> str:
    """
    Call the deployed prompt-template endpoint.
    Returns the raw generated_text string.
    """
    token = _get_iam_token()

    logger.debug(
        "Calling IBM Granite deployment. prompt_variables keys: %s",
        list(prompt_variables.keys()),
    )

    primary_payload = {
        "parameters": {
            "prompt_variables": prompt_variables,
            "max_new_tokens": 1000,
            "temperature":    0.1,
            "top_p":          0.9,
        }
    }

    response = _send_deployment_request(token, primary_payload)

    if response.status_code == 401:
        logger.warning("IBM 401 on deployment – refreshing IAM token and retrying…")
        _token_cache["access_token"] = None
        _token_cache["expires_at"] = 0
        token = _get_iam_token()
        response = _send_deployment_request(token, primary_payload)

    # Some deployment variants expect prompt_variables at the request root.
    if response.status_code == 400:
        try:
            error_text = response.text.lower()
        except Exception:
            error_text = ""
        if "prompt_variables" in error_text or "template_variables" in error_text:
            logger.debug("Retrying deployment with alternate payload shape…")
            alternate_payload = {
                "prompt_variables": prompt_variables,
                "parameters": {
                    "max_new_tokens": 1000,
                    "temperature":    0.1,
                    "top_p":          0.9,
                },
            }
            response = _send_deployment_request(token, alternate_payload)

    if response.status_code != 200:
        logger.error(
            "IBM Granite deployment API error (%s):\n%s",
            response.status_code,
            response.text,
        )
        raise RuntimeError(
            f"IBM Granite deployment returned {response.status_code}. "
            f"Detail: {response.text[:300]}"
        )

    try:
        raw = response.json()
        generated_text = raw["results"][0]["generated_text"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected IBM Granite deployment response: %s", response.text)
        raise RuntimeError(
            f"IBM Granite deployment returned an unexpected response format: "
            f"{response.text[:300]}"
        ) from exc

    if not isinstance(generated_text, str) or not generated_text.strip():
        raise RuntimeError("IBM Granite deployment returned an empty response.")

    generated_text = generated_text.strip()
    logger.debug("IBM Granite deployment raw response:\n%s", generated_text)
    return generated_text


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict:
    """Extract the first valid JSON object from a Granite output string."""
    text = text.strip()

    # Strip markdown code fences.
    text = re.sub(r"^\s*```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^\s*```\s*",     "", text)
    text = re.sub(r"\s*```\s*$",     "", text)
    text = text.strip()

    # First: try parsing the whole thing as JSON.
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # Second: find the first balanced JSON object.
    start = text.find("{")
    if start == -1:
        logger.error("No JSON object found in Granite output: %s", text[:300])
        raise RuntimeError("IBM Granite did not return JSON.")

    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : index + 1]
                try:
                    data = json.loads(candidate)
                    if isinstance(data, dict):
                        return data
                except json.JSONDecodeError:
                    pass
                break

    logger.error("Could not extract valid JSON from Granite output: %s", text[:300])
    raise RuntimeError("IBM Granite returned invalid or incomplete JSON.")


def _as_list(value) -> list:
    """Always return a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [str(value)]


def _clean_question_text(text: str) -> str:
    """
    Strip surrounding quotes, numbering (e.g. '1. '), and whitespace
    that models sometimes add around a bare question string.
    """
    text = text.strip().strip('"').strip("'").strip()
    # Remove leading numbering like "1. " or "Q1: "
    text = re.sub(r"^(Q?\d+[\.\):\-]\s*)", "", text, flags=re.IGNORECASE)
    return text.strip()


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def generate_first_question(job_role: str, difficulty: str = "medium") -> dict:
    """
    Generate the opening interview question for the given job role and difficulty.

    Uses the chat API (not the deployment template) because granite-4-h-small
    is a chat/instruction model and the /text/generation endpoint returns empty
    output for it.

    Returns: {"question": str}
    """
    system_prompt = (
        "You are an expert technical interviewer. "
        "Your task is to generate exactly ONE interview question. "
        "The question must be appropriate for the given job role and difficulty level. "
        "Output ONLY the question text — no numbering, no preamble, no explanation, "
        "no quotes around the question."
    )
    user_message = (
        f"Job role: {job_role}\n"
        f"Difficulty: {difficulty}\n"
        f"Generate one interview question for this role."
    )

    try:
        raw = _call_granite_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            max_new_tokens=150,
            temperature=0.5,
        )
    except Exception:
        logger.error("generate_first_question failed:\n%s", traceback.format_exc())
        raise

    question = _clean_question_text(raw)
    if not question:
        raise RuntimeError("IBM Granite did not return a question.")

    logger.info("Generated first question for role=%r: %r", job_role, question[:80])
    return {"question": question}


def generate_next_question(
    job_role: str,
    difficulty: str,
    previous_questions: list,
    previous_answers: list,
    question_number: int,
    total_questions: int,
) -> dict:
    """
    Generate the next contextual interview question given the conversation history.

    Returns: {"question": str}
    """
    history_lines = []
    for i, (q, a) in enumerate(zip(previous_questions, previous_answers), start=1):
        history_lines.append(f"Q{i}: {q}")
        history_lines.append(f"A{i}: {a}")
    history_text = "\n".join(history_lines) if history_lines else "No previous questions yet."

    system_prompt = (
        "You are an expert technical interviewer conducting a structured interview. "
        "Based on the previous questions and answers provided, generate the NEXT "
        "interview question. The question should be different from all previous ones "
        "and appropriate for the role and difficulty level. "
        "Output ONLY the question text — no numbering, no preamble, no explanation."
    )
    user_message = (
        f"Job role: {job_role}\n"
        f"Difficulty: {difficulty}\n"
        f"This is question {question_number} of {total_questions}.\n"
        f"Previous Q&A:\n{history_text}\n"
        f"Generate the next interview question."
    )

    try:
        raw = _call_granite_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            max_new_tokens=150,
            temperature=0.5,
        )
    except Exception:
        logger.error("generate_next_question failed:\n%s", traceback.format_exc())
        raise

    question = _clean_question_text(raw)
    if not question:
        raise RuntimeError("IBM Granite did not return the next question.")

    logger.info(
        "Generated question %d/%d for role=%r: %r",
        question_number, total_questions, job_role, question[:80],
    )
    return {"question": question}


def evaluate_answer(
    question: str,
    answer: str,
    role: str = "",
    difficulty: str = "medium",
) -> dict:
    """
    Evaluate one interview answer using the chat API.

    The chat API is used here too — it gives better role-specific evaluation
    than the hardcoded deployment template (which always outputs list-vs-tuple
    content regardless of the actual question/role).

    Returns:
        {score, strengths, missing_points, feedback, improved_answer}
    """
    system_prompt = (
        "You are an expert technical interviewer evaluating a candidate's answer. "
        "Return ONLY a valid JSON object with exactly these fields:\n"
        "  score         (integer 0-10)\n"
        "  strengths     (array of strings — what the candidate did well)\n"
        "  missing_points (array of strings — important points the candidate missed)\n"
        "  feedback      (string — concise overall feedback)\n"
        "  improved_answer (string — a model answer the candidate could give)\n"
        "No markdown fences, no extra text outside the JSON."
    )
    user_message = (
        f"Job role: {role or 'Software Engineer'}\n"
        f"Difficulty: {difficulty}\n"
        f"Interview question: {question}\n"
        f"Candidate answer: {answer}"
    )

    try:
        raw = _call_granite_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            max_new_tokens=700,
            temperature=0.1,
        )
        data = _extract_json(raw)
    except Exception:
        logger.error("evaluate_answer (chat) failed:\n%s", traceback.format_exc())
        raise

    try:
        score = float(data.get("score", 0))
    except (TypeError, ValueError):
        score = 0.0

    score = max(0.0, min(10.0, score))
    if score == int(score):
        score = int(score)

    return {
        "score":           score,
        "strengths":       _as_list(data.get("strengths")),
        "missing_points":  _as_list(data.get("missing_points")),
        "feedback":        str(data.get("feedback", "")),
        "improved_answer": str(data.get("improved_answer", "")),
    }


def generate_questions(candidate_profile: str, job_role: str) -> dict:
    """
    Generate a list of interview questions (legacy /api/generate-questions endpoint).

    Returns: {"questions": [str, ...]}
    """
    system_prompt = (
        "You are an expert technical interviewer. "
        "Generate a list of 5 interview questions for the given job role and candidate profile. "
        "Return ONLY a valid JSON object with one field: "
        '  "questions": an array of 5 question strings.\n'
        "No markdown, no extra text."
    )
    user_message = (
        f"Job role: {job_role}\n"
        f"Candidate profile: {candidate_profile}\n"
        "Generate 5 interview questions."
    )

    try:
        raw = _call_granite_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            max_new_tokens=600,
            temperature=0.4,
        )
        data = _extract_json(raw)
    except Exception:
        logger.error("generate_questions failed:\n%s", traceback.format_exc())
        raise

    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) == 0:
        raise RuntimeError("IBM Granite did not return a valid questions list.")

    return {"questions": questions}


def generate_final_report(job_role: str, evaluations: list) -> dict:
    """
    Generate a final interview report from all completed evaluations.

    Returns:
        {overall_score, strengths, weak_areas, recommended_topics, improvement_plan}
    """
    performance_data = json.dumps(evaluations, ensure_ascii=False)

    system_prompt = (
        "You are an expert technical interviewer writing a final performance report. "
        "Given the list of question-answer evaluations from a completed interview, "
        "return ONLY a valid JSON object with exactly these fields:\n"
        "  overall_score      (integer 0-10)\n"
        "  strengths          (array of strings)\n"
        "  weak_areas         (array of strings)\n"
        "  recommended_topics (array of strings — topics to study)\n"
        "  improvement_plan   (array of strings — actionable steps)\n"
        "No markdown fences, no extra text outside the JSON."
    )
    user_message = (
        f"Job role: {job_role}\n"
        f"Interview evaluations:\n{performance_data}"
    )

    try:
        raw = _call_granite_chat(
            system_prompt=system_prompt,
            user_message=user_message,
            max_new_tokens=800,
            temperature=0.1,
        )
        data = _extract_json(raw)
    except Exception:
        logger.error("generate_final_report failed:\n%s", traceback.format_exc())
        raise

    try:
        overall_score = float(data.get("overall_score", 0))
    except (TypeError, ValueError):
        overall_score = 0.0

    overall_score = max(0.0, min(10.0, overall_score))
    if overall_score == int(overall_score):
        overall_score = int(overall_score)

    return {
        "overall_score":       overall_score,
        "strengths":           _as_list(data.get("strengths")),
        "weak_areas":          _as_list(data.get("weak_areas")),
        "recommended_topics":  _as_list(data.get("recommended_topics")),
        "improvement_plan":    _as_list(data.get("improvement_plan")),
    }
