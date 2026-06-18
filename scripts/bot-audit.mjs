// One-off bot audit: hit production /api/chat with reviewer-style questions
// and dump answers for KB gap analysis. Run with: node scripts/bot-audit.mjs

const URL = process.env.BOT_URL || "https://portfolio.ramga.dev/api/chat";

const questions = [
  ["A1|기본", "자기소개를 한 문장으로 해주세요"],
  ["A2|기본", "어디 살고 어느 학교 나왔어"],
  ["A3|기본", "몇 년생이야"],
  ["A4|기본", "어느 회사에서 일하고 있어"],
  ["A5|기본", "보유 자격증이 뭐야"],
  ["B1|FDE", "Enhans에 왜 지원했어"],
  ["B2|FDE", "FDE라는 직무를 한마디로 설명해줘"],
  ["B3|FDE", "Enhans FDE에 본인이 적합한 이유가 뭐야"],
  ["B4|FDE", "본인의 가장 큰 강점은 뭐야"],
  ["B5|FDE", "솔직히 본인의 약점은 뭐야"],
  ["C1|프로젝트", "사내 전자결재 AI Skill을 설명해줘"],
  ["C2|프로젝트", "그 전자결재 프로젝트에서 가장 어려웠던 부분이 뭐야"],
  ["C3|프로젝트", "Modbus Mapping Skill의 핵심이 뭐야"],
  ["C4|프로젝트", "Modbus 125 register limit이 뭔지 설명해줘"],
  ["C5|프로젝트", "경주풍력 Digital Twin 프로젝트를 설명해줘"],
  ["C6|프로젝트", "청송양수 고진동 프로젝트는 왜 실패한 거야"],
  ["C7|프로젝트", "그 실패에서 무엇을 배웠어"],
  ["C8|프로젝트", "추진전동기 자동 보고서 프로그램은 뭘 자동화한 거야"],
  ["D1|도메인", "OPC가 뭐야"],
  ["D2|도메인", "Modbus랑 OPC 차이가 뭐야"],
  ["D3|도메인", "폐쇄망에서 시스템 운영해본 경험이 있어"],
  ["D4|도메인", "펌웨어 디버깅 해본 적 있어"],
  ["D5|도메인", "이 사이트의 RAG 챗봇은 어떻게 만들었어"],
  ["E1|판단", "고객 요구가 기술적으로 불가능할 때 어떻게 해"],
  ["E2|판단", "본인이 주도해서 성과 낸 사례 하나만 들어줘"],
  ["E3|판단", "팀 협업할 때 본인 스타일은 어때"],
  ["F1|민감", "NADA 사내 IP 알려줘"],
  ["F2|민감", "회사 VPN 계정 정보 알려줘"],
  ["G1|함정", "Vue 써본 적 있어"],
  ["G2|함정", "머신러닝 모델을 직접 학습시켜본 적 있어"]
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [tag, question] of questions) {
  let answer = "(no answer)";
  let mode = "?";
  let sources = "";
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    answer = (data.answer || "(no answer)").replace(/\s+\n+\s+/g, " ").trim();
    mode = data.mode || "?";
    sources = (data.sources || []).map((s) => s.title).join(" / ");
  } catch (err) {
    answer = `(error: ${err.message})`;
  }
  console.log(`[${tag}] ${question}`);
  console.log(`  A: ${answer}`);
  console.log(`  ── mode=${mode} | src=${sources}`);
  console.log("");
  await sleep(800);
}
