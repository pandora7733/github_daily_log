import os
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import uuid 

from dotenv import load_dotenv
import requests
from bson.objectid import ObjectId
from flask import Flask, redirect, request, session, jsonify, render_template

try:
    from .model import CommitRetroModel
except ImportError:
    from model import CommitRetroModel

LOCAL_TZ = ZoneInfo("Asia/Seoul")

# .env 파일 불러오기
load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv("FLASK_SECRET_KEY")

# 환경 변수 접근하기
PORT = os.getenv('PORT')
MONGO_DB = os.getenv('MONGO_DB')
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

LOCAL_TZ = ZoneInfo("Asia/Seoul")
retro_model = None


def get_retro_model():
    """회고록 모델을 필요할 때 한 번만 생성한다."""
    global retro_model

    if retro_model is None:
        retro_model = CommitRetroModel()

    return retro_model


def get_session_user_id():
    """GitHub 로그인과 일반 로그인의 세션 형식 차이를 흡수한다."""
    user_id = session.get("user_id")
    if user_id:
        return user_id

    user = session.get("github_user") or {}
    return user.get("_id")


def serialize_retrospective(retrospective):
    """MongoDB 회고록을 프론트엔드에서 사용할 JSON 형태로 변환한다."""
    return {
        "id": str(retrospective["_id"]),
        "title": retrospective.get("title", "Note"),
        "content": retrospective.get("content", ""),
        "date": retrospective.get("date").isoformat()
        if retrospective.get("date")
        else None,
    }


def is_valid_user_id(user_id):
    return bool(user_id and ObjectId.is_valid(str(user_id)))


def to_local_date(date_str):
    commit_dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    return commit_dt.astimezone(LOCAL_TZ).date()


def get_commit_period(commit_date, today):
    days_ago = (today - commit_date).days

    if days_ago == 0:
        return "today"
    if 1 <= days_ago <= 7:
        return "week"
    if 8 <= days_ago < 365:
        return "month"
    if days_ago >= 365:
        return "year"

    return None


def fetch_repo_commits(access_token, owner, repo_name, per_page=100):
    response = requests.get(
        f"https://api.github.com/repos/{owner}/{repo_name}/commits",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        params={"per_page": per_page},
    )

    if response.status_code != 200:
        return []

    return response.json()


def normalize_commit(commit, repo_name, repo_url=None):
    message = commit.get("commit", {}).get("message", "")
    return {
        "sha": commit.get("sha"),
        "message": message,
        "title": message.split("\n")[0] if message else "No message",
        "author": commit.get("commit", {}).get("author", {}).get("name"),
        "date": commit.get("commit", {}).get("author", {}).get("date"),
        "url": commit.get("html_url"),
        "repo_name": repo_name,
        "repo_url": repo_url,
    }


def group_commits_by_period(all_commits):
    today = datetime.now(LOCAL_TZ).date()
    buckets = defaultdict(lambda: defaultdict(list))

    for commit in all_commits:
        date_str = commit.get("date")
        if not date_str:
            continue

        commit_date = to_local_date(date_str)
        period = get_commit_period(commit_date, today)

        if not period:
            continue

        buckets[period][commit_date.isoformat()].append(
            {**commit, "parsed_date": commit_date}
        )

    result = {"today": [], "week": [], "month": [], "year": []}

    for period in result:
        day_list = []

        for commits in buckets.get(period, {}).values():
            commits.sort(key=lambda item: item["date"], reverse=True)
            latest = commits[0]

            day_list.append({
                "date": latest["parsed_date"].isoformat(),
                "date_display": latest["parsed_date"].strftime("%Y.%m.%d"),
                "repo_name": latest["repo_name"],
                "title": latest["title"],
                "count": len(commits),
                "url": latest["url"],
            })

        day_list.sort(key=lambda item: item["date_display"], reverse=True)
        result[period] = day_list

    return result


def build_commits_by_date(all_commits):
    commits_by_date = defaultdict(list)

    for commit in all_commits:
        date_str = commit.get("date")
        if not date_str:
            continue

        date_key = to_local_date(date_str).isoformat()
        commits_by_date[date_key].append(commit)

    for date_key in commits_by_date:
        commits_by_date[date_key].sort(
            key=lambda item: item["date"],
            reverse=True,
        )

    return dict(commits_by_date)


def collect_commits_from_repos(access_token, repos):
    all_commits = []

    for repo in repos:
        full_name = repo.get("full_name", "")
        owner, _, repo_name = full_name.partition("/")

        if not owner or not repo_name:
            continue

        raw_commits = fetch_repo_commits(access_token, owner, repo_name)

        for commit in raw_commits:
            all_commits.append(
                normalize_commit(commit, repo["name"], repo.get("url"))
            )

    return all_commits


@app.route('/', methods=['GET'])
def home():
    return "Hello, Flask!"

@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')

@app.route('/auth/github/register')
def github_login():

    github_authorize_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        "&scope=user:email%20repo"
    )

    return redirect(github_authorize_url)

