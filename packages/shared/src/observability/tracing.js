import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
let sdk = null;
export const initTracing = async (serviceName) => {
  if (sdk) {
    return;
  }
  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"}/v1/traces`,
    }),
  });
  sdk.start();
};
export const stopTracing = async () => {
  if (!sdk) {
    return;
  }
  await sdk.shutdown();
  sdk = null;
};
