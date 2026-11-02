"""Executed inside Blender via MCP. Owns only the PortfolioJournal_v1 collection; writes versioned v3 assets."""
import bpy,json,math,hashlib,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/bobbyzhang/Documents/Claude Design/public-profile-site-apple-google-fusion')
OUT=ROOT/'public/portfolio/assets/room/journal-3d/v3';EVIDENCE=ROOT/'artifacts/journal-page-match'
OUT.mkdir(parents=True,exist_ok=True);EVIDENCE.mkdir(parents=True,exist_ok=True)
if not (OUT/'cover-source.png').exists():raise RuntimeError('Run node scripts/prepare-journal-texture.mjs before building the journal')
if not (EVIDENCE/'before-model.blend').exists():bpy.ops.wm.save_as_mainfile(filepath=str(EVIDENCE/'before-model.blend'))
name='PortfolioJournal_v1'
old=bpy.data.collections.get(name)
if old:
 for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
 bpy.data.collections.remove(old)
collection=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(collection)
for obj in bpy.context.scene.objects:
 if obj.name in {'Cube','Camera','Light'}:obj.hide_set(True);obj.hide_render=True
W,H,T=.28,.32,.018

def link(obj):
 for group in list(obj.users_collection):group.objects.unlink(obj)
 collection.objects.link(obj);return obj

def empty(name,parent=None):
 obj=bpy.data.objects.new(name,None);collection.objects.link(obj);obj.parent=parent;return obj
rig=empty('JournalRig');hinge=empty('JournalFrontHinge',rig)

def material(name,color):
 mat=bpy.data.materials.new(name);mat.use_nodes=True
 rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
 linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 mat.diffuse_color=(*linear,1);bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bsdf.inputs['Base Color'].default_value=(*linear,1);bsdf.inputs['Roughness'].default_value=.88
 mat['browser_color']=json.dumps([round(v*255) for v in rgb]);return mat
