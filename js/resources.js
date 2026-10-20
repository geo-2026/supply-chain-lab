/* 자료 보기 — 광고지 · 라벨 · 부가가치 자료 · 원료 가격 */
'use strict';
window.RES = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => n == null ? '—' : Math.round(n).toLocaleString('ko-KR') + '원';
  let cur = 'ads';

  function mount(container, sub) {
    cur = sub || cur;
    container.innerHTML = `
      <div class="subtabs" id="resTabs">
        <button data-t="ads">광고지</button><button data-t="labels">라벨</button><button data-t="va">부가가치 자료</button><button data-t="prices">원료 가격</button>
      </div>
      <div id="resBody"></div>`;
    container.querySelector('#resTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cur = b.dataset.t; location.hash = '#res/' + cur; draw(); });
    draw();
  }

  function draw() {
    document.querySelectorAll('#resTabs button').forEach(b => b.classList.toggle('active', b.dataset.t === cur));
    const body = document.getElementById('resBody');
    const prod = DATA.productById[STORE.get('product')];
    if (cur === 'ads') {
      body.innerHTML = `<div class="card"><h2>가상 상품 광고지 6종</h2><p class="hint">광고를 누르면 크게 볼 수 있습니다. 광고가 강조하는 나라·장소, 장점, 그리고 <b>말하지 않는 것</b>을 찾아보세요.</p>
        <div class="gallery">${DATA.PRODUCTS.map(p => `<figure data-img="assets/ads/ad${p.no}.png" data-pdf="assets/pdf/ad${p.no}.pdf" data-ttl="광고지 ${p.no} · ${esc(p.name)}"><img src="assets/ads/ad${p.no}_thumb.png" alt="${esc(p.name)} 광고지" loading="lazy"><figcaption>${p.no}. ${esc(p.name)}<br><span class="muted small">${esc(p.slogan)} · ${esc(p.priceLabel)}</span></figcaption></figure>`).join('')}</div>
        <p class="small muted">※ 수업용 가상 광고입니다. 브랜드·제품·문구는 실제와 관계없습니다.</p></div>`;
    } else if (cur === 'labels') {
      body.innerHTML = `<div class="card"><h2>가상 상품 라벨 6종</h2><p class="hint">라벨에서 제조국(원산지), 제조자(공장 위치), 브랜드 본사·판매원, 원료와 산지를 찾아보세요.</p>
        <div class="gallery">${DATA.PRODUCTS.map(p => `<figure data-img="assets/labels/label${p.no}.png" data-pdf="assets/pdf/label${p.no}.pdf" data-ttl="라벨 ${p.no} · ${esc(p.name)}"><img src="assets/labels/label${p.no}_thumb.png" alt="${esc(p.name)} 라벨" loading="lazy"><figcaption>${p.no}. ${esc(p.name)}</figcaption></figure>`).join('')}</div>
        <p class="small muted">※ 수업용 가상 라벨입니다. 브랜드·업체·주소·전화번호·인증 표시는 실제와 관계없습니다.</p></div>`;
    } else if (cur === 'va') {
      body.innerHTML = `<div class="card"><h2>부가가치란 무엇일까?</h2>
        <div class="card soft" style="margin:8px 0"><p style="font-size:1.1rem;text-align:center;margin:4px 0"><b>부가가치 = 판 값 − 산 값</b></p><p class="center small muted" style="margin:0">(그 단계에서 판매한 금액) − (앞 단계에서 사 온 원료·부품의 금액)</p></div>
        <p>상품은 여러 사람의 손을 거치며 값이 점점 올라갑니다. 각 단계에서 <b>새로 더해진 가치</b>가 부가가치입니다. 네 단계의 부가가치를 모두 더하면 마지막 판매 가격(세금 제외)과 같아지고, 소비자 가격에는 정부에 내는 부가가치세 10%가 들어 있습니다.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>단계</th><th>누가 무엇을</th><th>산 값</th><th>판 값</th><th>부가가치</th></tr></thead><tbody>
        ${DATA.BREAD.rows.map((r, i) => `<tr><td class="lab">${r[0]}</td><td>${esc(r[1])}</td><td class="num">${won(r[2])}</td><td class="num">${won(r[3])}</td><td class="num"><b>${won(DATA.BREAD.answers[i])}</b></td></tr>`).join('')}
        <tr><td colspan="4" class="right"><b>네 단계 부가가치의 합</b></td><td class="num"><b>1,000원</b></td></tr></tbody></table></div>
        <p class="small muted">1,000원 × 1.1 = 소비자 가격 1,100원 (부가가치세 100원)</p>
        <h3 style="margin-top:16px">학습자료 원본 (7쪽)</h3>
        <div class="gallery">${[1, 2, 3, 4, 5, 6, 7].map(i => `<figure data-img="assets/va/va${i}.png" data-pdf="assets/pdf/value-added.pdf" data-ttl="부가가치 학습자료 ${i}쪽"><img src="assets/va/va${i}.png" alt="부가가치 학습자료 ${i}쪽" loading="lazy"><figcaption>${i === 1 ? '개념' : '② 제품 ' + (i - 1) + ' · ' + DATA.PRODUCTS[i - 2].name}</figcaption></figure>`).join('')}</div></div>
        <div class="card"><h2>부가가치 따라가기 — 제품별 표</h2>
        <div class="subtabs" id="vaProd">${DATA.PRODUCTS.map(p => `<button data-p="${p.id}" class="${prod && prod.id === p.id ? 'active' : ''}">${p.no} ${esc(p.name)}</button>`).join('')}</div>
        <div id="vaBody"></div></div>`;
      body.querySelector('#vaProd').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; body.querySelectorAll('#vaProd button').forEach(x => x.classList.toggle('active', x === b)); drawVA(DATA.productById[b.dataset.p]); });
      drawVA(prod || DATA.PRODUCTS[0]);
    } else {
      body.innerHTML = `<div class="card"><h2>라벨 원료의 수출용 도매 가격 (2026-08-01 기준)</h2>
        <p class="hint">「수출용 도매 가격」은 원료가 나라와 나라 사이에서 대량으로 거래될 때의 가격입니다. 「제품 1단위 원료 비용」 = 제품 1단위에 드는 원료 양(g) × 1kg당 가격(원) ÷ 1,000. 활동 3-2에 옮겨 적을 때 참고하세요.</p>
        <div class="subtabs" id="prProd">${DATA.PRODUCTS.map(p => `<button data-p="${p.id}" class="${prod && prod.id === p.id ? 'active' : ''}">${p.no} ${esc(p.name)}</button>`).join('')}</div>
        <div id="prBody"></div>
        <p class="small muted">환율(2026-07-31) : 1 USD = 1,424원 · 1 CNY ≈ 211원 · 1 EUR ≈ 1,640원. 원유 줄은 플라스틱 수지 가격에 이미 들어 있어 합계에서 뺐습니다. <a href="assets/pdf/raw-material-prices.xlsx" download>엑셀 원본 내려받기</a></p></div>`;
      body.querySelector('#prProd').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; body.querySelectorAll('#prProd button').forEach(x => x.classList.toggle('active', x === b)); drawPrices(DATA.productById[b.dataset.p]); });
      drawPrices(prod || DATA.PRODUCTS[0]);
    }
    body.querySelectorAll('.gallery figure').forEach(f => f.addEventListener('click', () => openViewer(f.dataset.img, f.dataset.ttl, f.dataset.pdf)));
  }

  function drawVA(p) {
    const el = document.getElementById('vaBody'); if (!el || !p) return;
    const colors = ['#9fc5e8', '#5b9bd5', '#2f6fc4', '#1f3f7a', '#9aa5b1'];
    const segs = [...p.va.stages.map((s, i) => ({ n: s.key + (i ? ' (' + s.place.split('·')[0].trim() + ')' : ''), v: s.va, pct: s.pct })), { n: '세금', v: p.tax, pct: Math.round(p.tax / p.price * 1000) / 10 }];
    el.innerHTML = `<p><b>${esc(p.full)}</b> — 소비자 가격 <b>${won(p.price)}</b> = 세금 빼기 전 판매 가격 ${won(p.preTax)} + 부가가치세 ${won(p.tax)}</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>단계</th><th>누가 · 어디서</th><th>하는 일</th><th>산 값</th><th>판 값</th><th>부가가치</th><th>비율</th></tr></thead><tbody>
      ${p.va.stages.map(s => `<tr><td class="lab">${s.key}</td><td>${esc(s.who)}</td><td>${esc(s.work)}</td><td class="num">${won(s.buy)}</td><td class="num">${won(s.sell)}</td><td class="num"><b>${won(s.va)}</b></td><td class="num">${s.pct}%</td></tr>`).join('')}
      <tr><td colspan="5" class="right">부가가치세 (정부)</td><td class="num">${won(p.tax)}</td><td class="num">9.1%</td></tr>
      </tbody></table></div>
      ${p.va.stages[1].note ? `<p class="small muted">제조 부가가치 내역 : ${esc(p.va.stages[1].note)}</p>` : ''}
      <p class="small">원료 ${won(p.rawVA)}의 내역 : ${p.raw.filter(r => !r.excluded && r.cost != null).map(r => `${esc(r.material)} 약 ${won(r.cost)}`).join(' + ')} ≈ ${won(p.rawSum)} → ${esc(p.rawNote)}</p>
      <h4>소비자 가격 ${won(p.price)}은 누구에게 돌아갈까?</h4>
      <div class="va-bar">${segs.map((s, i) => `<span style="width:${s.pct}%;background:${colors[i]}" title="${esc(s.n)} ${won(s.v)}"></span>`).join('')}</div>
      <div class="legend">${segs.map((s, i) => `<span><i style="background:${colors[i]}"></i>${esc(s.n)} ${won(s.v)} · ${s.pct}%</span>`).join('')}</div>
      <p class="small muted">※ 수업용 가상 자료입니다. 원료 값은 2026-08-01 기준 원료 가격으로 계산했고, 제조·유통·판매 금액은 가상입니다.</p>`;
  }

  function drawPrices(p) {
    const el = document.getElementById('prBody'); if (!el || !p) return;
    el.innerHTML = `<p><b>${esc(p.full)}</b> · 제품 1단위 = ${esc(p.unit)}</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>원료</th><th>라벨 표시 산지</th><th>수출용 도매 가격</th><th>제품 1단위 원료 비용</th><th>원료 양(추정)</th></tr></thead><tbody>
      ${p.raw.map(r => `<tr style="${r.excluded ? 'color:#888;font-style:italic' : ''}"><td>${esc(r.material)}</td><td>${esc(r.origin)}</td><td>${esc(r.price)}</td><td class="num">${r.cost == null ? '미확인' : (r.excluded ? '(' + won(r.cost) + ' 제외)' : won(r.cost))}</td><td class="small">${esc(r.basis)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="3" class="right">제품 1단위 원료 비용 합계 (조사값)</td><td class="num">${won(p.rawSum)}</td><td class="small">부가가치 자료의 원료 단계 금액 : ${won(p.rawVA)} — ${esc(p.rawNote)}</td></tr></tfoot></table></div>`;
  }

  function openViewer(src, title, pdf) {
    let v = document.getElementById('viewer');
    if (!v) {
      v = document.createElement('div'); v.id = 'viewer';
      v.innerHTML = `<div class="bar"><span class="ttl"></span><button class="btn sm sec" id="vZoom">확대</button><a class="btn sm sec" id="vPdf" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center">PDF 원본</a><button class="btn sm" id="vClose">닫기</button></div><div class="body"><img alt=""></div>`;
      document.body.appendChild(v);
      v.querySelector('#vClose').addEventListener('click', () => { v.hidden = true; });
      v.querySelector('#vZoom').addEventListener('click', () => { const img = v.querySelector('img'); img.classList.toggle('z2'); v.querySelector('#vZoom').textContent = img.classList.contains('z2') ? '원래 크기' : '확대'; });
    }
    v.querySelector('.ttl').textContent = title; v.querySelector('img').src = src; v.querySelector('img').alt = title; v.querySelector('img').classList.remove('z2');
    v.querySelector('#vZoom').textContent = '확대';
    v.querySelector('#vPdf').href = pdf; v.querySelector('#vPdf').hidden = !pdf;
    v.hidden = false; v.querySelector('.body').scrollTop = 0;
  }

  return { mount, openViewer };
})();
