import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getDatabase, ref as rtdbRef, onValue, onDisconnect, set as rtdbSet, serverTimestamp as rtdbServerTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, getDoc, getDocs, updateDoc, setDoc, writeBatch, doc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",authDomain:"m3ss3nger-50a21.firebaseapp.com",projectId:"m3ss3nger-50a21",storageBucket:"m3ss3nger-50a21.firebasestorage.app",messagingSenderId:"245814154474",appId:"1:245814154474:web:4592f3a7e272154396f393"};
const app=initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const realtimeDb=getDatabase(app,"https://m3ss3nger-50a21-default-rtdb.firebaseio.com");
const params=new URLSearchParams(location.search);
const otherUid=params.get("uid"),otherUsername=params.get("username")||"username",otherName=params.get("name")||"User";
const roomName=document.getElementById("roomName"),roomUsername=document.getElementById("roomUsername"),roomAvatar=document.getElementById("roomAvatar"),messages=document.getElementById("messages"),emptyRoom=document.getElementById("emptyRoom"),form=document.getElementById("messageForm"),input=document.getElementById("messageInput"),voiceButton=document.getElementById("voiceButton"),sendButton=document.getElementById("sendButton"),recordingBar=document.getElementById("recordingBar"),recordingTime=document.getElementById("recordingTime"),recordingHint=document.getElementById("recordingHint"),cancelRecord=document.getElementById("cancelRecord"),lockRecord=document.getElementById("lockRecord"),voicePreview=document.getElementById("voicePreview"),discardVoice=document.getElementById("discardVoice"),playVoice=document.getElementById("playVoice"),sendVoice=document.getElementById("sendVoice"),previewDuration=document.getElementById("previewDuration"),previewWave=document.getElementById("previewWave"),playVoiceIcon=document.getElementById("playVoiceIcon");
roomName.textContent=otherName;roomUsername.textContent="@"+otherUsername;roomAvatar.textContent=otherName.charAt(0).toUpperCase();
document.getElementById("backButton").addEventListener("click",()=>location.href="chat.html");
if(!otherUid){form.style.display="none";throw new Error("Missing recipient uid");}

let currentUser=null,unsubscribe=null,presenceUnsubscribe=null,presenceHeartbeat=null,recorder=null,microphoneStream=null,recordedChunks=[],recordingStarted=0,recordingTimer=null,isLocked=false,audioBlob=null,audioUrl=null,audio=new Audio(),recordingMime="",recordingStarting=false,abortRecording=false,pointerHeld=false;
const renderedMessages=new Map();
const makeConversationId=(a,b)=>[a,b].sort().join("_");

async function startPresence(){
 if(!currentUser)return;
 try{
  const presenceRef=rtdbRef(realtimeDb,"presence/"+currentUser.uid);
  await onDisconnect(presenceRef).set({
   online:false,
   lastSeen:rtdbServerTimestamp()
  });
  await rtdbSet(presenceRef,{
   online:true,
   lastSeen:rtdbServerTimestamp()
  });
 }catch(error){
  console.warn("Realtime presence failed:",error);
 }
}

function stopPresence(){
 if(!currentUser)return;
 rtdbSet(rtdbRef(realtimeDb,"presence/"+currentUser.uid),{
  online:false,
  lastSeen:rtdbServerTimestamp()
 }).catch(()=>{});
}

function listenForOtherPresence(){
 if(presenceUnsubscribe)presenceUnsubscribe();
 roomUsername.textContent="checking status…";
 presenceUnsubscribe=onValue(rtdbRef(realtimeDb,"presence/"+otherUid),snap=>{
  const data=snap.val()||{};
  roomUsername.textContent=data.online===true?"online":formatLastSeenValue(data.lastSeen);
 },error=>{
  console.warn("Realtime presence listener failed:",error);
  roomUsername.textContent="@"+otherUsername;
 });
}

