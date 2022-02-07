import * as path from 'path';
import * as url from 'url';
import throat from 'throat';
import { app, BrowserWindow, ipcMain } from 'electron';
import { EventsEnum } from '../../utils/constant';
import { delay } from '../../utils/delay';
import { uuid } from '../../utils/uuid';
import { Config } from '../../utils/config';

type Info = {
  win: BrowserWindow;
  idle: boolean;
  tests: any[];
}

// configure save instance
const config = new Config(app.getPath('userData'));

/**
 * browser window (renderer) pool
 */
export class WindowPool {

  private pool: Info[] = [];
  private maxSize: number;
  private debugMode: boolean;

  // create new browser window instance lock flag
  private locked = false;

  constructor(maxSize: number = 1, debugMode: boolean = false) {
    // when debug mode, only 1 window can be work
    this.maxSize = debugMode ? 1 : maxSize;
    this.debugMode = debugMode;

    ipcMain.on(EventsEnum.WebContentsReady, () => {
      this.runAllTest();
    });
  }

  /**
   * get a window with thread lock
   */
  private async get(): Promise<BrowserWindow> {
    // if locked, delay and retry
    if (this.locked) {
      await delay();
      return await this.get();
    }

    this.locked = true;

    const win = await this.getAsync();

    this.locked = false;

    return win;
  }

  /**
   * get a window from pool, if not exist, create one, if pool is full, wait and retry
   */
  private async getAsync(): Promise<BrowserWindow> {
    // find a idle window
    let info: Info = this.pool.find((info) => info.idle);

    // exist ide window, return it for usage
    if (info) return info.win;

    // no idle window
    // and the pool is full, delay some time
    if (this.isFull()) {
      await delay();

      return await this.getAsync();
    }

    // pool has space, then create a new window instance
    const win = await this.create();

    // put it into pool
    this.pool.push({ win, idle: true, tests: [] });

    return win;
  }

  /**
   * create a valid electron browser window
   */
  private async create(): Promise<BrowserWindow> {
    return new Promise((resolve, reject) => {
      const winOpts = {
        // read window size from configure file
        ...config.read(),
        show: this.debugMode,
        focusable: this.debugMode,
        webPreferences: {
          webSecurity: false,
          nodeIntegration: true,
          contextIsolation: false
        },
      };

      let win = new BrowserWindow(winOpts);

      // when window close, save window size locally
      win.on('close', () => {
        const { width, height } = win.getBounds();
        config.write({ width, height });
      });

      // after window closed, remove it from pool for gc
      win.on('closed', () => {
        this.removeWin(win);
        win = undefined;
      });

      const f = url.format({
        hash: encodeURIComponent(JSON.stringify({ debugMode: this.debugMode })),
        pathname: path.join(__dirname, '/index.html'),
        protocol: 'file:',
        slashes: true,
      });
      win.loadURL(f);

      if (this.debugMode) {
        // when debug mode, open dev tools
        win.webContents.openDevTools();
      }

      win.webContents.on('did-finish-load', () => {
        // win ready
        resolve(win);
      });
    });
  }

  /**
   * the proc size of pool
   */
  public size() {
    return this.pool.length;
  }

  /**
   * whether the pool is full
   */
  public isFull() {
    return this.size() >= this.maxSize;
  }

  /**
   * set the proc idle status
   * @param win
   * @param idle
   */
  private setIdle(win: BrowserWindow, idle: boolean) {
    const idx = this.pool.findIndex(info => info.win === win);

    this.pool[idx].idle = idle;
  }

  private appendTest(win: BrowserWindow, test: any) {
    const idx = this.pool.findIndex(info => info.win === win);

    this.pool[idx].tests.push(test);
  }

  /**
   * clear all the save tests in memory
   */
  public clearSaveTests() {
    this.pool.forEach(info => {
      info.tests = [];
      // remove all test result dom
      info.win.webContents.send(EventsEnum.ClearTestResults);
    });
  }


  private removeWin(win: BrowserWindow) {
    const idx = this.pool.findIndex((info) => info.win = win);

    // remove from pool by index
    if (idx !== -1) {
      this.pool.splice(idx, 1);
    }

    win.destroy();
  }

  /**
   * run test case by send it to renderer
   * @param id
   * @param test
   */
  public async runTest(id: string, test: any): Promise<any> {
    const win = await this.get();
    const result =  await this.run(win, id, test);

    this.appendTest(win, test);
    return result;
  }

  private async runAllTest() {
    this.pool.map(async info => {
      await Promise.all(info.tests.map(
        throat(1, async (test: any) => {
          return await this.run(info.win, uuid(), test);
        })
      ));
    });
  }

  private async run(win: BrowserWindow, id: string, test: any) {
    return new Promise((resolve, reject) => {
      this.setIdle(win, false);

      // redirect the test result ti proc
      ipcMain.once(id, (event, result) => {
        // test case running end, set the window with idle status
        this.setIdle(win, true);
        // resolve test result
        resolve({ result, id });
      });

      // send test case into web contents for running
      win.webContents.send(EventsEnum.StartRunTest, test, id);
    });
  }
}