cloth=material('Journal Indigo Cloth','#3b3652');edge=material('Journal Dark Binding','#131230');paper=material('Journal Cream Paper','#d0ac7a');inkpaper=material('Journal Warm Flyleaf','#ead7a4');gold=material('Journal Muted Gilt','#a68458')
cover=material('Journal Actual Room Cover','#ffffff');tex=cover.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(OUT/'cover-source.png'),check_existing=True);tex.image.reload();tex.interpolation='Closest';cover.node_tree.links.new(tex.outputs['Color'],next(n for n in cover.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color']);cover['browser_texture']='cover-source.png'

def box(name,center,size,mat,parent=rig,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=center);obj=link(bpy.context.object);obj.name=name;obj.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.parent=parent;obj.data.materials.append(mat)
 if bevel:
  mod=obj.modifiers.new('Rounded book-board edges','BEVEL');mod.width=bevel;mod.segments=2
 return obj

def plane(name,x0,y0,x1,y1,z,mat,parent=rig,up=True):
 verts=[(x0,y0,z),(x1,y0,z),(x1,y1,z),(x0,y1,z)];faces=[(0,1,2,3) if up else (3,2,1,0)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(mat);obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj);obj.parent=parent;return obj
box('JournalBackBoard',(W/2,H/2,-T+.0015),(W+.012,H+.012,.003),cloth,bevel=.001)
box('JournalPageBlock',(W/2,H/2,-.0105),(W,H,.011),paper,bevel=.0008)
plane('JournalRightReadingLeaf',0,0,W,H,-.0048,inkpaper)
box('JournalFrontBoard',(W/2,H/2,-.0015),(W+.012,H+.012,.003),cloth,hinge,bevel=.001)
plane('JournalInsideCover',0,0,W,H,-.0032,inkpaper,hinge,up=False)
# Fine physical paper edges, attached to the same page block.
for i in range(7):
 z=-.015+i*.0015
 box(f'JournalPaperEdge{i}',(W+.0002,H/2,z),(.00045,H-.004,.00018),gold if i==0 else paper)
 box(f'JournalForeEdge{i}',(W/2,H+.0002,z),(W-.004,.00045,.00018),paper)
box('JournalClothSpine',(-.003,H/2,-.009),(.006,H+.004,.015),edge,bevel=.002)
# The native artwork already contains the border, tooling and corner caps.
# Map the full board, including its overhang, rather than adding a second rim.
O=.006
quad=np.array([[34,24],[241,2],[324,59],[80,86]],dtype=float)
source=np.array([[0,0],[1,0],[1,1],[0,1]],dtype=float)
metric=np.array([[-O,-O],[W+O,-O],[W+O,H+O],[-O,H+O]])
a=[];b=[]
for (x,y),(u,v) in zip(metric,quad):
 a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);b.extend([u,v])
reference=np.append(np.linalg.solve(np.array(a),np.array(b)),1).reshape(3,3)
base_quad=np.array([[34,40],[241,18],[328,81],[83,104]],dtype=float)
denominators=np.array([(reference@np.array([x,y,1]))[2] for x,y in metric])
depth_axis=np.mean((base_quad-quad)*denominators[:,None]/-T,axis=0)

def reference_point(point):
 x,y,z=point;q=reference@np.array([x,y,1]);return (q[:2]+z*depth_axis)/q[2]

def native_point(pixel,z):
 u,v=pixel;a,b,c=reference[0];d,e,f=reference[1];g,h,_=reference[2]
 x,y=np.linalg.solve([[a-u*g,b-u*h],[d-v*g,e-v*h]],[u-c-z*depth_axis[0],v-f-z*depth_axis[1]])
 return (x,y,z)

def native_side(name,pixels,heights,parent=rig,rows=1,columns=8):
 return native_patch(name,[native_point(pixel,z) for pixel,z in zip(pixels,heights)],pixels,parent,rows,columns)

def native_patch(name,corners,pixels,parent=rig,rows=1,columns=8):
 corners=np.array(corners,dtype=float);verts=[];uvs=[];faces=[]
 for j in range(rows+1):
  for i in range(columns+1):
   u,v=i/columns,j/rows
   point=(1-u)*(1-v)*corners[0]+u*(1-v)*corners[1]+u*v*corners[2]+(1-u)*v*corners[3]
   q=reference_point(point);verts.append(tuple(point));uvs.append((q[0]/354,1-q[1]/112))
 for j in range(rows):
  for i in range(columns):
   k=j*(columns+1)+i;face=(k,k+1,k+columns+2,k+columns+1);faces.append(face[::-1] if name.endswith(("PageEdge","FrontBoardEdge","BackBoardEdge")) else face)
 mesh=bpy.data.meshes.new(name+'Mesh');mesh.from_pydata(verts,[],faces);mesh.materials.append(cover);uv=mesh.uv_layers.new(name='Native Room UV')
 for face in mesh.polygons:
  for loop in face.loop_indices:uv.data[loop].uv=uvs[mesh.loops[loop].vertex_index]
 obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj);obj.parent=parent
 obj['source_quad']=json.dumps(np.array(pixels).tolist());return obj

def native_polygon(name,pixels,z,parent):
 verts=[native_point(pixel,z) for pixel in pixels];mesh=bpy.data.meshes.new(name+'Mesh');mesh.from_pydata(verts,[],[list(range(len(verts)))]);mesh.materials.append(cover)
 uv=mesh.uv_layers.new(name='Native Room UV')
 for face in mesh.polygons:
  for loop in face.loop_indices:
   point=reference_point(verts[mesh.loops[loop].vertex_index]);uv.data[loop].uv=(point[0]/354,1-point[1]/112)
 obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj);obj.parent=parent;obj['source_quad']=json.dumps(pixels)

