import React, { useState, useCallback, useMemo } from 'react';
import { INITIAL_ARRANGEMENTS, MOCK_SERVICES } from './constants';
import { Arrangement, EntityType, ServiceType, ValidationStatus, ExternalService, Rule, RuleStatus, EvaluatedRule } from './types';
import { GraphCanvas } from './components/GraphCanvas';
import { ComparisonView } from './components/ComparisonView';
import { 
  GitBranch, 
  Layers, 
  Plus, 
  Activity, 
  AlertOctagon, 
  Box, 
  Search,
  Maximize2,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  RotateCw,
  Scale
} from 'lucide-react';

// --- Logic Layer: Rule Evaluation Engine ---

/**
 * Evaluates a single rule against a set of services based on the contract metrics.
 * Rules are predicates: Does the contract satisfy the matcher?
 */
export const evaluateRule = (rule: Rule, services: ExternalService[]): EvaluatedRule => {
  // 1. Find services that claim to satisfy this metric
  const relevantServices = services.filter(s => 
    s.contractMetrics.some(metric => metric.toLowerCase().includes(rule.matcher.toLowerCase()))
  );

  let status: RuleStatus = RuleStatus.NOT_EVALUABLE;

  if (relevantServices.length === 0) {
    // No service provides the required capability
    status = rule.severity === 'CRITICAL' ? RuleStatus.VIOLATED : RuleStatus.NOT_EVALUABLE;
  } else {
    // Check the Evaluation Status of the providing services
    const hasConflict = relevantServices.some(s => s.evaluationStatus === ValidationStatus.CONFLICT);
    const hasUncertainty = relevantServices.some(s => s.evaluationStatus === ValidationStatus.UNCERTAIN);
    
    if (hasConflict) {
      status = RuleStatus.VIOLATED; // A service claims it, but is in conflict
    } else if (hasUncertainty) {
      status = RuleStatus.NOT_EVALUABLE; // We can't be sure yet
    } else {
      status = RuleStatus.SATISFIED; // All relevant services are Validated
    }
  }

  return {
    ...rule,
    status,
    matchingServices: relevantServices.map(s => s.name)
  };
};

export const getEvaluatedRules = (arrangement: Arrangement): EvaluatedRule[] => {
  return arrangement.container.activeRules.map(rule => evaluateRule(rule, arrangement.services));
};

// --- Component ---

