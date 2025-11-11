"use client";

/**
 * Step 5: Connection System
 * Connection type and material selection
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";
import type { ConnectionType, MaterialType } from "@/lib/types";

const connectionTypes: {
  value: ConnectionType;
  label: string;
  description: string;
  fullName: string;
}[] = [
  {
    value: "BP",
    label: "BP",
    fullName: "Baseplated",
    description: "Traditional baseplated connection system",
  },
  {
    value: "LO",
    label: "LO",
    fullName: "Loop Connect",
    description: "Loop connection system for medium loads",
  },
  {
    value: "HK",
    label: "HK",
    fullName: "High K",
    description: "High-strength K-bracket system",
  },
  {
    value: "LOL",
    label: "LOL",
    fullName: "Loop Interlocker",
    description: "Interlocking loop system for enhanced stability",
  },
  {
    value: "SF2K",
    label: "SF2K",
    fullName: "Special Connection SF2K",
    description: "Specialized connection for specific applications",
  },
  {
    value: "PCK",
    label: "PCK",
    fullName: "Platform Connection Kit",
    description: "Platform connection system",
  },
];

const materialTypes: {
  value: MaterialType;
  label: string;
  description: string;
}[] = [
  {
    value: "P(B)",
    label: "P(B) - Polymer with Baseplate",
    description: "Standard polymer compound with baseplate",
  },
  {
    value: "A(B)",
    label: "A(B) - Advanced Polymer",
    description: "High-performance advanced polymer",
  },
  {
    value: "JV",
    label: "JV - Jarvis",
    description: "Jarvis system material",
  },
  {
    value: "N",
    label: "N - Nylon",
    description: "Nylon compound material",
  },
  {
    value: "TC",
    label: "TC - ThermoComposite",
    description: "Thermoplastic composite material",
  },
];

export default function Step5Connection() {
  const { formData, updateFormData } = useQuoteForm();

  // Simplified connection filtering (would be enhanced with actual rules engine call)
  const getConnectionAvailability = (conn: ConnectionType) => {
    // Ultra Heavy excludes LO
    if (formData.usage === "Ultra Heavy" && conn === "LO") {
      return {
        available: false,
        reason: "LO connection insufficient for ultra heavy loading",
      };
    }

    // High speed excludes LOL and SF2K
    if (formData.speed_kph && formData.speed_kph > 80) {
      if (conn === "LOL" || conn === "SF2K") {
        return {
          available: false,
          reason: "Not suitable for speeds above 80 km/h",
        };
      }
    }

    // Pedestrian only needs LO or BP
    if (formData.usage === "Pedestrian & Cycles") {
      if (conn !== "LO" && conn !== "BP") {
        return {
          available: false,
          reason: "Lighter connections sufficient for pedestrian traffic",
        };
      }
    }

    return { available: true };
  };

  // Simplified material filtering
  const getMaterialAvailability = (material: MaterialType) => {
    if (formData.connection === "LOL") {
      if (material !== "JV") {
        return {
          available: false,
          reason: "LOL connection only compatible with JV material",
        };
      }
    }

    return { available: true };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connection System
        </h2>
        <p className="text-gray-600">
          Select your connection type and material
        </p>
      </div>

      <div className="space-y-6">
        {/* Connection Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Connection Type *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectionTypes.map((type) => {
              const availability = getConnectionAvailability(type.value);
              return (
                <label
                  key={type.value}
                  className={`
                    block p-4 border-2 rounded-lg transition-all
                    ${
                      !availability.available
                        ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                        : formData.connection === type.value
                        ? "border-blue-500 bg-blue-50 cursor-pointer"
                        : "border-gray-200 hover:border-blue-300 cursor-pointer"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="connection"
                    value={type.value}
                    checked={formData.connection === type.value}
                    onChange={(e) =>
                      updateFormData({
                        connection: e.target.value as ConnectionType,
                      })
                    }
                    disabled={!availability.available}
                    className="sr-only"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900 mb-1">
                      {type.label} - {type.fullName}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {type.description}
                    </div>
                    {!availability.available && (
                      <div className="text-xs text-red-600 mt-2">
                        ✗ {availability.reason}
                      </div>
                    )}
                    {availability.available &&
                      formData.connection === type.value && (
                        <div className="text-xs text-green-600 mt-2">
                          ✓ Selected
                        </div>
                      )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Material Type */}
        {formData.connection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Material Type *
            </label>
            <div className="space-y-2">
              {materialTypes.map((type) => {
                const availability = getMaterialAvailability(type.value);
                return (
                  <label
                    key={type.value}
                    className={`
                      block p-4 border-2 rounded-lg transition-all
                      ${
                        !availability.available
                          ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                          : formData.material === type.value
                          ? "border-blue-500 bg-blue-50 cursor-pointer"
                          : "border-gray-200 hover:border-blue-300 cursor-pointer"
                      }
                    `}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="material"
                        value={type.value}
                        checked={formData.material === type.value}
                        onChange={(e) =>
                          updateFormData({
                            material: e.target.value as MaterialType,
                          })
                        }
                        disabled={!availability.available}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {type.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {type.description}
                        </div>
                        {!availability.available && (
                          <div className="text-xs text-red-600 mt-1">
                            ✗ {availability.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Almost There!
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Once you've selected your connection system and material, you'll be
              able to review your complete configuration and get your quote.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