function formatLastSeenValue(value){
 if(typeof value!=="number")return "last seen recently";
 const diff=Math.max(0,Date.now()-value);
 const minutes=Math.floor(diff/60000);
 if(minutes<1)return "last seen just now";
 if(minutes<60)return `last seen ${minutes} min ago`;
 const hours=Math.floor(minutes/60);
 if(hours<24)return `last seen ${hours} hr ago`;
 const days=Math.floor(hours/24);
 if(days===1)return "last seen yesterday";
 return `last seen ${days} days ago`;
}


async function markMessagesRead(){
 try{
  if(!currentUser||!otherUid)return;
  const snap=await getDocs(query(
   collection(db,"messages"),
   where("conversationId","==",makeConversationId(currentUser.uid,otherUid)),
   where("receiverId","==",currentUser.uid),
   where("senderId","==",otherUid)
  ));
  if(snap.empty)return;
  const batch=writeBatch(db);
  snap.docs.forEach(item=>{
   if(item.data().readAt!==true)batch.update(item.ref,{readAt:true});
  });
  await batch.commit();
 }catch(error){
  console.error("Could not mark messages as read:",error);
 }
}

async function sendPushNotification(messageId){
 try{
  const idToken=await currentUser.getIdToken();
  const response=await fetch("/api/send-notification",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({idToken,messageId})
  });
  const body=await response.text();
  if(!response.ok)console.error("Push notification request failed:",response.status,body);
  else console.log("Push notification result:",body);
 }catch(error){
  console.error("Push notification request error:",error);
 }
}
const formatTime=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
const escIconPlay='<path d="m8 5 11 7-11 7V5Z"/>';
const escIconPause='<path d="M8 5v14M16 5v14"/>';

function setComposer(){const hasText=input.value.trim().length>0;sendButton.hidden=!hasText;voiceButton.hidden=hasText}
input.addEventListener("input",setComposer);setComposer();

onAuthStateChanged(auth,async user=>{
 if(!user){location.href="login.html";return}
 currentUser=user;
 try{
  const profile=await getDoc(doc(db,"users",user.uid));
  if(!profile.exists()){location.href="login.html";return}
  startPresence();
  listenForOtherPresence();
  listenForMessages();
 }catch(e){console.error(e);showMessageError()}
});

async function listenForMessages(){
 await markMessagesRead();
 const q=query(collection(db,"messages"),where("conversationId","==",makeConversationId(currentUser.uid,otherUid)));
 unsubscribe=onSnapshot(q,snapshot=>{
  if(snapshot.empty){emptyRoom.style.display="block";return}
  emptyRoom.style.display="none";
  snapshot.docChanges().forEach(change=>{
   if(change.type==="removed"){renderedMessages.get(change.doc.id)?.remove();renderedMessages.delete(change.doc.id);return}
   const data={id:change.doc.id,...change.doc.data()};
   const old=renderedMessages.get(data.id);
   old?updateMessageOnScreen(old,data):addMessageToScreen(data)
  });
  sortRenderedMessages();
  if(snapshot.docChanges().some(c=>c.type==="added"||c.type==="modified"))scrollToBottom()
 },showMessageError)
}

function showMessageError(){
 emptyRoom.style.display="block";
 emptyRoom.querySelector("h2").textContent="Messages unavailable";
 emptyRoom.querySelector("p").textContent="Please check your Firestore messages read rule."
}

function makeAudioPlayer(src){
 const player=document.createElement("audio");
 player.controls=true;
 player.preload="auto";
 player.className="voice-message";
 player.src=src||"";
 // Start loading immediately so the first tap can play the note.
 player.load();
 player.addEventListener("error",()=>console.error("Voice playback error:",player.error));
 return player
}

function addMessageToScreen(data){
 const row=document.createElement("div");
 row.className="message-row "+(data.senderId===currentUser.uid?"sent":"received");
 row.dataset.messageTime=data.createdAt?.toMillis?data.createdAt.toMillis():Date.now();
 const bubble=document.createElement("div");
 bubble.className="message-bubble";
 if(data.type==="voice"){
  const player=makeAudioPlayer(data.audioData);
  bubble.appendChild(player)
 }else{
  bubble.append(document.createTextNode(data.text||""))
 }
 const time=document.createElement("span");
 time.className="message-time";
 time.textContent=data.createdAt?.toDate?data.createdAt.toDate().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Sending…";
 bubble.appendChild(time);
 row.appendChild(bubble);
 messages.appendChild(row);
 renderedMessages.set(data.id,row)
}

