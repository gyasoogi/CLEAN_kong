import { initializeApp } from '@firebase/app';
import { getDatabase, ref } from '@firebase/database';

const firebaseApp = initializeApp({
  apiKey: 'AIzaSyAly7GS-Z6yhHRzpmZMDPZ5IXAlRb4XWM4',
  authDomain: 'cleankong-6ff35.firebaseapp.com',
  databaseURL: 'https://cleankong-6ff35-default-rtdb.firebaseio.com/',
  projectId: 'cleankong-6ff35',
  storageBucket: 'cleankong-6ff35.firebasestorage.app',
  messagingSenderId: '1055201421358',
  appId: '1:1055201421358:web:c17e43c7f91d9b3b96d7bf',
  measurementId: 'G-6BFBK3GPKE',
});

export const leaderboardRef = ref(getDatabase(firebaseApp), 'leaderboard');
