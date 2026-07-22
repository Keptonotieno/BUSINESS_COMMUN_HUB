import React, { useState } from 'react';
import { AutomationWorkflow } from '../types';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Play, 
  ToggleLeft, 
  ToggleRight, 
  Clock, 
  Mail, 
  MessageSquare, 
  Sparkles,
  ArrowDown,
  Activity,
  PlusCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface AutomationCenterProps {
  workflows: AutomationWorkflow[];
  onAddWorkflow: (workflow: AutomationWorkflow) => void;
  onToggleWorkflowStatus: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onTriggerSimulatedRun: (name: string, summary: string) => void;
}

export default function AutomationCenter({
  workflows,
  onAddWorkflow,
  onToggleWorkflowStatus,
  onDeleteWorkflow,
  onTriggerSimulatedRun
}: AutomationCenterProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.id || '');
  
  // Create workflow states
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newTrigger, setNewTrigger] = useState<'BIRTHDAY' | 'SIGNUP' | 'RENEWAL'>('SIGNUP');

  // Trigger Node select State
  const activeWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    const newWorkflow: AutomationWorkflow = {
      id: `w-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: newWorkflowName,
      trigger: newTrigger,
      status: 'DRAFT',
      steps: [
        {
          id: `step-init-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'SEND_SMS',
          config: { template: 'Hello {{first_name}}, this is your triggered campaign notice.' }
        }
      ],
      createdAt: new Date().toISOString()
    };

    onAddWorkflow(newWorkflow);
    setSelectedWorkflowId(newWorkflow.id);
    setNewWorkflowName('');
  };

  const addStepToActiveWorkflow = (type: 'SEND_SMS' | 'SEND_EMAIL' | 'DELAY') => {
    if (!activeWorkflow) return;
    
    let newStepConfig = {};
    if (type === 'SEND_SMS') {
      newStepConfig = { template: 'Personalized SMS message content...' };
    } else if (type === 'SEND_EMAIL') {
      newStepConfig = { subject: 'Followup notification', template: 'Email template content...' };
    } else {
      newStepConfig = { value: 2, unit: 'days' };
    }

    activeWorkflow.steps.push({
      id: `step-${Date.now()}-${Math.random()}`,
      type,
      config: newStepConfig
    });

    // Simple re-trigger re-render
    onToggleWorkflowStatus(activeWorkflow.id);
    onToggleWorkflowStatus(activeWorkflow.id);
  };

  // Simulate an event (e.g. mock member signup / birthday) triggering this specific workflow
  const executeSimulatedWorkflow = () => {
    if (!activeWorkflow) return;
    if (activeWorkflow.status === 'DRAFT') {
      alert('This automation is in DRAFT mode. Set it to ACTIVE to allow event triggering!');
      return;
    }

    // Trigger simulation notification hook in parent
    const stepsCount = activeWorkflow.steps.length;
    const actions = activeWorkflow.steps.map(s => s.type).join(' ➔ ');
    onTriggerSimulatedRun(
      activeWorkflow.name,
      `Trigger [${activeWorkflow.trigger}] processed successfully. Completed ${stepsCount} sequence blocks: ${actions}.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-xl font-bold font-sans text-slate-100 tracking-tight">Marketing Automation</h2>
        <p className="text-xs text-slate-400 mt-1">
          Orchestrate automated triggers, drip schedules, and multi-channel campaign loops.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left list of workflows */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Automations Inventory</h3>

            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
              {workflows.map((w) => {
                const isSelected = selectedWorkflowId === w.id;
                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWorkflowId(w.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-slate-850 bg-slate-950/20 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate leading-tight block">
                        {w.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWorkflowStatus(w.id);
                        }}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {w.status === 'ACTIVE' ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2">
                      <span>Trigger: {w.trigger}</span>
                      <span>{w.steps.length} flow block{w.steps.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Create Workflow form */}
            <form onSubmit={handleCreateWorkflow} className="border-t border-slate-900 pt-4 space-y-3">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Quick Build Workflow</h4>
              
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  required
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  placeholder="e.g., Lapsed Debtor Alert"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />

                <div className="grid grid-cols-3 gap-2">
                  {(['SIGNUP', 'BIRTHDAY', 'RENEWAL'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewTrigger(t)}
                      className={`py-1 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        newTrigger === t 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                          : 'border-slate-850 bg-slate-950/20 text-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Initialize Workflow
              </button>
            </form>
          </div>
        </div>

        {/* Right Active Workflow interactive workspace block */}
        <div className="lg:col-span-2 space-y-4">
          {activeWorkflow ? (
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-200">
                    {activeWorkflow.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase">
                    Execution Node Board — status: <span className={activeWorkflow.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'}>{activeWorkflow.status}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={executeSimulatedWorkflow}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-xs font-semibold text-cyan-400 rounded-lg cursor-pointer transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Trigger Simulated Event
                  </button>

                  <button
                    onClick={() => onDeleteWorkflow(activeWorkflow.id)}
                    className="p-1.5 bg-slate-950 border border-slate-900 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                    title="Delete workflow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic Interactive Node Blocks Visualizer */}
              <div className="space-y-3 flex flex-col items-center py-4 bg-slate-950/20 rounded-xl border border-slate-900/60">
                {/* Trigger Start Node */}
                <div className="w-full max-w-sm p-3 bg-slate-900 border border-cyan-500/20 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 rounded-full blur-xs" />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-cyan-500/10 text-cyan-400 rounded-md flex items-center justify-center font-bold text-xs font-mono">
                      TRG
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Workflow Entrance Node</span>
                      <span className="text-xs font-bold text-slate-200">Event Trigger: {activeWorkflow.trigger}</span>
                    </div>
                  </div>
                </div>

                <ArrowDown className="w-5 h-5 text-slate-700 animate-bounce" />

                {/* Steps Loop */}
                {activeWorkflow.steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="w-full max-w-sm p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl shadow-md relative group">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                          step.type === 'SEND_SMS' 
                            ? 'bg-cyan-500/10 text-cyan-400' 
                            : step.type === 'SEND_EMAIL' 
                              ? 'bg-indigo-500/10 text-indigo-400' 
                              : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {step.type === 'SEND_SMS' && <MessageSquare className="w-4 h-4" />}
                          {step.type === 'SEND_EMAIL' && <Mail className="w-4 h-4" />}
                          {step.type === 'DELAY' && <Clock className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 min-w-0 text-xs">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                            Sequence block #{index + 1} — {step.type}
                          </span>
                          
                          {step.type === 'DELAY' ? (
                            <span className="text-slate-300 font-semibold mt-1 block">
                              Wait {step.config.value} {step.config.unit || 'days'}
                            </span>
                          ) : (
                            <p className="text-slate-400 truncate mt-1 font-mono text-[11px]">
                              {step.config.template || 'Message content body template...'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {index < activeWorkflow.steps.length - 1 && (
                      <ArrowDown className="w-5 h-5 text-slate-800" />
                    )}
                  </React.Fragment>
                ))}

                {/* Action Block Appender */}
                <div className="pt-4 mt-2 border-t border-slate-900 w-full max-w-sm flex flex-col items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block text-center">Append Node Block</span>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      onClick={() => addStepToActiveWorkflow('SEND_SMS')}
                      className="py-1 px-2 border border-slate-850 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      + Send SMS
                    </button>
                    <button
                      onClick={() => addStepToActiveWorkflow('SEND_EMAIL')}
                      className="py-1 px-2 border border-slate-850 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-indigo-400 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      + Send Email
                    </button>
                    <button
                      onClick={() => addStepToActiveWorkflow('DELAY')}
                      className="py-1 px-2 border border-slate-850 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-amber-400 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                    >
                      + Delay Wait
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/15 border border-dashed border-slate-850 rounded-2xl">
              <p className="text-slate-500 text-xs font-mono">Select or build a marketing automation stream.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
