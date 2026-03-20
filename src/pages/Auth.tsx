import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleFormFields } from "@/hooks/useWholesale";
import { toast } from "sonner";
import {
  Mail, Lock, LogIn, UserPlus, ArrowLeft, Eye, EyeOff,
  ShoppingBag, Building2, ArrowRight, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "signup";
type CustomerType = "retail" | "wholesale" | null;
type SignupStep = "type" | "form";

const Auth = () => {
  const navigateRef = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialIntent = searchParams.get("intent");

  const [mode, setMode] = useState<AuthMode>(
    initialIntent === "signup" || initialIntent === "wholesale" ? "signup" : "login"
  );
  const [customerType, setCustomerType] = useState<CustomerType>(
    initialIntent === "wholesale" ? "wholesale" : null
  );
  const [signupStep, setSignupStep] = useState<SignupStep>(
    initialIntent === "wholesale" ? "form" : initialIntent === "signup" ? "type" : "type"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wholesaleFormData, setWholesaleFormData] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const navigate = navigateRef;
  const { data: wholesaleFields } = useWholesaleFormFields();

  const from = (location.state as any)?.from || "/";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const switchToSignup = () => {
    setMode("signup");
    setSignupStep("type");
    setCustomerType(null);
  };

  const switchToLogin = () => {
    setMode("login");
  };

  const handleTypeSelected = () => {
    if (!customerType) {
      toast.error("Please select a customer type to continue");
      return;
    }
    setSignupStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setLoading(false);
        return;
      }

      // For wholesale: validate required form fields
      if (customerType === "wholesale" && wholesaleFields) {
        const missing = wholesaleFields.filter(f => f.required && !wholesaleFormData[f.id]?.trim());
        if (missing.length > 0) {
          toast.error(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
          setLoading(false);
          return;
        }
      }

      // Step 1: Create the account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (signUpError) {
        toast.error(signUpError.message);
        setLoading(false);
        return;
      }

      // Step 2: For wholesale, submit the application
      if (customerType === "wholesale" && signUpData.user) {
        const { error: appError } = await supabase.from("wholesale_applications").insert({
          user_id: signUpData.user.id,
          form_data: wholesaleFormData,
        });

        if (appError) {
          console.error("Wholesale application error:", appError);
          // Account created but application failed - still show success but notify
          toast.error("Account created but application submission failed. Please try applying again from the wholesale page.");
        } else {
          toast.success(
            "Your account has been created successfully! Your wholesale account is currently under review by an admin. You will be able to place orders after approval.",
            { duration: 8000 }
          );
        }
      } else {
        toast.success("Check your email to verify your account!");
      }
    } else {
      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully!");
        navigate(from, { replace: true });
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (mode === "signup" && signupStep === "type") {
      toast.error("Please select a customer type first");
      return;
    }
    setLoading(true);
    const redirectUrl = mode === "signup" && customerType === "wholesale"
      ? window.location.origin + "/wholesale/apply"
      : window.location.origin + from;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUrl });
    if (result.error) {
      toast.error(result.error.message || "Google login failed");
    }
    setLoading(false);
  };

  const renderWholesaleField = (field: any) => {
    const value = wholesaleFormData[field.id] || "";
    const onChange = (val: string) => setWholesaleFormData(prev => ({ ...prev, [field.id]: val }));

    switch (field.field_type) {
      case "textarea":
        return <Textarea placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-[hsl(var(--sand))] border-[hsl(var(--border))]" rows={3} />;
      case "dropdown": {
        const options = (field.options as string[]) || [];
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="text-sm bg-[hsl(var(--sand))] border-[hsl(var(--border))]">
              <SelectValue placeholder={field.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      case "number":
        return <Input type="number" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-[hsl(var(--sand))] border-[hsl(var(--border))]" />;
      case "email":
        return <Input type="email" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-[hsl(var(--sand))] border-[hsl(var(--border))]" />;
      case "phone":
        return <Input type="tel" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-[hsl(var(--sand))] border-[hsl(var(--border))]" />;
      default:
        return <Input type="text" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-[hsl(var(--sand))] border-[hsl(var(--border))]" />;
    }
  };

  // Determine heading & subheading
  const getHeading = () => {
    if (mode === "login") return "Welcome Back";
    if (signupStep === "type") return "Choose Account Type";
    if (customerType === "wholesale") return "Wholesale Registration";
    return "Create Account";
  };

  const getSubheading = () => {
    if (mode === "login") return "Sign in to your MadrasahMatters account";
    if (signupStep === "type") return "Select how you'd like to use MadrasahMatters";
    if (customerType === "wholesale") return "Create your account and apply for wholesale access";
    return "Join MadrasahMatters today";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--sky-deep))] via-[hsl(var(--sky))] to-[hsl(var(--sky-light))] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[hsl(var(--gold))]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-[hsl(var(--coral))]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <button
          onClick={() => {
            if (mode === "signup" && signupStep === "form") {
              setSignupStep("type");
            } else if (mode === "signup" && signupStep === "type") {
              switchToLogin();
            } else {
              navigate(from === "/auth" ? "/" : from);
            }
          }}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          {mode === "signup" && signupStep === "form" ? "Change Account Type" : mode === "signup" ? "Back to Sign In" : "Back"}
        </button>

        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden max-h-[85vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-[hsl(var(--sky-deep))] to-[hsl(var(--sky))] px-6 sm:px-8 py-6 text-center sticky top-0 z-10">
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-bold mb-1">
              {getHeading()}
            </h1>
            <p className="text-white/80 text-sm">{getSubheading()}</p>
          </div>

          <div className="px-6 sm:px-8 py-6 sm:py-8">
            <AnimatePresence mode="wait">
              {/* ========== TYPE SELECTION (signup step 1) ========== */}
              {mode === "signup" && signupStep === "type" && (
                <motion.div
                  key="type-selection"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mb-2">
                    Please select one option to continue
                  </p>

                  {/* Retail Option */}
                  <button
                    type="button"
                    onClick={() => setCustomerType("retail")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                      customerType === "retail"
                        ? "border-[hsl(var(--sky-deep))] bg-[hsl(var(--sky-deep))]/5 shadow-md"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--sky))]/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        customerType === "retail"
                          ? "border-[hsl(var(--sky-deep))] bg-[hsl(var(--sky-deep))]"
                          : "border-[hsl(var(--muted-foreground))]/40"
                      }`}>
                        {customerType === "retail" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingBag className={`h-4 w-4 ${customerType === "retail" ? "text-[hsl(var(--sky-deep))]" : "text-[hsl(var(--muted-foreground))]"}`} />
                          <span className="font-semibold text-[hsl(var(--foreground))] text-sm">I want to register as a Retail Customer</span>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                          Simple signup — start shopping instantly with no approval needed.
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Wholesale Option */}
                  <button
                    type="button"
                    onClick={() => setCustomerType("wholesale")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                      customerType === "wholesale"
                        ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5 shadow-md"
                        : "border-[hsl(var(--border))] hover:border-[hsl(var(--gold))]/50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        customerType === "wholesale"
                          ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]"
                          : "border-[hsl(var(--muted-foreground))]/40"
                      }`}>
                        {customerType === "wholesale" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className={`h-4 w-4 ${customerType === "wholesale" ? "text-[hsl(var(--gold))]" : "text-[hsl(var(--muted-foreground))]"}`} />
                          <span className="font-semibold text-[hsl(var(--foreground))] text-sm">I want to register as a Wholesale Customer</span>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                          Bulk pricing & special discounts — requires admin approval after application.
                        </p>
                      </div>
                    </div>
                  </button>

                  <Button
                    onClick={handleTypeSelected}
                    disabled={!customerType}
                    className="w-full bg-gradient-to-r from-[hsl(var(--sky-deep))] to-[hsl(var(--sky))] hover:from-[hsl(var(--sky))] hover:to-[hsl(var(--sky-deep))] text-white font-semibold h-11 text-base shadow-lg shadow-[hsl(var(--sky))]/30 transition-all duration-300 mt-2"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    Already have an account?{" "}
                    <button onClick={switchToLogin} className="text-[hsl(var(--sky-deep))] hover:text-[hsl(var(--sky))] font-semibold hover:underline transition-colors">
                      Sign In
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ========== LOGIN FORM ========== */}
              {mode === "login" && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-[hsl(var(--sand))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-[hsl(var(--sand))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[hsl(var(--sky-deep))] to-[hsl(var(--sky))] hover:from-[hsl(var(--sky))] hover:to-[hsl(var(--sky-deep))] text-white font-semibold h-11 text-base shadow-lg shadow-[hsl(var(--sky))]/30 transition-all duration-300">
                      <LogIn className="h-4 w-4 mr-2" />{loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[hsl(var(--border))]" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-[hsl(var(--muted-foreground))]">or continue with</span></div>
                  </div>

                  <Button variant="outline" onClick={handleGoogleLogin} disabled={loading} className="w-full border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sand))] h-11 font-medium">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </Button>

                  <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
                    Don't have an account?{" "}
                    <button onClick={switchToSignup} className="text-[hsl(var(--sky-deep))] hover:text-[hsl(var(--sky))] font-semibold hover:underline transition-colors">
                      Create Account
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ========== SIGNUP FORM (Retail = simple, Wholesale = with application fields) ========== */}
              {mode === "signup" && signupStep === "form" && (
                <motion.div
                  key="signup-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Wholesale info banner */}
                  {customerType === "wholesale" && (
                    <div className="mb-5 p-3 rounded-lg bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-[hsl(var(--gold))] shrink-0 mt-0.5" />
                        <span className="text-[hsl(var(--foreground))] text-xs leading-relaxed">
                          Fill in your account details and wholesale application form below. Your account will be created and the application will be submitted for admin review.
                        </span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Account fields */}
                    <div className="space-y-4">
                      {customerType === "wholesale" && (
                        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Account Details</p>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-[hsl(var(--sand))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 bg-[hsl(var(--sand))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" required minLength={6} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 bg-[hsl(var(--sand))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]" required minLength={6} />
                        </div>
                      </div>
                    </div>

                    {/* Wholesale application fields */}
                    {customerType === "wholesale" && wholesaleFields && wholesaleFields.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-[hsl(var(--border))]">
                        <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Wholesale Application</p>
                        {wholesaleFields.map(field => (
                          <div key={field.id} className="space-y-1.5">
                            <Label className="text-sm font-medium">
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            {renderWholesaleField(field)}
                          </div>
                        ))}
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[hsl(var(--sky-deep))] to-[hsl(var(--sky))] hover:from-[hsl(var(--sky))] hover:to-[hsl(var(--sky-deep))] text-white font-semibold h-11 text-base shadow-lg shadow-[hsl(var(--sky))]/30 transition-all duration-300">
                      {loading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                      ) : customerType === "wholesale" ? (
                        <><Send className="h-4 w-4 mr-2" />Create Account & Submit Application</>
                      ) : (
                        <><UserPlus className="h-4 w-4 mr-2" />Create Account</>
                      )}
                    </Button>
                  </form>

                  {/* Google signup (only for retail) */}
                  {customerType === "retail" && (
                    <>
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[hsl(var(--border))]" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-[hsl(var(--muted-foreground))]">or continue with</span></div>
                      </div>

                      <Button variant="outline" onClick={handleGoogleLogin} disabled={loading} className="w-full border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--sand))] h-11 font-medium">
                        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign up with Google
                      </Button>
                    </>
                  )}

                  <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
                    Already have an account?{" "}
                    <button onClick={switchToLogin} className="text-[hsl(var(--sky-deep))] hover:text-[hsl(var(--sky))] font-semibold hover:underline transition-colors">
                      Sign In
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
