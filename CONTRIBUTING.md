# Contributing to RailPulse (Railway-App)

Thank you for your interest in contributing to **RailPulse**! We welcome contributions from developers worldwide to improve real-time telemetry, map visualizations, AI travel assistance, and timetable accuracy for Indian Railways.

---

## 🛠️ Quickstart Development Setup

### 1. Prerequisites
* **Python**: 3.11 or later
* **Node.js**: 20 LTS or later
* **Git**: latest version
* **Docker & Docker Compose** (Optional for local PostgreSQL + Redis)

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/Aniketchavan7/Railway-App.git
cd Railway-App/backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install flake8 pytest

# Run the development server
uvicorn app.main:app --reload --port 8000
```

> **Tip**: You can run diagnostics immediately using the built-in CLI:
> ```bash
> python -m app.cli info
> python -m app.cli status 22225
> ```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live MapLibre GL train tracking interface.

---

## 🚆 How to Add New Train Routes

You can contribute new reference trains and halts in `backend/app/providers/simulator.py`:

1. Locate `REFERENCE_TRAINS` dictionary.
2. Add the 5-digit train number as key:
```python
"12951": {
    "number": "12951",
    "name": "Mumbai Tejas Rajdhani Express",
    "origin": "MMCT",
    "destination": "NDLS",
    "halts": [
        {"code": "MMCT", "name": "Mumbai Central", "sch_arr": None, "sch_dep": "17:00", "dist": 0, "lat": 18.9696, "lng": 72.8193, "platform": "1"},
        {"code": "BVI", "name": "Borivali", "sch_arr": "17:22", "sch_dep": "17:24", "dist": 30, "lat": 19.2290, "lng": 72.8574, "platform": "6"},
        {"code": "ST", "name": "Surat", "sch_arr": "19:43", "sch_dep": "19:48", "dist": 263, "lat": 21.2050, "lng": 72.8407, "platform": "1"},
        {"code": "NDLS", "name": "New Delhi", "sch_arr": "08:32", "sch_dep": None, "dist": 1386, "lat": 28.6415, "lng": 77.2207, "platform": "2"},
    ],
}
```
3. Test your route using the CLI:
```bash
python -m app.cli status 12951
```

---

## 🧪 Testing & Validation Checklist

Before submitting a Pull Request, ensure all checks pass:

```bash
# 1. Backend syntax and lint check
cd backend
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# 2. Run pytest suite
pytest tests -v

# 3. Frontend TypeScript validation
cd ../frontend
npx tsc --noEmit
```

---

## 🌿 Branching & Commit Conventions

* Create focused feature or bugfix branches:
  * `feat/your-feature-name`
  * `fix/issue-description`
  * `docs/documentation-update`
* Follow [Conventional Commits](https://www.conventionalcommits.org/):
  * `feat(telemetry): add LERP coordinate interpolation along polylines`
  * `fix(backend): handle null scheduled arrival times at origin stations`
  * `docs(readme): update environment setup instructions`

---

## 🤝 Code of Conduct & Questions

Have a question about system architecture, WebSockets, or LangGraph AI agents?
Join the conversation in our [GitHub Discussions Q&A](https://github.com/Aniketchavan7/Railway-App/discussions)!
