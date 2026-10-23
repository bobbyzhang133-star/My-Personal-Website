"""Read supplied Unity assets, never run game code or modify the original build.

Requires UnityPy 1.25.4 in the user-approved isolated extraction environment.
Exports unchanged topology/UVs, bind poses/weights, source hierarchy and textures.
The JSON is a recovery interchange, not a claimed FBX or original Unity project.
"""
import json
import sys
from pathlib import Path

import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler


def vector(value, fields):
    return [getattr(value, field) for field in fields]


def recover(source, destination):
    target = Path(destination)
    target.mkdir(parents=True, exist_ok=True)
    env = UnityPy.load(str(Path(source) / 'level1'))
    manifest = {'source': str(source), 'extractor': UnityPy.__version__, 'characters': []}
    for obj in env.objects:
        if obj.type.name != 'SkinnedMeshRenderer' or obj.path_id not in (9034, 9035):
            continue
        renderer = obj.read()
        name = 'rat' if obj.path_id == 9034 else 'cat'
        mesh = renderer.m_Mesh.read()
        handler = MeshHandler(mesh)
        handler.process()
        transforms = {}

        def visit(pointer):
            if pointer.path_id in transforms:
                return
            transform = pointer.read()
            transforms[pointer.path_id] = {
                'id': pointer.path_id, 'name': transform.m_GameObject.read().m_Name,
                'parent': transform.m_Father.path_id,
                'position': vector(transform.m_LocalPosition, 'xyz'),
                'rotation': vector(transform.m_LocalRotation, 'xyzw'),
                'scale': vector(transform.m_LocalScale, 'xyz'),
            }
            for child in transform.m_Children:
                visit(child)

        mesh_transform = next(component.component for component in renderer.m_GameObject.read().m_Component if component.component.type.name == 'Transform')
        root = mesh_transform.read().m_Father
        visit(root)
        transforms[root.path_id]['parent'] = 0
        # Drop scene placement only; keep imported-model/bone transforms intact.
        transforms[root.path_id]['position'] = [0, 0, 0]
        material = renderer.m_Materials[0].read()
        texture = next(value.m_Texture.read() for key, value in material.m_SavedProperties.m_TexEnvs if key == '_MainTex' and value.m_Texture.path_id)
        texture.image.save(target / (name + '-original-texture.png'))
        data = {
            'name': name, 'rendererID': obj.path_id, 'meshID': renderer.m_Mesh.path_id,
            'texture': name + '-original-texture.png', 'sourceTexture': texture.m_Name,
            'meshTransform': mesh_transform.path_id, 'root': root.path_id,
            'vertices': [dict(zip('xyz', value)) for value in handler.m_Vertices],
            'normals': [dict(zip('xyz', value[:3])) for value in handler.m_Normals],
            'uv': [dict(zip('xy', value)) for value in handler.m_UV0],
            'triangles': [index for submesh in handler.get_triangles() for triangle in submesh for index in triangle],
            'bones': [bone.path_id for bone in renderer.m_Bones],
            'weights': [{'indices': list(indices), 'values': list(weights)} for indices, weights in zip(handler.m_BoneIndices, handler.m_BoneWeights)],
            'bindposes': [{'values': [getattr(matrix, 'e'+str(row)+str(column)) for row in range(4) for column in range(4)]} for matrix in mesh.m_BindPose],
            'transforms': list(transforms.values()),
        }
        assert len(data['vertices']) == len(data['weights']) == len(data['uv'])
        assert all(index < len(data['vertices']) for index in data['triangles'])
        assert all(bone in transforms for bone in data['bones'])
        (target / (name + '-rig.json')).write_text(json.dumps(data, separators=(',', ':')))
        (target / (name + '-original.obj')).write_text(mesh.export())
        manifest['characters'].append({'name': name, 'mesh': mesh.m_Name, 'vertices': len(data['vertices']), 'triangles': len(data['triangles'])//3, 'bones': len(data['bones']), 'texture': texture.m_Name})
    assert len(manifest['characters']) == 2
    (target / 'recovery-manifest.json').write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest))


if __name__ == '__main__':
    recover(sys.argv[1], sys.argv[2])
