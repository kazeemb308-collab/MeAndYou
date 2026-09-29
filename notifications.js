import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",
  authDomain:"m3ss3nger-50a21.firebaseapp.com",
  projectId:"m3ss3nger-50a21",
  storageBucket:"m3ss3nger-50a21.firebasestorage.app",
  messagingSenderId:"245814154474",
  appId:"1:245814154474:web:4592f3a7e272154396f393"
};

export const VAPID_PUBLIC_KEY="BJv9WNXXxTchu-645ZD8Ung8YaUiTOGp2260AaPfzqMxuBdufSXVbzBS-BdY6ams-th2GAAcAG0PzF0D3k6pHtg";

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

function keyId(subscription){
  return btoa(subscription.endpoint).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-(base64String.length%4))%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(char=>char.charCodeAt(0)));
}

async function getRegistration(){
  if(!("serviceWorker" in navigator))throw new Error("Service workers are not supported here.");
  const registration=await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/"});
  await registration.update().catch(()=>{});
  await navigator.serviceWorker.ready;
  return registration;
}

export async function enableNotifications(){
  if(!("Notification" in window)||!("PushManager" in window)){
    throw new Error("Push notifications are not supported here.");
  }

  if(auth.authStateReady)await auth.authStateReady();
  const user=auth.currentUser;
  if(!user)throw new Error("You must be signed in.");

  let permission=Notification.permission;
  if(permission!=="granted")permission=await Notification.requestPermission();
  if(permission!=="granted")return {permission,subscription:null};

  const registration=await getRegistration();
  let subscription=await registration.pushManager.getSubscription();

  if(!subscription){
    subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  const data=subscription.toJSON();
  await setDoc(
    doc(db,"users",user.uid,"pushSubscriptions",keyId(subscription)),
    {
      subscription:data,
      platform:"web",
      updatedAt:new Date().toISOString()
    },
    {merge:true}
  );

  return {permission,subscription};
}

export async function removeCurrentNotificationToken(){
  if(auth.authStateReady)await auth.authStateReady();
  const user=auth.currentUser;
  if(!user||!("serviceWorker" in navigator))return;

  const registration=await navigator.serviceWorker.getRegistration("/");
  const subscription=await registration?.pushManager.getSubscription();
  if(subscription){
    await deleteDoc(doc(db,"users",user.uid,"pushSubscriptions",keyId(subscription)));
    await subscription.unsubscribe().catch(()=>{});
  }
}

export async function listenForForegroundMessages(){
  return ()=>{};
}
