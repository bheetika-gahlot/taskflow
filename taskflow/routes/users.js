const express = require('express');
const db = require('../src/database');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users - admin only
router.get('/', isAdmin, (req, res) => {
  res.json(db.getAllUsers());
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  res.json(safe);
});

module.exports = router;
