"""Preview service - runs generated applications for full live preview."""

import os
import re
import shutil
import socket
import subprocess
import threading
import time
import urllib.request
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
        self._backend_status: Dict[str, Dict[str, Any]] = {}
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

        js_files = [f for f in file_list if f.endswith(".js")]
        css_files = [f for f in file_list if f.endswith(".css")]
        py_files = [f for f in file_list if f.endswith(".py")]

        project_name = state.get("project_name", "Generated Application")
        architecture = state.get("architecture_design", {})
        api_design = architecture.get("api_design", [])
        requirements = state.get("requirements_analysis", {})
        docs = state.get("documentation_artifacts", [])

        is_backend_only = (py_files or js_files) and not css_files and not any(
            "index.html" in f for f in file_list
        )

        if is_backend_only:
            html = self._generate_api_explorer_html(
                project_name, file_list, api_design, requirements, docs
            )
        else:
            html = self._generate_file_listing_html(
                project_name, file_list, css_files, js_files, py_files
            )

        (preview_dir / "index.html").write_text(html, encoding="utf-8")

    def _generate_api_explorer_html(
        self,
        project_name: str,
        file_list: List[str],
        api_design: Any,
        requirements: Any,
        docs: Any,
    ) -> str:
        """Generate an interactive API explorer / project dashboard for backend-only apps."""
        import json as _json

        readme_content = ""
        for doc in (docs or []):
            if isinstance(doc, dict) and doc.get("doc_type") in ("README", "readme"):
                readme_content = doc.get("content", "")[:3000]
                break

        endpoints_json = _json.dumps(api_design if api_design else [], default=str)
        file_list_json = _json.dumps(file_list[:30], default=str)
        readme_escaped = readme_content.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")

        func_requirements = []
        if isinstance(requirements, dict):
            func_requirements = requirements.get("functional_requirements", [])
        reqs_json = _json.dumps(func_requirements[:20] if func_requirements else [], default=str)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{project_name}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}}
