import { ipcRenderer, remote } from 'electron';
import { EventsEnum } from '../../utils/constant';
import { fail, run } from './uitl';

export type Args = {
  readonly debugMode?: boolean;
}

// pass the args by url hash
let args: Args = {};

try {
  args = JSON.parse(decodeURIComponent(window.location.hash.slice(1)));
} catch(e) {}

const debugMode = args.debugMode;

if (debugMode) {
  console.log(`👏 Jest-Electron is Running...`);
}

// listen and running test case
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

// web contents ready
ipcRenderer.send(EventsEnum.WebContentsReady);
