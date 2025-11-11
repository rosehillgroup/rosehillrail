"use client";

/**
 * Quote Form Context
 * Manages wizard state across all 6 steps
 */

import React, { createContext, useContext, useState, ReactNode } from "react";
import type { QuoteInput } from "@/lib/types";

interface QuoteFormContextType {
  // Form data
  formData: Partial<QuoteInput>;
  updateFormData: (data: Partial<QuoteInput>) => void;
  resetFormData: () => void;

  // Wizard navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceed: boolean;

  // Computed quote result
  quoteResult: any;
  setQuoteResult: (result: any) => void;
  isComputing: boolean;
  setIsComputing: (computing: boolean) => void;

  // Validation errors
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

const QuoteFormContext = createContext<QuoteFormContextType | undefined>(
  undefined
);

const initialFormData: Partial<QuoteInput> = {
  project_name: "",
  country: "Germany",
  currency: "EUR",
  design_len: 3.6,
  tracks: 1,
  gauge: 1435,
  track_spacing: 0,
  crossing_angle: 90,
  sleeperSpacing600: true,
  usage: "Medium to Heavy",
  traffic_class: "Medium",
  speed_kph: 50,
  field_panel_type: "FP",
  edge_beam: "REB TC",
  connection: "LO",
  material: "TC",
};

export function QuoteFormProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<Partial<QuoteInput>>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (data: Partial<QuoteInput>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const resetFormData = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setQuoteResult(null);
    setErrors({});
  };

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if user can proceed based on required fields for current step
  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case 1: // Project Definition
        return !!(formData.project_name && formData.country && formData.currency);
      case 2: // Geometry
        return !!(
          formData.design_len &&
          formData.tracks &&
          formData.gauge &&
          formData.crossing_angle
        );
      case 3: // Usage & Environment
        return !!(formData.usage && formData.speed_kph !== undefined);
      case 4: // Panels & Edges
        return !!(formData.field_panel_type && formData.edge_beam);
      case 5: // Connection System
        return !!(formData.connection && formData.material);
      case 6: // Summary
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const value: QuoteFormContextType = {
    formData,
    updateFormData,
    resetFormData,
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    canProceed,
    quoteResult,
    setQuoteResult,
    isComputing,
    setIsComputing,
    errors,
    setErrors,
  };

  return (
    <QuoteFormContext.Provider value={value}>
      {children}
    </QuoteFormContext.Provider>
  );
}

export function useQuoteForm() {
  const context = useContext(QuoteFormContext);
  if (context === undefined) {
    throw new Error("useQuoteForm must be used within a QuoteFormProvider");
  }
  return context;
}
