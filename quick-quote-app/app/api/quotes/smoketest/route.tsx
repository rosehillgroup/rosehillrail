/**
 * PDF Smoketest Route
 * Tests basic @react-pdf/renderer functionality
 */

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";

// Force Node runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function SimplePDF() {
  return (
    <Document>
      <Page size="A4">
        <Text>Hello PDF - Smoketest Success!</Text>
      </Page>
    </Document>
  );
}

export async function GET(request: NextRequest) {
  try {
    // Diagnostic: Check for React duplication
    console.log('[PDF Smoketest] Starting PDF generation');
    console.log('[PDF Smoketest] React version:', React.version);

    const pdfBuffer = await renderToBuffer(<SimplePDF />);
    console.log('[PDF Smoketest] PDF generated successfully');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=smoketest.pdf",
      },
    });
  } catch (error) {
    console.error("Smoketest failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Smoketest failed",
      },
      { status: 500 }
    );
  }
}
