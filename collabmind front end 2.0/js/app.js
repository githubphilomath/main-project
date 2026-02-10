document.addEventListener('DOMContentLoaded', () => {

    // State
    let currentState = {
        type: 'web',
        lang: 'python'
    };

    // --- Template Engine ---
    const templates = {
        // 1. Calculator (Specific Tool)
        calculator: {
            title: "Calculator App",
            html: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f3f4f6; }
        .calculator { background: #1f2937; padding: 20px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 320px; }
        .display { background: #374151; color: white; font-size: 2.5rem; text-align: right; padding: 20px; border-radius: 10px; margin-bottom: 20px; overflow-x: auto; }
        .buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        button { padding: 20px; font-size: 1.25rem; border: none; border-radius: 10px; cursor: pointer; transition: transform 0.1s; font-weight: bold; }
        button:active { transform: scale(0.95); }
        .btn-num { background: #4b5563; color: white; }
        .btn-op { background: #f59e0b; color: white; }
        .btn-fn { background: #9ca3af; color: #1f2937; }
        .btn-eq { background: #3b82f6; color: white; grid-column: span 2; }
    </style>
</head>
<body>
    <div class="calculator">
        <div class="display" id="display">0</div>
        <div class="buttons">
            <button class="btn-fn" onclick="clearDisplay()">AC</button>
            <button class="btn-fn" onclick="deleteChar()">DEL</button>
            <button class="btn-op" onclick="appendOperator('%')">%</button>
            <button class="btn-op" onclick="appendOperator('/')">÷</button>
            
            <button class="btn-num" onclick="appendNumber('7')">7</button>
            <button class="btn-num" onclick="appendNumber('8')">8</button>
            <button class="btn-num" onclick="appendNumber('9')">9</button>
            <button class="btn-op" onclick="appendOperator('*')">×</button>
            
            <button class="btn-num" onclick="appendNumber('4')">4</button>
            <button class="btn-num" onclick="appendNumber('5')">5</button>
            <button class="btn-num" onclick="appendNumber('6')">6</button>
            <button class="btn-op" onclick="appendOperator('-')">-</button>
            
            <button class="btn-num" onclick="appendNumber('1')">1</button>
            <button class="btn-num" onclick="appendNumber('2')">2</button>
            <button class="btn-num" onclick="appendNumber('3')">3</button>
            <button class="btn-op" onclick="appendOperator('+')">+</button>
            
            <button class="btn-num" onclick="appendNumber('0')">0</button>
            <button class="btn-num" onclick="appendOperator('.')">.</button>
            <button class="btn-eq" onclick="calculate()">=</button>
        </div>
    </div>
    <script>
        let current = '';
        const display = document.getElementById('display');
        function updateDisplay() { display.innerText = current || '0'; }
        function appendNumber(num) { current += num; updateDisplay(); }
        function appendOperator(op) { current += ' ' + op + ' '; updateDisplay(); }
        function clearDisplay() { current = ''; updateDisplay(); }
        function deleteChar() { current = current.trim().slice(0, -1); updateDisplay(); }
        function calculate() { try { current = eval(current.replace('×', '*').replace('÷', '/')).toString(); updateDisplay(); } catch { current = 'Error'; updateDisplay(); setTimeout(clearDisplay, 1000); } }
    <\/script>
</body>
</html>`
        },

        // 2. Universal App Engine (Multi-Screen: Auth -> Dashboard)
        universalApp: (config) => {
            // config: { name, color, colorDark, icon, imageKeyword, features: [], resourceName: "Item" }
            const c = config;
            const bgImage = `https://source.unsplash.com/1600x900/?${c.imageKeyword}`;
            const resName = c.resourceName || "Item";
            const resNamePlural = resName.toLowerCase() + "s";

            // Build Feature Cards
            const featureCards = c.features.map((f, index) => `
                <div class="card">
                    <h3>${f.title}</h3>
                    <ul>${f.list.map(i => `<li>${i}</li>`).join('')}</ul>
                    <button class="card-btn" onclick="showDetail('${f.title.replace(/'/g, "\\'")}', '${f.list.join('; ').replace(/'/g, "\\'")}')">View Details</button>
                </div>`).join('');

            return `<!DOCTYPE html>
<html>
<head>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root { --primary: ${c.color}; --primary-dark: ${c.colorDark}; --text: #1f2937; --bg: #f3f4f6; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; background: var(--bg); color: var(--text); overflow: hidden; height: 100vh; }
        
        /* Glassmorphism support */
        ${c.glassmorphism ? `
        .glass { background: rgba(255, 255, 255, 0.7) !important; backdrop-filter: blur(12px) !important; border: 1px solid rgba(255, 255, 255, 0.3) !important; }
        ` : ''}

        /* Auth Screens */
        .auth-container { 
            display: flex; height: 100%; justify-content: center; align-items: center; 
            background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('${bgImage}');
            background-size: cover; background-position: center;
        }
        .auth-box { 
            background: rgba(255, 255, 255, 0.95); padding: 40px; border-radius: 16px; width: 380px; 
            text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); backdrop-filter: blur(10px);
            animation: slideUp 0.5s ease-out;
            ${c.glassmorphism ? 'background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px);' : ''}
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        
        .logo-lg { font-size: 3rem; color: var(--primary); margin-bottom: 10px; }
        .auth-box h2 { margin: 0 0 10px; color: #111; font-size: 1.8rem; }
        .auth-box p { color: #555; margin-bottom: 25px; font-size: 0.95rem; line-height: 1.5; }
        
        .input-group { margin-bottom: 15px; text-align: left; }
        .input-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #444; margin-bottom: 5px; }
        input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; font-size: 1rem; transition: border 0.2s; }
        input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
        
        .btn-main { width: 100%; padding: 14px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .btn-main:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
        .btn-main:active { transform: translateY(0); }
        
        .link { color: var(--primary); font-size: 0.9rem; margin-top: 20px; display: block; cursor: pointer; font-weight: 500; }
        .link:hover { text-decoration: underline; }
 
        /* Dashboard Screen */
        #dash-view { display: none; height: 100%; }
        aside { width: 260px; background: white; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; z-index: 10; }
        .aside-header { padding: 25px; display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.2rem; color: var(--primary); border-bottom: 1px solid #f3f4f6; }
        
        .nav-link { padding: 16px 25px; color: #4b5563; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s; font-weight: 500; }
        .nav-link:hover, .nav-link.active { background: #f0fdf4; color: var(--primary); border-right: 4px solid var(--primary); background: linear-gradient(to right, white, #f8fafc); }
        
        main { flex: 1; display: flex; flex-direction: column; background: #f8fafc; }
        
        /* Dashboard Header with Image */
        header { 
            background: linear-gradient(to right, #fff, rgba(255,255,255,0.8)), url('${bgImage}');
            background-size: cover; background-position: center;
            padding: 30px 40px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; 
        }
        header h1 { margin: 0; font-size: 1.8rem; color: #1e293b; text-shadow: 0 1px 2px rgba(255,255,255,1); }
        
        .profile { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.9); padding: 8px 16px; border-radius: 50px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .avatar { width: 36px; height: 36px; background: var(--primary); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; }
        
        .content-area { padding: 40px; overflow-y: auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-top: 4px solid var(--primary); transition: transform 0.2s; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        ${c.glassmorphism ? '.card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }' : ''}
        
        .card h3 { margin-top: 0; color: #374151; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .card li { padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #475569; display: flex; align-items: center; gap: 10px; }
        .card li i { color: var(--primary); }
        
        .card-btn { width: 100%; padding: 12px; border: 2px solid var(--primary); color: var(--primary); background: transparent; border-radius: 8px; cursor: pointer; margin-top: 20px; font-weight: 700; transition: 0.2s; }
        .card-btn:hover { background: var(--primary); color: white; }

        /* Modal Styles */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
        .modal { background: white; padding: 30px; border-radius: 16px; width: 450px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: zoomIn 0.3s ease-out; }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .modal h2 { margin-top: 0; color: var(--primary); }
        .modal-content { line-height: 1.6; color: #4b5563; margin: 20px 0; }
        .btn-close { width: 100%; padding: 12px; background: #f3f4f6; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-close:hover { background: #e5e7eb; }

        /* Chatbot Specific Styles */
        .chat-container { display: flex; flex-direction: column; height: 100%; max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .chat-msgs { flex: 1; padding: 20px; overflow-y: auto; background: #f9fafb; display: flex; flex-direction: column; gap: 15px; }
        .msg { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 0.95rem; line-height: 1.4; }
        .msg.bot { align-self: flex-start; background: white; border: 1px solid #e5e7eb; color: #1f2937; border-bottom-left-radius: 2px; }
        .msg.user { align-self: flex-end; background: var(--primary); color: white; border-bottom-right-radius: 2px; }
        .chat-input-area { padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; background: white; }
        .chat-input { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; outline: none; }
        .chat-input:focus { border-color: var(--primary); }
        .typing-indicator { font-size: 0.8rem; color: #888; margin-left: 20px; display: none; margin-bottom: 10px; }
        .typing-indicator span { animation: blink 1s infinite; margin: 0 1px; }
        @keyframes blink { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
    </style>
</head>
<body>
    
    <!-- View 1: Auth (Wrapped) -->
    <div id="auth-container" class="auth-container">
        
        <!-- Login Form -->
        <div id="login-form" class="auth-box">
            <div class="logo-lg"><i class="${c.icon}"></i></div>
            <h2>${c.name}</h2>
            <p>Access your professional dashboard.</p>
            
            <div class="input-group">
                <input type="email" id="login-email" value="demo@example.com" placeholder="Email Address">
            </div>
            <div class="input-group">
                <input type="password" id="login-password" value="password" placeholder="Password">
            </div>
            
            <button class="btn-main" onclick="handleLoginAction()">Log In</button>
            <span class="link" onclick="toggleAuth('signup')">Create new account</span>
        </div>

        <!-- Signup Form -->
        <div id="signup-form" class="auth-box" style="display:none;">
            <div class="logo-lg"><i class="${c.icon}"></i></div>
            <h2>Join ${c.name}</h2>
            <p>Start your journey with us today.</p>
            
            <div class="input-group">
                <input type="text" id="new-name" placeholder="Full Name">
            </div>
            <div class="input-group">
                <input type="email" id="new-email" placeholder="Email Address">
            </div>
            <div class="input-group">
                <input type="password" id="new-password" placeholder="Create Password">
            </div>

            <button class="btn-main" onclick="handleSignup()">Sign Up</button>
            <span class="link" onclick="toggleAuth('login')">Back to Login</span>
        </div>

    </div>

    <!-- View 2: Dashboard -->
    <div id="dash-view">
        <aside>
            <div class="aside-header"><i class="${c.icon}"></i> ${c.name}</div>
            <div class="nav-link active" onclick="switchMainView('home')"><i class="fas fa-home"></i> Home</div>
            ${c.hasChatAgent ? `<div class="nav-link" onclick="switchMainView('chat')"><i class="fas fa-robot"></i> Chat AI</div>` : ''}
            <div class="nav-link"><i class="fas fa-chart-pie"></i> Analytics</div>
            <div class="nav-link"><i class="fas fa-users"></i> Team</div>
            <div class="nav-link"><i class="fas fa-bell"></i> Notifications <span style="margin-left:auto; background:#ef4444; color:white; padding:2px 8px; border-radius:10px; font-size:0.7rem;">3</span></div>
            <div style="flex:1"></div>
            <div class="nav-link" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</div>
        </aside>
        <main>
            <header>
                <h1>Welcome, <span id="header-name">User</span>!</h1>
                <div class="profile">
                    <span id="user-name">User</span>
                    <div class="avatar" id="user-avatar">U</div>
                </div>
            </header>
            
            <div class="content-area" id="main-content-area">
                <div id="home-subview">
                    <!-- Stats Grid (New Complexity) -->
                    <div class="grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 25px;">
                        <div class="card glass" style="padding: 15px; border-top: none; border-left: 4px solid var(--primary);">
                            <div style="font-size: 0.8rem; color: #666;">Total ${resNamePlural}</div>
                            <div style="font-size: 1.5rem; font-weight: 800;">1,284</div>
                        </div>
                        <div class="card glass" style="padding: 15px; border-top: none; border-left: 4px solid #10b981;">
                            <div style="font-size: 0.8rem; color: #666;">Active Users</div>
                            <div style="font-size: 1.5rem; font-weight: 800;">432</div>
                        </div>
                        <div class="card glass" style="padding: 15px; border-top: none; border-left: 4px solid #f59e0b;">
                            <div style="font-size: 0.8rem; color: #666;">System Load</div>
                            <div style="font-size: 1.5rem; font-weight: 800;">12%</div>
                        </div>
                        <div class="card glass" style="padding: 15px; border-top: none; border-left: 4px solid #ef4444;">
                            <div style="font-size: 0.8rem; color: #666;">Alerts</div>
                            <div style="font-size: 1.5rem; font-weight: 800;">0</div>
                        </div>
                    </div>

                    <div class="grid">
                        ${featureCards}
                        <div class="card">
                             <h3>Recent ${resNamePlural}</h3> <!-- Dynamic Resource Header -->
                             <div id="dynamic-list">
                                <p style="color:#888; padding:10px;">Loading from backend...</p>
                             </div>
                        </div>
                    </div>
                </div>

                <div id="chat-subview" style="display: none; height: 100%;">
                    <div class="chat-container">
                        <div id="chat-messages" class="chat-msgs">
                            <div class="msg bot">Hello! I am your <strong>${c.name}</strong> AI Assistant. How can I help you today?</div>
                        </div>
                        <div id="typing" class="typing-indicator">Assistant is typing<span>.</span><span>.</span><span>.</span></div>
                        <div class="chat-input-area">
                            <input type="text" id="user-input" class="chat-input" placeholder="Type your message here..." onkeypress="if(event.key === 'Enter') sendMessage()">
                            <button class="btn-main" style="width: auto; padding: 0 20px;" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Details Modal -->
    <div id="details-modal" class="modal-overlay" onclick="closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modal-title">Details</h2>
            <div id="modal-body" class="modal-content"></div>
            <button class="btn-close" onclick="closeModal()">Close</button>
        </div>
    </div>

    <script>
        const API_URL = "http://localhost:8000";

        // Auth Toggle Logic
        function toggleAuth(mode) {
            const login = document.getElementById('login-form');
            const signup = document.getElementById('signup-form');
            if(mode === 'signup') {
                login.style.display = 'none';
                signup.style.display = 'block';
            } else {
                signup.style.display = 'none';
                login.style.display = 'block';
            }
        }

        async function handleLoginAction() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const btn = event.target;
            const original = btn.innerText;
            btn.innerText = "Logging in...";
            btn.disabled = true;

            // Attempt Login (Try Real Backend -> Fallback to Mock)
            await attemptLogin(email, password, "User");
            
            btn.innerText = original;
            btn.disabled = false;
        }

        async function attemptLogin(username, password, name) {
            try {
                 const formData = new URLSearchParams();
                 formData.append('username', username);
                 formData.append('password', password);

                 const res = await fetch(\`\${API_URL}/token\`, {
                     method: 'POST',
                     headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                     body: formData
                 });
                 
                 if(res.ok) {
                     const data = await res.json();
                     localStorage.setItem('token', data.access_token);
                     startApp(name || username);
                     return true;
                 }
            } catch(e) {
                console.warn("Backend not reachable. Falling back to Demo Mode.");
            }
            // Fallback for Preview (So user sees the dashboard)
            startApp("Demo User"); 
            return false;
        }

        async function handleSignup() {
            const name = document.getElementById('new-name').value;
            const email = document.getElementById('new-email').value;
            const password = document.getElementById('new-password').value;

            if(!name || !email || !password) { 
                alert('Please fill all fields.'); 
                return; 
            }
            
            const btn = event.target;
            btn.innerText = 'Creating Account...';
            btn.disabled = true;
            
            // Try Real Register -> Fallback to Login Flow
            try {
                const res = await fetch(\`\${API_URL}/users/\`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ username: email, password: password })
                });
            } catch (e) {
                console.warn("Backend unreachable during signup", e);
            }
            await attemptLogin(email, password, name);
        }

        // App State Logic
        function startApp(name) {
            document.getElementById('header-name').innerText = name.split(' ')[0]; // First name
            document.getElementById('user-name').innerText = name;
            document.getElementById('user-avatar').innerText = name.charAt(0).toUpperCase();
            
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('dash-view').style.display = 'flex';

            // Load Data
            loadDynamicResources();
        }

        async function loadDynamicResources() {
            const listContainer = document.getElementById('dynamic-list');
            const token = localStorage.getItem('token');
            
            // Try Real Backend with Timeout (Fast fail for preview)
            if(token) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout

                    const res = await fetch(\`\${API_URL}/${resNamePlural}/\`, {
                        headers: { 'Authorization': 'Bearer ' + token },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    const data = await res.json();
                    
                    if(Array.isArray(data) && data.length > 0) {
                        listContainer.innerHTML = '<ul>' + data.map(i => \`<li>\${i.title} <span style="font-size:0.8em;color:#888">\${i.description||''}</span></li>\`).join('') + '</ul>';
                        return;
                    }
                } catch(e) {
                    console.warn("Backend fetch failed/timed out, using mock data.");
                }
            }

            // Mock Data Fallback (For flawless preview)
            const mocks = [
                { title: "New ${resName} 1", description: "Created just now" },
                { title: "${resName} Example", description: "Sample data for preview" },
                { title: "Priority ${resName}", description: "High importance item" }
            ];
            listContainer.innerHTML = '<ul>' + mocks.map(i => \`<li>\${i.title} <span style="font-size:0.8em;color:#888">\${i.description}</span></li>\`).join('') + '</ul>';
            
            // Add a small notification about backend
            const verifyMsg = document.createElement("div");
            verifyMsg.style.cssText = "margin-top:10px; padding:10px; background:#e0f2fe; color:#0369a1; border-radius:6px; font-size:0.85rem;";
            verifyMsg.innerHTML = "<i class='fas fa-code'></i> <strong>Backend Generated:</strong> Python code is in your download.";
            listContainer.appendChild(verifyMsg);
        }

        function logout() {
            localStorage.removeItem('token');
            document.getElementById('dash-view').style.display = 'none';
            document.getElementById('auth-container').style.display = 'flex';
            toggleAuth('login');
        }

        // Detail Modal Logic
        function showDetail(title, content) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-body').innerHTML = '<p>' + content.split('; ').join('</p><p>') + '</p>';
            document.getElementById('details-modal').style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('details-modal').style.display = 'none';
        }

        // --- Sub-view Switching ---
        function switchMainView(view) {
            const home = document.getElementById('home-subview');
            const chat = document.getElementById('chat-subview');
            const links = document.querySelectorAll('.nav-link');
            
            links.forEach(l => l.classList.remove('active'));
            if (view === 'home') {
                home.style.display = 'block';
                chat.style.display = 'none';
                event.currentTarget.classList.add('active');
            } else {
                home.style.display = 'none';
                chat.style.display = 'block';
                event.currentTarget.classList.add('active');
            }
        }

        // --- Chatbot Logic ---
        function sendMessage() {
            const input = document.getElementById('user-input');
            const typing = document.getElementById('typing');
            const text = input.value.trim();
            if(!text) return;

            addChatMessage(text, 'user');
            input.value = '';

            // Show typing indicator
            if(typing) typing.style.display = 'block';

            // Simulate Bot Response with context
            setTimeout(() => {
                if(typing) typing.style.display = 'none';
                
                const lower = text.toLowerCase();
                let response = "I understand. Could you tell me more about that?";
                
                // Contextual Logic
                const domain = "${c.imageKeyword}".toLowerCase();
                const resource = "${resName}".toLowerCase();

                if(lower.includes('hello') || lower.includes('hi')) {
                    response = "Hello! I am your ${c.name} assistant. How can I help you today?";
                } 
                else if(lower.includes('status')) {
                    response = "All systems for ${c.name} are optimal. Your data is currently synced and secure.";
                }
                else if(domain.includes('fitness') && (lower.includes('workout') || lower.includes('train') || lower.includes('exercise'))) {
                    response = "I can definitely help you with your workout! Should we look at your recent sessions or adjust your training plan?";
                }
                else if(domain.includes('law') && (lower.includes('case') || lower.includes('legal') || lower.includes('document'))) {
                    response = "I can help analyze your legal documents. Would you like to check for precedents or review a specific case filing?";
                }
                else if(domain.includes('travel') && (lower.includes('trip') || lower.includes('flight') || lower.includes('itinerary'))) {
                    response = "Ready for take off! I can help you manage your itinerary or check for the best local guides.";
                }
                else if(domain.includes('finance') && (lower.includes('money') || lower.includes('budget') || lower.includes('transaction'))) {
                    response = "Let's review your finances. I can analyze your transactions or help you stay within your budget goals.";
                }
                else if(lower.includes('help')) {
                    response = "I'm here to support you! I can provide info on system status, or give you domain-specific insights.";
                }

                addChatMessage(response, 'bot');
            }, 1200);
        }

        function addChatMessage(text, sender) {
            const container = document.getElementById('chat-messages');
            if(!container) return;
            const div = document.createElement('div');
            div.className = \`msg \${sender}\`;
            div.innerText = text;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
    <\/script>
</body>
</html>`;
        }
    };

    // Store generated content
    let generatedContent = "";

    // --- Helper: Name Extraction & Analysis ---
    function analyzeInput(input, explicitName) {
        const lower = input.toLowerCase();

        let cleanName = "My Project";

        if (explicitName && explicitName.trim() !== "") {
            cleanName = explicitName.trim();
        } else {
            cleanName = lower
                .replace('create a', '')
                .replace('build a', '')
                .replace('i want a', '')
                .replace('an app for', '')
                .replace('app', '')
                .replace('system', '')
                .replace('application', '')
                .replace('platform', '')
                .replace('software', '')
                .trim();

            cleanName = cleanName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            if (cleanName.length < 2) cleanName = "My Project";
            if (cleanName.length > 25) cleanName = cleanName.substring(0, 25);
        }

        let config = {
            name: cleanName,
            color: "#4f46e5",
            colorDark: "#3730a3",
            icon: "fas fa-cube",
            imageKeyword: "technology",
            resourceName: "Item",
            features: []
        };

        // --- COLOR EXTRACTION ---
        const colorMap = {
            'red': '#ef4444', 'blue': '#3b82f6', 'green': '#10b981', 'yellow': '#f59e0b',
            'purple': '#8b5cf6', 'pink': '#ec4899', 'orange': '#f97316', 'black': '#1f2937',
            'gray': '#6b7280', 'teal': '#14b8a6', 'indigo': '#6366f1'
        };

        for (const [name, hex] of Object.entries(colorMap)) {
            if (lower.includes(name)) {
                config.color = hex;
                config.colorDark = hex; // Simplified for dynamic extraction
                break;
            }
        }

        // Hex code extraction (simple regex)
        const hexMatch = lower.match(/#[0-9a-f]{6}/);
        if (hexMatch) {
            config.color = hexMatch[0];
            config.colorDark = hexMatch[0];
        }

        // --- CHATBOT DETECTION ---
        if (lower.includes('chat') || lower.includes('bot') || lower.includes('ai assistant')) {
            config.isChatbot = true;
            config.icon = "fas fa-robot";
            config.resourceName = "Message";
            config.features = [
                { title: "AI Core", list: ["Natural Language Processing", "Real-time Response", "Context Awareness"] },
                { title: "Integration", list: ["WhatsApp Hook", "Slack Bot", "Web Widget"] }
            ];
        }

        // --- ENHANCED DYNAMIC EXTRACTION ---
        if (lower.includes('fitness') || lower.includes('gym') || lower.includes('health') || lower.includes('workout')) {
            if (!config.isChatbot) {
                config.color = "#10b981"; config.colorDark = "#047857";
            }
            config.icon = "fas fa-dumbbell";
            config.imageKeyword = "fitness,gym,workout";
            config.resourceName = "Activity";
            config.features = [
                { title: "Training Plan", list: ["Dynamic Warmup", "Progressive Overload", "HIIT Finisher"] },
                { title: "Vitals & Stats", list: ["Heart Rate Zones", "Calorie Tracking", "Sleep Analysis"] }
            ];
        }
        else if (lower.includes('career') || lower.includes('job') || lower.includes('hiring') || lower.includes('resume') || lower.includes('portfolio')) {
            if (!config.isChatbot) {
                config.color = "#2563eb"; config.colorDark = "#1e40af";
            }
            config.icon = "fas fa-briefcase";
            config.imageKeyword = "office,professional,career";
            config.resourceName = "Application";
            config.features = [
                { title: "Job Feed", list: ["AI Matched roles", "Industry Insights", "Resume Scoring"] },
                { title: "Network Status", list: ["Active Interviews", "Contact Requests", "Portfolio Views"] }
            ];
        }
        else if (lower.includes('legal') || lower.includes('law') || lower.includes('attorney') || lower.includes('assistant')) {
            if (!config.isChatbot) {
                config.color = "#1e2937"; config.colorDark = "#0f172a";
            }
            config.icon = "fas fa-scale-balanced";
            config.imageKeyword = "law,legal,scales";
            config.resourceName = "Case";
            config.features = [
                { title: "Document Analysis", list: ["Contract Review", "Risk Assessment", "Precedent Search"] },
                { title: "Legal Status", list: ["Active Filings", "Court Dates", "Due Diligence"] }
            ];
        }
        else if (lower.includes('food') || lower.includes('delivery') || lower.includes('restaurant')) {
            if (!config.isChatbot) {
                config.color = "#f97316"; config.colorDark = "#c2410c";
            }
            config.icon = "fas fa-utensils";
            config.imageKeyword = "food,delivery,restaurant";
            config.resourceName = "Order";
            config.features = [
                { title: "Real-time Tracking", list: ["Chef preparing", "Driver enroute", "ETA: 15 mins"] },
                { title: "Order History", list: ["Quick Reorder", "Loyalty Points", "Expense Log"] }
            ];
        }
        else if (lower.includes('travel') || lower.includes('trip') || lower.includes('flight') || lower.includes('vacation')) {
            if (!config.isChatbot) {
                config.color = "#ec4899"; config.colorDark = "#be185d";
            }
            config.icon = "fas fa-plane";
            config.imageKeyword = "travel,landscape,plane";
            config.resourceName = "Itinerary";
            config.features = [
                { title: "Smart Planner", list: ["Flight Details", "Hotel Confirmation", "Local Guides"] },
                { title: "Travel Budget", list: ["Total Spent: $1200", "Remaining: $800"] }
            ];
        }
        else if (lower.includes('finance') || lower.includes('bank') || lower.includes('money') || lower.includes('wallet')) {
            if (!config.isChatbot) {
                config.color = "#0ea5e9"; config.colorDark = "#0369a1";
            }
            config.icon = "fas fa-wallet";
            config.imageKeyword = "finance,banking,money";
            config.resourceName = "Transaction";
            config.features = [
                { title: "Asset Allocation", list: ["Savings: 60%", "Investments: 30%", "Cash: 10%"] },
                { title: "Recent Insights", list: ["Budget Limit Reached", "Investment Growth: +4%"] }
            ];
        }
        else if (lower.includes('social') || lower.includes('connect') || lower.includes('chat') || lower.includes('friends')) {
            if (!config.isChatbot) {
                config.color = "#8b5cf6"; config.colorDark = "#6d28d9";
            }
            config.icon = "fas fa-comments";
            config.imageKeyword = "social,people,party";
            config.resourceName = "Post";
            config.features = [
                { title: "Global Feed", list: ["Trending Topics", "Suggested Friends", "Live Events"] },
                { title: "Engagement", list: ["Likes: 1.2k", "Comments: 45", "Shares: 12"] }
            ];
        }
        else if (!config.isChatbot) {
            config.features = [
                { title: "Project Overview", list: ["Uptime: 99.9%", "Resources: Balanced"] },
                { title: "Action Center", list: ["Check logs", "Manage users", "Configure API"] }
            ];
        }

        return config;
    }

    // --- Navigation ---
    window.navigateTo = (viewId) => {
        document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.add('active');
            window.scrollTo(0, 0);
        }
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (viewId === 'home') document.querySelector('a[href="#home"]').classList.add('active');
        if (viewId === 'dashboard') document.querySelector('a[href="#dashboard"]').classList.add('active');
    };

    window.selectType = (element, type) => {
        document.querySelectorAll('.option-card').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        currentState.type = type;
        const langSelect = document.getElementById('lang-select');
        const frameworkInput = document.getElementById('framework-input');
        if (type === 'web') { langSelect.value = 'javascript'; frameworkInput.placeholder = 'e.g. React'; }
        else if (type === 'api') { langSelect.value = 'python'; frameworkInput.placeholder = 'e.g. FastAPI'; }
        else if (type === 'ml') { langSelect.value = 'python'; frameworkInput.placeholder = 'e.g. PyTorch'; }
        else if (type === 'mobile') { langSelect.value = 'java'; frameworkInput.placeholder = 'e.g. Flutter'; }
    };

    window.startGeneration = async () => {
        const reqs = document.getElementById('requirements-input').value;
        const nameInput = document.getElementById('project-name-input').value;
        const includeChatAgent = document.getElementById('include-chat-agent').checked;

        if (!reqs.trim()) { alert("Please describe your project first!"); return; }

        const overlay = document.getElementById('loading-overlay');
        const chatWindow = document.getElementById('agent-chat-window');
        const progressBar = document.querySelector('.progress-fill');
        chatWindow.innerHTML = '';
        overlay.classList.remove('hidden');
        progressBar.style.width = '0%';

        const addMessage = (agent, role, text, type) => {
            const div = document.createElement('div');
            div.className = `chat-bubble msg-${type}`;
            div.innerHTML = `<strong>${agent} (${role})</strong> ${text}`;
            chatWindow.appendChild(div);
            requestAnimationFrame(() => chatWindow.scrollTop = chatWindow.scrollHeight);
        };
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // --- NEW: Collaboration Engine ---
        async function runCollaboration(projectConfig) {
            const agentPool = [
                { name: "Sarah", role: "Product Manager", icon: "fas fa-user-tie", type: "req" },
                { name: "Alex", role: "UI Designer", icon: "fas fa-palette", type: "design" },
                { name: "Marcus", role: "System Architect", icon: "fas fa-microchip", type: "back" },
                { name: "Priya", role: "Database Specialist", icon: "fas fa-database", type: "back" },
                { name: "James", role: "Security Engineer", icon: "fas fa-shield-halved", type: "back" },
                { name: "Olivia", role: "DevOps Engineer", icon: "fas fa-server", type: "back" },
                { name: "Chen", role: "UX Researcher", icon: "fas fa-users", type: "design" },
                { name: "Maya", role: "Technical Writer", icon: "fas fa-book", type: "req" },
                { name: "David", role: "Performance Engineer", icon: "fas fa-gauge-high", type: "back" },
                { name: "Elena", role: "QA Engineer", icon: "fas fa-shield-check", type: "back" }
            ];

            const steps = [
                {
                    agent: agentPool[0],
                    text: `Hello Team! I've broken down the "${projectConfig.name}" requirements. We need a robust architecture that scales. Marcus, what's our stack?`,
                    action: () => { progressBar.style.width = '5%'; }
                },
                {
                    agent: agentPool[2],
                    text: `For a ${projectConfig.resourceName} management system, I recommend FastAPI with a PostgreSQL backend. ${projectConfig.hasChatAgent ? "I'm also integrating the **AI Messaging Engine** for the requested chat agent." : "I'm setting up the migration scripts now."}`,
                    action: () => { progressBar.style.width = '10%'; }
                },
                {
                    agent: agentPool[3],
                    text: `I'll design the database schema. Planning for normalized tables with proper indexing on ${projectConfig.resourceName} lookups and foreign key constraints.`,
                    action: () => { progressBar.style.width = '15%'; }
                },
                {
                    agent: agentPool[4],
                    text: `Security first! I'm implementing JWT authentication, input validation, and SQL injection prevention. All endpoints will require proper authorization.`,
                    action: () => { progressBar.style.width = '22%'; }
                },
                {
                    agent: agentPool[1],
                    text: `I'm on it. I've designed a modern UI with a clean typography set. Should we go with a standard or premium feel?`,
                    action: () => { progressBar.style.width = '30%'; }
                },
                {
                    agent: agentPool[6],
                    text: `Based on user research, I recommend a premium feel with intuitive navigation. Users expect quick access to their ${projectConfig.resourceName}s.`,
                    action: () => { progressBar.style.width = '35%'; }
                },
                {
                    agent: agentPool[0],
                    text: `Definitely premium. Let's incorporate some advanced visual effects to wow the stakeholders.`,
                    action: () => { progressBar.style.width = '40%'; }
                },
                {
                    agent: agentPool[1],
                    text: `Perfect. I'm implementing **Glassmorphism** across all cards and sidebars. It'll give that sleek, futuristic look users love.`,
                    action: () => {
                        projectConfig.glassmorphism = true;
                        progressBar.style.width = '48%';
                    }
                },
                {
                    agent: agentPool[5],
                    text: `I'm setting up the CI/CD pipeline with Docker containers. Auto-deployment to staging on every commit, production on tagged releases.`,
                    action: () => { progressBar.style.width = '55%'; }
                },
                {
                    agent: agentPool[2],
                    text: `Frontend logic for the ${projectConfig.resourceName} list is complete. Integrating the WebSocket for real-time updates now.`,
                    action: () => { progressBar.style.width = '63%'; }
                },
                {
                    agent: agentPool[8],
                    text: `I'm optimizing the bundle size and implementing lazy loading. Target: sub-2-second initial load time with code splitting.`,
                    action: () => { progressBar.style.width = '70%'; }
                },
                {
                    agent: agentPool[7],
                    text: `Documentation is coming together nicely. I'm writing the API reference, setup guide, and user manual with code examples.`,
                    action: () => { progressBar.style.width = '78%'; }
                },
                {
                    agent: agentPool[9],
                    text: `Initial builds are passing. I'm verifying the responsive breakpoints and accessibility standards. Running E2E tests now.`,
                    action: () => { progressBar.style.width = '88%'; }
                },
                {
                    agent: agentPool[3],
                    text: `Database migrations are ready. All indexes created, and I've seeded some sample ${projectConfig.resourceName}s for the demo.`,
                    action: () => { progressBar.style.width = '95%'; }
                },
                {
                    agent: agentPool[0],
                    text: `Excellent work everyone! The prototype is ready for the first live preview session. This is going to impress the stakeholders!`,
                    action: () => { progressBar.style.width = '100%'; }
                }
            ];

            for (const step of steps) {
                // Detailed messaging
                const delay = 800 + Math.random() * 600;
                addMessage(step.agent.name, step.agent.role, "...", step.agent.type); // Typing indicator
                await sleep(delay);

                // Replace the typing indicator with the actual message
                const lastMsg = chatWindow.lastElementChild;
                lastMsg.innerHTML = `<strong>${step.agent.name} (${step.agent.role})</strong> ${step.text}`;

                if (step.action) step.action();
                await sleep(800);
            }
        }

        // --- GENERATE LOGIC ---
        const lower = reqs.toLowerCase();
        let projectTitle = "Project";
        let finalHtml = "";
        let config = {};

        if (lower.includes('calculator')) {
            projectTitle = "Scientific Calculator";
            if (nameInput) projectTitle = nameInput;
            finalHtml = templates.calculator.html;
            config = { name: projectTitle, type: 'web', features: [] };
        } else {
            config = analyzeInput(reqs, nameInput);
            projectTitle = config.name;
            config.hasChatAgent = includeChatAgent;

            // Start the collaboration before rendering
            await runCollaboration(config);

            finalHtml = templates.universalApp(config);
        }

        generatedContent = finalHtml;

        try {
            // 1. Process Frontend
            // splitFrontend is now on window
            window.generatedProject.frontend = window.splitFrontend(finalHtml);
            const codeBlock = document.getElementById('code-frontend');
            if (codeBlock) codeBlock.textContent = window.generatedProject.frontend.html;

            // 2. Generate Backend
            addMessage("Backend Agent", "Coding", "Generating FastAPI + SQLAlchemy models...", "back");
            progressBar.style.width = '70%';

            try {
                window.generatedProject.backend = window.BackendGenerator.generate(Object.assign(config, { name: projectTitle }));
                console.log("Backend Generated:", window.generatedProject.backend);

                // Generate Automation Scripts
                window.generatedProject.scripts = window.ScriptGenerator.generate(config);

            } catch (backendErr) {
                console.error("Backend Gen Failed:", backendErr);
                alert("Critical Error: Backend Generator Failed! Check console.");
            }
            const backendTab = document.getElementById('code-backend');
            if (backendTab) backendTab.textContent = window.generatedProject.backend['main.py'];

            // 3. Generate Database
            addMessage("Database Agent", "Schema", "Designing SQLite tables...", "back");
            window.generatedProject.database = window.DatabaseGenerator.generate(config);
            const dbTab = document.getElementById('code-db');
            if (dbTab) dbTab.textContent = window.generatedProject.database['schema.sql'];

            // 4. Generate Docs
            addMessage("Docs Agent", "Writing", "Compiling README and API guides...", "req");
            window.generatedProject.docs = window.DocsGenerator.generate(config);
            const docsTab = document.querySelector('#tab-docs .markdown-preview');
            // Simple markdown render for preview
            if (docsTab) docsTab.innerHTML = `<pre>${window.generatedProject.docs['README.md']}</pre>`;
        } catch (e) {
            console.error(e);
            addMessage("System", "Error", "Generation failed: " + e.message, "req");
            alert("Generation failed: " + e.message);
            return;
        }

        // --- CHAT SIMULATION ---
        await sleep(500); addMessage("System", "Packaging", "Zipping project files...", "req"); progressBar.style.width = '100%';
        await sleep(800);

        // --- COPY TO LOGS TAB ---
        const logsOutput = document.getElementById('logs-output');
        if (logsOutput) {
            logsOutput.innerHTML = chatWindow.innerHTML;
        }

        overlay.classList.add('hidden');
        document.getElementById('res-project-title').innerText = "Generated: " + projectTitle;
        navigateTo('results');
        switchTab('preview');

        // Auto-download for convenience
        await window.downloadProject();
    };

    window.switchTab = (tabName) => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.onclick.toString().includes(tabName));
        if (targetBtn) targetBtn.classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(img => img.classList.remove('active'));
        const pane = document.getElementById('tab-' + tabName);
        if (pane) pane.classList.add('active');
        if (tabName === 'preview' && generatedContent) {
            const frame = document.getElementById('preview-frame');
            if (frame) {
                frame.srcdoc = generatedContent;
            }
        }
    };
});
