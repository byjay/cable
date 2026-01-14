# ========================================
#  Essential Skills Manual Creator
# ========================================

$ErrorActionPreference = "Stop"

$skillsPath = "$env:USERPROFILE\.opencode\skills"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Creating Essential Skills" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 필수 스킬 정의
$essentialSkills = @{
    "test-driven-development" = @"
---
name: test-driven-development
description: TDD 방법론을 사용하여 테스트 코드를 먼저 작성하고, 그 다음 구현 코드를 작성합니다.
---

# Test-Driven Development (TDD)

## 작업 순서
1. **Red**: 실패하는 테스트 작성
2. **Green**: 테스트를 통과하는 최소한의 코드 작성
3. **Refactor**: 코드 개선 및 최적화

## 규칙
- 테스트 없이는 프로덕션 코드를 작성하지 않습니다
- 실패하는 테스트가 없으면 새로운 코드를 작성하지 않습니다
- 중복을 제거하고 코드를 개선합니다

## 예시
1. 함수 요구사항 분석
2. 테스트 케이스 작성 (예상 입력/출력)
3. 테스트 실행 (실패 확인)
4. 구현
5. 테스트 실행 (통과 확인)
6. 리팩토링
"@

    "systematic-debugging" = @"
---
name: systematic-debugging
description: 체계적인 디버깅 프로세스를 통해 버그를 빠르고 정확하게 찾아 수정합니다.
---

# Systematic Debugging

## 디버깅 프로세스
1. **재현**: 버그를 일관되게 재현할 수 있는 방법 찾기
2. **격리**: 문제가 발생하는 최소 범위 좁히기
3. **가설**: 원인에 대한 가설 수립
4. **검증**: 로그, 중단점, 테스트로 가설 검증
5. **수정**: 근본 원인 해결
6. **확인**: 수정 후 재발 방지 테스트

## 도구 활용
- Print/Console 로그
- 디버거 중단점
- 단위 테스트
- 이진 탐색 (코드 주석 처리)

## 체크리스트
- [ ] 에러 메시지 전체 읽기
- [ ] 스택 트레이스 분석
- [ ] 최근 변경사항 확인
- [ ] 관련 문서/이슈 검색
"@

    "code-review-checklist" = @"
---
name: code-review-checklist
description: 코드 리뷰 시 확인해야 할 항목들을 체계적으로 점검합니다.
---

# Code Review Checklist

## 1. 기능성
- [ ] 요구사항을 정확히 구현했는가?
- [ ] 엣지 케이스를 처리하는가?
- [ ] 에러 처리가 적절한가?

## 2. 가독성
- [ ] 변수/함수명이 명확한가?
- [ ] 주석이 필요한 곳에 있는가?
- [ ] 코드 구조가 논리적인가?

## 3. 성능
- [ ] 불필요한 반복문이 없는가?
- [ ] 메모리 누수 가능성은 없는가?
- [ ] 최적화 가능한 부분이 있는가?

## 4. 보안
- [ ] 입력 검증을 하는가?
- [ ] SQL Injection 취약점은 없는가?
- [ ] 민감 정보가 노출되지 않는가?

## 5. 테스트
- [ ] 단위 테스트가 작성되었는가?
- [ ] 테스트 커버리지가 충분한가?
- [ ] 테스트가 실제로 통과하는가?
"@

    "git-best-practices" = @"
---
name: git-best-practices
description: Git 커밋, 브랜치, PR 작성 시 모범 사례를 따릅니다.
---

# Git Best Practices

## 커밋 메시지 규칙
```
<type>: <subject>

<body>

<footer>
```

### Type
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 변경
- style: 코드 포맷팅
- refactor: 코드 리팩토링
- test: 테스트 추가
- chore: 빌드/설정 변경

### 예시
```
feat: 사용자 로그인 기능 추가

- JWT 토큰 기반 인증 구현
- 로그인 API 엔드포인트 추가
- 세션 만료 처리 로직 포함

Closes #123
```

## 브랜치 전략
- main: 프로덕션 배포 브랜치
- develop: 개발 통합 브랜치
- feature/기능명: 새 기능 개발
- hotfix/버그명: 긴급 수정

## 작업 흐름
1. 브랜치 생성: `git checkout -b feature/login`
2. 작업 및 커밋
3. 리모트 푸시: `git push origin feature/login`
4. PR 생성 및 코드 리뷰
5. 머지 후 브랜치 삭제
"@

    "api-documentation" = @"
---
name: api-documentation
description: REST API 문서를 명확하고 일관성 있게 작성합니다.
---

# API Documentation Guide

## 문서 구조

### 1. Endpoint 정보
- **Method**: GET, POST, PUT, DELETE
- **Path**: /api/v1/users/{id}
- **Description**: 간단한 설명

### 2. Request
**Headers**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Parameters**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id   | integer | Yes | 사용자 ID |

**Body**
```json
{
  "name": "홍길동",
  "email": "hong@example.com"
}
```

### 3. Response
**Success (200 OK)**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "홍길동",
    "email": "hong@example.com"
  }
}
```

**Error (400 Bad Request)**
```json
{
  "status": "error",
  "message": "Invalid email format"
}
```

### 4. 예시 코드
```javascript
// JavaScript
const response = await fetch('/api/v1/users/1', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token123'
  }
});
```

```python
# Python
response = requests.get(
    'https://api.example.com/v1/users/1',
    headers={'Authorization': 'Bearer token123'}
)
```
"@

    "error-handling" = @"
---
name: error-handling
description: 에러를 적절하게 처리하고 사용자에게 명확한 피드백을 제공합니다.
---

# Error Handling Guide

## 원칙
1. **명확성**: 무엇이 잘못되었는지 명확히 알림
2. **복구**: 가능한 경우 자동 복구 시도
3. **로깅**: 디버깅을 위한 충분한 정보 기록
4. **사용자 친화**: 기술적 오류를 사용자 친화적으로 변환

## 패턴

### Try-Catch-Finally
```python
def process_data(data):
    try:
        # 위험한 작업
        result = risky_operation(data)
        return result
    except ValueError as e:
        # 특정 에러 처리
        log.error(f"Invalid data: {e}")
        raise
    except Exception as e:
        # 예상치 못한 에러
        log.error(f"Unexpected error: {e}")
        return default_value
    finally:
        # 정리 작업
        cleanup()
