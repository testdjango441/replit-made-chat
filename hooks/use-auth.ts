import { useState, useEffect } from "react";
import { useRouter } from "next/router";

const backendUrl = "https://b2966c6366f4.ngrok-free.app";

export type User = {
  id: string;
  email: string;
  name: string;
  firstName?: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored auth data on mount
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    // This is handled in the login component
    // Just a placeholder for future use
  };

  const logout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getToken = () => {
    return localStorage.getItem("auth_token");
  };

  return {
    user,
    isLoading,
    login,
    logout,
    getToken,
    isAuthenticated: !!user,
  };
}
