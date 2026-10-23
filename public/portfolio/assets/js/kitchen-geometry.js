// Authored low-poly sink, fitted to the existing counter/floor world-unit grid.
export const KITCHEN_SINK = Object.freeze({center:[9.5,2.5],support:.45,footprint:[9,2,10,3],top:.72});
function box(x,y,z,w,d,h,color,part) {
  return {part,color,vertices:[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z],[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};
}
export function kitchenSinkGeometry() {
  const [x,y]=KITCHEN_SINK.center;
  return [
    box(x-.5,y-.5,0,1,1,.34,'#526879','cabinet'),
    box(x-.64,y-.4,.34,1.28,.12,.13,'#bfced1','back rim'),
    box(x-.64,y+.28,.34,1.28,.12,.13,'#91a9b2','front rim'),
    box(x-.64,y-.28,.34,.12,.56,.13,'#a9bcc1','left rim'),
    box(x+.52,y-.28,.34,.12,.56,.13,'#a9bcc1','right rim'),
    box(x-.52,y-.28,.35,1.04,.56,.018,'#293e48','recessed basin'),
    box(x-.49,y-.25,.372,.98,.5,.005,'#537b8c','water'),
    box(x-.07,y-.02,.379,.14,.09,.002,'#182e38','drain'),
    box(x-.035,y-.32,.47,.07,.07,.25,'#c5d8da','faucet riser'),
    box(x-.035,y-.25,.65,.07,.26,.07,'#c5d8da','faucet spout'),
    box(x-.035,y+.01,.59,.07,.05,.13,'#91b1bb','tap outlet'),
    box(x-.2,y-.34,.47,.09,.11,.05,'#558fbd','cold handle'),
    box(x+.12,y-.34,.47,.09,.11,.05,'#c7816a','hot handle'),
  ];
}
