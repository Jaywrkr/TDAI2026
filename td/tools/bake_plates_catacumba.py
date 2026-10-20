"""Hornea las laminas de la escena 18 de Halloween (tunel de calaveras).

Dos texturas que se repiten SIN COSTURA (el tunel las usa una y otra
vez): la pared de la catacumba, hileras de calaveras apiladas con filas
de huesos largos de punta entre ellas, como en las catacumbas de Paris
(color + relieve; los ojos van en el canal B para que el shader los
encienda), y el piso de piedra con huesos sueltos (color + relieve).
Ver docs/53.

uso: python3 td/tools/bake_plates_catacumba.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene18')
SS = 2
PLATES = [
    ('1_pared_color', 0, (0.0, 0.0, 1.0, 1.0), 768, 768),
    ('2_pared_relieve', 1, (0.0, 0.0, 1.0, 1.0), 768, 768),
    ('3_piso_color', 2, (0.0, 0.0, 1.0, 1.0), 512, 512),
    ('4_piso_relieve', 3, (0.0, 0.0, 1.0, 1.0), 512, 512),
]

VERT = """#version 330
in vec2 in_pos; out vec2 vUV;
void main(){ vUV = in_pos*0.5+0.5; gl_Position = vec4(in_pos,0,1); }
"""

FRAG = r"""#version 330
in vec2 vUV; out vec4 fc;
uniform int plate;
uniform vec4 rect;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ vec3 a=fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a+=dot(a,a+34.45); return fract(vec2(a.x*a.y,a.y*a.z)); }
// ruido periodico (se repite cada 'per' celdas): la textura no tiene costura
float pgn(vec2 p, float per){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  float a=h21(mod(i,per)), b=h21(mod(i+vec2(1,0),per)), c=h21(mod(i+vec2(0,1),per)), d=h21(mod(i+vec2(1,1),per));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
float pfbm(vec2 p, float per, int o){ float s=0.,a=.5,n=0.; for(int i=0;i<8;i++){ if(i>=o)break; s+=a*pgn(p,per); n+=a; a*=.5; p*=2.; per*=2.; } return s/n; }
float rbox(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float ell(vec2 p, vec2 c, vec2 r){ return (length((p-c)/r)-1.)*min(r.x,r.y); }

// calavera de frente en coordenadas de su celda (-0.5..0.5)
float skullD(vec2 q, out float hole, out float eye){
  float cran=ell(q,vec2(0.,0.06),vec2(0.40,0.36));
  float cheek=ell(q,vec2(0.,-0.10),vec2(0.34,0.20));
  float jaw=rbox(q-vec2(0.,-0.27),vec2(0.17,0.08),0.06);
  float d=smin(smin(cran,cheek,0.04),jaw,0.04);
  eye=min(ell(q,vec2(-0.15,0.0),vec2(0.11,0.10)),ell(q,vec2(0.15,0.0),vec2(0.11,0.10)));
  float nose=max(abs(q.x)*1.5+(q.y+0.10)*0.9-0.06,-(q.y+0.17));
  float teeth=max(abs(q.y+0.22)-0.012,abs(q.x)-0.15);
  hole=min(min(eye,nose),teeth);
  return d;
}

struct S { vec3 alb; float h; float eye; };
// pared: 4 hileras de calaveras por tile, entre ellas hileras de puntas
// de femur (circulos con dos protuberancias)
S wall(vec2 uv){
  S s; s.h=0.; s.eye=0.;
  // relleno entre huesos: fragmentos y tierra
  float frag=pfbm(uv*vec2(60.,60.),60.,4);
  s.alb=mix(vec3(0.02,0.018,0.015),vec3(0.22,0.19,0.14),smoothstep(0.55,0.75,frag)*0.8);
  s.h=smoothstep(0.55,0.75,frag)*0.15;
  float rowH=0.25;                     // alto de hilera (calavera + huesos)
  float ry=floor(uv.y/rowH);
  float ly=fract(uv.y/rowH);
  // banda de huesos (abajo de cada hilera): puntas de femur
  if(ly<0.32){
    float n=14.;
    float cx=uv.x*n+mod(ry,2.)*0.5;
    float ci=floor(cx); vec2 q=vec2(fract(cx)-0.5, ly/0.32-0.5)*vec2(1.,1.35);
    float jit=h21(mod(vec2(ci,ry),vec2(n,4.)));
    q+=(h22(vec2(mod(ci,n),ry))-0.5)*0.12;
    float knob=min(length(q-vec2(-0.15,0.0))-0.26,length(q-vec2(0.15,0.0))-0.26);
    knob=smin(knob,length(q)-0.30,0.08);
    if(knob<0.){
      float dep=clamp(-knob/0.2,0.,1.);
      s.alb=mix(vec3(0.42,0.36,0.26),vec3(0.62,0.56,0.42),pfbm(uv*40.,40.,4))*(0.7+0.4*jit);
      s.h=sqrt(dep)*0.6;
    }
    return s;
  }
  // hilera de calaveras
  float n=6.;
  float cx=uv.x*n+mod(ry,2.)*0.5;
  float ci=floor(cx);
  vec2 q=vec2(fract(cx)-0.5,(ly-0.32)/0.68-0.5);
  vec2 jj=h22(vec2(mod(ci,n),mod(ry,4.)))-0.5;
  q=rot(jj.x*0.25)*(q-jj*vec2(0.06,0.05));
  q*=1.0+0.12*jj.y;
  float hole, eye;
  float d=skullD(q*vec2(0.80,0.92),hole,eye);
  if(d<0.){
    float dep=clamp(-d/0.25,0.,1.);
    float st=pfbm(uv*vec2(30.,30.),30.,5);
    vec3 bone=mix(vec3(0.45,0.38,0.27),vec3(0.70,0.64,0.50),st);
    bone=mix(bone,vec3(0.18,0.14,0.09),smoothstep(0.6,0.8,pfbm(uv*12.+3.,12.,4))*0.7);   // mugre
    bone*=0.75+0.35*h21(vec2(mod(ci,n),mod(ry,4.))+2.);
    s.alb=bone; s.h=sqrt(dep)*0.8+st*0.05;
    if(hole<0.){ s.alb=vec3(0.015,0.012,0.01); s.h=-0.3; }
    if(eye<0.) s.eye=1.;
  }
  return s;
}
S floorT(vec2 uv){
  S s; s.eye=0.;
  // losas irregulares
  vec2 g=uv*4.; vec2 i=floor(g);
  float d1=9.,d2=9.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 c=i+vec2(x,y); vec2 o=c+0.2+0.6*h22(mod(c,4.));
    float d=length(g-o); if(d<d1){d2=d1;d1=d;} else if(d<d2) d2=d;
  }
  float e=d2-d1;
  float st=pfbm(uv*16.,16.,5);
  s.alb=mix(vec3(0.03),vec3(0.13,0.12,0.11)*(0.6+0.6*st),smoothstep(0.03,0.1,e));
  s.h=smoothstep(0.03,0.15,e)*0.4+st*0.1;
  // huesos sueltos
  for(int k=0;k<6;k++){
    float fk=float(k);
    vec2 c=h22(vec2(fk,7.));
    vec2 q=uv-c; q-=floor(q+0.5);
    q=rot(fk*1.3)*q;
    float bone=min(rbox(q,vec2(0.07,0.008),0.008),min(length(q-vec2(0.075,0.))-0.014,length(q+vec2(0.075,0.))-0.014));
    if(bone<0.){ s.alb=vec3(0.45,0.40,0.30)*(0.7+0.4*st); s.h=0.5; }
  }
  return s;
}

void main(){
  vec2 uv = mix(rect.xy, rect.zw, vUV);
  float e=1.0/1024.;
  if(plate<=1){
    S s=wall(uv);
    if(plate==0){ fc=vec4(pow(clamp(s.alb*2.,0.,1.),vec3(1./2.2)), 1.); return; }
    float hx=wall(fract(uv+vec2(e,0.))).h-wall(fract(uv-vec2(e,0.))).h;
    float hy=wall(fract(uv+vec2(0.,e))).h-wall(fract(uv-vec2(0.,e))).h;
    vec3 n=normalize(vec3(-hx/(2.*e)*0.004,-hy/(2.*e)*0.004,1.));
    fc=vec4(n.xy*0.5+0.5, s.eye, 1.); return;
  }
  S s=floorT(uv);
  if(plate==2){ fc=vec4(pow(clamp(s.alb*2.,0.,1.),vec3(1./2.2)), 1.); return; }
  float hx=floorT(fract(uv+vec2(e,0.))).h-floorT(fract(uv-vec2(e,0.))).h;
  float hy=floorT(fract(uv+vec2(0.,e))).h-floorT(fract(uv-vec2(0.,e))).h;
  vec3 n=normalize(vec3(-hx/(2.*e)*0.004,-hy/(2.*e)*0.004,1.));
  fc=vec4(n.xy*0.5+0.5, 0., 1.);
}
"""


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    prog = ctx.program(vertex_shader=VERT, fragment_shader=FRAG)
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    os.makedirs(OUT, exist_ok=True)
    for name, pid, r, w, h in PLATES:
        prog['plate'].value = pid
        prog['rect'].value = r
        fbo = ctx.simple_framebuffer((w * SS, h * SS), components=4, dtype='f4')
        fbo.use()
        fbo.clear(0, 0, 0, 0)
        vao.render(mode=moderngl.TRIANGLE_STRIP)
        img = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(h * SS, w * SS, 4)[::-1]
        fbo.release()
        img = img.reshape(h, SS, w, SS, 4).mean((1, 3))
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '5_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
