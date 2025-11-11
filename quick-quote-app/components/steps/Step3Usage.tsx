"use client";

/**
 * Step 3: Usage & Environment
 * Road type, traffic class, speed
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";
import type { UsageType } from "@/lib/types";

const usageTypes: { value: UsageType; label: string; description: string }[] = [
  {
    value: "Ultra Heavy",
    label: "Ultra Heavy (Mining/City Centre)",
    description: "Heavy equipment, high frequency, maximum durability",
  },
  {
    value: "Heavy",
    label: "Heavy (High truck use)",
    description: "Frequent heavy vehicle traffic",
  },
  {
    value: "Medium to Heavy",
    label: "Medium to Heavy",
    description: "Mixed traffic with regular heavy vehicles",
  },
  {
    value: "Light to Medium",
    label: "Light to Medium",
    description: "Primarily light vehicles, occasional heavy traffic",
  },
  {
    value: "Pedestrian & Cycles",
    label: "Pedestrian & Cycles Only",
    description: "Foot and bicycle traffic only",
  },
  {
    value: "Agricultural",
    label: "Agricultural Machinery",
    description: "Farm equipment and agricultural vehicles",
  },
  {
    value: "Rail Road Access",
    label: "Rail Road Access Point",
    description: "Specialized access for rail maintenance",
  },
];

export default function Step3Usage() {
  const { formData, updateFormData } = useQuoteForm();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Usage & Environment
        </h2>
        <p className="text-gray-600">
          Define the expected traffic and operational conditions
        </p>
      </div>

      <div className="space-y-6">
        {/* Usage Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Road Type / Usage *
          </label>
          <div className="space-y-2">
            {usageTypes.map((type) => (
              <label
                key={type.value}
                className={`
                  block p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${
                    formData.usage === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }
                `}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="usage"
                    value={type.value}
                    checked={formData.usage === type.value}
                    onChange={(e) =>
                      updateFormData({ usage: e.target.value as UsageType })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {type.label}
                    </div>
                    <div className="text-sm text-gray-500">
                      {type.description}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Traffic Class */}
        <div>
          <label
            htmlFor="traffic_class"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Traffic Class
          </label>
          <select
            id="traffic_class"
            value={formData.traffic_class || "Medium"}
            onChange={(e) =>
              updateFormData({ traffic_class: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Ultra Heavy">Ultra Heavy</option>
            <option value="Heavy">Heavy</option>
            <option value="Medium">Medium</option>
            <option value="Light">Light</option>
            <option value="Pedestrian">Pedestrian</option>
          </select>
        </div>

        {/* Road Speed */}
        <div>
          <label
            htmlFor="speed_kph"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Road Speed (km/h) *
          </label>
          <input
            type="number"
            id="speed_kph"
            min="0"
            max="120"
            value={formData.speed_kph || ""}
            onChange={(e) =>
              updateFormData({ speed_kph: parseInt(e.target.value) })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Maximum speed: 120 km/h
          </p>
          {formData.speed_kph && formData.speed_kph > 80 && (
            <p className="mt-1 text-sm text-amber-600">
              ⚠ High speed (&gt;80 km/h) limits available connection types
            </p>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">
              Connection Filtering
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              Your usage type and speed will determine which connection systems
              are available in the next steps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
