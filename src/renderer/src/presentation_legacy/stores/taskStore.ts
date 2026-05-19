import { create } from 'zustand'
import type { TaskListItem, TaskHistoryItem } from '@shared/ipc-types'

interface TaskState {
  tasks: TaskListItem[]
  selectedTask: TaskListItem | null
  taskHistory: TaskHistoryItem[]
  isLoading: boolean

  loadTasks: (filters?: { clauseId?: string; teamId?: string; status?: string }) => Promise<void>
  loadTaskById: (id: string) => Promise<void>
  loadTaskHistory: (taskId: string) => Promise<void>
  createTask: (data: {
    clauseId: string; documentId?: string; assigneeId: string;
    teamId: string; priority: string; deadline: string
  }) => Promise<string>
  updateTask: (data: { id: string; [key: string]: unknown }) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>
  updateStatus: (taskId: string, newStatus: string, note?: string) => Promise<boolean>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTask: null,
  taskHistory: [],
  isLoading: false,

  loadTasks: async (filters) => {
    set({ isLoading: true })
    const data = await window.api.invoke(window.api.channels.TASK_LIST, filters ?? {})
    set({ tasks: data, isLoading: false })
  },

  loadTaskById: async (id) => {
    const data = await window.api.invoke(window.api.channels.TASK_GET_BY_ID, { id })
    set({ selectedTask: data })
  },

  loadTaskHistory: async (taskId) => {
    const data = await window.api.invoke(window.api.channels.TASK_GET_HISTORY, { taskId })
    set({ taskHistory: data })
  },

  createTask: async (data) => {
    const result = await window.api.invoke(window.api.channels.TASK_CREATE, data)
    await get().loadTasks()
    return result.id
  },

  updateTask: async (data) => {
    const result = await window.api.invoke(window.api.channels.TASK_UPDATE, data)
    if (result.success) await get().loadTasks()
    return result.success
  },

  deleteTask: async (id) => {
    const result = await window.api.invoke(window.api.channels.TASK_DELETE, { id })
    if (result.success) {
      await get().loadTasks()
      set({ selectedTask: null })
    }
    return result.success
  },

  updateStatus: async (taskId, newStatus, note) => {
    const result = await window.api.invoke(window.api.channels.TASK_UPDATE_STATUS, {
      taskId, newStatus, note
    })
    if (result.success) {
      await get().loadTasks()
      await get().loadTaskById(taskId)
      await get().loadTaskHistory(taskId)
    }
    return result.success
  }
}))
