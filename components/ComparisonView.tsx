import React, { useMemo } from 'react';
import { Arrangement, ExternalService, ValidationStatus, RuleStatus, EvaluatedRule } from '../types';
import { GitCompare, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { evaluateRule } from '../App';

interface ComparisonViewProps {
  arrangementA: Arrangement;
  arrangementB: Arrangement | null;
  allArrangements: Arrangement[];
  onSelectB: (id: string) => void;
  onClose: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ 
  arrangementA, 
  arrangementB, 
  allArrangements, 
  onSelectB,
  onClose
}) => {

  const getServiceDiff = () => {
    if (!arrangementB) return { uniqueA: [], uniqueB: [], common: [] };
    
    const setA = new Set(arrangementA.services.map(s => s.id));
    const setB = new Set(arrangementB.services.map(s => s.id));
    
    const uniqueA = arrangementA.services.filter(s => !setB.has(s.id));
    const uniqueB = arrangementB.services.filter(s => !setA.has(s.id));
    const common = arrangementA.services.filter(s => setB.has(s.id));
    
    return { uniqueA, uniqueB, common };
  };

  const { uniqueA, uniqueB, common } = getServiceDiff();

  // Compute Rules for A
  const rulesA = useMemo(() => {
     return arrangementA.container.activeRules.map(r => evaluateRule(r, arrangementA.services));
  }, [arrangementA]);

  // Compute Rules for B
  const rulesB = useMemo(() => {
     if (!arrangementB) return [];
     return arrangementB.container.activeRules.map(r => evaluateRule(r, arrangementB.services));
  }, [arrangementB]);

  return (
    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col p-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <GitCompare className="text-indigo-400" />
          Arrangement Comparator
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">Close</button>
      </div>

      <div className="grid grid-cols-2 gap-8 h-full overflow-hidden">
        {/* Left Side: A */}
        <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/50 flex flex-col">
          <div className="mb-4 pb-4 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-indigo-300">{arrangementA.name}</h3>
            <p className="text-sm text-slate-400 mt-1 font-mono">{arrangementA.container.versionLabel}</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4">
             <div className="bg-slate-900 p-4 rounded border border-slate-700">
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Hypothesis</h4>
                <p className="text-slate-300 italic">"{arrangementA.container.hypothesis}"</p>
             </div>
             
             <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Rules Evaluation</h4>
                <div className="space-y-2">
                    {rulesA.map(r => <RuleStatusRow key={r.id} rule={r} />)}
                </div>
             </div>

             <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Exclusive Services</h4>
                {uniqueA.length === 0 && <p className="text-slate-600 text-sm">None</p>}
                {uniqueA.map(s => <ServiceCard key={s.id} service={s} isRemoved={true} />)}
             </div>
          </div>
        </div>

        {/* Right Side: B */}
        <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/50 flex flex-col">
          <div className="mb-4 pb-4 border-b border-slate-700">
            <select 
                className="bg-slate-900 border border-slate-600 text-white rounded p-2 w-full text-lg font-semibold"
                value={arrangementB?.id || ''}
                onChange={(e) => onSelectB(e.target.value)}
            >
                <option value="" disabled>Select arrangement to compare...</option>
                {allArrangements.filter(a => a.id !== arrangementA.id).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.container.versionLabel})</option>
                ))}
            </select>
          </div>
          
          {arrangementB ? (
             <div className="flex-1 overflow-y-auto space-y-4">
                <div className="bg-slate-900 p-4 rounded border border-slate-700">
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Hypothesis</h4>
                    <p className="text-slate-300 italic">"{arrangementB.container.hypothesis}"</p>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Rules Evaluation</h4>
                    <div className="space-y-2">
                         {rulesB.map(r => <RuleStatusRow key={r.id} rule={r} />)}
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">New / Exclusive Services</h4>
                    {uniqueB.length === 0 && <p className="text-slate-600 text-sm">None</p>}
                    {uniqueB.map(s => <ServiceCard key={s.id} service={s} isAdded={true} />)}
                </div>
             </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
                Select an arrangement to begin comparison
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RuleStatusIcon = ({ status }: { status: RuleStatus }) => {
    switch (status) {
        case RuleStatus.SATISFIED: return <CheckCircle size={16} className="text-emerald-500" />;
        case RuleStatus.VIOLATED: return <AlertTriangle size={16} className="text-red-500" />;
        case RuleStatus.NOT_EVALUABLE: return <HelpCircle size={16} className="text-slate-500" />;
    }
};

const RuleStatusRow = ({ rule }: { rule: EvaluatedRule }) => {
    const textColor = rule.status === RuleStatus.VIOLATED ? 'text-red-300' : 
                      rule.status === RuleStatus.SATISFIED ? 'text-emerald-300' : 'text-slate-300';
    return (
        <div className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm">
                <RuleStatusIcon status={rule.status} />
                <span className={textColor}>
                    {rule.description}
                </span>
            </div>
            {rule.matchingServices.length > 0 && (
                <span className="text-xs text-slate-600 font-mono" title={`Satisfied by ${rule.matchingServices.join(', ')}`}>
                   {rule.matchingServices.length} Svc
                </span>
            )}
        </div>
    );
};

const StatusIcon = ({ status }: { status: ValidationStatus }) => {
    switch (status) {
        case ValidationStatus.VALIDATED: return <CheckCircle size={16} className="text-emerald-500" />;
        case ValidationStatus.CONFLICT: return <AlertTriangle size={16} className="text-red-500" />;
        case ValidationStatus.UNCERTAIN: return <HelpCircle size={16} className="text-slate-500" />;
    }
};

const ServiceCard = ({ service, isAdded, isRemoved }: { service: ExternalService, isAdded?: boolean, isRemoved?: boolean }) => {
    const borderClass = isAdded ? 'border-emerald-500/50 bg-emerald-900/10' : isRemoved ? 'border-red-500/50 bg-red-900/10' : 'border-slate-700';
    const textClass = isAdded ? 'text-emerald-300' : isRemoved ? 'text-red-300' : 'text-slate-300';
    
    return (
        <div className={`p-3 rounded border ${borderClass} mb-2 flex flex-col`}>
            <div className="flex justify-between items-center">
                <div>
                    <span className={`font-medium ${textClass}`}>{service.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{service.type}</span>
                </div>
                <div className="flex items-center gap-2">
                     <StatusIcon status={service.evaluationStatus} />
                    {service.isExperimental && <span className="text-xs bg-amber-900/50 text-amber-500 px-2 py-0.5 rounded">Exp</span>}
                </div>
            </div>
            <div className="mt-2 text-xs text-slate-500 pl-2 border-l-2 border-slate-700">
                {service.contractMetrics.join(", ")}
            </div>
        </div>
    );
};