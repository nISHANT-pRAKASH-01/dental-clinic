import { Routes } from '@angular/router';
import { Appointments } from './pages/appointments/appointments';
import { Chat } from './pages/chat/chat';

export const routes: Routes = [
  { path: '', redirectTo: 'appointments', pathMatch: 'full' },
  { path: 'appointments', component: Appointments },
  { path: 'chat', component: Chat },
];
