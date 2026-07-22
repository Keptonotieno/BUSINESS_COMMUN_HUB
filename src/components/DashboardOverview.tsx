import React, { useState, useEffect } from 'react';
import { Campaign, MessageLog } from '../types';
import { 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  MessageSquare, 
  Mail, 
  ArrowUpRight, 
  Loader2, 
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardOverviewProps {
  campaigns: Campaign[];
  messageLogs: MessageLog[];
  onNavigateToCampaigns: () => void;
  onNavigateToAPI: () => void;
}

export default function DashboardOverview({
  campaigns,
  messageLogs,
  onNavigateToCampaigns,
  onNavigateToAPI
}: DashboardOverviewProps) {
  const [liveLogs, setLiveLogs] = useState<MessageLog[]>(messageLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats aggregate
  const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + c.deliveredCount, 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + c.failedCount, 0);
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  
  const activeCampaigns = campaigns.filter(c => c.status === 'PROCESSING' || c.status === 'QUEUED' || c.status === 'SCHEDULED');
  const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED');

  // Channel Breakdown
  const smsCount = campaigns.filter(c => c.channels.includes('SMS')).reduce((acc, c) => acc + c.sentCount, 0);
  const waCount = campaigns.filter(c => c.channels.includes('WHATSAPP')).reduce((acc, c) => acc + c.sentCount, 0);
  const emailCount = campaigns.filter(c => c.channels.includes('EMAIL')).reduce((acc, c) => acc + c.sentCount, 0);

  // Simulated live logs appending to show "API Platform queue throughput" activity
  useEffect(() => {
    const names = ['Michael Kamau', 'Sarah Atieno', 'John Ndege', 'Esther Mumbi', 'David Omondi', 'Peter Kiprop', 'Wanjiku Kamau', 'Amina Yusuf'];
    const providers = ['Safaricom Direct', 'AfricasTalking (Failover)', 'Meta Cloud API', 'AWS SES'];
    const channels: ('SMS' | 'WHATSAPP' | 'EMAIL')[] = ['SMS', 'WHATSAPP', 'EMAIL'];

    const interval = setInterval(() => {
      const randomChannel = channels[Math.floor(Math.random() * channels.length)];
      let recipient = '';
      let provider = providers[0];
      let cost = 1.00;
      let status: 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED' = 'DELIVERED';
      let failoverReason = undefined;

      if (randomChannel === 'SMS') {
        const phoneSuffix = Math.floor(1000000 + Math.random() * 9000000);
        recipient = `+2547${phoneSuffix}`;
        const isFailover = Math.random() > 0.75;
        if (isFailover) {
          provider = 'AfricasTalking (Failover)';
          cost = 1.50;
          failoverReason = 'Primary Safaricom Direct API Busy State 429 (Auto-Rerouted)';
        } else {
          provider = 'Safaricom Direct';
        }
      } else if (randomChannel === 'WHATSAPP') {
        const phoneSuffix = Math.floor(1000000 + Math.random() * 9000000);
        recipient = `+2547${phoneSuffix}`;
        provider = 'Meta Cloud API';
        cost = 2.50;
        status = 'READ';
      } else {
        const namePart = names[Math.floor(Math.random() * names.length)].toLowerCase().replace(' ', '.');
        recipient = `${namePart}@sacco-portal.or.ke`;
        provider = 'AWS SES';
        cost = 0.05;
        if (Math.random() > 0.92) {
          status = 'BOUNCED';
          failoverReason = 'SMTP Bounce Code 554 (Mailbox Quota Exceeded)';
        }
      }

      const newLog: MessageLog = {
        id: `mlog-live-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        recipient,
        channel: randomChannel,
        status,
        provider,
        cost,
        timestamp: new Date().toISOString(),
        failoverReason
      };

      setLiveLogs(prev => [newLog, ...prev.slice(0, 7)]);
    }, 12000); // Add a live event log tick every 12 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-100 tracking-tight">
            Workspace Operations Control
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time omnichannel delivery tracker & database performance index.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Engine
          </button>
          <button
            onClick={onNavigateToCampaigns}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition-all"
          >
            Launch Campaign <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Aggregation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dispatched */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Total Packets</span>
            <span className="text-xl font-bold text-slate-100 font-mono">
              {totalSent.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">Across all channels</span>
          </div>
          <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
            <Send className="w-5 h-5" />
          </div>
        </div>

        {/* Success SLA */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Carrier SLA Delivery</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {deliveryRate.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-400 block">Standard compliant</span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Active Schedulers */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Active Queues</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">
              {activeCampaigns.length}
            </span>
            <span className="text-[10px] text-slate-400 block">Active/Scheduled tasks</span>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Failed Delivery Block */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Defective Packets</span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              {totalFailed.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block">Failed / Bounce rate</span>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Graphs and Channel breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Main metrics visualisation card */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Omnichannel Carrier Deliveries
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Safaricom Direct Integration</span>
          </div>

          {/* Graphic Bar Chart simulation */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Bulk SMS</span>
                <span className="text-base font-bold font-mono text-slate-200 mt-1 block">{smsCount.toLocaleString()}</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">WhatsApp</span>
                <span className="text-base font-bold font-mono text-slate-200 mt-1 block">{waCount.toLocaleString()}</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '65%' }} />
                </div>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900">
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Email marketing</span>
                <span className="text-base font-bold font-mono text-slate-200 mt-1 block">{emailCount.toLocaleString()}</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </div>

            {/* Custom Visual Delivery Funnel */}
            <div className="p-4 bg-slate-950/30 rounded-xl border border-slate-900/60 space-y-3.5">
              <h4 className="text-xs font-semibold text-slate-300">Carrier Queue Success Funnel</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-mono text-[11px] mb-1 text-slate-400">
                    <span>1. Queue Ingestion Success Rate</span>
                    <span className="text-slate-200 font-semibold">100%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-md overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-md" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-mono text-[11px] mb-1 text-slate-400">
                    <span>2. Gateway Dispatch & Assembly</span>
                    <span className="text-slate-200 font-semibold">98.8%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-md overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-md" style={{ width: '98.8%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-mono text-[11px] mb-1 text-slate-400">
                    <span>3. Delivery Confirmed (Carrier Handshake)</span>
                    <span className="text-slate-200 font-semibold">{deliveryRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-md overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-md" style={{ width: `${deliveryRate}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Active Campaigns Summary */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Campaign Queue
          </h3>
          
          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {activeCampaigns.length === 0 ? (
              <div className="text-center py-8 text-slate-500 space-y-1">
                <p className="text-xs">No active pipelines currently running.</p>
                <button 
                  onClick={onNavigateToCampaigns} 
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Create and schedule campaign
                </button>
              </div>
            ) : (
              activeCampaigns.map((c) => (
                <div key={c.id} className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate leading-tight block">
                      {c.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                      c.status === 'PROCESSING' || c.status === 'QUEUED' 
                        ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' 
                        : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <span>Channels: {c.channels.join(' + ')}</span>
                  </div>
                  {(c.status === 'PROCESSING' || c.status === 'QUEUED') && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full rounded-full animate-pulse" style={{ width: `${(c.sentCount / c.totalRecipients) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Dispatched: {c.sentCount} / {c.totalRecipients}</span>
                        <span>{Math.round((c.sentCount / c.totalRecipients) * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Real-time Message Stream logs */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Developer Platform Webhook Logs
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Active streaming delivery receipts directly from external carrier callbacks.
            </p>
          </div>
          <button 
            onClick={onNavigateToAPI}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 self-start sm:self-center cursor-pointer"
          >
            Access Developer APIs <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Provider Gateway</th>
                <th className="py-2.5 px-3 text-right">Packet cost</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {liveLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/30 transition-colors">
                  <td className="py-3 px-3 font-mono font-medium text-slate-200">
                    {log.recipient}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md ${
                      log.channel === 'SMS' 
                        ? 'bg-cyan-500/10 text-cyan-400' 
                        : log.channel === 'WHATSAPP' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {log.channel === 'SMS' && <MessageSquare className="w-3 h-3" />}
                      {log.channel === 'WHATSAPP' && <span className="font-bold">WA</span>}
                      {log.channel === 'EMAIL' && <Mail className="w-3 h-3" />}
                      {log.channel}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="space-y-1">
                      <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        log.status === 'DELIVERED' || log.status === 'READ'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : log.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {log.status}
                      </span>
                      {log.failoverReason && (
                        <p className="text-[9px] text-rose-400 max-w-xs font-mono break-words leading-none">
                          {log.failoverReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    {log.provider}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-400">
                    KES {log.cost.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
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
