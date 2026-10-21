import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, FileText, CheckCircle2, Award, Briefcase, GraduationCap, Globe2, Share2, Sparkles } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#f8fafc',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
          <QrIcon className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-neutral-100 mb-1">
          Scan to Talk with Ari
        </h3>
        <p className="text-xs text-neutral-400 mb-5">
          Scan with your phone's camera to start a live voice conversation about Artjom's credentials.
        </p>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-4">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-neutral-400">
              Generating QR...
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={copyUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface CvSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CvSummaryModal: React.FC<CvSummaryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8 shadow-2xl text-left scrollbar-thin scrollbar-thumb-neutral-800">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Artjom Alihodzin</h3>
            <p className="text-xs text-cyan-400 font-medium">
              Business student, sales leader, founder • Tallinn, Estonia
            </p>
          </div>
        </div>

        {/* Highlight Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 text-center">
            <p className="text-xl sm:text-2xl font-black text-cyan-400">$300k+</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
              Personal Revenue
            </p>
          </div>
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 text-center">
            <p className="text-xl sm:text-2xl font-black text-indigo-400">$100k+</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
              Team Sales Revenue
            </p>
          </div>
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 text-center">
            <p className="text-xl sm:text-2xl font-black text-emerald-400">5 Summers</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
              US Direct Sales
            </p>
          </div>
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-3 text-center">
            <p className="text-xl sm:text-2xl font-black text-amber-400">500+</p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
              G4S Subs (10 Wks)
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-5 text-sm">
          {/* Southwestern Advantage */}
          <div className="border border-neutral-800/80 rounded-2xl p-4 bg-neutral-950/40">
            <div className="flex items-center gap-2 mb-2 text-neutral-100 font-semibold">
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Sales Manager • Southwestern Advantage (Nov 2021 – Present)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span>5 intense summer seasons of door-to-door sales in rural Minnesota, USA.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span>Generated over $300,000 in personal sales revenue.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span>Generated over $100,000 from personal sales team.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span>Recruited 7 reps, coached and led them on the ground in the US.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span>Coached 3 team members on recruiting and preparing new sales reps.</span>
              </li>
            </ul>
          </div>

          {/* G4S Project & Sautin OÜ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-neutral-800/80 rounded-2xl p-4 bg-neutral-950/40">
              <div className="flex items-center gap-2 mb-2 text-neutral-100 font-semibold text-xs">
                <Briefcase className="w-4 h-4 text-violet-400" />
                <span>G4S Direct-to-Consumer Project</span>
              </div>
              <p className="text-xs text-neutral-400 mb-2">
                Feb 2024 – May 2024 (Southwestern Ventures)
              </p>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Led a high-performing team of 10, closing 500+ subscription products in 10 weeks across Estonia.
              </p>
            </div>

            <div className="border border-neutral-800/80 rounded-2xl p-4 bg-neutral-950/40">
              <div className="flex items-center gap-2 mb-2 text-neutral-100 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Sautin OÜ</span>
              </div>
              <p className="text-xs text-neutral-400 mb-2">Owner & Manager</p>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Estonian micro-company managing independent commercial and consulting engagements.
              </p>
            </div>
          </div>

          {/* Education & Languages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-neutral-800/80 rounded-2xl p-4 bg-neutral-950/40">
              <div className="flex items-center gap-2 mb-2 text-neutral-100 font-semibold text-xs">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>Education: EBS</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                3rd-year student in International Business Administration at Estonian Business School (Tallinn).
              </p>
              <p className="text-[11px] text-cyan-400/90 mt-2 font-mono">
                Focus: Growth Hacking with AI & Digital Product Dev
              </p>
            </div>

            <div className="border border-neutral-800/80 rounded-2xl p-4 bg-neutral-950/40">
              <div className="flex items-center gap-2 mb-2 text-neutral-100 font-semibold text-xs">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                <span>Languages</span>
              </div>
              <ul className="space-y-1 text-xs text-neutral-300">
                <li>• English (Professional, IELTS B2)</li>
                <li>• Estonian (Professional level)</li>
                <li>• Russian (Fluent)</li>
              </ul>
            </div>
          </div>

          {/* Strengths & Interests */}
          <div className="border border-neutral-800/80 rounded-2xl p-4 bg-neutral-950/40">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Sales', 'Leadership', 'Coaching', 'Resilience', 'Self-motivation', 'Self-sufficiency'].map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-400">
              Interests: Sales methodology, personal growth, data-driven fitness & performance, AI in business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
