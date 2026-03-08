from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Skill, User
from ..auth import require_admin

router = APIRouter(tags=["统计"])


# ─── 统计 Dashboard ────────────────────────────────────
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_skills = db.query(func.count(Skill.id)).filter(Skill.status == "approved").scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_downloads = db.query(func.sum(Skill.download_count)).scalar() or 0
    top_skills = (
        db.query(Skill)
        .filter(Skill.status == "approved")
        .order_by(Skill.download_count.desc())
        .limit(5)
        .all()
    )
    return {
        "total_skills": total_skills,
        "total_users": total_users,
        "total_downloads": total_downloads,
        "top_skills": [
            {"name": s.name, "display_name": s.display_name, "download_count": s.download_count}
            for s in top_skills
        ],
    }


# ─── 管理员：审核 Skill ────────────────────────────────
@router.patch("/admin/skills/{name}/status")
def change_skill_status(
    name: str,
    status: str,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        from fastapi import HTTPException
        raise HTTPException(404, "Skill 不存在")
    skill.status = status
    db.commit()
    return {"message": f"状态已更新为 {status}"}
