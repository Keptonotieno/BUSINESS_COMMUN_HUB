import React, { useState, useEffect } from 'react';
import { User, Tenant, Contact, ContactList, Campaign, MessageLog, APIKey, AutomationWorkflow, AuditLog, WebhookLog } from './types';
import { 
  INITIAL_TENANTS, 
  SEED_CONTACT_LISTS,
  SEED_CONTACTS, 
  SEED_CAMPAIGNS, 
  SEED_MESSAGE_LOGS, 
  INITIAL_API_KEYS, 
  INITIAL_WORKFLOWS, 
  SEED_AUDIT_LOGS 
} from './data';

// Components
import AuthenticationScreen from './components/AuthenticationScreen';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import CampaignHub from './components/CampaignHub';
import WhatsAppManager from './components/WhatsAppManager';
import ContactsManager from './components/ContactsManager';
import AutomationCenter from './components/AutomationCenter';
import DeveloperConsole from './components/DeveloperConsole';
import BillingDashboard from './components/BillingDashboard';
import WorkspaceSettings from './components/WorkspaceSettings';
import PlatformAdminPortal from './components/PlatformAdminPortal';

import { BellRing, ShieldCheck, X } from 'lucide-react';

export default function App() {
  // Session Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core Platform states
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [activeTenant, setActiveTenant] = useState<Tenant>(INITIAL_TENANTS[0]);
  const [activeView, setActiveView] = useState<string>('dashboard');
  
  // Mobile Sidebar control state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Entities management state
  const [contactLists, setContactLists] = useState<ContactList[]>(SEED_CONTACT_LISTS);
  const [contacts, setContacts] = useState<Contact[]>(SEED_CONTACTS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(SEED_CAMPAIGNS);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>(SEED_MESSAGE_LOGS);
  const [apiKeys, setApiKeys] = useState<APIKey[]>(INITIAL_API_KEYS);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>(INITIAL_WORKFLOWS);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);

  // Live Toast Notifications queue for transactional trigger events
  const [toastEvents, setToastEvents] = useState<{ id: string; title: string; message: string; type: 'success' | 'alert' }[]>([]);

  // Fetch initial database state and establish WebSocket connection on mount
  useEffect(() => {
    let socket: WebSocket | null = null;
    let isMounted = true;
    let reconnectTimeout: any = null;
    let reconnectDelay = 1000;

    // 1. Initial REST Fetch
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.tenants) setTenants(data.tenants);
        if (data.tenants && data.tenants.length > 0) {
          setActiveTenant(data.tenants[0]);
        }
        if (data.contactLists) setContactLists(data.contactLists);
        if (data.contacts) setContacts(data.contacts);
        if (data.campaigns) setCampaigns(data.campaigns);
        if (data.messageLogs) setMessageLogs(data.messageLogs);
        if (data.apiKeys) setApiKeys(data.apiKeys);
        if (data.workflows) setWorkflows(data.workflows);
        if (data.webhookLogs) setWebhookLogs(data.webhookLogs);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
      })
      .catch(err => console.error('Error fetching initial database state:', err));

    // 2. WebSocket Connection Builder
    const connectWS = () => {
      if (!isMounted) return;

      // Explicitly clear any existing socket state before establishing a new one
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        try {
          socket.close();
        } catch (e) {}
        socket = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`Establishing WebSocket connection to ${socketUrl}...`);
      
      socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        if (!isMounted) return;
        console.log('WebSocket connection established with full-stack core.');
        reconnectDelay = 1000; // Reset reconnection delay on successful connection
      };

      socket.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          console.log('Received WebSocket broadcast event:', msg.type);
          
          switch (msg.type) {
            case 'INITIAL_SYNC': {
              const data = msg.payload;
              if (!isMounted) return;
              if (data.tenants) setTenants(data.tenants);
              if (data.tenants && data.tenants.length > 0) {
                setActiveTenant(prev => {
                  const found = data.tenants.find((t: any) => t.id === prev?.id);
                  return found || data.tenants[0];
                });
              }
              if (data.contactLists) setContactLists(data.contactLists);
              if (data.contacts) setContacts(data.contacts);
              if (data.campaigns) setCampaigns(data.campaigns);
              if (data.messageLogs) setMessageLogs(data.messageLogs);
              if (data.apiKeys) setApiKeys(data.apiKeys);
              if (data.workflows) setWorkflows(data.workflows);
              if (data.webhookLogs) setWebhookLogs(data.webhookLogs);
              if (data.auditLogs) setAuditLogs(data.auditLogs);
              break;
            }
            case 'UPDATE_TENANTS':
              if (!isMounted) return;
              setTenants(msg.payload);
              setActiveTenant(prev => {
                const found = msg.payload.find((t: any) => t.id === prev?.id);
                return found || msg.payload[0];
              });
              break;
            case 'UPDATE_CONTACT_LISTS':
              if (!isMounted) return;
              setContactLists(msg.payload);
              break;
            case 'UPDATE_CONTACTS':
              if (!isMounted) return;
              setContacts(msg.payload);
              break;
            case 'UPDATE_CAMPAIGNS':
              if (!isMounted) return;
              setCampaigns(msg.payload);
              break;
            case 'UPDATE_MESSAGE_LOGS':
              if (!isMounted) return;
              setMessageLogs(msg.payload);
              break;
            case 'UPDATE_API_KEYS':
              if (!isMounted) return;
              setApiKeys(msg.payload);
              break;
            case 'UPDATE_WORKFLOWS':
              if (!isMounted) return;
              setWorkflows(msg.payload);
              break;
            case 'UPDATE_WEBHOOK_LOGS':
              if (!isMounted) return;
              setWebhookLogs(msg.payload);
              break;
            case 'UPDATE_AUDIT_LOGS':
              if (!isMounted) return;
              setAuditLogs(msg.payload);
              break;
            case 'TOAST':
              if (!isMounted) return;
              setToastEvents(prev => [...prev, msg.payload]);
              setTimeout(() => {
                if (isMounted) {
                  setToastEvents(prev => prev.filter(t => t.id !== msg.payload.id));
                }
              }, 4500);
              break;
            default:
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = (event) => {
        if (!isMounted) return;
        console.warn(`WebSocket connection closed (code: ${event.code}). Reconnecting in ${reconnectDelay}ms...`);
        reconnectTimeout = setTimeout(() => {
          if (!isMounted) return;
          reconnectDelay = Math.min(reconnectDelay * 1.5, 10000); // Exponential backoff capped at 10s
          connectWS();
        }, reconnectDelay);
      };

      socket.onerror = (err) => {
        if (isMounted) {
          console.warn('WebSocket connection temporarily offline (reconnecting automatically)...');
        }
      };
    };

    connectWS();

    return () => {
      isMounted = false;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        try {
          socket.close();
        } catch (e) {}
        socket = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Local storage state hydration for active session login
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('saas_biz_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn("Hydration error on user state: localStorage is blocked or disabled in this iframe container.", e);
    }
  }, []);

  const handleLoginSuccess = (userSession: { firstName: string; lastName: string; email: string; role: 'ADMIN' | 'MANAGER' | 'MEMBER' }) => {
    const fullUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      email: userSession.email,
      firstName: userSession.firstName,
      lastName: userSession.lastName,
      isMfaEnabled: true,
      role: userSession.role
    };
    setCurrentUser(fullUser);
    try {
      localStorage.setItem('saas_biz_user', JSON.stringify(fullUser));
    } catch (e) {
      console.warn("Local storage write blocked or disabled in this iframe container.", e);
    }

    // Audit trace
    appendAuditLog(userSession.email, 'USER_SIGN_IN_MFA_SUCCESS');
  };

  const handleLogout = () => {
    if (currentUser) {
      appendAuditLog(currentUser.email, 'USER_LOGOUT_TRACE');
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('saas_biz_user');
    } catch (e) {
      console.warn("Local storage removal blocked or disabled in this iframe container.", e);
    }
  };

  // Helper actions
  const appendAuditLog = (userEmail: string, action: string) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userEmail,
      action,
      ipAddress: '197.232.145.89',
      timestamp: new Date().toISOString()
    };
    
    // Optimistic local update
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const triggerFloatNotification = (title: string, message: string, type: 'success' | 'alert' = 'success') => {
    const newToast = { id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, title, message, type };
    setToastEvents(prev => [...prev, newToast]);

    // Omit after 4.5 seconds
    setTimeout(() => {
      setToastEvents(prev => prev.filter(t => t.id !== newToast.id));
    }, 4500);
  };

  // State modification callbacks routed to backend
  const handleAddContactList = (newList: ContactList) => {
    fetch('/api/contact-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newList)
    }).catch(err => console.error('Error adding contact list:', err));
  };

  const handleDeleteContactList = (id: string) => {
    fetch(`/api/contact-lists/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting contact list:', err));
  };

  const handleAddCampaign = (camp: Campaign) => {
    fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(camp)
    }).catch(err => console.error('Error adding campaign:', err));
  };

  const handleUpdateCampaignStatus = (id: string, status: Campaign['status']) => {
    fetch(`/api/campaigns/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(err => console.error('Error updating campaign status:', err));
  };

  const handleRetryCampaign = (id: string) => {
    fetch(`/api/campaigns/${id}/retry`, {
      method: 'POST'
    }).catch(err => console.error('Error retrying campaign:', err));
  };

  const handleDeleteCampaign = (id: string) => {
    fetch(`/api/campaigns/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting campaign:', err));
  };

  const handleAddContact = (cont: Contact) => {
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cont)
    }).catch(err => console.error('Error adding contact:', err));
  };

  const handleAddBulkContacts = (list: Contact[], strategy?: 'MERGE' | 'SKIP' | 'OVERWRITE', targetGroupIds?: string[]) => {
    fetch('/api/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: list, strategy: strategy || 'MERGE', targetGroupIds: targetGroupIds || [] })
    }).catch(err => console.error('Error bulk adding contacts:', err));
  };

  const handleDeleteContact = (id: string) => {
    fetch(`/api/contacts/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting contact:', err));
  };

  const handleCreateAPIKey = (key: APIKey) => {
    fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(key)
    }).catch(err => console.error('Error creating API key:', err));
  };

  const handleDeleteAPIKey = (id: string) => {
    fetch(`/api/api-keys/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting API key:', err));
  };

  const handleAddWorkflow = (wf: AutomationWorkflow) => {
    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf)
    }).catch(err => console.error('Error creating workflow:', err));
  };

  const handleToggleWorkflowStatus = (id: string) => {
    fetch(`/api/workflows/${id}/toggle`, {
      method: 'POST'
    }).catch(err => console.error('Error toggling workflow:', err));
  };

  const handleDeleteWorkflow = (id: string) => {
    fetch(`/api/workflows/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting workflow:', err));
  };

  const handleUpgradePlan = (plan: Tenant['plan']) => {
    fetch('/api/billing/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    }).catch(err => console.error('Error upgrading plan:', err));
  };

  const handleTopupBalance = (amount: number) => {
    fetch('/api/billing/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, phone: '+254711223344' })
    }).catch(err => console.error('Error topping up balance:', err));
  };

  const handleChargeWallet = (amount: number): boolean => {
    if (activeTenant.balance < amount) return false;
    // Handled properly in campaign dispatch server side
    return true;
  };

  const handleUpdateTenantName = (name: string) => {
    fetch('/api/tenant/update-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).catch(err => console.error('Error updating company name:', err));
  };

  const handleTriggerApiSMS = (to: string, message: string) => {
    fetch('/api/trigger-api-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message })
    }).catch(err => console.error('Error triggering transactional API SMS:', err));
  };

  const handleAddWebhookLog = (log: WebhookLog) => {
    fetch('/api/webhook-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    }).catch(err => console.error('Error adding webhook log:', err));
  };

  const handleTriggerSimulatedRun = (name: string, summary: string) => {
    fetch('/api/workflows/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, summary })
    }).catch(err => console.error('Error triggering simulated run:', err));
  };

  // If user session is empty, prompt Authentication interface (Module 1)
  if (!currentUser) {
    return <AuthenticationScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // If session is active but initial data/tenant load has not resolved yet, display a elegant full-screen loading portal
  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400 tracking-widest uppercase animate-pulse">Synchronizing Workspace Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Toast Notification Container Widget */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2.5 max-w-sm w-full pointer-events-none">
        {toastEvents.map((toast) => (
          <div
            key={toast.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex items-start gap-3 pointer-events-auto transition-transform hover:scale-[1.01]"
          >
            <div className={`p-1.5 rounded-lg ${toast.type === 'success' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <BellRing className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <span className="font-bold text-slate-200 block">{toast.title}</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToastEvents(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-500 hover:text-slate-300 cursor-pointer pointer-events-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Sidebar workspace navigator (Module 2) */}
      <Sidebar
        tenants={tenants}
        activeTenant={activeTenant}
        onTenantChange={setActiveTenant}
        activeView={activeView}
        onViewChange={setActiveView}
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Primary Workspace Panel viewport */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto h-screen max-w-7xl mx-auto w-full">
        {activeView === 'dashboard' && (
          <DashboardOverview
            campaigns={campaigns}
            messageLogs={messageLogs}
            onNavigateToCampaigns={() => setActiveView('campaigns')}
            onNavigateToAPI={() => setActiveView('api-platform')}
          />
        )}

        {activeView === 'campaigns' && (
          <CampaignHub
            campaigns={campaigns}
            contacts={contacts}
            contactLists={contactLists}
            onAddCampaign={handleAddCampaign}
            onUpdateCampaignStatus={handleUpdateCampaignStatus}
            onRetryCampaign={handleRetryCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            onAddContactList={handleAddContactList}
            walletBalance={activeTenant.balance}
            onChargeWallet={handleChargeWallet}
          />
        )}

        {activeView === 'whatsapp' && (
          <WhatsAppManager
            contacts={contacts}
            contactLists={contactLists}
            campaigns={campaigns}
            activeTenant={activeTenant}
          />
        )}

        {activeView === 'contacts' && (
          <ContactsManager
            contacts={contacts}
            contactLists={contactLists}
            activeTenant={activeTenant}
            onAddContact={handleAddContact}
            onAddBulkContacts={handleAddBulkContacts}
            onDeleteContact={handleDeleteContact}
            onAddContactList={handleAddContactList}
            onDeleteContactList={handleDeleteContactList}
          />
        )}

        {activeView === 'automation' && (
          <AutomationCenter
            workflows={workflows}
            onAddWorkflow={handleAddWorkflow}
            onToggleWorkflowStatus={handleToggleWorkflowStatus}
            onDeleteWorkflow={handleDeleteWorkflow}
            onTriggerSimulatedRun={handleTriggerSimulatedRun}
          />
        )}

        {activeView === 'api-platform' && (
          <DeveloperConsole
            apiKeys={apiKeys}
            onCreateAPIKey={handleCreateAPIKey}
            onDeleteAPIKey={handleDeleteAPIKey}
            webhookLogs={webhookLogs}
            onTriggerApiSMS={handleTriggerApiSMS}
            onAddWebhookLog={handleAddWebhookLog}
          />
        )}

        {activeView === 'billing' && (
          <BillingDashboard
            activeTenant={activeTenant}
            onUpgradePlan={handleUpgradePlan}
            onTopupBalance={handleTopupBalance}
          />
        )}

        {activeView === 'settings' && (
          <WorkspaceSettings
            activeTenant={activeTenant}
            onUpdateTenantName={handleUpdateTenantName}
            currentUser={currentUser}
          />
        )}

        {activeView === 'superadmin' && currentUser.role === 'ADMIN' && (
          <PlatformAdminPortal auditLogs={auditLogs} />
        )}
      </main>
    </div>
  );
}
