import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Users, Briefcase, LayoutGrid, Wrench, GraduationCap, ListChecks, Sparkles, Network, Route, GitBranch, FileCheck2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/people', label: 'People', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: Briefcase },
  { to: '/posting-workbench', label: 'Posting Workbench', icon: LayoutGrid },
  { to: '/succession', label: 'Succession', icon: Network },
  { to: '/pathways', label: 'Pathways & Impact', icon: Route },
  { to: '/pathway-explorer', label: 'Career Pathway Explorer', icon: GitBranch },
  { to: '/career-assistant', label: 'AI Career Assistant', icon: Sparkles },
  { to: '/skills', label: 'Skills', icon: Wrench },
  { to: '/development', label: 'Development', icon: GraduationCap },
  { to: '/actions', label: 'Actions', icon: ListChecks },
  { to: '/migration-validation', label: 'Import Validation', icon: FileCheck2 }
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
          <LayoutGrid className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">SuccessionPath</p>
          <p className="font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">Posting Workbench</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border px-4 py-3">
        <p className="font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">PoC — Shadow Mode</p>
        <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">Decision-support only. HR decides.</p>
      </div>
    </aside>
  );
}