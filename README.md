# GitHub Daily Log

GitHub 활동을 한 곳에서 확인하고 기록하기 위한 Flask 기반 웹 애플리케이션입니다.
GitHub contribution calendar, 저장소별 커밋, 프로필 정보를 제공하며 contribution
그래프를 2D 또는 3D로 전환해서 볼 수 있습니다.

## 배포 사이트

[GitHub Daily Log 열기](http://3.35.8.91:3000/login)

## 주요 기능

- GitHub OAuth 로그인
- 이메일과 비밀번호를 이용한 로컬 회원가입 및 로그인 화면
- GitHub contribution calendar 조회
- 2D contribution graph와 Three.js 기반 3D graph 전환
- 최근 커밋을 오늘, 일주일, 한 달, 일 년 단위로 분류
- 날짜별 커밋 상세 목록 조회
- 커밋 제목, 저장소, 작성자, 작성 시간, 짧은 SHA 및 GitHub 링크 표시
- GitHub 프로필 정보와 저장소 목록 조회
- Note와 Post-it 형태의 메모 UI
- 메모 추가, 수정, 삭제 및 textarea 자동 높이 조절

## 기술 스택

### Backend

- Python
- Flask 3.1.3
- Jinja2
- Requests
- PyMongo
- python-dotenv

### Frontend

- HTML/Jinja 템플릿
- Vanilla JavaScript
- Tailwind CSS 브라우저 CDN
- Three.js 0.180.0
- Axios CDN
- Google Fonts CDN

별도의 `package.json`이나 npm 빌드 과정은 없습니다. Python 의존성은
`requirements.txt`에 기록되어 있습니다.

## 프로젝트 구조

```text
.
├── requirements.txt
├── .env.example
└── src
    ├── app.py
    ├── model.py
    ├── templates
    │   ├── dashboard.html
    │   ├── login.html
    │   ├── register.html
    │   ├── profile.html
    │   └── scpassword.html
    └── static
        ├── css
        │   ├── index.css
        │   ├── login_styles.css
        │   ├── register_styles.css
        │   └── scpassword.css
        ├── image
        │   └── home.svg
        └── js
            ├── 3D_jandi.js
            ├── commit_detail.js
            ├── contribution_toggle.js
            ├── email_comfirm.js
            ├── login.js
            ├── post_it.js
            ├── profile_index.js
            └── pw_comfirm.js
```

## 실행 방법

### 사전 요구 사항

- Python 3.9 이상
- MongoDB 연결 정보
- GitHub OAuth App

### 1. 저장소 준비 및 가상 환경 생성

```bash
git clone <repository-url>
cd github_dailylog

python -m venv .venv
source .venv/bin/activate
```

Windows PowerShell에서는 다음 명령을 사용합니다.

```powershell
.venv\Scripts\Activate.ps1
```

### 2. Python 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 환경 변수 설정

`.env.example`을 복사한 뒤 실제 값을 입력합니다.

```bash
cp .env.example .env
```

필요한 환경 변수는 다음과 같습니다.

- `PORT`: 서버 포트. 기본값은 `3000`
- `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth App Client Secret
- `GITHUB_REDIRECT_URI`: OAuth callback URL
- `FLASK_SECRET_KEY`: Flask 세션 암호화에 사용할 충분히 긴 랜덤 키
- `MONGO_DB`: MongoDB 연결 문자열

로컬 개발 시 `GITHUB_REDIRECT_URI`는 일반적으로 다음 형식으로 설정합니다.

```text
http://localhost:3000/auth/github/callback
```

GitHub OAuth App의 Authorization callback URL도 같은 주소로 설정해야 합니다.
배포 환경에서는 배포 서버의 HTTPS callback URL을 사용해야 합니다.

### 4. 애플리케이션 실행

```bash
python src/app.py
```

서버는 기본적으로 `0.0.0.0:3000`에서 실행됩니다. 브라우저에서
<http://localhost:3000/login>에 접속합니다.

## 사용자 흐름

1. `/login`에서 GitHub 로그인을 선택합니다.
2. GitHub 권한 승인 후 `/auth/github/callback`으로 돌아옵니다.
3. 애플리케이션이 GitHub 사용자 정보와 access token을 세션에 저장합니다.
4. `/dashboard`에서 contribution calendar와 커밋 정보를 확인합니다.
5. 프로필 버튼을 누르면 `/dashboard/profile`에서 GitHub 프로필과 저장소를 확인합니다.
6. `/logout`에서 세션을 삭제하고 로그아웃합니다.

## 주요 라우트

### 페이지

- `GET /`: 현재 `Hello, Flask!`를 반환합니다.
- `GET /login`: 로그인 페이지
- `GET /register`: 회원가입 페이지
- `GET /dashboard`: contribution graph와 커밋 대시보드
- `GET /dashboard/profile`: GitHub 프로필 및 저장소 페이지

### 인증

- `GET /auth/github/register`: GitHub OAuth authorization 페이지로 이동
- `GET /auth/github/callback`: OAuth code를 access token으로 교환
- `POST /register`: 로컬 회원가입 처리
- `POST /api/login`: 로컬 로그인 처리
- `GET /logout`: 세션 삭제

### GitHub 데이터 API

- `GET /api/user`: 현재 사용자의 GitHub 프로필 조회
- `GET /api/repos`: 현재 사용자의 저장소 목록 조회
- `GET /github/repos/<owner>/<repo>/commits`: 특정 저장소의 커밋 조회
- `GET /github/contributions`: contribution calendar 조회를 시도하는 별도 endpoint

GitHub REST API의 저장소와 커밋 조회는 요청당 최대 100개를 사용하며,
현재 페이지네이션은 구현되어 있지 않습니다.

## 데이터 처리

대시보드 요청이 들어오면 다음 순서로 GitHub 데이터를 가져옵니다.

1. GitHub GraphQL API에서 contribution calendar를 조회합니다.
2. GitHub REST API에서 사용자의 저장소를 최대 100개 조회합니다.
3. 각 저장소에서 커밋을 최대 100개씩 조회합니다.
4. 커밋 작성일을 `Asia/Seoul` 기준 날짜로 변환합니다.
5. 커밋을 오늘, 최근 7일, 최근 1년, 1년 이상 기간으로 분류합니다.
6. Jinja 템플릿에 contribution 및 커밋 데이터를 JSON 형태로 전달합니다.
7. 브라우저 JavaScript가 날짜별 커밋 상세와 3D 그래프를 렌더링합니다.

## MongoDB 모델

`src/model.py`에는 다음 컬렉션을 사용하는 `CommitRetroModel`이 정의되어 있습니다.

- `users`: GitHub 사용자 정보
- `retrospectives`: 회고록과 커밋 스냅샷
- `postits`: Post-it 메모

사용자, 회고록, Post-it에 대한 생성·조회·수정·삭제 메서드와 일부 인덱스 설정이
포함되어 있습니다. 다만 현재 Flask 라우트는 이 모델을 사용하지 않고 일부 MongoDB
작업을 `src/app.py`에서 직접 처리합니다.

## 프론트엔드 구성

- `contribution_toggle.js`: 2D/3D 화면 전환
- `3D_jandi.js`: Three.js scene, contribution block, OrbitControls, hover tooltip 처리
- `commit_detail.js`: 날짜별 커밋 상세 및 더보기/접기 처리
- `profile_index.js`: GitHub 프로필과 저장소 API 조회 및 화면 출력
- `post_it.js`: Note/Post-it 생성, 수정, 삭제, context menu 및 textarea 처리
- `login.js`: 로컬 로그인 요청 처리
- `email_comfirm.js`: 회원가입 이메일 형식 검사
- `pw_comfirm.js`: 비밀번호 확인 일치 여부 표시

## 현재 구현상의 제한 사항

현재 코드를 기준으로 다음 사항은 추가 보완이 필요합니다.

- 로컬 회원가입은 실제 이메일 인증을 수행하지 않습니다.
- 로컬 비밀번호가 해시되지 않고 저장·비교됩니다. 운영 환경에서는 반드시 안전한
  비밀번호 해시를 사용해야 합니다.
- 로컬 로그인 세션과 GitHub OAuth 세션 처리 방식이 달라 로컬 로그인 후 대시보드
  접근에 필요한 GitHub access token이 없습니다.
- 비밀번호 찾기 템플릿은 있지만 완성된 라우트와 인증 코드가 없습니다.
- 메모 UI의 변경 사항은 현재 브라우저 DOM에만 반영되며 서버나 MongoDB에 저장되지
  않습니다. 새로고침하면 사라집니다.
- 3D contribution block을 클릭하면 현재 선택 정보가 콘솔에 출력되며 해당 날짜의
  커밋 상세로 연결되지는 않습니다.
- `/github/contributions`는 현재 저장소에 없는 `contributions.html`을 렌더링하려고
  합니다.
- GitHub API 조회에 페이지네이션, 캐시, 세밀한 오류 처리가 없습니다.
- 개발 서버가 `debug=True`로 실행됩니다. 운영 배포에는 적절한 WSGI 서버와
  production 설정이 필요합니다.
- `src/app.py`에 MongoDB 연결 정보가 직접 작성된 부분이 있어 환경 변수 기반
  연결로 통일해야 합니다. 공개 저장소에 연결 문자열이나 인증 정보를 커밋하지
  말고, 노출된 자격 증명은 즉시 폐기·교체해야 합니다.
- 테스트 코드와 자동화된 테스트 명령은 아직 없습니다.

## 수동 확인

자동 테스트는 제공되지 않으므로 다음 흐름을 수동으로 확인할 수 있습니다.

```text
1. python src/app.py 실행
2. /login 접속
3. GitHub OAuth 로그인
4. /dashboard에서 contribution과 커밋 확인
5. 2D/3D 전환 및 3D 그래프 조작 확인
6. /dashboard/profile에서 프로필과 저장소 확인
7. 로그아웃 확인
```

## 보안 주의

- `.env` 파일은 저장소에 커밋하지 않습니다.
- GitHub Client Secret, Flask Secret Key, MongoDB URI를 문서·로그·소스에 노출하지
  않습니다.
- GitHub OAuth callback URL은 허용된 도메인으로 제한합니다.
- 운영 환경에서는 HTTPS를 사용합니다.
- 현재 코드의 하드코딩된 MongoDB 자격 증명은 배포 전에 제거하고, 이미 노출된
  자격 증명이라면 MongoDB에서 즉시 rotate해야 합니다.

## 라이선스

현재 저장소에는 별도의 라이선스 파일이 없습니다. 외부 공개 또는 재사용 전에
프로젝트 라이선스를 추가하는 것을 권장합니다.
