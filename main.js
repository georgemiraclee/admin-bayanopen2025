const { app, BrowserWindow, ipcMain, Menu, dialog, screen } = require("electron");
const { Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

// PERBAIKAN 1: Gunakan userData directory untuk menyimpan config
const userDataPath = app.getPath("userData");
const configPath = path.join(userDataPath, "ip-config.json");

console.log("Config will be saved to:", configPath);

// PERBAIKAN 2: Ensure userData directory exists
if (!fs.existsSync(userDataPath)) {
  try {
    fs.mkdirSync(userDataPath, { recursive: true });
    console.log("Created userData directory:", userDataPath);
  } catch (error) {
    console.error("Error creating userData directory:", error);
  }
}

// Utility function to validate and get proper window position
function getValidWindowPosition(windowState, screenBounds) {
  const { width: winWidth = 1200, height: winHeight = 800, x, y } = windowState;
  const { width: screenWidth, height: screenHeight } = screenBounds;

  // Calculate center position
  const centerX = Math.round((screenWidth - winWidth) / 2);
  const centerY = Math.round((screenHeight - winHeight) / 2);

  // If no saved position or position is invalid, use center
  if (x === undefined || y === undefined) {
    console.log("No saved position found, centering window");
    return { x: centerX, y: centerY };
  }

  // Check if saved position is within screen bounds with tolerance
  const isXValid = x >= -100 && x <= screenWidth - 200;
  const isYValid = y >= -50 && y <= screenHeight - 100;

  if (!isXValid || !isYValid) {
    console.log("Saved window position is out of bounds, centering window");
    return { x: centerX, y: centerY };
  }

  return { x, y };
}

class IPManager {
  constructor() {
    this.config = this.loadConfig();
    this.currentWindow = null;
    this.loginWindow = null;
    this.checkInterval = null;
    this.isReady = false;
    this.isAuthenticated = false;

    // PERBAIKAN 3: Force save config on startup to ensure file exists
    this.ensureConfigExists();
  }

  // PERBAIKAN 4: Ensure config file exists and is writable
  ensureConfigExists() {
    try {
      // Test write permissions
      this.saveConfigSync(this.config);
      console.log("Config file verified and writable");
    } catch (error) {
      console.error("Error ensuring config exists:", error);

      // Try alternative location if userData fails
      try {
        const altConfigPath = path.join(os.homedir(), ".bayanopen-ip-config.json");
        this.configPath = altConfigPath;
        this.saveConfigSync(this.config);
        console.log("Using alternative config path:", altConfigPath);
      } catch (altError) {
        console.error("Alternative config path also failed:", altError);
      }
    }
  }

  // PERBAIKAN 5: Enhanced load config with better error handling and validation
  loadConfig() {
    console.log("Loading config from:", configPath);

    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf8");
        console.log("Raw config data length:", data.length);

        let config;
        try {
          config = JSON.parse(data);
          console.log("Config parsed successfully");
        } catch (parseError) {
          console.error("Error parsing config JSON:", parseError);
          throw new Error("Invalid JSON in config file");
        }

        // PERBAIKAN 6: Deep validation and fixing of config structure
        if (!config.servers || !Array.isArray(config.servers)) {
          console.log("Fixing servers array");
          config.servers = [];
        }

        // Ensure at least one server exists
        if (config.servers.length === 0) {
          console.log("Adding default server");
          config.servers.push({
            id: 1,
            name: "Server Utama",
            ip: "0.0.0.0",
            port: 3000,
            active: true,
            lastChecked: null,
            status: "unknown",
          });
          config.currentServerId = 1;
        }

        // PERBAIKAN 7: Validate and fix currentServerId
        if (!config.currentServerId || !config.servers.find((s) => s.id === config.currentServerId)) {
          const firstServer = config.servers[0];
          config.currentServerId = firstServer.id;
          config.lastActiveServerId = firstServer.id;
          console.log(`Fixed currentServerId to: ${config.currentServerId}`);
        }

        // Ensure lastActiveServerId exists
        if (!config.lastActiveServerId) {
          config.lastActiveServerId = config.currentServerId;
        }

        // Ensure active flag consistency
        config.servers.forEach((server) => {
          server.active = server.id === config.currentServerId;
        });

        // Ensure windowState exists with proper defaults
        if (!config.windowState) {
          config.windowState = {
            width: 1200,
            height: 800,
            x: undefined,
            y: undefined,
            isMaximized: false,
          };
        }

        // Add autoCheck settings if missing
        if (config.autoCheck === undefined) {
          config.autoCheck = true;
        }
        if (!config.checkInterval) {
          config.checkInterval = 30000;
        }

        console.log("Config loaded and validated:", {
          currentServerId: config.currentServerId,
          lastActiveServerId: config.lastActiveServerId,
          serverCount: config.servers.length,
          activeServer: config.servers.find((s) => s.active)?.name,
        });

        return config;
      } else {
        console.log("Config file does not exist, creating default");
      }
    } catch (error) {
      console.error("Error loading config:", error);
      console.log("Creating new default config due to error");
    }

    // PERBAIKAN 8: Enhanced default config
    const defaultConfig = {
      servers: [
        {
          id: 1,
          name: "Server Utama",
          ip: "10.2.97.84",
          port: 3000,
          active: true,
          lastChecked: null,
          status: "unknown",
          createdAt: new Date().toISOString(),
        },
      ],
      currentServerId: 1,
      lastActiveServerId: 1,
      autoCheck: true,
      checkInterval: 30000,
      windowState: {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        isMaximized: false,
      },
      version: "2.0",
      lastSaved: new Date().toISOString(),
    };

    // PERBAIKAN 9: Force save default config immediately with error handling
    try {
      this.saveConfigSync(defaultConfig);
      console.log("Default config saved successfully");
    } catch (saveError) {
      console.error("Error saving default config:", saveError);
    }

    return defaultConfig;
  }

  // PERBAIKAN 10: Enhanced save config with multiple backup mechanisms
  saveConfig() {
    try {
      // Update timestamps
      this.config.lastSaved = new Date().toISOString();

      // Update lastActiveServerId before saving
      if (this.config.currentServerId) {
        this.config.lastActiveServerId = this.config.currentServerId;
      }

      // Ensure data consistency
      this.config.servers.forEach((server) => {
        server.active = server.id === this.config.currentServerId;
      });

      // PERBAIKAN 11: Atomic write with backup
      const configData = JSON.stringify(this.config, null, 2);
      const backupPath = configPath + ".backup";

      // Create backup of current config if it exists
      if (fs.existsSync(configPath)) {
        try {
          fs.copyFileSync(configPath, backupPath);
        } catch (backupError) {
          console.warn("Could not create backup:", backupError);
        }
      }

      // Write new config
      fs.writeFileSync(configPath, configData, "utf8");

      // Verify the write was successful
      const verification = fs.readFileSync(configPath, "utf8");
      const verifiedConfig = JSON.parse(verification);

      if (verifiedConfig.currentServerId !== this.config.currentServerId) {
        throw new Error("Config verification failed - currentServerId mismatch");
      }

      console.log("Config saved and verified successfully:", {
        currentServerId: this.config.currentServerId,
        lastActiveServerId: this.config.lastActiveServerId,
        timestamp: this.config.lastSaved,
        fileSize: configData.length,
      });

      return true;
    } catch (error) {
      console.error("Error saving config:", error);

      // PERBAIKAN 12: Try to restore from backup if save failed
      const backupPath = configPath + ".backup";
      if (fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, configPath);
          console.log("Restored config from backup");
        } catch (restoreError) {
          console.error("Could not restore from backup:", restoreError);
        }
      }

      return false;
    }
  }

  // PERBAIKAN 13: Enhanced synchronous save for critical operations
  saveConfigSync(config = null) {
    try {
      const configToSave = config || this.config;

      // Update metadata
      configToSave.lastSaved = new Date().toISOString();

      if (configToSave.currentServerId) {
        configToSave.lastActiveServerId = configToSave.currentServerId;
      }

      // Ensure active flags are correct
      if (configToSave.servers) {
        configToSave.servers.forEach((server) => {
          server.active = server.id === configToSave.currentServerId;
        });
      }

      const configData = JSON.stringify(configToSave, null, 2);

      // PERBAIKAN 14: Multiple write attempts with different strategies
      let writeSuccess = false;
      const attempts = [
        // Attempt 1: Direct write
        () => {
          fs.writeFileSync(configPath, configData, "utf8");
          return true;
        },
        // Attempt 2: Write to temp file then rename
        () => {
          const tempPath = configPath + ".tmp";
          fs.writeFileSync(tempPath, configData, "utf8");
          fs.renameSync(tempPath, configPath);
          return true;
        },
        // Attempt 3: Alternative location
        () => {
          const altPath = path.join(os.homedir(), ".bayanopen-ip-config.json");
          fs.writeFileSync(altPath, configData, "utf8");
          console.log("Saved to alternative location:", altPath);
          return true;
        },
      ];

      for (let i = 0; i < attempts.length && !writeSuccess; i++) {
        try {
          attempts[i]();
          writeSuccess = true;
          console.log(`Config saved successfully on attempt ${i + 1}`);
        } catch (attemptError) {
          console.error(`Save attempt ${i + 1} failed:`, attemptError);
        }
      }

      if (!writeSuccess) {
        throw new Error("All save attempts failed");
      }

      // Verify the write
      const verification = fs.readFileSync(configPath, "utf8");
      const verifiedConfig = JSON.parse(verification);

      if (verifiedConfig.currentServerId !== configToSave.currentServerId) {
        throw new Error("Config verification failed after sync save");
      }

      return true;
    } catch (error) {
      console.error("Error in saveConfigSync:", error);
      return false;
    }
  }

  // PERBAIKAN 15: Enhanced getCurrentServer with better state recovery
  getCurrentServer() {
    console.log("Getting current server, currentServerId:", this.config.currentServerId);

    let currentServer = this.config.servers.find((server) => server.id === this.config.currentServerId);

    // Fallback to lastActiveServerId if currentServerId is invalid
    if (!currentServer && this.config.lastActiveServerId) {
      console.log("CurrentServerId invalid, trying lastActiveServerId:", this.config.lastActiveServerId);
      currentServer = this.config.servers.find((server) => server.id === this.config.lastActiveServerId);
      if (currentServer) {
        console.log(`Recovered using lastActiveServerId: ${this.config.lastActiveServerId}`);
        this.config.currentServerId = this.config.lastActiveServerId;
        this.saveConfigSync(); // Force immediate save
      }
    }

    // Final fallback to first server
    if (!currentServer && this.config.servers.length > 0) {
      currentServer = this.config.servers[0];
      this.config.currentServerId = currentServer.id;
      this.config.lastActiveServerId = currentServer.id;
      console.log(`Final fallback to first server: ${currentServer.name} (ID: ${currentServer.id})`);
      this.saveConfigSync(); // Force immediate save
    }

    if (currentServer) {
      console.log(`Current server resolved: ${currentServer.name} (${currentServer.ip}:${currentServer.port})`);
    } else {
      console.error("No current server could be resolved!");
    }

    return currentServer;
  }

  // PERBAIKAN 16: Enhanced addServer with immediate persistence
  addServer(serverData) {
    try {
      const newId = Math.max(...this.config.servers.map((s) => s.id), 0) + 1;
      const newServer = {
        id: newId,
        name: serverData.name,
        ip: serverData.ip,
        port: serverData.port,
        active: false,
        lastChecked: null,
        status: "unknown",
        createdAt: new Date().toISOString(),
      };

      this.config.servers.push(newServer);

      // PERBAIKAN 17: Multiple save attempts for critical operations
      const saved = this.saveConfigSync();
      if (!saved) {
        // Retry save after short delay
        setTimeout(() => {
          this.saveConfigSync();
        }, 100);
      }

      console.log(`Server added: ${newServer.name} (ID: ${newId}), Saved: ${saved}`);
      return newServer;
    } catch (error) {
      console.error("Error adding server:", error);
      return null;
    }
  }

  // PERBAIKAN 18: Enhanced updateServer with immediate persistence
  updateServer(id, serverData) {
    try {
      const index = this.config.servers.findIndex((s) => s.id === id);
      if (index !== -1) {
        // Preserve important fields
        const preservedFields = {
          id: this.config.servers[index].id,
          active: this.config.servers[index].active,
          lastChecked: this.config.servers[index].lastChecked,
          status: this.config.servers[index].status,
          createdAt: this.config.servers[index].createdAt,
        };

        this.config.servers[index] = {
          ...this.config.servers[index],
          ...serverData,
          ...preservedFields,
          updatedAt: new Date().toISOString(),
        };

        // Force immediate save with verification
        const saved = this.saveConfigSync();

        console.log(`Server updated: ${serverData.name} (ID: ${id}), Saved: ${saved}`);
        return this.config.servers[index];
      }
    } catch (error) {
      console.error("Error updating server:", error);
    }
    return null;
  }

  // PERBAIKAN 19: Enhanced setActiveServer with guaranteed persistence
  setActiveServer(id) {
    try {
      console.log(`Setting active server to ID: ${id}`);

      const server = this.config.servers.find((s) => s.id === id);
      if (!server) {
        console.error(`Server with ID ${id} not found`);
        return null;
      }

      // Set all servers to inactive
      this.config.servers.forEach((s) => {
        s.active = false;
      });

      // Set selected server to active
      server.active = true;
      this.config.currentServerId = id;
      this.config.lastActiveServerId = id;

      // PERBAIKAN 20: Force immediate save with multiple attempts
      let saveAttempts = 0;
      const maxAttempts = 3;
      let saved = false;

      while (!saved && saveAttempts < maxAttempts) {
        saved = this.saveConfigSync();
        saveAttempts++;

        if (!saved && saveAttempts < maxAttempts) {
          console.log(`Save attempt ${saveAttempts} failed, retrying...`);
          // Brief delay before retry
          require("child_process").execSync("timeout 0.1", { stdio: "ignore" });
        }
      }

      if (!saved) {
        console.error("Failed to save config after multiple attempts");
      }

      console.log(`Active server changed to: ${server.name} (ID: ${id}), Saved: ${saved} (attempts: ${saveAttempts})`);

      // PERBAIKAN 21: Verify the save by reading back
      setTimeout(() => {
        try {
          const verifyConfig = this.loadConfig();
          if (verifyConfig.currentServerId !== id) {
            console.error("Config verification failed, retrying save...");
            this.config.currentServerId = id;
            this.config.lastActiveServerId = id;
            this.saveConfigSync();
          } else {
            console.log("Config verification successful");
          }
        } catch (verifyError) {
          console.error("Error verifying config save:", verifyError);
        }
      }, 500);

      return server;
    } catch (error) {
      console.error("Error setting active server:", error);
      return null;
    }
  }

  // PERBAIKAN 22: Enhanced deleteServer with proper state management
  deleteServer(id) {
    try {
      const index = this.config.servers.findIndex((s) => s.id === id);
      if (index !== -1 && this.config.servers.length > 1) {
        const deletedServer = this.config.servers[index];
        this.config.servers.splice(index, 1);

        // If deleted server was active, switch to first available
        if (this.config.currentServerId === id) {
          const firstServer = this.config.servers[0];
          this.config.currentServerId = firstServer.id;
          this.config.lastActiveServerId = firstServer.id;
          firstServer.active = true;

          console.log(`Deleted active server, switched to: ${firstServer.name} (ID: ${firstServer.id})`);
        }

        // Force immediate save
        const saved = this.saveConfigSync();
        console.log(`Server deleted: ${deletedServer.name} (ID: ${id}), Saved: ${saved}`);

        return true;
      }
    } catch (error) {
      console.error("Error deleting server:", error);
    }
    return false;
  }

  // PERBAIKAN 23: Enhanced window state saving
  saveWindowState(bounds, isMaximized) {
    try {
      if (!this.config.windowState) {
        this.config.windowState = {};
      }

      // Get screen bounds for validation
      let screenBounds = { width: 1920, height: 1080 };
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        if (primaryDisplay && primaryDisplay.workAreaSize) {
          screenBounds = primaryDisplay.workAreaSize;
        }
      } catch (error) {
        console.error("Error getting screen bounds for save:", error);
      }

      // Only save position if window is not maximized and bounds are valid
      if (!isMaximized && bounds) {
        const isValidX = bounds.x >= -100 && bounds.x <= screenBounds.width - 200;
        const isValidY = bounds.y >= -50 && bounds.y <= screenBounds.height - 100;

        this.config.windowState = {
          width: Math.max(800, bounds.width || 1200),
          height: Math.max(600, bounds.height || 800),
          x: isValidX ? bounds.x : undefined,
          y: isValidY ? bounds.y : undefined,
          isMaximized: false,
          lastUpdated: new Date().toISOString(),
        };

        if (!isValidX || !isValidY) {
          console.log("Invalid window position detected, will center on next startup");
        }
      } else if (isMaximized) {
        this.config.windowState = {
          ...this.config.windowState,
          isMaximized: true,
          x: undefined,
          y: undefined,
          lastUpdated: new Date().toISOString(),
        };
      }

      // Save config immediately
      this.saveConfigSync();

      console.log("Window state saved:", this.config.windowState);
    } catch (error) {
      console.error("Error saving window state:", error);
    }
  }

  centerWindow() {
    try {
      if (this.currentWindow && !this.currentWindow.isDestroyed()) {
        const primaryDisplay = screen.getPrimaryDisplay();
        if (primaryDisplay) {
          const bounds = this.currentWindow.getBounds();
          const screenBounds = primaryDisplay.workAreaSize;

          const centerX = Math.round((screenBounds.width - bounds.width) / 2);
          const centerY = Math.round((screenBounds.height - bounds.height) / 2);

          this.currentWindow.setBounds({
            x: centerX,
            y: centerY,
            width: bounds.width,
            height: bounds.height,
          });

          console.log("Window manually centered:", { x: centerX, y: centerY });

          // Update saved state
          this.config.windowState.x = centerX;
          this.config.windowState.y = centerY;
          this.saveConfigSync();
        }
      }
    } catch (error) {
      console.error("Error centering window:", error);
    }
  }

  setupWindowResponsiveness(win) {
    const saveState = () => {
      try {
        if (!win.isDestroyed()) {
          const bounds = win.getBounds();
          const isMaximized = win.isMaximized();
          this.saveWindowState(bounds, isMaximized);
        }
      } catch (error) {
        console.error("Error saving window state:", error);
      }
    };

    let saveTimeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveState, 500);
    };

    win.on("resize", () => {
      debouncedSave();

      try {
        const bounds = win.getBounds();
        let zoomLevel = 1.0;

        if (bounds.width < 800) {
          zoomLevel = 0.8;
        } else if (bounds.width < 1000) {
          zoomLevel = 0.9;
        } else if (bounds.width > 1600) {
          zoomLevel = 1.1;
        }

        win.webContents.setZoomLevel(Math.log(zoomLevel) / Math.log(1.2));
      } catch (error) {
        console.error("Error setting zoom level:", error);
      }
    });

    win.on("move", debouncedSave);
    win.on("maximize", saveState);
    win.on("unmaximize", () => {
      setTimeout(() => {
        try {
          if (!win.isDestroyed()) {
            const bounds = win.getBounds();
            let screenBounds = { width: 1920, height: 1080 };

            try {
              const primaryDisplay = screen.getPrimaryDisplay();
              if (primaryDisplay) {
                screenBounds = primaryDisplay.workAreaSize;
              }
            } catch (e) {
              console.error("Error getting screen bounds:", e);
            }

            const validPos = getValidWindowPosition(bounds, screenBounds);

            if (bounds.x !== validPos.x || bounds.y !== validPos.y) {
              win.setBounds({
                x: validPos.x,
                y: validPos.y,
                width: bounds.width,
                height: bounds.height,
              });
              console.log("Repositioned window after unmaximize:", validPos);
            }
          }
        } catch (error) {
          console.error("Error repositioning after unmaximize:", error);
        }
      }, 100);

      saveState();
    });

    win.on("restore", () => {
      setTimeout(() => {
        try {
          if (!win.isDestroyed() && !win.isMaximized()) {
            const bounds = win.getBounds();
            let screenBounds = { width: 1920, height: 1080 };

            try {
              const primaryDisplay = screen.getPrimaryDisplay();
              if (primaryDisplay) {
                screenBounds = primaryDisplay.workAreaSize;
              }
            } catch (e) {
              console.error("Error getting screen bounds on restore:", e);
            }

            const validPos = getValidWindowPosition(bounds, screenBounds);

            if (bounds.x !== validPos.x || bounds.y !== validPos.y) {
              win.setBounds({
                x: validPos.x,
                y: validPos.y,
                width: bounds.width,
                height: bounds.height,
              });
              console.log("Repositioned window after restore:", validPos);
            }
          }
        } catch (error) {
          console.error("Error repositioning after restore:", error);
        }
      }, 100);
    });

    win.on("close", (e) => {
      try {
        console.log("Window closing, saving final state...");
        saveState();
        this.stopAutoCheck();

        // PERBAIKAN 24: Force final save with verification
        const finalSaved = this.saveConfigSync();
        console.log("Final config save result:", finalSaved);
      } catch (error) {
        console.error("Error on window close:", error);
      }
    });

    screen.on("display-metrics-changed", () => {
      setTimeout(() => {
        try {
          if (!win.isDestroyed() && !win.isMaximized()) {
            const bounds = win.getBounds();
            const primaryDisplay = screen.getPrimaryDisplay();

            if (primaryDisplay) {
              const validPos = getValidWindowPosition(bounds, primaryDisplay.workAreaSize);

              if (bounds.x !== validPos.x || bounds.y !== validPos.y) {
                win.setBounds({
                  x: validPos.x,
                  y: validPos.y,
                  width: bounds.width,
                  height: bounds.height,
                });
                console.log("Repositioned window after display change:", validPos);
              }
            }
          }
        } catch (error) {
          console.error("Error handling display change:", error);
        }
      }, 500);
    });
  }

  getCurrentURL() {
    const server = this.getCurrentServer();
    if (server) {
      const url = `http://${server.ip}:${server.port}/admin.html`;
      console.log(`Current URL: ${url} (Server: ${server.name})`);
      return url;
    }
    console.warn("No current server found for URL generation");
    return null;
  }

  async checkServerStatus(server) {
    return new Promise((resolve) => {
      const http = require("http");
      const url = `http://${server.ip}:${server.port}/admin.html`;

      const timeout = 3000;
      const req = http.get(url, { timeout }, (res) => {
        server.status = res.statusCode === 200 ? "online" : "error";
        server.lastChecked = new Date().toISOString();
        resolve(server.status);
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        server.status = "timeout";
        server.lastChecked = new Date().toISOString();
        resolve("timeout");
      });

      req.on("error", () => {
        server.status = "offline";
        server.lastChecked = new Date().toISOString();
        resolve("offline");
      });
    });
  }

  async checkAllServers() {
    if (this.currentWindow) {
      this.currentWindow.webContents.send("checking-servers", true);
    }

    try {
      const promises = this.config.servers.map((server) => this.checkServerStatus(server));
      await Promise.all(promises);

      // Save config after checking all servers
      this.saveConfigSync();

      if (this.currentWindow) {
        this.currentWindow.webContents.send("servers-updated", this.config.servers);
      }
    } catch (error) {
      console.error("Error checking servers:", error);
    } finally {
      if (this.currentWindow) {
        this.currentWindow.webContents.send("checking-servers", false);
      }
    }
  }

  async autoSwitchIfNeeded() {
    if (!this.isReady) return;

    const currentServer = this.getCurrentServer();
    if (!currentServer) return;

    await this.checkServerStatus(currentServer);

    if (currentServer.status === "offline" || currentServer.status === "timeout") {
      for (let server of this.config.servers) {
        if (server.id !== currentServer.id) {
          await this.checkServerStatus(server);
          if (server.status === "online") {
            this.setActiveServer(server.id);
            console.log(`Auto switched to server: ${server.name}`);

            if (this.currentWindow) {
              this.currentWindow.webContents.send("server-switching", server);
              setTimeout(() => {
                this.currentWindow.loadURL(this.getCurrentURL());
                this.currentWindow.webContents.send("server-switched", server);
              }, 500);
            }
            break;
          }
        }
      }
    }
  }

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

  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  injectSidebar() {
    if (this.currentWindow && this.currentWindow.webContents) {
      try {
        const sidebarPath = path.join(__dirname, "sidebar-inject.js");
        if (fs.existsSync(sidebarPath)) {
          const sidebarScript = fs.readFileSync(sidebarPath, "utf8");
          this.currentWindow.webContents.executeJavaScript(sidebarScript);

          const responsiveCSS = `
            (function() {
              const style = document.createElement('style');
              style.textContent = \`
                @media (max-width: 768px) {
                  .sidebar { width: 100% !important; }
                  .main-content { margin-left: 0 !important; }
                }
                * { transition: all 0.2s ease !important; }
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
        console.error("Error injecting sidebar:", error);
      }
    }
  }
}

// Instance global
const ipManager = new IPManager();

// PERBAIKAN 25: Enhanced IPC Handlers with better logging and error handling
ipcMain.handle("get-servers", () => {
  console.log("IPC: get-servers called, returning:", ipManager.config.servers.length, "servers");
  return ipManager.config.servers;
});

ipcMain.handle("get-current-server", () => {
  const currentServer = ipManager.getCurrentServer();
  console.log("IPC: get-current-server called, returning:", currentServer ? `${currentServer.name} (${currentServer.ip}:${currentServer.port})` : "null");
  return currentServer;
});

ipcMain.handle("add-server", (event, serverData) => {
  console.log("IPC: add-server called with:", serverData);
  const result = ipManager.addServer(serverData);
  console.log("IPC: add-server result:", result ? "success" : "failed");
  return result;
});

ipcMain.handle("update-server", (event, id, serverData) => {
  console.log("IPC: update-server called with ID:", id, "Data:", serverData);
  const result = ipManager.updateServer(id, serverData);
  console.log("IPC: update-server result:", result ? "success" : "failed");
  return result;
});

ipcMain.handle("delete-server", (event, id) => {
  console.log("IPC: delete-server called with ID:", id);
  const result = ipManager.deleteServer(id);
  console.log("IPC: delete-server result:", result);
  return result;
});

ipcMain.handle("set-active-server", async (event, id) => {
  console.log("IPC: set-active-server called with ID:", id);
  const server = ipManager.setActiveServer(id);

  if (server && ipManager.currentWindow) {
    console.log("IPC: Notifying frontend of server switch");
    ipManager.currentWindow.webContents.send("server-switching", server);

    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const newURL = ipManager.getCurrentURL();
      console.log("IPC: Loading new URL:", newURL);
      ipManager.currentWindow.loadURL(newURL);
    } catch (loadError) {
      console.error("Error loading new URL:", loadError);
    }
  }

  console.log("IPC: set-active-server result:", server ? `${server.name}` : "failed");
  return server;
});

ipcMain.handle("check-server-status", async (event, serverId) => {
  console.log("IPC: check-server-status called for ID:", serverId);
  const server = ipManager.config.servers.find((s) => s.id === serverId);
  if (server) {
    const status = await ipManager.checkServerStatus(server);
    ipManager.saveConfigSync(); // Force save after status check
    console.log("IPC: Server status result:", server.name, "->", status);
    return { server, status };
  }
  console.log("IPC: Server not found for status check:", serverId);
  return null;
});

ipcMain.handle("check-all-servers", async () => {
  console.log("IPC: check-all-servers called");
  await ipManager.checkAllServers();
  console.log("IPC: check-all-servers completed");
  return ipManager.config.servers;
});

ipcMain.handle("get-config", () => {
  console.log("IPC: get-config called");
  return ipManager.config;
});

ipcMain.handle("update-config", (event, newConfig) => {
  console.log("IPC: update-config called with:", Object.keys(newConfig));
  ipManager.config = { ...ipManager.config, ...newConfig };
  const saved = ipManager.saveConfigSync();

  if (newConfig.checkInterval || newConfig.autoCheck !== undefined) {
    ipManager.startAutoCheck();
  }

  console.log("IPC: update-config result saved:", saved);
  return ipManager.config;
});

ipcMain.handle("get-window-info", () => {
  try {
    if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
      const bounds = ipManager.currentWindow.getBounds();
      return {
        width: bounds.width || 1200,
        height: bounds.height || 800,
        isMaximized: ipManager.currentWindow.isMaximized(),
      };
    }
  } catch (error) {
    console.error("Error getting window info:", error);
  }
  return {
    width: 1200,
    height: 800,
    isMaximized: false,
  };
});

ipcMain.handle("center-window", () => {
  ipManager.centerWindow();
});

ipcMain.handle("reset-window-position", () => {
  try {
    if (ipManager.config.windowState) {
      ipManager.config.windowState.x = undefined;
      ipManager.config.windowState.y = undefined;
      ipManager.config.windowState.isMaximized = false;
      ipManager.saveConfigSync();
    }

    if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
      ipManager.centerWindow();
    }

    console.log("Window position reset to center");
    return true;
  } catch (error) {
    console.error("Error resetting window position:", error);
    return false;
  }
});

// PERBAIKAN 26: Enhanced login window with better positioning
function createLoginWindow() {
  let screenBounds = { width: 1920, height: 1080 };
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.workAreaSize) {
      screenBounds = primaryDisplay.workAreaSize;
    }
  } catch (error) {
    console.error("Error getting screen dimensions for login:", error);
  }

  const loginWidth = 450;
  const loginHeight = 650;
  const loginX = Math.round((screenBounds.width - loginWidth) / 2);
  const loginY = Math.round((screenBounds.height - loginHeight) / 2);

  const loginWin = new BrowserWindow({
    width: loginWidth,
    height: loginHeight,
    x: loginX,
    y: loginY,
    resizable: false,
    center: false,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, "bayanopen.ico"),
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  ipManager.loginWindow = loginWin;

  const loginPath = path.join(__dirname, "login.html");
  loginWin.loadFile(loginPath);

  loginWin.webContents.once("did-finish-load", () => {
    loginWin.show();
    loginWin.focus();
  });

  loginWin.on("closed", () => {
    ipManager.loginWindow = null;
    if (!ipManager.isAuthenticated) {
      app.quit();
    }
  });

  return loginWin;
}

// PERBAIKAN 27: Enhanced window creation with better config loading
function createWindow() {
  console.log("Creating main window...");

  // PERBAIKAN 28: Reload config before creating window to get latest state
  try {
    const freshConfig = ipManager.loadConfig();
    ipManager.config = freshConfig;
    console.log("Reloaded fresh config before window creation");
  } catch (reloadError) {
    console.error("Error reloading config:", reloadError);
  }

  let screenBounds = { width: 1920, height: 1080 };

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.workAreaSize) {
      screenBounds = {
        width: primaryDisplay.workAreaSize.width,
        height: primaryDisplay.workAreaSize.height,
      };
    }
  } catch (error) {
    console.error("Error getting screen dimensions:", error);
  }

  const minWidth = 800;
  const minHeight = 600;
  const maxWidth = Math.min(1400, screenBounds.width * 0.9);
  const maxHeight = Math.min(1000, screenBounds.height * 0.9);

  const windowState = ipManager.config.windowState || {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false,
  };

  const windowWidth = Math.max(minWidth, Math.min(windowState.width || 1200, maxWidth));
  const windowHeight = Math.max(minHeight, Math.min(windowState.height || 800, maxHeight));

  const { x, y } = getValidWindowPosition({ ...windowState, width: windowWidth, height: windowHeight }, screenBounds);

  console.log("Creating window with bounds:", {
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    isMaximized: windowState.isMaximized,
  });

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    minWidth,
    minHeight,
    icon: path.join(__dirname, "bayanopen.ico"),
    show: false,
    center: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
  });

  if (windowState.isMaximized) {
    win.maximize();
  }

  ipManager.currentWindow = win;
  ipManager.setupWindowResponsiveness(win);

  const showWindow = () => {
    if (!win.isDestroyed()) {
      if (!windowState.isMaximized) {
        const currentBounds = win.getBounds();
        const validPos = getValidWindowPosition(currentBounds, screenBounds);

        if (currentBounds.x !== validPos.x || currentBounds.y !== validPos.y) {
          win.setBounds({
            x: validPos.x,
            y: validPos.y,
            width: currentBounds.width,
            height: currentBounds.height,
          });
          console.log("Adjusted window position before showing:", validPos);
        }
      }

      win.show();
      win.focus();
      ipManager.isReady = true;
    }
  };

  // PERBAIKAN 29: Get current URL after ensuring config is loaded
  const url = ipManager.getCurrentURL();
  console.log("Loading URL on startup:", url);

  if (url) {
    win.loadURL(url);

    win.webContents.once("did-finish-load", () => {
      setTimeout(showWindow, 200);
    });

    setTimeout(() => {
      if (!win.isVisible() && !win.isDestroyed()) {
        showWindow();
      }
    }, 5000);
  } else {
    console.error("No active server found");
    showWindow();
  }

  win.webContents.on("dom-ready", () => {
    setTimeout(() => {
      ipManager.injectSidebar();
    }, 200);
  });

  win.webContents.on("did-navigate", () => {
    setTimeout(() => {
      ipManager.injectSidebar();
    }, 500);
  });

  win.webContents.on("did-navigate-in-page", () => {
    setTimeout(() => {
      ipManager.injectSidebar();
    }, 200);
  });

  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Failed to load:", errorDescription);
    ipManager.autoSwitchIfNeeded();
  });

  setTimeout(() => {
    ipManager.startAutoCheck();
  }, 2000);

  return win;
}

// PERBAIKAN 30: Enhanced login success handler
ipcMain.on("login-success", () => {
  console.log("Login successful, creating main window...");
  ipManager.isAuthenticated = true;

  if (ipManager.loginWindow) {
    ipManager.loginWindow.close();
  }

  // PERBAIKAN 31: Force reload config on login to ensure latest state
  try {
    ipManager.config = ipManager.loadConfig();
    console.log("Config reloaded after login");
  } catch (reloadError) {
    console.error("Error reloading config after login:", reloadError);
  }

  createWindow();
  createMenu();
});

function createMenu() {
  const template = [
    {
      label: "Server",
      submenu: [
        {
          label: "Manage Servers",
          accelerator: "CmdOrCtrl+M",
          click: () => {
            if (ipManager.currentWindow) {
              ipManager.currentWindow.webContents.send("toggle-sidebar");
            }
          },
        },
        {
          label: "Check All Servers",
          accelerator: "CmdOrCtrl+R",
          click: async () => {
            await ipManager.checkAllServers();
          },
        },
        { type: "separator" },
        {
          label: "Auto Check",
          type: "checkbox",
          checked: ipManager.config.autoCheck,
          click: (menuItem) => {
            ipManager.config.autoCheck = menuItem.checked;
            ipManager.saveConfigSync();
            ipManager.startAutoCheck();
          },
        },
        { type: "separator" },
        {
          label: "Reload Config",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => {
            try {
              ipManager.config = ipManager.loadConfig();
              console.log("Config manually reloaded");
              if (ipManager.currentWindow) {
                ipManager.currentWindow.webContents.send("servers-updated", ipManager.config.servers);
              }
            } catch (error) {
              console.error("Error manually reloading config:", error);
            }
          },
        },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            if (ipManager.currentWindow) {
              ipManager.currentWindow.reload();
            }
          },
        },
        { type: "separator" },
        {
          label: "Logout",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            if (ipManager.currentWindow) {
              ipManager.currentWindow.close();
            }
            ipManager.isAuthenticated = false;
            ipManager.stopAutoCheck();
            createLoginWindow();
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Center Window",
          accelerator: "CmdOrCtrl+Alt+C",
          click: () => {
            ipManager.centerWindow();
          },
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+B",
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                const currentZoom = ipManager.currentWindow.webContents.getZoomLevel();
                ipManager.currentWindow.webContents.setZoomLevel(currentZoom + 0.5);
              } catch (error) {
                console.error("Error zooming in:", error);
              }
            }
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+K",
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                const currentZoom = ipManager.currentWindow.webContents.getZoomLevel();
                ipManager.currentWindow.webContents.setZoomLevel(currentZoom - 0.5);
              } catch (error) {
                console.error("Error zooming out:", error);
              }
            }
          },
        },
        {
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                ipManager.currentWindow.webContents.setZoomLevel(0);
              } catch (error) {
                console.error("Error resetting zoom:", error);
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Toggle Fullscreen",
          accelerator: "F11",
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              try {
                ipManager.currentWindow.setFullScreen(!ipManager.currentWindow.isFullScreen());
              } catch (error) {
                console.error("Error toggling fullscreen:", error);
              }
            }
          },
        },
      ],
    },
    {
      label: "Window",
      submenu: [
        {
          label: "Minimize",
          accelerator: "CmdOrCtrl+Shift+M",
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              ipManager.currentWindow.minimize();
            }
          },
        },
        {
          label: "Maximize/Restore",
          accelerator: "CmdOrCtrl+Shift+X",
          click: () => {
            if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
              if (ipManager.currentWindow.isMaximized()) {
                ipManager.currentWindow.unmaximize();
              } else {
                ipManager.currentWindow.maximize();
              }
            }
          },
        },
        {
          label: "Center Window",
          accelerator: "CmdOrCtrl+Alt+C",
          click: () => {
            ipManager.centerWindow();
          },
        },
        { type: "separator" },
        {
          label: "Reset Window Position",
          click: () => {
            try {
              if (ipManager.config.windowState) {
                ipManager.config.windowState.x = undefined;
                ipManager.config.windowState.y = undefined;
                ipManager.config.windowState.isMaximized = false;
                ipManager.saveConfigSync();
              }

              if (ipManager.currentWindow && !ipManager.currentWindow.isDestroyed()) {
                ipManager.centerWindow();
              }

              console.log("Window position reset to center");

              if (Notification.isSupported()) {
                new Notification({
                  title: "Window Position Reset",
                  body: "Window has been centered on screen",
                }).show();
              }
            } catch (error) {
              console.error("Error resetting window position:", error);
            }
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(ipManager.currentWindow || null, {
              type: "info",
              title: "About IP Manager",
              message: "IP Manager v2.0 - Enhanced",
              detail: "Enhanced server management with persistent configuration\n\nKeyboard Shortcuts:\nCtrl+M - Manage Servers\nCtrl+R - Check All Servers\nCtrl+Alt+C - Center Window\nF11 - Toggle Fullscreen\nCtrl+Shift+C - Reload Config",
            });
          },
        },
        {
          label: "Keyboard Shortcuts",
          click: () => {
            dialog.showMessageBox(ipManager.currentWindow || null, {
              type: "info",
              title: "Keyboard Shortcuts",
              message: "Available Shortcuts:",
              detail:
                "Server Management:\n• Ctrl+M - Manage Servers\n• Ctrl+R - Check All Servers\n• Ctrl+Shift+R - Reload\n• Ctrl+Shift+C - Reload Config\n• Ctrl+Q - Logout\n\nView Controls:\n• Ctrl+Alt+C - Center Window\n• Ctrl+B - Zoom In\n• Ctrl+K - Zoom Out\n• Ctrl+0 - Reset Zoom\n• F11 - Toggle Fullscreen\n\nWindow Controls:\n• Ctrl+Shift+M - Minimize\n• Ctrl+Shift+X - Maximize/Restore",
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// PERBAIKAN 32: Enhanced app event handlers with better state management
app.whenReady().then(() => {
  console.log("App is ready, initializing...");
  console.log("User data path:", app.getPath("userData"));
  console.log("Config path:", configPath);

  // PERBAIKAN 33: Ensure config is properly initialized before creating login
  try {
    ipManager.ensureConfigExists();
    console.log("Config initialization completed");
  } catch (initError) {
    console.error("Error initializing config:", initError);
  }

  createLoginWindow();
});

app.on("window-all-closed", () => {
  console.log("All windows closed, performing cleanup...");

  // PERBAIKAN 34: Enhanced cleanup with multiple save attempts
  try {
    const saved = ipManager.saveConfigSync();
    console.log("Final config save result:", saved);

    if (!saved) {
      // Try one more time with a delay
      setTimeout(() => {
        ipManager.saveConfigSync();
      }, 100);
    }
  } catch (error) {
    console.error("Error during app cleanup:", error);
  }

  ipManager.stopAutoCheck();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (ipManager.isAuthenticated) {
      console.log("Activating app, creating main window...");
      createWindow();
    } else {
      console.log("Activating app, creating login window...");
      createLoginWindow();
    }
  }
});

app.on("before-quit", () => {
  console.log("App is quitting, saving final config...");
  try {
    const saved = ipManager.saveConfigSync();
    console.log("Before-quit config save result:", saved);
  } catch (error) {
    console.error("Error saving config before quit:", error);
  }
  ipManager.stopAutoCheck();
});

// PERBAIKAN 35: Enhanced error handling for crashes
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  try {
    ipManager.saveConfigSync();
    console.log("Emergency config save completed");
  } catch (e) {
    console.error("Emergency save failed:", e);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  try {
    ipManager.saveConfigSync();
    console.log("Emergency config save completed (rejection)");
  } catch (e) {
    console.error("Emergency save failed (rejection):", e);
  }
});

// PERBAIKAN 36: Add periodic config save as safety net
setInterval(() => {
  if (ipManager.isAuthenticated && ipManager.config) {
    try {
      ipManager.saveConfigSync();
      console.log("Periodic config save completed");
    } catch (error) {
      console.error("Periodic save failed:", error);
    }
  }
}, 60000); // Save every minute as backup
