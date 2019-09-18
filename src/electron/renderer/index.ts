import { ipcRenderer, remote } from 'electron';
import { EventsEnum } from '../../utils/constant';
import { fail, run } from './uitl';

export type Args = {
  readonly debugMode?: boolean;
}

// 通过 hash 将配置传递过来
let args: Args = {};

try {
  args = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
} catch(e) {}

const debugMode = args.debugMode;

if (debugMode) {
  console.log(`👏 Jest-Electron is Running...`);
}

// 开始跑单测
ipcRenderer.on(EventsEnum.StartRunTest, async (event, test, id) => {
  try {
    const result = await run(test);

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
