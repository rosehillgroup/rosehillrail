"use client";

/**
 * Step 6: Summary & Quote
 * Review configuration and display quote
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";
import BOMTable from "../BOMTable";
import { useEffect, useState } from "react";

export default function Step6Summary() {
  const {
    formData,
    quoteResult,
    setQuoteResult,
    isComputing,
    setIsComputing,
  } = useQuoteForm();

  const [error, setError] = useState<string | null>(null);

  // Compute quote when component mounts
  useEffect(() => {
    computeQuote();
  }, []);

  const computeQuote = async () => {
    setIsComputing(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes/compute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: formData,
          taxRate: 0, // No tax for now
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to compute quote");
      }

      if (data.success) {
        setQuoteResult(data.result);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("Error computing quote:", err);
      setError(err instanceof Error ? err.message : "Failed to compute quote");
    } finally {
      setIsComputing(false);
    }
  };

  const exportCSV = () => {
    if (!quoteResult) return;

    // Build CSV content
    const headers = ["Product Code", "Name", "Quantity", "Unit", "Unit Price", "Total"];
    const rows = quoteResult.bom.map((line: any) => [
      line.product,
      line.name,
      line.qty,
      line.unit,
      line.unit_price,
      line.line_total,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.join(",")),
      "",
      `Subtotal,,,,,${quoteResult.subtotal}`,
      `Tax,,,,,${quoteResult.tax}`,
      `Total,,,,,${quoteResult.total}`,
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quote-${formData.project_name || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!quoteResult) return;

    try {
      // Call PDF generation API
      const response = await fetch("/api/quotes/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: formData,
          bom: quoteResult.bom,
          totals: {
            subtotal: quoteResult.subtotal,
            tax: quoteResult.tax,
            tax_rate: 0,
            total: quoteResult.total,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Download PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quote-${formData.project_name || "export"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Summary & Quote
        </h2>
        <p className="text-gray-600">
          Review your configuration and quote details
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuration Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Project:</span>
            <span className="ml-2 text-gray-900">{formData.project_name}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Country:</span>
            <span className="ml-2 text-gray-900">{formData.country}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Design Length:</span>
            <span className="ml-2 text-gray-900">
              {formData.design_len}m (RHR:{" "}
              {formData.design_len
                ? Math.ceil(formData.design_len / 1.8) * 1.8
                : 0}
              m)
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Tracks:</span>
            <span className="ml-2 text-gray-900">{formData.tracks}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Gauge:</span>
            <span className="ml-2 text-gray-900">{formData.gauge}mm</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Crossing Angle:</span>
            <span className="ml-2 text-gray-900">
              {formData.crossing_angle}°
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Usage:</span>
            <span className="ml-2 text-gray-900">{formData.usage}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Speed:</span>
            <span className="ml-2 text-gray-900">{formData.speed_kph} km/h</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Field Panel:</span>
            <span className="ml-2 text-gray-900">
              {formData.field_panel_type}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Edge Beam:</span>
            <span className="ml-2 text-gray-900">{formData.edge_beam}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Connection:</span>
            <span className="ml-2 text-gray-900">{formData.connection}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Material:</span>
            <span className="ml-2 text-gray-900">{formData.material}</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isComputing && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Computing your quote...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error computing quote
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={computeQuote}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Result */}
      {quoteResult && !isComputing && (
        <>
          {/* Validation Errors/Warnings */}
          {(quoteResult.errors?.length > 0 ||
            quoteResult.warnings?.length > 0) && (
            <div className="space-y-2">
              {quoteResult.errors?.map((err: string, i: number) => (
                <div
                  key={i}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <p className="text-sm text-red-700">❌ {err}</p>
                </div>
              ))}
              {quoteResult.warnings?.map((warn: string, i: number) => (
                <div
                  key={i}
                  className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                >
                  <p className="text-sm text-amber-700">⚠️ {warn}</p>
                </div>
              ))}
            </div>
          )}

          {/* BOM Table */}
          {quoteResult.valid && (
            <>
              <BOMTable
                bom={quoteResult.bom}
                subtotal={quoteResult.subtotal}
                tax={quoteResult.tax}
                total={quoteResult.total}
                currency={formData.currency}
              />

              {/* Export Actions */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  Download PDF
                </button>
              </div>

              {/* Metadata */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Quote Metadata
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Rule Set Version:</span>{" "}
                    {quoteResult.rule_set_version}
                  </div>
                  <div>
                    <span className="font-medium">Price List ID:</span>{" "}
                    {quoteResult.price_list_id}
                  </div>
                  <div>
                    <span className="font-medium">Compute Hash:</span>{" "}
                    <code className="bg-white px-1 py-0.5 rounded text-xs">
                      {quoteResult.compute_hash?.substring(0, 16)}...
                    </code>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
