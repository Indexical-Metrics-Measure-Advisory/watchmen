import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface AppConfig {
  apiBaseUrl: string;
  useMockData: boolean;
  analyticsKey?: string;
  authSecret?: string;
  authExpire: number;
}

const config: AppConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  useMockData: process.env.USE_MOCK_DATA === 'true',
  analyticsKey: process.env.ANALYTICS_KEY,
  authSecret: process.env.AUTH_SECRET,
  authExpire: parseInt(process.env.AUTH_EXPIRE || '86400', 10)
};

export default config;