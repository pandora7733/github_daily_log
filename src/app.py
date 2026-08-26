import os
import requests
import json

from flask  import Flask, render_template, jsonify
from dotenv import load_dotenv

load_dotenv()
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')

app = Flask(__name__)

# @app.route("/api/user/<username>")
# def get_userInfo(username):
#     print(username)
#     url = f"https://api.github.com/users/{username}"
#     headers = {
#         "Authorization": f"Bearer {GITHUB_TOKEN}",
#         "Accept": f"application/vnd.github+json",
#     }
#     res = requests.get(
#         url= url,
#         headers= headers,
#     )
#     app.json.ensure_ascii = False
#     return jsonify(res.json())

# @app.route("/api/user/<username>/repos")
# def get_userRepo(username):
#     print(username)
#     url = f"https://api.github.com/users/{username}/repos"
#     headers = {
#         "Authorization": f"Bearer {GITHUB_TOKEN}",
#         "Accept": f"application/vnd.github+json",
#     }
#     res = requests.get(
#         url= url,
#         headers= headers,
#     )
#     app.json.ensure_ascii = False
#     return jsonify(res.json())

@app.route("/profile")
def profile():
    return render_template("profile.html")

if __name__ == ("__main__"):
    app.run(debug=True)