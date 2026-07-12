# Architecture — Mini Exception Inbox

This repository contains the complete implementation of the **Mini Exception Inbox** assignment for the Intern Hiring Test.

## System Overview

The Exception Inbox is a real-time monitoring dashboard that helps manufacturing planners identify and action discrepancies between planned and actual production values (referred to as **deficit exceptions**). The system ingests production CSV logs, processes and cleans SKU formatting quirks, materializes exception rows in an SQLite database, and displays them on a timeline inbox with collapsible dates, search filtering, and 7-day trend visualizations.

## Architecture Diagram

Our architecture follows a clean, decouple-by-service approach:

```
┌──────────────────────┐      ┌──────────────────────┐
│  production_plan.csv │      │actual_production.csv │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           └──────────────┬──────────────┘
                          │ (seed.py Ingestion)
                          ▼
            ┌───────────────────────────┐
            │  SQLite database          │
            │  - raw_plan / raw_actual  │
            │  - clean_plan/clean_actual│
            │  - exceptions (material)  │
            └─────────────┬─────────────┘
                          │
                          ▼ (SQLAlchemy ORM)
            ┌───────────────────────────┐
            │  FastAPI Backend (Port)   │
            │  - REST endpoints         │
            │  - 7-Day Trend Analysis   │
            └─────────────┬─────────────┘
                          │
                          ▼ (HTTP Fetch API)
            ┌───────────────────────────┐
            │  Next.js Frontend (React) │
            │  - Collapsible Timeline   │
            │  - SVG Trend Visualizer   │
            │  - Interactive actions    │
            └───────────────────────────┘
```

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Database** | SQLite | Serverless, zero-configuration relational database ideal for local evaluation and portability. |
| **Data Cleaning** | Python + Pandas | Handles data loading, whitespace stripping, and column schema mapping efficiently. |
| **Backend** | FastAPI + SQLAlchemy | Extremely fast Python API framework with automatic Swagger UI documentation (`/docs`) and clean SQL ORM mapping. |
| **Frontend** | Next.js (TypeScript) + Tailwind CSS | Highly optimized React framework with App Router, coupled with Tailwind for modern, glassmorphic UI design. |
| **Icons** | Lucide React | High-quality icons for a polished SaaS dashboard feel. |
| **Containerization**| Docker Compose | Standardizes environment setups to guarantee one-command execution across operating systems. |

## Database Schema

We preserve data lineage by maintaining separate **raw** and **cleaned** tables, plus a **materialized exception** table:

```
raw_plan (raw csv load)     raw_actual (raw csv load)
      │                            │
      ▼ (Cleaning & Mapping)       ▼ (Cleaning & Mapping)
  clean_plan                   clean_actual
      │                            │
      └──────────────┬─────────────┘
                     ▼ (Deficit Detection: Actual < 90% of Plan)
                exceptions (id, product_code, date, planned_units, actual_units, deficit_pct, severity, status)
```

- **`raw_plan` & `raw_actual`**: Exact copies of the incoming CSV files.
- **`clean_plan` & `clean_actual`**: Cleaned, typed tables where column headers are unified, dates are parsed, and product codes (SKUs) are stripped of whitespace and capitalized (e.g. `' fg-007 '` is normalized to `'FG-007'`).
- **`exceptions`**: Materialized list of exceptions with fields for tracking status (`open`, `acknowledged`, `resolved`) and calculating deficit levels (high severity if actual units < 70% of plan, medium if between 70% and 90%).

## Project Structure

```
├── be/                      # FastAPI Python Backend
│   ├── database.py          # SQLite engine and SessionLocal config
│   ├── models.py            # SQLAlchemy schema models (Raw, Clean, Exceptions)
│   ├── seed.py              # Ingests CSVs, cleans data, computes & materializes exceptions
│   ├── main.py              # FastAPI endpoints (/exceptions, /exceptions/{id}, /exceptions/status)
│   ├── Dockerfile           # Backend container config
│   └── pyproject.toml       # Package management (managed via uv)
├── fe/                      # Next.js React Frontend
│   ├── app/
│   │   ├── layout.tsx       # Root layout font definitions and setup
│   │   ├── globals.css      # Tailwind CSS configuration imports
│   │   └── page.tsx         # Responsive Exception Inbox page with custom SVG Chart
│   ├── public/              # Static assets
│   ├── Dockerfile           # Frontend container config
│   └── package.json         # Frontend package config
├── data/                    # Given CSV files
│   ├── actual_production.csv
│   └── production_plan.csv
├── docker-compose.yml       # Combines BE and FE services
└── README.md                # This file
```

## Key Decisions

1. **SQLite over Postgres**: SQLite requires zero local setup, making it highly portable. Since the dataset is medium-sized (~1000 records), SQLite performs at sub-millisecond speeds.
2. **Custom SVG Charting over Recharts/Chart.js**: Creating a custom SVG bar chart in React has zero dependency weight, avoiding Webpack/Turbopack transpilation errors, and rendering with a premium glow layout.
3. **Seeding on Container Startup**: The Backend Docker container runs the database creation and seeding command *automatically* before launching Uvicorn, assuring the evaluator has a populated UI right out of the box.

## Running the Project

You can run the project either via Docker (recommended for one-command startup) or locally.

### Option A: Run via Docker Compose (Recommended)

From the project root directory, run:

```bash
docker-compose up --build
```

This will:
1. Spin up the FastAPI backend on [http://localhost:8000](http://localhost:8000).
2. Create and seed the SQLite database with exceptions.
3. Spin up the Next.js app on [http://localhost:3000](http://localhost:3000).

---

### Option B: Run Locally

If you don't have Docker installed, you can launch the backend and frontend separately:

#### 1. Start the Backend
```bash
cd be
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies (requires 'uv' or regular 'pip')
pip install -r pyproject.toml   # or run 'uv sync'

# Create and seed database
python seed.py

# Start backend server
uvicorn main:app --host 0.0.0.0 --port 8000
```
*API is accessible at [http://localhost:8000](http://localhost:8000) and API documentation at [http://localhost:8000/docs](http://localhost:8000/docs).*

#### 2. Start the Frontend
```bash
cd fe
# Install node packages
npm install

# Run dev server
npm run dev
```
*Frontend is accessible at [http://localhost:3000](http://localhost:3000).*
