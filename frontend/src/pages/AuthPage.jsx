import { useState } from 'react';
import { login, register } from '../services/api';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = isLogin
        ? { email, password }
        : { email, password, displayName };

      const response = isLogin ? await login(payload) : await register(payload);

      onAuthenticated({
        user: response.user,
        boardId: response.boardId,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      });
    } catch (requestError) {
      const nextError = requestError.response?.data?.message || 'Authentication failed';
      setError(nextError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Realtime Kanban</h1>
        <p className="mt-1 text-sm text-slate-500">Collaborate on cards with live updates.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {!isLogin && (
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            disabled={submitting}
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(isLogin ? 'register' : 'login')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          {isLogin ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}