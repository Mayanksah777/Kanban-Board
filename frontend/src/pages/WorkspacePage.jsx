import { useEffect, useMemo, useState } from 'react';
import {
  addWorkspaceMember,
  createBoard,
  createWorkspace,
  getBoards,
  getWorkspaces,
  logout
} from '../services/api';

export default function WorkspacePage({ auth, onSelectBoard, onAuthChange }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(auth.workspaceId || '');
  const [loading, setLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [workspaces, selectedWorkspaceId]
  );

  useEffect(() => {
    let ignore = false;

    async function loadWorkspaces() {
      setLoading(true);
      setError('');

      try {
        const response = await getWorkspaces();
        if (ignore) {
          return;
        }

        const nextWorkspaces = response.workspaces || [];
        setWorkspaces(nextWorkspaces);

        if (!selectedWorkspaceId && nextWorkspaces.length > 0) {
          setSelectedWorkspaceId(nextWorkspaces[0].id);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.response?.data?.message || 'Failed to load workspaces');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadWorkspaces();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadBoards() {
      if (!selectedWorkspaceId) {
        setBoards([]);
        return;
      }

      setBoardsLoading(true);
      try {
        const response = await getBoards(selectedWorkspaceId);
        if (!ignore) {
          setBoards(response.boards || []);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.response?.data?.message || 'Failed to load boards');
        }
      } finally {
        if (!ignore) {
          setBoardsLoading(false);
        }
      }
    }

    loadBoards();

    return () => {
      ignore = true;
    };
  }, [selectedWorkspaceId]);

  async function handleCreateWorkspace() {
    const name = window.prompt('Workspace name');
    if (!name || !name.trim()) {
      return;
    }

    try {
      const response = await createWorkspace({ name: name.trim() });
      const created = response.workspace;
      setWorkspaces((previous) => [...previous, created]);
      setSelectedWorkspaceId(created.id);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create workspace');
    }
  }

  async function handleCreateBoard() {
    if (!selectedWorkspaceId) {
      return;
    }

    const title = window.prompt('Board title');
    if (!title || !title.trim()) {
      return;
    }

    try {
      const response = await createBoard({
        workspaceId: selectedWorkspaceId,
        title: title.trim()
      });

      setBoards((previous) => [...previous, response.board]);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create board');
    }
  }

  async function handleAddMember() {
    if (!selectedWorkspaceId || !selectedWorkspace) {
      return;
    }

    if (selectedWorkspace.role !== 'owner') {
      setError('Only workspace owner can add members');
      return;
    }

    const email = window.prompt('Member email');
    if (!email || !email.trim()) {
      return;
    }

    const roleInput = window.prompt('Role: editor or viewer', 'viewer');
    const normalizedRole = roleInput && roleInput.toLowerCase() === 'editor' ? 'editor' : 'viewer';

    try {
      const response = await addWorkspaceMember(selectedWorkspaceId, {
        email: email.trim(),
        role: normalizedRole
      });

      setWorkspaces((previous) =>
        previous.map((workspace) =>
          workspace.id === response.workspace.id ? response.workspace : workspace
        )
      );
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to add member');
    }
  }

  async function handleLogout() {
    try {
      if (auth.refreshToken) {
        await logout({ refreshToken: auth.refreshToken });
      }
    } catch (error) {
      // Ignore logout error to avoid blocking local sign-out.
    }

    onAuthChange(null);
  }

  if (loading) {
    return <main className="p-6 text-sm text-slate-600">Loading workspaces...</main>;
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Choose Workspace</h1>
          <p className="text-sm text-slate-500">Select a workspace, then pick a board.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          Logout
        </button>
      </header>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Workspaces</h2>
            <button
              type="button"
              onClick={handleCreateWorkspace}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white"
            >
              + New
            </button>
          </div>

          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setSelectedWorkspaceId(workspace.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedWorkspaceId === workspace.id
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <p className="font-medium">{workspace.name}</p>
                <p className="mt-1 text-xs text-slate-500">{workspace.role}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Boards</h2>
              <p className="text-xs text-slate-500">{selectedWorkspace?.name || 'No workspace selected'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedWorkspaceId}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                + Member
              </button>
              <button
                type="button"
                onClick={handleCreateBoard}
                disabled={!selectedWorkspaceId}
                className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                + New Board
              </button>
            </div>
          </div>

          {boardsLoading ? (
            <p className="text-sm text-slate-500">Loading boards...</p>
          ) : (
            <div className="space-y-2">
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() =>
                    onSelectBoard({
                      workspaceId: selectedWorkspaceId,
                      boardId: board.id
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                >
                  {board.title}
                </button>
              ))}
              {!boards.length && <p className="text-sm text-slate-500">No boards yet. Create one.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
