"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const url = require("url");
const throat_1 = require("throat");
const electron_1 = require("electron");
const constant_1 = require("../../utils/constant");
const delay_1 = require("../../utils/delay");
const uuid_1 = require("../../utils/uuid");
const config_1 = require("../../utils/config");
// configure save instance
const config = new config_1.Config(electron_1.app.getPath('userData'));
/**
 * browser window (renderer) pool
 */
class WindowPool {
    constructor(maxSize = 1, debugMode = false) {
        this.pool = [];
        // create new browser window instance lock flag
        this.locked = false;
        // when debug mode, only 1 window can be work
        this.maxSize = debugMode ? 1 : maxSize;
        this.debugMode = debugMode;
        electron_1.ipcMain.on(constant_1.EventsEnum.WebContentsReady, () => {
            this.runAllTest();
        });
    }
    /**
     * get a window with thread lock
     */
    async get() {
        // if locked, delay and retry
        if (this.locked) {
            await delay_1.delay();
            return await this.get();
        }
        this.locked = true;
        const win = await this.getAsync();
        this.locked = false;
        return win;
    }
    /**
     * get a window from pool, if not exist, create one, if pool is full, wait and retry
     */
    async getAsync() {
        // find a idle window
        let info = this.pool.find((info) => info.idle);
        // exist ide window, return it for usage
        if (info)
            return info.win;
        // no idle window
        // and the pool is full, delay some time
        if (this.isFull()) {
            await delay_1.delay();
            return await this.getAsync();
        }
        // pool has space, then create a new window instance
        const win = await this.create();
        // put it into pool
        this.pool.push({ win, idle: true, tests: [] });
        return win;
    }
    /**
     * create a valid electron browser window
     */
    async create() {
        return new Promise((resolve, reject) => {
            const winOpts = {
                // read window size from configure file
                ...config.read(),
                show: this.debugMode,
                focusable: this.debugMode,
                webPreferences: {
                    webSecurity: false,
                    nodeIntegration: true,
                },
            };
            let win = new electron_1.BrowserWindow(winOpts);
            // when window close, save window size locally
            win.on('close', () => {
                const { width, height } = win.getBounds();
                config.write({ width, height });
            });
            // after window closed, remove it from pool for gc
            win.on('closed', () => {
                this.removeWin(win);
                win = undefined;
            });
            const f = url.format({
                hash: encodeURIComponent(JSON.stringify({ debugMode: this.debugMode })),
                pathname: path.join(__dirname, '/index.html'),
                protocol: 'file:',
                slashes: true,
            });
            win.loadURL(f);
            if (this.debugMode) {
                // when debug mode, open dev tools
                win.webContents.openDevTools();
            }
            win.webContents.on('did-finish-load', () => {
                // win ready
                resolve(win);
            });
        });
    }
    /**
     * the proc size of pool
     */
    size() {
        return this.pool.length;
    }
    /**
     * whether the pool is full
     */
    isFull() {
        return this.size() >= this.maxSize;
    }
    /**
     * set the proc idle status
     * @param win
     * @param idle
     */
    setIdle(win, idle) {
        const idx = this.pool.findIndex(info => info.win === win);
        this.pool[idx].idle = idle;
    }
    appendTest(win, test) {
        const idx = this.pool.findIndex(info => info.win === win);
        this.pool[idx].tests.push(test);
    }
    /**
     * clear all the save tests in memory
     */
    clearSaveTests() {
        this.pool.forEach(info => {
            info.tests = [];
            // remove all test result dom
            info.win.webContents.send(constant_1.EventsEnum.ClearTestResults);
        });
    }
    removeWin(win) {
        const idx = this.pool.findIndex((info) => info.win = win);
        // remove from pool by index
        if (idx !== -1) {
            this.pool.splice(idx, 1);
        }
        win.destroy();
    }
    /**
     * run test case by send it to renderer
     * @param id
     * @param test
     */
    async runTest(id, test) {
        const win = await this.get();
        const result = await this.run(win, id, test);
        this.appendTest(win, test);
        return result;
    }
    async runAllTest() {
        this.pool.map(async (info) => {
            await Promise.all(info.tests.map(throat_1.default(1, async (test) => {
                return await this.run(info.win, uuid_1.uuid(), test);
            })));
        });
    }
    async run(win, id, test) {
        return new Promise((resolve, reject) => {
            this.setIdle(win, false);
            // redirect the test result ti proc
            electron_1.ipcMain.once(id, (event, result) => {
                // test case running end, set the window with idle status
                this.setIdle(win, true);
                // resolve test result
                resolve({ result, id });
            });
            // send test case into web contents for running
            win.webContents.send(constant_1.EventsEnum.StartRunTest, test, id);
        });
    }
}
exports.WindowPool = WindowPool;
