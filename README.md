# jest-electron

> Easiest way to run jest unit test cases in electron.


[![Build Status](https://travis-ci.org/hustcc/jest-electron.svg?branch=master)](https://travis-ci.org/hustcc/jest-electron)
[![npm](https://img.shields.io/npm/v/jest-electron.svg)](https://www.npmjs.com/package/jest-electron)
[![npm](https://img.shields.io/npm/dm/jest-electron.svg)](https://www.npmjs.com/package/jest-electron)



## Usage


 - Install

```bash
npm i --save-dev jest-electron
```

- Add to Jest config

In your `package.json`

```diff
{
  "jest": {
+    "runner": "jest-electron/runner",
+    "testEnvironment": "jest-electron/environment"
  }
}
```

**Notice**: update the `runner` configure, not `testRunner`.

 - Update `.travis.yml`
 
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

Keep the electron browser window for debugging. set env `INTERACTIVE=1`.


```bash
INTERACTIVE=1 jest
```



## License

MIT@[hustcc](https://github.com/hustcc).
