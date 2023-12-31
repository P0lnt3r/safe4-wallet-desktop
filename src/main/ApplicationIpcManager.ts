import { DBSignalHandler } from "./handlers/DBSignalHandler";
import { IndexSingalHandler } from "./handlers/IndexSingalHandler";
import { ListenSignalHandler } from "./handlers/ListenSignalHandler";
import { WalletSignalHandler } from "./handlers/WalletSignalHandler";
import { Channels } from "./preload";

export const Channel : Channels = "ipc-example";

export class ApplicationIpcManager {

  listenSignalHandlers: ListenSignalHandler[] = [];

  constructor() {
    this.listenSignalHandlers.push(new IndexSingalHandler());
    this.listenSignalHandlers.push(new WalletSignalHandler());
    this.listenSignalHandlers.push(new DBSignalHandler());
  }

  public register(ipcMain : Electron.IpcMain) {
    ipcMain.on(Channel, async (event, arg) => {
      if (arg instanceof Array) {
        const signal = arg[0];
        const handlers = this.listenSignalHandlers.filter((handler) => {
          if (signal == handler.getSingal()) {
            return handler;
          }
        })
        if (handlers) {
          const handler = handlers[0];
          handler.handleOn(
            event, arg
          )
        }
      }
      else {
        const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
        console.log(msgTemplate(arg));
        event.reply('ipc-example', msgTemplate('pong'));
      }
    });
  }
}
