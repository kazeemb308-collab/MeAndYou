const pageCache=new Map();
let navigating=false;

function pageKey(url){
  const u=new URL(url,location.href);
  return u.pathname+u.search+u.hash;
}

function saveCurrentPage(){
  const key=pageKey(location.href);
  if(pageCache.has(key)) return;

  const fragment=document.createDocumentFragment();
  while(document.body.firstChild){
    fragment.appendChild(document.body.firstChild);
  }
  pageCache.set(key,fragment);
}

function clearBody(){
  while(document.body.firstChild) document.body.removeChild(document.body.firstChild);
}

function restorePage(key){
  const fragment=pageCache.get(key);
  if(!fragment) return false;

  clearBody();
  document.body.appendChild(fragment);
  pageCache.delete(key);
  return true;
}

async function executeScripts(container){
  const scripts=[...container.querySelectorAll("script")];

  for(const oldScript of scripts){
    if(
      oldScript.src &&
      new URL(oldScript.src,location.href).pathname.endsWith("/navigation.js")
    ){
      oldScript.remove();
      continue;
    }

    const script=document.createElement("script");
    [...oldScript.attributes].forEach(a=>{
      script.setAttribute(a.name,a.value);
    });

    if(oldScript.src){
      script.src=oldScript.src;
    }else{
      script.textContent=oldScript.textContent;
    }

    oldScript.replaceWith(script);

    if(script.src){
      await new Promise(resolve=>{
        script.addEventListener("load",resolve,{once:true});
        script.addEventListener("error",resolve,{once:true});
      });
    }
  }
}

async function loadPage(url,push=true){
  if(navigating) return;

  const absolute=new URL(url,location.href);
  const key=pageKey(absolute.href);

  navigating=true;

  try{
    saveCurrentPage();

    if(push){
      history.pushState({}, "", absolute.href);
    }

    if(restorePage(key)){
      window.scrollTo(0,0);
      return;
    }

    const response=await fetch(absolute.href,{cache:"default"});
    if(!response.ok) throw new Error("Navigation failed");

    const html=await response.text();
    const parsed=new DOMParser().parseFromString(html,"text/html");

    document.title=parsed.title;
    document.body.className=parsed.body.className;

    const wrapper=document.createElement("div");

    [...parsed.body.childNodes].forEach(node=>{
      wrapper.appendChild(node);
    });

    await executeScripts(wrapper);

    clearBody();

    while(wrapper.firstChild){
      document.body.appendChild(wrapper.firstChild);
    }

    window.scrollTo(0,0);

  }catch(error){
    console.error("Navigation error:",error);
    location.href=absolute.href;
  }finally{
    navigating=false;
  }
}

window.addEventListener("click",event=>{
  const target=event.target.closest("a,button");
  if(!target) return;

  let destination=target.getAttribute("href");

  if(!destination){
    if(["profileButton","profileNavButton","profileNav"].includes(target.id)){
      destination="profile.html";
    }else if(
      ["chatsNavButton","chatsNav","backButton","roomBack","profileBack"].includes(target.id)
    ){
      destination="chat.html";
    }else if(["newChatButton","newChatNav"].includes(target.id)){
      destination="chat.html#new-chat";
    }else if(target.classList.contains("conversation-item")){
      destination=
        "chat-room.html?uid="+encodeURIComponent(target.dataset.uid||"")+
        "&username="+encodeURIComponent(target.dataset.username||"")+
        "&name="+encodeURIComponent(target.dataset.name||"");
    }
  }

  if(
    destination &&
    !destination.startsWith("http") &&
    (
      destination.endsWith(".html") ||
      destination.includes(".html?") ||
      destination.includes(".html#")
    )
  ){
    event.preventDefault();
    event.stopImmediatePropagation();
    loadPage(destination);
  }
},true);

window.addEventListener("popstate",()=>{
  loadPage(location.href,false);
});