// /server/controllers/facebookTokenController.js

const getTimestamp = () => new Date().toISOString();

exports.exchangeToken = async (req, res) => {
  const { shortLivedToken } = req.body;

  if (!shortLivedToken) {
    return res.status(400).json({ message: 'Short-lived token is required' });
  }

  try {
    const appId = '499020366015281'; // Your App ID
    const appSecret = process.env.FACEBOOK_APP_SECRET; // Store your App Secret in environment variables

    const response = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    );
    const data = await response.json();

    if (data.access_token) {
      console.log(`[${getTimestamp()}] ✅ Successfully exchanged for long-lived token for bot`);
      res.status(200).json({ longLivedToken: data.access_token });
    } else {
      console.error(`[${getTimestamp()}] ❌ Failed to exchange token:`, data);
      res.status(400).json({ message: 'Failed to exchange token', error: data.error?.message || 'Unknown error' });
    }
  } catch (err) {
    console.error(`[${getTimestamp()}] ❌ Error exchanging token:`, err.message, err.stack);
    res.status(500).json({ message: 'Server error while exchanging token', error: err.message });
  }
};