native_polygon('JournalNativeCoverBackRim',[[24,24],[233,0],[251,0],[241,2],[34,24]],0,hinge)
native_polygon('JournalNativeCoverRightRim',[[241,2],[251,0],[328,58],[324,59]],0,hinge)
native_patch('JournalNativeCover',[(-O,-O,.00015),(W+O,-O,.00015),(W+O,H+O,.00015),(-O,H+O,.00015)],quad,hinge,rows=8,columns=8)
# Exact source page grain, shadow lines and cloth/spine details on physical sides.
# Winding faces outward: fore edge +Y, spine -X. Each remains attached to its board.
native_side('JournalNativePageEdge',[[80,91],[81,102],[326,77],[325,65]],[-.004,-.0155,-.0155,-.004],rows=8,columns=1)
native_side('JournalNativeSpine',[[24,24],[34,24],[80,86],[70,92]],[.0002,.0002,.0002,-.002],rows=1,columns=8)
native_side('JournalNativeSpineSide',[[18,31],[24,24],[70,92],[75,104]],[-.004,0,-.003,-T],rows=1,columns=8)
native_side('JournalNativeSpineCap',[[70,92],[80,86],[84,104],[75,104]],[-.003,-.003,-T,-T],rows=2,columns=2)
native_side('JournalNativeSpineBack',[[18,31],[18,38],[22,44],[24,24]],[-.004,-.012,-T,0],rows=2,columns=2)
native_side('JournalNativeFrontBoardEdge',[[80,86],[80,91],[325,65],[324,59]],[0,-.003,-.003,0],hinge,rows=8,columns=1)
native_side('JournalNativeBackBoardEdge',[[81,102],[83,104],[328,81],[326,77]],[-T+.003,-T,-T,-T+.003],rows=8,columns=1)
# The hand-painted side profiles are not a perfect rigid-camera projection.
# Normalize their small perspective margins into the board bounds as the book
# becomes front-facing; author the same correction in Blender and the GLB.
for obj in collection.objects:
 if obj.type=='MESH' and obj.get('source_quad') and obj.name!='JournalNativeCover':
  obj.shape_key_add(name='Basis');key=obj.shape_key_add(name='PerspectiveNormalization')
  for vertex in key.data:
   vertex.co.x=max(-.03,min(W+O,vertex.co.x));vertex.co.y=max(-O,min(H+O,vertex.co.y))

# Authored mechanism: raise the entire book, then rotate the rigid front board.
rig['pickup_progress']=0.0
for frame,z,tilt,progress in [(1,0,0,0),(20,.035,8,.13),(46,.16,43,.62),(82,.26,70,1),(96,.26,70,1)]:
 rig.location=(0,-.12*progress,z+T);rig.rotation_euler=(math.radians(tilt),0,0);rig['pickup_progress']=float(progress)
 rig.keyframe_insert(data_path='location',frame=frame);rig.keyframe_insert(data_path='rotation_euler',frame=frame);rig.keyframe_insert(data_path='["pickup_progress"]',frame=frame)
for frame,angle in [(1,0),(24,0),(48,-58),(76,-165),(88,-180),(96,-180)]:
 hinge.rotation_euler=(0,math.radians(angle),0);hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=96;scene.render.fps=48
samples=[]
for frame in range(1,97):
 scene.frame_set(frame);progress=(rig.location.z-T)/.26
 samples.append({'time':round((frame-1)/95,6),'pickup':round(progress,6),'hinge':round(hinge.rotation_euler.y,6),'lift':round(progress,6)})
 for obj in collection.objects:
  if obj.type=='MESH' and obj.data.shape_keys:
   key=obj.data.shape_keys.key_blocks['PerspectiveNormalization'];key.value=progress;key.keyframe_insert(data_path='value',frame=frame)

