"""
Flask Application — REST API for the RAG Resume Chatbot.
"""

import os
import traceback
from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from rag_engine import RAGEngine, UPLOADS_DIR

# ── Configuration ──────────────────────────────────────────────────────────────
load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB max upload
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}

# Initialize RAG engine
engine = RAGEngine()


def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main frontend."""
    return render_template("index.html")


@app.route("/static/<path:filename>")
def serve_static(filename):
    """Serve static files."""
    return send_from_directory("static", filename)


@app.route("/upload", methods=["POST"])
def upload_files():
    """Upload and index multiple resume files."""
    if not engine.api_key:
        return jsonify({"error": "Please set your Google API key in Settings before uploading resumes."}), 400

    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No files selected"}), 400

    # Save files temporarily
    file_paths = []
    skipped = []

    for file in files:
        if not file.filename:
            continue
        if not allowed_file(file.filename):
            skipped.append(f"{file.filename}: Unsupported format")
            continue

        filename = secure_filename(file.filename)
        save_path = UPLOADS_DIR / filename
        file.save(str(save_path))
        file_paths.append((str(save_path), filename))

    if not file_paths:
        return jsonify({
            "error": "No valid files to process",
            "skipped": skipped,
        }), 400

    # Process and index
    try:
        result = engine.add_documents(file_paths)
        result["skipped"] = skipped

        # Clean up temp files
        for fp, _ in file_paths:
            try:
                os.remove(fp)
            except OSError:
                pass

        return jsonify(result), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def chat():
    """Send a chat message and get a RAG-powered response."""
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    question = data["message"].strip()
    if not question:
        return jsonify({"error": "Empty message"}), 400

    chat_history = data.get("history", [])

    try:
        answer = engine.query(question, chat_history)
        return jsonify({"response": answer}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500


@app.route("/documents", methods=["GET"])
def list_documents():
    """List all indexed documents."""
    docs = engine.list_documents()
    stats = engine.get_stats()
    return jsonify({"documents": docs, "stats": stats}), 200


@app.route("/documents/<filename>", methods=["DELETE"])
def delete_document(filename):
    """Delete a specific document from the index."""
    success = engine.delete_document(filename)
    if success:
        return jsonify({"message": f"Deleted {filename}"}), 200
    else:
        return jsonify({"error": f"Document {filename} not found"}), 404


@app.route("/settings", methods=["POST"])
def update_settings():
    """Update API key and settings."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    api_key = data.get("api_key", "").strip()
    if api_key:
        engine.set_api_key(api_key)
        return jsonify({"message": "API key updated successfully"}), 200
    else:
        return jsonify({"error": "No API key provided"}), 400


@app.route("/stats", methods=["GET"])
def get_stats():
    """Get vector store statistics."""
    stats = engine.get_stats()
    return jsonify(stats), 200


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n🤖 RAG Resume Chatbot is starting...")
    print("   Open http://localhost:5000 in your browser\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
