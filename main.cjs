const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  // Abre as ferramentas de desenvolvedor para vermos qualquer erro na tela
  win.webContents.openDevTools();

  // Tenta carregar o servidor local do seu PC primeiro!
  // Se você estiver com o 'npm run dev' rodando, abre na hora liso e sem travas:
  win.loadURL('http://localhost:8080').catch(() => {
    // Se o servidor local estiver desligado, tenta a web:
    win.loadURL('https://verdant-hero-trail.lovable.app');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
