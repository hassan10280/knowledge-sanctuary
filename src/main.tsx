import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clear stale Supabase sessions that may have wrong API keys cached
const EXPECTED_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
try {
  const ref = new URL(EXPECTED_SUPABASE_URL).hostname.split('.')[0];
  const storageKey = `sb-${ref}-auth-token`;
  
  // Remove any auth tokens from OTHER Supabase projects
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token') && key !== storageKey) {
      localStorage.removeItem(key);
    }
  }
} catch (_) {
  // Ignore
}

createRoot(document.getElementById("root")!).render(<App />);
