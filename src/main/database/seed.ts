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

  // 1. Seed teams
  const teams: TeamSeed[] = JSON.parse(readFileSync(join(seedDir, 'teams.json'), 'utf-8'))
  const insertTeam = db.prepare(
    'INSERT INTO teams (id, name, manager_id) VALUES (?, ?, ?)'
  )
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

  // 4. Seed regulations (procedure/manual documents with team mapping)
  const regPath = join(seedDir, 'regulations.json')
  if (existsSync(regPath)) {
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

function seedCompanyProfile(db: ReturnType<typeof getSqlite>): void {
  try {
    // 테이블 존재 확인용(없으면 catch로 스킵). INSERT OR IGNORE가 멱등이라
    // 기존 프로필이 있어도 누락된 키(예: defaultAuthor)만 안전하게 백필됨.
    db.prepare('SELECT COUNT(*) as count FROM company_profile').get()
  } catch {
    // Table doesn't exist yet (migration not run), skip
    return
  }

  const profileDefaults: Record<string, string> = {
    companyName: '주식회사 티피씨',
    ceoName: '이정훈',
    address: '경상북도 경산시 진량읍 공단6로 55',
    phone: '(053)854-7500',
    fax: '',
    factoryName: '2공장 AM사업부',
    revisionNumber: 'REV.8',
    revisionDate: new Date().toISOString().split('T')[0],
    // 양식 작성자 기본값(로그인 도입 전 stub). 로그인 후 사용자명으로 대체.
    defaultAuthor: '홍길동',
    // 정기 인증심사일 데모 기본값 — Sidebar 에서 실제 일정으로 변경(useDday·브리핑 기준일)
    auditDate: '2026-12-31'
  }

  const insertProfile = db.prepare('INSERT OR IGNORE INTO company_profile (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(profileDefaults)) {
    insertProfile.run(key, value)
  }
  console.log('Seeded company profile defaults')
}
