/* 저장소 — IndexedDB(localForage). 모든 기록은 이 기기에만 저장됩니다. */
'use strict';
window.STORE = (function () {
  localforage.config({ name: 'supply-chain-lab', storeName: 'v1', description: '상품 사슬 탐험 학생 기록' });

  const KEYS = ['student', 'product', 'ws:a1', 'ws:a2', 'ws:a3', 'ws:a4', 'ws:a5', 'ws:a6', 'ws:a7', 'ws:a8', 'ws:eval', 'ws:meta',
    'map:places', 'map:legs', 'map:image', 'map:manual', 'map:view'];

  const cache = {};
  const timers = {};
  const listeners = [];

  async function loadAll() {
    for (const k of KEYS) {
      try { cache[k] = await localforage.getItem(k); } catch (e) { console.warn('load fail', k, e); cache[k] = null; }
    }
    return cache;
  }

  function get(k) { return cache[k]; }

  function set(k, v, immediate) {
    cache[k] = v;
    setStatus('saving');
    clearTimeout(timers[k]);
    const run = async () => {
      try {
        await localforage.setItem(k, v);
        if (k !== 'ws:meta') {
          const meta = { savedAt: new Date().toISOString(), version: DATA.VERSION };
          cache['ws:meta'] = meta;
          await localforage.setItem('ws:meta', meta);
        }
        setStatus('saved');
      } catch (e) {
        console.error(e);
        setStatus('error', e && e.name === 'QuotaExceededError' ? '저장 공간이 부족합니다. 지도 이미지 해상도를 낮추거나 첨부 사진을 지워 주세요.' : '저장 실패');
      }
    };
    if (immediate) return run();
    timers[k] = setTimeout(run, 500);
  }

  function setStatus(state, msg) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    el.dataset.state = state;
    el.textContent = state === 'saving' ? '저장 중…' : state === 'saved' ? '저장됨' : (msg || '저장 오류');
    if (state === 'error' && msg) alertBox(msg);
  }

  function alertBox(msg) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = msg; box.hidden = false;
    clearTimeout(alertBox.t);
    alertBox.t = setTimeout(() => { box.hidden = true; }, 4000);
  }

  async function exportBackup() {
    const data = { app: 'supply-chain-lab', version: DATA.VERSION, exportedAt: new Date().toISOString(), data: {} };
    for (const k of KEYS) data.data[k] = cache[k] ?? null;
    return data;
  }

  async function importBackup(obj) {
    if (!obj || obj.app !== 'supply-chain-lab' || !obj.data) throw new Error('이 앱의 백업 파일이 아닙니다.');
    for (const k of KEYS) {
      if (k in obj.data) { cache[k] = obj.data[k]; await localforage.setItem(k, obj.data[k]); }
    }
  }

  async function clearAll() {
    await localforage.clear();
    for (const k of KEYS) cache[k] = null;
  }

  async function reload(keys) {
    for (const k of (keys || KEYS)) { try { cache[k] = await localforage.getItem(k); } catch (e) { } }
  }

  return { KEYS, loadAll, get, set, reload, exportBackup, importBackup, clearAll, toast: alertBox };
})();
