import { google } from 'googleapis';
import path from 'path';

// Root-level paths based on your folder structure
export const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
export const TOKEN_PATH = path.join(process.cwd(), 'token.json');

export const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive'
];

export const createOAuthClient = (credentials) => {
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  // console.log(redirect_uris[0])

  return new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );
};