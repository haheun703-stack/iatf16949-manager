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

  // Bulk operations
  TASK_BULK_CREATE: 'task:bulkCreate',
  REGULATION_LIST: 'regulation:list',

  // Dashboard
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_FULL: 'dashboard:full',

  // Company Profile
  COMPANY_PROFILE_GET: 'company:profileGet',
  COMPANY_PROFILE_SAVE: 'company:profileSave',

  // Document Generation
  DOCGEN_GENERATE: 'docgen:generate',
  DOCGEN_SAVE_DIALOG: 'docgen:saveDialog',

  // APQP operations
  APQP_GET_BOARD: 'apqp:getBoard',
  APQP_UPDATE_ELEMENT: 'apqp:updateElement',

  // Database
  DB_STATUS: 'db:status'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
