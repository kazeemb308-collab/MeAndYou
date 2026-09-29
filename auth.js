import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

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

const form = document.getElementById("phoneForm");
const phoneInput = document.getElementById("phone");
const countryCode = document.getElementById("countryCode");
const message = document.getElementById("authMessage");
const sendButton = document.getElementById("sendCodeBtn");

let confirmationResult = null;
let recaptchaVerifier = null;

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function getPhoneNumber() {
  const raw = phoneInput.value.replace(/\D/g, "");
  if (!raw) return null;
  return `${countryCode.value}${raw.replace(/^0+/, "")}`;
}

function setupRecaptcha() {
  if (recaptchaVerifier) return recaptchaVerifier;

  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal",
    callback: () => showMessage("Verification complete. Tap Send code again if needed.")
  });

  return recaptchaVerifier;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phoneNumber = getPhoneNumber();
  if (!phoneNumber || phoneNumber.length < 10) {
    showMessage("Enter a valid phone number.", "error");
    return;
  }

  sendButton.disabled = true;
  showMessage("Preparing verification…");

  try {
    const verifier = setupRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);

    sessionStorage.setItem("pendingPhone", phoneNumber);
    document.body.classList.add("show-code");
    document.getElementById("codeInput").focus();
    showMessage(`A verification code was sent to ${phoneNumber}.`, "success");
  } catch (error) {
    console.error(error);
    showMessage(error?.message || "Could not send the verification code.", "error");
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch {}
      recaptchaVerifier = null;
      document.getElementById("recaptcha-container").innerHTML = "";
    }
  } finally {
    sendButton.disabled = false;
  }
});

document.getElementById("verifyForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!confirmationResult) {
    showMessage("Request a verification code first.", "error");
    return;
  }

  const code = document.getElementById("codeInput").value.trim();
  if (!/^\d{6}$/.test(code)) {
    showMessage("Enter the 6-digit verification code.", "error");
    return;
  }

  const verifyButton = document.getElementById("verifyBtn");
  verifyButton.disabled = true;
  showMessage("Verifying…");

  try {
    await confirmationResult.confirm(code);
    window.location.href = "chat.html";
  } catch (error) {
    console.error(error);
    showMessage("That code is incorrect or has expired. Try again.", "error");
  } finally {
    verifyButton.disabled = false;
  }
});

document.getElementById("changeNumberBtn").addEventListener("click", () => {
  document.body.classList.remove("show-code");
  document.getElementById("codeInput").value = "";
  confirmationResult = null;
  showMessage("");
});
