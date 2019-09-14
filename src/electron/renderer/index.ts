import { ipcRenderer, remote } from 'electron';
import runTest from 'jest-runner/build/runTest';
import { EventsEnum } from '../../utils/constant';
import { Args } from '../interface';
import { getResolver, fail } from './uitl';

// 通过 hash 将配置传递过来
let args: Args = {};

try {
  args = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
} catch(e) {}

const interactive = args.interactive;

if (interactive) {
  console.log(`👏 Jest-Electron is Running...`);
}

// 开始跑单测
ipcRenderer.on(EventsEnum.StartRunTest, async (event, test, id) => {
  try {
    const result = await runTest(
      test.path,
      test.globalConfig,
      test.config,
      getResolver(test.config, test.serializableModuleMap),
    );

    ipcRenderer.send(id, result);
  } catch (error) {
    ipcRenderer.send(
      id,
      fail(
        test.path,
        error,
        test.config,
        test.globalConfig,
      ),
    );
    console.error(error);
  }
});

// 加载完成
ipcRenderer.send(EventsEnum.WebContentsReady);
