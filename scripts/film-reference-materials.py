"""Original seamless cast-metal grain for the native Blender/WebGL model."""
import numpy as np
rng=np.random.default_rng(65)
size=512
# Periodic filtered noise creates cast grain, fine pores and restrained wear.
field=np.zeros((size,size));ky=np.fft.fftfreq(size)[:,None];kx=np.fft.fftfreq(size)[None,:]
for scale,weight in [(3,.44),(11,.28),(45,.18),(130,.10)]:
    grid=rng.normal(size=(size,size));spectrum=np.fft.fft2(grid)
    filtered=np.fft.ifft2(spectrum*np.exp(-(kx*kx+ky*ky)*size*size/(2*scale*scale))).real
    filtered/=max(filtered.std(),.001);field+=weight*filtered
field=np.clip(field,-2,2)
fine=rng.random((size,size));grain=np.clip(.83+field*.065+(fine-.5)*.075,.55,.98)
# Thin machining hairlines; intentionally subtle at actual display size.
grain-=((np.arange(size)[:,None]%29==0)*.025)
def image_file(name,values):
    image=bpy.data.images.new(name,width=size,height=size,alpha=True)
    pixels=np.ones((size,size,4),dtype=np.float32)
    if values.ndim==2:pixels[:,:,:3]=values[:,:,None]
    else:pixels[:,:,:3]=values
    image.pixels.foreach_set(pixels.ravel());image.filepath_raw=str(assets/(name+'.png'));image.file_format='PNG';image.save();image.pack()
    return image
patina=image_file('cast-metal-patina',np.stack([grain,grain*.985,grain*.96],axis=-1))
relief=image_file('cast-metal-relief',np.clip(.5+field*.12+(fine-.5)*.2,0,1));relief.colorspace_settings.name='Non-Color'
textures_metadata={'patina':'cast-metal-patina.png','relief':'cast-metal-relief.png','uvScale':120,'bumpScale':.000012}
weathered=[]
for material in list(source_materials[10:])+[steel,black,brass]:
    if any(word in material.name for word in ['Wound film','celluloid','index']):continue
    if material in weathered:continue
    weathered.append(material)
    nodes=material.node_tree.nodes;links=material.node_tree.links
    shader=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    base=tuple(shader.inputs['Base Color'].default_value)
    texture=nodes.new('ShaderNodeTexImage');texture.image=patina;texture.extension='REPEAT'
    mixed=nodes.new('ShaderNodeMixRGB');mixed.blend_type='MULTIPLY';mixed.inputs[0].default_value=1;mixed.inputs[1].default_value=base
    links.new(texture.outputs['Color'],mixed.inputs[2]);links.new(mixed.outputs[0],shader.inputs['Base Color'])
    bumptex=nodes.new('ShaderNodeTexImage');bumptex.image=relief;bumptex.extension='REPEAT'
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.000012
    links.new(bumptex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    material['weathered']=True
# Native GLB and runtime UVs use the same surface coordinates. They rotate with parts.
for obj in scene.objects:
    if obj.type!='MESH':continue
    mesh=obj.data;uv=mesh.uv_layers.new(name='Machined surface')
    for polygon in mesh.polygons:
        for li in polygon.loop_indices:
            v=obj.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=((v.x-.043)/unit/120,(v.z-.135)/unit/120)
