/**
 * API Route: POST /api/quotes/pdf
 * Generates a PDF quote document
 */

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { QuotePDF } from "@/lib/pdf-template";
import { SimplePDF } from "@/lib/pdf-template-simple";
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

    // Create filename
    const projectName = input.project_name.replace(/[^a-z0-9]/gi, "_");
    const date = new Date().toISOString().split("T")[0];
    const filename = `RosehillRail_Quote_${projectName}_${date}.pdf`;

    // Generate PDF stream
    // TEMP: Using SimplePDF for testing
    const stream = await renderToStream(<SimplePDF />);
    // const stream = await renderToStream(
    //   <QuotePDF input={input} bom={bom} totals={totals} />
    // );

    // Return PDF as downloadable file
    return new NextResponse(stream as any, {
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
