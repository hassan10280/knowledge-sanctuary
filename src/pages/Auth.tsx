import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to verify your account!");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully!");
        navigate("/");
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl text-white mb-2">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-white/60 text-sm">
            {mode === "login"
              ? "Sign in to your MadrasahMatters account"
              : "Join MadrasahMatters today"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              required
              minLength={6}
            />
          </div>
          {mode === "signup" && (
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                required
                minLength={6}
              />
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-[hsl(var(--sky-deep))] hover:bg-white/90 font-semibold"
          >
            {mode === "login" ? (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Signing in..." : "Sign In"}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? "Creating account..." : "Create Account"}
              </>
            )}
          </Button>
        </form>

        <div className="relative my-5 sm:my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-transparent px-3 text-white/40">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full border-white/20 text-white hover:bg-white/10"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </Button>

        <p className="text-center text-sm text-white/50 mt-5 sm:mt-6">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-white/80 hover:text-white underline transition-colors"
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-white/80 hover:text-white underline transition-colors"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Auth;
