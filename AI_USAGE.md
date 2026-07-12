# AI Usage Report

## Tools Used

- **Antigravity**: An agentic AI coding assistant by Google DeepMind. Used as the main pair programmer for directory auditing, environment setups, Python/FastAPI schema designs, SQLite seeding pipelines, Next.js page components, custom SVG trend visualizers, and Docker Compose configurations.

## Prompts Used & Interaction Summary

1. **Prompt**: *"can you tell me what to do in this assignment"*
   - **Result**: Analyzed the workspace structure (`ASSIGNMENT.md`, `INSTRUCTIONS.html`, data CSV files) and provided a detailed breakdown of the 4 key phases (Ingestion, REST API, Next.js Timeline Inbox, and Documentation).
2. **Prompt**: *"give all commands to init the projects for both be and fe note : I will use nextjs for fe"*
   - **Result**: Checked CLI configurations for Next.js App Router and Python env setups. Provided commands for setting up a standard Python virtual env and a non-interactive Tailwind-ready Next.js project (`npx create-next-app@latest frontend --ts --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`).
3. **Prompt**: *"ok I have creaete be and fe now create this assingment"*
   - **Result**: Managed the complete implementation. Installed FastAPI, SQLAlchemy, Pandas, Pydantic, and Lucide React. Programmed the SQLite setup, bulk seeding script, REST endpoints with 7-day trend calculations, timeline UI dashboard, custom SVG charts, Dockerfiles, and compose configs.

## Where AI Was Wrong & How I Caught It

1. **Python Import Structure**:
   - *Problem*: In `seed.py` and `models.py`, the AI used absolute imports matching the folder name (e.g., `from be.database import Base`). When we executed `uv run python seed.py` from within the `be/` folder, Python threw a `ModuleNotFoundError: No module named 'be'`.
   - *Fix*: Identified the module resolution issue when the command failed. Edited the imports to use direct local names (e.g., `from database import Base`), aligning the paths with the execution folder context.
2. **TypeScript Type Declaration**:
   - *Problem*: In the React dashboard page (`fe/app/page.tsx`), the AI declared the database ID type as `int;` (matching SQL types) in the TypeScript interface `ExceptionItem`. 
   - *Fix*: The error was caught during validation when compiling the Next.js frontend, resulting in a type compilation failure. Replaced the `int` type with the valid TypeScript `number` keyword.

## AI vs Hand-Written Split

- **AI-generated (used as-is or with minor edits)**: 95% (Fully generated backend models, APIs, Next.js dashboard grid, SVG chart, and Docker packaging configs).
- **Heavily edited / hand-written**: 5% (Adjusted Python import syntax, corrected TypeScript interface typing, and customized styling palettes).
