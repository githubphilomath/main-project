"""Preview service - runs generated applications for full live preview."""

import os
import re
import shutil
import socket
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any

from services.project_service import ProjectService
from utils.logging import get_logger

logger = get_logger(__name__)

PREVIEW_BASE = Path(__file__).resolve().parent.parent / "previews"
PREVIEW_PORT_START = 9001
PREVIEW_PORT_END = 9100


def _find_free_port() -> Optional[int]:
    """Find an available port in the preview range."""
    for port in range(PREVIEW_PORT_START, PREVIEW_PORT_END):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", port))
                return port
        except OSError:
            continue
    return None


class PreviewService:
    """Manages full-application preview lifecycle - runs Python, Node, or static apps."""

    def __init__(self):
        self.project_service = ProjectService()
        self._active_previews: Dict[str, subprocess.Popen] = {}
        self._preview_dirs: Dict[str, Path] = {}
        self._preview_ports: Dict[str, int] = {}
        PREVIEW_BASE.mkdir(parents=True, exist_ok=True)

    def _get_project_state(self, project_id: str) -> Optional[Dict[str, Any]]:
        project = self.project_service.get_project(project_id)
        if not project or not project.state_data:
            return None
        return project.state_data

    def _write_artifacts(self, project_id: str, state: Dict[str, Any]) -> Path:
        preview_dir = PREVIEW_BASE / project_id
        if preview_dir.exists():
            shutil.rmtree(preview_dir)
        preview_dir.mkdir(parents=True, exist_ok=True)

        code_artifacts = state.get("code_artifacts", [])
        for artifact in code_artifacts:
            file_path = artifact.get("file_path", "")
            content = artifact.get("content", "")
            if not file_path:
                continue
            safe_path = Path(file_path)
            if ".." in safe_path.parts:
                continue
            full_path = preview_dir / safe_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            try:
                full_path.write_text(content, encoding="utf-8", errors="replace")
            except Exception as e:
                logger.warning("Failed to write artifact", path=file_path, error=str(e))

        deployment = state.get("deployment_config", {})
        if deployment.get("dockerfile"):
            (preview_dir / "Dockerfile").write_text(
                deployment["dockerfile"], encoding="utf-8", errors="replace"
            )
        if deployment.get("docker_compose"):
            (preview_dir / "docker-compose.yml").write_text(
                deployment["docker_compose"], encoding="utf-8", errors="replace"
            )

        self._fix_html_asset_paths(preview_dir)
        return preview_dir

    def _fix_html_asset_paths(self, preview_dir: Path) -> None:
        """Rewrite absolute asset paths (e.g. /static/bundle.js) to relative so they load under /preview/{id}/."""
        for html_path in preview_dir.rglob("*.html"):
            try:
                content = html_path.read_text(encoding="utf-8", errors="replace")
                # Absolute paths like /static/bundle.js resolve to origin root and 404 under /preview/{id}/;
                # rewrite to relative so they resolve correctly
                content = re.sub(r'(src|href)="/static', r'\1="./static', content)
                content = re.sub(r'(src|href)="/assets', r'\1="./assets', content)
                content = re.sub(r'(src|href)="/js/', r'\1="./js/', content)
                content = re.sub(r'(src|href)="/css/', r'\1="./css/', content)
                content = re.sub(r'(src|href)="/img/', r'\1="./img/', content)
                # Catch remaining root-relative paths (e.g. Vite's /assets/xxx.js) - not // or #
                content = re.sub(r'(src|href)="/(?![/#])', r'\1="./', content)
                html_path.write_text(content, encoding="utf-8")
            except Exception as e:
                logger.warning("Could not fix HTML paths", path=str(html_path), error=str(e))

    def _ensure_index_html(self, preview_dir: Path, state: Dict[str, Any]) -> None:
        """Create index.html if missing - so every app has a previewable entry point."""
        html_files = list(preview_dir.rglob("*.html"))
        if html_files:
            return

        code_artifacts = state.get("code_artifacts", [])
        file_list = [a.get("file_path", "") for a in code_artifacts if a.get("file_path")]

        # Generate index.html that loads available assets
        js_files = [f for f in file_list if f.endswith(".js")]
        css_files = [f for f in file_list if f.endswith(".css")]
        py_files = [f for f in file_list if f.endswith(".py")]

        project_name = state.get("project_name", "Generated Application")

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #e4e4e7;
            padding: 2rem;
        }}
        .container {{ max-width: 800px; margin: 0 auto; }}
        h1 {{ margin-bottom: 1rem; font-size: 1.75rem; }}
        .card {{
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1rem 0;
        }}
        .file-list {{ list-style: none; margin-top: 0.5rem; }}
        .file-list li {{ padding: 0.25rem 0; font-family: monospace; font-size: 0.9rem; }}
        .badge {{ display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.5rem; }}
        .badge-js {{ background: #f59e0b; color: #000; }}
        .badge-css {{ background: #3b82f6; color: #fff; }}
        .badge-py {{ background: #10b981; color: #fff; }}
    </style>
"""
        for css in css_files:
            html += f'    <link rel="stylesheet" href="./{css}">\n'
        html += "</head>\n<body>\n"
        html += f'    <div class="container">\n'
        html += f'        <h1>{project_name}</h1>\n'
        html += '        <div class="card"><p>Application preview. Generated files:</p>\n'
        html += '        <ul class="file-list">\n'
        for f in file_list[:20]:
            cls = "badge-py" if f.endswith(".py") else "badge-js" if f.endswith(".js") else "badge-css" if f.endswith(".css") else ""
            html += f'            <li><span class="badge {cls}">{Path(f).suffix[1:] or "txt"}</span>{f}</li>\n'
        if len(file_list) > 20:
            html += f"            <li>... and {len(file_list) - 20} more</li>\n"
        html += "        </ul></div>\n"

        if py_files and not js_files:
            html += '        <div class="card"><p>Python backend detected. Run <code>python ' + (py_files[0] if py_files else "app.py") + '</code> to start the server.</p></div>\n'

        for js in js_files:
            html += f'    <script src="./{js}"></script>\n'
        html += "    </div>\n</body>\n</html>"

        (preview_dir / "index.html").write_text(html, encoding="utf-8")

    def _detect_app_type(self, preview_dir: Path) -> str:
        """Detect app type: python, node, or static."""
        if (preview_dir / "package.json").exists():
            return "node"
        py_files = list(preview_dir.rglob("*.py"))
        if py_files:
            return "python"
        return "static"

    def _try_run_python(self, project_id: str, preview_dir: Path) -> Optional[Dict[str, Any]]:
        """Try to run Python app. Returns info dict or None."""
        port = _find_free_port()
        if not port:
            return None

        entry = None
        for c in ["app.py", "main.py", "server.py", "run.py"]:
            if (preview_dir / c).exists():
                entry = c
                break
        if not entry:
            py_files = list(preview_dir.glob("*.py"))
            entry = py_files[0].name if py_files else None
        if not entry:
            return None

        req_file = preview_dir / "requirements.txt"
        if not req_file.exists():
            req_file.write_text("flask\n", encoding="utf-8")

        env = {**os.environ, "FLASK_APP": entry, "PORT": str(port)}

        try:
            proc = subprocess.Popen(
                ["flask", "run", "--host", "0.0.0.0", "--port", str(port)],
                cwd=str(preview_dir),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            self._active_previews[project_id] = proc
            self._preview_ports[project_id] = port
            return {
                "status": "running",
                "mode": "python",
                "url": f"http://localhost:{port}",
                "port": port,
            }
        except FileNotFoundError:
            pass
        try:
            proc = subprocess.Popen(
                [os.environ.get("python", "python"), entry],
                cwd=str(preview_dir),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
            self._active_previews[project_id] = proc
            self._preview_ports[project_id] = port
            return {
                "status": "running",
                "mode": "python",
                "url": f"http://localhost:{port}",
                "port": port,
            }
        except Exception as e:
            logger.warning("Python preview failed", error=str(e))
            return None

    def _find_node_project_dir(self, preview_dir: Path) -> Optional[Path]:
        """Find directory containing package.json (root, frontend/, client/, etc.)."""
        candidates = [preview_dir] + [
            preview_dir / d for d in ("frontend", "client", "web", "app", "src")
            if (preview_dir / d / "package.json").exists()
        ]
        for c in candidates:
            if (c / "package.json").exists():
                return c
        return None

    def _try_run_node(self, project_id: str, preview_dir: Path) -> Optional[Dict[str, Any]]:
        """Try to run Node app (npm start). Returns info dict or None."""
        node_dir = self._find_node_project_dir(preview_dir) or preview_dir
        port = _find_free_port()
        if not port:
            return None

        env = {**os.environ, "PORT": str(port)}

        try:
            subprocess.run(
                ["npm", "install"],
                cwd=str(node_dir),
                capture_output=True,
                timeout=180,
            )
        except Exception as e:
            logger.warning("npm install failed", error=str(e))
            return None

        for script in ("start", "dev"):
            try:
                proc = subprocess.Popen(
                    ["npm", "run", script],
                    cwd=str(node_dir),
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                )
                self._active_previews[project_id] = proc
                self._preview_ports[project_id] = port
                return {
                    "status": "running",
                    "mode": "node",
                    "url": f"http://localhost:{port}",
                    "port": port,
                }
            except Exception as e:
                continue
        logger.warning("Node preview failed: no start/dev script")
        return None

    def _try_build_node(self, preview_dir: Path) -> bool:
        """Run npm install + npm run build, copy build output to preview root. Returns True if successful."""
        node_dir = self._find_node_project_dir(preview_dir)
        if not node_dir:
            return False
        try:
            subprocess.run(
                ["npm", "install"],
                cwd=str(node_dir),
                capture_output=True,
                timeout=180,
            )
        except Exception as e:
            logger.warning("npm install for build failed", error=str(e))
            return False

        build_result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(node_dir),
            capture_output=True,
            timeout=300,
        )
        if build_result.returncode != 0:
            logger.warning("npm run build failed", stderr=build_result.stderr.decode()[:500] if build_result.stderr else None)
            return False

        # Find build output (dist/ for Vite, build/ for CRA)
        build_out = None
        for sub in ("dist", "build", "out"):
            candidate = node_dir / sub
            if candidate.is_dir() and (candidate / "index.html").exists():
                build_out = candidate
                break
        if not build_out:
            return False

        # Copy build output to preview root so static serve finds index.html and assets
        for item in build_out.iterdir():
            dest = preview_dir / item.name
            if dest.exists():
                shutil.rmtree(dest) if dest.is_dir() else dest.unlink()
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)
        logger.info("Node build succeeded", output=str(build_out))
        return True

    def _find_entry_point(self, preview_dir: Path) -> Optional[str]:
        html_files = list(preview_dir.rglob("*.html"))
        for f in html_files:
            if f.name.lower() == "index.html" and f.parent == preview_dir:
                return "index.html"
        if html_files:
            rel = html_files[0].relative_to(preview_dir)
            return str(rel).replace("\\", "/")
        return None

    def start_preview(self, project_id: str) -> Dict[str, Any]:
        state = self._get_project_state(project_id)
        if not state:
            raise ValueError(f"Project {project_id} not found or has no state")
        code_artifacts = state.get("code_artifacts", [])
        if not code_artifacts:
            raise ValueError("No code artifacts to preview")

        preview_dir = self._write_artifacts(project_id, state)
        self._ensure_index_html(preview_dir, state)
        self._preview_dirs[project_id] = preview_dir

        app_type = self._detect_app_type(preview_dir)
        deployment = state.get("deployment_config", {})

        # Try Docker first if we have full config
        if deployment.get("docker_compose") and deployment.get("dockerfile"):
            try:
                result = self._start_docker_preview(project_id, preview_dir)
                if result:
                    return result
            except Exception as e:
                logger.warning("Docker preview failed", error=str(e))

        # Try running Python/Node
        if app_type == "python":
            result = self._try_run_python(project_id, preview_dir)
            if result:
                return result
        elif app_type == "node":
            result = self._try_run_node(project_id, preview_dir)
            if result:
                return result
            # Node run failed; try building and serving static build output
            if self._try_build_node(preview_dir):
                self._fix_html_asset_paths(preview_dir)

        # Also try build when package.json is in a subdir (e.g. frontend/) but app_type was static
        if app_type == "static" and self._find_node_project_dir(preview_dir):
            if self._try_build_node(preview_dir):
                self._fix_html_asset_paths(preview_dir)

        # Fallback: static serve via our /preview route
        entry = self._find_entry_point(preview_dir)
        base_url = f"/preview/{project_id}"
        url = f"{base_url}/{entry}" if entry else f"{base_url}/"
        return {
            "status": "running",
            "mode": "static",
            "url": url,
            "entry": entry or "index.html",
            "message": "Serving generated files (index.html auto-created if missing)",
        }

    def _start_docker_preview(self, project_id: str, preview_dir: Path) -> Optional[Dict[str, Any]]:
        compose_file = preview_dir / "docker-compose.yml"
        if not compose_file.exists():
            return None
        try:
            proc = subprocess.Popen(
                ["docker-compose", "up", "--build"],
                cwd=str(preview_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self._active_previews[project_id] = proc
            return {
                "status": "running",
                "mode": "docker",
                "url": "http://localhost:3001",
                "message": "Docker preview starting - check docker-compose for port",
                "pid": proc.pid,
            }
        except FileNotFoundError:
            return None

    def stop_preview(self, project_id: str) -> bool:
        stopped = False
        if project_id in self._active_previews:
            proc = self._active_previews.pop(project_id)
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
            stopped = True
        self._preview_ports.pop(project_id, None)
        return stopped

    def get_preview_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        if project_id in self._preview_ports:
            port = self._preview_ports[project_id]
            return {
                "status": "running",
                "mode": "python",
                "url": f"http://localhost:{port}",
                "port": port,
            }
        if project_id in self._preview_dirs:
            base_url = f"/preview/{project_id}"
            entry = self._find_entry_point(self._preview_dirs[project_id])
            return {
                "status": "running",
                "mode": "static",
                "url": f"{base_url}/{entry}" if entry else f"{base_url}/",
                "entry": entry,
            }
        return None
