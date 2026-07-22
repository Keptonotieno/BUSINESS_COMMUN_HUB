import React, { useState } from 'react';
import { AuditLog } from '../types';
import { 
  ShieldAlert, 
  Activity, 
  Server, 
  Database, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  Clock,
  Terminal
} from 'lucide-react';
import { motion } from 'motion/react';

interface PlatformAdminPortalProps {
  auditLogs: AuditLog[];
}

export default function PlatformAdminPortal({ auditLogs }: PlatformAdminPortalProps) {
  const [logs, setLogs] = useState<AuditLog[]>(auditLogs);
  const [isSyncing, setIsSyncing] = useState(false);

  // Simulated metrics
  const queueRate = 184; // messages/sec
  const dlqSize = 0; // Dead Letter Queue healthy
  const activeWorkers = 12;

  const handleSyncWorkers = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      
      const newAudit: AuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userEmail: 'keptonokoth@gmail.com',
        action: 'SUPER_ADMIN_SYNC_WORKERS',
        ipAddress: '197.232.145.89',
        timestamp: new Date().toISOString()
      };
      setLogs(prev => [newAudit, ...prev]);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-rose-400 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" /> Platform SuperAdmin Audit
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global monitoring cockpit of worker queue throughput, database parameters, and container safety audits.
          </p>
        </div>

        <button
          onClick={handleSyncWorkers}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          Force-Sync Workers
        </button>
      </div>

      {/* Infrastructure Core Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Queue load throughput */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Queue Delivery Rate</span>
            <span className="text-xl font-bold text-cyan-400 font-mono">{queueRate} <span className="text-xs text-slate-400">msg/s</span></span>
            <span className="text-[10px] text-slate-400 block">All carriers streaming</span>
          </div>
          <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Dead Letter Queue size */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Dead Letter Queue</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{dlqSize} <span className="text-xs text-slate-400">errs</span></span>
            <span className="text-[10px] text-emerald-400 block flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Normal range
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Worker cluster count */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Core Daemon Threads</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">{activeWorkers} <span className="text-xs text-slate-400">pods</span></span>
            <span className="text-[10px] text-slate-400 block">K8s cluster horizontal active</span>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
        </div>

        {/* SaaS Platform Monthly Revenue collected */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Global Platform ARR</span>
            <span className="text-xl font-bold text-rose-400 font-mono">KES 1.48M</span>
            <span className="text-[10px] text-slate-400 block">Consolidated billing accounts</span>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Carrier latency and SLA health panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Carrier list details (Col 1 & 2) */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Carrier API Latencies</h3>
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">All Systems Online</span>
          </div>

          <div className="space-y-4">
            {/* Safaricom */}
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">Safaricom Enterprise SMS direct API</span>
                <span className="text-[10px] text-slate-500 font-mono">Primary East Africa Carrier integration</span>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-emerald-400 font-bold block">140ms latency</span>
                <span className="text-slate-500 block uppercase">SLA: 99.98%</span>
              </div>
            </div>

            {/* Africa's talking */}
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">Africa's Talking bulk carrier gateway</span>
                <span className="text-[10px] text-slate-500 font-mono">Secondary routing & backup failover pool</span>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-emerald-400 font-bold block">210ms latency</span>
                <span className="text-slate-500 block uppercase">SLA: 99.85%</span>
              </div>
            </div>

            {/* Meta WhatsApp */}
            <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">Meta WhatsApp Cloud Platform endpoint</span>
                <span className="text-[10px] text-slate-500 font-mono">Official business accounts API webhook ingestion</span>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-emerald-400 font-bold block">195ms latency</span>
                <span className="text-slate-500 block uppercase">SLA: 99.95%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database configurations table info (Col 3) */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform Infrastructure Specs</h3>
          
          <ul className="space-y-3.5 text-xs text-slate-400 font-mono">
            <li className="flex justify-between border-b border-slate-900 pb-2">
              <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-slate-500" /> DB Engine</span>
              <span className="text-slate-200 font-bold">PostgreSQL 16.3</span>
            </li>
            <li className="flex justify-between border-b border-slate-900 pb-2">
              <span className="flex items-center gap-1.5"><Terminal className="w-4 h-4 text-slate-500" /> Queue Engine</span>
              <span className="text-slate-200 font-bold">Redis Cluster v7.2</span>
            </li>
            <li className="flex justify-between border-b border-slate-900 pb-2">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> Auto Backups</span>
              <span className="text-slate-200 font-bold">Every 6 hrs (GCS)</span>
            </li>
            <li className="flex justify-between">
              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-slate-500" /> SSL Protocol</span>
              <span className="text-emerald-400 font-bold">TLS 1.3 Strict</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Immutable system security logs ledger */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">Immutable Corporate Security Audit Logs</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Subject Email</th>
                <th className="py-2.5 px-3">Action Completed</th>
                <th className="py-2.5 px-3">IP Address Reference</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/10">
                  <td className="py-3 px-3 font-semibold text-slate-200">{log.userEmail}</td>
                  <td className="py-3 px-3">
                    <span className="font-mono bg-slate-950 text-rose-400 border border-rose-500/5 px-2.5 py-0.5 rounded font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{log.ipAddress}</td>
                  <td className="py-3 px-3 text-right text-slate-500 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
