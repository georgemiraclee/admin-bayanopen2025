const { app, BrowserWindow, ipcMain, Menu, dialog, screen } = require('electron');
const { Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// File untuk menyimpan konfigurasi IP
const configPath = path.join(__dirname, 'ip-config.json');

class IPManager {
  constructor() {
    this.config = this.loadConfig();
    this.currentWindow = null;
    this.loginWindow = null;
    this.checkInterval = null;
    this.isReady = false;
    this.isAuthenticated = false;
  }

  // Load konfigurasi dari file
  loadConfig() {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(data);
        
        // Ensure windowState exists
        if (!config.windowState) {
          config.windowState = {
            width: 1200,
            height: 800,
            x: undefined,
            y: undefined,
            isMaximized: false
          };
        }
        
        return config;
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    
    // Default config jika file tidak ada
    return {
      servers: [
        { 
          id: 1, 
          name: 'Server Utama', 
          ip: '10.2.97.84', 
          port: 3000, 
          active: true,
          lastChecked: null,
          status: 'unknown'
        }
      ],
      currentServerId: 1,
      autoCheck: true,
      checkInterval: 30000, // 30 detik
      windowState: {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        isMaximized: false
      }
    };
  }

  // Simpan konfigurasi ke file
  saveConfig() {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  // Save window state
  saveWindowState(bounds, isMaximized) {
    if (!this.config.windowState) {
      this.config.windowState = {};
    }
    
    this.config.windowState = {
      width: bounds.width || 1200,
      height: bounds.height || 800,
      x: bounds.x,
      y: bounds.y,
      isMaximized: isMaximized || false
    };
    this.saveConfig();
  }

  // Dapatkan server aktif
  getCurrentServer() {
    return this.config.servers.find(server => server.id === this.config.currentServerId);
  }

  // Dapatkan URL lengkap
  getCurrentURL() {
    const server = this.getCurrentServer();
    if (server) {
      return `http://${server.ip}:${server.port}/admin.html`;
    }
    return null;
  }

  // Tambah server baru
  addServer(serverData) {
    const newId = Math.max(...this.config.servers.map(s => s.id), 0) + 1;
    const newServer = {
      id: newId,
      name: serverData.name,
      ip: serverData.ip,
      port: serverData.port,
      active: false,
      lastChecked: null,
      status: 'unknown'
    };
    
    this.config.servers.push(newServer);
    this.saveConfig();
    return newServer;
  }

  // Update server
  updateServer(id, serverData) {
    const index = this.config.servers.findIndex(s => s.id === id);
    if (index !== -1) {
      this.config.servers[index] = { ...this.config.servers[index], ...serverData };
      this.saveConfig();
      return this.config.servers[index];
    }
    return null;
  }

  // Hapus server
  deleteServer(id) {
    const index = this.config.servers.findIndex(s => s.id === id);
    if (index !== -1 && this.config.servers.length > 1) {
      this.config.servers.splice(index, 1);
      
      // Jika server yang dihapus adalah server aktif, pilih server pertama
      if (this.config.currentServerId === id) {
        this.config.currentServerId = this.config.servers[0].id;
      }
      
      this.saveConfig();
      return true;
    }
    return false;
  }

  // Set server aktif
  setActiveServer(id) {
    const server = this.config.servers.find(s => s.id === id);
    if (server) {
      // Set semua server ke inactive
      this.config.servers.forEach(s => s.active = false);
      
      // Set server yang dipilih ke active
      server.active = true;
      this.config.currentServerId = id;
      this.saveConfig();
      
      return server;
    }
    return null;
  }

  // Cek status server dengan timeout yang lebih responsif
  async checkServerStatus(server) {
    return new Promise((resolve) => {
      const http = require('http');
      const url = `http://${server.ip}:${server.port}/admin.html`;
      
      const timeout = 3000; // Reduced to 3 seconds for better responsiveness
      const req = http.get(url, { timeout }, (res) => {
        server.status = res.statusCode === 200 ? 'online' : 'error';
        server.lastChecked = new Date().toISOString();
        resolve(server.status);
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        server.status = 'timeout';
        server.lastChecked = new Date().toISOString();
        resolve('timeout');
      });

      req.on('error', () => {
        server.status = 'offline';
        server.lastChecked = new Date().toISOString();
        resolve('offline');
      });
    });
  }

  // Cek semua server dengan batching untuk performa
  async checkAllServers() {
    // Show loading state
    if (this.currentWindow) {
      this.currentWindow.webContents.send('checking-servers', true);
    }

    try {
      const promises = this.config.servers.map(server => this.checkServerStatus(server));
      await Promise.all(promises);
      this.saveConfig();
      
      // Send update to renderer
      if (this.currentWindow) {
        this.currentWindow.webContents.send('servers-updated', this.config.servers);
      }
    } catch (error) {
      console.error('Error checking servers:', error);
    } finally {
      // Hide loading state
      if (this.currentWindow) {
        this.currentWindow.webContents.send('checking-servers', false);
      }
    }
  }

  // Auto switch dengan debouncing
  async autoSwitchIfNeeded() {
    if (!this.isReady) return;

    const currentServer = this.getCurrentServer();
    await this.checkServerStatus(currentServer);
    
    if (currentServer.status === 'offline' || currentServer.status === 'timeout') {
      // Cari server lain yang online
      for (let server of this.config.servers) {
        if (server.id !== currentServer.id) {
          await this.checkServerStatus(server);
          if (server.status === 'online') {
            this.setActiveServer(server.id);
            console.log(`Auto switched to server: ${server.name}`);
            
            // Smooth reload dengan loading indicator
            if (this.currentWindow) {
              this.currentWindow.webContents.send('server-switching', server);
              setTimeout(() => {
                this.currentWindow.loadURL(this.getCurrentURL());
                this.currentWindow.webContents.send('server-switched', server);
              }, 500);
            }
            break;
          }
        }
      }
    }
  }

  // Start auto checking dengan proper cleanup
  startAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    if (this.config.autoCheck) {
      this.checkInterval = setInterval(() => {
        this.autoSwitchIfNeeded();
      }, this.config.checkInterval);
    }
  }

  // Stop auto checking
  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Enhanced sidebar injection dengan error handling
  injectSidebar() {
    if (this.currentWindow && this.currentWindow.webContents) {
      try {
        const sidebarPath = path.join(__dirname, 'sidebar-inject.js');
        if (fs.existsSync(sidebarPath)) {
          const sidebarScript = fs.readFileSync(sidebarPath, 'utf8');
          this.currentWindow.webContents.executeJavaScript(sidebarScript);
          
          // Inject responsive CSS
          const responsiveCSS = `
            (function() {
              const style = document.createElement('style');
              style.textContent = \`
                /* Responsive adjustments */
                @media (max-width: 768px) {
                  .sidebar { width: 100% !important; }
                  .main-content { margin-left: 0 !important; }
                }
                
                /* Smooth transitions */
                * { transition: all 0.2s ease !important; }
                
                /* Loading overlay */
                .app-loading {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0,0,0,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 9999;
                  color: white;
                  font-size: 18px;
                }
              \`;
              document.head.appendChild(style);
            })();
          `;
          this.currentWindow.webContents.executeJavaScript(responsiveCSS);
        }
      } catch (error) {
        console.error('Error injecting sidebar:', error);
      }
    }
  }

  // Setup window responsiveness
  setupWindowResponsiveness(win) {
    // Save window state on resize/move
    const saveState = () => {
      try {
        if (!win.isDestroyed()) {
          const bounds = win.getBounds();
          const isMaximized = win.isMaximized();
          this.saveWindowState(bounds, isMaximized);
        }
      } catch (error) {
        console.error('Error saving window state:', error);
      }
    };

    // Debounced save to avoid too frequent saves
    let saveTimeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveState, 500);
    };

    win.on('resize', debouncedSave);
    win.on('move', debouncedSave);
    win.on('maximize', saveState);
    win.on('unmaximize', saveState);

    // Handle window close
    win.on('close', (e) => {
      try {
        saveState();
        this.stopAutoCheck();
      } catch (error) {
        console.error('Error on window close:', error);
      }
    });

    // Responsive zoom based on window size
    win.on('resize', () => {
      try {
        const bounds = win.getBounds();
        let zoomLevel = 1.2;
        
        if (bounds.width < 800) {
          zoomLevel = 0.8;
        } else if (bounds.width < 1000) {
          zoomLevel = 0.9;
        }
        
        win.webContents.setZoomLevel(Math.log(zoomLevel) / Math.log(1.2));
      } catch (error) {
        console.error('Error setting zoom level:', error);
      }
    });
  }
}