@app.route("/auth/github/callback")
def github_callback():

    code = request.args.get("code")

    if not code:
        return "GitHub 인증 실패", 400

    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={
            "Accept": "application/json"
        },
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": GITHUB_REDIRECT_URI
        }
    )

    token_data = token_response.json()

    access_token = token_data.get("access_token")

    if not access_token:
        return jsonify(token_data), 400

    user_response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        }
    )

    user_data = user_response.json()

    github_id = user_data.get("id")
    github_username = user_data.get("login")
    github_email = user_data.get("email")

    if not github_email:
        github_email = f"{github_username}@github.com"

    user = get_retro_model().get_or_create_user(
        github_id=github_id,
        username=github_username,
        avatar_url=user_data.get("avatar_url"),
        bio=user_data.get("bio") or "",
        access_token=access_token,
    )
    user_id = str(user["_id"])

    session["user_id"] = user_id
    session["username"] = user["username"]
    session["email"] = github_email
    session["github_access_token"] = access_token
    session["github_user"] = {
        "_id": user_id,
        "username": user["username"],
        "email": github_email,
        "avatarUrl": user.get("avatarUrl"),
        "bio": user.get("bio", ""),
    }

    return redirect("/dashboard")

@app.route('/register', methods=['POST'])
def confirm_email():
    data = request.json
    user_email = data.get('userEmail')
    password = data.get('password')


    from pymongo import MongoClient
    client = MongoClient("mongodb+srv://team_user1:1234ABCD@cluster0.7gpdbga.mongodb.net/commit_retro_db?appName=Cluster0")
    db = client.commit_retro_db

    user_data = {
        "email": user_email,
        "password": password,
        "username": user_email.split('@')[0] if user_email else "user", 
        "provider": "local",
        "createdAt": datetime.now()
    }
    db.users.insert_one(user_data)

    return jsonify({
        'available': True
    })

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    user_email = data.get('userEmail')
    password = data.get('password')

    from pymongo import MongoClient
    client = MongoClient("mongodb+srv://team_user1:1234ABCD@cluster0.7gpdbga.mongodb.net/commit_retro_db?appName=Cluster0")
    db = client.commit_retro_db

    user = db.users.find_one({"email": user_email,})

    if not user or user.get('password') != password:
        return jsonify({'success': False}), 401

    if "_id" in user:
        user["_id"] = str(user["_id"])
        
    session["github_user"] = user
    return jsonify({'success': True})


@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')

@app.route("/logout")
def logout():

    session.clear()

    print("logout")
    return redirect("/")

@app.route("/api/repos")
def github_repos():

    access_token = session.get("github_access_token")

    if not access_token:
        return redirect("/")

    response = requests.get(
        "https://api.github.com/user/repos",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        },
        params={
            "visibility": "all",
            "per_page": 100
        }
    )

    if response.status_code != 200:
        return jsonify({
            "error": "GitHub repository를 가져오지 못했습니다."
        }), response.status_code

    data = response.json()

    repos = []

    for repo in data:
        repos.append({
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "private": repo["private"],
            "url": repo["html_url"],
            "description": repo["description"],
            "language": repo["language"]
        })

    return jsonify(repos)

@app.route("/api/user")
def github_user():

    access_token = session.get("github_access_token")

    if not access_token:
        return redirect("/")

    response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        },
        params={
            "visibility": "all",
            "per_page": 100
        }
    )

    if response.status_code != 200:
        return jsonify({
            "error": "GitHub user를 가져오지 못했습니다."
        }), response.status_code

    return jsonify(response.json())

@app.route('/dashboard', methods=['GET'])
def dashboard():
    
    access_token = session.get("github_access_token")
    user = session.get("github_user")

    if not user or not access_token:
        print("no user or access_token")
        return redirect("/")
    
    print(user)

    query = """
    query {
        viewer {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                            color
                        }
                    }
                }
            }
        }
    }
    """

    response = requests.post(
        "https://api.github.com/graphql",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={
            "query": query
        }
    )

    if response.status_code != 200:
        return "GitHub contribution 정보를 가져오지 못했습니다.", 500

    data = response.json()

    if "errors" in data:
        print(data["errors"])
        return "GitHub API 오류", 500

    calendar = (
        data["data"]
        ["viewer"]
        ["contributionsCollection"]
        ["contributionCalendar"]
    )

    response = requests.get(
        "https://api.github.com/user/repos",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        },
        params={
            "visibility": "all",
            "per_page": 100
        }
    )

    if response.status_code != 200:
        return jsonify({
            "error": "GitHub repository를 가져오지 못했습니다."
        }), response.status_code

    data = response.json()

    repos = []

    for repo in data:
        repos.append({
            "id": repo["id"],
            "name": repo["name"],
            "full_name": repo["full_name"],
            "private": repo["private"],
            "url": repo["html_url"],
            "description": repo["description"],
            "language": repo["language"]
        })

    all_commits = collect_commits_from_repos(access_token, repos)
    commit_groups = group_commits_by_period(all_commits)
    commits_by_date = build_commits_by_date(all_commits)

    return render_template(
        'dashboard.html',
        repos=repos,
        user=user,
        commit_groups=commit_groups,
        commits_by_date=commits_by_date,
        calendar=calendar,
    )


