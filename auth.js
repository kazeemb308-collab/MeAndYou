import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",
  authDomain: "m3ss3nger-50a21.firebaseapp.com",
  projectId: "m3ss3nger-50a21",
  storageBucket: "m3ss3nger-50a21.firebasestorage.app",
  messagingSenderId: "245814154474",
  appId: "1:245814154474:web:4592f3a7e272154396f393"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
const db = getFirestore(app);

const form = document.getElementById("authForm");
const message = document.getElementById("authMessage");

onAuthStateChanged(auth,user=>{
  if(user){
    window.location.replace("chat.html");
  }
});

function show(text, type = "") {
  if (!message) return;
  message.textContent = text;
  message.className = ("message " + type).trim();
}

function friendlyError(e) {
  const code = e?.code || "";
  const messages = {
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/missing-password": "Enter your password.",
    "auth/invalid-credential": "The username/email or password is incorrect.",
    "auth/user-not-found": "No account found.",
    "auth/wrong-password": "The password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "permission-denied": "Firebase Firestore permission is blocking this request. Check your Firestore rules.",
    "failed-precondition": "Firestore is not enabled or is not configured correctly.",
    "unavailable": "Firebase is temporarily unavailable. Check your internet connection."
  };
  return messages[code] || e?.message || "Something went wrong. Please try again.";
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  show("Creating account…");

  try {
    const usernameEl = document.getElementById("username");

    if (usernameEl) {
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      let username = usernameEl.value.trim().toLowerCase().replace(/^@/, "");

      if (!name) return show("Enter your name.", "error");
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return show("Username must be 3–20 characters: letters, numbers or _.", "error");
      }
      if (!email) return show("Enter your email.", "error");
      if (password.length < 6) return show("Password must be at least 6 characters.", "error");

      const existing = await getDoc(doc(db, "usernames", username));
      if (existing.exists()) return show("That username is already taken.", "error");

      const result = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(result.user, { displayName: name });

      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name,
        username,
        email,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, "usernames", username), {
        uid: result.user.uid,
        email
      });

    } else {
      let id = document.getElementById("loginId").value.trim().toLowerCase().replace(/^@/, "");
      let email = id;

      if (!id.includes("@")) {
        const snap = await getDoc(doc(db, "usernames", id));
        if (!snap.exists()) return show("Username not found.", "error");

        const usernameData = snap.data();
        if (!usernameData.email) {
          return show("This username needs to be updated. Log in with your email once, then try the username again.", "error");
        }

        email = usernameData.email;
      }

      await signInWithEmailAndPassword(
        auth,
        email,
        document.getElementById("password").value
      );
    }

    window.location.href = "chat.html";
  } catch (e) {
    console.error("MeAndYou auth error:", e);
    show(friendlyError(e), "error");
  }
});

document.getElementById("forgotPassword")?.addEventListener("click", async () => {
  const id = document.getElementById("loginId").value.trim();

  if (!id.includes("@")) {
    return show("Enter your email to reset your password.", "error");
  }

  try {
    await sendPasswordResetEmail(auth, id);
    show("Password reset email sent.", "success");
  } catch (e) {
    console.error("Password reset error:", e);
    show(friendlyError(e), "error");
  }
});
