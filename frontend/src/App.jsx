import React, { useState } from "react";
import MainLayout from "./pages/MainLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Import your auth pages (adjust these paths if they are in a different folder)
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

// 1. Create a component that consumes the auth state
function AppContent() {
  const { user, loading } = useAuth();

  // State to toggle between Login and Signup pages
  const [showLogin, setShowLogin] = useState(true);

  // Show a blank screen or a loading spinner while Firebase checks auth status
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  // 2. If no user is logged in, show the Auth screens
  if (!user) {
    return showLogin ? (
      <LoginPage onToggle={() => setShowLogin(false)} />
    ) : (
      <SignupPage onToggle={() => setShowLogin(true)} />
    );
  }

  // 3. If a user IS logged in, show the Dashboard
  return <MainLayout />;
}

// 4. Wrap everything in the AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
