# Cypher Log MCP Server

This is a Model Context Protocol (MCP) server that allows AI assistants like Claude to interact with your Cypher Log data on Nostr.

## What is MCP?

MCP (Model Context Protocol) is an open standard created by Anthropic that enables AI assistants to securely connect to external data sources and tools. Learn more at [modelcontextprotocol.io](https://modelcontextprotocol.io/).

## Prerequisites

- Node.js 18+
- A Nostr private key (nsec) or hex format
- Claude Desktop or another MCP-compatible client

## Installation

```bash
cd mcp-server
npm install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Nostr private key:
```
NOSTR_PRIVATE_KEY=nsec1...  # or hex format
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band
```

> **Security Warning**: Keep your private key secure. Consider using a dedicated keypair for agent operations rather than your main identity.

## Running the Server

```bash
npm start
```

The server will start and listen for MCP connections via stdio.

## Connecting to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "cypherlog": {
      "command": "node",
      "args": ["/path/to/cypherlog/mcp-server/index.js"],
      "env": {
        "NOSTR_PRIVATE_KEY": "your-nsec-here",
        "NOSTR_RELAYS": "wss://relay.damus.io,wss://relay.nostr.band"
      }
    }
  }
}
```

## Available Tools

Once connected, Claude will have access to these tools:

### Appliances (My Stuff)
- `list_appliances` - List all appliances
- `create_appliance` - Add a new appliance
- `update_appliance` - Update an existing appliance
- `delete_appliance` - Delete an appliance

### Vehicles
- `list_vehicles` - List all vehicles
- `create_vehicle` - Add a new vehicle
- `update_vehicle` - Update an existing vehicle
- `delete_vehicle` - Delete a vehicle

### Maintenance
- `list_maintenance` - List all maintenance schedules
- `create_maintenance` - Add a new maintenance schedule
- `complete_maintenance` - Log a maintenance completion
- `delete_maintenance` - Delete a maintenance schedule

### Subscriptions
- `list_subscriptions` - List all subscriptions
- `create_subscription` - Add a new subscription
- `delete_subscription` - Delete a subscription

### Warranties
- `list_warranties` - List all warranties
- `create_warranty` - Add a new warranty
- `delete_warranty` - Delete a warranty

### Pets
- `list_pets` - List all pets
- `create_pet` - Add a new pet
- `log_vet_visit` - Log a vet visit
- `delete_pet` - Delete a pet

### Projects
- `list_projects` - List all projects
- `create_project` - Add a new project
- `add_project_task` - Add a task to a project
- `delete_project` - Delete a project

### Companies
- `list_companies` - List all companies/service providers
- `create_company` - Add a new company
- `delete_company` - Delete a company

## Example Usage with Claude

Once configured, you can ask Claude things like:

- "List all my appliances"
- "Add a new maintenance task for my refrigerator to replace the water filter every 6 months"
- "Read this PDF manual and extract all the maintenance schedules, then add them to my log"
- "Show me all maintenance tasks that are overdue"
- "Add a vet visit for Max - annual checkup on January 30th"

## Security Considerations

1. **Private Key**: The MCP server needs access to your Nostr private key to sign events. Use a dedicated keypair if you prefer not to use your main identity.

2. **Encryption**: If you have encryption enabled in Cypher Log, the MCP server needs access to the same keys to encrypt/decrypt data.

3. **Review Actions**: Claude will show you what actions it plans to take. Review them before confirming.

4. **Relay Selection**: Events are published to the relays you configure. Make sure they match your Cypher Log settings.

## Development

To modify or extend the server:

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test
```

## License

MIT - Same as Cypher Log
