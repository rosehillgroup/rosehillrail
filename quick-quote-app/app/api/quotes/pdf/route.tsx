/**
 * API Route: POST /api/quotes/pdf
 * Generates a PDF quote document
 */

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePDF } from "@/lib/pdf-template";
import type { QuoteInput } from "@/lib/types";
import type { PricedBOMLine, QuoteTotals } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { input, bom, totals } = body as {
      input: QuoteInput;
      bom: PricedBOMLine[];
      totals: QuoteTotals;
    };

    // Validate input
    if (!input || !bom || !totals) {
      return NextResponse.json(
        { error: "Missing required parameters: input, bom, totals" },
        { status: 400 }
      );
    }

    // Sanitize input data - ensure all values are proper types
    const safeInput = {
      ...input,
      project_name: String(input.project_name || "Untitled"),
      design_len: Number(input.design_len || 0),
      tracks: Number(input.tracks || 1),
      gauge: Number(input.gauge || 0),
      track_spacing: input.track_spacing ? Number(input.track_spacing) : undefined,
      crossing_angle: Number(input.crossing_angle || 90),
      usage: String(input.usage || ""),
      speed_kph: Number(input.speed_kph || 0),
      field_panel_type: String(input.field_panel_type || ""),
      edge_beam: String(input.edge_beam || ""),
      connection: String(input.connection || ""),
      material: String(input.material || ""),
      currency: String(input.currency || "EUR"),
    };

    // Sanitize BOM
    const safeBOM = bom.map((line) => ({
      ...line,
      product: String(line.product || ""),
      name: String(line.name || ""),
      qty: Number(line.qty || 0),
      unit: String(line.unit || "each"),
      unit_price: Number(line.unit_price || 0),
      line_total: Number(line.line_total || 0),
    }));

    // Sanitize totals
    const safeTotals = {
      subtotal: Number(totals.subtotal || 0),
      tax: Number(totals.tax || 0),
      tax_rate: Number(totals.tax_rate || 0),
      total: Number(totals.total || 0),
    };

    // Create filename
    const projectName = safeInput.project_name.replace(/[^a-z0-9]/gi, "_");
    const date = new Date().toISOString().split("T")[0];
    const filename = `RosehillRail_Quote_${projectName}_${date}.pdf`;

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <QuotePDF input={safeInput as any} bom={safeBOM} totals={safeTotals} />
    );

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}
