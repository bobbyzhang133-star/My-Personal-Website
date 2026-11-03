"""Author a tabletop 65 mm camera in an isolated Blender scene."""
import json
from math import cos, pi, sin
from pathlib import Path

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
assets = root / "public/portfolio/assets/room/cinema-camera"
evidence = root / "artifacts/films-camera"
scene = bpy.data.scenes.new("Cinema Camera Authoring")
previous = bpy.context.window.scene
scene.world = bpy.data.worlds.new("Studio Bounce")
bpy.context.window.scene = scene

def material(name, rgb, metallic=0, roughness=.48):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = mat.diffuse_color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat

body = material("Warm gray cast enamel", (.29, .265, .215), .15)
dark = material("Blackened steel", (.023, .025, .028), .27)
metal = material("Brushed warm aluminum", (.43, .31, .18), .6)
silver = material("Edge fittings", (.63, .53, .36), .52)
cream = material("Cream equipment stencil", (.96, .79, .51))
glass = material("Blue-green optical coating", (.026, .065, .075), .3, .28)
film = material("Amber film base", (.34, .14, .046), .15)
magazine = material("Sand-gray magazine casting", (.37, .34, .275), .15)
optical_highlight = material("Pale teal optical reflection", (.065, .13, .15), .22, .3)
indicator = material("Amber pilot lens", (.56, .18, .035), .1)
parts = []

def finish(name, mat, bevel):
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Machined edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")
    parts.append(obj)
    return obj

def box(name, location, dimensions, mat, bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    bpy.context.object.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(name, mat, bevel)

def cylinder(name, location, radius, depth, axis, mat, bevel=.003, sides=24):
    rotation = Vector(axis).to_track_quat("Z", "Y").to_euler()
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=radius, depth=depth,
                                       location=location, rotation=rotation)
    return finish(name, mat, bevel)

box("Desk mounting skid", (.04, 0, .012), (.455, .246, .024), dark)
box("Camera body", (.04, 0, .136), (.40, .22, .224), body, .017)
box("Service door", (.043, -.115, .135), (.35, .014, .182), dark, .01)
box("Door panel", (.043, -.124, .135), (.321, .008, .155), body, .008)
reel_specs = [(-.035, .329, .104, "Supply"), (.13, .307, .076, "Take-up")]

