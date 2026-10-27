#!/usr/bin/env python3
"""Regresion: compilar los DAT producidos por el constructor con sus entradas reales.

Tambien prueba la reparacion de redes antiguas y la recuperacion de salida,
sin afirmar que un doble de la API sustituya una prueba de TouchDesigner.
"""
import os
import sys
import types
import unittest
from unittest.mock import patch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
from vjcore import config, program
import validate_shaders as V


class Par:
    def __init__(self):
        self.val = None
        self.expr = ''


class Pars:
    def __init__(self):
        self.values = {}

    def __getattr__(self, name):
        return self.values.setdefault(name, Par())


class Connector:
    def __init__(self, node, index):
        self.node, self.index = node, index

    def connect(self, src):
        while len(self.node.inputs) <= self.index:
            self.node.inputs.append(None)
        self.node.inputs[self.index] = src


class Node:
    def __init__(self, name, kind='TOP'):
        self.name, self.kind = name, kind
        self.path = '/project1/' + name
        self.par = Pars()
        self.inputs = []
        self.inputConnectors = [Connector(self, i) for i in range(16)]
        self.bypass = False
        self.text = ''
        self.error = ''
        self.warning = ''

    def errors(self):
        return self.error

    def warnings(self):
        return self.warning

    def setInputs(self, inputs):
        self.inputs = list(inputs)


class Project:
    def __init__(self):
        self.nodes = {}
        self.values = {}

    def create(self, kind, name):
        node = Node(name, kind)
        self.nodes[name] = node
        return node

    def op(self, name):
        return self.nodes.get(name.rsplit('/', 1)[-1])

    def fetch(self, key, default=None):
        return self.values.get(key, default)

    def store(self, key, value):
        self.values[key] = value


def build_bloom(with_ctrl=True):
    proj = Project()
    src = proj.create('TOP', 'base')
    ctrl = proj.create('TOP', 'ctrl_tex') if with_ctrl else None
    kinds = {n: n for n in ('textDAT', 'glslTOP')}
    with patch.multiple(program, create=True, **kinds):
        program._build_bloom(proj, src, ctrl, config.CTRL_CHANNELS if with_ctrl else None)
    return proj


class RuntimeTests(unittest.TestCase):
    def test_actual_builder_compiles_without_holes(self):
        for enabled in (True, False):
            proj = build_bloom(enabled)
            for name in ('bloom_prefilter', 'program_bloom'):
                node = proj.op(name)
                self.assertNotIn(None, node.inputs)
                dat = proj.op(node.par.pixeldat.val)
                src = V._td_prologue_post(len(node.inputs)) + dat.text
                ok, out = V._compile(src)
                self.assertTrue(ok, '{}: {}'.format(name, out))

    def test_old_sparse_prefilter_is_rejected(self):
        # El codigo anterior apuntaba al sampler 2 aunque solo conectaba
        # dos texturas 2D. El validador manual no construia esta fuente.
        old = (V._td_prologue_post(2) + V.shader.ctrl_header(config.CTRL_CHANNELS, 2)
               + program._BLOOM_PREFILTER_FRAG)
        ok, _ = V._compile(old)
        self.assertFalse(ok)

    def test_reload_repairs_existing_sparse_network(self):
        proj = build_bloom()
        pre = proj.op('bloom_prefilter')
        ctrl = proj.op('ctrl_tex')
        pre.inputs = [pre.inputs[0], None, ctrl]
        proj.op('bloom_prefilter_src').text = 'old shader'
        program.reload_program(proj, config.CTRL_CHANNELS)
        self.assertEqual(pre.inputs, [proj.op('base'), ctrl])
        self.assertIn('sTD2DInputs[1]', proj.op('bloom_prefilter_src').text)
        self.assertNotIn('uTD2DInfos', program._BLOOM_FRAG + program._TEXT_FRAG)

    def test_text_native_fallback_and_input_order(self):
        proj = Project()
        base, ctrl = proj.create('TOP', 'base'), proj.create('TOP', 'ctrl_tex')
        kinds = {n: n for n in ('textTOP', 'transformTOP', 'parameterCHOP', 'lagCHOP',
                                'choptoTOP', 'textDAT', 'glslTOP', 'levelTOP',
                                'compositeTOP', 'switchTOP')}
        with patch.multiple(program, create=True, **kinds):
            result = program._build_text_overlay(proj, base, ctrl, config.CTRL_CHANNELS)
        pick = result['text_composite']
        self.assertEqual([n.name for n in pick.inputs], ['program_text', 'text_native_over'])
        native = proj.op('text_native_over')
        self.assertEqual([n.name for n in native.inputs], ['text_native_alpha', 'base'])
        self.assertEqual(native.par.operand.val, 'over')
        self.assertIn('text_fade_lag', proj.op('text_native_alpha').par.opacity.expr)
        glsl = proj.op('program_text')
        dat = proj.op(glsl.par.pixeldat.val)
        ok, out = V._compile(V._td_prologue_post(len(glsl.inputs)) + dat.text)
        self.assertTrue(ok, out)
        glsl.warning = 'The GLSL Shader has compile errors'
        program.guard_postprocess(proj)
        self.assertTrue(proj.fetch('text_native_fallback'))
        self.assertFalse(glsl.bypass)  # se elige texto nativo, no el control
        self.assertIn('program_text', proj.fetch('postfx_fallback'))

    def test_guard_disables_bloom_pair_only_and_can_retry(self):
        proj = build_bloom()
        scene = proj.create('TOP', 'scene_shader')
        scene.warning = 'The GLSL Shader has compile errors'
        proj.op('bloom_prefilter').warning = 'The GLSL Shader has compile errors'
        program.guard_postprocess(proj)
        self.assertTrue(proj.op('bloom_prefilter').bypass)
        self.assertTrue(proj.op('program_bloom').bypass)
        self.assertFalse(scene.bypass)
        program.reload_program(proj, config.CTRL_CHANNELS)
        self.assertFalse(proj.op('bloom_prefilter').bypass)
        self.assertFalse(proj.op('program_bloom').bypass)
        self.assertEqual(proj.fetch('postfx_fallback'), [])


