/**
 * Core type definitions for Quick Quote system
 */

export interface QuoteInput {
  // Project definition
  project_name: string;
  country: string;
  currency: string;

  // Geometry
  design_len: number;
  tracks: number;
  gauge: number;
  track_spacing: number;
  crossing_angle: number;

  // Usage & environment
  sleeperSpacing600: boolean;
  usage: UsageType;
  traffic_class: string;
  speed_kph: number;

  // Panels & edges
  field_panel_type: FieldPanelType;
  edge_beam: EdgeBeamType;

  // Connection system
  connection: ConnectionType;
  material: MaterialType;

  // Optional flags
  requires_strand_restrictor?: boolean;
  single_unit_transition?: boolean;
}

export type UsageType =
  | "Ultra Heavy"
  | "Heavy"
  | "Medium to Heavy"
  | "Light to Medium"
  | "Pedestrian & Cycles"
  | "Agricultural"
  | "Rail Road Access";

export type FieldPanelType = "FP" | "WFP" | "SWFP";

export type EdgeBeamType =
  | "REB TC"
  | "PVC AEB @ 1.8m"
  | "PVC AEB @ 3.6m"
  | "Steel AEB @ 1.8m"
  | "Steel AEB @ 3.6m"
  | "Customer Concrete";

export type ConnectionType = "BP" | "LO" | "HK" | "LOL" | "SF2K" | "PCK";

export type MaterialType = "P(B)" | "A(B)" | "JV" | "N" | "TC";

export type GaugePanelType = "NGP" | "GP" | "WGP";

export interface EvaluationContext extends QuoteInput {
  // Computed helpers
  rhr_len?: number;
  panels_per_track?: number;
  gauge_panel_type?: GaugePanelType;
  joints?: number;
  zr_required?: boolean;

  // For expression evaluation
  [key: string]: any;
}

export interface ValidationResult {
  id: string;
  level: "error" | "warning" | "info";
  assert: string;
  message: string;
  passed: boolean;
}

export interface ConnectionAvailability {
  connection: ConnectionType;
  available: boolean;
  reason?: string;
}

export interface MaterialCompatibility {
  material: MaterialType;
  compatible: boolean;
  reason?: string;
}

export interface BOMLine {
  product: string;  // Product code
  name: string;     // Product name
  qty: number;      // Quantity
  unit: string;     // Unit of measurement
  unit_price?: number;
  line_total?: number;
  description?: string;
}

export interface RulesEngineResult {
  valid: boolean;
  context: EvaluationContext;
  validations: ValidationResult[];
  allowedConnections: ConnectionAvailability[];
  allowedMaterials: MaterialCompatibility[];
  bom: BOMLine[];
  explanations: string[];
  metadata: {
    rule_set_version: string;
    computed_at: Date;
  };
}

export interface Rule {
  id: string;
  description?: string;
  when?: Record<string, any>;
  allow?: string[];
  exclude?: string[];
  reason?: string;
}

export interface Helper {
  id: string;
  description?: string;
  compute: Record<string, string>;
}

export interface Validation {
  id: string;
  assert: string;
  message: string;
  level?: "error" | "warning" | "info";
}

export interface Assembly {
  id: string;
  description?: string;
  selector: Record<string, any>;
  lines: AssemblyLine[];
}

export interface AssemblyLine {
  product: string;
  qty: string;
  unit: string;
  description?: string;
}

export interface RulesConfig {
  version: string;
  description?: string;
  helpers: Helper[];
  allowedConnections: Rule[];
  materialCompatibility?: Rule[];
  validation: Validation[];
  edgeBeamDefaults?: any[];
  metadata?: any;
}
