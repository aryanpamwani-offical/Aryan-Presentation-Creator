import { google } from 'googleapis';
import path from 'path';

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

  console.log('Authorize this app by visiting:', authUrl);

  const code = prompt('Enter the code from that page here: ');
  if (!code) {
    throw new Error('No authorization code provided');
  }

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  await Bun.write(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token stored to', TOKEN_PATH);
  return client;
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