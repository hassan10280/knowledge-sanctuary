

# Performance & Loading Issue Analysis and Fix Plan

## Problem Diagnosis

After inspecting the codebase, I identified several factors causing inconsistent loading:

1. **No Route-Level Code Splitting**: All pages (Admin.tsx alone is 1009 lines) are eagerly imported in App.tsx, meaning the entire app bundles loads upfront — even pages the user never visits.

2. **Continuous Framer Motion Animations**: `GeometricPattern.tsx` runs infinite CSS transform animations (rotate 360°), which the session replay confirms — constant attribute updates every ~30ms. This strains rendering.

3. **Multiple Parallel Supabase Queries on Load**: The homepage fires queries for books, categories, site settings (header, hero), auth state, user roles, and wholesale discounts simultaneously.

4. **Large Admin Page**: 1009-line monolithic component loaded even for non-admin visitors.

5. **No QueryClient Configuration**: The `QueryClient` uses defaults — no `staleTime`, no `gcTime`, meaning data refetches aggressively on every mount.

---

## Plan

### Step 1: Add React.lazy + Suspense for Route Splitting

**File: `src/App.tsx`**

- Convert all page imports to `React.lazy()` (Admin, Auth, Cart, Checkout, WholesaleApply, AdminLogin)
- Wrap `<Routes>` with `<Suspense fallback={<LoadingSpinner />}>` 
- This ensures the homepage loads fast; heavy pages like Admin (1009 lines) only load when navigated to

### Step 2: Configure QueryClient with Sensible Defaults

**File: `src/App.tsx`**

- Set `staleTime: 5 * 60 * 1000` (5 minutes) — prevents unnecessary refetches
- Set `retry: 2` — limits retry storms on network issues
- This reduces redundant Supabase calls and makes the app feel snappier

### Step 3: Optimize GeometricPattern Animations

**File: `src/components/GeometricPattern.tsx`**

- Add `will-change: transform` CSS to animated elements
- Use CSS animations instead of Framer Motion for simple infinite rotations (lighter on the main thread)
- This eliminates the constant JS-driven attribute updates seen in the session replay

### Step 4: Add Loading Skeleton for BookGrid

**File: `src/components/BookGrid.tsx`**

- Replace the plain "Loading books..." text with skeleton cards
- This gives visual feedback during data fetch, so the page doesn't appear broken

---

## Expected Outcome

- **Homepage loads 40-60% faster** (lazy-loaded routes reduce initial bundle)
- **Consistent rendering** (QueryClient caching prevents flickering/refetch)
- **Smoother animations** (CSS-based instead of JS-driven)
- **Better perceived performance** (skeleton loaders instead of blank states)

No new features added — only performance fixes and stability improvements.

