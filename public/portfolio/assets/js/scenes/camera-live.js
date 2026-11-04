import { filmSlots, fitFilmCover } from './film-strip.js?v=8273376a5e68';

export const CAMERA_MODEL_ASSET = '/assets/room/camera-live-v2/';
const assetRoot = CAMERA_MODEL_ASSET;
let assetPromise;
let loadedAsset;
const roomViews = new WeakMap();

export function loadLiveCamera() {
  if (!assetPromise) {
    assetPromise = Promise.all([
      import('../vendor/camera-three/three.js'),
      fetch(assetRoot+'camera.json').then(response => {
        if (!response.ok) throw new Error('Camera geometry unavailable');
        return response.json();
      }),
      fetch(assetRoot+'camera.bin').then(response => {
        if (!response.ok) throw new Error('Camera mesh buffers unavailable');
        return response.arrayBuffer();
      }),
    ]).then(([THREE,model,buffer]) => {
      loadedAsset = { THREE, model, buffer };
      return loadedAsset;
    }).catch(error => { assetPromise=undefined; throw error; });
  }
  return assetPromise;
}

export class LiveCameraView {
  constructor(canvas, asset) {
    this.canvas=canvas;
    this.asset=asset;
    this.groups=new Map();
    this.textures=[];
    this.frameMeshes=[];
    this.position=0;
    this.phase='registered';
    const {THREE,model,buffer}=asset;
    this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.95;
    this.renderer.localClippingEnabled=true;
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,.001,30);
    this.camera.up.set(0,1,0);
    this.filmClips=[
      new THREE.Plane(new THREE.Vector3(0,1,0),-(model.plane.y-340*model.unit)),
      new THREE.Plane(new THREE.Vector3(0,-1,0),model.plane.y+340*model.unit),
    ];
    const environment=new THREE.RoomEnvironment();
    const generator=new THREE.PMREMGenerator(this.renderer);
    this.environment=generator.fromScene(environment,.04);
    this.scene.environment=this.environment.texture;
    this.scene.environmentIntensity=.65;
    environment.dispose();
    generator.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffe7c7,0x252c39,1.5));
    const key=new THREE.DirectionalLight(0xffd5a0,2.2);
    key.position.set(-1,2,3);
    this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xb2cced,.85);
    fill.position.set(2,1,1);
    this.scene.add(fill);
    const materials=model.materials.map(material=>new THREE.MeshStandardMaterial({
      name:material.name,
      color:new THREE.Color(...material.color).convertSRGBToLinear(),
      metalness:material.metalness,
      roughness:Math.max(.24,material.roughness),
      side:THREE.DoubleSide,
    }));
    const floats=new Float32Array(buffer);
    for (const mesh of model.meshes) {
      let group=this.groups.get(mesh.part);
      if (!group) {
        group=new THREE.Group();
        group.name=mesh.part;
        group.position.fromArray(model.pivots[mesh.part]||[0,0,0]);
        group.userData.rest=group.position.clone();
        this.groups.set(mesh.part,group);
        this.scene.add(group);
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(floats.slice(mesh.positionOffset,mesh.positionOffset+mesh.count),3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(floats.slice(mesh.normalOffset,mesh.normalOffset+mesh.count),3));
      geometry.translate(-group.position.x,-group.position.y,-group.position.z);
      const material=materials[mesh.material];
      if (mesh.part==='stock') material.clippingPlanes=this.filmClips;
      group.add(new THREE.Mesh(geometry,material));
    }
    this.canvas.dataset.cameraModel=model.id;
    this.canvas.dataset.cameraTriangles=String(model.triangles);
    this.canvas.dataset.cameraRenderer='webgl';
  }

  resize(width,height) {
    if (this.width===width&&this.height===height) return;
    this.width=width;this.height=height;
    this.renderer.setSize(width,height,false);
  }

  point(u,v,depth=34) {
    const {THREE,model}=this.asset;
    return new THREE.Vector3(model.plane.x+(u-480)*model.unit,
      model.plane.y+(340-v)*model.unit,model.plane.z+depth*model.unit);
  }

  project(point) {
    const projected=point.clone().project(this.camera);
    return {x:(projected.x+1)*this.width/2,y:(1-projected.y)*this.height/2};
  }

  bounds(pixelsPerMeter,centerX,centerY) {
    Object.assign(this.camera,{
      left:-centerX/pixelsPerMeter,right:(this.width-centerX)/pixelsPerMeter,
      top:centerY/pixelsPerMeter,bottom:-(this.height-centerY)/pixelsPerMeter,
    });
    this.camera.updateProjectionMatrix();
  }

  cover(progress) {
    const group=this.groups.get('cover');
    group.position.copy(group.userData.rest);
    group.position.x+=progress*1.2;
    group.position.y+=progress*.25;
    group.position.z+=progress*.15;
    group.rotation.y=-progress*1.65;
    group.visible=progress<1;
  }

  transport(position=0,phase='registered',drive=0) {
    this.position=position;this.phase=phase;
    const {model}=this.asset;
    const travel=position*model.gate.pitch;
    const drivenTravel=travel+drive*model.gate.pitch;
    this.frameMeshes.forEach(frame=>{
      const [u,v,w,h]=model.gate.gate;
      frame.position.copy(this.point(u+w/2,v-frame.userData.slot*model.gate.pitch+travel+h/2,36));
    });
    const stock=this.groups.get('stock');
    stock.position.copy(stock.userData.rest);
    stock.position.y-=drivenTravel%15*model.unit;
    for (let index=0;index<6;index++) {
      const rotor=this.groups.get('rotor'+index);
      if (rotor) rotor.rotation.z=drivenTravel*(index<2?.74:2.3)*(index===1||index===4?-1:1)*Math.PI/180;
    }
    const shutter=this.groups.get('shutter');
    shutter.visible=['release','transport','register'].includes(phase);
    this.canvas.dataset.filmDrive=drive.toFixed(3);
  }

  async prepareFilms(projects) {
    if (this.frameMeshes.length||this.disposed) return;
    const {THREE,model}=this.asset;
    const loader=new THREE.TextureLoader();
    const originals=await Promise.all(projects.map(project=>loader.loadAsync(project.artwork)));
    const textures=originals.map(original=>{
      const image=original.image,canvas=document.createElement('canvas');
      canvas.width=1152;canvas.height=648;
      const ctx=canvas.getContext('2d'),fit=fitFilmCover(image.width,image.height,canvas.width,canvas.height);
      ctx.fillStyle='#100b08';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,fit.x,fit.y,fit.width,fit.height);
      original.dispose();
      return new THREE.CanvasTexture(canvas);
    });
    if (this.disposed) { textures.forEach(texture=>texture.dispose());return; }
    this.textures.push(...textures);
    const [, ,w,h]=model.gate.gate;
    const leader=document.createElement('canvas');leader.width=1152;leader.height=648;
    const ink=leader.getContext('2d');
    ink.fillStyle='#19120d';ink.fillRect(0,0,leader.width,leader.height);
    ink.strokeStyle='#826144';ink.lineWidth=4;ink.strokeRect(28,28,1096,592);
    ink.beginPath();ink.arc(576,324,100,0,Math.PI*2);ink.moveTo(426,324);ink.lineTo(726,324);ink.moveTo(576,174);ink.lineTo(576,474);ink.stroke();
    ink.fillStyle='#bd9870';ink.font='24px monospace';ink.fillText('UNEXPOSED / LEADER',48,76);
    const leaderTexture=new THREE.CanvasTexture(leader);this.textures.push(leaderTexture);
    filmSlots(projects.length).forEach(slot=>{
      const texture=slot.projectIndex===null?leaderTexture:textures[slot.projectIndex];
      texture.colorSpace=THREE.SRGBColorSpace;
      const frame=new THREE.Mesh(new THREE.PlaneGeometry(w*model.unit,h*model.unit),
        new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide,clippingPlanes:this.filmClips}));
      this.scene.add(frame);
      frame.userData.slot=slot.index;
      this.frameMeshes.push(frame);
    });
    this.transport(this.position,this.phase);
  }

  frontProjection(overview) {
    const origin=this.point(0,0,36);
    this.camera.position.copy(origin).add({x:0,y:0,z:3.4});
    this.camera.lookAt(origin);
    this.bounds(overview.scale/this.asset.model.unit,overview.x,overview.y);
    this.camera.updateMatrixWorld();
  }

  opening(sample,rect,destination) {
    const {THREE,model}=this.asset;
    const target=new THREE.Vector3(...model.room.target);
    const offset=new THREE.Vector3(...model.room.offset).lerp(new THREE.Vector3(0,0,3.4),sample.turn);
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
    const pixelsPerMeter=rect.width/model.room.span;
    this.bounds(pixelsPerMeter,rect.left+rect.width/2,rect.top+rect.height/2);
    this.camera.updateMatrixWorld();
    // Hold the foreground skid on the same desk contact during the true 3D turn.
    const contact=new THREE.Vector3(...model.room.contact);
    const wanted=rect.top+221.87/231*rect.height;
    const shift=(wanted-this.project(contact).y)/pixelsPerMeter;
    const up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
    this.camera.position.addScaledVector(up,shift);
    target.addScaledVector(up,shift);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.cover(sample.cover);
    let origin=this.project(this.point(0,0,36));
    let scale=pixelsPerMeter*model.unit;
    if (sample.zoom>0) {
      const blend=(a,b)=>a+(b-a)*sample.zoom;
      origin={x:blend(origin.x,destination.x),y:blend(origin.y,destination.y)};
      scale=blend(scale,destination.scale);
      this.frontProjection({...origin,scale});
    }
    this.render();
    return {...origin,scale};
  }

  room() {
    const {THREE,model}=this.asset;
    this.resize(930,693);
    const target=new THREE.Vector3(...model.room.target);
    this.camera.position.copy(target).add(new THREE.Vector3(...model.room.offset));
    this.camera.lookAt(target);
    this.bounds(930/model.room.span,465,346.5);
    this.cover(0);
    this.render();
  }

  render() {
    if (this.disposed) return;
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.cameraDrawCalls=String(this.renderer.info.render.calls);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed=true;
    const materials=new Set();
    this.scene.traverse(object=>{
      if (object.isMesh) {
        object.geometry.dispose();
        materials.add(object.material);
      }
    });
    materials.forEach(material=>material.dispose());
    this.textures.forEach(texture=>texture.dispose());
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export function getRoomCamera(source) {
  return roomViews.get(source?.querySelector('[data-room-camera]'));
}

export function prepareRoomCamera(root,{signal}={}) {
  const canvases=Array.from(root?.querySelectorAll?.('[data-room-camera]')||[]);
  if (!canvases.length) return Promise.resolve();
  const paint=asset=>{
    if (signal?.aborted||root.isConnected===false) return;
    for (const canvas of canvases) {
      if (roomViews.has(canvas)||canvas.dataset.cameraCopy==='true') continue;
      const backdrop=!!canvas.closest('.room-backdrop');
      const drawingCanvas=backdrop?document.createElement('canvas'):canvas;
      let view;
      try {
        view=new LiveCameraView(drawingCanvas,asset);
        view.room();
        if (backdrop) {
          canvas.width=drawingCanvas.width;canvas.height=drawingCanvas.height;
          canvas.getContext('2d').drawImage(drawingCanvas,0,0);
          canvas.dataset.cameraCopy='true';
          view.dispose();
        } else {
          roomViews.set(canvas,view);
          signal?.addEventListener('abort',()=>{view.dispose();roomViews.delete(canvas);},{once:true});
        }
        canvas.closest('[data-room-object]').dataset.cameraSource='model';
      } catch (error) {
        view?.dispose();
        canvas.closest('[data-room-object]').dataset.cameraSource='fallback';
        console.warn('Live camera is unavailable in this browser.',error);
      }
    }
  };
  return loadedAsset?Promise.resolve(paint(loadedAsset)):loadLiveCamera().then(paint).catch(error=>{
    if (signal?.aborted||root.isConnected===false) return;
    for (const canvas of canvases) canvas.closest('[data-room-object]').dataset.cameraSource='fallback';
    console.warn('Live camera assets could not load; keeping the registered fallback.',error);
  });
}

export function copyRoomCamera(source,target) {
  const from=source?.querySelector('[data-room-camera]'),to=target?.querySelector('[data-room-camera]');
  if (!from||!to) return;
  to.width=from.width;to.height=from.height;
  to.getContext('2d').drawImage(from,0,0);
  to.dataset.cameraCopy='true';
}
