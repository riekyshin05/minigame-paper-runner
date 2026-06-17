# 색종이 빼기

색종이가 섞여서 나오는 HTML5 반응형 미니게임입니다.  
색종이 색에 맞는 방향키를 빠르게 입력해서 최대한 많은 색종이를 넘기는 것이 목표입니다.

## 게임 규칙

- 빨간색 색종이: 위쪽 방향
- 파란색 색종이: 오른쪽 방향
- 노란색 색종이: 왼쪽 방향
- 주황색/당근색 색종이: 아래쪽 방향
- 정답을 맞히면 다음 색종이로 넘어가고 점수가 올라갑니다.
- 한 번이라도 틀리면 게임오버입니다.
- 연속으로 빠르게 맞히면 콤보가 이어집니다.
- 콤보 중에는 성공 시 점수가 2배로 올라갑니다.
- 콤보 유지 시간은 콤보가 높아질수록 점점 짧아집니다.
- 최고 점수는 브라우저 `localStorage`에 저장됩니다.

## 조작 방법

- 데스크톱: 키보드 방향키
- 모바일/터치 기기: 화면 하단 방향 버튼 또는 스와이프

## 주요 기능

- 순수 HTML, CSS, JavaScript 기반 정적 게임
- Web Audio API로 만든 배경음과 효과음
- 연속 성공 시 고조되는 넘김 효과음
- 콤보 숫자와 콤보 게이지 표시
- 최대 콤보와 최고 점수 표시
- 실제 다음 색종이를 미리 보여주는 색종이 스택
- 책상 위 학용품 느낌의 CSS 배경
- 외부 이미지와 사운드 파일 없이 실행 가능

## 실행 방법

프로젝트를 내려받은 뒤 `index.html`을 브라우저에서 열면 바로 실행됩니다.

```bash
git clone https://github.com/riekyshin05/minigame-paper-runner.git
cd minigame-paper-runner
```

간단한 로컬 서버로 실행하고 싶다면 아래처럼 실행할 수 있습니다.

```bash
python -m http.server 8000
```

그 다음 브라우저에서 `http://localhost:8000`에 접속합니다.

## 테스트

Node.js의 기본 테스트 러너로 게임 로직과 정적 UI 구조를 확인할 수 있습니다.

```bash
node --test game-core.test.mjs ui-static.test.mjs
```

문법 확인:

```bash
node --check game-core.js
node --check game.js
```

## 파일 구조

```text
.
├── index.html
├── styles.css
├── game-core.js
├── game.js
├── game-core.test.mjs
└── ui-static.test.mjs
```

## 배포

정적 파일만으로 구성되어 있어 GitHub Pages에 바로 배포할 수 있습니다.

1. GitHub 저장소에 파일을 업로드합니다.
2. 저장소의 `Settings`로 이동합니다.
3. `Pages` 메뉴에서 배포 소스를 `main` 브랜치의 루트 폴더로 설정합니다.
4. 배포가 완료되면 GitHub Pages URL에서 게임을 실행할 수 있습니다.