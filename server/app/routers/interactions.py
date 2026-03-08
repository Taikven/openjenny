from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Like, Comment, Skill
from ..schemas import LikeOut, CommentCreate, CommentOut
from ..auth import get_current_user
from ..models import User

router = APIRouter(tags=["互动"])


# ─── 点赞 ──────────────────────────────────────────────
@router.post("/skills/{name}/like", response_model=LikeOut)
def toggle_like(
    name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")

    existing = db.query(Like).filter(Like.skill_id == skill.id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        skill.like_count = max(0, (skill.like_count or 0) - 1)
        db.commit()
        return {"liked": False, "like_count": skill.like_count}
    else:
        like = Like(skill_id=skill.id, user_id=current_user.id)
        db.add(like)
        skill.like_count = (skill.like_count or 0) + 1
        db.commit()
        return {"liked": True, "like_count": skill.like_count}


@router.get("/skills/{name}/like/my", response_model=LikeOut)
def my_like(
    name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")
    liked = db.query(Like).filter(Like.skill_id == skill.id, Like.user_id == current_user.id).first() is not None
    return {"liked": liked, "like_count": skill.like_count or 0}


# ─── 评论 ──────────────────────────────────────────────
@router.get("/skills/{name}/comments", response_model=list[CommentOut])
def list_comments(name: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")
    return db.query(Comment).filter(Comment.skill_id == skill.id, Comment.parent_id == None).all()


@router.post("/skills/{name}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    name: str,
    body: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.name == name).first()
    if not skill:
        raise HTTPException(404, "Skill 不存在")
    comment = Comment(
        skill_id=skill.id,
        user_id=current_user.id,
        content=body.content,
        parent_id=body.parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(404, "评论不存在")
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "无权限")
    db.delete(comment)
    db.commit()
