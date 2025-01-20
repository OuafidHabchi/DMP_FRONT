import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBDSo8MWRPqwLJjswD4k2Cbw8wsMrP6SCE",
  authDomain: "prime-8e0be.firebaseapp.com",
  projectId: "prime-8e0be",
  storageBucket: "prime-8e0be.appspot.com",
  messagingSenderId: "844673146153",
  appId: "1:844673146153:android:a1bdb06e3a7b69d719eb38",
};

const app = initializeApp(firebaseConfig);
console.log('Firebase has been initialized.');

export default app;
