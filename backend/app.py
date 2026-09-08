"""
Flask application factory / entry point.
Run:  python app.py
"""

import logging
import traceback

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import init_db
from routes.evaluate import evaluate_bp
from routes.interview import interview_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure logging so every exception is visible in the terminal.
    logging.basicConfig(
        level=logging.DEBUG if Config.DEBUG else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Allow the Vite dev server (localhost:5173/5174) to reach this API
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]}},
        supports_credentials=True,
    )

    # Register blueprints
    app.register_blueprint(evaluate_bp, url_prefix="/api")
    app.register_blueprint(interview_bp, url_prefix="/api")

    # Health-check
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "AI Interview Trainer"})

    # Generic error handlers — always log full traceback
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error("Unhandled 500 error:\n%s", traceback.format_exc())
        return jsonify({"error": "Internal server error."}), 500

    return app


if __name__ == "__main__":
    init_db()
    application = create_app()
    api_key_set = bool(Config.IBM_API_KEY) and Config.IBM_API_KEY not in (
        "<my key here>", "<Upload your API key here>", ""
    )
    print(f"IBM API key configured: {api_key_set}")
    if not api_key_set:
        print(
            "WARNING: IBM_API_KEY is not set or is still the placeholder value.\n"
            "  Edit backend/.env and replace the placeholder with your real IBM Cloud API key.\n"
            "  Get a key at: https://cloud.ibm.com/iam/apikeys"
        )
    print(f"Starting AI Interview Trainer backend on http://localhost:{Config.PORT}")
    application.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
