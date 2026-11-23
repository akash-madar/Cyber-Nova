# ScholarAI – Your Future, Funded (Python FastAPI + Streamlit + MySQL Stack)

Complete two-agent autonomous scholarship discovery, deterministic eligibility verification, and application planning platform for Indian students.

## Architecture

- **Agent 1 (`backend/agent1_research.py`)**: Live Research Agent using `google-genai` Search Grounding prioritizing `scholarships.gov.in`, `ssp.postmatric.karnataka.gov.in`, `myscheme.gov.in`, and central/state ministry portals. Marks unverified fields as `"Not verified"` and checks public URL reachability.
- **Agent 2 (`backend/agent2_eligibility.py`)**: Eligibility & Application Planning Agent receiving structured JSON bundles (`A2AResearchBundle`) from Agent 1, running the deterministic rule engine (`backend/eligibility_engine.py`), and generating personalized application plans (`backend/application_planner.py`).
- **A2A Orchestrator (`backend/orchestrator.py`)**: FastAPI `BackgroundTasks` asynchronous execution, retry handling, and MySQL persistence of all inter-agent JSON payloads.
- **Frontend (`frontend/app.py`)**: Streamlit interactive multi-page dashboard with student registration/login, profile form, live discovery, filters, source evidence panel, checklists, human-approval gate, and Developer Mode.

## Windows + VS Code Setup Instructions

### 1. Prerequisites
- Python 3.11+
- MySQL Server 8.0+ (installed via MySQL Installer for Windows)
- Google Gemini API Key from Google AI Studio

### 2. Create MySQL Database
Open MySQL Command Line Client or MySQL Workbench and run:
```sql
CREATE DATABASE IF NOT EXISTS scholarai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Or run `database/schema.sql` directly.

### 3. Configure Environment Variables
```powershell
cd python_app
copy .env.example .env
```
Edit `.env` in VS Code and fill in `GEMINI_API_KEY`, `MYSQL_PASSWORD`, and `JWT_SECRET_KEY`.

### 4. Create Virtual Environment & Install Dependencies
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Initialize Database Tables
```powershell
python database\init_db.py
```

### 6. Run Backend (FastAPI) & Frontend (Streamlit) in Two VS Code Terminals

**Terminal 1 — FastAPI Backend:**
```powershell
.venv\Scripts\activate
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Streamlit Frontend:**
```powershell
.venv\Scripts\activate
streamlit run frontend/app.py --server.port 8501
```

Open `http://127.0.0.1:8501` in your browser. FastAPI Swagger docs are available at `http://127.0.0.1:8000/docs`.
