import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
const region = process.env.AWS_REGION ?? "us-east-1";
const endpoint = process.env.AWS_ENDPOINT ?? "http://localhost:4566";
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
};
export const s3Client = new S3Client({
  region,
  endpoint,
  credentials,
  forcePathStyle: true,
});
export const sqsClient = new SQSClient({ region, endpoint, credentials });
export const snsClient = new SNSClient({ region, endpoint, credentials });
export const secretsClient = new SecretsManagerClient({
  region,
  endpoint,
  credentials,
});
