"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * show test result with page dom
 */
let TS = [];
/**
 * add one test suit result
 * @param r
 */
function addResult(r) {
    try {
        TS.push(r);
        appendTestResultDOM(r);
        updateStatThrottle();
    }
    catch (e) {
        console.warn(e);
    }
}
exports.addResult = addResult;
/**
 * clear all test result
 */
function clearResult() {
    TS = [];
    clearTestResultsDOM();
    updateStat();
}
exports.clearResult = clearResult;
function throttle(fn, delay = 500) {
    let timer = null;
    return function () {
        // no timer, run one
        if (!timer) {
            setTimeout(function () {
                clearTimeout(timer);
                timer = null;
                fn();
            }, delay);
        }
    };
}
function getStat() {
    return {
        pass: TS.reduce((r, curr) => r + curr.numPassingTests, 0),
        fail: TS.reduce((r, curr) => r + curr.numFailingTests, 0),
        time: TS.reduce((r, curr) => r + (curr.perfStats.end - curr.perfStats.start), 0),
    };
}
function getRatio(pass, fail) {
    const total = pass + fail;
    return total === 0 ? '0%' : (pass / total * 100).toFixed(2) + '%';
}
function getTime(ms) {
    return (ms / 1000).toFixed(1) + 's';
}
function updateStat() {
    // dom object
    const $passCount = document.querySelector('#__jest-electron-test-results-stat__ .test-result-pass .stat-indicator');
    const $failCount = document.querySelector('#__jest-electron-test-results-stat__ .test-result-fail .stat-indicator');
    const $timeCount = document.querySelector('#__jest-electron-test-results-stat__ .test-result-time .stat-indicator');
    const $ratioCount = document.querySelector('#__jest-electron-test-results-stat__ .test-result-ratio .stat-indicator');
    const stat = getStat();
    $passCount.innerHTML = `${stat.pass}`;
    $failCount.innerHTML = `${stat.fail}`;
    $timeCount.innerHTML = `${getTime(stat.time)}`;
    $ratioCount.innerHTML = `${getRatio(stat.pass, stat.fail)}`;
}
const updateStatThrottle = throttle(updateStat);
function clearTestResultsDOM() {
    const $testResults = document.querySelector('#__jest-electron-test-results-list__');
    $testResults.innerHTML = '';
}
function getTitle(r) {
    const tr = r.testResults[0];
    return tr ? tr.ancestorTitles[0] : '';
}
function appendTestResultDOM(r) {
    const $testResults = document.querySelector('#__jest-electron-test-results-list__');
    const title = getTitle(r);
    if (!title)
        return;
    let code = r.failureMessage ? r.failureMessage : '';
    const ts = r.testResults.map((tr) => {
        const { title, status, duration, failureMessages } = tr;
        if (!code) {
            code = Array.isArray(failureMessages) ? failureMessages[0] : '';
        }
        return `<div class="test-result-block">
      <div class="test-result-info ${status}">
        <div class="test-result-title">${title}</div>
        <div class="test-result-time">${duration}ms</div>
      </div>
      <div class="test-result-code">
        <pre><code>${code}</code></pre>
      </div>
    </div>`;
    });
    const html = `<div class="test-result-suit">
    <div class="test-result-suit-title" title="${r.testFilePath}">${title}</div>
    <div class="test-result-suit-results">
      ${ts.join('')}
    </div>
  </div>`;
    $testResults.innerHTML = $testResults.innerHTML + html;
}
function bindFailureMessageClickEvent() {
    document.addEventListener('click', (e) => {
        try {
            // @ts-ignore
            const node = e.target.parentNode;
            if (node.matches('.test-result-info.failed')) {
                // failure
                const codeClassList = node.parentNode.querySelector('.test-result-code').classList;
                // toggle
                codeClassList.contains('show') ? codeClassList.remove('show') : codeClassList.add('show');
            }
        }
        catch (e) {
            console.warn(e);
        }
    });
}
exports.bindFailureMessageClickEvent = bindFailureMessageClickEvent;
