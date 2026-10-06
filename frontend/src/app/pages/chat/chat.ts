import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type Message = { role: 'user' | 'assistant'; content: string };


@Component({
  imports: [],
  selector: 'app-chat',
  styleUrl: './chat.css',
  templateUrl: './chat.html',
})
export class Chat {
  private http = inject(HttpClient);
  
  messages = signal<Message[]>([]);
  loading = signal(false);

  send(text: string) {
    if (!text.trim() || this.loading()) return;

    // Add the user's message, then send the WHOLE list to the backend
    this.messages.update((list) => [...list, { role: 'user', content: text }]);
    this.loading.set(true);

    this.http
      .post<{ reply: string }>('http://localhost:3000/api/chat', { messages: this.messages() })
      .subscribe({
        next: (res) => {
          this.messages.update((list) => [...list, { role: 'assistant', content: res.reply }]);
          this.loading.set(false);
        },
        error: () => {
          this.messages.update((list) => [
            ...list,
            { role: 'assistant', content: 'Something went wrong.' },
          ]);
          this.loading.set(false);
        },
      });
  }
}
