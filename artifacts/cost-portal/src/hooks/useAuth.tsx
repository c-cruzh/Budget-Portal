import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  organization: string;
}

export interface Permissions {
  canEdit: boolean;
  canComment: boolean;
  canView: boolean;
  label: string;
}

function getPermissions(org: string): Permissions {
  switch (org) {
    case "C2 LABS":
      return { canEdit: true, canComment: true, canView: true, label: "Editor" };
    case "OPINNO":
      return { canEdit: false, canComment: true, canView: true, label: "Commenter" };
    case "AURORA360":
      return { canEdit: false, canComment: false, canView: true, label: "Viewer" };
    default:
      return { canEdit: false, canComment: false, canView: true, label: "Viewer" };
  }
}

interface AuthContextType {
  user: AuthUser | null;
  permissions: Permissions;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const defaultPermissions: Permissions = { canEdit: false, canComment: false, canView: true, label: "Viewer" };

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const permissions = useMemo(() => user ? getPermissions(user.organization) : defaultPermissions, [user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return false;
      }
      setUser(data.user);
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, permissions, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
