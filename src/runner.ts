import throat from 'throat';
import { ProcPool } from './pool';

const isInteractive = (): boolean => {
  return process.env.INTERACTIVE === '1';
};

/**
 * Runner 类
 */
export default class ElectronRunner {
  private _globalConfig: any;
  private _interactive: boolean;

  private procPool: ProcPool;

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

  /**
   * pool size
   * can be optimized
   * worker 启动时间也挺长，所以一个自测值，使用 concurrency / 4
   * @param concurrency
   * @param testSize
   */
  private getPoolSize(concurrency, testSize): number {
    return this._interactive || testSize < 10 ? 1 : Math.ceil(concurrency / 4)
  }

  async runTests(
    tests: Array<any>,
    watcher: any,
    onStart: (Test) => void,
    onResult: (Test, TestResult) => void,
    onFailure: (Test, Error) => void,
  ) {
    const testSize = tests.length;
    const concurrency = this.getConcurrency(tests.length);
    // 启动
    this.procPool = new ProcPool(this.getPoolSize(concurrency, testSize), this._interactive);

    // 主进程退出，则 electron 也退出
    process.on('exit', () => {
      this.procPool.flush();
    });

    if (this._interactive) {
      this.procPool.onClose(() => { process.exit(); });
    }

    await Promise.all(
      tests.map(
        throat(concurrency, async test => {
          onStart(test);
          const config = test.context.config;
          const globalConfig = this._globalConfig;

          return await this.procPool.runTest({
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
      this.procPool.flush();
    }
  }
}
