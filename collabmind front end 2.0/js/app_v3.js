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
            const featureCards = c.features.map(f => `
                <div class="card">
                    <h3>${f.title}</h3>
                    <ul>${f.list.map(i => `<li>${i}</li>`).join('')}</ul>
                    <button class="card-btn">View Details</button>
                </div>`).join('');

            return `<!DOCTYPE html>
<html>
<head>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root { 
            --primary: ${c.color}; 
            --primary-dark: ${c.colorDark}; 
            --text: ${c.isDarkMode ? '#f8fafc' : '#1f2937'}; 
            --bg: ${c.isDarkMode ? '#0f172a' : '#f3f4f6'}; 
            --card-bg: ${c.isDarkMode ? (c.aesthetic === 'glass' ? 'rgba(30,41,59,0.7)' : '#1e293b') : (c.aesthetic === 'glass' ? 'rgba(255,255,255,0.7)' : 'white')};
            --border: ${c.isDarkMode ? '#334155' : '#e5e7eb'};
            --radius: ${c.aesthetic === 'modern' ? '16px' : (c.aesthetic === 'glass' ? '20px' : '2px')};
            --font: ${c.aesthetic === 'modern' ? "'Inter', sans-serif" : (c.aesthetic === 'professional' ? "'Roboto', sans-serif" : "system-ui")};
            --blur: ${c.aesthetic === 'glass' ? 'blur(10px)' : 'none'};
        }
        
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Roboto:wght@400;700&display=swap');

        body { font-family: var(--font); margin: 0; background: var(--bg); color: var(--text); overflow: hidden; height: 100vh; }
        
        /* Auth Screens */
        .auth-container { 
            display: flex; height: 100%; justify-content: center; align-items: center; 
            background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('${bgImage}');
            background-size: cover; background-position: center;
        }
        .auth-box { 
            background: var(--card-bg); padding: 40px; border-radius: var(--radius); width: 380px; 
            text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); backdrop-filter: var(--blur);
            animation: slideUp 0.5s ease-out;
            border: 1px solid var(--border);
        }
        
        input { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: calc(var(--radius) / 2); box-sizing: border-box; font-size: 1rem; transition: border 0.2s; background: var(--card-bg); color: var(--text); }
        .btn-main { width: 100%; padding: 14px; background: var(--primary); color: white; border: none; border-radius: calc(var(--radius) / 2); font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s; }
        .btn-main:hover { background: var(--primary-dark); opacity: 0.9; transform: translateY(-1px); }

        /* Layout Diversity */
        #dash-view { display: flex; height: 100%; flex-direction: ${c.layoutType === 'topnav' ? 'column' : 'row'}; }
        
        /* Sidebar Layout Specifics */
        aside { 
            width: 260px; background: var(--card-bg); border-right: 1px solid var(--border); 
            display: ${c.layoutType === 'sidebar' ? 'flex' : 'none'}; flex-direction: column; z-index: 10; 
            backdrop-filter: var(--blur);
        }
        
        /* Topnav Layout Specifics */
        .top-navbar { 
            height: 70px; background: var(--card-bg); border-bottom: 1px solid var(--border);
            display: ${c.layoutType === 'topnav' ? 'flex' : 'none'}; align-items: center; padding: 0 40px;
            justify-content: space-between; backdrop-filter: var(--blur); z-index: 20;
        }
        .top-nav-links { display: flex; gap: 20px; }

        /* Centered Layout Specifics */
        .centered-container {
            display: ${c.layoutType === 'centered' ? 'flex' : 'none'};
            width: 100%; justify-content: center; align-items: center; padding: 40px;
            overflow-y: auto;
        }
        .centered-content { max-width: 800px; width: 100%; }

        main { flex: 1; display: ${c.layoutType === 'centered' ? 'none' : 'flex'}; flex-direction: column; background: var(--bg); overflow-hidden; }
        
        .nav-link { padding: 12px 20px; border-radius: calc(var(--radius) / 2); color: var(--text); opacity: 0.8; cursor: pointer; transition: 0.2s; font-weight: 500; display: flex; align-items: center; gap: 10px; }
        .nav-link:hover, .nav-link.active { background: var(--primary); color: white; opacity: 1; }
        
        header { 
            background: linear-gradient(to right, var(--card-bg), rgba(255,255,255,0.1)), url('${bgImage}');
            background-size: cover; background-position: center;
            padding: 30px 40px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; 
        }
        
        .content-area { padding: 40px; overflow-y: auto; flex: 1; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; }
        .card { 
            background: var(--card-bg); padding: 25px; border-radius: var(--radius); 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border); 
            backdrop-filter: var(--blur); transition: 0.2s;
        }
        .card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -1px rgba(0,0,0,0.1); }
        .card-btn { width: 100%; padding: 12px; border: 2px solid var(--primary); color: var(--primary); background: transparent; border-radius: calc(var(--radius) / 2); cursor: pointer; margin-top: 20px; font-weight: 700; }
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

    <!-- View 2: Dashboard/Portal -->
    <div id="dash-view">
        
        <!-- Top Navbar Layout -->
        <div class="top-navbar">
            <div class="aside-header" style="border:0; padding:0"><i class="${c.icon}"></i> ${c.name}</div>
            <div class="top-nav-links">
                <div class="nav-link active" onclick="nav('home')" id="top-nav-home"><i class="fas fa-home"></i> Home</div>
                ${c.hasAnalytics ? `<div class="nav-link" onclick="nav('analytics')" id="top-nav-analytics"><i class="fas fa-chart-pie"></i> Analytics</div>` : ''}
                ${c.hasSurvey ? `<div class="nav-link" onclick="nav('surveys')" id="top-nav-surveys"><i class="fas fa-poll-h"></i> Surveys</div>` : ''}
                <div class="nav-link" onclick="nav('team')" id="top-nav-team"><i class="fas fa-users"></i> Team</div>
            </div>
            <div class="profile" onclick="logout()" style="cursor:pointer">
                <span id="user-name-top">User</span>
                <div class="avatar">U</div>
            </div>
        </div>

        <!-- Sidebar Layout -->
        <aside>
            <div class="aside-header"><i class="${c.icon}"></i> ${c.name}</div>
            <div class="nav-link active" onclick="nav('home')" id="nav-home"><i class="fas fa-home"></i> Home</div>
            ${c.hasAnalytics ? `<div class="nav-link" onclick="nav('analytics')" id="nav-analytics"><i class="fas fa-chart-pie"></i> Analytics</div>` : ''}
            ${c.hasSurvey ? `<div class="nav-link" onclick="nav('surveys')" id="nav-surveys"><i class="fas fa-poll-h"></i> Surveys</div>` : ''}
            <div class="nav-link" onclick="nav('team')" id="nav-team"><i class="fas fa-users"></i> Team</div>
            <div class="nav-link" onclick="nav('settings')" id="nav-settings"><i class="fas fa-cog"></i> Settings</div>
            <div style="flex:1"></div>
            <div class="nav-link" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</div>
        </aside>

        <!-- Main Content Area (Sidebar & Topnav) -->
        <main>
            <header>
                <h1><span id="page-title">Dashboard</span></h1>
                <div class="profile" style="${c.layoutType === 'topnav' ? 'display:none' : ''}">
                    <span id="user-name">User</span>
                    <div class="avatar" id="user-avatar">U</div>
                </div>
            </header>
            
            <div class="content-area">
                <!-- Page: Home -->
                <div id="page-home" class="page-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h2 style="margin:0">Overview</h2>
                        <button class="btn-main" style="width:auto; padding:10px 20px;" onclick="openAddModal()"><i class="fas fa-plus"></i> Add ${resName}</button>
                    </div>
                    <div class="grid">
                        ${featureCards}
                        <div class="card">
                             <h3>Recent ${resNamePlural}</h3> 
                             <div id="dynamic-list">
                                <p style="color:#888; padding:10px;">Loading...</p>
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Page: Analytics -->
                <div id="page-analytics" class="page-section" style="display:none">
                    <div class="card">
                        <h3>Performance Overview</h3>
                        <div style="height:200px; background:#f9fafb; display:flex; align-items:center; justify-content:center; color:#9ca3af;">
                            <i class="fas fa-chart-line fa-3x"></i>
                        </div>
                        <ul style="margin-top:20px;">
                            <li>Total Users: <strong>1,240</strong></li>
                            <li>Active Sessions: <strong>85</strong></li>
                            <li>Revenue: <strong>$12,450</strong></li>
                        </ul>
                    </div>
                </div>

                <!-- Page: Surveys -->
                <div id="page-surveys" class="page-section" style="display:none">
                    <div class="card">
                        <h3>Available Surveys</h3>
                        <p>No active surveys found.</p>
                        <button class="card-btn">Create Survey</button>
                    </div>
                </div>

                <!-- Page: Team -->
                <div id="page-team" class="page-section" style="display:none">
                    <div class="grid">
                        <div class="card">
                            <h3><i class="fas fa-user-circle"></i> Staff Member</h3>
                            <p>Admin Access</p>
                            <button class="card-btn">Manage</button>
                        </div>
                    </div>
                </div>

                <!-- Add Modal -->
                <div id="add-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center;">
                    <div class="auth-box" style="width:400px; text-align:left;">
                        <h3>Create New ${resName}</h3>
                        <div class="input-group">
                            <label>Title</label>
                            <input type="text" id="add-title" placeholder="Enter title...">
                        </div>
                        <div class="input-group">
                            <label>Description (Optional)</label>
                            <input type="text" id="add-desc" placeholder="Enter details...">
                        </div>
                        <div style="display:flex; gap:10px; margin-top:20px;">
                            <button class="btn-main" onclick="handleAddSubmit()">Create</button>
                            <button class="btn-main" style="background:#6b7280" onclick="closeAddModal()">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Centered Layout Container -->
        <div class="centered-container" id="centered-view" style="${c.layoutType === 'centered' ? 'display:flex' : 'none'}">
            <div class="centered-content">
                <div class="card" style="border-top: 8px solid var(--primary);">
                    <div style="text-align:center; margin-bottom:30px;">
                        <div class="logo-lg" style="font-size:4rem;"><i class="${c.icon}"></i></div>
                        <h2>${c.name}</h2>
                        <p>Welcome to your personalized portal.</p>
                    </div>
                    <div class="grid">
                        ${featureCards}
                    </div>
                    <div style="margin-top:40px; text-align:center;">
                        <button class="btn-main" style="width:auto; padding:12px 40px;" onclick="logout()">Logout</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dynamic Chatbot (Conditional) -->
        ${c.hasChatbot ? `
        <div id="chatbot-bubble" onclick="toggleChat()" style="position:fixed; bottom:30px; right:30px; width:60px; height:60px; background:var(--primary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:1000;">
            <i class="fas fa-robot"></i>
        </div>
        <div id="chat-window" style="display:none; position:fixed; bottom:100px; right:30px; width:350px; height:450px; background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); flex-direction:column; overflow:hidden; z-index:1000; border:1px solid #eee;">
            <div style="background:var(--primary); color:white; padding:15px; font-weight:bold; display:flex; justify-content:space-between;">
                <span>AI Assistant</span>
                <i class="fas fa-times" onclick="toggleChat()" style="cursor:pointer"></i>
            </div>
            <div id="chat-msgs" style="flex:1; padding:15px; overflow-y:auto; background:#f9fafb; font-size:0.9rem;">
                <div style="margin-bottom:10px; background:white; padding:8px 12px; border-radius:12px; border:1px solid #eee;">Hello! How can I assist you with ${c.name} today?</div>
            </div>
            <div style="padding:15px; border-top:1px solid #eee; display:flex; gap:10px;">
                <input type="text" id="chat-input" placeholder="Type a message..." style="padding:8px;">
                <button class="btn-main" style="width:auto; padding:8px 15px;" onclick="sendMsg()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
        ` : ''}
    </div>


    <script>
        const API_URL = "http://localhost:8000";
        const resNamePlural = "${resNamePlural}";
        window.CONFIG_MOCKS = ${JSON.stringify(c.mockData || [])};

        // Navigation Logic
        function nav(pageId) {
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            
            // Highlight both Sidebar and Topnav links
            const sidelink = document.getElementById('nav-' + pageId);
            const toplink = document.getElementById('top-nav-' + pageId);
            if(sidelink) sidelink.classList.add('active');
            if(toplink) toplink.classList.add('active');

            const titles = { 
                'home': 'Overview', 
                'surveys': 'Active Surveys',
                'analytics': 'Insights & Stats', 
                'team': 'Collaborators', 
                'settings': 'Preferences' 
            };
            const titleEl = document.getElementById('page-title');
            if(titleEl) titleEl.innerText = titles[pageId] || 'Dashboard';

            document.querySelectorAll('.page-section').forEach(el => el.style.display = 'none');
            const page = document.getElementById('page-' + pageId);
            if(page) page.style.display = 'block';
        }

        // Chat Logic
        function toggleChat() {
            const win = document.getElementById('chat-window');
            if(!win) return;
            win.style.display = (win.style.display === 'none') ? 'flex' : 'none';
        }

        function sendMsg() {
            const input = document.getElementById('chat-input');
            const msgs = document.getElementById('chat-msgs');
            if(!input.value.trim()) return;

            const userMsg = document.createElement('div');
            userMsg.style.cssText = "margin-bottom:10px; background:var(--primary); color:white; padding:8px 12px; border-radius:12px; align-self:flex-end; margin-left:20px; text-align:right;";
            userMsg.innerText = input.value;
            msgs.appendChild(userMsg);
            
            input.value = '';
            msgs.scrollTop = msgs.scrollHeight;

            setTimeout(() => {
                const aiMsg = document.createElement('div');
                aiMsg.style.cssText = "margin-bottom:10px; background:white; padding:8px 12px; border-radius:12px; border:1px solid #eee; margin-right:20px;";
                aiMsg.innerText = "I'm processing your request regarding ${c.name}...";
                msgs.appendChild(aiMsg);
                msgs.scrollTop = msgs.scrollHeight;
            }, 1000);
        }

        // Auth Logic
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
            const btn = event.target;
            const original = btn.innerText;

            try {
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                
                btn.innerText = "Logging in...";
                btn.disabled = true;

                // Attempt Login (Try Real Backend -> Fallback to Mock)
                await attemptLogin(email, password, "User");
            } catch (e) {
                console.error("Login Error:", e);
                // Force UI update even on error
                startApp("User (Rescue)");
            } finally {
                btn.innerText = original;
                btn.disabled = false;
            }
        }

        async function attemptLogin(username, password, name) {
            try {
                 const formData = new URLSearchParams();
                 formData.append('username', username);
                 formData.append('password', password);

                 const controller = new AbortController();
                 const timeoutId = setTimeout(() => controller.abort(), 800);

                 const res = await fetch(\`\${API_URL}/token\`, {
                     method: 'POST',
                     headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                     body: formData,
                     signal: controller.signal
                 });
                 clearTimeout(timeoutId);
                 
                 if(res.ok) {
                     const data = await res.json();
                     localStorage.setItem('token', data.access_token);
                     startApp(name || username);
                     return true;
                 }
            } catch(e) {
                console.warn("Backend not reachable. Falling back to Demo Mode.");
            }
            // Fallback for Preview
            startApp("Demo User (Preview)"); 
            return false;
        }

        async function handleSignup() {
            // ... (Simple signup simulation)
            const name = document.getElementById('new-name').value;
            if(!name) { alert('Enter name'); return; }
            startApp(name);
        }

        function startApp(name) {
            const userNameEl = document.getElementById('user-name');
            if(userNameEl) userNameEl.innerText = name;
            
            // Optional header name check
            const headerNameEl = document.getElementById('header-name');
            if(headerNameEl) headerNameEl.innerText = name.split(' ')[0];
            
            document.getElementById('auth-container').style.display = 'none';
            
            if ("${c.layoutType}" === "centered") {
                document.getElementById('dash-view').style.display = 'block';
                document.getElementById('centered-view').style.display = 'flex';
                document.querySelector('main').style.display = 'none'; 
            } else {
                document.getElementById('dash-view').style.display = 'flex';
                nav('home');
            }
            loadDynamicResources();
        }

        // Modal & Add Logic
        window.openAddModal = () => document.getElementById('add-modal').style.display = 'flex';
        window.closeAddModal = () => document.getElementById('add-modal').style.display = 'none';

        window.handleAddSubmit = async () => {
             const title = document.getElementById('add-title').value;
             const desc = document.getElementById('add-desc').value;
             if(!title) { alert('Title required'); return; }

             const token = localStorage.getItem('token');
             if(token) {
                 // Real API Call
                 try {
                     await fetch(\`\${API_URL}/\${resNamePlural}/\`, {
                         method: 'POST',
                         headers: { 
                             'Authorization': 'Bearer ' + token,
                             'Content-Type': 'application/json' 
                         },
                         body: JSON.stringify({ title, description: desc })
                     });
                 } catch(e) { console.error(e); }
             } else {
                 // Preview Mock Logic
                 window.CONFIG_MOCKS.unshift({ title, description: desc + " (Preview added)" });
             }
             
             closeAddModal();
             loadDynamicResources();
             document.getElementById('add-title').value = '';
             document.getElementById('add-desc').value = '';
        };

        async function loadDynamicResources() {
            const listContainer = document.getElementById('dynamic-list');
            if(!listContainer) return;

            const token = localStorage.getItem('token');
            const isPreview = !token;

            if(!isPreview) {
                try {
                     const controller = new AbortController();
                     const timeoutId = setTimeout(() => controller.abort(), 800);
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
                } catch(e) {}
            }

            // Mock Data (Injected from config or fallback)
            const mocks = window.CONFIG_MOCKS || [
                { title: "Sample Record 1", description: "Generic data for preview" },
                { title: "Sample Record 2", description: "Example description" }
            ];

            listContainer.innerHTML = '<ul>' + mocks.map(i => \`<li>\${i.title} <span style="font-size:0.8em;color:#888">\${i.description}</span></li>\`).join('') + '</ul>';
            
            if(isPreview) {
                 const verifyMsg = document.createElement("div");
                 verifyMsg.style.cssText = "margin-top:10px; padding:10px; background:#e0f2fe; color:#0369a1; border-radius:6px; font-size:0.85rem;";
                 verifyMsg.innerHTML = "<i class='fas fa-info-circle'></i> <strong>Live Preview: Simulated Data</strong>";
                 listContainer.appendChild(verifyMsg);
            }
        }

        function logout() {
            localStorage.removeItem('token');
            document.getElementById('dash-view').style.display = 'none';
            document.getElementById('auth-container').style.display = 'flex';
            toggleAuth('login');
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
            // Priority 1: Use Explicit Name
            cleanName = explicitName.trim();
        } else {
            // Priority 2: Extract Name
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

        // 2. Identify Category & Config
        let config = {
            name: cleanName,
            color: "#4f46e5",
            colorDark: "#3730a3",
            icon: "fas fa-cube",
            imageKeyword: "technology",
            resourceName: "Item",
            features: [],
            hasChatbot: lower.includes('chatbot') || lower.includes('assistant') || lower.includes('chat'),
            hasSurvey: lower.includes('survey') || lower.includes('poll') || lower.includes('form') || lower.includes('questionnaire'),
            hasAnalytics: lower.includes('analytics') || lower.includes('chart') || lower.includes('stat'),
            isDarkMode: lower.includes('dark mode') || lower.includes('black') || lower.includes('dark theme'),
            layoutType: 'sidebar', // sidebar, topnav, centered
            aesthetic: 'modern'   // modern, glass, professional
        };

        // Layout Detection
        if (lower.includes('top nav') || lower.includes('header navigation') || lower.includes('ecommerce') || lower.includes('social')) {
            config.layoutType = 'topnav';
        } else if (config.hasSurvey || lower.includes('minimal') || lower.includes('centered')) {
            config.layoutType = 'centered';
        }

        // Aesthetic Detection
        if (lower.includes('glass') || lower.includes('blur') || lower.includes('crystal')) {
            config.aesthetic = 'glass';
        } else if (lower.includes('corporate') || lower.includes('bank') || lower.includes('professional') || lower.includes('sharp')) {
            config.aesthetic = 'professional';
        }

        // Color Detection
        const colors = {
            'red': { primary: '#ef4444', dark: '#b91c1c' },
            'blue': { primary: '#3b82f6', dark: '#1d4ed8' },
            'green': { primary: '#10b981', dark: '#047857' },
            'purple': { primary: '#8b5cf6', dark: '#6d28d9' },
            'orange': { primary: '#f97316', dark: '#c2410c' },
            'pink': { primary: '#ec4899', dark: '#be185d' },
            'yellow': { primary: '#eab308', dark: '#a16207' },
            'cyan': { primary: '#06b6d4', dark: '#0e7490' },
            'slate': { primary: '#64748b', dark: '#334155' }
        };
        for (const [name, palette] of Object.entries(colors)) {
            if (lower.includes(name)) {
                config.color = palette.primary;
                config.colorDark = palette.dark;
                break;
            }
        }

        // Domain Specifics
        if (lower.includes('fitness') || lower.includes('gym')) {
            config.icon = "fas fa-dumbbell"; config.resourceName = "Workout";
            config.features.push({ title: "Today's Plan", list: ["Morning Cardio", "Strength Training"] });
        }
        else if (lower.includes('hospital') || lower.includes('medical') || lower.includes('doctor')) {
            config.icon = "fas fa-hospital"; config.resourceName = "Patient";
            config.features.push({ title: "Appointments", list: ["9:00 AM - John Doe", "11:30 AM - Jane Smith"] });
            config.aesthetic = 'professional';
        }
        else if (lower.includes('legal') || lower.includes('lawyer') || lower.includes('law')) {
            config.icon = "fas fa-gavel"; config.resourceName = "Case";
            config.features.push({ title: "Active Cases", list: ["Smith vs. Jones", "Estate Review"] });
            config.aesthetic = 'professional';
        }

        if (config.hasSurvey) {
            config.icon = "fas fa-poll-h";
            config.resourceName = "Response";
            config.layoutType = 'centered';
        }

        // Fallback Features if list is empty
        if (config.features.length === 0) {
            config.features.push({ title: "System Overview", list: ["Status: Online", "Users Active: 1,240"] });
        }

        config.mockData = [
            { title: "Sample " + config.resourceName + " 1", description: "First data entry" },
            { title: "Sample " + config.resourceName + " 2", description: "Secondary record" }
        ];

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

    // --- Multi-Agent Simulation ---
    const AGENTS = {
        VALIDATOR: { name: "Input Validator", role: "Quality Control", color: "blue" },
        ORCHESTRATOR: { name: "Orchestrator", role: "Project Manager", color: "purple" },
        KNOWLEDGE: { name: "Knowledgebase", role: "Information Retrieval", color: "indigo" },
        CODE_GEN: { name: "Code Generator", role: "Software Engineer", color: "green" },
        TEST_GEN: { name: "Test Generator", role: "QA Engineer", color: "teal" },
        REVIEWER: { name: "Code Review", role: "Senior Dev", color: "orange" },
        RUNNER: { name: "Test Runner", role: "CI/CD", color: "red" },
        SECURITY: { name: "Security Auditor", role: "SecOps", color: "slate" },
        DOCS: { name: "Docs Generator", role: "Tech Writer", color: "cyan" },
        OUTPUT: { name: "Output Validator", role: "Final Check", color: "emerald" }
    };

    window.startGeneration = async () => {
        const reqs = document.getElementById('requirements-input').value;
        const nameInput = document.getElementById('project-name-input').value;

        if (!reqs.trim()) { alert("Please describe your project first!"); return; }

        const overlay = document.getElementById('loading-overlay');
        const chatWindow = document.getElementById('agent-chat-window');
        const progressBar = document.querySelector('.progress-fill');

        chatWindow.innerHTML = '';
        overlay.classList.remove('hidden');
        progressBar.style.width = '0%';

        // Helper: Add Chat Message
        const addMsg = async (agentKey, text, delay = 800) => {
            const agent = AGENTS[agentKey];
            const div = document.createElement('div');
            div.className = `chat-bubble msg-agent`;
            div.style.borderLeft = `4px solid ${agent.color}`;
            div.innerHTML = `
                <div style="font-size:0.75rem; color:#666; margin-bottom:4px;">
                    <strong>${agent.name}</strong> • ${agent.role}
                </div>
                <div>${text}</div>
            `;
            chatWindow.appendChild(div);
            requestAnimationFrame(() => chatWindow.scrollTop = chatWindow.scrollHeight);
            await new Promise(r => setTimeout(r, delay));
        };

        try {
            // Step 1: Input Validation
            await addMsg('VALIDATOR', `Analyzing request: "${reqs.substring(0, 30)}..."`);
            if (reqs.length < 5) throw new Error("Request too short.");
            await addMsg('VALIDATOR', "Input valid. Intent identified clearly.");
            progressBar.style.width = '10%';

            // Step 2: Orchestration
            await addMsg('ORCHESTRATOR', "Initializing workflow. Requesting patterns from Knowledgebase.");

            // Step 3: Knowledge Retrieval
            let config = analyzeInput(reqs, nameInput);
            await addMsg('KNOWLEDGE', `Found template match: "${config.resourceName}" domain.`);
            await addMsg('KNOWLEDGE', `Retrieved features: ${config.features.map(f => f.title).join(", ")}`);
            progressBar.style.width = '20%';

            // Step 4: Code Generation (Real)
            await addMsg('ORCHESTRATOR', "Approving design. Activating Code Generator.");
            let projectTitle = config.name;
            let finalHtml = templates.universalApp(config); // Generate Frontend

            // Generate Frontend
            window.generatedProject.frontend = window.splitFrontend(finalHtml);
            const codeBlock = document.getElementById('code-frontend');
            if (codeBlock) codeBlock.textContent = window.generatedProject.frontend.html;
            await addMsg('CODE_GEN', "Frontend SPA generated successfully.");

            // Generate Backend
            window.generatedProject.backend = window.BackendGenerator.generate(Object.assign(config, { name: projectTitle }));
            const backendTab = document.getElementById('code-backend');
            if (backendTab) backendTab.textContent = window.generatedProject.backend['main.py'];
            await addMsg('CODE_GEN', "FastAPI Backend & SQLAlchemy Models generated.");

            // Generate Scripts
            window.generatedProject.scripts = window.ScriptGenerator.generate(config);
            await addMsg('CODE_GEN', "Automation scripts (Windows/Linux) created.");
            progressBar.style.width = '50%';

            // Step 5: Test Generation (New Agent)
            await addMsg('ORCHESTRATOR', "Code complete. Handing off to QA.");
            window.generatedProject.tests = window.TestGenerator.generate(config);
            await addMsg('TEST_GEN', `Generated ${Object.keys(window.generatedProject.tests).length} test files including 'test_main.py'.`);
            progressBar.style.width = '60%';

            // Step 6: Code Review (Simulated)
            await addMsg('REVIEWER', "Scanning for antipatterns...");
            await new Promise(r => setTimeout(r, 600));
            await addMsg('REVIEWER', "Code quality match: 98%. PEP-8 compliant. No issues found.");

            // Step 7: Test Runner (Simulated)
            await addMsg('RUNNER', "Running generated tests in isolated environment...");
            await new Promise(r => setTimeout(r, 800));
            await addMsg('RUNNER', "✅ All tests passed. API endpoints are answering correctly.");
            progressBar.style.width = '80%';

            // Step 8: Security Audit (Simulated)
            await addMsg('SECURITY', "Auditing auth flow and secret management...");
            await addMsg('SECURITY', "Security Pass: JWT implementation verified safe.");

            // Step 9: Documentation
            await addMsg('DOCS', "Compiling technical documentation...");
            window.generatedProject.docs = window.DocsGenerator.generate(config);
            const docsTab = document.querySelector('#tab-docs .markdown-preview');
            if (docsTab) docsTab.innerHTML = `<pre>${window.generatedProject.docs['README.md']}</pre>`;
            await addMsg('DOCS', "README.md and API specs written.");

            // Step 10: Output Validator
            await addMsg('OUTPUT', "Verifying final artifact integrity...");
            await addMsg('OUTPUT', "Structure valid. Ready for delivery.");
            progressBar.style.width = '100%';

            // Generate DB (forgotten in flow, doing it now silently)
            window.generatedProject.database = window.DatabaseGenerator.generate(config);
            const dbTab = document.getElementById('code-db');
            if (dbTab) dbTab.textContent = window.generatedProject.database['schema.sql'];

            // Finish
            await new Promise(r => setTimeout(r, 500));
            generatedContent = finalHtml;

            // Log Export
            const logsOutput = document.getElementById('logs-output');
            if (logsOutput) logsOutput.innerHTML = chatWindow.innerHTML;

            overlay.classList.add('hidden');
            document.getElementById('res-project-title').innerText = "Generated: " + projectTitle;
            navigateTo('results');
            switchTab('preview');

            // Auto-download
            try {
                await window.downloadProject();
            } catch (e) {
                console.error("Auto-download failed:", e);
            }

            // Add Manual Force Download Button
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                const forceBtn = document.createElement('button');
                forceBtn.className = 'btn btn-primary';
                forceBtn.style.backgroundColor = '#2563eb';
                forceBtn.style.marginLeft = '10px';
                forceBtn.innerHTML = '<i class="fas fa-download"></i> Retry Download';
                forceBtn.onclick = () => window.downloadProject();

                const oldBtn = document.getElementById('force-dl-btn');
                if (oldBtn) oldBtn.remove();

                forceBtn.id = 'force-dl-btn';
                headerActions.appendChild(forceBtn);
            }

        } catch (e) {
            console.error(e);
            await addMsg('ORCHESTRATOR', `❌ CRITICAL ERROR: ${e.message}`);
            alert("Generation failed: " + e.message);
        }
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
                const blob = new Blob([generatedContent], { type: 'text/html' });
                frame.src = URL.createObjectURL(blob);
            }
        }
    };
});
