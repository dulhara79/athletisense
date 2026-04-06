// src/App.jsx
// ─────────────────────────────────────────────────────────────
// Root component. Wraps everything in providers and gates the
// main layout behind Firebase auth.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import MainLayout from "./pages/MainLayout";
import { LoginPage, SignupPage } from "./pages/AuthPages";

function AppContent() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f4f1",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid rgba(79,70,229,0.2)",
            borderTopColor: "#4f46e5",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p
          style={{
            fontSize: 13,
            color: "#6b6a66",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 600,
          }}
        >
          Loading AthletiSense…
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return showLogin ? (
      <LoginPage onToggle={() => setShowLogin(false)} />
    ) : (
      <SignupPage onToggle={() => setShowLogin(true)} />
    );
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
