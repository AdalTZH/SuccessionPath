import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Use at least 8 characters for the password');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await base44.auth.register({ email: email.trim(), password, full_name: fullName.trim() });
      window.location.href = '/';
    } catch (requestError) {
      setError(requestError.message || 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">HR Practitioner Workbench</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={event => setFullName(event.target.value)} required />
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </form>

        <p className="mt-4 text-center text-[0.6875rem] text-muted-foreground">
          The first account created on a new installation becomes the workspace administrator.
        </p>
      </div>
    </div>
  );
}