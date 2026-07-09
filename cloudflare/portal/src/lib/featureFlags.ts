import { OpenFeature } from '@openfeature/web-sdk';
import { FlagshipClientProvider } from '@cloudflare/flagship/web';
import { browser } from '$app/environment';

// Replace with your actual Flagship App ID, Account ID, and Auth Token
// These should be loaded from environment variables (e.g., .env file)
const FLAGSHIP_APP_ID = import.meta.env.VITE_FLAGSHIP_APP_ID || 'YOUR_FLAGSHIP_APP_ID';
const FLAGSHIP_ACCOUNT_ID = import.meta.env.VITE_FLAGSHIP_ACCOUNT_ID || 'YOUR_FLAGSHIP_ACCOUNT_ID';
const FLAGSHIP_AUTH_TOKEN = import.meta.env.VITE_FLAGSHIP_AUTH_TOKEN || 'YOUR_FLAGSHIP_AUTH_TOKEN';

if (browser) {
    OpenFeature.setProvider(new FlagshipClientProvider({
        appId: FLAGSHIP_APP_ID,
        accountId: FLAGSHIP_ACCOUNT_ID,
        authToken: FLAGSHIP_AUTH_TOKEN,
        // You can also prefetch flags here if needed
        // prefetchFlags: ['my-feature-flag'],
    }));
}

export const featureClient = OpenFeature.getClient();

export function isFeatureEnabled(flagKey: string, defaultValue: boolean = false): boolean {
    return featureClient.getBooleanValue(flagKey, defaultValue);
}
