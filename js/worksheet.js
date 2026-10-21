/* 활동지 — 활동 1~8, 평가지, 제출 전 점검 */
'use strict';
window.WS = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return isFinite(n) ? n : 0; };
  const won = n => Math.round(n).toLocaleString('ko-KR');
  const pct = (a, b) => b ? (Math.round(a / b * 1000) / 10).toFixed(1) : '0.0';

  const STEPS = [
    { id: 'start', short: '시작', title: '시작 · 학생 정보' },
    { id: 'ads', short: '광고지', title: '가상 상품 광고지 살펴보기 · 제품 고르기' },
    { id: 'a1', short: '1', title: '1. [개별활동Ⅰ] 제품 선택하기 (광고지)', res: 'ads' },
    { id: 'a2', short: '2', title: '2. [개별활동Ⅱ] 제품 원료 예상하기', res: 'va' },
    { id: 'a3', short: '3', title: '3. [개별활동Ⅲ] 제품 라벨 확인하기', res: 'labels' },
    { id: 'a4', short: '4', title: '4. [개별활동Ⅳ] 상품 사슬표 작성하기', res: 'va' },
    { id: 'a5', short: '5', title: '5. [개별활동Ⅴ] 상품 사슬 지도 작성하기', res: 'map' },
    { id: 'a6', short: '6', title: '6. [개별활동Ⅵ] 상품 사슬에서 가장 중요한 단계 찾기' },
    { id: 'a7', short: '7', title: '7. [개별활동Ⅶ] 내가 생각하는 상품 사슬' },
    { id: 'a8', short: '8', title: '8. [개별활동Ⅷ] 책임 있는 소비 방법' },
    { id: 'eval', short: '평가', title: '평가지' },
    { id: 'review', short: '점검·PDF', title: '제출 전 점검과 PDF 저장' }
  ];
  const STAGES = ['원료', '제조', '유통', '판매'];
  const VIEWS = { econ: '경제 (부가가치 분배)', labor: '노동 · 인권', env: '환경', info: '정보 · 광고' };

  // ───────── 기본값 ─────────
  const row = (...ks) => Object.fromEntries(ks.map(k => [k, '']));
  const DEF = {
    a1: () => ({ reason: '', adPlace: '', adPros: '', adHidden: '' }),
    a2: () => ({ predict: Array.from({ length: 5 }, () => row('material', 'reason', 'country', 'price')), ratioReason: '', concept: { blank1: '', blank2: '', coffee: ['', '', '', ''], sum: '', s1: '', s2: '', checked: false } }),
    a3: () => ({ origin: '', maker: '', hq: '', rawList: '', compare: Array.from({ length: 6 }, () => row('material', 'predicted', 'origin', 'price', 'cost')), diff: '' }),
    a4: () => ({ hq: '', rows: { raw: row('place', 'who', 'va', 'route'), make: row('place', 'who', 'va', 'route'), dist: row('place', 'who', 'va', 'route'), sale: row('place', 'who', 'va', 'route'), tax: row('va') }, insight: '' }),
    a5: () => ({ marks: row('hq', 'raw', 'factory', 'sale', 'route'), insight: '', manual: false, manualLegs: Array.from({ length: 5 }, () => row('from', 'to', 'mode', 'km')), manualImage: null }),
    a6: () => ({ topStage: '', topPlace: '', topVa: '', topReason: '', impStage: '', criterion: '', impReason: '', rawShareWon: '', topShareWon: '' }),
    a7: () => ({ pros: '', cons: '', solution: '' }),
    a8: () => ({ method: '', company: '', gov: '', pledge: '' }),
    eval: () => ({ reflection: '' })
  };
  const S = {};
  function loadState() {
    for (const k of Object.keys(DEF)) {
      const saved = STORE.get('ws:' + k);
      S[k] = Object.assign(DEF[k](), saved || {});
      // 중첩 기본값 보강
      if (k === 'a2' && saved) {
        const c = saved.concept || {}; S.a2.concept = Object.assign(DEF.a2().concept, c);
        // 이전 형식(빵 예시 bread 칸) → 2-3 예시가 커피로 바뀌어 계산 칸·합계·A는 비우고, 개념 빈칸(판 값·산 값)과 B는 유지
        if (c.bread && !c.coffee) { Object.assign(S.a2.concept, { coffee: ['', '', '', ''], sum: '', s1: '', checked: false }); delete S.a2.concept.bread; save('a2'); }
      }
      if (k === 'a4' && saved) S.a4.rows = Object.assign(DEF.a4().rows, saved.rows || {});
      if (k === 'a5' && saved) S.a5.marks = Object.assign(DEF.a5().marks, saved.marks || {});
      // 이전 형식(관점별 문제점 표 · 소비 방법 3줄) 기록을 새 칸으로 옮김
      if (k === 'a7' && saved && saved.rows && !S.a7.cons) { const t = Object.values(saved.rows).map(r => [r.problem, r.evidence].filter(Boolean).join(' / ')).filter(Boolean).concat(saved.worstReason ? [saved.worstReason] : []).join('\n'); if (t) { S.a7.cons = t; save('a7'); } }
      if (k === 'a8' && saved && Array.isArray(saved.rows) && !S.a8.method) { const t = saved.rows.map(r => [r.method, r.plan].filter(Boolean).join(' — ')).filter(Boolean).join('\n'); if (t) { S.a8.method = t; save('a8'); } }
    }
  }
  const save = k => STORE.set('ws:' + k, S[k]);
  const product = () => DATA.productById[STORE.get('product')] || null;
  const student = () => STORE.get('student') || { classNo: '', number: '', name: '' };

  // ───────── 경로 유틸 ─────────
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };

  // ───────── 입력 템플릿 ─────────
  const ta = (p, max, ph, rows) => `<textarea data-b="${p}" maxlength="${max}" rows="${rows || 3}" placeholder="${esc(ph || '')}"></textarea><div class="cnt" data-cnt="${p}">0 / ${max}</div>`;
  const txt = (p, max, ph) => `<input type="text" data-b="${p}" ${max ? `maxlength="${max}"` : ''} placeholder="${esc(ph || '')}">${max ? `<div class="cnt" data-cnt="${p}">0 / ${max}</div>` : ''}`;
  const numIn = (p, ph) => `<input type="number" inputmode="decimal" data-b="${p}" placeholder="${esc(ph || '')}" class="num">`;
  const sel = (p, opts, blank) => `<select data-b="${p}">${blank !== false ? '<option value="">— 선택 —</option>' : ''}${opts.map(o => Array.isArray(o) ? `<option value="${esc(o[0])}">${esc(o[1])}</option>` : `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
  const auto = (id, v, unit) => `<input type="text" class="auto" readonly id="${id}" value="${esc(v)}" aria-label="자동 계산">${unit ? `<span class="small muted"> ${unit}</span>` : ''}`;
  const ox = p => `<div class="ox" data-ox="${p}"><button type="button" data-v="○">○ 예상함</button><button type="button" data-v="×">× 못 함</button></div>`;
  const resBtn = (res, label) => res ? `<button class="btn sec sm" data-res="${res}">${label || '자료 보기'}</button>` : '';

  function bind(root, key, after) {
    const st = S[key];
    root.querySelectorAll('[data-b]').forEach(el => {
      const p = el.dataset.b; const v = getP(st, p);
      el.value = v == null ? '' : v;
      updCnt(root, p, el);
      el.addEventListener('input', () => { setP(st, p, el.value); updCnt(root, p, el); save(key); if (after) after(); });
    });
    root.querySelectorAll('[data-ox]').forEach(box => {
      const p = box.dataset.ox; const paint = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === getP(st, p)));
      paint();
      box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setP(st, p, getP(st, p) === b.dataset.v ? '' : b.dataset.v); paint(); save(key); if (after) after(); });
    });
    root.querySelectorAll('[data-score]').forEach(box => {
      const p = box.dataset.score; const paint = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(getP(st, p))));
      paint();
      box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setP(st, p, getP(st, p) === b.dataset.v ? '' : b.dataset.v); paint(); save(key); if (after) after(); });
    });
    root.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => APP.go(b.dataset.res === 'map' ? '#map' : '#res/' + b.dataset.res)));
    if (after) after();
  }
  function updCnt(root, p, el) {
    const c = root.querySelector(`[data-cnt="${p}"]`); if (!c) return;
    const max = +el.getAttribute('maxlength'); c.textContent = `${el.value.length} / ${max}`; c.classList.toggle('over', el.value.length >= max);
  }

  // ───────── 화면 ─────────
  function render(step, main) {
    const st = STEPS.find(s => s.id === step) || STEPS[0];
    const prod = product();
    let html = `<div id="progress">${STEPS.map(s => `<button data-step="${s.id}" class="${s.id === st.id ? 'active' : ''} ${isDone(s.id) ? 'done' : ''}">${s.short}</button>`).join('')}</div>
      <div class="row" style="align-items:flex-start"><h2 style="flex:1 1 200px;margin:4px 0 10px">${esc(st.title)}</h2>${st.res ? `<div class="fixed">${resBtn(st.res, st.res === 'map' ? '지도 열기' : '자료 보기')}</div>` : ''}</div>`;
    if (st.id !== 'start' && st.id !== 'review' && !prod && st.id !== 'ads') html += `<div class="card warn">아직 제품을 고르지 않았습니다. <button class="btn sm sec" data-go="#ws/ads" style="margin-left:6px">광고지 보고 제품 고르기</button> 제품을 고르면 광고지·라벨이 자동으로 나타나고 판매 가격 등 자동 값이 채워집니다.</div>`;
    const body = document.createElement('div');
    main.innerHTML = html; main.appendChild(body);
    ({ start: vStart, ads: vAds, a1: vA1, a2: vA2, a3: vA3, a4: vA4, a5: vA5, a6: vA6, a7: vA7, a8: vA8, eval: vEval, review: vReview })[st.id](body);
    main.querySelector('#progress').addEventListener('click', e => { const b = e.target.closest('button'); if (b) APP.go('#ws/' + b.dataset.step); });
    body.addEventListener('click', e => { const z = e.target.closest('[data-adzoom]'); if (z) { e.preventDefault(); openAd(Number(z.dataset.adzoom)); } const v = e.target.closest('[data-vazoom]'); if (v) { e.preventDefault(); openVA(Number(v.dataset.vazoom)); } });
    const act = main.querySelector('#progress .active'); if (act) act.scrollIntoView({ inline: 'center', block: 'nearest' });
    return st;
  }

  function stepIndex(id) { return STEPS.findIndex(s => s.id === id); }

  // ── 시작 ──
  function vStart(root) {
    const s = student(); const prod = product();
    root.innerHTML = `
      <div class="card soft"><p style="margin:0"><b>모든 활동은 개별 활동입니다.</b> 입력한 내용은 이 기기에만 저장됩니다. 다른 기기로 옮길 때는 ‘백업 파일 내보내기’를 쓰세요.</p></div>
      <div class="card">
        <h3>◈ 주제 · 탐구 질문</h3>
        <p><b>주제</b> : 가상 상품의 상품 사슬과 부가가치를 탐구하고 책임 있는 소비 방법 찾기</p>
        <p><b>탐구 질문</b> : 내가 고른 상품은 어디에서 와서, 누구의 손을 거쳐, 누구에게 얼마를 남길까?</p>
        <details class="collapse"><summary>진행 과정 (4차시)</summary><ol class="steps">
          <li><b>1차시</b> 수행평가 과정 설명 · 앱 접속 확인 → [Ⅰ] 제품 선택하기 → [Ⅱ] 제품 원료 예상하기, 부가가치 개념 알아보기 (자료 : 광고지·부가가치 개념)</li>
          <li><b>2차시</b> [Ⅲ] 제품 라벨 확인하기 → [Ⅳ] 상품 사슬표 작성하기 (자료 : 라벨·원료 가격·부가가치 자료)</li>
          <li><b>3차시</b> [Ⅴ] 상품 사슬 지도 작성하기 (지도 탭)</li>
          <li><b>4차시</b> [Ⅵ] 가장 중요한 단계 찾기 → [Ⅶ] 내가 생각하는 상품 사슬 → [Ⅷ] 책임 있는 소비 방법 → 발표, 활동지·지도 PDF 제출, 평가지 작성</li></ol></details>
      </div>
      <div class="card">
        <h3>학생 정보 <span class="small muted">(필수)</span></h3>
        <div class="grid3">
          <div><label class="f" for="stClass">반 <span class="req">*</span></label><input type="number" inputmode="numeric" id="stClass" min="1" max="30" value="${esc(s.classNo)}"></div>
          <div><label class="f" for="stNo">번호 <span class="req">*</span></label><input type="number" inputmode="numeric" id="stNo" min="1" max="50" value="${esc(s.number)}"></div>
          <div><label class="f" for="stName">이름 <span class="req">*</span></label><input type="text" id="stName" maxlength="20" value="${esc(s.name)}"></div>
        </div>
        <p style="margin-top:12px">선택한 제품 : ${prod ? `<b>${prod.no}. ${esc(prod.name)}</b> <span class="muted">(${esc(prod.full)} · ${esc(prod.priceLabel)})</span>` : '<span class="muted">아직 없음 — 다음 화면(광고지)에서 고릅니다</span>'}</p>
      </div>
      <div class="card">
        <h3>백업 · 초기화</h3>
        <div class="btnrow"><button class="btn sec" id="btnExport">백업 파일 내보내기</button><button class="btn sec" id="btnImport">백업 파일 불러오기</button><input type="file" id="importFile" accept="application/json,.json" hidden><button class="btn danger" id="btnClear">모든 기록 지우기</button></div>
        <p class="small muted">백업 파일(JSON)에는 활동지·지도 기록이 모두 들어 있습니다. 다른 기기에서 ‘불러오기’를 하면 그대로 복원됩니다.</p>
      </div>`;
    const upd = () => { STORE.set('student', { classNo: root.querySelector('#stClass').value.trim(), number: root.querySelector('#stNo').value.trim(), name: root.querySelector('#stName').value.trim() }); };
    ['#stClass', '#stNo', '#stName'].forEach(id => root.querySelector(id).addEventListener('input', upd));
    root.querySelector('#btnExport').addEventListener('click', APP.exportBackup);
    root.querySelector('#btnImport').addEventListener('click', () => root.querySelector('#importFile').click());
    root.querySelector('#importFile').addEventListener('change', e => APP.importBackup(e.target.files[0]));
    root.querySelector('#btnClear').addEventListener('click', APP.clearAll);
  }

  // ── 광고지 · 제품 고르기 ──
  const circ = n => ['①', '②', '③', '④', '⑤', '⑥'][n - 1] || n;
  function openAd(n) { RES.openTab(`assets/ads/ad${n}.png`, `광고지 ${n} · ${DATA.PRODUCTS[n - 1].name}`, `assets/pdf/ad${n}.pdf`); }
  // 선택한 제품의 광고지 카드 (활동 1·2 공용). [확대하기]는 render()의 클릭 위임(data-adzoom)으로 새 탭에 열림
  const adCard = prod => prod
    ? `<div class="card labelcard adcard"><div class="row" style="align-items:center"><h3 style="flex:1 1 200px;margin:0">내가 고른 제품의 광고지 : ${prod.no}. ${esc(prod.name)} <span class="badge auto">자동</span></h3><div class="btnrow fixed" style="margin:0"><button type="button" class="btn sm" data-adzoom="${prod.no}">확대하기</button><a class="btn sm ghost" href="assets/pdf/ad${prod.no}.pdf" target="_blank" rel="noopener">PDF 원본</a><button type="button" class="btn sm ghost" data-go="#ws/ads">다른 제품 고르기</button></div></div>
        <img class="adimg" src="assets/ads/ad${prod.no}.png" alt="${esc(prod.name)} 광고지" loading="eager" decoding="async">
        <p class="small muted" style="margin:6px 0 0">글씨가 작으면 [확대하기]를 누르세요. 새 탭에서 크게 열립니다.</p></div>`
    : `<div class="card warn">광고지 화면에서 제품을 고르면 그 광고지가 여기에 자동으로 나타납니다. <button type="button" class="btn sm sec" data-go="#ws/ads">광고지 보러 가기</button></div>`;
  // 부가가치 학습자료(data3) 카드 : n = 0 개념, 1~6 제품별. 이미지 assets/va/va{n}.png, 원본 assets/pdf/va{n}.pdf. [확대하기]는 render()의 클릭 위임(data-vazoom)
  const vaTitle = n => n ? `부가가치 따라가기 ${circ(n)} ${DATA.PRODUCTS[n - 1].name}` : '부가가치란 무엇일까? (개념)';
  function openVA(n) { RES.openTab(`assets/va/va${n}.png`, vaTitle(n), `assets/pdf/va${n}.pdf`); }
  const vaBtns = n => `<div class="btnrow fixed" style="margin:0"><button type="button" class="btn sm" data-vazoom="${n}">확대하기</button><a class="btn sm ghost" href="assets/pdf/va${n}.pdf" target="_blank" rel="noopener">PDF 원본</a></div>`;
  // 활동 2-3 : 개념 자료(부가가치 학습자료_0_개념.pdf) 자동 표시
  const conceptCard = () => `<div class="card labelcard vacard" id="conceptCard"><div class="row" style="align-items:center"><h3 style="flex:1 1 200px;margin:0">부가가치 개념 자료 <span class="badge auto">자동</span></h3>${vaBtns(0)}</div>
        <img class="vaimg" src="assets/va/va0.png" alt="부가가치란 무엇일까? 학습자료" loading="eager" decoding="async">
        <p class="small muted" style="margin:6px 0 0">글씨가 작으면 [확대하기]를 누르세요. 새 탭에서 크게 열립니다.</p></div>`;
  // 활동 4·6 : 선택한 제품의 「부가가치 따라가기」 자료 자동 표시 (표 + 원본 이미지)
  const vaCard = prod => prod
    ? `<div class="card labelcard vacard" id="vaCard"><div class="row" style="align-items:center"><h3 style="flex:1 1 200px;margin:0">내가 고른 제품의 부가가치 자료 : ${prod.no}. ${esc(prod.name)} <span class="badge auto">자동</span></h3>${vaBtns(prod.no)}</div>
        <p class="small" style="margin:8px 0 4px">소비자 가격 <b>${won(prod.price)}원</b> = 세금 빼기 전 판매 가격 ${won(prod.preTax)}원 + 부가가치세 ${won(prod.tax)}원</p>
        <div class="tbl-wrap"><table class="tbl vatbl"><thead><tr><th>단계</th><th>누가 · 어디서</th><th>산 값</th><th>판 값</th><th>부가가치</th><th>비율</th></tr></thead><tbody>
        ${prod.va.stages.map(s => `<tr><td class="lab">${s.key}</td><td>${esc(s.who)}</td><td class="num">${won(s.buy)}원</td><td class="num">${won(s.sell)}원</td><td class="num"><b>${won(s.va)}원</b></td><td class="num">${s.pct}%</td></tr>`).join('')}
        <tr><td colspan="4" class="right">부가가치세 (정부)</td><td class="num"><b>${won(prod.tax)}원</b></td><td class="num">${pct(prod.tax, prod.price)}%</td></tr>
        <tr><td colspan="4" class="right"><b>합계 = 소비자 가격</b></td><td class="num"><b>${won(prod.price)}원</b></td><td class="num">100%</td></tr></tbody></table></div>
        <img class="vaimg" src="assets/va/va${prod.no}.png" alt="${esc(prod.name)} 부가가치 자료" loading="eager" decoding="async">
        <p class="small muted" style="margin:6px 0 0">자료 아래쪽 「확인해 봅시다」 질문도 생각해 보세요. 글씨가 작으면 [확대하기]를 누르세요.</p></div>`
    : `<div class="card warn">광고지 화면에서 제품을 고르면 그 제품의 부가가치 자료가 여기에 자동으로 나타납니다. <button type="button" class="btn sm sec" data-go="#ws/ads">광고지 보러 가기</button></div>`;
  function vAds(root) {
    const cur = STORE.get('product');
    root.innerHTML = `
      <div class="card soft"><p style="margin:0">가상 상품 광고지 6종을 살펴보고, 내가 탐구할 제품 하나를 골라 카드를 누르세요. 고른 제품의 광고지는 <b>활동 1</b>에 자동으로 나타납니다.</p></div>
      <div class="hint">광고지를 크게 보려면 카드의 [크게 보기]를 누르세요. 새 탭에서 열리며, 다 보면 그 탭을 닫고 돌아오세요.</div>
      <div class="products">${DATA.PRODUCTS.map(p => `<button type="button" class="pcard ${cur === p.id ? 'sel' : ''}" data-p="${p.id}"><span class="tick">✓</span><span class="zoom" data-zoom="${p.no}">크게 보기</span><img src="assets/ads/ad${p.no}_thumb.png" alt="${esc(p.name)} 광고지"><div class="nm">${circ(p.no)} ${esc(p.name)}</div><div class="sl">${esc(p.slogan)}</div><div class="pr">${esc(p.priceLabel)}</div></button>`).join('')}</div>
      <div class="card soft" id="adsNext" style="margin-top:14px"><p style="margin:0 0 8px">${cur ? `선택한 제품 : <b>${DATA.productById[cur].no}. ${esc(DATA.productById[cur].name)}</b>` : '아직 제품을 고르지 않았습니다.'}</p><div class="btnrow"><button class="btn" data-go="#ws/a1" ${cur ? '' : 'disabled'}>활동 1로 가기</button></div></div>`;
    root.querySelector('.products').addEventListener('click', e => {
      const z = e.target.closest('[data-zoom]');
      if (z) { e.preventDefault(); e.stopPropagation(); openAd(Number(z.dataset.zoom)); return; }
      const c = e.target.closest('.pcard'); if (!c) return;
      const id = c.dataset.p; const prev = STORE.get('product');
      if (prev === id) return;
      const apply = () => {
        STORE.set('product', id, true); root.querySelectorAll('.pcard').forEach(x => x.classList.toggle('sel', x.dataset.p === id));
        const pr = DATA.productById[id]; root.querySelector('#adsNext p').innerHTML = `선택한 제품 : <b>${pr.no}. ${esc(pr.name)}</b>`; root.querySelector('#adsNext button').disabled = false;
        STORE.toast(`「${pr.name}」을(를) 골랐습니다. 활동 1에서 광고지를 확인하세요.`);
      };
      if (prev) APP.confirm('제품을 바꾸면 활동 3~6의 일부 자동 값(판매 가격·비율 등)이 바뀝니다. 바꿀까요?', apply); else apply();
    });
  }

  // ── 활동 1 ──
  function vA1(root) {
    const prod = product();
    root.innerHTML = `
      ${adCard(prod)}
      <div class="q"><span class="num">1-1.</span>가상 상품 광고지 6종을 살펴보고, 내가 탐구할 제품 하나에 ✓ 표시해 봅시다.</div>
      <div class="card soft" id="pickBox"><p style="margin:0">${prod ? `<span class="badge ok">✓ 선택</span> <b>${circ(prod.no)} ${esc(prod.name)}</b> <span class="muted">(${esc(prod.full)} · ${esc(prod.slogan)} · ${esc(prod.priceLabel)})</span>` : '<span class="muted">아직 고르지 않았습니다. 위의 [광고지 보러 가기]를 누르세요.</span>'}</p></div>
      <div class="q"><span class="num">1-2.</span>이 제품을 고른 이유를 적어봅시다.</div>${ta('reason', 300, '')}
      <div class="q"><span class="num">1-3.</span>광고를 꼼꼼히 읽고 정리해 봅시다.</div>
      <div class="tbl-wrap"><table class="tbl resp"><tbody>
        <tr><td class="lab" style="width:28%">광고가 강조하는<br>나라·장소</td><td class="nolab">${ta('adPlace', 100, '', 2)}</td></tr>
        <tr><td class="lab">광고가 강조하는 장점</td><td class="nolab">${ta('adPros', 150, '', 2)}</td></tr>
        <tr><td class="lab">광고가 말하지 않는 것<br>(예상)</td><td class="nolab">${ta('adHidden', 200, '예 : 원료가 어디서 왔는지, 누가 만들었는지, 가격 중 원료 값은 얼마인지…', 3)}</td></tr>
      </tbody></table></div>`;
    bind(root, 'a1');
  }

  // ── 활동 2 ──
  function vA2(root) {
    const prod = product(); const st = S.a2;
    const price = prod ? prod.price : 0;
    const rowsHtml = () => st.predict.map((r, i) => `<tr><td data-l="원료 (예상)">${txt(`predict.${i}.material`, 30, '')}</td><td data-l="그렇게 생각한 이유">${txt(`predict.${i}.reason`, 60, '')}</td><td data-l="생산될 것 같은 나라">${txt(`predict.${i}.country`, 30, '')}</td><td data-l="예상 가격(원)">${numIn(`predict.${i}.price`, '원')}</td></tr>`).join('');
    root.innerHTML = `
      ${adCard(prod)}
      <div class="q"><span class="num">2-1.</span>라벨을 보기 전에, 제품을 만드는 데 필요한 원료와 그 가격을 예상해 봅시다.</div>
      <div class="hint">예상 가격 = 제품 1개를 만드는 데 드는 원료 값. 정답이 아니어도 괜찮으니 근거를 들어 예상하세요.</div>
      <div class="tbl-wrap"><table class="tbl resp" id="predTbl"><thead><tr><th>원료 (예상)</th><th>그렇게 생각한 이유</th><th>생산될 것 같은 나라</th><th>예상 가격(원)</th></tr></thead><tbody>${rowsHtml()}</tbody>
      <tfoot><tr><td colspan="3" class="right">합계 <span class="badge auto">자동</span></td><td data-l="합계">${auto('predSum', '0', '원')}</td></tr></tfoot></table></div>
      <div class="btnrow"><button class="btn ghost sm" id="addPred" ${st.predict.length >= 8 ? 'disabled' : ''}>줄 추가 (최대 8줄)</button></div>
      <div class="q"><span class="num">2-2.</span>판매 가격 중 원료값이 차지하는 비율을 예상해 봅시다.</div>
      <div class="grid3">
        <div><label class="f">판매 가격 <span class="badge auto">자동</span></label>${auto('a2price', prod ? won(price) : '제품 미선택', '원')}</div>
        <div><label class="f">예상 원료 값 <span class="badge auto">자동</span></label>${auto('a2raw', '0', '원')}</div>
        <div><label class="f">예상 비율 <span class="badge auto">자동</span></label>${auto('a2ratio', '0.0', '%')}</div>
      </div>
      <label class="f">그렇게 예상한 이유</label>${ta('ratioReason', 200, '', 3)}
      <div class="q"><span class="num">2-3.</span>부가가치 개념 알아보기 <span class="small muted">(아래 개념 자료를 읽고 풀어 보세요)</span></div>
      ${conceptCard()}
      <div class="card" style="margin-bottom:10px">
        <div class="row" style="justify-content:center;font-size:1.05rem"><span class="fixed"><b>부가가치 = (</b></span><span style="flex:1 1 120px;max-width:200px">${txt('concept.blank1', 20, '?')}</span><span class="fixed"><b>) − (</b></span><span style="flex:1 1 120px;max-width:200px">${txt('concept.blank2', 20, '?')}</span><span class="fixed"><b>)</b></span></div>
        <p class="small">자료의 빵 예시처럼, <b>커피 한 잔(4,400원)</b>이 만들어지기까지의 단계별 부가가치를 계산해 봅시다.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>단계</th><th>누가 무엇을</th><th>산 값</th><th>판 값</th><th>부가가치</th></tr></thead><tbody>
          ${DATA.COFFEE.rows.map((r, i) => `<tr><td class="lab">${r[0]}</td><td>${esc(r[1])}</td><td class="num">${won(r[2])}원</td><td class="num">${won(r[3])}원</td><td><div class="row" style="flex-wrap:nowrap"><input type="number" inputmode="numeric" data-b="concept.coffee.${i}" style="min-width:70px"><span class="fixed">원 <span class="mark" data-m="coffee.${i}"></span></span></div></td></tr>`).join('')}
          <tr><td colspan="4" class="right"><b>네 단계 부가가치의 합</b></td><td><div class="row" style="flex-wrap:nowrap"><input type="number" inputmode="numeric" data-b="concept.sum" style="min-width:70px"><span class="fixed">원 <span class="mark" data-m="sum"></span></span></div></td></tr>
        </tbody></table></div>
        <p style="margin-top:10px">→ 네 단계 부가가치의 합은 ( <b>A</b> )과 같다.<br>소비자 가격 4,400원 중 400원은 ( <b>B</b> )이다.</p>
        <div class="grid2">
          <div><label class="f">A에 들어갈 가격은? <span class="mark" data-m="s1"></span></label><div class="row" style="flex-wrap:nowrap">${txt('concept.s1', 30, '')}<span class="fixed">원</span></div></div>
          <div><label class="f">B에 들어갈 용어는? <span class="mark" data-m="s2"></span></label>${txt('concept.s2', 20, '')}</div>
        </div>
        <div class="btnrow"><button class="btn" id="chk23">확인</button>${resBtn('va', '부가가치 개념 자료 보기')}</div><div id="msg23"></div>
      </div>`;
    const after = () => {
      const sum = st.predict.reduce((a, r) => a + num(r.price), 0);
      root.querySelector('#predSum').value = won(sum); root.querySelector('#a2raw').value = won(sum);
      root.querySelector('#a2ratio').value = pct(sum, price);
    };
    bind(root, 'a2', after);
    root.querySelector('#addPred').addEventListener('click', () => { if (st.predict.length < 8) { st.predict.push(row('material', 'reason', 'country', 'price')); save('a2'); vA2(root); } });
    root.querySelector('#chk23').addEventListener('click', () => { const r = CHECK.concept(st.concept); st.concept.checked = true; save('a2');
      root.querySelectorAll('[data-m]').forEach(m => { const ok = r[m.dataset.m]; m.textContent = ok === true ? '○' : ok === false ? '다시 생각해 보기' : ''; m.className = 'mark ' + (ok ? 'ok' : 'no'); });
      root.querySelector('#msg23').innerHTML = r.all ? '<div class="check-msg ok">모두 맞았어요! 부가가치 = 판 값 − 산 값, 네 단계의 합(4,000원)은 세금 빼기 전 판매 가격과 같고, 400원은 부가가치세입니다.</div>' : '<div class="check-msg warn">표시된 칸을 다시 생각해 보세요. (부가가치 개념 자료 참고)</div>'; });
    if (st.concept.checked) root.querySelector('#chk23').click();
  }

  // ── 활동 3 ──
  function vA3(root) {
    const prod = product(); const st = S.a3; const price = prod ? prod.price : 0;
    const mats = prod ? prod.raw.map(r => r.material) : [];
    const rowsHtml = () => st.compare.map((r, i) => `<tr><td data-l="실제 원료 (라벨)"><input type="text" data-b="compare.${i}.material" list="matList" maxlength="30" placeholder="원료 이름"></td><td data-l="예상했나요? (○ / ×)">${ox(`compare.${i}.predicted`)}</td><td data-l="라벨 표시 산지">${txt(`compare.${i}.origin`, 30, '')}</td><td data-l="수출용 도매 가격">${txt(`compare.${i}.price`, 30, '예 : 7.24 USD/kg')}</td><td data-l="제품 1단위 원료 비용(원)">${numIn(`compare.${i}.cost`, '원')}</td></tr>`).join('');
    root.innerHTML = `
      ${prod ? `<div class="card labelcard"><div class="row" style="align-items:center"><h3 style="flex:1 1 200px;margin:0">내가 고른 제품의 라벨 : ${prod.no}. ${esc(prod.name)} <span class="badge auto">자동</span></h3><div class="btnrow fixed" style="margin:0"><button class="btn sm" id="labelZoom">확대하기</button><a class="btn sm ghost" href="assets/pdf/label${prod.no}.pdf" target="_blank" rel="noopener">PDF 원본</a></div></div>
        <img class="labelimg" src="assets/labels/label${prod.no}.png" alt="${esc(prod.name)} 라벨">
        <p class="small muted" style="margin:6px 0 0">글씨가 작으면 [확대하기]를 누르세요. 새 탭에서 크게 열립니다.</p></div>`
        : `<div class="card warn">광고지 화면에서 제품을 고르면 그 제품의 라벨이 여기에 자동으로 나타납니다.</div>`}
      <div class="q"><span class="num">3-1.</span>제품 라벨에서 다음 정보를 찾아 적어봅시다.</div>
      <div class="tbl-wrap"><table class="tbl resp"><tbody>
        <tr><td class="lab" style="width:28%">제조국 (원산지)</td><td class="nolab">${txt('origin', 60, '')}</td></tr>
        <tr><td class="lab">제조자 (공장 위치)</td><td class="nolab">${txt('maker', 80, '')}</td></tr>
        <tr><td class="lab">브랜드 본사 · 판매원 (위치)</td><td class="nolab">${txt('hq', 100, '')}</td></tr>
        <tr><td class="lab">라벨에 적힌<br>주요 원료와 산지</td><td class="nolab">${ta('rawList', 300, '예 : 시어버터(부르키나파소), 밀납(중국) …', 3)}</td></tr>
      </tbody></table></div>
      <div class="q"><span class="num">3-2.</span>예상한 원료와 라벨의 실제 원료를 비교해 봅시다. <span class="small muted">(자료의 원료 가격 참고)</span></div>
      <div class="btnrow"><button class="btn sec sm" id="openPrices">원료 가격 자료 보기 (새 탭)</button></div>
      <datalist id="matList">${mats.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
      <div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>실제 원료 (라벨)</th><th>예상했나요?<br>(○ / ×)</th><th>라벨 표시 산지</th><th>수출용 도매 가격</th><th>제품 1단위 원료 비용</th></tr></thead><tbody>${rowsHtml()}</tbody>
      <tfoot><tr><td colspan="4" class="right">원료 비용 합계 <span class="badge auto">자동</span></td><td data-l="원료 비용 합계">${auto('cmpSum', '0', '원')}</td></tr></tfoot></table></div>
      <div class="btnrow"><button class="btn ghost sm" id="addCmp" ${st.compare.length >= 12 ? 'disabled' : ''}>줄 추가 (최대 12줄)</button><button class="btn sec sm" id="chk32">확인</button></div><div id="msg32"></div>
      <div class="card soft"><b>실제 원료 비율</b> : 원료 비용 합계 <b id="r1">0</b>원 ÷ 판매 가격 <b id="r2">${prod ? won(price) : '?'}</b>원 × 100 = 약 <b id="r3">0.0</b>% <span class="badge auto">자동</span></div>
      <div class="q"><span class="num">3-3.</span>예상과 실제의 차이점을 정리해 봅시다. <span class="small muted">(원료의 종류, 생산지, 가격, 비율)</span></div>
      <div class="chip-list" style="margin-bottom:8px"><span class="chip">예상 비율 (2-2) : <b id="prevRatio">0.0</b>%</span><span class="chip">실제 비율 (3-2) : <b id="realRatio">0.0</b>%</span></div>
      ${ta('diff', 400, '', 5)}`;
    const after = () => {
      const sum = st.compare.reduce((a, r) => a + num(r.cost), 0);
      root.querySelector('#cmpSum').value = won(sum); root.querySelector('#r1').textContent = won(sum); root.querySelector('#r3').textContent = pct(sum, price); root.querySelector('#realRatio').textContent = pct(sum, price);
      root.querySelector('#prevRatio').textContent = pct(S.a2.predict.reduce((a, r) => a + num(r.price), 0), price);
    };
    bind(root, 'a3', after);
    const lz = root.querySelector('#labelZoom'); if (lz) lz.addEventListener('click', () => RES.openTab(`assets/labels/label${prod.no}.png`, `라벨 ${prod.no} · ${prod.name}`, `assets/pdf/label${prod.no}.pdf`));
    root.querySelector('#openPrices').addEventListener('click', () => RES.openResTab('prices'));
    root.querySelector('#addCmp').addEventListener('click', () => { if (st.compare.length < 12) { st.compare.push(row('material', 'predicted', 'origin', 'price', 'cost')); save('a3'); vA3(root); } });
    root.querySelector('#chk32').addEventListener('click', () => {
      if (!prod) { STORE.toast('먼저 제품을 골라 주세요.'); return; }
      const sum = st.compare.reduce((a, r) => a + num(r.cost), 0);
      const ok = Math.abs(sum - prod.rawSum) <= prod.rawSum * 0.1;
      root.querySelector('#msg32').innerHTML = ok ? '<div class="check-msg ok">잘 찾았어요! 자료의 원료 비용 합계와 거의 같습니다.</div>' : `<div class="check-msg warn">빠진 원료가 있는지 확인해 보세요. (자료의 합계는 약 ${won(prod.rawSum)}원, 원유 줄은 제외)</div>`;
    });
  }

  // ── 활동 4 ──
  function vA4(root) {
    const prod = product(); const st = S.a4; const price = prod ? prod.price : 0;
    const R = [['raw', '원료'], ['make', '제조'], ['dist', '유통'], ['sale', '판매']];
    root.innerHTML = `
      <div class="card soft" style="margin-bottom:14px"><div class="row" style="align-items:center"><p style="flex:1 1 220px;margin:0">상품 사슬표를 쓰면서 <b>지도 탭</b>에서 상품 사슬 지도를 함께 만듭니다. 지도를 만든 뒤 활동 5로 이어집니다.</p><div class="btnrow fixed" style="margin:0"><button class="btn" data-res="map">지도 만들러 가기</button></div></div></div>
      <div class="q"><span class="num">4-1.</span>브랜드 본사 위치 <span class="small muted">(나라 / 도시)</span></div>${txt('hq', 60, '예 : 프랑스 / 파리')}
      <div class="q"><span class="num">4-2.</span>단계별로 장소, 하는 일, 부가가치, 이동 경로를 정리해 봅시다.</div>
      ${vaCard(prod)}
      <div class="hint">장소 : 원료는 주요 원료 생산지, 제조는 제조국·공장 위치, 유통·판매는 회사·매장 위치를 적으세요. 부가가치(원)는 위 「내가 고른 제품의 부가가치 자료」 표의 값을 옮겨 적습니다.</div>
      <div class="btnrow">${resBtn('va', '부가가치 자료 보기')}<button class="btn sec sm" id="fromMap">지도에서 장소 불러오기</button></div>
      <div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>단계</th><th>장소<br>(나라 / 지역)</th><th>누가 · 하는 일</th><th>부가가치<br>(원)</th><th>비율<br>(%)</th><th>이동 경로<br>(다음 단계로 가는 곳 · 운송 수단)</th></tr></thead><tbody>
        ${R.map(([k, n]) => `<tr><td class="lab">${n}</td><td data-l="장소 (나라 / 지역)">${ta(`rows.${k}.place`, 80, '', 2)}</td><td data-l="누가 · 하는 일">${ta(`rows.${k}.who`, 100, '', 2)}</td><td data-l="부가가치(원)">${numIn(`rows.${k}.va`, '원')}</td><td data-l="비율(%) · 자동">${auto('pct_' + k, '0.0', '%')}</td><td data-l="이동 경로">${k === 'sale' ? '<div class="small muted">소비자 :</div>' : ''}${ta(`rows.${k}.route`, 100, k === 'sale' ? '예 : 서울의 학생 (매장에서 구입)' : '예 : 프랑스 리옹 공장으로 · 선박', 2)}</td></tr>`).join('')}
        <tr><td class="lab">부가가치세</td><td data-l="장소"><span class="auto-cell" style="display:block;padding:8px">정부</span></td><td data-l="누가 · 하는 일"><span class="auto-cell" style="display:block;padding:8px">—</span></td><td data-l="부가가치(원)">${numIn('rows.tax.va', '원')}</td><td data-l="비율(%) · 자동">${auto('pct_tax', '0.0', '%')}</td><td data-l="이동 경로"><span class="auto-cell" style="display:block;padding:8px">—</span></td></tr>
      </tbody><tfoot><tr><td colspan="3" class="right">합계 <span class="badge auto">자동</span></td><td data-l="부가가치 합계">${auto('vaSum', '0', '원')}</td><td data-l="비율">100%</td><td data-l="소비자 가격">소비자 가격 <b id="consPrice">${prod ? won(price) : '?'}</b>원</td></tr></tfoot></table></div>
      <div class="btnrow"><button class="btn sec sm" id="chk42">확인</button></div><div id="msg42"></div>
      <div class="q"><span class="num">4-3.</span>상품 사슬표를 보고 알게 된 점을 적어봅시다.</div>${ta('insight', 300, '', 4)}`;
    const after = () => {
      let sum = 0;
      [...R.map(r => r[0]), 'tax'].forEach(k => { const v = num(st.rows[k].va); sum += v; root.querySelector('#pct_' + k).value = pct(v, price); });
      root.querySelector('#vaSum').value = won(sum);
    };
    bind(root, 'a4', after);
    root.querySelector('#chk42').addEventListener('click', () => {
      if (!prod) { STORE.toast('먼저 제품을 골라 주세요.'); return; }
      const sum = [...R.map(r => r[0]), 'tax'].reduce((a, k) => a + num(st.rows[k].va), 0);
      const d = sum - price;
      root.querySelector('#msg42').innerHTML = d === 0 ? '<div class="check-msg ok">합계가 소비자 가격과 같아요!</div>' : `<div class="check-msg warn">합계(${won(sum)}원)가 소비자 가격(${won(price)}원)과 ${won(Math.abs(d))}원 ${d > 0 ? '많아요' : '적어요'}. 부가가치세를 포함했는지, 단계별 값을 다시 확인해 보세요.</div>`;
    });
    root.querySelector('#fromMap').addEventListener('click', () => {
      const pl = MAP.getPlaces(); if (!pl.length) { STORE.toast('지도에 장소가 없습니다. 지도 탭에서 먼저 만들어 주세요.'); return; }
      const byRole = r => pl.filter(p => p.role === r).map(p => p.country ? `${p.name.replace(/\(.*?\)/g, '').trim()} (${p.country})` : p.name).filter((v, i, a) => a.indexOf(v) === i).join(', ');
      const m = { raw: byRole('raw'), make: byRole('factory'), dist: byRole('dist') || byRole('hq'), sale: byRole('sale') };
      Object.entries(m).forEach(([k, v]) => { if (v) { st.rows[k].place = v; const el = root.querySelector(`[data-b="rows.${k}.place"]`); el.value = v; updCnt(root, `rows.${k}.place`, el); } });
      save('a4'); STORE.toast('지도의 장소를 불러왔습니다.');
    });
  }

  // ── 활동 5 ──
  function vA5(root) {
    const st = S.a5;
    const places = MAP.getPlaces(), legs = MAP.getLegsForWorksheet(), img = STORE.get('map:image');
    const tot = legs.reduce((a, l) => ({ land: a.land + (l.land || 0), sea: a.sea + (l.sea || 0) }), { land: 0, sea: 0 });
    root.innerHTML = `
      <div class="q"><span class="num">5-1.</span>앱에서 완성한 지도의 이동 거리를 정리하고, 지도 PDF를 함께 제출합니다.</div>
      <div class="btnrow"><button class="btn sec sm" id="reloadMap">다시 불러오기</button>${resBtn('map', '지도 만들러 가기')}<button class="btn ghost sm" id="toggleManual">${st.manual ? '지도 앱 데이터 사용' : '직접 입력으로 전환'}</button><button class="btn ghost sm" id="mapPdf2">지도 PDF 저장</button></div>
      <div id="legArea"></div>
      <div class="q"><span class="num">5-2.</span>지도를 완성하고 알게 된 점을 적어봅시다. <span class="small muted">(가장 먼 구간, 바닷길이 지나는 곳 등)</span></div>${ta('insight', 400, '', 5)}`;
    const area = root.querySelector('#legArea');
    if (!st.manual) {
      area.innerHTML = legs.length ? `
        <div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>구간 (출발 → 도착)</th><th>이동 방법</th><th>육상 (km)</th><th>해상 (km)</th><th>이동 거리 (km)</th></tr></thead><tbody>
        ${legs.map(l => `<tr><td data-l="구간">${esc(l.fromName)} → ${esc(l.toName)}${l.via && l.via.length ? `<div class="small muted">경유 항구 : ${esc(l.via.join(', '))}</div>` : ''}</td><td data-l="이동 방법"><span class="badge ${l.mode === 'ship' ? 'sea' : 'land'}">${esc(l.modeLabel)}</span></td><td data-l="육상" class="num">${won(l.land)}</td><td data-l="해상" class="num">${won(l.sea)}</td><td data-l="이동 거리" class="num"><b>${won(l.total)}</b></td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="2" class="right">전체 이동 거리 <span class="badge auto">자동</span></td><td data-l="육상 합계" class="num">${won(tot.land)}</td><td data-l="해상 합계" class="num">${won(tot.sea)}</td><td data-l="전체" class="num"><b>${won(tot.land + tot.sea)}</b> km</td></tr></tfoot></table></div>
        <p class="small muted">도로 = 직선거리 × 1.3(평균 우회율), 선박 = 주요 항로(운하·해협 경유) 기준의 평균 추정값.</p>
        ${img ? `<img class="mapimg" src="${img}" alt="상품 사슬 지도 미리보기">` : '<div class="card warn">지도 이미지가 아직 없습니다. 지도 탭에서 장소를 추가하면 자동으로 만들어집니다.</div>'}`
        : `<div class="card warn"><b>지도 데이터가 없습니다.</b> 지도 탭에서 지도를 먼저 만들어 주세요. 지도 탭을 쓸 수 없으면 [직접 입력으로 전환]을 누르세요.</div>`;
    } else {
      area.innerHTML = `<div class="tbl-wrap"><table class="tbl resp"><thead><tr><th>구간 (출발 → 도착)</th><th>이동 방법</th><th>이동 거리 (km)</th></tr></thead><tbody>
        ${st.manualLegs.map((r, i) => `<tr><td data-l="구간"><div class="row" style="flex-wrap:nowrap">${txt(`manualLegs.${i}.from`, 30, '출발')}<span class="fixed">→</span>${txt(`manualLegs.${i}.to`, 30, '도착')}</div></td><td data-l="이동 방법">${sel(`manualLegs.${i}.mode`, ['도로', '선박', '도로+선박+도로'])}</td><td data-l="이동 거리(km)">${numIn(`manualLegs.${i}.km`, 'km')}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="2" class="right">전체 이동 거리 <span class="badge auto">자동</span></td><td data-l="전체">${auto('manualSum', '0', 'km')}</td></tr></tfoot></table></div>
        <div class="btnrow"><button class="btn ghost sm" id="addManual" ${st.manualLegs.length >= 8 ? 'disabled' : ''}>줄 추가 (최대 8줄)</button></div>
        <label class="f">지도 사진 첨부 (이미지 1장, 이 기기에만 저장)</label><input type="file" id="manualImg" accept="image/*">
        ${st.manualImage ? `<img class="mapimg" src="${st.manualImage}" alt="첨부한 지도"><div class="btnrow"><button class="btn danger sm" id="delManualImg">사진 지우기</button></div>` : ''}`;
      root.querySelector('#addManual').addEventListener('click', () => { if (st.manualLegs.length < 8) { st.manualLegs.push(row('from', 'to', 'mode', 'km')); save('a5'); vA5(root); } });
      root.querySelector('#manualImg').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; APP.resizeImage(f, 1400).then(url => { st.manualImage = url; save('a5'); vA5(root); }).catch(() => STORE.toast('사진을 읽지 못했습니다.')); });
      const d = root.querySelector('#delManualImg'); if (d) d.addEventListener('click', () => { st.manualImage = null; save('a5'); vA5(root); });
    }
    const after = () => { const el = root.querySelector('#manualSum'); if (el) el.value = won(st.manualLegs.reduce((a, r) => a + num(r.km), 0)); };
    bind(root, 'a5', after);
    root.querySelector('#reloadMap').addEventListener('click', async () => { await APP.reloadMapData(); vA5(root); STORE.toast('지도 데이터를 다시 불러왔습니다.'); });
    root.querySelector('#toggleManual').addEventListener('click', () => { st.manual = !st.manual; save('a5'); vA5(root); });
    root.querySelector('#mapPdf2').addEventListener('click', () => PDF.saveMapPdf());
  }

  // ── 활동 6 ──
  function vA6(root) {
    const prod = product(); const st = S.a6; const price = prod ? prod.price : 0; const a4 = S.a4;
    root.innerHTML = `
      <details class="collapse"><summary>활동 4의 상품 사슬표 (참고)</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>단계</th><th>장소</th><th>부가가치</th><th>비율</th></tr></thead><tbody>
        ${[['raw', '원료'], ['make', '제조'], ['dist', '유통'], ['sale', '판매'], ['tax', '부가가치세']].map(([k, n]) => `<tr><td class="lab">${n}</td><td>${esc(k === 'tax' ? '정부' : a4.rows[k].place)}</td><td class="num">${won(num(a4.rows[k].va))}원</td><td class="num">${pct(num(a4.rows[k].va), price)}%</td></tr>`).join('')}
      </tbody></table></div></details>
      <details class="collapse"><summary>내가 고른 제품의 부가가치 자료 (참고)</summary>${vaCard(prod)}</details>
      <div class="q"><span class="num">6-1.</span>부가가치가 가장 높게 만들어지는 단계와 장소를 찾아봅시다.</div>
      <div class="grid2">
        <div><label class="f">단계</label>${sel('topStage', STAGES)}</div>
        <div><label class="f">장소 (나라 · 도시)</label>${txt('topPlace', 60, '')}</div>
        <div><label class="f">부가가치 (원)</label>${numIn('topVa', '원')}</div>
        <div><label class="f">소비자 가격 중 비율 <span class="badge auto">자동</span></label>${auto('topPct', '0.0', '%')}</div>
      </div>
      <label class="f">그 단계에서 부가가치가 큰 까닭은 무엇일까요? (기술, 디자인, 브랜드, 임금, 임대료 등)</label>${ta('topReason', 300, '', 4)}
      <div class="q"><span class="num">6-2.</span>내가 생각하는 상품 사슬에서 가장 중요한 단계와 그 이유를 적어봅시다.</div>
      <div class="hint">부가가치의 크기 말고도 노동, 환경, 기술, 소비자 안전 등 다른 기준으로 판단해도 좋습니다.</div>
      <div class="grid2"><div><label class="f">가장 중요한 단계</label>${sel('impStage', STAGES)}</div><div><label class="f">판단 기준</label>${txt('criterion', 100, '예 : 노동자의 안전, 환경 영향 …')}</div></div>
      <label class="f">이유</label>${ta('impReason', 300, '', 4)}
      <div class="q"><span class="num">6-3.</span>원료를 생산한 나라에 돌아간 몫과 가장 큰 부가가치를 가져간 곳의 몫을 비교해 봅시다.</div>
      <div class="tbl-wrap"><table class="tbl resp"><tbody>
        <tr><td class="lab" style="width:30%">원료 생산지의 몫</td><td class="nolab"><div class="row"><div>${numIn('rawShareWon', '원')}</div><div class="fixed">원 ·</div><div>${auto('rawSharePct', '0.0', '%')}</div></div></td></tr>
        <tr><td class="lab">가장 큰 몫</td><td class="nolab"><div class="row"><div>${numIn('topShareWon', '원')}</div><div class="fixed">원 ·</div><div>${auto('topSharePct', '0.0', '%')}</div></div></td></tr>
      </tbody></table></div>`;
    const after = () => { root.querySelector('#topPct').value = pct(num(st.topVa), price); root.querySelector('#rawSharePct').value = pct(num(st.rawShareWon), price); root.querySelector('#topSharePct').value = pct(num(st.topShareWon), price); };
    bind(root, 'a6', after);
  }

  // ── 활동 7 ──
  function vA7(root) {
    root.innerHTML = `
      <div class="hint">경제(부가가치 분배), 노동·인권, 환경, 정보·광고 등 여러 관점에서 생각해 보고, 활동 3~6에서 찾은 수치를 근거로 적으면 좋습니다.</div>
      <div class="q"><span class="num">7-1.</span>상품 사슬의 장점</div>${ta('pros', 400, '예 : 여러 나라가 각자 잘하는 일을 나누어 맡아 싸고 다양한 상품을 살 수 있다 …', 5)}
      <div class="q"><span class="num">7-2.</span>상품 사슬의 문제점 또는 단점</div>${ta('cons', 500, '예 : 원료 생산지의 몫이 0.6%에 불과하다, 먼 거리를 운송해 탄소 배출이 많다 …', 6)}
      <div class="q"><span class="num">7-3.</span>문제점 해결 방안</div>${ta('solution', 500, '', 6)}`;
    bind(root, 'a7');
  }

  // ── 활동 8 ──
  function vA8(root) {
    root.innerHTML = `
      <div class="q"><span class="num">8-1.</span>책임있는 소비 방법 알아보기</div>
      <div class="hint">참고 : 공정무역 인증 확인, 원산지·성분 표시 읽기, 오래 쓰기·고쳐 쓰기, 중고 거래, 분리배출, 꼭 필요한 만큼 사기 등</div>
      ${ta('method', 600, '', 7)}
      <div class="q"><span class="num">8-2.</span>소비자 한 사람의 실천만으로 부족한 점은 무엇일까요? 기업과 정부·국제사회가 할 일도 적어봅시다.</div>
      <div class="tbl-wrap"><table class="tbl resp"><tbody>
        <tr><td class="lab" style="width:25%">기업</td><td class="nolab">${ta('company', 200, '', 3)}</td></tr>
        <tr><td class="lab">정부 · 국제사회</td><td class="nolab">${ta('gov', 200, '', 3)}</td></tr>
      </tbody></table></div>
      <div class="q"><span class="num">8-3.</span>이번 프로젝트를 마치며 ‘나의 소비 다짐’을 한 문장으로 적어봅시다.</div>${txt('pledge', 100, '나는 …')}`;
    bind(root, 'a8');
  }

  // ── 평가지 ──
  function vEval(root) {
    const s = student();
    root.innerHTML = `
      <div class="card soft"><b>평가자</b> : 세계시민과 지리 ${esc(s.classNo || '( )')}반 ${esc(s.number || '( )')}번 이름 ${esc(s.name || '(        )')} <span class="badge auto">자동</span></div>
      <div class="q"><span class="num">1.</span>자기 성찰</div>
      <label class="f">광고만 보았을 때와 상품 사슬을 따라간 뒤, 이 제품을 보는 나의 생각은 어떻게 달라졌나요?</label>${ta('reflection', 400, '', 5)}`;
    bind(root, 'eval');
  }

  // ── 점검 ──
  function emptyCounts() {
    const s = student(); const prod = product();
    const items = [];
    const chk = (step, label, ok, focus) => items.push({ step, label, ok: !!ok, focus });
    chk('start', '반·번호·이름', s.classNo && s.number && s.name, '#stClass');
    chk('ads', '제품 고르기 (1-1)', prod, '.products');
    chk('a1', '1-2 고른 이유', S.a1.reason, '[data-b="reason"]');
    chk('a1', '1-3 강조하는 나라·장소', S.a1.adPlace, '[data-b="adPlace"]');
    chk('a1', '1-3 강조하는 장점', S.a1.adPros, '[data-b="adPros"]');
    chk('a1', '1-3 말하지 않는 것', S.a1.adHidden, '[data-b="adHidden"]');
    chk('a2', '2-1 원료 예상 (3줄 이상)', S.a2.predict.filter(r => r.material).length >= 3, '#predTbl');
    chk('a2', '2-2 예상한 이유', S.a2.ratioReason, '[data-b="ratioReason"]');
    chk('a2', '2-3 부가가치 개념 (빈칸 모두)', S.a2.concept.blank1 && S.a2.concept.blank2 && S.a2.concept.coffee.every(v => v !== '') && S.a2.concept.sum !== '' && S.a2.concept.s1 && S.a2.concept.s2, '[data-b="concept.blank1"]');
    chk('a3', '3-1 라벨 정보 4칸', S.a3.origin && S.a3.maker && S.a3.hq && S.a3.rawList, '[data-b="origin"]');
    chk('a3', '3-2 실제 원료 (3줄 이상)', S.a3.compare.filter(r => r.material).length >= 3, '[data-b="compare.0.material"]');
    chk('a3', '3-3 차이점', S.a3.diff, '[data-b="diff"]');
    chk('a4', '4-1 브랜드 본사 위치', S.a4.hq, '[data-b="hq"]');
    chk('a4', '4-2 사슬표 (장소·하는 일·부가가치)', ['raw', 'make', 'dist', 'sale'].every(k => S.a4.rows[k].place && S.a4.rows[k].who && S.a4.rows[k].va !== '') && S.a4.rows.tax.va !== '', '[data-b="rows.raw.place"]');
    chk('a4', '4-3 알게 된 점', S.a4.insight, '[data-b="insight"]');
    chk('a5', '5-1 지도 데이터 (구간·이미지)', S.a5.manual ? S.a5.manualLegs.some(r => r.from && r.km) : (MAP.getLegsForWorksheet().length > 0 && STORE.get('map:image')), '#legArea');
    chk('a5', '5-2 알게 된 점', S.a5.insight, '[data-b="insight"]');
    chk('a6', '6-1 단계·장소·부가가치·까닭', S.a6.topStage && S.a6.topPlace && S.a6.topVa !== '' && S.a6.topReason, '[data-b="topStage"]');
    chk('a6', '6-2 가장 중요한 단계·기준·이유', S.a6.impStage && S.a6.criterion && S.a6.impReason, '[data-b="impStage"]');
    chk('a6', '6-3 몫 비교', S.a6.rawShareWon !== '' && S.a6.topShareWon !== '', '[data-b="rawShareWon"]');
    chk('a7', '7-1 상품 사슬의 장점', S.a7.pros, '[data-b="pros"]');
    chk('a7', '7-2 문제점 또는 단점', S.a7.cons, '[data-b="cons"]');
    chk('a7', '7-3 해결 방안', S.a7.solution, '[data-b="solution"]');
    chk('a8', '8-1 책임 있는 소비 방법', S.a8.method, '[data-b="method"]');
    chk('a8', '8-2 기업 · 정부·국제사회', S.a8.company && S.a8.gov, '[data-b="company"]');
    chk('a8', '8-3 나의 소비 다짐', S.a8.pledge, '[data-b="pledge"]');
    chk('eval', '자기 성찰', S.eval.reflection, '[data-b="reflection"]');
    return items;
  }
  function isDone(step) { if (step === 'review') return false; const it = emptyCounts().filter(i => i.step === step); return it.length > 0 && it.every(i => i.ok); }

  function vReview(root) {
    const items = emptyCounts(); const missing = items.filter(i => !i.ok);
    const byStep = {}; missing.forEach(i => { (byStep[i.step] = byStep[i.step] || []).push(i); });
    const hasMap = !!STORE.get('map:image') || !!S.a5.manualImage;
    root.innerHTML = `
      <div class="card ${missing.length ? 'warn' : 'ok'}"><b>${missing.length ? `빈칸이 ${missing.length}개 있습니다.` : '모든 칸을 채웠습니다!'}</b> 항목을 누르면 그 칸으로 이동합니다. 점검 결과와 상관없이 PDF를 저장할 수 있습니다.</div>
      ${!hasMap ? '<div class="card err"><b>지도 PDF가 아직 없습니다.</b> 지도 탭에서 지도를 만들면 활동 5와 PDF에 지도 이미지가 들어갑니다.</div>' : ''}
      <div class="card">${STEPS.filter(s => s.id !== 'review').map(s => { const m = byStep[s.id] || []; return `<div class="review-item" data-go="${s.id}"><span>${esc(s.title)}</span><span class="badge ${m.length ? 'warn' : 'ok'}">${m.length ? `빈칸 ${m.length}` : '완료'}</span></div>${m.map(i => `<div class="review-item small" data-go="${s.id}" data-focus="${esc(i.focus)}" style="padding-left:20px">· ${esc(i.label)}<span class="muted">이동 ›</span></div>`).join('')}`; }).join('')}</div>
      <div class="card">
        <h3>PDF 저장</h3>
        <p class="small">파일 이름 : <b>${esc(PDF.fileName())}</b> · A4 세로, 종이 활동지와 같은 순서·문항 번호. 안드로이드 크롬은 다운로드 폴더에 저장되고, 아이폰 사파리는 새 탭으로 열리면 ‘공유 → 파일에 저장’을 누르세요.</p>
        <label class="f"><input type="checkbox" id="withMap" checked> 지도 PDF(2쪽)를 뒤에 합쳐 저장</label>
        <div class="btnrow"><button class="btn" id="btnPdf">활동지 PDF 저장</button><button class="btn sec" id="btnMapPdfOnly">지도 PDF만 저장</button><button class="btn ghost" id="btnBackup2">백업 파일 내보내기</button></div>
        <div id="pdfProgress" class="small muted"></div>
      </div>`;
    root.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => { APP.go('#ws/' + el.dataset.go); const f = el.dataset.focus; if (f) setTimeout(() => { const t = document.querySelector(f); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (t.focus) t.focus({ preventScroll: true }); } }, 150); }));
    root.querySelector('#btnPdf').addEventListener('click', () => PDF.saveWorksheet({ withMap: root.querySelector('#withMap').checked, progress: m => { root.querySelector('#pdfProgress').textContent = m; } }));
    root.querySelector('#btnMapPdfOnly').addEventListener('click', () => PDF.saveMapPdf());
    root.querySelector('#btnBackup2').addEventListener('click', APP.exportBackup);
  }

  return { STEPS, STAGES, VIEWS, S, loadState, render, stepIndex, emptyCounts, student, product, num, won, pct };
})();

