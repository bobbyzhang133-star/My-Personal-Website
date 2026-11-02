// A closed hardcover can breathe at its fore-edge, without moving its base.
// Only the short active cue requests frames; hidden/menu/travel/focus resets it.
export function createJournalIdle({paint, setTimer=setTimeout, clearTimer=clearTimeout, requestFrame=requestAnimationFrame, cancelFrame=cancelAnimationFrame}) {
  let available=false,disposed=false,timer=null,frame=null,start=null,painted=false,first=true;
  const rest=()=>{if(painted){paint(0);painted=false;}};
  const stop=()=>{if(timer!==null)clearTimer(timer);if(frame!==null)cancelFrame(frame);timer=frame=start=null;rest();};
  const schedule=()=>{timer=setTimer(()=>{timer=null;start=null;frame=requestFrame(tick);},first?3400:8900);first=false;};
  const tick=now=>{
    frame=null;if(disposed||!available)return;
    if(start===null)start=now;
    const p=Math.min(1,(now-start)/1050);
    // Lift 300 ms, hold 250 ms, settle 500 ms. No repeated page flipping.
    const t=p<2/7?Math.min(1,p*3.5):p<11/21?1:Math.max(0,(1-p)*2.1);
    paint(t*t*(3-2*t));painted=true;
    if(p<1)frame=requestFrame(tick);else{rest();schedule();}
  };
  return {
    setAvailable(value){if(disposed||available===value)return;available=value;if(value)schedule();else stop();},
    destroy(){disposed=true;available=false;stop();}
  };
}