def magazine_shell(name, center_y, depth, inset, mat):
    # A rounded common housing encloses the two independent reel assemblies.
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    for x, z, radius, _ in reel_specs:
        for y in [center_y - depth / 2, center_y + depth / 2]:
            for index in range(24):
                angle = 2 * pi * index / 24
                bm.verts.new((x + (radius - inset) * cos(angle), y,
                              z + (radius - inset) * sin(angle)))
    hull = bmesh.ops.convex_hull(bm, input=list(bm.verts))
    bmesh.ops.delete(bm, geom=hull["geom_interior"], context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    return finish(name, mat, .004)

box("Magazine shoe", (.052, 0, .249), (.252, .165, .035), dark, .006)
magazine_shell("Common magazine housing", 0, .176, 0, magazine)
magazine_shell("Removable magazine face", -.09, .017, .007, magazine)
for x, z, radius, name in reel_specs:
    cylinder(name + " reel", (x, 0, z), radius - .013, .041, (0, 1, 0), silver)
    cylinder(name + " wound film", (x, 0, z), radius - .022, .047, (0, 1, 0), film)

# The displacement magazine has a continuous cover over both reels.
for x, z in [(-.094, .365), (-.062, .409), (.119, .361), (.181, .311), (.134, .256)]:
    cylinder("Magazine cover fastener", (x, -.100, z), .006, .004,
             (0, 1, 0), dark, sides=12)
box("Magazine latch recess", (.048, -.103, .280), (.043, .010, .021), dark)
box("Magazine latch lever", (.048, -.110, .281), (.031, .009, .008), silver)
# The separate reflex finder sits above the taking lens.
box("Reflex finder bracket", (-.150, -.061, .255), (.045, .048, .062), dark)
cylinder("Reflex finder tube", (-.213, -.062, .274), .018, .104, (1, 0, 0), dark)
cylinder("Finder adjustment collar", (-.235, -.062, .274), .023, .019, (1, 0, 0), metal)
cylinder("Rubber finder eyecup", (-.268, -.062, .274), .026, .022, (1, 0, 0), dark)
for x, r, depth, mat in [(-.169,.074,.032,metal),(-.204,.068,.057,dark),
                         (-.235,.073,.018,body),(-.253,.073,.017,metal),
                         (-.274,.083,.029,dark)]:
    cylinder("Lens barrel / optical stack", (x, 0, .17), r, depth, (1, 0, 0), mat)

# A hollow threaded rim projects past the single glass surface.
profile = [(-.285,.082),(-.300,.082),(-.311,.078),(-.311,.068),
           (-.307,.066),(-.300,.066),(-.297,.064),(-.289,.064)]
sides = 32
vertices = [(x, radius*cos(2*pi*i/sides), .17 + radius*sin(2*pi*i/sides))
            for x, radius in profile for i in range(sides)]
faces = [(ring*sides+i, ring*sides+(i+1)%sides,
          ((ring+1)%len(profile))*sides+(i+1)%sides, ((ring+1)%len(profile))*sides+i)
         for ring in range(len(profile)) for i in range(sides)]
rim_mesh = bpy.data.meshes.new("Hollow front rim")
rim_mesh.from_pydata(vertices, [], faces)
bm = bmesh.new()
bm.from_mesh(rim_mesh)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(rim_mesh)
bm.free()
rim = bpy.data.objects.new("Recessed lens hood and retaining rim", rim_mesh)
scene.collection.objects.link(rim)
rim_mesh.materials.append(dark)
rim_mesh.materials.append(metal)
for polygon in rim_mesh.polygons:
    if polygon.index // sides == 2:
        polygon.material_index = 1
cylinder("Recessed optical glass", (-.292, 0, .17), .066, .005, (1, 0, 0), glass)
# A broad oblique reflection reads as coated glass without a bright pupil.
reflection = box("Soft window reflection", (-.295, -.014, .192),
                 (.0005, .060, .013), optical_highlight, .0002)
reflection.rotation_euler.x = -.30
for index in range(16):
    angle = 2 * pi * index / 16
    grip = box("Focus ring grip", (-.234, .072 * cos(angle), .17 + .072 * sin(angle)),
               (.023, .008, .009), magazine, .001)
    grip.rotation_euler.x = angle
box("Recessed side control strip", (.040, -.130, .197), (.226, .010, .027), dark)
for x in [-.052, -.014, .025, .064]:
    cylinder("Control strip switch", (x, -.138, .197), .006, .008,
             (0, 1, 0), silver, sides=8)
box("Counter window frame", (.103, -.137, .197), (.034, .004, .014), metal, .001)
box("Counter window", (.103, -.140, .197), (.027, .003, .009), glass, .001)
cylinder("Amber pilot", (.177, -.133, .173), .008, .006, (0, 1, 0), indicator, sides=12)
for z in [.077, .183]:
    for x in [-.098, .184]:
        cylinder("Door screw", (x, -.13, z), .006, .004, (0, 1, 0), silver, sides=8)
for x in [.158, .17, .182, .194]:
    box("Motor vent", (x, -.131, .117), (.005, .005, .039), dark, .001)
# Door fittings sit outside the stencil plate and catch the Room key light.
for z in [.100, .179]:
    box("Service door hinge block", (-.121, -.131, z), (.027, .016, .020), metal)
    cylinder("Service door hinge pin", (-.130, -.139, z), .006, .029,
             (0, 0, 1), silver, sides=12)
box("Service door catch", (.136, -.134, .089), (.025, .010, .015), metal)
box("Service door catch inset", (.136, -.140, .089), (.013, .004, .006), dark, .001)
for x, radius in [(-.021, .011), (.019, .008)]:
    cylinder("Accessory socket bezel", (x, -.132, .082), radius, .010, (0, 1, 0), metal, sides=12)
    cylinder("Accessory socket recess", (x, -.138, .082), radius-.003, .003,
             (0, 1, 0), dark, bevel=0, sides=12)
for index, length in enumerate([.006, .011, .007, .014, .006]):
    box("Focus witness tick", (-.251, -.072, .147 + index * .010),
        (length, .004, .0035), silver, 0)
box("Gate block", (-.116, 0, .169), (.023, .063, .092), metal)
box("Exposure aperture", (-.129, 0, .169), (.004, .043, .06), dark)
box("Shutter plate", (-.111, 0, .17), (.005, .06, .078), dark)
for x, z in [(-.077,.231),(.029,.229),(.095,.246)]:
    cylinder("Film transport roller", (x, 0, z), .015, .057, (0, 1, 0), silver, sides=16)
for start, end in [((-.075,0,.24),(-.114,0,.195)), ((-.114,0,.195),(-.114,0,.14)),
                   ((-.114,0,.14),(.028,0,.218)), ((.028,0,.218),(.095,0,.25))]:
    a, b = Vector(start), Vector(end)
    segment = box("Constrained film strip", (a+b)/2, (.002,.059,(b-a).length), film, 0)
    segment.rotation_euler = (b-a).to_track_quat("Z","Y").to_euler()

box("Stencil plate", (.032, -.137, .151), (.205, .008, .058), dark, .005)
# Five-by-seven stencil glyphs are geometry on the physical side panel.
glyphs = {
    "F": ["11111","10000","10000","11110","10000","10000","10000"],
    "I": ["11111","00100","00100","00100","00100","00100","11111"],
    "L": ["10000","10000","10000","10000","10000","10000","11111"],
    "M": ["10001","11011","10101","10101","10001","10001","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"],
}
marks = []
for letter, glyph in enumerate(glyphs.values()):
    for row, line in enumerate(glyph):
        for column, bit in enumerate(line):
            if bit == "1":
                marks.append(box("Stencil pixel", (-.057 + .0062*(letter*6+column),
                                 -.142, .17 - .0062*row), (.0063,.0018,.0063), cream, 0))
bpy.ops.object.select_all(action="DESELECT")
for mark in marks:
    mark.select_set(True)
bpy.context.view_layer.objects.active = marks[0]
bpy.ops.object.join()
marks[0].name = "FILMS physical stencil"

camera_data = bpy.data.cameras.new("Room registration")
camera = bpy.data.objects.new("Room registration", camera_data)
scene.collection.objects.link(camera)
target = Vector((-.026, 0, .201))
camera.location = target + Vector((-1.48, -3.4, 1.07))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = .706
scene.camera = camera
scene.render.resolution_x = 310
scene.render.resolution_y = 231
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(evidence / "camera-rest.png")
scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light = "STUDIO"
shading.color_type = "MATERIAL"
shading.show_shadows = True
shading.show_cavity = True
shading.cavity_ridge_factor = 1.35
shading.curvature_ridge_factor = 1.25
shading.cavity_type = "BOTH"
shading.show_specular_highlight = True
scene.view_settings.view_transform = "Standard"
bpy.context.view_layer.update()
bpy.ops.object.select_all(action="DESELECT")
for obj in scene.objects:
    if obj.type == "MESH":
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(assets / "studio-65.glb"), export_format="GLB",
                         use_selection=True, export_cameras=False, export_lights=False)
contacts = []
for x,y in [(-.1875,-.123),(.2675,-.123),(.2675,.123),(-.1875,.123)]:
    point = world_to_camera_view(scene, camera, Vector((x,y,0)))
    contacts.append([round(point.x*310,2),round((1-point.y)*231,2)])
(evidence / "projection.json").write_text(json.dumps({"contacts": contacts}, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(evidence / "studio-65.blend"), copy=True)
bpy.context.window.scene = previous
print("Exported Studio 65", bpy.app.binary_path, contacts)
