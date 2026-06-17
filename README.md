# Ramga Enhans Portfolio

김가람(Forward Deployed Engineer) 포트폴리오. React 19 + Vite 프론트엔드 + Express(Cloud Run) RAG 챗봇.
라이브: **https://portfolio.ramga.dev** (기본 주소: https://ramga42.web.app)

> 아키텍처·구조 상세는 [`AGENTS.md`](./AGENTS.md) 참고. 이 문서는 **다른 PC에서 이어서 작업 + 인증 + 배포** 실전 가이드.

---

## 1. 다른 PC에서 이어서 작업 (집/회사 어디서든)

```bash
git clone https://github.com/RamGaku/portfolio.git   # 처음 1회
# 이미 받아놨으면:  git pull
cd portfolio
npm install        # node_modules는 git에 없음 → 매 PC 1회 필요
npm run dev        # web http://127.0.0.1:5173 , api http://127.0.0.1:8787
```

- git에 **없는 것**: `node_modules/`, `dist/`, `.env` → 새 PC에서 install/생성 필요.
- **작업 시작 전 항상 `git pull`** (집·회사 같은 repo, 충돌 방지).
- 커밋은 사용자 검토 후 진행 (프로젝트 규칙).

---

## 2. 로컬 개발 메모

- `.env` 없이도 `npm run dev`는 동작. 단 챗봇은 **키워드 폴백**(벡터 RAG/Gemini 꺼짐) — 개발엔 지장 없음.
- 로컬에서 **벡터 RAG까지** 돌리려면: `.env` 생성 + GCP 인증(아래 4번).
- 콘텐츠 인라인 편집 기능을 로컬에서 쓰려면 API도 떠 있어야 함(`npm run dev`가 둘 다 띄움).

### `.env` 만들기
```bash
cp .env.example .env      # Windows PowerShell:  Copy-Item .env.example .env
```
| 변수 | 값/설명 |
|------|---------|
| `PORT` | `8787` |
| `ADMIN_ID` / `ADMIN_PW` | 인라인 편집 로그인 (기본 `admin42` / `0909`) |
| `VERTEX_AI_ENABLED` | `true`면 벡터 RAG + Gemini 사용 |
| `GOOGLE_CLOUD_PROJECT` | `agentkim-production` |
| `GOOGLE_CLOUD_LOCATION` | `global` |
| `VERTEX_AI_MODEL` | 예) `gemini-3.1-pro-preview` |
| `VERTEX_EMBED_MODEL` | `text-multilingual-embedding-002` |
| `VERTEX_EMBED_LOCATION` | `asia-northeast3` |

> 운영(Cloud Run)에는 이 값들이 이미 설정돼 있음. `.env`는 **로컬 전용**.

---

## 3. 콘텐츠 / 지식 수정하는 법

**A. 라이브에서 인라인 편집 (가벼운 텍스트 수정)**
- 사이트에서 입력칸 밖에 키보드로 **`admin`** 타이핑 → 로그인(`admin42`/`0909`) → 텍스트 클릭 편집 → 하단 **저장**.
- ⚠️ Cloud Run 파일시스템은 휘발성이라 **재배포 시 초기화**됨. 영구 반영은 B 방식.

**B. 파일 수정 → 푸시 → 배포 (영구)**
- 화면 텍스트/구조/디자인: `src/App.tsx`, `src/styles.css`
- 프로젝트 카드 데이터(+챗봇): `data/public-kb.json`
- 챗봇 전용 지식(인적사항·경력·솔루션 등): `data/profile.md` — `##` 섹션 단위로 RAG가 읽음. 여기 추가만 하고 Cloud Run 재배포하면 챗봇 자동 반영.

---

## 4. 인증 (배포하거나 로컬 Vertex 쓸 때)

계정 **rkfka0419@gmail.com** / GCP 프로젝트 **agentkim-production**.

```bash
firebase login                                   # Firebase Hosting 배포용
gcloud auth login                                # Cloud Run 배포용
gcloud config set project agentkim-production
gcloud auth application-default login            # (선택) 로컬에서 Vertex/임베딩 호출 시
```

상태 확인: `firebase projects:list`, `gcloud auth list`.

---

## 5. 배포

구성: **프론트 = Firebase Hosting**(site `ramga42`) · **챗봇 API = Cloud Run**(`portfolio-api`, `asia-northeast3`).

```bash
# 프론트(코드/디자인/카드 텍스트) 변경 시
npm run build
firebase deploy --only hosting --project agentkim-production

# 챗봇/서버/KB(server/**, data/public-kb.json, data/profile.md) 변경 시
gcloud run deploy portfolio-api --source . --region asia-northeast3 --project agentkim-production
```

### 무엇을 바꾸면 무엇을 배포?
| 변경한 파일 | Hosting | Cloud Run |
|-------------|:------:|:---------:|
| `src/**` (화면·디자인) | ✅ | — |
| `data/public-kb.json` (카드 + 챗봇) | ✅ | ✅ |
| `data/profile.md` (챗봇 지식) | — | ✅ |
| `server/**` (API·RAG) | — | ✅ |

> 빠른 점검: `firebase deploy` 후 https://ramga42.web.app , Cloud Run 후 `https://portfolio.ramga.dev/api/health` (mode가 `vertex-ready`면 RAG 정상).

---

## 6. 도메인

- 커스텀: **portfolio.ramga.dev** — Cloudflare DNS의 CNAME `portfolio` → `ramga42.web.app` (**DNS only / 회색 구름**, Firebase가 SSL 발급).
- 기본: ramga42.web.app (항상 동작).
- 도메인 등록처: Cloudflare Registrar (`ramga.dev`).

---

## 7. 명령어 요약

| 명령 | 설명 |
|------|------|
| `npm run dev` | 웹 + API 동시 실행 |
| `npm run check` | 타입 체크(tsc) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run server` | API 단독 |

## 8. 더 보기
- [`AGENTS.md`](./AGENTS.md) — 아키텍처/구조/주의점 상세
- `docs/superpowers/specs/` — 설계 문서
- `data/profile.md` — 인물·경력 지식 소스(계속 추가 가능)
