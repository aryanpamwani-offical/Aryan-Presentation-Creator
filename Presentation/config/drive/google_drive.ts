import { existsSync, createReadStream, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { google } from 'googleapis';

let resolvedFolderId = null;
let resolvedFolderPromise = null;

// ── Local disk cache for logo Drive URLs ─────────────────────────────────────
const LOGO_CACHE_PATH = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'logo_cache.json');

function readLogoCache() {
  try {
    if (existsSync(LOGO_CACHE_PATH)) return JSON.parse(readFileSync(LOGO_CACHE_PATH, 'utf8'));
  } catch (_) {}
  return {};
}

function writeLogoCache(cache) {
  try {
    writeFileSync(LOGO_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (_) {}
}

// Helper to sanitize folder name
function sanitizeFolderName(name) {
  return name.replace(/[\/\\?%*:|"<>\s]+/g, '_').trim();
}

async function getOrCreateFolder(drive, name, parentId = null) {
  const cache = readLogoCache();
  const cacheKey = `${name}:${parentId}`;
  if (cache._folders && cache._folders[cacheKey]) {
    return cache._folders[cacheKey];
  }

  let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  let folderId;
  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id;
  } else {
    // Create new folder
    const fileMetadata: any = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    folderId = folder.data.id;
  }

  cache._folders = cache._folders || {};
  cache._folders[cacheKey] = folderId;
  writeLogoCache(cache);

  return folderId;
}

async function getUniqueTopicFolder(drive, baseTopic) {
  const superprofId = await getOrCreateFolder(drive, 'Superprof');
  const imagesId = await getOrCreateFolder(drive, 'images', superprofId);

  const cleanTopic = sanitizeFolderName(baseTopic);
  let finalFolderName = cleanTopic;
  let counter = 0;

  while (true) {
    const checkName = counter === 0 ? finalFolderName : `${finalFolderName}-${counter}`;
    // Check if checkName exists
    const query = `mimeType='application/vnd.google-apps.folder' and name='${checkName}' and '${imagesId}' in parents and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id)',
      spaces: 'drive'
    });

    if (!res.data.files || res.data.files.length === 0) {
      // Name is available, create it
      const fileMetadata = {
        name: checkName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [imagesId]
      };
      const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });
      const folderId = folder.data.id;
      
      // Make the folder public so all child images inherit read access instantly
      await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
      
      return folderId;
    } else {
      // Name is taken, increment counter
      counter++;
    }
  }
}

const uploadImageToDrive = async (auth, filePath, topicName = 'General') => {
  try {
    if (!existsSync(filePath)) return null;
    const drive = google.drive({ version: 'v3', auth });

    // Resolve unique folder ID once per execution (shared promise across all concurrent uploads)
    if (!resolvedFolderPromise) {
      resolvedFolderPromise = getUniqueTopicFolder(drive, topicName).then(id => {
        resolvedFolderId = id;
        console.log(`📁 Target Google Drive folder resolved ID: ${id}`);
        return id;
      });
    }

    const folderId = await resolvedFolderPromise;

    // Upload file under the resolved folder and retrieve webContentLink inline
    const file = await drive.files.create({
      requestBody: { 
        name: path.basename(filePath),
        parents: [folderId]
      },
      media: { mimeType: 'image/png', body: createReadStream(filePath) },
      fields: 'id, webContentLink',
    });

    return file.data.webContentLink;
  } catch (err) {
    console.error('Drive Upload Error:', err.message);
    return null;
  }
};

// Reset folder cache if starting a new generation run
export const resetFolderCache = () => {
  resolvedFolderId = null;
  resolvedFolderPromise = null;
};

export const deleteResolvedFolder = async (auth) => {
  if (!resolvedFolderId) {
    console.log("ℹ️ No resolved folder ID to delete.");
    return;
  }
  try {
    const drive = google.drive({ version: 'v3', auth });
    console.log(`🗑️ Deleting temporary Google Drive folder ID: ${resolvedFolderId}...`);
    await drive.files.delete({ fileId: resolvedFolderId });
    console.log(`✅ Temporary Google Drive folder deleted.`);
    resolvedFolderId = null;
    resolvedFolderPromise = null;
  } catch (err) {
    console.error('⚠️ Failed to delete temporary Google Drive folder:', err.message);
  }
};

export const getLogoFromDrive = async (auth, filename, localFallbackPath = null) => {
  const cleanName = path.basename(filename);

  // ── Check local disk cache first (zero Drive API calls) ──────────────────
  const cache = readLogoCache();
  if (cache[cleanName]) {
    console.log(`🎯 Reusing cached logo (local): ${cleanName}`);
    return cache[cleanName];
  }

  try {
    const drive = google.drive({ version: 'v3', auth });
    
    // Resolve Superprof/images/logo folder structure
    const superprofId = await getOrCreateFolder(drive, 'Superprof');
    const imagesId = await getOrCreateFolder(drive, 'images', superprofId);
    const logoFolderId = await getOrCreateFolder(drive, 'logo', imagesId);

    // Search for filename inside logoFolderId
    const query = `name='${cleanName}' and '${logoFolderId}' in parents and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, webContentLink)',
      spaces: 'drive'
    });

    if (res.data.files && res.data.files.length > 0) {
      const url = res.data.files[0].webContentLink;
      console.log(`🎯 Reusing existing Drive logo for: ${cleanName}`);
      // Save to local disk cache for future runs
      cache[cleanName] = url;
      writeLogoCache(cache);
      return url;
    }

    // If not found and fallback exists, upload it to the logo folder to cache it
    if (localFallbackPath && existsSync(localFallbackPath)) {
      console.log(`📤 Logo not found in Drive. Uploading fallback to cache: ${cleanName}`);
      const file = await drive.files.create({
        requestBody: { 
          name: cleanName,
          parents: [logoFolderId]
        },
        media: { mimeType: 'image/png', body: createReadStream(localFallbackPath) },
        fields: 'id',
      });

      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const result = await drive.files.get({
        fileId: file.data.id,
        fields: 'webContentLink',
      });
      const url = result.data.webContentLink;
      // Save to local disk cache
      cache[cleanName] = url;
      writeLogoCache(cache);
      return url;
    }

    return null;
  } catch (err) {
    console.error('Error fetching logo from Drive:', err.message);
    return null;
  }
};

export default uploadImageToDrive;