.header{{background:linear-gradient(135deg,#1e293b,#334155);padding:1.5rem 2rem;border-bottom:1px solid #334155}}
.header h1{{font-size:1.5rem;font-weight:700;color:#f1f5f9}}
.header p{{color:#94a3b8;margin-top:0.25rem;font-size:0.875rem}}
.layout{{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 80px)}}
.sidebar{{background:#1e293b;border-right:1px solid #334155;padding:1rem;overflow-y:auto}}
.sidebar h3{{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin:1rem 0 0.5rem;padding:0 0.5rem}}
.sidebar ul{{list-style:none}}
.sidebar li{{padding:0.375rem 0.5rem;border-radius:6px;cursor:pointer;font-size:0.8125rem;font-family:'SF Mono',monospace;color:#94a3b8;transition:all 0.15s}}
.sidebar li:hover{{background:#334155;color:#f1f5f9}}
.sidebar li.active{{background:#3b82f6;color:#fff}}
.main{{padding:1.5rem 2rem;overflow-y:auto}}
.tab-bar{{display:flex;gap:0.25rem;margin-bottom:1.5rem;border-bottom:1px solid #334155;padding-bottom:0.5rem}}
.tab{{padding:0.5rem 1rem;border-radius:6px 6px 0 0;cursor:pointer;font-size:0.8125rem;color:#94a3b8;transition:all 0.15s;border:1px solid transparent;border-bottom:none}}
.tab:hover{{color:#e2e8f0}}
.tab.active{{background:#1e293b;color:#3b82f6;border-color:#334155}}
.card{{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1.25rem;margin-bottom:1rem}}
.card h3{{font-size:0.9375rem;font-weight:600;margin-bottom:0.75rem;color:#f1f5f9}}
.endpoint{{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid #1e293b}}
.method{{padding:0.125rem 0.5rem;border-radius:4px;font-size:0.6875rem;font-weight:700;font-family:monospace;min-width:3.5rem;text-align:center}}
.method-get{{background:#059669;color:#fff}}
.method-post{{background:#3b82f6;color:#fff}}
.method-put{{background:#d97706;color:#fff}}
.method-delete{{background:#dc2626;color:#fff}}
.method-patch{{background:#7c3aed;color:#fff}}
.path{{font-family:'SF Mono',monospace;font-size:0.8125rem;color:#e2e8f0}}
.file-badge{{display:inline-block;padding:0.125rem 0.375rem;border-radius:3px;font-size:0.6875rem;margin-right:0.375rem;font-weight:600}}
.badge-js{{background:#f59e0b20;color:#f59e0b}}
.badge-py{{background:#10b98120;color:#10b981}}
.badge-json{{background:#3b82f620;color:#3b82f6}}
.badge-other{{background:#64748b20;color:#64748b}}
.readme{{white-space:pre-wrap;font-size:0.8125rem;line-height:1.6;color:#cbd5e1;font-family:'SF Mono',monospace;background:#0f172a;padding:1rem;border-radius:6px;max-height:500px;overflow-y:auto}}
.stat{{text-align:center;padding:0.75rem}}
.stat .num{{font-size:1.5rem;font-weight:700;color:#3b82f6}}
.stat .label{{font-size:0.6875rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}}
.stats-row{{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:0.5rem;margin-bottom:1.5rem}}
.req-item{{padding:0.5rem 0;border-bottom:1px solid #1e293b;font-size:0.8125rem;color:#cbd5e1}}
.empty{{text-align:center;padding:2rem;color:#64748b;font-size:0.875rem}}
</style>
</head>
<body>
<div class="header">
  <h1>{project_name}</h1>
  <p>Backend application &mdash; generated project overview and API explorer</p>
</div>
<div class="layout">
  <div class="sidebar">
    <h3>Project Files</h3>
    <ul id="file-list"></ul>
  </div>
  <div class="main">
    <div class="tab-bar">
      <div class="tab active" data-tab="overview">Overview</div>
      <div class="tab" data-tab="api">API Endpoints</div>
      <div class="tab" data-tab="docs">Documentation</div>
    </div>
    <div id="tab-overview">
      <div class="stats-row" id="stats-row"></div>
      <div class="card"><h3>Requirements</h3><div id="requirements"></div></div>
    </div>
    <div id="tab-api" style="display:none">
      <div class="card"><h3>API Endpoints</h3><div id="endpoints"></div></div>
    </div>
    <div id="tab-docs" style="display:none">
      <div class="card"><h3>README</h3><div class="readme" id="readme-content"></div></div>
    </div>
  </div>
</div>
<script>
(function(){{
  const files = {file_list_json};
  const endpoints = {endpoints_json};
  const reqs = {reqs_json};
  const readme = `{readme_escaped}`;

  // Files sidebar
  const fl = document.getElementById('file-list');
  files.forEach(f => {{
    const li = document.createElement('li');
    const ext = f.split('.').pop() || '';
    const cls = ext === 'js' ? 'badge-js' : ext === 'py' ? 'badge-py' : ext === 'json' ? 'badge-json' : 'badge-other';
    li.innerHTML = '<span class="file-badge ' + cls + '">' + ext + '</span>' + f;
    fl.appendChild(li);
  }});

  // Stats
  const sr = document.getElementById('stats-row');
  const stats = [
    {{ num: files.length, label: 'Files' }},
    {{ num: endpoints.length, label: 'API Endpoints' }},
    {{ num: reqs.length, label: 'Requirements' }},
  ];
  stats.forEach(s => {{
    const d = document.createElement('div');
    d.className = 'card stat';
    d.innerHTML = '<div class="num">' + s.num + '</div><div class="label">' + s.label + '</div>';
    sr.appendChild(d);
  }});

  // Requirements
  const rDiv = document.getElementById('requirements');
  if (reqs.length === 0) {{
    rDiv.innerHTML = '<div class="empty">No requirements extracted</div>';
  }} else {{
    reqs.forEach(r => {{
      const d = document.createElement('div');
      d.className = 'req-item';
      d.textContent = typeof r === 'string' ? r : (r.description || r.name || JSON.stringify(r));
      rDiv.appendChild(d);
    }});
  }}

  // API endpoints
  const eDiv = document.getElementById('endpoints');
  if (endpoints.length === 0) {{
    eDiv.innerHTML = '<div class="empty">No API endpoints defined in architecture</div>';
  }} else {{
    endpoints.forEach(ep => {{
      const row = document.createElement('div');
      row.className = 'endpoint';
      const method = (typeof ep === 'string' ? ep.split(' ')[0] : (ep.method || 'GET')).toUpperCase();
      const path = typeof ep === 'string' ? ep.replace(/^\\w+\\s+/, '') : (ep.path || ep.endpoint || ep);
      const mcls = 'method method-' + method.toLowerCase();
      row.innerHTML = '<span class="' + mcls + '">' + method + '</span><span class="path">' + (typeof path === 'string' ? path : JSON.stringify(path)) + '</span>';
      eDiv.appendChild(row);
    }});
  }}

  // Docs
  document.getElementById('readme-content').textContent = readme || 'No README generated yet.';

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {{
    tab.addEventListener('click', function() {{
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      ['overview','api','docs'].forEach(id => {{
        document.getElementById('tab-' + id).style.display = 'none';
      }});
      document.getElementById('tab-' + this.dataset.tab).style.display = 'block';
    }});
  }});
}})();
</script>
</body>
</html>"""

    def _generate_file_listing_html(
        self,
        project_name: str,
        file_list: List[str],
        css_files: List[str],
        js_files: List[str],
        py_files: List[str],
    ) -> str:
        """Generate a styled file listing page as fallback for non-backend apps."""
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
        return html

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

    def _verify_server(self, url_or_port, retries: int = 5, delay: float = 1.0) -> bool:
        """Check if a preview server is actually responding.

        Tries the server several times with a delay to give it time to start up.
        Returns True if the server responds, False otherwise.
        """
        if url_or_port is None:
            return False
        if isinstance(url_or_port, int):
            url = f"http://localhost:{url_or_port}"
        else:
            url = str(url_or_port)

        for attempt in range(retries):
            try:
                req = urllib.request.Request(url, method="HEAD")
                with urllib.request.urlopen(req, timeout=2) as resp:
                    if resp.status < 500:
                        return True
            except Exception:
                pass
            if attempt < retries - 1:
                time.sleep(delay)

        return False

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

        # Return static preview immediately — user sees the UI right away
        entry = self._find_entry_point(preview_dir)
        base_url = f"/preview/{project_id}"
        url = f"{base_url}/{entry}" if entry else f"{base_url}/"

        app_type = self._detect_app_type(preview_dir)
        has_backend = app_type in ("python", "node")
        deployment = state.get("deployment_config", {})
        has_docker = bool(deployment.get("docker_compose") and deployment.get("dockerfile"))

        # If there's a backend to run, launch it in the background
        if has_backend or has_docker:
            self._backend_status[project_id] = {
                "status": "starting",
                "message": f"Starting {app_type} backend...",
            }
            thread = threading.Thread(
                target=self._launch_backend_background,
                args=(project_id, preview_dir, app_type, deployment),
                daemon=True,
            )
            thread.start()

        return {
            "status": "running",
            "mode": "static",
            "url": url,
            "entry": entry or "index.html",
            "backend_status": "starting" if (has_backend or has_docker) else "none",
        }

    def _launch_backend_background(
        self, project_id: str, preview_dir: Path, app_type: str, deployment: dict
    ) -> None:
        """Try to start a live backend server in the background.
        Updates _backend_status and _preview_ports when ready."""
        try:
            result = None

            # Try Docker first
            if deployment.get("docker_compose") and deployment.get("dockerfile"):
                try:
                    result = self._start_docker_preview(project_id, preview_dir)
                    if result and self._verify_server(result.get("url") or result.get("port"), retries=10, delay=2.0):
                        self._backend_status[project_id] = {
                            "status": "live",
                            "mode": result.get("mode", "docker"),
                            "url": result["url"],
                        }
                        logger.info("Background Docker preview is live", project_id=project_id)
                        return
                    elif result:
                        self.stop_preview(project_id)
                        result = None
                except Exception as e:
                    logger.warning("Background Docker preview failed", error=str(e))

            # Try Python
            if app_type == "python":
                result = self._try_run_python(project_id, preview_dir)
                if result and self._verify_server(result.get("url") or result.get("port"), retries=10, delay=2.0):
                    self._backend_status[project_id] = {
                        "status": "live",
                        "mode": "python",
                        "url": result["url"],
                    }
                    logger.info("Background Python preview is live", project_id=project_id)
                    return
                elif result:
                    self.stop_preview(project_id)

            # Try Node
            if app_type == "node":
                result = self._try_run_node(project_id, preview_dir)
                if result and self._verify_server(result.get("url") or result.get("port"), retries=15, delay=2.0):
                    self._backend_status[project_id] = {
                        "status": "live",
                        "mode": "node",
                        "url": result["url"],
                    }
                    logger.info("Background Node preview is live", project_id=project_id)
                    return
                elif result:
                    self.stop_preview(project_id)

            # Nothing worked
            self._backend_status[project_id] = {
                "status": "failed",
                "message": f"Could not start {app_type} backend",
            }
            logger.warning("Background backend launch failed", project_id=project_id, app_type=app_type)

        except Exception as e:
            self._backend_status[project_id] = {
                "status": "failed",
                "message": str(e)[:200],
            }
            logger.error("Background backend launch error", error=str(e))

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
        self._backend_status.pop(project_id, None)
        return stopped

    def get_preview_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        backend = self._backend_status.get(project_id, {})
        backend_status = backend.get("status", "none")

        # If backend is live, return the live server URL
        if backend_status == "live" and backend.get("url"):
            return {
                "status": "running",
                "mode": backend.get("mode", "live"),
                "url": backend["url"],
                "backend_status": "live",
            }

        # Otherwise return static preview URL with backend status
        if project_id in self._preview_dirs:
            base_url = f"/preview/{project_id}"
            entry = self._find_entry_point(self._preview_dirs[project_id])
            return {
                "status": "running",
                "mode": "static",
                "url": f"{base_url}/{entry}" if entry else f"{base_url}/",
                "entry": entry,
                "backend_status": backend_status,
                "backend_message": backend.get("message"),
            }
        return None
