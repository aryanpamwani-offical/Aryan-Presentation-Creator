import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const endpoint = process.env.CLOUDFLARE_JURISDICTION_SPECIFIC_ENDPOINT;
const accessKeyId = process.env.CLOUDFLARE_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_S3_SECRET_ACCESS_KEY_ID;
export const BUCKET_NAME =
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    process.env.CLOUDFLARE_BUCKET_NAME ||
    process.env.R2_BUCKET_NAME ||
    '';
export const PUBLIC_BASE_URL = (
    process.env.CLOUDFLARE_PUBLIC_DEVELOPMENT_URL ||
    process.env.R2_PUBLIC_URL ||
    ''
).replace(/\/+$/, '');

let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
    if (!s3ClientInstance) {
        if (!endpoint || !accessKeyId || !secretAccessKey) {
            throw new Error(
                'Missing Cloudflare R2 credentials in environment variables (CLOUDFLARE_JURISDICTION_SPECIFIC_ENDPOINT, CLOUDFLARE_S3_ACCESS_KEY_ID, CLOUDFLARE_S3_SECRET_ACCESS_KEY_ID)'
            );
        }

        s3ClientInstance = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }
    return s3ClientInstance;
}

/**
 * Upload a local file to Cloudflare R2 and return its public URL.
 * 
 * @param filePath Local path to the file to upload
 * @param key Object key name in R2 (e.g. 'snippets/slide-1.png' or 'slide-1.png')
 * @returns Publicly accessible URL to the uploaded object
 */
export async function uploadSnippetToR2(filePath: string, key: string): Promise<string> {
    const bucket = BUCKET_NAME;
    if (!bucket) {
        throw new Error(
            'Missing Cloudflare R2 bucket name. Please set CLOUDFLARE_R2_BUCKET_NAME in your .env file.'
        );
    }

    const s3 = getR2Client();
    const fileBuffer = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'image/png',
    });

    await s3.send(command);

    if (PUBLIC_BASE_URL) {
        return `${PUBLIC_BASE_URL}/${key}`;
    }

    // Fallback if public dev URL is not set
    return `${endpoint}/${bucket}/${key}`;
}

/**
 * Upload an in-memory Buffer to Cloudflare R2 and return its public URL.
 * 
 * @param buffer In-memory binary data
 * @param key Object key name in R2 (e.g. 'logo/css.png')
 * @param contentType MIME type of the object (defaults to 'image/png')
 * @returns Publicly accessible URL to the uploaded object
 */
export async function uploadBufferToR2(
    buffer: Buffer | Uint8Array,
    key: string,
    contentType: string = 'image/png'
): Promise<string> {
    const bucket = BUCKET_NAME;
    if (!bucket) {
        throw new Error(
            'Missing Cloudflare R2 bucket name. Please set CLOUDFLARE_R2_BUCKET_NAME in your .env file.'
        );
    }

    const s3 = getR2Client();

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3.send(command);

    if (PUBLIC_BASE_URL) {
        return `${PUBLIC_BASE_URL}/${key}`;
    }

    return `${endpoint}/${bucket}/${key}`;
}

/**
 * Clean up uploaded code snippet images from the Cloudflare R2 bucket.
 * 
 * @param prefix Prefix folder to clean up (defaults to 'code_snippets/')
 * @returns Number of objects deleted
 */
export async function cleanupR2Snippets(prefix: string = 'code_snippets/'): Promise<number> {
    const bucket = BUCKET_NAME;
    if (!bucket) return 0;

    const s3 = getR2Client();

    try {
        const listRes = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
            })
        );

        if (!listRes.Contents || listRes.Contents.length === 0) {
            return 0;
        }

        const objectsToDelete = listRes.Contents
            .filter((obj) => obj.Key)
            .map((obj) => ({ Key: obj.Key! }));

        if (objectsToDelete.length === 0) {
            return 0;
        }

        await s3.send(
            new DeleteObjectsCommand({
                Bucket: bucket,
                Delete: {
                    Objects: objectsToDelete,
                    Quiet: true,
                },
            })
        );

        return objectsToDelete.length;
    } catch (err: any) {
        console.error('❌ Failed to clean up Cloudflare R2 snippets:', err.message || err);
        return 0;
    }
}

const R2_LOGO_CACHE_PATH = path.resolve(process.cwd(), 'Presentation', 'media', 'json', 'logo_cache_r2.json');

function readR2LogoCache(): Record<string, string> {
    try {
        if (fs.existsSync(R2_LOGO_CACHE_PATH)) {
            return JSON.parse(fs.readFileSync(R2_LOGO_CACHE_PATH, 'utf8'));
        }
    } catch (_) {}
    return {};
}

function writeR2LogoCache(cache: Record<string, string>): void {
    try {
        fs.writeFileSync(R2_LOGO_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
    } catch (_) {}
}

/**
 * Retrieve logo URL from Cloudflare R2 cache, or upload fallback if missing.
 * 
 * @param filename File name of the logo (e.g. 'css.png')
 * @param localFallbackPath Optional local path to upload if not found in R2
 * @returns Public Cloudflare R2 URL for the logo
 */
export async function getLogoFromCloudflare(filename: string, localFallbackPath: string | null = null): Promise<string | null> {
    const cleanName = path.basename(filename);

    // 1. Check local R2 logo cache first (zero latency)
    const cache = readR2LogoCache();
    if (cache[cleanName]) {
        console.log(`🎯 Reusing cached logo (Cloudflare R2): ${cleanName}`);
        return cache[cleanName];
    }

    // 2. If local fallback exists, upload it directly to R2 under logo/ folder
    if (localFallbackPath && fs.existsSync(localFallbackPath)) {
        console.log(`📤 Uploading resized logo to Cloudflare R2: ${cleanName}`);
        const key = `logo/${cleanName}`;
        const url = await uploadSnippetToR2(localFallbackPath, key);
        cache[cleanName] = url;
        writeR2LogoCache(cache);
        return url;
    }

    return null;
}


