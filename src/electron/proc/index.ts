import * as path from 'path';
import { spawn } from 'child_process';
import * as electron  from 'electron';
import { EventsEnum } from '../../utils/constant';
import { uuid } from '../../utils/uuid';
import { delay } from '../../utils/delay';

/**
 * electron proc
 */
export class Electron {
  public debugMode: boolean;
  public concurrency: number;

  private onCloseCallback: Function = () => {};

  /**
   * 当前运行的 electron 进程
   */
  private proc: any;

  /**
   * 在创建进程过程中，进行锁定
   */
  private lock: boolean = false;

  constructor(debugMode: boolean = false, concurrency: number = 1) {
    this.debugMode = debugMode;
    this.concurrency = concurrency;
  }

  /**
   * get a idle electron with lock
   */
  private async get(): Promise<any> {
    if (!this.proc) {

      // lock, then delay and retry
      if (this.lock) {
        await delay();
        return await this.get();
      }

      this.lock = true;
      this.proc = await this.create();

      // when proc close, kill all electrons
      this.proc.on('close', () => {
        this.kill();

        this.onCloseCallback();
      });

      this.lock = false;
    }
    return this.proc;
  }

  /**
   * create an idle electron proc
   */
  private async create(): Promise<any> {
    return new Promise((resolve, reject) => {
      // electron starter
      const entry = path.join(__dirname, '../main/index');
      const args = [ entry ];
      if (process.env.JEST_ELECTRON_NO_SANDBOX){
        args.splice(0, 0, '--no-sandbox');
      };
      if (process.env.JEST_ELECTRON_STARTUP_ARGS){
        args.splice(0, 0, ...process.env.JEST_ELECTRON_STARTUP_ARGS.split(/\s+/));
      };
      const proc = spawn(
        electron as any,
        args,
        {
          stdio: ['ipc'],
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

      // send electron ready signal
      proc.on(EventsEnum.ProcMessage, listener);
    });
  }

  /**
   * kill all electron proc
   */
  public kill() {
    if (this.proc) {
      this.proc.kill();
      this.proc = undefined;
    }
  }

  /**
   * run test case
   * @param test
   */
  public runTest(test: any): Promise<any> {
    const id = uuid();

    return new Promise((resolve, reject) => {
      this.get().then((proc) => {
        const listener = ({ result, id: resultId, type }) => {
          if (type === EventsEnum.ProcRunTestResult && resultId === id) {
            proc.removeListener(EventsEnum.ProcMessage, listener);
            // return test result
            resolve(result);
          }
        };

        // listen the running result
        proc.on(EventsEnum.ProcMessage, listener);

        // send test data into main thread
        proc.send({ type: EventsEnum.ProcRunTest, test, id });
      });
    });
  }

  /**
   * 初始化窗口和应用
   */
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
   * when all close, do callback
   * @param cb
   */
  public onClose(cb) {
    this.onCloseCallback = cb;
  }
}

export const electronProc: Electron = new Electron();
