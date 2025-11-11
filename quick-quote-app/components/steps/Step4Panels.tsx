"use client";

/**
 * Step 4: Panels & Edges
 * Field panel type and edge beam selection
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";
import type { FieldPanelType, EdgeBeamType } from "@/lib/types";

const fieldPanelTypes: {
  value: FieldPanelType;
  label: string;
  description: string;
  gaugeRange: string;
}[] = [
  {
    value: "FP",
    label: "FP (Field Panel)",
    description: "Standard field panel for typical applications",
    gaugeRange: "436mm - 565mm",
  },
  {
    value: "WFP",
    label: "WFP (Wide Field Panel)",
    description: "Wide field panel for standard to wide gauge",
    gaugeRange: "565mm - 840mm",
  },
  {
    value: "SWFP",
    label: "SWFP (Super Wide Field Panel)",
    description: "Super wide field panel for very wide gauge",
    gaugeRange: "> 840mm",
  },
];

const edgeBeamTypes: {
  value: EdgeBeamType;
  label: string;
  description: string;
  recommended: string[];
}[] = [
  {
    value: "REB TC",
    label: "REB TC (Rubber Edge Beam)",
    description: "Continuous rubber beam, flexible and durable",
    recommended: ["Light to Medium", "Pedestrian & Cycles", "Agricultural"],
  },
  {
    value: "PVC AEB @ 1.8m",
    label: "PVC AEB @ 1.8m",
    description: "PVC aluminum edge beam in 1.8m segments",
    recommended: ["Light to Medium", "Pedestrian & Cycles"],
  },
  {
    value: "PVC AEB @ 3.6m",
    label: "PVC AEB @ 3.6m",
    description: "PVC aluminum edge beam in 3.6m segments",
    recommended: ["Medium to Heavy"],
  },
  {
    value: "Steel AEB @ 1.8m",
    label: "Steel AEB @ 1.8m",
    description: "Steel edge beam in 1.8m segments, high strength",
    recommended: ["Heavy", "Ultra Heavy"],
  },
  {
    value: "Steel AEB @ 3.6m",
    label: "Steel AEB @ 3.6m",
    description: "Steel edge beam in 3.6m segments, maximum strength",
    recommended: ["Heavy", "Ultra Heavy"],
  },
  {
    value: "Customer Concrete",
    label: "Customer Concrete Edge Beam",
    description: "Customer supplies their own concrete edge beam",
    recommended: [],
  },
];

export default function Step4Panels() {
  const { formData, updateFormData } = useQuoteForm();

  const isEdgeBeamRecommended = (type: EdgeBeamType): boolean => {
    if (!formData.usage) return false;
    const edgeBeam = edgeBeamTypes.find((e) => e.value === type);
    return edgeBeam?.recommended.includes(formData.usage) || false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Panels & Edge Beams
        </h2>
        <p className="text-gray-600">
          Choose your field panel type and edge beam configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* Field Panel Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Field Panel Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fieldPanelTypes.map((type) => (
              <label
                key={type.value}
                className={`
                  block p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${
                    formData.field_panel_type === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }
                `}
              >
                <input
                  type="radio"
                  name="field_panel_type"
                  value={type.value}
                  checked={formData.field_panel_type === type.value}
                  onChange={(e) =>
                    updateFormData({
                      field_panel_type: e.target.value as FieldPanelType,
                    })
                  }
                  className="sr-only"
                />
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    {type.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    Gauge: {type.gaugeRange}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Edge Beam Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Edge Beam Type *
          </label>
          <div className="space-y-2">
            {edgeBeamTypes.map((type) => {
              const recommended = isEdgeBeamRecommended(type.value);
              return (
                <label
                  key={type.value}
                  className={`
                    block p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${
                      formData.edge_beam === type.value
                        ? "border-blue-500 bg-blue-50"
                        : recommended
                        ? "border-green-200 bg-green-50 hover:border-green-300"
                        : "border-gray-200 hover:border-blue-300"
                    }
                  `}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="edge_beam"
                      value={type.value}
                      checked={formData.edge_beam === type.value}
                      onChange={(e) =>
                        updateFormData({
                          edge_beam: e.target.value as EdgeBeamType,
                        })
                      }
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">
                          {type.label}
                        </div>
                        {recommended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {type.description}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Edge Beam Selection
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Edge beams marked as "Recommended" are suggested based on your
              selected usage type. However, you may choose any option based on
              your specific requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