function updateMessageOnScreen(row,data){
 const bubble=row.querySelector(".message-bubble");
 if(!bubble)return;
 if(data.type==="voice"&&!bubble.querySelector("audio")){
  bubble.textContent="";
  bubble.appendChild(makeAudioPlayer(data.audioData))
 }
 const time=bubble.querySelector(".message-time");
 if(time&&data.createdAt?.toDate)time.textContent=data.createdAt.toDate().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})
}

function sortRenderedMessages(){
 [...renderedMessages.values()].sort((a,b)=>(Number(a.dataset.messageTime)||0)-(Number(b.dataset.messageTime)||0)).forEach(r=>messages.appendChild(r))
}
function scrollToBottom(){requestAnimationFrame(()=>messages.scrollTop=messages.scrollHeight)}

form.addEventListener("submit",async e=>{
 e.preventDefault();
 const text=input.value.trim();
 if(!text||!currentUser)return;
 sendButton.disabled=true;
 try{
  const messageRef=await addDoc(collection(db,"messages"),{conversationId:makeConversationId(currentUser.uid,otherUid),senderId:currentUser.uid,receiverId:otherUid,text,type:"text",readAt:false,createdAt:serverTimestamp()});
  await sendPushNotification(messageRef.id);
  input.value="";setComposer();input.focus()
 }catch(e){console.error(e);alert("Message could not be sent. Check your Firestore rules.")}
 finally{sendButton.disabled=false}
});

function supportedMime(){
 return ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(x=>MediaRecorder.isTypeSupported(x))||""
}

async function startRecording(){
 if(recorder||audioBlob||recordingStarting)return;
 recordingStarting=true;
 abortRecording=false;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){alert("Voice recording is not supported by this browser.");return}
 try{
  if(!microphoneStream){
   microphoneStream=await navigator.mediaDevices.getUserMedia({audio:true});
  }
  if(!pointerHeld){ recordingStarting=false; return; }
  const stream=microphoneStream;
  recordingMime=supportedMime();
  recorder=new MediaRecorder(stream,recordingMime?{mimeType:recordingMime}:undefined);
  recordingStarting=false;
  recordedChunks=[];
  isLocked=false;
  recordingStarted=Date.now();
  recordingBar.hidden=false;
  voicePreview.hidden=true;
  recordingHint.textContent="Slide up to lock";
  recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data)};
  recorder.onstop=async()=>{
   clearInterval(recordingTimer);
   recorder=null;
   if(abortRecording){
    recordedChunks=[];
    audioBlob=null;
    recordingBar.hidden=true;
    voicePreview.hidden=true;
    abortRecording=false;
    isLocked=false;
    return
   }
   if(!recordedChunks.length){resetRecording();return}
   audioBlob=new Blob(recordedChunks,{type:recordingMime||"audio/webm"});
   audioUrl=URL.createObjectURL(audioBlob);
   previewDuration.textContent=formatTime((Date.now()-recordingStarted)/1000);
   buildWave();
   recordingBar.hidden=true;
   voicePreview.hidden=false;
   if(!isLocked){
    await sendRecordedVoice();
   }
  };
  recorder.start(200);
  recordingTimer=setInterval(()=>recordingTime.textContent=formatTime((Date.now()-recordingStarted)/1000),250)
 }catch(e){console.error(e);alert("Microphone access was denied or unavailable.")}
}

function stopRecording(){
 if(!recorder||recorder.state==="inactive")return;
 recorder.requestData?.();
 recorder.stop();
}

function resetRecording(){
 abortRecording=true;
 if(recorder&&recorder.state!=="inactive"){
  recorder.stop();
  return;
 }
 recorder=null;
 recordedChunks=[];
 clearInterval(recordingTimer);
 recordingBar.hidden=true;
 voicePreview.hidden=true;
 lockRecord.style.display="grid";
 if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null}
 audioBlob=null;
 isLocked=false;
 recordingTime.textContent="0:00";
 recordingHint.textContent="Slide up to lock";
 playVoiceIcon.innerHTML=escIconPlay
}

