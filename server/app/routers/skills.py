import os
import re
import zipfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..database import get_db
from ..models import Skill, SkillVersion, User
from ..schemas import (
    SkillOut, SkillListResponse,
    InstallCommandRequest
)
from ..auth import get_current_user, get_current_user_optional
from ..config import settings

router = APIRouter(prefix="/skills", tags=["Skill"])


def make_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9\-_]", "-", name.lower())


def _build_skill_query(db: Session, q: Optional[str], search_mode: str, tag: Optional[str], author: Optional[str]):
    """构建 Skill 查询，复用于列表和全量名称接口"""
    query = db.query(Skill).filter(Skill.status == "approved")

    if author:
        author_user = db.query(User).filter(User.username == author).first()
        if author_user:
            query = query.filter(Skill.author_id == author_user.id)
        else:
            query = query.filter(False)

    if q:
        if search_mode == "exact_tag":
            # 精确标签匹配：标签列表中存在完全相同的标签
            query = query.filter(
                or_(
                    Skill.tags == q,
                    Skill.tags.ilike(f"{q},%"),
                    Skill.tags.ilike(f"%,{q}"),
                    Skill.tags.ilike(f"%,{q},%"),
                )
            )
        else:
            # 默认模糊搜索
            query = query.filter(
                or_(
                    Skill.display_name.ilike(f"%{q}%"),
                    Skill.name.ilike(f"%{q}%"),
                    Skill.description.ilike(f"%{q}%"),
                    Skill.tags.ilike(f"%{q}%"),
                )
            )

    if tag:
        query = query.filter(Skill.tags.ilike(f"%{tag}%"))

    return query


# ─── 获取 Skill 列表 ────────────────────────────────────
@router.get("", response_model=SkillListResponse)
def list_skills(
    q: Optional[str] = Query(None),
    search_mode: str = Query("fuzzy", enum=["fuzzy", "exact_tag"]),
    tag: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    sort: str = Query("created_at", enum=["created_at", "download_count"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = _build_skill_query(db, q, search_mode, tag, author)

    total = query.count()
    items = query.order_by(getattr(Skill, sort).desc()) \
        .offset((page - 1) * page_size).limit(page_size).all()

    import math
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size),
    }


# ─── 获取精确搜索全部 Skill 名称（用于安装全部）──────────
@router.get("/query/exact-search")
def get_exact_search(
    q: Optional[str] = Query(None),
    search_mode: str = Query("exact_tag", enum=["exact_tag"]),
    tag: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = _build_skill_query(db, q, search_mode, tag, author)
    skills = query.with_entities(Skill.name).all()
    return {"names": [s.name for s in skills], "total": len(skills)}


# ─── 上传 Skill ────────────────────────────────────────
@router.post("", response_model=SkillOut, status_code=201)
async def create_skill(
    name: str = Form(...),
    display_name: str = Form(...),
    description: Optional[str] = Form(None),
    usage_guide: Optional[str] = Form(None),
    version: str = Form("1.0.0"),
    tags: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not re.match(r"^[a-z0-9\-_]+$", name):
        raise HTTPException(400, "name 只能包含小写字母、数字、横线和下划线")
    if db.query(Skill).filter(Skill.name == name).first():
        raise HTTPException(400, "Skill 名称已存在")

    slug = make_slug(name)
    file_path = None
    file_type = None
    readme_content = None

    if file:
        os.makedirs(settings.upload_dir_abs, exist_ok=True)
        skill_dir = os.path.join(settings.upload_dir_abs, name, version)
        os.makedirs(skill_dir, exist_ok=True)

        filename = file.filename or "upload"
        ext = os.path.splitext(filename)[1].lower()

        if ext not in [".zip", ".md", ".tar", ".gz"]:
            raise HTTPException(400, "仅支持 .zip / .tar.gz / .md 文件")

        # 读取内容，检查是否为空
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(400, "文件内容为空，请上传有效文件")

        save_path = os.path.join(skill_dir, filename)
        with open(save_path, "wb") as f:
            f.write(content)

        file_path = save_path
        file_type = "md" if ext == ".md" else "zip"

        if ext == ".md":
            with open(save_path, "r", encoding="utf-8", errors="ignore") as f:
                readme_content = f.read()
        elif ext == ".zip":
            try:
                with zipfile.ZipFile(save_path, "r") as zf:
                    for name_in_zip in zf.namelist():
                        if name_in_zip.lower() in ["readme.md", "readme.txt"]:
                            readme_content = zf.read(name_in_zip).decode("utf-8", errors="ignore")
                            break
            except Exception:
                pass

    skill = Skill(
        name=name,
        slug=slug,
        display_name=display_name,
        description=description,
        usage_guide=usage_guide,
        version=version,
        file_path=file_path,
        file_type=file_type,
        readme_content=readme_content,
        tags=tags,
        author_id=current_user.id,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)

    sv = SkillVersion(skill_id=skill.id, version=version, file_path=file_path)
    db.add(sv)
    db.commit()
    db.refresh(skill)
    return skill


# ─── 获取单个 Skill ────────────────────────────────────
@router.get("/{name}", response_model=SkillOut)
def get_skill(name: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")
    return skill


# ─── 更新 Skill ────────────────────────────────────────
@router.patch("/{name}", response_model=SkillOut)
async def update_skill(
    name: str,
    display_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    usage_guide: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    new_version: Optional[str] = Form(None),
    changelog: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")
    if skill.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "无权限修改")

    if display_name:
        skill.display_name = display_name
    if description is not None:
        skill.description = description
    if usage_guide is not None:
        skill.usage_guide = usage_guide
    if tags is not None:
        skill.tags = tags

    if file and new_version:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(400, "文件内容为空，请上传有效文件")
        skill_dir = os.path.join(settings.upload_dir_abs, name, new_version)
        os.makedirs(skill_dir, exist_ok=True)
        filename = file.filename or "upload"
        save_path = os.path.join(skill_dir, filename)
        with open(save_path, "wb") as f:
            f.write(content)
        skill.version = new_version
        skill.file_path = save_path
        ext = os.path.splitext(filename)[1].lower()
        skill.file_type = "md" if ext == ".md" else "zip"
        if ext == ".md":
            with open(save_path, "r", encoding="utf-8") as f:
                skill.readme_content = f.read()

        sv = SkillVersion(skill_id=skill.id, version=new_version, file_path=save_path, changelog=changelog)
        db.add(sv)

    db.commit()
    db.refresh(skill)
    return skill


# ─── 删除 Skill ────────────────────────────────────────
@router.delete("/{name}", status_code=204)
def delete_skill(
    name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")
    if skill.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "无权限删除")
    db.delete(skill)
    db.commit()


# ─── 下载 Skill ────────────────────────────────────────
@router.get("/{name}/download")
def download_skill(name: str, version: Optional[str] = None, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")

    if version and version != skill.version:
        sv = db.query(SkillVersion).filter(
            SkillVersion.skill_id == skill.id,
            SkillVersion.version == version
        ).first()
        if not sv or not sv.file_path:
            raise HTTPException(404, f"版本 {version} 不存在")
        file_path = sv.file_path
    else:
        file_path = skill.file_path

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(404, "文件不存在")

    skill.download_count += 1
    db.commit()

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        filename=os.path.basename(file_path),
        media_type="application/octet-stream",
    )


# ─── 获取安装命令 ──────────────────────────────────────
@router.post("/install-command")
def get_install_command(body: InstallCommandRequest):
    skills_str = " ".join(body.skill_names)
    cmd = f"openjenny install {skills_str}"
    return {"command": cmd, "skills": body.skill_names}
