"use client";

/**
 * Step 1: Project Definition
 * Project name, customer, country, currency
 */

import { useQuoteForm } from "@/contexts/QuoteFormContext";

export default function Step1Project() {
  const { formData, updateFormData } = useQuoteForm();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Project Definition
        </h2>
        <p className="text-gray-600">
          Let's start by defining the basic project information
        </p>
      </div>

      <div className="space-y-4">
        {/* Project Name */}
        <div>
          <label
            htmlFor="project_name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Project Name *
          </label>
          <input
            type="text"
            id="project_name"
            value={formData.project_name || ""}
            onChange={(e) => updateFormData({ project_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter project name"
            required
          />
        </div>

        {/* Country */}
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Country *
          </label>
          <select
            id="country"
            value={formData.country || "Germany"}
            onChange={(e) => updateFormData({ country: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="Germany">Germany</option>
            <option value="France">France</option>
            <option value="UK">United Kingdom</option>
            <option value="Netherlands">Netherlands</option>
            <option value="Belgium">Belgium</option>
            <option value="Spain">Spain</option>
            <option value="Italy">Italy</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label
            htmlFor="currency"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Currency *
          </label>
          <select
            id="currency"
            value={formData.currency || "EUR"}
            onChange={(e) => updateFormData({ currency: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="USD">USD ($)</option>
          </select>
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
              About this configurator
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              This wizard will guide you through 6 steps to configure your rail
              crossing system and receive an instant quote.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
