# 인라인 콘텐츠 편집 기능 설계

- 날짜: 2026-06-16
- 대상: ramga-enhans-portfolio (React 19 + Vite + Express 단일 포트폴리오 사이트)
- 목적: 재배포 없이, 웹페이지에서 직접 텍스트를 수정하고 서버에 반영한다.

## 1. 요구사항

- 상단에 `Admin` 로그인 버튼 1개. 고정 계정: id `admin42`, pw `0909`.
- 로그인하면 화면에 보이는 텍스트(div 단위)를 인라인으로 수정할 수 있다. **텍스트만** 수정(항목 추가/삭제 없음).
- 수정 후 `저장` 버튼을 누르면 변경분이 서버에 영속된다. 키 입력마다 저장하지 않는다.
- 프로젝트 카드의 KB 텍스트(제목·요약·evidence·기술 스택 등)를 수정하면 **챗봇(RAG) 답변에도 반영**된다(저장 즉시, 서버 재시작 불필요).
- 내러티브 텍스트(스토리 섹션, PROBLEM/ROLE/APPROACH/RESULT, Enhans Fit 카드 등)는 챗봇이 사용하지 않으므로 화면 표시만 바뀐다.
- 완벽한 보안은 목표가 아니다(싱글페이지 포폴용 "가벼운 잠금").

## 2. 핵심 아키텍처: 오버라이드 레이어

원본 텍스트(`src/App.tsx` 하드코딩 상수 + `data/public-kb.json`)는 그대로 둔다.
수정값만 `{ "키": "값" }` 형태로 `data/content-overrides.json`에 저장한다.

- 화면 렌더 = `draft[key] ?? overrides[key] ?? 기본값`
  - `overrides`: 서버에 저장된 값(로드 시 `GET /api/content`)
  - `draft`: admin이 수정 중이지만 아직 저장 안 한 값(클라이언트 메모리)
- 같은 오버라이드 파일을 **두 곳**에서 적용한다.
  1. 프론트엔드: 모든 편집 가능한 텍스트(`<Editable>` 컴포넌트)
  2. 서버 retriever: `kb.*` 키를 KB 엔트리에 병합 → 챗봇이 수정된 KB로 검색/답변

이 구조 덕분에 narrative 키(`story.*`, `project.*`, `fit.*`, `section.*`, `flow.*`, `nav.*`, `chat.*`)는 화면에만 영향을 주고, `kb.*` 키만 챗봇에 흘러간다.

### 키 네이밍 규칙

| 영역 | 키 예시 | 챗봇 반영 |
|------|---------|-----------|
| 네비 | `nav.name`, `nav.role` | X |
| 스토리 | `story.requirements.tag`, `story.requirements.title`, `story.requirements.body.0` | X |
| 플로우 다이어그램 | `flow.stage.0.key`, `flow.stage.0.item.1`, `flow.caption` | X |
| 섹션 헤더 | `section.fit.eyebrow/title/desc`, `section.work.*` | X |
| Enhans Fit | `fit.0.term/title/text` | X |
| 프로젝트 상세 | `project.<id>.problem`, `.role`, `.action.0`, `.outcome.0`, `.flow.0.label`, `.flow.0.meta`, `.layer.0.name`, `.layer.0.tech.0` | X |
| 챗봇 UI | `chat.title`, `chat.subtitle`, `chat.intro` | X |
| **KB 필드** | `kb.<id>.title`, `.summary`, `.category`, `.evidence.0`, `.technologies.0` | **O** |

서버 병합 규칙: 키가 `kb.<id>.<field>`(스칼라: title/period/category/summary) 또는 `kb.<id>.<field>.<index>`(배열: highlights/technologies/evidence/tags)이면 해당 엔트리 필드를 대체한다.

## 3. 서버 변경

### `server/content.ts` (신규)
- `loadOverrides()`: `data/content-overrides.json` 읽기(없으면 `{}`), 메모리 캐시.
- `saveOverrides(patch)`: 기존 + patch 머지 후 파일 기록, 캐시 갱신.

