"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const child_process_1 = require("child_process");
const electron = require("electron");
const constant_1 = require("../../utils/constant");
const uuid_1 = require("../../utils/uuid");
const delay_1 = require("../../utils/delay");
/**
 * electron proc
 */
class Electron {
    constructor(debugMode = false, concurrency = 1) {
        this.onCloseCallback = () => { };
        // thread lock
        this.lock = false;
        this.debugMode = debugMode;
        this.concurrency = concurrency;
    }
    /**
     * get a idle electron with lock
     */
    async get() {
        if (!this.proc) {
            // lock, then delay and retry
            if (this.lock) {
                await delay_1.delay();
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
    async create() {
        return new Promise((resolve, reject) => {
            // electron starter
            const entry = path.join(__dirname, '../main/index');
            const args = [entry];
            if (process.env.JEST_ELECTRON_NO_SANDBOX) {
                args.splice(0, 0, '--no-sandbox');
            }
            ;
            const proc = child_process_1.spawn(electron, args, {
                stdio: ['ipc'],
                env: {
                    ...process.env,
                    DEBUG_MODE: this.debugMode ? 'true' : '',
                    CONCURRENCY: `${this.concurrency}`,
                }
            });
            const listener = (m) => {
                if (m.type === constant_1.EventsEnum.ProcReady) {
                    proc.removeListener(constant_1.EventsEnum.ProcMessage, listener);
                    resolve(proc);
                }
            };
            // send electron ready signal
            proc.on(constant_1.EventsEnum.ProcMessage, listener);
        });
    }
    /**
     * kill all electron proc
     */
    kill() {
        if (this.proc) {
            this.proc.kill();
            this.proc = undefined;
        }
    }
    /**
     * run test case
     * @param test
     */
    runTest(test) {
        const id = uuid_1.uuid();
        return new Promise((resolve, reject) => {
            this.get().then((proc) => {
                const listener = ({ result, id: resultId, type }) => {
                    if (type === constant_1.EventsEnum.ProcRunTestResult && resultId === id) {
                        proc.removeListener(constant_1.EventsEnum.ProcMessage, listener);
                        // return test result
                        resolve(result);
                    }
                };
                // listen the running result
                proc.on(constant_1.EventsEnum.ProcMessage, listener);
                // send test data into main thread
                proc.send({ type: constant_1.EventsEnum.ProcRunTest, test, id });
            });
        });
    }
    initialWin() {
        return new Promise((resolve, reject) => {
            this.get().then((proc) => {
                const listener = ({ type }) => {
                    if (type === constant_1.EventsEnum.ProcInitialWinEnd) {
                        proc.removeListener(constant_1.EventsEnum.ProcMessage, listener);
                        resolve();
                    }
                };
                proc.on(constant_1.EventsEnum.ProcMessage, listener);
                proc.send({ type: constant_1.EventsEnum.ProcInitialWin });
            });
        });
    }
    /**
     * when all close, do callback
     * @param cb
     */
    onClose(cb) {
        this.onCloseCallback = cb;
    }
}
exports.Electron = Electron;
exports.electronProc = new Electron();
