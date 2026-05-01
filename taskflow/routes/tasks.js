const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../src/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tasks - get all tasks visible to user
router.get('/', (req, res) => {
  const tasks = req.user.role === 'admin'
    ? db.getAllTasks()
    : db.getTasksByUser(req.user.id);
  
  // Enrich with user names
  const enriched = tasks.map(t => {
    const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : null;
    const project = db.getProjectById(t.projectId);
    return {
      ...t,
      assigneeName: assignee ? assignee.name : null,
      projectName: project ? project.name : null,
      isOverdue: t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    };
  });
  res.json(enriched);
});

// GET /api/tasks/dashboard - dashboard stats
router.get('/dashboard', (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const allTasks = isAdmin ? db.getAllTasks() : db.getTasksByUser(req.user.id);
  const projects = isAdmin ? db.getAllProjects() : db.getProjectsByUser(req.user.id);
  const users = isAdmin ? db.getAllUsers() : [];

  const now = new Date();
  const overdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done');
  const dueToday = allTasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const due = new Date(t.dueDate);
    return due.toDateString() === now.toDateString();
  });

  res.json({
    tasks: {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      done: allTasks.filter(t => t.status === 'done').length,
      overdue: overdue.length,
      dueToday: dueToday.length
    },
    projects: {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length
    },
    users: { total: users.length },
    recentTasks: allTasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(t => {
        const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : null;
        const project = db.getProjectById(t.projectId);
        return { ...t, assigneeName: assignee?.name, projectName: project?.name };
      }),
    overdueTasks: overdue.slice(0, 5).map(t => {
      const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : null;
      const project = db.getProjectById(t.projectId);
      return { ...t, assigneeName: assignee?.name, projectName: project?.name };
    })
  });
});

// POST /api/tasks - create task
router.post('/', (req, res) => {
  const { projectId, title, description, assigneeId, status, priority, dueDate } = req.body;
  if (!projectId || !title) return res.status(400).json({ error: 'projectId and title are required' });

  const project = db.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const role = db.getUserProjectRole(projectId, req.user.id);
  const hasAccess = req.user.role === 'admin' || role || project.ownerId === req.user.id;
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const task = db.createTask({
    id: uuidv4(),
    projectId,
    title: title.trim(),
    description: description?.trim() || '',
    assigneeId: assigneeId || null,
    status: status || 'todo',
    priority: priority || 'medium',
    dueDate: dueDate || null,
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  });
  res.status(201).json(task);
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const assignee = task.assigneeId ? db.getUserById(task.assigneeId) : null;
  const project = db.getProjectById(task.projectId);
  res.json({ ...task, assigneeName: assignee?.name, projectName: project?.name });
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update status of their assigned tasks
  const isAdmin = req.user.role === 'admin';
  const projectRole = db.getUserProjectRole(task.projectId, req.user.id);
  const isProjectAdmin = projectRole === 'admin';
  const isAssignee = task.assigneeId === req.user.id;

  if (!isAdmin && !isProjectAdmin && !isAssignee) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { title, description, assigneeId, status, priority, dueDate } = req.body;
  const updates = {};

  if (isAdmin || isProjectAdmin) {
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (assigneeId !== undefined) updates.assigneeId = assigneeId;
    if (priority) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
  }
  if (status) updates.status = status;

  const updated = db.updateTask(req.params.id, updates);
  res.json(updated);
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isAdmin = req.user.role === 'admin';
  const projectRole = db.getUserProjectRole(task.projectId, req.user.id);
  if (!isAdmin && projectRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.deleteTask(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
