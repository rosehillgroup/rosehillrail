"use client";

/**
 * Quote Wizard Component
 * Main wizard container with step navigation
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";
import ProgressHeader from "./ProgressHeader";
import Step1Project from "./steps/Step1Project";
import Step2Geometry from "./steps/Step2Geometry";
import Step3Usage from "./steps/Step3Usage";
import Step4Panels from "./steps/Step4Panels";
import Step5Connection from "./steps/Step5Connection";
import Step6Summary from "./steps/Step6Summary";

export default function QuoteWizard() {
  const { currentStep, nextStep, prevStep, canProceed, resetFormData } =
    useQuoteForm();

  // Render current step component
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Project />;
      case 2:
        return <Step2Geometry />;
      case 3:
        return <Step3Usage />;
      case 4:
        return <Step4Panels />;
      case 5:
        return <Step5Connection />;
      case 6:
        return <Step6Summary />;
      default:
        return <Step1Project />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <ProgressHeader />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Step Content */}
          <div className="mb-8">{renderStep()}</div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Previous
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Reset Button */}
              {currentStep === 6 && (
                <button
                  onClick={resetFormData}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Start New Quote
                </button>
              )}

              {/* Next Button */}
              {currentStep < 6 && (
                <button
                  onClick={nextStep}
                  disabled={!canProceed}
                  className={`
                    inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium text-white
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors
                    ${
                      canProceed
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-300 cursor-not-allowed"
                    }
                  `}
                >
                  {currentStep === 5 ? "Generate Quote" : "Next"}
                  <svg
                    className="ml-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Progress Indicator (mobile) */}
          <div className="mt-4 md:hidden">
            <div className="flex items-center justify-center text-sm text-gray-500">
              Step {currentStep} of 6
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
