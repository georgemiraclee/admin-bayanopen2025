(function() {
  'use strict';

  // Check if already injected
  if (document.getElementById('ip-manager-sidebar')) {
    return;
  }

  //CSS Styles
  const styles = `
    #ip-manager-trigger {
      position: fixed;
      left: 0;
      top: 0;
      width: 15px;
      height: 100vh;
      background: transparent;
      cursor: pointer;
      z-index: 10001;
      transition: all 0.3s ease;
    }

    #ip-manager-trigger:hover {
      background: rgba(30, 58, 138, 0.1);
    }

    #ip-manager-sidebar {
      position: fixed;
      left: -350px;
      top: 0;
      width: 350px;
      height: 100vh;
      background: linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      z-index: 10000;
      transition: left 0.3s ease-in-out;
      box-shadow: 2px 0 20px rgba(0,0,0,0.5);
      overflow-y: auto;
    }

    #ip-manager-sidebar.active {
      left: 0;
    }

    .sidebar-header {
      padding: 20px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      position: relative;
    }

    .sidebar-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: white;
    }

    .sidebar-subtitle {
      font-size: 12px;
      opacity: 0.8;
      margin: 5px 0 0 0;
      font-weight: 500;
    }

    .sidebar-content {
      padding: 20px;
    }

    /* Login Form Styles */
    .login-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 100px);
      padding: 20px;
    }

    .login-form {
      background: rgba(0,0,0,0.4);
      padding: 30px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: 100%;
      max-width: 300px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }

    .login-title {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: white;
    }

    .login-subtitle {
      text-align: center;
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 25px;
      color: white;
    }

    .login-form-group {
      margin-bottom: 20px;
    }

    .login-form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      opacity: 0.9;
      color: white;
    }

    .login-form-input {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    .login-form-input:focus {
      outline: none;
      border-color: rgba(59, 130, 246, 0.8);
      background: rgba(255,255,255,0.15);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .login-form-input::placeholder {
      color: rgba(255,255,255,0.5);
    }

    .login-btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 10px;
    }

    .login-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    }

    .login-btn:active {
      transform: translateY(0);
    }

    .login-error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #fca5a5;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 15px;
      text-align: center;
      display: none;
    }

    .logout-btn {
      position: absolute;
      top: 15px;
      right: 50px;
      background: rgba(239, 68, 68, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 1);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }

    .server-list {
      margin-bottom: 20px;
    }

    .server-item {
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      border-left: 4px solid transparent;
      transition: all 0.3s ease;
    }

    .server-item.active {
      border-left-color: #10b981;
      background: rgba(16,185,129,0.2);
    }

    .server-item.offline {
      border-left-color: #ef4444;
      background: rgba(239,68,68,0.2);
    }

    .server-item.online {
      border-left-color: #10b981;
    }

    .server-name {
      font-weight: 600;
      margin-bottom: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }

    .server-url {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      opacity: 0.8;
      margin-bottom: 5px;
    }

    .server-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 500;
    }

    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
    }

    .status-online { background: #10b981; }
    .status-offline { background: #ef4444; }
    .status-timeout { background: #f59e0b; }
    .status-unknown { background: #6b7280; }

    .server-actions {
      display: flex;
      gap: 5px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn-primary {
      background: rgba(30, 58, 138, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-primary:hover {
      background: rgba(30, 58, 138, 1);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);
    }

    .btn-success {
      background: rgba(16, 185, 129, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-success:hover {
      background: rgba(16, 185, 129, 1);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .btn-warning {
      background: rgba(245, 158, 11, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-warning:hover {
      background: rgba(245, 158, 11, 1);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 1);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }

    .add-server-form {
      background: rgba(0,0,0,0.3);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 5px;
      opacity: 0.9;
      color: white;
    }

    .form-input {
      width: 100%;
      padding: 10px;
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: rgba(30, 58, 138, 0.8);
      background: rgba(255,255,255,0.2);
      box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.2);
    }

    .form-input::placeholder {
      color: rgba(255,255,255,0.5);
    }

    .controls {
      background: rgba(0,0,0,0.3);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .close-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      font-weight: 700;
      cursor: pointer;
      padding: 5px;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .loading {
      opacity: 0.5;
      pointer-events: none;
    }

    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      z-index: 10002;
      animation: slide-in 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
    }

    .notification.success { background: rgba(16, 185, 129, 0.9); }
    .notification.error { background: rgba(239, 68, 68, 0.9); }
    .notification.warning { background: rgba(245, 158, 11, 0.9); }

    @keyframes slide-in {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    /* Hide main content when not authenticated */
    .main-content.hidden {
      display: none;
    }
  `;

  // Inject styles
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create transparent trigger area
  const trigger = document.createElement('div');
  trigger.id = 'ip-manager-trigger';
  trigger.title = 'Click to manage IP servers';
  document.body.appendChild(trigger);

  // Create sidebar with login
  const sidebar = document.createElement('div');
  sidebar.id = 'ip-manager-sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3 class="sidebar-title">
        🌐 Admin IP Manager
      </h3>
      <p class="sidebar-subtitle">Bayan Open 2025</p>
      <button class="logout-btn" id="logoutBtn" style="display: none;">Logout</button>
      <button class="close-btn" id="closeSidebarBtn">×</button>
    </div>
    
    <!-- Login Container -->
    <div class="login-container" id="login-container">
      <div class="login-form">
        <h3 class="login-title">🔐 Admin Access</h3>
        <p class="login-subtitle">Enter password to continue</p>
        
        <div class="login-form-group">
          <label class="login-form-label">Password</label>
          <input type="password" class="login-form-input" id="login-password" placeholder="Enter admin password" autocomplete="current-password">
        </div>
        
        <button class="login-btn" id="loginBtn">Access Manager</button>
        
        <div class="login-error" id="login-error">
          Invalid password. Please try again.
        </div>
      </div>
    </div>
    
    <!-- Main Content (hidden by default) -->
    <div class="sidebar-content main-content hidden" id="main-content">
      <div class="controls">
        <button class="btn btn-primary" id="checkAllBtn" style="width: 100%; margin-bottom: 10px;">
          🔄 Check All Servers
        </button>
        <button class="btn btn-success" id="addServerBtn" style="width: 100%;">
          ➕ Add New Server
        </button>
      </div>

      <div class="add-server-form" id="add-server-form" style="display: none;">
        <h4 style="margin-top: 0; font-weight: 700; color: white;" id="form-title">Add New Server</h4>
        <div class="form-group">
          <label class="form-label">Server Name</label>
          <input type="text" class="form-input" id="server-name" placeholder="e.g., Production Server">
        </div>
        <div class="form-group">
          <label class="form-label">IP Address</label>
          <input type="text" class="form-input" id="server-ip" placeholder="e.g., 192.168.1.100">
        </div>
        <div class="form-group">
          <label class="form-label">Port</label>
          <input type="number" class="form-input" id="server-port" placeholder="3000" value="3000">
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-success" id="saveServerBtn">Save</button>
          <button class="btn btn-danger" id="cancelFormBtn">Cancel</button>
        </div>
      </div>

      <div class="server-list" id="server-list">
        Loading servers...
      </div>
    </div>
  `;
  document.body.appendChild(sidebar);

  // State management
  let servers = [];
  let currentServer = null;
  let isOpen = false;
  let editingServerId = null;
  let isAuthenticated = false;
  
  // Login credentials
  const ADMIN_PASSWORD = 'okedeh123';
  
  // Notification system
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // Authentication functions
  function showLoginError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 3000);
    }
  }

  function authenticate() {
    const passwordInput = document.getElementById('login-password');
    
    if (!passwordInput) {
      showNotification('Login form elements not found', 'error');
      return false;
    }

    const password = passwordInput.value;

    if (password === ADMIN_PASSWORD) {
      isAuthenticated = true;
      
      // Hide login container and show main content
      const loginContainer = document.getElementById('login-container');
      const mainContent = document.getElementById('main-content');
      const logoutBtn = document.getElementById('logoutBtn');
      
      if (loginContainer) loginContainer.style.display = 'none';
      if (mainContent) mainContent.classList.remove('hidden');
      if (logoutBtn) logoutBtn.style.display = 'block';
      
      // Clear login form
      passwordInput.value = '';
      
      showNotification('Login successful! Welcome Admin.', 'success');
      loadServers();
      return true;
    } else {
      showLoginError();
      showNotification('Invalid password', 'error');
      
      // Clear password field
      passwordInput.value = '';
      passwordInput.focus();
      return false;
    }
  }

  function logout() {
    isAuthenticated = false;
    
    // Show login container and hide main content
    const loginContainer = document.getElementById('login-container');
    const mainContent = document.getElementById('main-content');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (mainContent) mainContent.classList.add('hidden');
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    // Clear any open forms
    const addServerForm = document.getElementById('add-server-form');
    if (addServerForm) addServerForm.style.display = 'none';
    editingServerId = null;
    clearForm();
    
    showNotification('Logged out successfully', 'warning');
    
    // Focus on password field
    const passwordInput = document.getElementById('login-password');
    if (passwordInput) {
      setTimeout(() => passwordInput.focus(), 100);
    }
  }

  // Core functions
  function toggleSidebar() {
    isOpen = !isOpen;
    sidebar.classList.toggle('active', isOpen);
    
    if (isOpen) {
      if (isAuthenticated) {
        loadServers();
      } else {
        // Focus on password input when opening login
        setTimeout(() => {
          const passwordInput = document.getElementById('login-password');
          if (passwordInput) passwordInput.focus();
        }, 300);
      }
    }
  }

  function closeSidebar() {
    isOpen = false;
    sidebar.classList.remove('active');
  }

  // Form management functions
  function toggleAddForm() {
    if (!isAuthenticated) return;
    
    const form = document.getElementById('add-server-form');
    const formTitle = document.getElementById('form-title');
    const saveBtn = document.getElementById('saveServerBtn');
    const isVisible = form.style.display !== 'none';
    
    if (isVisible) {
      form.style.display = 'none';
      editingServerId = null;
      clearForm();
    } else {
      form.style.display = 'block';
      formTitle.textContent = 'Add New Server';
      saveBtn.textContent = 'Save';
      editingServerId = null;
      clearForm();
    }
  }

  function clearForm() {
    const nameInput = document.getElementById('server-name');
    const ipInput = document.getElementById('server-ip');
    const portInput = document.getElementById('server-port');
    
    if (nameInput) nameInput.value = '';
    if (ipInput) ipInput.value = '';
    if (portInput) portInput.value = '3000';
  }

  function cancelForm() {
    const form = document.getElementById('add-server-form');
    form.style.display = 'none';
    editingServerId = null;
    clearForm();
  }

  // Server management functions
  async function loadServers() {
    if (!isAuthenticated) return;
    
    try {
      if (window.electronAPI && window.electronAPI.getServers) {
        const serversData = await window.electronAPI.getServers();
        const currentServerData = await window.electronAPI.getCurrentServer();
        
        servers = serversData || [];
        currentServer = currentServerData;
      } else {
        // Fallback for testing without Electron
        servers = [
          { id: 1, name: 'Main Server', ip: '192.168.1.100', port: 3000, status: 'online', lastChecked: Date.now() },
          { id: 2, name: 'Backup Server', ip: '192.168.1.101', port: 3000, status: 'offline', lastChecked: Date.now() - 60000 }
        ];
        currentServer = servers[0];
      }
      renderServerList();
    } catch (error) {
      console.error('Error loading servers:', error);
      showNotification('Failed to load servers', 'error');
    }
  }

  function renderServerList() {
    if (!isAuthenticated) return;
    
    const serverList = document.getElementById('server-list');
    
    if (!serverList) return;
    
    if (servers.length === 0) {
      serverList.innerHTML = '<p style="text-align: center; opacity: 0.7; font-weight: 500;">No servers configured</p>';
      return;
    }

    serverList.innerHTML = servers.map(server => {
      const isActive = currentServer && currentServer.id === server.id;
      const statusClass = server.status || 'unknown';
      const lastChecked = server.lastChecked ? 
        new Date(server.lastChecked).toLocaleTimeString() : 'Never';

      return `
        <div class="server-item ${isActive ? 'active' : ''} ${statusClass}">
          <div class="server-name">
            <span>${server.name}</span>
            <span class="status-indicator status-${statusClass}"></span>
          </div>
          <div class="server-url">http://${server.ip}:${server.port}</div>
          <div class="server-status">
            <span>Status: ${statusClass.toUpperCase()}</span>
            <span>Last: ${lastChecked}</span>
          </div>
          <div class="server-actions">
            ${!isActive ? `<button class="btn btn-primary" data-action="switch" data-server-id="${server.id}">Switch</button>` : ''}
            <button class="btn btn-warning" data-action="check" data-server-id="${server.id}">Check</button>
            <button class="btn btn-primary" data-action="edit" data-server-id="${server.id}">Edit</button>
            ${servers.length > 1 ? `<button class="btn btn-danger" data-action="delete" data-server-id="${server.id}">Delete</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners to action buttons
    const actionButtons = serverList.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
      button.addEventListener('click', handleServerAction);
    });
  }

  function handleServerAction(event) {
    if (!isAuthenticated) return;
    
    const action = event.target.dataset.action;
    const serverId = parseInt(event.target.dataset.serverId);
    
    switch (action) {
      case 'switch':
        switchToServer(serverId);
        break;
      case 'check':
        checkServer(serverId);
        break;
      case 'edit':
        editServer(serverId);
        break;
      case 'delete':
        deleteServer(serverId);
        break;
    }
  }

  async function saveServer() {
    if (!isAuthenticated) return;
    
    const nameInput = document.getElementById('server-name');
    const ipInput = document.getElementById('server-ip');
    const portInput = document.getElementById('server-port');
    
    if (!nameInput || !ipInput || !portInput) {
      showNotification('Form elements not found', 'error');
      return;
    }

    const name = nameInput.value.trim();
    const ip = ipInput.value.trim();
    const port = parseInt(portInput.value);

    if (!name || !ip || !port) {
      showNotification('Please fill all fields', 'error');
      return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      showNotification('Invalid IP address format', 'error');
      return;
    }

    // Validate port range
    if (port < 1 || port > 65535) {
      showNotification('Port must be between 1 and 65535', 'error');
      return;
    }

    try {
      if (window.electronAPI) {
        if (editingServerId) {
          await window.electronAPI.updateServer(editingServerId, { name, ip, port });
          showNotification('Server updated successfully', 'success');
        } else {
          await window.electronAPI.addServer({ name, ip, port });
          showNotification('Server added successfully', 'success');
        }
      } else {
        // Fallback for testing
        const serverData = { name, ip, port, id: Date.now(), status: 'unknown' };
        if (editingServerId) {
          const index = servers.findIndex(s => s.id === editingServerId);
          if (index !== -1) {
            servers[index] = { ...servers[index], ...serverData, id: editingServerId };
          }
          showNotification('Server updated successfully', 'success');
        } else {
          servers.push(serverData);
          showNotification('Server added successfully', 'success');
        }
      }
      
      cancelForm();
      loadServers();
    } catch (error) {
      console.error('Error saving server:', error);
      showNotification('Failed to save server', 'error');
    }
  }

  async function switchToServer(serverId) {
    if (!isAuthenticated) return;
    
    try {
      if (window.electronAPI && window.electronAPI.setActiveServer) {
        const server = await window.electronAPI.setActiveServer(serverId);
        if (server) {
          showNotification(`Switched to ${server.name}`, 'success');
          loadServers();
        }
      } else {
        // Fallback for testing
        const server = servers.find(s => s.id === serverId);
        if (server) {
          currentServer = server;
          showNotification(`Switched to ${server.name}`, 'success');
          renderServerList();
        }
      }
    } catch (error) {
      console.error('Error switching server:', error);
      showNotification('Failed to switch server', 'error');
    }
  }

  async function checkServer(serverId) {
    if (!isAuthenticated) return;
    
    try {
      if (window.electronAPI && window.electronAPI.checkServerStatus) {
        const result = await window.electronAPI.checkServerStatus(serverId);
        if (result) {
          showNotification(`Server status: ${result.status.toUpperCase()}`, 'success');
          loadServers();
        }
      } else {
        // Fallback for testing
        const server = servers.find(s => s.id === serverId);
        if (server) {
          server.status = Math.random() > 0.5 ? 'online' : 'offline';
          server.lastChecked = Date.now();
          showNotification(`Server status: ${server.status.toUpperCase()}`, 'success');
          renderServerList();
        }
      }
    } catch (error) {
      console.error('Error checking server:', error);
      showNotification('Failed to check server', 'error');
    }
  }

  async function checkAllServers() {
    if (!isAuthenticated) return;
    
    try {
      const button = document.getElementById('checkAllBtn');
      if (!button) return;
      
      const originalText = button.textContent;
      button.classList.add('loading');
      button.textContent = 'Checking...';
      
      if (window.electronAPI && window.electronAPI.checkAllServers) {
        await window.electronAPI.checkAllServers();
      } else {
        // Fallback for testing
        servers.forEach(server => {
          server.status = Math.random() > 0.5 ? 'online' : 'offline';
          server.lastChecked = Date.now();
        });
      }
      
      showNotification('All servers checked', 'success');
      loadServers();
      
      button.classList.remove('loading');
      button.textContent = originalText;
    } catch (error) {
      console.error('Error checking servers:', error);
      showNotification('Failed to check servers', 'error');
      
      const button = document.getElementById('checkAllBtn');
      if (button) {
        button.classList.remove('loading');
        button.textContent = '🔄 Check All Servers';
      }
    }
  }

  function editServer(serverId) {
    if (!isAuthenticated) return;
    
    const server = servers.find(s => s.id === serverId);
    if (!server) {
      showNotification('Server not found', 'error');
      return;
    }

    const form = document.getElementById('add-server-form');
    const formTitle = document.getElementById('form-title');
    const saveBtn = document.getElementById('saveServerBtn');
    const nameInput = document.getElementById('server-name');
    const ipInput = document.getElementById('server-ip');
    const portInput = document.getElementById('server-port');
    
    if (!form || !formTitle || !saveBtn || !nameInput || !ipInput || !portInput) {
      showNotification('Form elements not found', 'error');
      return;
    }
    
    // Fill form with current server data
    nameInput.value = server.name;
    ipInput.value = server.ip;
    portInput.value = server.port;
    
    // Update form appearance for editing
    formTitle.textContent = `Edit Server: ${server.name}`;
    saveBtn.textContent = 'Update';
    editingServerId = serverId;
    
    // Show the form
    form.style.display = 'block';
    
    showNotification('Edit mode activated', 'warning');
  }

  async function deleteServer(serverId) {
    if (!isAuthenticated) return;
    
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    if (!confirm(`Are you sure you want to delete "${server.name}"?`)) {
      return;
    }

    try {
      if (window.electronAPI && window.electronAPI.deleteServer) {
        const success = await window.electronAPI.deleteServer(serverId);
        if (success) {
          showNotification('Server deleted successfully', 'success');
          loadServers();
        } else {
          showNotification('Cannot delete the last server', 'error');
        }
      } else {
        // Fallback for testing
        if (servers.length > 1) {
          servers = servers.filter(s => s.id !== serverId);
          showNotification('Server deleted successfully', 'success');
          renderServerList();
        } else {
          showNotification('Cannot delete the last server', 'error');
        }
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      showNotification('Failed to delete server', 'error');
    }
  }

  // Event listeners setup
  function setupEventListeners() {
    // Main trigger
    trigger.addEventListener('click', toggleSidebar);
    
    // Wait for elements to be available
    const setupFormListeners = () => {
      const closeSidebarBtn = document.getElementById('closeSidebarBtn');
      const checkAllBtn = document.getElementById('checkAllBtn');
      const addServerBtn = document.getElementById('addServerBtn');
      const saveServerBtn = document.getElementById('saveServerBtn');
      const cancelFormBtn = document.getElementById('cancelFormBtn');
      const loginBtn = document.getElementById('loginBtn');
      const logoutBtn = document.getElementById('logoutBtn');

      // Basic navigation
      if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
      
      // Authentication
      if (loginBtn) loginBtn.addEventListener('click', authenticate);
      if (logoutBtn) logoutBtn.addEventListener('click', logout);
      
      // Server management (only work when authenticated)
      if (checkAllBtn) checkAllBtn.addEventListener('click', checkAllServers);
      if (addServerBtn) addServerBtn.addEventListener('click', toggleAddForm);
      if (saveServerBtn) saveServerBtn.addEventListener('click', saveServer);
      if (cancelFormBtn) cancelFormBtn.addEventListener('click', cancelForm);

      // Login form validation and submission
      const passwordInput = document.getElementById('login-password');

      if (passwordInput) {
        // Enter key submission for login
        passwordInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            authenticate();
          }
        });

        passwordInput.addEventListener('input', function() {
          // Hide any visible error when typing password
          const errorDiv = document.getElementById('login-error');
          if (errorDiv) errorDiv.style.display = 'none';
        });
      }

      // Server form validation
      const serverNameInput = document.getElementById('server-name');
      const serverIpInput = document.getElementById('server-ip');
      const serverPortInput = document.getElementById('server-port');

      if (serverNameInput) {
        serverNameInput.addEventListener('input', function() {
          if (this.value.length > 50) {
            this.value = this.value.substring(0, 50);
            showNotification('Server name maximum 50 characters', 'warning');
          }
        });
      }

      if (serverIpInput) {
        serverIpInput.addEventListener('input', function() {
          this.value = this.value.trim();
          this.value = this.value.replace(/[^0-9.]/g, '');
        });
      }

      if (serverPortInput) {
        serverPortInput.addEventListener('input', function() {
          this.value = this.value.replace(/[^0-9]/g, '');
          if (parseInt(this.value) > 65535) {
            this.value = '65535';
          }
        });
      }

      // Enable form submission with Enter key for server form
      const formInputs = [serverNameInput, serverIpInput, serverPortInput];
      formInputs.forEach(input => {
        if (input) {
          input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && isAuthenticated) {
              e.preventDefault();
              saveServer();
            }
          });
        }
      });
    };

    // Setup form listeners after a brief delay to ensure DOM is ready
    setTimeout(setupFormListeners, 100);
  }

  // Listen for Electron events
  function setupElectronListeners() {
    if (window.electronAPI) {
      if (window.electronAPI.onToggleSidebar) {
        window.electronAPI.onToggleSidebar(() => {
          toggleSidebar();
        });
      }

      if (window.electronAPI.onServerSwitched) {
        window.electronAPI.onServerSwitched((event, server) => {
          if (isAuthenticated) {
            showNotification(`Auto-switched to ${server.name}`, 'warning');
            loadServers();
          }
        });
      }

      if (window.electronAPI.onServersUpdated) {
        window.electronAPI.onServersUpdated(() => {
          if (isOpen && isAuthenticated) {
            loadServers();
          }
        });
      }
    }
  }

  // Handle clicks outside sidebar
  function setupOutsideClickHandler() {
    document.addEventListener('click', (e) => {
      if (isOpen && !sidebar.contains(e.target) && !trigger.contains(e.target)) {
        closeSidebar();
      }
    });
  }

  // Keyboard shortcuts
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'm') {
          e.preventDefault();
          toggleSidebar();
        } else if (e.key === 'r' && isOpen && isAuthenticated) {
          e.preventDefault();
          checkAllServers();
        }
      }
      
      if (e.key === 'Escape') {
        if (isOpen) {
          closeSidebar();
        }
      }

      // Quick logout with Ctrl+L when sidebar is open
      if ((e.ctrlKey || e.metaKey) && e.key === 'l' && isOpen && isAuthenticated) {
        e.preventDefault();
        logout();
      }
    });
  }

  // Auto-refresh status (only when authenticated)
  function setupAutoRefresh() {
    setInterval(() => {
      if (isOpen && isAuthenticated && servers.length > 0) {
        loadServers();
      }
    }, 30000);
  }

  // Session timeout (optional security feature)
  function setupSessionTimeout() {
    let lastActivity = Date.now();
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    // Update last activity on user interaction
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('mousemove', updateActivity);

    // Check for session timeout every minute
    setInterval(() => {
      if (isAuthenticated && Date.now() - lastActivity > SESSION_TIMEOUT) {
        showNotification('Session expired. Please login again.', 'warning');
        logout();
      }
    }, 60000);
  }

  // Initialize everything
  function initialize() {
    setupEventListeners();
    setupElectronListeners();
    setupOutsideClickHandler();
    setupKeyboardShortcuts();
    setupAutoRefresh();
    setupSessionTimeout();
    
    console.log('IP Manager Sidebar with Authentication injected successfully');
    
    // Show initial focus on password field when page loads
    setTimeout(() => {
      const passwordInput = document.getElementById('login-password');
      if (passwordInput && !isAuthenticated) {
        passwordInput.focus();
      }
    }, 500);
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();