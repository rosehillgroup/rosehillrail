"use client";

/**
 * Progress Header Component
 * Shows current step in the 6-step wizard
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";

const steps = [
  { number: 1, title: "Project", description: "Define context" },
  { number: 2, title: "Geometry", description: "Define layout" },
  { number: 3, title: "Usage", description: "Define load" },
  { number: 4, title: "Panels", description: "Choose surface" },
  { number: 5, title: "Connection", description: "Choose structure" },
  { number: 6, title: "Summary", description: "Review & confirm" },
];

export default function ProgressHeader() {
  const { currentStep, setCurrentStep } = useQuoteForm();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Progress Steps */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                {/* Step Circle */}
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    border-2 font-semibold text-sm transition-colors
                    ${
                      currentStep === step.number
                        ? "bg-blue-600 border-blue-600 text-white"
                        : currentStep > step.number
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-white border-gray-300 text-gray-500"
                    }
                    hover:border-blue-400 cursor-pointer
                  `}
                >
                  {currentStep > step.number ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>

                {/* Step Label (desktop only) */}
                <div className="hidden md:block ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.description}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`
                      hidden md:block w-12 h-0.5 mx-4
                      ${currentStep > step.number ? "bg-green-600" : "bg-gray-300"}
                    `}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Counter (mobile) */}
          <div className="md:hidden text-sm font-medium text-gray-700">
            Step {currentStep} of 6
          </div>
        </div>
      </div>
    </div>
  );
}
