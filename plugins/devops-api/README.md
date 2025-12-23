# DevOps API Plugin

A Backstage plugin that provides access to the internal DevOps API.

## Features

- Simple UI page to view DevOps API data
- Backend proxy to access the DevOps API running on port 8080
- GET request support to fetch data from the DevOps API

## Configuration

Add the following to your `app-config.yaml`:

```yaml
devopsApi:
  baseUrl: http://localhost:8080
```

If not specified, it defaults to `http://localhost:8080`.

## Usage

The plugin provides a page accessible at `/devops-api` that displays data from the DevOps API.

