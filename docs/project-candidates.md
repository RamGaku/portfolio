# Portfolio Project Candidates

> Obsidian 기록과 현재 포트폴리오 KB에서 뽑은 프로젝트성 소재입니다. 공개 포트폴리오에는 계정, IP, 원격접속 정보, 내부 경로, 고객 내부 설정값을 넣지 않습니다.

## 추천 우선순위

| Priority | 공개용 제목 | 내부 기억명 | 포트폴리오 각도 |
| --- | --- | --- | --- |
| A | 청송양수 고진동 분석 도구 개선 | 청송양수 프로젝트 | 주도 경험, 실패/학습, 요구사항 추출, 데이터 이관/분석 |
| A | 추진전동기 자동 보고서 프로그램 | 해군 자동 보고서 | 리포팅 자동화, 고객 산출물, 데이터 시각화 UX |
| A | 경주풍력 Digital Twin 데이터 플랫폼 | 경주풍력 DT/GJPP2 | Edge-Center-Viewer 통합, 현장 배포, 3D Viewer/DT 운영 |
| A | Legacy Config Automation with AI Skills | Modbus Mapping Skill | 레거시 설정 자동화, AI skill, workflow productization |
| A | 폐쇄망 OnlineTSI 운영 환경 설계 | OnlineTSI 폐쇄망 솔루션 | 특수 운영 환경, 배포 후 수정 어려운 시스템의 안정성 설계 |
| B | Industrial Interface Playbook | 다수 인터페이싱 | OPC DA/UA, Modbus, gRPC, REST, HSMS를 묶은 데이터 연동 경험 |
| B | Edge Computing 데이터 플랫폼 배포 검증 | DtEdgeServer | .NET 9, Windows Service, RTDB/REST/Grafana 데이터 흐름 검증 |
| B | Firmware/Protocol Root Cause Analysis | DSP Gap/KP Board | C++/C#/Binary/RS-232/timeout/spec 검증 기반 디버깅 |
| C | OPC UA 단방향 연동 케이스 | 예천양수 등 | 단방향/OPC UA 기반 산업 연동 보조 사례 |

## 1. 청송양수 고진동 분석 도구 개선

**왜 넣을 만한가**

사용자가 직접 기억하는 주도 프로젝트이고, 완전한 성공담보다 더 설득력 있는 학습 서사가 있습니다. 요구사항이 계속 바뀌는 현장에서 데이터를 이관하고, 분석 도구를 고치고, 고객이 실제로 볼 수 있는 형태까지 끌고 간 경험입니다.

**포폴 서사**

- 문제: 고진동 분석을 위해 기존 데이터, 현장 운전 정보, 분석 도구 요구사항이 동시에 맞아야 했음
- 역할: 데이터 export/import, Trend import, VibLowExplorer 요구사항 반영, LVDT/Fmax 등 분석 조건 조정
- 결과: VibLowExplorer 요구사항 11건 반영, DB 전체 export 테스트, 현장 데이터 분석 경험 축적
- 배운 점: 현장 프로젝트는 기능 구현보다 요구사항 경계와 데이터 신뢰성 관리가 더 어렵다는 점

**Enhans 매핑**

Problem Discovery, Workflow, Data Pipeline, 고객 요구사항 번역.

**근거 기록**

- `Project/From Notion/청송양수 고진동 프로젝트/청송양수 고진동 프로젝트.md`
- `Daily/2022/7월`, `Daily/2022/10월` 청송양수 기록

## 2. 추진전동기 자동 보고서 프로그램

**왜 넣을 만한가**

포트폴리오에서 매우 좋은 프로젝트 소재입니다. 단순 화면 기능이 아니라, 데이터 선택, plot 표현, PDF 저장, 템플릿, No Data 처리, 배포 패키징까지 포함되어 “데이터를 고객 산출물로 바꾸는” 경험으로 보입니다.

**포폴 서사**

- 문제: 운전/알람/트렌드 데이터를 사람이 검토 가능한 보고서로 자동 출력해야 했음
- 역할: Plot 라이브러리 조사, PDF 저장 UX, 보고서 포맷 옵션, 템플릿 구조, No Data 처리 설계
- 결과: 보고서 출력 프로그램 publish/test, 빈 시간 구간 line split, 옵션화/패키징 개선
- 배운 점: 고객 산출물은 정확한 데이터뿐 아니라 빈 데이터, 예외, 배포 환경까지 포함해야 함

**Enhans 매핑**

Agent/App, Workflow, Customer Artifact, 데이터 시각화.

**공개용 제목 제안**

`방산 추진전동기 자동 보고서 프로그램` 또는 `운전 데이터 자동 보고서 생성기`.

**근거 기록**

- `Project/해군 추진전동기/해군 추진전동기.md`
- `Daily/2025/8월`, `Daily/2025/9월` 해군 추진전동기 기록

## 3. 경주풍력 Digital Twin 데이터 플랫폼

**왜 넣을 만한가**

