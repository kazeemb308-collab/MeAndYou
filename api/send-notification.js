import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";

let adminApp;

function getAdminApp(){
  if(adminApp)return adminApp;
  const privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n");
  if(!process.env.FIREBASE_CLIENT_EMAIL||!privateKey){
    throw new Error("Firebase Admin environment variables are not configured.");
  }
  adminApp=getApps()[0]||initializeApp({
    credential:cert({
      projectId:"m3ss3nger-50a21",
      clientEmail:process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    })
  });
  return adminApp;
}

function json(res,status,body){res.status(status).json(body)}

export default async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});

  try{
    const {idToken,messageId}=req.body||{};
    if(!idToken||!messageId)return json(res,400,{error:"Missing notification data."});

    const app=getAdminApp();
    const decoded=await getAuth(app).verifyIdToken(idToken);
    const db=getFirestore(app);
    const messageSnap=await db.collection("messages").doc(String(messageId)).get();

    if(!messageSnap.exists)return json(res,404,{error:"Message not found."});
    const message=messageSnap.data();
    if(message.senderId!==decoded.uid)return json(res,403,{error:"Not allowed."});

    const receiverId=message.receiverId;
    if(!receiverId||receiverId===decoded.uid)return json(res,400,{error:"Invalid recipient."});

    const senderSnap=await db.collection("users").doc(decoded.uid).get();
    const sender=senderSnap.exists?senderSnap.data():{};
    const senderName=sender.name||decoded.name||"New message";

    const subscriptionsSnap=await db.collection("users").doc(receiverId).collection("pushSubscriptions").get();
    const subscriptions=subscriptionsSnap.docs
      .map(d=>({doc:d,subscription:d.data().subscription}))
      .filter(x=>x.subscription?.endpoint&&x.subscription?.keys);

    if(!subscriptions.length)return json(res,200,{sent:0,failed:0});

    if(!process.env.VAPID_PRIVATE_KEY){
      return json(res,500,{error:"VAPID_PRIVATE_KEY is not configured."});
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT||"mailto:admin@meandyou.app",
      "BJv9WNXXxTchu-645ZD8Ung8YaUiTOGp2260AaPfzqMxuBdufSXVbzBS-BdY6ams-th2GAAcAG0PzF0D3k6pHtg",
      process.env.VAPID_PRIVATE_KEY
    );

    const body=message.type==="voice"?"🎙️ New voice note":String(message.text||"New message").slice(0,180);
    const chatUrl="https://meandyou.vercel.app/chat-room.html?uid="+encodeURIComponent(decoded.uid)+
      "&username="+encodeURIComponent(sender.username||"")+
      "&name="+encodeURIComponent(senderName);

    let sent=0,failed=0;
    for(const item of subscriptions){
      try{
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({
            web_push:8030,
            notification:{
              title:senderName,
              body,
              navigate:chatUrl,
              messageId:String(messageId),
              tag:"meandyou-"+String(messageId),
              silent:false
            }
          }),
          {
            TTL:86400,
            urgency:"high",
            topic:"m"+String(messageId).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,31)
          }
        );
        sent++;
      }catch(error){
        failed++;
        const status=error.statusCode||0;
        if(status===404||status===410)await item.doc.ref.delete();
        console.error("Web Push delivery error:",status,error.body||error.message);
      }
    }

    return json(res,200,{sent,failed});
  }catch(error){
    console.error("Web Push notification error:",error);
    return json(res,500,{error:"Notification service failed."});
  }
}
