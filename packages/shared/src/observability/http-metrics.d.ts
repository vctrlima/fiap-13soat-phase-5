export declare const registerHttpMetrics: (
  app: {
    addHook: (
      hook: "onRequest" | "onResponse" | "preHandler" | "onSend" | "onError",
      handler: (...args: any[]) => void,
    ) => void;
  },
  serviceName: string,
) => void;
