# Google API Credentials - Kings College School Email System

## 📋 OAuth 2.0 Client Credentials

### Client Configuration
- **Client ID:** `1022217812923-qlg5q0s6n3r8ni7log970nuliei7os8b.apps.googleusercontent.com`
- **Client Secret:** `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`
- **Project Name:** Kings College School Email System
- **Application Type:** Web application

### Authorized Origins
- `http://localhost:3000`
- `http://localhost:8080`
- `http://127.0.0.1:3000`

### Authorized Redirect URIs
- `http://localhost:3000/`
- `http://localhost:8080/`

## 🔐 Security Notes

### ⚠️ IMPORTANT SECURITY CONSIDERATIONS

1. **Client Secret Protection:**
   - The client secret should NOT be exposed in frontend JavaScript
   - Only use Client ID in browser-side code
   - Client Secret is for server-side applications only

2. **Version Control:**
   - Add this file to `.gitignore` if pushing to public repositories
   - Never commit secrets to public GitHub repos

3. **Production Deployment:**
   - Use environment variables for production
   - Consider server-side proxy for additional security

## 🔧 Implementation

### Frontend JavaScript (gmail-integration.js)
```javascript
// Only use Client ID in frontend code
CLIENT_ID: '1022217812923-qlg5q0s6n3r8ni7log970nuliei7os8b.apps.googleusercontent.com'
// DO NOT include Client Secret in frontend
```

### Environment Variables (for future server-side use)
```bash
GOOGLE_CLIENT_ID=1022217812923-qlg5q0s6n3r8ni7log970nuliei7os8b.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## 📅 Configuration History

- **Created:** [Current Date]
- **Last Updated:** [Current Date]
- **Authorized Origins:** Localhost only (development)
- **Gmail API Status:** Enabled
- **OAuth Consent Screen:** Configured

## 🚀 Next Steps

1. Update `gmail-integration.js` with Client ID
2. Test Gmail API connection locally
3. Implement email classification system
4. Plan production deployment strategy

## 📞 Support

- **Google Cloud Console:** https://console.cloud.google.com
- **Project Dashboard:** https://console.cloud.google.com/home/dashboard
- **Gmail API Documentation:** https://developers.google.com/gmail/api

---

**⚠️ Remember:** Keep this file secure and never share credentials publicly! 