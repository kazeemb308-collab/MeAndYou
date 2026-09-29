self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||"New message"}}

  const notification=data.notification||data;
  const title=notification.title||"MeAndYou";
  const body=notification.body||"New message";
  const url=notification.navigate||data.url||"/chat.html";
  const badge=notification.app_badge;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title,{
        body,
        icon:"/favicon.png",
        badge:"/favicon.png",
        tag:notification.tag||data.tag||"meandyou-message",
        data:{url}
      }),
      badge!==undefined && "setAppBadge" in self.navigator
        ? self.navigator.setAppBadge(Number(badge)||1)
        : Promise.resolve()
    ])
  );
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"/chat.html";
  const targetUrl=new URL(url,self.location.origin).href;
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(clientList=>{
      for(const client of clientList){
        if("focus" in client){
          if("navigate" in client)client.navigate(targetUrl);
          return client.focus();
        }
      }
      if(clients.openWindow)return clients.openWindow(targetUrl);
    })
  );
});
