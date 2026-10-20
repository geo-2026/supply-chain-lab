/* 상품 사슬 지도 — 캔버스 세계지도, 장소·구간 편집, 육상/해상 거리, 이미지 내보내기 */
'use strict';
window.MAP = (function () {
  const CENTER_LNG = 150;           // 태평양 중심 (활동지 지도와 같은 배치)
  const LAT_MIN = -60, LAT_MAX = 84;
  const WORLD_H = LAT_MAX - LAT_MIN; // 144
  let world = null;                  // [{rings:[[x,y]...]} ...] 월드 좌표(x: -180..180, y: lat)
  let canvas, ctx, wrap, dpr = 1;
  let view = { z: 1, cx: 0, cy: 12 };
  let places = [], legs = [];
  let selectedPlace = null, addMode = false;
  let exportTimer = null;
  let onChange = null;
  let uid = () => Math.random().toString(36).slice(2, 9);

  const toX = lng => ((lng - CENTER_LNG + 540) % 360) - 180;

  async function loadWorld() {
    if (world) return world;
    const res = await fetch('assets/world.json');
    const j = await res.json();
    world = j.polys.map(poly => poly.map(ring => {
      // 연속 좌표로 풀기 (경계선을 넘는 다각형 처리)
      const out = []; let prev = null;
      for (const [lng, lat] of ring) {
        let x = toX(lng);
        if (prev !== null) { while (x - prev > 180) x -= 360; while (x - prev < -180) x += 360; }
        out.push([x, Math.max(LAT_MIN - 5, Math.min(LAT_MAX + 5, lat))]);
        prev = x;
      }
      return out;
    }));
    return world;
  }

  // ───────── 좌표 변환 ─────────
  function geom(W, H, v) {
    const base = W / 360 * v.z;
    return {
      px: (x, y) => [(x - v.cx) * base + W / 2, (v.cy - y) * base + H / 2],
      inv: (px, py) => [(px - W / 2) / base + v.cx, v.cy - (py - H / 2) / base],
      base
    };
  }

  function clampView(v, W, H) {
    v.z = Math.max(1, Math.min(8, v.z));
    const base = W / 360 * v.z;
    const halfH = H / 2 / base;
    v.cy = Math.max(LAT_MIN + halfH, Math.min(LAT_MAX - halfH, v.cy));
    const halfW = W / 2 / base;
    if (v.z <= 1) v.cx = 0; else v.cx = Math.max(-180 + halfW, Math.min(180 - halfW, v.cx));
    return v;
  }

  // ───────── 그리기 ─────────
  function drawMap(c, W, H, v, opts) {
    const g = geom(W, H, v);
    const cx = c.getContext('2d');
    cx.save();
    cx.clearRect(0, 0, W, H);
    cx.fillStyle = '#cfe2f3'; cx.fillRect(0, 0, W, H);
    // 위도·경도 눈금
    cx.strokeStyle = 'rgba(80,110,150,.25)'; cx.lineWidth = 1;
    for (let lat = -60; lat <= 80; lat += 20) { const [, y] = g.px(0, lat); cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    for (let lng = -180; lng < 180; lng += 30) { const x = toX(lng); const [px] = g.px(x, 0); cx.beginPath(); cx.moveTo(px, 0); cx.lineTo(px, H); cx.stroke(); }
    // 적도
    { const [, y] = g.px(0, 0); cx.strokeStyle = 'rgba(80,110,150,.5)'; cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    // 육지
    cx.fillStyle = '#f3efe4'; cx.strokeStyle = '#9aa5b1'; cx.lineWidth = Math.max(0.6, 0.8 * (opts.scale || 1));
    const visL = v.cx - W / 2 / g.base, visR = v.cx + W / 2 / g.base;
    for (const poly of world) {
      for (const off of [0, 360, -360]) {
        // bbox 검사
        let minx = Infinity, maxx = -Infinity;
        for (const [x] of poly[0]) { if (x < minx) minx = x; if (x > maxx) maxx = x; }
        if (maxx + off < visL - 2 || minx + off > visR + 2) continue;
        cx.beginPath();
        for (const ring of poly) {
          ring.forEach(([x, y], i) => { const [px, py] = g.px(x + off, y); if (i === 0) cx.moveTo(px, py); else cx.lineTo(px, py); });
          cx.closePath();
        }
        cx.fill('evenodd'); cx.stroke();
      }
    }
    // 구간 : 해상(파란 실선)을 먼저, 육상(주황 점선)을 위에 그림
    const sc = opts.scale || 1;
    const segs = [];
    for (const leg of legs) { if (leg.computed) leg.computed.segments.forEach(seg => segs.push({ leg, seg })); }
    for (const pass of ['sea', 'land']) {
      for (const { seg } of segs) {
        if (seg.type !== pass) continue;
        const pts = unwrap(seg.pts.map(([lat, lng]) => [toX(lng), lat]));
        if (pass === 'sea') { cx.lineWidth = 2.6 * sc; cx.strokeStyle = '#2563eb'; cx.setLineDash([]); drawPolyline(cx, g, pts, visL, visR); }
        else {
          cx.setLineDash([]); cx.lineWidth = 5 * sc; cx.strokeStyle = 'rgba(255,255,255,.85)'; drawPolyline(cx, g, pts, visL, visR);
          cx.lineWidth = 3 * sc; cx.strokeStyle = '#e07b2a'; cx.setLineDash([8 * sc, 5 * sc]); drawPolyline(cx, g, pts, visL, visR); cx.setLineDash([]);
        }
      }
    }
    for (const leg of legs) {
      if (!leg.computed) continue;
      // 화살표 (도착지)
      const last = leg.computed.segments[leg.computed.segments.length - 1];
      if (last && last.pts.length >= 2) {
        const p1 = last.pts[last.pts.length - 2], p2 = last.pts[last.pts.length - 1];
        const a = unwrap([[toX(p1[1]), p1[0]], [toX(p2[1]), p2[0]]]);
        for (const off of [0, 360, -360]) {
          const [x1, y1] = g.px(a[0][0] + off, a[0][1]), [x2, y2] = g.px(a[1][0] + off, a[1][1]);
          if (x2 < -20 || x2 > W + 20) continue;
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const L = 11 * sc;
          cx.fillStyle = last.type === 'sea' ? '#2563eb' : '#e07b2a';
          cx.beginPath(); cx.moveTo(x2, y2);
          cx.lineTo(x2 - L * Math.cos(ang - 0.45), y2 - L * Math.sin(ang - 0.45));
          cx.lineTo(x2 - L * Math.cos(ang + 0.45), y2 - L * Math.sin(ang + 0.45));
          cx.closePath(); cx.fill();
        }
      }
    }
    // 장소
    const fontPx = Math.round((opts.small ? 9 : 11) * sc);
    cx.font = `700 ${fontPx}px 'Noto Sans KR', sans-serif`;
    cx.textBaseline = 'middle';
    const labelsDrawn = [];
    for (const p of places) {
      const role = DATA.ROLES[p.role] || DATA.ROLES.raw;
      const x = toX(p.lng) + (p.off ? p.off[0] : 0), y = p.lat + (p.off ? p.off[1] : 0);
      for (const off of [0, 360, -360]) {
        const [px, py] = g.px(x + off, y);
        if (px < -30 || px > W + 30) continue;
        const r = (selectedPlace === p.id ? 8 : 6) * sc;
        cx.beginPath();
        drawSymbol(cx, p.role, px, py, r);
        cx.fillStyle = role.color; cx.fill();
        cx.lineWidth = 1.5 * sc; cx.strokeStyle = '#fff'; cx.stroke();
        if (selectedPlace === p.id) { cx.beginPath(); cx.arc(px, py, r + 4 * sc, 0, Math.PI * 2); cx.strokeStyle = role.color; cx.lineWidth = 2 * sc; cx.stroke(); }
        // 라벨 (겹침 간단 회피)
        if (opts.labels !== false) {
          const text = p.label || p.name;
          const tw = cx.measureText(text).width;
          let lx = px + r + 4 * sc, ly = py;
          let tries = 0;
          while (tries < 4 && labelsDrawn.some(b => Math.abs(b[1] - ly) < fontPx + 2 && lx < b[0] + b[2] && lx + tw > b[0])) { ly += fontPx + 3; tries++; }
          labelsDrawn.push([lx, ly, tw]);
          cx.lineWidth = 3 * sc; cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.strokeText(text, lx, ly);
          cx.fillStyle = '#1b2430'; cx.fillText(text, lx, ly);
        }
      }
    }
    cx.restore();
  }

  function drawSymbol(cx, role, x, y, r) {
    if (role === 'hq') { // 별
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.5 : r * 1.25; const a = -Math.PI / 2 + i * Math.PI / 5; cx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
      cx.closePath();
    } else if (role === 'factory') { cx.rect(x - r, y - r, r * 2, r * 2); }
    else if (role === 'sale') { cx.moveTo(x, y - r * 1.2); cx.lineTo(x + r * 1.1, y + r * 0.9); cx.lineTo(x - r * 1.1, y + r * 0.9); cx.closePath(); }
    else if (role === 'dist') { cx.moveTo(x, y - r * 1.2); cx.lineTo(x + r * 1.2, y); cx.lineTo(x, y + r * 1.2); cx.lineTo(x - r * 1.2, y); cx.closePath(); }
    else { cx.arc(x, y, r, 0, Math.PI * 2); }
  }

  function unwrap(pts) {
    const out = []; let prev = null;
    for (const [x, y] of pts) {
      let xx = x;
      if (prev !== null) { while (xx - prev > 180) xx -= 360; while (xx - prev < -180) xx += 360; }
      out.push([xx, y]); prev = xx;
    }
    return out;
  }
  function drawPolyline(cx, g, pts, visL, visR) {
    let minx = Infinity, maxx = -Infinity;
    for (const [x] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; }
    for (const off of [0, 360, -360]) {
      if (maxx + off < visL || minx + off > visR) continue;
      cx.beginPath();
      pts.forEach(([x, y], i) => { const [px, py] = g.px(x + off, y); if (i === 0) cx.moveTo(px, py); else cx.lineTo(px, py); });
      cx.stroke();
    }
  }

  function drawLegend(cx, x, y, sc, title) {
    const lineH = 17 * sc, pad = 8 * sc;
    const items = Object.entries(DATA.ROLES).map(([k, r]) => ({ role: k, name: r.name, color: r.color }));
    const w = 190 * sc, h = pad * 2 + lineH * (items.length + 2) + (title ? lineH : 0);
    cx.fillStyle = 'rgba(255,255,255,.92)'; cx.strokeStyle = '#9aa5b1'; cx.lineWidth = 1;
    cx.fillRect(x, y, w, h); cx.strokeRect(x, y, w, h);
    cx.font = `700 ${Math.round(11 * sc)}px 'Noto Sans KR', sans-serif`; cx.textBaseline = 'middle'; cx.fillStyle = '#1b2430';
    let yy = y + pad + lineH / 2;
    if (title) { cx.fillText(title, x + pad, yy); yy += lineH; }
    cx.font = `400 ${Math.round(11 * sc)}px 'Noto Sans KR', sans-serif`;
    for (const it of items) {
      cx.beginPath(); drawSymbol(cx, it.role, x + pad + 7 * sc, yy, 5 * sc); cx.fillStyle = it.color; cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1; cx.stroke();
      cx.fillStyle = '#1b2430'; cx.fillText(it.name, x + pad + 20 * sc, yy); yy += lineH;
    }
    cx.lineWidth = 2.6 * sc; cx.strokeStyle = '#e07b2a'; cx.setLineDash([6 * sc, 4 * sc]); cx.beginPath(); cx.moveTo(x + pad, yy); cx.lineTo(x + pad + 16 * sc, yy); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = '#1b2430'; cx.fillText('육상 운송 (도로)', x + pad + 20 * sc, yy); yy += lineH;
    cx.strokeStyle = '#2563eb'; cx.beginPath(); cx.moveTo(x + pad, yy); cx.lineTo(x + pad + 16 * sc, yy); cx.stroke();
    cx.fillText('해상 운송 (선박)', x + pad + 20 * sc, yy);
  }

  function render() {
    if (!canvas || !world) return;
    const W = canvas.width, H = canvas.height;
    drawMap(canvas, W, H, view, { scale: dpr, small: canvas.width / dpr < 600 });
  }

  function resize() {
    if (!canvas || !wrap) return;
    const cssW = wrap.clientWidth || 600;
    const cssH = Math.round(cssW * WORLD_H / 360);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
    clampView(view, canvas.width, canvas.height);
    render();
  }

  // ───────── 데이터 ─────────
  function recompute() {
    const byId = {}; places.forEach(p => { byId[p.id] = p; });
    legs = legs.filter(l => byId[l.from] && byId[l.to]);
    for (const l of legs) {
      const a = byId[l.from], b = byId[l.to];
      l.computed = GEO.computeLeg(a, b, l.mode);
      l.fromName = a.label || a.name; l.toName = b.label || b.name;
    }
  }
  function persist() {
    recompute();
    STORE.set('map:places', places.map(p => ({ id: p.id, name: p.name, country: p.country, lat: p.lat, lng: p.lng, role: p.role, label: p.label, port: p.port || null, gaz: p.gaz || null, off: p.off || null })));
    STORE.set('map:legs', legs.map(l => ({ id: l.id, from: l.from, to: l.to, mode: l.mode, fromName: l.fromName, toName: l.toName,
      land: l.computed.land, sea: l.computed.sea, total: l.computed.total, modeLabel: l.computed.modeLabel, via: l.computed.via, gc: l.computed.gc })));
    STORE.set('map:view', { ...view });
    render(); renderLists();
    clearTimeout(exportTimer);
    exportTimer = setTimeout(exportImage, 1200);
    if (onChange) onChange();
  }

  function load() {
    places = (STORE.get('map:places') || []).map(p => ({ ...p }));
    legs = (STORE.get('map:legs') || []).map(l => ({ id: l.id, from: l.from, to: l.to, mode: l.mode }));
    const v = STORE.get('map:view'); if (v && v.z) view = { ...v };
    recompute();
  }

  function addPlace(obj) {
    const p = { id: uid(), name: obj.name, country: obj.country || '', lat: +obj.lat, lng: +obj.lng, role: obj.role || 'raw', label: obj.label || obj.name, port: obj.port || null, gaz: obj.gaz || null, off: obj.off || null };
    places.push(p); selectedPlace = p.id; persist(); return p;
  }
  function removePlace(id) { places = places.filter(p => p.id !== id); legs = legs.filter(l => l.from !== id && l.to !== id); if (selectedPlace === id) selectedPlace = null; persist(); }
  function addLeg(from, to, mode) {
    if (!from || !to || from === to) { STORE.toast('출발지와 도착지를 서로 다르게 골라 주세요.'); return; }
    if (legs.some(l => l.from === from && l.to === to && l.mode === mode)) { STORE.toast('이미 있는 구간입니다.'); return; }
    legs.push({ id: uid(), from, to, mode }); persist();
  }
  function removeLeg(id) { legs = legs.filter(l => l.id !== id); persist(); }

  function loadPreset(product) {
    const ids = [];
    places = []; legs = [];
    product.places.forEach(pp => {
      const g = DATA.gazById[pp.gaz];
      const p = { id: uid(), name: g.name, country: g.country, lat: g.lat, lng: g.lng, role: pp.role, label: pp.label, port: g.port || null, gaz: g.id, off: (pp.dx || pp.dy) ? [pp.dx || 0, pp.dy || 0] : null };
      places.push(p); ids.push(p.id);
    });
    product.legs.forEach(([a, b, m]) => legs.push({ id: uid(), from: ids[a], to: ids[b], mode: m }));
    view = { z: 1, cx: 0, cy: 12 };
    selectedPlace = null;
    persist();
  }

  function clearMap() { places = []; legs = []; selectedPlace = null; persist(); STORE.set('map:image', null); }

  // ───────── 이미지 내보내기 ─────────
  function exportImage() {
    if (!world) return null;
    const W = 1600, H = Math.round(W * WORLD_H / 360);
    const c = document.createElement('canvas'); c.width = W; c.height = H + 44;
    const cx = c.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
    const sub = document.createElement('canvas'); sub.width = W; sub.height = H;
    drawMap(sub, W, H, { z: 1, cx: 0, cy: 12 }, { scale: 1.6 });
    cx.drawImage(sub, 0, 44);
    const st = STORE.get('student') || {}; const prod = DATA.productById[STORE.get('product')];
    cx.fillStyle = '#1b2430'; cx.font = `700 22px 'Noto Sans KR', sans-serif`; cx.textBaseline = 'middle';
    cx.fillText(`상품 사슬 지도 · ${prod ? prod.name : '제품 미선택'}`, 16, 22);
    cx.font = `400 16px 'Noto Sans KR', sans-serif`; cx.textAlign = 'right';
    const tot = legs.reduce((a, l) => ({ land: a.land + (l.computed ? l.computed.land : 0), sea: a.sea + (l.computed ? l.computed.sea : 0) }), { land: 0, sea: 0 });
    cx.fillText(`${st.classNo ? st.classNo + '반 ' : ''}${st.number ? st.number + '번 ' : ''}${st.name || ''}  ·  육상 ${fmt(tot.land)} km · 해상 ${fmt(tot.sea)} km · 전체 ${fmt(tot.land + tot.sea)} km`, W - 16, 22);
    cx.textAlign = 'left';
    drawLegend(cx, 12, 44 + H - (8 + 17 * 7 + 16) * 1.6, 1.6, null);
    const url = c.toDataURL('image/jpeg', 0.86);
    STORE.set('map:image', url);
    return url;
  }
  const fmt = n => (Math.round(n) || 0).toLocaleString('ko-KR');

  // ───────── UI ─────────
  function roleOptions(sel) {
    return Object.entries(DATA.ROLES).map(([k, r]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${r.symbol} ${r.name}</option>`).join('');
  }
  function placeOptions(sel) {
    return '<option value="">— 선택 —</option>' + places.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${DATA.ROLES[p.role].symbol} ${esc(p.label || p.name)}</option>`).join('');
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderLists() {
    const pl = document.getElementById('placeList'); if (!pl) return;
    pl.innerHTML = places.length ? places.map(p => `
      <li data-id="${p.id}" class="${selectedPlace === p.id ? 'on' : ''}">
        <span class="sym" style="color:${DATA.ROLES[p.role].color}">${DATA.ROLES[p.role].symbol}</span>
        <input class="lbl" type="text" value="${esc(p.label || p.name)}" aria-label="장소 이름" data-act="label">
        <select data-act="role" aria-label="역할" style="flex:1 1 150px;min-height:36px;padding:4px 6px">${roleOptions(p.role)}</select>
        <span class="small muted nowrap">${esc(p.name)}${p.country ? ' · ' + esc(p.country) : ''}${p.port ? ' · 항구' : ''}</span>
        <button class="x" data-act="del" aria-label="삭제">✕</button>
      </li>`).join('') : '<li class="muted">아직 장소가 없습니다. 위에서 장소를 추가하거나 ‘제품 기본 경로 불러오기’를 눌러 주세요.</li>';
    const ll = document.getElementById('legList');
    const tot = { land: 0, sea: 0 };
    ll.innerHTML = legs.length ? legs.map(l => {
      const c = l.computed; tot.land += c.land; tot.sea += c.sea;
      return `<li data-id="${l.id}">
        <span class="nm">${esc(l.fromName)} → ${esc(l.toName)}</span>
        <span class="badge ${l.mode === 'ship' ? 'sea' : 'land'}">${c.modeLabel}</span>
        <span class="dist"><span class="badge land">육상 ${fmt(c.land)} km</span> <span class="badge sea">해상 ${fmt(c.sea)} km</span> <b>합계 ${fmt(c.total)} km</b></span>
        ${c.via && c.via.length ? `<span class="small muted">경유 항구 : ${esc(c.via.join(', '))}</span>` : ''}
        <button class="x" data-act="del" aria-label="삭제">✕</button></li>`;
    }).join('') : '<li class="muted">아직 구간이 없습니다.</li>';
    document.getElementById('legTotals').innerHTML = legs.length ? `
      <span class="stat">육상 운송 합계 <b>${fmt(tot.land)}</b> km</span>
      <span class="stat">해상 운송 합계 <b>${fmt(tot.sea)}</b> km</span>
      <span class="stat">전체 이동 거리 <b>${fmt(tot.land + tot.sea)}</b> km</span>` : '';
    const fs = document.getElementById('legFrom'), ts = document.getElementById('legTo');
    const fv = fs.value, tv = ts.value;
    fs.innerHTML = placeOptions(fv); ts.innerHTML = placeOptions(tv);
  }

  function mount(container) {
    container.innerHTML = `
      <div class="card">
        <h2>상품 사슬 지도</h2>
        <p class="hint">브랜드 본사 · 원료 생산지 · 제조국(원산지) · 판매·소비 지역을 표시하고, 원료가 이동하는 구간을 화살표로 그립니다. 이동 거리는 <b>평균적인 기준</b>으로 계산합니다 : 도로는 직선거리 × 1.3(우회율), 선박은 주요 항로(수에즈·말라카·파나마 운하 등)를 따라 계산하며, 내륙 장소는 가장 가까운 항구까지 도로로 이동한 뒤 배를 탑니다.</p>
        <div class="btnrow">
          <button class="btn sec" id="btnPreset">제품 기본 경로 불러오기</button>
          <button class="btn ghost" id="btnFit">전체 보기</button>
          <button class="btn ghost" id="btnMapPdf">지도 PDF 저장</button>
          <button class="btn danger" id="btnClearMap">지도 비우기</button>
        </div>
        <div id="mapWrap">
          <canvas id="mapCanvas" aria-label="세계 지도"></canvas>
          <div id="mapTools"><button id="zoomIn" aria-label="확대">＋</button><button id="zoomOut" aria-label="축소">－</button></div>
          <div id="mapHint">드래그로 이동, 두 손가락·휠로 확대. 표시를 누르면 선택됩니다.</div>
        </div>
        <div class="legend" style="margin-top:8px">${Object.entries(DATA.ROLES).map(([k, r]) => `<span><b style="color:${r.color}">${r.symbol}</b> ${r.name}</span>`).join('')}<span><i style="background:#e07b2a;width:18px;height:3px;border-radius:0;border-top:3px dashed #e07b2a;background:none"></i>육상 운송(도로)</span><span><i style="background:#2563eb;width:18px;height:3px;border-radius:0"></i>해상 운송(선박)</span></div>
      </div>
      <div class="card">
        <h3>① 장소 추가</h3>
        <div class="row">
          <div class="sugg" style="flex:2 1 220px"><label class="f" for="placeSearch">지명 검색 (도시·나라)</label><input type="search" id="placeSearch" placeholder="예 : 리옹, 부르키나파소, 서울" autocomplete="off"><ul id="placeSugg" hidden></ul></div>
          <div><label class="f" for="placeRole">역할</label><select id="placeRole">${roleOptions('raw')}</select></div>
          <div style="flex:2 1 200px"><label class="f" for="placeLabel">지도에 표시할 이름 (선택)</label><input type="text" id="placeLabel" placeholder="예 : 시어버터 (부르키나파소)"></div>
          <div class="fixed"><label class="f">&nbsp;</label><button class="btn" id="btnAddPlace" disabled>장소 추가</button></div>
        </div>
        <div class="btnrow"><button class="btn ghost sm" id="btnTapMode">지도에서 직접 찍기</button><span class="small muted" id="tapInfo"></span></div>
        <input type="hidden" id="placeSel">
        <h3 style="margin-top:14px">장소 목록</h3>
        <ul class="place-list" id="placeList"></ul>
      </div>
      <div class="card">
        <h3>② 이동 구간 추가</h3>
        <div class="row">
          <div><label class="f" for="legFrom">출발</label><select id="legFrom"></select></div>
          <div><label class="f" for="legTo">도착</label><select id="legTo"></select></div>
          <div><label class="f" for="legMode">이동 방법</label><select id="legMode"><option value="ship">선박 (필요하면 항구까지 도로)</option><option value="road">도로 (육상만)</option></select></div>
          <div class="fixed"><label class="f">&nbsp;</label><button class="btn" id="btnAddLeg">구간 추가</button></div>
        </div>
        <h3 style="margin-top:14px">구간 목록 <span class="badge land">육상</span> <span class="badge sea">해상</span></h3>
        <ul class="leg-list" id="legList"></ul>
        <div id="legTotals" style="margin-top:8px"></div>
        <p class="small muted" style="margin-top:8px">※ 거리는 수업용 평균 추정값입니다. 실제 운송 경로·거리는 선사·시기에 따라 다릅니다.</p>
      </div>`;
    wrap = document.getElementById('mapWrap'); canvas = document.getElementById('mapCanvas'); ctx = canvas.getContext('2d');
    bindUI();
    loadWorld().then(() => { resize(); renderLists(); });
    window.addEventListener('resize', resize);
  }

  function bindUI() {
    // 검색
    const search = document.getElementById('placeSearch'), sugg = document.getElementById('placeSugg'), selHidden = document.getElementById('placeSel');
    let suggItems = [];
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      selHidden.value = ''; document.getElementById('btnAddPlace').disabled = true;
      if (!q) { sugg.hidden = true; return; }
      suggItems = DATA.GAZ.filter(g => (g.name + g.country + g.id).toLowerCase().includes(q)).slice(0, 12);
      sugg.innerHTML = suggItems.map((g, i) => `<li data-i="${i}">${esc(g.name)}<small>${esc(g.country)}${g.port ? ' · 항구' : ''}</small></li>`).join('') || '<li class="muted">검색 결과가 없습니다. ‘지도에서 직접 찍기’를 써 보세요.</li>';
      sugg.hidden = false;
    });
    sugg.addEventListener('click', e => {
      const li = e.target.closest('li[data-i]'); if (!li) return;
      const g = suggItems[+li.dataset.i];
      search.value = `${g.name} (${g.country})`; selHidden.value = g.id; sugg.hidden = true;
      document.getElementById('btnAddPlace').disabled = false;
      document.getElementById('placeLabel').placeholder = `예 : 원료 이름 (${g.country})`;
    });
    document.addEventListener('click', e => { if (!e.target.closest('.sugg')) sugg.hidden = true; });
    document.getElementById('btnAddPlace').addEventListener('click', () => {
      const id = selHidden.value;
      const role = document.getElementById('placeRole').value, label = document.getElementById('placeLabel').value.trim();
      if (id.startsWith('tap:')) {
        const [, lat, lng] = id.split(':');
        const name = search.value.trim() || '직접 찍은 장소';
        addPlace({ name, country: '', lat, lng, role, label: label || name });
      } else {
        const g = DATA.gazById[id]; if (!g) return;
        addPlace({ name: g.name, country: g.country, lat: g.lat, lng: g.lng, role, label: label || `${g.name} (${g.country})`, port: g.port, gaz: g.id });
      }
      search.value = ''; selHidden.value = ''; document.getElementById('placeLabel').value = ''; document.getElementById('btnAddPlace').disabled = true;
      addMode = false; document.getElementById('tapInfo').textContent = '';
    });
    document.getElementById('btnTapMode').addEventListener('click', () => {
      addMode = !addMode;
      document.getElementById('tapInfo').textContent = addMode ? '지도에서 장소를 한 번 누르세요. 그 뒤 이름을 적고 [장소 추가]를 누릅니다.' : '';
    });
    document.getElementById('placeList').addEventListener('click', e => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      if (e.target.dataset.act === 'del') { removePlace(li.dataset.id); return; }
      selectedPlace = li.dataset.id; render();
    });
    document.getElementById('placeList').addEventListener('change', e => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      const p = places.find(x => x.id === li.dataset.id); if (!p) return;
      if (e.target.dataset.act === 'label') p.label = e.target.value.trim() || p.name;
      if (e.target.dataset.act === 'role') p.role = e.target.value;
      persist();
    });
    document.getElementById('btnAddLeg').addEventListener('click', () => addLeg(document.getElementById('legFrom').value, document.getElementById('legTo').value, document.getElementById('legMode').value));
    document.getElementById('legList').addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li && e.target.dataset.act === 'del') removeLeg(li.dataset.id); });
    document.getElementById('btnPreset').addEventListener('click', () => {
      const prod = DATA.productById[STORE.get('product')];
      if (!prod) { STORE.toast('먼저 활동지의 광고지 화면에서 제품을 골라 주세요.'); return; }
      APP.confirm(`「${prod.name}」의 기본 장소와 경로를 불러옵니다. 지금 지도에 있는 장소·구간은 지워집니다. 계속할까요?`, () => loadPreset(prod));
    });
    document.getElementById('btnClearMap').addEventListener('click', () => APP.confirm('지도의 장소와 구간을 모두 지울까요?', clearMap));
    document.getElementById('btnFit').addEventListener('click', () => { view = { z: 1, cx: 0, cy: 12 }; clampView(view, canvas.width, canvas.height); render(); STORE.set('map:view', { ...view }); });
    document.getElementById('btnMapPdf').addEventListener('click', () => PDF.saveMapPdf());
    document.getElementById('zoomIn').addEventListener('click', () => zoomAt(1.5));
    document.getElementById('zoomOut').addEventListener('click', () => zoomAt(1 / 1.5));

    // 포인터 조작
    const ptrs = new Map(); let dragStart = null, moved = false, pinchD = 0;
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 1) { dragStart = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; moved = false; }
      if (ptrs.size === 2) { const a = [...ptrs.values()]; pinchD = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); }
    });
    canvas.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) {
        const a = [...ptrs.values()]; const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        if (pinchD > 0) { view.z *= d / pinchD; clampView(view, canvas.width, canvas.height); render(); }
        pinchD = d; moved = true; return;
      }
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      const base = canvas.width / 360 * view.z / dpr;
      view.cx = dragStart.cx - dx / base; view.cy = dragStart.cy + dy / base;
      clampView(view, canvas.width, canvas.height); render();
    });
    const up = e => {
      if (ptrs.has(e.pointerId) && ptrs.size === 1 && !moved) onTap(e);
      ptrs.delete(e.pointerId); if (ptrs.size === 0) { dragStart = null; STORE.set('map:view', { ...view }); }
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e); }, { passive: false });
  }

  function zoomAt(f, e) {
    const W = canvas.width, H = canvas.height;
    const g = geom(W, H, view);
    let anchor = null;
    if (e) { const r = canvas.getBoundingClientRect(); anchor = g.inv((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr); }
    view.z *= f; clampView(view, W, H);
    if (anchor) { const g2 = geom(W, H, view); const r = canvas.getBoundingClientRect(); const now = g2.inv((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr); view.cx += anchor[0] - now[0]; view.cy += anchor[1] - now[1]; clampView(view, W, H); }
    render(); STORE.set('map:view', { ...view });
  }

  function onTap(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr;
    const g = geom(canvas.width, canvas.height, view);
    // 표시 선택
    let hit = null, hd = 14 * dpr;
    for (const p of places) {
      const x = toX(p.lng) + (p.off ? p.off[0] : 0), y = p.lat + (p.off ? p.off[1] : 0);
      for (const off of [0, 360, -360]) { const [qx, qy] = g.px(x + off, y); const d = Math.hypot(qx - px, qy - py); if (d < hd) { hd = d; hit = p; } }
    }
    if (hit && !addMode) { selectedPlace = hit.id; render(); renderLists(); const li = document.querySelector(`#placeList li[data-id="${hit.id}"]`); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (addMode) {
      const [x, y] = g.inv(px, py);
      let lng = ((x + CENTER_LNG + 540) % 360) - 180;
      const lat = Math.max(-85, Math.min(85, y));
      document.getElementById('placeSel').value = `tap:${lat.toFixed(2)}:${lng.toFixed(2)}`;
      document.getElementById('placeSearch').value = '';
      document.getElementById('placeSearch').placeholder = `찍은 위치 (위도 ${lat.toFixed(1)}, 경도 ${lng.toFixed(1)}) — 장소 이름을 적으세요`;
      document.getElementById('btnAddPlace').disabled = false;
      document.getElementById('tapInfo').textContent = `위도 ${lat.toFixed(1)}, 경도 ${lng.toFixed(1)} 위치를 찍었습니다. 이름을 적고 [장소 추가]를 누르세요.`;
      document.getElementById('placeSearch').focus();
    }
  }

  function getLegsForWorksheet() { return (STORE.get('map:legs') || []); }
  function getPlaces() { return (STORE.get('map:places') || []); }
  function setOnChange(fn) { onChange = fn; }

  return { mount, load, loadWorld, exportImage, getLegsForWorksheet, getPlaces, setOnChange, resize, loadPreset };
})();