scene.frame_set(1);bpy.context.view_layer.update()
# Export triangulated evaluated Blender geometry; runtime never redraws the model.
meshes=[];deps=bpy.context.evaluated_depsgraph_get()
for obj in list(collection.objects):
 if obj.type!='MESH':continue
 evaluated=obj.evaluated_get(deps);data=evaluated.to_mesh();data.calc_loop_triangles();is_front=obj.parent==hinge
 basis=hinge.matrix_world.inverted() if is_front else rig.matrix_world.inverted();transform=basis@obj.matrix_world;normal=transform.to_3x3().inverted().transposed()
 for slot,mat in enumerate(data.materials):
  points=[];normals=[];uvs_out=[];held=[]
  for tri in data.loop_triangles:
   if tri.material_index!=slot:continue
   for loop_index in tri.loops:
    loop=data.loops[loop_index];v=transform@data.vertices[loop.vertex_index].co;n=(normal@loop.normal).normalized();points.extend(round(float(x),7) for x in v);normals.extend(round(float(x),5) for x in n)
    coords=data.uv_layers.active.data[loop_index].uv if data.uv_layers.active else (0,0);uvs_out.extend(round(float(x),7) for x in coords)
    if obj.data.shape_keys:
     held_point=transform@obj.data.shape_keys.key_blocks['PerspectiveNormalization'].data[loop.vertex_index].co;held.extend(round(float(x),7) for x in held_point)

  if points:meshes.append({'name':obj.name,'part':'front' if is_front else 'body','positions':points,'heldPositions':held or None,'normals':normals,'uv':uvs_out,'color':json.loads(mat.get('browser_color','[240,225,190]')),'texture':mat.get('browser_texture'),'sourceQuad':json.loads(obj['source_quad']) if 'source_quad' in obj else None})
 evaluated.to_mesh_clear()
manifest={'version':3,'referenceProjection':reference.tolist(),'referenceDepthAxis':depth_axis.tolist(),'coverBounds':[-O,-O,W+O,H+O],'restBaseQuad':[[34,40],[241,18],[328,81],[83,104]],'source':'Blender 4.5 / MCP','dimensions':{'width':W,'height':H,'thickness':T},'coverQuad':quad.tolist(),'animation':samples,'meshes':meshes}
(OUT/'journal.mesh.json').write_text(json.dumps(manifest,separators=(',',':')))
# A camera/light rig lives with the source for inspectable Blender review.
camdata=bpy.data.cameras.new('JournalReviewCamera');cam=bpy.data.objects.new('JournalReviewCamera',camdata);collection.objects.link(cam);cam.location=(.44,-.52,.5);direction=Vector((W/2,H/2,-T/2))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=.58;scene.camera=cam
for name,location,power,size in [('JournalKey',(-.4,-.3,1),65,.65),('JournalFill',(.7,.5,.6),25,.8)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;light=bpy.data.objects.new(name,data);collection.objects.link(light);light.location=location;light.rotation_euler=(Vector((W/2,H/2,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.render.resolution_percentage=100;scene.render.film_transparent=True
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
 if obj.type in {'MESH','EMPTY'}:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'journal.glb'),export_format='GLB',use_selection=True,export_animations=True,export_frame_range=True,export_force_sampling=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(EVIDENCE/'journal-v3.blend'))
proof={'version':3,'authoring':'Original Blender journal refined through local Blender MCP','source_assets':['assets/room/master/studio-objects-v3.webp','assets/room/master/research-mark.svg'],'texture_policy':'Native masked Room art, projected per vertex onto the full board, yellow page edge with original red markings, spine and binding edges; no synthetic white seam','paper_span_m':[W,H],'cover_overhang_m':O,'thickness_m':T,'source_world_base_z':0,'model_local_base_z':-T,'external_assets':[],'files':{}}
for file in ['journal.glb','journal.mesh.json','cover-source.png']:
 data=(OUT/file).read_bytes();proof['files'][file]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
(OUT/'provenance.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps({'meshes':len(meshes),'triangles':sum(len(m['positions'])//9 for m in meshes),'model':str(OUT/'journal.glb'),'source':str(EVIDENCE/'journal-v3.blend'),'animation_frames':len(samples)}))
