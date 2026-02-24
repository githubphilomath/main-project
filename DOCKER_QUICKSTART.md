# Docker Quick Start

## Run full stack (frontend + backend + Postgres + Chroma)

From project root (`main-project/`):

```bash
docker-compose up -d --build
```

First build takes 5–10 minutes. When done:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000 (or via frontend proxy at /api/v1)

## Prerequisites

1. `backend/.env` with your API keys:
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_CHAT_DEPLOYMENT` (e.g. gpt-4)
   - `GEMINI_API_KEY` (for embeddings)

2. Docker & Docker Compose installed

## How to test

1. **Start the stack:**
   ```bash
   cd main-project
   docker-compose up -d --build
   ```

2. **Check containers are running:**
   ```bash
   docker-compose ps
   ```
   You should see: frontend, backend, postgres, chroma.

3. **Open the app:** http://localhost:3000

4. **Test flow:**
   - Type a project idea in the left chat panel (e.g. "A simple todo app with HTML")
   - Click to create and execute
   - Wait for the workflow to finish (3–8 min)
   - In the center panel: select a file, use **Code | Doc | Preview** to switch views
   - For HTML files, **Preview** shows the live rendered page

## Troubleshooting

- **502 Bad Gateway:** Backend may still be starting; wait 30s and refresh.
- **No project output / 0 files generated:** Almost always **invalid API keys**. Fix `backend/.env`:
  - **AZURE_OPENAI_API_KEY** – Get from Azure Portal → your OpenAI resource → Keys. Must be valid; `your_azure_openai_api_key_here` will cause 401.
  - **AZURE_OPENAI_ENDPOINT** – e.g. `https://your-resource.openai.azure.com/` (trailing slash OK).
  - **AZURE_OPENAI_CHAT_DEPLOYMENT** – Deployment name in Azure (e.g. `gpt-4`, `gpt-35-turbo`), not the model ID.
  - **GEMINI_API_KEY** – For RAG embeddings. Get from [Google AI Studio](https://makersuite.google.com/app/apikey).
- **Workflow fails with "Azure OpenAI authentication failed":** Update the keys above and restart: `docker-compose restart backend`
