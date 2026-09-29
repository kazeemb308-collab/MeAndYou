import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

const params=new URLSearchParams(location.search);
const otherUid=params.get("uid");
const otherUsername=params.get("username") || "username";
const otherName=params.get("name") || "User";

const roomName=document.getElementById("roomName");
const roomUsername=document.getElementById("roomUsername");
const roomAvatar=document.getElementById("roomAvatar");
const messages=document.getElementById("messages");
const emptyRoom=document.getElementById("emptyRoom");
const form=document.getElementById("messageForm");
const input=document.getElementById("messageInput");

roomName.textContent=otherName;
roomUsername.textContent="@"+otherUsername;
roomAvatar.textContent=otherName.charAt(0).toUpperCase();

document.getElementById("backButton").addEventListener("click",()=>{
  history.length>1 ? history.back() : location.href="chat.html";
});

if(!otherUid){
  roomName.textContent="Invalid chat";
  roomUsername.textContent="";
  form.style.display="none";
  throw new Error("Missing recipient uid");
}

let currentUser=null;
let unsubscribe=null;

onAuthStateChanged(auth,async user=>{
  if(!user){
    location.href="login.html";
    return;
  }

  currentUser=user;

  try{
    const profile=await getDoc(doc(db,"users",user.uid));
    if(!profile.exists()){
      location.href="login.html";
      return;
    }

    listenForMessages();
  }catch(error){
    console.error("Profile error:",error);
    showMessageError();
  }
});

function makeConversationId(a,b){
  return [a,b].sort().join("_");
}

function listenForMessages(){
  const conversationId=makeConversationId(currentUser.uid,otherUid);

  // Only filter by conversationId here.
  // Sorting is done in JavaScript so the chat works without a composite Firestore index.
  const messagesQuery=query(
    collection(db,"messages"),
    where("conversationId","==",conversationId)
  );

  unsubscribe=onSnapshot(messagesQuery,snapshot=>{
    messages.querySelectorAll(".message-row").forEach(el=>el.remove());

    if(snapshot.empty){
      emptyRoom.style.display="block";
      emptyRoom.querySelector("h2").textContent="Start your conversation";
      emptyRoom.querySelector("p").textContent="Send a message to begin.";
      return;
    }

    emptyRoom.style.display="none";

    const messageList=snapshot.docs.map(messageDoc=>({
      id:messageDoc.id,
      ...messageDoc.data()
    }));

    messageList.sort((a,b)=>{
      const aTime=a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const bTime=b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return aTime-bTime;
    });

    messageList.forEach(data=>addMessageToScreen(data));
    scrollToBottom();
  },error=>{
    console.error("Message listener error:",error);
    showMessageError();
  });
}

function showMessageError(){
  emptyRoom.style.display="block";
  emptyRoom.querySelector("h2").textContent="Messages unavailable";
  emptyRoom.querySelector("p").textContent="Please check your Firestore messages read rule.";
}

function addMessageToScreen(data){
  const row=document.createElement("div");
  row.className="message-row "+(data.senderId===currentUser.uid?"sent":"received");

  const bubble=document.createElement("div");
  bubble.className="message-bubble";
  bubble.textContent=data.text || "";

  const time=document.createElement("span");
  time.className="message-time";

  if(data.createdAt?.toDate){
    time.textContent=data.createdAt.toDate().toLocaleTimeString([],{
      hour:"numeric",
      minute:"2-digit"
    });
  }else{
    time.textContent="Sending…";
  }

  bubble.appendChild(time);
  row.appendChild(bubble);
  messages.appendChild(row);
}

form.addEventListener("submit",async e=>{
  e.preventDefault();

  const text=input.value.trim();
  if(!text || !currentUser) return;

  input.disabled=true;

  try{
    const conversationId=makeConversationId(currentUser.uid,otherUid);

    await addDoc(collection(db,"messages"),{
      conversationId,
      senderId:currentUser.uid,
      receiverId:otherUid,
      text,
      createdAt:serverTimestamp()
    });

    input.value="";
    input.focus();
  }catch(e){
    console.error("Send message error:",e);
    alert("Message could not be sent. Check your Firestore rules.");
  }finally{
    input.disabled=false;
  }
});

function scrollToBottom(){
  requestAnimationFrame(()=>{
    messages.scrollTop=messages.scrollHeight;
  });
}

window.addEventListener("beforeunload",()=>{
  unsubscribe?.();
});
