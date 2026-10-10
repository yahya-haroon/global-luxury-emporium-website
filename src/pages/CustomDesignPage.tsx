import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CustomDesignFormState } from '../types/customDesign';
import { INITIAL_CUSTOM_DESIGN_STATE } from '../lib/customDesignOptions';
import { CustomDesignSteps } from '../components/customDesign/CustomDesignSteps';
import { CustomDesignSuccess } from '../components/customDesign/CustomDesignSuccess';
import { submitCustomDesignRequest } from '../lib/customDesignApi';
import { Sparkles, Shield, Clock, Scissors, RotateCcw } from 'lucide-react';

const DRAFT_STORAGE_KEY = 'gle_custom_design_draft_v1';

export const CustomDesignPage: React.FC = () => {
  // Page SEO title
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Design Your Own Bespoke Jacket & Coat | Global Luxury Emporium';
    window.scrollTo(0, 0);
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Load draft from sessionStorage if available
  const [form, setForm] = useState<CustomDesignFormState>(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return {
          ...INITIAL_CUSTOM_DESIGN_STATE,
          ...JSON.parse(saved),
        };
      }
    } catch {
      // ignore
    }
    return INITIAL_CUSTOM_DESIGN_STATE;
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Auto-save form draft to sessionStorage
  useEffect(() => {
    try {
      // Don't save large dataUrls to sessionStorage to avoid storage quota errors
      const draftToSave = {
        ...form,
        referenceImages: form.referenceImages.map((img) => ({
          ...img,
          dataUrl: undefined,
        })),
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftToSave));
    } catch {
      // ignore
    }
  }, [form]);

  const updateForm = (patch: Partial<CustomDesignFormState>) => {
    setForm((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to start a new design? Current selections will be cleared.')) {
      setForm(INITIAL_CUSTOM_DESIGN_STATE);
      setCurrentStep(1);
      setSubmittedRef(null);
      setSubmissionError(null);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const handleSubmitQuote = async () => {
    setSubmissionError(null);

    // Validate required contact fields
    if (!form.contact.fullName.trim()) {
      setSubmissionError('Please provide your full name.');
      return;
    }
    if (!form.contact.email.trim() || !form.contact.email.includes('@')) {
      setSubmissionError('Please enter a valid email address.');
      return;
    }
    if (!form.contact.phone.trim()) {
      setSubmissionError('Please provide your phone or WhatsApp number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitCustomDesignRequest(form);

      if (!res.success) {
        setSubmissionError(res.error || 'Failed to submit your request. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success
      setSubmittedRef(res.referenceNumber);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmissionError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already submitted successfully, render success state
  if (submittedRef) {
    return (
      <main className="min-h-screen py-10 px-4 sm:px-6 bg-[#212121] text-[#F5F2EB]" role="main">
        <CustomDesignSuccess
          referenceNumber={submittedRef}
          form={form}
          onReset={() => {
            setForm(INITIAL_CUSTOM_DESIGN_STATE);
            setCurrentStep(1);
            setSubmittedRef(null);
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-10 bg-[#212121] text-[#F5F2EB]" role="main">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-[#9E978C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#D4AF37] transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#F5F2EB] font-semibold">Custom Designer</span>
        </nav>

        {/* Page Header */}
        <header className="mb-8 border-b border-[#2E2A24] pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-widest bg-[#D4AF37]/15 text-[#D4AF37] mb-2">
              <Scissors className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Bespoke Atelier Configurator</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#F5F2EB] tracking-tight">
              Design Your Own
            </h1>
            <p className="text-sm sm:text-base text-[#9E978C] mt-2 font-light leading-relaxed max-w-2xl">
              Create a jacket or coat that reflects your style. Choose your silhouette, materials, colours and details, then send us your design for a personalised quotation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[#9E978C] hover:text-[#F5F2EB] flex items-center gap-1.5 py-1.5 px-3 rounded hover:bg-[#D4AF37]/10 transition-colors"
              title="Reset configuration"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Selections</span>
            </button>
          </div>
        </header>

        {/* Luxury Trust Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 px-4 mb-8 bg-[#1B1B1B] rounded border border-[#2E2A24] text-xs text-[#9E978C]">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[11px] font-medium text-[#F5F2EB]">Bespoke Handcrafted Fit</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[11px] font-medium text-[#F5F2EB]">European Full-Grain Leathers</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[11px] font-medium text-[#F5F2EB]">Complimentary Monogramming</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-[11px] font-medium text-[#F5F2EB]">No-Obligation Quotation</span>
          </div>
        </div>

        {/* Main Customization Workspace */}
        <div className="bg-[#181818] rounded-sm border border-[#2E2A24] p-6 sm:p-8 lg:p-10 shadow-xs">
          <CustomDesignSteps
            currentStep={currentStep}
            onStepChange={(step) => {
              setCurrentStep(step);
              window.scrollTo({ top: 160, behavior: 'smooth' });
            }}
            form={form}
            updateForm={updateForm}
            onSubmitQuote={handleSubmitQuote}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
          />
        </div>
      </div>
    </main>
  );
};
export default CustomDesignPage;
