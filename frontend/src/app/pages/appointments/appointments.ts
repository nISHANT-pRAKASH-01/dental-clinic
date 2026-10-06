import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Describes the shape of one appointment, so TypeScript can check our code
type Appointment = {
  id: number;
  patient: string;
  time: string;
  treatment: string;
};

@Component({
  imports: [],
  selector: 'app-appointments',
  styleUrl: './appointments.css',
  templateUrl: './appointments.html',
})
export class Appointments {
  private http = inject(HttpClient);

  appointments = signal<Appointment[]>([]);   // starts empty
  error = signal('');

  constructor() {
    this.http.get<Appointment[]>('http://localhost:3000/api/appointments').subscribe({
      next: (data) => this.appointments.set(data),                 // success
      error: () => this.error.set('Could not load appointments'),  // failure
    });
  }
}
