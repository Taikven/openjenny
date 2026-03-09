import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "123456"
    DB_NAME: str = "openjenny"

    SECRET_KEY: str = "openjenny-super-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # 支持绝对路径或相对路径（相对路径以 server/ 目录为基准）
    # 示例：UPLOAD_DIR=D:/myskills  或  UPLOAD_DIR=/data/openjenny/uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 52428800  # 50MB

    class Config:
        env_file = ".env"

    @property
    def upload_dir_abs(self) -> str:
        """返回规范化的绝对路径，无论 UPLOAD_DIR 是绝对还是相对路径"""
        if os.path.isabs(self.UPLOAD_DIR):
            return self.UPLOAD_DIR
        # 相对路径：以本文件所在包的上级目录（server/）为基准
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.normpath(os.path.join(base, self.UPLOAD_DIR))


settings = Settings()
