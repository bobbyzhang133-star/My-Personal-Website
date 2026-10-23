"""Deterministic 3D cover render from recovered native rigs, not image synthesis.

The installed Unity editor cannot start on this host (exit 137), so this small
offline renderer evaluates the original bone weights, bind matrices and UVs.
No topology, texture pixels or proportions are repainted. NumPy/Pillow are bundled.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def rotation(quaternion):
    x, y, z, w = quaternion
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])


def axis(angle, direction):
    vector = np.zeros(3)
    vector[direction] = math.sin(math.radians(angle)/2)
    return rotation([*vector, math.cos(math.radians(angle)/2)])


def evaluate(path, name):
    model = json.loads((path / (name+'-rig.json')).read_text())
    joints = {j['id']: j for j in model['transforms']}
    world = {}
    overrides = {}

    def matrix(joint_id):
        if joint_id in world:
            return world[joint_id]
        joint = joints[joint_id]
        local = np.eye(4)
        r = rotation(joint['rotation'])
        if joint['name'] == 'bn_neck':
            r = r @ axis(-7 if name == 'cat' else 8, 2)
        if joint['name'] == 'bn_tail1':
            r = r @ axis(9 if name == 'cat' else -8, 1)
        if joint_id == model['root']:
            r = axis(158 if name == 'cat' else 115, 1) @ r
        r = overrides.get(joint_id, r)
        local[:3, :3] = r @ np.diag(joint['scale'])
        local[:3, 3] = joint['position']
        world[joint_id] = matrix(joint['parent']) @ local if joint['parent'] else local
        return world[joint_id]

    vertices = np.array([[p['x'],p['y'],p['z'],1] for p in model['vertices']])
    normals = np.array([[p['x'],p['y'],p['z']] for p in model['normals']])
    weights = np.array([w['values'] for w in model['weights']])
    indices = np.array([w['indices'] for w in model['weights']])
    def skin():
        world.clear()
        matrices = np.array([matrix(bone) @ np.array(bind['values']).reshape(4,4) for bone, bind in zip(model['bones'],model['bindposes'])])
        points = sum((matrices[indices[:,i]] @ vertices[:,:,None])[:,:,0]*weights[:,i,None] for i in range(4))[:,:3]
        return points, matrices

    points, matrices = skin()
    floor = points[:,1].min()
    contact_names = ['bn_l_toe','bn_r_toe'] + (['bn_l_hand','bn_r_hand'] if name=='cat' else [])
    selections = {}
    for contact in contact_names:
        joint_index = next(index for index,bone in enumerate(model['bones']) if joints[bone]['name']==contact)
        selections[contact] = np.any((indices==joint_index)&(weights>.2),axis=1)
    # Short CCD limb posing: rotate existing joints (no limb stretching) until
    # every paw/foot meets the same plane, not just the single lowest corner.
    for iteration in range(36):
        for contact, selection in selections.items():
            foot_id = next(bone for bone in model['bones'] if joints[bone]['name']==contact)
            parent_id = joints[foot_id]['parent']
            for chain_step in range(2):
                if not parent_id or parent_id==model['root']:
                    break
                points, matrices = skin()
                tip = points[selection][np.argmin(points[selection,1])]
                error = tip[1]-floor
                if abs(error)<.0003:
                    break
                origin = matrix(parent_id)[:3,3]
                a=tip-origin; b=tip-[0,error,0]-origin
                a/=max(np.linalg.norm(a),1e-8);b/=max(np.linalg.norm(b),1e-8)
                cross=np.cross(a,b);sine=np.linalg.norm(cross);cosine=float(np.clip(a@b,-1,1))
                if sine<1e-9:
                    break
                x,y,z=cross/sine
                skew=np.array([[0,-z,y],[z,0,-x],[-y,x,0]])
                delta=np.eye(3)+skew*sine+skew@skew*(1-cosine)
                parent=joints[parent_id]
                basis=matrix(parent['parent'])[:3,:3] if parent['parent'] else np.eye(3)
                current=overrides.get(parent_id,rotation(parent['rotation']))
                overrides[parent_id]=np.linalg.inv(basis)@delta@basis@current
                parent_id=parent['parent']
    points, matrices = skin()
    directions = sum((np.linalg.inv(matrices[indices[:,i],:3,:3]).transpose(0,2,1) @ normals[:,:,None])[:,:,0]*weights[:,i,None] for i in range(4))
    directions /= np.maximum(np.linalg.norm(directions,axis=1)[:,None],1e-8)
    height = float(np.ptp(points[:,1]))
    low = float(points[:,1].min())
    center = float((points[:,0].min()+points[:,0].max())/2)
    # Keep each game's recovered physical scale; never enlarge the rat to cat size.
    width = float(np.ptp(points[:,0]))
    # Separate readable silhouettes with a small shared-floor gap.
    anchor = -width/2-.035 if name=='cat' else width/2+.035
    points += [anchor-center, -low, 0]
    contacts = {}
    for contact in contact_names:
        joint_index = next(index for index,bone in enumerate(model['bones']) if joints[bone]['name']==contact)
        selection = np.any((indices==joint_index)&(weights>.2),axis=1)
        contacts[contact] = float(points[selection,1].min()) if selection.any() else None
    return {'name':name, 'points':points, 'normals':directions,
            'uv':np.array([[p['x'],p['y']] for p in model['uv']]),
            'triangles':np.array(model['triangles']).reshape(-1,3),
            'texture':np.array(Image.open(path/model['texture']).convert('RGBA')),
            'height':height, 'floorError':float(abs(points[:,1].min())), 'footContacts':contacts}


def render(source, destination):
    path = Path(source)
    models = [evaluate(path,name) for name in ['cat','rat']]
    size = 1024
    pixel_height = 768
    rgba = np.zeros((pixel_height,size,4),dtype=np.uint8)
    zbuffer = np.full((pixel_height,size),np.inf)
    camera = np.array([[1,0,0],[0,.998,-.063],[0,.063,.998]])
    all_points = np.concatenate([m['points'] @ camera.T for m in models])
    low,high = all_points[:,:2].min(axis=0),all_points[:,:2].max(axis=0)
    span = float(max(high[0]-low[0],(high[1]-low[1])*size/pixel_height)*1.1)
    center = (low+high)/2
    light = np.array([-.4,.7,-.6]);light /= np.linalg.norm(light)
    for model in models:
        points = model['points'] @ camera.T
        pixels = (points[:,:2]-center)/span*size+[size/2,pixel_height/2]
        pixels[:,1] = pixel_height-pixels[:,1]
        texture = model['texture']; th,tw=texture.shape[:2]
        intensity = .62+.38*np.maximum(0,model['normals']@light)
        for face in model['triangles']:
            triangle=pixels[face]
            left,top=np.maximum(np.floor(triangle.min(axis=0)),0).astype(int)
            right,bottom=np.minimum(np.ceil(triangle.max(axis=0)),[size-1,pixel_height-1]).astype(int)
            if left>right or top>bottom:
                continue
            a,b,c=triangle
            denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
            if abs(denominator)<1e-8:
                continue
            yy,xx=np.mgrid[top:bottom+1,left:right+1];xx=xx+.5;yy=yy+.5
            wa=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/denominator
            wb=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/denominator
            wc=1-wa-wb
            depth=wa*points[face[0],2]+wb*points[face[1],2]+wc*points[face[2],2]
            view=zbuffer[top:bottom+1,left:right+1]
            mask=(wa>=0)&(wb>=0)&(wc>=0)&(depth<view)
            uv=wa[:,:,None]*model['uv'][face[0]]+wb[:,:,None]*model['uv'][face[1]]+wc[:,:,None]*model['uv'][face[2]]
            color=texture[np.clip(((1-uv[:,:,1])*th).astype(int),0,th-1),np.clip((uv[:,:,0]*tw).astype(int),0,tw-1)].copy()
            mask &= color[:,:,3]>128
            shade=wa*intensity[face[0]]+wb*intensity[face[1]]+wc*intensity[face[2]]
            color[:,:,:3]=(color[:,:,:3]*shade[:,:,None]).astype(np.uint8)
            color[:,:,3]=255
            rgba[top:bottom+1,left:right+1][mask]=color[mask]
            view[mask]=depth[mask]
    assert np.count_nonzero(rgba[:,:,3])>10000
    assert all(value is not None and abs(value)<.012*model['height'] for model in models for value in model['footContacts'].values()), 'All feet must contact the common floor, not just one edge'
    Image.fromarray(rgba).save(destination)
    report={'renderer':'offline native-rig orthographic render', 'camera':'shared nearly eye-level orthographic, 3.6 degrees down', 'pose':'body yaw, neck/tail editorial rotations and existing-joint CCD foot placement; no limb scaling', 'ground':'shared y=0 cover plane; every native foot group within 1.2 percent of character height', 'characters':[{key:m[key] for key in ['name','height','floorError','footContacts']} for m in models], 'opaqueBounds':Image.fromarray(rgba[:,:,3]).getbbox(), 'scale':'recovered model-parent scale preserved between characters'}
    (path/'pose-review.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))


if __name__=='__main__':
    render(sys.argv[1],sys.argv[2])
