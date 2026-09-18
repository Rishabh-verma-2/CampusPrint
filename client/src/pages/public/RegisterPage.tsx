import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight, ArrowLeft, User as UserIcon, Hash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import { toast } from 'sonner';
import { BrandLogo } from '../../components/common/BrandLogo';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { studentQuickAccess } = useAuth();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanId = identifier.trim();

    if (!cleanName || cleanName.length < 2) {
      toast.error('Please enter your full name');
      return;
    }
    if (!cleanId) {
      toast.error('Please enter your enrollment number or mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await studentQuickAccess(cleanId, cleanName);
      if (res.isReturning) {
        toast.success(`Welcome back, ${res.user.name}`);
      } else {
        toast.success(`Welcome to CampusPrint, ${res.user.name}`);
      }
      navigate('/student', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Setup failed. Please try again.';
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
        <Link to="/" className="inline-flex items-center mb-4 hover:opacity-90 transition-opacity">
          <BrandLogo size="lg" />
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Student Access
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Enter your name and enrollment or mobile number to continue.
        </p>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto">
        <div className="bg-white border border-slate-200 py-8 px-6 sm:px-8 rounded-xl shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="reg-name">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                  placeholder="e.g. Aarav Sharma"
                  autoFocus
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="reg-id">
                Enrollment Number OR Mobile Number
              </label>
              <div className="relative">
                <input
                  id="reg-id"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-colors"
                  placeholder="e.g. 2024/CS/102 or 9876543210"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={loading}
                id="register-submit"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
