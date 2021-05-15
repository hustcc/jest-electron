import { installCommonGlobals } from 'jest-util';
import * as mock from 'jest-mock';

function isDebugMode() {
  return !!process.env.DEBUG_MODE;
}

// env for electron
// code here https://github.com/facebook-atom/jest-electron-runner/blob/master/packages/electron/src/Environment.js
export default class ElectronEnvironment {
  global: any;
  moduleMocker: any;
  fakeTimers: any;

  electronWindowConsole: any;

  constructor(config: any) {
    this.electronWindowConsole = global.console;
    this.global = global;

    if (isDebugMode()) {
      // defineProperty multi-times will throw
      try {
        // because of jest will set the console in runTest force, so we should override the console instance of electron
        // https://github.com/facebook/jest/blob/6e6a8e827bdf392790ac60eb4d4226af3844cb15/packages/jest-runner/src/runTest.ts#L153
        Object.defineProperty(this.global, 'console', {
          get: () => {
            return this.electronWindowConsole;
          },
          set: () => {/* do nothing. */},
        });

        installCommonGlobals(this.global, config.globals);
      } catch (e) {}
    }

    this.moduleMocker = new mock.ModuleMocker(global);
    this.fakeTimers = {
      useRealTimers() {
        return {
          clearTimeoutFn: global.clearTimeout,
          setImmediateFn: global.setTimeout,
          setTimeoutFn: global.setTimeout,
        }
      },
      useFakeTimers() {
        throw new Error('fakeTimers are not supported in electron environment');
      },
      clearAllTimers() {},
    };
  }

  async setup() {}

  async teardown() {}

  runScript(script: any): any {
    return script.runInThisContext();
  }
}
