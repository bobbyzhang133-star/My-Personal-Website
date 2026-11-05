import { journalProjection, journalMatrix } from './journal-geometry.js?v=3fe186ecf43b';

// Native HTML lettering stays sharp and shares the settled reader's exact
// layout/scroll. Only its physical paper plane is projected while held.
export function mountJournalReadingPages(root,{width,height,single}) {
  const originals=Array.from(root.querySelector('[data-book-pages]')?.children||[]);
  const faces=[];
  for(const [side,index] of single?[['right',0]]:[['left',0],['right',1]]){
    const original=originals[index];if(!original)continue;
    const face=root.ownerDocument.createElement('div');
    face.className=`journal-reading-face journal-reading-${side} flipbook`;
    face.setAttribute('aria-hidden','true');face.setAttribute('inert','');
    face.dataset.journalReadingFace=side;
    Object.assign(face.style,{width:`${width}px`,height:`${height}px`,visibility:'hidden'});
    const page=original.cloneNode(true);
    page.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    face.append(page);root.append(face);
    const from=original.querySelector('.book-page-content'),to=page.querySelector('.book-page-content');
    if(from&&to){to.scrollTop=from.scrollTop;to.scrollLeft=from.scrollLeft;}
    faces.push({side,face});
  }
  const plane=[[0,0],[width,0],[width,height],[0,height]];
  return {
    update(surfaces){for(const {side,face} of faces){
      const surface=surfaces[side],matrix=surface?.visible?journalProjection(plane,surface.quad):null;
      face.style.visibility=matrix?'visible':'hidden';
      face.dataset.paperVisible=String(!!matrix);
      if(matrix){face.style.transform=journalMatrix(matrix);face.dataset.paperSurface=surface.name;}
    }},
    remove(){faces.forEach(({face})=>face.remove());}
  };
}
