import * as path from 'path';
import { spawn } from 'child_process';
import * as electron  from 'electron';
import { EventsEnum } from '../utils/constant';

type ProcInfo = {
  proc: any;
  idle: boolean;
}

/**
 * 延迟 ms
 * @param ms
 */
const delay = (ms = 500): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  })
};

const uuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
    // tslint:disable-next-line:no-bitwise
    const r = Math.random() * 16 | 0;
    // tslint:disable-next-line:no-bitwise
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * electron 的进程池子
 */
export class ProcPool {
  private procList: ProcInfo[] = [];
  private maxSize: number;
  private interactive: boolean;
  private onCloseCallback: Function = () => {};

  // 创建 electron proc 的锁标记
  private locked = false;

  constructor(maxSize: number = 1, interactive: boolean = false) {
    this.maxSize = Math.max(1, maxSize);
    this.interactive = interactive;
  }

  /**
   * 加锁的获取一个进程
   */
  private async get(): Promise<any> {
    if (this.locked) {
      await delay();
      return await this.get();
    }

    this.locked = true;

    const proc = await this.getAsync();

    this.locked = false;

    return proc;
  }

  /**
   * 从池子拿一个进程
   */
  private async getAsync(): Promise<any> {
    // 找到一个空闲的
    let procInfo = this.procList.find((procInfo) => procInfo.idle);

    // 存在则直接返回
    if (procInfo) return procInfo.proc;

    // 不存在空闲
    // 且已经满了，则等待 1s 中
    if (this.isFull()) {
      await delay();

      return await this.getAsync();
    }

    // 没有满
    const proc = await this.createProc();

    // 放入到 pool 中
    this.procList.push({ proc, idle: true });

    return proc;
  }

  /**
   * 创建一个可用的 proc
   */
  private async createProc(): Promise<any> {
    return new Promise((resolve, reject) => {
      // 使用 entry 启动
      const entry = path.join(__dirname, '../electron/main/index');
      const args = [ entry ];

      if (this.interactive) {
        args.push('--interactive');
      }

      const proc = spawn(electron as any, args, { stdio: ['inherit', 'ipc', process.stderr], env: process.env });

      // 关闭的时候，移除
      proc.on('close', () => {
        const idx = this.procList.findIndex((procInfo) => procInfo.proc === proc);

        // 移除
        if (idx !== -1) {
          this.procList.splice(idx, 1);
        }

        // 杀掉
        proc.kill();

        if (this.size() === 0) {
          this.onCloseCallback()
        }
      });


      const listener = (m) => {
        if (m.type === EventsEnum.ProcReady) {
          proc.removeListener(EventsEnum.ProcMessage, listener);
          resolve(proc);
        }
      };

      // proc 准备就绪
      proc.on(EventsEnum.ProcMessage, listener);
    });
  }

  /**
   * pool 中 proc 数量
   */
  public size() {
    return this.procList.length;
  }

  /**
   * 是否满了
   */
  public isFull() {
    return this.size() >= this.maxSize;
  }

  /**
   * 设置 idle 状态
   * @param proc
   * @param idle
   */
  private setIdle(proc, idle) {
    const idx = this.procList.findIndex(procInfo => procInfo.proc === proc);

    this.procList[idx].idle = idle;
  }

  /**
   * 清空所有
   */
  public flush() {
    this.procList.forEach((procInfo) => {
      procInfo.proc.kill();
    });

    this.procList = [];
  }

  /**
   * 运行单测
   * @param test
   */
  public runTest(test: any): Promise<any> {
    const id = uuid();

    return new Promise((resolve, reject) => {
      // 获取一个空闲的 proc
      this.get().then((proc) => {
        this.setIdle(proc, false);

        const listener = ({ result, id: resultId, type }) => {
          if (type === EventsEnum.ProcRunTestResult && resultId === id) {
            proc.removeListener(EventsEnum.ProcMessage, listener);
            // 返回结果，可以设置为 idle
            this.setIdle(proc, true);
            // 返回结果
            resolve(result);
          }
        };

        // 监听检测结果
        proc.on(EventsEnum.ProcMessage, listener);

        // 将 test 数据发送到 main 中
        proc.send({ type: EventsEnum.ProcRunTest, test, id });
      });
    });
  }

  /**
   * 所有关闭的时候出发回调
   * @param cb
   */
  public onClose(cb) {
    this.onCloseCallback = cb;
  }
}
