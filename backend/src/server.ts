import express from 'express';
import cors from 'cors'; 
import OpenAI from 'openai';  
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';
import { addAppointment, findByTime, getAppointments } from './db';
import { semanticSearch } from './search';

process.loadEnvFile();
const openai = new OpenAI(); 

const app = express();
const PORT = 3000;

// Lets Express read JSON sent in request bodies (we'll need it soon)
app.use(express.json());
app.use(cors({ origin: 'http://localhost:4200' }));

// A route: when someone sends GET /api/appointments, run this function
app.get('/api/appointments', (req, res) => {
  res.json(getAppointments());
});


app.get('/api/hello', (req, res) =>  {
    res.json({ message: 'hello from the backend' })
});

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// The "menu" of functions the AI is allowed to ask for
const tools: OpenAI.Responses.Tool[] = [
  {
    type: 'function',
    name: 'get_appointments',
    description: "Get the list of today's appointments at the clinic.",
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_clinic_hours',
    description: 'Get the clinic opening hours for each day of the week.',
    parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    type: 'function',
    name: 'book_appointment',
    description:
      'Book an appointment for today. Only call this after the patient has given their name, ' +
      'the time and the treatment, and has confirmed they want to book.',
    parameters: {
      type: 'object',
      properties: {
        patient: { type: 'string', description: "The patient's full name" },
        time: { type: 'string', description: 'Time of day, formatted like "04:00 PM"' },
        treatment: { type: 'string', description: 'e.g. Check-up, Cleaning, Filling' },
      },
      required: ['patient', 'time', 'treatment'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'search_clinic_info',
    description:
      'Search the clinic information: prices, payment, insurance, cancellation policy, location, ' +
      'parking, aftercare instructions, children and emergencies. Use this before answering any ' +
      'question about the clinic.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for, e.g. "whitening price"' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    strict: true,
  },
];

// Runs the tool the AI asked for
async function runTool(name: string, args: Record<string, string>): Promise<unknown> {
  if (name === 'get_appointments') return getAppointments();
  if (name === 'get_clinic_hours') {
    return {
      'Monday-Friday': '9:00 AM - 6:00 PM',
      Saturday: '9:00 AM - 1:00 PM',
      Sunday: 'Closed',
    };
  }
  if (name === 'book_appointment') {
    // Our code enforces the rule: never double-book a slot
    if (findByTime(args.time)) {
      return { error: `The ${args.time} slot is already taken. Please choose another time.` };
    }
    const booked = addAppointment(args.patient, args.time, args.treatment);
    return { success: true, appointment: booked };
  }
  if (name === 'search_clinic_info') {
    const results = await semanticSearch(args.query);
    console.log(`   🔎 search "${args.query}" → ${results.length} chunk(s)`);
    if (results.length === 0) return { results: [], note: 'Nothing found. Do not guess; suggest calling the clinic.' };
    return { results };
  }
  return { error: `Unknown tool: ${name}` };
}


app.post('/api/chat', async (req, res) => {
  const messages: ChatMessage[] = req.body?.messages;

  // 1. Validate: must be a non-empty list of { role, content }
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.every(
      (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    )
  ) {
    res.status(400).json({ error: 'messages must be a list of { role, content }' });
    return;
  }

    try {
    // Start with the conversation from the frontend
    const input: OpenAI.Responses.ResponseInput = [...messages];

    // The agent loop: max 5 rounds, so it can never loop forever
    for (let step = 0; step < 5; step++) {
      const response = await openai.responses.create({
        model: 'gpt-5-nano',
        instructions:
          'You are a friendly receptionist for a dental clinic. ' +
          'Keep answers very short. Do not give medical diagnoses. ' +
          'Use the tools to look up real clinic data. Never invent appointments.',
        input,
        tools,                                   // ← offer the menu
      });

      // Did the AI ask for any tools?
      const toolCalls = response.output.filter((item) => item.type === 'function_call');

      // No → it's the final answer. Send it to the frontend and stop.
      if (toolCalls.length === 0) {
        res.json({ reply: response.output_text });
        return;
      }

      // Yes → remember what the AI said (including its tool requests)...
      input.push(...toResponseInputItems(response.output));

      // ...run each tool, and add each result to the conversation
      for (const call of toolCalls) {
        console.log(`🔧 AI called tool: ${call.name}`);
        const args = JSON.parse(call.arguments);     // the AI's inputs arrive as JSON text
        const result = await runTool(call.name, args);
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,               // links this result to the request
          output: JSON.stringify(result),      // results are sent as text
        });
      }
      // ...then loop back so the AI can read the results
    }

    res.json({ reply: 'Sorry, I got stuck. Please try again.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI is unavailable right now' });
  }

});




app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
