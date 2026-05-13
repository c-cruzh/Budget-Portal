import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  const { login, error, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}emtech-logo.png`}
            alt="EmTech Digital LATAM El Salvador 2026"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-xl font-semibold text-white mb-1">Organizers Portal</h1>
          <p className="text-sm text-zinc-500">Sign in to access the cost management portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email or Username</label>
            <Input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com or username"
              required
              autoComplete="username"
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !email || !password}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center">
          <img
            src={`${import.meta.env.BASE_URL}presenting-partners.png`}
            alt="Presenting Partners"
            className="h-8 mx-auto opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