Enhans 지원 포트폴리오에서 가장 “Forward Deployed”처럼 보이는 소재입니다. Edge, CenterServer, OPC UA, REST status API, DtViewer/3D Viewer, 모니터링 룸 배포까지 이어지는 실제 운영형 시스템 경험입니다.

**포폴 서사**

- 문제: 현장 Edge 데이터가 Center/Viewer/모니터링 화면까지 안정적으로 전달되어야 했음
- 역할: DtEdge 업데이트, OPC UA 분리, CenterServer Web Service status API, DtViewer 업데이트/패킹, 현장 상태 표시 로직 개선
- 결과: Edge별 업데이트, REST 기반 상태 확인, Viewer에서 데이터 표시 확인, 현장 배포 이슈 대응
- 배운 점: DT 시스템은 3D 화면보다 데이터 freshness, 서비스 상태, 배포 절차가 핵심

**Enhans 매핑**

Ontology, Agent/App, Field Deployment, End-to-end Data Flow.

**주의**

원본 기록에 접속 정보가 많이 있으므로 공개 포폴에는 구조와 역할만 남겨야 합니다.

**근거 기록**

- `Project/NIA GJPP2.md`
- `Project/From Notion/NIA 경주풍력/*`
- `Daily/2025/4월 April/2025-04-08.md`
- `Daily/2025/4월 April/2025-04-09.md`
- `Daily/2025/4월 April/2025-04-14.md`

## 4. Legacy Config Automation with AI Skills

**왜 넣을 만한가**

Enhans의 Workflow/Agent 관점과 가장 직접적으로 연결됩니다. 레거시 솔루션 설정 작업을 사람이 수동으로 하던 방식에서, IO map과 DB 채널을 매칭하고 mapping 파일을 생성하는 자동화 skill로 바꾼 경험입니다.

**포폴 서사**

- 문제: Modbus 설정은 IO map, channel, address offset, register limit을 사람이 맞춰야 해서 반복 오류가 많음
- 역할: `modbus-mapper` AI skill 제작, sub-agent 병렬 검증, xlsx/channel 매칭, mapping CSV 생성 흐름 정리
- 결과: Akkuyu 145/147 매칭, 광양 86/86 매칭 같은 검증 기록 확보
- 배운 점: AI는 코드 작성보다 반복 운영 workflow를 좁은 도메인 skill로 바꿀 때 더 실용적임

**Enhans 매핑**

Workflow, Agent, Ontology Mapping, 레거시 업무 제품화.

**근거 기록**

- `Daily/2026/3월/2026-03-24.md`
- 현재 Codex skill: `modbus-mapper`
- 현재 포폴 KB: `modbus-mapping-skill`

## 5. 폐쇄망 OnlineTSI 운영 환경 설계

**왜 넣을 만한가**

흔한 웹 개발자 포트폴리오와 차별화됩니다. OnlineTSI처럼 폐쇄망에서 운용되는 솔루션은 UWF, 골든 이미지, 물리 네트워크 격리, 배포 후 업데이트 어려움 같은 제약을 전제로 봐야 합니다. 이 경험은 FDE/현장 엔지니어링에서 강한 신호입니다.

**포폴 서사**

- 문제: 폐쇄망 OnlineTSI 환경은 한 번 배포되면 업데이트가 어렵고, 네트워크/DHCP/쓰기필터 설정 실수가 운영 장애로 직결됨
- 역할: UWF 동작 원리 정리, OpenDHCPServer 설정, DHCP 경합 원인 분석, 별도 스위치/폐쇄망 토폴로지 요구사항 정리
- 결과: 출하/현장 설치 시 지켜야 할 운영 원칙과 점검 절차를 문서화
- 배운 점: 폐쇄망 환경에서는 코드보다 설치 토폴로지, 원본 사양 검증, 복구 가능성이 더 중요함

**Enhans 매핑**

Field Deployment, Reliability, Operational Constraint, 고객 환경 적응.

**근거 기록**

- `Daily/2026/4월/2026-04-20.md`
- `Daily/2026/5월/2026-05-21.md`

## 6. Industrial Interface Playbook

**왜 넣을 만한가**

단일 프로젝트라기보다 경험 묶음입니다. 하지만 포트폴리오에서는 “내가 다룬 데이터 인터페이스 범위”를 보여주는 강한 섹션이 될 수 있습니다.

**포폴 서사**

- 문제: 산업 현장 데이터는 장비, DCS, PLC, SCADA, Edge, API가 서로 다른 프로토콜로 연결됨
- 역할: OPC DA/UA, Modbus TCP, gRPC, REST, HSMS 테스트/연동/디버깅 경험
- 결과: 인터페이스별 장애 지점과 검증 방법을 축적
- 배운 점: 데이터가 안 보일 때는 코드, 태그, 주소, 서비스 상태, 프로토콜 제약을 계층별로 나눠 봐야 함

**Enhans 매핑**

Ontology, Integration, Data Pipeline.

