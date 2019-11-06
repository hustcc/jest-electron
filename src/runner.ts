import throat from 'throat';
import { electronProc } from './electron/proc';

const isDebugMode = (): boolean => {
  return process.env.DEBUG_MODE === '1';
};


/**
 * Runner class
 */
export default class ElectronRunner {
  private _globalConfig: any;
  private _debugMode: boolean;

  constructor(globalConfig: any) {
    this._globalConfig = globalConfig;
    this._debugMode = isDebugMode();
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

    electronProc.debugMode = this._debugMode;
    electronProc.concurrency = concurrency;

    // when the process exit, kill then electron
    process.on('exit', () => {
      electronProc.kill();
    });

    if (this._debugMode) {
      electronProc.onClose(() => { process.exit(); });
    }

    await electronProc.initialWin();

    await Promise.all(
      tests.map(
        throat(concurrency, async (test, idx) => {
          onStart(test);

          const config = test.context.config;
          const globalConfig = this._globalConfig;

          return await electronProc.runTest({
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

    // not debug mode, then kill electron after running test cases
    if (!this._debugMode) {
      electronProc.kill();
    }
  }
}
