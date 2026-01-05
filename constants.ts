import { Arrangement, ContainerVersion, ExternalService, Rule, ServiceType, ValidationStatus, EntityType } from './types';

// --- SCENARIO: Healthcare Data Platform Cloud Migration Case Study ---
// Based on real-world data: 45% cost reduction, 10x analytics perf, 30min DR.

// 1. External Services
export const MOCK_SERVICES: ExternalService[] = [
  // --- Legacy On-Premise Services ---
  {
    id: 'svc-onprem-db',
    name: 'Legacy SQL Cluster (On-Prem)',
    type: ServiceType.DATABASE,
    contractMetrics: ['High OpEx Maintenance', '99.5% Uptime', 'Local Compliance Control'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.VALIDATED,
  },
  {
    id: 'svc-onprem-backup',
    name: 'Tape/Local Backup System',
    type: ServiceType.DATABASE,
    contractMetrics: ['DR RTO 48h', 'Manual Restore Process', 'CapEx Heavy'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.VALIDATED,
  },
  {
    id: 'svc-onprem-analytics',
    name: 'Legacy Reporting Server',
    type: ServiceType.API,
    contractMetrics: ['Batch Processing (Overnight)', 'Limited Scale'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.VALIDATED,
  },

  // --- Cloud Migration Services (HIPAA Compliant) ---
  {
    id: 'cloud_storage_HIPAA',
    name: 'Cloud Storage (HIPAA/HITRUST)',
    type: ServiceType.DATABASE,
    contractMetrics: ['Cost Reduced 45%', 'Encryption at Rest', 'Audit Logging', 'Infinite Scale'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.VALIDATED,
  },
  {
    id: 'cloud_analytics_platform',
    name: 'Cloud Analytics Platform',
    type: ServiceType.API,
    contractMetrics: ['Performance 10x Increase', 'Predictive Insights', 'Real-time Processing'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.VALIDATED,
  },
  {
    id: 'cloud_backup_DR',
    name: 'Cloud DR & Failover',
    type: ServiceType.QUEUE,
    contractMetrics: ['DR RTO 30min', 'Auto-Failover', '99.99% Availability'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.VALIDATED,
  },
  
  // --- The Human/Process Tension ---
  {
    id: 'human_consistency_review',
    name: 'Clinical Consistency Review',
    type: ServiceType.AUTH,
    contractMetrics: ['Manual Validation Required', 'Cognitive Load: High', 'Risk: Human Error'],
    isExperimental: false,
    evaluationStatus: ValidationStatus.UNCERTAIN, // Uncertain due to dependency on human factors vs AI assist
  }
];

// 2. Rules (Key Drivers for Migration)
const MIGRATION_DRIVERS: Rule[] = [
  { 
    id: 'r_cost', 
    description: 'Infrastructure Cost Efficiency', 
    severity: 'WARNING', 
    matcher: 'Cost' // Matches "High OpEx" and "Cost Reduced 45%"
  },
  { 
    id: 'r_dr', 
    description: 'Disaster Recovery Standards', 
    severity: 'CRITICAL', 
    matcher: 'DR' // Matches "DR RTO 48h" and "DR RTO 30min"
  },
  { 
    id: 'r_perf', 
    description: 'Analytics Performance', 
    severity: 'WARNING', 
    matcher: 'Performance' // Matches "Performance 10x"
  },
  { 
    id: 'r_comp', 
    description: 'Regulatory Compliance (HIPAA)', 
    severity: 'CRITICAL', 
    matcher: 'Compliance' // Matches "Local Compliance" and implied in Cloud certs (manual verification context)
  },
  {
    id: 'r_valid',
    description: 'Clinical Data Integrity',
    severity: 'CRITICAL',
    matcher: 'Validation' // Matches "Manual Validation"
  }
];

// 3. Containers (Hypotheses)

const CONT_LEGACY: ContainerVersion = {
  id: 'container_legacy_hospital_on_prem',
  versionLabel: 'v1.0-Legacy-Baseline',
  hypothesis: 'Traditional infrastructure offers maximum control but suffers from high costs (OpEx) and slow disaster recovery (48h).',
  activeRules: MIGRATION_DRIVERS.filter(r => r.id !== 'r_perf'), // Performance wasn't a driver in legacy, it was a constraint
};

const CONT_CLOUD: ContainerVersion = {
  id: 'container_healthcare_cloud_case0',
  versionLabel: 'v2.0-Cloud-Migration',
  hypothesis: 'Migrating to HIPAA-compliant cloud reduces TCO by 45%, improves DR to 30min, and boosts analytics 10x.',
  activeRules: MIGRATION_DRIVERS,
};

// 4. Arrangements (Visual Instances)

export const INITIAL_ARRANGEMENTS: Arrangement[] = [
  {
    id: 'arr-legacy',
    name: 'Legacy On-Premise',
    container: CONT_LEGACY,
    services: [
      { ...MOCK_SERVICES[0] }, // Legacy DB
      { ...MOCK_SERVICES[1] }, // Legacy Backup
      { ...MOCK_SERVICES[2] }  // Legacy Reporting
    ],
    createdAt: Date.now(),
  },
  {
    id: 'arr-cloud',
    name: 'Cloud Migration (HIPAA)',
    container: CONT_CLOUD,
    services: [
      { ...MOCK_SERVICES[3] }, // Cloud Storage (Cost -45%)
      { ...MOCK_SERVICES[4] }, // Cloud Analytics (10x)
      { ...MOCK_SERVICES[5] }, // Cloud DR (30min)
      { ...MOCK_SERVICES[6], evaluationStatus: ValidationStatus.CONFLICT }  // Human Review (CONFLICT override)
    ],
    parentId: 'arr-legacy',
    createdAt: Date.now() + 1000,
  }
];

export const COLORS = {
  container: '#6366f1', // Indigo 500
  service: '#10b981',   // Emerald 500
  serviceExperimental: '#f59e0b', // Amber 500
  conflict: '#ef4444',  // Red 500
  uncertain: '#94a3b8', // Slate 400
  validated: '#10b981', // Emerald 500
};