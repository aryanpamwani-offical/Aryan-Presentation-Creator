import { google } from 'googleapis';
import path from 'path';
import open from 'open';

export const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
export const TOKEN_PATH = path.join(process.cwd(), 'token.json');
export const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive'
];

const getNewToken = async (client) => {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('🔗 Opening browser for Google Authentication...');
  console.log('If the browser does not open, please manually visit:', authUrl);

  return new Promise((resolve, reject) => {
    let server;
    
    server = Bun.serve({
      port: 8080,
      async fetch(req) {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          // Complete authentication in the background
          setTimeout(async () => {
            try {
              const { tokens } = await client.getToken(code);
              client.setCredentials(tokens);
              await Bun.write(TOKEN_PATH, JSON.stringify(tokens));
              console.log('✅ Token stored to', TOKEN_PATH);
              resolve(client);
            } catch (err) {
              reject(err);
            } finally {
              server.stop();
              console.log('🛑 Authentication server stopped.');
            }
          }, 500);

          // Return a beautiful response page
          return new Response(`
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Authentication Successful</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f8fafc;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                  }
                  .card {
                    background: white;
                    padding: 2.5rem;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                    text-align: center;
                    max-width: 420px;
                    border: 1px solid #f1f5f9;
                  }
                  .icon-container {
                    background: #ecfdf5;
                    color: #10b981;
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0 auto 1.5rem auto;
                  }
                  h1 {
                    color: #0f172a;
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem 0;
                  }
                  p {
                    color: #64748b;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    margin: 0;
                  }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="icon-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h1>Auth Successful</h1>
                  <p>Google authentication was completed successfully! You can now close this browser tab and return to the terminal.</p>
                </div>
              </body>
            </html>
          `, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }
        
        return new Response("Looking for authentication code...", { status: 200 });
      }
    });

    // Auto-open browser
    open(authUrl).catch(() => {
      console.log('Please visit the URL manually to authenticate.');
    });
  });
};

const AuthWithGoogle = async () => {
  try {
    const credentialsFile = Bun.file(CREDENTIALS_PATH);
    if (!(await credentialsFile.exists())) {
      throw new Error(`Credentials file not found at ${CREDENTIALS_PATH}`);
    }
    const content = await credentialsFile.text();
    const credentials = JSON.parse(content);
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
    const client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const tokenFile = Bun.file(TOKEN_PATH);
    if (await tokenFile.exists()) {
      const tokenData = await tokenFile.text();
      client.setCredentials(JSON.parse(tokenData));
      return client;
    } else {
      console.log('Generating new token...');
      return await getNewToken(client);
    }
  } catch (error) {
    console.error("Auth Initialization Error:", error);
    throw error;
  }
};

export default AuthWithGoogle;
export { getNewToken };
export const createOAuthClient = (credentials) => {
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};