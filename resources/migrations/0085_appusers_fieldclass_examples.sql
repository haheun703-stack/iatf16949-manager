-- ============================================================
-- Migration 0085: 12번 지시서 데이터 계약 3종 (2026-07-21)
-- [스키마 확장 + app_users 시드] [TPC팩 후보]
--
-- 원천 = 12_UIUX_홈재배치_정답따라쓰기_개발지시서_260721.md §2 + §0.5 교정 + §0.6 결정.
-- 봇(iatf16949-manager) 구현 착수분. 코워크 §0.6 승인 하에 진행.
--   (1) app_users        — 공용 PC 사람 전환의 원천(명단). §0.6 결정4: persons.json 16명
--                          + executive 1행으로 시드("빈 상태 출하" 철회).
--   (2) form_fields.field_class — 틀(frame)/사실(fact) 분류. §2(2) 라벨 휴리스틱 기본값,
--                          P6 예시 시드에서 7건은 명시 지정으로 덮음.
--   (3) form_examples    — 양식별 모범 작성본(읽기전용 마스터). 시드는 P6(별도 json).
--
-- ⚠️§0.5 B: form_submissions.author 는 만들지 않음 — 이미 `created_by`(0004:60) 존재, 재사용.
-- ⚠️§0.5 B: 이 파일이 실제 0085 마이그(.sql). 오늘 seed 정본화 커밋을 '0085'로 라벨했으나
--   그건 persons/teams json 이지 마이그 파일이 아니었음 — .sql 0085 번호는 비어 있었음.
-- ⚠️BEGIN/COMMIT 없음(migrate.ts 가 트랜잭션으로 감쌈). ADD COLUMN 은 1회 적용(재실행 안 됨).
-- 멱등: app_users 시드는 INSERT OR IGNORE(name UNIQUE), CREATE TABLE IF NOT EXISTS.
-- ============================================================

-- ── (1) app_users : 앱 사용자 명단 ──────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,        -- 실명(표기·기록 주체)
  team_dept  TEXT,                        -- normalizeTeam 가능한 부서 문자열(team-theme deptKeys)
  role       TEXT CHECK(role IN ('member','manager','executive')) DEFAULT 'member',
  active     INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
-- 활성 사용자(active_user_id)는 DB 아님 — 로컬 상태(electron-store/localStorage). 회사 데이터에 세션 미혼입.

-- 시드 = resources/seed/persons.json(16명, 2026-07-20 신 조직도, 0085 정본화분) 미러 +
--   executive 1행. team_dept = teams.json name 정본(team-theme label 과 동일).
-- role = 각 팀 managerId 해당자(서규하·차현수·손진식·임하수·하헌)='manager', 나머지='member'.
-- ⚠️executive '서상규' = 사업부장(전무) 잠정값 — §0.6 결정4: "표기 이름은 사장님 확정
--   (12절 잔여 유일 항목)". 회장(이정훈) 표기 원하면 설정>사용자 관리에서 수정.
INSERT OR IGNORE INTO app_users (name, team_dept, role, sort_order) VALUES
  ('서상규', '경영지원',    'executive',  0),
  ('서규하', '관리팀',      'manager',   10),
  ('김초연', '관리팀',      'member',    11),
  ('차현수', '영업/자재팀', 'manager',   20),
  ('서명진', '영업/자재팀', 'member',    21),
  ('조성민', '영업/자재팀', 'member',    22),
  ('김만진', '영업/자재팀', 'member',    23),
  ('손진식', '생산팀',      'manager',   30),
  ('장석봉', '생산팀',      'member',    31),
  ('예지용', '생산팀',      'member',    32),
  ('김병철', '생산팀',      'member',    33),
  ('임하수', '품질팀',      'manager',   40),
  ('류형석', '품질팀',      'member',    41),
  ('박세진', '품질팀',      'member',    42),
  ('이화준', '품질팀',      'member',    43),
  ('하헌',   '개발팀',      'manager',   50),
  ('김민수', '개발팀',      'member',    51);

-- ── (2) form_fields.field_class : 틀/사실 분류 ──────────────
ALTER TABLE form_fields ADD COLUMN field_class TEXT
  CHECK(field_class IN ('frame','fact')) DEFAULT 'frame';

-- 휴리스틱 기본값(§2(2)): 명백한 '사실(fact)' 키워드는 fact, 나머지는 frame 기본.
-- fact 놓침(예시값 복제 차단 실패)이 frame 오판(불필요 입력 강제)보다 위험하므로 fact 넉넉히,
-- 단 '기준/방법/항목' 형식문구는 frame 유지(판정기준·측정방법·검사항목 등). P6 7건은 명시 지정으로 덮음.
UPDATE form_fields SET field_class='fact'
WHERE (
     label LIKE '%측정%' OR label LIKE '%실측%' OR label LIKE '%치수%'
  OR label LIKE '%LOT%'  OR label LIKE '%로트%' OR label LIKE '%수량%'
  OR label LIKE '%일자%' OR label LIKE '%일시%' OR label LIKE '%날짜%'
  OR label LIKE '%서명%' OR label LIKE '%확인자%' OR label LIKE '%작성자%' OR label LIKE '%검사자%'
  OR label LIKE '%실적%' OR label LIKE '%시리얼%'
  OR label LIKE '%결과%' OR label LIKE '%판정%'
  OR type = 'date'
)
AND label NOT LIKE '%기준%' AND label NOT LIKE '%방법%' AND label NOT LIKE '%항목%';

-- ── (3) form_examples : 양식별 모범 작성본(읽기전용 마스터) ──
CREATE TABLE IF NOT EXISTS form_examples (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  form_code     TEXT NOT NULL,
  field_key     TEXT NOT NULL,           -- form_fields.field_key 매칭(0004)
  example_value TEXT NOT NULL,           -- 모범 값(fact 필드도 '보기'용으로만 — 우측 주입 경로 없음)
  why_note      TEXT,                    -- "왜 이렇게 쓰나" 좌측 패널 각주
  version       TEXT NOT NULL DEFAULT 'v1',
  UNIQUE(form_code, field_key)
);
-- 시드는 P6에서 resources/seed/form_examples_seed.json 으로(field 보유 연결양식 우선).
