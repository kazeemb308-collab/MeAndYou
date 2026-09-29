const outlet=document.body;
let navigating=false;

async function loadPage(url, push=true){
  if(navigating)return;
  navigating=true;
  try{
    const response=await fetch(url,{cache:"no-store"});
    if(!response.ok)throw new Error("Navigation failed");
    const html=await response.text();
    const parsed=new DOMParser().parseFromString(html,"text/html");
    document.title=parsed.title;
    document.body.className=parsed.body.className;
    document.body.innerHTML=parsed.body.innerHTML;
    if(push)history.pushState({}, "", url);
    parsed.querySelectorAll('script').forEach(oldScript=>{
      const script=document.createElement("script");
      [...oldScript.attributes].forEach(a=>script.setAttribute(a.name,a.value));
      if(oldScript.src)script.src=oldScript.src;
      else script.textContent=oldScript.textContent;
      document.body.appendChild(script);
    });
    window.scrollTo(0,0);
  }catch(error){
    console.error("Navigation error:",error);
    location.href=url;
  }finally{
    navigating=false;
  }
}

window.addEventListener("click",event=>{
  const target=event.target.closest("a,button");
  if(!target)return;
  const href=target.getAttribute("href");
  let destination=href;
  if(!destination){
    if(target.id==="profileButton" || target.id==="profileNavButton" || target.id==="profileNav") destination="profile.html";
    else if(target.id==="chatsNavButton" || target.id==="chatsNav" || target.id==="backButton") destination="chat.html";
    else if(target.id==="newChatButton" || target.id==="newChatNav") destination="chat.html#new-chat";
    else if(target.classList.contains("conversation-item")){
      destination="chat-room.html?uid="+encodeURIComponent(target.dataset.uid||"")+"&username="+encodeURIComponent(target.dataset.username||"")+"&name="+encodeURIComponent(target.dataset.name||"");
    }
  }
  if(destination && destination.endsWith(".html") && !destination.startsWith("http")){
    event.preventDefault();
    loadPage(destination);
  }
},true);

window.addEventListener("popstate",()=>loadPage(location.pathname.split("/").pop()+location.search+location.hash,false));