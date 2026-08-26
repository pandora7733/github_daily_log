import os
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson.objectid import ObjectId
from dotenv import load_dotenv

load_dotenv()

class CommitRetroModel:
    def __init__(self):
        mongo_uri = os.getenv("MONGO_DB")
        self.client = MongoClient(mongo_uri)
        self.db = self.client["commit_retro_db"]
        
        self.users = self.db["users"]
        self.retrospectives = self.db["retrospectives"]
        self.postits = self.db["postits"]
        
        self._init_indexes()

    def _init_indexes(self):
        """기획서 및 피그마 조회 패턴에 맞춘 인덱스 설정"""
        # 기존 DB의 githubId_1 인덱스(sparse=True)와 동일한 옵션을 사용한다.
        # local 회원처럼 githubId가 없는 문서도 users 컬렉션에 저장될 수 있다.
        self.users.create_index(
            [("githubId", ASCENDING)],
            unique=True,
            sparse=True,
        )
        self.retrospectives.create_index([("userId", ASCENDING), ("date", DESCENDING)])
        self.postits.create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])

    def get_or_create_user(self, github_id, username, avatar_url, bio="", access_token=""):
        """깃허브 계정 기반 유저 등록 및 조회"""
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
        """중앙 note 2026 영역에서 사용자가 작성한 회고록 저장 (Create)"""
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

    def get_user_retrospectives(self, user_id):
        """피그마 좌측 사이드바용: 사용자의 전체 회고록 목록 최신순 조회 (Read)"""
        return list(self.retrospectives.find({"userId": ObjectId(user_id)}).sort("date", -1))

    def get_retrospective_detail(self, retro_id):
        """피그마 중앙 본문 영역용: 선택한 회고록의 상세 내용 및 임베드된 커밋 조회"""
        return self.retrospectives.find_one({"_id": ObjectId(retro_id)})

    def create_postit(self, user_id, content):
        """우측 메모 영역에서 사용자가 추가한 독립 포스트잇 저장 (Create)"""
        postit_data = {
            "userId": ObjectId(user_id), 
            "content": content,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
        result = self.postits.insert_one(postit_data)
        return result.inserted_id

    def get_user_postits(self, user_id):
        """피그마 우측 사이드바용: 사용자가 작성한 독립 메모 목록 최신순 조회 (Read)"""
        return list(self.postits.find({"userId": ObjectId(user_id)}).sort("createdAt", -1))

    def update_retrospective(self, retro_id, user_id, title=None, content=None, commits_snapshot=None):
        """회고록 수정 (Update) - 본인 확인 포함"""
        update_data = {}
        if title is not None:
            update_data["title"] = title
        if content is not None:
            update_data["content"] = content
        if commits_snapshot is not None:
            update_data["commits"] = commits_snapshot
            
        if not update_data:
            return False

        update_data["updatedAt"] = datetime.now()

        result = self.retrospectives.update_one(
            {"_id": ObjectId(retro_id), "userId": ObjectId(user_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    def delete_retrospective(self, retro_id, user_id):
        """회고록 삭제 (Delete) - 본인 확인 포함"""
        result = self.retrospectives.delete_one({
            "_id": ObjectId(retro_id),
            "userId": ObjectId(user_id)
        })
        return result.deleted_count > 0

    def update_postit(self, postit_id, user_id, content):
        """포스트잇 내용 수정 (Update) - 본인 확인 포함"""
        result = self.postits.update_one(
            {"_id": ObjectId(postit_id), "userId": ObjectId(user_id)},
            {"$set": {
                "content": content,
                "updatedAt": datetime.now()
            }}
        )
        return result.modified_count > 0

    def delete_postit(self, postit_id, user_id):
        """포스트잇 삭제 (Delete) - 본인 확인 포함"""
        result = self.postits.delete_one({
            "_id": ObjectId(postit_id),
            "userId": ObjectId(user_id)
        })
        return result.deleted_count > 0
