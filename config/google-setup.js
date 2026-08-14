const { google } = require('googleapis');

// Google Calendar OAuth2 setup
function createGoogleAuth() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// Generate authorization URL
function getAuthUrl(oauth2Client) {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',  // Force consent screen to get refresh token
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/tasks.readonly',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
    });
}

// Exchange code for tokens
async function getTokens(oauth2Client, code) {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    } catch (error) {
        console.error('Error retrieving access token:', error);
        throw error;
    }
}

module.exports = {
    createGoogleAuth,
    getAuthUrl,
    getTokens
};