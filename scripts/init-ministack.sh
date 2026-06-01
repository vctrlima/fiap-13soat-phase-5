#!/bin/sh
set -e

echo "[init] creating buckets"
awslocal s3 mb s3://raw-videos || true
awslocal s3 mb s3://processed-zips || true

echo "[init] creating queues"
awslocal sqs create-queue --queue-name video-processing-dlq || true
awslocal sqs create-queue --queue-name video-notification-dlq || true
awslocal sqs create-queue --queue-name video-processing \
	--attributes VisibilityTimeout=120,RedrivePolicy='{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:000000000000:video-processing-dlq","maxReceiveCount":"5"}' || true
awslocal sqs create-queue --queue-name video-notification \
	--attributes RedrivePolicy='{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:000000000000:video-notification-dlq","maxReceiveCount":"5"}' || true

echo "[init] creating topic"
awslocal sns create-topic --name video-domain-events || true

echo "[init] creating secret"
awslocal secretsmanager create-secret --name fiapx/app --secret-string '{"JWT_SECRET":"changeme-secret","JWT_REFRESH_SECRET":"changeme-refresh-secret"}' || true

echo "[init] done"
