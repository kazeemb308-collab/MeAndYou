import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
const firebaseConfig={apiKey:"AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",authDomain:"m3ss3nger-50a21.firebaseapp.com",projectId:"m3ss3nger-50a21",storageBucket:"m3ss3nger-50a21.firebasestorage.app",messagingSenderId:"245814154474",appId:"1:245814154474:web:4592f3a7e272154396f393"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const form=document.getElementById("authForm"),message=document.getElementById("authMessage");
const show=(t,type="")=>{if(message){message.textContent=t;message.className=`message ${type}`.trim()}};
const err=e=>({"auth/invalid-email":"Enter a valid email address.","auth/invalid-credential":"The username/email or password is incorrect.","auth/email-already-in-use":"An account already exists with this email.","auth/weak-password":"Password must be at least 6 characters.","auth/user-not-found":"No account found.","auth/wrong-password":"The password is incorrect.","auth/too-many-requests":"Too many attempts. Try again later."}[e?.code]||"Something went wrong. Please try again.");
form?.addEventListener("submit",async e=>{e.preventDefault();show("Working…");
try{
const usernameEl=document.getElementById("username");
if(usernameEl){
const name=document.getElementById("name").value.trim();
if(!name)return show("Enter your name.","error");
let username=usernameEl.value.trim().toLowerCase().replace(/^@/,"");
if(!/^[a-z0-9_]{3,20}$/.test(username))return show("Username must be 3–20 characters: letters, numbers or _.","error");
const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value;
const existing=await getDoc(doc(db,"usernames",username)); if(existing.exists())return show("That username is already taken.","error");
const r=await createUserWithEmailAndPassword(auth,email,password); await updateProfile(r.user,{displayName:name});
await setDoc(doc(db,"users",r.user.uid),{uid:r.user.uid,name,username,email,createdAt:new Date().toISOString()});
await setDoc(doc(db,"usernames",username),{uid:r.user.uid});
}else{
let id=document.getElementById("loginId").value.trim().toLowerCase().replace(/^@/,"");
let email=id;
if(!id.includes("@")){const snap=await getDoc(doc(db,"usernames",id));if(!snap.exists())return show("Username not found.","error");const u=await getDoc(doc(db,"users",snap.data().uid));if(!u.exists())return show("Account profile not found.","error");email=u.data().email;}
await signInWithEmailAndPassword(auth,email,document.getElementById("password").value);
}
window.location.href="chat.html";
}catch(e){show(err(e),"error")}});
document.getElementById("forgotPassword")?.addEventListener("click",async()=>{const id=document.getElementById("loginId").value.trim();if(!id.includes("@"))return show("Enter your email to reset your password.","error");try{await sendPasswordResetEmail(auth,id);show("Password reset email sent.","success")}catch(e){show(err(e),"error")}});