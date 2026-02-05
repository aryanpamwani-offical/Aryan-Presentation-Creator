import fs from 'fs/promises';
import { google } from 'googleapis';
import { TOKEN_PATH, SCOPES } from './google_client.js';
import readline from 'readline';

export const getNewToken = async (client) => {
  // Step 1: Generate auth URL
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('Authorize this app by visiting:', authUrl);

  // Step 2: Ask user to paste the code manually
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', async (code) => {
      rl.close();
      try {
        // Step 3: Exchange code for tokens
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // Step 4: Save tokens
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);

        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  });
};
