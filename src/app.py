import os
from dotenv import load_dotenv
from flask import Flask, render_template

# .env 파일 불러오기
load_dotenv()

# 환경 변수 접근하기
port = os.getenv('PORT')
github_api = os.getenv('GITHUB_API')
mongo_db = os.getenv('MONGO_DB')

app = Flask(__name__)

@app.route('/')
def home():
    return "Hello, Flask!"

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/dashboard/profile')
def profile():
    return render_template('profile.html')



if __name__ == '__main__':
    app.run(host='localhost', port=port, debug=True)
