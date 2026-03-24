const Workspace = require('../models/Workspace');
const User = require('../models/User');
const ALLOWED_MEMBER_ROLES = ['editor', 'viewer'];

function toWorkspaceResponse(workspace, userId) {
  const membership = workspace.members.find((member) => member.userId.toString() === userId);

  return {
    id: workspace._id.toString(),
    name: workspace.name,
    role: membership?.role || null,
    memberCount: workspace.members.length,
    createdAt: workspace.createdAt
  };
}

async function createWorkspace(req, res, next) {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      members: [{ userId, role: 'owner' }]
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { workspaces: workspace._id }
    });

    return res.status(201).json({
      workspace: toWorkspaceResponse(workspace, userId)
    });
  } catch (error) {
    return next(error);
  }
}

async function getWorkspaces(req, res, next) {
  try {
    const userId = req.user.id;

    const workspaces = await Workspace.find({
      'members.userId': userId
    }).sort({ createdAt: 1 });

    return res.json({
      workspaces: workspaces.map((workspace) => toWorkspaceResponse(workspace, userId))
    });
  } catch (error) {
    return next(error);
  }
}

async function addWorkspaceMember(req, res, next) {
  try {
    const workspace = req.workspace;
    const { email, role = 'viewer' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'email is required' });
    }

    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
    if (!ALLOWED_MEMBER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ message: 'role must be editor or viewer' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found for this email' });
    }

    const existingMember = workspace.members.find(
      (member) => member.userId.toString() === user._id.toString()
    );

    if (existingMember) {
      existingMember.role = normalizedRole;
    } else {
      workspace.members.push({
        userId: user._id,
        role: normalizedRole
      });
    }

    await workspace.save();

    await User.findByIdAndUpdate(user._id, {
      $addToSet: { workspaces: workspace._id }
    });

    return res.json({
      workspace: toWorkspaceResponse(workspace, req.user.id),
      member: {
        userId: user._id.toString(),
        email: user.email,
        role: normalizedRole
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addWorkspaceMember,
  createWorkspace,
  getWorkspaces
};
