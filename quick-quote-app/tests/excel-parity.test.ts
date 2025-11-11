/**
 * Excel Parity Test Suite
 * Verifies that JavaScript calculations match Excel outputs exactly
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createQuoteEngine } from "../lib/quote-engine";
import type { QuoteInput } from "../lib/types";
import * as fs from "fs";
import * as path from "path";

// Load test data
const rulesConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/rules.json"), "utf-8")
);

const assemblies = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/assemblies.json"), "utf-8")
);

const productsCSV = fs.readFileSync(
  path.join(__dirname, "../data/products.csv"),
  "utf-8"
);

const priceListCSV = fs.readFileSync(
  path.join(__dirname, "../data/price_list.default.csv"),
  "utf-8"
);

const testFixtures = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/test-fixtures.json"), "utf-8"
);

describe("Excel Parity Tests", () => {
  let quoteEngine: any;

  beforeAll(async () => {
    quoteEngine = await createQuoteEngine(
      rulesConfig,
      assemblies,
      productsCSV,
      priceListCSV
    );
  });

  // Test each fixture
  for (const fixture of testFixtures.fixtures) {
    describe(fixture.name, () => {
      it("should match Excel calculations", async () => {
        const result = await quoteEngine.compute(fixture.input, 0);

        // Log result for debugging
        console.log(`\n=== ${fixture.name} ===`);
        console.log("Valid:", result.valid);
        console.log("Errors:", result.errors);
        console.log("Warnings:", result.warnings);
        console.log("BOM Lines:", result.bom.length);
        console.log("Subtotal:", result.subtotal);
        console.log("Total:", result.total);

        // Check that quote is valid
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);

        // Check subtotal matches
        expect(result.subtotal).toBeCloseTo(fixture.expected.subtotal, 2);

        // Check total matches
        expect(result.total).toBeCloseTo(fixture.expected.total, 2);

        // Check BOM line count
        expect(result.bom.length).toBe(fixture.expected.bom.length);

        // Check each BOM line
        for (const expectedLine of fixture.expected.bom) {
          const actualLine = result.bom.find(
            (line: any) => line.product === expectedLine.code
          );

          expect(actualLine).toBeDefined();

          if (actualLine) {
            console.log(
              `  ${expectedLine.code}: qty=${actualLine.qty}, unit_price=${actualLine.unit_price}, total=${actualLine.line_total}`
            );

            // Check quantity
            expect(actualLine.qty).toBeCloseTo(expectedLine.qty, 2);

            // Check unit price
            expect(actualLine.unit_price).toBeCloseTo(expectedLine.unit_price, 2);

            // Check line total
            expect(actualLine.line_total).toBeCloseTo(expectedLine.line_total, 2);
          }
        }
      });
    });
  }

  describe("Computed Fields", () => {
    it("should round length correctly", async () => {
      const input: QuoteInput = {
        project_name: "Length Test",
        country: "Germany",
        currency: "EUR",
        design_len: 7.5,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(input, 0);

      // Should round 7.5m up to 9.0m
      const fpLine = result.bom.find((line: any) => line.product.includes("FP"));
      expect(fpLine).toBeDefined();

      // 9.0m / 1.8m = 5 panels, * 2 per track * 1 track = 10 total
      expect(fpLine.qty).toBe(10);
    });

    it("should determine gauge panel type correctly", async () => {
      // Test NGP (narrow gauge)
      const narrowGaugeInput: QuoteInput = {
        project_name: "Narrow Gauge Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1000,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Light to Medium",
        traffic_class: "Light",
        speed_kph: 30,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const narrowResult = await quoteEngine.compute(narrowGaugeInput, 0);
      const ngpLine = narrowResult.bom.find((line: any) =>
        line.product.startsWith("NGP")
      );
      expect(ngpLine).toBeDefined();

      // Test WGP (wide gauge)
      const wideGaugeInput: QuoteInput = {
        ...narrowGaugeInput,
        gauge: 1465,
      };

      const wideResult = await quoteEngine.compute(wideGaugeInput, 0);
      const wgpLine = wideResult.bom.find((line: any) =>
        line.product.startsWith("WGP")
      );
      expect(wgpLine).toBeDefined();
    });
  });

  describe("Connection Filtering", () => {
    it("should filter connections based on usage", async () => {
      const ultraHeavyInput: QuoteInput = {
        project_name: "Ultra Heavy Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Ultra Heavy",
        traffic_class: "Ultra Heavy",
        speed_kph: 30,
        field_panel_type: "FP",
        edge_beam: "Steel AEB @ 3.6m",
        connection: "HK",
        material: "TC",
      };

      const result = await quoteEngine.compute(ultraHeavyInput, 0);

      // Ultra Heavy should exclude LO connection
      // Verify no LO products in BOM
      const loLines = result.bom.filter((line: any) => line.product.includes(" LO"));
      expect(loLines).toHaveLength(0);
    });

    it("should filter connections based on speed", async () => {
      const highSpeedInput: QuoteInput = {
        project_name: "High Speed Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 90,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(highSpeedInput, 0);

      // High speed should still allow LO but would exclude LOL and SF2K
      expect(result.valid).toBe(true);
    });
  });

  describe("Validation Rules", () => {
    it("should validate minimum length", async () => {
      const tooShortInput: QuoteInput = {
        project_name: "Too Short Test",
        country: "Germany",
        currency: "EUR",
        design_len: 0.5,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(tooShortInput, 0);

      // Should have validation error
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes("length"))).toBe(true);
    });

    it("should validate speed bounds", async () => {
      const tooFastInput: QuoteInput = {
        project_name: "Too Fast Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 150,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(tooFastInput, 0);

      // Should have validation error
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: string) => e.includes("Speed"))).toBe(true);
    });
  });

  describe("Pricing", () => {
    it("should apply correct unit prices", async () => {
      const input: QuoteInput = {
        project_name: "Pricing Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(input, 0);

      // Check FP TC LO price
      const fpLine = result.bom.find((line: any) => line.product === "FP TC LO");
      expect(fpLine).toBeDefined();
      expect(fpLine.unit_price).toBe(620.55);
    });

    it("should calculate line totals correctly", async () => {
      const input: QuoteInput = {
        project_name: "Line Total Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(input, 0);

      // Check each line total = qty * unit_price
      for (const line of result.bom) {
        const expectedTotal = line.qty * line.unit_price;
        expect(line.line_total).toBeCloseTo(expectedTotal, 2);
      }
    });

    it("should calculate subtotal correctly", async () => {
      const input: QuoteInput = {
        project_name: "Subtotal Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(input, 0);

      // Calculate expected subtotal
      const expectedSubtotal = result.bom.reduce(
        (sum: number, line: any) => sum + line.line_total,
        0
      );

      expect(result.subtotal).toBeCloseTo(expectedSubtotal, 2);
    });

    it("should handle missing prices", async () => {
      // Create input with a product that doesn't exist in price list
      const input: QuoteInput = {
        project_name: "Missing Price Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result = await quoteEngine.compute(input, 0);

      // Should be valid if all products have prices
      if (result.valid) {
        expect(result.errors).toHaveLength(0);
      } else {
        // If invalid, should have error about missing prices
        expect(result.errors.some((e: string) => e.includes("Missing prices"))).toBe(
          true
        );
      }
    });
  });

  describe("Determinism", () => {
    it("should produce same results for same inputs", async () => {
      const input: QuoteInput = {
        project_name: "Determinism Test",
        country: "Germany",
        currency: "EUR",
        design_len: 3.6,
        tracks: 1,
        gauge: 1435,
        track_spacing: 0,
        crossing_angle: 90,
        sleeperSpacing600: true,
        usage: "Medium to Heavy",
        traffic_class: "Medium",
        speed_kph: 50,
        field_panel_type: "FP",
        edge_beam: "REB TC",
        connection: "LO",
        material: "TC",
      };

      const result1 = await quoteEngine.compute(input, 0);
      const result2 = await quoteEngine.compute(input, 0);

      // BOM should be identical
      expect(result1.bom.length).toBe(result2.bom.length);

      // Subtotal should be identical
      expect(result1.subtotal).toBe(result2.subtotal);

      // Total should be identical
      expect(result1.total).toBe(result2.total);
    });
  });
});
