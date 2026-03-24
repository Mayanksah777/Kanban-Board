import AuthPage from './pages/AuthPage';
import BoardPage from './pages/BoardPage';
import WorkspacePage from './pages/WorkspacePage';
import { clearAuth, getAuth, setAuth } from './store/authStore';
import { useEffect, useState } from 'react';

export default function App() {
  const [auth, setAuthState] = useState(getAuth());

  useEffect(() => {
    const syncAuth = () => {
      setAuthState(getAuth());
    };

    window.addEventListener('kanban-auth-changed', syncAuth);
    return () => {
      window.removeEventListener('kanban-auth-changed', syncAuth);
    };
  }, []);

  function handleAuthChange(nextAuth) {
    if (!nextAuth) {
      clearAuth();
      setAuthState(null);
      return;
    }

    setAuth(nextAuth);
    setAuthState(nextAuth);
  }

  if (!auth?.accessToken) {
    return <AuthPage onAuthenticated={handleAuthChange} />;
  }

  if (!auth.boardId || !auth.workspaceId) {
    return (
      <WorkspacePage
        auth={auth}
        onAuthChange={handleAuthChange}
        onSelectBoard={({ workspaceId, boardId }) =>
          handleAuthChange({
            ...auth,
            workspaceId,
            boardId
          })
        }
      />
    );
  }

  return (
    <BoardPage
      auth={auth}
      onAuthChange={handleAuthChange}
      onSwitchWorkspace={() =>
        handleAuthChange({
          ...auth,
          workspaceId: null,
          boardId: null
        })
      }
    />
  );
}
