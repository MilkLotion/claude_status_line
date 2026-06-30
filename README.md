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
- 📅 **7d Usage**: 7일 레이트 리밋 사용률(%) 표기 (Pro/Max, 데이터 있을 때만)
- 🟢🟠🔴 **Usage Alerts**: 사용량 별 경고 인디케이터 (green/orange/red)
- 💰 **Cost**: 실시간 세션 사용 비용

## Prerequisites / 필수 요구사항

- Python 3.6+
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

## Output Format / 출력 형식

```
claude_status_line (main)  [Opus 4.8 (1M context) · high]  🟢  2026-06-13 02:40 AM ~ 07:40 AM | ⏱️ 0h 12m | ⏳ 4h 47m | 📋 context 9% | 📊 5h 0.0% | 📅 7d 🟢 41.2% | 💰 $1.45
```

- 📂 현재 작업 디렉토리 이름 + git 브랜치
- `[모델명 · effort]` 현재 사용 중인 모델 + reasoning effort 단계 (지원 모델만)
- 🟢/🟠/🔴 사용량 인디케이터 (≤60% / 60-80% / >80%)
- 시작시간 ~ 종료시간
- ⏱️ 사용시간
- ⏳ 남은시간 (총 5시간)
- 📋 컨텍스트 윈도우 사용률
- 📊 5시간 블록 사용률
- 📅 7일 블록 사용률 (Pro/Max 구독자, 첫 API 응답 후 데이터 있을 때만)
- 💰 세션 사용 비용

## License

MIT License
