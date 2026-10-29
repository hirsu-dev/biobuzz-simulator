export function createFullscreen({document:doc=document,window:win=window,onChange=()=>{},notify=()=>{}}={}){
 const root=doc.documentElement,buttons=[...doc.querySelectorAll('[data-fullscreen]')];let pending=false,theater=false;
 const nativeElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
 function sync(){
  const active=!!nativeElement()||theater;
  root.classList.toggle('game-fullscreen',active);root.classList.toggle('theater-fullscreen',theater);
  for(const button of buttons){button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');button.title=(active?'Exit fullscreen':'Enter fullscreen')+' · Alt+Enter';const label=button.querySelector('[data-fullscreen-label]');if(label)label.textContent=active?'EXIT FULLSCREEN':'FULLSCREEN';}
  onChange();win.dispatchEvent(new Event('resize'));
 }
 async function toggle(){
  if(pending)return;pending=true;
  try{
   if(nativeElement()){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;await exit.call(doc);}
   else if(theater)theater=false;
   else{
    const enter=root.requestFullscreen||root.webkitRequestFullscreen;
    if(enter)await enter.call(root);
    else{theater=true;notify('Expanded view. For a borderless view on iPhone, add this site to your Home Screen.');}
   }
  }catch{notify('This browser blocked fullscreen. Open the website in its own browser tab and try again.',true);}
  finally{pending=false;sync();}
 }
 for(const button of buttons)button.addEventListener('click',toggle);
 for(const event of ['fullscreenchange','webkitfullscreenchange'])doc.addEventListener(event,sync);
 win.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.altKey&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();toggle();}
  else if(e.key==='Escape'&&(nativeElement()||theater)){e.preventDefault();e.stopImmediatePropagation();toggle();}
 },true);
 sync();return {toggle,active:()=>!!nativeElement()||theater};
}
