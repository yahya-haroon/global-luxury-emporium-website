import React, { useRef, useState } from 'react';
import {
  CustomDesignFormState,
  OuterColorId,
  LiningColorId,
  HardwareFinish,
  FitPreference,
  ReferenceImageFile,
  CollarStyle,
  ClosureType,
  PocketConfig,
  BeltStyle,
  StitchingTone,
} from '../../types/customDesign';
import {
  GARMENT_LENGTH_OPTIONS,
  GARMENT_STYLE_OPTIONS,
  OUTER_MATERIAL_OPTIONS,
  OUTER_COLORS,
  LINING_MATERIALS,
  LINING_COLORS,
  HARDWARE_FINISHES,
  STANDARD_SIZES,
  COLLAR_OPTIONS,
  CLOSURE_OPTIONS,
  POCKET_OPTIONS,
} from '../../lib/customDesignOptions';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  Trash2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Ruler,
  Image as ImageIcon,
  Edit2,
} from 'lucide-react';

interface CustomDesignStepsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  form: CustomDesignFormState;
  updateForm: (patch: Partial<CustomDesignFormState>) => void;
  onSubmitQuote: () => void;
  isSubmitting: boolean;
  submissionError: string | null;
}

export const CustomDesignSteps: React.FC<CustomDesignStepsProps> = ({
  currentStep,
  onStepChange,
  form,
  updateForm,
  onSubmitQuote,
  isSubmitting,
  submissionError,
}) => {
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to update nested details
  const updateDetails = (patch: Partial<CustomDesignFormState['details']>) => {
    updateForm({
      details: {
        ...form.details,
        ...patch,
      },
    });
  };

  // Helper to update contact
  const updateContact = (patch: Partial<CustomDesignFormState['contact']>) => {
    updateForm({
      contact: {
        ...form.contact,
        ...patch,
      },
    });
  };

  // Helper to update measurements
  const updateMeasurements = (patch: Partial<CustomDesignFormState['customMeasurements']>) => {
    updateForm({
      customMeasurements: {
        ...form.customMeasurements,
        ...patch,
      },
    });
  };

  // Image Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (form.referenceImages.length + files.length > 5) {
      setImageUploadError('You can upload a maximum of 5 reference images.');
      return;
    }

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    Array.from(files).forEach((file) => {
      if (!acceptedTypes.includes(file.type)) {
        setImageUploadError(`"${file.name}" is not an accepted format. Please upload JPEG, PNG, or WebP.`);
        return;
      }

      if (file.size > maxSizeBytes) {
        setImageUploadError(`"${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newRef: ReferenceImageFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          label: form.referenceImages.length === 0 ? 'Front' : form.referenceImages.length === 1 ? 'Back' : 'Inspiration',
          dataUrl,
        };

        updateForm({
          referenceImages: [...form.referenceImages, newRef],
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    updateForm({
      referenceImages: form.referenceImages.filter((img) => img.id !== id),
    });
  };

  const updateImageLabel = (id: string, label: ReferenceImageFile['label']) => {
    updateForm({
      referenceImages: form.referenceImages.map((img) =>
        img.id === id ? { ...img, label } : img
      ),
    });
  };

  const STEP_TITLES = [
    'Length & Silhouette',
    'Garment Style',
    'Outer Material',
    'Outer Colour',
    'Interior Lining',
    'Design Details',
    'Reference Images',
    'Size & Fit',
    'Review & Submit',
  ];

  return (
    <div className="flex flex-col space-y-8">
      {/* Top Step Breadcrumbs / Progress */}
      <div className="border-b border-[#2E2A24] pb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          {STEP_TITLES.map((title, idx) => {
            const stepNum = idx + 1;
            const isCurrent = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;

            return (
              <React.Fragment key={title}>
                <button
                  type="button"
                  onClick={() => onStepChange(stepNum)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-[#D4AF37] text-[#000000] font-semibold shadow-xs'
                      : isCompleted
                      ? 'text-[#F5F2EB] hover:text-[#F5DF88] hover:bg-[#2E2A24]/40'
                      : 'text-[#9E978C] hover:text-[#F5F2EB]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isCurrent
                        ? 'bg-[#000000] text-[#D4AF37]'
                        : isCompleted
                        ? 'bg-[#2E2A24] text-[#D4AF37]'
                        : 'bg-[#2E2A24] text-[#9E978C]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-2.5 h-2.5" /> : stepNum}
                  </span>
                  <span>{title}</span>
                </button>
                {idx < STEP_TITLES.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#2E2A24] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: LENGTH & SILHOUETTE */}
      {currentStep === 1 && (
        <section className="space-y-5 animate-fade-in" aria-labelledby="step-1-heading">
          <div>
            <h2 id="step-1-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 1: Choose Garment Length &amp; Silhouette
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Select the foundational silhouette proportion for your bespoke garment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {GARMENT_LENGTH_OPTIONS.map((opt) => {
              const isSelected = form.length === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => updateForm({ length: opt.id })}
                  className={`relative p-4 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#212121] shadow-md ring-1 ring-[#D4AF37]'
                      : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60 hover:bg-[#212121]'
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      updateForm({ length: opt.id });
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-[#D4AF37]">
                        {opt.tagline}
                      </span>
                      <h3 className="font-serif text-lg text-[#F5F2EB] font-semibold mt-0.5">
                        {opt.label}
                      </h3>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#000000]'
                          : 'border-[#2E2A24] bg-[#181818]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  <p className="text-xs text-[#9E978C] mt-2 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* STEP 2: GARMENT STYLE */}
      {currentStep === 2 && (
        <section className="space-y-5 animate-fade-in" aria-labelledby="step-2-heading">
          <div>
            <h2 id="step-2-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 2: Choose Garment Style
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Select an iconic tailoring style, or submit your own bespoke hybrid concept.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {GARMENT_STYLE_OPTIONS.map((style) => {
              const isSelected = form.style === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => updateForm({ style: style.id })}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#212121] shadow-md ring-1 ring-[#D4AF37]'
                      : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60 hover:bg-[#212121]'
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      updateForm({ style: style.id });
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#9E978C] font-medium">
                        {style.category}
                      </span>
                      <h3 className="font-serif text-base font-semibold text-[#F5F2EB] mt-0.5">
                        {style.label}
                      </h3>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#000000]'
                          : 'border-[#2E2A24] bg-[#181818]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-xs text-[#9E978C] mt-2 leading-relaxed">
                    {style.description}
                  </p>
                </div>
              );
            })}
          </div>

          {form.style === 'custom' && (
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#D4AF37]/40 space-y-2 mt-4 animate-fade-in">
              <label htmlFor="custom-style-desc" className="block text-xs font-semibold uppercase tracking-wider text-[#F5F2EB]">
                Describe Your Custom Garment Concept
              </label>
              <textarea
                id="custom-style-desc"
                rows={3}
                value={form.customStyleDescription}
                onChange={(e) => updateForm({ customStyleDescription: e.target.value })}
                placeholder="Describe your desired design, collar, closure, vintage reference, or specific elements..."
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          )}
        </section>
      )}

      {/* STEP 3: OUTER MATERIAL */}
      {currentStep === 3 && (
        <section className="space-y-5 animate-fade-in" aria-labelledby="step-3-heading">
          <div>
            <h2 id="step-3-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 3: Select Outer Material
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Every hide and wool blend is sourced from renowned European tanneries and mills.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {OUTER_MATERIAL_OPTIONS.map((mat) => {
              const isSelected = form.outerMaterial === mat.id;
              return (
                <div
                  key={mat.id}
                  onClick={() => updateForm({ outerMaterial: mat.id })}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#212121] shadow-md ring-1 ring-[#D4AF37]'
                      : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60 hover:bg-[#212121]'
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      updateForm({ outerMaterial: mat.id });
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {mat.badge && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] mb-1">
                          {mat.badge}
                        </span>
                      )}
                      <h3 className="font-serif text-base font-semibold text-[#F5F2EB]">
                        {mat.label}
                      </h3>
                      <p className="text-[10px] text-[#9E978C] tracking-wide mt-0.5">
                        {mat.origin}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37] text-[#000000]'
                          : 'border-[#2E2A24] bg-[#181818]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  <p className="text-xs text-[#9E978C] mt-2 leading-relaxed">
                    {mat.description}
                  </p>

                  <div className="mt-2 pt-2 border-t border-[#2E2A24] text-[10px] text-[#9E978C] italic">
                    {mat.temperament}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-[#1E1E1E] border border-[#2E2A24] rounded text-xs text-[#9E978C] flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="m-0">
              Material availability can depend on garment silhouette and weight. Any rare finishes or exotic requests will be confirmed by our master craftsman during your formal quotation.
            </p>
          </div>
        </section>
      )}

      {/* STEP 4: OUTER COLOUR */}
      {currentStep === 4 && (
        <section className="space-y-5 animate-fade-in" aria-labelledby="step-4-heading">
          <div>
            <h2 id="step-4-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 4: Choose Outer Colour
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Select from our curated luxury dye palette, or request a bespoke Pantone shade.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
            {OUTER_COLORS.map((col) => {
              const isSelected = form.outerColor === col.id;
              return (
                <div
                  key={col.id}
                  onClick={() => updateForm({ outerColor: col.id as OuterColorId })}
                  className={`p-3 rounded border cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#212121] shadow-md ring-1 ring-[#D4AF37]'
                      : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60 hover:bg-[#212121]'
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      updateForm({ outerColor: col.id as OuterColorId });
                    }
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full border border-[#2E2A24] shrink-0 shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: col.hex }}
                  >
                    {isSelected && (
                      <Check className={`w-4 h-4 ${col.id === 'white' || col.id === 'cream' ? 'text-[#000000]' : 'text-white'}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#F5F2EB] truncate">
                      {col.name}
                    </p>
                    <p className="text-[10px] text-[#9E978C] truncate">
                      {col.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {form.outerColor === 'custom' && (
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#D4AF37]/40 space-y-2 mt-4 animate-fade-in">
              <label htmlFor="custom-outer-color-input" className="block text-xs font-semibold uppercase tracking-wider text-[#F5F2EB]">
                Specify Your Desired Custom Colour / Pantone
              </label>
              <input
                id="custom-outer-color-input"
                type="text"
                value={form.customOuterColor}
                onChange={(e) => updateForm({ customOuterColor: e.target.value })}
                placeholder="e.g. British Tan / Pantone 18-1142 / Antique Washed Tobacco..."
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          )}
        </section>
      )}

      {/* STEP 5: INTERIOR LINING */}
      {currentStep === 5 && (
        <section className="space-y-6 animate-fade-in" aria-labelledby="step-5-heading">
          <div>
            <h2 id="step-5-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 5: Choose Interior Lining
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Customize the comfort, weight, and interior contrast of your jacket.
            </p>
          </div>

          {/* Lining Material Sub-section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
              1. Lining Material &amp; Construction
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {LINING_MATERIALS.map((lin) => {
                const isSelected = form.liningMaterial === lin.id;
                return (
                  <div
                    key={lin.id}
                    onClick={() => updateForm({ liningMaterial: lin.id })}
                    className={`p-4 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#212121] shadow-md ring-1 ring-[#D4AF37]'
                        : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60 hover:bg-[#212121]'
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-semibold text-[#F5F2EB]">
                        {lin.label}
                      </h4>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#9E978C] mt-1 leading-relaxed">
                      {lin.description}
                    </p>
                    <span className="inline-block mt-2 text-[10px] text-[#9E978C]/80 italic">
                      {lin.warmth}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lining Color Sub-section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
              2. Interior Lining Colour
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {LINING_COLORS.map((col) => {
                const isSelected = form.liningColor === col.id;
                return (
                  <div
                    key={col.id}
                    onClick={() => updateForm({ liningColor: col.id as LiningColorId })}
                    className={`p-2.5 rounded border cursor-pointer transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#212121] shadow-sm ring-1 ring-[#D4AF37]'
                        : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-[#2E2A24] shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span className="text-xs font-medium text-[#F5F2EB] truncate">
                      {col.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {form.liningColor === 'custom' && (
              <div className="p-3 bg-[#1E1E1E] rounded border border-[#D4AF37]/40 mt-2">
                <input
                  type="text"
                  value={form.customLiningColor}
                  onChange={(e) => updateForm({ customLiningColor: e.target.value })}
                  placeholder="Specify custom lining color or tartan pattern..."
                  className="w-full text-xs p-2 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* STEP 6: DESIGN DETAILS */}
      {currentStep === 6 && (
        <section className="space-y-6 animate-fade-in" aria-labelledby="step-6-heading">
          <div>
            <h2 id="step-6-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 6: Fine-Tune Design Details
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Select your collar, closures, pockets, hardware finish, and bespoke monogram.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* Hardware Finish */}
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Hardware Metal Finish
              </label>
              <select
                value={form.details.hardwareFinish}
                onChange={(e) => updateDetails({ hardwareFinish: e.target.value as HardwareFinish })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                {HARDWARE_FINISHES.map((h) => (
                  <option key={h.id} value={h.id} className="!bg-[#FFFFFF] !text-[#212121]">
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Collar Style */}
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Collar &amp; Lapel
              </label>
              <select
                value={form.details.collarStyle}
                onChange={(e) => updateDetails({ collarStyle: e.target.value as CollarStyle })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                {COLLAR_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id} className="!bg-[#FFFFFF] !text-[#212121]">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Closure Type */}
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Front Closure
              </label>
              <select
                value={form.details.closureType}
                onChange={(e) => updateDetails({ closureType: e.target.value as ClosureType })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                {CLOSURE_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id} className="!bg-[#FFFFFF] !text-[#212121]">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pocket Configuration */}
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Pocket Configuration
              </label>
              <select
                value={form.details.pocketConfig}
                onChange={(e) => updateDetails({ pocketConfig: e.target.value as PocketConfig })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                {POCKET_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id} className="!bg-[#FFFFFF] !text-[#212121]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Belt / Waist Cinch */}
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Waist Details
              </label>
              <select
                value={form.details.beltStyle}
                onChange={(e) => updateDetails({ beltStyle: e.target.value as BeltStyle })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="clean_tailored" className="!bg-[#FFFFFF] !text-[#212121]">Clean Tailored Waist (Standard)</option>
                <option value="removable_waist_belt" className="!bg-[#FFFFFF] !text-[#212121]">Full Removable Leather Waist Belt with Buckle</option>
                <option value="side_cinch_tabs" className="!bg-[#FFFFFF] !text-[#212121]">Side Buckled Cinch Adjuster Tabs</option>
                <option value="elasticated_hem" className="!bg-[#FFFFFF] !text-[#212121]">Elasticated / Ribbed Hem</option>
              </select>
            </div>

            {/* Stitching Tone */}
            <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Stitching Thread
              </label>
              <select
                value={form.details.stitchingTone}
                onChange={(e) => updateDetails({ stitchingTone: e.target.value as StitchingTone })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="matching_tone" className="!bg-[#FFFFFF] !text-[#212121]">Tone-on-Tone Matching Thread</option>
                <option value="contrast_cream" className="!bg-[#FFFFFF] !text-[#212121]">Contrasting Cream/Ecru Thread</option>
                <option value="contrast_gold" className="!bg-[#FFFFFF] !text-[#212121]">Luxury Gold Thread Accent</option>
              </select>
            </div>
          </div>

          {/* Monogramming / Initials */}
          <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="monogram-input" className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Complimentary Bespoke Monogramming
              </label>
              <span className="text-[10px] text-[#9E978C]">Up to 8 characters</span>
            </div>
            <input
              id="monogram-input"
              type="text"
              maxLength={8}
              value={form.details.monogramText}
              onChange={(e) => updateDetails({ monogramText: e.target.value })}
              placeholder="e.g. Y.H. or ALEXANDER"
              className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] uppercase tracking-widest focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            />
            <p className="text-[10px] text-[#9E978C]">
              Embroidered or foil-embossed onto the interior atelier patch.
            </p>
          </div>

          {/* Special Requirements */}
          <div className="p-4 bg-[#1E1E1E] rounded border border-[#2E2A24] space-y-2">
            <label htmlFor="special-reqs" className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
              Special Tailoring Notes or Custom Modifications
            </label>
            <textarea
              id="special-reqs"
              rows={3}
              value={form.details.specialRequirements}
              onChange={(e) => updateDetails({ specialRequirements: e.target.value })}
              placeholder="e.g., Hidden inside passport pocket, longer sleeves for motorcycle riding, antique patina wash..."
              className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>
        </section>
      )}

      {/* STEP 7: REFERENCE IMAGES */}
      {currentStep === 7 && (
        <section className="space-y-4 animate-fade-in" aria-labelledby="step-7-heading">
          <div>
            <h2 id="step-7-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 7: Upload Reference Images
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Attach photographs, runway inspirations, or sketches to help our master tailors visualize your vision.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-[#2E2A24] hover:border-[#D4AF37] rounded bg-[#1E1E1E] hover:bg-[#212121] text-center cursor-pointer transition-colors flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F5F2EB]">
                Click or drag images to upload
              </p>
              <p className="text-xs text-[#9E978C] mt-1">
                Accepts JPEG, PNG, or WebP up to 10MB each (max 5 images).
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {imageUploadError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{imageUploadError}</span>
            </div>
          )}

          {/* Uploaded Images List */}
          {form.referenceImages.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                Uploaded References ({form.referenceImages.length} / 5)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {form.referenceImages.map((img) => (
                  <div
                    key={img.id}
                    className="p-3 bg-[#1E1E1E] rounded border border-[#2E2A24] flex items-center gap-3 shadow-2xs"
                  >
                    {img.dataUrl ? (
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-14 h-14 object-cover rounded border border-[#2E2A24] shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-[#212121] rounded flex items-center justify-center text-[#9E978C] shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#F5F2EB] truncate">
                        {img.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <select
                          value={img.label}
                          onChange={(e) => updateImageLabel(img.id, e.target.value as ReferenceImageFile['label'])}
                          className="text-[10px] p-1 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37]"
                        >
                          <option value="Front" className="!bg-[#FFFFFF] !text-[#212121]">Front View</option>
                          <option value="Back" className="!bg-[#FFFFFF] !text-[#212121]">Back View</option>
                          <option value="Side" className="!bg-[#FFFFFF] !text-[#212121]">Side View</option>
                          <option value="Detail" className="!bg-[#FFFFFF] !text-[#212121]">Detail / Texture</option>
                          <option value="Inspiration" className="!bg-[#FFFFFF] !text-[#212121]">Inspiration / Mood</option>
                        </select>
                        <span className="text-[10px] text-[#9E978C]">
                          {(img.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="p-1.5 text-red-400 hover:bg-red-950/60 rounded transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-[#1E1E1E] border border-[#2E2A24] rounded text-xs text-[#9E978C] flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="m-0">
              Reference images remain private and are only used by our bespoke team to formulate your design and quotation.
            </p>
          </div>
        </section>
      )}

      {/* STEP 8: SIZE & MEASUREMENTS */}
      {currentStep === 8 && (
        <section className="space-y-5 animate-fade-in" aria-labelledby="step-8-heading">
          <div>
            <h2 id="step-8-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 8: Size &amp; Measurements
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Select a standard international size, or provide your made-to-measure tailoring dimensions.
            </p>
          </div>

          {/* Sizing Mode Switcher */}
          <div className="flex items-center gap-3 border-b border-[#2E2A24] pb-4">
            <button
              type="button"
              onClick={() => updateForm({ sizingMode: 'standard' })}
              className={`px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors ${
                form.sizingMode === 'standard'
                  ? 'bg-[#D4AF37] text-[#000000]'
                  : 'bg-[#1E1E1E] text-[#9E978C] hover:text-[#F5F2EB] hover:bg-[#212121] border border-[#2E2A24]'
              }`}
            >
              Standard Size
            </button>
            <button
              type="button"
              onClick={() => updateForm({ sizingMode: 'custom' })}
              className={`px-4 py-2 rounded text-xs font-semibold tracking-wider uppercase transition-colors ${
                form.sizingMode === 'custom'
                  ? 'bg-[#D4AF37] text-[#000000]'
                  : 'bg-[#1E1E1E] text-[#9E978C] hover:text-[#F5F2EB] hover:bg-[#212121] border border-[#2E2A24]'
              }`}
            >
              Made-to-Measure Dimensions
            </button>
          </div>

          {/* Standard Size Choice */}
          {form.sizingMode === 'standard' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB] mb-2">
                  Select International Size
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {STANDARD_SIZES.map((sz) => {
                    const isSelected = form.standardSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updateForm({ standardSize: sz })}
                        className={`p-3 rounded border text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37] text-[#000000] shadow-sm'
                            : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60 text-[#F5F2EB]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fit Preference */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#F5F2EB] mb-2">
                  Fit Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'slim', label: 'Slim Fit', desc: 'Contoured close to the torso for modern sharpness.' },
                    { id: 'regular', label: 'Regular Tailored Fit', desc: 'Classic drape accommodating light knitwear underneath.' },
                    { id: 'relaxed', label: 'Relaxed / Oversized Fit', desc: 'Generous volume suited for winter layering.' },
                  ].map((f) => {
                    const isSelected = form.fitPreference === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => updateForm({ fitPreference: f.id as FitPreference })}
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          isSelected ? 'border-[#D4AF37] bg-[#212121] ring-1 ring-[#D4AF37]' : 'border-[#2E2A24] bg-[#1E1E1E] hover:border-[#D4AF37]/60'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#F5F2EB]">{f.label}</p>
                        <p className="text-[11px] text-[#9E978C] mt-1">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Custom Measurements */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                  Measurement Unit
                </span>
                <div className="inline-flex rounded border border-[#2E2A24] bg-[#181818] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => updateForm({ sizingUnit: 'inches' })}
                    className={`px-3 py-1 rounded font-semibold ${
                      form.sizingUnit === 'inches' ? 'bg-[#D4AF37] text-[#000000]' : 'text-[#9E978C] hover:text-[#F5F2EB]'
                    }`}
                  >
                    Inches (in)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm({ sizingUnit: 'cm' })}
                    className={`px-3 py-1 rounded font-semibold ${
                      form.sizingUnit === 'cm' ? 'bg-[#D4AF37] text-[#000000]' : 'text-[#9E978C] hover:text-[#F5F2EB]'
                    }`}
                  >
                    Centimetres (cm)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'chest', label: 'Chest Circumference', placeholder: form.sizingUnit === 'inches' ? 'e.g. 40 in' : 'e.g. 102 cm' },
                  { key: 'waist', label: 'Waist Circumference', placeholder: form.sizingUnit === 'inches' ? 'e.g. 34 in' : 'e.g. 86 cm' },
                  { key: 'shoulder', label: 'Shoulder Width', placeholder: form.sizingUnit === 'inches' ? 'e.g. 18.5 in' : 'e.g. 47 cm' },
                  { key: 'sleeveLength', label: 'Sleeve Length', placeholder: form.sizingUnit === 'inches' ? 'e.g. 26 in' : 'e.g. 66 cm' },
                  { key: 'garmentLength', label: 'Desired Back Length', placeholder: form.sizingUnit === 'inches' ? 'e.g. 25.5 in' : 'e.g. 65 cm' },
                  { key: 'hips', label: 'Hips / Seat', placeholder: form.sizingUnit === 'inches' ? 'e.g. 41 in' : 'e.g. 104 cm' },
                ].map((m) => (
                  <div key={m.key} className="p-3 bg-[#1E1E1E] rounded border border-[#2E2A24]">
                    <label className="block text-[11px] font-semibold text-[#F5F2EB] mb-1">
                      {m.label}
                    </label>
                    <input
                      type="text"
                      value={(form.customMeasurements as any)[m.key] || ''}
                      onChange={(e) => updateMeasurements({ [m.key]: e.target.value })}
                      placeholder={m.placeholder}
                      className="w-full text-xs p-2 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[#1E1E1E] rounded border border-[#2E2A24]">
                <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                  Fit or Posture Notes
                </label>
                <input
                  type="text"
                  value={form.customMeasurements.fitNotes || ''}
                  onChange={(e) => updateMeasurements({ fitNotes: e.target.value })}
                  placeholder="e.g. Athletic broad shoulders, longer arms, preferring snug waist..."
                  className="w-full text-xs p-2 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-[#1E1E1E] border border-[#2E2A24] rounded text-xs text-[#9E978C] flex items-start gap-2">
            <Ruler className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <p className="m-0">
              Measurements can be approximate. Our bespoke tailoring team will gladly walk you through exact measurements over WhatsApp or phone prior to crafting your pattern.
            </p>
          </div>
        </section>
      )}

      {/* STEP 9: REVIEW & SUBMIT */}
      {currentStep === 9 && (
        <section className="space-y-6 animate-fade-in" aria-labelledby="step-9-heading">
          <div>
            <h2 id="step-9-heading" className="font-serif text-2xl sm:text-3xl text-[#F5F2EB] font-normal tracking-wide">
              Step 9: Review Design &amp; Request Quotation
            </h2>
            <p className="text-sm text-[#9E978C] mt-1.5">
              Verify your design specifications below, enter your contact details, and submit for a personal quotation.
            </p>
          </div>

          {/* Design Summary Card */}
          <div className="p-4 sm:p-5 bg-[#1E1E1E] rounded border border-[#2E2A24] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#2E2A24] pb-2.5">
              <h3 className="font-serif text-base font-semibold text-[#F5F2EB]">
                Bespoke Garment Specifications
              </h3>
              <button
                type="button"
                onClick={() => onStepChange(1)}
                className="text-xs text-[#D4AF37] hover:text-[#F5DF88] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <Edit2 className="w-3 h-3" />
                <span>Modify</span>
              </button>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Silhouette &amp; Length:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.length.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Style:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.style.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Outer Material:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.outerMaterial.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Outer Colour:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.outerColor === 'custom' ? form.customOuterColor || 'Custom' : form.outerColor.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Lining Material:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.liningMaterial}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Lining Colour:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.liningColor === 'custom' ? form.customLiningColor || 'Custom' : form.liningColor}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Hardware Finish:</dt>
                <dd className="font-medium text-[#F5F2EB] capitalize">{form.details.hardwareFinish.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E2A24]/60">
                <dt className="text-[#9E978C]">Sizing / Fit:</dt>
                <dd className="font-medium text-[#F5F2EB]">
                  {form.sizingMode === 'standard' ? `${form.standardSize} (${form.fitPreference} fit)` : 'Made-to-Measure'}
                </dd>
              </div>
              {form.details.monogramText && (
                <div className="flex justify-between py-1 border-b border-[#2E2A24]/60 sm:col-span-2">
                  <dt className="text-[#9E978C]">Monogram Initials:</dt>
                  <dd className="font-medium text-[#D4AF37] font-serif">{form.details.monogramText.toUpperCase()}</dd>
                </div>
              )}
              {form.referenceImages.length > 0 && (
                <div className="flex justify-between py-1 border-b border-[#2E2A24]/60 sm:col-span-2">
                  <dt className="text-[#9E978C]">Reference Images:</dt>
                  <dd className="font-medium text-[#F5F2EB]">{form.referenceImages.length} attached</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contact Details Form */}
          <div className="p-4 sm:p-5 bg-[#1E1E1E] rounded border border-[#2E2A24] shadow-2xs space-y-4">
            <h3 className="font-serif text-base font-semibold text-[#F5F2EB] border-b border-[#2E2A24] pb-2">
              Your Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.contact.fullName}
                  onChange={(e) => updateContact({ fullName: e.target.value })}
                  placeholder="e.g. Lord James Harrington"
                  className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.contact.email}
                  onChange={(e) => updateContact({ email: e.target.value })}
                  placeholder="e.g. james@example.com"
                  className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                  Phone / WhatsApp <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.contact.phone}
                  onChange={(e) => updateContact({ phone: e.target.value })}
                  placeholder="e.g. +44 7123 456789"
                  className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                  Country / Destination <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.contact.country}
                  onChange={(e) => updateContact({ country: e.target.value })}
                  placeholder="e.g. United Kingdom"
                  className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                Preferred Method of Contact
              </label>
              <select
                value={form.contact.preferredContact}
                onChange={(e) => updateContact({ preferredContact: e.target.value as any })}
                className="w-full text-xs p-2.5 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              >
                <option value="email" className="!bg-[#FFFFFF] !text-[#212121]">Email</option>
                <option value="whatsapp" className="!bg-[#FFFFFF] !text-[#212121]">WhatsApp</option>
                <option value="phone" className="!bg-[#FFFFFF] !text-[#212121]">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F5F2EB] mb-1">
                Additional Comments / Target Delivery Date
              </label>
              <textarea
                rows={2}
                value={form.contact.additionalComments}
                onChange={(e) => updateContact({ additionalComments: e.target.value })}
                placeholder="Any special deadlines, travel plans, or questions for our team..."
                className="w-full text-xs p-2 border border-[#2E2A24] rounded !bg-[#FFFFFF] !text-[#212121] placeholder:!text-[#777777] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          {submissionError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onSubmitQuote}
              className="w-full sm:w-auto mx-auto px-8 py-3.5 rounded text-xs font-semibold uppercase tracking-widest bg-[#D4AF37] text-[#000000] hover:bg-[#F5DF88] transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Submitting Design for Quotation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Request My Custom Quote</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-[#9E978C] mt-2">
              No charge or payment is required today. Our atelier team will review your requirements and provide a complimentary personalised quote.
            </p>
          </div>
        </section>
      )}

      {/* Navigation Buttons (Back / Next) */}
      <div className="pt-4 border-t border-[#2E2A24] flex items-center justify-between">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => onStepChange(currentStep - 1)}
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider text-[#9E978C] hover:text-[#F5F2EB] hover:bg-[#2E2A24]/60 border border-[#2E2A24] flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Step</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 9 && (
          <button
            type="button"
            onClick={() => onStepChange(currentStep + 1)}
            className="px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider bg-[#D4AF37] text-[#000000] hover:bg-[#F5DF88] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Next: {STEP_TITLES[currentStep]}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
