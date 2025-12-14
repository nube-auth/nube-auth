# Proofa Landing Page

Deploy to Vercel: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/0xdps/proofa-core&project-name=proofa-home&root-directory=apps/dashboard/home)

## 🚀 Quick Deploy

1. Click the deploy button above, or:
2. Install Vercel CLI: `npm i -g vercel`
3. Run from this directory: `vercel`

## 📝 Configuration

- **Framework**: Astro (static)
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`
- **Dev Command**: `pnpm dev`

## 🔧 Environment Variables

No environment variables required for static site.

## 📦 Build Settings

Vercel will automatically detect the Astro framework and use the correct build settings from `vercel.json`.

The site uses:
- Astro 4.x with static output
- Tailwind CSS for styling
- Vercel Analytics (enabled)

## 🌐 Custom Domain

After deployment, you can add a custom domain in the Vercel dashboard:
1. Go to your project settings
2. Navigate to Domains
3. Add your custom domain (e.g., `proofa.com` or `www.proofa.com`)
