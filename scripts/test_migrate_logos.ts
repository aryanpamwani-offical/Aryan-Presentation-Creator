import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import AuthWithGoogle from '../Presentation/config/auth/google-oauth.js';
import { uploadBufferToR2 } from '../Presentation/config/cloudflare/r2.js';

interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType?: string;
    size?: string;
}

const LOGO_CACHE_PATH = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'logo_cache.json');
const R2_LOGO_CACHE_PATH = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'logo_cache_r2.json');

/**
 * Reads existing logo_cache.json to extract known folder IDs and file URLs.
 */
function readLocalLogoCache(): Record<string, any> {
    try {
        if (fs.existsSync(LOGO_CACHE_PATH)) {
            return JSON.parse(fs.readFileSync(LOGO_CACHE_PATH, 'utf8'));
        }
    } catch (_) {}
    return {};
}

/**
 * Saves R2 logo cache mapping.
 */
function saveR2LogoCache(cache: Record<string, string>): void {
    try {
        fs.writeFileSync(R2_LOGO_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
        console.log(`\n💾 Saved R2 logo cache to: ${R2_LOGO_CACHE_PATH}`);
    } catch (err: any) {
        console.error('Failed to write R2 logo cache:', err.message);
    }
}

/**
 * Extracts Google Drive file ID from a webContentLink or uc?id= URL.
 */
function extractFileIdFromUrl(url: string): string | null {
    const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
    return match ? match[1] : null;
}

async function findLogoFilesOnDrive(drive: drive_v3.Drive): Promise<GoogleDriveFile[]> {
    const localCache = readLocalLogoCache();
    const folderIds = new Set<string>();

    // 1. Gather folder IDs from local cache
    if (localCache._folders) {
        for (const [key, id] of Object.entries(localCache._folders)) {
            if (key.startsWith('logo:') && typeof id === 'string') {
                folderIds.add(id);
            }
        }
    }

    // 2. Also search Drive directly for folders named 'logo' or 'logos'
    try {
        const folderSearch = await drive.files.list({
            q: "(name = 'logo' or name = 'logos') and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        if (folderSearch.data.files) {
            for (const f of folderSearch.data.files) {
                if (f.id) folderIds.add(f.id);
            }
        }
    } catch (err: any) {
        console.warn('⚠️ Could not search for logo folders:', err.message);
    }

    console.log(`🔍 Found ${folderIds.size} logo folder(s) on Google Drive: [${Array.from(folderIds).join(', ')}]`);

    const filesMap = new Map<string, GoogleDriveFile>();

    // 3. Query all files inside each logo folder
    for (const folderId of folderIds) {
        try {
            const res = await drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name, mimeType, size)',
                spaces: 'drive',
            });
            if (res.data.files) {
                for (const file of res.data.files) {
                    if (file.id && file.name) {
                        filesMap.set(file.name, {
                            id: file.id,
                            name: file.name,
                            mimeType: file.mimeType || 'image/png',
                            size: file.size,
                        });
                    }
                }
            }
        } catch (err: any) {
            console.warn(`⚠️ Error reading folder ${folderId}:`, err.message);
        }
    }

    // 4. Also check explicit cached file entries from logo_cache.json
    for (const [key, value] of Object.entries(localCache)) {
        if (key === '_folders') continue;
        if (typeof value === 'string' && !filesMap.has(key)) {
            const fileId = extractFileIdFromUrl(value);
            if (fileId) {
                filesMap.set(key, {
                    id: fileId,
                    name: key,
                    mimeType: 'image/png',
                });
            }
        }
    }

    return Array.from(filesMap.values());
}

async function migrateLogos(): Promise<void> {
    const tStart = performance.now();
    console.log('🚀 [Migration Script] Starting Google Drive ➜ Cloudflare R2 Logo Transfer...\n');

    // 1. Authenticate with Google
    console.log('🔑 Authenticating with Google OAuth...');
    const auth = await AuthWithGoogle();
    const drive = google.drive({ version: 'v3', auth: auth as any });
    console.log('✅ Google Drive authenticated.\n');

    // 2. Discover logo files on Google Drive
    console.log('📂 Scanning Google Drive for logo images...');
    const logoFiles = await findLogoFilesOnDrive(drive);

    if (logoFiles.length === 0) {
        console.log('⚠️ No logo files found on Google Drive to migrate.');
        return;
    }

    console.log(`\n📦 Found ${logoFiles.length} logo file(s) to transfer:`);
    logoFiles.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name} (Drive ID: ${f.id})`);
    });
    console.log('\n------------------------------------------------------------');

    const r2CacheMapping: Record<string, string> = {};
    let successCount = 0;
    let failedCount = 0;

    // 3. Download from Drive & Upload to Cloudflare R2
    for (const file of logoFiles) {
        const tFileStart = performance.now();
        const r2Key = `logo/${file.name}`;

        try {
            process.stdout.write(`⏳ Transferring "${file.name}"... `);

            // Download binary stream/buffer from Drive
            const tDownloadStart = performance.now();
            const driveRes = await drive.files.get(
                { fileId: file.id, alt: 'media' },
                { responseType: 'arraybuffer' }
            );
            const downloadMs = (performance.now() - tDownloadStart).toFixed(0);

            const buffer = Buffer.from(driveRes.data as ArrayBuffer);

            // Upload directly to Cloudflare R2 under logo/ folder
            const tUploadStart = performance.now();
            const r2Url = await uploadBufferToR2(buffer, r2Key, file.mimeType || 'image/png');
            const uploadMs = (performance.now() - tUploadStart).toFixed(0);

            const totalFileMs = (performance.now() - tFileStart).toFixed(0);

            r2CacheMapping[file.name] = r2Url;
            successCount++;

            console.log(`✅ Done in ${totalFileMs}ms (Download: ${downloadMs}ms, Upload: ${uploadMs}ms)`);
            console.log(`   🔗 R2 URL: ${r2Url}\n`);
        } catch (err: any) {
            failedCount++;
            console.log(`❌ Failed!`);
            console.error(`   Error details: ${err.message || err}\n`);
        }
    }

    // 4. Save new mapping to logo_cache_r2.json
    if (Object.keys(r2CacheMapping).length > 0) {
        saveR2LogoCache(r2CacheMapping);
    }

    const totalPipelineMs = ((performance.now() - tStart) / 1000).toFixed(2);
    console.log('============================================================');
    console.log(`🎉 Migration Completed in ${totalPipelineMs}s`);
    console.log(`   ✅ Successful: ${successCount}`);
    if (failedCount > 0) {
        console.log(`   ❌ Failed:     ${failedCount}`);
    }
    console.log('============================================================\n');
}

// Run the migration
migrateLogos().catch((err) => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
});