```

### 에러 클래스
```python
class ValidationError(Exception):
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")
```

### API 에러 응답
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "이메일 형식이 올바르지 않습니다",
    "field": "email",
    "details": {
      "provided": "not-an-email",
      "expected": "example@domain.com"
    }
  }
}
```

## 체크리스트
- [ ] 모든 예외 상황을 처리했는가?
- [ ] 에러 메시지가 명확한가?
- [ ] 에러 로그에 충분한 정보가 있는가?
- [ ] 사용자에게 복구 방법을 안내하는가?
- [ ] 보안 정보가 노출되지 않는가?
"@
}

# 스킬 생성
$created = 0
$skipped = 0

foreach ($skillName in $essentialSkills.Keys) {
    $skillDir = Join-Path $skillsPath $skillName
    $skillFile = Join-Path $skillDir "SKILL.md"
    
    if (Test-Path $skillFile) {
        Write-Host "  ⊘ $skillName (already exists)" -ForegroundColor Yellow
        $skipped++
    }
    else {
        # 폴더 생성
        New-Item -ItemType Directory -Path $skillDir -Force | Out-Null
        
        # 스킬 파일 작성
        $essentialSkills[$skillName] | Out-File -FilePath $skillFile -Encoding UTF8
        
        Write-Host "  ✓ $skillName" -ForegroundColor Green
        $created++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Created: $created" -ForegroundColor Green
Write-Host "  Skipped: $skipped" -ForegroundColor Yellow

# 전체 스킬 목록
Write-Host "`nAll installed skills:" -ForegroundColor Cyan
$allSkills = Get-ChildItem $skillsPath -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }
foreach ($skill in $allSkills) {
    Write-Host "  - $($skill.Name)" -ForegroundColor White
}

Write-Host "`nUsage:" -ForegroundColor Yellow
Write-Host '  "@test-driven-development 계산기 함수 만들어줘"' -ForegroundColor White
Write-Host '  "@code-review-checklist 현재 코드 검토해줘"' -ForegroundColor White
Write-Host '  "@error-handling 에러 처리 추가해줘"' -ForegroundColor White
Write-Host ""