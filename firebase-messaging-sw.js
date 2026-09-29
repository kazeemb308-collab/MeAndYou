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

firebase.messaging();

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const data=event.notification.data||{};
  const url=data.url||event.notification?.data?.FCM_MSG?.data?.url||"/chat.html";
  const targetUrl=new URL(url,self.location.origin).href;

  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(clientList=>{
      for(const client of clientList){
        if("focus" in client){
          if("navigate" in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      if(clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