export default function App() {
  const [arrangements, setArrangements] = useState<Arrangement[]>(INITIAL_ARRANGEMENTS);
  const [activeArrangementId, setActiveArrangementId] = useState<string>(INITIAL_ARRANGEMENTS[0].id);
  const [showComparison, setShowComparison] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  
  // Selection State for Details Panel
  const [selectedEntity, setSelectedEntity] = useState<{ type: EntityType, id: string } | null>(null);

  const activeArrangement = useMemo(() => 
    arrangements.find(a => a.id === activeArrangementId)!, 
  [arrangements, activeArrangementId]);

  // Derived State: Evaluated Rules
  const activeRules = useMemo(() => 
    getEvaluatedRules(activeArrangement),
  [activeArrangement]);

  // Actions
  const handleFork = () => {
    const newId = `arr-${Date.now()}`;
    const fork: Arrangement = {
      ...activeArrangement,
      id: newId,
      name: `${activeArrangement.name} (Fork)`,
      // Deep clone services to allow independent status modification
      services: activeArrangement.services.map(s => ({...s})),
      container: {
        ...activeArrangement.container,
        id: `cont-${Date.now()}`,
        versionLabel: `${activeArrangement.container.versionLabel}.1`,
        hypothesis: 'Exploratory fork to test new boundary conditions.'
      },
      parentId: activeArrangement.id,
      createdAt: Date.now(),
    };
    setArrangements(prev => [...prev, fork]);
    setActiveArrangementId(newId);
  };

  const handleToggleService = (serviceId: string) => {
    setArrangements(prev => prev.map(arr => {
      if (arr.id !== activeArrangementId) return arr;
      
      const exists = arr.services.find(s => s.id === serviceId);
      let newServices;
      if (exists) {
        newServices = arr.services.filter(s => s.id !== serviceId);
        // Deselect if removing selected
        if (selectedEntity?.id === serviceId) setSelectedEntity(null);
      } else {
        const svcTemplate = MOCK_SERVICES.find(s => s.id === serviceId);
        if (!svcTemplate) return arr;
        // Clone the service so its status is independent in this arrangement
        const svcToAdd = { ...svcTemplate }; 
        newServices = [...arr.services, svcToAdd];
      }
      
      return { ...arr, services: newServices };
    }));
  };

  const handleUpdateHypothesis = (text: string) => {
    setArrangements(prev => prev.map(arr => {
      if (arr.id !== activeArrangementId) return arr;
      return {
        ...arr,
        container: { ...arr.container, hypothesis: text }
      };
    }));
  };

  const handleCycleStatus = (serviceId: string) => {
    setArrangements(prev => prev.map(arr => {
        if (arr.id !== activeArrangementId) return arr;
        return {
            ...arr,
            services: arr.services.map(s => {
                if (s.id !== serviceId) return s;
                // Cycle: VALIDATED -> CONFLICT -> UNCERTAIN -> VALIDATED
                let nextStatus = ValidationStatus.VALIDATED;
                if (s.evaluationStatus === ValidationStatus.VALIDATED) nextStatus = ValidationStatus.CONFLICT;
                else if (s.evaluationStatus === ValidationStatus.CONFLICT) nextStatus = ValidationStatus.UNCERTAIN;
                
                return { ...s, evaluationStatus: nextStatus };
            })
        }
    }));
  };

  const getActiveEntityData = () => {
    if (!selectedEntity) return null;
    if (selectedEntity.type === EntityType.CONTAINER) {
      return { 
        data: activeArrangement.container, 
        label: 'Container Version',
        details: activeRules // Pass evaluated rules here
      };
    } else {
      const svc = activeArrangement.services.find(s => s.id === selectedEntity.id);
      return svc ? { data: svc, label: 'External Service', details: svc.contractMetrics } : null;
    }
  };

  const selectedData = getActiveEntityData();

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* Sidebar: Arrangement Selector */}
      <div className="w-64 border-r border-slate-700 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight text-indigo-400 flex items-center gap-2">
            <Box size={20} />
            Arch.Explorer
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {arrangements.map(arr => (
            <button
              key={arr.id}
              onClick={() => setActiveArrangementId(arr.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors border ${
                activeArrangementId === arr.id 
                  ? 'bg-indigo-900/30 border-indigo-500/50' 
                  : 'hover:bg-slate-900 border-transparent hover:border-slate-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm block truncate">{arr.name}</span>
                {arr.parentId && <GitBranch size={12} className="text-slate-500 mt-1" />}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-mono">{arr.container.versionLabel}</div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleFork}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded text-sm font-medium transition-colors"
          >
            <GitBranch size={16} />
            Fork Version
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Comparison Overlay */}
        {showComparison && (
            <ComparisonView 
                arrangementA={activeArrangement}
                arrangementB={arrangements.find(a => a.id === compareId) || null}
                allArrangements={arrangements}
                onSelectB={setCompareId}
                onClose={() => setShowComparison(false)}
            />
        )}

        {/* Toolbar */}
        <div className="h-14 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-900">
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-400">
                Current: <span className="text-white font-medium">{activeArrangement.name}</span>
             </div>
             <span className="h-4 w-px bg-slate-700"></span>
             <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-slate-400"><div className="w-2 h-2 rounded-full bg-emerald-500 opacity-20 border border-emerald-500"></div> Valid</span>
                <span className="flex items-center gap-1 text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-400 dashed"></div> Uncertain</span>
                <span className="flex items-center gap-1 text-slate-400"><div className="w-2 h-2 rounded-full bg-red-500"></div> Conflict</span>
             </div>
          </div>
          <button 
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded border border-slate-700 hover:bg-slate-800"
          >
            <Maximize2 size={16} />
            Compare
          </button>
        </div>

        {/* Graph Area */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Using a key forces re-render of D3 when arrangement changes, which is safer for this prototype */}
            <GraphCanvas 
              key={activeArrangementId + arrangements.length + JSON.stringify(activeArrangement.services)} 
              arrangement={activeArrangement} 
              width={window.innerWidth - 600} // Approximate width accounting for sidebars
              height={window.innerHeight - 60} 
              onNodeClick={(type, id) => setSelectedEntity({type, id})}
            />
          </div>
          
          {/* Legend / Overlay info */}
          <div className="absolute bottom-6 left-6 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur p-4 rounded border border-slate-700 max-w-sm pointer-events-auto">
               <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Active Hypothesis</h3>
               <textarea 
                 className="w-full bg-transparent text-sm text-slate-200 resize-none outline-none border-b border-dashed border-slate-600 focus:border-indigo-500 transition-colors"
                 rows={3}
                 value={activeArrangement.container.hypothesis}
                 onChange={(e) => handleUpdateHypothesis(e.target.value)}
               />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Inspector */}
      <div className="w-80 border-l border-slate-700 bg-slate-950 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-bold text-slate-200 flex items-center gap-2">
            <Activity size={18} />
            Inspector
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {selectedData ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded">
                {selectedData.label}
              </span>
              <h3 className="text-xl font-bold mt-2 text-white">
                {'versionLabel' in selectedData.data ? selectedData.data.versionLabel : selectedData.data.name}
              </h3>
              
              <div className="mt-6 space-y-6">
                {selectedEntity?.type === EntityType.CONTAINER && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <Scale size={14}/> Rule Evaluation
                    </h4>
                    <div className="space-y-3">
                      {(selectedData.details as EvaluatedRule[]).map((rule) => (
                        <RuleCard key={rule.id} rule={rule} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntity?.type === EntityType.SERVICE && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-500 uppercase">Service Contract</h4>
                        <button 
                            onClick={() => handleCycleStatus((selectedData.data as ExternalService).id)}
                            className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600 transition-colors"
                            title="Manually cycle evaluation status"
                        >
                            <RotateCw size={10} />
                            Status: {(selectedData.data as ExternalService).evaluationStatus}
                        </button>
                    </div>

                    <div className={`p-4 rounded border mb-4 flex flex-col gap-2 ${
                        (selectedData.data as ExternalService).evaluationStatus === ValidationStatus.CONFLICT ? 'bg-red-900/10 border-red-800' :
                        (selectedData.data as ExternalService).evaluationStatus === ValidationStatus.UNCERTAIN ? 'bg-slate-800/30 border-slate-600 border-dashed' :
                        'bg-emerald-900/10 border-emerald-800'
                    }`}>
                        <div className="flex items-center gap-2 mb-2 font-medium">
                             {(selectedData.data as ExternalService).evaluationStatus === ValidationStatus.CONFLICT && <AlertTriangle className="text-red-500" size={16}/>}
                             {(selectedData.data as ExternalService).evaluationStatus === ValidationStatus.UNCERTAIN && <HelpCircle className="text-slate-400" size={16}/>}
                             {(selectedData.data as ExternalService).evaluationStatus === ValidationStatus.VALIDATED && <CheckCircle className="text-emerald-500" size={16}/>}
                             <span className={
                                 (selectedData.data as ExternalService).evaluationStatus === ValidationStatus.CONFLICT ? 'text-red-300' :
                                 (selectedData.data as ExternalService).evaluationStatus === ValidationStatus.UNCERTAIN ? 'text-slate-300' :
                                 'text-emerald-300'
                             }>
                                {(selectedData.data as ExternalService).evaluationStatus}
                             </span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 font-mono">
                        {(selectedData.data as any).contractMetrics.map((m: string, i: number) => (
                            <li key={i}>{m}</li>
                        ))}
                        </ul>
                    </div>
                    
                    {(selectedData.data as any).isExperimental && (
                         <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/50 rounded text-amber-500 text-xs">
                            Experimental Service. Metrics may be unstable.
                         </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 mt-20">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select a node in the graph to view details.</p>
            </div>
          )}
        </div>

        {/* Services Palette (Available Services to Add) */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/50">
           <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
             <Layers size={14} /> Available Services
           </h4>
           <div className="grid grid-cols-1 gap-2">
             {MOCK_SERVICES.map(svc => {
               const isActive = activeArrangement.services.some(s => s.id === svc.id);
               return (
                 <button
                   key={svc.id}
                   onClick={() => handleToggleService(svc.id)}
                   className={`flex items-center justify-between p-2 rounded text-sm transition-all ${
                     isActive 
                       ? 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-200' 
                       : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
                   }`}
                 >
                   <span>{svc.name}</span>
                   {isActive ? (
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   ) : (
                     <Plus size={14} />
                   )}
                 </button>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
}

const RuleCard = ({ rule }: { rule: EvaluatedRule }) => {
    let bgClass = 'bg-slate-900 border-slate-800';
    let textClass = 'text-slate-300';
    let Icon = HelpCircle;
    let iconColor = 'text-slate-500';

    if (rule.status === RuleStatus.SATISFIED) {
        bgClass = 'bg-emerald-900/10 border-emerald-900/50';
        textClass = 'text-emerald-200';
        Icon = CheckCircle;
        iconColor = 'text-emerald-500';
    } else if (rule.status === RuleStatus.VIOLATED) {
        bgClass = 'bg-red-900/10 border-red-900/50';
        textClass = 'text-red-200';
        Icon = AlertTriangle;
        iconColor = 'text-red-500';
    }

    return (
        <div className={`p-3 rounded border ${bgClass} transition-colors`}>
            <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold opacity-70 uppercase tracking-wider">{rule.severity}</span>
                <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${iconColor}`}>{rule.status}</span>
                    <Icon size={14} className={iconColor} />
                </div>
            </div>
            <p className={`text-sm font-medium ${textClass} mb-2`}>
                {rule.description}
            </p>
            <div className="text-xs text-slate-500 font-mono bg-black/20 p-1.5 rounded truncate">
                Matcher: "{rule.matcher}"
            </div>
            {rule.matchingServices.length > 0 ? (
                 <div className="mt-2 text-xs text-slate-400">
                    Via: {rule.matchingServices.join(", ")}
                 </div>
            ) : (
                <div className="mt-2 text-xs text-slate-600 italic">
                    No matching services found
                </div>
            )}
        </div>
    );
};