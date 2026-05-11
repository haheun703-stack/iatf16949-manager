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

export function seedDatabase(): void {
  const db = getSqlite()

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

  console.log('Database seeding complete!')
}
