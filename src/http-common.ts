import axios from "axios";
import { getConfiguredApiUrl, getConfiguredAppPath, getConfiguredPublicUrl } from "./config";

export default axios.create({
    baseURL: getApiUrl(),
    headers: {
        "Content-type": "application/json",
    },
});

export function getApiUrl(): string {
    const url = new URL(getConfiguredApiUrl(), window.location.origin).href;

    return url.endsWith("/") ? url : url + "/";
}

export function getPublicBasePath(): string {
    const path = getConfiguredPublicUrl();

    return path.endsWith("/") ? path : path + "/";
}

export function getSiteBaseUrl(): string {
    const url = new URL(getConfiguredAppPath(), window.location.origin).href;

    return url.endsWith("/") ? url : url + "/";
}
