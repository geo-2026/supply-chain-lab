/* 상품 사슬 탐험 — 제품·원료·부가가치·지명·항로 데이터
   모든 제품·브랜드·금액은 수업용 가상 자료입니다. 원료 가격은 「라벨 원료 가격_2026-08-01 기준.xlsx」를 따릅니다. */
'use strict';
window.DATA = (function () {

  // ───────────────────────── 지명 사전 (lat, lng) ─────────────────────────
  // port : 바다로 나갈 때 쓰는 해상 노드. 없으면 내륙 → 가장 가까운 항구까지 도로로 이동.
  const GAZ = [
    // 대한민국
    { id: 'seoul', name: '서울', country: '대한민국', lat: 37.57, lng: 126.98 },
    { id: 'incheon', name: '인천(항)', country: '대한민국', lat: 37.46, lng: 126.63, port: 'S_INCHEON' },
    { id: 'busan', name: '부산(항)', country: '대한민국', lat: 35.10, lng: 129.04, port: 'S_BUSAN' },
    { id: 'daegu', name: '대구', country: '대한민국', lat: 35.87, lng: 128.60 },
    { id: 'yeosu', name: '여수', country: '대한민국', lat: 34.76, lng: 127.66, port: 'S_YEOSU' },
    { id: 'ulsan', name: '울산', country: '대한민국', lat: 35.54, lng: 129.31, port: 'S_BUSAN' },
    { id: 'cheongju', name: '충청북도(청주)', country: '대한민국', lat: 36.64, lng: 127.49 },
    { id: 'suwon', name: '경기도(수원)', country: '대한민국', lat: 37.26, lng: 127.03 },
    { id: 'gwangju', name: '광주', country: '대한민국', lat: 35.16, lng: 126.85 },
    // 중국·대만·일본
    { id: 'beijing', name: '베이징', country: '중국', lat: 39.90, lng: 116.40 },
    { id: 'tianjin', name: '톈진(항)', country: '중국', lat: 39.08, lng: 117.20, port: 'S_TIANJIN' },
    { id: 'shanghai', name: '상하이(항)', country: '중국', lat: 31.23, lng: 121.47, port: 'S_SHANGHAI' },
    { id: 'nanjing', name: '장쑤성(난징)', country: '중국', lat: 32.06, lng: 118.80 },
    { id: 'hangzhou', name: '저장성(항저우)', country: '중국', lat: 30.27, lng: 120.15 },
    { id: 'ningbo', name: '저장성 닝보(항)', country: '중국', lat: 29.87, lng: 121.55, port: 'S_NINGBO' },
    { id: 'shenzhen', name: '광둥성 선전', country: '중국', lat: 22.54, lng: 114.06, port: 'S_HK' },
    { id: 'dongguan', name: '광둥성 둥관', country: '중국', lat: 23.02, lng: 113.75 },
    { id: 'hongkong', name: '홍콩(항)', country: '중국', lat: 22.32, lng: 114.17, port: 'S_HK' },
    { id: 'taipei', name: '타이베이', country: '대만', lat: 25.03, lng: 121.56, port: 'S_TAIWAN_N' },
    { id: 'kaohsiung', name: '가오슝(항)', country: '대만', lat: 22.63, lng: 120.30, port: 'S_TAIWAN_S' },
    { id: 'tokyo', name: '도쿄', country: '일본', lat: 35.68, lng: 139.69, port: 'S_TOKYO' },
    { id: 'osaka', name: '오사카', country: '일본', lat: 34.69, lng: 135.50, port: 'S_OSAKA' },
    // 동남아시아
    { id: 'hanoi', name: '하노이', country: '베트남', lat: 21.03, lng: 105.85 },
    { id: 'haiphong', name: '하이퐁(항)', country: '베트남', lat: 20.86, lng: 106.68, port: 'S_HAIPHONG' },
    { id: 'binhduong', name: '빈즈엉성', country: '베트남', lat: 10.98, lng: 106.65 },
    { id: 'hcmc', name: '호찌민(항)', country: '베트남', lat: 10.82, lng: 106.63, port: 'S_VUNGTAU' },
    { id: 'bangkok', name: '방콕', country: '태국', lat: 13.76, lng: 100.50, port: 'S_BANGKOK' },
    { id: 'suratthani', name: '수랏타니(남부 고무 농장)', country: '태국', lat: 9.14, lng: 99.33 },
    { id: 'kualalumpur', name: '쿠알라룸푸르', country: '말레이시아', lat: 3.14, lng: 101.69, port: 'S_KLANG' },
    { id: 'singapore', name: '싱가포르(항)', country: '싱가포르', lat: 1.35, lng: 103.82, port: 'S_SINGAPORE' },
    { id: 'manila', name: '마닐라', country: '필리핀', lat: 14.60, lng: 120.98, port: 'S_MANILA' },
    { id: 'jakarta', name: '자카르타(항)', country: '인도네시아', lat: -6.21, lng: 106.85, port: 'S_JAKARTA' },
    { id: 'bandung', name: '서자바주(반둥)', country: '인도네시아', lat: -6.91, lng: 107.61 },
    { id: 'morowali', name: '술라웨시 모로왈리(니켈)', country: '인도네시아', lat: -2.83, lng: 122.18, port: 'S_MOROWALI' },
    // 남아시아·중동
    { id: 'mumbai', name: '뭄바이', country: '인도', lat: 19.08, lng: 72.88, port: 'S_MUMBAI' },
    { id: 'colombo', name: '콜롬보', country: '스리랑카', lat: 6.93, lng: 79.85, port: 'S_LANKA' },
    { id: 'dubai', name: '두바이', country: '아랍에미리트', lat: 25.20, lng: 55.27, port: 'S_HORMUZ' },
    { id: 'abudhabi', name: '아부다비', country: '아랍에미리트', lat: 24.45, lng: 54.38, port: 'S_GULF_P' },
    { id: 'riyadh', name: '리야드', country: '사우디아라비아', lat: 24.71, lng: 46.68 },
    { id: 'rastanura', name: '라스타누라(원유 수출항)', country: '사우디아라비아', lat: 26.64, lng: 50.16, port: 'S_RASTANURA' },
    { id: 'kuwait', name: '쿠웨이트', country: '쿠웨이트', lat: 29.37, lng: 47.98, port: 'S_KUWAIT' },
    { id: 'jeddah', name: '제다', country: '사우디아라비아', lat: 21.49, lng: 39.19, port: 'S_RED' },
    { id: 'istanbul', name: '이스탄불', country: '튀르키예', lat: 41.01, lng: 28.98, port: 'S_BOSPORUS' },
    // 유럽
    { id: 'paris', name: '파리', country: '프랑스', lat: 48.86, lng: 2.35 },
    { id: 'lyon', name: '리옹', country: '프랑스', lat: 45.76, lng: 4.84 },
    { id: 'marseille', name: '마르세유(항)', country: '프랑스', lat: 43.30, lng: 5.37, port: 'S_MARSEILLE' },
    { id: 'lehavre', name: '르아브르(항)', country: '프랑스', lat: 49.49, lng: 0.11, port: 'S_LEHAVRE' },
    { id: 'london', name: '런던', country: '영국', lat: 51.51, lng: -0.13, port: 'S_LONDON' },
    { id: 'rotterdam', name: '로테르담(항)', country: '네덜란드', lat: 51.92, lng: 4.48, port: 'S_ROTTERDAM' },
    { id: 'amsterdam', name: '암스테르담', country: '네덜란드', lat: 52.37, lng: 4.90, port: 'S_ROTTERDAM' },
    { id: 'hamburg', name: '함부르크', country: '독일', lat: 53.55, lng: 9.99, port: 'S_HAMBURG' },
    { id: 'frankfurt', name: '프랑크푸르트', country: '독일', lat: 50.11, lng: 8.68 },
    { id: 'barcelona', name: '바르셀로나', country: '스페인', lat: 41.39, lng: 2.17, port: 'S_MED_W' },
    { id: 'milan', name: '밀라노', country: '이탈리아', lat: 45.46, lng: 9.19 },
    { id: 'odesa', name: '오데사(항)', country: '우크라이나', lat: 46.48, lng: 30.73, port: 'S_ODESA' },
    { id: 'kyiv', name: '키이우', country: '우크라이나', lat: 50.45, lng: 30.52 },
    { id: 'moscow', name: '모스크바', country: '러시아', lat: 55.76, lng: 37.62 },
    // 아프리카
    { id: 'ouaga', name: '와가두구', country: '부르키나파소', lat: 12.37, lng: -1.52 },
    { id: 'bobo', name: '보보디울라소(시어 농가)', country: '부르키나파소', lat: 11.18, lng: -4.29 },
    { id: 'abidjan', name: '아비장(항)', country: '코트디부아르', lat: 5.36, lng: -4.01, port: 'S_ABIDJAN' },
    { id: 'accra', name: '아크라·테마(항)', country: '가나', lat: 5.60, lng: -0.19, port: 'S_ACCRA' },
    { id: 'kumasi', name: '쿠마시(카카오 농가)', country: '가나', lat: 6.69, lng: -1.62 },
    { id: 'lagos', name: '라고스', country: '나이지리아', lat: 6.52, lng: 3.38, port: 'S_LAGOS' },
    { id: 'dakar', name: '다카르', country: '세네갈', lat: 14.72, lng: -17.47, port: 'S_DAKAR' },
    { id: 'kinshasa', name: '킨샤사', country: '콩고민주공화국', lat: -4.32, lng: 15.31 },
    { id: 'lubumbashi', name: '루붐바시(코발트 광산)', country: '콩고민주공화국', lat: -11.66, lng: 27.48 },
    { id: 'durban', name: '더반(항)', country: '남아프리카공화국', lat: -29.86, lng: 31.02, port: 'S_DURBAN' },
    { id: 'capetown', name: '케이프타운', country: '남아프리카공화국', lat: -33.92, lng: 18.42, port: 'S_CAPE' },
    { id: 'luanda', name: '루안다', country: '앙골라', lat: -8.84, lng: 13.23, port: 'S_ANGOLA' },
    { id: 'dar', name: '다르에스살람(항)', country: '탄자니아', lat: -6.79, lng: 39.28, port: 'S_DAR' },
    { id: 'mombasa', name: '몸바사(항)', country: '케냐', lat: -4.04, lng: 39.67, port: 'S_DAR' },
    { id: 'cairo', name: '카이로', country: '이집트', lat: 30.04, lng: 31.24, port: 'S_SUEZ_N' },
    // 북아메리카
    { id: 'portland', name: '오리건주 포틀랜드', country: '미국', lat: 45.52, lng: -122.68, port: 'S_PORTLAND' },
    { id: 'la', name: '로스앤젤레스(항)', country: '미국', lat: 34.05, lng: -118.24, port: 'S_LA' },
    { id: 'seattle', name: '시애틀', country: '미국', lat: 47.61, lng: -122.33, port: 'S_SEATTLE' },
    { id: 'lubbock', name: '텍사스주 러벅(면화 농가)', country: '미국', lat: 33.58, lng: -101.86 },
    { id: 'houston', name: '휴스턴(항)', country: '미국', lat: 29.76, lng: -95.37, port: 'S_HOUSTON' },
    { id: 'kansas', name: '캔자스(밀 농가)', country: '미국', lat: 38.50, lng: -98.00 },
    { id: 'chicago', name: '시카고', country: '미국', lat: 41.88, lng: -87.63 },
    { id: 'newyork', name: '뉴욕(항)', country: '미국', lat: 40.71, lng: -74.01, port: 'S_NY' },
    { id: 'miami', name: '마이애미', country: '미국', lat: 25.76, lng: -80.19, port: 'S_FLORIDA' },
    { id: 'vancouver', name: '밴쿠버', country: '캐나다', lat: 49.28, lng: -123.12, port: 'S_SEATTLE' },
    { id: 'mexicocity', name: '멕시코시티', country: '멕시코', lat: 19.43, lng: -99.13 },
    { id: 'panama', name: '파나마시티', country: '파나마', lat: 8.98, lng: -79.52, port: 'S_PANAMA_W' },
    // 남아메리카
    { id: 'saopaulo', name: '상파울루', country: '브라질', lat: -23.55, lng: -46.63 },
    { id: 'santos', name: '산투스(항)', country: '브라질', lat: -23.96, lng: -46.33, port: 'S_SANTOS' },
    { id: 'fortaleza', name: '포르탈레자(카나우바 산지)', country: '브라질', lat: -3.73, lng: -38.52, port: 'S_FORTALEZA' },
    { id: 'buenosaires', name: '부에노스아이레스(항)', country: '아르헨티나', lat: -34.60, lng: -58.38, port: 'S_BUENOS' },
    { id: 'santiago', name: '산티아고', country: '칠레', lat: -33.45, lng: -70.67 },
    { id: 'valparaiso', name: '발파라이소(항)', country: '칠레', lat: -33.05, lng: -71.62, port: 'S_VALPARAISO' },
    { id: 'antofagasta', name: '안토파가스타(리튬·구리)', country: '칠레', lat: -23.65, lng: -70.40, port: 'S_ANTOFAGASTA' },
    { id: 'lima', name: '리마·카야오(항)', country: '페루', lat: -12.05, lng: -77.04, port: 'S_CALLAO' },
    // 오세아니아
    { id: 'perth', name: '퍼스(리튬 광산 수출항)', country: '호주', lat: -31.95, lng: 115.86, port: 'S_PERTH' },
    { id: 'sydney', name: '시드니', country: '호주', lat: -33.87, lng: 151.21, port: 'S_SYDNEY' },
    { id: 'melbourne', name: '멜버른', country: '호주', lat: -37.81, lng: 144.96, port: 'S_MELBOURNE' },
    { id: 'brisbane', name: '브리즈번(사탕수수 산지)', country: '호주', lat: -27.47, lng: 153.03, port: 'S_BRISBANE' },
    { id: 'auckland', name: '오클랜드(낙농 지역)', country: '뉴질랜드', lat: -36.85, lng: 174.76, port: 'S_AUCKLAND' }
  ];

  // ───────────────────────── 해상 항로 노드·간선 (평균적인 주요 항로) ─────────────────────────
  const SEA_NODES = {
    S_INCHEON: [37.2, 126.2], S_TIANJIN: [38.6, 118.6], S_YELLOW: [35.5, 124.0], S_YEOSU: [34.5, 127.8], S_BUSAN: [34.9, 129.2],
    S_SHANGHAI: [30.8, 122.9], S_NINGBO: [29.8, 122.3], S_ECS: [28.0, 125.5], S_TAIWAN_N: [25.5, 121.9], S_TAIWAN_STRAIT: [24.0, 119.0],
    S_TAIWAN_S: [22.3, 120.2], S_HK: [22.0, 114.4], S_HAIPHONG: [20.6, 107.2], S_SCS: [15.0, 113.0], S_VUNGTAU: [10.2, 107.3],
    S_BANGKOK: [12.6, 100.8], S_MANILA: [14.4, 120.4], S_SINGAPORE: [1.2, 103.8], S_KLANG: [2.9, 101.2], S_MALACCA: [4.0, 99.0],
    S_ANDAMAN: [7.0, 95.0], S_JAKARTA: [-5.9, 106.8], S_SUNDA: [-7.0, 104.5], S_MAKASSAR: [-4.5, 118.0], S_MOROWALI: [-2.6, 122.4],
    S_CELEBES: [3.5, 120.5], S_TOKYO: [34.8, 139.8], S_OSAKA: [34.4, 135.2], S_JAPAN_E: [35.5, 142.0], S_NPAC_W: [42.0, 165.0],
    S_NPAC_E: [45.0, -160.0], S_SEATTLE: [48.3, -124.9], S_PORTLAND: [46.2, -124.4], S_LA: [33.6, -118.6], S_PANAMA_W: [7.3, -79.9],
    S_PANAMA_E: [9.5, -79.5], S_CARIB: [15.0, -75.0], S_HOUSTON: [29.0, -94.5], S_GULF: [25.5, -88.0], S_FLORIDA: [24.2, -80.5],
    S_NY: [40.3, -73.5], S_NATL: [45.0, -35.0], S_CHANNEL: [49.7, -3.0], S_LEHAVRE: [49.5, -0.3], S_LONDON: [51.4, 1.6],
    S_ROTTERDAM: [52.1, 3.8], S_HAMBURG: [54.1, 8.0], S_BISCAY: [45.0, -10.0], S_GIBRALTAR: [35.9, -5.8], S_MED_W: [38.5, 4.0],
    S_MARSEILLE: [43.1, 5.2], S_MED_C: [37.0, 13.0], S_MED_E: [34.0, 26.0], S_AEGEAN: [38.5, 25.5], S_BOSPORUS: [41.1, 29.1],
    S_BLACK: [43.8, 31.5], S_ODESA: [46.3, 31.0], S_SUEZ_N: [31.3, 32.4], S_SUEZ_S: [29.8, 32.6], S_RED: [20.0, 38.5],
    S_BAB: [12.5, 43.5], S_ADEN: [12.8, 48.5], S_ARAB: [14.0, 60.0], S_HORMUZ: [26.0, 56.8], S_GULF_P: [27.0, 51.5],
    S_RASTANURA: [26.7, 50.3], S_KUWAIT: [29.2, 48.6], S_MUMBAI: [18.8, 72.6], S_LANKA: [5.5, 80.5], S_CANARY: [27.5, -16.5],
    S_DAKAR: [14.5, -17.8], S_ABIDJAN: [5.0, -4.0], S_ACCRA: [5.4, -0.1], S_LAGOS: [6.2, 3.4], S_GUINEA: [0.0, 2.0],
    S_ANGOLA: [-9.0, 12.5], S_CAPE: [-35.0, 19.5], S_DURBAN: [-30.2, 31.6], S_DAR: [-6.9, 39.6], S_SIND: [-32.0, 60.0], S_PERTH: [-32.0, 115.3],
    S_FORTALEZA: [-3.4, -38.4], S_SANTOS: [-24.2, -46.1], S_BUENOS: [-35.0, -56.0], S_HORN: [-56.5, -66.0], S_VALPARAISO: [-33.0, -71.8],
    S_ANTOFAGASTA: [-23.6, -70.6], S_CALLAO: [-12.2, -77.3], S_SPAC: [-20.0, -130.0], S_AUCKLAND: [-36.6, 175.2], S_TASMAN: [-37.5, 160.0],
    S_SYDNEY: [-33.9, 151.5], S_MELBOURNE: [-38.5, 144.8], S_BASS: [-39.5, 140.0], S_BRISBANE: [-27.3, 153.5], S_CORAL: [-18.0, 155.0],
    S_PNG_N: [-2.0, 150.0], S_SPAC_W: [-10.0, 175.0], S_GUAM: [13.5, 145.0]
  };
  const SEA_EDGES = [
    ['S_INCHEON', 'S_YELLOW'], ['S_TIANJIN', 'S_YELLOW'], ['S_TIANJIN', 'S_INCHEON'], ['S_YELLOW', 'S_YEOSU'], ['S_YEOSU', 'S_BUSAN'],
    ['S_YELLOW', 'S_SHANGHAI'], ['S_SHANGHAI', 'S_NINGBO'], ['S_NINGBO', 'S_ECS'], ['S_SHANGHAI', 'S_ECS'], ['S_BUSAN', 'S_ECS'],
    ['S_YEOSU', 'S_ECS'], ['S_ECS', 'S_TAIWAN_N'], ['S_TAIWAN_N', 'S_TAIWAN_STRAIT'], ['S_TAIWAN_STRAIT', 'S_TAIWAN_S'],
    ['S_TAIWAN_S', 'S_HK'], ['S_TAIWAN_STRAIT', 'S_HK'], ['S_HK', 'S_SCS'], ['S_HK', 'S_HAIPHONG'], ['S_HAIPHONG', 'S_SCS'],
    ['S_SCS', 'S_VUNGTAU'], ['S_SCS', 'S_MANILA'], ['S_SCS', 'S_SINGAPORE'], ['S_VUNGTAU', 'S_SINGAPORE'], ['S_VUNGTAU', 'S_BANGKOK'],
    ['S_BANGKOK', 'S_SINGAPORE'], ['S_MANILA', 'S_TAIWAN_S'], ['S_MANILA', 'S_CELEBES'], ['S_CELEBES', 'S_MAKASSAR'],
    ['S_MAKASSAR', 'S_MOROWALI'], ['S_MAKASSAR', 'S_JAKARTA'], ['S_SINGAPORE', 'S_JAKARTA'], ['S_JAKARTA', 'S_SUNDA'],
    ['S_SUNDA', 'S_PERTH'], ['S_SUNDA', 'S_LANKA'], ['S_SINGAPORE', 'S_KLANG'], ['S_KLANG', 'S_MALACCA'], ['S_SINGAPORE', 'S_MALACCA'],
    ['S_MALACCA', 'S_ANDAMAN'], ['S_ANDAMAN', 'S_LANKA'], ['S_LANKA', 'S_MUMBAI'], ['S_LANKA', 'S_ARAB'], ['S_MUMBAI', 'S_ARAB'],
    ['S_ARAB', 'S_ADEN'], ['S_ARAB', 'S_HORMUZ'], ['S_HORMUZ', 'S_GULF_P'], ['S_GULF_P', 'S_RASTANURA'], ['S_GULF_P', 'S_KUWAIT'],
    ['S_RASTANURA', 'S_KUWAIT'], ['S_ADEN', 'S_BAB'], ['S_BAB', 'S_RED'], ['S_RED', 'S_SUEZ_S'], ['S_SUEZ_S', 'S_SUEZ_N'],
    ['S_SUEZ_N', 'S_MED_E'], ['S_MED_E', 'S_MED_C'], ['S_MED_E', 'S_AEGEAN'], ['S_AEGEAN', 'S_BOSPORUS'], ['S_BOSPORUS', 'S_BLACK'],
    ['S_BLACK', 'S_ODESA'], ['S_MED_C', 'S_MED_W'], ['S_MED_C', 'S_MARSEILLE'], ['S_MED_W', 'S_MARSEILLE'], ['S_MED_W', 'S_GIBRALTAR'],
    ['S_GIBRALTAR', 'S_BISCAY'], ['S_BISCAY', 'S_CHANNEL'], ['S_CHANNEL', 'S_LEHAVRE'], ['S_CHANNEL', 'S_LONDON'], ['S_CHANNEL', 'S_ROTTERDAM'],
    ['S_LONDON', 'S_ROTTERDAM'], ['S_ROTTERDAM', 'S_HAMBURG'], ['S_BISCAY', 'S_NATL'], ['S_CHANNEL', 'S_NATL'], ['S_NATL', 'S_NY'],
    ['S_GIBRALTAR', 'S_CANARY'], ['S_CANARY', 'S_DAKAR'], ['S_DAKAR', 'S_ABIDJAN'], ['S_ABIDJAN', 'S_ACCRA'], ['S_ACCRA', 'S_LAGOS'],
    ['S_LAGOS', 'S_GUINEA'], ['S_GUINEA', 'S_ANGOLA'], ['S_ANGOLA', 'S_CAPE'], ['S_CAPE', 'S_DURBAN'], ['S_DURBAN', 'S_SIND'],
    ['S_CAPE', 'S_SIND'], ['S_SIND', 'S_PERTH'], ['S_SIND', 'S_LANKA'], ['S_DURBAN', 'S_DAR'], ['S_DAR', 'S_LANKA'], ['S_DAR', 'S_ADEN'], ['S_CAPE', 'S_SANTOS'], ['S_DAKAR', 'S_FORTALEZA'],
    ['S_FORTALEZA', 'S_SANTOS'], ['S_SANTOS', 'S_BUENOS'], ['S_BUENOS', 'S_HORN'], ['S_HORN', 'S_VALPARAISO'],
    ['S_VALPARAISO', 'S_ANTOFAGASTA'], ['S_ANTOFAGASTA', 'S_CALLAO'], ['S_CALLAO', 'S_PANAMA_W'], ['S_PANAMA_W', 'S_PANAMA_E'],
    ['S_PANAMA_E', 'S_CARIB'], ['S_CARIB', 'S_FLORIDA'], ['S_CARIB', 'S_FORTALEZA'], ['S_FLORIDA', 'S_GULF'], ['S_GULF', 'S_HOUSTON'],
    ['S_FLORIDA', 'S_NY'], ['S_PANAMA_W', 'S_LA'], ['S_LA', 'S_PORTLAND'], ['S_PORTLAND', 'S_SEATTLE'], ['S_LA', 'S_NPAC_E'],
    ['S_PORTLAND', 'S_NPAC_E'], ['S_SEATTLE', 'S_NPAC_E'], ['S_NPAC_E', 'S_NPAC_W'], ['S_NPAC_W', 'S_JAPAN_E'], ['S_JAPAN_E', 'S_TOKYO'],
    ['S_TOKYO', 'S_OSAKA'], ['S_OSAKA', 'S_BUSAN'], ['S_TOKYO', 'S_ECS'], ['S_TOKYO', 'S_GUAM'], ['S_GUAM', 'S_ECS'], ['S_GUAM', 'S_PNG_N'],
    ['S_ECS', 'S_PNG_N'], ['S_MANILA', 'S_PNG_N'], ['S_PNG_N', 'S_CORAL'], ['S_CORAL', 'S_BRISBANE'], ['S_BRISBANE', 'S_SYDNEY'],
    ['S_SYDNEY', 'S_MELBOURNE'], ['S_MELBOURNE', 'S_BASS'], ['S_BASS', 'S_PERTH'], ['S_SYDNEY', 'S_TASMAN'], ['S_TASMAN', 'S_AUCKLAND'],
    ['S_AUCKLAND', 'S_SPAC_W'], ['S_SPAC_W', 'S_GUAM'], ['S_SPAC_W', 'S_PNG_N'], ['S_AUCKLAND', 'S_SPAC'], ['S_SPAC', 'S_VALPARAISO'],
    ['S_SPAC', 'S_PANAMA_W'], ['S_SPAC', 'S_LA'], ['S_AUCKLAND', 'S_LA'], ['S_NPAC_W', 'S_GUAM']
  ];

  // ───────────────────────── 제품 데이터 ─────────────────────────
  const PRODUCTS = [
    {
      id: 'lipbalm', no: 1, name: '립밤', full: '솔렌 시어 립밤 무향 4.5 g', brand: 'SOLÈNE · PARIS', slogan: '파리에서 온 촉촉함',
      price: 9800, priceLabel: '9,800원', unit: '1개', preTax: 8909, tax: 891,
      label: { origin: '프랑스 (Made in France)', maker: 'Laboratoires Solène SAS · 프랑스 리옹', hq: '브랜드 SOLÈNE · PARIS (프랑스 파리) / 책임판매업자(수입원) (주)솔렌코리아 · 서울' },
      hqText: '프랑스 / 파리',
      raw: [
        { material: '시어버터', origin: '부르키나파소', price: '7.24 USD/kg', cost: 16.24, basis: '1.575g (4.5g × 35%)' },
        { material: '밀납', origin: '중국', price: '9.6 USD/kg', cost: 15.38, basis: '1.125g (4.5g × 25%)' },
        { material: '코코넛오일', origin: '필리핀', price: '1,924 USD/t', cost: 1.85, basis: '0.675g (4.5g × 15%)' },
        { material: '해바라기씨오일', origin: '우크라이나', price: '1,377.5 USD/t', cost: 1.06, basis: '0.54g (4.5g × 12%)' },
        { material: '호호바씨오일', origin: '아르헨티나', price: '14.75 USD/kg', cost: 7.56, basis: '0.36g (4.5g × 8%)' },
        { material: '카나우바왁스', origin: '브라질', price: '16.4 USD/kg', cost: 4.73, basis: '0.2025g (4.5g × 4.5%)' },
        { material: '토코페롤(비타민 E)', origin: '프랑스', price: '미확인', cost: null, basis: '0.0225g (4.5g × 0.5%)' },
        { material: '용기 : PP 수지', origin: '대한민국(울산)', price: '8,973 CNY/t', cost: 9.47, basis: '용기 5g' },
        { material: '용기 원료 : 원유', origin: '사우디아라비아', price: '96.95 USD/배럴', cost: 10.12, basis: '원유 10g · 수지 가격에 포함되어 합계 제외', excluded: true }
      ],
      rawSum: 56.28, rawVA: 60, rawNote: '조사값 합계 56원에 원료 운송비를 더해 약 60원',
      va: {
        stages: [
          { key: '원료', place: '부르키나파소 · 중국 등', who: '시어 농가(부르키나파소), 양봉 농가(중국) 등', work: '시어 열매 채취, 밀랍·기름·수지 생산', buy: 0, sell: 60, va: 60, pct: 0.6 },
          { key: '제조', place: '프랑스 리옹', who: 'Laboratoires Solène (프랑스 리옹)', work: '배합·충전·포장, 제품 개발·브랜드 디자인', buy: 60, sell: 1800, va: 1740, pct: 17.8 },
          { key: '유통', place: '한국 (수입원)', who: '(주)솔렌코리아 (한국 수입원)', work: '수입·통관, 창고 보관, 운송, 광고', buy: 1800, sell: 5300, va: 3500, pct: 35.7 },
          { key: '판매', place: '한국 드럭스토어', who: '드럭스토어 · 온라인몰 (한국)', work: '매장 운영, 진열, 직원 판매', buy: 5300, sell: 8909, va: 3609, pct: 36.8 }
        ]
      },
      places: [
        { role: 'hq', gaz: 'paris', label: '브랜드 본사 SOLÈNE (파리)' },
        { role: 'raw', gaz: 'bobo', label: '시어버터 (부르키나파소)' },
        { role: 'raw', gaz: 'hangzhou', label: '밀납 (중국)' },
        { role: 'raw', gaz: 'manila', label: '코코넛오일 (필리핀)' },
        { role: 'raw', gaz: 'odesa', label: '해바라기씨오일 (우크라이나)' },
        { role: 'raw', gaz: 'buenosaires', label: '호호바씨오일 (아르헨티나)' },
        { role: 'raw', gaz: 'fortaleza', label: '카나우바왁스 (브라질)' },
        { role: 'raw', gaz: 'ulsan', label: 'PP 수지 (울산)' },
        { role: 'raw', gaz: 'ningbo', label: '용기 제조 (닝보)' },
        { role: 'factory', gaz: 'lyon', label: '제조 공장 Laboratoires Solène (리옹)' },
        { role: 'dist', gaz: 'seoul', label: '수입원 (주)솔렌코리아 (서울)' },
        { role: 'sale', gaz: 'seoul', label: '드럭스토어 · 온라인몰 (서울)', dx: 0.6, dy: -0.3 }
      ],
      legs: [[1, 9, 'ship'], [2, 9, 'ship'], [3, 9, 'ship'], [7, 8, 'ship'], [8, 9, 'ship'], [9, 10, 'ship'], [10, 11, 'road']]
    },
    {
      id: 'pen', no: 2, name: '컴퓨터용 사인펜', full: '한빛 OMR 사인펜 1상자(12자루)', brand: 'HANBIT · 한빛문구', slogan: '시험장의 든든한 한 자루',
      price: 6000, priceLabel: '6,000원 (12자루)', unit: '1상자(12자루)', preTax: 5455, tax: 545,
      label: { origin: '베트남 (Made in Vietnam)', maker: 'Hanbit Stationery Vina Co., Ltd. · 베트남 빈즈엉성', hq: '수입·판매원 (주)한빛문구 · 경기도' },
      hqText: '대한민국 / 경기도',
      raw: [
        { material: '몸체·캡 : PP 수지', origin: '대한민국(여수)', price: '8,973 CNY/t', cost: 113.58, basis: '60g (5g × 12자루)' },
        { material: 'PP 원료 : 원유', origin: '쿠웨이트', price: '96.95 USD/배럴', cost: 121.46, basis: '원유 120g · 수지 가격에 포함되어 합계 제외', excluded: true },
        { material: '펜촉 : 폴리에스터 섬유', origin: '중국(장쑤성)', price: '7,558 CNY/t', cost: 1.91, basis: '1.2g (0.1g × 12)' },
        { material: '잉크 : 카본블랙 안료', origin: '일본', price: '미확인', cost: null, basis: '0.9g (잉크 1.5g × 5% × 12)' }
      ],
      rawSum: 115.49, rawVA: 120, rawNote: '조사값 합계에 가격을 찾지 못한 잉크 재료 약 4원을 더해 약 120원',
      va: {
        stages: [
          { key: '원료', place: '한국 · 중국 · 일본 · 쿠웨이트', who: '석유화학 공장(한국 여수), 섬유 공장(중국), 안료 공장(일본) 등', work: '원유로 PP 수지 생산, 펜촉 섬유·잉크 안료 생산', buy: 0, sell: 120, va: 120, pct: 2.0 },
          { key: '제조', place: '베트남 빈즈엉', who: 'Hanbit Stationery Vina (베트남 빈즈엉성)', work: '몸체·캡 사출, 잉크 충전, 조립·포장', buy: 120, sell: 1500, va: 1380, pct: 23.0 },
          { key: '유통', place: '한국 (주)한빛문구', who: '(주)한빛문구 (한국 수입·판매원)', work: '수입·통관, 품질 검사, 문구점으로 운송', buy: 1500, sell: 3300, va: 1800, pct: 30.0 },
          { key: '판매', place: '한국 문구점 · 매점', who: '문구점 · 학교 매점 (한국)', work: '가게 운영, 진열, 판매', buy: 3300, sell: 5455, va: 2155, pct: 35.9 }
        ]
      },
      places: [
        { role: 'hq', gaz: 'suwon', label: '브랜드 본사 (주)한빛문구 (경기도)' },
        { role: 'raw', gaz: 'kuwait', label: '원유 (쿠웨이트)' },
        { role: 'raw', gaz: 'yeosu', label: 'PP 수지 (여수)' },
        { role: 'raw', gaz: 'nanjing', label: '펜촉 섬유 (중국 장쑤성)' },
        { role: 'raw', gaz: 'tokyo', label: '카본블랙 안료 (일본)' },
        { role: 'factory', gaz: 'binhduong', label: '제조 공장 Hanbit Vina (베트남 빈즈엉)' },
        { role: 'dist', gaz: 'suwon', label: '수입·판매원 (주)한빛문구 (경기도)', dx: 0.5, dy: -0.4 },
        { role: 'sale', gaz: 'seoul', label: '문구점 · 학교 매점 (서울)' }
      ],
      legs: [[1, 2, 'ship'], [2, 5, 'ship'], [3, 5, 'ship'], [4, 5, 'ship'], [5, 6, 'ship'], [6, 7, 'road']]
    },
    {
      id: 'shoes', no: 3, name: '운동화', full: '노르벤 에어 러너 2 · 1켤레', brand: 'NORVEN', slogan: '가볍게, 더 멀리',
      price: 89000, priceLabel: '89,000원', unit: '1켤레', preTax: 80909, tax: 8091,
      label: { origin: '인도네시아 (Made in Indonesia)', maker: 'PT Norven Footwear Indonesia · 인도네시아 서자바주', hq: '브랜드 본사 Norven Athletics Inc. · 미국 오리건주 포틀랜드 / 수입·판매원 노르벤코리아(유) · 서울' },
      hqText: '미국 / 오리건주 포틀랜드',
      raw: [
        { material: '갑피 : 폴리에스터 원사', origin: '중국', price: '8,800 CNY/t', cost: 111.39, basis: '60g' },
        { material: '갑피 : 합성피혁(PU)', origin: '베트남', price: '17,867 CNY/t (MDI 대용)', cost: 150.77, basis: '40g' },
        { material: '안감 : 폴리에스터 원단', origin: '대만', price: '9,050 CNY/t', cost: 57.28, basis: '30g' },
        { material: '깔창 : EVA 수지', origin: '대한민국', price: '10,066 CNY/t', cost: 212.35, basis: '100g' },
        { material: '밑창 : 천연고무', origin: '태국', price: '2,155 USD/t', cost: 138.09, basis: '45g (150g × 30%)' },
        { material: '밑창 : 합성고무', origin: '대한민국', price: '13,300 CNY/t', cost: 294.61, basis: '105g (150g × 70%)' }
      ],
      rawSum: 964.48, rawVA: 1000, rawNote: '조사값 합계를 반올림해 약 1,000원',
      va: {
        stages: [
          { key: '원료', place: '태국 · 중국 · 대만 · 한국 등', who: '고무 농가(태국), 섬유 공장(중국·대만), 석유화학 공장(한국) 등', work: '천연고무 채취, 원사·EVA·합성고무 생산', buy: 0, sell: 1000, va: 1000, pct: 1.1 },
          { key: '제조', place: '인도네시아 서자바', who: 'PT Norven Footwear (인도네시아 서자바주)', work: '재단, 봉제, 밑창 접착, 검사·포장', buy: 1000, sell: 16000, va: 15000, pct: 16.9 },
          { key: '유통', place: '미국 오리건 · 한국', who: 'Norven 본사(미국 오리건) · 노르벤코리아', work: '디자인·광고·브랜드 관리, 수입·관세·운송', buy: 16000, sell: 44000, va: 28000, pct: 31.5 },
          { key: '판매', place: '한국 매장 · 온라인', who: '공식 매장 · 온라인 스토어 (한국)', work: '매장 임대·운영, 판매 직원, 행사', buy: 44000, sell: 80909, va: 36909, pct: 41.5 }
        ]
      },
      places: [
        { role: 'hq', gaz: 'portland', label: '브랜드 본사 Norven (오리건주 포틀랜드)' },
        { role: 'raw', gaz: 'shanghai', label: '폴리에스터 원사 (중국)' },
        { role: 'raw', gaz: 'hcmc', label: '합성피혁 (베트남)' },
        { role: 'raw', gaz: 'kaohsiung', label: '안감 원단 (대만)' },
        { role: 'raw', gaz: 'yeosu', label: 'EVA·합성고무 (대한민국)' },
        { role: 'raw', gaz: 'suratthani', label: '천연고무 (태국)' },
        { role: 'factory', gaz: 'bandung', label: '제조 공장 PT Norven (인도네시아 서자바)' },
        { role: 'dist', gaz: 'seoul', label: '수입원 노르벤코리아 (서울)' },
        { role: 'sale', gaz: 'seoul', label: '공식 매장 · 온라인 스토어 (서울)', dx: 0.6, dy: -0.3 }
      ],
      legs: [[1, 6, 'ship'], [2, 6, 'ship'], [3, 6, 'ship'], [4, 6, 'ship'], [5, 6, 'ship'], [6, 7, 'ship'], [7, 8, 'road']]
    },
    {
      id: 'hoodie', no: 4, name: '교복 후드 집업', full: '에듀핏 후드 집업 95(M) · 1벌', brand: 'EDUFIT SCHOOLWEAR', slogan: '교실에서 운동장까지',
      price: 52000, priceLabel: '52,000원', unit: '1벌', preTax: 47273, tax: 4727,
      label: { origin: '대한민국 (Made in Korea · 봉제)', maker: '(주)에듀핏 대구공장 · 대구광역시', hq: '판매원 (주)에듀핏 · 서울' },
      hqText: '대한민국 / 서울',
      raw: [
        { material: '면 (80%) : 면화', origin: '미국(텍사스주)', price: '1.96 USD/kg', cost: 1339.70, basis: '480g (600g × 80%)' },
        { material: '폴리에스터 (20%) : 원사', origin: '중국(저장성)', price: '7,558 CNY/t', cost: 191.33, basis: '120g (600g × 20%)' }
      ],
      rawSum: 1531.03, rawVA: 1500, rawNote: '조사값 합계를 반올림해 약 1,500원',
      va: {
        stages: [
          { key: '원료', place: '미국 텍사스 · 중국 저장성', who: '면화 농가(미국 텍사스), 섬유 공장(중국 저장성)', work: '면화 재배·수확, 폴리에스터 원사 생산', buy: 0, sell: 1500, va: 1500, pct: 2.9 },
          { key: '제조', place: '베트남 빈즈엉 → 한국 대구', who: '원단 공장(베트남) → (주)에듀핏 대구공장', work: '실 뽑기·원단 짜기·염색 → 재단·봉제·지퍼 달기', buy: 1500, sell: 18000, va: 16500, pct: 31.7, note: '베트남 원단 공장 3,000원 + 대구 봉제공장 13,500원' },
          { key: '유통', place: '한국 서울', who: '(주)에듀핏 본사 (한국 서울)', work: '디자인·학교 계약, 창고 보관, 판매점으로 운송', buy: 18000, sell: 30000, va: 12000, pct: 23.1 },
          { key: '판매', place: '한국 교복 판매점', who: '지정 교복 판매점 (한국)', work: '치수 재기, 이름 자수, 판매·교환', buy: 30000, sell: 47273, va: 17273, pct: 33.2 }
        ]
      },
      places: [
        { role: 'hq', gaz: 'seoul', label: '브랜드 본사 (주)에듀핏 (서울)' },
        { role: 'raw', gaz: 'lubbock', label: '면화 (미국 텍사스)' },
        { role: 'raw', gaz: 'hangzhou', label: '폴리에스터 원사 (중국 저장성)' },
        { role: 'factory', gaz: 'binhduong', label: '원단 공장 편직·염색 (베트남 빈즈엉)' },
        { role: 'factory', gaz: 'daegu', label: '봉제 공장 (주)에듀핏 대구공장' },
        { role: 'dist', gaz: 'seoul', label: '(주)에듀핏 본사 물류 (서울)', dx: 0.6, dy: -0.3 },
        { role: 'sale', gaz: 'seoul', label: '지정 교복 판매점 (서울)', dx: -0.6, dy: -0.3 }
      ],
      legs: [[1, 3, 'ship'], [2, 3, 'ship'], [3, 4, 'ship'], [4, 5, 'road'], [5, 6, 'road']]
    },
    {
      id: 'earbuds', no: 5, name: '무선 이어폰', full: '소노리아 버즈 S2 · 1세트', brand: 'SONORIA', slogan: '귀에 쏙, 소리는 크게',
      price: 79000, priceLabel: '79,000원', unit: '1세트', preTax: 71818, tax: 7182,
      label: { origin: '중국 (Made in China)', maker: 'Shenzhen Sonoria Electronics Co., Ltd. · 중국 광둥성 선전', hq: '브랜드 본사(판매원) (주)소노리아 · 서울' },
      hqText: '대한민국 / 서울',
      raw: [
        { material: '배터리 : 리튬(탄산리튬)', origin: '호주, 칠레', price: '143,350 CNY/t', cost: 39.31, basis: '1.3g' },
        { material: '배터리 : 코발트', origin: '콩고민주공화국', price: '26.2 USD/lb', cost: 148.05, basis: '1.8g' },
        { material: '배터리 : 니켈', origin: '인도네시아', price: '17,100 USD/t', cost: 12.18, basis: '0.5g' },
        { material: '배터리 : 흑연(음극재)', origin: '중국', price: '미확인', cost: null, basis: '1.85g' },
        { material: '외장 : ABS 수지', origin: '대한민국(여수)', price: '9,617 CNY/t', cost: 20.29, basis: '10g' },
        { material: 'ABS 원료 : 원유', origin: '사우디아라비아', price: '96.95 USD/배럴', cost: 20.24, basis: '원유 20g · 합계 제외', excluded: true },
        { material: '외장 : PC 수지', origin: '대만', price: '13,983 CNY/t', cost: 23.60, basis: '8g' },
        { material: 'PC 원료 : 원유', origin: '아랍에미리트', price: '96.95 USD/배럴', cost: 16.19, basis: '원유 16g · 합계 제외', excluded: true },
        { material: '이어팁 : 실리콘', origin: '중국(둥관)', price: '12,650 CNY/t', cost: 5.34, basis: '2g' }
      ],
      rawSum: 248.77, rawVA: 300, rawNote: '조사값 합계에 가격을 찾지 못한 흑연 등을 더해 약 300원으로 추정',
      va: {
        stages: [
          { key: '원료', place: '콩고민주공화국 · 호주 · 칠레 등', who: '광산(콩고민주공화국·호주·칠레·인도네시아), 석유화학 공장(한국·대만)', work: '코발트·리튬·니켈 채굴, 플라스틱 수지 생산', buy: 0, sell: 300, va: 300, pct: 0.4 },
          { key: '제조', place: '중국 선전', who: 'Shenzhen Sonoria Electronics (중국 선전)', work: '배터리 셀(중국)·칩(대만) 등 부품 생산과 조립·검사', buy: 300, sell: 24000, va: 23700, pct: 30.0 },
          { key: '유통', place: '한국 서울', who: '(주)소노리아 본사 (한국 서울)', work: '제품 기획·디자인·소프트웨어, 광고, 수입·물류', buy: 24000, sell: 46000, va: 22000, pct: 27.8 },
          { key: '판매', place: '한국 전자제품 매장', who: '전자제품 매장 · 온라인 스토어 (한국)', work: '매장 운영, 체험 진열, 판매·A/S 접수', buy: 46000, sell: 71818, va: 25818, pct: 32.7 }
        ]
      },
      places: [
        { role: 'hq', gaz: 'seoul', label: '브랜드 본사 (주)소노리아 (서울)' },
        { role: 'raw', gaz: 'lubumbashi', label: '코발트 (콩고민주공화국)' },
        { role: 'raw', gaz: 'perth', label: '리튬 (호주)' },
        { role: 'raw', gaz: 'antofagasta', label: '리튬 (칠레)' },
        { role: 'raw', gaz: 'morowali', label: '니켈 (인도네시아)' },
        { role: 'raw', gaz: 'yeosu', label: 'ABS 수지 (여수)' },
        { role: 'raw', gaz: 'kaohsiung', label: 'PC 수지 (대만)' },
        { role: 'raw', gaz: 'nanjing', label: '배터리 셀 (중국 장쑤성)' },
        { role: 'factory', gaz: 'shenzhen', label: '제조 공장 Sonoria Electronics (선전)' },
        { role: 'dist', gaz: 'seoul', label: '(주)소노리아 본사 물류 (서울)', dx: 0.6, dy: -0.3 },
        { role: 'sale', gaz: 'seoul', label: '전자제품 매장 · 온라인 (서울)', dx: -0.6, dy: -0.3 }
      ],
      legs: [[1, 7, 'ship'], [2, 7, 'ship'], [3, 7, 'ship'], [4, 7, 'ship'], [7, 8, 'ship'], [5, 8, 'ship'], [6, 8, 'ship'], [8, 9, 'ship'], [9, 10, 'road']]
    },
    {
      id: 'cookie', no: 6, name: '초코칩 쿠키', full: '달콤공방 초코칩 쿠키 1봉(180 g)', brand: '달콤공방', slogan: '오늘도 갓 구운 행복',
      price: 4500, priceLabel: '4,500원 (1봉)', unit: '1봉(180g)', preTax: 4091, tax: 409,
      label: { origin: '대한민국 (충청북도)', maker: '달콤공방(주) · 충청북도', hq: '달콤공방(주) · 충청북도' },
      hqText: '대한민국 / 충청북도',
      raw: [
        { material: '밀가루 : 밀', origin: '미국, 호주', price: '310 USD/t', cost: 27.81, basis: '63g (180g × 35%)' },
        { material: '코코아매스 : 카카오', origin: '가나', price: '5.61 USD/kg', cost: 115.04, basis: '14.4g' },
        { material: '코코아버터 : 카카오', origin: '코트디부아르', price: '5.61 USD/kg', cost: 43.14, basis: '5.4g' },
        { material: '코코아분말', origin: '네덜란드', price: '5.61 USD/kg (원두 대용)', cost: 43.14, basis: '5.4g (180g × 3%)' },
        { material: '설탕 : 원당', origin: '호주', price: '0.34 USD/kg', cost: 17.43, basis: '36g (180g × 20%)' },
        { material: '초콜릿칩 속 설탕', origin: '국산', price: '0.34 USD/kg', cost: 7.84, basis: '16.2g' },
        { material: '버터 : 우유', origin: '뉴질랜드', price: '3,960 EUR/t (EU 가격 대용)', cost: 210.44, basis: '32.4g (180g × 18%)' },
        { material: '팜유', origin: '말레이시아', price: '1,101 USD/t', cost: 22.58, basis: '14.4g (180g × 8%)' },
        { material: '계란', origin: '국산', price: '2,256원/10개', cost: 50.76, basis: '14.4g' },
        { material: '유당 : 우유', origin: '국산', price: '882원/L', cost: 17.13, basis: '우유 20g' },
        { material: '대두레시틴 : 대두', origin: '국산', price: '459 USD/t', cost: 0.13, basis: '0.2g' }
      ],
      rawSum: 555.43, rawVA: 560, rawNote: '조사값 합계를 반올림해 약 560원',
      va: {
        stages: [
          { key: '원료', place: '가나 · 코트디부아르 · 미국 · 뉴질랜드 등', who: '카카오 농가(가나·코트디부아르), 밀 농가(미국·호주), 낙농가(뉴질랜드), 양계 농가(한국) 등', work: '카카오·밀·사탕수수 재배, 버터·우유·계란 생산', buy: 0, sell: 560, va: 560, pct: 12.4 },
          { key: '제조', place: '한국 충청북도', who: '달콤공방(주) (한국 충청북도)', work: '반죽, 굽기, 식히기, 포장, 위생 검사', buy: 560, sell: 1900, va: 1340, pct: 29.8 },
          { key: '유통', place: '한국 식품 도매 · 물류센터', who: '식품 도매 · 물류센터 (한국)', work: '창고 보관, 편의점·마트로 운송', buy: 1900, sell: 2700, va: 800, pct: 17.8 },
          { key: '판매', place: '한국 편의점 · 마트', who: '편의점 · 마트 (한국)', work: '가게 운영, 진열, 1+1 행사, 판매', buy: 2700, sell: 4091, va: 1391, pct: 30.9 }
        ]
      },
      places: [
        { role: 'hq', gaz: 'cheongju', label: '달콤공방(주) 본사·공장 (충청북도)' },
        { role: 'raw', gaz: 'kansas', label: '밀 (미국 캔자스)' },
        { role: 'raw', gaz: 'kumasi', label: '카카오 (가나)' },
        { role: 'raw', gaz: 'abidjan', label: '카카오 (코트디부아르)' },
        { role: 'raw', gaz: 'amsterdam', label: '코코아분말 (네덜란드)' },
        { role: 'raw', gaz: 'brisbane', label: '원당 (호주)' },
        { role: 'raw', gaz: 'auckland', label: '버터 (뉴질랜드)' },
        { role: 'raw', gaz: 'kualalumpur', label: '팜유 (말레이시아)' },
        { role: 'factory', gaz: 'cheongju', label: '제조 공장 달콤공방 (충청북도)', dx: 0.5, dy: -0.4 },
        { role: 'dist', gaz: 'suwon', label: '식품 도매 · 물류센터 (경기도)' },
        { role: 'sale', gaz: 'seoul', label: '편의점 · 마트 (서울)' }
      ],
      legs: [[1, 8, 'ship'], [2, 8, 'ship'], [3, 8, 'ship'], [5, 8, 'ship'], [6, 8, 'ship'], [7, 8, 'ship'], [8, 9, 'road'], [9, 10, 'road']]
    }
  ];

  const ROLES = {
    hq: { name: '브랜드 본사', color: '#7c3aed', symbol: '★' },
    raw: { name: '원료 생산지', color: '#16a34a', symbol: '●' },
    factory: { name: '제조국·공장(원산지)', color: '#ea580c', symbol: '■' },
    dist: { name: '유통(수입원·물류)', color: '#0891b2', symbol: '◆' },
    sale: { name: '판매·소비 지역', color: '#dc2626', symbol: '▲' }
  };

  const BREAD = { rows: [['원료', '농부가 밀을 길러 판다', 0, 100], ['제조', '제분소·제빵 공장이 빵을 만든다', 100, 500], ['유통', '도매상이 가게까지 실어 나른다', 500, 700], ['판매', '빵집이 손님에게 판다 (세금 제외)', 700, 1000]], answers: [100, 400, 200, 300], sum: 1000 };

  const gazById = {};
  GAZ.forEach(g => { gazById[g.id] = g; });
  const productById = {};
  PRODUCTS.forEach(p => { productById[p.id] = p; });

  return { GAZ, gazById, SEA_NODES, SEA_EDGES, PRODUCTS, productById, ROLES, BREAD,
    ROAD_FACTOR: 1.3, // 도로는 직선거리의 약 1.3배 (평균적인 우회율)
    VERSION: '1.1.0' };
})();
