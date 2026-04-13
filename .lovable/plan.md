

# ওয়েবসাইট অডিট — সম্পূর্ণ সমস্যা সমাধান পরিকল্পনা

## বর্তমান অবস্থা পর্যালোচনা

অডিটে **২১টি সমস্যা** পাওয়া গেছে। নিচে প্রতিটি সমস্যা এবং সমাধান বিস্তারিত দেওয়া হলো।

---

## ফেজ ১: সিকিউরিটি ফিক্স (জরুরি)

### ১.১ Abandoned Carts — পাবলিক UPDATE পলিসি ফিক্স
**সমস্যা:** যেকোনো anonymous ইউজার যেকোনো abandoned cart রেকর্ড পরিবর্তন করতে পারে।
**সমাধান:** একটি মাইগ্রেশন তৈরি করে UPDATE পলিসি পরিবর্তন — শুধু `session_id` ম্যাচ বা `auth.uid() = user_id` হলেই আপডেট করতে পারবে।

### ১.২ Coupons — সব কুপন কোড পাবলিকলি পড়া যাচ্ছে
**সমস্যা:** যেকেউ সব কুপন কোড, ডিসকাউন্ট ভ্যালু দেখতে পারছে।
**সমাধান:** SELECT পলিসি পরিবর্তন — শুধু `is_active = true AND (expiry_date IS NULL OR expiry_date > now())` শর্তে সীমিত ফিল্ড (code, discount_type, discount_value) দেখাবে। সেনসিটিভ ফিল্ড (usage_limit, times_used) শুধু অ্যাডমিন দেখতে পারবে।

### ১.৩ Wholesale Pricing পাবলিকলি দেখা যাচ্ছে
**সমস্যা:** `wholesale_discounts` এবং `wholesale_quantity_tiers` টেবিল পাবলিকলি readable।
**সমাধান:** SELECT পলিসি পরিবর্তন — শুধু wholesale বা admin রোল থাকলেই দেখতে পারবে।

### ১.৪ Leaked Password Protection চালু করা
**সমস্যা:** পাসওয়ার্ড HIBP ডাটাবেসের বিরুদ্ধে চেক হচ্ছে না।
**সমাধান:** `configure_auth` টুল দিয়ে HIBP চেক enable করা।

### ১.৫ Audit Logs — INSERT পলিসি বেশি permissive
**সমস্যা:** যেকোনো authenticated ইউজার audit_logs এ ফেক এন্ট্রি ঢোকাতে পারে।
**সমাধান:** Authenticated INSERT পলিসি সরিয়ে দেওয়া — শুধু edge function (service role) দিয়ে লগ ঢোকাবে।

### ১.৬ Admin Notifications Realtime Channel
**সমস্যা:** যেকোনো authenticated ইউজার admin notification subscribe করতে পারে।
**সমাধান:** `admin_notifications` টেবিল Realtime publication থেকে সরিয়ে দেওয়া।

---

## ফেজ ২: ফাংশনালিটি ও UX ফিক্স

### ২.১ "Forgot Password" লিংক যোগ করা
**ফাইল:** `src/pages/Auth.tsx`
**সমাধান:** Login ফর্মে "Forgot your password?" লিংক যোগ করা যা `supabase.auth.resetPasswordForEmail()` কল করবে। ইমেইল ইনপুট নিয়ে রিসেট লিংক পাঠাবে।

### ২.২ পাসওয়ার্ড পরিবর্তনে "Current Password" ভেরিফিকেশন
**ফাইল:** `src/pages/Profile.tsx` (Settings ট্যাব)
**সমাধান:** নতুন পাসওয়ার্ড সেট করার আগে বর্তমান পাসওয়ার্ড ইনপুট নিতে হবে। সেটা দিয়ে `signInWithPassword()` কল করে ভেরিফাই করার পরই `updateUser()` কল হবে।

### ২.৩ Orders পেজ ডুপ্লিকেশন ঠিক করা
**ফাইল:** `src/pages/Orders.tsx`
**সমাধান:** `/orders` পেজ থেকে সরাসরি `/profile?tab=orders` এ redirect করা। এতে দুই জায়গায় আলাদা স্ট্যাটাস লেবেলের সমস্যা দূর হবে।

### ২.৪ Checkout এ নতুন Address প্রোফাইলে সেভ করা
**ফাইল:** `src/pages/Checkout.tsx`
**সমাধান:** অর্ডার সফল হলে ম্যানুয়ালি দেওয়া নতুন address `billing_addresses` টেবিলে insert করা।

### ২.৫ মোবাইলে Address অ্যাকশন বাটন দেখানো
**ফাইল:** `src/pages/Profile.tsx` (Addresses ট্যাব)
**সমস্যা:** Edit/Delete/Set Default বাটন hover-এ লুকানো, মোবাইলে দেখা যায় না।
**সমাধান:** `opacity-0 group-hover:opacity-100` সরিয়ে বাটনগুলো সবসময় দেখানো (অথবা মোবাইলে সবসময়, ডেস্কটপে hover)।

