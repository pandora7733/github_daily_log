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

@app.route('/', methods=['GET'])
def home():
    return "Hello, Flask!"

@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')

@app.route('/register', methods=['POST'])
def confirm_email():
    data = req.json
    user_email - data.get('userEmail')

    user = User.query.filter_by(email=user_email).first()
    if user:
        return jsonify({
            'available' : False
        })
    else:
        return jsonify({
            'available' : True
        })


@app.route('/login', methods=['GET'])
def login():
    return render_template('login.html')

@app.route('/dashboard', methods=['GET'])
def dashboard():
    return render_template('dashboard.html')

@app.route('/dashboard/profile', methods=['GET'])
def profile():
    return render_template('profile.html')



if __name__ == '__main__':
    app.run(host='localhost', port=port, debug=True)
