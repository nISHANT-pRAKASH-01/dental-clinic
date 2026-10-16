import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { addAppointment, findByTime, getAppointments } from './db';
import { semanticSearch } from './search';

// Load backend/.env (the OpenAI key for embeddings), wherever we were started from
process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));

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

// A tool WITH inputs: zod describes each input (instead of raw JSON Schema)
server.registerTool(
  'book_appointment',
  {
    description:
      'Book an appointment for today. Only call this after the patient has given their name, ' +
      'the time and the treatment, and has confirmed they want to book.',
    inputSchema: {
      patient: z.string().describe("The patient's full name"),
      time: z.string().describe('Time of day, formatted like "04:00 PM"'),
      treatment: z.string().describe('e.g. Check-up, Cleaning, Filling'),
    },
  },
  async ({ patient, time, treatment }) => {
    // Same rule as the chat tool: never double-book a slot
    if (findByTime(time)) {
      return {
        content: [{ type: 'text', text: `The ${time} slot is already taken. Please choose another time.` }],
        isError: true,
      };
    }
    const booked = addAppointment(patient, time, treatment);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, appointment: booked }) }] };
  },
);

// RAG over the clinic knowledge, using the same semantic search as the chat app
server.registerTool(
  'search_clinic_info',
  {
    description:
      'Search the clinic information: opening hours, prices, payment, insurance, cancellation policy, location, ' +
      'parking, aftercare instructions, children and emergencies. Use this before answering any ' +
      'question about the clinic.',
    inputSchema: {
      query: z.string().describe('What to search for, e.g. "whitening price"'),
    },
  },
  async ({ query }) => {
    const results = await semanticSearch(query);
    if (results.length === 0) {
      return { content: [{ type: 'text', text: 'Nothing found. Do not guess; suggest calling the clinic.' }] };
    }
    return { content: [{ type: 'text', text: results.join('\n\n') }] };
  },
);

// 3. Start listening for an AI app, over stdin/stdout
await server.connect(new StdioServerTransport());
console.error('dental-clinic MCP server running');
