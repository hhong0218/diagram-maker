# 도식화 메이커 (Diagram Maker)

회원가입 없이 브라우저에서 바로 사용하는 무료 플로우차트·마인드맵 편집기입니다.

**라이브:** https://diagram.matchiq.co.kr

## 기능

- **플로우차트 편집기** — 사각형·시작/끝·조건(마름모)·연결점·입출력·문서 6종 도형, 더블클릭으로 노드 생성, 드래그 연결, 노드 자동 정렬(순환 그래프 지원)
- **마인드맵 편집기** — Tab 키로 자식 노드 추가, 레벨별 색상, 가지 높이를 고려한 자동 레이아웃
- **템플릿** — 업무 승인, 의사결정 트리, 온보딩, SW 개발 사이클, 고객 응대 / 프로젝트 기획, 브레인스토밍, SWOT, 학습 계획
- **편집 도구** — 실행 취소/다시 실행(최대 50단계), 복사/붙여넣기, 다중 선택, 인라인 텍스트 편집, 색상·연결선 스타일 변경, 줌·팬·전체 보기
- **저장 / 내보내기** — PNG(현재 뷰/전체), SVG(외부 뷰어 호환 화살표 마커), JSON 내보내기·불러오기
- **자동 저장** — 30초마다 + 페이지 이탈 시 localStorage에 저장, 재방문 시 이어서 작업
- **공유 링크** — 다이어그램 전체를 URL에 인코딩하여 서버 없이 공유

## 기술 스택

- 순수 HTML / CSS / JavaScript (프레임워크·빌드 도구 없음)
- SVG 기반 캔버스 렌더링
- [html2canvas](https://html2canvas.hertzen.com/) — PNG 내보내기 시에만 지연 로드
- localStorage 자동 저장 (서버·DB 없음, 모든 데이터는 사용자 기기에만 저장)

## 프로젝트 구조

```
index.html        메인 에디터 페이지
privacy.html      개인정보처리방침
css/style.css     전체 스타일
js/
  app.js          앱 초기화, 이벤트 바인딩, 상태 관리
  canvas.js       SVG 뷰포트 (줌/팬/좌표 변환)
  nodes.js        노드 모델·도형 path·렌더링
  connections.js  연결선 모델·path 계산·렌더링
  flowchart.js    플로우차트 자동 정렬 (레이어 배치)
  mindmap.js      마인드맵 자식 추가·자동 레이아웃
  templates.js    내장 템플릿 데이터·빌더
  history.js      실행 취소/다시 실행 스택
  storage.js      자동 저장·공유 URL 인코딩
  export.js       PNG/SVG/JSON 내보내기·불러오기
  utils.js        공용 유틸리티
```

## 배포

`main` 브랜치에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 Cloudflare Pages로 자동 배포합니다.

로컬에서 실행하려면 정적 서버로 열면 됩니다:

```bash
npx serve .
# 또는
python -m http.server 8000
```

## 라이선스

© 2026 도식화 메이커. All rights reserved.
