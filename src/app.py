import os
from dotenv import load_dotenv
import requests
from flask import Flask, redirect, request, session, jsonify, render_template

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

    # GitHub 사용자 정보 조회
    user_response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json"
        }
    )

    user_data = user_response.json()

    session["github_user"] = user_data
    session["github_access_token"] = access_token

    return redirect("/dashboard")

@app.route('/register', methods=['POST'])
def confirm_email():
    data = request.json
    user_email = data.get('userEmail')

    user = User.query.filter_by(email=user_email).first()

    if user:
        return jsonify({
            'available': False
        })

    return jsonify({
        'available': True
    })


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
        print("token을 못찾음")
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

    print("Status:", response.status_code)
    print("OAuth Scopes:", response.headers.get("X-OAuth-Scopes"))
    print("Response:", response.json())

    return jsonify(response.json())

@app.route('/dashboard', methods=['GET'])
def dashboard():

    user = session.get("github_user")

    if not user:
        print("no user")
    
    print(user)

    return render_template('dashboard.html')

@app.route('/dashboard/profile', methods=['GET'])
def profile():
    return render_template('profile.html')



if __name__ == '__main__':
    app.run(host='localhost', port=PORT, debug=True)
