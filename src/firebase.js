import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// Configuración real de tu proyecto de Firebase (console.firebase.google.com)
const firebaseConfig = {
  apiKey: "AIzaSyA2KyGaFqP_0Js8pbpPNOMqiKyItvZYUdU",
  authDomain: "photograf-2026.firebaseapp.com",
  projectId: "photograf-2026",
  storageBucket: "photograf-2026.firebasestorage.app",
  messagingSenderId: "485657535908",
  appId: "1:485657535908:web:ad7b8ebc39e7f77b648d31",
  measurementId: "G-WHEEMBH3CX",
};

// Clave VAPID generada en Firebase Console → Project settings → Cloud Messaging
export const VAPID_KEY = "BKLJWXk-4Pn0qce4lww8QqX64Ktu9U7REvjlSj_roqdlARHcmFwg-bSeUvbqslfM9Totw-eq5HhRpTPeBe0QjWY";

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const messaging = typeof window !== "undefined" ? getMessaging(firebaseApp) : null;