@app.route("/api/retrospectives", methods=["GET"])
def get_retrospectives():
    """현재 로그인한 사용자의 Note 목록을 최신순으로 반환한다."""
    user_id = get_session_user_id()
    if not is_valid_user_id(user_id):
        return jsonify({"error": "로그인이 필요합니다."}), 401

    retrospectives = get_retro_model().get_user_retrospectives(user_id)
    return jsonify([serialize_retrospective(retro) for retro in retrospectives])


@app.route("/api/retrospectives", methods=["POST"])
def create_retrospective():
    """content 영역의 Note를 현재 로그인한 사용자의 회고록으로 저장한다."""
    user_id = get_session_user_id()
    if not is_valid_user_id(user_id):
        return jsonify({"error": "로그인이 필요합니다."}), 401

    data = request.get_json(silent=True) or {}
    content = data.get("content")
    if not isinstance(content, str) or not content.strip():
        return jsonify({"error": "노트 내용을 입력해 주세요."}), 400

    commits_snapshot = data.get("commits_snapshot", [])
    if not isinstance(commits_snapshot, list):
        return jsonify({"error": "커밋 정보 형식이 올바르지 않습니다."}), 400

    retrospective_id = get_retro_model().create_retrospective(
        user_id=user_id,
        title=data.get("title") or "Note",
        content=content,
        commits_snapshot=commits_snapshot,
    )
    retrospective = get_retro_model().get_retrospective_detail(retrospective_id)

    return jsonify({
        "success": True,
        "retrospective": serialize_retrospective(retrospective),
    }), 201


@app.route("/api/retrospectives/<retro_id>", methods=["PUT"])
def update_retrospective(retro_id):
    """이미 저장된 Note의 내용을 수정한다."""
    user_id = get_session_user_id()
    if not is_valid_user_id(user_id) or not ObjectId.is_valid(retro_id):
        return jsonify({"error": "잘못된 요청입니다."}), 400

    data = request.get_json(silent=True) or {}
    content = data.get("content")
    if not isinstance(content, str) or not content.strip():
        return jsonify({"error": "노트 내용을 입력해 주세요."}), 400

    model = get_retro_model()
    retrospective = model.get_retrospective_detail(retro_id)
    if not retrospective or str(retrospective.get("userId")) != str(user_id):
        return jsonify({"error": "노트를 찾을 수 없습니다."}), 404

    model.update_retrospective(
        retro_id=retro_id,
        user_id=user_id,
        content=content,
    )
    updated_retrospective = model.get_retrospective_detail(retro_id)

    return jsonify({
        "success": True,
        "retrospective": serialize_retrospective(updated_retrospective),
    })


@app.route('/dashboard/profile', methods=['GET'])
def profile():
    return render_template('profile.html')

@app.route("/github/repos/<owner>/<repo>/commits")
def github_commits(owner, repo):

    access_token = session.get("github_access_token")

    if not access_token:
        return jsonify({
            "error": "로그인이 필요합니다."
        }), 401

    response = requests.get(
        f"https://api.github.com/repos/{owner}/{repo}/commits",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        },
        params={
            "per_page": 100
        }
    )

    if response.status_code != 200:
        return jsonify({
            "error": "커밋을 가져오지 못했습니다.",
            "github_response": response.json()
        }), response.status_code

    commits = response.json()
    repo_url = f"https://github.com/{owner}/{repo}"
    result = [normalize_commit(commit, repo, repo_url) for commit in commits]

    return jsonify(result)

@app.route("/github/contributions")
def github_contributions():

    access_token = session.get("github_access_token")

    if not access_token:
        return redirect("/")

    query = """
    query {
        viewer {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            date
                            contributionCount
                            color
                        }
                    }
                }
            }
        }
    }
    """

    response = requests.post(
        "https://api.github.com/graphql",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={
            "query": query
        }
    )

    if response.status_code != 200:
        return jsonify({
            "error": "GitHub GraphQL API 요청 실패",
            "detail": response.json()
        }), response.status_code

    data = response.json()

    # GraphQL 자체 오류 확인
    if "errors" in data:
        return jsonify({
            "error": "GitHub GraphQL 오류",
            "detail": data["errors"]
        }), 400

    calendar = (
        data["data"]
        ["viewer"]
        ["contributionsCollection"]
        ["contributionCalendar"]
    )

    weeks = calendar["weeks"]

    return render_template(
        "contributions.html",
        calendar=calendar,
        weeks=weeks
    )


if __name__ == '__main__':
    from pymongo import MongoClient
    import os
    import urllib.parse
    
    username = "team_user1"
    password = urllib.parse.quote_plus("1234ABCD")
    mongo_uri = f"mongodb+srv://team_user1:1234ABCD@cluster0.7gpdbga.mongodb.net/commit_retro_db?appName=Cluster0"
    
    client = MongoClient(mongo_uri)
    db = client.commit_retro_db

    app.run(host='0.0.0.0', port=int(PORT) if PORT else 3000, debug=True)