import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomDesignFormState } from '../../types/customDesign';
import { CheckCircle2, Copy, Check, MessageSquare, ArrowRight, Printer } from 'lucide-react';

interface CustomDesignSuccessProps {
  referenceNumber: string;
  form: CustomDesignFormState;
  onReset: () => void;
}

export const CustomDesignSuccess: React.FC<CustomDesignSuccessProps> = ({
  referenceNumber,
  form,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanWaNumber = '923278434142';
  const waMessage = encodeURIComponent(
    `Hello Global Luxury Emporium, I have just submitted a custom design request (Ref: ${referenceNumber}) for a ${form.style} jacket in ${form.outerColor}. I would like to discuss my quotation.`
  );
  const waUrl = `https://wa.me/${cleanWaNumber}?text=${waMessage}`;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center animate-fade-in space-y-6">
      {/* Success Badge */}
      <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4AF37]">
          Design Request Received
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#F5F2EB] font-normal tracking-wide mt-1">
          Thank You, {form.contact.fullName || 'Valued Client'}
        </h1>
        <p className="text-sm text-[#9E978C] max-w-lg mx-auto mt-2 leading-relaxed">
          Your bespoke leather garment specifications have been submitted directly to our design atelier. We are preparing your personalised quotation.
        </p>
      </div>

      {/* Reference Card */}
      <div className="p-6 bg-[#181818] rounded border border-[#2E2A24] shadow-md max-w-md mx-auto space-y-3">
        <span className="text-xs uppercase tracking-wider text-[#9E978C] font-medium">
          Your Design Reference Number
        </span>
        <div className="flex items-center justify-center gap-2">
          <code className="text-xl sm:text-2xl font-mono font-bold text-[#F5F2EB] tracking-wider bg-[#212121] px-3.5 py-1.5 rounded border border-[#2E2A24]">
            {referenceNumber}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] hover:text-[#F5DF88] transition-colors"
            title="Copy reference code"
          >
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-[#9E978C]">
          Please keep this reference code for any inquiries regarding your quote.
        </p>
      </div>

      {/* What Happens Next Steps */}
      <div className="p-5 bg-[#181818] rounded border border-[#2E2A24] text-left max-w-lg mx-auto space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F2EB] border-b border-[#2E2A24] pb-2">
          What Happens Next
        </h2>
        <ol className="space-y-2.5 text-xs text-[#9E978C]">
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span>
              <strong className="text-[#F5F2EB]">Atelier Review:</strong> Our patternmaker evaluates your selected silhouette, material availability, and tailoring requirements.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span>
              <strong className="text-[#F5F2EB]">Formal Quotation:</strong> We will contact you via {form.contact.preferredContact} ({form.contact.email}) within 24 business hours with your itemized quotation and lead time.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <span>
              <strong className="text-[#F5F2EB]">Precision Measurement Check:</strong> Before cutting leather, we will confirm all exact dimensions to guarantee a flawless drape.
            </span>
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-6 py-3 rounded text-xs font-semibold uppercase tracking-wider bg-[#25D366] text-white hover:bg-[#1EBE5D] flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat on WhatsApp About This Quote</span>
        </a>

        <button
          type="button"
          onClick={() => window.print()}
          className="w-full sm:w-auto px-5 py-3 rounded text-xs font-semibold uppercase tracking-wider bg-[#212121] text-[#F5F2EB] hover:bg-[#2E2A24] hover:text-[#F5DF88] border border-[#2E2A24] flex items-center justify-center gap-1.5 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Summary</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-5 py-3 rounded text-xs font-semibold uppercase tracking-wider text-[#9E978C] hover:text-[#F5F2EB] transition-colors"
        >
          Create Another Design
        </button>
      </div>

      <div className="pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-[#F5DF88] hover:underline font-medium"
        >
          <span>Return to Collection</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
