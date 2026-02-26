"""FastAPI main application."""

from contextlib import asynccontextmanager
from pathlib import Path

import re
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

from api.routes import projects
from config.settings import get_settings
from utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


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

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Log unexpected errors and return 500. Skip HTTPException (handled by FastAPI)."""
        if isinstance(exc, HTTPException):
            raise exc
        logger.error("Unhandled exception", error=str(exc), path=request.url.path, method=request.method)
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc) if str(exc) else "Internal server error"},
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

    def _fix_html_for_preview(content: str, project_id: str) -> str:
        """Rewrite root-relative asset paths and inject base tag so preview loads under /preview/{id}/."""
        content = re.sub(r'(src|href)="/static', r'\1="./static', content)
        content = re.sub(r'(src|href)="/assets', r'\1="./assets', content)
        content = re.sub(r'(src|href)="/(?![/#])', r'\1="./', content)
        base_tag = f'<base href="/preview/{project_id}/">'
        if "<base " not in content.lower():
            content = re.sub(r"<head[^>]*>", lambda m: m.group(0) + "\n    " + base_tag, content, count=1, flags=re.I)
        return content

    def _serve_preview_file(project_id: str, path: str):
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
        is_html = str(file_path).endswith(".html")
        if is_html:
            content = file_path.read_text(encoding="utf-8", errors="replace")
            content = _fix_html_for_preview(content, project_id)
            return HTMLResponse(content, media_type="text/html; charset=utf-8")
        return FileResponse(file_path)

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

