import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
export declare const s3Client: S3Client;
export declare const sqsClient: SQSClient;
export declare const snsClient: SNSClient;
export declare const secretsClient: SecretsManagerClient;
