import React, { useState } from 'react';
import { Tenant } from '../types';
import { 
  CreditCard, 
  Check, 
  HelpCircle, 
  Wallet, 
  Phone, 
  Loader2, 
  CheckCircle2, 
  Download, 
  FileText,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';

interface BillingDashboardProps {
  activeTenant: Tenant;
  onUpgradePlan: (plan: Tenant['plan']) => void;
  onTopupBalance: (amount: number) => void;
}

export default function BillingDashboard({
  activeTenant,
  onUpgradePlan,
  onTopupBalance
}: BillingDashboardProps) {
  // M-Pesa Topup simulation states
  const [amount, setAmount] = useState('5000');
  const [phoneNumber, setPhoneNumber] = useState('+254712345678');
  const [stkPushState, setStkPushState] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [stkTimer, setStkTimer] = useState(3);

  const plans = [
    { id: 'FREE_TRIAL', name: 'Free Trial', price: 'KES 0', desc: 'Perfect for sandbox testing', features: ['100 SMS Credits', '1 API Key Scope', 'Email Channels Only'] },
    { id: 'STARTER', name: 'Starter Plan', price: 'KES 2,500/mo', desc: 'Best for early-stage SMEs', features: ['1,000 SMS credits', '2 Workspaces', 'Bulk CSV uploaders'] },
    { id: 'PROFESSIONAL', name: 'Professional', price: 'KES 7,500/mo', desc: 'Best for growing corporate teams', features: ['Unlimited SMS queues', 'WhatsApp Cloud API support', '3 Scopes developer access', 'Auto-Rerouting SLA'] },
    { id: 'BUSINESS', name: 'Business Plan', price: 'KES 18,000/mo', desc: 'Premium suite for large firms', features: ['Pre-assigned Sender IDs', 'Relational database scale', 'Unlimited teammates', 'Priority Queues', 'Dedicated webhook instances'] },
  ];

  const handleMpesaTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    setStkPushState('PROCESSING');
    setStkTimer(3);

    // Simulated countdown for M-Pesa STK push prompt pin entry
    const interval = setInterval(() => {
      setStkTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStkPushState('SUCCESS');
          onTopupBalance(Number(amount));
          
          setTimeout(() => {
            setStkPushState('IDLE');
          }, 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-bold font-sans text-slate-100 tracking-tight">Subscription & Billing</h2>
        <p className="text-xs text-slate-400 mt-1">
          Top up transactional balances using M-Pesa, configure subscription tiers, and review corporate receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns 1 & 2: M-Pesa dynamic gateway widget and Invoice list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mpesa Topup Gateway card */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200">M-Pesa STK Push Express</h3>
            </div>

            {stkPushState === 'IDLE' && (
              <form onSubmit={handleMpesaTopup} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400">Top Up Amount (KES)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 5000"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block text-slate-400">Safaricom E.164 Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+254712345678"
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="sm:col-span-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/10 cursor-pointer transition-colors text-center"
                >
                  Trigger M-Pesa Payment Push
                </button>
              </form>
            )}

            {stkPushState === 'PROCESSING' && (
              <div className="py-6 text-center space-y-3.5">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-slate-200">STK Push Requested...</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Check Safaricom phone <span className="font-mono text-cyan-400">{phoneNumber}</span> and enter your M-Pesa PIN to complete the transaction of <span className="font-semibold text-slate-200">KES {Number(amount).toLocaleString()}</span>.
                  </p>
                </div>
                <span className="inline-block text-[10px] font-mono bg-slate-950 text-slate-500 px-2.5 py-0.5 rounded">
                  Response Loop Timeout in {stkTimer}s
                </span>
              </div>
            )}

            {stkPushState === 'SUCCESS' && (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-emerald-400">Payment Processed Successfully!</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Updated Sacco Wallet Index balance: KES {(activeTenant.balance + Number(amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Receipts / Invoices list panel */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Receipts & billing invoices ledger</h3>
            
            <div className="divide-y divide-slate-900 text-xs">
              <div className="py-3 flex items-center justify-between hover:bg-slate-850/10 rounded px-1 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-bold text-slate-200 block">M-Pesa Wallet Topup #MP-98401</span>
                    <span className="text-[10px] text-slate-500 font-mono">Completed on 2026-07-21 05:20 UTC</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-300">KES 5,000.00</span>
                  <button className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between hover:bg-slate-850/10 rounded px-1 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-bold text-slate-200 block">SaaS Business Annual Subscription</span>
                    <span className="text-[10px] text-slate-500 font-mono">Completed on 2026-07-01 12:00 UTC</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-300">KES 18,000.00</span>
                  <button className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between hover:bg-slate-850/10 rounded px-1 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-bold text-slate-200 block">M-Pesa Wallet Topup #MP-10292</span>
                    <span className="text-[10px] text-slate-500 font-mono">Completed on 2026-06-15 09:00 UTC</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-slate-300">KES 10,000.00</span>
                  <button className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Plan Matrix */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Subscription Upgrades</h3>
            
            <div className="space-y-3.5">
              {plans.map((p) => {
                const isActive = activeTenant.plan === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isActive 
                        ? 'border-cyan-500 bg-cyan-500/5' 
                        : 'border-slate-850 bg-slate-950/20'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{p.name}</span>
                        <span className="text-[10px] text-slate-500 block">{p.desc}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-cyan-400">{p.price}</span>
                    </div>

                    <ul className="mt-3 space-y-1 text-[10px] text-slate-400">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {!isActive && (
                      <button
                        onClick={() => onUpgradePlan(p.id as Tenant['plan'])}
                        className="w-full mt-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-slate-100 font-semibold text-[10px] rounded cursor-pointer transition-colors"
                      >
                        Request Upgrade Tier
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
