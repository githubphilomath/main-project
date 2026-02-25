"""FastAPI main application."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from api.routes import projects
from config.settings import get_settings
from utils.logging import setup_logging

# Setup logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    yield
    # Shutdown


def create_app() -> FastAPI:
    """Create FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Multi-Agent Autonomous Software Development Platform",
        description="AI system that autonomously generates full working applications",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(projects.router, prefix="/api/v1", tags=["projects"])

    # Serve generated app preview - must be after routers
    PREVIEW_BASE = Path(__file__).resolve().parent.parent / "previews"

    def _serve_preview_file(project_id: str, path: str) -> FileResponse:
        safe_id = "".join(c for c in project_id if c.isalnum() or c in "-_")
        if safe_id != project_id:
            raise HTTPException(400, "Invalid project_id")
        dir_path = PREVIEW_BASE / project_id
        if not dir_path.exists():
            raise HTTPException(404, "Preview not started or expired")
        file_path = (dir_path / path).resolve() if path else (dir_path / "index.html").resolve()
        dir_resolved = dir_path.resolve()
        if not str(file_path).startswith(str(dir_resolved)):
            raise HTTPException(400, "Invalid path")
        if file_path.is_dir():
            file_path = (file_path / "index.html").resolve()
        if not file_path.exists():
            raise HTTPException(404, f"File not found: {path or 'index.html'}")
        return FileResponse(file_path, media_type="text/html" if str(file_path).endswith(".html") else None)

    @app.get("/preview/{project_id}")
    async def serve_preview_root(project_id: str):
        return _serve_preview_file(project_id, "")

    @app.get("/preview/{project_id}/")
    async def serve_preview_root_slash(project_id: str):
        return _serve_preview_file(project_id, "")

    @app.get("/preview/{project_id}/{path:path}")
    async def serve_preview_path(project_id: str, path: str):
        return _serve_preview_file(project_id, path)

    return app


app = create_app()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Multi-Agent Autonomous Software Development Platform",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

