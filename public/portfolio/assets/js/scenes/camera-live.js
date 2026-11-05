import { filmSlots, fitFilmCover } from './film-strip.js?v=3fe186ecf43b';
import { sampleFilmPath, transportPose } from './film-kinematics.js?v=3fe186ecf43b';

export const CAMERA_MODEL_ASSET = '/assets/room/camera-live-v5/';
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
    ]).then(async ([THREE,model,buffer]) => {
      const maps={};
      if(model.surfaceTextures){
        const loader=new THREE.TextureLoader();
        await Promise.all(['patina','relief'].map(async name=>{
          const texture=await loader.loadAsync(assetRoot+model.surfaceTextures[name]);
          texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
          if(name==='patina')texture.colorSpace=THREE.SRGBColorSpace;
          maps[name]=texture;
        }));
      }
      loadedAsset = { THREE, model, buffer, maps };
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
    this.coverProgress=0;
    const {THREE,model,buffer}=asset;
    this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.95;
    this.renderer.localClippingEnabled=true;
    this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,.001,30);
    this.camera.up.set(0,1,0);
    this.filmClips=model.transport?[]:[
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
    this.ambient=new THREE.HemisphereLight(0xffe7c7,0x252c39,1.5);
    this.scene.add(this.ambient);
    const key=new THREE.DirectionalLight(0xffd5a0,2.2);
    this.keyLight=key;
    this.closedKeyColor=key.color.clone();
    this.openKeyColor=new THREE.Color(1,.465,.19);
    key.position.set(-1,2,3);
    key.castShadow=true;
    key.target.position.set(model.plane.x,model.plane.y,model.plane.z);
    this.scene.add(key.target);
    key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-.25,right:.25,top:.25,bottom:-.25,near:.05,far:6});
    key.shadow.bias=-.000015;
    key.shadow.normalBias=.00005;
    this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xb2cced,.85);
    this.fillLight=fill;
    fill.position.set(2,1,1);
    this.scene.add(fill);
    const materials=model.materials.map(material=>new THREE.MeshStandardMaterial({
      name:material.name,
      color:material.weathered&&material.metalness>.55?new THREE.Color(...material.color):new THREE.Color(...material.color).convertSRGBToLinear(),
      metalness:material.metalness,
      roughness:Math.max(.2,material.roughness*(material.weathered&&material.metalness>.55?.72:1)),
      side:THREE.DoubleSide,
      ...(material.weathered?{map:asset.maps.patina,bumpMap:asset.maps.relief,bumpScale:model.surfaceTextures.bumpScale}:{}),
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
      if(mesh.uvOffset!==undefined)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(floats.slice(mesh.uvOffset,mesh.uvOffset+mesh.count/3*2),2));
      geometry.translate(-group.position.x,-group.position.y,-group.position.z);
      const material=materials[mesh.material];
      if (mesh.part==='stock') material.clippingPlanes=this.filmClips;
      const object=new THREE.Mesh(geometry,material);
      object.castShadow=object.receiveShadow=true;
      group.add(object);
    }
    this.canvas.dataset.cameraModel=model.id;
    this.canvas.dataset.cameraTriangles=String(model.triangles);
    this.canvas.dataset.cameraRenderer='webgl';
    if(model.transport)this.prepareTransport();
  }

  prepareTransport() {
    const {THREE,model}=this.asset,config=model.transport;
    this.dynamicStrips=[];
    const source=this.groups.get('perforations');source.visible=false;
    const material=source.children[0].material.clone();
    for(const spec of [
      {path:config.path,length:config.length,pitch:config.perforationPitch,span:config.bridgeLength,bands:[[-160,-150],[150,160]],origin:config.materialOrigin,closed:false,offset:.05},
      {path:config.belt.path,length:config.belt.length,pitch:8,span:1.5,bands:[[-2,2]],origin:0,closed:true,offset:.5},
    ]){
      const cells=Math.ceil(spec.length/spec.pitch)+2,vertices=cells*spec.bands.length*2*6;
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(vertices*3),3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(vertices*3),3));
      geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
      geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
      this.scene.add(mesh);this.dynamicStrips.push({...spec,cells,mesh});
    }
  }

  updateStrip(spec,distance) {
    const positions=spec.mesh.geometry.attributes.position,normals=spec.mesh.geometry.attributes.normal;
    const phase=((distance-spec.origin)%spec.pitch+spec.pitch)%spec.pitch;
    const {model}=this.asset,unit=model.unit;
    let vertex=0;
    for(let i=0;i<spec.cells;i++){
      const center=(i-1)*spec.pitch+phase;
      // Sample each longitudinal edge once, sharing its frame across both rails.
      const distances=[center-spec.span/2,center,center+spec.span/2];
      const samples=distances.map(s=>sampleFilmPath(spec.path,s,spec.closed));
      for(const [lo,hi] of spec.bands)for(let half=0;half<2;half++){
        const visible=spec.closed||(distances[half]>=0&&distances[half+1]<=spec.length);
        for(const [row,lateral] of [[half,lo],[half,hi],[half+1,hi],[half,lo],[half+1,hi],[half+1,lo]]){
          const q=samples[row];
          const x=q.point[0]+q.width[0]*lateral+q.normal[0]*spec.offset;
          const y=q.point[1]+q.width[1]*lateral+q.normal[1]*spec.offset;
          const z=q.point[2]+q.width[2]*lateral+q.normal[2]*spec.offset;
          positions.setXYZ(vertex,visible?model.plane.x+(x-480)*unit:0,visible?model.plane.y+(340-y)*unit:0,visible?model.plane.z+z*unit:0);
          normals.setXYZ(vertex,q.normal[0],-q.normal[1],q.normal[2]);vertex++;
        }
      }
    }
    positions.needsUpdate=true;normals.needsUpdate=true;
  }

  updateFrame(frame,position) {
    const {model}=this.asset,config=model.transport;
    if(!config)return;
    const [, ,w,h]=model.gate.gate;
    const center=config.gateDistance+(position-frame.userData.slot)*model.gate.pitch;
    const [start,end]=config.readingRange;
    frame.userData.onPath=center+h/2>start&&center-h/2<end;
    frame.visible=frame.userData.onPath&&this.coverProgress>0;
    if(!frame.userData.onPath)return;
    const vertices=frame.geometry.attributes.position,uv=frame.geometry.attributes.uv;
    const rows=vertices.count/2-1;
    for(let row=0;row<=rows;row++){
      const s=Math.max(start,Math.min(end,center+(row/rows-.5)*h));
      const q=sampleFilmPath(config.path,s);
      for(let u=0;u<=1;u++){
        const lateral=(u-.5)*w;
        const x=q.point[0]+q.width[0]*lateral+q.normal[0]*3;
        const y=q.point[1]+q.width[1]*lateral+q.normal[1]*3;
        const z=q.point[2]+q.width[2]*lateral+q.normal[2]*3;
        const i=row*2+u;
        vertices.setXYZ(i,model.plane.x+(x-480)*model.unit,model.plane.y+(340-y)*model.unit,model.plane.z+z*model.unit);
        uv.setXY(i,u,.5-(s-center)/h);
      }
    }
    vertices.needsUpdate=true;uv.needsUpdate=true;frame.geometry.computeBoundingSphere();
  }

  hitProject(x,y) {
    const {THREE}=this.asset;
    const ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x/this.width*2-1,1-y/this.height*2),this.camera);
    const objects=[];
    const collect=object=>{if(!object.visible)return;if(object.isMesh)objects.push(object);else object.children?.forEach(collect);};
    this.scene.children.forEach(collect);
    const hit=ray.intersectObjects(objects,false)[0];
    return hit?.object.userData.projectIndex??null;
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
    this.coverProgress=progress;
    if(this.ambient){
      this.renderer.shadowMap.enabled=progress>0;
      this.ambient.intensity=1.5-progress*1.05;
      this.fillLight.intensity=.85-progress*.62;
      this.keyLight.intensity=2.2+progress*.65;
      this.keyLight.color.copy(this.closedKeyColor).lerp(this.openKeyColor,progress);
      this.keyLight.target.position.set(this.asset.model.plane.x*progress,this.asset.model.plane.y*progress,this.asset.model.plane.z*progress);
      this.scene.environmentIntensity=.65-progress*.25;
    }
    const group=this.groups.get('cover');
    group.position.copy(group.userData.rest);
    group.position.x+=progress*1.2;
    group.position.y+=progress*.25;
    group.position.z+=progress*.15;
    group.rotation.y=-progress*1.65;
    group.visible=progress<1;
    if(this.asset.model.transport){
      for(const [part,object] of this.groups)if(!['body','cover','perforations'].includes(part))object.visible=progress>0&&(part!=='shutter'||['release','transport','register'].includes(this.phase));
      this.dynamicStrips?.forEach(strip=>{strip.mesh.visible=progress>0;});
      this.frameMeshes.forEach(frame=>{frame.visible=progress>0&&frame.userData.onPath;});
    }
  }

  transport(position=0,phase='registered',drive=0,grip=phase==='registered'?1:0) {
    const started=performance.now();
    this.position=position;this.phase=phase;
    const {model}=this.asset;
    const travel=position*model.gate.pitch;
    const drivenTravel=travel+drive*model.gate.pitch;
    if(this.lastFramePosition!==position)this.frameMeshes.forEach(frame=>{
      if(model.transport)this.updateFrame(frame,position);
      else{
        const [u,v,w,h]=model.gate.gate;
        frame.position.copy(this.point(u+w/2,v-frame.userData.slot*model.gate.pitch+travel+h/2,36));
      }
    });
    this.lastFramePosition=position;
    const stock=this.groups.get('stock');
    stock.position.copy(stock.userData.rest);
    if(!model.transport)stock.position.y-=drivenTravel%15*model.unit;
    if(model.transport){
      const pose=transportPose(model.transport,drivenTravel);
      for(const [part,angle] of Object.entries(pose.angles))this.groups.get(part).rotation[model.transport.axes?.[part]||'z']=angle;
      if(this.lastMaterialDistance!==drivenTravel)this.dynamicStrips.forEach((strip,i)=>this.updateStrip(strip,i?pose.beltDistance:drivenTravel));
      this.lastMaterialDistance=drivenTravel;
      const {crank}=model.transport,pin=this.point(...pose.pin,crank.depth),slider=this.point(...pose.slider,crank.depth);
      const rod=this.groups.get('rod');rod.position.copy(pin).add(slider).multiplyScalar(.5);rod.rotation.z=Math.atan2(slider.x-pin.x,pin.y-slider.y);
      const shoe=this.groups.get('slider');shoe.position.copy(shoe.userData.rest);shoe.position.y-=(pose.slider[1]-crank.sliderRest)*model.unit;
      const pins=this.groups.get('registration');pins.position.copy(pins.userData.rest);pins.position.z-=(1-grip)*12*model.unit;
    }else for (let index=0;index<6;index++) {
      const rotor=this.groups.get('rotor'+index);
      if (rotor) rotor.rotation.z=drivenTravel*(index<2?.74:2.3)*(index===1||index===4?-1:1)*Math.PI/180;
    }
    const shutter=this.groups.get('shutter');
    shutter.visible=this.coverProgress>0&&['release','transport','register'].includes(phase);
    this.canvas.dataset.filmDrive=drive.toFixed(3);
    this.canvas.dataset.filmTravel=drivenTravel.toFixed(3);
    this.canvas.dataset.filmUpdateMs=(performance.now()-started).toFixed(2);
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
      const frame=new THREE.Mesh(new THREE.PlaneGeometry(w*model.unit,h*model.unit,1,96),
        new THREE.MeshBasicMaterial({map:texture,toneMapped:false,side:THREE.DoubleSide,clippingPlanes:this.filmClips}));
      this.scene.add(frame);
      frame.castShadow=true;
      frame.userData.slot=slot.index;
      frame.userData.projectIndex=slot.projectIndex;
      this.frameMeshes.push(frame);
    });
    this.lastFramePosition=undefined;
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
