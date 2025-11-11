# Quick Quote - Rail Crossing Configurator

A guided online configurator for rail crossing systems that transforms an Excel-based quotation process into an intuitive web application.

## Project Status

### ✅ Phase 1: Foundation (Complete)
- **EXCEL_FORMULAS.md**: Complete documentation of 47 Excel formulas and business logic
- **test-fixtures.json**: 10 comprehensive test cases with expected outputs
- **rules.json**: Complete rules engine configuration with 47 rules
- **assemblies.json**: 28 assembly definitions for all product combinations

### ✅ Phase 2: Core Engine (Complete)
- **Next.js Project**: TypeScript + Tailwind CSS + App Router
- **Rules Engine** (`lib/rules-engine.ts`):
  - Helper evaluation (computed fields)
  - Connection filtering based on usage, speed, angle
  - Material compatibility checking
  - Validation rules (length, speed, gauge, etc.)
  - Assembly matching and BOM generation
  - Product code token replacement
- **Pricing Resolver** (`lib/pricing.ts`):
  - Price list hierarchy (customer → org → global)
  - Date-valid price list selection
  - Line total and quote total calculations
  - Missing price detection
- **Quote Engine** (`lib/quote-engine.ts`):
  - Orchestrates rules engine and pricing resolver
  - Generates deterministic compute hash (SHA-256)
  - Complete quote result with BOM, totals, validations

### ✅ Phase 3: Testing (Complete)
- **Excel Parity Test Suite** (`tests/excel-parity.test.ts`):
  - 10 fixture tests matching Excel outputs exactly
  - Computed field tests (length rounding, gauge panel type)
  - Connection filtering tests
  - Validation rule tests
  - Pricing calculation tests
  - Determinism tests

### 🚧 Phase 4: UI & API (In Progress)
- 6-step wizard UI
- API routes for quote computation
- BOM display component
- PDF and CSV export
- Schematic visualization

## Getting Started

### Installation

\`\`\`bash
cd quick-quote-app
npm install
\`\`\`

### Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Tests

\`\`\`bash
npm test
\`\`\`

## Architecture

### Rules Engine

The rules engine processes business logic from \`rules.json\` and \`assemblies.json\`:

1. **Helper Evaluation**: Compute derived fields like \`rhr_len\`, \`panels_per_track\`, \`gauge_panel_type\`
2. **Connection Filtering**: Determine which connection types are available based on usage, speed, angle
3. **Material Compatibility**: Check which materials work with the selected connection
4. **Validation**: Run validation rules (length, speed, gauge, etc.)
5. **Assembly Matching**: Match assemblies based on selectors (field_panel_type, connection, etc.)
6. **BOM Generation**: Generate bill of materials with quantities and product codes

### Pricing Resolver

The pricing resolver handles price lookups with precedence:

1. **Customer-specific price list** (if date-valid)
2. **Organization default price list**
3. **Global default price list**
4. **Block quote if missing** - No fallback

### Quote Engine

The quote engine orchestrates the entire process:

1. Run rules engine to get BOM
2. Enrich BOM with product names from catalog
3. Resolve pricing for each line item
4. Calculate totals (subtotal, tax, total)
5. Generate compute hash for traceability

## Data Files

- \`data/products.csv\`: 87 products with codes, names, categories
- \`data/price_list.default.csv\`: EUR pricing valid from 2025-11-10
- \`data/rules.json\`: Rules engine configuration
- \`data/assemblies.json\`: Assembly definitions
- \`data/test-fixtures.json\`: Test cases with expected outputs

## Key Features

- **Excel Parity**: All calculations match Excel exactly
- **Deterministic**: Same inputs always produce same output
- **Validated**: Comprehensive test suite with 15+ test cases
- **Traceable**: Compute hash (SHA-256) for each quote
- **Type-Safe**: Full TypeScript implementation
- **Extensible**: Rules and assemblies loaded from JSON

## Product Types

### Gauge Panels
- **NGP** (Narrow Gauge Panel): gauge ≤ 1420mm
- **GP** (Gauge Panel): 1421mm < gauge < 1455mm
- **WGP** (Wide Gauge Panel): gauge ≥ 1455mm

### Field Panels
- **FP** (Field Panel): 436mm < gauge ≤ 565mm
- **WFP** (Wide Field Panel): 565mm < gauge ≤ 840mm
- **SWFP** (Super Wide Field Panel): gauge > 840mm

### Connection Types
- **BP** (Baseplated)
- **LO** (Loop Connect)
- **HK** (High K)
- **LOL** (Loop Interlocker)
- **SF2K** (Special connection)
- **PCK** (Platform Connection Kit)

### Materials
- **P(B)** (Polymer with Baseplate)
- **A(B)** (Advanced polymer)
- **JV** (Jarvis)
- **N** (Nylon)
- **TC** (ThermoComposite)

### Edge Beams
- **REB TC** (Rubber Edge Beam TC)
- **PVC AEB @ 1.8m** (PVC Aluminum Edge Beam 1.8m segments)
- **PVC AEB @ 3.6m** (PVC Aluminum Edge Beam 3.6m segments)
- **Steel AEB @ 1.8m** (Steel Aluminum Edge Beam 1.8m segments)
- **Steel AEB @ 3.6m** (Steel Aluminum Edge Beam 3.6m segments)
- **Customer Concrete** (Customer supplies)

## Business Rules

### Length Rounding
Design length is rounded up to nearest 1.8m increment:
\`\`\`
rhr_len = Math.ceil(design_len / 1.8) * 1.8
\`\`\`

### Connection Filtering

**Usage-based**:
- **Ultra Heavy**: Excludes LO (insufficient strength)
- **Heavy**: Most connections allowed
- **Pedestrian**: Only LO and BP needed

**Speed-based**:
- **Speed > 80 km/h**: Excludes LOL and SF2K (vibration concerns)

**Angle-based**:
- **Angle < 45° or > 90°**: Excludes SF2K (geometric limitations)

### Quantity Calculations

**Gauge/Field Panels**:
\`\`\`
qty = Math.ceil(rhr_len / 1.8) * 2 * tracks
\`\`\`

**Edge Beams (REB TC)**:
\`\`\`
qty = rhr_len * 2  // Continuous lengths, 2 edges
\`\`\`

**Connecting Plates**:
\`\`\`
qty = Math.max(0, Math.ceil(rhr_len / 1.8) - 1) * tracks * 2
\`\`\`

**Chain Guards**:
\`\`\`
qty = tracks * 2  // One at each end per track
\`\`\`

## Testing

The test suite verifies:

1. **Excel Parity**: All 10 fixtures match Excel outputs exactly
2. **Computed Fields**: Length rounding, gauge panel type determination
3. **Connection Filtering**: Usage, speed, and angle restrictions
4. **Validations**: Length, speed, gauge, track spacing bounds
5. **Pricing**: Unit prices, line totals, subtotals
6. **Determinism**: Same inputs → same outputs

Run tests with:

\`\`\`bash
npm test
\`\`\`

## Next Steps

1. Build 6-step wizard UI with form state management
2. Create API routes for quote computation
3. Implement BOM display component
4. Add PDF and CSV export functionality
5. Create schematic visualization (SVG)
6. Deploy to Netlify

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Expression Evaluation**: expr-eval
- **Deployment**: Netlify (planned)

## License

Proprietary - Rosehill Rail

---

**Version**: 1.0
**Last Updated**: 2025-11-11
**Status**: Core Engine Complete, UI In Progress
