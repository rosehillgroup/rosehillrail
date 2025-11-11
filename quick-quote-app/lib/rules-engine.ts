/**
 * Rules Engine Evaluator
 * Processes business logic from rules.json and assemblies.json
 */

import { Parser } from "expr-eval";
import type {
  QuoteInput,
  EvaluationContext,
  RulesEngineResult,
  ValidationResult,
  ConnectionAvailability,
  MaterialCompatibility,
  BOMLine,
  RulesConfig,
  Assembly,
  Rule,
  Validation,
  ConnectionType,
  MaterialType,
} from "./types";

export class RulesEngine {
  private parser: Parser;
  private rulesConfig: RulesConfig;
  private assemblies: Assembly[];

  constructor(rulesConfig: RulesConfig, assemblies: Assembly[]) {
    this.parser = new Parser();
    this.rulesConfig = rulesConfig;
    this.assemblies = assemblies;
  }

  /**
   * Main evaluation method
   */
  evaluate(input: QuoteInput): RulesEngineResult {
    // Step 1: Initialize evaluation context
    let context: EvaluationContext = { ...input };

    // Step 2: Evaluate helpers (computed fields)
    context = this.evaluateHelpers(context);

    // Step 3: Run validations
    const validations = this.runValidations(context);
    const hasErrors = validations.some((v) => v.level === "error" && !v.passed);

    // Step 4: Determine allowed connections
    const allowedConnections = this.determineAllowedConnections(context);

    // Step 5: Determine allowed materials
    const allowedMaterials = this.determineAllowedMaterials(context);

    // Step 6: Match assemblies and generate BOM
    const { bom, explanations } = this.generateBOM(context);

    return {
      valid: !hasErrors,
      context,
      validations,
      allowedConnections,
      allowedMaterials,
      bom,
      explanations,
      metadata: {
        rule_set_version: this.rulesConfig.version,
        computed_at: new Date(),
      },
    };
  }

