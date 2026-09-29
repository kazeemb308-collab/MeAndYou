import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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
const conversationList=document.getElementById("conversationList");

let currentUser=null;
let searchTimer=null;
let unsubscribeSent=null;
let unsubscribeReceived=null;
let messageMap=new Map();
let notificationReady=false;
const notifiedMessageIds=new Set();

function notifyIncomingMessage(message){
  if(!notificationReady||!("Notification" in window)||Notification.permission!=="granted")return;
  if(message.senderId===currentUser.uid||notifiedMessageIds.has(message.id))return;
  notifiedMessageIds.add(message.id);
  const body=message.type==="voice"?"🎙️ New voice note":(message.text||"New message");
  try{
    new Notification("New message",{
      body,
      icon:"/favicon.png",
      tag:"meandyou-"+message.id
    });
  }catch(error){
    console.error("Notification error:",error);
  }
}

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

  listenForConversations();
  notificationReady=true;
});

function listenForConversations(){
  const sentQuery=query(
    collection(db,"messages"),
    where("senderId","==",currentUser.uid)
  );

  const receivedQuery=query(
    collection(db,"messages"),
    where("receiverId","==",currentUser.uid)
  );

  const handleSnapshot=snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type==="added" && !change.doc.metadata.hasPendingWrites){
        notifyIncomingMessage({id:change.doc.id,...change.doc.data()});
      }
      if(change.type==="removed"){
        messageMap.delete(change.doc.id);
      }else{
        messageMap.set(change.doc.id,{
          id:change.doc.id,
          ...change.doc.data()
        });
      }
    });

    renderConversations();
  };

  unsubscribeSent=onSnapshot(sentQuery,handleSnapshot,error=>{
    console.error("Sent messages listener:",error);
  });

  unsubscribeReceived=onSnapshot(receivedQuery,handleSnapshot,error=>{
    console.error("Received messages listener:",error);
  });
}

async function renderConversations(){
  if(!currentUser) return;

  const latestByUser=new Map();

  for(const message of messageMap.values()){
    const otherUid=message.senderId===currentUser.uid
      ? message.receiverId
      : message.senderId;

    if(!otherUid || otherUid===currentUser.uid) continue;

    const old=latestByUser.get(otherUid);
    const messageTime=message.createdAt?.toMillis ? message.createdAt.toMillis() : 0;
    const oldTime=old?.createdAt?.toMillis ? old.createdAt.toMillis() : 0;

    if(!old || messageTime>=oldTime){
      latestByUser.set(otherUid,message);
    }
  }

  if(latestByUser.size===0){
    conversationList.innerHTML=`
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <h2>No conversations yet</h2>
        <p>Search for a username above to start a new chat.</p>
      </div>
    `;
    return;
  }

  conversationList.innerHTML=`
    <div class="conversation-loading">Loading conversations…</div>
  `;

  const conversations=[];

  for(const [uid,message] of latestByUser){
    try{
      const profileDoc=await getDoc(doc(db,"users",uid));
      if(profileDoc.exists()){
        conversations.push({
          uid,
          profile:profileDoc.data(),
          message
        });
      }
    }catch(error){
      console.error("Profile load error:",error);
    }
  }

  conversations.sort((a,b)=>{
    const aTime=a.message.createdAt?.toMillis ? a.message.createdAt.toMillis() : 0;
    const bTime=b.message.createdAt?.toMillis ? b.message.createdAt.toMillis() : 0;
    return bTime-aTime;
  });

  conversationList.innerHTML=conversations.map(item=>{
    const profile=item.profile;
    const message=item.message;
    const name=profile.name || "Unnamed user";
    const username=profile.username || "";
    const initial=name.charAt(0).toUpperCase();
    const text=message.text || "";
    const prefix=message.senderId===currentUser.uid ? "You: " : "";
    const time=formatConversationTime(message.createdAt);

    return `
      <button class="conversation-item" type="button"
        data-uid="${escapeHtml(item.uid)}"
        data-username="${escapeHtml(username)}"
        data-name="${escapeHtml(name)}">
        <div class="conversation-avatar">${escapeHtml(initial)}</div>
        <div class="conversation-info">
          <div class="conversation-top">
            <strong>${escapeHtml(name)}</strong>
            <time>${escapeHtml(time)}</time>
          </div>
          <div class="conversation-bottom">
            <span>@${escapeHtml(username)}</span>
            <p>${escapeHtml(prefix+text)}</p>
          </div>
        </div>
      </button>
    `;
  }).join("");

  conversationList.querySelectorAll(".conversation-item").forEach(button=>{
    button.addEventListener("click",()=>{
      const params=new URLSearchParams({
        uid:button.dataset.uid,
        username:button.dataset.username,
        name:button.dataset.name
      });
      window.location.href=`chat-room.html?${params.toString()}`;
    });
  });
}

function formatConversationTime(timestamp){
  if(!timestamp?.toDate) return "";
  const date=timestamp.toDate();
  const now=new Date();

  if(date.toDateString()===now.toDateString()){
    return date.toLocaleTimeString([],{
      hour:"numeric",
      minute:"2-digit"
    });
  }

  return date.toLocaleDateString([],{
    day:"numeric",
    month:"short"
  });
}

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
  window.location.href="profile.html";
});

document.getElementById("profileNavButton")?.addEventListener("click",()=>{
  window.location.href="profile.html";
});

document.getElementById("chatsNavButton")?.addEventListener("click",()=>{
  window.location.href="chat.html";
});

window.addEventListener("beforeunload",()=>{
  unsubscribeSent?.();
  unsubscribeReceived?.();
});


if(location.hash==="#new-chat"){
  requestAnimationFrame(()=>searchInput?.focus());
}
