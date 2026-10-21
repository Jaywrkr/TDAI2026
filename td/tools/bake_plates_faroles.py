"""Hornea las laminas de la escena 28 de Halloween (el bosque de los faroles).

Bosque de otono en tres profundidades: troncos lejanos en la niebla (solo
silueta y luminancia), robles medios con corteza y la rama de donde
cuelgan sus faroles, y adelante dos troncos enormes, la rama gruesa que
cruza arriba y una alfombra de hojas secas con un sendero. Las ramas y el
suelo salen del MISMO bloque GLSL que usa la escena (entre
"// >>> FAROLES_GEOM" y "// <<< FAROLES_GEOM" en
scene28_bosque_faroles.frag): los faroles cuelgan justo de la rama.

Laminas:
  1_lejos   R = luminancia (0 claro en la niebla, 1 oscuro), A = cobertura
  2_medio   color (lineal x2, gamma 2.2), A = cobertura
  3_cerca   idem
  4_ruido   el ruido que se repite de la escena 00 (niebla)

uso: python3 td/tools/bake_plates_faroles.py   (despues: build_atlas.py)
"""
import os
import re
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = os.path.join(os.path.dirname(HERE), 'sets', 'halloween')
SETS = os.path.join(SET, 'plates')
OUT = os.path.join(SETS, 'scene28')
FRAG = os.path.join(SET, 'visuals', 'scene28_bosque_faroles.frag')
SS = 2
R = (-3.4, -1.25, 3.4, 1.25)
W, H = 1280, 470
PLATES = [('1_lejos', 0), ('2_medio', 1), ('3_cerca', 2)]

VERT = """#version 330
in vec2 in_pos; out vec2 vUV;
void main(){ vUV = in_pos*0.5+0.5; gl_Position = vec4(in_pos,0,1); }
"""

