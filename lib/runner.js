"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const throat_1 = require("throat");
const proc_1 = require("./electron/proc");
const isDebugMode = () => {
    return process.env.DEBUG_MODE === '1';
};
/**
 * Runner class
 */
class ElectronRunner {
    constructor(globalConfig) {
        this._globalConfig = globalConfig;
        this._debugMode = isDebugMode();
    }
    getConcurrency(testSize) {
        const { maxWorkers, watch, watchAll } = this._globalConfig;
        const isWatch = watch || watchAll;
        const concurrency = Math.min(testSize, maxWorkers);
        return isWatch ? Math.ceil(concurrency / 2) : concurrency;
    }
    async runTests(tests, watcher, onStart, onResult, onFailure) {
        const concurrency = this.getConcurrency(tests.length);
        proc_1.electronProc.debugMode = this._debugMode;
        proc_1.electronProc.concurrency = concurrency;
        // when the process exit, kill then electron
        process.on('exit', () => {
            proc_1.electronProc.kill();
        });
        if (this._debugMode) {
            proc_1.electronProc.onClose(() => { process.exit(); });
        }
        await proc_1.electronProc.initialWin();
        await Promise.all(tests.map(throat_1.default(concurrency, async (test, idx) => {
            onStart(test);
            const config = test.context.config;
            const globalConfig = this._globalConfig;
            return await proc_1.electronProc.runTest({
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
        })));
        // not debug mode, then kill electron after running test cases
        if (!this._debugMode) {
            proc_1.electronProc.kill();
        }
    }
}
exports.default = ElectronRunner;
