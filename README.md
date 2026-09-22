# Global Luxury Emporium — Production Website

Production-ready e-commerce and store management platform for **Global Luxury Emporium Ltd**, a UK-registered limited company based in London selling bespoke leather jackets crafted in Pakistan and shipped worldwide.

Built with **React 18 + Vite + TypeScript + Tailwind CSS** and backed by **Supabase** (Postgres, Auth, Storage) for deployment to **Cloudflare Pages**.

---

## 1. Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, React Router v6, Tailwind CSS (Custom luxury theme tokens).
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Storage for photos, GoTrue Auth for owner login).
- **Payment Processing**: Stripe Payment Links with dynamic fee combination resolution and sanitized `client_reference_id`.
- **Hosting / CDN**: Cloudflare Pages (single-page application with `/* /index.html 200` rewrite).

---

## 2. Setup Guide

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public API key** from **Project Settings → API**. (Never use `service_role`).

### Step 2: Run Database Schema
1. Open the **SQL Editor** in your Supabase dashboard.
2. Open `supabase/schema.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This creates:
   - `public.settings` table with initial seed configuration.
   - `public.products` table with seed products.
   - Row Level Security (RLS) policies allowing public reads of visible products and restricting all writes strictly to `yahyaharoon77@gmail.com`.
   - `product-images` storage bucket with public-read and owner-write policies.

### Step 3: Create the Owner User
1. In the Supabase Dashboard, navigate to **Authentication → Users**.
2. Click **Add User** → **Create User**.
3. Enter:
   - Email: `yahyaharoon77@gmail.com`
   - Password: Choose a strong temporary password (8+ characters).
   - Auto Confirm User: Checked (`true`).

### Step 4: Turn Off Public Sign-ups
1. Go to **Authentication → Configuration → Providers → Email**.
2. Uncheck **"Enable email signups"** (or turn off **"Allow new users to sign up"**).
3. This ensures nobody other than the store owner can ever register an account.

### Step 5: Configure Supabase Auth URLs
1. Navigate to **Authentication → URL Configuration**.
2. Set **Site URL**: `https://globalluxuryemporium.com/admin`
3. Add to **Redirect URLs**:
   - `https://globalluxuryemporium.com/admin`
   - `http://localhost:5173/admin` (for local development)
4. This ensures password recovery emails redirect directly to the owner password reset screen.

### Step 6: Environment Variables
Create a local `.env` file based on `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-api-key
```

---

## 3. Local Development & Build

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```
Verify that the output builds into the `dist/` directory without any TypeScript or bundling errors.

---

## 4. Deploying to Cloudflare Pages

1. In your Cloudflare Dashboard, navigate to **Workers & Pages → Create Application → Pages → Connect to Git**.
2. Select your repository.
3. Configure the Build Settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment Variables**:
   Under **Settings → Environment Variables**, add your production Supabase keys:
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-public-api-key`
   *(Important: In Vite, all `VITE_` environment variables must exist at build time).*
5. Deploy. The `public/_redirects` file automatically handles single-page client-side routing.

---

## 5. Stripe Payment Links & Pricing Note

> [!IMPORTANT]
> **Pricing in Stripe vs. Site**:
> Prices displayed on the website and prices charged in Stripe Payment Links are separate. When changing a jacket's base price or option fees in the Admin settings, make sure to update the corresponding Stripe Payment Link prices in your Stripe Dashboard.

### Fee Link Routing Logic:
- Base Link (`link`): Default jacket price.
- Personalisation Link (`link_p`): Jacket price + Personalisation fee.
- Requirements Link (`link_r`): Jacket price + Requirements fee.
- Combined Link (`link_pr`): Jacket price + Personalisation fee + Requirements fee.
- If a chosen fee combination link is not configured in the admin, the customer receives the notice: *"That option is not available for this jacket right now"* and the checkout does not open, preventing customers from inadvertently paying base price for customized orders.
- Client Reference ID appended to URL: `size-<size>__text-<personalisation>__req-<requirements>` (alphanumeric sanitized, truncated to 200 chars).

---

## 6. Manual Test Checklist

