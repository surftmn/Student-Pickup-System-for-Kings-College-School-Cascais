// Gmail Integration Module for Kings College School
// Updated with actual Client ID

window.GmailModule = {
    // Your actual Client ID from Google Cloud Console
    CLIENT_ID: '1022217812923-qlg5q0s6n3r8ni7log970nuliei7os8b.apps.googleusercontent.com',
    // Note: Client Secret is NOT used in frontend code for security
    API_KEY: '', // Optional for Gmail API
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
    SCOPES: 'https://www.googleapis.com/auth/gmail.readonly',

    gapi: null,
    isInitialized: false,
    isSignedIn: false,

    // ... rest of the code remains the same as before
} 