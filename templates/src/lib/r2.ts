import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

// Server-side Cloudflare R2 client. R2 is S3-compatible, so we use the AWS SDK
// pointed at the R2 endpoint.

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured (missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function bucket(): string {
  const name = process.env.R2_BUCKET;
  if (!name) throw new Error("R2_BUCKET is not configured");
  return name;
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  return awsGetSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn },
  );
}

export async function getSignedUploadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  return awsGetSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
