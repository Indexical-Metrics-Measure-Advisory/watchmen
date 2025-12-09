import dotenv from 'dotenv';
import { getServiceHost, getWatchmenCoreHost } from './utils';

// Load environment variables from .env file
dotenv.config();

interface AppConfig {
  apiBaseUrl: string;
  useMockData: boolean;
  analyticsKey?: string;
  authSecret?: string;
  authExpire: number;
  watchmenCore:string
}

const config: AppConfig = {
  apiBaseUrl: getServiceHost(),
  watchmenCore : getWatchmenCoreHost(),
  useMockData: process.env.USE_MOCK_DATA === 'true',
  analyticsKey: process.env.ANALYTICS_KEY,
  authSecret: process.env.AUTH_SECRET,
  authExpire: parseInt(process.env.AUTH_EXPIRE || '86400', 10)
};

export default config;