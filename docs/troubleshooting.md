# Troubleshooting

## Upload Failure

- Check the JWT token and the uploaded file size.

## Processing Stuck

- Check the SQS queue in Ministack and `processing-service` logs.

## Download Unavailable

- Confirm `COMPLETED` status for the `videoId`.

## No Email in Mailpit

- Verify connectivity `notification-service -> mailpit:1025`.