  /**
   * Step 2: Evaluate helper expressions to compute derived fields
   */
  private evaluateHelpers(context: EvaluationContext): EvaluationContext {
    const newContext = { ...context };

    for (const helper of this.rulesConfig.helpers) {
      for (const [key, expression] of Object.entries(helper.compute)) {
        try {
          const result = this.evaluateExpression(expression, newContext);
          newContext[key] = result;
        } catch (error) {
          console.error(`Error evaluating helper ${helper.id} - ${key}:`, error);
          throw new Error(
            `Failed to evaluate helper ${helper.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    return newContext;
  }

  /**
   * Step 3: Run validation rules
   */
  private runValidations(context: EvaluationContext): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const validation of this.rulesConfig.validation) {
      try {
        const passed = this.evaluateExpression(validation.assert, context) as boolean;

        results.push({
          id: validation.id,
          level: validation.level || "error",
          assert: validation.assert,
          message: validation.message,
          passed,
        });
      } catch (error) {
        console.error(`Error evaluating validation ${validation.id}:`, error);
        results.push({
          id: validation.id,
          level: "error",
          assert: validation.assert,
          message: `Validation error: ${validation.message}`,
          passed: false,
        });
      }
    }

    return results;
  }

  /**
   * Step 4: Determine allowed connections based on rules
   */
  private determineAllowedConnections(
    context: EvaluationContext
  ): ConnectionAvailability[] {
    const allConnections: ConnectionType[] = ["BP", "LO", "HK", "LOL", "SF2K", "PCK"];
    let allowed = new Set<ConnectionType>();
    let excluded = new Set<ConnectionType>();
    const reasons: Record<string, string> = {};

    // Process each connection rule
    for (const rule of this.rulesConfig.allowedConnections) {
      if (this.matchesWhen(rule.when, context)) {
        // Add allowed connections
        if (rule.allow) {
          rule.allow.forEach((conn) => allowed.add(conn as ConnectionType));
        }

        // Add excluded connections
        if (rule.exclude) {
          rule.exclude.forEach((conn) => {
            excluded.add(conn as ConnectionType);
            if (rule.reason) {
              reasons[conn] = rule.reason;
            }
          });
        }
      }
    }

    // Remove excluded from allowed
    excluded.forEach((conn) => allowed.delete(conn));

    // Build result
    return allConnections.map((conn) => ({
      connection: conn,
      available: allowed.has(conn),
      reason: !allowed.has(conn) ? reasons[conn] || "Not available for this configuration" : undefined,
    }));
  }

  /**
   * Step 5: Determine allowed materials based on connection
   */
  private determineAllowedMaterials(
    context: EvaluationContext
  ): MaterialCompatibility[] {
    const allMaterials: MaterialType[] = ["P(B)", "A(B)", "JV", "N", "TC"];
    let allowed = new Set<MaterialType>();
    let excluded = new Set<MaterialType>();
    const reasons: Record<string, string> = {};

    const materialRules = this.rulesConfig.materialCompatibility || [];

    for (const rule of materialRules) {
      if (this.matchesWhen(rule.when, context)) {
        // Add allowed materials
        if (rule.allow) {
          rule.allow.forEach((mat) => allowed.add(mat as MaterialType));
        }

        // Add excluded materials
        if (rule.exclude) {
          rule.exclude.forEach((mat) => {
            excluded.add(mat as MaterialType);
            if (rule.reason) {
              reasons[mat] = rule.reason;
            }
          });
        }
      }
    }

    // Remove excluded from allowed
    excluded.forEach((mat) => allowed.delete(mat));

    // If no rules matched, allow all
    if (allowed.size === 0 && excluded.size === 0) {
      allMaterials.forEach((mat) => allowed.add(mat));
    }

    return allMaterials.map((mat) => ({
      material: mat,
      compatible: allowed.has(mat),
      reason: !allowed.has(mat) ? reasons[mat] || "Not compatible with selected connection" : undefined,
    }));
  }

  /**
   * Step 6: Generate BOM by matching assemblies
   */
  private generateBOM(
    context: EvaluationContext
  ): { bom: BOMLine[]; explanations: string[] } {
    const bom: BOMLine[] = [];
    const explanations: string[] = [];

    for (const assembly of this.assemblies) {
      // Skip metadata entries
      if (assembly.id === "metadata" || !assembly.lines) {
        continue;
      }

      // Check if assembly selector matches context
      if (this.matchesSelector(assembly.selector, context)) {
        explanations.push(`Assembly ${assembly.id} matched: ${assembly.description || ""}`);

        // Process each line in the assembly
        for (const line of assembly.lines) {
          try {
            // Evaluate quantity expression
            const qty = this.evaluateExpression(line.qty, context) as number;

            // Skip if quantity is 0 or negative
            if (qty <= 0) {
              continue;
            }

            // Replace tokens in product code
            const productCode = this.replaceTokens(line.product, context);

            bom.push({
              product: productCode,
              name: productCode, // Name will be resolved later with product catalog
              qty,
              unit: line.unit,
              description: line.description,
            });
          } catch (error) {
            console.error(`Error processing assembly line ${assembly.id}:`, error);
            explanations.push(
              `Error in ${assembly.id}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }
    }

    return { bom, explanations };
  }

  /**
   * Evaluate a mathematical/logical expression
   */
  private evaluateExpression(expression: string, context: EvaluationContext): any {
    try {
      // Parse and evaluate the expression
      const expr = this.parser.parse(expression);
      return expr.evaluate(context);
    } catch (error) {
      throw new Error(
        `Expression evaluation failed: "${expression}" - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Check if a "when" condition matches the context
   */
  private matchesWhen(
    when: Record<string, any> | undefined,
    context: EvaluationContext
  ): boolean {
    if (!when) return true;

    // Handle OR conditions
    if (when.or) {
      return when.or.some((condition: Record<string, any>) =>
        this.matchesWhen(condition, context)
      );
    }

    // Handle AND conditions (default)
    return Object.entries(when).every(([key, value]) => {
      const contextValue = context[key];

      // Handle comparison operators in string format
      if (typeof value === "string") {
        if (value.startsWith(">")) {
          const threshold = parseFloat(value.substring(1));
          return typeof contextValue === "number" && contextValue > threshold;
        }
        if (value.startsWith("<")) {
          const threshold = parseFloat(value.substring(1));
          return typeof contextValue === "number" && contextValue < threshold;
        }
        if (value.startsWith(">=")) {
          const threshold = parseFloat(value.substring(2));
          return typeof contextValue === "number" && contextValue >= threshold;
        }
        if (value.startsWith("<=")) {
          const threshold = parseFloat(value.substring(2));
          return typeof contextValue === "number" && contextValue <= threshold;
        }
      }

      // Direct equality check
      return contextValue === value;
    });
  }

  /**
   * Check if a selector matches the context
   */
  private matchesSelector(
    selector: Record<string, any>,
    context: EvaluationContext
  ): boolean {
    // Empty selector {} means always match
    if (Object.keys(selector).length === 0) {
      return true;
    }

    return Object.entries(selector).every(([key, value]) => {
      const contextValue = context[key];

      // If value is an array, check if contextValue is in the array
      if (Array.isArray(value)) {
        // Handle boolean arrays
        if (typeof contextValue === "boolean") {
          return value.includes(contextValue);
        }
        return value.includes(contextValue);
      }

      // Direct equality
      return contextValue === value;
    });
  }

  /**
   * Replace tokens in product code (e.g., {material}, {connection})
   */
  private replaceTokens(template: string, context: EvaluationContext): string {
    let result = template;

    // Replace {material} token
    if (result.includes("{material}")) {
      result = result.replace("{material}", context.material || "");
    }

    // Replace {connection} token
    if (result.includes("{connection}")) {
      const connection = context.connection || "";

      // Special handling for BP connection - sometimes omitted
      if (connection === "BP") {
        // For some products, BP connection is omitted
        // This would need product-specific logic
        result = result.replace(" {connection}", "").replace("{connection}", "");
      } else {
        // Convert HK to "H K" with space to match product codes
        const connectionCode = connection === "HK" ? "H K" : connection;
        result = result.replace("{connection}", connectionCode);
      }
    }

    // Clean up any extra spaces
    result = result.replace(/\s+/g, " ").trim();

    return result;
  }
}

/**
 * Factory function to create and configure rules engine
 */
export function createRulesEngine(
  rulesConfig: RulesConfig,
  assemblies: Assembly[]
): RulesEngine {
  return new RulesEngine(rulesConfig, assemblies);
}
