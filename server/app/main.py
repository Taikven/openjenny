from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import engine, Base
from .models import *  # noqa: 触发模型注册
from .routers import auth, skills, interactions, misc
from .config import settings

# 自动建表
Base.metadata.create_all(bind=engine)

# 确保上传目录存在
os.makedirs(settings.upload_dir_abs, exist_ok=True)

app = FastAPI(
    title="OpenJenny API",
    description="团队 Skill 共享平台",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(interactions.router, prefix="/api")
app.include_router(misc.router, prefix="/api")

# 静态文件服务（上传的文件）
if os.path.exists(settings.upload_dir_abs):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir_abs), name="uploads")


@app.get("/")
def root():
    return {"message": "OpenJenny API is running 🚀", "docs": "/docs"}
