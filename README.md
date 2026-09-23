# Global Luxury Emporium — Production Platform

Production-ready e-commerce platform and administrative dashboard for **Global Luxury Emporium Ltd**, a UK-registered bespoke leather atelier in London selling handcrafted jackets made in Pakistan and shipped worldwide.

Built with **React 18 + Vite + TypeScript + Tailwind CSS**, powered by **Supabase** (Postgres, Row Level Security, Storage, Edge Functions, GoTrue Auth), and integrated with **Stripe** for seamless on-site payment processing and **Resend** for automated customer & merchant email confirmations.

---

## 1. System Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │               CLIENT (VITE SPA)               │
                    │   - Full /product/:id editorial page          │
                    │   - Dynamic options (Color, Size, etc.)       │
                    │   - Order Form (Name, Email, Delivery Address)│
                    │   - Embedded Stripe CardElement               │
                    └───────┬───────────────────────────────┬───────┘
                            │                               │
        1. create-payment-intent (POST)                     │ 3. confirmCardPayment()
        (jacket id, size, options, address)                 │ (client_secret + CardElement)
                            │                               │
                            ▼                               ▼
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │   SUPABASE EDGE FUNCTION      │        │        STRIPE API             │
       │   `create-payment-intent`     │        │  - Direct PaymentIntent       │
       │   - Looks up product price    │───────►│  - No Stripe Products/Prices  │
       │   - Calculates customisation  │        │  - Client secret generated    │
       │   - Adds delivery zone fee    │        └───────────────┬───────────────┘
       │   - Creates pending order     │                        │
       └───────────────┬───────────────┘                        │
                       │                                        │ 4. Webhook event
                       ▼                                        ▼
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │    SUPABASE POSTGRESQL        │        │   SUPABASE EDGE FUNCTION      │
       │    `orders` table: pending    │◄───────│   `stripe-webhook`            │
       │    `settings` & `products`    │ (paid) │   - Validates webhook sig     │
       └───────────────────────────────┘        │   - Updates order to 'paid'   │
                                                │   - Sends emails via Resend   │
                                                └───────────────┬───────────────┘
                                                                │
                                                                ▼
                                                ┌───────────────────────────────┐
                                                │          RESEND API           │
                                                │  - Itemised receipt to user   │
                                                │  - Notification to merchant   │
                                                └───────────────────────────────┘
