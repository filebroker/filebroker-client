# filebroker-client

React web-client for the filebroker project.

## Setup

Uses the following environment variables for configuration:

```plaintext
PUBLIC_URL=/
REACT_APP_PATH=/
REACT_APP_API_URL=/api
```

`REACT_APP_PATH` and `PUBLIC_URL`: Root path of the application and path of public resources, may be different for development
builds.

`REACT_APP_API_URL`: Path to the API backend.

Changing these paths may require adjustments to the nginx configuration in `default.conf`.

These values may be overwritten in `.env.development.local` for development:

```plaintext
PUBLIC_URL=/
REACT_APP_PATH=/
REACT_APP_API_URL=http://localhost:8080/
```

# Run client locally

Running and deploying the full Docker container setup is managed by the [server repository](https://github.com/filebroker/filebroker-server).
To run the client locally for development, you can use `npm start` to run the vite server on `http://localhost:3000/`.
