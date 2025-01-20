import { registerRootComponent } from 'expo';
import './firebaseConfig'; // Importez votre fichier Firebase ici
import App from './App';

// Assurez-vous que Firebase est initialisé avant de démarrer l'application
registerRootComponent(App);
