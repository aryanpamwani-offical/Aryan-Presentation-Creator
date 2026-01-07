import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import open from 'open';

const SCOPES = ['https://www.googleapis.com/auth/presentations.readonly','https://www.googleapis.com/auth/presentations','https://docs.google.com/presentation/d/presentationID/edit'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

/**
 * Robust Authorization:
 * 1. Tries to load and USE the saved token.
 * 2. If the file is missing, corrupt, or the token is revoked -> Re-runs login.
 */
async function authorize() {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;

  const client = new google.auth.OAuth2(
    key.client_id,
    key.client_secret,
    'http://localhost:8080/'
  );

  try {
    // 1. Attempt to load the token file
    const tokenData = await fs.readFile(TOKEN_PATH);
    const tokens = JSON.parse(tokenData);
    
    // 2. Load credentials into client
    client.setCredentials(tokens);

    // 3. PROACTIVE CHECK: Force a refresh/check of the token
    // If the token is revoked or invalid, this will THROW an error.
    await client.getAccessToken(); 

    // If we get here, the token is valid!
    return client;

  } catch (err) {
    // 4. Catch ANY error (File missing, Bad JSON, Revoked Token)
    console.log('Saved token is missing or invalid. Starting re-authentication...');
    
    // Run the manual login flow and update the file
    return getNewToken(client);
  }
}

/**
 * Opens browser, gets new token, and SAVES it to token.json
 */
async function getNewToken(client) {
  return new Promise((resolve, reject) => {
    const authUrl = client.generateAuthUrl({
      access_type: 'offline', // Crucial for getting a Refresh Token
      scope: SCOPES,
      prompt: 'consent' // Forces consent screen to ensure we get a Refresh Token
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/') > -1) {
            const qs = new url.URL(req.url, 'http://localhost:8080').searchParams;
            const code = qs.get('code');
            
            if (code) {
              res.end('Authentication successful! Token updated.');
              
              const { tokens } = await client.getToken(code);
              client.setCredentials(tokens);

              // OVERWRITE the old/bad token.json
              await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
              console.log('New token saved to', TOKEN_PATH);

              server.close();
              resolve(client);
            }
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(8080, () => {
        open(authUrl);
      });
  });
}

async function listSlides(auth) {
  const slidesApi = google.slides({ version: 'v1', auth });
  try {
    const result = await slidesApi.presentations.get({
      presentationId: '1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9C6Vuc',
    });
    const slides = result.data.slides;
    console.log('Success! Found %s slides.', slides.length);
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

// EXECUTION
const auth = await authorize();
await listSlides(auth);