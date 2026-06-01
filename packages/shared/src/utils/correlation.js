import { v4 as uuidv4 } from "uuid";
export const correlationFromHeaders = (headers) => {
  const value = headers["x-correlation-id"];
  return typeof value === "string" && value.length > 0 ? value : uuidv4();
};
