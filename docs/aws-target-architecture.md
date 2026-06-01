# AWS Target Architecture (Future Evolution)

## Target Services

- Route53
- CloudFront
- WAF
- ALB
- EKS
- S3
- RDS PostgreSQL
- ElastiCache Redis
- SQS
- SNS
- Secrets Manager
- CloudWatch
- X-Ray

The current implementation remains 100% local (Ministack) and can migrate to real AWS with minimal changes because it uses AWS SDK v3 and port-oriented contracts.
