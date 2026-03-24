const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Board = require('../models/Board');
const Column = require('../models/Column');
const { createAccessToken, createRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'];

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName
  };
}

function issueTokens(user) {
  const payload = {
    userId: user._id.toString(),
    email: user.email
  };

  return {
    accessToken: createAccessToken(payload),
    refreshToken: createRefreshToken(payload)
  };
}

async function createStarterDataForUser(userId, displayName) {
  const workspace = await Workspace.create({
    name: `${displayName}'s Workspace`,
    members: [{ userId, role: 'owner' }]
  });

  const board = await Board.create({
    workspaceId: workspace._id,
    title: 'My Board',
    columnOrder: []
  });

  const columns = await Column.create(
    DEFAULT_COLUMNS.map((title, index) => ({
      boardId: board._id,
      title,
      cardOrder: [],
      position: index
    }))
  );

  board.columnOrder = columns.map((column) => column._id);
  await board.save();

  return {
    workspace,
    board
  };
}

async function findPrimaryBoard(user) {
  if (!user.workspaces.length) {
    return null;
  }

  const board = await Board.findOne({ workspaceId: user.workspaces[0] });
  return board;
}

async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'email, password and displayName are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      displayName,
      workspaces: []
    });

    const { workspace, board } = await createStarterDataForUser(user._id, displayName);
    user.workspaces = [workspace._id];

    const tokens = issueTokens(user);
    user.refreshTokens = [tokens.refreshToken];
    await user.save();

    return res.status(201).json({
      user: toPublicUser(user),
      boardId: board._id.toString(),
      workspaceId: workspace._id.toString(),
      ...tokens
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = issueTokens(user);
    user.refreshTokens = [...user.refreshTokens, tokens.refreshToken].slice(-10);
    await user.save();

    const primaryBoard = await findPrimaryBoard(user);

    return res.json({
      user: toPublicUser(user),
      workspaceId: primaryBoard?.workspaceId?.toString() || null,
      boardId: primaryBoard?._id.toString() || null,
      ...tokens
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
    const tokens = issueTokens(user);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    return res.json(tokens);
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(204).send();
      }

      const user = await User.findById(payload.userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
        await user.save();
      }
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
