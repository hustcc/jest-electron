"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const constant_1 = require("../../utils/constant");
const window_pool_1 = require("./window-pool");
const debugMode = !!process.env.DEBUG_MODE;
const concurrency = Number(process.env.CONCURRENCY);
// all browser window closed, then kill the while application
electron_1.app.on('window-all-closed', () => {
    electron_1.app.quit();
});
electron_1.app.on('ready', () => {
    // create a window pool instance
    const windowPool = new window_pool_1.WindowPool(concurrency, debugMode);
    // redirect the test cases data, and redirect test result after running in electron
    process.on(constant_1.EventsEnum.ProcMessage, ({ test, id, type }) => {
        if (type === constant_1.EventsEnum.ProcRunTest) {
            // send test data into render proc for running
            windowPool.runTest(id, test).then(({ result, id }) => {
                process.send({ result, id, type: constant_1.EventsEnum.ProcRunTestResult });
            });
        }
        else if (constant_1.EventsEnum.ProcInitialWin) {
            windowPool.clearSaveTests();
            process.send({ type: constant_1.EventsEnum.ProcInitialWinEnd });
        }
        else {
            console.error('Invalid message type', type);
        }
    });
    // electron proc ready
    process.send({ type: constant_1.EventsEnum.ProcReady });
});
