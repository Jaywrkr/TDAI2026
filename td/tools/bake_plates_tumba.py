"""Hornea las laminas de la escena 12 de Halloween (momia en la tumba).

Una camara funeraria egipcia: muro de bloques con jeroglificos tallados
en bajorrelieve y franjas pintadas, dos columnas papiriformes, soportes
de antorcha, piso de arena con vasijas canopicas y un escarabajo, y el
sarcofago dorado abierto y parado donde esta la momia (el interior queda
oscuro; la momia va en vivo). Color y relieve por separado para que las
antorchas iluminen en vivo. Ver docs/53.

uso: python3 td/tools/bake_plates_tumba.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene12')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
W, H = 1280, 496
PLATES = [('1_tumba_color', 0), ('2_tumba_relieve', 1)]

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
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(i)-.5,f), b=dot(h22(i+vec2(1,0))-.5,f-vec2(1,0));
  float c=dot(h22(i+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i+vec2(1,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fbm(vec2 p,int o){ float s=0.,a=.5,n=0.; for(int i=0;i<10;i++){ if(i>=o)break; s+=a*gn(p); n+=a; a*=.5; p=mat2(.8,-.6,.6,.8)*p*2.03+11.3; } return s/n; }
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

const float FLOOR_Y=-0.80;
struct S { vec3 alb; float h; float g; };

// glifo procedural en una celda: ojo, ankh, pajaro, ondas, juncos, sol
float glyph(vec2 q, float k){
  float d=1e3;
  if(k<1.){ d=min(abs(length(q*vec2(1.,2.))-0.32)-0.04, length(q)-0.10); d=min(d, sdSeg(q,vec2(-0.05,-0.15),vec2(-0.15,-0.40))-0.035); }        // ojo
  else if(k<2.){ d=min(abs(length((q-vec2(0.,0.22))*vec2(1.3,1.))-0.15)-0.04, min(sdBox(q-vec2(0.,-0.15),vec2(0.04,0.25)), sdBox(q-vec2(0.,0.03),vec2(0.24,0.04)))); }  // ankh
  else if(k<3.){ d=min(length((q-vec2(0.,-0.05))*vec2(1.,1.4))-0.22, length(q-vec2(0.10,0.22))-0.08); d=min(d, sdSeg(q,vec2(0.15,0.22),vec2(0.30,0.18))-0.025); d=min(d, sdSeg(q,vec2(-0.05,-0.25),vec2(-0.05,-0.42))-0.02); }  // pajaro
  else if(k<4.){ for(int i=0;i<3;i++){ float y=0.22-float(i)*0.22; d=min(d, abs(q.y-y-0.05*sin(q.x*18.))-0.03); } d=max(d, abs(q.x)-0.36); }  // agua
  else if(k<5.){ for(int i=0;i<3;i++){ float x=-0.2+float(i)*0.2; d=min(d, sdSeg(q,vec2(x,-0.38),vec2(x+0.03,0.30))-0.03); d=min(d, length((q-vec2(x+0.06,0.30))*vec2(1.,2.))-0.07); } }  // juncos
  else { d=min(abs(length(q)-0.24)-0.04, length(q)-0.07); }   // sol
  return d;
}

S tomb(vec2 p){
  S s; s.g=0.;
  if(p.y<FLOOR_Y){
    float z=1.0/((FLOOR_Y-p.y)+0.10);
    vec2 g=vec2(p.x*z*0.5, z*0.4);
    float dunes=fbm(g*vec2(3.,1.5),6);
    s.alb=vec3(0.42,0.33,0.20)*(0.7+0.4*dunes)*(0.85+0.2*gn(g*80.));
    s.h=dunes*0.8;
    s.alb*=mix(1.,0.5,smoothstep(-0.85,-1.2,p.y));
    // vasijas canopicas y escarabajo
    for(int i=0;i<3;i++){
      vec2 c = i==0? vec2(-1.25,-0.92): i==1? vec2(-1.02,-0.95): vec2(1.30,-0.93);
      vec2 q=p-c;
      float jar=max(length((q-vec2(0.,0.08))/vec2(0.075,0.11))-1., -q.y);
      float lid=length((q-vec2(0.,0.21))/vec2(0.055,0.05))-1.;
      if(min(jar,lid)<0.){ float u=q.x/0.075; s.alb=(lid<0.?vec3(0.55,0.40,0.18):vec3(0.62,0.55,0.42))*(0.5+0.5*sqrt(max(1.-u*u,0.)))*(0.8+0.3*fbm(q*40.,4)); s.h=1.4+sqrt(max(1.-u*u,0.));
        if(abs(q.y-0.06)<0.012 && lid>0.) s.alb=vec3(0.10,0.25,0.45); }
    }
    vec2 sq=(p-vec2(0.55,-1.02))/vec2(0.07,0.05);
    float sc=length(sq)-1.;
    if(sc<0.){ s.alb=vec3(0.10,0.30,0.32)*(0.6+0.5*smoothstep(0.,1.,-sq.y)); s.h=1.3+sqrt(max(-sc,0.)); if(abs(sq.x)<0.06) s.alb*=0.4; }
    return s;
  }
  // muro de bloques de arenisca
  vec2 bq=vec2(p.x/0.55+0.5*mod(floor(p.y/0.30),2.), p.y/0.30);
  vec2 id=floor(bq); vec2 f=fract(bq);
  vec2 e=min(f,1.-f)*vec2(0.55,0.30);
  float edge=min(e.x,e.y);
  float blk=smoothstep(0.004,0.010,edge);
  vec3 sand=vec3(0.50,0.39,0.25)*(0.75+0.3*h21(id))*(0.75+0.35*fbm(p*vec2(15.,20.)+id,6));
  s.alb=mix(vec3(0.18,0.13,0.08),sand,blk); s.h=blk*(0.5+0.5*smoothstep(0.004,0.03,edge));
  // franjas pintadas arriba y abajo
  if(p.y>0.86 && p.y<1.02){ float k=fract(p.x*6.); s.alb=mix(vec3(0.10,0.25,0.45),vec3(0.55,0.15,0.08),step(0.5,k))*(0.6+0.4*fbm(p*30.,4)); if(abs(p.y-0.94)<0.012) s.alb=vec3(0.65,0.50,0.15); }
  if(p.y>FLOOR_Y && p.y<FLOOR_Y+0.10){ s.alb=vec3(0.30,0.20,0.10)*(0.7+0.3*fbm(p*40.,4)); s.h=0.8; }
  // columnas de jeroglificos tallados (bajorrelieve) a los lados
  for(int k=0;k<2;k++){
    float x0 = k==0? -1.55 : 1.62;
    vec2 q=p-vec2(x0,0.05);
    if(abs(q.x)<0.45 && q.y>-0.82 && q.y<0.78){
      float colW=0.18;
      float cx=floor((q.x+0.45)/colW);
      float cy=floor((q.y+0.82)/0.20);
      vec2 cq=vec2(fract((q.x+0.45)/colW)-0.5, fract((q.y+0.82)/0.20)-0.5)*vec2(colW,0.20)/0.10;
      float g=glyph(cq, floor(h21(vec2(cx+float(k)*9.,cy))*6.));
      float sep=smoothstep(0.004,0.0,abs(fract((q.x+0.45)/colW)-0.0)*colW);
      float carve=smoothstep(0.02,-0.02,g);
      s.alb=mix(s.alb, s.alb*0.55+vec3(0.08,0.12,0.18)*0.5*step(0.5,h21(vec2(cx,cy+3.))), carve*0.85);
      s.h-=carve*0.5; s.g=max(s.g,carve);
      s.alb*=1.-sep*0.4;
    }
  }
  // soportes de antorcha
  for(int k=0;k<2;k++){
    float x0 = k==0? -2.35 : 2.40;
    vec2 q=p-vec2(x0,0.18);
    float stick=sdSeg(q,vec2(0.,-0.10),vec2(0.,0.10))-0.022;
    float cup=max(length((q-vec2(0.,0.13))*vec2(1.,1.6))-0.06, q.y-0.16);
    float brk=sdBox(q-vec2(0.,-0.12),vec2(0.05,0.03));
    float t=min(min(stick,cup),brk);
    if(t<0.){ s.alb=vec3(0.25,0.15,0.06)*(0.7+0.5*fbm(q*50.,4)); s.h=1.5; }
  }
  // sarcofago dorado abierto, parado al centro
  vec2 q=p-vec2(0.10,-0.12);
  float wsh=0.58*(1.0-0.25*smoothstep(-0.3,-0.95,q.y)) - 0.10*smoothstep(0.55,0.90,q.y);
  float head=length((q-vec2(0.,0.72))/vec2(0.52,0.42))-1.;
  float outer=min(max(abs(q.x)-wsh, max(q.y-0.72, -0.70-q.y)), head);
  float inner=min(max(abs(q.x)-(wsh-0.09), max(q.y-0.72, -0.62-q.y)), length((q-vec2(0.,0.72))/vec2(0.43,0.34))-1.);
  if(outer<0.){
    float rim=step(0.,inner);
    // bandas pintadas en el marco: oro, azul lapislazuli, rojo
    float band=fract((q.y+atan(q.x,0.3)*0.0)*8.);
    vec3 gold=vec3(0.75,0.55,0.18)*(0.75+0.35*fbm(q*40.,5));
    vec3 paint=mix(vec3(0.08,0.18,0.42),vec3(0.50,0.10,0.06),step(0.5,band));
    vec3 c=mix(gold,paint,step(0.35,abs(fract(q.y*8.)-0.5))*0.0+step(0.8,fract(q.y*10.+0.5*step(0.,q.x)))*0.85);
    if(rim>0.5){ s.alb=c; s.h=1.2+0.5*smoothstep(0.,-0.05,outer); }
    else { s.alb=vec3(0.05,0.035,0.02)*(0.6+0.6*fbm(q*15.,4)); s.h=0.2; }   // interior
  }
  return s;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  S s=tomb(p);
  if(plate==0){ fc=vec4(pow(clamp(s.alb,0.,1.),vec3(1./2.2)),1.); return; }
  float e=0.002;
  float hx=tomb(p+vec2(e,0.)).h-tomb(p-vec2(e,0.)).h;
  float hy=tomb(p+vec2(0.,e)).h-tomb(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx*2.5,-hy*2.5,1.));
  fc=vec4(n.xy*0.5+0.5, p.y<FLOOR_Y?1.:s.g*0.5, 1.);
}
"""


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    prog = ctx.program(vertex_shader=VERT, fragment_shader=FRAG)
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
        img = img.reshape(H, SS, W, SS, 4).mean((1, 3))
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '3_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
