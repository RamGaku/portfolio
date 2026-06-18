import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from "react";
import { Download, Github, Mail, Send, X } from "lucide-react";
import knowledge from "../data/public-kb.json";
import { CommentMode } from "./CommentMode";

type KnowledgeEntry = {
  id: string;
  title: string;
  period: string;
  category: string;
  summary: string;
  highlights: string[];
  technologies: string[];
  evidence: string[];
  tags: string[];
};

type FlowNode = {
  label: string;
  meta: string;
};

type StackLayer = {
  layer: string;
  tech: string[];
};

type ProjectDetail = {
  id: string;
  problem: string;
  actions: string[];
  outcomes: string[];
  dataFlow: FlowNode[];
  layers: StackLayer[];
};

type ChatSource = {
  id: string;
  title: string;
  category: string;
  summary: string;
};

type ChatMessage = {
  role: "user" | "bot";
  content: string;
  jump?: {
    anchor: string;
    label: string;
  };
  pdf?: boolean;
  sources?: ChatSource[];
  mode?: string;
};

type ChatResponse = {
  answer: string;
  mode: string;
  sources: ChatSource[];
};

const kb = knowledge as KnowledgeEntry[];
// 카드 표시 순서: AI 스킬(전자결재·Modbus) → 플랫폼 → 보고서 자동화 → 실패 사례(마지막).
// 목록에 없는 id는 뒤로 보내 새 프로젝트가 추가돼도 누락되지 않게 한다.
const projectOrder = [
  "expense-approval-skill",
  "modbus-mapping-skill",
  "frog-ai",
  "cheongsong-high-vibration",
  "gjpp-digital-twin"
];
const projects = kb
  .filter((entry) => entry.id !== "enhans-positioning")
  .sort((a, b) => {
    const ia = projectOrder.indexOf(a.id);
    const ib = projectOrder.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

const CHAT_INTRO =
  "안녕하세요. 김가람의 포트폴리오 KB 가이드입니다. Vertex AI와 공개 경력 KB를 기준으로 답하고, 관련 프로젝트 섹션으로 안내합니다. 요구사항 추출, Enhans Fit, 데이터 흐름, 현장 배포, 산업용 통신, Edge 데이터, 펌웨어 디버깅, 문서화 경험을 물어보세요.";

const navItems: Array<[string, string]> = [
  ["about", "소개"],
  ["motivation", "지원 동기"],
  ["work", "현장 기록"]
];

const projectDetails: Record<string, ProjectDetail> = {
  "expense-approval-skill": {
    id: "project-expense-approval-skill",
    problem:
      "매월 반복되는 경비 청구 결재는 사람마다 다른 양식의 영수증을 수동으로 합산·정리해야 했습니다. 영수증 양식이 일관되지 않아 합산 과정에서 휴먼 에러가 발생하고, 같은 청구를 매번 동일한 절차로 반복해야 하는 구조였습니다.",
    actions: [
      "영수증 1장당 1 에이전트의 병렬 OCR 구조로, 처리 시간이 영수증 수량과 무관해지도록 설계",
      "메인 에이전트의 컨텍스트 오염을 피하기 위해 OCR·정보 추출을 서브 에이전트로 격리",
      "입력은 xlsx / pdf / 이미지로 다양하게 받고 출력은 PDF로 통일해 결재 수신 부서의 영수증 양식을 일원화",
      "Playwright MCP로 AI가 전자결재 페이지에 직접 정보를 입력하도록 자동화",
      "처리된 영수증을 압축 파일로 첨부하는 후처리 단계까지 한 흐름에 묶어 사내 배포 후 운영 검증"
    ],
    outcomes: [
      "프롬프트 한 줄('2월 경비청구 올려줘')로 결재 제출까지 끝나는 운영 흐름으로 전환",
      "영수증 합산 과정의 휴먼 에러를 줄이고, 결재 수신 부서가 받는 영수증 양식을 단일 PDF로 일원화",
      "Playwright MCP를 통해 '브라우저로 하는 모든 절차를 AI Tool 범위로 확장할 수 있다'는 가능성을 사내 사례로 검증",
      "FDE 관점에서 가장 가까운 사례 — 반복 업무를 에이전트 워크플로우로 운영에 꽂아 실제 사용자에게 배포한 솔루션 경험"
    ],
    dataFlow: [
      { label: "영수증 수집", meta: "xlsx · pdf · img" },
      { label: "병렬 OCR", meta: "영수증 per agent" },
      { label: "정보 추출", meta: "결재 항목 · 금액 합산" },
      { label: "전자결재 입력", meta: "Playwright MCP" },
      { label: "첨부 · 제출", meta: "PDF 압축 파일" }
    ],
    layers: [
      { layer: "Input", tech: ["Receipt files", "XLSX", "PDF", "Image"] },
      { layer: "AI", tech: ["OCR Agent", "Parallel Agents", "Context Isolation"] },
      { layer: "Automation", tech: ["Playwright MCP", "Browser Driver", "Form Fill"] },
      { layer: "Delivery", tech: ["PDF Archive", "사내 전자결재", "사내 배포"] }
    ]
  },
  "cheongsong-high-vibration": {
    id: "project-cheongsong-high-vibration",
    problem:
      "'진동' 과제라는 이유로 기존 VNET-7000으로 해결 가능하다고 합의되어 Top-Down으로 기획·계약된 프로젝트였습니다. 그러나 실제 진동 발생 부위가 '회전체'가 아니었고, 여기서부터 설계에 괴리가 생겼습니다. 이미 납품이 확정된 하드웨어·소프트웨어 위에 용도에 맞지 않는 기능을 얹다 보니, 산출 데이터의 품질과 사용성이 크게 떨어졌습니다.",
    actions: [
      "'진동' 범위로 합의된 요구를 VNET-7000 기능 추가 항목으로 분해",
      "진동 데이터 측정과 중앙연구원 전송(Export) 경로 구현 및 검증",
      "진동 발생 부위가 회전체가 아니라는 설계 괴리를 식별하고, 데이터 품질이 저하되는 지점을 추적",
      "요구 스펙은 충족시키되, 용도 불일치의 원인과 한계를 숨기지 않고 기록",
      "최종 사용자·타 부서와의 이해도 격차를 회고로 정리해 다음 프로젝트의 체크리스트로 전환"
    ],
    outcomes: [
      "요구 스펙상으로는 완료했지만, 용도에 맞지 않는 플랫폼 탓에 사용성이 떨어진 '실패한 프로젝트'로 솔직하게 남김",
      "같은 도메인이라도 직군·개인별 이해도 차이가 크다 — 관련된다면 설계 단계부터 반드시 관여해야 더 큰 사고를 막는다는 점을 체득",
      "최종 사용자조차 요구를 추상적으로만 아는 경우가 많다 — 이후 프로젝트는 빠른 MVP로 '생각한 것이 맞는지' 먼저 확인시키는 방식으로 전환",
      "현장 실무자와 쌓은 신뢰 관계가 곤란한 상황에서 실제로 큰 도움이 된다는 것을 경험"
    ],
    dataFlow: [
      { label: "현장 진동 데이터", meta: "측정 대상 설비" },
      { label: "측정/수집", meta: "VNET-7000" },
      { label: "기능 추가", meta: "Export 기능 개발" },
      { label: "전송", meta: "중앙연구원 전달" },
      { label: "원인 분석", meta: "고진동 분석 지원" }
    ],
    layers: [
      { layer: "Field", tech: ["Vibration", "측정 설비"] },
      { layer: "Device", tech: ["VNET-7000", "측정/수집"] },
      { layer: "Feature", tech: ["Export 기능", "기능 추가"] },
      { layer: "Delivery", tech: ["중앙연구원 전송", "데이터 전달"] }
    ]
  },
  "frog-ai": {
    id: "project-frog-ai",
    problem:
      "집에서 냉장고에 남은 식재료를 잊고 버리는 일이 반복됐습니다. 냉장고 내용물은 정형화하기 매우 어려운 데이터인데, 사람은 곧잘 파악합니다. LLM이라면 같은 일을 할 수 있을 거라는 가설을 검증하려고 모바일 앱으로 만들어 출시했습니다.",
    actions: [
      "기획을 먼저 세세하게 작성해 어떤 기술·구조로 갈지 미리 결정",
      "구현 실수를 줄이기 위해 TDD를 강제하도록 에이전트에 지시",
      "당시 200k context가 자주 꽉 차서 main 에이전트 하나로는 한계 — 개발·테스트·디자인 등 역할별 에이전트로 분업",
      "각 에이전트의 '기억력'을 md 파일로 구현하도록 규칙화 (역할별 md 자동 관리)",
      "에이전트별 md가 늘어 파편화되자 main 에이전트에 SSOT(단일 진실 출처) 도입을 강하게 지시 — 모든 문서를 한 곳에서 정렬"
    ],
    outcomes: [
      "정형화 불가능한 영역(냉장고 내용물)을 LLM이 풀 수 있다는 가설을 앱 형태로 검증·출시",
      "200k context 한계를 멀티 에이전트 분업 + 역할별 md 메모리로 우회한 패턴 확보",
      "문서 파편화 → SSOT라는 흐름을 직접 겪으며 바이브 코딩의 운영 규칙을 본인 안에 정립"
    ],
    dataFlow: [
      { label: "기획", meta: "기술·구조 사전 선정" },
      { label: "TDD 강제", meta: "구현 실수 최소화" },
      { label: "에이전트 분업", meta: "Dev · QA · Design" },
      { label: "에이전트별 md", meta: "역할별 기억력 구현" },
      { label: "SSOT 도입", meta: "문서 파편화 해소" }
    ],
    layers: [
      { layer: "Strategy", tech: ["기획 우선", "기술 사전 선정"] },
      { layer: "Quality", tech: ["TDD", "Agent 지시 체계"] },
      { layer: "Orchestration", tech: ["Multi-Agent", "Dev/QA/Design 분리"] },
      { layer: "Discipline", tech: ["Per-agent md", "SSOT"] }
    ]
  },
  "gjpp-digital-twin": {
    id: "project-gjpp-digital-twin",
    problem: "CMS의 개발부터 배포까지 전 주기를 경험하였습니다.",
    actions: [
      "DtEdgeServer 서비스 배포와 시작 상태 확인",
      "Edge에서 센터 시스템으로 넘어가는 상태/API 경로 검증",
      "3D Viewer와 운영 화면에서 데이터 반영 여부 확인",
      "현장 데이터와 원격 화면 데이터가 다른 경우 계층별로 원인 분리",
      "배포 후 확인 절차와 버전 정보를 남겨 재현 가능한 운영 점검으로 정리"
    ],
    outcomes: [
      "경주풍력/NIA Edge 구성과 DtEdgeServer v1.0.2 배포 검증 기록 보유",
      "데이터 플랫폼 경험을 단순 백엔드가 아니라 현장-센터-시각화 end-to-end 흐름으로 설명 가능",
      "FDE 관점에서 가장 가까운 사례 — 현장 데이터가 운영 화면까지 이어지는 통합 솔루션을 직접 다룬 경험"
    ],
    dataFlow: [
      { label: "현장 설비/SCADA", meta: "wind turbine, sensor data" },
      { label: "Edge 수집", meta: "진동 데이터 처리 후 RTDB 저장, 거동 센서, 열화상 카메라 연결" },
      { label: "센터 연동", meta: "각 Edge 데이터 MUX 처리, RTDB 중앙 복제 후 Grafana 서비스" },
      { label: "3D Viewer", meta: "Operation UI → Viewer 프로그램" }
    ],
    layers: [
      { layer: "Field", tech: ["SCADA", "Sensor data", "OPC UA"] },
      { layer: "Edge", tech: ["DtEdgeServer", ".NET", "Windows Service"] },
      { layer: "Center", tech: ["REST API", "RTDB", "Status check"] },
      { layer: "Surface", tech: ["DtViewer", "3D Viewer", "Digital Twin"] }
    ]
  },
  "modbus-mapping-skill": {
    id: "project-modbus-mapping-skill",
    problem:
      "레거시 솔루션의 Modbus 설정은 IO Map, 채널 DB, 주소 offset, 레지스터 제한을 동시에 맞춰야 합니다. 수동 매핑은 반복적이고 실수가 잦았으며, 설정한 Node에 실제 값이 나오는지 확인하기 위해 매번 별도 Modbus 테스트 도구를 띄워야 했습니다.",
    actions: [
      "IO Map Excel과 OnlineTSI DB 채널을 매칭하는 입력/출력 정의",
      "주소 offset, register type, 125 register read limit 같은 프로토콜 제약 반영",
      "DB에 직접 접속해 Config를 조회하는 CLI Tool을 만들어 매핑 입력을 자동 수집",
      "T-DataServer용 mapping_modbus.csv 생성 절차 정리 및 Codex Skill로 명령어/검증/실패 케이스 문서화",
      "수행 결과를 HTML 보고서로 사용자에게 가시화하고, Modpoll CLI를 Skill에 내장해 자연어 지시만으로 Modbus 실값 테스트까지 수행"
    ],
    outcomes: [
      "레거시 설정 노하우를 개인 기억이 아니라 호출 가능한 AI Skill로 전환",
      "매핑 생성 → 결과 보고 → 실값 테스트가 한 흐름에서 끝나며, 별도 Modbus 도구를 띄울 필요가 없어짐",
      "자연어 지시 + HTML 보고서 구조를 통해 결과를 사람이 즉시 검토할 수 있는 운영 워크플로우 확보",
      "FDE 관점에서 가장 가까운 사례 — 반복 설정 작업을 호출 가능한 도구로 만들어 실제 업무 자동화로 이어진 솔루션 경험"
    ],
    dataFlow: [
      { label: "IO Map · DB Config", meta: "xlsx · OnlineTSI" },
      { label: "주소 매핑", meta: "offset · type · 125 limit" },
      { label: "CSV 생성", meta: "mapping_modbus.csv" },
      { label: "결과 보고", meta: "HTML 보고서" },
      { label: "실값 테스트", meta: "Modpoll · 자연어 지시" }
    ],
    layers: [
      { layer: "Input", tech: ["Excel", "IO Map", "OnlineTSI DB"] },
      { layer: "Protocol", tech: ["Modbus TCP", "NModbus", "Register limit"] },
      { layer: "Automation", tech: ["Codex Skill", "CLI", "DB Connector", "HTML Report"] },
      { layer: "Output", tech: ["CSV Mapping", "T-DataServer", "Modpoll", "자연어 테스트"] }
    ]
  }
};

const storyActs = [
  {
    id: "flow",
    n: "",
    tag: "한마디로 - 데이터 흐름을 잇는다",
    title: "장비에서 화면까지,\n데이터는 흐른다",
    body: [
      "수많은 요구를 따라가다 보면 결국 한 문장으로 모입니다. '이 데이터를, 이렇게, 보고 싶다.' 화면도, 알람도, 리포트도 결국 같은 데이터의 다른 모양입니다.",
      "결국 솔루션 일은 데이터가 흐르는 경로를 짜는 일입니다. 장비에서 서버, 화면까지의 흐름을 직접 만들어 본 게 제가 해온 일이고, Enhans의 FDE도 같은 일이라고 봅니다."
    ],
    flow: true
  }
];

// 사이트 고유 개념(요구사항 추출)만 본인 voice로 즉답하고,
// 나머지 질문은 모두 서버 RAG(/api/chat)로 보낸다.
const scriptedIntents: { keys: string[]; reply: string }[] = [
  {
    keys: ["요구사항 추출"],
    reply:
      "제가 생각하는 프로젝트의 가장 중요한 키워드는 '요구사항 추출'입니다. 고객이 진정으로 원하는 바를 이끌어내야 합니다."
  }
];

const promptChips = [
  ["요구사항 추출", "요구사항 추출이 무슨 뜻이야?"],
  ["Enhans Fit", "Enhans FDE에 적합한 이유가 뭐야?"],
  ["경력", "어떤 회사에서 무슨 일을 했어?"],
  ["전자결재 AI", "사내 전자결재 AI Skill 프로젝트를 설명해줘"],
  ["FrogAI", "FrogAI 프로젝트 설명해줘"],
  ["경주풍력 DT", "경주풍력 Digital Twin 프로젝트를 설명해줘"],
  ["Modbus Skill", "Modbus Mapping Skill 프로젝트를 설명해줘"],
  ["청송양수", "청송양수 고진동 프로젝트 설명해줘"],
  ["PDF 저장", "이력서를 PDF로 저장하고 싶어"]
];

const aboutSummary = `진동 모니터링 통합 솔루션 전문 회사에서 6년 차로 재직 중인 개발자입니다.
센서·펌웨어부터 서버, 운영 화면, 분석기 개발 및 유지보수까지 솔루션 전반을 다루며 진동 도메인 전문지식을 쌓아왔습니다.
데이터 생산자로서 타사와의 데이터 인터페이스 작업도 다수 수행했습니다.
최근에는 AI를 적극적으로 활용하며 실무 최전선에서 경험을 쌓고 있고, 분석 솔루션의 AI 전환도 준비 중입니다.

한 도메인에서 쌓은 전반적인 경험, 고객 요구사항을 추출하는 능력, AI를 실무에서 직접 써 본 경험. 이 세 가지가 Enhans의 Agent 솔루션 구축에 기여할 수 있다고 생각합니다.`;

const aboutFacts = [
  "1993년생 · 수원 거주",
  "한신대학교 컴퓨터공학부",
  "NADA 주임연구원 (2020 ~ 현재)",
  ".NET 개발자"
];

type CareerEntry = {
  company: string;
  period: string;
  role: string;
  points: string[];
  stack: string[];
};

const careerEntries: CareerEntry[] = [
  {
    company: "NADA",
    period: "2020 ~ 현재",
    role: "주임연구원",
    points: [
      "진동 모니터링 솔루션 VNET-7000 / VNET-7300의 개발·유지보수 및 요구 기능 추가",
      "경주풍력 Digital Twin 등 국책 연구과제에서 전체 솔루션 개발 참여",
      "타사 시스템과의 데이터 인터페이스(OPC, Modbus, REST 등) 경험 다수",
      "센서·펌웨어부터 응용프로그램까지 전 레이어를 다루며 진동 같은 대용량 신호 데이터 처리"
    ],
    stack: ["C++(펌웨어)", ".NET Framework", "WinForm", "WPF", "MSSQL", "RTDB"]
  },
  {
    company: "웨어밸리",
    period: "2019",
    role: "인턴",
    points: [
      "이기종 DB 간 데이터 연동·마이그레이션 QA 수행 (제품: Parrot)"
    ],
    stack: ["DB Migration", "QA"]
  }
];

type BackgroundBlock = {
  label: string;
  items: string[];
};

const backgroundBlocks: BackgroundBlock[] = [
  {
    label: "EDUCATION",
    items: [
      "한신대학교 컴퓨터공학부 (2012 입학 · 2019 졸업)",
      "평촌고등학교 졸업 (2012)"
    ]
  },
  {
    label: "CERTIFICATION",
    items: ["정보처리기사", "운전면허 1종 보통"]
  },
  {
    label: "MILITARY",
    items: ["육군 병장 만기전역 (신병교육대대 조교)"]
  },
  {
    label: "ACTIVITY · INTEREST",
    items: [
      "몽골 해외봉사단",
      "학부 부학생회장 (3학년)",
      "밴드 · 사진 동아리",
      "취미: 캠핑, 바이크(오토바이)"
    ]
  }
];

const motivationBody = [
  "이승현 대표님의 인터뷰 영상을 우연히 보게 되었는데, 말씀하시는 것이 평소 저의 생각과 많이 비슷해서 공감이 되었습니다. 그러자 Enhans가 궁금해졌고, 홈페이지 블로그를 읽으며 배우기도 하고 흥미롭다고 느꼈습니다.",
  "채용 페이지를 보니 FDE라는, 제겐 처음 보는 직무가 있었습니다. 그런데 그 일이 제가 회사에서 평소 해오던 일들이었습니다.",
  "궁극적으로는 OS 기업이 되고 싶다고 하셨는데, 저 또한 현재 AI의 궁극적인 목표는 OS라고 생각하고 있었습니다. 그래서 Enhans에 직접 몸담아 보고 싶어 지원하게 되었습니다."
];

const colophonTitle = "이 사이트는 이렇게 만들었습니다";
const colophonNote = "AI의 도움 없이 작성된 섹션입니다.";
const colophonSteps = [
  "모든 daily md 및 프로젝트 md를 AI에게 입력 (md 자체도 매일 AI가 정리해 만들고 있어서 가능했습니다)",
  "NotebookLM으로 Enhans의 유튜브 채널, 홈페이지 블로그·채용공고를 지식화한 뒤 포트폴리오 뼈대 md 생성",
  "뼈대 md를 Claude Design에 넣어 홈페이지 초안 작성",
  "로컬 웹서버에서 테스트 및 내용 수정 반복",
  "Cloudflare에서 도메인 구매, Firebase 호스팅 + Vertex AI 연동",
  "클로드 디자인의 오버레이 코멘트 시스템을 차용해, 이 사이트 자체를 AI에게 손쉽게 수정 지시하는 사례로 만들었습니다",
  "Firebase 임베딩 모델로 RAG화하고 Vertex AI의 LLM을 붙여 챗봇 형태의 KB 구축 (Playwright MCP로 AI가 직접 진행)"
];
const colophonAfter = "일련의 과정을 거치며 지금의 페이지가 만들어졌습니다.";
const colophonSubtitle = "제가 생각하는 현재 AI(LLM)의 특장점";
const colophonStrengths = [
  "비정형 데이터를 정형 데이터로 가공해줄 수 있다는 것.",
  "사람처럼 추론하며, 컴퓨터에서 사람이 일하는 방식을 그대로 지시할 수 있다는 것."
];
const colophonClosing =
  "그래서 Enhans의 'Agent' 구축에 보탬이 될 수 있다고 봅니다.";

const techStack = [
  { label: "Frontend", items: ["React", "TypeScript", "Vite"] },
  { label: "Backend (API)", items: ["Node.js", "Express", "Cloud Run"] },
  { label: "AI / LLM", items: ["Vertex AI", "Gemini", "Embeddings (RAG)"] },
  { label: "Hosting", items: ["Firebase Hosting"] },
  { label: "Domain / DNS", items: ["Cloudflare"] }
];

function projectAnchor(id: string) {
  return `project-${id}`;
}

function getProjectDetail(id: string) {
  return projectDetails[id] ?? {
    id: projectAnchor(id),
    problem: "",
    actions: [],
    outcomes: [],
    dataFlow: [],
    layers: []
  };
}

function scrollToAnchor(anchor: string) {
  const target = document.getElementById(anchor);
  if (!target) {
    return;
  }

  if (target.classList.contains("proj")) {
    target.classList.add("open");
  }

  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 76);
  window.history.replaceState(null, "", `#${anchor}`);
  window.scrollTo({ top, behavior: "smooth" });
  target.classList.add("flash");
  window.setTimeout(() => target.classList.remove("flash"), 1100);
}

function hasKeyword(question: string, keywords: string[]) {
  const lower = question.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

// --- Inline content editing -------------------------------------------------

type EditState = {
  admin: boolean;
  resolve: (id: string, fallback: string) => string;
  setDraft: (id: string, value: string, fallback: string) => void;
  explainTech: (term: string) => void;
};

const EditCtx = createContext<EditState | null>(null);

function Editable({
  id,
  value,
  as = "span",
  className,
  display,
  multiline = false,
  stop = false,
  term = false
}: {
  id: string;
  value: string;
  as?: ElementType;
  className?: string;
  display?: (text: string) => ReactNode;
  multiline?: boolean;
  stop?: boolean;
  term?: boolean;
}) {
  const ctx = useContext(EditCtx);
  const text = ctx ? ctx.resolve(id, value) : value;
  const Tag = as;

  if (!ctx?.admin) {
    if (term && ctx?.explainTech) {
      const explain = ctx.explainTech;
      return (
        <Tag
          className={["term", className].filter(Boolean).join(" ")}
          id={id}
          role="button"
          tabIndex={0}
          title={`${text} 설명 보기`}
          onClick={() => explain(text)}
          onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              explain(text);
            }
          }}
        >
          {display ? display(text) : text}
        </Tag>
      );
    }
    return (
      <Tag className={className} id={id}>
        {display ? display(text) : text}
      </Tag>
    );
  }

  const classes = ["editable", multiline ? "editable-ml" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      className={classes}
      id={id}
      title={id}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-eid={id}
      onClick={stop ? (event: ReactMouseEvent) => event.stopPropagation() : undefined}
      onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onBlur={(event: ReactFocusEvent<HTMLElement>) => {
        const element = event.currentTarget;
        const raw = multiline ? element.innerText : element.textContent ?? "";
        const cleaned = raw.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trimEnd();
        ctx.setDraft(id, cleaned, value);
      }}
    >
      {text}
    </Tag>
  );
}

