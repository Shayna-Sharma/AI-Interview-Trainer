import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # IBM watsonx.ai settings
    IBM_API_KEY = os.getenv("IBM_API_KEY", "")
    IBM_IAM_URL = "https://iam.cloud.ibm.com/identity/token"

    # Legacy prompt-template deployment (kept for evaluate_answer fallback)
    IBM_DEPLOYMENT_URL = (
        "https://us-south.ml.cloud.ibm.com/ml/v1/deployments/"
        "01a07830-0f21-77a6-bb18-45d8292ccff7/text/generation"
        "?version=2021-05-01"
    )

    # Foundation model direct endpoints
    # space_id discovered from the WML deployment metadata.
    IBM_SPACE_ID  = os.getenv("IBM_SPACE_ID",  "7beb0e73-5a95-48e0-af3e-39389481163b")
    IBM_MODEL_ID  = os.getenv("IBM_MODEL_ID",  "ibm/granite-4-h-small")
    IBM_CHAT_URL  = (
        "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat"
        "?version=2024-05-01"
    )

    # Flask settings
    DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    PORT = int(os.getenv("FLASK_PORT", 5000))

    # SQLite
    DATABASE_PATH = os.getenv("DATABASE_PATH", "interview_trainer.db")
