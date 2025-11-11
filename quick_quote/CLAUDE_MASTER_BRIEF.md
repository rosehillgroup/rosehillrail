Quick Quote Web App — Customer Configurator Plan

Date: 2025-11-11

Objective

Transform the Excel quick quote into a guided online configurator for rail crossings. The app should make customers feel like they’re building a crossing step by step, with visual feedback, clear reasoning, and a professional quote at the end. The MVP must replicate current pricing and logic using the extracted dataset, with Supabase authentication and Row-Level Security active from day one.

⸻

Tech constraints and hosting
	•	Hosting: Netlify
	•	Framework: Next.js (App Router, TypeScript)
	•	Styling: Tailwind + shadcn/ui + lucide-react
	•	Auth + DB: Supabase (Postgres, Auth, Storage, RLS)
	•	All secure computation server-side (no service keys on client)
	•	PDF generation: server-side via Playwright or pdf-lib

⸻

Data files already provided

Use these as the initial source of truth:

/data/products.csv
/data/price_list.default.csv
/data/rules.json
/data/assemblies.json
/supabase/supabase_schema.sql


⸻

End-to-end customer journey

Step	Goal	Key Interactions	Output
1. Project	Define context	Project name, customer, country, currency	Prefills currency, shows step 1/6
2. Geometry	Define layout	Length, tracks, gauge, spacing, angle	Rounds to 1.8 m; live schematic
3. Usage & environment	Define load	Road type, traffic class, speed	Filters allowed connections
4. Panels & edges	Choose surface	Field panel & edge beam type	Updates preview image
5. Connection system	Choose structure	Pick from valid options	Shows short explanations
6. Summary & quote	Review & confirm	Customer info, notes	Displays BOM, prices, totals, PDF/CSV


⸻

UX principles
	•	Only show relevant fields per step
	•	Always explain why an option is unavailable
	•	Show what changed the price and why
	•	Calm typography, big touch targets, clear progress
	•	Deterministic results: same inputs → same output

⸻

Data model and ingestion
	1.	Run /supabase/supabase_schema.sql.
	2.	Import /data/products.csv → products.
	3.	Create default price list → import /data/price_list.default.csv.
	4.	Insert rule_sets using rules.json + assemblies.json (version 1).
	5.	Record activation in a data_packs table.
	6.	Later, the Admin screen will upload and apply new data packs via Supabase Storage.

⸻

Row-Level Security
	•	Deny-by-default.
	•	Authenticated users can read products & rule sets.
	•	Quote access limited to org membership.
	•	Price lists visible only within allowed scope (customer / org / global).
	•	Roles: admin, sales, customer.

⸻

Pricing precedence
	1.	Active customer price list (date-valid).
	2.	Active organisation default list.
	3.	Active global default list.
If a BOM line lacks a valid price, block quote issue and flag missing codes.

⸻

Rules engine
	1.	Evaluate helpers (e.g. round length).
	2.	Determine allowed connections + reasons.
	3.	Match assemblies.selector → line templates.
	4.	Evaluate qty expressions → quantities.
	5.	Map tokens like FP_{connection} → product codes.
	6.	Resolve unit prices via precedence.
	7.	Return:
	•	bom
	•	explanations
	•	versions (rule set + price list)
	•	compute_hash (SHA-256 of inputs + versions)

⸻

API routes

Route	Purpose
POST /api/quotes/compute	Return BOM + totals
POST /api/quotes	Validate + save quote
GET /api/quotes/:id	Retrieve saved quote
POST /api/admin/datapack	Validate + apply new data pack


⸻

Key components
	•	ProgressHeader
	•	GeometryForm
	•	UsageForm
	•	PanelPicker
	•	EdgeBeamPicker
	•	ConnectionPicker
	•	Schematic (SVG)
	•	BOMTable
	•	PriceDelta
	•	QuotePDF
	•	DataPackUpload

⸻

Visual style
	•	Large calm typography
	•	Rounded cards, soft shadows
	•	Subtle animations between steps
	•	lucide-react icons
	•	One primary accent colour

⸻

Acceptance criteria
	•	Totals match Excel parity fixtures
	•	Steps hide irrelevant fields
	•	Invalid connections show reasons
	•	Quotes block if any line missing price
	•	PDF footer includes rule set version, price list ID, compute hash
	•	RLS fully enforced

⸻

Tasks for Claude
	1.	Run schema + seed data.
	2.	Implement rules evaluator.
	3.	Build pricing resolver.
	4.	Create secure API routes.
	5.	Develop six-step wizard UI.
	6.	Add PDF + CSV export.
	7.	Implement admin upload + validation.
	8.	Apply RLS and edge rate-limiting.

⸻

Deterministic compute hash

Combine:

{
  "inputs": "...",
  "rule_set_version": 1,
  "price_list_id": "uuid"
}

Canonicalise JSON → SHA-256 → store as compute_hash and print in PDF footer.

⸻

Parity testing

Use /tests/fixtures/*.json:

{
  "input": { "design_len": 7.2, "tracks": 2, "usage": "Medium", "connection": "LO" },
  "expected": { "codes": [["FP_LO",8],["REB_TC",7.2]], "total": 12345.67 }
}

Compare codes, quantities, totals.

⸻

Definition of done
	•	Non-technical user can complete a quote intuitively
	•	Clear explanations and visuals throughout
	•	BOM + totals match Excel results
	•	Snapshots + compute hash stored
	•	RLS secure
	•	Admin can safely activate new data packs

⸻