export default function App() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("about");
  const [openProjects, setOpenProjects] = useState<Set<string>>(
    () => new Set(projects[0] ? [projects[0].id] : [])
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState<{ term: string; nonce: number } | null>(null);
  const techSeedRef = useRef(0);
  const explainTech = useCallback((term: string) => {
    techSeedRef.current += 1;
    setChatSeed({ term, nonce: techSeedRef.current });
    setChatOpen(true);
  }, []);

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [admin, setAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content")
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => {
        if (!cancelled && data && typeof data === "object" && !Array.isArray(data)) {
          setOverrides(data as Record<string, string>);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observedIds = ["about", "motivation", "work"];
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = observedIds[0];
      for (const id of observedIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    window.setTimeout(() => scrollToAnchor(window.location.hash.slice(1)), 80);
  }, []);

  // 숨겨진 admin 진입: 입력칸 밖에서 "admin"을 순서대로 타이핑하면 로그인 모달이 열린다.
  useEffect(() => {
    let buffer = "";
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (event.key.length !== 1) return;
      buffer = (buffer + event.key.toLowerCase()).slice(-5);
      if (buffer === "admin") {
        buffer = "";
        setLoginOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const resolve = useCallback(
    (id: string, fallback: string) => {
      if (id in draft) return draft[id];
      if (id in overrides) return overrides[id];
      return fallback;
    },
    [draft, overrides]
  );

  const stageDraft = useCallback(
    (id: string, value: string, fallback: string) => {
      setDraft((current) => {
        const baseline = id in overrides ? overrides[id] : fallback;
        const next = { ...current };
        if (value === baseline) {
          delete next[id];
        } else {
          next[id] = value;
        }
        return next;
      });
      setSaveMsg("");
    },
    [overrides]
  );

  const dirtyCount = Object.keys(draft).length;

  const editValue = useMemo<EditState>(
    () => ({ admin, resolve, setDraft: stageDraft, explainTech }),
    [admin, resolve, stageDraft, explainTech]
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loginId, pw: loginPw })
      });
      if (!response.ok) {
        setLoginErr("아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      const data = (await response.json()) as { token: string };
      setToken(data.token);
      setAdmin(true);
      setLoginOpen(false);
      setLoginErr("");
      setLoginId("");
      setLoginPw("");
    } catch {
      setLoginErr("로그인 요청 실패. 개발 서버 상태를 확인해 주세요.");
    }
  };

  const logout = () => {
    setAdmin(false);
    setToken(null);
    setDraft({});
    setSaveMsg("");
  };

  const discard = () => {
    setDraft({});
    setSaveMsg("");
  };

  const save = async () => {
    if (dirtyCount === 0 || !token) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(draft)
      });
      if (response.status === 401) {
        setAdmin(false);
        setToken(null);
        setDraft({});
        setSaveMsg("세션이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setOverrides((current) => ({ ...current, ...draft }));
      setDraft({});
      setSaveMsg("저장되었습니다.");
    } catch {
      setSaveMsg("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleProject = (id: string) => {
    setOpenProjects((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const jumpToProject = (anchor: string) => {
    const projectId = anchor.replace(/^project-/, "");
    if (anchor.startsWith("project-")) {
      setOpenProjects((current) => new Set(current).add(projectId));
    }
    scrollToAnchor(anchor);
  };

  const brandInner = (
    <>
      <span className="dot" aria-hidden="true" />
      <span className="who">
        <Editable as="b" id="nav.name" value="김가람" stop />
        <Editable as="span" id="nav.role" value="Forward Deployed Engineer" stop />
      </span>
    </>
  );

  return (
    <EditCtx.Provider value={editValue}>
      <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
        <div className="wrap nav-wrap">
          {admin ? (
            <div className="brand">{brandInner}</div>
          ) : (
            <a
              className="brand"
              href="#about"
              onClick={(event) => {
                event.preventDefault();
                scrollToAnchor("about");
              }}
            >
              {brandInner}
            </a>
          )}
          <div className="nav-actions">
            <div className="nav-links">
              {navItems.map(([id, label]) => (
                <a
                  className={activeSection === id ? "active" : ""}
                  href={`#${id}`}
                  key={id}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToAnchor(id);
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
            <button className="nav-pdf" type="button" onClick={() => window.print()} aria-label="PDF로 저장">
              <Download size={15} aria-hidden="true" />
              PDF
            </button>
          </div>
        </div>
      </nav>

      <main id="top">
        <AboutSection />
        <MotivationSection />
        <div id="story">
          {storyActs.map((act) => (
            <section className="act" id={act.id} key={act.id}>
              <div className="wrap act-inner">
                <div className="act-meta">
                  {act.n ? <span className="act-n">{act.n}</span> : null}
                  <Editable as="span" className="act-tag" id={`story.${act.id}.tag`} value={act.tag} />
                </div>
                <Editable
                  as="h1"
                  className="act-title"
                  id={`story.${act.id}.title`}
                  value={act.title}
                  multiline
                  display={(text) =>
                    text.split("\n").map((line, index) => <span key={index}>{line}</span>)
                  }
                />
                <div className="act-body">
                  {act.body.map((line, index) => (
                    <Editable
                      key={index}
                      as="p"
                      id={`story.${act.id}.body.${index}`}
                      value={line}
                      display={(text) => renderStoryBody(text)}
                    />
                  ))}
                </div>
                {act.flow ? <FlowDiagram /> : null}
              </div>
            </section>
          ))}
        </div>

        <section className="work" id="work">
          <div className="wrap">
            <SectionHead
              idBase="section.work"
              tag="현장 기록"
              title="FDE 관련 수행 프로젝트"
              desc="각 프로젝트를 문제 · 데이터 플로우 · 내 역할 · 결과로 정리했습니다."
            />
            <div className="proj-list">
              {projects.map((project, index) => (
                <ProjectItem
                  key={project.id}
                  index={index}
                  admin={admin}
                  open={openProjects.has(project.id)}
                  project={project}
                  onToggle={() => toggleProject(project.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <ColophonSection onExplainTech={explainTech} />
        <ContactSection />
        <BgmSection />
      </main>

      {!chatOpen ? (
        <button className="fab" type="button" onClick={() => setChatOpen(true)} aria-label="포트폴리오 AI 챗봇 열기">
          <span className="fab-ic">
            <img src="/assets/daftpunk_logo.png" alt="" aria-hidden="true" />
          </span>
          <span className="fab-label">AI에게 물어보기</span>
        </button>
      ) : null}
      <PortfolioChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onJump={jumpToProject}
        onDownloadPdf={() => window.print()}
        seed={chatSeed}
      />

      {import.meta.env.DEV ? <CommentMode /> : null}

      {loginOpen ? (
        <div className="modal-back" onClick={() => setLoginOpen(false)}>
          <form className="login-box" onClick={(event) => event.stopPropagation()} onSubmit={handleLogin}>
            <h3>Admin 로그인</h3>
            <input
              className="login-input"
              type="text"
              autoComplete="username"
              placeholder="아이디"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoFocus
            />
            <input
              className="login-input"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              value={loginPw}
              onChange={(event) => setLoginPw(event.target.value)}
            />
            {loginErr ? <p className="login-err">{loginErr}</p> : null}
            <div className="login-actions">
              <button type="button" onClick={() => setLoginOpen(false)}>
                취소
              </button>
              <button type="submit">로그인</button>
            </div>
          </form>
        </div>
      ) : null}

      {admin ? (
        <div className="edit-bar">
          <span className="edit-status">
            {dirtyCount > 0 ? `${dirtyCount}건 변경됨` : "편집 모드"}
            {saveMsg ? ` · ${saveMsg}` : ""}
          </span>
          <button className="eb-ghost" type="button" onClick={discard} disabled={dirtyCount === 0 || saving}>
            되돌리기
          </button>
          <button className="eb-primary" type="button" onClick={save} disabled={dirtyCount === 0 || saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
          <button className="eb-ghost" type="button" onClick={logout}>
            로그아웃
          </button>
        </div>
      ) : null}
    </EditCtx.Provider>
  );
}

function highlightKeywords(text: string) {
  const keywords = ["요구사항 추출", "데이터의 흐름", "데이터", "질문"];
  const parts = text.split(/(요구사항 추출|데이터의 흐름|데이터|질문)/g);
  return parts.map((part, index) =>
    keywords.includes(part) ? (
      <em key={`${part}-${index}`}>{part}</em>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function renderStoryBody(text: string): ReactNode {
  const match = text.match(/^(.*?)('[^']*')(.*)$/);
  if (!match) {
    return highlightKeywords(text);
  }
  const [, before, quote, after] = match;
  return (
    <>
      {highlightKeywords(before.replace(/\s+$/, ""))}
      <br />
      <span className="story-quote">{quote}</span>
      {after.trim() ? (
        <>
          <br />
          {highlightKeywords(after.replace(/^\s+/, ""))}
        </>
      ) : null}
    </>
  );
}

function SectionHead({ idBase, tag, title, desc }: { idBase: string; tag: string; title: string; desc: string }) {
  return (
    <div className="section-head">
      <Editable as="span" className="eyebrow" id={`${idBase}.eyebrow`} value={tag} />
      <Editable as="h2" id={`${idBase}.title`} value={title} />
      <Editable as="p" id={`${idBase}.desc`} value={desc} />
    </div>
  );
}

function CollapsibleSection({
  id,
  eyebrow,
  title,
  defaultOpen = true,
  tint = false,
  children
}: {
  id: string;
  eyebrow: string;
  title: string;
  defaultOpen?: boolean;
  tint?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`csec ${tint ? "csec-tint" : ""} ${open ? "open" : ""}`} id={id}>
      <div className="wrap">
        <div className="csec-head" role="button" tabIndex={0} onClick={() => setOpen((value) => !value)}>
          <span className="csec-head-text">
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </span>
          <span className="csec-toggle" aria-hidden="true">+</span>
        </div>
        <div className="csec-body">
          <div className="csec-body-inner">
            <div className="csec-body-pad">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <CollapsibleSection id="about" eyebrow="About" title="김가람 · Forward Deployed Engineer 지원">
      <Editable as="p" className="about-summary" id="about.summary" value={aboutSummary} multiline />
      <div className="about-facts">
        {aboutFacts.map((fact, index) => (
          <Editable as="span" key={index} id={`about.fact.${index}`} value={fact} />
        ))}
      </div>
      <div className="about-llm-pov">
        <Editable as="h3" className="about-sub-title" id="colophon.subtitle" value={colophonSubtitle} />
        <ol className="colophon-strengths">
          {colophonStrengths.map((item, index) => (
            <Editable key={index} as="li" id={`colophon.strength.${index}`} value={item} />
          ))}
        </ol>
        <Editable as="p" className="colophon-p" id="colophon.closing" value={colophonClosing} />
      </div>
      <CareerBlock />
      <BackgroundBlock />
    </CollapsibleSection>
  );
}

function CareerBlock() {
  return (
    <div className="about-sub" id="career">
      <h3 className="about-sub-title">경력</h3>
      <div className="career">
        {careerEntries.map((entry, index) => (
          <div className="career-item" key={entry.company}>
            <div className="career-when">
              <Editable as="span" className="career-period" id={`career.${index}.period`} value={entry.period} />
              <Editable as="span" className="career-co" id={`career.${index}.company`} value={entry.company} />
              <Editable as="span" className="career-role" id={`career.${index}.role`} value={entry.role} />
            </div>
            <div>
              <ul className="career-points">
                {entry.points.map((point, pointIndex) => (
                  <Editable as="li" key={pointIndex} id={`career.${index}.point.${pointIndex}`} value={point} />
                ))}
              </ul>
              <div className="career-stack">
                {entry.stack.map((tech, techIndex) => (
                  <Editable as="em" key={techIndex} id={`career.${index}.stack.${techIndex}`} value={tech} term />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BackgroundBlock() {
  return (
    <div className="about-sub" id="background">
      <h3 className="about-sub-title">학력 · 자격 · 병역</h3>
      <div className="bg-grid">
        {backgroundBlocks.map((block, index) => (
          <div className="bg-block" key={block.label}>
            <div className="dh">{block.label}</div>
            <ul>
              {block.items.map((item, itemIndex) => (
                <Editable as="li" key={itemIndex} id={`bg.${index}.item.${itemIndex}`} value={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowDiagram() {
  return (
    <>
      <div className="vdpm-embed-wrap">
        <iframe
          className="vdpm-embed"
          src="/vdpm-flow.html"
          title="VDPM System Data Flow"
          loading="lazy"
        />
        <img className="vdpm-print" src="/assets/vdpm-flow.png" alt="VDPM System Data Flow" />
      </div>
      <Editable
        as="p"
        className="flow-caption"
        id="flow.vdpm.caption"
        value="실제 솔루션 사례 — VDPM 시스템의 데이터 흐름 (장비 → 수집 → 서버 → 운영 화면)."
      />
    </>
  );
}

function ProjectItem({
  admin,
  index,
  onToggle,
  open,
  project
}: {
  admin: boolean;
  index: number;
  onToggle: () => void;
  open: boolean;
  project: KnowledgeEntry;
}) {
  const detail = getProjectDetail(project.id);
  const num = String(index + 1).padStart(2, "0");
  const headInner = (
    <>
      <span className="proj-title-wrap">
        <span className="proj-meta-row">
          <span className="proj-num">{num}</span>
          <Editable as="span" className="proj-cat" id={`kb.${project.id}.category`} value={project.category} stop />
        </span>
        <Editable as="span" className="proj-title" id={`kb.${project.id}.title`} value={project.title} stop />
        <Editable as="span" className="proj-short" id={`kb.${project.id}.summary`} value={project.summary} stop />
      </span>
      <span className="proj-toggle" aria-hidden="true">+</span>
    </>
  );
  return (
    <article className={`proj ${open ? "open" : ""}`} id={projectAnchor(project.id)}>
      {admin ? (
        <div className="proj-head" role="button" tabIndex={0} onClick={onToggle}>
          {headInner}
        </div>
      ) : (
        <button className="proj-head" type="button" onClick={onToggle}>
          {headInner}
        </button>
      )}
      <div className="proj-body">
        <div className="proj-body-inner">
          {project.id === "gjpp-digital-twin" ? (
            <div className="project-embed-wrap">
              <iframe
                className="project-embed"
                src="/digital-twin-flow.html"
                title="경주풍력 Digital Twin Data Flow"
                loading="lazy"
              />
            </div>
          ) : null}
          {project.id === "frog-ai" ? (
            <div className="project-store-links">
              <a
                href="https://apps.apple.com/kr/app/프로그-ai-냉장고-관리/id6760898228"
                target="_blank"
                rel="noreferrer"
              >
                App Store ↗
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.ramga.frog&pcampaignid=web_share"
                target="_blank"
                rel="noreferrer"
              >
                Google Play ↗
              </a>
            </div>
          ) : null}
          {project.id === "gjpp-digital-twin" ? (
            <div className="project-flow-panel project-lesson-panel">
              <div className="dh">배운 점</div>
              <p className="project-lesson">
                <strong>기술 선정의 중요성:</strong> 팀에서는 프로젝트 시작 전에 어떤 기술 스택을 사용할지, 통신 프로토콜은 무엇을 쓸지 시장 조사에 아주 많은 시간을 사용했고, 결과적으로는 그 덕분에 제시간 안에 끝낼 수 있었습니다.
              </p>
            </div>
          ) : (
          <div className="project-flow-panel">
            <div className="dh">DATA FLOW</div>
            <div
              className="project-flow"
              style={{ gridTemplateColumns: `repeat(${detail.dataFlow.length}, minmax(0, 1fr))` }}
            >
              {detail.dataFlow.map((node, nodeIndex) => (
                <div className="flow-step-wrap" key={`${project.id}-${nodeIndex}`}>
                  <div className="flow-step">
                    <span className="flow-step-index">{String(nodeIndex + 1).padStart(2, "0")}</span>
                    <Editable
                      as="strong"
                      id={`project.${project.id}.flow.${nodeIndex}.label`}
                      value={node.label}
                    />
                    <Editable
                      as="span"
                      id={`project.${project.id}.flow.${nodeIndex}.meta`}
                      value={node.meta}
                    />
                  </div>
                  {nodeIndex < detail.dataFlow.length - 1 ? (
                    <span className="project-flow-arrow" aria-hidden="true">→</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          )}
          <div className="proj-detail">
            {project.id !== "gjpp-digital-twin" ? (
              <>
                <div className="detail-block span2 problem">
                  <div className="dh">PROBLEM</div>
                  <Editable as="p" id={`project.${project.id}.problem`} value={detail.problem} />
                </div>
                <div className="detail-block approach-block">
                  <div className="dh">APPROACH</div>
                  <ul>
                    {detail.actions.map((action, actionIndex) => (
                      <Editable
                        as="li"
                        key={actionIndex}
                        id={`project.${project.id}.action.${actionIndex}`}
                        value={action}
                      />
                    ))}
                  </ul>
                </div>
                <div className="detail-block result-block">
                  <div className="dh">RESULT</div>
                  <ul>
                    {detail.outcomes.map((outcome, outcomeIndex) => (
                      <Editable
                        as="li"
                        key={outcomeIndex}
                        id={`project.${project.id}.outcome.${outcomeIndex}`}
                        value={outcome}
                      />
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
            <div className="detail-block span2 stack">
              <div className="dh">STACK</div>
              <div className="tags">
                {project.technologies.map((tech, techIndex) => (
                  <Editable
                    as="span"
                    className="tag"
                    key={techIndex}
                    id={`kb.${project.id}.technologies.${techIndex}`}
                    value={tech}
                    term
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function linkifyInterview(text: string): ReactNode {
  const target = "인터뷰 영상";
  const index = text.indexOf(target);
  if (index === -1) {
    return text;
  }
  return (
    <>
      {text.slice(0, index)}
      <a className="ilink" href="https://youtu.be/w1QD28jkeAg" target="_blank" rel="noreferrer">
        {target}
      </a>
      {text.slice(index + target.length)}
    </>
  );
}

function MotivationSection() {
  return (
    <section className="motivation" id="motivation">
      <div className="wrap">
        <div className="motivation-inner">
          <span className="eyebrow">Why Enhans</span>
          <Editable as="h2" className="motivation-title" id="motivation.title" value="지원 동기" />
          <Editable as="p" className="motivation-note" id="motivation.note" value="* 이 섹션은 AI의 도움 없이 작성되었습니다." />
          <div className="motivation-body">
            {motivationBody.map((paragraph, index) => (
              <Editable
                key={index}
                as="p"
                id={`motivation.body.${index}`}
                value={paragraph}
                display={linkifyInterview}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ColophonSection({ onExplainTech }: { onExplainTech: (term: string) => void }) {
  return (
    <section className="colophon" id="colophon">
      <div className="wrap">
        <div className="colophon-inner">
          <span className="eyebrow">마치며</span>
          <Editable as="h2" className="colophon-title" id="colophon.title" value={colophonTitle} />
          <Editable as="p" className="colophon-note" id="colophon.note" value={colophonNote} />

          <ol className="colophon-steps">
            {colophonSteps.map((step, index) => (
              <Editable key={index} as="li" id={`colophon.step.${index}`} value={step} />
            ))}
          </ol>
          <Editable as="p" className="colophon-p" id="colophon.after" value={colophonAfter} />

          <div className="colophon-links">
            <a href="https://github.com/RamGaku/portfolio" target="_blank" rel="noreferrer">
              <Github size={16} aria-hidden="true" />
              이 사이트 소스 코드
            </a>
          </div>

          <Editable as="h3" className="colophon-sub colophon-stack-title" id="colophon.stacktitle" value="이 사이트를 만든 기술 스택" />
          <div className="stack-grid">
            {techStack.map((category) => (
              <div className="stack-cat" key={category.label}>
                <div className="dh">{category.label}</div>
                <div className="stack-chips">
                  {category.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="tech-chip"
                      title={`${item} 설명`}
                      onClick={() => onExplainTech(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="contact" id="contact">
      <div className="wrap">
        <span className="eyebrow">Contact</span>
        <div className="contact-links">
          <a href="https://github.com/RamGaku" target="_blank" rel="noreferrer">
            <Github size={16} aria-hidden="true" />
            github.com/RamGaku
          </a>
          <a href="mailto:rkfka0419@gmail.com">
            <Mail size={16} aria-hidden="true" />
            rkfka0419@gmail.com
          </a>
        </div>
      </div>
    </section>
  );
}

function BgmSection() {
  return (
    <section className="bgm" id="bgm">
      <div className="wrap">
        <span className="eyebrow">BGM</span>
        <div className="bgm-frame">
          <iframe
            src="https://www.youtube.com/embed/sOS9aOIXPEk?list=RDsOS9aOIXPEk"
            title="Daft Punk - Something About Us"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <p className="bgm-cap">Daft Punk — Something About Us</p>
      </div>
    </section>
  );
}

function PortfolioChat({
  onClose,
  onJump,
  onDownloadPdf,
  open,
  seed
}: {
  onClose: () => void;
  onJump: (anchor: string) => void;
  onDownloadPdf: () => void;
  open: boolean;
  seed: { term: string; nonce: number } | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: CHAT_INTRO
    }
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const seedRef = useRef(0);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const ask = async (value: string, isTerm = false) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setQuestion("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    if (
      hasKeyword(trimmed, [
        "pdf",
        "피디에프",
        "다운로드",
        "내려받",
        "인쇄",
        "출력",
        "이력서 받",
        "이력서 저장",
        "이력서 다운",
        "이력서로 저장"
      ])
    ) {
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            role: "bot",
            content:
              "이 포트폴리오를 PDF로 저장할 수 있어요. 아래 버튼을 누르면 인쇄 창이 열립니다 — 대상(목적지)을 'PDF로 저장'으로 선택하면 됩니다. 우상단의 PDF 버튼으로도 가능합니다.",
            pdf: true
          }
        ]);
        setLoading(false);
      }, 320);
      return;
    }

    const scripted = scriptedIntents.find((intent) => hasKeyword(trimmed, intent.keys));
    if (scripted) {
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            role: "bot",
            content: scripted.reply
          }
        ]);
        setLoading(false);
      }, 320);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, term: isTerm })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as ChatResponse;
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: data.answer,
          sources: data.sources,
          mode: data.mode
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: "로컬 API 응답을 받지 못했습니다. 개발 서버 상태를 확인해 주세요."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  // 기술 스택 칩을 누르면 해당 용어를 챗봇(AI)에게 물어본다.
  useEffect(() => {
    if (!seed || seed.nonce === seedRef.current) return;
    seedRef.current = seed.nonce;
    void ask(`${seed.term}가 뭐야? 간단히 설명해줘`, true);
  }, [seed]);

  return (
    <aside className={`chat ${open ? "open" : ""}`} aria-live="polite">
      <div className="chat-head">
        <button className="av" type="button" onClick={onClose} aria-label="Close chat">
          <img src="/assets/daftpunk_logo.png" alt="" aria-hidden="true" />
        </button>
        <div className="ht">
          <b>
            <span className="live" />
            <Editable as="span" id="chat.title" value="포트폴리오 KB" />
          </b>
          <Editable as="span" id="chat.subtitle" value="Vertex AI + 공개 KB" />
        </div>
        <button className="chat-close" type="button" onClick={onClose} aria-label="Close chat">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {messages.map((message, index) => (
          <div className={`msg ${message.role}`} key={`${message.role}-${index}`}>
            {index === 0 && message.role === "bot" ? (
              <Editable as="p" id="chat.intro" value={CHAT_INTRO} multiline />
            ) : (
              <p>{message.content}</p>
            )}
            {message.jump ? (
              <button className="jump" type="button" onClick={() => onJump(message.jump!.anchor)}>
                {message.jump.label}
              </button>
            ) : null}
            {message.pdf ? (
              <button className="jump" type="button" onClick={onDownloadPdf}>
                PDF로 저장
              </button>
            ) : null}
            {message.sources?.length ? (
              <div className="source-links">
                {message.sources.slice(0, 1).map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => onJump(projectAnchor(source.id))}
                  >
                    {source.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {loading ? (
          <div className="typing" aria-label="typing">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>
      <div className="chat-prompts">
        {promptChips.map(([label, prompt]) => (
          <button className="chip" type="button" key={label} onClick={() => void ask(prompt)}>
            {label}
          </button>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          autoComplete="off"
          placeholder="포트폴리오에 대해 물어보세요..."
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" disabled={!question.trim() || loading} aria-label="Send">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
