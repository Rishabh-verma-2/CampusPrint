import React, { useState, useEffect } from 'react';
import { Printer, ArrowRight, User as UserIcon, Hash, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui';
import { toast } from 'sonner';

interface StudentQuickAccessProps {
  onSuccess: () => void;
  shopName?: string;
}

export const StudentQuickAccess: React.FC<StudentQuickAccessProps> = ({ onSuccess, shopName }) => {
  const { studentQuickAccess } = useAuth();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberedUser, setRememberedUser] = useState<{ id: string; name: string } | null>(null);
  const [showSwitch, setShowSwitch] = useState(false);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem('campusprint_student_id');
      const savedName = localStorage.getItem('campusprint_student_name');
      if (savedId) {
        setRememberedUser({ id: savedId, name: savedName || 'Student' });
        setIdentifier(savedId);
        if (savedName) setName(savedName);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e?: React.FormEvent, customId?: string, customName?: string) => {
    if (e) e.preventDefault();
    const targetId = (customId ?? identifier).trim();
    const targetName = (customName ?? name).trim();

    if (!targetId) {
      toast.error('Please enter your enrollment number or mobile number');
      return;
    }

    // Digit count validation
    const digits = targetId.replace(/\D/g, '');
    const cleanDigits =
      digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits;

    if (cleanDigits.length !== 10 && cleanDigits.length !== 13) {
      toast.error(
        `Invalid number (${cleanDigits.length} digits). Mobile number must be 10 digits, or Enrollment number must be 13 digits.`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await studentQuickAccess(targetId, targetName || undefined);
      if (res.isReturning) {
        toast.success(`Welcome back, ${res.user.name}`);
      } else {
        toast.success(`Profile created for ${res.user.name}`);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data?.message || 'Access failed. Please check your details.';
      toast.error(msg);
      // If server asks for name because it's a first time user
      if ((err as { response?: { data?: { code?: string } } })?.response?.data?.code === 'NAME_REQUIRED') {
        setShowSwitch(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle1TapContinue = () => {
    if (!rememberedUser) return;
    handleSubmit(undefined, rememberedUser.id, rememberedUser.name);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-md mx-auto text-left">
      {/* Header */}
      <div className="text-center pb-5 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Printer className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {shopName ? `Print at ${shopName}` : 'Student Print Setup'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Skip the counter queue. Print straight from your device ⚡
        </p>
      </div>

      {/* 1-Tap Returning Student Fast Option */}
      {rememberedUser && !showSwitch ? (
        <div className="py-6 space-y-4">
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                Saved Student Profile
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                {rememberedUser.name}
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                {rememberedUser.id}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <button
            type="button"
            onClick={handle1TapContinue}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>Continue as {rememberedUser.name}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowSwitch(true)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Enter different student details
            </button>
          </div>
        </div>
      ) : (
        /* Direct / New Student Form */
        <form onSubmit={e => handleSubmit(e)} className="py-5 space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="student-name">
              Full Name
            </label>
            <div className="relative">
              <input
                id="student-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder=""
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                autoFocus
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="student-identifier">
              Enrollment Number OR Mobile Number
            </label>
            <div className="relative">
              <input
                id="student-identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder=""
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
              />
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>Setting up session...</span>
                </>
              ) : (
                <>
                  <span>Continue to Print</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {rememberedUser && showSwitch && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowSwitch(false)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                ← Back to saved profile ({rememberedUser.name})
              </button>
            </div>
          )}
        </form>
      )}

      {/* Trust reassurance footer */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Instant campus access</span>
        <span>Secure order tracking</span>
      </div>
    </div>
  );
};
