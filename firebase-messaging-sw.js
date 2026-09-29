self.addEventListener("install",event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate",event=>{
  event.waitUntil(self.clients.claim());
});

// iOS 18.4+ Home Screen apps can display the declarative Web Push payload
// without requiring service-worker JavaScript to run first.
// Keep this worker focused on notification clicks so the declarative
// notification remains the system-managed background fallback.

self.addEventListener("notificationclick",event=>{
  event.notification.close();

  const url=event.notification.data?.url||event.notification.navigate||"/index.html";
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
