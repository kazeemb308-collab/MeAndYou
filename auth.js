import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Replace these values with your Firebase Web App configuration.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const form = document.querySelector("form");
const googleButton = document.getElementById("googleBtn");
const message = document.getElementById("authMessage");

function showMessage(text) {
  if (message) message.textContent = text;
}

function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/missing-password": "Please enter your password.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Working…");

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const name = document.getElementById("name")?.value.trim();

  try {
    if (name !== undefined) {
      if (!name) throw new Error("Please enter your name.");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      window.location.href = "chat.html";
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "chat.html";
    }
  } catch (error) {
    showMessage(friendlyError(error));
  }
});

googleButton?.addEventListener("click", async () => {
  showMessage("Opening Google sign-in…");
  try {
    await signInWithPopup(auth, googleProvider);
    window.location.href = "chat.html";
  } catch (error) {
    showMessage(friendlyError(error));
  }
});