function buildWave(){
 previewWave.textContent="";
 for(let i=0;i<38;i++){
  const bar=document.createElement("i");
  bar.style.height=(8+Math.round(Math.random()*22))+"px";
  previewWave.appendChild(bar)
 }
}

function blobToDataUrl(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=reject;
  reader.readAsDataURL(blob)
 })
}

async function sendRecordedVoice(){
 if(!audioBlob||!currentUser||abortRecording)return;
 sendVoice.disabled=true;
 try{
  // Firestore documents are limited to about 1 MiB, so keep voice notes short.
  if(audioBlob.size>700000){
   alert("This voice note is too long to send. Please record a shorter one.");
   return
  }
  const audioData=await blobToDataUrl(audioBlob);
  const messageRef=await addDoc(collection(db,"messages"),{
   conversationId:makeConversationId(currentUser.uid,otherUid),
   senderId:currentUser.uid,
   receiverId:otherUid,
   type:"voice",
   readAt:false,
   audioData,
   duration:Math.round((Date.now()-recordingStarted)/1000),
   createdAt:serverTimestamp()
  });
  await sendPushNotification(messageRef.id);
  resetRecording()
 }catch(e){
  console.error(e);
  alert("Voice note could not be sent. Check your Firestore messages rules or record a shorter note.")
 }finally{
  sendVoice.disabled=false
 }
}

let activePointerId=null;
let pointerStartY=0;
let lockedHandsFree=false;

voiceButton.addEventListener("pointerdown",async e=>{
 e.preventDefault();
 pointerHeld=true;
 activePointerId=e.pointerId;
 pointerStartY=e.clientY;
 lockedHandsFree=false;
 voiceButton.setPointerCapture?.(e.pointerId);
 await startRecording()
});

voiceButton.addEventListener("pointermove",e=>{
 if(e.pointerId!==activePointerId||!recorder||isLocked)return;
 const movedUp=pointerStartY-e.clientY;
 if(movedUp>=55){
  isLocked=true;
  lockedHandsFree=true;
  recordingHint.textContent="Recording hands-free";
  lockRecord.style.display="grid";
 }
});

voiceButton.addEventListener("pointerup",e=>{
 if(e.pointerId!==activePointerId)return;
 e.preventDefault();
 activePointerId=null;
 pointerHeld=false;
 if(!isLocked){
  if(recorder)stopRecording();
  else if(recordingStarting)abortRecording=true;
 }
});

voiceButton.addEventListener("pointercancel",e=>{
 if(e.pointerId!==activePointerId)return;
 activePointerId=null;
 pointerHeld=false;
 if(!isLocked){
  if(recorder)stopRecording();
  else if(recordingStarting)abortRecording=true;
 }
});

lockRecord.addEventListener("click",()=>{
 if(!recorder)return;
 isLocked=true;
 lockedHandsFree=true;
 recordingHint.textContent="Finishing recording…";
 lockRecord.style.display="none";
 stopRecording()
});
cancelRecord.addEventListener("click",resetRecording);
discardVoice.addEventListener("click",resetRecording);
playVoice.addEventListener("click",()=>{
 if(!audioUrl)return;
 if(audio.paused){
  audio.src=audioUrl;
  audio.play();
  playVoiceIcon.innerHTML=escIconPause
 }else{
  audio.pause();
  playVoiceIcon.innerHTML=escIconPlay
 }
});
audio.addEventListener("ended",()=>playVoiceIcon.innerHTML=escIconPlay);
sendVoice.addEventListener("click",sendRecordedVoice);
window.addEventListener("beforeunload",()=>{
 unsubscribe?.();
 presenceUnsubscribe?.();
 clearInterval(presenceHeartbeat);
 stopPresence();
 document.removeEventListener("visibilitychange",handleVisibility);
 window.removeEventListener("pagehide",handlePageHide);
 microphoneStream?.getTracks().forEach(t=>t.stop());
 microphoneStream=null;
});