class TextRenderTests(unittest.TestCase):
    def test_text_shader_without_td_metadata_fade_and_coverage(self):
        import moderngl
        import numpy as np
        import render_scenes as R
        ctx = moderngl.create_standalone_context(backend='egl', require=330)
        src = V._td_prologue_post(4) + V.shader.ctrl_header(config.CTRL_CHANNELS, 3) + program._TEXT_FRAG
        self.assertNotIn('uTD2DInfos', src)
        shader = ctx.program(vertex_shader=R._VERT, fragment_shader=src)
        vbo = ctx.buffer(np.array([-1,-1,1,-1,-1,1,1,1], 'f4').tobytes())
        vao = ctx.simple_vertex_array(shader, vbo, 'in_pos')
        w, h = 96, 48
        base = np.zeros((h, w, 4), 'f4')
        base[:] = (.12, .20, .30, 1.0)
        mask = np.zeros((h, w, 4), 'f4')
        mask[20:28, 40:56] = (1,1,1,1)
        values = np.zeros(len(config.CTRL_CHANNELS), 'f4')
        textures = [ctx.texture((w,h), 4, base.tobytes(), dtype='f4'),
                    ctx.texture((w,h), 4, mask.tobytes(), dtype='f4'),
                    ctx.texture((1,1), 1, np.array([0.0], 'f4').tobytes(), dtype='f4'),
                    ctx.texture((1,len(values)), 1, values.tobytes(), dtype='f4')]
        for unit, tex in enumerate(textures):
            tex.filter = (ctx.NEAREST, ctx.NEAREST)
            tex.use(unit)
        shader['sTD2DInputs'].value = [0,1,2,3]
        fbo = ctx.simple_framebuffer((w,h), components=4, dtype='f4')
        fbo.use()
        vao.render(mode=ctx.TRIANGLE_STRIP)
        off = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(h,w,4)
        self.assertLess(float(np.abs(off[...,:3]-base[...,:3]).max()), 1.0/255.0 + 1e-5)
        textures[2].write(np.array([1.0], 'f4').tobytes())
        vao.render(mode=ctx.TRIANGLE_STRIP)
        on = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(h,w,4)
        self.assertTrue(np.isfinite(on).all())
        self.assertGreater(float(on[23,47,:3].min()), .98)
        self.assertLess(float(np.abs(on[0,0,:3]-base[0,0,:3]).max()), .01)
        for obj in [vao,vbo,shader,fbo]+textures:
            obj.release()
        ctx.release()


if __name__ == '__main__':
    unittest.main()
