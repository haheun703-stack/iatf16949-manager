export const IPC_CHANNELS = {
  // Clause operations
  CLAUSE_GET_TREE: 'clause:getTree',
  CLAUSE_GET_BY_ID: 'clause:getById',
  CLAUSE_SEARCH: 'clause:search',

  // Document operations
  DOCUMENT_LIST_BY_CLAUSE: 'document:listByClause',
  DOCUMENT_GET_BY_ID: 'document:getById',

  // Task operations
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_LIST: 'task:list',
  TASK_GET_BY_ID: 'task:getById',
  TASK_UPDATE_STATUS: 'task:updateStatus',
  TASK_GET_HISTORY: 'task:getHistory',

  // Team operations
  TEAM_LIST: 'team:list',
  TEAM_GET_MEMBERS: 'team:getMembers',

  // Dashboard
  DASHBOARD_STATS: 'dashboard:stats',

  // Database
  DB_STATUS: 'db:status'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
