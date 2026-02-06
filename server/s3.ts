import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

// S3 Configuration from environment
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'fsn1';
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === 'true';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET || !S3_ENDPOINT) {
      throw new Error('S3 environment variables not configured (S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT)');
    }
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      forcePathStyle: S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export function getBucket(): string {
  if (!S3_BUCKET) throw new Error('S3_BUCKET not configured');
  return S3_BUCKET;
}

export function isS3Configured(): boolean {
  return !!(S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_BUCKET && S3_ENDPOINT);
}

// Upload a file to S3
export async function uploadToS3(key: string, body: Buffer | string, contentType: string): Promise<void> {
  await getS3Client().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

// Get a file from S3
export async function getFromS3(key: string): Promise<{ body: ReadableStream | null; contentType: string }> {
  const response = await getS3Client().send(new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
  return {
    body: response.Body as ReadableStream | null,
    contentType: response.ContentType || 'application/octet-stream',
  };
}

// Delete a single file from S3
export async function deleteFromS3(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
}

// Delete all files with a given prefix
export async function deletePrefix(prefix: string): Promise<void> {
  const client = getS3Client();
  const bucket = getBucket();

  let continuationToken: string | undefined;
  do {
    const list = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    if (list.Contents) {
      for (const obj of list.Contents) {
        if (obj.Key) {
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
        }
      }
    }

    continuationToken = list.NextContinuationToken;
  } while (continuationToken);
}

// List all files with a given prefix
export async function listKeys(prefix: string): Promise<string[]> {
  const client = getS3Client();
  const bucket = getBucket();
  const keys: string[] = [];

  let continuationToken: string | undefined;
  do {
    const list = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    if (list.Contents) {
      for (const obj of list.Contents) {
        if (obj.Key) keys.push(obj.Key);
      }
    }

    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  return keys;
}
