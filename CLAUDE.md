# claude_status_line — 프로젝트 안내 (Claude Code용)

이 저장소는 Claude Code 커스텀 상태줄(`statusline.py`) + 세션별 사용률 제한 훅(`hooks/`)이다.

## 전역 설치 트리거

사용자가 이 디렉토리에서 세션을 열고 다음과 같이 요청하면 — "전역세팅해줘", "글로벌 설치", "전역 설정해줘", "install globally" 등 — 아래 절차를 그대로 따라 이 저장소를 로컬 Claude Code 전역 설정에 설치할 것. 사용자가 이 문구를 치지 않았다면 이 절차를 임의로 실행하지 말 것 (전역 설정 변경은 명시적 요청이 있을 때만).

## 설치 절차 (AI 실행용)

### 0단계 — 환경 판단

- 이 세션 시스템 프롬프트에 명시된 Platform 으로 OS 판단: `darwin`/`linux` → mac/linux 분기, `win32` → windows 분기.
- 전역 설정 디렉토리(`<claude_dir>`): mac/linux는 `$HOME/.claude`, windows는 `%USERPROFILE%\.claude` (Bash 도구라면 `$USERPROFILE` 또는 `$HOME` 환경변수로 실제 경로 확인).
- Python3 가 없으면 statusline 자체가 동작 불가 — 설치 중단하고 Python3 설치 안내.
- Node.js 가 없으면 2단계(훅)만 건너뛰고 나머지는 계속 진행 — "Node.js가 없어서 사용률 제한 훅 설치는 생략했다"고 알릴 것.

### 1단계 — `statusline.py` 복사

- `<claude_dir>` 자체가 없으면(신규 설치 환경) 먼저 생성할 것 — mac/linux: `mkdir -p <claude_dir>`, windows: `New-Item -ItemType Directory -Force <claude_dir>`.
- mac/linux: `cp statusline.py <claude_dir>/statusline.py`
- windows(PowerShell): `Copy-Item statusline.py "<claude_dir>\statusline.py"`
- `<claude_dir>/statusline.py` 가 이미 있고 내용이 다르면, **덮어쓰기 전에 사용자에게 알릴 것** (기존 커스텀 상태줄을 지울 수 있음).

### 2단계 — 훅 스크립트 복사

- `<claude_dir>/scripts/hooks/` 디렉토리가 없으면 생성.
- `hooks/usage-limit-detect.cjs`, `hooks/usage-limit-check.cjs` 를 그 안으로 복사.

### 3단계 — `settings.json` 병합 (Read/Edit 도구로 직접 — 쉘로 JSON 파싱/생성 금지)

쉘 스크립트(특히 PowerShell `ConvertTo-Json`)로 JSON을 다루면 기본 Depth 제한 등으로 중첩 구조가 깨지기 쉽다. 이 병합은 반드시 Claude 자신의 Read/Edit/Write 도구로 텍스트 그대로 처리할 것.

- `<claude_dir>/settings.json` 이 **없으면**: Write 도구로 아래 최소 구조로 새로 생성.

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 <claude_dir>/statusline.py",
    "padding": 0
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "node <claude_dir>/scripts/hooks/usage-limit-detect.cjs", "timeout": 5 }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          { "type": "command", "command": "node <claude_dir>/scripts/hooks/usage-limit-check.cjs", "timeout": 5 }
        ]
      }
    ]
  }
}
```

(windows는 `command` 값을 `python <claude_dir>\statusline.py`, `node <claude_dir>\scripts\hooks\...cjs` 형태로. 훅 설치를 건너뛴 경우 `hooks` 블록은 생략.)

- `<claude_dir>/settings.json` 이 **있으면**: Read로 전체 읽고 **부분 Edit만** — 절대 파일 전체를 덮어쓰지 말 것.
  - `statusLine` 키가 없으면 위 구조로 추가. 있고 `command` 값이 다르면 덮어쓰지 말고 사용자에게 확인부터 받을 것 (이미 다른 상태줄을 쓰고 있을 수 있음).
  - `hooks.UserPromptSubmit` 배열: `usage-limit-detect.cjs` 를 포함하는 `command` 항목이 이미 있으면 스킵(이미 설치됨, idempotent). 없으면 배열 **끝에 새 항목만 추가** — 기존 배열의 다른 항목은 절대 건드리지 말 것.
  - `hooks.PreToolUse` 배열도 `usage-limit-check.cjs` 기준으로 동일하게 처리.
  - `hooks` 키 자체가 없으면 통째로 새로 추가.

쓰기 전에 **무엇이 추가/변경되는지 요약해서 사용자에게 보여주고 확인받은 뒤** 진행할 것 — 전역 설정 파일 변경은 위험 작업으로 취급한다.

### 4단계 — 완료 보고

- 복사된 파일 경로, `settings.json`에 추가된 키를 한국어로 요약.
- Claude Code 재시작(또는 새 세션 시작) 후 상태줄에 반영됨을 안내.
