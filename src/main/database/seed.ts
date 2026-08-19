import { getSqlite } from './connection'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

interface ClauseSeed {
  id: string
  title: string
  description: string | null
  parentId: string | null
  depth: number
  sortOrder: number
  category: string | null
  forms?: string[]
}

interface TeamSeed {
  id: string
  name: string
  managerId?: string
}

interface PersonSeed {
  id: string
  name: string
  teamId: string
  role: string | null
  email: string | null
  qualifications: string | null
}

interface RegulationSeed {
  docCode: string
  name: string
  type: string
  clauseId: string
  teamId: string
  revision: string
  fileName: string
}

export function seedDatabase(): void {
  const db = getSqlite()

  // Always seed company profile if missing (runs on both new and existing DBs)
  seedCompanyProfile(db)

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM clauses').get() as { count: number }
  if (existing.count > 0) {
    console.log('Database already seeded, skipping.')
    return
  }

  const seedDir = !app.isPackaged
    ? join(__dirname, '../../resources/seed')
    : join(process.resourcesPath, 'seed')

  if (!existsSync(seedDir)) {
    console.warn('Seed directory not found:', seedDir)
    return
  }

  console.log('Seeding database...')

  // 39호 S2(8/19): teams.json·persons.json·regulations.json 은 TPC 실명·실규정 = TPC팩 전용.
  // 설치 팩(app_config install.packs — 러너가 기록)에 tpc 가 없으면 건너뛴다(표준 설치 = 인원 0 · 조항만).
  const tpcPack = installPacks(db).includes('tpc')

  if (tpcPack) {
    // 1. Seed teams
    const teams: TeamSeed[] = JSON.parse(readFileSync(join(seedDir, 'teams.json'), 'utf-8'))
    const insertTeam = db.prepare('INSERT INTO teams (id, name, manager_id) VALUES (?, ?, ?)')
    for (const team of teams) {
      insertTeam.run(team.id, team.name, team.managerId || null)
    }
    console.log(`Seeded ${teams.length} teams`)

    // 2. Seed persons
    const persons: PersonSeed[] = JSON.parse(readFileSync(join(seedDir, 'persons.json'), 'utf-8'))
    const insertPerson = db.prepare(
      'INSERT INTO persons (id, name, team_id, role, email, qualifications) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const person of persons) {
      insertPerson.run(person.id, person.name, person.teamId, person.role, person.email, person.qualifications)
    }
    console.log(`Seeded ${persons.length} persons`)
  } else {
    console.log('[seed] install.packs 에 tpc 없음 — teams/persons/regulations 시드 생략(표준 설치)')
  }

  // 3. Seed clauses and documents
  const clauses: ClauseSeed[] = JSON.parse(readFileSync(join(seedDir, 'iatf16949-clauses.json'), 'utf-8'))
  const insertClause = db.prepare(
    'INSERT INTO clauses (id, title, description, parent_id, depth, sort_order, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertDoc = db.prepare(
    'INSERT INTO documents (id, clause_id, name, type, current_version, retention_days) VALUES (?, ?, ?, ?, ?, ?)'
  )

  let docCount = 0
  for (const clause of clauses) {
    insertClause.run(
      clause.id, clause.title, clause.description,
      clause.parentId, clause.depth, clause.sortOrder, clause.category
    )

    // Create document entries from forms
    if (clause.forms) {
      for (let i = 0; i < clause.forms.length; i++) {
        const docId = `doc-${clause.id}-${String(i + 1).padStart(2, '0')}`
        insertDoc.run(docId, clause.id, clause.forms[i], 'form', '1.0', 1095)
        docCount++
      }
    }
  }
  console.log(`Seeded ${clauses.length} clauses, ${docCount} documents`)

  // 4. Seed regulations (procedure/manual documents with team mapping) — TPC팩 전용
  const regPath = join(seedDir, 'regulations.json')
  if (tpcPack && existsSync(regPath)) {
    const regulations: RegulationSeed[] = JSON.parse(readFileSync(regPath, 'utf-8'))
    const insertReg = db.prepare(
      'INSERT INTO documents (id, clause_id, name, type, current_version, retention_days, team_id, doc_code, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const reg of regulations) {
      const docId = `reg-${reg.docCode.toLowerCase()}`
      insertReg.run(
        docId, reg.clauseId, reg.name, reg.type,
        reg.revision, 1095,
        reg.teamId, reg.docCode, reg.revision
      )
    }
    console.log(`Seeded ${regulations.length} regulation documents`)
  }

  console.log('Database seeding complete!')
}

function installPacks(db: ReturnType<typeof getSqlite>): string[] {
  try {
    const row = db.prepare("SELECT value FROM app_config WHERE key='install.packs'").get() as { value: string } | undefined
    if (row && row.value) return row.value.split(',').map((s) => s.trim()).filter(Boolean)
  } catch {
    /* app_config 없음(구 DB) */
  }
  // 이력 있는 DB 에 키가 없으면 레거시 = TPC 설치(러너 LEGACY_DEFAULT_PACKS 와 동일 판단)
  try {
    const n = (db.prepare('SELECT COUNT(*) AS c FROM _migrations').get() as { c: number }).c
    if (n > 0) return ['standard', 'tpc']
  } catch {
    /* noop */
  }
  return ['standard']
}

function seedCompanyProfile(db: ReturnType<typeof getSqlite>): void {
  try {
    // 테이블 존재 확인용(없으면 catch로 스킵). INSERT OR IGNORE가 멱등이라
    // 기존 프로필이 있어도 누락된 키(예: defaultAuthor)만 안전하게 백필됨.
    db.prepare('SELECT COUNT(*) as count FROM company_profile').get()
  } catch {
    // Table doesn't exist yet (migration not run), skip
    return
  }

  // ⚠️실명·실주소·실전화는 시드에 넣지 않는다(설치판 번들에 실림) — 설치 후 프로필에서 입력.
  // ⚠️회사 식별 문자열(회사명·사업부·공정·제품)도 시드 금지(39호 S1) — TPC 값은
  //   0144_company_profile_tpc_values.sql([TPC팩 후보])이 공급. 마이그가 시드보다 먼저 돌므로
  //   라이브/현행 설치는 0144 값이 선점되고, S2 이후 판매판은 이 중립값으로 수렴한다.
  // 기존 설치본은 INSERT OR IGNORE 라 이미 저장된 값이 유지됨.
  const profileDefaults: Record<string, string> = {
    companyName: '',
    ceoName: '',
    address: '',
    phone: '',
    fax: '',
    factoryName: '',
    companyNameEn: '',
    companyNameShort: '',
    divisionLabel: '',
    processes: '',
    products: '',
    plant: '',
    revisionNumber: 'REV.8',
    revisionDate: new Date().toISOString().split('T')[0],
    // 양식 작성자 기본값 = 빈값. 작성자는 활성 사용자(§4)로 자동채움하고, 미선택 시 빈칸 유지.
    // 가짜 이름(예: '홍길동') 폴백 금지(2026-07-23 방침) — export 폴백도 created_by 없으면 빈값이 정답.
    defaultAuthor: '',
    // 정기 인증심사일 데모 기본값 — Sidebar 에서 실제 일정으로 변경(useDday·브리핑 기준일)
    auditDate: '2026-12-31'
  }

  const insertProfile = db.prepare('INSERT OR IGNORE INTO company_profile (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(profileDefaults)) {
    insertProfile.run(key, value)
  }
  console.log('Seeded company profile defaults')
}
