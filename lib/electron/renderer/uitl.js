"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Runtime = require("jest-runtime");
const HasteMap = require("jest-haste-map");
const jest_message_util_1 = require("jest-message-util");
const runTest_1 = require("jest-runner/build/runTest");
const resolvers = new Map();
exports.getResolver = (config, serializableModuleMap) => {
    if (serializableModuleMap) {
        const moduleMap = serializableModuleMap ? HasteMap.ModuleMap.fromJSON(serializableModuleMap) : null;
        return Runtime.createResolver(config, moduleMap);
    }
    else {
        const name = config.name;
        if (!resolvers.has[name]) {
            resolvers.set(name, Runtime.createResolver(config, Runtime.createHasteMap(config).readModuleMap()));
        }
        return resolvers.get(name);
    }
};
exports.fail = (testPath, err, config, globalConfig) => {
    const failureMessage = jest_message_util_1.formatExecError(err, config, globalConfig);
    return {
        console: null,
        failureMessage,
        numFailingTests: 1,
        numPassingTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        perfStats: {
            end: new Date(0).getTime(),
            start: new Date(0).getTime(),
        },
        skipped: false,
        snapshot: {
            added: 0,
            fileDeleted: false,
            matched: 0,
            unchecked: 0,
            unmatched: 0,
            updated: 0,
            uncheckedKeys: [],
        },
        sourceMaps: {},
        testExecError: err,
        testFilePath: testPath,
        testResults: [],
        leaks: false,
        openHandles: [],
    };
};
/**
 * run test case with runTest method of jest
 * @param test
 */
async function run(test) {
    return await runTest_1.default(test.path, test.globalConfig, test.config, exports.getResolver(test.config, test.serializableModuleMap));
}
exports.run = run;
