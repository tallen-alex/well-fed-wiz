import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client";
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (requiredRole && role !== requiredRole) {
        if (role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/client-dashboard");
        }
      }
    }
  }, [user, role, loading, navigate, requiredRole]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || (requiredRole && role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};
