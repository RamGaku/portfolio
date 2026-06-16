# Key Projects V2

> 홈페이지와 Claude 디자인 시스템에 바로 넣기 위한 프로젝트별 콘텐츠입니다. 공개 가능한 정보만 포함하며, 각 프로젝트는 `anchor`, `short copy`, `problem`, `data flow`, `layer stack`, `actions`, `evidence`를 기준으로 정리합니다.

## 1. 청송양수 고진동 분석 도구 개선

**Anchor**

`#project-cheongsong-high-vibration`

**Short Copy**

주도했지만 실패도 남긴 프로젝트입니다. 고진동 분석을 위해 데이터 이관, Trend import, DB export/import, 분석 조건, VibLowExplorer 개선을 함께 다뤘습니다.

**Problem**

분석 데이터가 존재하는 것과 분석 담당자가 신뢰하고 쓸 수 있는 도구가 되는 것은 달랐습니다. 데이터 이관, 센서 의미, 분석 조건, UI 요구가 함께 맞아야 했습니다.

**Data Flow**

현장 운전/진동 데이터 → OPC DA Reader/Fast Reader → Trend import/DB export/import → Fmax/LVDT 분석 조건 → VibLowExplorer

**Layer Stack**

Vibration, LVDT, OPC DA Reader, Trend Import, DB Export, DB Import, Fmax, VibLowExplorer

**Evidence**

- VibLowExplorer 수정 11건
- OPC DA Reader fast reader
- 전체 DB export 테스트와 분석

## 2. 추진전동기 자동 보고서 프로그램

**Anchor**

`#project-naval-report-automation`

**Short Copy**

운전/알람/트렌드 데이터를 파싱하고, No Data 처리, 그래프 생성, 문서 템플릿 반영, PDF 출력까지 이어지는 반복 보고서 업무를 자동화 흐름으로 정리했습니다.

**Problem**

보고서는 단순 문서가 아니라 데이터 품질, 예외 처리, 그래프, 표, 템플릿이 모두 맞아야 하는 운영 산출물이었습니다.

**Data Flow**

운전/알람/트렌드 데이터 → 파싱/No Data 처리 → 차트 생성 → 보고서 템플릿 → PDF/패키지 산출

**Layer Stack**

Trend Data, Alarm Data, Parser, No Data Handling, Chart Rendering, Template, PDF

**Evidence**

- 추진전동기 자동 보고서 프로그램 작업 기록
- No Data 처리와 그래프/문서 출력 흐름 정리
- 운영 보고서 산출 기준 문서화

## 3. 경주풍력 Digital Twin 데이터 플랫폼

**Anchor**

`#project-gjpp-digital-twin`

**Short Copy**

현장 설비 데이터가 Edge, CenterServer, REST/status API, RTDB, 3D Viewer까지 이어지는지 검증한 Edge-Center-Viewer 통합 경험입니다.

**Problem**

현장에는 값이 있어도 운영자가 보는 3D Viewer에는 보이지 않을 수 있습니다. 장비, Edge, Center, API, Viewer 중 어느 층에서 끊겼는지 분리해야 했습니다.

**Data Flow**

현장 설비/SCADA → DtEdgeServer → CenterServer/REST status API → RTDB/상태 데이터 → 3D Viewer

**Layer Stack**

OPC UA, DtEdgeServer, Windows Service, REST API, RTDB, CenterServer, DtViewer, 3D Viewer

**Evidence**

- 경주풍력/NIA Edge 구성 기록
- DtEdgeServer v1.0.2 배포 검증
- Edge - Center - Viewer 데이터 흐름 확인

## 4. Legacy Config Automation with Modbus Mapping Skill

**Anchor**

`#project-modbus-mapping-skill`

**Short Copy**

레거시 솔루션의 Modbus 설정 생성을 AI Skill로 가공했습니다. IO Map Excel과 OnlineTSI DB 채널을 매칭해 T-DataServer용 mapping_modbus.csv를 생성하는 흐름입니다.

**Problem**

Modbus 설정은 IO Map, 채널 DB, 주소 offset, register type, 125 register read limit을 동시에 맞춰야 합니다. 수동 작업은 반복적이고 오류 가능성이 높았습니다.

**Data Flow**

IO Map Excel → OnlineTSI DB 채널 조회 → 주소/레지스터 규칙 적용 → mapping_modbus.csv → T-DataServer config

**Layer Stack**

Excel, IO Map, OnlineTSI DB, Modbus TCP, NModbus, Codex Skill, CLI, CSV Mapping, T-DataServer

**Evidence**

- modbus-mapper Skill 작성
- Modbus address offset 분석
- 125 register read limit 반영

## 5. 폐쇄망 OnlineTSI 운영 환경 설계

**Anchor**

`#project-closed-network-onlinetsi`

**Short Copy**

폐쇄망 환경의 OnlineTSI 설치, 복구 이미지, UWF, DHCP, 네트워크 분리, 운영 문서 검증을 다룬 경험입니다. Edge Computing 경험과는 분리해 설명합니다.

**Problem**

