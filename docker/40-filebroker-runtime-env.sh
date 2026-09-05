#!/bin/sh
set -eu

CLIENT_ROOT="/usr/share/nginx/html/filebroker"

PUBLIC_URL="${PUBLIC_URL:-/}"
REACT_APP_PATH="${REACT_APP_PATH:-/}"
REACT_APP_CAPTCHA_SITEKEY="${REACT_APP_CAPTCHA_SITEKEY:-}"

# PUBLIC_URL is used as an HTML <base>, so normalize it.
case "$PUBLIC_URL" in
    /*) ;;
    *) PUBLIC_URL="/$PUBLIC_URL" ;;
esac

case "$PUBLIC_URL" in
    */) ;;
    *) PUBLIC_URL="$PUBLIC_URL/" ;;
esac

export PUBLIC_URL
export REACT_APP_PATH
export REACT_APP_CAPTCHA_SITEKEY

envsubst \
    '${PUBLIC_URL} ${REACT_APP_PATH} ${REACT_APP_CAPTCHA_SITEKEY}' \
    < /etc/filebroker/filebroker-env.js.template \
    > "$CLIENT_ROOT/filebroker-env.js"

sed \
    "s#<base href=\"[^\"]*\"[^>]*>#<base href=\"${PUBLIC_URL}\">#" \
    "$CLIENT_ROOT/index.html.template" \
    > "$CLIENT_ROOT/index.html"
