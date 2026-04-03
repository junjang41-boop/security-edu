-- =============================================
-- security-edu PostgreSQL 초기화 스크립트
-- =============================================

-- 관리자 계정 테이블
CREATE TABLE IF NOT EXISTS admins (
  id           VARCHAR(100) PRIMARY KEY,
  password     VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 관리자별 설정 테이블 (시스템명, 파일명 등)
CREATE TABLE IF NOT EXISTS settings (
  admin_id          VARCHAR(100) PRIMARY KEY,
  company_name      VARCHAR(255),
  system_name       VARCHAR(255) DEFAULT '[교육 이름을 설정해주세요]',
  employee_file_name VARCHAR(255),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- 유튜브 링크 테이블
CREATE TABLE IF NOT EXISTS youtube_settings (
  admin_id   VARCHAR(100) PRIMARY KEY,
  url        TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 교육자료(PDF/PPT) 테이블
CREATE TABLE IF NOT EXISTS material_settings (
  admin_id    VARCHAR(100) PRIMARY KEY,
  file_name   VARCHAR(500),
  file_path   TEXT,           -- 로컬 파일 시스템 경로
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 임직원 명부 테이블
CREATE TABLE IF NOT EXISTS employees (
  id              SERIAL PRIMARY KEY,
  company_id      VARCHAR(100) NOT NULL,
  사번            VARCHAR(100) NOT NULL,
  이름            VARCHAR(100) NOT NULL,
  이메일          VARCHAR(255),
  보안교육이수여부  VARCHAR(20) DEFAULT '미완료',
  UNIQUE (company_id, 사번)
);

-- 퀴즈 문제 저장 테이블 (JSON 배열로 저장)
CREATE TABLE IF NOT EXISTS quiz_settings (
  admin_id     VARCHAR(100) PRIMARY KEY,
  questions    JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMP DEFAULT NOW()
);

-- 퀴즈 응시 결과 테이블
CREATE TABLE IF NOT EXISTS quiz_results (
  id          SERIAL PRIMARY KEY,
  company_id  VARCHAR(100) NOT NULL,
  사번         VARCHAR(100) NOT NULL,
  이름         VARCHAR(100) NOT NULL,
  점수         INTEGER NOT NULL,
  합격여부      VARCHAR(20) NOT NULL,
  응시일시      TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_company_id ON quiz_results(company_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_사번 ON quiz_results(사번);
