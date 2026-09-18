import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Printer, ArrowRight, ArrowLeft, User as UserIcon, Hash, RotateCcw, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { BrandLogo } from '../../components/common/BrandLogo';

const LoginPage: React.FC = () => {
  const { studentQuickAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Student 2-field form state
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [savedUser, setSavedUser] = useState<{ id: string; name: string } | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const savedId = localStorage.getItem('campusprint_student_id');
      const savedName = localStorage.getItem('campusprint_student_name');
      if (savedId) {
        setSavedUser({ id: savedId, name: savedName || 'Student' });
        setIdentifier(savedId);
        if (savedName) setName(savedName);
      }
    } catch {
      // ignore
    }
  }, []);

  // Compute normalized digits and detection state
  const rawDigits = identifier.replace(/\D/g, '');
  const normDigits =
    rawDigits.length === 12 && rawDigits.startsWith('91')
      ? rawDigits.slice(2)
      : rawDigits.length === 11 && rawDigits.startsWith('0')
      ? rawDigits.slice(1)
      : rawDigits;

  const isMobile = normDigits.length === 10;
  const isEnrollment = normDigits.length === 13;

  const handleSubmit = async (e?: React.FormEvent, customId?: string, customName?: string) => {
    if (e) e.preventDefault();
    const targetName = (customName ?? name).trim();
    const targetId = (customId ?? identifier).trim();

    if (!targetName && !savedUser) {
      toast.error('Please enter your full name');
      return;
    }
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
        toast.success(`Welcome to CampusPrint, ${res.user.name}`);
      }
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect') || '/student';
      navigate(redirectUrl, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Access failed. Please check your details.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative selection:bg-blue-100 selection:text-blue-900">
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CampusPrint
        </Link>
      </div>

      <div className="w-full max-w-md text-center mx-auto">
        {/* Brand Mark */}
        <Link to="/" className="inline-flex items-center mb-3 hover:opacity-90 transition-opacity">
          <BrandLogo size="lg" />
        </Link>

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Student Access
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500">
          Skip the counter queue. Print straight from your device ⚡
        </p>
      </div>

      <div className="mt-7 w-full max-w-md mx-auto">
        <div className="bg-white border border-slate-200/90 py-8 px-6 sm:px-8 rounded-2xl shadow-sm">
          {savedUser && !showManualForm ? (
            /* 1-Tap Returning Student Fast Option */
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                    Saved Student Profile
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {savedUser.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {savedUser.id}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSubmit(undefined, savedUser.id, savedUser.name)}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                id="student-1tap-btn"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue as {savedUser.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualForm(true)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Use a different number or student details
                </button>
              </div>
            </div>
          ) : (
            /* Direct 2-Field Form */
            <form onSubmit={e => handleSubmit(e)} className="space-y-4" noValidate>
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
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                    autoFocus
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="student-identifier">
                    Enrollment No. or Mobile No.
                  </label>
                  {normDigits.length > 0 && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {normDigits.length} {normDigits.length === 1 ? 'digit' : 'digits'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="student-identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder=""
                    className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none transition-colors ${
                      isMobile
                        ? 'border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10'
                        : isEnrollment
                        ? 'border-blue-600 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10'
                    }`}
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>

                {/* Real-time indicator only when active digits entered */}
                {(isMobile || isEnrollment) && (
                  <div className="mt-1.5">
                    {isMobile && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Valid 10-Digit Mobile Number</span>
                      </div>
                    )}
                    {isEnrollment && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Valid 13-Digit Enrollment Number</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  id="student-quick-submit"
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Print</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {savedUser && showManualForm && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    ← Back to saved profile ({savedUser.name})
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
