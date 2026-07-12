# AI Usage & Collaboration Report

This document outlines how I collaborated with AI (**Antigravity**) as a pair programmer to build the Mini Exception Inbox. The goal was to leverage AI for rapid prototyping, boilerplating, and architectural guidance, while I directed the system design, reviewed the implementation, and debugged environmental and runtime anomalies.

---

## Areas of Collaboration

### 1. System Design & Architectural Planning
* **Collaborative Discussion**: Analyzed the workspace data structures and decided on a decouplable service layout (FastAPI + Next.js + SQLite).
* **Data Lineage Strategy**: Designed a 3-layer database architecture to separate raw inputs, cleaned data (ensuring normalized SKU formats), and materialized exceptions to optimize frontend queries.

### 2. Boilerplate Scaffolding & Setup
* **Backend Setup**: Leveraged the AI to initialize python project files, database connection setups via SQLAlchemy, and Pydantic schema validation. 
* **Frontend Setup**: Scaffolded a Tailwind-ready Next.js layout structure with standard config parameters.

### 3. API & UI Implementation
* **FastAPI Routers**: Worked together to implement REST endpoints. I guided the requirements for sorting logic (worst deficit percentage first, grouped by date descending) and the 7-day trend calculations.
* **Timeline Dashboard**: Used AI to accelerate building Tailwind layout components, collapsible date cards, and raw SVG trend graphics to avoid heavy charting library dependencies.

### 4. Codebase Modularization & Refactoring
* **App Subfolder Refactoring**: Directed the relocation of core backend modules (`models.py`, `database.py`, `main.py`) into a dedicated `app/` folder to clean up the backend repository structure.
* **Mock Seeding Logic**: Instructed the AI to write a robust fallback data generator in `seed.py` to ensure the project has a rich data state even when headless or when raw CSV logs are absent.

---

## Debugging & Course Corrections

During our pair programming sessions, I audited the code and resolved several key issues:

1. **Docker Context & Virtual Environments**:
   * *Problem*: The backend container failed to run with a `ModuleNotFoundError` for dependencies (like `pandas`).
   * *Diagnosis*: The Dockerfile was copying the local Mac-compiled virtual environment (`.venv`) into the Linux container context, breaking python's shared library symlinks.
   * *Fix*: Implemented `.dockerignore` files for both backend and frontend to isolate container builds from host-level caches and virtual environments.

2. **Backend Import Resolution**:
   * *Problem*: Relocating modules to `app/` broke cross-file imports inside the package.
   * *Fix*: Audited and adjusted imports to use direct local names (e.g., `from .database import Base` in `models.py`) to align with FastAPI's entry module run context.

3. **Port & Connectivity Conflicts**:
   * *Problem*: Docker compose failed to bind to port 3000 due to a local host allocation conflict.
   * *Fix*: Diagnosed the conflict on my host machine and documented alternate port mapping options.

---

## Contribution Split

* **AI-Assisted Code Generation**: ~70% (Used to write initial SQLAlchemy schemas, REST endpoints, Next.js page components, custom SVG coordinates, and base Dockerfiles).
* **Human Direction, Code Reviews, & Debugging**: ~30% (Architectural design, code audits, import restructuring, environment configuration, database seeding logic, and Docker build adjustments).
