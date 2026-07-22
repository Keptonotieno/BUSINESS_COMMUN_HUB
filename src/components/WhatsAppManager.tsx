import React, { useState, useEffect } from 'react';
import { Contact, ContactList, Campaign, WhatsAppMessage, WhatsAppConfig, WhatsAppTemplate, Tenant } from '../types';
import { 
  MessageSquare, 
  Send, 
  CheckCheck, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  Play, 
  Pause, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File, 
  Shield, 
  Webhook, 
  Sparkles, 
  Users, 
  Layers, 
  Smartphone,
  Info,
  CheckCircle2,
  XCircle,
  Code,
  Key,
  Plus,
  Terminal,
  Trash2,
  Copy,
  Check,
  Activity,
  ShieldCheck,
  HelpCircle,
  Wrench
} from 'lucide-react';

interface WhatsAppManagerProps {
  contacts: Contact[];
  contactLists: ContactList[];
  campaigns: Campaign[];
  activeTenant: Tenant;
  onRefreshData?: () => void;
}

export default function WhatsAppManager({
  contacts,
  contactLists,
  campaigns,
  activeTenant,
  onRefreshData
}: WhatsAppManagerProps) {
  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'tester' | 'logs' | 'campaigns' | 'templates' | 'webhooks' | 'credentials' | 'api-history'>('analytics');

  // Real-time API States
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // API Call History Log States
  const [apiCallLogs, setApiCallLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Access Token & Credentials update states
  const [tokenInput, setTokenInput] = useState<string>('');
  const [phoneIdInput, setPhoneIdInput] = useState<string>('1230640223463343');
  const [wabaIdInput, setWabaIdInput] = useState<string>('859822810314953');
  const [appIdInput, setAppIdInput] = useState<string>('1230640223463343');
  const [appSecretInput, setAppSecretInput] = useState<string>('a1b2c3d4e5f678901234567890abcdef');
  const [verifyTokenInput, setVerifyTokenInput] = useState<string>('safaricom_sacco_meta_verify_token_2026');
  const [updatingCreds, setUpdatingCreds] = useState<boolean>(false);
  const [credsStatusMsg, setCredsStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Tester Form state
  const [testTo, setTestTo] = useState<string>('+254711223344');
  const [testMessageType, setTestMessageType] = useState<'text' | 'template' | 'media'>('template');
  const [testMessage, setTestMessage] = useState<string>('Hello! This is a test message from Safaricom Sacco Meta Cloud API.');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'document' | 'video' | 'audio'>('image');
  const [mediaUrl, setMediaUrl] = useState<string>('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [templateApiError, setTemplateApiError] = useState<string | null>(null);

  // Customer 24h Window Check state
  const [windowInfo, setWindowInfo] = useState<any>(null);
  const [checkingWindow, setCheckingWindow] = useState<boolean>(false);

  // Template Modal state
  const [showNewTemplateModal, setShowNewTemplateModal] = useState<boolean>(false);

  // Diagnostic Check states
  const [diagnosticLoading, setDiagnosticLoading] = useState<boolean>(false);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const runDiagnosticCheck = async () => {
    setDiagnosticLoading(true);
    setShowDiagnosticModal(true);
    setCopiedReport(false);
    try {
      const res = await fetch('/api/whatsapp/diagnostic');
      const data = await res.json();
      setDiagnosticData(data);
    } catch (err: any) {
      setDiagnosticData({
        timestamp: new Date().toISOString(),
        overallStatus: 'CRITICAL_ERROR',
        error: err.message || 'Failed to communicate with WhatsApp API diagnostic endpoint'
      });
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Fetch 24-hour customer window status when test recipient phone number changes
  const checkWindowStatus = async (phone: string) => {
    if (!phone || phone.length < 8) return;
    setCheckingWindow(true);
    try {
      const res = await fetch(`/api/whatsapp/window-check?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setWindowInfo(data);
    } catch (err) {
      console.error('Error checking customer window:', err);
    } finally {
      setCheckingWindow(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      checkWindowStatus(testTo);
    }, 400);
    return () => clearTimeout(timeout);
  }, [testTo]);

  // Fetch data on mount
  const fetchWhatsAppAll = async () => {
    setLoading(true);
    try {
      const [configRes, tmplRes, msgsRes, analyticsRes, apiLogsRes] = await Promise.all([
        fetch('/api/whatsapp/config').then(r => r.json()),
        fetch('/api/whatsapp/templates').then(r => r.json()),
        fetch('/api/whatsapp/messages').then(r => r.json()),
        fetch('/api/whatsapp/analytics').then(r => r.json()),
        fetch('/api/whatsapp/api-logs').then(r => r.json())
      ]);

      if (configRes) {
        setConfig(configRes);
        if (configRes.phoneNumberId) setPhoneIdInput(configRes.phoneNumberId);
        if (configRes.businessAccountId) setWabaIdInput(configRes.businessAccountId);
        if (configRes.appId) setAppIdInput(configRes.appId);
      }
      if (tmplRes) {
        if (tmplRes.error) {
          setTemplateApiError(tmplRes.error);
        } else {
          setTemplateApiError(null);
        }
        if (tmplRes.templates) {
          const liveActive = Array.isArray(tmplRes.templates) ? tmplRes.templates : [];
          console.log(`[Frontend Meta Template Verification]: Received ${liveActive.length} ACTIVE template(s) directly from Meta Cloud API:`, liveActive);
          setTemplates(liveActive);
          if (liveActive.length > 0) {
            setSelectedTemplate(prev => {
              if (!prev || !liveActive.some((t: any) => t.name === prev)) {
                return liveActive[0].name;
              }
              return prev;
            });
          } else {
            setSelectedTemplate('');
          }
        } else {
          setTemplates([]);
          setSelectedTemplate('');
        }
      }

      if (msgsRes?.messages) setMessages(msgsRes.messages);
      if (analyticsRes) setAnalytics(analyticsRes);
      if (apiLogsRes?.logs) setApiCallLogs(apiLogsRes.logs);
    } catch (err) {
      console.error('Error fetching WhatsApp data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearApiLogs = async () => {
    try {
      await fetch('/api/whatsapp/api-logs', { method: 'DELETE' });
      setApiCallLogs([]);
      setSelectedLog(null);
    } catch (err) {
      console.error('Error clearing API logs:', err);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    fetchWhatsAppAll();
    const interval = setInterval(fetchWhatsAppAll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Update Access Token & Meta Credentials
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingCreds(true);
    setCredsStatusMsg(null);

    try {
      const payload: any = {};
      if (tokenInput.trim()) payload.accessToken = tokenInput.trim();
      if (phoneIdInput.trim()) payload.phoneNumberId = phoneIdInput.trim();
      if (wabaIdInput.trim()) payload.businessAccountId = wabaIdInput.trim();
      if (appIdInput.trim()) payload.appId = appIdInput.trim();
      if (appSecretInput.trim()) payload.appSecret = appSecretInput.trim();
      if (verifyTokenInput.trim()) payload.verifyToken = verifyTokenInput.trim();

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCredsStatusMsg({ type: 'success', msg: 'Meta WhatsApp Access Token & credentials updated successfully in runtime process memory!' });
        setTokenInput('');
        fetchWhatsAppAll();
      } else {
        setCredsStatusMsg({ type: 'error', msg: data.error || 'Failed to update credentials' });
      }
    } catch (err: any) {
      setCredsStatusMsg({ type: 'error', msg: err.message || 'Error sending request to server' });
    } finally {
      setUpdatingCreds(false);
    }
  };

  // Handle Send Test Message
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    setTestResponse(null);

    try {
      const payload: any = { to: testTo };

      if (testMessageType === 'text') {
        payload.message = testMessage;
      } else if (testMessageType === 'template') {
        payload.templateName = selectedTemplate;
        payload.message = testMessage;
      } else if (testMessageType === 'media') {
        payload.mediaType = mediaType;
        payload.mediaUrl = mediaUrl;
        payload.message = testMessage;
      }

      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setTestResponse(data);
      fetchWhatsAppAll();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setTestResponse({ error: err.message || 'Failed to dispatch test WhatsApp message' });
    } finally {
      setTestSending(false);
    }
  };

  // Filtered Messages
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.messageContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.templateName && msg.templateName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || msg.status === statusFilter;
    const matchesDir = directionFilter === 'ALL' || msg.direction === directionFilter;

    return matchesSearch && matchesStatus && matchesDir;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-6 text-slate-100 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <MessageSquare className="w-48 h-48 text-emerald-400" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 font-bold shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  Meta WhatsApp Business Platform
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Official Cloud API v19.0
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Direct integration with Meta Graph API, Webhooks, Queue Processing, and Contact Audience Filtering.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-slate-300">
                <span className="text-slate-500">PHONE_ID:</span>
                <span className="text-emerald-400 font-bold">{config?.phoneNumberId || '1230640223463343'}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-slate-300">
                <span className="text-slate-500">WABA_ID:</span>
                <span className="text-cyan-400 font-bold">{config?.businessAccountId || '859822810314953'}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <button
              onClick={runDiagnosticCheck}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
              title="Ping Meta Cloud API & diagnose connectivity and token status"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Diagnostic Check
            </button>
            <button 
              onClick={fetchWhatsAppAll}
              className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Refresh Engine State"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800/80 pt-4 overflow-x-auto">
          {[
            { id: 'analytics', label: 'Analytics & Overview', icon: Sparkles },
            { id: 'tester', label: 'Send Test WhatsApp', icon: Send },
            { id: 'logs', label: 'Message Logs & Inbox', icon: MessageSquare },
            { id: 'campaigns', label: 'WhatsApp Campaigns', icon: Users },
            { id: 'templates', label: 'Approved Templates', icon: FileText },
            { id: 'webhooks', label: 'Webhooks & HMAC Security', icon: Webhook },
            { id: 'credentials', label: 'Access Token & Credentials', icon: Key },
            { id: 'api-history', label: 'API Call History', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: ANALYTICS & OVERVIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Real-Time Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-400">Total Dispatched</span>
              <div className="text-2xl font-bold text-slate-100">{analytics?.totalMessages ?? 0}</div>
              <p className="text-[10px] text-slate-500">All outbound & inbound</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-emerald-400">Delivered & Read</span>
              <div className="text-2xl font-bold text-emerald-400">
                {(analytics?.delivered ?? 0) + (analytics?.read ?? 0)}
              </div>
              <p className="text-[10px] text-emerald-500/80">Confirmed by Meta API</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-cyan-400">Read Rate</span>
              <div className="text-2xl font-bold text-cyan-400">{analytics?.readRate ?? 0}%</div>
              <p className="text-[10px] text-slate-500">{analytics?.read ?? 0} confirmed read</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-indigo-400">Success SLA Rate</span>
              <div className="text-2xl font-bold text-indigo-400">{analytics?.successRate ?? 100}%</div>
              <p className="text-[10px] text-slate-500">Meta SLA benchmark</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-amber-400">Queued in Engine</span>
              <div className="text-2xl font-bold text-amber-400">{analytics?.queued ?? 0}</div>
              <p className="text-[10px] text-slate-500">Batch rate-limit queue</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-rose-400">Failed / Bounced</span>
              <div className="text-2xl font-bold text-rose-400">{analytics?.failed ?? 0}</div>
              <p className="text-[10px] text-slate-500">Unreachable or invalid</p>
            </div>
          </div>

          {/* Active Campaigns Progress Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              WhatsApp Campaigns Progress Tracking
            </h3>

            {campaigns.filter(c => c.channels.includes('WHATSAPP')).length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No WhatsApp campaigns created yet.</p>
            ) : (
              <div className="space-y-3">
                {campaigns.filter(c => c.channels.includes('WHATSAPP')).map(camp => {
                  const percent = camp.totalRecipients > 0 ? Math.round(((camp.processedCount || 0) / camp.totalRecipients) * 100) : 0;
                  return (
                    <div key={camp.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{camp.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            camp.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            camp.status === 'PROCESSING' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {camp.status}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">{camp.processedCount || 0} / {camp.totalRecipients} ({percent}%)</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Delivered: <strong className="text-slate-200">{camp.deliveredCount}</strong></span>
                        <span>Read: <strong className="text-cyan-400">{camp.readCount}</strong></span>
                        <span>Failed: <strong className="text-rose-400">{camp.failedCount}</strong></span>
                        <span>Estimated Cost: <strong className="text-slate-200">KES {camp.cost.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SEND TEST WHATSAPP MESSAGE */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Dispatch Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Send Test WhatsApp Message
              </h3>
              <span className="text-[11px] text-emerald-400 font-mono">Meta Cloud API Tester</span>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Recipient WhatsApp Phone Number
                  </label>
                  {windowInfo && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      windowInfo.isInsideWindow
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${windowInfo.isInsideWindow ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                      {windowInfo.isInsideWindow
                        ? `24h Window: OPEN (${windowInfo.hoursRemaining}h remaining)`
                        : `24h Window: CLOSED (Template Required)`}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={testTo}
                  onChange={e => setTestTo(e.target.value)}
                  placeholder="e.g. +254711223344 or 0758053000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                {windowInfo && !windowInfo.isInsideWindow && testMessageType === 'text' && (
                  <p className="text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/50 p-2 rounded-lg mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    Recipient is outside 24h customer window. Meta policy requires an approved template; sending free-form text will auto-apply an approved template.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Payload Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'template', label: 'Approved Template', icon: FileText },
                    { id: 'text', label: 'Free-form Text', icon: MessageSquare },
                    { id: 'media', label: 'Media Attachment', icon: ImageIcon },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTestMessageType(t.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          testMessageType === t.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {testMessageType === 'template' && (() => {
                const activeSelectableTemplates = templates.filter(tmpl => {
                  const statusUpper = String(tmpl.status || 'APPROVED').toUpperCase();
                  return statusUpper === 'APPROVED' || statusUpper === 'ACTIVE';
                });
                const unapprovedTemplates = templates.filter(tmpl => {
                  const statusUpper = String(tmpl.status || 'APPROVED').toUpperCase();
                  return statusUpper !== 'APPROVED' && statusUpper !== 'ACTIVE';
                });

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-300">
                        Select Approved / Active Meta Template
                      </label>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        {activeSelectableTemplates.length} Active Available
                      </span>
                    </div>

                    {templates.length > 0 ? (
                      <select
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        {templates.map(tmpl => (
                          <option key={tmpl.id || tmpl.name} value={tmpl.name}>
                            {tmpl.name} (ACTIVE • {tmpl.category || 'UTILITY'} • {typeof tmpl.language === 'string' ? tmpl.language : (tmpl.language?.code || 'en_US')})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-1 font-sans">
                        <div className="font-bold flex items-center gap-1.5 text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          No Active Meta WhatsApp Templates Available
                        </div>
                        <p className="text-[11px] text-amber-200/80 leading-relaxed">
                          No active templates were returned from your connected Meta WhatsApp Business Account. Meta Cloud API requires templates with an ACTIVE status before sending messages outside the 24-hour window.
                        </p>
                      </div>
                    )}

                    {unapprovedTemplates.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-900/40 text-[11px] text-red-300 space-y-1">
                        <span className="font-bold flex items-center gap-1.5 text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          Rejected / Non-Active Templates Excluded ({unapprovedTemplates.length}):
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400 font-mono">
                          {unapprovedTemplates.map(t => (
                            <li key={t.id || t.name}>
                              <code className="text-red-300">{t.name}</code> — Status: <strong className="text-amber-400">{t.status || 'IN_REVIEW'}</strong> (Cannot send until APPROVED)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {testMessageType === 'media' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Media Type
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['image', 'document', 'video', 'audio'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMediaType(m)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                            mediaType === m ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Public Media Asset URL
                    </label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      placeholder="https://example.com/asset.jpg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Text / Caption
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Enter message body or caption..."
                />
              </div>

              <button
                type="submit"
                disabled={testSending}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Dispatching via Meta Cloud API...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch Test WhatsApp Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Test Response Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Meta API Raw JSON Response Inspector
                </h3>
                {testResponse && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    testResponse.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {testResponse.success ? '200 OK' : 'ERROR'}
                  </span>
                )}
              </div>

              {testResponse ? (
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[400px]">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <Smartphone className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                  <p className="text-xs">Dispatch a test message to inspect real-time Meta API response details.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Rate & SLA Info:</span>
              <p>Meta WhatsApp Business Cloud API dispatches incur ~KES 2.50 per utility conversation. Dispatches update recipient device status via Webhook in real time.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MESSAGE LOGS & INBOX */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              WhatsApp Message Logs & Inbox ({filteredMessages.length})
            </h3>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search recipient or content..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="QUEUED">Queued</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="READ">Read</option>
                <option value="FAILED">Failed</option>
              </select>

              <select
                value={directionFilter}
                onChange={e => setDirectionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Directions</option>
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Message Content</th>
                  <th className="px-4 py-3">Template / Media</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No WhatsApp messages found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map(msg => (
                    <tr key={msg.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          msg.direction === 'INBOUND' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {msg.direction || 'OUTBOUND'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-slate-200">
                        {msg.recipient}
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate text-slate-200">
                        {msg.messageContent}
                      </td>

                      <td className="px-4 py-3 text-slate-400">
                        {msg.templateName ? (
                          <span className="font-mono text-cyan-400">{msg.templateName}</span>
                        ) : msg.mediaType ? (
                          <span className="font-mono text-amber-400">[{msg.mediaType}]</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          msg.status === 'READ' ? 'bg-cyan-500/20 text-cyan-300' :
                          msg.status === 'DELIVERED' ? 'bg-emerald-500/20 text-emerald-400' :
                          msg.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {msg.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {new Date(msg.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CAMPAIGNS & AUDIENCE SELECTOR */}
      {activeTab === 'campaigns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            WhatsApp Target Audience List & Contact Groups
          </h3>

          <p className="text-xs text-slate-400">
            Recipients are automatically sourced from your Contact Groups, Audience Lists, and Segments. No manual phone number typing is required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {contactLists.map(list => (
              <div key={list.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">{list.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    {list.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{list.description || 'Target contact list group.'}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                  <span>Contacts: <strong className="text-slate-300">{list.contactCount}</strong></span>
                  <span className="text-emerald-400 font-semibold">Ready for WhatsApp</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: APPROVED TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Live Active Meta WhatsApp Message Templates
              </h3>
              <p className="text-xs text-slate-400">Fetched dynamically from Meta WhatsApp Cloud API for connected WABA Account ({config?.businessAccountId || '859822810314953'}).</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={runDiagnosticCheck}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                title="Run connectivity diagnostic check to troubleshoot template syncing"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Diagnostic Check
              </button>
              <button
                onClick={() => fetchWhatsAppAll()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                Fetch Live Meta Templates
              </button>
              <button
                onClick={() => setShowNewTemplateModal(true)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/10 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Template Info
              </button>
            </div>
          </div>

          {templateApiError && (
            <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-2 text-rose-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-2 text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Meta Graph API Connection Alert
                </span>
                <button
                  onClick={() => setActiveTab('settings' as any)}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg font-bold text-rose-200 transition-colors"
                >
                  Configure Credentials
                </button>
              </div>
              <p className="leading-relaxed text-rose-300/90">{templateApiError}</p>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <FileText className="w-8 h-8 text-amber-400 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-slate-200">No Active Meta WhatsApp Templates Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                No active templates were returned from your connected Meta WhatsApp Business Account. All templates must be submitted and approved in Meta WhatsApp Business Manager before they appear here with an ACTIVE status.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(tmpl => (
                <div key={tmpl.id || tmpl.name} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">{tmpl.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-mono">
                        {typeof tmpl.language === 'string' ? tmpl.language : (tmpl.language?.code || 'en_US')}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      {tmpl.category || 'UTILITY'} • ACTIVE
                    </span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300 font-sans leading-relaxed">
                    {tmpl.components?.[0]?.text || tmpl.components?.find((c: any) => c.type === 'BODY')?.text || 'Standard Meta approved message body returned from Meta Cloud API.'}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Source: Live Meta Graph API</span>
                    <span className="text-emerald-400/80 font-mono">Meta Verified</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Approved Template Information Modal */}
          {showNewTemplateModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Creating & Approving Meta WhatsApp Templates
                  </h3>
                  <button
                    onClick={() => setShowNewTemplateModal(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer font-bold px-2 py-1 bg-slate-800 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <p>
                    According to Meta messaging policies, all official WhatsApp templates must be created and reviewed in the Meta WhatsApp Business Manager console.
                  </p>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="font-bold text-emerald-400">Steps to add a new template:</div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Log into Meta Business Suite & navigate to WhatsApp Manager.</li>
                      <li>Go to <strong>Account Tools</strong> &rarr; <strong>Message Templates</strong>.</li>
                      <li>Click <strong>Create Template</strong>, select category (UTILITY/MARKETING), and submit for Meta review.</li>
                      <li>Once status changes to <strong>ACTIVE</strong> in Meta, return here and click <strong>Fetch Live Meta Templates</strong>.</li>
                    </ol>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowNewTemplateModal(false);
                      fetchWhatsAppAll();
                    }}
                    className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Got It & Refresh Templates
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: WEBHOOKS & SECURITY */}
      {activeTab === 'webhooks' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Webhook className="w-4 h-4 text-cyan-400" />
              Webhook Verification & Real-time HMAC Security
            </h3>
            <p className="text-xs text-slate-400">
              Configure your Meta Developer App Webhook callback endpoint to receive delivery reports, read receipts, and incoming customer messages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-400 block">Webhook Callback URL</span>
              <code className="text-xs font-mono text-cyan-300 bg-slate-900 p-2 rounded-lg block border border-slate-800">
                {window.location.origin}/webhooks/whatsapp
              </code>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-slate-400 block">Verify Token (META_VERIFY_TOKEN)</span>
              <code className="text-xs font-mono text-emerald-400 bg-slate-900 p-2 rounded-lg block border border-slate-800">
                safaricom_sacco_meta_verify_token_2026
              </code>
            </div>
          </div>

          <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 space-y-1">
            <span className="font-bold block flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              HMAC SHA-256 Signature Verification Active
            </span>
            <p>Every incoming webhook POST request is validated against your <code className="text-cyan-300 font-mono">META_APP_SECRET</code> using HMAC SHA-256 to ensure authenticity and prevent tampering.</p>
          </div>
        </div>
      )}

      {/* TAB 7: ACCESS TOKEN & API CREDENTIALS */}
      {activeTab === 'credentials' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              Update Meta WhatsApp Access Token & API Credentials
            </h3>
            <p className="text-xs text-slate-400">
              When Meta generates a new access token or system user token from Meta App Dashboard, paste it here to update the runtime engine immediately without restarting the server.
            </p>
          </div>

          {/* Status Message */}
          {credsStatusMsg && (
            <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
              credsStatusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {credsStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{credsStatusMsg.msg}</span>
            </div>
          )}

          {/* Current Status Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-300 block">Current API Status & Token Preview</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-semibold">Token Configured</span>
                <span className={`font-bold ${config?.accessTokenSet ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {config?.accessTokenSet ? 'ACTIVE' : 'NOT SET'}
                </span>
                {config?.accessTokenPreview && (
                  <code className="text-[10px] font-mono text-slate-400 block mt-1">{config.accessTokenPreview}</code>
                )}
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-semibold">Phone Number ID</span>
                <span className="font-bold text-slate-200 font-mono">{config?.phoneNumberId || '1230640223463343'}</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase font-semibold">Business Account ID</span>
                <span className="font-bold text-cyan-400 font-mono">{config?.businessAccountId || '859822810314953'}</span>
              </div>
            </div>
          </div>

          {/* Form to Update Credentials */}
          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Meta WhatsApp Permanent / System Access Token (`WHATSAPP_ACCESS_TOKEN`)
              </label>
              <textarea
                rows={3}
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Paste new Meta WhatsApp Access Token (e.g. EAATVYWtTj50...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Leave empty if you only want to update other identifiers below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Phone Number ID (`WHATSAPP_PHONE_NUMBER_ID`)
                </label>
                <input
                  type="text"
                  value={phoneIdInput}
                  onChange={e => setPhoneIdInput(e.target.value)}
                  placeholder="e.g. 1230640223463343"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Business Account ID (`WHATSAPP_BUSINESS_ACCOUNT_ID`)
                </label>
                <input
                  type="text"
                  value={wabaIdInput}
                  onChange={e => setWabaIdInput(e.target.value)}
                  placeholder="e.g. 859822810314953"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta App ID (`META_APP_ID`)
                </label>
                <input
                  type="text"
                  value={appIdInput}
                  onChange={e => setAppIdInput(e.target.value)}
                  placeholder="e.g. 1230640223463343"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meta App Secret (`META_APP_SECRET`)
                </label>
                <input
                  type="text"
                  value={appSecretInput}
                  onChange={e => setAppSecretInput(e.target.value)}
                  placeholder="e.g. a1b2c3d4e5f678901234567890abcdef"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={updatingCreds}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {updatingCreds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating Credentials...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Save & Update Access Token
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={runDiagnosticCheck}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-md"
              >
                <Activity className="w-4 h-4" />
                Run Diagnostic Check
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 8: API CALL HISTORY & DEBUG LOGS */}
      {activeTab === 'api-history' && (
        <div className="space-y-6">
          {/* Metrics Overview Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-slate-400">Total API Calls Logged</span>
              <div className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                {apiCallLogs.length}
              </div>
              <p className="text-[10px] text-slate-500">Live Meta Graph API requests</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-emerald-400">Successful (2xx OK)</span>
              <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {apiCallLogs.filter(l => l.responseOk).length}
              </div>
              <p className="text-[10px] text-slate-500">
                {apiCallLogs.length > 0
                  ? `${Math.round((apiCallLogs.filter(l => l.responseOk).length / apiCallLogs.length) * 100)}% success rate`
                  : 'No logs yet'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-red-400">Failed / Errors</span>
              <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                {apiCallLogs.filter(l => !l.responseOk).length}
              </div>
              <p className="text-[10px] text-slate-500">Meta API error responses</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-cyan-400">Avg Latency</span>
              <div className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                {apiCallLogs.length > 0
                  ? `${Math.round(apiCallLogs.reduce((acc, l) => acc + (l.durationMs || 0), 0) / apiCallLogs.length)} ms`
                  : '0 ms'}
              </div>
              <p className="text-[10px] text-slate-500">Request roundtrip time</p>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  placeholder="Search endpoint, action, request body, or error..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                {(['ALL', 'SUCCESS', 'FAILED'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLogStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      logStatusFilter === f
                        ? f === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : f === 'FAILED'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                          : 'bg-slate-800 text-slate-100 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchWhatsAppAll}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Fetch latest API logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleClearApiLogs}
                disabled={apiCallLogs.length === 0}
                className="px-3.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Logs
              </button>
            </div>
          </div>

          {/* Split Inspector View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: API Call History List */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Meta Cloud API Requests ({apiCallLogs.filter(log => {
                    if (logStatusFilter === 'SUCCESS' && !log.responseOk) return false;
                    if (logStatusFilter === 'FAILED' && log.responseOk) return false;
                    if (logSearchQuery.trim()) {
                      const q = logSearchQuery.toLowerCase();
                      const inEndpoint = (log.endpoint || '').toLowerCase().includes(q);
                      const inAction = (log.action || '').toLowerCase().includes(q);
                      const inError = (log.error || '').toLowerCase().includes(q);
                      const inPayload = JSON.stringify(log.requestPayload || {}).toLowerCase().includes(q);
                      const inResponse = JSON.stringify(log.responseBody || {}).toLowerCase().includes(q);
                      return inEndpoint || inAction || inError || inPayload || inResponse;
                    }
                    return true;
                  }).length})
                </h3>
                <span className="text-[10px] text-slate-500">Newest first</span>
              </div>

              <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
                {apiCallLogs
                  .filter(log => {
                    if (logStatusFilter === 'SUCCESS' && !log.responseOk) return false;
                    if (logStatusFilter === 'FAILED' && log.responseOk) return false;
                    if (logSearchQuery.trim()) {
                      const q = logSearchQuery.toLowerCase();
                      const inEndpoint = (log.endpoint || '').toLowerCase().includes(q);
                      const inAction = (log.action || '').toLowerCase().includes(q);
                      const inError = (log.error || '').toLowerCase().includes(q);
                      const inPayload = JSON.stringify(log.requestPayload || {}).toLowerCase().includes(q);
                      const inResponse = JSON.stringify(log.responseBody || {}).toLowerCase().includes(q);
                      return inEndpoint || inAction || inError || inPayload || inResponse;
                    }
                    return true;
                  })
                  .map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                            : log.responseOk
                            ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                            : 'bg-red-950/20 border-red-900/40 hover:border-red-700/60 hover:bg-red-950/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                              log.method === 'POST' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {log.method}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                              log.action === 'SEND_MESSAGE'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : log.action === 'GET_TEMPLATES'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {log.action}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full flex items-center gap-1 ${
                            log.responseOk
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {log.responseOk ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                            {log.responseStatus || (log.responseOk ? 200 : 'ERR')}
                          </span>
                        </div>

                        <div className="text-xs font-mono text-slate-300 truncate mb-1" title={log.endpoint}>
                          {log.endpoint}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span className="flex items-center gap-1 font-mono text-slate-500">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-mono text-slate-400">
                            {log.durationMs}ms
                          </span>
                        </div>

                        {log.error && (
                          <div className="mt-2 p-1.5 rounded bg-red-950/60 border border-red-800/50 text-[11px] text-red-300 truncate">
                            <span className="font-bold">Error:</span> {log.error}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {apiCallLogs.length === 0 && (
                  <div className="p-8 text-center space-y-3">
                    <Terminal className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      No Meta Cloud API calls logged yet. Send a test WhatsApp message or refresh templates to log requests.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Detailed Raw Request & Response Inspector */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
              {selectedLog ? (
                <div className="space-y-5">
                  {/* Inspector Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-md ${
                          selectedLog.method === 'POST' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {selectedLog.method}
                        </span>
                        <h3 className="text-sm font-bold text-slate-100 font-mono">
                          {selectedLog.action}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full ${
                          selectedLog.responseOk
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          HTTP {selectedLog.responseStatus} {selectedLog.responseOk ? 'OK' : 'FAILED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span>Logged at: {new Date(selectedLog.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>Roundtrip: {selectedLog.durationMs}ms</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedLog(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg self-start transition-colors"
                      title="Close Inspector"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Target Endpoint URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Meta Cloud API Target Endpoint</span>
                      <button
                        onClick={() => copyToClipboard(selectedLog.endpoint, 'endpoint')}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'endpoint' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === 'endpoint' ? 'Copied' : 'Copy Endpoint'}
                      </button>
                    </label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 break-all select-all">
                      {selectedLog.endpoint}
                    </div>
                  </div>

                  {/* Request Headers & Payload Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Code className="w-4 h-4 text-cyan-400" />
                        Raw HTTP Request Details
                      </label>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify({
                          headers: selectedLog.requestHeaders,
                          payload: selectedLog.requestPayload
                        }, null, 2), 'request')}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'request' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'request' ? 'Copied JSON' : 'Copy Request JSON'}
                      </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px] mb-1">// Request Headers</span>
                        <div className="text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          {Object.entries(selectedLog.requestHeaders || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <span className="text-cyan-400">{k}:</span>
                              <span className="text-slate-200">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px] mb-1">// Request Body Payload</span>
                        <pre className="text-emerald-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800 overflow-x-auto text-[11px] leading-relaxed">
                          {JSON.stringify(selectedLog.requestPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Template & Payload Verification Comparison Box */}
                  {selectedLog.payloadComparison && (
                    <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                      selectedLog.payloadComparison.isMatch
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-amber-950/30 border-amber-500/40'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold flex items-center gap-1.5 ${
                          selectedLog.payloadComparison.isMatch ? 'text-emerald-400' : 'text-amber-300'
                        }`}>
                          {selectedLog.payloadComparison.isMatch ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          )}
                          Template Configuration Match Verification
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                          selectedLog.payloadComparison.isMatch
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {selectedLog.payloadComparison.isMatch ? 'MATCH VERIFIED' : 'MISMATCH REPORTED'}
                        </span>
                      </div>

                      <p className="text-slate-300 text-[11px] font-mono leading-relaxed">
                        {selectedLog.payloadComparison.details}
                      </p>

                      {selectedLog.payloadComparison.mismatches && selectedLog.payloadComparison.mismatches.length > 0 && (
                        <div className="pt-2 border-t border-amber-500/20 space-y-1">
                          <span className="text-[11px] font-bold text-amber-300">Detected Mismatches vs WhatsApp Manager Config:</span>
                          <ul className="list-disc list-inside space-y-1 text-amber-200/90 text-[11px]">
                            {selectedLog.payloadComparison.mismatches.map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Response Body & Status Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        Raw Meta API Response Body
                      </label>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog.responseBody, null, 2), 'response')}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'response' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'response' ? 'Copied Response' : 'Copy Response JSON'}
                      </button>
                    </div>

                    <div className={`border rounded-xl p-3.5 font-mono text-xs ${
                      selectedLog.responseOk ? 'bg-slate-950 border-slate-800' : 'bg-red-950/20 border-red-900/50'
                    }`}>
                      <pre className={`p-3 rounded-lg border overflow-x-auto text-[11px] leading-relaxed ${
                        selectedLog.responseOk 
                          ? 'bg-slate-900/80 border-slate-800 text-slate-200' 
                          : 'bg-red-950/60 border-red-800/60 text-red-200'
                      }`}>
                        {JSON.stringify(selectedLog.responseBody, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Debugging & Failure Resolution Guidance */}
                  {!selectedLog.responseOk && (
                    <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        Meta Cloud API Debugging Advice
                      </div>
                      <p className="text-amber-100/90 text-[11px] leading-relaxed">
                        {selectedLog.error || 'Meta Cloud API returned an error response.'}
                      </p>
                      <div className="text-[11px] text-amber-200/80 space-y-1 pt-1 border-t border-amber-500/20">
                        <p className="font-semibold text-amber-300">Common fixes for this error:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-200/90">
                          <li>Check if your Access Token is expired or missing required <code className="font-mono text-amber-300">whatsapp_business_messaging</code> permissions.</li>
                          <li>Ensure the recipient phone number format is valid with country code (e.g., <code className="font-mono text-amber-300">+254711223344</code>).</li>
                          <li>Verify the template name matches an APPROVED template in Meta WhatsApp Manager.</li>
                          <li>Confirm that the target Phone ID matches your Meta WhatsApp Business account.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center space-y-3">
                  <Terminal className="w-12 h-12 text-slate-700 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">No API Call Selected</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Select an API request from the list on the left to inspect raw HTTP request headers, JSON body payloads, Meta Graph API responses, and debugging tips.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* DIAGNOSTIC CHECK MODAL */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Meta Cloud API Diagnostic & Connectivity Status
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live Graph API endpoint ping, token validation & business account status
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {diagnosticLoading ? (
                <div className="py-16 text-center space-y-4">
                  <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto opacity-90" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">Executing Meta API Diagnostic Ping...</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Pinging Meta Graph API endpoints (`/v19.0/{'{phone_id}'}` & `/v19.0/{'{waba_id}'}/message_templates`), testing access token validity, and checking business account permissions.
                    </p>
                  </div>
                </div>
              ) : diagnosticData ? (
                <div className="space-y-6">
                  {/* Overall Health Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    diagnosticData.overallStatus === 'HEALTHY'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : diagnosticData.overallStatus === 'WARNING'
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {diagnosticData.overallStatus === 'HEALTHY' ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : diagnosticData.overallStatus === 'WARNING' ? (
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-sm tracking-tight">
                          {diagnosticData.overallStatus === 'HEALTHY' && 'All Systems Operational'}
                          {diagnosticData.overallStatus === 'WARNING' && 'Connected with Configuration Warnings'}
                          {diagnosticData.overallStatus === 'CRITICAL_ERROR' && 'Meta Cloud API Connection Failed'}
                        </h4>
                        <p className="text-xs opacity-90">
                          {diagnosticData.overallStatus === 'HEALTHY' && 'Meta Cloud API endpoints are reachable, access token is active, and templates are syncing cleanly.'}
                          {diagnosticData.overallStatus === 'WARNING' && 'Graph API is reachable, but template sync or account settings require attention.'}
                          {diagnosticData.overallStatus === 'CRITICAL_ERROR' && (diagnosticData.error || 'Access token or endpoint configuration returned an error from Meta Graph API.')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">
                      {new Date(diagnosticData.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Credentials Configuration Matrix */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                      <Key className="w-4 h-4 text-emerald-400" />
                      Meta Credentials & Identifiers Verification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500">ACCESS TOKEN</div>
                          <div className="text-xs text-slate-200 font-bold">{diagnosticData.credentials?.accessTokenMasked || 'NOT_CONFIGURED'}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diagnosticData.credentials?.hasAccessToken ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {diagnosticData.credentials?.hasAccessToken ? 'PRESENT' : 'MISSING'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500">PHONE NUMBER ID</div>
                          <div className="text-xs text-slate-200 font-bold">{diagnosticData.credentials?.phoneNumberId || 'NOT_CONFIGURED'}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diagnosticData.credentials?.hasPhoneNumberId ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {diagnosticData.credentials?.hasPhoneNumberId ? 'PRESENT' : 'MISSING'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500">WABA ACCOUNT ID</div>
                          <div className="text-xs text-slate-200 font-bold">{diagnosticData.credentials?.businessAccountId || 'NOT_CONFIGURED'}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diagnosticData.credentials?.hasBusinessAccountId ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {diagnosticData.credentials?.hasBusinessAccountId ? 'PRESENT' : 'MISSING'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500">APP SECRET / HMAC</div>
                          <div className="text-xs text-slate-200 font-bold">{diagnosticData.credentials?.hasAppSecret ? 'CONFIGURED' : 'DEV_MODE_BYPASS'}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diagnosticData.credentials?.hasAppSecret ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {diagnosticData.credentials?.hasAppSecret ? 'ACTIVE' : 'OPTIONAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic Check Items */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Endpoint Health & Validation Checks
                    </h4>
                    <div className="space-y-2">
                      {(diagnosticData.checks || []).map((check: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 flex items-center gap-2">
                              {check.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                              {check.status === 'WARN' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                              {check.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400" />}
                              {check.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              check.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              check.status === 'WARN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {check.status}
                            </span>
                          </div>
                          <p className="text-slate-300">{check.message}</p>
                          {check.details && (
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 leading-relaxed">
                              {check.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meta API Endpoint Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Number API Ping */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span>Phone Number API Endpoint</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          diagnosticData.phoneApiPing?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          HTTP {diagnosticData.phoneApiPing?.status || 'ERR'} ({diagnosticData.phoneApiPing?.durationMs || 0}ms)
                        </span>
                      </div>
                      {diagnosticData.phoneApiPing?.ok ? (
                        <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                          <div>Display Phone: <span className="text-emerald-400 font-bold">{diagnosticData.phoneApiPing.displayPhoneNumber || 'N/A'}</span></div>
                          <div>Verified Name: <span className="text-slate-200">{diagnosticData.phoneApiPing.verifiedName || 'N/A'}</span></div>
                          <div>Quality Rating: <span className="text-cyan-400">{diagnosticData.phoneApiPing.qualityRating || 'UNKNOWN'}</span></div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-rose-300 font-mono">
                          {diagnosticData.phoneApiPing?.error?.message || 'Phone Number endpoint failed or unreachable.'}
                        </p>
                      )}
                    </div>

                    {/* WABA Templates API Ping */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                        <span>WABA Templates API Endpoint</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          diagnosticData.wabaTemplatesPing?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          HTTP {diagnosticData.wabaTemplatesPing?.status || 'ERR'} ({diagnosticData.wabaTemplatesPing?.durationMs || 0}ms)
                        </span>
                      </div>
                      {diagnosticData.wabaTemplatesPing?.ok ? (
                        <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                          <div>Total Fetched: <span className="text-slate-200 font-bold">{diagnosticData.wabaTemplatesPing.totalTemplatesFetched || 0}</span></div>
                          <div>Active / Syncable: <span className="text-emerald-400 font-bold">{diagnosticData.wabaTemplatesPing.activeTemplatesCount || 0}</span></div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-rose-300 font-mono">
                          {diagnosticData.wabaTemplatesPing?.error?.message || 'Message Templates endpoint failed or unreachable.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Troubleshooting Recommendations */}
                  {diagnosticData.recommendations && diagnosticData.recommendations.length > 0 && (
                    <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2">
                      <h4 className="font-bold text-amber-300 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-400" />
                        Troubleshooting Recommendations
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-amber-200/90 leading-relaxed text-xs">
                        {diagnosticData.recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Raw Diagnostic JSON & Copy */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 font-mono">RAW DIAGNOSTIC JSON REPORT</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
                          setCopiedReport(true);
                          setTimeout(() => setCopiedReport(false), 2000);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedReport ? 'Copied Report!' : 'Copy Report JSON'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setShowDiagnosticModal(false);
                  setActiveTab('credentials' as any);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Open WhatsApp Settings
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={runDiagnosticCheck}
                  disabled={diagnosticLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/30 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${diagnosticLoading ? 'animate-spin' : ''}`} />
                  Re-Run Diagnostic Ping
                </button>
                <button
                  onClick={() => setShowDiagnosticModal(false)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close Diagnostic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
