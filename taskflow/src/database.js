const { existsSync, mkdirSync } = require('fs');
const path = require('path');

// Use a simple in-memory JSON database for portability
// In production, replace with PostgreSQL via Railway's DATABASE_URL
class Database {
  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.projectMembers = new Map(); // projectId -> [{userId, role}]
    
    // Seed admin user
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    
    const adminId = uuidv4();
    this.users.set(adminId, {
      id: adminId,
      name: 'Admin User',
      email: 'admin@taskflow.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    // Seed member
    const memberId = uuidv4();
    this.users.set(memberId, {
      id: memberId,
      name: 'Jane Member',
      email: 'member@taskflow.com',
      password: bcrypt.hashSync('member123', 10),
      role: 'member',
      createdAt: new Date().toISOString()
    });

    // Seed project
    const projectId = uuidv4();
    this.projects.set(projectId, {
      id: projectId,
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with modern design.',
      ownerId: adminId,
      status: 'active',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    this.projectMembers.set(projectId, [
      { userId: adminId, role: 'admin' },
      { userId: memberId, role: 'member' }
    ]);

    // Seed tasks
    const statuses = ['todo', 'in_progress', 'done'];
    const priorities = ['low', 'medium', 'high'];
    const taskNames = [
      'Design wireframes', 'Set up CI/CD', 'Write API docs',
      'UI component library', 'Database schema', 'User testing'
    ];
    taskNames.forEach((name, i) => {
      const taskId = uuidv4();
      const daysOffset = (i - 2) * 5;
      this.tasks.set(taskId, {
        id: taskId,
        projectId,
        title: name,
        description: `Complete the ${name.toLowerCase()} task for the project.`,
        assigneeId: i % 2 === 0 ? adminId : memberId,
        status: statuses[i % 3],
        priority: priorities[i % 3],
        dueDate: new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: adminId,
        createdAt: new Date().toISOString()
      });
    });

    console.log('✅ Database initialized with seed data');
    console.log('   Admin: admin@taskflow.com / admin123');
    console.log('   Member: member@taskflow.com / member123');
  }

  // User methods
  getUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }
  getUserById(id) { return this.users.get(id) || null; }
  createUser(user) { this.users.set(user.id, user); return user; }
  getAllUsers() { return Array.from(this.users.values()).map(u => ({ ...u, password: undefined })); }

  // Project methods
  getProjectById(id) { return this.projects.get(id) || null; }
  getProjectsByUser(userId) {
    const result = [];
    for (const project of this.projects.values()) {
      const members = this.projectMembers.get(project.id) || [];
      if (members.some(m => m.userId === userId) || project.ownerId === userId) {
        result.push(project);
      }
    }
    return result;
  }
  getAllProjects() { return Array.from(this.projects.values()); }
  createProject(project) { 
    this.projects.set(project.id, project);
    this.projectMembers.set(project.id, [{ userId: project.ownerId, role: 'admin' }]);
    return project;
  }
  updateProject(id, updates) {
    const project = this.projects.get(id);
    if (!project) return null;
    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }
  deleteProject(id) {
    this.projects.delete(id);
    this.projectMembers.delete(id);
    // Delete tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.projectId === id) this.tasks.delete(taskId);
    }
  }

  // Member methods
  getProjectMembers(projectId) {
    const members = this.projectMembers.get(projectId) || [];
    return members.map(m => {
      const user = this.users.get(m.userId);
      return user ? { ...m, name: user.name, email: user.email } : null;
    }).filter(Boolean);
  }
  addProjectMember(projectId, userId, role = 'member') {
    const members = this.projectMembers.get(projectId) || [];
    if (!members.some(m => m.userId === userId)) {
      members.push({ userId, role });
      this.projectMembers.set(projectId, members);
    }
  }
  removeProjectMember(projectId, userId) {
    const members = this.projectMembers.get(projectId) || [];
    this.projectMembers.set(projectId, members.filter(m => m.userId !== userId));
  }
  getUserProjectRole(projectId, userId) {
    const members = this.projectMembers.get(projectId) || [];
    const m = members.find(m => m.userId === userId);
    return m ? m.role : null;
  }

  // Task methods
  getTaskById(id) { return this.tasks.get(id) || null; }
  getTasksByProject(projectId) {
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }
  getTasksByUser(userId) {
    return Array.from(this.tasks.values()).filter(t => t.assigneeId === userId);
  }
  getAllTasks() { return Array.from(this.tasks.values()); }
  createTask(task) { this.tasks.set(task.id, task); return task; }
  updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated = { ...task, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }
  deleteTask(id) { this.tasks.delete(id); }
}

module.exports = new Database();
