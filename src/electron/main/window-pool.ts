import * as path from 'path';
import * as url from 'url';
import { app, BrowserWindow, ipcMain } from 'electron';
import { EventsEnum } from '../../utils/constant';
import { delay } from '../../utils/delay';

type Info = {
  win: BrowserWindow;
  idle: boolean;
}

/**
 * browser window (renderer) 的进程池子
 */
export class WindowPool {

  private pool: Info[] = [];
  private maxSize: number;
  private interactive: boolean;

  // 创建 browser window 的锁标记
  private locked = false;

  constructor(maxSize: number = 1, interactive: boolean = false) {
    // interactive 模式下，只能开一个 win
    this.maxSize = interactive ? 1 : maxSize;
    this.interactive = interactive;
  }

  /**
   * 加锁的获取一个进程
   */
  private async get(): Promise<BrowserWindow> {
    // 锁定的，那么就延迟再试
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
   * 从池子拿一个进程
   */
  private async getAsync(): Promise<BrowserWindow> {
    // 找到一个空闲的
    let info: Info = this.pool.find((info) => info.idle);

    // 存在则直接返回
    if (info) return info.win;

    // 不存在空闲
    // 且已经满了，则等待 1s 中
    if (this.isFull()) {
      await delay();

      return await this.getAsync();
    }

    // 没有满
    const win = await this.create();

    // 放入到 pool 中
    this.pool.push({ win, idle: true });

    return win;
  }

  /**
   * 创建一个可用的 win
   */
  private async create(): Promise<BrowserWindow> {
    return new Promise((resolve, reject) => {
      const winOpts = {
        // 默认大小，应该需要可以定制
        height: 600,
        width: 800,
        show: this.interactive,
        focusable: this.interactive,
        webPreferences: {
          webSecurity: false,
          nodeIntegration: true,
        },
      };

      // 创建窗口
      let win = new BrowserWindow(winOpts);

      // 关闭之前事件
      win.on('close', () => {
        // 可以保存之前的窗口大小
        // console.log(win.getBounds());
      });

      // 关闭之后
      win.on('closed', () => {
        this.removeWin(win);
        win = undefined;
      });

      const f = url.format({
        hash: encodeURIComponent(JSON.stringify({ interactive: this.interactive })),
        pathname: path.join(__dirname, '/index.html'),
        protocol: 'file:',
        slashes: true,
      });
      win.loadURL(f);

      if (this.interactive) {
        // 打开控制台
        win.webContents.openDevTools();
      }

      win.webContents.on('did-finish-load', () => {
        // win ready
        resolve(win);
      });
    });
  }

  /**
   * pool 中 proc 数量
   */
  public size() {
    return this.pool.length;
  }

  /**
   * 是否满了
   */
  public isFull() {
    return this.size() >= this.maxSize;
  }

  /**
   * 设置 idle 状态
   * @param win
   * @param idle
   */
  private setIdle(win: BrowserWindow, idle: boolean) {
    const idx = this.pool.findIndex(info => info.win === win);

    this.pool[idx].idle = idle;
  }

  private removeWin(win: BrowserWindow) {
    const idx = this.pool.findIndex((info) => info.win = win);

    // 移除
    if (idx !== -1) {
      this.pool.splice(idx, 1);
    }

    win.destroy();
  }

  /**
   * 运行单测
   * @param id
   * @param test
   */
  public runTest(id: string, test: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 获取一个空闲的 renderer
      this.get().then((win) => {
        this.setIdle(win, false);

        // 单测返回之后发送到 proc 中
        ipcMain.once(id, (event, result) => {
          // 执行完成，设置为空闲
          this.setIdle(win, true);
          // 返回结果
          resolve({ result, id });
        });

        // 发送过去到 renderer 中执行
        win.webContents.send(EventsEnum.StartRunTest, test, id);
      });
    });
  }
}