### ২.৬ Profile পেজের Dark Background ঠিক করা
**ফাইল:** `src/pages/Profile.tsx`
**সমস্যা:** `bg-black/40 backdrop-blur-sm` পুরো পেজে অন্ধকার overlay দেখায়।
**সমাধান:** `bg-slate-50` বা `bg-gradient-to-b from-slate-100 to-slate-50` ব্যবহার করা।

### ২.৭ Content Area Fixed Height ফিক্স
**ফাইল:** `src/pages/Profile.tsx`
**সমস্যা:** `max-h-[55vh]` ছোট স্ক্রিনে সমস্যা করে।
**সমাধান:** `max-h-[calc(100vh-280px)]` বা মোবাইলে fixed height সরানো।

---

## ফেজ ৩: ডাটা ইন্টিগ্রিটি

### ৩.১ Foreign Key Constraints যোগ করা
**সমাধান:** মাইগ্রেশনে FK constraints যোগ করা:
- `orders.user_id → auth.users(id) ON DELETE CASCADE`
- `order_items.order_id → orders(id) ON DELETE CASCADE`
- `billing_addresses.user_id → auth.users(id) ON DELETE CASCADE`

### ৩.২ Default Address Race Condition ফিক্স
**সমাধান:** একটি database function তৈরি করা (`set_default_address(addr_id, user_id)`) যা একটি transaction-এ আগেরটা unset এবং নতুনটা set করবে।

---

## ফেজ ৪: পারফরম্যান্স

### ৪.১ DataSyncProvider অপ্টিমাইজ করা
**ফাইল:** `src/components/DataSyncProvider.tsx`
**সমাধান:** focus/visibility listener সরানো বা debounce বাড়ানো (120ms → 2000ms)। শুধু stale query refetch করা।

### ৪.২ Profile Page Queries — react-query ব্যবহার
**ফাইল:** `src/pages/Profile.tsx`
**সমাধান:** Orders, addresses, wholesale status — সবগুলো raw supabase কল বাদ দিয়ে `useQuery` hook এ convert করা। এতে caching এবং deduplication হবে।

---

## টেকনিক্যাল ডিটেইলস

### মাইগ্রেশন SQL (ফেজ ১ — মোট ১টি মাইগ্রেশন ফাইল)
```sql
-- Abandoned carts: Fix UPDATE policy
DROP POLICY IF EXISTS "Public can update abandoned carts by id" ON abandoned_carts;
CREATE POLICY "Users can update own carts" ON abandoned_carts FOR UPDATE
  USING (session_id = current_setting('request.headers')::json->>'x-session-id'
         OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Coupons: Restrict SELECT
DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;
CREATE POLICY "Public can read active coupons" ON coupons FOR SELECT
  USING (is_active = true AND (expiry_date IS NULL OR expiry_date > now()));

-- Wholesale tables: Restrict to wholesale/admin
DROP POLICY IF EXISTS ... ON wholesale_discounts;
CREATE POLICY "Wholesale users can read" ON wholesale_discounts FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'wholesale') OR public.has_role(auth.uid(), 'admin'));

-- Audit logs: Remove public INSERT
DROP POLICY IF EXISTS "..." ON audit_logs;

-- FK constraints
ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE order_items ADD CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Default address function
CREATE OR REPLACE FUNCTION set_default_address(p_addr_id uuid, p_user_id uuid) ...
```

### ফাইল পরিবর্তন সারাংশ
| ফাইল | পরিবর্তন |
|---|---|
| `src/pages/Auth.tsx` | Forgot Password লিংক ও ফ্লো যোগ |
| `src/pages/Profile.tsx` | Current password ভেরিফিকেশন, মোবাইল বাটন ফিক্স, ব্যাকগ্রাউন্ড ফিক্স, react-query migration |
| `src/pages/Orders.tsx` | Profile orders ট্যাবে redirect |
| `src/pages/Checkout.tsx` | নতুন address অটো-সেভ |
| `src/components/DataSyncProvider.tsx` | Focus listener অপ্টিমাইজ |
| মাইগ্রেশন SQL | RLS ফিক্স, FK constraints, database function |

---

## বাস্তবায়ন ক্রম

১. **প্রথমে** সিকিউরিটি মাইগ্রেশন (ফেজ ১) — সবচেয়ে জরুরি
২. **এরপর** Auth.tsx ও Profile.tsx UX ফিক্স (ফেজ ২)
৩. **তারপর** ডাটা ইন্টিগ্রিটি মাইগ্রেশন (ফেজ ৩)
৪. **শেষে** পারফরম্যান্স অপ্টিমাইজেশন (ফেজ ৪)

মোট: **৬টি সিকিউরিটি, ৭টি UX/ফাংশনালিটি, ২টি ডাটা ইন্টিগ্রিটি, ২টি পারফরম্যান্স = ১৭টি আইটেম** এই প্ল্যানে সমাধান হবে। (বাকি ৪টি — order status email notification, Google OAuth wholesale flow verification, cart loading skeleton, standalone orders detail view — পরবর্তীতে করা যাবে।)

