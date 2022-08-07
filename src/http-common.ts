import axios from "axios";

export default axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
        "Content-type": "application/json"
    }
});

export function getApiUrl(): string {
    let url = process.env.REACT_APP_API_URL;
    if (url == undefined) {
        return "/";
    } else if (!url.endsWith("/")) {
        return url + "/";
    } else {
        return url;
    }
}
