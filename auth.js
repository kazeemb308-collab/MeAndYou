import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",
  authDomain: "m3ss3nger-50a21.firebaseapp.com",
  projectId: "m3ss3nger-50a21",
  storageBucket: "m3ss3nger-50a21.firebasestorage.app",
  messagingSenderId: "245814154474",
  appId: "1:245814154474:web:4592f3a7e272154396f393"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const form = document.getElementById("authForm");
const message = document.getElementById("authMessage");

function showMessage(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function friendlyError(error) {
  const messages = {
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/missing-password": "Enter your password.",
    "auth/user-not-found": "No account exists with this email.",
    "auth/wrong-password": "The email or password is incorrect."
  };
  return messages[error?.code] || "Something went wrong. Please try again.";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("Working…");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const nameInput = document.getElementById("name");

  try {
    if (nameInput) {
      const name = nameInput.value.trim();
      if (!name) return showMessage("Enter your name.", "error");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    window.location.href = "chat.html";
  } catch (error) {
    showMessage(friendlyError(error), "error");
  }
});

document.getElementById("forgotPassword")?.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return showMessage("Enter your email first.", "error");
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Password reset email sent.", "success");
  } catch (error) {
    showMessage(friendlyError(error), "error");
  }
});
