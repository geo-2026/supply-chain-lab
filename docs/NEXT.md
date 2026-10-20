# 이어서 작업할 때 붙여 넣을 문구

아래 문구를 새 Claude Code 세션(작업 폴더 `C:\Users\Administrator\Desktop\Ai Work\c-chain`)에 그대로 붙여 넣으세요. 끝의 「이번에 할 일」만 바꾸면 됩니다.

---

C:\Users\Administrator\Desktop\Ai Work\c-chain 폴더의 `03_작업기록_상품사슬탐험앱.md`를 먼저 읽고 이어서 작업해 줘.

상황 요약 :
- ‘상품 사슬 탐험’ 앱(자료·지도·활동지 통합, HTML+CSS+바닐라 JS, 빌드 없음)이 `supply-chain-lab` 폴더에 있고, GitHub 계정 geo-2026의 공개 저장소 `supply-chain-lab`에서 GitHub Pages로 배포 중이다. 고정 주소 : https://geo-2026.github.io/supply-chain-lab/
- 요구사항은 `02_활동지_앱_요구사항.md`와 `가상 상품으로 따라가는 상품 사슬 프로젝트.pdf`를 따른다. 활동지 문항·순서는 PDF와 같아야 한다.
- 광고지는 data1, 라벨은 data2, 부가가치·원료 가격 자료는 data3 폴더가 원본이다(앱에는 이미지·표로 이미 들어 있음).
- 학생 기록은 단말기(IndexedDB)에만 저장하고, 최종 결과는 PDF로 다운로드한다. 이동 거리는 평균 기준(도로 = 직선거리 × 1.3, 선박 = 주요 항로 그래프)으로 계산하고 육상·해상을 구분해 표시한다.
- 수정 뒤에는 `sw.js`의 VERSION을 올리고 `git commit` → `git push origin main`으로 재배포한다. 배포 전 헤드리스 Chrome(puppeteer-core)으로 콘솔 오류·PDF 저장을 확인한다.

이번에 할 일 :
1. (여기에 적기 — 예 : 휴대폰 세로 화면에서 지도를 더 크게 보이게 해 줘)
2.

---

## 자주 쓰는 요청 예시
- “활동 3-2 표에 ‘원료 양(g)’ 열을 추가하고 PDF에도 반영해 줘.”
- “지명 사전에 ○○(나라)를 추가하고, 항로 노드에 ○○ 항구를 연결해 줘.”
- “학생 기록을 지우지 않고 앱만 업데이트되도록 서비스 워커 버전을 올려 재배포해 줘.”
- “활동지 PDF 첫 쪽에 배점 칸을 넣어 줘.”
