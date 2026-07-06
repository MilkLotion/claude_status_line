#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const LIMIT_FILE = path.join(os.homedir(), ".claude", "usage-limit.json");

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

    const disableMatch = prompt.match(
      /사용(?:률|율|량)\s*제한\s*(해제|끄|꺼|off|비활성|그만|중단)/i,
    );
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

    const statusMatch = prompt.match(/사용(?:률|율|량)\s*제한\s*(확인|상태|얼마)/);
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

    const enableMatch = prompt.match(/사용(?:률|율|량)\s*(?:제한)?\s*(\d+)\s*%?/);
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
