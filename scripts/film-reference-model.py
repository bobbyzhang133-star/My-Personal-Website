"""Detailed, kinematically registered transport. Executed inside build-camera-live.py."""
import math
from mathutils import Vector

TAU = math.tau
PERF = 190.0/12
HALF = 163.0
FILM_DEPTH = -130.0
# Preserve the earlier model's layout and reel sizes. Fit tooth radii to film pitch.
registration.update(pitch=190)
original_guides=[list(g) for g in registration['guides']]
for guide in registration['guides']:guide[2]=10*PERF/TAU

def mat(name, color, metal=.65, rough=.3):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
    return m
steel=mat('Aged gunmetal transport',(.25,.18,.115),.78,.34)
black=mat('Transport graphite',(.045,.055,.06),.65,.36)
brass=mat('Worn bronze fittings',(.43,.235,.09),.8,.29)
coil=mat('Wound amber film',(.065,.029,.015),.08,.36)
film=mat('Film emulsion',(.22,.11,.035),.05,.29)
edge=mat('Film edge and perforations',(.53,.33,.13),.13,.3)
laminate=mat('Film winding edge',(.10,.067,.04),.15,.5)
rubber=mat('Timing belt rubber',(.035,.028,.02),.05,.55)

# All dimensions below remain in the same source-pixel coordinate system as the gate.
def mesh_object(name, verts, faces, material, part):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj)
    mesh.materials.append(material);obj['part']=part
    return obj

def bevel(obj, width=.3):
    b=obj.modifiers.new('Machined edge bevel','BEVEL');b.width=width*unit;b.segments=2
    return obj

def ring(name,cx,cy,outer,inner,depth,thick,material,part,steps=64):
    verts=[]
    for d in [depth-thick/2,depth+thick/2]:
        for radius in [inner,outer]:
            verts.extend(point(cx+radius*math.cos(i*TAU/steps),cy+radius*math.sin(i*TAU/steps),d) for i in range(steps))
    faces=[]
    for i in range(steps):
        j=(i+1)%steps
        faces.extend([(i,j,steps+j,steps+i),(2*steps+i,3*steps+i,3*steps+j,2*steps+j),
                      (steps+i,steps+j,3*steps+j,3*steps+i),(i,2*steps+i,2*steps+j,j)])
    return mesh_object(name,verts,faces,material,part)

