#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const LIMIT_FILE = path.join(os.homedir(), ".claude", "usage-limit.json");

// ─── 유사어 사전 ───
// "사용 제한", "사용률 제한", "세션 한도 제한" 등 사용자가 다양하게 표현해도 인식하도록
// 두 그룹의 동의어를 조합해서 매칭한다: (무엇을 제한하는지 지칭하는 말) + (제한 그 자체를 뜻하는 말)
const USAGE_TERMS = [
  "세션",
  "사용률",
  "사용율",
  "사용량",
  "사용",
  "쿼터",
  "quota",
  "usage",
];
const LIMIT_TERMS = ["제한", "한도", "캡", "cap", "리밋", "limit"];

const USAGE_RE = USAGE_TERMS.join("|");
const LIMIT_RE = LIMIT_TERMS.join("|");
// 두 단어 사이 최대 12자까지 허용 — 예: "세션 한도 제한"의 "한도" 부분이 이 간격에 낌
const GAP = "[^.!?\\n]{0,12}";

const DISABLE_RE = new RegExp(
  `(?:${USAGE_RE})${GAP}(?:${LIMIT_RE})\\s*(해제|끄|꺼|off|비활성|그만|중단)`,
  "i",
);
const STATUS_RE = new RegExp(
  `(?:${USAGE_RE})${GAP}(?:${LIMIT_RE})\\s*(확인|상태|얼마)`,
  "i",
);
const ENABLE_RE = new RegExp(
  `(?:${USAGE_RE})${GAP}(?:${LIMIT_RE})?\\s*(\\d+)\\s*%?`,
  "i",
);

function emitContext(message) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: message,
      },
    }),
  );
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const prompt = data.prompt || "";
    const sessionId = data.session_id || "";

    const disableMatch = prompt.match(DISABLE_RE);
    if (disableMatch) {
      if (fs.existsSync(LIMIT_FILE)) {
        const existing = JSON.parse(fs.readFileSync(LIMIT_FILE, "utf8"));
        existing.active = false;
        fs.writeFileSync(LIMIT_FILE, JSON.stringify(existing, null, 2));
      }
      emitContext(
        "[사용률 제한 훅] 이 세션의 사용률 제한을 비활성화했다. 사용자에게 비활성화됐다고 응답에서 확인해줄 것.",
      );
      return process.exit(0);
    }

    const statusMatch = prompt.match(STATUS_RE);
    if (statusMatch) {
      if (fs.existsSync(LIMIT_FILE)) {
        const existing = JSON.parse(fs.readFileSync(LIMIT_FILE, "utf8"));
        const scope = existing.session_id
          ? existing.session_id === sessionId
            ? "이 세션"
            : "다른 세션(session_id 불일치 — 이 세션에는 적용 안 됨)"
          : "세션 구분 없음(레거시 설정 — 모든 세션에 적용됨)";
        emitContext(
          `[사용률 제한 훅] 현재 설정: active=${existing.active}, threshold=${existing.threshold}%, 적용 범위=${scope}. 사용자에게 이 상태를 그대로 알려줄 것.`,
        );
      } else {
        emitContext(
          "[사용률 제한 훅] 설정된 사용률 제한이 없다. 사용자에게 알려줄 것.",
        );
      }
      return process.exit(0);
    }

    const enableMatch = prompt.match(ENABLE_RE);
    if (enableMatch) {
      const threshold = parseInt(enableMatch[1], 10);
      if (threshold > 0 && threshold <= 100) {
        const config = {
          threshold,
          active: true,
          session_id: sessionId,
          created_at: Date.now(),
        };
        fs.writeFileSync(LIMIT_FILE, JSON.stringify(config, null, 2));
        emitContext(
          `[사용률 제한 훅] 이 세션에만 사용률 제한을 활성화했다 (임계값 ${threshold}%). 5시간 사용률은 계정 전체 기준이라 다른 세션의 사용량에도 영향받을 수 있음을 함께 사용자에게 알려줄 것.`,
        );
      }
    }
  } catch {
    // 에러 무시
  }
  process.exit(0);
});
