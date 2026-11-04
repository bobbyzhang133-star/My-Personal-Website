"""Refine the approved live camera mesh in Blender and export articulated WebGL geometry."""
import array
import json
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

root = Path(__file__).resolve().parents[1]
assets = root / "public/portfolio/assets/room/camera-live-v2"
evidence = root / "artifacts/film-exposure"
assets.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True)
previous = bpy.context.window.scene
source = root / "public/portfolio/assets/room/camera-live-v1"
approved = json.loads((source / "camera.json").read_text())
values = array.array("f")
values.frombytes((source / "camera.bin").read_bytes())
scene = bpy.data.scenes.new("Cinema Exposure v2")
bpy.context.window.scene = scene
conversion = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
inverse = conversion.inverted()
unit = approved["unit"]
registration = approved["gate"]
pivots = approved["pivots"]
source_materials = []
for item in approved["materials"]:
    material = bpy.data.materials.new(item["name"])
    material.use_nodes = True
    node = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    node.inputs["Base Color"].default_value = (*item["color"], 1)
    node.inputs["Metallic"].default_value = item["metalness"]
    node.inputs["Roughness"].default_value = item["roughness"]
    material.diffuse_color = (*item["color"], 1)
    source_materials.append(material)

# Reconstruct the approved evaluated mesh exactly. No inactive-scene dependency
# graph can reset its part placements; every source vertex and corner normal is kept.
for source_index, item in enumerate(approved["meshes"]):
    offset, count = item["positionOffset"], item["count"]
    vertices = [inverse.to_3x3() @ Vector(values[i:i+3]) for i in range(offset, offset+count, 3)]
    offset = item["normalOffset"]
    normals = [inverse.to_3x3() @ Vector(values[i:i+3]) for i in range(offset, offset+count, 3)]
    mesh = bpy.data.meshes.new(item["part"] + " approved geometry")
    mesh.from_pydata(vertices, [], [tuple(range(i, i+3)) for i in range(0, len(vertices), 3)])
    mesh.polygons.foreach_set("use_smooth", [True]*len(mesh.polygons))
    mesh.normals_split_custom_set(normals)
    obj = bpy.data.objects.new(item["objects"][0], mesh)
    scene.collection.objects.link(obj)
    obj["part"] = item["part"]
    obj["approved_source_batch"] = source_index
    mesh.materials.append(source_materials[item["material"]])

bronze = next(material for material in source_materials if material.name.startswith("Oxidized bronze"))
stock_material = source_materials[-1]
def point(u, v, depth=0):
    return (.043+(u-480)*unit, -.106-depth*unit, .135+(340-v)*unit)
def box(name, u, v, depth, w, h, thickness, material, part):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(u, v, depth))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (w*unit, thickness*unit, h*unit)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    obj["part"] = part
    return obj

u, v, w, h = registration["gate"]
for name, x, y, bw, bh in [
    ("Left exposure pressure rail", u-5, v+h/2, 8, h+14),
    ("Right exposure pressure rail", u+w+5, v+h/2, 8, h+14),
    ("Upper exposure pressure rail", u+w/2, v-5, w+18, 8),
    ("Lower exposure pressure rail", u+w/2, v+h+5, w+18, 8),
]:
    rail = box(name, x, y, 40, bw, bh, 5, bronze, "mechanism")
    bevel = rail.modifiers.new("Machined edge radius", "BEVEL")
    bevel.width = unit*1.25
    bevel.segments = 3
bpy.context.view_layer.update()

materials = []
material_indices = {}
groups = {}
depsgraph = bpy.context.evaluated_depsgraph_get()
for obj in list(scene.objects):
    if obj.type != "MESH" or obj.hide_render:
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    matrix = conversion @ obj.matrix_world
    normal_matrix = matrix.to_3x3().inverted().transposed()
    for triangle in mesh.loop_triangles:
        material = mesh.materials[triangle.material_index] if mesh.materials else stock_material
        key = material.name
        if key not in material_indices:
            node = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if material.use_nodes else None
            material_indices[key] = len(materials)
            materials.append({
                "name": key,
                "color": list(node.inputs["Base Color"].default_value[:3]) if node else list(material.diffuse_color[:3]),
                "metalness": node.inputs["Metallic"].default_value if node else 0,
                "roughness": node.inputs["Roughness"].default_value if node else .45,
            })
        part = obj.get("part", "mechanism")
        group = groups.setdefault((part, material_indices[key]), {"positions": [], "normals": [], "objects": set()})
        group["objects"].add(obj.name)
        for loop_index in triangle.loops:
            loop = mesh.loops[loop_index]
            position = matrix @ mesh.vertices[loop.vertex_index].co
            normal = (normal_matrix @ mesh.corner_normals[loop_index].vector).normalized()
            if "approved_source_batch" in obj:
                source_batch = approved["meshes"][obj["approved_source_batch"]]
                normal_offset = source_batch["normalOffset"] + loop.vertex_index*3
                # Preserve the approved per-corner normal even for the source's
                # zero-area bevel seam triangles, which Blender recalculates as zero.
                normal = Vector(values[normal_offset:normal_offset+3])
            group["positions"].extend(position)
            group["normals"].extend(normal)
    evaluated.to_mesh_clear()

binary = array.array("f")
meshes = []
for (part, material), group in groups.items():
    position_offset = len(binary)
    binary.extend(group["positions"])
    normal_offset = len(binary)
    binary.extend(group["normals"])
    meshes.append({"part": part, "material": material, "positionOffset": position_offset,
                   "normalOffset": normal_offset, "count": len(group["positions"]),
                   "objects": sorted(group["objects"])})
(assets / "camera.bin").write_bytes(binary.tobytes())
data = {
    "id": "studio-65-live-mesh-v2", "meshes": meshes, "materials": materials, "pivots": pivots,
    "unit": unit, "plane": {"x": .043, "y": .135, "z": .106}, "gate": registration,
    "room": {"size": [310, 231], "span": .706, "target": [-.026, .201, 0],
             "offset": [-1.48, 1.07, 3.4], "contact": [-.1875, 0, .123]},
    "triangles": sum(group["count"] for group in meshes)//9,
}
(assets / "camera.json").write_text(json.dumps(data, separators=(",", ":"))+"\n")
bpy.context.window.scene = scene
bpy.ops.object.select_all(action="DESELECT")
for obj in scene.objects:
    if obj.type == "MESH" and not obj.hide_render:
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(assets / "camera.glb"), export_format="GLB", use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(evidence / "camera-live.blend"), copy=True)
bpy.context.window.scene = previous
print("LIVE_CAMERA", data["triangles"], "triangles", len(meshes), "material/part batches")
