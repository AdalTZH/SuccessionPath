import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionLabel } from '@/components/badges';

// Generic key-in dialog. The caller decides what the collected values mean and records the audit.
export default function EditFieldsDialog({ open, onOpenChange, title, description, fields = [], values = {}, saveLabel = 'Save review', onSave }) {
  const [form, setForm] = useState({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ ...values });
      setNote('');
      setError(null);
    }
  }, [open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(form, note);
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || 'Could not save — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[34rem] rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
          {fields.map(f => (
            <div key={f.key}>
              <SectionLabel>{f.label}</SectionLabel>
              {f.type === 'textarea' ? (
                <Textarea
                  value={form[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  rows={f.rows || 3}
                  placeholder={f.placeholder}
                  className="mt-1 rounded-sm text-sm"
                />
              ) : f.type === 'select' ? (
                <Select value={form[f.key] ? String(form[f.key]) : undefined} onValueChange={v => set(f.key, v)}>
                  <SelectTrigger className="mt-1 h-9 rounded-sm text-sm">
                    <SelectValue placeholder={f.placeholder || 'Not recorded'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={form[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="mt-1 h-9 rounded-sm text-sm"
                />
              )}
              {f.help && <p className="mt-1 text-[0.625rem] text-muted-foreground">{f.help}</p>}
            </div>
          ))}

          <div>
            <SectionLabel>HR note (kept in the audit trail)</SectionLabel>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="What was verified or rectified, and on what basis…"
              className="mt-1 rounded-sm text-sm"
            />
          </div>

          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="rounded-sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button size="sm" className="rounded-sm" onClick={submit} disabled={saving}>{saving ? 'Saving…' : saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}