import { io, Socket } from 'socket.io-client';
import AppURL from '@/components/src/URL';

// 🔥 Fonction pour initialiser le socket
export const getSocket = (dsp_code: string): Socket => {
  const socket = io(AppURL, {
    query: { dsp_code },
    transports: ['websocket'],
    forceNew: true,      // 🔥 Toujours créer une nouvelle connexion
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // 📌 Logs pour le suivi des connexions
  socket.on('connect', () => {
  });

  socket.on('disconnect', () => {
  });

  socket.on('connect_error', (err) => {
    console.error('⚠️ Erreur de connexion:', err.message);
  });

  return socket;
};

// 🔥 Fonction pour déconnecter le socket
export const disconnectSocket = (socket: Socket) => {
  if (socket) {
    socket.off();         // Supprime tous les écouteurs
    socket.disconnect();  // Déconnecte proprement
  }
};
