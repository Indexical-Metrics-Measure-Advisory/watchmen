# Watchmen MCP Server

This directory contains the Model Context Protocol (MCP) server for Watchmen.
It exposes Watchmen's core data development capabilities (Topic, Connected Space, Subject) as tools for AI agents.

## Prerequisites

You need to install the `mcp` python package:

```bash
pip install mcp[cli]
```

## Running the Server

You can run the server using the MCP CLI or directly via python.

### Using MCP CLI

```bash
mcp run watchmen_rest_doll.mcp.server:mcp
```

### Configuration

The server currently uses a default "admin" context. 
In a production environment, you should configure authentication or pass credentials via the client.

## Available Tools

- `create_topic`: Create a new Data Model (Topic).
- `add_factor_to_topic`: Add columns (Factors) to a Topic.
- `create_connected_space`: Create a Project/Mart (Connected Space).
- `create_subject`: Create a Dataset (Subject) in a Connected Space.
