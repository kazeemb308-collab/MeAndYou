import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",
  authDomain:"m3ss3nger-50a21.firebaseapp.com",
  projectId:"m3ss3nger-50a21",
  storageBucket:"m3ss3nger-50a21.firebasestorage.app",
  messagingSenderId:"245814154474",
  appId:"1:245814154474:web:4592f3a7e272154396f393"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const nameEl=document.getElementById("currentUserName");
const searchInput=document.getElementById("searchInput");
const results=document.getElementById("searchResults");

onAuthStateChanged(auth,async user=>{
  if(!user){
    window.location.href="login.html";
    return;
  }

  const profile=await getDoc(doc(db,"users",user.uid));
  if(profile.exists()){
    const data=profile.data();
    nameEl.textContent=data.name || user.displayName || "Welcome";
  }else{
    nameEl.textContent=user.displayName || "Welcome";
  }
});

searchInput?.addEventListener("input",()=>{
  const value=searchInput.value.trim().replace(/^@/,"").toLowerCase();

  if(!value){
    results.innerHTML="";
    return;
  }

  results.innerHTML=`
    <div class="search-user">
      <div class="avatar">@</div>
      <div class="user-info">
        <strong>Search by @${escapeHtml(value)}</strong>
        <span>User search will be connected next.</span>
      </div>
    </div>
  `;
});

function escapeHtml(value){
  return value.replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[char]));
}

document.getElementById("newChatButton")?.addEventListener("click",()=>{
  searchInput?.focus();
  window.scrollTo({top:0,behavior:"smooth"});
});

document.getElementById("profileButton")?.addEventListener("click",()=>{
  alert("Profile settings will be added next.");
});

document.getElementById("profileNavButton")?.addEventListener("click",()=>{
  alert("Profile settings will be added next.");
});