def cylinder(name,cx,cy,radius,depth,thick,material,part,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius*unit,depth=thick*unit,
        location=point(cx,cy,depth),rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name=name;o.data.materials.append(material);o['part']=part
    for face in o.data.polygons:face.use_smooth=len(face.vertices)==4
    return o

def radial(name,cx,cy,a,r0,r1,width,depth,material,part,thick=4):
    o=box(name,cx+(r0+r1)/2*math.cos(a),cy+(r0+r1)/2*math.sin(a),depth,r1-r0,width,thick,material,part)
    o.rotation_euler.y=a
    return o

def screw(name,x,y,d,part='mechanism',r=2.3):
    cylinder(name+' washer',x,y,r+1,d-1,1.5,black,part,24)
    cylinder(name+' hex head',x,y,r,d,2.3,steel,part,6)
    box(name+' slot',x,y,d+1.25,r*1.1,.5,.3,black,part)

# Preserve the v3 housing, structural ribs, motor, carrier, pressure frame and reels.
# Add bearing collars, recessed hardware and concentric winding detail in place.
for i,(cx,cy,r) in enumerate(registration['reels']):
    part='rotor'+str(i)
    ring('Rear winding pack',cx,cy,r-8,17,FILM_DEPTH,326,coil,part,80)
    for radius in range(21,int(r-7),2):ring('Film lamination edge',cx,cy,radius+.18,radius-.18,33.6,.25,laminate,part,80)
    bevel(ring('Raised reel rim',cx,cy,r-1,r-8,36,4,steel,part,96),.25)
    for j in range(3):
        angle=-math.pi/2+j*TAU/3
        bevel(radial('Machined spoke cap',cx,cy,angle,16,r-8,12,36,steel,part,4),.5)
        screw('Spoke recessed fastener',cx+(r-7)*math.cos(angle),cy+(r-7)*math.sin(angle),39,part,r=1.8)
    ring('Reel hub journal',cx,cy,19,9,37,5,steel,part,64)
    ring('Reel shaft bronze shoulder',cx,cy,11,7,41,3,brass,part,48)
    screw('Reel captive spindle',cx,cy,45,part,r=5)
    for a in [j*TAU/6 for j in range(6)]:
        cylinder('Hub retaining screw',cx+14*math.cos(a),cy+14*math.sin(a),1.5,34,2,black,part,12)

# Route samples store arc length and an orthonormal material-width frame.
route=[]
def append_path(p,t,w,ds=None):
    p=Vector(p);t=Vector(t).normalized();w=Vector(w);w=(w-t*w.dot(t)).normalized()
    if route and (p-Vector(route[-1]['p'])).length<1e-6:return
    distance=0 if not route else route[-1]['s']+(ds if ds is not None else (p-Vector(route[-1]['p'])).length)
    route.append({'s':distance,'p':list(p),'t':list(t),'w':list(w)})

def line(a,b,prefer=(0,0,1)):
    a=Vector(a);b=Vector(b);delta=b-a;n=max(1,math.ceil(delta.length/2))
    for i in range(n+1):append_path(a+delta*i/n,delta,prefer,delta.length/n if i else None)

def arc(center,r,a,b,depth=FILM_DEPTH):
    n=max(2,math.ceil(abs(b-a)*r/2));sign=1 if b>a else -1
    start_s=route[-1]['s'] if route else 0
    for i in range(n+1):
        theta=a+(b-a)*i/n
        append_path((center[0]+r*math.cos(theta),center[1]+r*math.sin(theta),depth),
                    (-sign*math.sin(theta),sign*math.cos(theta),0),(0,0,1),abs(b-a)*r/n if i else None)
    return start_s

def tangency(c0,r0,c1,r1,internal=False):
    delta=Vector((c1[0]-c0[0],c1[1]-c0[1]));u=delta.normalized();k=(r0+(r1 if internal else -r1))/delta.length
    n=Vector((u.y,-u.x))*(math.sqrt(1-k*k))+u*k
    p0=Vector(c0)+n*r0;p1=Vector(c1)+n*(-r1 if internal else r1)
    return p0,p1,math.atan2(n.y,n.x),math.atan2(-n.y,-n.x) if internal else math.atan2(n.y,n.x)

def build_upper(c0,c3,c2,reel_radius,r3,r2):
    global route
    route=[]
    p0,p3,a0,a3=tangency(c0,reel_radius,c3,r3)
    p3b,p2,a3b,a2=tangency(c3,r3,c2,r2,True)
    contacts=[]
    s0=arc(c0,reel_radius,a0-1.05,a0);contacts.append({'part':'rotor0','s':s0,'angle':a0-1.05,'sign':1,'radius':reel_radius})
    line((*p0,FILM_DEPTH),(*p3,FILM_DEPTH))
    s3=arc(c3,r3,a3,a3b);contacts.append({'part':'rotor3','s':s3,'angle':a3,'sign':1,'radius':r3})
    line((*p3b,FILM_DEPTH),(*p2,FILM_DEPTH))
    s2=arc(c2,r2,a2,-TAU);contacts.append({'part':'rotor2','s':s2,'angle':a2,'sign':-1,'radius':r2})

    # Controlled twist from edge-on sprocket transport to the face-on gate.
    A=Vector((c2[0]+r2,c2[1],FILM_DEPTH));B=Vector((A.x,30,FILM_DEPTH));C=Vector((480,46,FILM_DEPTH));D=Vector((480,78,FILM_DEPTH))
    curve=[]
    for i in range(101):
        t=i/100;p=(1-t)**3*A+3*(1-t)**2*t*B+3*(1-t)*t*t*C+t**3*D
        tangent=(3*(1-t)**2*(B-A)+6*(1-t)*t*(C-B)+3*t*t*(D-C)).normalized()
        curve.append((p,tangent))
    width=Vector((0,0,1));frames=[]
    for p,t in curve:
        width=(width-t*width.dot(t)).normalized();frames.append(width.copy())
    end_t=curve[-1][1];desired=Vector((1,0,0));correction=math.atan2(end_t.dot(frames[-1].cross(desired)),frames[-1].dot(desired))
    for i,((p,t),w) in enumerate(zip(curve,frames)):
        blend=max(0,min(1,(i/100-.8)/.2));a=correction*blend*blend*(3-2*blend)
        w=w*math.cos(a)+t.cross(w)*math.sin(a)+t*t.dot(w)*(1-math.cos(a))
        append_path(p,t,w)
    reading_start=route[-1]['s']
    # A developable S bend raises the film onto the gate plane without twisting artwork.
    def depth_arc(cv,cd,r,a,b):
        n=max(2,math.ceil(abs(b-a)*r/2));sign=1 if b>a else -1
        for i in range(n+1):
            theta=a+(b-a)*i/n
            append_path((480,cv+r*math.cos(theta),cd+r*math.sin(theta)),
                (0,-sign*math.sin(theta),sign*math.cos(theta)),(1,0,0),abs(b-a)*r/n if i else None)
    depth_arc(78,-116.5,13.5,-math.pi/2,0)
    line((480,91.5,-116.5),(480,91.5,19.5),(1,0,0))
    depth_arc(105,19.5,13.5,math.pi,math.pi/2)
    return list(route),contacts,reading_start

c0=registration['reels'][0][:2];c3=registration['guides'][1][:2];c2=registration['guides'][0][:2]
r3=registration['guides'][1][2];r2=registration['guides'][0][2]
upper,contacts,reading_start=build_upper(c0,c3,c2,registration['reels'][0][2]-8,r3,r2)
lower_reel=[960-registration['reels'][1][0],680-registration['reels'][1][1]]
lower_far=[960-registration['guides'][2][0],680-registration['guides'][2][1]]
lower_near=[960-registration['guides'][3][0],680-registration['guides'][3][1]]
lower,lower_contacts,lower_reading=build_upper(lower_reel,lower_far,lower_near,registration['reels'][1][2]-8,r3,r2)
route=list(upper)
# The film visibly wraps a 120-degree arc around each front guide roller.
# Its width remains rigid across the roller; the selected exposure stays flat.
roller_radius=6.0
roller_top=228.0
roller_start=roller_top-2*roller_radius*math.cos(math.pi/6)
roller_end=roller_top+2*roller_radius*math.cos(math.pi/6)
lower_center=418.0
lower_start=lower_center-2*roller_radius*math.cos(math.pi/6)
lower_end=lower_center+2*roller_radius*math.cos(math.pi/6)
def front_arc(cv,cd,r,a,b):
    n=max(2,math.ceil(abs(b-a)*r/1.5));sign=1 if b>a else -1
    for i in range(n+1):
        theta=a+(b-a)*i/n
        append_path((480,cv+r*math.cos(theta),cd+r*math.sin(theta)),
            (0,-sign*math.sin(theta),sign*math.cos(theta)),(1,0,0),abs(b-a)*r/n if i else None)
line((480,105,33),(480,roller_start,33),(1,0,0))
front_arc(roller_start,33+roller_radius,roller_radius,-math.pi/2,-math.pi/6)
upper_contact=route[-1]['s']
front_arc(roller_top,33,roller_radius,5*math.pi/6,math.pi/6)
front_arc(roller_end,33+roller_radius,roller_radius,7*math.pi/6,3*math.pi/2)
flat_start=route[-1]['s']
line((480,roller_end,33),(480,lower_start,33),(1,0,0))
gate_distance=flat_start+(323-roller_end)
front_arc(lower_start,33+roller_radius,roller_radius,-math.pi/2,-math.pi/6)
front_arc(lower_center,33,roller_radius,5*math.pi/6,math.pi/6)
front_arc(lower_end,33+roller_radius,roller_radius,7*math.pi/6,3*math.pi/2)
line((480,lower_end,33),(480,575,33),(1,0,0))
reading_end=route[-1]['s']
lower_offset=route[-1]['s']
for i in range(len(lower)-2,-1,-1):
    sample=lower[i];p=sample['p'];t=sample['t'];w=sample['w']
    append_path((960-p[0],680-p[1],p[2]),(t[0],t[1],-t[2]),(w[0],w[1],-w[2]),lower[i+1]['s']-sample['s'])
length=route[-1]['s'];origin=PERF/2-gate_distance
# Maintain width handedness through the mirrored lower loop.
for sample in route:
    sample['p']=[round(v,8) for v in sample['p']];sample['t']=[round(v,9) for v in sample['t']];sample['w']=[round(v,9) for v in sample['w']]

# Correct float32 construction drift on straight reading spans. Their travel
# distance must equal their exact source-coordinate Y difference.
old_distances=[q['s'] for q in route]
for i in range(1,len(route)):
    a,b=route[i-1],route[i]
    flat=abs(a['p'][2]-33)<1e-7 and abs(b['p'][2]-33)<1e-7 and abs(a['t'][1]-1)<1e-7 and abs(b['t'][1]-1)<1e-7 and abs(a['p'][0]-480)<1e-7 and abs(b['p'][0]-480)<1e-7
    ds=b['p'][1]-a['p'][1] if flat else old_distances[i]-old_distances[i-1]
    b['s']=a['s']+ds
for a,b in zip(route,route[1:]):
    if a['p'][1]<=323<=b['p'][1] and abs(a['p'][2]-33)<1e-7 and abs(b['p'][2]-33)<1e-7:
        gate_distance=a['s']+323-a['p'][1];break
length=route[-1]['s'];origin=PERF/2-gate_distance
reading_end=next(q['s'] for q in route if abs(q['p'][1]-575)<1e-6 and abs(q['p'][2]-33)<1e-6)

# Source-pixel path interpolation shared with runtime via exported samples.
def sample_route(s,samples=route):
    s=max(0,min(samples[-1]['s'],s));lo=0;hi=len(samples)-1
    while hi-lo>1:
        m=(lo+hi)//2
        if samples[m]['s']<=s:lo=m
        else:hi=m
    a=samples[lo];b=samples[hi];f=(s-a['s'])/(b['s']-a['s']) if b['s']!=a['s'] else 0
    t=Vector(a['t']).lerp(Vector(b['t']),f).normalized();w=Vector(a['w']).lerp(Vector(b['w']),f);w=(w-t*w.dot(t)).normalized()
    return Vector(a['p']).lerp(Vector(b['p']),f),t,w

def surface(s,lateral,samples=route):
    p,t,w=sample_route(s,samples);p+=w*lateral
    return point(*p)

def ribbon(name,lo,hi,material,part,samples=route):
    verts=[];faces=[]
    for sample in samples:
        s=sample['s'];verts.extend([surface(s,lo,samples),surface(s,hi,samples)])
    for i in range(len(samples)-1):faces.append((2*i,2*i+1,2*i+3,2*i+2))
    return mesh_object(name,verts,faces,material,part)

ribbon('Continuous threaded film',-147,147,film,'stock')
for sign in [-1,1]:
    ribbon('Inner perforation rail',sign*147,sign*150,edge,'stock')
    ribbon('Outer perforation rail',sign*160,sign*163,edge,'stock')
verts=[];faces=[]
for k in range(math.floor(origin/PERF)-2,math.ceil((length+origin)/PERF)+2):
    s=k*PERF-origin
    if s-4<0 or s+4>length:continue
    for sign in [-1,1]:
        i=len(verts);verts.extend([surface(s-4,sign*150),surface(s-4,sign*160),surface(s+4,sign*160),surface(s+4,sign*150)])
        faces.append((i,i+1,i+2,i+3))
mesh_object('Traveling perforation bridges',verts,faces,edge,'perforations')
pivots['stock']=[0,0,0];pivots['perforations']=[0,0,0]

# Sprocket teeth share the film-hole pitch and use a baked material-phase offset.
for index,(cx,cy,r) in enumerate(registration['guides'],2):
    part='rotor'+str(index);pivots[part]=list(conversion.to_3x3() @ Vector(point(cx,cy,0)))
    top=next(c for c in contacts if c['part']==('rotor'+str(index) if index<4 else 'rotor'+str(7-index)))
    if index<4:
        phase=top['angle']+top['sign']*(PERF/2-origin-top['s'])/r;sign=top['sign']
    else:
        # Mirror/reverse the original contact and preserve tooth/material registration.
        top=next(c for c in lower_contacts if c['part']==('rotor'+str(7-index)))
        contact_s=length-top['s'];theta=top['angle']+math.pi;sign=-top['sign']
        phase=theta+sign*(PERF/2-origin-contact_s)/r
    count=round(TAU*r/PERF)
    bevel(box('Sprocket bearing mount',cx,cy,-290,30,38,50,black,'mechanism'),2)
    cylinder('Sprocket bearing shaft',cx,cy,6,-130,354,steel,'mechanism')
    cylinder('Sprocket drum',cx,cy,r-1,FILM_DEPTH,326,black,part,64)
    ring('Sprocket front retainer',cx,cy,r-3,7,39,4,steel,part)
    for angle in [j*TAU/count+phase for j in range(count)]:
        for d in [FILM_DEPTH-155,FILM_DEPTH+155]:
            radial('Perforation-engaging sprocket tooth',cx,cy,angle,r-1,r+1.5,5,d,brass,part,6)
    cylinder('Sprocket raised hub',cx,cy,7,44,6,brass,part)
    screw('Sprocket shaft lock',cx,cy,49,part,r=2.7)

# True involute tooth outlines with matching module, open webs and mechanical fasteners.
gears=[(260,450,32,0),(195,450,20,math.pi/20),(147.5,450,18,0)]
module=2.5
for i,(cx,cy,count,phase) in enumerate(gears):
    part='gear'+str(i);rp=module*count/2;rb=rp*math.cos(math.radians(20));ra=rp+module;rf=rp-1.25*module
    outline=[];inv_pitch=math.tan(math.radians(20))-math.radians(20)
    for tooth in range(count):
        c=tooth*TAU/count+phase;half=math.pi/(2*count)
        def flank(radius):
            alpha=math.acos(min(1,rb/radius));return half+inv_pitch-(math.tan(alpha)-alpha)
        outline.append((rf,c-math.pi/count))
        outline.append((rf,c-flank(rb)))
        for j in range(6):
            rr=rb+(ra-rb)*j/5;outline.append((rr,c-flank(rr)))
        for j in range(5,-1,-1):
            rr=rb+(ra-rb)*j/5;outline.append((rr,c+flank(rr)))
        outline.append((rf,c+flank(rb)))
    verts=[];inner=rp*.63
    for d in [67,73]:
        for layer in [0,1]:
            verts.extend(point(cx+(r if layer else inner)*math.cos(a),cy+(r if layer else inner)*math.sin(a),d) for r,a in outline)
    n=len(outline);faces=[]
    for j in range(n):
        k=(j+1)%n;faces.extend([(j,k,n+k,n+j),(2*n+j,3*n+j,3*n+k,2*n+k),(n+j,n+k,3*n+k,3*n+j),(j,2*n+j,2*n+k,k)])
    bevel(mesh_object('Involute drive gear',verts,faces,steel,part),.2)
    pivots[part]=list(conversion.to_3x3() @ Vector(point(cx,cy,0)))
    for a in [phase+j*TAU/5 for j in range(5)]:bevel(radial('Gear web spoke',cx,cy,a,7,inner+1,4,70,steel,part,6),.4)
    cylinder('Gear hub',cx,cy,8,75,9,brass,part)
    screw('Gear shaft lock',cx,cy,81,part,r=3)
    bevel(box('Gear bearing seat',cx,cy,-270,26,28,30,black,'mechanism'),2)
    cylinder('Gear axle',cx,cy,4,-95,355,steel,'mechanism')

# Open timing belt couples the driven gear shaft to the upper sprocket shaft.
belt=[]
saved_route=route;route=belt
A=(260,450);B=tuple(c2);r=11;delta=Vector((B[0]-A[0],B[1]-A[1])).normalized();n=Vector((-delta.y,delta.x));a=math.atan2(n.y,n.x)
line((A[0]+r*n.x,A[1]+r*n.y,86),(B[0]+r*n.x,B[1]+r*n.y,86))
arc(B,r,a,a-math.pi,86)
line((B[0]-r*n.x,B[1]-r*n.y,86),(A[0]-r*n.x,A[1]-r*n.y,86))
arc(A,r,a-math.pi,a-TAU,86)
route=saved_route
for sample in belt:sample['w']=[sample['t'][1],-sample['t'][0],0]
ribbon('Closed timing drive belt',-2,2,rubber,'mechanism',belt)
for x,y,part in [(260,450,'gear0'),(*c2,'rotor2')]:
    ring('Timing pulley rim',x,y,12,7,83,5,brass,part)
    ring('Timing pulley groove',x,y,11,8,87,2,black,part)

# The motor input is fixed to the backplate; the third gear is its visible output.
bevel(box('Auxiliary drive casing',147.5,505,-200,142,65,160,black,'mechanism'),5)
for y in [485,495,505,515,525]:box('Motor cooling slot',147.5,y,-118,92,2,3,steel,'mechanism')
for x in [87,208]:
    for y in [480,530]:screw('Motor housing fastener',x,y,-114,r=2.5)
cylinder('Motor shaft collar',147.5,450,12,-195,80,brass,'mechanism')

# Slider-crank: a real connecting rod follows the eccentric, not a detached UI effect.
belt_direction=(Vector(B)-Vector(A)).normalized()
belt_normal=Vector((-belt_direction.y,belt_direction.x))
contact_fraction=(324-A[1]-11*belt_normal.y)/(B[1]-A[1])
cam_contact=Vector(A)+(Vector(B)-Vector(A))*contact_fraction+11*belt_normal
cam_radius=11/r2*registration['pitch']/TAU
cam=tuple(cam_contact+cam_radius*belt_normal)
pivots['cam']=list(conversion.to_3x3() @ Vector(point(*cam,0)))
cylinder('Pull-down eccentric cam',*cam,13,68,7,steel,'cam')
ring('Backside timing idler',*cam,cam_radius,7,85,4,brass,'cam',72)
ring('Cam timing groove',*cam,cam_radius-.6,8,88,2,black,'cam',72)
cylinder('Eccentric crank pin',cam[0],cam[1]+7,4,76,8,brass,'cam')
rod_length=64
rod=bevel(box('Pull-down connecting rod',cam[0],cam[1]+7+rod_length/2,76,5,rod_length,4,steel,'rod'),1)
for y in [cam[1]+7,cam[1]+7+rod_length]:ring('Connecting rod eye',cam[0],y,6,4.1,78,4,brass,'rod',32)
pivots['rod']=list(conversion.to_3x3() @ Vector(point(cam[0],cam[1]+7+rod_length/2,76)))
bevel(box('Slider guide',cam[0],cam[1]+rod_length,65,14,35,14,black,'mechanism'),1)
box('Pull-down slider shoe',cam[0],cam[1]+7+rod_length,75,9,10,8,brass,'slider')
cylinder('Slider joint pin',cam[0],cam[1]+7+rod_length,4,80,4,steel,'slider',32)
pivots['slider']=list(conversion.to_3x3() @ Vector(point(cam[0],cam[1]+7+rod_length,75)))

# Retain all original pressure rails; add the engaging registration pins.
u,v,w,h=registration['gate']
for x in [480-155,480+155]:
    cylinder('Registration pin',x,323,2.2,31,12,steel,'registration',24)
    ring('Registration bearing',x,323,4,2.3,24,3,brass,'mechanism',24)
pivots['registration']=[0,0,0]

# Kinematic ratios are all derived from the same path distance (source pixels).
drives={c['part']:-c['sign']/c['radius'] for c in contacts}
drives.update(rotor1=1/(registration['reels'][1][2]-8),rotor4=1/r3,rotor5=-1/r2,gear0=1/r2,gear1=-40/25/r2,gear2=40/22.5/r2,cam=-TAU/registration['pitch'])
transport_metadata={'path':route,'length':length,'gateDistance':gate_distance,'materialOrigin':origin,
    'perforationPitch':PERF,'bridgeLength':8,'halfWidth':HALF,'drives':drives,'axes':{'nip0':'x','nip1':'x'},
    'belt':{'path':belt,'length':belt[-1]['s'],'factor':11/r2},
    'contacts':contacts,'gears':[{'part':'gear'+str(i),'center':[g[0],g[1]],'radius':module*g[2]/2,'teeth':g[2]} for i,g in enumerate(gears)],
    'crank':{'center':list(cam),'eccentricity':7,'rodLength':rod_length,'depth':76,'phase':math.pi/2,'sliderRest':cam[1]+7+rod_length,'idlerRadius':cam_radius,'beltContact':list(cam_contact)},
    'readingRange':[upper[-1]['s'],reading_end],
    'surfaceBands':[[-147,147],[-150,-147],[147,150],[-163,-160],[160,163]]}
print('TRANSPORT_ROUTE',len(route),'samples',round(length,2),'pixels; gate',round(gate_distance,2))

print('RIBBON_BOUNDS',[(min(surface(q['s'],a)[axis] for q in route for a in [-HALF,HALF]),max(surface(q['s'],a)[axis] for q in route for a in [-HALF,HALF])) for axis in range(3)])

# Reference-led additions: bolted bearing bridges, machined inspection panels,
# capped grease ports and rigid conduits. The v3 fixed casting remains underneath.
for x,y,w,h in [(215,430,200,146),(750,175,118,156),(760,440,118,60)]:
    bevel(box('Recessed inspection plate',x,y,17,w,h,9,black,'mechanism'),4)
    for xx in [x-w/2+10,x+w/2-10]:
        for yy in [y-h/2+10,y+h/2-10]:screw('Inspection captive bolt',xx,yy,25,r=3)
for cx,cy,r in registration['guides']:
    # Three exposed retaining bolts bolt each bearing to the earlier support.
    for a in [math.pi/6+j*TAU/3 for j in range(3)]:
        screw('Bearing flange retainer',cx+(r+5)*math.cos(a),cy+(r+5)*math.sin(a),17,r=1.8)
for x,y in [(192,545),(750,155),(755,430)]:
    ring('Oil port raised boss',x,y,7,3,26,5,brass,'mechanism',40)
    screw('Oil port plug',x,y,29,r=3)
for y in [72,197,487,616]:
    # Tension cross ties sit outside the readable film and do not obstruct the gate.
    for x in [255,705]:
        bevel(box('Guide cross tie',x,y,10,74,9,12,black,'mechanism'),1)
        for xx in [x-27,x+27]:screw('Cross tie screw',xx,y,18,r=2)

def conduit(name,points,radius,material):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius*unit;data.bevel_resolution=3
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for q,p in zip(spline.points,points):q.co=(*point(*p),1)
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj['part']='mechanism';obj.data.materials.append(material)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
conduit('Rigid lubrication line',[(750,155,20),(782,155,20),(797,170,20),(797,392,20),(782,430,20),(755,430,20)],2,brass)
for y in [185,260,370]:
    bevel(box('Conduit saddle',797,y,24,10,14,4,steel,'mechanism'),1)
    screw('Conduit saddle lock',797,y+5,28,r=1.4)


# Full-width polished rollers, fixed bearing blocks and visible turning end hardware.
for index,cy in enumerate([roller_top,lower_center]):
    part='nip'+str(index);pivots[part]=list(conversion.to_3x3() @ Vector(point(480,cy,33)))
    body=cylinder('Full width guide roller',480,cy,roller_radius,33,334,steel,part,96)
    body.rotation_euler=(0,math.pi/2,0)
    for x in [310,650]:
        bevel(box('Guide roller bearing block',x,cy,20,16,2*roller_radius+12,36,black,'mechanism'),3)
        for yy in [cy-roller_radius-3,cy+roller_radius+3]:screw('Guide roller bearing screw',x,yy,40,r=2.2)
        cap=cylinder('Guide roller captive end',x,cy,roller_radius+2,33,8,brass,part,72);cap.rotation_euler=(0,math.pi/2,0)
        for j in range(12):
            a=j*TAU/12
            o=box('Roller end knurl',x,cy+(roller_radius+2)*math.cos(a),33+(roller_radius+2)*math.sin(a),9,2,2,steel,part)
            o.rotation_euler.x=a
    drives[part]=1/roller_radius
transport_metadata['frontRollers']={'centers':[[480,roller_top,33],[480,lower_center,33]],'radius':roller_radius,'upperContact':upper_contact,'wrapRadians':2*math.pi/3}
