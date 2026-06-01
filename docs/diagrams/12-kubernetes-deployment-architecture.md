```mermaid
graph TB
  subgraph EKS Cluster
    IN[Ingress]
    AGW[api-gateway Deployment]
    IDS[identity-service Deployment]
    VS[video-service Deployment]
    PS[processing-service Deployment]
    STS[status-service Deployment]
    NS[notification-service Deployment]
  end
  IN --> AGW
  AGW --> IDS
  AGW --> VS
  AGW --> STS
```
