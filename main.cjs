const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "RESENHAPG",
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('http://127.0.0.1:3000');
}

app.whenReady().then(async () => {
  try {
    process.env.NITRO_HOST = '127.0.0.1';
    process.env.NITRO_PORT = '3000';

    const serverPath = path.join(
      app.getAppPath(),
      '.output',
      'server',
      'index.mjs'
    );

    await import(pathToFileURL(serverPath).href);

    createWindow();
  } catch (error) {
    console.error('Erro ao iniciar o RESENHAPG:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});