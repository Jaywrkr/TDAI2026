"""Hornea las laminas de la escena 05 de Halloween (sangre en el bano).

Pared de azulejos viejos (color y relieve), pintura descascarada arriba,
fluorescente, piso de baldosas en perspectiva con desague, y una lamina
de manchas: huellas de manos, arrastres y salpicaduras de sangre seca.
Ver docs/53.

uso: python3 td/tools/bake_plates_sangre.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene05')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
W, H = 1280, 496
PLATES = [('1_pared_color', 0), ('2_pared_relieve', 1), ('3_manchas', 2)]

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
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }

const float FLOOR_Y = -0.70;
const float TILE_TOP = 0.78;

struct S { vec3 alb; float h; float rough; };

S wallAt(vec2 p){
  S s;
  if(p.y < FLOOR_Y){
    // piso de baldosas en perspectiva
    float z=1.0/((FLOOR_Y-p.y)+0.12);
    vec2 g=vec2(p.x*z*0.45, z*0.30);
    vec2 id=floor(g/0.2); vec2 f=fract(g/0.2);
    float gw=0.04;
    float tile=smoothstep(0.0,gw,f.x)*smoothstep(1.,1.-gw,f.x)*smoothstep(0.,gw*1.6,f.y)*smoothstep(1.,1.-gw*1.6,f.y);
    vec3 tc=mix(vec3(0.55,0.56,0.52), vec3(0.42,0.44,0.40), step(0.5,mod(id.x+id.y,2.)));
    tc*=0.75+0.3*fbm(g*6.+id,5);
    float grime=fbm(g*vec2(2.,3.),5);
    tc*=1.-0.5*smoothstep(0.45,0.8,grime);
    vec3 grout=vec3(0.12,0.11,0.09);
    s.alb=mix(grout,tc,tile); s.h=tile*0.6; s.rough=0.3;
    // desague
    vec2 dq=vec2(p.x*z*0.45, (z-1.0/(0.45+0.12))*0.3);
    float dr=length(dq*vec2(1.,1.6))-0.05;
    if(dr<0.){ float sl=step(0.5,fract(dq.x*60.)); s.alb=vec3(0.05)*(0.5+sl); s.h=0.2; s.rough=0.5; }
    s.alb*=mix(1.0,0.5,smoothstep(-0.75,-1.2,p.y));
    return s;
  }
  if(p.y > TILE_TOP){
    // pintura descascarada sobre revoque
    float peel=smoothstep(0.55,0.62,fbm(p*vec2(4.,6.),6));
    vec3 paint=vec3(0.52,0.55,0.50)*(0.8+0.3*fbm(p*40.,4));
    vec3 plaster=vec3(0.36,0.32,0.27)*(0.7+0.5*fbm(p*25.,5));
    s.alb=mix(paint,plaster,peel); s.h=0.5-peel*0.3; s.rough=0.9;
    // humedad que baja
    s.alb*=1.-0.4*smoothstep(0.5,0.8,fbm(vec2(p.x*6.,p.y*1.5),5));
    // moldura sobre los azulejos
    float mold=abs(p.y-TILE_TOP-0.02)-0.02;
    if(mold<0.){ s.alb=vec3(0.45,0.46,0.43); s.h=1.0-abs(p.y-TILE_TOP-0.02)*20.; s.rough=0.4; }
    // fluorescente: caja metalica arriba al centro
    float fx=sdBox(p-vec2(0.0,1.08),vec2(0.60,0.045));
    if(fx<0.){ s.alb=vec3(0.30,0.30,0.28)*(0.8+0.3*gn(p*200.)); s.h=1.2; s.rough=0.3;
      float tube=abs(p.y-1.06)-0.016; if(tube<0. && abs(p.x)<0.55){ s.alb=vec3(0.85); s.h=1.4; s.rough=0.1; } }
    return s;
  }
  // azulejos de pared
  float ts=0.16;
  vec2 g=vec2(p.x+3.1, p.y-FLOOR_Y)/ts;
  vec2 id=floor(g); vec2 f=fract(g);
  vec2 e=min(f,1.-f)*ts;
  float edge=min(e.x,e.y);
  float grout=smoothstep(0.004,0.0065,edge);
  float bev=smoothstep(0.004,0.016,edge);
  float hh=h21(id);
  vec3 tc=mix(vec3(0.78,0.80,0.74),vec3(0.70,0.76,0.72),hh);
  tc*=0.88+0.15*fbm(p*30.+id,4);
  // azulejo roto / caido
  float broken=step(0.965,hh);
  float crack=smoothstep(0.985,0.997,1.-abs(fbm(p*9.+id,5)*2.-1.))*step(0.88,h21(id+3.));
  vec3 concrete=vec3(0.25,0.24,0.22)*(0.6+0.6*fbm(p*50.,5));
  // mugre: mas en las juntas y abajo, chorreones de oxido
  float grime=fbm(vec2(p.x*3.,p.y*2.),5);
  float streak=smoothstep(0.6,0.85,fbm(vec2(p.x*25.,p.y*1.2),5))*smoothstep(TILE_TOP,-0.3,p.y);
  tc*=1.-0.50*smoothstep(0.40,0.8,grime)-0.35*streak;
  tc*=0.85+0.15*smoothstep(0.3,0.7,fbm(p*vec2(1.5,0.8),4));
  tc=mix(tc,tc*vec3(1.0,0.82,0.62),streak*0.6);
  tc*=1.-crack*0.6;
  vec3 gc=vec3(0.30,0.28,0.24)*(0.6+0.5*gn(p*300.))*(1.-0.4*grime);
  s.alb=mix(gc,tc,grout);
  s.alb=mix(s.alb,concrete,broken*grout);
  s.h=grout*(0.6+0.4*bev)-broken*0.5-crack*0.3;
  s.rough=mix(0.9,0.12,grout)*(1.-broken)+broken*0.9;
  // zocalo oscuro abajo
  s.alb*=mix(0.6,1.0,smoothstep(FLOOR_Y,FLOOR_Y+0.25,p.y));
  return s;
}

// manchas de sangre seca: huellas, arrastres, salpicaduras
float hand(vec2 p, vec2 c, float s, float a){
  vec2 q=rot(a)*(p-c)/s;
  float palm=length(q*vec2(1.0,0.85))-0.36;
  float d=palm;
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec2 b=vec2(-0.22+fi*0.15, 0.28);
    vec2 tip=b+vec2((fi-1.5)*0.05, 0.42-abs(fi-1.2)*0.08);
    d=min(d, sdSeg(q,b,tip)-0.065);
  }
  d=min(d, sdSeg(q,vec2(-0.30,-0.05),vec2(-0.55,0.22))-0.07);   // pulgar
  d+=(fbm(q*9.,5)-0.5)*0.12;
  return d*s;
}
float stains(vec2 p){
  float v=0.;
  // huellas de manos con arrastre hacia abajo
  for(int i=0;i<4;i++){
    float fi=float(i);
    vec2 c = i==0?vec2(-1.75,0.35): i==1?vec2(-1.45,0.10): i==2?vec2(1.55,0.42): vec2(0.65,-0.05);
    float a=(h21(vec2(fi,3.))-0.5)*0.6;
    float d=hand(p,c,0.22,a);
    // arrastre: la mano baja dejando estrias
    float drag=0.;
    if(i!=2){
      vec2 q=p-c;
      float len=0.35+0.3*h21(vec2(fi,5.));
      float inX=smoothstep(0.075,0.05,abs(q.x));
      float stri=0.55+0.45*sin(q.x*140.+fi);
      drag=inX*smoothstep(0.02,-0.05,q.y)*smoothstep(-len,-len*0.4,q.y)*stri;
    }
    float m=smoothstep(0.004,-0.004,d)*smoothstep(0.30,0.55,fbm(p*14.+fi,5))*(0.7+0.3*fbm(p*60.,4));
    v=max(v,max(m,drag*0.85));
  }
  // salpicaduras: gotas con cola
  for(int i=0;i<3;i++){
    float fi=float(i);
    vec2 c = i==0?vec2(-0.55,0.45): i==1?vec2(2.25,0.05): vec2(0.15,0.55);
    vec2 q=p-c;
    float ang=atan(q.y,q.x);
    float r=length(q);
    float blob=r-(0.06+0.05*pow(gn(vec2(ang*4.,fi)),2.));
    float m=smoothstep(0.004,-0.004,blob);
    vec2 g=q*28.; vec2 id=floor(g); vec2 f=fract(g)-0.5-(h22(id+fi)-0.5)*0.6;
    float dr=0.08+0.22*h21(id+fi*3.);
    float drops=smoothstep(dr,dr-0.05,length(f))*step(0.78,h21(id+7.+fi))*smoothstep(0.38,0.08,r);
    v=max(v,max(m,drops));
  }
  // chorreados secos debajo de la franja de arriba
  float cx=floor((p.x+3.1)/0.13);
  float hh=h21(vec2(cx,9.));
  float x0=(cx+0.5)*0.13-3.1+(hh-0.5)*0.05;
  float len=0.15+0.5*h21(vec2(cx,11.));
  float trail=smoothstep(0.012,0.004,abs(p.x-x0))*step(TILE_TOP-len,p.y)*step(p.y,TILE_TOP)*step(0.55,hh);
  v=max(v,trail*0.7*(0.6+0.4*smoothstep(TILE_TOP-len,TILE_TOP,p.y)));
  return v;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==2){ float s=stains(p); fc=vec4(s, fbm(p*40.,4), 0., 1.); return; }
  S s=wallAt(p);
  if(plate==0){ fc=vec4(pow(clamp(s.alb,0.,1.),vec3(1./2.2)),1.); return; }
  float e=0.002;
  float hx=wallAt(p+vec2(e,0.)).h-wallAt(p-vec2(e,0.)).h;
  float hy=wallAt(p+vec2(0.,e)).h-wallAt(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx*2.5,-hy*2.5,1.));
  fc=vec4(n.xy*0.5+0.5, s.rough, 1.);
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
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '4_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
