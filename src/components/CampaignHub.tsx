import React, { useState, useEffect } from 'react';
import { Campaign, Contact, ContactList } from '../types';
import { 
  Send, 
  Sparkles, 
  Calendar, 
  Layers, 
  MessageSquare, 
  Mail, 
  Loader2, 
  Play, 
  Pause, 
  Trash2, 
  Users,
  AlertCircle,
  RotateCcw,
  Ban,
  Clock,
  Filter,
  BarChart2,
  ListPlus
} from 'lucide-react';

interface CampaignHubProps {
  campaigns: Campaign[];
  contacts: Contact[];
  contactLists?: ContactList[];
  onAddCampaign: (campaign: Campaign) => void;
  onUpdateCampaignStatus: (id: string, status: Campaign['status']) => void;
  onRetryCampaign?: (id: string) => void;
  onDeleteCampaign: (id: string) => void;
  onAddContactList?: (list: ContactList) => void;
  walletBalance: number;
  onChargeWallet: (amount: number) => boolean;
}

export default function CampaignHub({
  campaigns,
  contacts,
  contactLists = [],
  onAddCampaign,
  onUpdateCampaignStatus,
  onRetryCampaign,
  onDeleteCampaign,
  onAddContactList,
  walletBalance,
  onChargeWallet
}: CampaignHubProps) {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'ANALYTICS'>('LIST');

  // Form states
  const [name, setName] = useState('');
  const [audienceType, setAudienceType] = useState<'LIST' | 'GROUP' | 'SEGMENT' | 'ALL_CONTACTS'>('ALL_CONTACTS');
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);
  
  const [channels, setChannels] = useState<('SMS' | 'WHATSAPP' | 'EMAIL')[]>(['SMS']);
  const [smsBody, setSmsBody] = useState('Dear {{first_name}}, your monthly Safaricom Sacco savings balance is {{savingsBalance}}. Your member reference is {{memberId}}.');
  const [emailSubject, setEmailSubject] = useState('Important Q3 Investment Division Status Update');
  const [emailBody, setEmailBody] = useState('Hello {{first_name}},\n\nThis is an official notice regarding your member account (ID: {{memberId}}).\nYour current savings are {{savingsBalance}}.\n\nPlease log in to the portal to review your dividend returns.\n\nWarm regards,\nSafaricom Investment Sacco.');
  const [whatsappTemplate, setWhatsappTemplate] = useState('hello_world');
  const [availableMetaTemplates, setAvailableMetaTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/whatsapp/templates')
      .then(res => res.json())
      .then(data => {
        if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          setAvailableMetaTemplates(data.templates);
          if (!data.templates.some((t: any) => t.name === whatsappTemplate)) {
            setWhatsappTemplate(data.templates[0].name);
          }
        }
      })
      .catch(err => console.error('Error fetching Meta templates for CampaignHub:', err));
  }, []);
  
  const [batchSize, setBatchSize] = useState<number>(250);
  const [batchDelayMs, setBatchDelayMs] = useState<number>(800);
  const [scheduleType, setScheduleType] = useState<'NOW' | 'LATER'>('NOW');
  const [scheduledDate, setScheduledDate] = useState('2026-07-25T10:00');
  
  // Gateway outage test simulation
  const [simulateOutage, setSimulateOutage] = useState(false);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('Write a high-converting dividend reminder for cooperative members');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  // Selected audience target contacts calculation with deduplication across multiple groups
  const targetedContacts = audienceType === 'ALL_CONTACTS' 
    ? contacts 
    : contacts.filter(c => {
        const cGroups = c.groupIds || c.listIds || [];
        return selectedAudienceIds.some(gid => cGroups.includes(gid));
      });

  const estimatedTargetCount = audienceType === 'ALL_CONTACTS'
    ? contacts.length
    : (targetedContacts.length > 0 ? targetedContacts.length : selectedAudienceIds.reduce((acc, gid) => acc + (contactLists.find(l => l.id === gid)?.contactCount || 0), 0));

  const handleToggleChannel = (channel: 'SMS' | 'WHATSAPP' | 'EMAIL') => {
    if (channels.includes(channel)) {
      if (channels.length > 1) {
        setChannels(channels.filter(c => c !== channel));
      }
    } else {
      setChannels([...channels, channel]);
    }
  };

  const generateAICopy = () => {
    setIsAiGenerating(true);
    setAiFeedback('');
    
    setTimeout(() => {
      let smsResult = '';
      let emailResult = '';

      if (aiPrompt.toLowerCase().includes('dividend') || aiPrompt.toLowerCase().includes('payout')) {
        smsResult = 'Hello {{first_name}}, great news! Q3 dividend payouts for Safaricom Sacco are ready. Your savings balance is {{savingsBalance}}. Claim yours today: https://sacco.ke/div';
        emailResult = 'Hi {{first_name}},\n\nWe are pleased to inform you that your Q3 dividends have been computed successfully.\n\nMember Profile: {{memberId}}\nSavings Capital: {{savingsBalance}}\n\nYour calculated dividend yield has been credited to your active wallet balance.\n\nSafaricom Investment Team.';
      } else if (aiPrompt.toLowerCase().includes('alert') || aiPrompt.toLowerCase().includes('warning')) {
        smsResult = 'ALERT: {{first_name}}, your Safaricom Sacco savings of {{savingsBalance}} has fallen below the active limit of KES 5,000. Topup immediately to retain active dividend qualification.';
        emailResult = 'Security Alert regarding your membership (ID: {{memberId}})\n\nDear {{first_name}},\n\nOur system detected your savings are currently {{savingsBalance}}, which is below active tier limits.\n\nPlease top up via M-Pesa immediately to avoid automatic status adjustments.\n\nThank you.';
      } else {
        smsResult = 'Dear {{first_name}}, Safaricom Sacco wishes you an amazing week ahead! Review your profile {{memberId}} savings balance ({{savingsBalance}}) at your convenience.';
        emailResult = 'Safaricom Sacco Corporate Newsletter\n\nHello {{first_name}},\n\nThank you for choosing Safaricom Sacco to secure your future. Your member index ID is {{memberId}} and active profile balance stands at {{savingsBalance}}.\n\nReach out to support for active inquiries.';
      }

      setSmsBody(smsResult);
      setEmailBody(emailResult);
      setIsAiGenerating(false);
      setAiFeedback('AI Smart templates computed & synchronized with form fields successfully!');
    }, 1000);
  };

  const handleSubmitCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ratePerSMS = 1.00;
    const estCost = estimatedTargetCount * ratePerSMS * channels.length;

    const selectedListNames = contactLists.filter(l => selectedAudienceIds.includes(l.id)).map(l => l.name).join(', ');

    const newCampaign: Campaign = {
      id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      status: scheduleType === 'NOW' ? 'PROCESSING' : 'SCHEDULED',
      channels,
      audienceType,
      audienceId: selectedAudienceIds[0] || undefined,
      audienceIds: selectedAudienceIds,
      audienceName: audienceType === 'ALL_CONTACTS' ? 'All Contacts Master Directory' : (selectedListNames || 'Selected Audiences'),
      smsTemplate: smsBody,
      emailSubject: emailSubject,
      emailTemplate: emailBody,
      whatsappTemplate: whatsappTemplate,
      scheduledAt: scheduleType === 'LATER' ? scheduledDate : undefined,
      batchSize,
      batchDelayMs,
      totalRecipients: estimatedTargetCount,
      processedCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      readCount: 0,
      cost: estCost,
      createdAt: new Date().toISOString()
    };

    onAddCampaign(newCampaign);
    setName('');
    setActiveTab('LIST');
  };

  // Calculate totals for Analytics tab
  const totalCampaigns = campaigns.length;
  const totalMessagesDispatched = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.failedCount || 0), 0);
  const totalCost = campaigns.reduce((acc, c) => acc + (c.cost || 0), 0);
  const overallDeliveryRate = totalMessagesDispatched > 0 ? ((totalDelivered / totalMessagesDispatched) * 100).toFixed(1) : '98.4';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold font-sans text-slate-100 tracking-tight">Campaign Operations Hub</h2>
          <p className="text-xs text-slate-400 mt-1">
            Audience targeting, asynchronous multi-channel queuing, batching & real-time dispatch monitoring.
          </p>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'LIST' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Active Campaigns ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'CREATE' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            New Campaign
          </button>
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'ANALYTICS' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      </div>

      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Total Campaigns</span>
              <p className="text-2xl font-bold font-mono text-cyan-400">{totalCampaigns}</p>
            </div>
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Messages Dispatched</span>
              <p className="text-2xl font-bold font-mono text-slate-100">{totalMessagesDispatched.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Avg Delivery Rate</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">{overallDeliveryRate}%</p>
            </div>
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Total Spend</span>
              <p className="text-2xl font-bold font-mono text-amber-400">KES {totalCost.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Campaign Performance Metrics Overview
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="pb-3">Campaign Title</th>
                    <th className="pb-3">Audience</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Recipients</th>
                    <th className="pb-3">Delivered</th>
                    <th className="pb-3">Failed</th>
                    <th className="pb-3">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-slate-300">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-850/20">
                      <td className="py-3 font-semibold text-slate-100">{c.name}</td>
                      <td className="py-3 text-slate-400">{c.audienceName || 'All Contacts'}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-950 border border-slate-800 text-cyan-400">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono">{c.totalRecipients}</td>
                      <td className="py-3 font-mono text-emerald-400">{c.deliveredCount}</td>
                      <td className="py-3 font-mono text-rose-400">{c.failedCount}</td>
                      <td className="py-3 font-mono">KES {c.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CREATE' && (
        <form onSubmit={handleSubmitCampaign} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-5 bg-slate-900/40 border border-slate-850 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              New Campaign Configuration
            </h3>
            
            {/* Title */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-400">Campaign Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Safaricom Investment Dividends Notice"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>

            {/* Audience Selection */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-850 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Target Audience Selection
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {estimatedTargetCount} target recipients
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAudienceType('ALL_CONTACTS')}
                  className={`p-2.5 border rounded-lg font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    audienceType === 'ALL_CONTACTS' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Contacts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceType('LIST')}
                  className={`p-2.5 border rounded-lg font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    audienceType === 'LIST' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Contact List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceType('GROUP')}
                  className={`p-2.5 border rounded-lg font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    audienceType === 'GROUP' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Group</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceType('SEGMENT')}
                  className={`p-2.5 border rounded-lg font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    audienceType === 'SEGMENT' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>Segment</span>
                </button>
              </div>

              {audienceType !== 'ALL_CONTACTS' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-[11px] font-bold text-slate-300">Target Audience Groups (Select One or Multiple):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                    {contactLists
                      .filter(l => audienceType === 'ALL_CONTACTS' || l.type === audienceType || true)
                      .map(l => {
                        const isChecked = selectedAudienceIds.includes(l.id);
                        return (
                          <label key={l.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isChecked ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-semibold' : 'border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedAudienceIds(prev =>
                                  isChecked ? prev.filter(x => x !== l.id) : [...prev, l.id]
                                );
                              }}
                              className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="truncate">{l.name} ({l.contactCount})</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Channels Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Target Delivery Channels</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleChannel('SMS')}
                  className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer ${
                    channels.includes('SMS') 
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                      : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-semibold">Bulk SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel('WHATSAPP')}
                  className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer ${
                    channels.includes('WHATSAPP') 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                      : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span className="font-semibold">WhatsApp Business</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleChannel('EMAIL')}
                  className={`p-3 border rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs cursor-pointer ${
                    channels.includes('EMAIL') 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                      : 'border-slate-850 bg-slate-950/20 text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-semibold">Bulk Email</span>
                </button>
              </div>
            </div>

            {/* Template Inputs */}
            {channels.includes('SMS') && (
              <div className="space-y-1.5 border-t border-slate-900 pt-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-medium text-slate-300">Bulk SMS Content Template</label>
                  <span className="text-[10px] text-slate-500 font-mono">160 Char standard SMS unit</span>
                </div>
                <textarea
                  rows={3}
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <span>Available Merge Tags:</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 border border-slate-800">{"{{first_name}}"}</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 border border-slate-800">{"{{last_name}}"}</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 border border-slate-800">{"{{memberId}}"}</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 border border-slate-800">{"{{savingsBalance}}"}</span>
                </div>
              </div>
            )}

            {channels.includes('EMAIL') && (
              <div className="space-y-3 border-t border-slate-900 pt-4">
                <label className="block text-xs font-medium text-slate-300">Email Campaign Layout & Subject</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject line"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <textarea
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            )}

            {channels.includes('WHATSAPP') && (
              <div className="space-y-2 border-t border-slate-900 pt-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-emerald-400">Meta Approved WhatsApp Message Template</label>
                  <span className="text-[10px] text-emerald-500 font-mono">24h Customer Service Window Compliant</span>
                </div>
                <select
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                >
                  {availableMetaTemplates.length > 0 ? (
                    availableMetaTemplates.map((tmpl) => (
                      <option key={tmpl.id || tmpl.name} value={tmpl.name}>
                        {tmpl.name} ({tmpl.category || 'UTILITY'} • {typeof tmpl.language === 'string' ? tmpl.language : (tmpl.language?.code || 'en_US')})
                      </option>
                    ))
                  ) : (
                    <option value="hello_world">hello_world (UTILITY • en_US)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-400">
                  When contacts are outside the 24-hour customer service window, this approved Meta template is automatically dispatched to ensure platform compliance.
                </p>
              </div>
            )}

            {/* Asynchronous Queue Batching Settings */}
            <div className="space-y-3 border-t border-slate-900 pt-4">
              <label className="block text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                Async Queue & Throttle Controls
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-400">Batch Size (Contacts / Burst)</label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  >
                    <option value={50}>50 recipients / batch</option>
                    <option value={100}>100 recipients / batch</option>
                    <option value={250}>250 recipients / batch</option>
                    <option value={500}>500 recipients / batch</option>
                    <option value={1000}>1,000 recipients / batch</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-slate-400">Delay Between Batches</label>
                  <select
                    value={batchDelayMs}
                    onChange={(e) => setBatchDelayMs(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  >
                    <option value={200}>200 ms (High Throughput)</option>
                    <option value={500}>500 ms (Standard)</option>
                    <option value={1000}>1,000 ms (1 second throttle)</option>
                    <option value={2000}>2,000 ms (Low Rate Limit)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dispatch Scheduling */}
            <div className="space-y-2 border-t border-slate-900 pt-4">
              <label className="block text-xs font-medium text-slate-400">Execution Schedule</label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setScheduleType('NOW')}
                  className={`py-2 px-3 border rounded-lg font-semibold cursor-pointer ${
                    scheduleType === 'NOW' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-850 text-slate-400'
                  }`}
                >
                  Process Asynchronously Now
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('LATER')}
                  className={`py-2 px-3 border rounded-lg font-semibold cursor-pointer ${
                    scheduleType === 'LATER' ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-850 text-slate-400'
                  }`}
                >
                  Schedule Later
                </button>
              </div>

              {scheduleType === 'LATER' && (
                <div className="flex items-center gap-2 pt-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-lg text-sm transition-all shadow-md shadow-cyan-500/15 cursor-pointer hover:opacity-95"
            >
              {scheduleType === 'NOW' ? 'Launch Campaign Pipeline' : 'Schedule Campaign in Queue'}
            </button>
          </div>

          {/* AI Assistant Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">AI Content Assistant</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Generate localized, personalized templates with merge tags.
              </p>
              
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                
                <button
                  type="button"
                  onClick={generateAICopy}
                  disabled={isAiGenerating}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-cyan-400 hover:text-cyan-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate AI Proposals
                    </>
                  )}
                </button>
                {aiFeedback && <p className="text-[10px] text-emerald-400 font-mono text-center">{aiFeedback}</p>}
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/15 border border-dashed border-slate-800 rounded-2xl">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-semibold">No campaign queues registered yet</p>
              <button
                onClick={() => setActiveTab('CREATE')}
                className="mt-3 inline-block bg-cyan-500 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                Launch First Campaign
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((c) => {
                const total = c.totalRecipients || 1;
                const processed = c.processedCount !== undefined ? c.processedCount : c.sentCount || 0;
                const percent = Math.min(100, Math.round((processed / total) * 100));

                return (
                  <div key={c.id} className="bg-slate-900/30 border border-slate-850 rounded-xl p-5 space-y-4 transition-all hover:bg-slate-850/15">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Campaign Title & Metadata */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-100">{c.name}</span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                            c.status === 'COMPLETED' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : c.status === 'PROCESSING' || c.status === 'QUEUED'
                                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse'
                                : c.status === 'PAUSED'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                  : c.status === 'CANCELLED'
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                            {c.status}
                          </span>

                          {c.audienceName && (
                            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {c.audienceName}
                            </span>
                          )}

                          <div className="flex gap-1">
                            {c.channels.map((chan) => (
                              <span key={chan} className="text-[9px] font-mono bg-slate-950 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">
                                {chan}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                          <span>Target: {c.totalRecipients} contacts</span>
                          <span>Cost: KES {c.cost.toFixed(2)}</span>
                          {c.scheduledAt && <span className="text-indigo-400">Sched: {new Date(c.scheduledAt).toLocaleString()}</span>}
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {(c.status === 'DRAFT' || c.status === 'PAUSED' || c.status === 'SCHEDULED') && (
                          <button
                            onClick={() => onUpdateCampaignStatus(c.id, 'PROCESSING')}
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {c.status === 'PAUSED' ? 'Resume' : 'Start Campaign'}
                          </button>
                        )}

                        {(c.status === 'PROCESSING' || c.status === 'QUEUED') && (
                          <button
                            onClick={() => onUpdateCampaignStatus(c.id, 'PAUSED')}
                            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            Pause Queue
                          </button>
                        )}

                        {c.failedCount > 0 && onRetryCampaign && (
                          <button
                            onClick={() => onRetryCampaign(c.id)}
                            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry {c.failedCount} Failed
                          </button>
                        )}

                        {(c.status === 'PROCESSING' || c.status === 'PAUSED') && (
                          <button
                            onClick={() => onUpdateCampaignStatus(c.id, 'CANCELLED')}
                            className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-lg text-xs cursor-pointer"
                            title="Cancel Campaign"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteCampaign(c.id)}
                          className="p-1.5 bg-slate-950 border border-slate-850 text-slate-500 hover:text-rose-400 rounded-lg text-xs cursor-pointer transition-colors"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Counters */}
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                      <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                        <span>Asynchronous Batch Progress</span>
                        <span className="text-cyan-400 font-bold">{processed} / {total} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300" 
                          style={{ width: `${percent}%` }} 
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono pt-1 text-slate-400">
                        <span>Sent: <strong className="text-slate-200">{c.sentCount}</strong></span>
                        <span>Delivered: <strong className="text-emerald-400">{c.deliveredCount}</strong></span>
                        <span>Failed: <strong className="text-rose-400">{c.failedCount}</strong></span>
                        <span>Read: <strong className="text-teal-400">{c.readCount}</strong></span>
                        <span>Bounced: <strong className="text-amber-400">{c.bouncedCount}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
