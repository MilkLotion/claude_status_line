#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const LIMIT_FILE = path.join(CLAUDE_DIR, "usage-limit.json");
const SNAPSHOT_FILE = path.join(CLAUDE_DIR, "usage-snapshot.json");
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    if (!fs.existsSync(LIMIT_FILE)) return process.exit(0);

    const limit = JSON.parse(fs.readFileSync(LIMIT_FILE, "utf8"));
    if (!limit.active) return process.exit(0);

    let sessionId = "";
    try {
      const data = JSON.parse(input);
      sessionId = data.session_id || "";
    } catch {
      // stdin 파싱 실패 시 세션 체크 건너뜀
    }

    if (limit.session_id && sessionId && limit.session_id !== sessionId) {
      return process.exit(0);
    }

    if (!fs.existsSync(SNAPSHOT_FILE)) return process.exit(0);

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));

    if (snapshot.timestamp) {
      const age = Date.now() - snapshot.timestamp * 1000;
      if (age > STALE_THRESHOLD_MS) return process.exit(0);
    }

    const pct = snapshot.five_hour_pct;
    if (pct !== null && pct !== undefined && pct >= limit.threshold) {
      process.stderr.write(
        `⚠ 사용률 ${pct.toFixed(1)}% — 임계값 ${limit.threshold}% 초과. 작업을 중단합니다.\n`
      );
      process.exit(2);
    }
  } catch {
    // 에러 무시
  }
  process.exit(0);
});
