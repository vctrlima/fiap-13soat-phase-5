```mermaid
flowchart TB
  subgraph VideoService
    VH[HTTP Adapter]
    VUC[UploadVideo UseCase]
    VR[Video Repository Port]
    VS3[S3 Adapter]
    VMQ[SQS/SNS Adapter]
  end

  VH --> VUC
  VUC --> VR
  VUC --> VS3
  VUC --> VMQ
```
