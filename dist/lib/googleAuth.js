"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleUserInfo = exports.getGoogleAuthURL = exports.getOAuth2Client = void 0;
const google_auth_library_1 = require("google-auth-library");
const getGoogleConfig = () => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
        throw new Error('Missing Google OAuth environment variables');
    }
    return { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI };
};
const getOAuth2Client = () => {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = getGoogleConfig();
    return new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
};
exports.getOAuth2Client = getOAuth2Client;
const getGoogleAuthURL = () => {
    const oauth2Client = (0, exports.getOAuth2Client)();
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });
};
exports.getGoogleAuthURL = getGoogleAuthURL;
const getGoogleUserInfo = async (code) => {
    try {
        const oauth2Client = (0, exports.getOAuth2Client)();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google');
        }
        const userInfo = await response.json();
        return {
            googleId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture
        };
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        throw new Error('Failed to authenticate with Google');
    }
};
exports.getGoogleUserInfo = getGoogleUserInfo;
//# sourceMappingURL=googleAuth.js.map