import { JWT } from 'google-auth-library';

let jwtClient: JWT | null = null;

function getJwtClient(): JWT | null {
  if (jwtClient) return jwtClient;

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    console.warn('[FCM] GOOGLE_APPLICATION_CREDENTIALS_JSON not found in environment.');
    return null;
  }

  try {
    const creds = JSON.parse(credentialsJson);
    jwtClient = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    return jwtClient;
  } catch (err) {
    console.error('[FCM] Failed to initialize JWT client:', err);
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  const client = getJwtClient();
  if (!client) return null;
  try {
    const tokens = await client.authorize();
    return tokens.access_token || null;
  } catch (err) {
    console.error('[FCM] Failed to get OAuth2 access token:', err);
    return null;
  }
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(token: string, payload: FcmPayload): Promise<boolean> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) return false;

  let projectId: string;
  try {
    const creds = JSON.parse(credentialsJson);
    projectId = creds.project_id;
  } catch {
    return false;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('[FCM] Cannot send push notification: failed to obtain access token.');
    return false;
  }

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const body = {
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            alert: {
              title: payload.title,
              body: payload.body,
            },
          },
        },
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[FCM] Send failed with status ${res.status}:`, errorText);
      return false;
    }

    console.log('[FCM] Push notification sent successfully to token:', token.substring(0, 10) + '...');
    return true;
  } catch (err) {
    console.error('[FCM] Request failed:', err);
    return false;
  }
}
