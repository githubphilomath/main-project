
// --- Global Project State ---
window.generatedProject = {
    frontend: {},
    backend: {},
    database: {},
    docs: {},
    scripts: {}
};

// --- Helper: Split HTML into Components ---
window.splitFrontend = (fullHtml) => {
    const dom = new DOMParser().parseFromString(fullHtml, 'text/html');

    // Extract CSS
    const style = dom.querySelector('style');
    let cssContent = "/* Styles */";
    if (style) {
        cssContent = style.innerHTML;
        style.remove();
    }
    const linkTag = dom.createElement('link');
    linkTag.rel = 'stylesheet';
    linkTag.href = 'style.css';
    dom.head.appendChild(linkTag);

    // Extract JS
    // Note: The template has a script at the end.
    const scripts = dom.querySelectorAll('script');
    let jsContent = "// Script";
    // We assume the last script is the main logic
    if (scripts.length > 0) {
        const mainScript = scripts[scripts.length - 1];
        if (!mainScript.src) { // inline script
            jsContent = mainScript.innerHTML;
            mainScript.remove();
        }
    }
    const scriptTag = dom.createElement('script');
    scriptTag.src = 'script.js';
    dom.body.appendChild(scriptTag);

    return {
        html: dom.documentElement.outerHTML,
        css: cssContent,
        js: jsContent
    };
};

window.downloadProject = async () => {
    if (!window.generatedProject.frontend.html) {
        alert("Please generate a project first!");
        return;
    }

    const zip = new JSZip();
    const root = zip.folder("UserProject");

    // Frontend
    const front = root.folder("frontend");
    front.file("index.html", window.generatedProject.frontend.html);
    front.file("style.css", window.generatedProject.frontend.css);
    front.file("script.js", window.generatedProject.frontend.js);

    // Backend
    const back = root.folder("backend");
    Object.keys(window.generatedProject.backend).forEach(file => {
        back.file(file, window.generatedProject.backend[file]);
    });

    // Database
    const dbFolder = root.folder("database");
    Object.keys(window.generatedProject.database).forEach(file => {
        dbFolder.file(file, window.generatedProject.database[file]);
    });

    // Docs
    const docs = root.folder("docs");
    Object.keys(window.generatedProject.docs).forEach(file => {
        docs.file(file, window.generatedProject.docs[file]);
    });

    // Root README
    if (window.generatedProject.docs['README.md']) {
        root.file("README.md", window.generatedProject.docs['README.md']);
    }

    // Automation Scripts (Root)
    if (window.generatedProject.scripts) {
        Object.keys(window.generatedProject.scripts).forEach(file => {
            root.file(file, window.generatedProject.scripts[file]);
        });
    }

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "UserProject.zip";
    a.click();
};
