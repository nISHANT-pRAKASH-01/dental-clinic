import express from 'express';
import cors from 'cors'; 

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

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
