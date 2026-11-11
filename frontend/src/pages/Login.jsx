import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await base44.auth.login(email.trim(), password);
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.startsWith('/') ? next : '/';
    } catch (requestError) {
      setError(requestError.message || 'Sign-in failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">HR Practitioner Workbench</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Sign in to SuccessionPath</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">Create one</Link>
          </p>
        </form>

        <p className="mt-4 text-center text-[0.6875rem] text-muted-foreground">
          Forgotten your password? Ask your workspace administrator to reset it.
        </p>
      </div>
    </div>
  );
}