type EnvVarSpec<T = string> = {
  required: boolean;
  default?: T;
};

type EnvSpec = {
  DATABASE_URL: EnvVarSpec<string>;
  GOOGLE_CLIENT_ID: EnvVarSpec<string>;
  GOOGLE_CLIENT_SECRET: EnvVarSpec<string>;
  //   NODE_ENV: EnvVarSpec<'development' | 'production' | 'test'>;
};

// Helper to extract env variables safely
const getEnvVar = <K extends keyof EnvSpec>(
  name: K,
  spec: EnvSpec[K]
): string => {
  const value = process.env[name as string] ?? spec.default;
  if (spec.required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value!;
};

// Define all env variables here
export const env = {
  DATABASE_URL: getEnvVar('DATABASE_URL', { required: true }),
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID', { required: true }),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET', { required: true }),
  // Add more as needed
};

// Infer types for autocomplete everywhere
export type Env = typeof env;