/* [확인] 판정 */
window.CHECK = (function () {
  const norm = s => String(s ?? '').replace(/\s|[()\[\]'"’‘“”.,·]/g, '').toLowerCase();
  function sellWord(s) { s = norm(s); return s.length > 0 && /판|팔|매출|수입/.test(s) && !/산|구입|구매|매입|사온/.test(s); }
  function buyWord(s) { s = norm(s); return s.length > 0 && /산|사온|구입|구매|매입|산값|들인/.test(s); }
  function concept(c) {
    const r = {};
    r.blank1 = sellWord(c.blank1);
    r.blank2 = buyWord(c.blank2);
    DATA.COFFEE.answers.forEach((a, i) => { r['coffee.' + i] = Number(c.coffee[i]) === a; });
    r.sum = Number(c.sum) === DATA.COFFEE.sum;
    // A : 세금 빼기 전 판매 가격 4,000원 — 숫자(4000)나 ‘판매 가격’이라는 말 둘 다 인정
    const s1 = norm(c.s1); const s1n = Number(String(c.s1 ?? '').replace(/[^\d.]/g, ''));
    r.s1 = s1n === DATA.COFFEE.sum || (s1.length > 0 && /판매|판값|팔/.test(s1) && /가격|금액|값|액/.test(s1));
    const s2 = norm(c.s2);
    r.s2 = s2.length > 0 && /세/.test(s2);
    r.all = Object.values(r).every(v => v === true);
    return r;
  }
  return { concept };
})();
