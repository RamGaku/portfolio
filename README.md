# Ramga Enhans Portfolio

Enhans Forward Deployed Engineer 지원용 포트폴리오 MVP입니다. 로컬에서는 Vite + Express로 실행하고, 배포는 Firebase Hosting + Cloud Run + Vertex AI 조합을 기준으로 잡았습니다.

## Local

```powershell
npm install
npm run dev
```

- Web: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:5173/api/health`

## Vertex AI

로컬에서 Vertex AI를 켜려면 `.env.example`을 참고해 `.env`를 만들고 아래 값을 채웁니다.

```powershell
VERTEX_AI_ENABLED=true
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=global
VERTEX_AI_MODEL=gemini-3.1-pro-preview
```

로컬 인증은 `gcloud auth application-default login` 또는 `GOOGLE_APPLICATION_CREDENTIALS` 서비스 계정 파일로 처리합니다. 환경변수가 없거나 인증이 실패하면 API는 공개 경력 KB 기반 로컬 답변으로 폴백합니다.

## Public KB

`data/public-kb.json`만 챗봇이 참조합니다. Obsidian 원본 볼트는 민감 정보가 섞일 수 있으므로 배포 인덱스에 직접 넣지 않습니다. 전체 기록 RAG 확장은 별도의 redaction/audit 파이프라인을 통과한 뒤 추가하는 방식으로 진행합니다.

## Deploy Shape

- Firebase Hosting: 정적 프론트엔드와 커스텀 도메인/SSL
- Cloud Run: `/api/**` 챗봇 API
- Vertex AI: Gemini 생성 응답
- Later: Firestore Vector Search 또는 Vertex AI Search로 공개 KB 인덱스 확장
