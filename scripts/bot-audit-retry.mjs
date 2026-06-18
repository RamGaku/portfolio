// Retry the questions that fell back to local-fallback in v2 audit.

const URL = "https://portfolio.ramga.dev/api/chat";

const questions = [
  ["B1|FDE", "Enhans에 왜 지원했어"],
  ["B3|FDE", "Enhans FDE에 본인이 적합한 이유가 뭐야"],
  ["C1|프로젝트", "사내 전자결재 AI Skill을 설명해줘"],
  ["C3|프로젝트", "Modbus Mapping Skill의 핵심이 뭐야"],
  ["C7|프로젝트", "그 실패에서 무엇을 배웠어"],
  ["D2|도메인", "Modbus랑 OPC 차이가 뭐야"],
  ["D3|도메인", "폐쇄망에서 시스템 운영해본 경험이 있어"],
  ["E3|판단", "팀 협업할 때 본인 스타일은 어때"],
  ["G2|함정", "머신러닝 모델을 직접 학습시켜본 적 있어"]
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [tag, question] of questions) {
  let answer = "(no answer)";
  let mode = "?";
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    answer = (data.answer || "(no answer)").replace(/\s+\n+\s+/g, " ").trim();
    mode = data.mode || "?";
  } catch (err) {
    answer = `(error: ${err.message})`;
  }
  console.log(`[${tag}] ${question}`);
  console.log(`  A: ${answer}`);
  console.log(`  ── mode=${mode}`);
  console.log("");
  await sleep(1500);
}
