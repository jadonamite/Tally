function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  get DATABASE_URL() { return req("DATABASE_URL"); },
  get TATUM_API_KEY() { return req("TATUM_API_KEY"); },
  get MEMWAL_ACCOUNT_ID() { return req("MEMWAL_ACCOUNT_ID"); },
  get MEMWAL_PRIVATE_KEY() { return req("MEMWAL_PRIVATE_KEY"); },
  get MEMWAL_SERVER_URL() { return process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz"; },
  get SUI_SEAL_PRIVATE_KEY() { return req("SUI_SEAL_PRIVATE_KEY"); },
  get SUI_EXECUTE_VIA() { return (process.env.SUI_EXECUTE_VIA === "public" ? "public" : "tatum") as "tatum" | "public"; },
  get TATUM_SUI_READ() { return (process.env.TATUM_SUI_READ === "grpcweb" ? "grpcweb" : "jsonrpc") as "jsonrpc" | "grpcweb"; },
  get CRON_SECRET() { return req("CRON_SECRET"); },
  get EXAMPLE_USER_ID() { return process.env.EXAMPLE_USER_ID || "e2e0000000000001"; },
  get OPERATOR_KEY() { return process.env.OPERATOR_KEY || ""; },
  get ODDS_API_KEY() { return process.env.ODDS_API_KEY || ""; },
  get AGENT_PAY_TO() { return process.env.AGENT_PAY_TO || ""; },
  get AGENT_CLIENT_KEY() { return process.env.AGENT_CLIENT_KEY || ""; },
};
