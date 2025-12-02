import React, { useEffect, useState } from "react";

const STORAGE_KEY = "ai-hypothesis-onboarding-shown";

const FirstTimeOnboarding: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shown = localStorage.getItem(STORAGE_KEY);
    if (!shown) {
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.4)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: 32,
        maxWidth: 400,
        boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
        textAlign: "center"
      }}>
        <h2 style={{marginBottom: 16}}>Welcome!</h2>
        <p style={{marginBottom: 24}}>
          You can get help and explore features in the <b>AI Chat</b> anytime.<br/>
          Look for the AI Assistant icon or chat window on your screen.
        </p>
        <button
          onClick={handleClose}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 24px",
            fontSize: 16,
            cursor: "pointer"
          }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export default FirstTimeOnboarding;