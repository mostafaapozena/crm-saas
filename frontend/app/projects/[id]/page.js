'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '../../../lib/api'
import { Modal, Input, Select, Btn, Spinner } from '../../../components/ui'
import { fmtCurrency, fmtDate } from '../../../lib/utils'

const COLUMNS = [
  { key: 'TODO', label: 'To Do', color: 'border-slate-600' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-sky-500' },
  { key: 'IN_REVIEW', label: 'In Review', color: 'border-amber-500' },
  { key: 'DONE', label: 'Done', color: 'border-emerald-500' },
]

const PRIORITY_COLORS = {
  HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  LOW: 'bg-slate-700 text-slate-400 border-slate-600',
}

const EMPTY_TASK = { title: '', description: '', assigned_to: '', priority: 'MEDIUM', due_date: '' }

function ProgressBar({ value }) {
  const color = value >= 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-sky-500' : value >= 30 ? 'bg-amber-500' : 'bg-slate-600'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold text-white w-10">{value}%</span>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm] = useState(EMPTY_TASK)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(null)

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`)
      setProject(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    const { data } = await api.get('/team').catch(() => ({ data: [] }))
    setUsers(data)
  }

  useEffect(() => { fetchProject(); fetchUsers() }, [id])

  const openCreateTask = () => { setEditingTask(null); setForm(EMPTY_TASK); setTaskModal(true) }
  const openEditTask = (t) => {
    setEditingTask(t)
    setForm({ title: t.title, description: t.description || '', assigned_to: t.assigned_to || '', priority: t.priority, due_date: t.due_date ? t.due_date.split('T')[0] : '' })
    setTaskModal(true)
  }

  const handleSaveTask = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, project_id: id }
      if (editingTask) await api.put(`/tasks/${editingTask.id}`, payload)
      else await api.post('/tasks', payload)
      setTaskModal(false); fetchProject()
    } catch (err) { alert(err.response?.data?.error || 'Error saving task') }
    finally { setSaving(false) }
  }

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status })
      fetchProject()
    } catch (e) { console.error(e) }
  }

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try { await api.delete(`/tasks/${taskId}`); fetchProject() }
    catch (e) { console.error(e) }
  }

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, status) => {
    e.preventDefault()
    if (dragging && dragging.status !== status) {
      await updateTaskStatus(dragging.id, status)
    }
    setDragging(null)
  }

  if (loading) return (
    <div className="flex min-h-screen bg-[#0a0e1a] items-center justify-center">
      <Spinner />
    </div>
  )

  if (!project) return (
    <div className="flex min-h-screen bg-[#0a0e1a] items-center justify-center text-slate-400">
      Project not found
    </div>
  )

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = project.tasks?.filter(t => t.status === col.key) || []
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <div className="p-8">
        {/* Back */}
        <Link href="/projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
          ← Back to Projects
        </Link>

        {/* Project Header */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-white">{project.title}</h1>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/20">
                  {project.type.replace('_', ' ')}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300">
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              {project.description && <p className="text-sm text-slate-400 mb-4 max-w-2xl">{project.description}</p>}
              <div className="flex items-center gap-6 text-sm text-slate-400 flex-wrap">
                {project.client && <span>Client: <span className="text-white">{project.client.name}</span></span>}
                {project.budget && <span>Budget: <span className="text-emerald-400">{fmtCurrency(project.budget, false)}</span></span>}
                {project.start_date && <span>Start: <span className="text-white">{fmtDate(project.start_date)}</span></span>}
                {project.end_date && <span>End: <span className="text-white">{fmtDate(project.end_date)}</span></span>}
              </div>
            </div>
            <Btn onClick={openCreateTask}>+ Add Task</Btn>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Overall Progress</span>
            </div>
            <ProgressBar value={project.progress_percentage} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {COLUMNS.map(col => (
              <div key={col.key} className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">{tasksByStatus[col.key].length}</p>
                <p className="text-xs text-slate-500 mt-0.5">{col.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-4 min-h-96">
          {COLUMNS.map(col => (
            <div
              key={col.key}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.key)}
              className={`bg-[#111827] border-t-2 ${col.color} border-x border-b border-slate-800 rounded-2xl p-4 min-h-64 transition-all ${dragging ? 'border-dashed' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">{col.label}</h3>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {tasksByStatus[col.key].length}
                </span>
              </div>

              <div className="space-y-3">
                {tasksByStatus[col.key].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                    className={`bg-[#0d1424] border border-slate-700 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 transition group ${dragging?.id === task.id ? 'opacity-50' : ''}`}
                  >
                    <p className="text-sm text-white font-medium mb-2 leading-snug">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      {task.assignee && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold" title={task.assignee.name}>
                          {task.assignee.name[0]}
                        </div>
                      )}
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-slate-500 mt-2">{fmtDate(task.due_date)}</p>
                    )}
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEditTask(task)} className="text-xs text-sky-400 hover:text-sky-300">Edit</button>
                      <button onClick={() => deleteTask(task.id)} className="text-xs text-red-400 hover:text-red-300">Del</button>
                    </div>
                  </div>
                ))}

                {tasksByStatus[col.key].length === 0 && (
                  <div className="text-center py-6 text-slate-600 text-xs border border-dashed border-slate-800 rounded-xl">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title={editingTask ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSaveTask} className="space-y-4">
          <Input label="Task Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Implement API endpoints" />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              rows={2} placeholder="Task details..."
              className="w-full bg-[#1a2035] border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
            <Select label="Assign To" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </Select>
          </div>
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          <div className="flex gap-3 pt-2">
            <Btn type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setTaskModal(false)}>Cancel</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
