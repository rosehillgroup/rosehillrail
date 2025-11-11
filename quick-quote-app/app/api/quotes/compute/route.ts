/**
 * API Route: POST /api/quotes/compute
 * Computes a quote based on input parameters
 */

import { NextRequest, NextResponse } from "next/server";
import { createQuoteEngine } from "@/lib/quote-engine";
import type { QuoteInput } from "@/lib/types";
import * as fs from "fs";
import * as path from "path";

// Load data files
const rulesConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/rules.json"), "utf-8")
);

const assemblies = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/assemblies.json"), "utf-8")
);

const productsCSV = fs.readFileSync(
  path.join(process.cwd(), "data/products.csv"),
  "utf-8"
);

const priceListCSV = fs.readFileSync(
  path.join(process.cwd(), "data/price_list.default.csv"),
  "utf-8"
);

// Create quote engine instance (cached for performance)
let quoteEngine: any = null;

async function getQuoteEngine() {
  if (!quoteEngine) {
    quoteEngine = await createQuoteEngine(
      rulesConfig,
      assemblies,
      productsCSV,
      priceListCSV
    );
  }
  return quoteEngine;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const input: QuoteInput = body.input;
    const taxRate: number = body.taxRate || 0;

    // Validate input
    if (!input) {
      return NextResponse.json(
        { error: "Missing input parameter" },
        { status: 400 }
      );
    }

    // Get quote engine
    const engine = await getQuoteEngine();

    // Compute quote
    const result = await engine.compute(input, taxRate);

    // Return result
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error computing quote:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
