# TradeBuddy Deployment Plan

## Overview

TradeBuddy is a **frontend-only React SPA** built with Vite. Since there's no backend, deployment is straightforward - we just need static file hosting.

**Target**: Support 10+ concurrent users
**Budget**: Free tier hosting

---

## Recommended Option: Vercel (Free)

### Why Vercel?
- **Free tier**: Generous limits (100GB bandwidth/month, unlimited sites)
- **Perfect for Vite/React**: Zero-config deployment
- **Global CDN**: Fast load times worldwide
- **Auto-deploys**: Push to GitHub → automatic deployment
- **Preview deploys**: Every PR gets a preview URL
- **Easy env vars**: Simple UI for secrets
- **Handles 10+ users easily**: CDN-backed, can handle thousands

### Free Tier Limits
| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB/month |
| Builds | 6,000 minutes/month |
| Serverless Functions | 100 GB-hrs/month |
| Team Members | 1 (personal) |

*For a static SPA with ~10 users, you won't come close to these limits.*

---

## Deployment Steps

### 1. Prerequisites

- [ ] Google Cloud Console setup for production domain
- [ ] Vercel account (sign up with GitHub)

### 2. Google OAuth Configuration

Before deploying, update Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add authorized JavaScript origins:
   ```
   https://your-app.vercel.app
   https://*.vercel.app  (for preview deploys)
   ```
5. Add authorized redirect URIs:
   ```
   https://your-app.vercel.app
   ```

### 3. Publish Google OAuth App to Production

By default, Google OAuth apps are in **"Testing" mode** (limited to 100 test users you manually add). To allow any user to sign in, you must publish the app.

#### Step 1: Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Ensure all required fields are filled:
   - **App name**: TradeBuddy
   - **User support email**: your email
   - **App logo**: upload a logo (optional but recommended)
   - **Application home page**: `https://your-app.vercel.app`
   - **Authorized domains**: `vercel.app`
   - **Developer contact email**: your email

#### Step 2: Add Privacy Policy & Terms of Service

Google requires these URLs for production apps:

1. Create simple pages (can host on same Vercel app):
   - Privacy Policy: `https://your-app.vercel.app/privacy`
   - Terms of Service: `https://your-app.vercel.app/terms`
2. Add these URLs in OAuth consent screen → **App domain** section

*Tip: Simple markdown pages are fine - they just need to exist.*

#### Step 3: Review Scopes

1. In OAuth consent screen, click **Edit App** → go to **Scopes**
2. Verify these scopes are listed:
   | Scope | Type | Verification |
   |-------|------|--------------|
   | `userinfo.email` | Non-sensitive | Not required |
   | `userinfo.profile` | Non-sensitive | Not required |
   | `spreadsheets` | **Sensitive** | May require verification |

#### Step 4: Publish the App

1. Go to **OAuth consent screen** main page
2. Find **Publishing status** (shows "Testing")
3. Click **PUBLISH APP**
4. Click **CONFIRM** in the dialog

#### Step 5: Handle Verification (If Required)

**For sensitive scopes (`spreadsheets`)**, Google may require verification:

| Scenario | What Happens |
|----------|--------------|
| **< 100 users** | Usually no verification needed |
| **> 100 users** | Google may request verification |
| **Unverified** | Users see warning but can proceed |

**If unverified, users will see:**
> "Google hasn't verified this app"

Users can still proceed by clicking:
1. **Advanced** → **Go to TradeBuddy (unsafe)**

**To complete verification (if requested):**

- [ ] Privacy policy accessible at public URL
- [ ] Terms of service accessible at public URL
- [ ] Submit verification request in OAuth consent screen
- [ ] Respond to Google's questions about scope usage
- [ ] Wait 3-5 business days for review

#### Quick Path for Small Teams (< 100 users)

If you have fewer than 100 users, you can skip verification:
1. Publish the app (Step 4)
2. Tell users to click through the "unverified app" warning
3. This is perfectly fine for personal/team use

---

### 4. Vercel Deployment

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import `tradeBuddy` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_GOOGLE_CLIENT_ID` = `your-client-id.apps.googleusercontent.com`
6. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Set environment variable
vercel env add VITE_GOOGLE_CLIENT_ID

# Deploy to production
vercel --prod
```

### 5. Add Vercel Configuration (Optional)

Create `vercel.json` for SPA routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## Alternative Free Options

| Platform | Pros | Cons |
|----------|------|------|
| **Netlify** | Similar to Vercel, great free tier | Slightly lower bandwidth (100GB) |
| **Cloudflare Pages** | Unlimited bandwidth, fast CDN | Newer, less mature |
| **GitHub Pages** | Free, integrated with repo | No env vars at build, manual config needed |
| **Render** | Simple static hosting | 100GB bandwidth limit |

### Quick Comparison for 10+ Users

All options above can easily handle 10+ concurrent users. A static SPA typically:
- Uses ~500KB-2MB per page load
- Caches assets in browser
- Makes API calls directly to Google (not our hosting)

**10 users × 10 page loads × 2MB = 200MB/day = 6GB/month** → Well within any free tier.

---

## Post-Deployment Checklist

- [ ] Verify Google OAuth works on production domain
- [ ] Test Google Sheets integration
- [ ] Confirm trades can be created and saved locally
- [ ] Test on mobile browsers
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics (optional, free)

---

## CI/CD Pipeline

The existing `.github/workflows/ci.yml` runs lint and tests. For auto-deploy:

**Option 1**: Vercel GitHub integration auto-deploys on push (recommended)

**Option 2**: Add deployment step to CI:

```yaml
# Add to .github/workflows/ci.yml
deploy:
  needs: test
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/master'
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npm run build
    - uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
```

---

## Scaling Beyond Free Tier

If usage grows significantly:

1. **Vercel Pro** ($20/month): 1TB bandwidth, team features
2. **Cloudflare Pages**: Unlimited bandwidth even on free tier
3. **AWS S3 + CloudFront**: Pay-per-use, very cheap at scale

---

## Implementation Tasks

### Vercel Setup
1. [x] Create `vercel.json` configuration
2. [ ] Connect repository to Vercel
3. [ ] Configure environment variables (`VITE_GOOGLE_CLIENT_ID`)
4. [ ] Deploy and verify build works

### Google OAuth Production
5. [ ] Update authorized JavaScript origins with Vercel domain
6. [ ] Update authorized redirect URIs with Vercel domain
7. [ ] Fill out OAuth consent screen (app name, emails, logo)
8. [ ] Add Privacy Policy page
9. [ ] Add Terms of Service page
10. [ ] Click "PUBLISH APP" to exit Testing mode
11. [ ] (If required) Complete Google verification for sensitive scopes

### Final Testing
12. [ ] Test Google OAuth sign-in on production
13. [ ] Test Google Sheets integration
14. [ ] Test on mobile browsers
15. [ ] (Optional) Set up custom domain

---

## Notes

- **No backend needed**: All logic runs client-side
- **Data storage**: IndexedDB (local) + Google Sheets (user's account)
- **API calls**: Go directly to Google APIs, not through our hosting
- **Authentication**: Google OAuth (handled client-side)
