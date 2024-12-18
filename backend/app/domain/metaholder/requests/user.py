from uuid import UUID

from pydantic import BaseModel


class UserInfoRequest(BaseModel):
    user_id: UUID


class UserBetsRequest(BaseModel):
    user_id: UUID
