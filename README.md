# jest-electron

> Easiest way to run jest unit test cases in electron.

When we run unit test in Jest, it is actually running in the node environment, or virtual browser environment(e.g. `JSDOM`) mocked by NodeJS. Sometimes we need a lot of [Jest mocks](https://github.com/jest-community/awesome-jest#mocks) for running code with no throw, such as: jest-canvas-mock, jest-storage-mock, @jest/fake-timers and so on. This is solved by `Jest-Electron`.

[![Build Status](https://github.com/hustcc/jest-electron/workflows/build/badge.svg)](https://github.com/hustcc/jest-electron/actions)
[![npm](https://img.shields.io/npm/v/jest-electron.svg)](https://www.npmjs.com/package/jest-electron)
[![npm](https://img.shields.io/npm/dm/jest-electron.svg)](https://www.npmjs.com/package/jest-electron)


1. Technological ecology of `Jest`.
2. Complete and real `browser environment`.
3. `Multi-renderer` for running performance.
4. `Running and debug` is better then mock.


## Installation


 - Add into devDependencies

```bash
npm i --save-dev jest-electron
```

 - Update Jest config

```diff
{
  "jest": {
+    "runner": "jest-electron/runner",
+    "testEnvironment": "jest-electron/environment"
  }
}
```

**Notice**: update the `runner` configure, not `testRunner`.



## GitHub Action

Running on `macOS` will be ok.


```diff
- runs-on: ubuntu-latest
+ runs-on: macOS-latest
```


## Travis

Update `.travis.yml` with electron supported.
 
```diff
language: node_js
node_js:
  - "8"
  - "9"
  - "10"
  - "11"
  - "12"
+ addons:
+   apt:
+     packages:
+       - xvfb
+ install:
+   - export DISPLAY=':99.0'
+   - Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
+   - npm install
script:
  - npm run test
```



## Debugger mode

Keep the electron browser window for debugging. set env `DEBUG_MODE=1`.


```bash
DEBUG_MODE=1 jest
```



## License

MIT@[hustcc](https://github.com/hustcc).
