// Top cover corners in the existing 354 × 112 source cutout. This is a plane
// re-projection of the actual cloth/gilt artwork, not a stretched replacement.
export const JOURNAL_COVER_QUAD = [[27,24],[240,3],[323,63],[84,92]];

export function journalProjection(from, to) {
  const rows = from.flatMap(([x,y],i) => {
    const [u,v]=to[i];
    return [[x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]];
  });
  for(let col=0;col<8;col++) {
    let pivot=col;
    for(let row=col+1;row<8;row++) if(Math.abs(rows[row][col])>Math.abs(rows[pivot][col])) pivot=row;
    if(Math.abs(rows[pivot][col])<1e-10) return null;
    [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
    const divisor=rows[col][col];rows[col]=rows[col].map(value=>value/divisor);
    for(let row=0;row<8;row++) if(row!==col) {
      const factor=rows[row][col];rows[row]=rows[row].map((value,index)=>value-factor*rows[col][index]);
    }
  }
  const [a,b,c,d,e,f,g,h]=rows.map(row=>row[8]);
  return [a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1];
}
export const journalMatrix = matrix => matrix ? `matrix3d(${matrix.map(n=>Number(n.toFixed(9))).join(',')})` : 'none';
