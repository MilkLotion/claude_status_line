#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude Code Custom StatusLine Generator
Reads session data from Claude Code's built-in stdin JSON.
No external dependencies required.
"""
import json
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


def format_number(n):
    """Format integer with comma separators."""
    return f"{n:,}"


def format_statusline(data):
    """Build statusline from Claude Code's stdin JSON."""
    if not data:
        return "⚠️ No data"

    parts = []

    # ── Model ──
    model = data.get("model", {})
    model_name = model.get("display_name", "")

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

    # ── Context Window & Session Usage ──
    ctx = data.get("context_window", {})
    total_input = ctx.get("total_input_tokens", 0)
    total_output = ctx.get("total_output_tokens", 0)
    total_tokens = total_input + total_output
    ctx_pct = ctx.get("used_percentage")

    if ctx_pct is not None:
        parts.append(f"📋 context {int(ctx_pct)}% ( 🔥 {format_number(total_tokens)} token )")

    if five_hour_pct is not None:
        parts.append(f"📊 usage {five_hour_pct:.1f}% ( 🔥 {format_number(total_tokens)} token )")

    # ── Cost ──
    cost = data.get("cost", {})
    total_cost = cost.get("total_cost_usd", 0)
    if total_cost:
        parts.append(f"💰 ${total_cost:.2f}")

    if not parts:
        return f"⚪ [{model_name}] waiting..."

    return f"[{model_name}]  " + " | ".join(parts)


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        data = None
    print(format_statusline(data))


if __name__ == "__main__":
    main()
