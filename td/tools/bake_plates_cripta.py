"""Hornea las laminas de la escena 10 de Halloween (portal en la cripta).

Una cripta de piedra: muros de sillares, un arco de piedra tallada con
dovelas donde se abre el portal (el centro queda transparente), dos
columnas, piso de losas en perspectiva con un circulo grabado, y en primer
plano velas en el piso, calaveras y cadenas. Color y relieve por separado
para que el fuego del portal ilumine en vivo. Ver docs/53.

uso: python3 td/tools/bake_plates_cripta.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene10')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
W, H = 1280, 496
PLATES = [('1_cripta_color', 0), ('2_cripta_relieve', 1), ('3_frente', 2)]

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

const float FLOOR_Y=-0.62;
const vec2 PC=vec2(0.0,0.16);      // centro del portal
const float ARCH_IN=0.74, ARCH_OUT=0.94;

struct S { vec3 alb; float h; float a; };

S crypt(vec2 p){
  S s; s.a=1.;
  if(p.y<FLOOR_Y){
    // losas en perspectiva
    float z=1.0/((FLOOR_Y-p.y)+0.10);
    vec2 g=vec2(p.x*z*0.40, z*0.28);
    vec2 id=floor(g/0.25+vec2(0.5*mod(floor(g.y/0.25),2.),0.)); vec2 f=fract(g/0.25+vec2(0.5*mod(floor(g.y/0.25),2.),0.));
    float jw=0.035;
    float slab=smoothstep(0.,jw,f.x)*smoothstep(1.,1.-jw,f.x)*smoothstep(0.,jw*1.5,f.y)*smoothstep(1.,1.-jw*1.5,f.y);
    vec3 st=vec3(0.22,0.20,0.19)*(0.7+0.4*h21(id))*(0.7+0.4*fbm(g*7.+id,5));
    float crack=smoothstep(0.993,0.999,1.-abs(fbm(g*2.+id,5)*2.-1.));
    st*=1.-crack*0.5;
    s.alb=mix(vec3(0.06,0.055,0.05),st,slab); s.h=slab*0.6-crack*0.3;
    // circulo grabado en el piso, frente al portal
    vec2 cq=vec2(p.x*z*0.40, (z-1.0/(0.42+0.10))*0.28)*vec2(1.,3.2);
    float rr=length(cq);
    float ring=min(abs(rr-0.55)-0.012, abs(rr-0.45)-0.008);
    float marks=abs(fract(atan(cq.y,cq.x)/6.2832*12.)-0.5)*0.9*rr;
    ring=min(ring, max(marks-0.01, abs(rr-0.50)-0.05));
    if(ring<0.){ s.alb*=0.45; s.h-=0.4; }
    s.alb*=mix(1.,0.45,smoothstep(-0.7,-1.2,p.y));
    return s;
  }
  // muro de sillares
  vec2 bq=vec2(p.x/0.34+0.5*mod(floor(p.y/0.17),2.), p.y/0.17);
  vec2 id=floor(bq); vec2 f=fract(bq);
  vec2 e=min(f,1.-f)*vec2(0.34,0.17);
  float edge=min(e.x,e.y);
  float stone=smoothstep(0.006,0.012,edge);
  float bev=smoothstep(0.006,0.03,edge);
  vec3 wc=vec3(0.20,0.18,0.17)*(0.65+0.45*h21(id))*(0.7+0.45*fbm(p*vec2(18.,24.)+id,6));
  wc=mix(wc,vec3(0.10,0.13,0.08),smoothstep(0.6,0.8,fbm(p*5.+id,5))*0.6);   // moho
  float chip=smoothstep(0.62,0.70,fbm(p*30.+id,4));
  s.alb=mix(vec3(0.05),wc*(1.-chip*0.4),stone);
  s.h=stone*(0.5+0.5*bev)-chip*0.3+(fbm(p*60.+id,3)-0.5)*0.15;
  // arco de piedra con dovelas alrededor del portal
  vec2 aq=p-PC;
  float ar=length(aq); float aa=atan(aq.y,aq.x);
  if(ar<ARCH_OUT && aq.y>FLOOR_Y-PC.y){
    float vous=fract(aa/6.2832*22.);
    float joint=smoothstep(0.0,0.04,vous)*smoothstep(1.,0.96,vous)*smoothstep(ARCH_IN,ARCH_IN+0.02,ar)*smoothstep(ARCH_OUT,ARCH_OUT-0.02,ar);
    float ab=smoothstep(ARCH_IN,ARCH_IN+0.06,ar)*smoothstep(ARCH_OUT,ARCH_OUT-0.06,ar);
    vec3 ac=vec3(0.24,0.22,0.20)*(0.75+0.35*h21(vec2(floor(aa/6.2832*22.),3.)))*(0.7+0.4*fbm(aq*20.,5));
    // simbolos tallados en las dovelas
    float sym=step(0.6,h21(vec2(floor(aa/6.2832*22.),7.)))*step(abs(ar-(ARCH_IN+ARCH_OUT)*0.5),0.05)*step(abs(vous-0.5),0.12);
    s.alb=mix(vec3(0.04),ac*(1.-sym*0.6),joint); s.h=0.9+ab*0.6-sym*0.4;
  }
  if(ar<ARCH_IN){ s.alb=vec3(0.); s.h=0.; s.a=0.; }
  // columnas
  for(int k=0;k<2;k++){
    float cx = k==0? -2.05 : 2.05;
    float cd=abs(p.x-cx)-0.20;
    if(cd<0.){
      float u=(p.x-cx)/0.20;
      float cyl=sqrt(max(1.-u*u,0.));
      float flute=0.85+0.15*abs(sin(u*9.42));
      vec3 cc=vec3(0.23,0.21,0.20)*(0.7+0.35*fbm(vec2(u*3.,p.y*10.)+float(k),5))*flute;
      // capitel y basa
      float cap=step(0.90,p.y)+step(p.y,FLOOR_Y+0.10);
      s.alb=cc*(1.-cap*0.15); s.h=0.8+cyl*1.2+cap*0.3; s.a=1.;
    }
    float capB=sdBox(p-vec2(cx,0.95),vec2(0.28,0.05));
    float baseB=sdBox(p-vec2(cx,FLOOR_Y+0.05),vec2(0.27,0.05));
    if(min(capB,baseB)<0.){ s.alb=vec3(0.25,0.23,0.21)*(0.7+0.4*fbm(p*20.,4)); s.h=1.6+0.4*step(0.,-min(capB,baseB)-0.02); s.a=1.; }
  }
  return s;
}

vec4 front(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  // velas en el piso formando un semicirculo
  for(int i=0;i<7;i++){
    float fi=float(i);
    float ang=mix(-2.6,-0.54,fi/6.);
    vec2 base=vec2(cos(ang)*1.55, FLOOR_Y-0.25+sin(ang)*0.22);
    float hgt=0.16+0.22*h21(vec2(fi,2.)); float r=0.035+0.015*h21(vec2(fi,3.));
    vec2 q=p-base;
    float body=sdBox(q-vec2(0.,hgt*0.5),vec2(r,hgt*0.5));
    for(int k=0;k<3;k++){
      float sx=(h21(vec2(fi,float(k)+5.))-0.5)*2.*r*0.9;
      float len=hgt*(0.2+0.5*h21(vec2(fi,float(k)+9.)));
      body=min(body, length(max(abs(q-vec2(sx,hgt-len*0.5))-vec2(r*0.15,len*0.5),0.))-r*0.10);
    }
    body=min(body, length((q-vec2(0.,0.006))*vec2(1.,4.))-r*1.8);
    if(body<0.){ float u=q.x/r; c=vec3(0.80,0.74,0.60)*(0.4+0.6*sqrt(max(1.-u*u,0.)))*(0.85+0.2*fbm(q*100.,3)); a=1.; }
    float wick=sdBox(q-vec2(0.,hgt+0.01),vec2(0.003,0.012));
    if(wick<0.){ c=vec3(0.02); a=1.; }
  }
  // calaveras en el piso
  for(int i=0;i<3;i++){
    vec2 cpos = i==0? vec2(-1.05,-0.92): i==1? vec2(1.25,-0.98): vec2(-2.55,-0.80);
    float s= i==2?0.16:0.22;
    vec2 q=(p-cpos)/s; q=rot((h21(vec2(float(i),4.))-0.5)*0.5)*q;
    float cr=length((q-vec2(0.,0.15))/vec2(1.,0.9))-0.55;
    float jw=sdBox(q-vec2(0.,-0.30),vec2(0.30,0.15))-0.05;
    float sk=min(cr,jw);
    float eye=length(vec2(abs(q.x)-0.22,q.y-0.05))-0.15;
    float nose=max(abs(q.x)*1.5+(q.y+0.17)*0.8-0.06,-(q.y+0.22));
    float teeth=max(abs(fract(q.x*7.)-0.5)-0.06, abs(q.y+0.33)-0.06);
    float d=max(sk,-min(min(eye,nose),teeth*step(abs(q.x),0.25)));
    if(d<0.){
      vec3 n=normalize(vec3(q*0.8,1.));
      c=vec3(0.70,0.64,0.50)*(0.35+0.65*max(dot(n,normalize(vec3(0.,0.6,0.8))),0.))*(0.8+0.3*fbm(q*20.,4));
      a=1.;
    }
  }
  // cadenas que cuelgan de las columnas
  for(int k=0;k<2;k++){
    float cx = k==0? -1.80 : 1.80;
    float sag=0.;
    vec2 q=p-vec2(cx,0.55);
    float along=q.y/0.055;
    float id=floor(along);
    vec2 f=vec2(q.x/0.055, fract(along)-0.5);
    float link = mod(id,2.)<0.5 ? abs(length(f*vec2(1.6,1.0))-0.40)-0.08 : max(abs(f.x)-0.06, abs(f.y)-0.45);
    if(link<0. && q.y<0.35 && q.y>-0.65){ c=vec3(0.20,0.18,0.16)*(0.6+0.8*smoothstep(0.,0.3,f.x+0.2)); a=1.; }
  }
  return vec4(c,a);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==2){ vec4 f=front(p); fc=vec4(pow(clamp(f.rgb*1.,0.,1.),vec3(1./2.2)), f.a); return; }
  S s=crypt(p);
  if(plate==0){ fc=vec4(pow(clamp(s.alb*2.,0.,1.),vec3(1./2.2)), s.a); return; }
  float e=0.002;
  float hx=crypt(p+vec2(e,0.)).h-crypt(p-vec2(e,0.)).h;
  float hy=crypt(p+vec2(0.,e)).h-crypt(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx*2.5,-hy*2.5,1.));
  fc=vec4(n.xy*0.5+0.5, p.y<FLOOR_Y?1.:0., s.a);
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
        a = img[..., 3:4]
        pm = np.concatenate([img[..., :3] * a, a], -1).reshape(H, SS, W, SS, 4).mean((1, 3))
        rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
        img = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '4_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
