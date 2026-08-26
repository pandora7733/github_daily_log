import os
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson.objectid import ObjectId
from dotenv import load_dotenv

# .env 파일에서 MONGO_DB 주소를 무조건 읽어옵니다.
load_dotenv()

class CommitRetroModel:
    def __init__(self):
        mongo_uri = os.getenv("MONGO_DB")
        if not mongo_uri:
            raise ValueError("🚨 .env 파일에 MONGO_DB 연결 주소가 없습니다! 확인해 주세요.")
            
        print(f"🔗 [연결 체크] 실제 DB 서버 접속 시도 중...\n주소: {mongo_uri}\n")
        self.client = MongoClient(mongo_uri)
        self.db = self.client["commit_retro_db"]
        
        self.users = self.db["users"]
        self.retrospectives = self.db["retrospectives"]
        self.postits = self.db["postits"]
        
        self._init_indexes()

    def _init_indexes(self):
        self.users.create_index([("githubId", ASCENDING)], unique=True)
        self.retrospectives.create_index([("userId", ASCENDING), ("date", DESCENDING)])
        self.postits.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])

    def get_or_create_user(self, github_id, username, avatar_url, bio="", access_token=""):
        user = self.users.find_one({"githubId": github_id})
        if user:
            return user
            
        user_data = {
            "githubId": github_id,
            "username": username,
            "avatarUrl": avatar_url,
            "bio": bio,
            "accessToken": access_token,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
        result = self.users.insert_one(user_data)
        user_data["_id"] = result.inserted_id
        return user_data

    def create_retrospective(self, user_id, title, content, commits_snapshot=None):
        if commits_snapshot is None:
            commits_snapshot = []
            
        retro_data = {
            "userId": ObjectId(user_id),
            "date": datetime.now(),
            "title": title,
            "content": content,
            "commits": commits_snapshot,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
        result = self.retrospectives.insert_one(retro_data)
        return result.inserted_id

# 진짜 DB 접속 테스트 실행부
if __name__ == "__main__":
    try:
        # 모델을 생성하는 순간 진짜 다른 사람 DB 접속을 시도합니다.
        model = CommitRetroModel()
        
        print("="*60)
        print("⚡ [진짜 외부 DB 연동 테스트] 데이터를 전송합니다.")
        print("="*60)
        
        # 이름에 '강혜성_테스트'를 넣어서 가상 테스트와 명확히 구분합니다.
        user = model.get_or_create_user("hyesung_real_test", "강혜성_테스트", "https://github.com")
        u_id = user["_id"]
        print(f"✅ [1단계 성공] 상대방 DB에 유저 등록 완료 (ID: {u_id})")
        
        retro_id = model.create_retrospective(u_id, "진짜 연결 성공", "가짜가 아니라 진짜 원격 DB에 꽂혔습니다.", [])
        print(f"✅ [2단계 성공] 상대방 DB에 회고록 저장 완료 (글 ID: {retro_id})")
        print("="*60)
        print("🎉 [결론] 다른 사람 DB에 접근하고 데이터를 쓰는 데 완벽히 성공했습니다!")
        print("="*60)
        
    except Exception as e:
        print("\n" + "="*60)
        print(f"❌ [결론] 다른 사람 DB 접속 실패 (IP 차단 또는 인증 오류)")
        print(f"🚨 에러 내용: {e}")
        print("="*60)
