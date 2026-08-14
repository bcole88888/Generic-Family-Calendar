const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

// Start the Express server
function startServer() {
    console.log('Starting Express server...');
    serverProcess = spawn('node', ['app.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });

    serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

// Stop the Express server
function stopServer() {
    if (serverProcess) {
        console.log('Stopping Express server...');
        serverProcess.kill();
        serverProcess = null;
    }
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        },
        icon: path.join(__dirname, 'assets/icon.png'), // Add app icon if available
        show: false, // Don't show until ready
        titleBarStyle: 'default'
    });

    // Wait for server to start before loading the page
    setTimeout(() => {
        // Load the app
        mainWindow.loadURL('http://localhost:3000');

        // Show window when ready to prevent visual flash
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();

            // Focus on the window
            if (isDev) {
                mainWindow.webContents.openDevTools();
            }
        });
    }, 2000); // Give server time to start

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'Family Calendar',
            submenu: [
                {
                    label: 'About Family Calendar',
                    role: 'about'
                },
                { type: 'separator' },
                {
                    label: 'Preferences',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        // Could open a preferences window
                        console.log('Preferences clicked');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                {
                    label: 'Force Reload',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.reloadIgnoringCache();
                        }
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                {
                    label: 'Toggle Fullscreen',
                    accelerator: 'F11',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.setFullScreen(!mainWindow.isFullScreen());
                        }
                    }
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Family Calendar',
                    click: () => {
                        shell.openExternal('https://github.com/yourusername/familycalendar');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
    startServer();
    createWindow();
    createMenu();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopServer();
});

// Handle certificate errors (for self-signed certificates in development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        // In development, ignore certificate errors
        event.preventDefault();
        callback(true);
    } else {
        // In production, use default behavior
        callback(false);
    }
});