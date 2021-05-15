"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const constant_1 = require("../../utils/constant");
const uitl_1 = require("./uitl");
const dom_1 = require("./dom");
// pass the args by url hash
let args = {};
try {
    args = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
}
catch (e) { }
const debugMode = args.debugMode;
if (debugMode) {
    console.log(`👏 Jest-Electron is Running...`);
}
// listen and running test case
electron_1.ipcRenderer.on(constant_1.EventsEnum.StartRunTest, async (event, test, id) => {
    try {
        const result = await uitl_1.run(test);
        dom_1.addResult(result);
        electron_1.ipcRenderer.send(id, result);
    }
    catch (error) {
        electron_1.ipcRenderer.send(id, uitl_1.fail(test.path, error, test.config, test.globalConfig));
        console.error(error);
    }
});
electron_1.ipcRenderer.on(constant_1.EventsEnum.ClearTestResults, async (event) => {
    try {
        dom_1.clearResult();
        const tr = document.querySelector('#__jest-electron-test-results__');
        document.body.innerHTML = '';
        document.body.appendChild(tr);
    }
    catch (e) {
        console.warn(e);
    }
});
// web contents ready
dom_1.bindFailureMessageClickEvent(); // bind event
electron_1.ipcRenderer.send(constant_1.EventsEnum.WebContentsReady);
