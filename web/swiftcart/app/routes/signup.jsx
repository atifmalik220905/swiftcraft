import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, Link } from "react-router";
import { createClient } from "@supabase/supabase-js";

export const loader = async () => {
  return {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  };
};

export default function Signup() {
  const { supabaseUrl, supabaseAnonKey } = useLoaderData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [storeDomain, setStoreDomain] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [supabase, setSupabase] = useState(null);

  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      setSupabase(createClient(supabaseUrl, supabaseAnonKey));
    }
  }, [supabaseUrl, supabaseAnonKey]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase configuration is missing. Please check your .env file.");
      return;
    }
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          store_domain: storeDomain,
        },
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-inverse-surface via-primary-container/20 to-surface p-4 font-body">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-elevated relative overflow-hidden animate-fade-in">
        {/* Decorative ambient background glows */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary font-bold text-xl mb-3 shadow-md">
            SC
          </div>
          <h2 className="font-headline text-headline-md text-on-surface">Get Started</h2>
          <p className="text-label-sm text-on-surface-variant mt-1 text-center">
            Create an account to access the SwiftCart Merchant Portal
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container/30 border border-error/20 rounded-lg flex items-center gap-3 text-error animate-shake">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <p className="text-xs font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-secondary-container/30 border border-secondary/20 rounded-lg flex items-center gap-3 text-secondary animate-fade-in">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <p className="text-xs font-semibold">
              Registration successful! Redirecting to login...
            </p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5 relative">
          <div>
            <label className="block text-label-bold text-on-surface-variant uppercase mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                mail
              </span>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-bold text-on-surface-variant uppercase mb-2">
              Shopify Store Domain
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                storefront
              </span>
              <input
                type="text"
                required
                placeholder="mystore.myshopify.com"
                value={storeDomain}
                onChange={(e) => setStoreDomain(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-bold text-on-surface-variant uppercase mb-2">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock
              </span>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-bold text-on-surface-variant uppercase mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock
              </span>
              <input
                type="password"
                required
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm outline-none transition-all duration-200 focus:border-primary focus:bg-surface-container-lowest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold hover:opacity-95 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Register</span>
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
