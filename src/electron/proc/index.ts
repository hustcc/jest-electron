import * as path from 'path';
import { spawn } from 'child_process';
import * as electron  from 'electron';
import { EventsEnum } from '../../utils/constant';
import { uuid } from '../../utils/uuid';
import { delay } from '../../utils/delay';

/**
 * electron 的进程池子
 */
export class Electron {
  public debugMode: boolean;
  public concurrency: number;

  private onCloseCallback: Function = () => {};

  private proc: any;

  // 创建锁
  private lock: boolean = false;

  constructor(debugMode: boolean = false, concurrency: number = 1) {
    this.debugMode = debugMode;
    this.concurrency = concurrency;
  }

  /**
   * 获取进程
   */
  private async get(): Promise<any> {
    if (!this.proc) {

      // 锁定状态，延迟获取
      if (this.lock) {
        await delay();
        return await this.get();
      }

      this.lock = true;
      this.proc = await this.create();

      // 关闭的时候，移除
      this.proc.on('close', () => {
        // 杀掉
        this.kill();

        this.onCloseCallback();
      });

      this.lock = false;
    }
    return this.proc;
  }

  /**
   * 创建一个可用的 proc
   */
  private async create(): Promise<any> {
    return new Promise((resolve, reject) => {
      // 使用 entry 启动
      const entry = path.join(__dirname, '../main/index');
      const args = [ entry ];

      const proc = spawn(
        electron as any,
        args,
        {
          stdio: ['inherit', 'ipc'],
          env: {
            ...process.env,
            DEBUG_MODE: this.debugMode ? 'true' : '',
            CONCURRENCY: `${this.concurrency}`,
          }
        }
      );

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
   * 清空所有
   */
  public kill() {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
    }
  }

  /**
   * 运行单测
   * @param test
   */
  public runTest(test: any): Promise<any> {
    const id = uuid();

    return new Promise((resolve, reject) => {
      this.get().then((proc) => {
        const listener = ({ result, id: resultId, type }) => {
          if (type === EventsEnum.ProcRunTestResult && resultId === id) {
            proc.removeListener(EventsEnum.ProcMessage, listener);
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

  public initialWin(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.get().then((proc) => {
        const listener = ({ type }) => {
          if (type === EventsEnum.ProcInitialWinEnd) {
            proc.removeListener(EventsEnum.ProcMessage, listener);
            resolve();
          }
        };

        proc.on(EventsEnum.ProcMessage, listener);

        proc.send({ type: EventsEnum.ProcInitialWin });
      });

    })
  }

  /**
   * 所有关闭的时候出发回调
   * @param cb
   */
  public onClose(cb) {
    this.onCloseCallback = cb;
  }
}

export const electronProc: Electron = new Electron();
