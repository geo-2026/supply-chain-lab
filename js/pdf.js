/* PDF 저장 — 숨김 화면(794px)을 활동별 블록으로 그려 html2canvas로 이미지화한 뒤 jsPDF로 A4에 배치 */
'use strict';
window.PDF = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => (Math.round(Number(n) || 0)).toLocaleString('ko-KR');
  const A4 = { w: 210, h: 297, m: 12, top: 20, bottom: 14 };
  const CW = A4.w - A4.m * 2;           // 186mm
  const PX = 794;                         // 숨김 화면 너비
  const pxToMm = px => px * CW / PX;
  const HEADER = '2026 세계시민과 지리 수행평가 · ‘가상 상품으로 따라가는 상품 사슬’ 프로젝트';

  function fileName() {
    const s = WS.student();
    const safe = v => String(v || '').replace(/[\\/:*?"<>|]/g, '');
    return `${safe(s.classNo) || '0'}-${safe(s.number) || '0'}_${safe(s.name) || '이름'}_상품사슬활동지.pdf`;
  }

  const val = (v, cls) => v === '' || v == null ? `<span class="empty">&nbsp;</span>` : esc(v);
  const box = (v, cls) => `<div class="box ${cls || ''}">${v ? esc(v) : ''}</div>`;
  const stuLine = () => { const s = WS.student(); return `( ${esc(s.classNo || ' ')} )반 ( ${esc(s.number || ' ')} )번 이름( ${esc(s.name || '      ')} )`; };

  // ── 블록 생성 ──
  function buildBlocks() {
    const S = WS.S, prod = WS.product(), price = prod ? prod.price : 0, s = WS.student();
    const n = WS.num, pct = WS.pct;
    const B = [];
    const add = (html, page) => B.push({ html, newPage: !!page });
    // 표지(첫 쪽)
    add(`<div class="cover"><h1>‘가상 상품으로 따라가는 상품 사슬’ 프로젝트</h1>
      <p>◈ <b>주제</b> : 가상 상품의 상품 사슬과 부가가치를 탐구하고 책임 있는 소비 방법 찾기</p>
      <p>◈ <b>탐구 질문</b> : 내가 고른 상품은 어디에서 와서, 누구의 손을 거쳐, 누구에게 얼마를 남길까?</p>
      <p>◈ <b>학번·이름</b> : ${esc(s.classNo)}반 ${esc(s.number)}번 ${esc(s.name)}</p>
      <p>◈ <b>선택한 제품</b> : ${prod ? `${prod.no}. ${esc(prod.name)} (${esc(prod.full)} · ${esc(prod.priceLabel)})` : '(미선택)'}</p>
      <table style="margin-top:8px"><thead><tr><th style="width:60px">차시</th><th>활동 내용</th><th style="width:160px">준비</th></tr></thead><tbody>
      <tr><td class="lab">1차시</td><td>1) 수행평가 과정 설명, 앱 접속 확인 2) [개별활동Ⅰ] 제품 선택하기 3) [개별활동Ⅱ] 제품 원료 예상하기, 부가가치 개념 알아보기</td><td>평가안내문 · 자료(광고지·부가가치 개념) · 활동지 앱</td></tr>
      <tr><td class="lab">2차시</td><td>4) [개별활동Ⅲ] 제품 라벨 확인하기 5) [개별활동Ⅳ] 상품 사슬표 작성하기</td><td>자료(라벨·원료 가격·부가가치 자료)</td></tr>
      <tr><td class="lab">3차시</td><td>6) [개별활동Ⅴ] 상품 사슬 지도 작성하기</td><td>자료 앱(상품 사슬 지도)</td></tr>
      <tr><td class="lab">4차시</td><td>7) [개별활동Ⅵ] 가장 중요한 단계 찾기 8) [개별활동Ⅶ] 내가 생각하는 상품 사슬 9) [개별활동Ⅷ] 책임 있는 소비 방법 10) 발표, 활동지·지도 PDF 제출, 평가지 작성</td><td>평가지</td></tr></tbody></table></div>`);
    // 1
    add(`<h2>1. [개별활동Ⅰ] 제품 선택하기 (광고지)</h2><div class="q">1-1. 가상 상품 광고지 6종을 살펴보고, 내가 탐구할 제품 하나에 ✓ 표시해 봅시다.</div>
      <table><thead><tr><th style="width:44px">번호</th><th>제품</th><th>광고 대표 문구</th><th style="width:120px">판매 가격</th><th style="width:60px">선택(✓)</th></tr></thead><tbody>
      ${DATA.PRODUCTS.map(p => `<tr><td class="lab">${['①', '②', '③', '④', '⑤', '⑥'][p.no - 1]}</td><td>${esc(p.name)}</td><td>${esc(p.slogan)}</td><td>${esc(p.priceLabel)}</td><td style="text-align:center;font-size:15px">${prod && prod.id === p.id ? '✓' : ''}</td></tr>`).join('')}</tbody></table>`);
    add(`<div class="q">1-2. 이 제품을 고른 이유를 적어봅시다.</div>${box(S.a1.reason)}`);
    add(`<div class="q">1-3. 광고를 꼼꼼히 읽고 정리해 봅시다.</div><table><tbody>
      <tr><td class="lab" style="width:150px">광고가 강조하는<br>나라·장소</td><td style="min-height:40px">${val(S.a1.adPlace)}</td></tr>
      <tr><td class="lab">광고가 강조하는 장점</td><td>${val(S.a1.adPros)}</td></tr>
      <tr><td class="lab">광고가 말하지 않는 것<br>(예상)</td><td>${val(S.a1.adHidden)}</td></tr></tbody></table>`);
    // 2
    const predSum = S.a2.predict.reduce((a, r) => a + n(r.price), 0);
    add(`<h2>2. [개별활동Ⅱ] 제품 원료 예상하기</h2><div class="q">2-1. 라벨을 보기 전에, 제품을 만드는 데 필요한 원료와 그 가격을 예상해 봅시다.</div><div class="hint">(예상 가격 = 제품 1개를 만드는 데 드는 원료 값. 정답이 아니어도 괜찮으니 근거를 들어 예상하세요.)</div>
      <table><thead><tr><th style="width:140px">원료 (예상)</th><th>그렇게 생각한 이유</th><th style="width:130px">생산될 것 같은 나라</th><th style="width:100px">예상 가격(원)</th></tr></thead><tbody>
      ${S.a2.predict.map(r => `<tr><td>${val(r.material)}</td><td>${val(r.reason)}</td><td>${val(r.country)}</td><td class="num">${r.price === '' ? '' : won(r.price)}</td></tr>`).join('')}
      <tr><td colspan="3" class="lab">합계</td><td class="num">${won(predSum)}</td></tr></tbody></table>`, true);
    add(`<div class="q">2-2. 판매 가격 중 원료값이 차지하는 비율을 예상해 봅시다.</div><table><tbody>
      <tr><td class="lab" style="width:90px">판매 가격</td><td class="num">${prod ? won(price) : ''} 원</td><td class="lab" style="width:90px">예상 원료 값</td><td class="num">${won(predSum)} 원</td><td class="lab" style="width:80px">예상 비율</td><td>약 ( ${pct(predSum, price)} )%</td></tr>
      <tr><td class="lab">그렇게 예상한<br>이유</td><td colspan="5">${val(S.a2.ratioReason)}</td></tr></tbody></table>`);
    const c = S.a2.concept;
    add(`<div class="q">2-3. 부가가치 개념 알아보기 (부가가치 개념 자료 참고)</div>
      <div class="box short" style="text-align:center">부가가치 = ( &nbsp;${esc(c.blank1)}&nbsp; ) − ( &nbsp;${esc(c.blank2)}&nbsp; )</div>
      <p class="hint" style="margin-top:6px">빵 한 개(1,100원)가 만들어지기까지의 예시에서 단계별 부가가치를 계산해 봅시다.</p>
      <table><thead><tr><th style="width:50px">단계</th><th>누가 무엇을</th><th style="width:70px">산 값</th><th style="width:70px">판 값</th><th style="width:90px">부가가치</th></tr></thead><tbody>
      ${DATA.BREAD.rows.map((r, i) => `<tr><td class="lab">${r[0]}</td><td>${esc(r[1])}</td><td class="num">${won(r[2])}원</td><td class="num">${won(r[3])}원</td><td class="num">( ${esc(c.bread[i])} )원</td></tr>`).join('')}
      <tr><td colspan="4" class="lab">네 단계 부가가치의 합</td><td class="num">( ${esc(c.sum)} )원</td></tr></tbody></table>
      <p style="margin:6px 0 0">→ 네 단계 부가가치의 합은 ( <b>A</b> )과 같다.<br>&nbsp;&nbsp;&nbsp;소비자 가격 1,100원 중 100원은 ( <b>B</b> )이다.</p>
      <table style="margin-top:6px"><tbody><tr><td class="lab" style="width:160px">A에 들어갈 가격은?</td><td>( ${esc(c.s1)} )원</td><td class="lab" style="width:160px">B에 들어갈 용어는?</td><td>( ${esc(c.s2)} )</td></tr></tbody></table>`);
    // 3
    add(`<h2>3. [개별활동Ⅲ] 제품 라벨 확인하기</h2><div class="q">3-1. 제품 라벨에서 다음 정보를 찾아 적어봅시다.</div><table><tbody>
      <tr><td class="lab" style="width:170px">제조국 (원산지)</td><td>${val(S.a3.origin)}</td></tr><tr><td class="lab">제조자 (공장 위치)</td><td>${val(S.a3.maker)}</td></tr>
      <tr><td class="lab">브랜드 본사 · 판매원 (위치)</td><td>${val(S.a3.hq)}</td></tr><tr><td class="lab">라벨에 적힌<br>주요 원료와 산지</td><td style="white-space:pre-wrap">${val(S.a3.rawList)}</td></tr></tbody></table>`, true);
    const cmpSum = S.a3.compare.reduce((a, r) => a + n(r.cost), 0);
    add(`<div class="q">3-2. 예상한 원료와 라벨의 실제 원료를 비교해 봅시다. (자료 앱의 원료 가격 참고)</div>
      <table><thead><tr><th>실제 원료 (라벨)</th><th style="width:70px">예상했나요?<br>(○ / ×)</th><th style="width:110px">라벨 표시 산지</th><th style="width:120px">수출용 도매 가격</th><th style="width:100px">제품 1단위 원료 비용</th></tr></thead><tbody>
      ${S.a3.compare.map(r => `<tr><td>${val(r.material)}</td><td style="text-align:center">${esc(r.predicted)}</td><td>${val(r.origin)}</td><td>${val(r.price)}</td><td class="num">${r.cost === '' ? '' : won(r.cost) + '원'}</td></tr>`).join('')}
      <tr><td colspan="4" class="lab">원료 비용 합계</td><td class="num">( ${won(cmpSum)} )원</td></tr></tbody></table>
      <p style="margin:6px 0 0">실제 원료 비율 : 원료 비용 합계 ( ${won(cmpSum)} )원 ÷ 판매 가격 ( ${prod ? won(price) : ''} )원 × 100 = 약 ( ${pct(cmpSum, price)} )%</p>`);
    add(`<div class="q">3-3. 예상과 실제의 차이점을 정리해 봅시다. (원료의 종류, 생산지, 가격, 비율)</div>${box(S.a3.diff, 'tall')}`);
    // 4
    const R4 = [['raw', '원료'], ['make', '제조'], ['dist', '유통'], ['sale', '판매']];
    const vaSum = [...R4.map(r => r[0]), 'tax'].reduce((a, k) => a + n(S.a4.rows[k].va), 0);
    add(`<h2>4. [개별활동Ⅳ] 상품 사슬표 작성하기 (자료 앱의 부가가치 자료 참고)</h2>
      <div class="q">4-1. 브랜드 본사 위치 : <span style="font-weight:400">(나라 / 도시) ${esc(S.a4.hq)}</span></div>
      <div class="q">4-2. 단계별로 장소, 하는 일, 부가가치, 이동 경로를 정리해 봅시다.</div><div class="hint">(장소 : 원료는 주요 원료 생산지, 제조는 제조국·공장 위치, 유통·판매는 회사·매장 위치를 적으세요.)</div>
      <table><thead><tr><th style="width:56px">단계</th><th style="width:130px">장소<br>(나라 / 지역)</th><th>누가 · 하는 일</th><th style="width:76px">부가가치<br>(원)</th><th style="width:52px">비율<br>(%)</th><th style="width:150px">이동 경로<br>(다음 단계로 가는 곳 · 운송 수단)</th></tr></thead><tbody>
      ${R4.map(([k, nm]) => { const r = S.a4.rows[k]; return `<tr><td class="lab">${nm}</td><td>${val(r.place)}</td><td>${val(r.who)}</td><td class="num">${r.va === '' ? '' : won(r.va)}</td><td class="num">${r.va === '' ? '' : pct(n(r.va), price)}</td><td>${k === 'sale' ? '소비자 : ' : ''}${esc(r.route)}</td></tr>`; }).join('')}
      <tr><td class="lab">부가가치세</td><td>정부</td><td>—</td><td class="num">${S.a4.rows.tax.va === '' ? '' : won(S.a4.rows.tax.va)}</td><td class="num">${S.a4.rows.tax.va === '' ? '' : pct(n(S.a4.rows.tax.va), price)}</td><td>—</td></tr>
      <tr><td colspan="3" class="lab">합계</td><td class="num">${won(vaSum)}</td><td class="num">100%</td><td>소비자 가격 ( ${prod ? won(price) : ''} )원</td></tr></tbody></table>`, true);
    add(`<div class="q">4-3. 상품 사슬표를 보고 알게 된 점을 적어봅시다.</div>${box(S.a4.insight, 'tall')}`);
    // 5
    const legs = MAP.getLegsForWorksheet(), mapImg = STORE.get('map:image');
    add(`<h2>5. [개별활동Ⅴ] 상품 사슬 지도 작성하기 (자료 앱의 상품 사슬 지도)</h2>`, true);
    const mimg = S.a5.manual ? S.a5.manualImage : mapImg;
    if (mimg) add(`<img class="map" src="${mimg}" alt="상품 사슬 지도">`);
    else add(`<div class="box tall" style="text-align:center;color:#888;padding-top:40px">(지도 이미지 없음 — 지도 앱에서 지도를 만들어 주세요)</div>`);
    if (S.a5.manual) {
      const ml = S.a5.manualLegs.filter(r => r.from || r.to || r.km);
      add(`<div class="q">5-1. 앱에서 완성한 지도의 이동 거리를 정리하고, 지도 PDF를 함께 제출합니다.</div>
        <table><thead><tr><th>구간 (출발 → 도착)</th><th style="width:140px">이동 방법</th><th style="width:110px">이동 거리 (km)</th></tr></thead><tbody>
        ${(ml.length ? ml : S.a5.manualLegs).map(r => `<tr><td>${esc(r.from)} → ${esc(r.to)}</td><td style="text-align:center">${esc(r.mode || '도로 / 선박')}</td><td class="num">${r.km === '' ? '' : won(r.km)}</td></tr>`).join('')}
        <tr><td colspan="2" class="lab">전체 이동 거리</td><td class="num">${won(S.a5.manualLegs.reduce((a, r) => a + n(r.km), 0))} km</td></tr></tbody></table><p class="hint">(직접 입력)</p>`);
    } else {
      const tot = legs.reduce((a, l) => ({ land: a.land + (l.land || 0), sea: a.sea + (l.sea || 0) }), { land: 0, sea: 0 });
      add(`<div class="q">5-1. 앱에서 완성한 지도의 이동 거리를 정리하고, 지도 PDF를 함께 제출합니다.</div>
        <table><thead><tr><th>구간 (출발 → 도착)</th><th style="width:110px">이동 방법</th><th style="width:72px">육상 (km)</th><th style="width:72px">해상 (km)</th><th style="width:90px">이동 거리 (km)</th></tr></thead><tbody>
        ${legs.length ? legs.map(l => `<tr><td>${esc(l.fromName)} → ${esc(l.toName)}${l.via && l.via.length ? `<div style="font-size:10px;color:#555">경유 항구 : ${esc(l.via.join(', '))}</div>` : ''}</td><td style="text-align:center">${esc(l.modeLabel)}</td><td class="num">${won(l.land)}</td><td class="num">${won(l.sea)}</td><td class="num">${won(l.total)}</td></tr>`).join('') : [1, 2, 3, 4, 5].map(() => '<tr><td>&nbsp;</td><td style="text-align:center">도로 / 선박</td><td></td><td></td><td></td></tr>').join('')}
        <tr><td colspan="2" class="lab">전체 이동 거리</td><td class="num">${won(tot.land)}</td><td class="num">${won(tot.sea)}</td><td class="num">${won(tot.land + tot.sea)} km</td></tr></tbody></table>
        <p class="hint">도로 = 직선거리 × 1.3(평균 우회율), 선박 = 주요 항로(운하·해협 경유) 기준 평균 추정값. 육상·해상 거리를 구분해 표시함.</p>`);
    }
    add(`<div class="q">5-2. 지도를 완성하고 알게 된 점을 적어봅시다. (가장 먼 구간, 바닷길이 지나는 곳 등)</div>${box(S.a5.insight)}`);
    // 6
    const a6 = S.a6;
    add(`<h2>6. [개별활동Ⅵ] 상품 사슬에서 가장 중요한 단계 찾기</h2><div class="q">6-1. 부가가치가 가장 높게 만들어지는 단계와 장소를 찾아봅시다.</div>
      <table><thead><tr><th style="width:80px">단계</th><th>장소 (나라 · 도시)</th><th style="width:120px">부가가치</th><th style="width:110px">소비자 가격 중<br>비율</th></tr></thead><tbody>
      <tr><td style="text-align:center">${esc(a6.topStage)}</td><td>${val(a6.topPlace)}</td><td class="num">( ${a6.topVa === '' ? '' : won(a6.topVa)} )원</td><td class="num">( ${a6.topVa === '' ? '' : pct(n(a6.topVa), price)} )%</td></tr></tbody></table>
      <p class="hint" style="margin-top:6px">그 단계에서 부가가치가 큰 까닭은 무엇일까요? (기술, 디자인, 브랜드, 임금, 임대료 등)</p>${box(a6.topReason)}`, true);
    add(`<div class="q">6-2. 내가 생각하는 상품 사슬에서 가장 중요한 단계와 그 이유를 적어봅시다.</div><div class="hint">(부가가치의 크기 말고도 노동, 환경, 기술, 소비자 안전 등 다른 기준으로 판단해도 좋습니다.)</div>
      <table><tbody><tr><td class="lab" style="width:140px">가장 중요한 단계</td><td>${val(a6.impStage)}</td></tr><tr><td class="lab">판단 기준</td><td>${val(a6.criterion)}</td></tr><tr><td class="lab">이유</td><td style="min-height:60px">${val(a6.impReason)}</td></tr></tbody></table>`);
    add(`<div class="q">6-3. 원료를 생산한 나라에 돌아간 몫과 가장 큰 부가가치를 가져간 곳의 몫을 비교해 봅시다.</div>
      <table style="width:70%"><tbody><tr><td class="lab" style="width:140px">원료 생산지의 몫</td><td>( ${a6.rawShareWon === '' ? '' : won(a6.rawShareWon)} )원 · ( ${a6.rawShareWon === '' ? '' : pct(n(a6.rawShareWon), price)} )%</td></tr>
      <tr><td class="lab">가장 큰 몫</td><td>( ${a6.topShareWon === '' ? '' : won(a6.topShareWon)} )원 · ( ${a6.topShareWon === '' ? '' : pct(n(a6.topShareWon), price)} )%</td></tr></tbody></table>`);
    // 7
    add(`<h2>7. [개별활동Ⅶ] 내가 생각하는 상품 사슬</h2><div class="q">7-1. 상품 사슬의 장점</div>${box(S.a7.pros, 'tall')}`, true);
    add(`<div class="q">7-2. 상품 사슬의 문제점 또는 단점</div>${box(S.a7.cons, 'tall')}`);
    add(`<div class="q">7-3. 문제점 해결 방안</div>${box(S.a7.solution, 'tall')}`);
    // 8
    add(`<h2>8. [개별활동Ⅷ] 책임 있는 소비 방법</h2><div class="q">8-1. 책임있는 소비 방법 알아보기</div><div class="hint">(참고 : 공정무역 인증 확인, 원산지·성분 표시 읽기, 오래 쓰기·고쳐 쓰기, 중고 거래, 분리배출, 꼭 필요한 만큼 사기 등)</div>${box(S.a8.method, 'tall')}`, true);
    add(`<div class="q">8-2. 소비자 한 사람의 실천만으로 부족한 점은 무엇일까요? 기업과 정부·국제사회가 할 일도 적어봅시다.</div>
      <table><tbody><tr><td class="lab" style="width:120px">기업</td><td style="min-height:46px">${val(S.a8.company)}</td></tr><tr><td class="lab">정부 · 국제사회</td><td>${val(S.a8.gov)}</td></tr></tbody></table>`);
    add(`<div class="q">8-3. 이번 프로젝트를 마치며 ‘나의 소비 다짐’을 한 문장으로 적어봅시다.</div>${box(S.a8.pledge)}`);
    // 평가지
    add(`<h1 style="letter-spacing:8px">평 가 지</h1><p style="text-align:center;font-size:14px">평가자 : 세계시민과 지리 ( ${esc(s.classNo)} )반 ( ${esc(s.number)} )번 이름 ( ${esc(s.name)} )</p>
      <div class="q">1. 자기 성찰</div><table><thead><tr><th>광고만 보았을 때와 상품 사슬을 따라간 뒤, 이 제품을 보는 나의 생각은 어떻게 달라졌나요?</th></tr></thead><tbody><tr><td style="min-height:110px;white-space:pre-wrap">${esc(S.eval.reflection)}&nbsp;</td></tr></tbody></table>`, true);
    return B;
  }

  function mapBlocks() {
    const prod = WS.product(), s = WS.student();
    const places = MAP.getPlaces(), legs = MAP.getLegsForWorksheet(), img = STORE.get('map:image');
    const tot = legs.reduce((a, l) => ({ land: a.land + (l.land || 0), sea: a.sea + (l.sea || 0) }), { land: 0, sea: 0 });
    const B = [];
    B.push({ html: `<h1>상품 사슬 지도 · ${prod ? esc(prod.name) : ''}</h1><p style="text-align:center">${esc(s.classNo)}반 ${esc(s.number)}번 ${esc(s.name)}</p>${img ? `<img class="map" src="${img}" alt="지도">` : '<div class="box tall" style="text-align:center;color:#888;padding-top:60px">(지도 이미지 없음)</div>'}
      <p class="hint" style="margin-top:6px">기호 : ★ 브랜드 본사 · ● 원료 생산지 · ■ 제조국·공장(원산지) · ◆ 유통(수입원·물류) · ▲ 판매·소비 지역 / 주황 점선 = 육상 운송(도로), 파란 실선 = 해상 운송(선박)</p>`, newPage: false });
    B.push({ html: `<h2>표시한 장소</h2><table><thead><tr><th style="width:120px">역할</th><th>지도 표시 이름</th><th style="width:150px">지명 · 나라</th><th style="width:120px">위도 / 경도</th></tr></thead><tbody>
      ${places.length ? places.map(p => `<tr><td>${DATA.ROLES[p.role].symbol} ${DATA.ROLES[p.role].name}</td><td>${esc(p.label || p.name)}</td><td>${esc(p.name)}${p.country ? ' · ' + esc(p.country) : ''}</td><td class="num">${(+p.lat).toFixed(1)} / ${(+p.lng).toFixed(1)}</td></tr>`).join('') : '<tr><td colspan="4">(장소 없음)</td></tr>'}</tbody></table>`, newPage: true });
    B.push({ html: `<h2>이동 구간과 거리 (육상 · 해상 구분)</h2><table><thead><tr><th>구간 (출발 → 도착)</th><th style="width:110px">이동 방법</th><th style="width:72px">육상 (km)</th><th style="width:72px">해상 (km)</th><th style="width:90px">합계 (km)</th></tr></thead><tbody>
      ${legs.length ? legs.map(l => `<tr><td>${esc(l.fromName)} → ${esc(l.toName)}${l.via && l.via.length ? `<div style="font-size:10px;color:#555">경유 항구 : ${esc(l.via.join(', '))}</div>` : ''}</td><td style="text-align:center">${esc(l.modeLabel)}</td><td class="num">${won(l.land)}</td><td class="num">${won(l.sea)}</td><td class="num">${won(l.total)}</td></tr>`).join('') : '<tr><td colspan="5">(구간 없음)</td></tr>'}
      <tr><td colspan="2" class="lab">전체 이동 거리</td><td class="num">${won(tot.land)}</td><td class="num">${won(tot.sea)}</td><td class="num">${won(tot.land + tot.sea)}</td></tr></tbody></table>
      <p class="hint">계산 기준(평균적인 추정) : 도로 = 두 지점 직선거리 × 1.3(도로 우회율) · 선박 = 주요 항로(수에즈·파나마 운하, 말라카·지브롤터 해협 등)를 따라 항구와 항구 사이를 계산 · 내륙 장소는 가장 가까운 항구까지 도로로 이동. 실제 운송 거리는 선사·시기에 따라 다릅니다.</p>`, newPage: false });
    return B;
  }

  // ── 렌더링·배치 ──
  async function renderBlocks(blocks, progress) {
    const root = document.getElementById('pdfRoot');
    root.innerHTML = '';
    const els = blocks.map(b => { const d = document.createElement('div'); d.className = 'pb'; d.innerHTML = b.html; root.appendChild(d); return d; });
    await document.fonts.ready;
    await Promise.all([...root.querySelectorAll('img')].map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));
    const out = [];
    for (let i = 0; i < els.length; i++) {
      if (progress) progress(`PDF 만드는 중… (${i + 1}/${els.length})`);
      const cv = await html2canvas(els[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: PX, windowWidth: PX });
      out.push({ canvas: cv, newPage: blocks[i].newPage });
    }
    root.innerHTML = '';
    return out;
  }

  async function headerCanvas() {
    const root = document.getElementById('pdfRoot');
    root.innerHTML = `<div class="hdr"><span>${esc(HEADER)}</span><span>${stuLine()}</span></div>`;
    await document.fonts.ready;
    const cv = await html2canvas(root.firstElementChild, { scale: 2, backgroundColor: '#ffffff', logging: false, width: PX, windowWidth: PX });
    root.innerHTML = '';
    return cv;
  }

  function placeOnPages(doc, items, hdr, startPage) {
    const usableH = A4.h - A4.top - A4.bottom;
    let page = startPage || 0, y = A4.top;
    const hdrH = pxToMm(hdr.width / 2) ? pxToMm(hdr.height / 2) : 8;
    const newPage = () => { if (page > 0) doc.addPage(); page++; y = A4.top; doc.addImage(hdr.toDataURL('image/png'), 'PNG', A4.m, 8, CW, hdrH); };
    if (page === 0) newPage();
    for (const it of items) {
      const wmm = CW, hmm = pxToMm(it.canvas.height / 2);
      if (it.newPage && y > A4.top) newPage();
      if (hmm <= usableH - (y - A4.top)) {
        doc.addImage(it.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', A4.m, y, wmm, hmm); y += hmm + 2;
      } else if (hmm <= usableH) {
        newPage(); doc.addImage(it.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', A4.m, y, wmm, hmm); y += hmm + 2;
      } else {
        // 한 쪽보다 긴 블록 : 잘라서 배치
        const pxPerMm = it.canvas.height / hmm;
        let off = 0;
        while (off < it.canvas.height) {
          let avail = usableH - (y - A4.top);
          if (avail < 30) { newPage(); avail = usableH; }
          const sliceH = Math.min(it.canvas.height - off, Math.floor(avail * pxPerMm));
          const c = document.createElement('canvas'); c.width = it.canvas.width; c.height = sliceH;
          c.getContext('2d').drawImage(it.canvas, 0, off, c.width, sliceH, 0, 0, c.width, sliceH);
          const h = sliceH / pxPerMm;
          doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', A4.m, y, wmm, h); y += h + 2; off += sliceH;
        }
      }
    }
    return page;
  }

  function pageNumbers(doc) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(10); doc.setTextColor(60); doc.text(`- ${i} -`, A4.w / 2, A4.h - 7, { align: 'center' }); }
  }

  function deliver(doc, name) {
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      const url = doc.output('bloburl');
      window.open(url, '_blank');
      STORE.toast('새 탭에서 PDF가 열립니다. ‘공유 → 파일에 저장’을 눌러 저장하세요.');
    } else {
      doc.save(name);
      STORE.toast(`PDF를 저장했습니다 : ${name}`);
    }
  }

  let busy = false;
  async function saveWorksheet(opts) {
    if (busy) return; busy = true;
    const progress = (opts && opts.progress) || (() => {});
    try {
      if (!STORE.get('map:image') && MAP.getPlaces().length) MAP.exportImage();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const hdr = await headerCanvas();
      const items = await renderBlocks(buildBlocks(), progress);
      let page = placeOnPages(doc, items, hdr, 0);
      if (opts && opts.withMap) {
        progress('지도 쪽 만드는 중…');
        const mitems = await renderBlocks(mapBlocks(), null);
        doc.addPage(); page++;
        placeOnPages(doc, [{ ...mitems[0], newPage: false }, ...mitems.slice(1)], hdr, page);
      }
      pageNumbers(doc);
      progress('');
      deliver(doc, fileName());
    } catch (e) { console.error(e); progress(''); STORE.toast('PDF를 만들지 못했습니다 : ' + (e.message || e)); }
    busy = false;
  }

  async function saveMapPdf() {
    if (busy) return; busy = true;
    try {
      if (MAP.getPlaces().length) MAP.exportImage();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const hdr = await headerCanvas();
      const items = await renderBlocks(mapBlocks(), null);
      placeOnPages(doc, items, hdr, 0);
      pageNumbers(doc);
      const s = WS.student();
      deliver(doc, fileName().replace('상품사슬활동지', '상품사슬지도'));
    } catch (e) { console.error(e); STORE.toast('지도 PDF를 만들지 못했습니다 : ' + (e.message || e)); }
    busy = false;
  }

  return { fileName, saveWorksheet, saveMapPdf };
})();
