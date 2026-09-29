import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",
  authDomain:"m3ss3nger-50a21.firebaseapp.com",
  projectId:"m3ss3nger-50a21",
  storageBucket:"m3ss3nger-50a21.firebasestorage.app",
  messagingSenderId:"245814154474",
  appId:"1:245814154474:web:4592f3a7e272154396f393"
};

export const VAPID_PUBLIC_KEY="BJv9WNXXxTchu-645ZD8Ung8YaUiTOGp2260AaPfzqMxuBdufSXVbzBS-BdY6ams-th2GAAcAG0PzF0D3k6pHtg";

const app=initializeApp(firebaseConfig,"notifications");
const auth=getAuth(app);
const db=getFirestore(app);

let messagingPromise=null;

async function getMessagingInstance(){
  if(messagingPromise)return messagingPromise;
  messagingPromise=isSupported().then(ok=>ok?getMessaging(app):null);
  return messagingPromise;
}

export async function enableNotifications(){
  if(!("Notification" in window))throw new Error("Notifications are not supported here.");
  const permission=await Notification.requestPermission();
  if(permission!=="granted")return {permission,token:null};

  if(!("serviceWorker" in navigator))throw new Error("Service workers are not supported here.");

  const messaging=await getMessagingInstance();
  if(!messaging)throw new Error("Push notifications are not supported by this browser.");

  const registration=await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/"});
  await navigator.serviceWorker.ready;

  const token=await getToken(messaging,{
    vapidKey:VAPID_PUBLIC_KEY,
    serviceWorkerRegistration:registration
  });

  if(!token)throw new Error("Firebase did not return a notification token.");

  const user=auth.currentUser;
  if(!user)throw new Error("You must be signed in.");

  await setDoc(
    doc(db,"users",user.uid,"notificationTokens",encodeTokenId(token)),
    {token,platform:"web",updatedAt:serverTimestamp()},
    {merge:true}
  );

  return {permission,token};
}

export async function removeCurrentNotificationToken(){
  const user=auth.currentUser;
  if(!user)return;
  const messaging=await getMessagingInstance();
  if(!messaging)return;
  const registration=await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
  if(!registration)return;
  try{
    const token=await getToken(messaging,{vapidKey:VAPID_PUBLIC_KEY,serviceWorkerRegistration:registration});
    if(token)await deleteDoc(doc(db,"users",user.uid,"notificationTokens",encodeTokenId(token)));
  }catch(error){
    console.error("Notification token removal error:",error);
  }
}

export async function listenForForegroundMessages(callback){
  const messaging=await getMessagingInstance();
  if(!messaging)return ()=>{};
  return onMessage(messaging,payload=>callback(payload));
}

function encodeTokenId(token){
  return btoa(token).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
