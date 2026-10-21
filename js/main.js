/* 화면 흐름 — 탭·해시 라우팅, 이전/다음, 백업·복원, 공용 대화상자 */
'use strict';
window.APP = (function () {
  let lastWsStep = 'start';
  let currentTab = 'home';

  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  function route() {
    const h = (location.hash || '#home').slice(1);
    const [tab, sub] = h.split('/');
    const main = document.getElementById('main');
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const nav = document.getElementById('navbar');
    nav.hidden = tab !== 'ws';
    currentTab = tab;
    window.scrollTo(0, 0);
    if (tab === 'res') { RES.mount(main, sub || 'ads'); }
    else if (tab === 'map') { MAP.mount(main); }
    else if (tab === 'ws') {
      const step = sub || lastWsStep; lastWsStep = step;
      const st = WS.render(step, main);
      const i = WS.stepIndex(st.id);
      document.getElementById('btnPrev').disabled = i <= 0;
      document.getElementById('btnNext').disabled = i >= WS.STEPS.length - 1;
      document.getElementById('navPos').textContent = `${i + 1} / ${WS.STEPS.length}`;
    }
    else { renderHome(main); }
  }

  function renderHome(main) {
    const s = STORE.get('student') || {}; const prod = DATA.productById[STORE.get('product')];
    const miss = WS.emptyCounts().filter(i => !i.ok).length;
    main.innerHTML = `
      <div class="card soft">
        <h1 style="margin-bottom:4px">상품 사슬 탐험</h1>
        <p class="muted" style="margin:0">2026 세계시민과 지리 수행평가 · ‘가상 상품으로 따라가는 상품 사슬’ 프로젝트</p>
      </div>
      <div class="card">
        <p><b>${s.name ? `${s.classNo}반 ${s.number}번 ${s.name}` : '학생 정보 미입력'}</b> · 선택한 제품 : ${prod ? `<b>${prod.no}. ${prod.name}</b>` : '아직 없음'} · 남은 빈칸 : <b>${miss}</b>개</p>
        <div class="btnrow"><button class="btn" data-go="#ws/${s.name ? (prod ? 'a1' : 'ads') : 'start'}">활동지 ${s.name ? '이어서 하기' : '시작하기'}</button><button class="btn sec" data-go="#res/ads">자료 보기</button><button class="btn sec" data-go="#map">지도 만들기</button></div>
      </div>
      <div class="grid3">
        <div class="card"><h3>① 자료</h3><p class="small">광고지 6종, 라벨 6종, 부가가치 학습자료, 라벨 원료 가격표(2026-08-01 기준)를 봅니다.</p><button class="btn ghost sm" data-go="#res/ads">열기</button></div>
        <div class="card"><h3>② 지도</h3><p class="small">브랜드 본사·원료 생산지·제조국·판매 지역을 표시하고 운송 경로를 그립니다. 육상·해상 거리가 자동 계산됩니다.</p><button class="btn ghost sm" data-go="#map">열기</button></div>
        <div class="card"><h3>③ 활동지</h3><p class="small">활동 1~8과 평가지를 작성하고, 제출 전 점검 뒤 PDF로 저장합니다.</p><button class="btn ghost sm" data-go="#ws/start">열기</button></div>
      </div>
      <div class="card"><h3>이 앱의 저장 방식</h3><p class="small">입력한 내용은 <b>이 기기(브라우저)에만</b> 저장되며 외부 서버로 보내지 않습니다. 브라우저 기록·사이트 데이터를 지우면 함께 지워지니, 활동이 끝나면 꼭 <b>PDF 저장</b>과 <b>백업 파일 내보내기</b>를 해 두세요. 인터넷이 없어도(비행기 모드) 모든 기능을 쓸 수 있습니다.</p>
      <p class="small muted">※ 모든 제품·브랜드·금액은 수업용 가상 자료입니다. 실제 기업·제품과 관계없습니다. 앱 버전 ${DATA.VERSION} <button class="btn ghost sm" id="btnRefreshApp" type="button">최신 버전으로 새로 고침</button></p></div>`;
    main.querySelector('#btnRefreshApp').addEventListener('click', refreshApp);
  }

  // 화면이 옛 버전으로 남아 있을 때(브라우저 캐시) : 서비스 워커·캐시만 지우고 다시 불러옴. 학생 기록(IndexedDB)은 그대로 둠
  async function refreshApp() {
    STORE.toast('최신 버전을 받아 옵니다…');
    try {
      if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); }
      if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
    } catch (e) { console.warn('캐시 정리 실패', e); }
    const u = new URL(location.href); u.searchParams.set('v', Date.now()); u.hash = ''; location.replace(u.href);
  }

  // ── 공용 대화상자 ──
  function confirm(msg, onOk, opts) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><p style="white-space:pre-wrap">${msg}</p><div class="btnrow" style="justify-content:flex-end"><button class="btn ghost" data-a="no">취소</button><button class="btn ${opts && opts.danger ? 'danger' : ''}" data-a="ok">${(opts && opts.okText) || '확인'}</button></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { const a = e.target.dataset.a; if (!a && e.target !== ov) return; ov.remove(); if (a === 'ok') onOk(); });
  }

  // ── 백업·복원·초기화 ──
  async function exportBackup() {
    const data = await STORE.exportBackup();
    const s = STORE.get('student') || {};
    const name = `${s.classNo || '0'}-${s.number || '0'}_${s.name || '이름'}_상품사슬_백업.json`;
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    STORE.toast('백업 파일을 내려받습니다 : ' + name);
  }
  function importBackup(file) {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      let obj; try { obj = JSON.parse(rd.result); } catch (e) { STORE.toast('백업 파일을 읽지 못했습니다.'); return; }
      confirm('백업 파일의 기록으로 지금 기기의 기록을 덮어씁니다. 계속할까요?', async () => {
        try { await STORE.importBackup(obj); WS.loadState(); MAP.load(); STORE.toast('백업을 불러왔습니다.'); go('#ws/start'); route(); }
        catch (e) { STORE.toast(e.message); }
      }, { danger: true, okText: '덮어쓰기' });
    };
    rd.readAsText(file);
  }
  function clearAll() {
    confirm('모든 기록(활동지·지도·학생 정보)을 지웁니다. 지도 기록도 함께 지워집니다.\n정말 지울까요?', () => {
      confirm('되돌릴 수 없습니다. 한 번 더 확인합니다 — 정말 모두 지울까요?', async () => { await STORE.clearAll(); WS.loadState(); MAP.load(); STORE.toast('모든 기록을 지웠습니다.'); go('#ws/start'); route(); }, { danger: true, okText: '모두 지우기' });
    }, { danger: true, okText: '지우기' });
  }

  function resizeImage(file, maxW) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { const r = Math.min(1, maxW / img.width); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.85)); URL.revokeObjectURL(img.src); };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }

  async function reloadMapData() { await STORE.reload(['map:places', 'map:legs', 'map:image', 'map:manual']); }

  // ── 초기화 ──
  async function init() {
    await STORE.loadAll();
    WS.loadState(); MAP.load();
    MAP.setOnChange(() => { if (currentTab === 'ws') { /* 활동 5 자동 갱신은 다시 불러오기로 */ } });
    document.getElementById('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; go(b.dataset.tab === 'ws' ? '#ws/' + lastWsStep : b.dataset.tab === 'res' ? '#res/ads' : '#' + b.dataset.tab); });
    document.getElementById('btnPrev').addEventListener('click', () => { const i = WS.stepIndex(lastWsStep); if (i > 0) go('#ws/' + WS.STEPS[i - 1].id); });
    document.getElementById('btnNext').addEventListener('click', () => { const i = WS.stepIndex(lastWsStep); if (i < WS.STEPS.length - 1) go('#ws/' + WS.STEPS[i + 1].id); });
    document.body.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && b.dataset.go && b.dataset.go.startsWith('#')) go(b.dataset.go); });
    window.addEventListener('hashchange', route);
    route();
    if ('serviceWorker' in navigator) {
      // 새 버전의 서비스 워커가 제어권을 가져오면(기존 캐시 → 새 캐시) 한 번 새로 고침해 최신 화면을 보여 줌
      const hadController = !!navigator.serviceWorker.controller; let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading) return; reloading = true;
        STORE.toast('앱이 새 버전으로 바뀌어 화면을 새로 고칩니다.');
        setTimeout(() => location.reload(), 800);
      });
      try { const reg = await navigator.serviceWorker.register('sw.js'); reg.update().catch(() => {}); } catch (e) { console.warn('SW 등록 실패', e); }
    }
    MAP.loadWorld().then(() => { if (!STORE.get('map:image') && MAP.getPlaces().length) MAP.exportImage(); });
  }

  return { init, go, route, confirm, exportBackup, importBackup, clearAll, resizeImage, reloadMapData, refreshApp };
})();

document.addEventListener('DOMContentLoaded', APP.init);