폐쇄망 솔루션은 인터넷 연결을 전제로 한 일반 배포와 다릅니다. 설치, 복구, 네트워크, 운영 보호, 문서 검증이 함께 설계되어야 합니다.

**Data Flow**

폐쇄망 설치 환경 → Golden Image/복구 전략 → UWF 운영 보호 → DHCP/네트워크 분리 → 설치 체크리스트/O&M 문서

**Layer Stack**

OnlineTSI, Closed Network, Windows, UWF, Golden Image, DHCP, Network Isolation, Checklist

**Evidence**

- 폐쇄망 OnlineTSI 운영 환경 정리
- 설치/복구 이미지와 네트워크 구성 검토
- 운영 문서와 설치 절차 대조

## 6. Industrial Interface Playbook

**Anchor**

`#project-industrial-interface-playbook`

**Short Copy**

OPC DA/UA, Modbus TCP, gRPC, REST, HSMS 등 여러 인터페이스 경험을 장비-어댑터-서비스-저장/API-운영 화면의 공통 데이터 흐름으로 정리했습니다.

**Problem**

데이터가 안 보일 때 원인은 코드 하나가 아닙니다. 태그 의미, 주소 offset, 채널, 레지스터 제한, 서비스 상태, 운영 화면의 기대값을 함께 봐야 했습니다.

**Data Flow**

장비/DCS/PLC → OPC/Modbus/HSMS/gRPC/REST 어댑터 → T-DataServer/Edge service → RTDB/API → Viewer/Report/Dashboard

**Layer Stack**

OPC DA, OPC UA, Modbus TCP, gRPC, REST, HSMS, DCS, PLC Gateway, RTDB, Tag Mapping

**Evidence**

- Yanbu DCS OPC 연동 완료 기록
- VMS-DCS Modbus TCP 링크 검토
- 다수 인터페이스 경험 정리

## 7. Edge Computing 데이터 플랫폼 배포 검증

**Anchor**

`#project-edge-computing-platform`

**Short Copy**

Edge Computing 환경에서 서비스 배포, REST endpoint, RTDB, InfluxDB/Grafana, 원격 화면까지 데이터가 도달하는지 검증했습니다.

**Problem**

Edge 서비스가 실행 중이어도 운영 화면까지 데이터가 보인다는 보장은 없습니다. 서비스, API, 저장소, 시각화 레이어를 함께 확인해야 했습니다.

**Data Flow**

현장 데이터 스트림 → DtEdgeServer/Windows Service → REST/RTDB → InfluxDB/Grafana/QuestDB → 원격 화면/운영 판단

**Layer Stack**

.NET, Windows Service, DtEdgeServer, REST API, RTDB, InfluxDB, Grafana, QuestDB, Edge Computing

**Evidence**

- DtEdgeServer v1.0.2 배포 검증
- TMS 원격 데이터 미표시 분석
- Edge 기반 데이터 시각화 구성

## 8. Firmware/Protocol Root Cause Analysis

**Anchor**

`#project-firmware-root-cause`

**Short Copy**

C#/C++ 경계의 request-response, binary protocol, timeout, resync, 구조체 layout 차이를 추적해 장비 통신 문제의 원인을 좁혔습니다.

**Problem**

명령이 전송되어도 응답이 늦거나 누락될 수 있고, 서버와 펌웨어가 같은 데이터를 다르게 해석할 수 있습니다.

**Data Flow**

프로토콜 사양/명령 정의 → C# Host 요청 → binary wire format → C++ firmware 응답 → timeout/resync/logging

**Layer Stack**

C#, C++, Binary Protocol, Request Response, Timeout, Resync, Firmware, Wire Format, Log Analysis

**Evidence**

- SendConfigs/Reconfig protocol 분석
- KP board request-response 디버깅
- C#과 C++ binary layout 차이 분석

## Recommended Project Order

1. 청송양수 고진동 분석 도구 개선
2. 추진전동기 자동 보고서 프로그램
3. 경주풍력 Digital Twin 데이터 플랫폼
4. Legacy Config Automation with Modbus Mapping Skill
5. 폐쇄망 OnlineTSI 운영 환경 설계
6. Industrial Interface Playbook
7. Edge Computing 데이터 플랫폼 배포 검증
8. Firmware/Protocol Root Cause Analysis

## Project Link Labels For Chatbot

| Query Intent | Suggested Link Targets |
| --- | --- |
| Enhans/FDE 적합성 | `#fit`, `#project-cheongsong-high-vibration`, `#project-gjpp-digital-twin` |
| 데이터 플로우/레이어 스택 | `#project-gjpp-digital-twin`, `#project-industrial-interface-playbook`, `#project-edge-computing-platform` |
| OPC/Modbus/DCS | `#project-industrial-interface-playbook`, `#project-modbus-mapping-skill` |
| 폐쇄망/보안 제약 | `#project-closed-network-onlinetsi` |
| 보고서/Workflow 자동화 | `#project-naval-report-automation`, `#project-modbus-mapping-skill` |
| 펌웨어/프로토콜 | `#project-firmware-root-cause` |
| 진동/트렌드 분석 | `#project-cheongsong-high-vibration` |
