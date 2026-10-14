import express from 'express';
import cors from 'cors'; 
import OpenAI from 'openai';  
import { toResponseInputItems } from 'openai/lib/responses/ResponseInputItems';

process.loadEnvFile();
const openai = new OpenAI(); 

const app = express();
const PORT = 3000;

// Lets Express read JSON sent in request bodies (we'll need it soon)
app.use(express.json());
app.use(cors({ origin: 'http://localhost:4200' }));

// Our "database" for now: just an array in memory
const appointments = [
  { id: 1, patient: 'Rahul Sharma', time: '10:00 AM', treatment: 'Check-up' },
  { id: 2, patient: 'Priya ', time: '11:30 AM', treatment: 'Filling' },
  { id: 3, patient: 'Amit Kumar', time: '02:00 PM', treatment: 'Cleaning' },
];

// A route: when someone sends GET /api/appointments, run this function
app.get('/api/appointments', (req, res) => {
  res.json(appointments);
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
];

// Runs the tool the AI asked for
function runTool(name: string): unknown {
  if (name === 'get_appointments') return appointments;
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
        const result = runTool(call.name);
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
