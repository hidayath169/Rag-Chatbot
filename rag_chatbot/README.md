# ResumeAI — RAG Resume Chatbot 🤖📄

ResumeAI is an AI-powered Retrieval-Augmented Generation (RAG) application that allows you to upload, analyze, and query multiple resumes in real-time. Built with a Flask backend, a modern and responsive Vanilla CSS frontend, and powered by LangChain, FAISS, and Google Gemini API, it provides grounded, conversational insights and comparisons across all uploaded candidate profiles.

---

## 🌟 Features

- **Multi-Format Document Support**: Upload and process resumes in `.pdf`, `.docx`, `.doc`, and `.txt` formats.
- **Dynamic Chunking & Ingestion**: Processes text using LangChain's `RecursiveCharacterTextSplitter`.
- **Fast Local Vector Search**: Stores and retrieves document embeddings locally using a CPU-based `FAISS` vector database.
- **State-of-the-Art Embedding & LLM**: Uses `models/gemini-embedding-2` for rich embeddings and `gemini-2.5-flash` for high-quality, grounded context-aware answers.
- **Conversational Memory**: Retains the last 10 chat messages to maintain context during follow-up questions.
- **Document Management UI**: List uploaded resumes, see document statistics (chunk count, index status), and delete resumes (which dynamically rebuilds the FAISS vector index).
- **Interactive UI**: Sleek dark/light styled sidebar + chat view interface featuring drop zones, progress indicators, quick-suggestion chips, and dynamic setting configurations for the API key.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, Werkzeug
- **RAG Orchestration**: LangChain, LangChain-Community, LangChain-Google-GenAI
- **Vector Database**: FAISS (Facebook AI Similarity Search)
- **AI Models**: Google Gemini (`gemini-2.5-flash`, `gemini-embedding-2`)
- **Document Parsing**: PyPDF, python-docx
- **Frontend**: HTML5, Vanilla CSS (with Inter typeface), JavaScript (ES6+)

---

## 📂 Project Structure

```text
rag_chatbot/
├── app.py                     # Flask Application & REST API
├── rag_engine.py              # RAG Processing, Embeddings & FAISS Engine
├── requirements.txt           # Python Project Dependencies
├── .env.example               # Template for Environment Variables
├── document_metadata.json     # Tracks indexed document states
├── faiss_index/               # Directory containing local FAISS index files
├── uploads/                   # Temporary upload directory
├── templates/
│   └── index.html             # Main Frontend layout
└── static/
    ├── app.js                 # UI Interactivity & API requests
    └── style.css              # Custom styled frontend stylesheet
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- A Google Gemini API Key. You can get one for free at [Google AI Studio](https://aistudio.google.com/apikey).

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/rag-resume-chatbot.git
   cd rag-resume-chatbot
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and add your Google Gemini API Key:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```
   *(Note: You can also configure the API Key directly in the web UI Settings).*

### Running the Application

Start the Flask development server:
```bash
python app.py
```

Once started, open your web browser and navigate to:
```text
http://localhost:5000
```

---

## 💡 How It Works (RAG Pipeline)

1. **Upload & Parse**: Files are parsed using `PdfReader` or `python-docx` to extract raw text content.
2. **Text Chunking**: The text is split into chunks of `1000` characters with a `200` character overlap to maintain semantic consistency.
3. **Embeddings & Storage**: The chunks are sent to the `models/gemini-embedding-2` model, and their generated vector representations are stored locally in a `FAISS` index.
4. **Query & Retrieval**: When you ask a question, the engine retrieves the top `6` most relevant text chunks matching your query using similarity search.
5. **Contextual Generation**: The system builds a custom system prompt injecting the retrieved context, and forwards it to `gemini-2.5-flash` along with chat history memory to formulate a grounded response.
