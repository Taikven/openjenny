from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


# ─── User ──────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    pass


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─── Skill ─────────────────────────────────────────────
class SkillCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    usage_guide: Optional[str] = None
    version: str = "1.0.0"
    tags: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_must_be_slug(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9\-_]+$", v):
            raise ValueError("name 只能包含小写字母、数字、横线和下划线")
        return v


class SkillUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    usage_guide: Optional[str] = None
    tags: Optional[str] = None


class SkillVersionOut(BaseModel):
    id: int
    version: str
    changelog: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuthorOut(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True


class SkillOut(BaseModel):
    id: int
    name: str
    slug: str
    display_name: str
    description: Optional[str] = None
    usage_guide: Optional[str] = None
    version: str
    file_type: Optional[str] = None
    readme_content: Optional[str] = None
    tags: Optional[str] = None
    status: str
    download_count: int
    like_count: int = 0
    author: AuthorOut
    versions: List[SkillVersionOut] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SkillListOut(BaseModel):
    id: int
    name: str
    slug: str
    display_name: str
    description: Optional[str] = None
    version: str
    file_type: Optional[str] = None
    tags: Optional[str] = None
    status: str
    download_count: int
    like_count: int = 0
    author: AuthorOut
    created_at: datetime

    class Config:
        from_attributes = True


class SkillListResponse(BaseModel):
    items: List[SkillListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── Like ──────────────────────────────────────────────
class LikeOut(BaseModel):
    liked: bool
    like_count: int


# ─── Comment ───────────────────────────────────────────
class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentOut(BaseModel):
    id: int
    content: str
    user: AuthorOut
    parent_id: Optional[int] = None
    replies: List["CommentOut"] = []
    created_at: datetime

    @field_validator("replies", mode="before")
    @classmethod
    def coerce_replies(cls, v):
        if v is None:
            return []
        return v

    class Config:
        from_attributes = True


CommentOut.model_rebuild()


# ─── Install Command ───────────────────────────────────
class InstallCommandRequest(BaseModel):
    skill_names: List[str]
    scope: str = "local"
    version: Optional[str] = None
