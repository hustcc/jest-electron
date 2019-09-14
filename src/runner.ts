import throat from 'throat';
import { Electron } from './electron/proc';

const isInteractive = (): boolean => {
  return process.env.INTERACTIVE === '1';
};

/**
 * Runner 类
 */
export default class ElectronRunner {
  private _globalConfig: any;
  private _interactive: boolean;

  private electronProc: Electron;

  constructor(globalConfig: any) {
    this._globalConfig = globalConfig;
    this._interactive = isInteractive();
  }

  private getConcurrency(testSize): number {
    const { maxWorkers, watch, watchAll } = this._globalConfig;
    const isWatch = watch || watchAll;

    const concurrency = Math.min(testSize, maxWorkers);

    return isWatch ? Math.ceil(concurrency / 2) : concurrency;
  }

  async runTests(
    tests: Array<any>,
    watcher: any,
    onStart: (Test) => void,
    onResult: (Test, TestResult) => void,
    onFailure: (Test, Error) => void,
  ) {
    const concurrency = this.getConcurrency(tests.length);
    // 启动
    this.electronProc = new Electron(this._interactive, concurrency);

    // 主进程退出，则 electron 也退出
    process.on('exit', () => {
      this.electronProc.kill();
    });

    if (this._interactive) {
      this.electronProc.onClose(() => { process.exit(); });
    }

    await Promise.all(
      tests.map(
        throat(concurrency, async (test, idx) => {
          onStart(test);

          const config = test.context.config;
          const globalConfig = this._globalConfig;

          return await this.electronProc.runTest({
            serializableModuleMap: test.context.moduleMap.toJSON(),
            config,
            globalConfig,
            path: test.path,
          }).then(testResult => {
            testResult.failureMessage != null
              ? onFailure(test, testResult.failureMessage)
              : onResult(test, testResult);
          }).catch(error => {
            return onFailure(test, error);
          });
        }),
      ),
    );

    // 如果是非交互，则关闭子进程
    if (!this._interactive) {
      this.electronProc.kill();
    }
  }
}