// Instance global
const ipManager = new IPManager();

// Create login window
function createLoginWindow() {
  const loginWin = new BrowserWindow({
    width: 450,
    height: 650,
    resizable: false,
    center: true,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, 'bayanopen.ico'),
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  ipManager.loginWindow = loginWin;

  // Load login page
  const loginPath = path.join(__dirname, 'login.html');
  loginWin.loadFile(loginPath);

  // Show when ready
  loginWin.webContents.once('did-finish-load', () => {
    loginWin.show();
    loginWin.focus();
  });

  // Handle window close
  loginWin.on('closed', () => {
    ipManager.loginWindow = null;
    if (!ipManager.isAuthenticated) {
      app.quit();
    }
  });

  return loginWin;
}

function createWindow() {
  // Get primary display dimensions with error handling
  let screenWidth = 1920;
  let screenHeight = 1080;
  
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.workAreaSize) {
      screenWidth = primaryDisplay.workAreaSize.width;
      screenHeight = primaryDisplay.workAreaSize.height;
    }
  } catch (error) {
    console.error('Error getting screen dimensions:', error);
  }

  // Calculate responsive window size
  const minWidth = 800;
  const minHeight = 600;
  const maxWidth = Math.min(1400, screenWidth * 0.9);
  const maxHeight = Math.min(1000, screenHeight * 0.9);

  const windowState = ipManager.config.windowState || {};
  
  const win = new BrowserWindow({
    width: Math.max(minWidth, Math.min(windowState.width || 1200, maxWidth)),
    height: Math.max(minHeight, Math.min(windowState.height || 800, maxHeight)),
    x: windowState.x,
    y: windowState.y,
    minWidth,
    minHeight,
    icon: path.join(__dirname, 'bayanopen.ico'),
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // For local development
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    win.maximize();
  }

  // Center window if no saved position
  if (!windowState.x && !windowState.y) {
    win.center();
  }

  ipManager.currentWindow = win;
  ipManager.setupWindowResponsiveness(win);

  // Enhanced loading sequence
  const showWindow = () => {
    win.show();
    win.focus();
    ipManager.isReady = true;
  };

  // Load URL dari server aktif
  const url = ipManager.getCurrentURL();
  if (url) {
    win.loadURL(url);
    
    // Show window when ready
    win.webContents.once('did-finish-load', () => {
      setTimeout(showWindow, 200);
    });

    // Fallback show after timeout
    setTimeout(() => {
      if (!win.isVisible()) {
        showWindow();
      }
    }, 5000);
  } else {
    console.error('No active server found');
    showWindow();
  }

  // Enhanced event handlers
  win.webContents.on('dom-ready', () => {
    setTimeout(() => {
      ipManager.injectSidebar();
    }, 200);
  });

  win.webContents.on('did-navigate', () => {
    setTimeout(() => {
      ipManager.injectSidebar();
    }, 500);
  });

  win.webContents.on('did-navigate-in-page', () => {
    setTimeout(() => {
      ipManager.injectSidebar();
    }, 200);
  });

  // Handle navigation errors
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorDescription);
    
    // Try to switch to another server
    ipManager.autoSwitchIfNeeded();
  });

  // Start auto checking after window is ready
  setTimeout(() => {
    ipManager.startAutoCheck();
  }, 2000);

  return win;
}

