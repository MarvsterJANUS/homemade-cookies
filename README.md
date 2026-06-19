# 🍃 Cookie Corner

A simple cookie ordering site for friends — no accounts, no money, just cookies.

---

## Setup Guide

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project** — give it a name like "cookies"
3. Choose a region close to you
4. Set a strong database password and save it somewhere

### 2. Set up the database

1. In your Supabase project, go to **SQL Editor** → **New query**
2. Open `supabase-setup.sql` from this repo and paste the entire contents
3. Click **Run** — it creates all tables, security rules, and some example cookies

### 3. Create your admin account

1. In Supabase, go to **Authentication** → **Users** → **Add user**
2. Enter your email and a strong password
3. Save these credentials — you'll use them to log into the admin dashboard

> You can add more admin accounts the same way later.

### 4. Get your API credentials

1. In Supabase, go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

### 5. Fill in `js/config.js`

Open `js/config.js` and replace the placeholders:

```js
const SUPABASE_URL      = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...your anon key...';
```

> The anon key is safe to expose in frontend code — Supabase's Row Level Security
> policies control exactly what visitors can and can't access.

### 6. Deploy to GitHub Pages

1. Push this whole folder to a GitHub repository
2. Go to repo **Settings** → **Pages**
3. Under "Branch", select `main` (or `master`) and click Save
4. Your site will be live at `https://yourusername.github.io/your-repo-name/`

---

## How it works

| Who | Can do |
|-----|--------|
| Anyone | Browse available cookies, read reviews |
| Anyone | Place an order (name, size, amount) |
| Anyone | Leave a review (name, rating, comment) |
| Admin | See all orders in real-time |
| Admin | Change order status (pending → confirmed → ready → done) |
| Admin | Add / show / hide / delete cookies |
| Admin | Delete orders or reviews |

---

## File structure

```
cookies/
├── index.html          ← Customer-facing page
├── admin.html          ← Admin login + dashboard
├── css/
│   └── style.css       ← Shared styles
├── js/
│   ├── config.js       ← Your Supabase credentials (fill this in!)
│   ├── main.js         ← Customer page logic
│   └── admin.js        ← Admin dashboard logic
└── supabase-setup.sql  ← Run this once in Supabase SQL Editor
```

---

## Managing cookies

Log in at `/admin.html`, then go to the **Cookies** tab to:
- **Add** new cookies (give them a name, description, and emoji)
- **Toggle** availability with the switch — hidden cookies won't show to customers
- **Delete** cookies you'll never bake again

---

## Order flow

1. Customer visits the site → sees available cookies
2. Clicks **Order** → enters name, chooses size and amount
3. Order appears instantly on the admin dashboard
4. Admin updates status as the batch progresses
5. Customer gets their cookies 🍪
