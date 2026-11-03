"""Render the Studio 65 transport cutaway using the existing Room projection.

Run in Blender after build-cinema-camera.py, passing its scene to render_transport.
Only the cutaway render is exported. The Room model and rest render stay intact.
"""
import json
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


def render_transport(scene):
    root = Path(__file__).resolve().parents[1]
    assets = root / "public/portfolio/assets/room/cinema-camera"
    render_path = scene.render.filepath
    hidden = []
    covers = ("Common magazine housing", "Removable magazine face",
              "Magazine cover fastener", "Magazine latch", "Service door",
              "Door panel", "Door screw", "Counter window", "Control strip",
              "Recessed side control", "Stencil plate", "FILMS physical stencil",
              "Motor vent", "Accessory socket", "Amber pilot")
    housing = next(obj for obj in scene.objects if obj.name.startswith("Common magazine housing"))
    backing = housing.copy()
    backing.name = "Cutaway magazine backing"
    backing.scale.y = .18
    backing.location.y = .075
    scene.collection.objects.link(backing)
    try:
        for obj in scene.objects:
            if obj.type == "MESH" and obj.name.startswith(covers):
                hidden.append((obj, obj.hide_render))
                obj.hide_render = True
        scene.render.filepath = str(assets / "transport-cutaway.webp")
        scene.render.image_settings.file_format = "WEBP"
        scene.render.image_settings.color_mode = "RGBA"
        bpy.ops.render.render(scene=scene.name, write_still=True)
    finally:
        bpy.data.objects.remove(backing, do_unlink=True)
        for obj, old_value in hidden:
            obj.hide_render = old_value
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = render_path

    def project(x, y, z):
        p = world_to_camera_view(scene, scene.camera, Vector((x, y, z)))
        return [round(p.x * 310, 2), round((1-p.y) * 231, 2)]

    geometry = {
        "supply": project(-.035, -.031, .329),
        "takeup": project(.13, -.031, .307),
        "guide": [project(x, -.033, z) for x, z in [
            (-.104, .308), (-.073, .234), (-.123, .201), (-.123, .139),
            (-.096, .123), (.028, .212), (.096, .241), (.154, .282),
        ]],
        "gate": project(-.126, -.037, .170),
    }
    print("TRANSPORT_PROJECTION", json.dumps(geometry))
