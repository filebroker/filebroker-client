declare global {
    interface Window {
        __FILEBROKER_ENV__?: {
            PUBLIC_URL?: string;
            REACT_APP_PATH?: string;
            REACT_APP_CAPTCHA_SITEKEY?: string;
        };
    }
}

export function getConfiguredPublicUrl(): string {
    return window.__FILEBROKER_ENV__?.PUBLIC_URL ?? import.meta.env.PUBLIC_URL ?? "/";
}

export function getConfiguredAppPath(): string {
    return window.__FILEBROKER_ENV__?.REACT_APP_PATH ?? import.meta.env.REACT_APP_PATH ?? "/";
}

export function getConfiguredCaptchaSiteKey(): string | undefined {
    return window.__FILEBROKER_ENV__?.REACT_APP_CAPTCHA_SITEKEY ?? import.meta.env.REACT_APP_CAPTCHA_SITEKEY;
}

export function getConfiguredApiUrl(): string {
    return import.meta.env.REACT_APP_API_URL ?? "/api";
}
