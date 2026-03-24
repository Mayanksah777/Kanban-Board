const Workspace = require('../models/Workspace');

function requireWorkspaceMember(options = {}) {
  const {
    source = 'body',
    field = 'workspaceId',
    allowedRoles = null
  } = options;

  return async function workspaceMemberMiddleware(req, res, next) {
    try {
      const workspaceId = req[source]?.[field];

      if (!workspaceId) {
        return res.status(400).json({ message: `${field} is required` });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: 'Workspace not found' });
      }

      const membership = workspace.members.find((member) => member.userId.toString() === req.user.id);

      if (!membership) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ message: 'Insufficient workspace permissions' });
      }

      req.workspace = workspace;
      req.workspaceMembership = membership;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  requireWorkspaceMember
};
