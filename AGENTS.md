# AGENTS.md

이 저장소를 처음 받은 사람(또는 에이전트)이 **바로 이어서 작업할 수 있도록** 정리한 인수인계 문서입니다.

## 1. 프로젝트 개요

**Ramga Enhans Portfolio** — Enhans Forward Deployed Engineer 지원용 1인 포트폴리오 사이트(김가람).
스크롤 스토리텔링 + 프로젝트 카드 + **RAG 챗봇** + **로그인 기반 인라인 텍스트 편집** 기능을 가진 단일 페이지 앱.

- 프론트: React 19 + Vite + TypeScript (`src/App.tsx` 본체 + dev 전용 `src/CommentMode.tsx`)
- 백엔드: Express(`server/index.ts`) — 챗봇 API + 콘텐츠 편집 API
- AI: **벡터(임베딩) 시맨틱 RAG** (Vertex AI 임베딩 + Gemini 생성), 미설정/실패 시 키워드·로컬 KB 폴백. 용어 클릭 시 일반 지식 정의(`term` 모드).
- 배포: Firebase Hosting(정적) + Cloud Run(`/api/**`) + Cloudflare 도메인(`portfolio.ramga.dev`)
- 그 외 기능: PDF 저장(브라우저 인쇄), 크롤러/AI봇 차단(robots/llms + X-Robots-Tag), VDPM 흐름도 임베드
- 섹션 순서: 소개(About, 경력·학력 하위 포함) → 지원 동기 → 스토리 2막 → 직무 매핑(Fit) → 현장 기록(프로젝트) → 마치며(메이킹+기술스택) → 연락처 → BGM

## 2. 빠른 시작

```bash
git clone https://github.com/RamGaku/portfolio.git
cd portfolio
npm install
npm run dev
```

- Web: http://127.0.0.1:5173
- API health: http://127.0.0.1:5173/api/health (Vite가 `/api`를 8787로 프록시)
- `npm run dev`는 `scripts/dev.mjs`가 Vite(웹)와 tsx(API)를 동시에 띄웁니다.

## 3. 디렉터리 구조

```
src/
  App.tsx          # 본체 UI: 섹션들 + 인라인 편집(Editable) + 챗봇 위젯
  CommentMode.tsx  # dev 전용 코멘트 오버레이(요소 클릭→id별 수정 코멘트 수집). prod 빌드에서 tree-shake
  vite-env.d.ts    # import.meta.env 타입
  main.tsx, styles.css
server/
  index.ts         # Express 엔드포인트
  content.ts       # 콘텐츠 오버라이드 파일 로드/저장(+캐시)
  rag/retriever.ts # 시맨틱/키워드 검색 + KB·프로필 병합 + 로컬 답변
  rag/vertex.ts    # Vertex AI(Gemini) 호출(+ term 용어모드) + 폴백
  rag/embeddings.ts# Vertex 임베딩(text-multilingual-embedding-002) + 코사인 유사도
  rag/profile.ts   # data/profile.md 의 ## 섹션을 KB 청크로 파싱
  types.ts
data/
  public-kb.json            # 챗봇 공개 경력 KB(원본, 프로젝트 카드 소스)
  profile.md                # 추가 KB(인적사항·경력·솔루션·메이킹·지원동기 등 ## 섹션)
  content-overrides.json    # 인라인 편집 저장본({ "키": "값" }), 기본 {}
public/
  vdpm-flow.html            # VDPM 흐름도(번들 아티팩트, iframe 임베드)
  assets/vdpm-flow.png      # 위 다이어그램 정적 스냅샷(인쇄용)
  robots.txt, llms.txt      # 크롤러/AI봇 차단
docs/                       # 기획/설계 메모
scripts/dev.mjs   # 웹+API 동시 실행
Dockerfile, firebase.json, .firebaserc  # 배포
```

## 4. 명령어

