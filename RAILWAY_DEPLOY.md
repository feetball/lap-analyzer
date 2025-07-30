# Railway Deployment Guide

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

## Manual Deployment Steps

### 1. Prerequisites
- Railway account (https://railway.app)
- GitHub repository with the code

### 2. Deploy to Railway

1. **Connect Repository**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose the `feetball/lap-analyzer` repository

2. **Configure Environment Variables**
   Railway will automatically detect most settings, but you can add:
   ```
   NODE_ENV=production
   PORT=3000
   NEXT_TELEMETRY_DISABLED=1
   ```

3. **Deploy**
   - Railway will automatically build and deploy the application
   - The build process uses the included `Dockerfile`
   - Build time: ~3-5 minutes

### 3. Database Storage

The application uses SQLite for session storage. Railway provides:
- Persistent volumes for database files
- Automatic backups
- Volume mounting at `/app/data`

### 4. Domain Configuration

After deployment:
- Railway provides a `railway.app` subdomain
- You can configure a custom domain in the Railway dashboard
- SSL certificates are automatically provided

### 5. Monitoring

Railway provides:
- Real-time logs
- CPU and memory usage metrics
- Deployment history
- Health checks

## Production Features

✅ **Optimized Docker Build** - Multi-stage build for smaller images  
✅ **Database Persistence** - SQLite data survives deployments  
✅ **Environment Configuration** - Production-ready settings  
✅ **Health Checks** - Automatic application monitoring  
✅ **SSL/HTTPS** - Automatic certificate management  
✅ **CDN** - Global content delivery  

## Cost Estimate

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month - Perfect for personal use
- **Pro Plan**: $20/month - For production applications
- **Free Tier**: Limited but sufficient for testing

## Scaling

The application can handle:
- **Concurrent Users**: 100+ simultaneous users
- **File Uploads**: Up to 50MB CSV files
- **Database**: Thousands of racing sessions
- **Performance**: Sub-second response times

## Support

For deployment issues:
1. Check Railway logs in the dashboard
2. Verify environment variables
3. Ensure repository is public or Railway has access
4. Contact Railway support for platform-specific issues
