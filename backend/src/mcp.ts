import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getAppointments } from './db';

// 1. Create the server and give it a name
const server = new McpServer({ name: 'dental-clinic', version: '1.0.0' });

// 2. Register a tool: name + description (the "menu") + the function (the "kitchen")
server.registerTool(
  'get_appointments',
  { description: "Get the list of today's appointments at the clinic." },
  async () => ({
    content: [{ type: 'text', text: JSON.stringify(getAppointments()) }],
  }),
);

// 3. Start listening for an AI app, over stdin/stdout
await server.connect(new StdioServerTransport());
console.error('dental-clinic MCP server running');
