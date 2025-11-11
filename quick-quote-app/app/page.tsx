"use client";

import { QuoteFormProvider } from "@/contexts/QuoteFormContext";
import QuoteWizard from "@/components/QuoteWizard";

export default function Home() {
  return (
    <QuoteFormProvider>
      <QuoteWizard />
    </QuoteFormProvider>
  );
}
