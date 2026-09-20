import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';

/**
 * Thin wrapper around the MinIO client. Handles bucket bootstrap + object
 * upload/URL generation for generated invoice PDFs.
 *
 * Not exercised against a live MinIO instance in this environment (no
 * network access here) — the `minio` package's API surface below matches
 * its documented usage, but double-check against your installed version.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Client;
  private bucket = process.env.MINIO_BUCKET || 'simuni-invoices';

  onModuleInit() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
    this.ensureBucket().catch((err) =>
      this.logger.error(`Could not verify/create MinIO bucket "${this.bucket}": ${err.message}`),
    );
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket, process.env.MINIO_REGION || 'us-east-1');
      this.logger.log(`Created MinIO bucket "${this.bucket}"`);
    }
  }

  /**
   * Uploads a buffer (e.g. a generated invoice PDF) and returns both the
   * object key (stored on Invoice.pdfObjectKey, used to re-generate a fresh
   * signed URL later) and a signed URL valid for `expirySeconds`.
   */
  async uploadBuffer(objectKey: string, buffer: Buffer, contentType: string, expirySeconds = 60 * 60 * 24 * 7) {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, { 'Content-Type': contentType });
    const url = await this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
    return { objectKey, url };
  }

  async getSignedUrl(objectKey: string, expirySeconds = 60 * 60 * 24 * 7) {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }
}
