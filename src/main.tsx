import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const BF_CACHE_RELOAD_KEY = "__lovable_bfcache_reload__";

try {
  window.addEventListener("pageshow", (event) => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const restoredFromHistory = event.persisted || navigationEntry?.type === "back_forward";

    if (!restoredFromHistory) {
      sessionStorage.removeItem(BF_CACHE_RELOAD_KEY);
      return;
    }

    if (sessionStorage.getItem(BF_CACHE_RELOAD_KEY) === "1") {
      sessionStorage.removeItem(BF_CACHE_RELOAD_KEY);
      return;
    }

    sessionStorage.setItem(BF_CACHE_RELOAD_KEY, "1");
    window.location.reload();
  });
} catch (_) {
  // Ignore browser cache edge cases
}

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