**표현 방식**

메인 프로젝트 하나로 크게 세우기보다, `Protocol Matrix` 또는 `Interface Playbook` 섹션으로 두는 것을 추천합니다.

**근거 기록**

- 현재 포폴 KB: `industrial-interface-playbook`
- `Daily/2024/10월`, `Daily/2024/11월` HSMS 테스트 기록
- `Daily/2025/7월`, `Daily/2025/12월`, `Daily/2026/4월` gRPC/OPC/Modbus 기록

## 7. Edge Computing 데이터 플랫폼 배포 검증

**왜 넣을 만한가**

경주풍력과 일부 겹치지만, Edge Computing 환경 자체의 경험으로 따로 묶을 수 있습니다. `DtEdgeServer v1.0.2`, `.NET 9`, Windows Service, REST endpoint, RTDB/Influx/Grafana 같은 스택 신호가 좋습니다.

**포폴 서사**

- 문제: 현장 장비 데이터가 서비스, API, DB, 시각화 화면까지 안정적으로 도달해야 했음
- 역할: 서비스 배포, 시작 상태 확인, REST endpoint 검증, 데이터 수집 상태 분석
- 결과: 배포/검증 절차와 현장별 점검 기준 확보
- 배운 점: Edge Computing 플랫폼은 코드 실행보다 운영 상태를 검증할 수 있는 API와 절차가 중요함

**Enhans 매핑**

Agent/App Runtime, Data Platform, Field Validation.

**근거 기록**

- `Project/DtEdgeServer.md`
- 현재 포폴 KB: `edge-computing-platform`

## 8. Firmware/Protocol Root Cause Analysis

**왜 넣을 만한가**

저수준 디버깅 역량을 보여줄 수 있습니다. 특히 AI 요약을 믿었다가 원본 PDF/spec을 직접 확인해 hallucination을 잡은 기록은 “AI를 쓰되 검증하는 엔지니어”라는 메시지로 좋습니다.

**포폴 서사**

- 문제: 폐쇄망/펌웨어 환경에서 사양 오해나 프로토콜 처리 오류가 운영 장애로 이어질 수 있음
- 역할: PDF 원본 직접 확인, AUTO 흐름 정정, 이벤트/상태 폴링/timeout 설계, C++/C# binary layout 차이 분석
- 결과: 원본 사양 검증 workflow와 안전 설계 원칙 확립
- 배운 점: AI 요약은 보조 도구일 뿐, 폐쇄망/펌웨어에서는 원본 spec과 실측 검증이 필수

**Enhans 매핑**

Reliability, Debugging, Spec Validation, AI-assisted Engineering.

**근거 기록**

- `Daily/2026/5월/2026-05-21.md`
- 현재 포폴 KB: `firmware-root-cause`

## 9. OPC UA 단방향 연동 케이스

**왜 넣을 만한가**

메인 프로젝트로는 약하지만, 인터페이스 경험의 보조 근거로 좋습니다. 단방향 장비, OPC UA Server, importer/exporter 같은 키워드가 있습니다.

**포폴 서사**

- 문제: 단방향/제한망 환경에서 중앙 시스템으로 데이터를 안정적으로 전달해야 함
- 역할: 현장 프로그램과 importer/exporter, OPC UA Server 흐름 파악
- 결과: 산업 데이터 연동의 제약 조건을 이해하는 보조 사례

**추천 위치**

단독 섹션보다는 `Industrial Interface Playbook` 안의 작은 case card.

**근거 기록**

- `Project/예천양수.md`

## 사이트에 넣는 방식 제안

### 메인 프로젝트 5개

1. 청송양수 고진동 분석 도구 개선
2. 추진전동기 자동 보고서 프로그램
3. 경주풍력 Digital Twin 데이터 플랫폼
4. Legacy Config Automation with AI Skills
5. 폐쇄망 OnlineTSI 운영 환경 설계

### 보조 섹션 3개

1. Industrial Interface Playbook
2. Edge Computing 데이터 플랫폼 배포 검증
3. Firmware/Protocol Root Cause Analysis

## 공개 포폴에서 빼야 할 것

- IP, 계정, 비밀번호, AnyDesk/RustDesk/OpenVPN 정보
- NAS/내부 공유 폴더 경로
- 고객 내부 운영자 이름
- 제품 키, 방화벽 접속 정보, 장비 접속 비밀번호
- 특정 현장 보안 구성의 재현 가능한 세부값

## 한 줄 포지셔닝

현장의 데이터를 고객이 쓸 수 있는 제품 흐름으로 바꿔 온 사람입니다. 청송양수에서는 실패와 학습을 통해 요구사항과 데이터 신뢰성을 배웠고, 해군 보고서와 경주풍력 DT에서는 데이터를 화면과 산출물로 연결했으며, Modbus Mapping Skill과 폐쇄망 운영 기록에서는 반복 workflow와 특수 환경을 제품화하는 감각을 보여줄 수 있습니다.
