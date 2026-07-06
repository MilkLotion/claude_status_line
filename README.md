# Status Line for Claude Code

Claude Code의 활성 블록(5시간) 정보와 컨텍스트·사용량·비용을 표시하는 커스텀 상태줄입니다.  
해당 코드는 Claude Pro 요금제를 사용하는 기준으로 작성되었습니다.  
외부 의존성 없이, Claude Code가 stdin 으로 전달하는 JSON 만으로 동작합니다.

## Features / 기능

- 📂 **Directory & Branch**: 현재 작업 디렉토리 이름과 git 브랜치 표시
- 🧠 **Model & Effort**: 현재 모델명과 reasoning effort 단계(`· high` 등, 지원 모델만)
- ⏰ **Time Tracking**: 5시간 블록의 시작/종료 시간, 사용 시간, 남은 시간 출력
- 📋 **Context Window**: 컨텍스트 윈도우 사용률(%) 표기
- 📊 **5h Usage**: 5시간 레이트 리밋 사용률(%) 표기
- 🎯 **Usage Limit**: 세션별 사용률 제한 — 프롬프트에 문구를 치면 그 세션에만 5시간 사용률 임계값을 걸 수 있음 (한국어 트리거 문구 전용, 아래 [Usage Limit](#usage-limit--세션별-사용률-제한) 참고)
- 📅 **7d Usage**: 7일 레이트 리밋 사용률(%) 표기 (Pro/Max, 데이터 있을 때만)
- 🟢🟠🔴 **Usage Alerts**: 사용량 별 경고 인디케이터 (green/orange/red)
- 💰 **Cost**: 실시간 세션 사용 비용

## Prerequisites / 필수 요구사항

- Python 3.6+ (statusline 표시)
- Node.js (사용률 제한 훅 — 이 기능을 안 쓰면 불필요)
- Claude Code

## Installation / 설치

### 1. Repository 복사

```bash
git clone https://github.com/MilkLotion/claude_status_line.git
cd claude_status_line
```

### 2. `statusline.py`를 `.claude` 디렉토리로 복사/이동

#### Windows (PowerShell)

```powershell
Copy-Item statusline.py "$env:USERPROFILE\.claude\"
```

#### Linux/Mac

```bash
cp statusline.py ~/.claude/
```

### 3. (선택) 사용률 제한 훅 설치

`hooks/usage-limit-detect.cjs`, `hooks/usage-limit-check.cjs` 를 사용할 계획이 없다면 이 단계는 건너뛰어도 됨.

#### Windows (PowerShell)

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\scripts\hooks" | Out-Null
Copy-Item hooks\usage-limit-detect.cjs "$env:USERPROFILE\.claude\scripts\hooks\"
Copy-Item hooks\usage-limit-check.cjs "$env:USERPROFILE\.claude\scripts\hooks\"
```

#### Linux/Mac

```bash
mkdir -p ~/.claude/scripts/hooks
cp hooks/usage-limit-detect.cjs hooks/usage-limit-check.cjs ~/.claude/scripts/hooks/
```

## Configuration / 설정

Claude Code settings 파일에 추가 (`~/.claude/settings.json`):

### Windows

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "statusLine": {
    "type": "command",
    "command": "python C:/Users/<username>/.claude/statusline.py",
    "padding": 0
  }
}
```

### Linux/Mac

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "statusLine": {
    "type": "command",
    "command": "python3 <user_path>/.claude/statusline.py",
    "padding": 0
  }
}
```

Claude Code를 재시작 하고 동작 시에 해당 출력을 확인할 수 있습니다.

### 사용률 제한 훅 설정 (선택)

`hooks/` 를 설치했다면, 같은 `settings.json` 의 `hooks` 블록에 아래 두 항목을 **병합**(기존에 다른 `hooks` 설정이 있다면 덮어쓰지 말고 배열에 추가):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node <user_path>/.claude/scripts/hooks/usage-limit-detect.cjs",
            "timeout": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node <user_path>/.claude/scripts/hooks/usage-limit-check.cjs",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## Usage Limit / 세션별 사용률 제한

프롬프트에 정해진 한국어 문구를 치면, **그 세션에서만** 5시간 사용률 임계값을 넘었을 때 도구 호출이 차단됩니다.

| 동작 | 문구 예시 |
|---|---|
| 활성화 | `사용률 40`, `사용량 40%까지만 써`, `사용율 제한 40` |
| 해제 | `사용률 제한 해제`, `사용량 제한 꺼줘`, `사용률 제한 그만/중단` |
| 상태 확인 | `사용률 제한 확인`, `사용량 제한 상태` |

**주의**
- 트리거 문구는 **한국어 전용**입니다 (`사용률`/`사용율`/`사용량` + 숫자를 정규식으로 인식).
- 임계값 판단 기준(5시간 사용률)은 **세션별 소모량이 아니라 계정/플랜 전체의 5시간 rolling 사용률**입니다. 문구를 친 세션에서만 차단이 걸리지만, 다른 세션이 사용량을 많이 쓰면 이 세션도 함께 차단될 수 있습니다.
- 활성화된 상태는 상태줄의 `🎯 제한 NN% (이 세션/다른 세션/전체 세션)` 세그먼트로 확인할 수 있습니다.

## Output Format / 출력 형식

```
claude_status_line (main)  [Opus 4.8 (1M context) · high]  🟢  2026-06-13 02:40 AM ~ 07:40 AM | ⏱️ 0h 12m | ⏳ 4h 47m | 📋 context 9% | 📊 5h 0.0% | 🎯 제한 40% (이 세션) | 📅 7d 🟢 41.2% | 💰 $1.45
```

- 📂 현재 작업 디렉토리 이름 + git 브랜치
- `[모델명 · effort]` 현재 사용 중인 모델 + reasoning effort 단계 (지원 모델만)
- 🟢/🟠/🔴 사용량 인디케이터 (≤60% / 60-80% / >80%)
- 시작시간 ~ 종료시간
- ⏱️ 사용시간
- ⏳ 남은시간 (총 5시간)
- 📋 컨텍스트 윈도우 사용률
- 📊 5시간 블록 사용률
- 🎯 사용률 제한 활성화 상태 (설정돼 있을 때만 표시)
- 📅 7일 블록 사용률 (Pro/Max 구독자, 첫 API 응답 후 데이터 있을 때만)
- 💰 세션 사용 비용

## License

MIT License
