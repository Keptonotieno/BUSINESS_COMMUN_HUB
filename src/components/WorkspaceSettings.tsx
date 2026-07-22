import React, { useState } from 'react';
import { Tenant, User } from '../types';
import { 
  Building, 
  Users, 
  UserPlus, 
  Check, 
  Trash2, 
  Mail, 
  ShieldAlert, 
  Copy,
  Plus,
  Network
} from 'lucide-react';
import { motion } from 'motion/react';

interface WorkspaceSettingsProps {
  activeTenant: Tenant;
  onUpdateTenantName: (name: string) => void;
  currentUser: User;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
  department: string;
}

export default function WorkspaceSettings({
  activeTenant,
  onUpdateTenantName,
  currentUser
}: WorkspaceSettingsProps) {
  const [workspaceName, setWorkspaceName] = useState(activeTenant.name);
  const [departments, setDepartments] = useState<string[]>(['Marketing', 'Finance', 'Operations', 'IT Engineering']);
  const [newDepartment, setNewDepartment] = useState('');

  // Team Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
  const [inviteDept, setInviteDept] = useState('Marketing');
  const [generatedLink, setGeneratedLink] = useState('');

  const [members, setMembers] = useState<TeamMember[]>([
    { id: 'm-1', email: 'keptonokoth@gmail.com', name: 'Kepton Okoth', role: 'ADMIN', department: 'IT Engineering' },
    { id: 'm-2', email: 'sarah.kamau@sacco.co.ke', name: 'Sarah Kamau', role: 'MANAGER', department: 'Marketing' },
    { id: 'm-3', email: 'micheal.kamau@sacco.co.ke', name: 'Michael Kamau', role: 'MEMBER', department: 'Finance' },
  ]);

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    onUpdateTenantName(workspaceName);
    alert('Tenant workspace metadata compiled successfully!');
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    setDepartments([...departments, newDepartment]);
    setNewDepartment('');
  };

  const handleInviteTeammate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    // Generate simulated single-signon verification signup link
    const link = `https://disyo2soltqzaebhs5mhna-999159786003.run.app/invite?token=t_${Math.floor(Math.random() * 900000 + 100000)}&tenant=${activeTenant.subdomain}`;
    setGeneratedLink(link);

    // Append mock teammate to list
    const newMember: TeamMember = {
      id: `m-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      email: inviteEmail,
      name: inviteEmail.split('@')[0],
      role: inviteRole,
      department: inviteDept
    };

    setMembers([...members, newMember]);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-bold font-sans text-slate-100 tracking-tight">Workspace & Team settings</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure multi-tenant structures, map internal departments, and invite collaborative teammates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns 1 & 2: General config & Members tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata configs card */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200">SaaS Tenant Metadata</h3>
            </div>

            <form onSubmit={handleUpdateName} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-400">Company Legal Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400">Assigned Cloud Subdomain</label>
                <input
                  type="text"
                  disabled
                  value={`${activeTenant.subdomain}.sacco-portal.or.ke`}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                className="sm:col-span-2 py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
              >
                Sync Workspace Properties
              </button>
            </form>
          </div>

          {/* Members Table */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200">Teammate RBAC Permissions</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">System Access Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-850/10">
                      <td className="py-3 px-3 font-semibold text-slate-200">{m.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{m.email}</td>
                      <td className="py-3 px-3 text-slate-400">{m.department}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          m.role === 'ADMIN' 
                            ? 'bg-rose-500/10 text-rose-400' 
                            : m.role === 'MANAGER' 
                              ? 'bg-cyan-500/10 text-cyan-400' 
                              : 'bg-slate-800 text-slate-400'
                        }`}>
                          {m.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Invite forms & department managers */}
        <div className="space-y-6">
          {/* Teammate Invites */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Invite Teammate</h3>
            </div>

            <form onSubmit={handleInviteTeammate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-400">Invite Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400">Access Permissions Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 cursor-pointer"
                >
                  <option value="MEMBER">Member (Read / Template composer)</option>
                  <option value="MANAGER">Manager (Run Campaigns)</option>
                  <option value="ADMIN">Admin (Full Workspace Billing)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400">Department</label>
                <select
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg cursor-pointer transition-colors"
              >
                Issue Teammate Invite
              </button>
            </form>

            {generatedLink && (
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-lg space-y-1.5 text-[10px]">
                <span className="font-bold text-slate-300 block uppercase tracking-wide">Invite activation link</span>
                <span className="text-slate-500 block font-mono truncate">{generatedLink}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    alert('Invitation token link copied to clipboard successfully!');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold font-mono flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Invite Link
                </button>
              </div>
            )}
          </div>

          {/* Department manager card */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Network className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Department mappings</h3>
            </div>

            <ul className="space-y-1 text-xs">
              {departments.map((dept, index) => (
                <li key={index} className="flex justify-between items-center bg-slate-950/20 p-2 rounded border border-slate-900">
                  <span className="text-slate-300">{dept}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddDept} className="flex gap-2 text-xs">
              <input
                type="text"
                required
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="e.g., Human Capital"
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
              />
              <button
                type="submit"
                className="px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg font-bold cursor-pointer"
              >
                +
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