| 명령 | 설명 |
|------|------|
| `npm run dev` | 웹(5173) + API(8787) 동시 실행 |
| `npm run dev:web` / `npm run dev:api` | 개별 실행 |
| `npm run check` | `tsc -b --noEmit` 타입 체크 |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run server` | API 단독 실행(프로덕션은 `NODE_ENV=production`이면 `dist` 정적 서빙 포함) |
| `npm run preview` | 빌드 결과 미리보기 |

## 5. 아키텍처 핵심

### 5.1 RAG 챗봇
1. 프론트의 `scriptedIntents`(요구사항 추출만) + PDF 키워드는 클라이언트에서 즉답.
2. 그 외 `POST /api/chat { question, term? }` → `retrieveSemantic()`(Vertex 임베딩 코사인 유사도, 실패 시 키워드) → `answerWithVertex()` → 실패/미설정 시 `answerLocally()`.
3. KB 소스 = `data/public-kb.json` + `data/profile.md`(`##` 섹션을 청크로, `rag/profile.ts`). `kb.*` 인라인 편집 오버라이드도 병합.
4. `term: true`(기술 칩/용어 클릭) → KB 가드 없이 **일반 지식으로 용어 정의**. 일반 질문은 `isSensitiveQuestion()`이 계정·IP·VPN 등 민감 정보를 차단.

### 5.2 인라인 콘텐츠 편집 (가장 중요한 기능)
화면 텍스트는 원본(`App.tsx` 하드코딩 + `public-kb.json`)을 두고, **수정값만 오버라이드 레이어**로 덧씌웁니다.

- **관리자 진입**: 화면에서 키보드로 `admin` 입력(숨김 시퀀스) → 로그인 모달. 기본 계정 `admin42` / `0909`(서버 env `ADMIN_ID`/`ADMIN_PW`).
- 모든 `<Editable>`은 콘텐츠 키를 **DOM `id`로도 출력** → 요소를 id로 지목 가능(아래 5.4 코멘트 도구와 연동).
- **편집**: 로그인하면 텍스트가 `contentEditable`로 전환. 수정 → 하단 `저장` 버튼 → `POST /api/content`.
- **렌더 우선순위**: `draft(미저장) ?? overrides(서버 저장) ?? 기본값`.
- **키 규칙**(`src/App.tsx`의 `<Editable id=...>`):
  - `nav.*`, `story.<id>.*`, `flow.*`, `section.*`, `fit.<i>.*`, `project.<id>.*`, `chat.*` → **화면만** 반영
  - `kb.<id>.<field>` / `kb.<id>.<field>.<index>` → **챗봇 KB에도 반영**(`retriever.ts`가 병합)
- **챗봇 동기화 원리**: `retriever.loadKnowledge()`가 원본 KB에 `kb.*` 오버라이드를 매 호출 병합. `content.ts` 캐시는 저장 시 갱신되므로 **서버 재시작 없이** 챗봇 답변이 바뀜.

### 5.4 Dev 전용 코멘트 도구 (`src/CommentMode.tsx`)
`npm run dev`에서만 좌하단 **"코멘트 모드"** 토글이 보임(프로덕션 빌드에선 `import.meta.env.DEV`로 tree-shake). 켜면 요소 호버 시 id 라벨, 클릭 시 `id + 현재 텍스트`를 패널에 수집 → "전체 복사"로 수정 지시 목록을 뽑아 그대로 전달. same-origin iframe(VDPM 내부)도 잡힘. 스크린샷 없이 "id를 X로 바꿔줘"로 지시하는 워크플로우.

### 5.3 API 엔드포인트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 상태 + 모드(vertex-ready/local-kb) |
| GET | `/api/kb` | KB 목록(오버라이드 반영) |
| POST | `/api/chat` | `{ question, term? }` → 답변 (`term:true`면 용어 정의 모드) |
| GET | `/api/content` | 현재 오버라이드 객체(공개) |
| POST | `/api/admin/login` | `{ id, pw }` → `{ ok, token }`(랜덤 UUID) |
| POST | `/api/content` | 헤더 `Authorization: Bearer <token>` 필요, 오버라이드 저장 |

