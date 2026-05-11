export interface Team {
  id: string
  name: string
  managerId: string | null
}

export interface Person {
  id: string
  name: string
  teamId: string
  role: string | null
  email: string | null
  qualifications: string[] | null
}
