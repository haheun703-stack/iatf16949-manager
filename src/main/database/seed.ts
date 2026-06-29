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

interface ApqpPhaseSeed {
  id: string
  phaseNo: number
  title: string
  titleEn: string | null
  description: string | null
  sortOrder: number
}

interface ApqpElementSeed {
  id: string
  phaseId: string
  seq: number
  name: string
  nameEn: string | null
  io: string
  coreTool: string | null
  clauseId: string | null
  teamId: string | null
  sortOrder: number
}

export function seedDatabase(): void {
  const db = getSqlite()

  // Always seed company profile if missing (runs on both new and existing DBs)
  seedCompanyProfile(db)

  // Always seed APQP if missing (runs on both new and existing DBs)
  seedApqp(db)

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
    const profileExists = db.prepare('SELECT COUNT(*) as count FROM company_profile').get() as { count: number }
    if (profileExists.count > 0) return
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
    revisionDate: new Date().toISOString().split('T')[0]
  }

  const insertProfile = db.prepare('INSERT OR IGNORE INTO company_profile (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(profileDefaults)) {
    insertProfile.run(key, value)
  }
  console.log('Seeded company profile defaults')
}

function seedApqp(db: ReturnType<typeof getSqlite>): void {
  try {
    const exists = db.prepare('SELECT COUNT(*) as count FROM apqp_phases').get() as { count: number }
    if (exists.count > 0) return
  } catch {
    // Table doesn't exist yet (migration not run), skip
    return
  }

  const seedDir = !app.isPackaged
    ? join(__dirname, '../../resources/seed')
    : join(process.resourcesPath, 'seed')

  const apqpPath = join(seedDir, 'apqp-elements.json')
  if (!existsSync(apqpPath)) {
    console.warn('APQP seed file not found:', apqpPath)
    return
  }

  const data = JSON.parse(readFileSync(apqpPath, 'utf-8')) as {
    phases: ApqpPhaseSeed[]
    elements: ApqpElementSeed[]
  }

  const insertPhase = db.prepare(
    'INSERT INTO apqp_phases (id, phase_no, title, title_en, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const insertElement = db.prepare(
    `INSERT INTO apqp_elements (id, phase_id, seq, name, name_en, io, core_tool, clause_id, team_id, status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?)`
  )

  const seedAll = db.transaction(() => {
    for (const p of data.phases) {
      insertPhase.run(p.id, p.phaseNo, p.title, p.titleEn, p.description, p.sortOrder)
    }
    for (const e of data.elements) {
      insertElement.run(
        e.id, e.phaseId, e.seq, e.name, e.nameEn, e.io,
        e.coreTool, e.clauseId, e.teamId, e.sortOrder
      )
    }
  })
  seedAll()

  console.log(`Seeded ${data.phases.length} APQP phases, ${data.elements.length} elements`)
}
