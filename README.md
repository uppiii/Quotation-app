# Quotation Management System

A web application for creating, calculating, saving, viewing, and deleting software/service
quotations. Built as a Software Developer Intern technical assignment.

## Features

- Email/password authentication via Supabase Auth (login + logout, protected routes)
- Create quotations with customer info, quotation info, and multiple product/service line items
- Add/remove product rows dynamically
- Automatic live calculation: Gross Amount → Discount Amount → Net Amount → Subtotal → GST → Grand Total
- Save quotations and their line items to Supabase (Postgres)
- List all quotations in a table (number, customer, amount, date, view, delete)
- View a single quotation in a clean, print-friendly layout
- Delete a quotation (cascades to its line items)
- Client-side validation (required customer name, valid email, quantity > 0, non-negative price,
  at least one product, required quotation date)
- Responsive, clean UI built with Tailwind CSS
- Loading states on data fetch/save/delete actions

## Technology Stack

- **Frontend:** React (Next.js, Pages Router)
- **Styling:** Tailwind CSS
- **Backend & Database:** Supabase (Postgres + Row Level Security)
- **Authentication:** Supabase Auth (email/password)
- **Deployment:** Vercel
- **Language:** JavaScript
- **Version Control:** Git & GitHub

## Project Structure

```
quotation-app/
├── components/          # Navbar, ProtectedRoute
├── context/              # AuthContext (session/user state)
├── lib/                  # Supabase client
├── pages/
│   ├── login.js
│   ├── index.js          # redirects to /login or /quotations
│   └── quotations/
│       ├── index.js      # list + delete
│       ├── new.js        # create form + live calculation
│       └── [id].js       # view single quotation
├── styles/globals.css
├── supabase/schema.sql   # DB schema + RLS policies
└── .env.example
```

## Database Structure

Two tables, linked by `quotation_id`, with a `user_id` on `quotations` so Row Level Security can
restrict each user to their own data:

**quotations**: id, user_id, quotation_number, customer_name, company_name, email, phone,
quotation_date, valid_until, subtotal, gst_percent, gst, total, created_at

**quotation_items**: id, quotation_id, product_name, quantity, unit_price, discount, amount

See `supabase/schema.sql` for the full DDL and RLS policies (a user can only select/insert/update/
delete their own quotations and items).

## Calculation Logic

For each product row:
- `Gross Amount = Quantity × Unit Price`
- `Discount Amount = Gross Amount × Discount %`
- `Net Amount = Gross Amount − Discount Amount`

For the whole quotation:
- `Subtotal = Sum of all Net Amounts`
- `GST = Subtotal × GST %`
- `Grand Total = Subtotal + GST`

All values recalculate instantly whenever quantity, price, discount, or GST % change (no button
needed) via a memoized calculation in `pages/quotations/new.js`.

## Installation Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd quotation-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** — copy `.env.example` to `.env.local` and fill in your
   Supabase project values (see [Supabase Setup](#supabase-setup) below):
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project's public anon key |

Both are safe to expose to the browser (they are the standard public client keys used with Row
Level Security). Never commit the `service_role` key or add it to a `NEXT_PUBLIC_` variable.

## Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → API** and copy the **Project URL** and **anon public key** into
   `.env.local`.
3. Go to **SQL Editor → New Query**, paste the contents of `supabase/schema.sql`, and run it.
   This creates the `quotations` and `quotation_items` tables, indexes, and Row Level Security
   policies.
4. Go to **Authentication → Providers** and confirm Email is enabled (it is by default).
5. Go to **Authentication → Settings** and, for local/dev testing, you can turn **off** "Confirm
   email" so test accounts can log in immediately after sign-up. (Alternatively, create a test
   user directly under **Authentication → Users → Add User**, which skips email confirmation.)
6. Create at least one test login: **Authentication → Users → Add User**, set an email and
   password — these become your submission's test credentials.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the GitHub repo.
3. In the Vercel project's **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values from `.env.local`.
4. Deploy. Vercel auto-detects Next.js — no extra build configuration needed.
5. Once live, note the deployment URL for submission.

## Test Login Credentials

Create a user in Supabase (**Authentication → Users → Add User**) and record the email/password
here before submitting, e.g.:

```
Email: tester@example.com
Password: <choose a password>
```

## Validation Rules

- Customer name is required
- Email must be a valid format (if provided)
- Quantity must be greater than 0
- Unit price cannot be negative
- At least one product row is required
- Quotation date is required

## Optional / Bonus Features Not Yet Implemented

Edit quotation, search/filter, PDF export, GST selection presets, and a summary dashboard are not
included in this first pass and are natural next steps if time permits — the schema and codebase
support adding them without structural changes (e.g. an edit page can reuse the form in
`pages/quotations/new.js`).
