-- ============================================================
--  OpenJenny 数据库初始化脚本
--  适用数据库：MySQL 5.7+  /  MariaDB 10.3+
--  执行方式：mysql -u root -p < init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `openjenny`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `openjenny`;

--  用户表 
CREATE TABLE IF NOT EXISTS `users` (
  `id`              INT            NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(50)    NOT NULL,
  `hashed_password` VARCHAR(255)   NOT NULL,
  `is_admin`        TINYINT(1)     NOT NULL DEFAULT 0,
  `created_at`      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `ix_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Skill 表 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `skills` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(100)  NOT NULL,
  `slug`           VARCHAR(100)  NOT NULL,
  `display_name`   VARCHAR(100)  NOT NULL,
  `description`    TEXT          NULL,
  `usage_guide`    TEXT          NULL,
  `version`        VARCHAR(20)   NOT NULL DEFAULT '1.0.0',
  `file_path`      VARCHAR(500)  NULL,
  `file_type`      VARCHAR(20)   NULL,
  `readme_content` TEXT          NULL,
  `tags`           VARCHAR(500)  NULL,
  `status`         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  `download_count` INT           NOT NULL DEFAULT 0,
  `like_count`     INT           NOT NULL DEFAULT 0,
  `author_id`      INT           NOT NULL,
  `created_at`     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`     DATETIME(6)   NULL ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skills_name` (`name`),
  UNIQUE KEY `uq_skills_slug` (`slug`),
  KEY `ix_skills_name` (`name`),
  KEY `ix_skills_slug` (`slug`),
  KEY `fk_skills_author` (`author_id`),
  CONSTRAINT `fk_skills_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Skill 版本历史表 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `skill_versions` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `skill_id`   INT          NOT NULL,
  `version`    VARCHAR(20)  NOT NULL,
  `file_path`  VARCHAR(500) NULL,
  `changelog`  TEXT         NULL,
  `created_at` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_skillversions_skill` (`skill_id`),
  CONSTRAINT `fk_skillversions_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 点赞表 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `likes` (
  `id`         INT         NOT NULL AUTO_INCREMENT,
  `skill_id`   INT         NOT NULL,
  `user_id`    INT         NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_likes_skill_user` (`skill_id`, `user_id`),
  KEY `fk_likes_skill` (`skill_id`),
  KEY `fk_likes_user`  (`user_id`),
  CONSTRAINT `fk_likes_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_likes_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 评论表 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `comments` (
  `id`         INT         NOT NULL AUTO_INCREMENT,
  `skill_id`   INT         NOT NULL,
  `user_id`    INT         NOT NULL,
  `parent_id`  INT         NULL,
  `content`    TEXT        NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `fk_comments_skill`  (`skill_id`),
  KEY `fk_comments_user`   (`user_id`),
  KEY `fk_comments_parent` (`parent_id`),
  CONSTRAINT `fk_comments_skill`  FOREIGN KEY (`skill_id`)  REFERENCES `skills`   (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`    (`id`),
  CONSTRAINT `fk_comments_parent` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  预置管理员账号
--  密码明文：admin123
--  哈希算法：bcrypt（$2b$ rounds=12）
--  正式上线前请务必修改密码！
-- ============================================================
INSERT IGNORE INTO `users` (`username`, `hashed_password`, `is_admin`) VALUES
  ('admin',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/o.k9H3IKu',
   1);
