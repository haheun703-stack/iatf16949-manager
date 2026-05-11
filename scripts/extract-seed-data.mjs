/**
 * IATF 16949 시드 데이터 추출 스크립트
 * iatf16949-manager.jsx에서 IATF_DATA, TEAMS, PEOPLE을 추출하여 JSON으로 변환
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const seedDir = join(projectRoot, 'resources', 'seed')

// Read the JSX file
const jsxContent = readFileSync(join(projectRoot, '..', 'iatf16949-manager.jsx'), 'utf-8')

// Extract IATF_DATA array (lines 4-277)
const dataMatch = jsxContent.match(/const IATF_DATA = (\[[\s\S]*?\n\];)/m)
if (!dataMatch) throw new Error('Could not find IATF_DATA in JSX')

// Remove trailing semicolon and evaluate as JS
let dataStr = dataMatch[1].replace(/;\s*$/, '')
const IATF_DATA = eval(`(${dataStr})`)

// Category mapping based on chapter number
const CATEGORY_MAP = {
  '4': 'context',
  '5': 'leadership',
  '6': 'planning',
  '7': 'support',
  '8': 'operation',
  '9': 'evaluation',
  '10': 'improvement'
}

// Flatten IATF_DATA into clauses array with parentId
const clauses = []
let globalSortOrder = 0

function extractClauses(nodes, parentId = null, depth = 0) {
  for (const node of nodes) {
    globalSortOrder++
    const chapter = node.id.split('.')[0]
    const clause = {
      id: node.id,
      title: node.title,
      description: node.desc || null,
      parentId: parentId,
      depth: depth,
      sortOrder: globalSortOrder,
      category: depth === 0 ? (CATEGORY_MAP[chapter] || null) : null
    }

    // Add forms if present (leaf nodes)
    if (node.forms && node.forms.length > 0) {
      clause.forms = node.forms
    }

    clauses.push(clause)

    // Recurse into children
    if (node.children && node.children.length > 0) {
      extractClauses(node.children, node.id, depth + 1)
    }
  }
}

extractClauses(IATF_DATA)

// Count statistics
const leafClauses = clauses.filter(c => c.forms)
const totalForms = leafClauses.reduce((sum, c) => sum + c.forms.length, 0)

console.log(`Extracted: ${clauses.length} clauses, ${leafClauses.length} leaf clauses, ${totalForms} forms`)

// Write clauses JSON
writeFileSync(join(seedDir, 'iatf16949-clauses.json'), JSON.stringify(clauses, null, 2), 'utf-8')
console.log(`Written: iatf16949-clauses.json`)

// Extract TEAMS and PEOPLE
const TEAMS = ["품질관리팀", "생산기술팀", "구매팀", "설계팀", "생산팀", "경영지원팀"]
const PEOPLE = {
  "품질관리팀": ["김철수", "이영희", "박민수", "정수진"],
  "생산기술팀": ["최동훈", "한지민", "서준호"],
  "구매팀": ["강미래", "윤성민"],
  "설계팀": ["임지호", "송현아", "조태영"],
  "생산팀": ["오승우", "배수연", "류현우", "홍길동"],
  "경영지원팀": ["신민정", "장도윤"]
}

const TEAM_ID_MAP = {
  "품질관리팀": "team-qc",
  "생산기술팀": "team-pe",
  "구매팀": "team-pu",
  "설계팀": "team-de",
  "생산팀": "team-pr",
  "경영지원팀": "team-mg"
}

const ROLE_MAP = {
  0: "팀장",
  1: "대리",
  2: "사원",
  3: "사원"
}

// Generate teams.json
const teams = TEAMS.map(name => ({
  id: TEAM_ID_MAP[name],
  name: name
}))

writeFileSync(join(seedDir, 'teams.json'), JSON.stringify(teams, null, 2), 'utf-8')
console.log(`Written: teams.json (${teams.length} teams)`)

// Generate persons.json
const persons = []
let personIdx = 1
for (const teamName of TEAMS) {
  const members = PEOPLE[teamName]
  const teamId = TEAM_ID_MAP[teamName]
  members.forEach((name, idx) => {
    persons.push({
      id: `p-${String(personIdx).padStart(3, '0')}`,
      name: name,
      teamId: teamId,
      role: ROLE_MAP[idx] || '사원',
      email: null,
      qualifications: null
    })
    personIdx++
  })
}

// Set managerId for teams (first person in each team is the manager)
let pIdx = 0
for (const team of teams) {
  const teamMembers = persons.filter(p => p.teamId === team.id)
  if (teamMembers.length > 0) {
    team.managerId = teamMembers[0].id
  }
}

// Re-write teams with managerId
writeFileSync(join(seedDir, 'teams.json'), JSON.stringify(teams, null, 2), 'utf-8')
writeFileSync(join(seedDir, 'persons.json'), JSON.stringify(persons, null, 2), 'utf-8')
console.log(`Written: persons.json (${persons.length} persons)`)

console.log('\nSeed data extraction complete!')