// Handle login success
ipcMain.on('login-success', () => {
  ipManager.isAuthenticated = true;
  
  // Close login window
  if (ipManager.loginWindow) {
    ipManager.loginWindow.close();
  }
  
  // Create main window
  createWindow();
  createMenu();
});

// Enhanced IPC Handlers
ipcMain.handle('get-servers', () => {
  return ipManager.config.servers;
});

ipcMain.handle('get-current-server', () => {
  return ipManager.getCurrentServer();
});

ipcMain.handle('add-server', (event, serverData) => {
  return ipManager.addServer(serverData);
});

ipcMain.handle('update-server', (event, id, serverData) => {
  return ipManager.updateServer(id, serverData);
});

ipcMain.handle('delete-server', (event, id) => {
  return ipManager.deleteServer(id);
});

ipcMain.handle('set-active-server', async (event, id) => {
  const server = ipManager.setActiveServer(id);
  if (server && ipManager.currentWindow) {
    // Show loading state
    ipManager.currentWindow.webContents.send('server-switching', server);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    ipManager.currentWindow.loadURL(ipManager.getCurrentURL());
  }
  return server;
});

ipcMain.handle('check-server-status', async (event, serverId) => {
  const server = ipManager.config.servers.find(s => s.id === serverId);
  if (server) {
    const status = await ipManager.checkServerStatus(server);
    ipManager.saveConfig();
    return { server, status };
  }
  return null;
});

