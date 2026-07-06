#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Code Custom StatusLine Generator
Reads session data from Claude Code's built-in stdin JSON.
No external dependencies required.
"""
import json
import os
import subprocess
import sys
import io
from datetime import datetime, timedelta

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def get_indicator(pct):
    """Colored circle based on usage percentage."""
    if pct is None:
        return "⚪"
    if pct <= 60:
        return "🟢"
    if pct <= 80:
        return "🟠"
    return "🔴"


def get_git_branch(cwd):
    """Get current git branch name, or empty string if not in a repo."""
    try:
        result = subprocess.run(
            ["git", "-C", cwd, "symbolic-ref", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def build_dir_segment(cwd):
    """현재 작업 디렉토리 이름과 git 브랜치만 표시."""
    dir_name = os.path.basename(cwd.replace("\\", "/").rstrip("/")) or cwd
    branch = get_git_branch(cwd)
    branch_str = f" ({branch})" if branch else ""
    return f"{dir_name}{branch_str}"


def get_usage_limit_segment(session_id):
    """~/.claude/usage-limit.json 상태 표시 (usage-limit-detect/check 훅과 짝을 이루는 세션별 사용률 제한 기능)."""
    limit_path = os.path.join(os.path.expanduser("~"), ".claude", "usage-limit.json")
    try:
        with open(limit_path, "r", encoding="utf-8") as f:
            limit = json.load(f)
    except Exception:
        return None

    if not limit.get("active"):
        return None

    threshold = limit.get("threshold")
    limit_session = limit.get("session_id")

    if not limit_session:
        return f"🎯 제한 {threshold}% (전체 세션)"
    if session_id and limit_session != session_id:
        return f"🎯 제한 {threshold}% (다른 세션)"
    return f"🎯 제한 {threshold}% (이 세션)"


def format_statusline(data):
    """Build statusline from Claude Code's stdin JSON."""
    if not data:
        return "⚠️ No data"

    parts = []

    # ── Model + Effort ──
    model = data.get("model", {})
    model_name = model.get("display_name", "")

    # effort.level: 모델이 reasoning effort 를 지원할 때만 존재
    effort_level = data.get("effort", {}).get("level")
    model_label = f"{model_name} · {effort_level}" if effort_level else model_name

    # ── Rate Limits (5-hour block) ──
    rate_limits = data.get("rate_limits", {})
    five_hour = rate_limits.get("five_hour", {})
    five_hour_pct = five_hour.get("used_percentage")
    resets_at = five_hour.get("resets_at")

    indicator = get_indicator(five_hour_pct)

    if resets_at:
        reset_time = datetime.fromtimestamp(resets_at)
        block_start = reset_time - timedelta(hours=5)
        now = datetime.now()

        start_str = block_start.strftime("%Y-%m-%d %I:%M %p")
        end_str = reset_time.strftime("%I:%M %p")

        elapsed = now - block_start
        remaining = reset_time - now

        elapsed_secs = max(0, elapsed.total_seconds())
        remaining_secs = max(0, remaining.total_seconds())

        eh, em = int(elapsed_secs // 3600), int((elapsed_secs % 3600) // 60)
        rh, rm = int(remaining_secs // 3600), int((remaining_secs % 3600) // 60)

        parts.append(f"{indicator}  {start_str} ~ {end_str}")
        parts.append(f"⏱️ {eh}h {em}m")
        parts.append(f"⏳ {rh}h {rm}m")
    else:
        parts.append("⚪  -")
        parts.append("⏱️ -")
        parts.append("⏳ -")

    # ── Context Window ──
    ctx = data.get("context_window", {})
    ctx_pct = ctx.get("used_percentage")
    parts.append(f"📋 context {int(ctx_pct)}%" if ctx_pct is not None else "📋 context -")

    parts.append(f"📊 5h {five_hour_pct:.1f}%" if five_hour_pct is not None else "📊 5h -")

    # ── 사용률 제한 훅 상태 ──
    usage_limit_segment = get_usage_limit_segment(data.get("session_id"))
    if usage_limit_segment:
        parts.append(usage_limit_segment)

    # ── Rate Limits (7-day block) ──
    seven_day = rate_limits.get("seven_day", {})
    seven_day_pct = seven_day.get("used_percentage")
    if seven_day_pct is not None:
        parts.append(f"📅 7d {get_indicator(seven_day_pct)} {seven_day_pct:.1f}%")

    # ── Cost ──
    cost = data.get("cost", {})
    total_cost = cost.get("total_cost_usd", 0)
    parts.append(f"💰 ${total_cost:.2f}" if total_cost else "💰 -")

    # ── 디렉토리 세그먼트 ──
    cwd = (
        data.get("workspace", {}).get("current_dir")
        or data.get("cwd")
        or os.getcwd()
    )
    dir_segment = build_dir_segment(cwd)

    return f"{dir_segment}  [{model_label}]  " + " | ".join(parts)


def save_usage_snapshot(data):
    """5시간 사용률 스냅샷을 기록 (usage-limit-check 후크가 소비)."""
    if not data:
        return
    try:
        rate_limits = data.get("rate_limits", {})
        five_hour = rate_limits.get("five_hour", {})
        snapshot = {
            "five_hour_pct": five_hour.get("used_percentage"),
            "resets_at": five_hour.get("resets_at"),
            "timestamp": int(datetime.now().timestamp()),
        }
        snapshot_path = os.path.join(os.path.expanduser("~"), ".claude", "usage-snapshot.json")
        with open(snapshot_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f)
    except Exception:
        pass


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        data = None
    print(format_statusline(data))
    save_usage_snapshot(data)


if __name__ == "__main__":
    main()
