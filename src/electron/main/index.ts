import * as path from 'path';
import * as url from 'url';
import * as minimist from 'minimist';
import { app, BrowserWindow, ipcMain, remote } from 'electron';
import { Args } from '../interface';
import { EventsEnum } from '../../utils/constant';

// 从命令行中传进来的参数
const args: Args = minimist(process.argv.slice(2));

const createWin = (): BrowserWindow => {
  const winOpts = {
    // 默认大小，应该需要可以定制
    height: 600,
    width: 800,
    show: false,
    focusable: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
    },
  };

  // 创建窗口
  let w = new BrowserWindow(winOpts);

  // 关闭之前事件
  w.on('close', () => {
    // 可以保存之前的窗口大小
    // console.log(win.getBounds());
  });

  // 关闭之后
  w.on('closed', () => {
    w.destroy();
    w = undefined;
  });

  return w;
};

// 所有窗口关闭，则整个退出
app.on('window-all-closed', () => {
  app.quit();
});

app.on('ready', () => {
  // 创建窗口
  let win = createWin();

  const f = url.format({
    hash: encodeURIComponent(JSON.stringify(args)),
    pathname: path.join(__dirname, '/index.html'),
    protocol: 'file:',
    slashes: true,
  });
  win.loadURL(f);

  if (args.interactive) {
    win.show();
    // 打开控制台
    win.webContents.openDevTools();
  }

  win.webContents.on('did-finish-load', () => {
    // proc ready
    process.send({ type: EventsEnum.ProcReady });
  });

  // 接受测试数据，进行测试
  process.on(EventsEnum.ProcMessage, ({ test, id, type }) => {
    if (type === EventsEnum.ProcRunTest) {
      // 单测返回之后发送到 proc 中
      ipcMain.once(id, (event, result) => {
        process.send({ result, id, type: EventsEnum.ProcRunTestResult });
      });

      // 发送到 render 中执行单测
      win.webContents.send(EventsEnum.StartRunTest, test, id);
    } else {
      console.error('Invalid message type', type);
    }
  });
});
