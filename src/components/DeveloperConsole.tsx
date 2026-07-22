import React, { useState } from 'react';
import { APIKey, WebhookLog } from '../types';
import { 
  Terminal, 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Globe, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Play,
  Smartphone,
  Send,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface DeveloperConsoleProps {
  apiKeys: APIKey[];
  onCreateAPIKey: (key: APIKey) => void;
  onDeleteAPIKey: (id: string) => void;
  webhookLogs: WebhookLog[];
  onTriggerApiSMS: (to: string, message: string) => void;
  onAddWebhookLog: (log: WebhookLog) => void;
}

export default function DeveloperConsole({
  apiKeys,
  onCreateAPIKey,
  onDeleteAPIKey,
  webhookLogs,
  onTriggerApiSMS,
  onAddWebhookLog
}: DeveloperConsoleProps) {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  
  // API Key Create state
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['messages.write']);

  // cURL Interactive execution terminal state
  const [terminalTo, setTerminalTo] = useState('+254712345678');
  const [terminalMsg, setTerminalMsg] = useState('Your OTP is 921028. Valid for 5 minutes.');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Live Test SMS dispatch state (Requirement 5)
  const [testPhone, setTestPhone] = useState('+254711223344');
  const [testMessage, setTestMessage] = useState('Hello, this is a real-time production test SMS from the Sacco Portal!');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleRunLiveTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone, message: testMessage })
      });

      const data = await response.json();
      if (!response.ok) {
        setTestError(data.error || 'Server error occurred during dispatch.');
      } else {
        setTestResult(data);
      }
    } catch (err: any) {
      setTestError(err.message || 'Network failure dispatching test SMS.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const randHex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey: APIKey = {
      id: `key-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: newKeyName,
      keyPrefix: `live_sk_${randHex}`,
      scopes: selectedScopes,
      createdAt: new Date().toISOString()
    };

    onCreateAPIKey(newKey);
    setNewKeyName('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => {
      setCopiedKeyId(null);
    }, 1500);
  };

  // Run simulated API request in local workspace console
  const runSimulatedApiCall = () => {
    setIsSendingRequest(true);
    setTerminalLogs([]);

    const timestamp = new Date().toISOString();
    const mockMsgId = `msg_api_${Math.floor(100000 + Math.random() * 900000)}`;

    const logLines = [
      `$ curl -X POST https://api.sacco-portal.or.ke/v1/sms/send \\`,
      `    -H "Authorization: Bearer ${apiKeys[0]?.keyPrefix || 'live_sk_4f89a91c'}" \\`,
      `    -H "Content-Type: application/json" \\`,
      `    -d '{"to": "${terminalTo}", "message": "${terminalMsg}"}'`,
      ` `,
      `> POST /v1/sms/send HTTP/1.1`,
      `> Host: api.sacco-portal.or.ke`,
      `> User-Agent: curl/7.68.0`,
      `> Accept: */*`,
      ` `,
      `< HTTP/1.1 202 Accepted`,
      `< Content-Type: application/json`,
      `< Rate-Limit-Remaining: 59/60`,
      `< Date: ${new Date().toUTCString()}`,
      ` `,
      `{`,
      `  "success": true,`,
      `  "messageId": "${mockMsgId}",`,
      `  "status": "QUEUED",`,
      `  "channel": "SMS",`,
      `  "provider": "Safaricom Direct",`,
      `  "timestamp": "${timestamp}"`,
      `}`
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine >= logLines.length) {
        clearInterval(interval);
        setIsSendingRequest(false);
        
        // Trigger live float popup in parent
        onTriggerApiSMS(terminalTo, terminalMsg);

        // Add a webhook log entry
        onAddWebhookLog({
          id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          url: 'https://client-webhook.co.ke/sms/callback',
          event: 'sms.delivered',
          status: 200,
          response: `{"received": true, "messageId": "${mockMsgId}"}`,
          timestamp: new Date().toISOString()
        });

        return;
      }

      setTerminalLogs(prev => [...prev, logLines[currentLine]]);
      currentLine++;
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Title */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-bold font-sans text-slate-100 tracking-tight">API & Developer Console</h2>
        <p className="text-xs text-slate-400 mt-1">
          Integrate high-speed bulk SMS and transactional auth OTP into external microservices with scopes and webhooks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column 1 & 2: API Keys manager & cURL interactive testing console */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* API Keys Credentials panel */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200">Developer Access API Keys</h3>
            </div>
            
            <div className="divide-y divide-slate-900 space-y-3.5">
              {apiKeys.map((k) => (
                <div key={k.id} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1 flex-1">
                    <span className="font-bold text-slate-200 block">{k.name}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span>Key: {k.keyPrefix}...••••••••</span>
                      <button
                        onClick={() => copyToClipboard(`${k.keyPrefix}abcdef1234567890`, k.id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Scopes */}
                    <div className="flex gap-1 pt-1 flex-wrap">
                      {k.scopes.map((s) => (
                        <span key={s} className="text-[9px] font-mono bg-slate-950 text-slate-500 border border-slate-900 px-1.5 py-0.5 rounded font-bold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteAPIKey(k.id)}
                    className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-500 hover:text-rose-400 rounded-lg self-end sm:self-center transition-colors cursor-pointer"
                  >
                    Revoke Key
                  </button>
                </div>
              ))}
            </div>

            {/* Key creation form */}
            <form onSubmit={handleCreateKey} className="border-t border-slate-900 pt-4 space-y-3.5">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Generate API Credentials</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-400">Credential Identifier</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Safaricom Sacco Integration Core"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>

                {/* Scope selection list */}
                <div className="space-y-1.5">
                  <label className="block text-slate-400">Assigned Scopes</label>
                  <div className="flex gap-2 flex-wrap">
                    {['messages.write', 'delivery.read', 'contacts.write'].map((scope) => {
                      const isSelected = selectedScopes.includes(scope);
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => handleToggleScope(scope)}
                          className={`px-2 py-1 text-[10px] font-mono rounded border cursor-pointer ${
                            isSelected ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold' : 'border-slate-850 text-slate-500'
                          }`}
                        >
                          {scope}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
              >
                Issue Access Credentials
              </button>
            </form>
          </div>

          {/* Interactive terminal tool */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200">Interactive HTTP cURL Executor</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-400">To (E.164 destination)</label>
                <input
                  type="text"
                  value={terminalTo}
                  onChange={(e) => setTerminalTo(e.target.value)}
                  placeholder="+254712345678"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-400">Alert Message Body</label>
                <input
                  type="text"
                  value={terminalMsg}
                  onChange={(e) => setTerminalMsg(e.target.value)}
                  placeholder="OTP or critical alert..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>
            </div>

            <button
              onClick={runSimulatedApiCall}
              disabled={isSendingRequest}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-cyan-400 hover:text-cyan-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
              Execute API Sandbox Call
            </button>

            {/* Interactive black block screen */}
            {terminalLogs.length > 0 && (
              <div className="p-4 bg-black rounded-lg border border-slate-900 text-cyan-400 font-mono text-[10px] space-y-1 select-text overflow-x-auto max-h-[220px] scrollbar-thin">
                {terminalLogs.map((line, i) => (
                  <p key={i} className="whitespace-pre">{line}</p>
                ))}
              </div>
            )}
          </div>

          {/* Active SMS Gateway Live Test Panel (Requirement 5) */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200">Real-time Gateway Test Dispatcher</h3>
            </div>
            
            <p className="text-xs text-slate-400">
              Validate credentials and route configurations immediately by sending a live SMS packet to any recipient mobile node.
            </p>

            <form onSubmit={handleRunLiveTestSMS} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Destination (E.164 format)</label>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="e.g., +254711223344"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-slate-400 font-medium">Test SMS Message Body</label>
                  <input
                    type="text"
                    required
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Type test copy..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isTesting}
                className="w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Dispatching packet to network gateway...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Live Test SMS
                  </>
                )}
              </button>
            </form>

            {/* Test result status output */}
            {testResult && (
              <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-lg space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Gateway Dispatch Confirmed</span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                  <span>Assigned Provider:</span>
                  <span className="text-slate-200 text-right">{testResult.log.provider}</span>
                  <span>Recipient:</span>
                  <span className="text-slate-200 text-right">{testResult.log.recipient}</span>
                  <span>Transaction ID:</span>
                  <span className="text-slate-200 text-right font-bold">{testResult.log.messageId || 'N/A'}</span>
                  <span>Status:</span>
                  <span className="text-emerald-400 text-right font-bold uppercase">{testResult.log.status}</span>
                </div>

                {testResult.providerResponse && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Raw Carrier JSON Response:</span>
                    <pre className="p-3 bg-black rounded text-[9px] text-cyan-400 overflow-x-auto select-all max-h-[160px] scrollbar-thin font-mono leading-relaxed">
                      {JSON.stringify(testResult.providerResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {testError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Carrier Reject / Dispatch Blocked</span>
                </div>
                <p className="text-[11px] text-rose-300 leading-relaxed font-mono">
                  Error Details: {testError}
                </p>
                <div className="p-2.5 bg-black/40 rounded border border-rose-500/10 text-[10px] text-slate-500 leading-normal">
                  <p className="font-semibold text-slate-400">Common troubleshooting checklist:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Confirm <code className="text-rose-400">AT_USERNAME</code> and <code className="text-rose-400">AT_API_KEY</code> values match Africa's Talking dashboard.</li>
                    <li>Ensure your recipient phone number contains the correct country dial code (e.g., KES +254).</li>
                    <li>Ensure your tenant wallet balance is not fully depleted.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Webhook target configs & metrics documentation */}
        <div className="space-y-6">
          {/* Active Webhook Logs */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Webhook Post Hooks</h3>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When carrier callbacks deliver packet statuses, the platform fires POST requests to client target webhook endpoints.
            </p>

            <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
              {webhookLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-mono">
                  No webhooks fired yet. Send an API call to test.
                </div>
              ) : (
                webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg space-y-1.5 text-[10px]">
                    <div className="flex justify-between font-mono">
                      <span className="text-indigo-400 font-bold">{log.event}</span>
                      <span className="text-emerald-400 font-semibold">HTTP {log.status}</span>
                    </div>
                    <span className="text-slate-500 block font-mono truncate">{log.url}</span>
                    <span className="text-slate-400 block font-mono bg-black p-1 rounded overflow-x-auto select-all leading-none">{log.response}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
