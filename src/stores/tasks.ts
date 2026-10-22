import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 进行中的长任务（播放动作、批量导出、优化文档、批量重命名）。
 *
 * 和 `feedback`（toast）分开：toast 是**瞬时结果**，任务是**有生命周期**的状态。
 * 合成一个会变成"toast 里带进度条"这种四不像。
 */
export interface TaskItem {
  id: number
  title: string
  /** 0–1；undefined 表示不确定进度（显示转圈） */
  progress?: number
  detail?: string
  cancel?: () => void
}

let seq = 0

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([])

  function begin(title: string): number {
    const id = ++seq
    tasks.value = [...tasks.value, { id, title }]
    return id
  }

  function update(id: number, patch: { progress?: number; title?: string; detail?: string }) {
    tasks.value = tasks.value.map((task) => (task.id === id ? { ...task, ...patch } : task))
  }

  function end(id: number) {
    tasks.value = tasks.value.filter((task) => task.id !== id)
  }

  function setCancel(id: number, cancel: () => void) {
    tasks.value = tasks.value.map((task) => (task.id === id ? { ...task, cancel } : task))
  }

  function cancel(id: number) {
    const task = tasks.value.find((item) => item.id === id)
    if (!task) return
    try {
      task.cancel?.()
    } finally {
      end(id)
    }
  }

  function clear() {
    tasks.value = []
  }

  return { tasks, begin, update, end, setCancel, cancel, clear }
})
