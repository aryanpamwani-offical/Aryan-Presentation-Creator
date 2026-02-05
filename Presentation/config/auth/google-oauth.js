import fs from 'fs/promises';
import { createOAuthClient, CREDENTIALS_PATH, TOKEN_PATH } from './google_client.js';
import { getNewToken } from './google_auth_helpers.js';

const AuthWithGoogle = async () => {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
    const client = createOAuthClient(JSON.parse(content));

    try {
      const tokenData = await fs.readFile(TOKEN_PATH, 'utf8');
      client.setCredentials(JSON.parse(tokenData));
      return client;
    } catch {
      console.log('Generating new token...');
      return await getNewToken(client);
    }
  } catch (error) {
    console.error("Auth Initialization Error:", error);
    throw error;
  }
};

AuthWithGoogle()
export default AuthWithGoogle;