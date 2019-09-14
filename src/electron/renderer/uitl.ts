// code from https://github.com/facebook/jest/blob/master/packages/jest-runner/src/testWorker.ts
import { ipcRenderer, remote } from 'electron';
import * as Runtime from 'jest-runtime';
import * as HasteMap from 'jest-haste-map';
import * as Resolver from 'jest-resolve';
import { formatExecError, separateMessageFromStack } from 'jest-message-util';

const resolvers = new Map<string, Resolver>();

export const getResolver = (config: any, serializableModuleMap: any) => {
  if (serializableModuleMap) {
    const moduleMap: any = serializableModuleMap ? HasteMap.ModuleMap.fromJSON(serializableModuleMap) : null;

    return Runtime.createResolver(config, moduleMap);
  } else {
    const name = config.name;
    if (!resolvers.has[name]) {
      resolvers.set(name, Runtime.createResolver(config, Runtime.createHasteMap(config).readModuleMap()));
    }
    return resolvers.get(name);
  }
};

export const fail = (testPath: string, err: Error, config: any, globalConfig: any): any => {
  const failureMessage = formatExecError(err, config, globalConfig);

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