```

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, `@stripe/react-stripe-js` & `@stripe/stripe-js`.
- **Database**: PostgreSQL on Supabase with strict Row Level Security (RLS).
- **Checkout Engine**: On-site embedded `CardElement` — customers never leave the website. No Stripe Products or Prices needed; charge amounts are dynamically calculated server-side from database tables.
- **Edge Functions**: Deno runtime on Supabase Edge Functions.
- **Fulfillment & Notifications**: Resend API sending dual itemised emails upon `payment_intent.succeeded`.
- **Hosting**: Cloudflare Pages (`/* /index.html 200` rewrite).

---

## 2. Environment Variables Setup

### Frontend Client Keys (`.env`)
Only public/anon credentials are ever exposed in client bundles. Create `.env` based on `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Supabase Edge Functions Secrets (Backend Only)
**Never expose these to the frontend.** Set them securely via the Supabase CLI or Dashboard:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  RESEND_API_KEY="re_..." \
  STORE_OWNER_EMAIL="globalluxuryemporium@gmail.com"
```

---

## 3. Database Setup & Migrations

### If setting up from scratch:
1. Open the **SQL Editor** in your Supabase Dashboard.
2. Run `supabase/schema.sql`.

### If upgrading an existing database:
1. Open the **SQL Editor** in your Supabase Dashboard.
2. Run `supabase/migrations/20260923_orders_and_delivery.sql`.

This ensures:
- The `orders` table is created with full customer, delivery, bespoke specifications, itemised pricing, and Stripe payment tracking.
- Row Level Security (RLS) policies allow public checkout creation and restrict order management and updates exclusively to the verified store owner (`yahyaharoon77@gmail.com`).
- The `settings` table includes configurable `delivery_zones` (defaulting to United Kingdom £0 and Rest of world £35).
- Legacy Stripe Payment Link columns are safely retired.

---

## 4. Supabase Edge Functions Deployment

Deploy the two edge functions using the Supabase CLI:

```bash
# 1. Login to Supabase CLI
supabase login

# 2. Link your local repo to your Supabase project
supabase link --project-ref your-project-ref

# 3. Deploy the PaymentIntent creation function
supabase functions deploy create-payment-intent --no-verify-jwt

# 4. Deploy the Stripe Webhook handler function
supabase functions deploy stripe-webhook --no-verify-jwt
```

*(Note: `--no-verify-jwt` allows public checkout clients and Stripe servers to call these endpoints).*

---

## 5. Stripe Webhook Configuration

1. In the [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks), navigate to **Developers → Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL**: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
4. **Events to listen for**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**.
6. Copy the **Signing secret** (`whsec_...`) and save it in your Supabase secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

---

## 6. Store Owner Authentication Setup

1. In Supabase Dashboard, navigate to **Authentication → Users**.
2. Click **Add User** → **Create User**:
   - Email: `yahyaharoon77@gmail.com`
   - Auto Confirm User: Checked (`true`).
3. Under **Authentication → Configuration → Providers → Email**:
   - Turn OFF **"Allow new users to sign up"** (ensures only the store owner can ever access the admin).
4. Under **Authentication → URL Configuration**:
   - Set Site URL: `https://globalluxuryemporium.com/admin`
   - Add Redirect URLs: `https://globalluxuryemporium.com/admin` and `http://localhost:5173/admin`.

---

## 7. Testing On-Site Checkout with Stripe Test Cards

1. Start your local dev server:
   ```bash
   npm run dev
   ```
2. Navigate to any jacket (e.g. `/product/1` or click any jacket card from the home page).
3. Select your bespoke options:
   - Size (e.g., `M`)
   - Color / Options (e.g., `Black`)
   - Personalisation (e.g., "J. DOE")
   - Additional Requirements (e.g., "Custom brass zippers")
4. Fill in the required Order Form:
   - Full Name: `Test Customer`
   - Email: `test@example.com`
   - Delivery Address: `10 Downing Street`, `London`, `SW1A 2AA`, `United Kingdom`
   - Delivery Zone: Select `United Kingdom (£0.00)` or `Rest of world (£35.00)`
5. Verify that the **Itemised Order Summary** updates in real-time with:
   - Jacket base price
   - Personalisation charge (if applicable)
   - Requirements charge (if applicable)
   - Delivery zone fee
   - Accurate live total
6. In the embedded **Card details** field, enter Stripe's official test card:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/28`)
   - CVC: Any 3 digits (e.g., `123`)
7. Click **Pay £...**.
8. The order completes directly on the page showing the order reference and confirmation details.
9. Log in to `/admin` with `yahyaharoon77@gmail.com`:
   - Click the **Orders** tab.
   - Verify the order appears with status **Paid**, complete customer information, delivery address, jacket specifications, and full itemised financial breakdown.

---

## 8. Store Management (/admin)

The Owner Dashboard provides 3 tabs:

### 1. Products
- Manage jacket catalog, high-resolution photo uploads with canvas compression.
- Custom options manager: add Color chips, dropdown selectors, radio choices, or custom text fields.
- Reorder jackets with sort orders and quick "Hide/Show" toggles.

### 2. Orders
- Live listing of all customer orders, sorted newest first.
- Filter by status (`All`, `Paid`, `Pending`, `Failed`) or search by customer name, email, jacket, order ID, or city.
- Comprehensive 3-column breakdown for each order:
  1. Customer contact and full shipping address.
  2. Bespoke specification (size, color, customisation text, special requirements).
  3. Itemised charges (jacket, personalisation fee, requirements fee, delivery fee, total charged) and Stripe PaymentIntent reference.

### 3. Store Settings
- Company & contact details (WhatsApp, email, registered office address).
- **Personalisation pricing**: Toggle personalisation box, set extra fee, box label, and hint text.
- **Additional requirements pricing**: Toggle requirements box, set extra fee, box label, and hint text.
- **Delivery pricing**: Add, rename, edit prices, or remove delivery zones (e.g., UK, EU, USA, Rest of world).

---

## 9. Production Build & Deployment

### Build Command:
```bash
npm run build
```
Builds verified assets into `dist/` with 0 errors.

### Cloudflare Pages Deployment:
1. Connect repository in Cloudflare Dashboard: **Workers & Pages → Pages → Connect to Git**.
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Set Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
5. Deploy. `public/_redirects` ensures clean single-page routing across `/product/:id`, `/admin`, and `/`.
