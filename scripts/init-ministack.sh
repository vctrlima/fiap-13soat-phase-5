#!/bin/sh
set -eu

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="$REGION"

aws_local() {
	aws --endpoint-url="$ENDPOINT" "$@"
}

wait_for_ministack() {
	echo "[init] waiting for ministack endpoint"
	attempts=0
	until python -c "import urllib.request; urllib.request.urlopen('${ENDPOINT}/_ministack/health', timeout=5)" >/dev/null 2>&1; do
		attempts=$((attempts + 1))
		if [ "$attempts" -ge 30 ]; then
			echo "[init] error: ministack endpoint not ready after 30 attempts"
			exit 1
		fi
		sleep 1
	done
}

ensure_bucket() {
	bucket="$1"
	if aws_local s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
		echo "[init] bucket exists: $bucket"
		return
	fi
	aws_local s3api create-bucket --bucket "$bucket" >/dev/null
	echo "[init] bucket created: $bucket"
}

ensure_queue() {
	queue="$1"
	aws_local sqs create-queue --queue-name "$queue" >/dev/null
	echo "[init] queue ensured: $queue"
}

queue_arn() {
	queue="$1"
	queue_url="$(aws_local sqs get-queue-url --queue-name "$queue" --query 'QueueUrl' --output text)"
	aws_local sqs get-queue-attributes \
		--queue-url "$queue_url" \
		--attribute-names QueueArn \
		--query 'Attributes.QueueArn' \
		--output text
}

set_redrive_policy() {
	queue="$1"
	dlq_arn="$2"
	visibility_timeout="$3"

	queue_url="$(aws_local sqs get-queue-url --queue-name "$queue" --query 'QueueUrl' --output text)"
	attrs_file="/tmp/${queue}-attributes.json"

	if [ -n "$visibility_timeout" ]; then
		cat >"$attrs_file" <<EOF
{
	"VisibilityTimeout": "$visibility_timeout",
	"RedrivePolicy": "{\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"5\"}"
}
EOF
	else
		cat >"$attrs_file" <<EOF
{
	"RedrivePolicy": "{\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"5\"}"
}
EOF
	fi

	aws_local sqs set-queue-attributes \
		--queue-url "$queue_url" \
		--attributes "file://$attrs_file" >/dev/null

	rm -f "$attrs_file"
}

ensure_topic() {
	topic_name="$1"
	topic_arn="$(aws_local sns create-topic --name "$topic_name" --query 'TopicArn' --output text)"
	if [ -z "$topic_arn" ] || [ "$topic_arn" = "None" ]; then
		echo "[init] error: failed to ensure topic $topic_name"
		exit 1
	fi
	echo "[init] topic ensured: $topic_name"
}

ensure_secret() {
	secret_name="$1"
	secret_payload="$2"

	if aws_local secretsmanager describe-secret --secret-id "$secret_name" >/dev/null 2>&1; then
		echo "[init] secret exists: $secret_name"
		return
	fi

	aws_local secretsmanager create-secret \
		--name "$secret_name" \
		--secret-string "$secret_payload" >/dev/null
	echo "[init] secret created: $secret_name"
}

validate_resource() {
	name="$1"
	command="$2"
	if ! eval "$command" >/dev/null 2>&1; then
		echo "[init] error: validation failed for $name"
		exit 1
	fi
	echo "[init] validated: $name"
}

wait_for_ministack

echo "[init] ensuring buckets"
ensure_bucket "raw-videos"
ensure_bucket "processed-zips"

echo "[init] ensuring queues"
ensure_queue "video-processing-dlq"
ensure_queue "video-notification-dlq"
ensure_queue "video-processing"
ensure_queue "video-notification"

processing_dlq_arn="$(queue_arn "video-processing-dlq")"
notification_dlq_arn="$(queue_arn "video-notification-dlq")"

set_redrive_policy "video-processing" "$processing_dlq_arn" "120"
set_redrive_policy "video-notification" "$notification_dlq_arn" ""

echo "[init] ensuring topic"
ensure_topic "video-domain-events"

echo "[init] ensuring secret"
ensure_secret "fiapx/app" '{"JWT_SECRET":"changeme-secret","JWT_REFRESH_SECRET":"changeme-refresh-secret"}'

echo "[init] validating resources"
validate_resource "bucket raw-videos" "aws_local s3api head-bucket --bucket raw-videos"
validate_resource "bucket processed-zips" "aws_local s3api head-bucket --bucket processed-zips"
validate_resource "queue video-processing" "aws_local sqs get-queue-url --queue-name video-processing"
validate_resource "queue video-notification" "aws_local sqs get-queue-url --queue-name video-notification"
validate_resource "topic video-domain-events" "aws_local sns list-topics --output text | grep -q video-domain-events"
validate_resource "secret fiapx/app" "aws_local secretsmanager describe-secret --secret-id fiapx/app"

echo "[init] done"
