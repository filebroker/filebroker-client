import axios from "axios";

export default axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
        "Content-type": "application/json"
    }
});

export function getApiUrl(): string {
    let url = process.env.REACT_APP_API_URL;
    if (url === undefined) {
        return "/";
    } else if (!url.endsWith("/")) {
        return url + "/";
    } else {
        return url;
    }
}

export function getPublicUrl(): string {
    let url = process.env.PUBLIC_URL;
    if (url === undefined) {
        return "/";
    } else if (!url.endsWith("/")) {
        return url + "/";
    } else {
        return url;
    }
}

export function getSiteBaseURI(): string {
    const origin = window.location.origin;
    let path = process.env.REACT_APP_PATH;

    if (path === undefined || path === "/") {
        return origin + "/";
    } else if (!path.endsWith("/")) {
        return origin + path + "/";
    } else {
        return origin + path;
    }
}