## 6. 환경 변수 (`.env`, `.env.example` 참고)

```
PORT=8787
ADMIN_ID=admin42
ADMIN_PW=0909
VERTEX_AI_ENABLED=false
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=global
VERTEX_AI_MODEL=gemini-3.1-pro-preview
# GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
```

- Vertex 활성화: `VERTEX_AI_ENABLED=true` + GCP 프로젝트 + `gcloud auth application-default login`(또는 서비스 계정 키).
- 미설정/인증 실패 시 자동으로 로컬 KB 답변 폴백.

## 7. 배포

- Firebase Hosting: site `ramga42`, public `dist`, 기본 프로젝트 `agentkim-production`(`.firebaserc`).
- `/api/**` → Cloud Run 서비스 `portfolio-api`(region `asia-northeast3`)로 rewrite(`firebase.json`).
- Cloud Run 컨테이너: `Dockerfile`(node:22-alpine, `npm run build` 후 `npm run server`, `PORT=8080`).
- 배포 절차(예): `npm run build` → 컨테이너 이미지 빌드/푸시 + Cloud Run 배포 → `firebase deploy --only hosting`.

## 8. 주의점 / 알아둘 것

- **로그인 토큰은 서버 메모리 보관**: 서버 재시작 시 재로그인 필요. 보안은 "가벼운 잠금" 수준(싱글페이지 포폴용).
- **Cloud Run 파일시스템은 휘발성**: `content-overrides.json`에 저장하는 인라인 편집은 로컬에선 영속되지만, Cloud Run에선 컨테이너 재시작/재배포 시 사라짐. 운영에서 편집 영속이 필요하면 Firestore/GCS 등 외부 저장소로 교체 필요.
- 편집 텍스트가 **두 출처**(App.tsx 상수 + public-kb.json)에 있다는 점을 항상 의식. 오버라이드는 그 위에 얹는 레이어.
- 민감 정보(계정/IP/내부 경로)는 `public-kb.json`에 넣지 않음. Obsidian 원본 볼트는 인덱스에 직접 투입 금지.
- **VDPM 다이어그램(`public/vdpm-flow.html`)은 번들 아티팩트** — 내부 SVG/라벨/크기를 소스에서 직접 수정 불가(body 패딩도 런타임 강제). 내용을 바꾸려면 깔끔한 SVG로 **재작성**해야 함. 인쇄용 `assets/vdpm-flow.png`는 수동 캡처본이라 변경 시 재캡처 필요.
- 챗봇 KB(`profile.md`) 수정은 **Cloud Run 재배포**해야 반영(정적 import가 아니라 서버 런타임 로드). 프론트 텍스트는 Hosting 배포만으로 반영.
- `git commit` 전 사용자 검토를 받는 것이 이 프로젝트 작업 규칙.
- 코드 스타일: 기존 파일의 네이밍·들여쓰기·관용구를 따를 것.

## 9. 참고 문서
- `docs/superpowers/specs/2026-06-16-inline-content-editing-design.md` — 인라인 편집 설계서
- `README.md` — 로컬 실행 / Vertex / 배포 요약
- `docs/` — 포트폴리오 기획/후보 프로젝트 메모

## 10. 미완 / 다음 작업 (2026-06-18 기준)
리뷰 코멘트 중 아직 미적용:
- **전자결재 프로젝트 DATA FLOW에 용어설명 term 버튼** 추가 + 챗봇 KB에 "영수증당 서브에이전트 병렬 처리, 비싼 Opus 대신 Sonnet 강제 지정으로 토큰 절약" 사실 추가.
- **VDPM 다이어그램 정리**(부제목/서브타이틀 제거, 내부 요소 확대, 패딩 0) — 아티팩트라 깔끔한 SVG 재작성이 정석.
- **현장 기록(work) 섹션 헤더 정렬** 점검.
- (선택) 콘텐츠 상수(projectDetails 등)를 `data` 모듈로 분리 — 크기 축소 효과는 낮음(이동일 뿐).
