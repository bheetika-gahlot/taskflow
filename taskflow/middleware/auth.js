const jwt = require('jsonwebtoken');
const db = require('../src/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-2024';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.getUserById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const isProjectAdmin = (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  const project = db.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  const role = db.getUserProjectRole(projectId, req.user.id);
  if (req.user.role === 'admin' || role === 'admin' || project.ownerId === req.user.id) {
    return next();
  }
  return res.status(403).json({ error: 'Project admin access required' });
};

module.exports = { authenticate, isAdmin, isProjectAdmin, JWT_SECRET };
