/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain , safeStorage } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { ApplicationIpcManager } from './ApplicationIpcManager';
const os = require('os');
const fs = require("fs");
const ssh2 = require("ssh2");


class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

//  ipcMain.on('ipc-example', async (event, arg) => {
//    const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
//    console.log(msgTemplate(arg));
//    event.reply('ipc-example', msgTemplate('pong'));
//  });
// + 基于通道注册信号处理器
const resourcePath = app.isPackaged
  ? path.join(process.resourcesPath, '')
  : path.join(__dirname, '../../');
const appIpcManager = new ApplicationIpcManager(
  resourcePath, app.isPackaged
).register(ipcMain , safeStorage);

ipcMain.handle("shell-openPath" , ( _ , path ) => {
  shell.openPath(path);
})

// let sshConnection : any;
// SSH2
// ipcMain.handle('connect-ssh', async ( _ , { host, username, password }) => {
//   return new Promise((resolve, reject) => {
//     const conn = new ssh2.Client();
//     console.log(`[ssh2] Connect to ${host} / ${username}`)
//     conn.on('ready', () => {
//       sshConnection = conn;
//       resolve(true);
//       console.log(`Connect ${host} success!` )
//     }).on('error', (err: any) => {
//       reject(err);
//     }).connect({ host, username, password });
//   });
// });

// ipcMain.handle('exec-command', async (_, { command }) => {
//   if (!sshConnection) {
//     throw new Error(`Connection not found`);
//   }
//   return new Promise((resolve, reject) => {
//     console.log("exec-command ::" , command);
//     sshConnection.exec(command, (err : any, stream : any) => {
//       if (err) {
//         reject(err);
//       } else {
//         let data = '';
//         stream.on('data', (chunk : any) => {
//           data += chunk;
//         }).on('close', () => {
//           resolve(data);
//         });
//       }
//     });
//   });
// });

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');


  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1500,
    height: 800,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      webSecurity: false
    },
  });
  mainWindow.setMinimumSize(1500, 800);

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
    appIpcManager.ctx.updateOSLocale( app.getLocale() , os.platform());
  })
  .catch(console.log);
