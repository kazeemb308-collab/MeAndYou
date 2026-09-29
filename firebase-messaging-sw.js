importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:"AIzaSyBzuctjdTAHT3kxdrIZz9aGe5mGLsiGwx4",
  authDomain:"m3ss3nger-50a21.firebaseapp.com",
  projectId:"m3ss3nger-50a21",
  storageBucket:"m3ss3nger-50a21.firebasestorage.app",
  messagingSenderId:"245814154474",
  appId:"1:245814154474:web:4592f3a7e272154396f393"
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload=>{
  const data=payload.data||{};
  const notification=payload.notification||{};
  const title=data.title||notification.title||"MeAndYou";
  const body=data.body||notification.body||"New message";
  const url=data.url||"chat.html";

  self.registration.showNotification(title,{
    body,
    icon:"/favicon.png",
    badge:"/favicon.png",
    tag:data.tag||"meandyou-message",
    data:{url}
  });
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"chat.html";
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(clientList=>{
      for(const client of clientList){
        if("focus" in client){
          client.navigate(url);
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
