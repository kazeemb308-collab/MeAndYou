import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

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

function json(res,status,body){
  res.status(status).json(body);
}

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

    const tokensSnap=await db.collection("users").doc(receiverId).collection("notificationTokens").get();
    const tokens=tokensSnap.docs.map(doc=>doc.data().token).filter(Boolean);

    if(!tokens.length)return json(res,200,{sent:0});

    const body=message.type==="voice"?"🎙️ New voice note":String(message.text||"New message").slice(0,180);
    const messaging=getMessaging(app);

    const chatUrl="/chat-room.html?uid="+encodeURIComponent(decoded.uid)+
      "&username="+encodeURIComponent(sender.username||"")+
      "&name="+encodeURIComponent(senderName);

    const messages=tokens.map(token=>({
      token,
      notification:{
        title:senderName,
        body
      },
      data:{
        messageId:String(messageSnap.id),
        senderId:String(decoded.uid),
        receiverId:String(receiverId),
        url:chatUrl,
        tag:"meandyou-"+messageSnap.id
      },
      webpush:{
        fcmOptions:{
          link:new URL(chatUrl,"https://meandyou.vercel.app").href
        },
        notification:{
          title:senderName,
          body,
          icon:"https://meandyou.vercel.app/favicon.png",
          badge:"https://meandyou.vercel.app/favicon.png",
          tag:"meandyou-"+messageSnap.id
        },
        headers:{
          TTL:"86400"
        }
      }
    }));

    const result=await messaging.sendEach(messages);

    const invalid=[];
    result.responses.forEach((response,index)=>{
      const code=response.error?.code||"";
      if(code.includes("registration-token-not-registered")||code.includes("invalid-registration-token")){
        invalid.push(tokens[index]);
      }
    });

    for(const token of invalid){
      const docs=tokensSnap.docs.filter(d=>d.data().token===token);
      for(const d of docs)await d.ref.delete();
    }

    return json(res,200,{
      sent:result.successCount,
      failed:result.failureCount
    });
  }catch(error){
    console.error("FCM notification error:",error);
    return json(res,500,{error:"Notification service failed."});
  }
}
