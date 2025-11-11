/**
 * Quote Engine - Main orchestrator
 * Combines rules engine and pricing resolver
 */

import type {
  QuoteInput,
  BOMLine,
  RulesConfig,
  Assembly,
} from "./types";
import { createRulesEngine } from "./rules-engine";
import { createPricingResolver, type PricingContext, type PricedBOMLine } from "./pricing";
import crypto from "crypto";

export interface QuoteResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  bom: PricedBOMLine[];
  subtotal: number;
  tax: number;
  total: number;
  compute_hash: string;
  rule_set_version: string;
  price_list_id: string;
  metadata: {
    computed_at: Date;
    input_snapshot: QuoteInput;
  };
}

export class QuoteEngine {
  private rulesEngine: any;
  private pricingResolver: any;
  private rulesConfig: RulesConfig;

  constructor(
    rulesConfig: RulesConfig,
    assemblies: Assembly[],
    pricingResolver: any
  ) {
    this.rulesConfig = rulesConfig;
    this.rulesEngine = createRulesEngine(rulesConfig, assemblies);
    this.pricingResolver = pricingResolver;
  }

  /**
   * Compute a complete quote
   */
  async compute(input: QuoteInput, taxRate: number = 0): Promise<QuoteResult> {
    // Step 1: Run rules engine
    const rulesResult = this.rulesEngine.evaluate(input);

    // Collect errors and warnings
    const errors: string[] = [];
    const warnings: string[] = [];

    rulesResult.validations.forEach((v: any) => {
      if (!v.passed) {
        if (v.level === "error") {
          errors.push(v.message);
        } else if (v.level === "warning") {
          warnings.push(v.message);
        }
      }
    });

    // Step 2: Enrich BOM with product names
    const enrichedBOM = this.pricingResolver.enrichBOM(rulesResult.bom);

    // Step 3: Resolve pricing
    const pricingContext: PricingContext = {
      currency: input.currency,
      quote_date: new Date(),
    };

    const pricingResult = await this.pricingResolver.resolvePricing(
      enrichedBOM,
      pricingContext,
      taxRate
    );

    // Check for missing prices
    if (pricingResult.missing_prices.length > 0) {
      errors.push(
        `Missing prices for products: ${pricingResult.missing_prices.join(", ")}`
      );
    }

    // Step 4: Generate compute hash
    const computeHash = this.generateComputeHash(
      input,
      this.rulesConfig.version,
      pricingResult.price_list_id
    );

    return {
      valid: errors.length === 0 && rulesResult.valid,
      errors,
      warnings,
      bom: pricingResult.bom,
      subtotal: pricingResult.totals.subtotal,
      tax: pricingResult.totals.tax,
      total: pricingResult.totals.total,
      compute_hash: computeHash,
      rule_set_version: this.rulesConfig.version,
      price_list_id: pricingResult.price_list_id,
      metadata: {
        computed_at: new Date(),
        input_snapshot: input,
      },
    };
  }

  /**
   * Generate deterministic compute hash
   */
  private generateComputeHash(
    input: QuoteInput,
    ruleSetVersion: string,
    priceListId: string
  ): string {
    const data = {
      inputs: input,
      rule_set_version: ruleSetVersion,
      price_list_id: priceListId,
    };

    // Create canonical JSON string (sorted keys)
    const canonical = JSON.stringify(data, Object.keys(data).sort());

    // Generate SHA-256 hash
    return crypto.createHash("sha256").update(canonical).digest("hex");
  }
}

/**
 * Factory function to create quote engine with all dependencies
 */
export async function createQuoteEngine(
  rulesConfig: RulesConfig,
  assemblies: Assembly[],
  productsCSV: string,
  priceListCSV: string
): Promise<QuoteEngine> {
  const pricingResolver = await createPricingResolver(productsCSV, priceListCSV);

  return new QuoteEngine(rulesConfig, assemblies, pricingResolver);
}
