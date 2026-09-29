import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
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
let currentUser=null;
let searchTimer=null;

onAuthStateChanged(auth,async user=>{
  if(!user){
    window.location.href="login.html";
    return;
  }

  currentUser=user;

  try{
    const profile=await getDoc(doc(db,"users",user.uid));
    if(profile.exists()){
      const data=profile.data();
      nameEl.textContent=data.name || user.displayName || "Welcome";
    }else{
      nameEl.textContent=user.displayName || "Welcome";
    }
  }catch(e){
    console.error(e);
    nameEl.textContent=user.displayName || "Welcome";
  }
});

searchInput?.addEventListener("input",()=>{
  clearTimeout(searchTimer);

  const value=searchInput.value.trim().replace(/^@/,"").toLowerCase();

  if(!value){
    results.innerHTML="";
    return;
  }

  results.innerHTML=`
    <div class="search-user">
      <div class="avatar">…</div>
      <div class="user-info">
        <strong>Searching…</strong>
        <span>@${escapeHtml(value)}</span>
      </div>
    </div>
  `;

  searchTimer=setTimeout(()=>searchUser(value),350);
});

async function searchUser(username){
  try{
    const usernameDoc=await getDoc(doc(db,"usernames",username));

    if(!usernameDoc.exists()){
      results.innerHTML=`
        <div class="search-user">
          <div class="avatar">?</div>
          <div class="user-info">
            <strong>User not found</strong>
            <span>@${escapeHtml(username)} doesn't exist.</span>
          </div>
        </div>
      `;
      return;
    }

    const uid=usernameDoc.data().uid;

    if(currentUser && uid===currentUser.uid){
      results.innerHTML=`
        <div class="search-user">
          <div class="avatar">M</div>
          <div class="user-info">
            <strong>You</strong>
            <span>@${escapeHtml(username)}</span>
          </div>
        </div>
      `;
      return;
    }

    const profileDoc=await getDoc(doc(db,"users",uid));

    if(!profileDoc.exists()){
      results.innerHTML=`
        <div class="search-user">
          <div class="avatar">?</div>
          <div class="user-info">
            <strong>Profile unavailable</strong>
            <span>@${escapeHtml(username)}</span>
          </div>
        </div>
      `;
      return;
    }

    const user=profileDoc.data();
    const initial=(user.name || username).charAt(0).toUpperCase();

    results.innerHTML=`
      <div class="search-user">
        <div class="avatar">${escapeHtml(initial)}</div>
        <div class="user-info">
          <strong>${escapeHtml(user.name || "Unnamed user")}</strong>
          <span>@${escapeHtml(user.username || username)}</span>
        </div>
        <button class="start-chat" type="button" data-uid="${escapeHtml(uid)}">Chat</button>
      </div>
    `;

    results.querySelector(".start-chat")?.addEventListener("click",()=>{
      const params=new URLSearchParams({
        uid,
        username:user.username || username,
        name:user.name || "Unnamed user"
      });
      window.location.href=`chat-room.html?${params.toString()}`;
    });

  }catch(e){
    console.error("User search error:",e);
    results.innerHTML=`
      <div class="search-user">
        <div class="avatar">!</div>
        <div class="user-info">
          <strong>Couldn't search right now</strong>
          <span>Check your connection and try again.</span>
        </div>
      </div>
    `;
  }
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({
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
