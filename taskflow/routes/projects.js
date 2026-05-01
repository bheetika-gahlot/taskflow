const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../src/database');
const { authenticate, isProjectAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/projects - list projects user belongs to
router.get('/', (req, res) => {
  let projects = req.user.role === 'admin'
    ? db.getAllProjects()
    : db.getProjectsByUser(req.user.id);

  projects = projects.map(p => {
    const tasks = db.getTasksByProject(p.id);
    const members = db.getProjectMembers(p.id);
    return {
      ...p,
      taskCount: tasks.length,
      completedCount: tasks.filter(t => t.status === 'done').length,
      memberCount: members.length,
      userRole: db.getUserProjectRole(p.id, req.user.id) || (p.ownerId === req.user.id ? 'admin' : 'member')
    };
  });

  res.json(projects);
});

// POST /api/projects - create project
router.post('/', (req, res) => {
  const { name, description, deadline } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const project = db.createProject({
    id: uuidv4(),
    name: name.trim(),
    description: description?.trim() || '',
    ownerId: req.user.id,
    status: 'active',
    deadline: deadline || null,
    createdAt: new Date().toISOString()
  });
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = db.getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const role = db.getUserProjectRole(req.params.id, req.user.id);
  const hasAccess = req.user.role === 'admin' || role || project.ownerId === req.user.id;
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

  const tasks = db.getTasksByProject(project.id);
  const members = db.getProjectMembers(project.id);

  res.json({
    ...project,
    tasks,
    members,
    userRole: role || (project.ownerId === req.user.id ? 'admin' : 'member'),
    stats: {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
    }
  });
});

// PUT /api/projects/:id
router.put('/:id', isProjectAdmin, (req, res) => {
  const { name, description, deadline, status } = req.body;
  const updates = {};
  if (name) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (deadline !== undefined) updates.deadline = deadline;
  if (status) updates.status = status;

  const project = db.updateProject(req.params.id, updates);
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', isProjectAdmin, (req, res) => {
  db.deleteProject(req.params.id);
  res.json({ message: 'Project deleted' });
});

// GET /api/projects/:projectId/members
router.get('/:projectId/members', (req, res) => {
  const project = db.getProjectById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(db.getProjectMembers(req.params.projectId));
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', isProjectAdmin, (req, res) => {
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.addProjectMember(req.params.projectId, userId, role || 'member');
  res.json({ message: 'Member added', members: db.getProjectMembers(req.params.projectId) });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', isProjectAdmin, (req, res) => {
  db.removeProjectMember(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
