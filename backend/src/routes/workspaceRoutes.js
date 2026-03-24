const express = require('express');
const {
  addWorkspaceMember,
  createWorkspace,
  getWorkspaces
} = require('../controllers/workspaceController');
const { requireWorkspaceMember } = require('../middlewares/workspaceAuthMiddleware');

const router = express.Router();

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.post(
  '/:workspaceId/members',
  requireWorkspaceMember({ source: 'params', field: 'workspaceId', allowedRoles: ['owner'] }),
  addWorkspaceMember
);

module.exports = router;
