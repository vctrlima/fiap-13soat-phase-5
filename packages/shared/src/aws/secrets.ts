import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { secretsClient } from "./clients.js";

export const loadAppSecrets = async (
  secretId = "fiapx/app",
): Promise<Record<string, string>> => {
  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    if (!response.SecretString) {
      return {};
    }
    return JSON.parse(response.SecretString) as Record<string, string>;
  } catch {
    return {};
  }
};