ipcMain.handle('check-all-servers', async () => {
  await ipManager.checkAllServers();
  return ipManager.config.servers;
});

ipcMain.handle('get-config', () => {
  return ipManager.config;
});

ipcMain.handle('update-config', (event, newConfig) => {
  ipManager.config = { ...ipManager.config, ...newConfig };
  ipManager.saveConfig();
  
  // Restart auto check if interval changed
  if (newConfig.checkInterval || newConfig.autoCheck !== undefined) {
    ipManager.startAutoCheck();
  }
  
  return ipManager.config;
});

// Get window info for responsive adjustments
ipcMain.handle('get-window-info', () => {
  try {
    if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
      const bounds = ipManager.currentWindow.getBounds();
      return {
        width: bounds.width || 1200,
        height: bounds.height || 800,
        isMaximized: ipManager.currentWindow.isMaximized()
      };
    }
  } catch (error) {
    console.error('Error getting window info:', error);
  }
  return {
    width: 1200,
    height: 800,
    isMaximized: false
  };
});

// Enhanced menu with responsive features
function createMenu() {
  const template = [
    {
      label: 'Server',
      submenu: [
        {
          label: 'Manage Servers',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (ipManager.currentWindow) {
              ipManager.currentWindow.webContents.send('toggle-sidebar');
            }
          }
        },
        {
          label: 'Check All Servers',
          accelerator: 'CmdOrCtrl+R',
          click: async () => {
            await ipManager.checkAllServers();
          }
        },
        { type: 'separator' },
        {
          label: 'Auto Check',
          type: 'checkbox',
          checked: ipManager.config.autoCheck,
          click: (menuItem) => {
            ipManager.config.autoCheck = menuItem.checked;
            ipManager.saveConfig();
            ipManager.startAutoCheck();
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (ipManager.currentWindow) {
              ipManager.currentWindow.reload();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            // Close main window and show login
            if (ipManager.currentWindow) {
              ipManager.currentWindow.close();
            }
            ipManager.isAuthenticated = false;
            ipManager.stopAutoCheck();
            createLoginWindow();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                const currentZoom = ipManager.currentWindow.webContents.getZoomLevel();
                ipManager.currentWindow.webContents.setZoomLevel(currentZoom + 0.5);
              } catch (error) {
                console.error('Error zooming in:', error);
              }
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                const currentZoom = ipManager.currentWindow.webContents.getZoomLevel();
                ipManager.currentWindow.webContents.setZoomLevel(currentZoom - 0.5);
              } catch (error) {
                console.error('Error zooming out:', error);
              }
            }
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                ipManager.currentWindow.webContents.setZoomLevel(0);
              } catch (error) {
                console.error('Error resetting zoom:', error);
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                ipManager.currentWindow.setFullScreen(!ipManager.currentWindow.isFullScreen());
              } catch (error) {
                console.error('Error toggling fullscreen:', error);
              }
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Start with login window
  createLoginWindow();
});

app.on('window-all-closed', () => {
  ipManager.stopAutoCheck();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (ipManager.isAuthenticated) {
      createWindow();
    } else {
      createLoginWindow();
    }
  }
});

// Handle app termination
app.on('before-quit', () => {
  ipManager.stopAutoCheck();
});