### `server/rag/retriever.ts`
- 원본 KB는 `cachedRaw`로만 캐시.
- `loadKnowledge()` = `cachedRaw` + `loadOverrides()` 병합 결과를 매 호출 반환(엔트리 9개, 비용 낮음).
- 저장 시 `content.ts` 캐시만 갱신되면 다음 `loadKnowledge()`가 자동으로 새 값 사용 → 챗봇 즉시 반영.

### `server/index.ts` (엔드포인트 추가)
- `GET /api/content` → 현재 오버라이드 객체 반환(공개).
- `POST /api/admin/login` `{ id, pw }` → 일치 시 `{ ok, token }`(랜덤 UUID), 토큰은 서버 메모리 `Set`에 저장. 불일치 시 401.
- `POST /api/content` (헤더 `Authorization: Bearer <token>`) → 토큰 검증 후 `saveOverrides`. 토큰 없으면 401.
- 계정/토큰: `ADMIN_ID`(기본 `admin42`), `ADMIN_PW`(기본 `0909`)는 env에서 오버라이드 가능.
- 입력 검증: zod `record(string, string)`, 키 ≤200자 / 값 ≤5000자.
- 신규 라우트는 production static catch-all(`app.get("*")`) 앞에 둔다.

## 4. 프론트엔드 변경 (`src/App.tsx`)

### EditContext + Editable
- `EditCtx`: `{ admin, resolve(id, fallback), setDraft(id, value, fallback), dirtyCount }`.
- `<Editable id value as className display multiline stop />`
  - 비-admin: `display ? display(text) : text`를 `as` 태그로 렌더(highlightKeywords, 타이틀 줄바꿈 등 기존 표현 유지).
  - admin: `contentEditable` + 점선 테두리. `onBlur`에서 텍스트 읽어 `setDraft`. 단일행은 Enter로 커밋(blur).
  - `stop`: 클릭 가능한 부모(fit-card, proj-head) 안에서 편집 시 클릭 전파 차단.
- 클릭 충돌 방지: admin 모드에서 `fit-card`/`proj-head`를 `<button>` 대신 `<div role="button">`로 렌더(contentEditable 안정성 + 네비/토글 충돌 회피).

### 상태/흐름
- 마운트 시 `GET /api/content`로 overrides 로드.
- `Admin` 버튼 → 로그인 모달 → `POST /api/admin/login` → 성공 시 token 저장, admin on.
- 편집 중 변경은 `draft`에 누적(서버 통신 없음).
- 하단 고정 `편집 바`: 변경 건수 표시, `되돌리기`(draft 초기화), `저장`(`POST /api/content`), `로그아웃`.
- 저장 성공: `overrides`에 draft 머지, draft 초기화. 401: 세션 만료 안내 후 로그아웃.

### 편집 동작 원리(재배포 불필요)
텍스트가 빌드에 고정되지 않고, 런타임에 서버 JSON에서 fetch한 overrides를 덧씌운다. 수정→저장→파일 갱신→모든 방문자가 새 텍스트를 본다. 프로덕션에서도 정적 번들 위에 런타임 fetch로 패치된다.

## 5. CSS (`src/styles.css` 추가)
- `.editable` hover/focus 점선·실선 아웃라인, `.editable-ml { white-space: pre-line }`, `.act-title.editable { display:block }`.
- `.admin-btn`, `.edit-bar`(하단 중앙 고정), `.modal-back` + `.login-box` 모달.

## 6. 비-목표 (YAGNI)
- 사용자 계정/권한 시스템, 세션 영속(서버 재시작 시 재로그인), 항목 추가/삭제, 이미지 편집, 다국어(EN) 편집, 버전 히스토리.

## 7. 보안 한계 (명시)
- 고정 계정이며 토큰은 메모리 보관. 저장 엔드포인트는 토큰으로만 보호된다. 민감정보는 KB에 두지 않는다는 기존 정책 유지(`isSensitiveQuestion`).
