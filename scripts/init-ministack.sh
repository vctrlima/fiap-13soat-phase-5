#!/bin/sh
set -e

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"

echo "[init] creating buckets"
aws --endpoint-url="$ENDPOINT" s3 mb s3://raw-videos || true
aws --endpoint-url="$ENDPOINT" s3 mb s3://processed-zips || true

echo "[init] creating queues"
aws --endpoint-url="$ENDPOINT" sqs create-queue --queue-name video-processing-dlq || true
aws --endpoint-url="$ENDPOINT" sqs create-queue --queue-name video-notification-dlq || true
aws --endpoint-url="$ENDPOINT" sqs create-queue --queue-name video-processing \
	--attributes VisibilityTimeout=120,RedrivePolicy='{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:000000000000:video-processing-dlq","maxReceiveCount":"5"}' || true
aws --endpoint-url="$ENDPOINT" sqs create-queue --queue-name video-notification \
	--attributes RedrivePolicy='{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:000000000000:video-notification-dlq","maxReceiveCount":"5"}' || true

echo "[init] creating topic"
aws --endpoint-url="$ENDPOINT" sns create-topic --name video-domain-events || true

echo "[init] creating secret"
aws --endpoint-url="$ENDPOINT" secretsmanager create-secret --name fiapx/app --secret-string '{"JWT_SECRET":"changeme-secret","JWT_REFRESH_SECRET":"changeme-refresh-secret"}' || true

echo "[init] done"
