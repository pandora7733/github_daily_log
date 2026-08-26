import os
from dotenv import load_dotenv
from flask import Flask

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

if __name__ == '__main__':
    app.run(host='localhost', port=port, debug=True)
