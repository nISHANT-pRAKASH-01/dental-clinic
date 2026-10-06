import express from 'express';
import cors from 'cors'; 
import OpenAI from 'openai';  

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
    // 2. Send the WHOLE conversation to the model
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      instructions:
        'You are a friendly receptionist for a dental clinic. ' +
        'Keep answers very short. Do not give medical diagnoses.',
      input: messages,          // ← was: input: message
    });

    res.json({ reply: response.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI is unavailable right now' });
  }
});




app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
