export enum EntityType {
  CONTAINER = 'CONTAINER',
  SERVICE = 'SERVICE'
}

export enum ValidationStatus {
  VALIDATED = 'VALIDATED',
  UNCERTAIN = 'UNCERTAIN',
  CONFLICT = 'CONFLICT'
}

export enum RuleStatus {
  SATISFIED = 'SATISFIED',
  VIOLATED = 'VIOLATED',
  NOT_EVALUABLE = 'NOT_EVALUABLE'
}

export enum ServiceType {
  DATABASE = 'DATABASE',
  API = 'API',
  QUEUE = 'QUEUE',
  AUTH = 'AUTH'
}

export interface Rule {
  id: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING';
  matcher: string; // The predicate: substring to look for in service contracts
  // Note: status is no longer static in the definition, it is calculated
}

export interface EvaluatedRule extends Rule {
  status: RuleStatus;
  matchingServices: string[]; // IDs of services that contribute to this rule
}

export interface ExternalService {
  id: string;
  name: string;
  type: ServiceType;
  contractMetrics: string[]; // Observable metrics defining the contract
  isExperimental: boolean;
  evaluationStatus: ValidationStatus; // The state of the contract evaluation
}

export interface ContainerVersion {
  id: string;
  versionLabel: string; // e.g., "v1.0-alpha"
  hypothesis: string;
  activeRules: Rule[];
}

export interface Arrangement {
  id: string;
  name: string;
  container: ContainerVersion;
  services: ExternalService[]; // The specific combination of services
  parentId?: string; // For tracking history/forks
  createdAt: number;
}