BODY = r"""
in vec2 vUV; out vec4 fc;
uniform int plate;
uniform vec4 rect;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ vec3 a=fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a+=dot(a,a+34.45); return fract(vec2(a.x*a.y,a.y*a.z)); }
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(i)-.5,f), b=dot(h22(i+vec2(1,0))-.5,f-vec2(1,0));
  float c=dot(h22(i+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i+vec2(1,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fbm(vec2 p,int o){ float s=0.,a=.5,n=0.; for(int i=0;i<10;i++){ if(i>=o)break; s+=a*gn(p); n+=a; a*=.5; p=mat2(.8,-.6,.6,.8)*p*2.03+11.3; } return s/n; }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }

// tronco retorcido que se abre en raices; (distancia, transversal -1..1)
vec2 trunk(vec2 p, float x0, float w, float seed, float lean, float gy){
  float y=p.y;
  float cx=x0+lean*(y-gy)+0.06*sin(y*1.5+seed)*w*4.+0.02*sin(y*4.3+seed*2.)*w*3.;
  float ww=w*(1.0+1.1*exp(-(y-gy)*4.0));
  return vec2(abs(p.x-cx)-ww,(p.x-cx)/ww);
}
vec3 bark(vec2 p, float u, float seed, float detail){
  float cyl=sqrt(max(1.-u*u,0.));
  float ridges=1.-abs(fract(u*4.+fbm(vec2(u*3.,p.y*0.9+seed),4)*1.6)-0.5)*2.;
  float b=0.6+0.6*fbm(vec2(u*12.+seed,p.y*8.),5)*detail;
  vec3 c=vec3(0.13,0.10,0.08)*b*(0.5+0.5*ridges);
  float moss=smoothstep(0.6,0.8,fbm(vec2(u*4.,p.y*3.)+seed,5)-u*0.2)*detail;
  c=mix(c,vec3(0.06,0.09,0.04)*(0.6+0.6*b),moss*0.7);
  return c*(0.45+0.55*cyl);
}
// rama gruesa que sigue flBranch con ramitas
float branch(vec2 p, int L, float th){
  float y=flBranch(L,p.x);
  float d=abs(p.y-y-0.012*sin(p.x*13.))-th*(0.8+0.4*gn(vec2(p.x*6.,float(L))));
  for(int i=0;i<10;i++){
    float fi=float(i);
    float x0=-3.2+fi*0.7+h21(vec2(fi,float(L)))*0.4;
    vec2 a=vec2(x0,flBranch(L,x0));
    float ang=(h21(vec2(fi,7.))-0.5)*1.8+1.5708*(h21(vec2(fi,9.))>0.5?1.:-1.)*0.4;
    vec2 b=a+vec2(cos(ang),sin(ang)+0.5)*0.25*(0.5+h21(vec2(fi,3.)));
    d=min(d,sdSeg(p,a,b)-th*0.35);
    d=min(d,sdSeg(p,mix(a,b,0.6),mix(a,b,0.6)+vec2(0.12,0.10)*(h21(vec2(fi,4.))-0.3))-th*0.18);
  }
  return d;
}
// alfombra de hojas secas (y sendero)
vec3 leaves(vec2 p, float scale, float path){
  vec3 c=vec3(0.06,0.035,0.02)*(0.6+0.8*fbm(p*12.,4));
  for(int k=0;k<3;k++){
    float fk=float(k);
    vec2 g=p*vec2(14.,26.)*scale*(1.+fk*0.4)+fk*11.;
    vec2 id=floor(g); vec2 f=fract(g)-0.5;
    vec2 hh=h22(id+fk*3.);
    vec2 q=rot(hh.x*6.28)*(f-(hh-0.5)*0.4);
    float lf=length(q*vec2(1.,2.0))-0.40;
    float m=smoothstep(0.04,-0.04,lf);
    vec3 lc=mix(vec3(0.45,0.16,0.04),vec3(0.55,0.35,0.07),hh.y);
    lc=mix(lc,vec3(0.30,0.08,0.05),step(0.8,hh.x));
    lc*=0.55+0.5*smoothstep(-0.3,0.3,q.x)*(1.-0.3*step(abs(q.y),0.02));
    c=mix(c,lc*(0.30+0.15*fk),m*(1.-path*0.75));
  }
  c=mix(c,vec3(0.20,0.16,0.12)*(0.6+0.6*fbm(p*30.,4)),path*0.85);
  return c;
}

vec4 layerFar(vec2 p){
  float a=0., lum=0.;
  for(int i=0;i<22;i++){
    float fi=float(i);
    float x0=-3.3+fi*0.31+(h21(vec2(fi,1.))-0.5)*0.28;
    float w=0.012+0.028*pow(h21(vec2(fi,2.)),2.);
    vec2 tr=trunk(p,x0,w,fi,(h21(vec2(fi,3.))-0.5)*0.1,flGround(0,x0));
    float m=smoothstep(0.003,-0.003,tr.x)*step(flGround(0,p.x)-0.02,p.y);
    if(m>a){ a=m; lum=0.45+0.4*smoothstep(-0.6,1.,tr.y); }
  }
  float br=smoothstep(0.004,-0.004,branch(p,0,0.008));
  if(br>a){ a=br; lum=0.6; }
  float g=smoothstep(0.004,-0.004,p.y-flGround(0,p.x));
  if(g>a){ a=g; lum=0.35+0.2*fbm(p*vec2(8.,20.),3); }
  return vec4(lum,lum,lum,a);
}

vec4 layerMid(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  for(int i=0;i<8;i++){
    float fi=float(i);
    float x0=-2.85+fi*0.82+(h21(vec2(fi,11.))-0.5)*0.5;
    float w=0.04+0.05*h21(vec2(fi,12.));
    vec2 tr=trunk(p,x0,w,fi*3.,(h21(vec2(fi,13.))-0.5)*0.08,flGround(1,x0));
    float m=smoothstep(0.003,-0.003,tr.x)*step(flGround(1,p.x)-0.03,p.y);
    if(m>0.){ c=mix(c,bark(p,tr.y,fi*5.,0.7)*0.85,m); a=max(a,m); }
  }
  float br=branch(p,1,0.016);
  float bm=smoothstep(0.003,-0.003,br);
  c=mix(c,vec3(0.07,0.055,0.045)*(0.6+0.6*fbm(p*30.,4)),bm); a=max(a,bm);
  float gy=flGround(1,p.x);
  float gm=smoothstep(0.004,-0.004,p.y-gy);
  float path=smoothstep(0.10,0.06,abs(p.x-0.05));
  c=mix(c,leaves(p,0.8,path)*0.8,gm); a=max(a,gm);
  return vec4(c,a);
}

vec4 layerNear(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  for(int i=0;i<2;i++){
    float x0=i==0?-2.55:2.45;
    vec2 tr=trunk(p,x0,0.22,float(i)*7.,i==0?0.05:-0.04,flGround(2,x0));
    float m=smoothstep(0.003,-0.003,tr.x);
    if(m>0.){ c=mix(c,bark(p,tr.y,float(i)*9.+2.,1.),m); a=max(a,m); }
  }
  float br=branch(p,2,0.035);
  float bm=smoothstep(0.003,-0.003,br);
  if(bm>0.){
    float u=clamp((p.y-flBranch(2,p.x))/0.05,-1.,1.);
    c=mix(c,bark(vec2(p.y*3.,p.x),u,4.,0.9)*1.1,bm); a=max(a,bm);
  }
  // hojas que todavia cuelgan de la rama
  vec2 g=p*vec2(18.,22.); vec2 id=floor(g); vec2 f=fract(g)-0.5; vec2 hh=h22(id);
  float near=abs(p.y-flBranch(2,p.x)+0.04)-0.06;
  float lf=smoothstep(0.04,-0.04,length(rot(hh.x*6.)*(f-(hh-0.5)*0.4)*vec2(1.,2.))-0.38)*step(near,0.)*step(0.45,hh.y);
  c=mix(c,mix(vec3(0.40,0.12,0.03),vec3(0.50,0.30,0.05),hh.x)*0.6,lf); a=max(a,lf);
  // suelo con hojas y sendero en perspectiva
  float gy=flGround(2,p.x);
  float gm=smoothstep(0.004,-0.004,p.y-gy);
  float pw=0.12+(gy-p.y)*0.9;
  float path=smoothstep(pw,pw*0.8,abs(p.x-0.05+(gy-p.y)*0.15));
  c=mix(c,leaves(p,1.0,path),gm); a=max(a,gm);
  return vec4(c,a);
}

void main(){
  vec2 p=mix(rect.xy,rect.zw,vUV);
  if(plate==0){ fc=layerFar(p); return; }
  vec4 c=plate==1?layerMid(p):layerNear(p);
  fc=vec4(pow(clamp(c.rgb*2.,0.,1.),vec3(1./2.2)),c.a);
}
"""


def geom_block():
    with open(FRAG, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'// >>> FAROLES_GEOM.*?\n(.*?)// <<< FAROLES_GEOM', src, re.S)
    if not m:
        raise SystemExit('no encuentro el bloque FAROLES_GEOM en ' + FRAG)
    return m.group(1)


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    prog = ctx.program(vertex_shader=VERT,
                       fragment_shader='#version 330\n' + geom_block() + BODY)
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    os.makedirs(OUT, exist_ok=True)
    for name, pid in PLATES:
        prog['plate'].value = pid
        prog['rect'].value = R
        fbo = ctx.simple_framebuffer((W * SS, H * SS), components=4, dtype='f4')
        fbo.use()
        fbo.clear(0, 0, 0, 0)
        vao.render(mode=moderngl.TRIANGLE_STRIP)
        img = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(H * SS, W * SS, 4)[::-1]
        fbo.release()
        a = img[..., 3:4]
        pm = np.concatenate([img[..., :3] * a, a], -1).reshape(H, SS, W, SS, 4).mean((1, 3))
        rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
        out = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '4_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
