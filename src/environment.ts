import { FakeTimers, installCommonGlobals } from 'jest-util';
import * as mock from 'jest-mock';

// env for electron
// code here https://github.com/facebook-atom/jest-electron-runner/blob/master/packages/electron/src/Environment.js
export default class ElectronEnvironment {
  global: any;
  moduleMocker: any;
  fakeTimers: any;

  constructor(config: any) {
    this.global = global;

    // FIXME @jest
    try {
      installCommonGlobals(this.global, config.globals);
    } catch (e) {}


    this.moduleMocker = new mock.ModuleMocker(global);
    this.fakeTimers = {
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
