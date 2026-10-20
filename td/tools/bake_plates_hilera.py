"""Hornea las laminas de la escena 13 de Halloween (calabazas en hilera).

Un campo de calabazas de noche detras de un muro de piedra: colinas,
fardos de paja, maizal, granero y casa de campo con ventana, cerca de
madera y arboles pelados (lamina de fondo), y el muro de piedra con
remate y musgo donde se apoyan las calabazas (color + relieve). Las
calabazas reusan la calabaza principal de la escena 01. Ver docs/53.

uso: python3 td/tools/bake_plates_hilera.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene13')
SS = 2
PLATES = [
    ('1_campo', 0, (-3.1, -0.45, 3.1, 0.45), 1280, 186),
    ('2_muro_color', 1, (-3.1, -1.2, 3.1, -0.26), 1280, 194),
    ('3_muro_relieve', 2, (-3.1, -1.2, 3.1, -0.26), 1280, 194),
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
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(i)-.5,f), b=dot(h22(i+vec2(1,0))-.5,f-vec2(1,0));
  float c=dot(h22(i+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i+vec2(1,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fbm(vec2 p,int o){ float s=0.,a=.5,n=0.; for(int i=0;i<10;i++){ if(i>=o)break; s+=a*gn(p); n+=a; a*=.5; p=mat2(.8,-.6,.6,.8)*p*2.03+11.3; } return s/n; }
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

const float WALL_TOP=-0.32;

// fondo; gWin marca las ventanas (se encienden en vivo, van en el canal B)
float gWin=0.;
vec4 field(vec2 p){
  vec3 c=vec3(0.); float a=0.; float win=0.;
  // colina lejana
  float h1=-0.05+0.10*fbm(vec2(p.x*0.5,2.),5)+0.05*sin(p.x*0.7);
  float m=smoothstep(0.003,-0.003,p.y-h1);
  c=mix(c,vec3(0.08,0.07,0.10)*(0.7+0.4*fbm(p*vec2(5.,15.),4)),m); a=max(a,m);
  // arboles pelados en la colina
  for(int i=0;i<6;i++){
    float fi=float(i);
    float x0=-2.8+fi*1.1+0.3*h21(vec2(fi,1.));
    float base=-0.05+0.10*fbm(vec2(x0*0.5,2.),5)+0.05*sin(x0*0.7);
    vec2 q=p-vec2(x0,base);
    float tr=max(abs(q.x)-0.010*(1.-q.y*2.), max(-q.y, q.y-0.32));
    for(int k=0;k<4;k++){ vec2 bq=rot((mod(float(k),2.)*2.-1.)*0.7)*(q-vec2(0.,0.10+float(k)*0.05)); tr=min(tr,max(abs(bq.x)-0.004,max(-bq.y,bq.y-0.12))); }
    float tm=smoothstep(0.002,-0.002,tr);
    c=mix(c,vec3(0.03,0.03,0.04),tm); a=max(a,tm);
  }
  // granero y casa
  vec2 bq=p-vec2(1.55,-0.06);
  float barn=min(sdBox(bq-vec2(0.,0.08),vec2(0.18,0.08)), max(abs(bq.x)*0.65+(bq.y-0.16)-0.12, 0.16-bq.y));
  vec2 hq=p-vec2(-1.35,-0.04);
  float house=min(sdBox(hq-vec2(0.,0.07),vec2(0.14,0.07)), max(abs(hq.x)*0.9+(hq.y-0.14)-0.12, 0.14-hq.y));
  house=min(house, sdBox(hq-vec2(0.08,0.22),vec2(0.015,0.05)));
  float bm=smoothstep(0.002,-0.002,min(barn,house));
  c=mix(c,vec3(0.04,0.03,0.035),bm); a=max(a,bm);
  if(sdBox(hq-vec2(-0.06,0.07),vec2(0.025,0.025))<0. || sdBox(hq-vec2(0.06,0.07),vec2(0.025,0.025))<0.) win=1.;
  if(sdBox(bq-vec2(0.,0.20),vec2(0.03,0.03))<0.) win=1.;
  // maizal seco
  float corn=-0.20+0.06*gn(vec2(p.x*30.,1.))+0.03*sin(p.x*2.);
  float stalks=step(0.4,fract(p.x*55.+gn(vec2(p.x*3.,p.y*5.))*0.8));
  float cm=smoothstep(0.003,-0.003,p.y-corn)*mix(0.5,1.,stalks);
  c=mix(c,vec3(0.16,0.12,0.06)*(0.5+0.6*fbm(p*vec2(40.,10.),4)),cm); a=max(a,cm);
  // campo con fardos de paja y calabacitas
  float gy=-0.30+0.02*sin(p.x*3.);
  float gm=smoothstep(0.003,-0.003,p.y-gy);
  c=mix(c,vec3(0.08,0.07,0.04)*(0.6+0.6*fbm(p*vec2(20.,40.),5)),gm); a=max(a,gm);
  for(int i=0;i<5;i++){
    float fi=float(i);
    vec2 hb=p-vec2(-2.6+fi*1.25+0.2*h21(vec2(fi,4.)),-0.27);
    float bale=length(max(abs(hb)-vec2(0.09,0.045),0.))-0.02;
    if(bale<0.){ c=vec3(0.38,0.30,0.14)*(0.6+0.5*fbm(hb*vec2(60.,20.),4))*(0.6+0.4*smoothstep(-0.06,0.06,hb.y)); a=1.; }
  }
  for(int i=0;i<12;i++){
    float fi=float(i);
    vec2 pq=p-vec2(-2.9+fi*0.5+0.2*h21(vec2(fi,7.)),-0.33+0.03*h21(vec2(fi,8.)));
    float pk=length(pq/vec2(1.3,1.))-0.025;
    if(pk<0.){ c=vec3(0.55,0.22,0.03)*(0.6+0.4*smoothstep(-0.02,0.02,pq.y)); a=1.; }
  }
  // cerca de madera
  for(int i=0;i<16;i++){
    float x=-3.0+float(i)*0.40;
    vec2 q=p-vec2(x,-0.22);
    float post=sdBox(q,vec2(0.012,0.07));
    if(post<0.){ c=vec3(0.07,0.05,0.035); a=1.; }
  }
  float rail=min(abs(p.y+0.18)-0.008, abs(p.y+0.25)-0.008);
  if(rail<0.){ c=vec3(0.06,0.045,0.03); a=1.; }
  gWin=win;
  return vec4(c, a);
}

struct S { vec3 alb; float h; };
S wall(vec2 p){
  S s;
  if(p.y>WALL_TOP){ s.alb=vec3(0.); s.h=0.; return s; }
  // remate de lajas arriba
  if(p.y>WALL_TOP-0.06){
    float id=floor(p.x/0.38+0.5*h21(vec2(floor(p.x/0.38),1.)));
    float f=fract(p.x/0.38);
    float j=smoothstep(0.,0.02,f)*smoothstep(1.,0.98,f);
    s.alb=vec3(0.26,0.24,0.22)*(0.7+0.4*h21(vec2(id,2.)))*(0.7+0.4*fbm(p*vec2(20.,40.),5))*(0.4+0.6*j);
    s.alb=mix(s.alb,vec3(0.12,0.17,0.08),smoothstep(0.6,0.8,fbm(p*12.,4))*0.6);
    s.h=0.9*j+0.3*smoothstep(WALL_TOP-0.06,WALL_TOP-0.03,p.y); return s;
  }
  // piedras irregulares
  vec2 g=p*vec2(6.,9.); vec2 i=floor(g);
  float d1=9., d2=9.; vec2 best=vec2(0.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 cc=i+vec2(x,y); vec2 o=cc+0.2+0.6*h22(cc);
    float d=length((g-o)*vec2(1.,1.3));
    if(d<d1){ d2=d1; d1=d; best=cc; } else if(d<d2) d2=d;
  }
  float e=d2-d1;
  float st=smoothstep(0.04,0.12,e);
  vec3 sc=mix(vec3(0.20,0.19,0.18),vec3(0.26,0.23,0.19),h21(best))*(0.7+0.4*fbm(p*25.+best,5));
  sc=mix(sc,vec3(0.10,0.15,0.07),smoothstep(0.62,0.80,fbm(p*8.+best,5))*0.7);
  s.alb=mix(vec3(0.04,0.035,0.03),sc,st); s.h=st*(0.4+0.6*smoothstep(0.04,0.35,e));
  s.alb*=mix(1.,0.45,smoothstep(-0.7,-1.2,p.y));
  return s;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==0){ vec4 f=field(p); fc=vec4(pow(clamp(f.rgb*2.,0.,1.),vec3(1./2.2)), f.a); if(gWin>0.5) fc=vec4(0.,0.,1.,1.); return; }
  S s=wall(p);
  float a=p.y<=WALL_TOP?1.:0.;
  if(plate==1){ fc=vec4(pow(clamp(s.alb*2.,0.,1.),vec3(1./2.2)), a); return; }
  float e=0.002;
  float hx=wall(p+vec2(e,0.)).h-wall(p-vec2(e,0.)).h;
  float hy=wall(p+vec2(0.,e)).h-wall(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx*2.5,-hy*2.5,1.));
  fc=vec4(n.xy*0.5+0.5, 0., a);
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
        a = img[..., 3:4]
        pm = np.concatenate([img[..., :3] * a, a], -1).reshape(h, SS, w, SS, 4).mean((1, 3))
        rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
        img = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h), r)
    shutil.copy(os.path.join(SETS, 'scene01', '4_calabaza_color.png'), os.path.join(OUT, '4_calabaza_color.png'))
    shutil.copy(os.path.join(SETS, 'scene01', '5_calabaza_relieve.png'), os.path.join(OUT, '5_calabaza_relieve.png'))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '6_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
