import os
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import uuid 

from dotenv import load_dotenv
import requests
from flask import Flask, redirect, request, session, jsonify, render_template

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


def normalize_commit(commit, repo_name):
    message = commit.get("commit", {}).get("message", "")
    return {
        "sha": commit.get("sha"),
        "message": message,
        "title": message.split("\n")[0] if message else "No message",
        "author": commit.get("commit", {}).get("author", {}).get("name"),
        "date": commit.get("commit", {}).get("author", {}).get("date"),
        "url": commit.get("html_url"),
        "repo_name": repo_name,
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
                "date_display": latest["parsed_date"].strftime("%Y.%m.%d"),
                "repo_name": latest["repo_name"],
                "title": latest["title"],
                "count": len(commits),
                "url": latest["url"],
            })

        day_list.sort(key=lambda item: item["date_display"], reverse=True)
        result[period] = day_list

    return result


def collect_commits_from_repos(access_token, repos):
    all_commits = []

    for repo in repos:
        full_name = repo.get("full_name", "")
        owner, _, repo_name = full_name.partition("/")

        if not owner or not repo_name:
            continue

        raw_commits = fetch_repo_commits(access_token, owner, repo_name)

        for commit in raw_commits:
            all_commits.append(normalize_commit(commit, repo["name"]))

    return all_commits

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


def normalize_commit(commit, repo_name):
    message = commit.get("commit", {}).get("message", "")
    return {
        "sha": commit.get("sha"),
        "message": message,
        "title": message.split("\n")[0] if message else "No message",
        "author": commit.get("commit", {}).get("author", {}).get("name"),
        "date": commit.get("commit", {}).get("author", {}).get("date"),
        "url": commit.get("html_url"),
        "repo_name": repo_name,
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
                "date_display": latest["parsed_date"].strftime("%Y.%m.%d"),
                "repo_name": latest["repo_name"],
                "title": latest["title"],
                "count": len(commits),
                "url": latest["url"],
            })

        day_list.sort(key=lambda item: item["date_display"], reverse=True)
        result[period] = day_list

    return result


def collect_commits_from_repos(access_token, repos):
    all_commits = []

    for repo in repos:
        full_name = repo.get("full_name", "")
        owner, _, repo_name = full_name.partition("/")

        if not owner or not repo_name:
            continue

        raw_commits = fetch_repo_commits(access_token, owner, repo_name)

        for commit in raw_commits:
            all_commits.append(normalize_commit(commit, repo["name"]))

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

    from pymongo import MongoClient
    client = MongoClient("mongodb+srv://team_user1:1234ABCD@cluster0.7gpdbga.mongodb.net/commit_retro_db?appName=Cluster0")
    db = client.commit_retro_db

    user = db.users.find_one({"github_id": github_id})
    
    if user:
        session["user_id"] = str(user["_id"])
        session["username"] = user["username"]
        session["email"] = user["email"]
        

        session["github_access_token"] = access_token
        return redirect("/dashboard")
        
    else:
        import uuid
        from datetime import datetime
        
        auto_password = str(uuid.uuid4())[:8]  
        
        new_user = {
            "email": github_email,
            "password": auto_password,       
            "username": github_username,    
            "provider": "github",           
            "github_id": github_id,          
            "avatar_url": user_data.get("avatar_url"),
            "createdAt": datetime.utcnow()
        }
        
        result = db.users.insert_one(new_user)
        
        session["user_id"] = str(user["_id"])
        session["username"] = user.get("username")
        session["email"] = user.get("email")
        
        if user.get("provider") == "github":
            session["github_access_token"] = user.get("github_access_token")
        
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

    return render_template(
        'dashboard.html',
        repos=repos,
        user=user,
        commit_groups=commit_groups,
        calendar=calendar,
    )

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
    result = [normalize_commit(commit, repo) for commit in commits]

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
    app.run(host='0.0.0.0', port=int(PORT) if PORT else 5000, debug=True)