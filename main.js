const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    title: "RESENHAPG",
    autoHideMenuBar: true, // Esconde barra de menus de navegador
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
    }
  });

  // Carrega o jogo publicado online (funciona em qualquer PC sem precisar do npm)
  win.loadURL('https://verdant-hero-trail.lovable.app');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
