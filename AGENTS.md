# AGENTS.md

이 저장소를 처음 받은 사람(또는 에이전트)이 **바로 이어서 작업할 수 있도록** 정리한 인수인계 문서입니다.

## 1. 프로젝트 개요

**Ramga Enhans Portfolio** — Enhans Forward Deployed Engineer 지원용 1인 포트폴리오 사이트(김가람).
스크롤 스토리텔링 + 프로젝트 카드 + **RAG 챗봇** + **로그인 기반 인라인 텍스트 편집** 기능을 가진 단일 페이지 앱.

- 프론트: React 19 + Vite + TypeScript (단일 `src/App.tsx`)
- 백엔드: Express(`server/index.ts`) — 챗봇 API + 콘텐츠 편집 API
- AI: Vertex AI(Gemini) RAG, 미설정/실패 시 로컬 KB 답변으로 폴백
- 배포: Firebase Hosting(정적) + Cloud Run(`/api/**`) + Vertex AI

## 2. 빠른 시작

```bash
git clone https://github.com/Ramga-kim/portfolio.git
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
  App.tsx          # 전체 UI + 인라인 편집 컴포넌트(Editable) + 챗봇 위젯
  main.tsx, styles.css
server/
  index.ts         # Express 엔드포인트
  content.ts       # 콘텐츠 오버라이드 파일 로드/저장(+캐시)
  rag/retriever.ts # 키워드 검색 + KB 오버라이드 병합 + 로컬 답변
  rag/vertex.ts    # Vertex AI(Gemini) 호출 + 폴백
  types.ts
data/
  public-kb.json            # 챗봇이 참조하는 공개 경력 KB(원본)
  content-overrides.json    # 인라인 편집 저장본({ "키": "값" }), 기본 {}
docs/
  superpowers/specs/2026-06-16-inline-content-editing-design.md  # 편집기능 설계서
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
1. 프론트의 `scriptedIntents`가 자주 묻는 질문은 클라이언트에서 즉답(섹션 점프 포함).
2. 그 외에는 `POST /api/chat` → `retrieve()`(키워드+동의어 확장 스코어링) → `answerWithVertex()`(Vertex 설정 시) → 실패/미설정 시 `answerLocally()`.
3. `isSensitiveQuestion()`이 계정·비밀번호·IP·VPN 등 민감 질문을 차단.

### 5.2 인라인 콘텐츠 편집 (가장 중요한 기능)
화면 텍스트는 원본(`App.tsx` 하드코딩 + `public-kb.json`)을 두고, **수정값만 오버라이드 레이어**로 덧씌웁니다.

- **로그인**: 우상단 `Admin` → 기본 계정 `admin42` / `0909` (서버 env `ADMIN_ID`/`ADMIN_PW`로 변경 가능).
- **편집**: 로그인하면 텍스트가 `contentEditable`로 전환. 수정 → 하단 `저장` 버튼 → `POST /api/content`.
- **렌더 우선순위**: `draft(미저장) ?? overrides(서버 저장) ?? 기본값`.
- **키 규칙**(`src/App.tsx`의 `<Editable id=...>`):
  - `nav.*`, `story.<id>.*`, `flow.*`, `section.*`, `fit.<i>.*`, `project.<id>.*`, `chat.*` → **화면만** 반영
  - `kb.<id>.<field>` / `kb.<id>.<field>.<index>` → **챗봇 KB에도 반영**(`retriever.ts`가 병합)
- **챗봇 동기화 원리**: `retriever.loadKnowledge()`가 원본 KB에 `kb.*` 오버라이드를 매 호출 병합. `content.ts` 캐시는 저장 시 갱신되므로 **서버 재시작 없이** 챗봇 답변이 바뀜.

### 5.3 API 엔드포인트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 상태 + 모드(vertex-ready/local-kb) |
| GET | `/api/kb` | KB 목록(오버라이드 반영) |
| POST | `/api/chat` | `{ question }` → 답변 |
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
- `git commit` 전 사용자 검토를 받는 것이 이 프로젝트 작업 규칙.
- 코드 스타일: 기존 파일의 네이밍·들여쓰기·관용구를 따를 것.

## 9. 참고 문서
- `docs/superpowers/specs/2026-06-16-inline-content-editing-design.md` — 인라인 편집 설계서
- `README.md` — 로컬 실행 / Vertex / 배포 요약
- `docs/` — 포트폴리오 기획/후보 프로젝트 메모