- [ ] **Desktop & Mobile Responsiveness**:
  - Test at 360px viewport: Header collapses links; trust strip displays 2x2; floating WhatsApp pill stays visible above safe-area insets.
  - Test at 1440px viewport: Full width hero; 4-column trust strip; multi-column product card grid; 3-column footer.
- [ ] **Keyboard Navigation & Accessibility**:
  - Tab through navigation and product cards; ensure visible gold outline (`:focus-visible`).
  - Press `Enter` or `Space` on any card to open product view.
  - Hover or focus on cards with secondary photos to verify smooth 0.35s crossfade.
- [ ] **Stripe Link & Options Selection**:
  - Open a product modal and select a size.
  - Fill in personalisation / requirements: verify extra fee calculation notes.
  - Click "Pay by card" and verify that the target URL contains the expected `client_reference_id` parameter.
- [ ] **Owner Authentication & Security**:
  - Navigate to `/admin`.
  - Try logging in with a non-owner email; verify access is rejected.
  - Log in with `yahyaharoon77@gmail.com`; verify access granted to Products and Settings tabs.
  - Test "Forgot password" flow: verify reset email is triggered.
  - Test "Set new password" recovery screen using `supabase.auth.updateUser`.
- [ ] **Product & Image Management**:
  - Upload multiple jacket photos; verify client-side canvas compression down to max 1200px.
  - Reorder thumbnails with "Make main" and remove photos.
  - Toggle "Hide product" switch; verify product is immediately hidden from the public store.
  - Edit pricing and verify instant update without requiring a publish step.

---

## 7. Security Test: Row Level Security (RLS) Verification

To verify that Row Level Security (RLS) and Storage policies strictly protect your store data from unauthorized modifications:

1. **Create a Test User**:
   - In your **Supabase Dashboard** > **Authentication** > **Users**, click **Add User** > **Create User**.
   - Create a secondary non-owner user (e.g. `test-non-owner@example.com`) with a test password.

2. **Verify Products & Settings Table Permissions**:
   - Authenticate in the browser console or API client with the second user's credentials.
   - Attempt an **INSERT**, **UPDATE**, or **DELETE** on the `products` table:
     ```javascript
     const { data, error } = await supabase.from('products').insert([{ title: 'Test Exploit', price: 1 }]);
     console.log(error); // Must return: 42501 / new row violates row-level security policy
     ```
   - Attempt an **UPDATE** or **DELETE** on the `settings` table:
     ```javascript
     const { data, error } = await supabase.from('settings').update({ stripe_pk: 'test' }).eq('id', 1);
     console.log(error); // Must return: 42501 / new row violates row-level security policy
     ```
   - Confirm that all write operations are strictly denied. Only `yahyaharoon77@gmail.com` is granted write access by `supabase/schema.sql`.

3. **Verify Storage Bucket Permissions (`product-images`)**:
   - As the non-owner user, attempt to upload or remove a file in the `product-images` bucket:
     ```javascript
     const { data, error } = await supabase.storage.from('product-images').upload('unauthorized.jpg', file);
     console.log(error); // Must return: Access denied / unauthorized policy violation
     ```
   - Confirm that write operations are rejected, while public read access to uploaded images remains functional.

---

## 8. Supabase Free Tier Inactivity & Production Recommendation

> [!WARNING]
> **Supabase Free Projects Inactivity Pause**:
> Supabase projects on the Free Tier automatically pause after **7 days of inactivity**. When a project is paused, all public API requests will fail and the store will display a notice to customers until the project is manually resumed in the Supabase Dashboard.
>
> **Live Store Recommendation**:
> Before actively marketing the store or accepting real customer orders, upgrade your Supabase organization to the **Pro Tier** ($25/mo). The Pro tier guarantees:
> - Zero project pausing / always-on availability.
> - Daily database backups with point-in-time recovery (PITR).
> - Dedicated compute and high-capacity storage for your product assets.

---

## 9. Campaign Assets & Known Notes

> [!NOTE]
> **Campaign Photography Notice**:
> model-2 shows a belt buckle that resembles a third-party brand logo: replace the source photo before launch.
> All model layers (`models/model-1.webp` + `model-1-patch.webp`, `models/model-2.webp` + `model-2-patch.webp`, `models/model-3.webp`) are preserved as independent transparent assets and animated via pure hand-written `requestAnimationFrame` + CSS transforms without any external animation libraries.


