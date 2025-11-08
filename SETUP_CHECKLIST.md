# Setup Checklist

Quick checklist to get your WFA Procurement React app running.

## ☑️ Initial Setup (15 minutes)

### 1. Supabase Setup

- [ ] Go to [supabase.com](https://supabase.com) and create account
- [ ] Create new project: "WFA Procurement"
- [ ] Save database password somewhere safe
- [ ] Wait for project creation (~2 minutes)

### 2. Database Migration

- [ ] In Supabase dashboard, go to **SQL Editor**
- [ ] Open `supabase-schema.sql` from this project
- [ ] Copy entire contents
- [ ] Paste in SQL Editor
- [ ] Click **Run**
- [ ] Verify tables created in **Table Editor**

Expected tables:
- products
- suppliers
- stock_movements
- order_forms
- purchase_orders
- sds_chemicals
- pallet_unloads

### 3. Get API Credentials

- [ ] In Supabase dashboard, go to **Settings** → **API**
- [ ] Copy **Project URL**: `https://xxxxx.supabase.co`
- [ ] Copy **anon/public key**: `eyJhbGci...`
- [ ] Save both - you'll need them in next step

### 4. Configure Environment

- [ ] Open `.env` file in project root
- [ ] Replace placeholder values:

\`\`\`bash
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
\`\`\`

- [ ] Save `.env` file

### 5. Create First User

- [ ] In Supabase dashboard, go to **Authentication** → **Users**
- [ ] Click **Add User**
- [ ] Enter your email
- [ ] Enter a password (remember it!)
- [ ] Click **Create User**

---

## ☑️ Local Testing (5 minutes)

### 6. Install Dependencies

\`\`\`bash
cd wfa-procurement-react
npm install
\`\`\`

- [ ] Wait for npm install to complete
- [ ] Check for any errors

### 7. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

- [ ] Server should start on http://localhost:5173
- [ ] Open browser to that URL

### 8. Test Application

- [ ] App loads without errors
- [ ] Sidebar navigation visible
- [ ] Click through different pages
- [ ] Click **Sign In** button
- [ ] Enter email/password from step 5
- [ ] Sign in successful
- [ ] User email shows in header
- [ ] Click **Sign Out**

---

## ☑️ GitHub Setup (5 minutes)

### 9. Create GitHub Repository

- [ ] Go to [github.com](https://github.com)
- [ ] Click **New Repository**
- [ ] Name: `wfa-procurement-react`
- [ ] Description: "WFA Procurement Management System"
- [ ] Choose **Private** (recommended)
- [ ] **Don't** initialize with README (we have one)
- [ ] Click **Create Repository**

### 10. Push Code to GitHub

- [ ] Copy repository URL from GitHub
- [ ] Run these commands:

\`\`\`bash
cd wfa-procurement-react
git remote add origin https://github.com/YOUR_USERNAME/wfa-procurement-react.git
git branch -M main
git push -u origin main
\`\`\`

- [ ] Refresh GitHub page - code should be there
- [ ] Verify all files uploaded

---

## ☑️ Vercel Deployment (10 minutes)

### 11. Import to Vercel

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Sign in with GitHub
- [ ] Click **Add New...** → **Project**
- [ ] Find `wfa-procurement-react` in list
- [ ] Click **Import**

### 12. Configure Project

- [ ] **Framework Preset**: Vite (should auto-detect)
- [ ] **Root Directory**: `./` (default)
- [ ] **Build Command**: `npm run build` (default)
- [ ] **Output Directory**: `dist` (default)
- [ ] Don't change these unless necessary

### 13. Add Environment Variables

Click **Environment Variables** and add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | (paste your Supabase URL) |
| `VITE_SUPABASE_ANON_KEY` | (paste your anon key) |

- [ ] Added both variables
- [ ] Values are correct (no extra spaces)
- [ ] Click **Deploy**

### 14. Wait for Deployment

- [ ] Watch build logs
- [ ] Build should complete in ~2 minutes
- [ ] Look for success message
- [ ] Copy production URL: `https://your-app.vercel.app`

---

## ☑️ Final Configuration (5 minutes)

### 15. Update Supabase Auth URLs

- [ ] Go back to Supabase dashboard
- [ ] Navigate to **Authentication** → **URL Configuration**
- [ ] Set **Site URL**: `https://your-app.vercel.app`
- [ ] Add **Redirect URL**: `https://your-app.vercel.app/**`
- [ ] Click **Save**

### 16. Test Production App

- [ ] Open your Vercel URL in browser
- [ ] App loads correctly
- [ ] Navigation works
- [ ] Click **Sign In**
- [ ] Sign in with your test user
- [ ] Sign in successful
- [ ] Try navigating to different pages

---

## ☑️ Optional: Supabase Storage (10 minutes)

### 17. Create Storage Buckets

For PDF file uploads:

- [ ] In Supabase, go to **Storage**
- [ ] Create bucket: `certificates` (for supplier certificates)
- [ ] Create bucket: `sds-pdfs` (for SDS documents)
- [ ] Set both to **Public** access

### 18. Set Storage Policies

Run in SQL Editor:

\`\`\`sql
-- Allow public reads
CREATE POLICY "Public can read certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

CREATE POLICY "Public can read SDS PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'sds-pdfs');

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Authenticated users can upload SDS PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sds-pdfs');
\`\`\`

- [ ] Policies created successfully

---

## 🎉 Setup Complete!

You now have:
- ✅ Supabase database running
- ✅ Local development environment
- ✅ Code on GitHub
- ✅ Production app on Vercel
- ✅ Authentication working
- ✅ Storage buckets ready

## Next Steps

Choose your path:

### Option A: Start Implementing Features
See README.md → "Adding a New Feature" section

### Option B: Migrate Data from Firebase
See MIGRATION.md for complete guide

### Option C: Just Explore
Browse the codebase, click around, get familiar with React/TypeScript

---

## Troubleshooting

### App shows "Missing Supabase environment variables"

**Local**: Check `.env` file has correct values
**Production**: Check Vercel environment variables

### Can't sign in

- Verify user exists in Supabase Auth → Users
- Check password is correct
- Check Supabase Site URL is set correctly

### Build fails in Vercel

- Check build logs for specific error
- Verify environment variables are set
- Try building locally: `npm run build`

### Database queries fail

- Check RLS policies are enabled
- Verify user is signed in
- Check browser console for specific errors

---

## Quick Reference

**Local dev**:
\`\`\`bash
cd wfa-procurement-react
npm run dev
\`\`\`

**Build**:
\`\`\`bash
npm run build
\`\`\`

**Deploy** (after setup):
\`\`\`bash
git add .
git commit -m "Your changes"
git push
# Vercel auto-deploys!
\`\`\`

**Supabase Dashboard**: https://app.supabase.com
**Vercel Dashboard**: https://vercel.com/dashboard

---

## Need Help?

- **Project docs**: See README.md
- **Deployment**: See DEPLOYMENT.md
- **Migration**: See MIGRATION.md
- **Summary**: See PROJECT_SUMMARY.md

Good luck! 🚀
