# Deployment Guide for Minecraft Nesa Explorer 5 Edition

## Quick Deploy to Render (Web Service)

### Prerequisites
1. GitHub account
2. Render account (free tier works)

### Step 1: Push to GitHub
```bash
cd "c:\Users\Admin\Documents\Minecraft-3D-Game"
git add .
git commit -m "Add web service configuration"
git branch -M main
git remote add origin https://github.com/Hack6297/minecraft-nesa-explorer-5.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration
5. Click "Create Web Service"
6. Wait for deployment (usually 2-3 minutes)

### Alternative: Manual Configuration
If auto-detect doesn't work:
- **Name**: minecraft-nesa-explorer-5
- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements-server.txt`
- **Start Command**: `python server.py`
- **Instance Type**: Free

### Step 3: Access Your Game
Once deployed, Render will provide a URL like:
`https://minecraft-nesa-explorer-5.onrender.com`

## Files Required for Deployment
- ✅ `vanilla.html` - Main game file
- ✅ `render.yaml` - Render web service configuration
- ✅ `server.py` - Python HTTP server
- ✅ `requirements-server.txt` - Python dependencies (empty, using built-in modules)
- ✅ `textures/` - All texture PNG files (27 textures)
- ✅ `index-nesa.html` - Landing page with redirect
- ✅ `README-NESA.md` - Documentation

## Important Notes
- Web service runs on port 10000 (Render default)
- All textures must be in the `textures/` folder
- Three.js is loaded from CDN (no local files needed)
- Server automatically redirects `/` to `/vanilla.html`
- Free tier includes 750 hours/month

## Local Testing
Test the web service locally before deploying:
```bash
cd "c:\Users\Admin\Documents\Minecraft-3D-Game"
python server.py
```
Then visit http://localhost:10000

## Troubleshooting
**Textures not loading?**
- Ensure all 27 PNG files are in `textures/` folder
- Check file names match exactly (case-sensitive)

**Game not loading?**
- Check Render logs for errors
- Ensure Three.js CDN is accessible
- Verify server is running on correct port

**Service won't start?**
- Check `render.yaml` syntax
- Ensure `server.py` has correct permissions
- Review build logs in Render dashboard

## Custom Domain (Optional)
1. In Render dashboard, go to your web service
2. Click "Settings" → "Custom Domain"
3. Add your domain and configure DNS

## Monitoring
- View logs: Render Dashboard → Your Service → Logs
- Check status: Service should show "Live" status
- Test endpoint: Visit your-url.onrender.com

Enjoy your deployed Minecraft Nesa Explorer 5 Edition! 🎮⛏️
