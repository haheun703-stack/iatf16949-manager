import { useEffect, useState } from 'react'
import { Users, User, ChevronDown, ChevronRight } from 'lucide-react'
import { useTaskStore } from '../../stores/taskStore'
import { StatusBadge } from '../shared/StatusBadge'
import type { TeamSummary, PersonSummary, TaskListItem } from '@shared/ipc-types'

interface TeamData {
  team: TeamSummary
  members: PersonSummary[]
  tasks: TaskListItem[]
}

export function TeamView(): JSX.Element {
  const { loadTasks } = useTaskStore()
  const [teamDataList, setTeamDataList] = useState<TeamData[]>([])
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load(): Promise<void> {
      setIsLoading(true)
      const teams = await window.api.invoke(window.api.channels.TEAM_LIST) as TeamSummary[]
      const allTasks = await window.api.invoke(window.api.channels.TASK_LIST, {}) as TaskListItem[]

      const result: TeamData[] = []
      for (const team of teams) {
        const members = await window.api.invoke(window.api.channels.TEAM_GET_MEMBERS, { teamId: team.id }) as PersonSummary[]
        const tasks = allTasks.filter((t) => t.teamId === team.id)
        result.push({ team, members, tasks })
      }
      setTeamDataList(result)
      setIsLoading(false)
    }
    load()
  }, [loadTasks])

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">팀별 현황</h2>
        <div className="text-muted-foreground text-center py-20">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">팀별 현황</h2>
      <div className="space-y-3">
        {teamDataList.map(({ team, members, tasks }) => {
          const isExpanded = expandedTeam === team.id
          const done = tasks.filter((t) => t.status === 'done').length
          const inProgress = tasks.filter((t) => t.status === 'do').length
          const overdue = tasks.filter((t) => {
            if (!t.deadline || t.status === 'done') return false
            return t.deadline < new Date().toISOString().split('T')[0]
          }).length

          return (
            <div key={team.id} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Team header */}
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{team.name}</span>
                  <span className="text-[11px] text-muted-foreground">({members.length}명)</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-muted-foreground">업무 {tasks.length}</span>
                  {done > 0 && <span className="text-green-400">완료 {done}</span>}
                  {inProgress > 0 && <span className="text-yellow-400">진행 {inProgress}</span>}
                  {overdue > 0 && <span className="text-red-400">지연 {overdue}</span>}
                  {tasks.length > 0 && (
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${tasks.length > 0 ? (done / tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border p-4">
                  {/* Members */}
                  <h4 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> 팀원
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {members.map((m) => {
                      const memberTasks = tasks.filter((t) => t.assigneeId === m.id)
                      const memberDone = memberTasks.filter((t) => t.status === 'done').length
                      return (
                        <div key={m.id} className="flex items-center gap-2 bg-muted/30 rounded px-2.5 py-1.5">
                          <span className="text-[12px]">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.role}</span>
                          {memberTasks.length > 0 && (
                            <span className="text-[10px] text-primary">
                              {memberDone}/{memberTasks.length}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Team tasks */}
                  {tasks.length > 0 ? (
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="text-left p-2">조항</th>
                          <th className="text-left p-2">담당자</th>
                          <th className="text-left p-2">상태</th>
                          <th className="text-left p-2">마감일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t) => {
                          const isTaskOverdue = t.deadline && t.status !== 'done' && t.deadline < new Date().toISOString().split('T')[0]
                          return (
                            <tr key={t.id} className="border-b border-border/30 hover:bg-muted/10">
                              <td className="p-2">
                                <span className="text-primary font-mono text-[10px]">{t.clauseId}</span>
                                <span className="ml-1 text-muted-foreground">{t.clauseTitle}</span>
                              </td>
                              <td className="p-2">{t.assignee}</td>
                              <td className="p-2"><StatusBadge status={t.status} /></td>
                              <td className={`p-2 ${isTaskOverdue ? 'text-red-400' : 'text-muted-foreground'}`}>
                                {t.deadline || '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">이 팀에 배정된 업무가 없습니다.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
