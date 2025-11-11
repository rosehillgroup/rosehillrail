"use client";

/**
 * Step 2: Geometry Configuration
 * Length, tracks, gauge, spacing, angle
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";
import { useEffect } from "react";
import CrossingSchematic from "../CrossingSchematic";

export default function Step2Geometry() {
  const { formData, updateFormData } = useQuoteForm();

  // Calculate RHR length preview
  const rhrLength = formData.design_len
    ? Math.ceil(formData.design_len / 1.8) * 1.8
    : 0;

  // Set default track spacing when tracks increases to > 1
  useEffect(() => {
    if (formData.tracks && formData.tracks > 1 && !formData.track_spacing) {
      updateFormData({ track_spacing: 4.0 });
    }
  }, [formData.tracks]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Geometry Configuration
        </h2>
        <p className="text-gray-600">
          Define the physical layout of your crossing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Design Length */}
        <div>
          <label
            htmlFor="design_len"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Design Length (m) *
          </label>
          <input
            type="number"
            id="design_len"
            step="0.1"
            min="1.0"
            max="50.0"
            value={formData.design_len || ""}
            onChange={(e) =>
              updateFormData({ design_len: parseFloat(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          {rhrLength > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              RHR Length: {rhrLength.toFixed(1)}m (rounded to 1.8m increments)
            </p>
          )}
        </div>

        {/* Number of Tracks */}
        <div>
          <label
            htmlFor="tracks"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Number of Tracks *
          </label>
          <input
            type="number"
            id="tracks"
            min="1"
            max="10"
            value={formData.tracks || ""}
            onChange={(e) =>
              updateFormData({ tracks: parseInt(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Rail Gauge */}
        <div>
          <label
            htmlFor="gauge"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Rail Gauge (mm) *
          </label>
          <input
            type="number"
            id="gauge"
            min="600"
            max="1700"
            value={formData.gauge || ""}
            onChange={(e) =>
              updateFormData({ gauge: parseInt(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Standard gauge: 1435mm
          </p>
        </div>

        {/* Track Spacing */}
        <div>
          <label
            htmlFor="track_spacing"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Track Spacing (m)
          </label>
          <input
            type="number"
            id="track_spacing"
            step="0.1"
            min="0"
            max="10"
            value={formData.track_spacing || ""}
            onChange={(e) =>
              updateFormData({ track_spacing: parseFloat(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={(formData.tracks || 1) <= 1}
          />
          {(formData.tracks || 1) <= 1 ? (
            <p className="mt-1 text-sm text-gray-500">
              Only needed for multi-track installations
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Typical: 3.5m - 5.0m (default: 4.0m)
            </p>
          )}
        </div>

        {/* Crossing Angle */}
        <div>
          <label
            htmlFor="crossing_angle"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Crossing Angle (°) *
          </label>
          <input
            type="number"
            id="crossing_angle"
            min="30"
            max="90"
            value={formData.crossing_angle || ""}
            onChange={(e) =>
              updateFormData({ crossing_angle: parseInt(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Recommended: 60° - 90° (perpendicular)
          </p>
        </div>

        {/* Sleeper Spacing */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="sleeperSpacing600"
            checked={formData.sleeperSpacing600 || false}
            onChange={(e) =>
              updateFormData({ sleeperSpacing600: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="sleeperSpacing600"
            className="ml-2 block text-sm text-gray-700"
          >
            Sleeper spacing is 600mm
          </label>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Quick Reference
        </h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Standard gauge: 1435mm (most common worldwide)</li>
          <li>• Narrow gauge: 1000mm, 1067mm</li>
          <li>• Wide gauge: 1520mm (Russia), 1668mm (Spain/Portugal)</li>
          <li>• Typical track spacing: 3.5m - 5.0m</li>
        </ul>
      </div>

      {/* Live Schematic Visualization */}
      {formData.design_len &&
        formData.tracks &&
        formData.gauge &&
        formData.crossing_angle && (
          <CrossingSchematic
            length={formData.design_len}
            tracks={formData.tracks}
            angle={formData.crossing_angle}
            gauge={formData.gauge}
            trackSpacing={formData.track_spacing}
          />
        )}
    </div>
  );
}
