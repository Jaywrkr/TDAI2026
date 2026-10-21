"""Hornea las laminas de la escena 11 de Halloween (caldero de bruja).

La cabana de la bruja: muro de piedra irregular, vigas, estantes con
frascos, botellas, un libro de hechizos y una calavera, ramos de hierbas
colgando, y una chimenea de piedra detras del caldero. El caldero de
hierro (martillado, remaches, asas, patas) y la lena con brasas van en
una lamina aparte. Color y relieve por separado para que la luz verde de
la pocion y la naranja de las brasas los iluminen en vivo. El canal B
del relieve marca el vidrio de los frascos (brilla en vivo). Ver docs/53.

uso: python3 td/tools/bake_plates_caldero.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene11')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
W, H = 1280, 496
PLATES = [('1_cabana_color', 0), ('2_cabana_relieve', 1), ('3_caldero_color', 2), ('4_caldero_relieve', 3)]

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
float sdRBox(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
float infl(float d, float r0){ float k=clamp(-d/r0,0.,1.); return r0*sqrt(max(1.-(1.-k)*(1.-k),0.)); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

const float FLOOR_Y=-0.95;
struct S { vec3 alb; float h; float glass; float a; };

// piedra irregular (voronoi)
vec3 stoneCell(vec2 p, out float edge){
  vec2 g=p*vec2(3.2,4.4); vec2 i=floor(g);
  float d1=9., d2=9.; vec2 best=vec2(0.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 c=i+vec2(x,y); vec2 o=c+0.15+0.7*h22(c);
    float d=length(g-o);
    if(d<d1){ d2=d1; d1=d; best=c; } else if(d<d2) d2=d;
  }
  edge=d2-d1;
  return vec3(best, h21(best));
}

S hut(vec2 p){
  S s; s.glass=0.; s.a=1.;
  if(p.y<FLOOR_Y){
    float z=1.0/((FLOOR_Y-p.y)+0.10);
    float u=p.x*z*0.5;
    float fu=fract(u*2.5);
    float board=smoothstep(0.,0.03,fu)*smoothstep(1.,0.97,fu);
    s.alb=vec3(0.16,0.10,0.06)*(0.6+0.6*fbm(vec2(u*12.,z),6))*(0.7+0.3*board);
    s.h=board*0.4; s.alb*=mix(1.,0.5,smoothstep(-1.0,-1.2,p.y));
    return s;
  }
  float e; vec3 c=stoneCell(p,e);
  float st=smoothstep(0.025,0.07,e);
  vec3 sc=mix(vec3(0.22,0.20,0.18),vec3(0.28,0.24,0.19),c.z)*(0.7+0.4*fbm(p*25.+c.xy,5));
  // fase 28: piedras abombadas (h en unidades de 1/100: la normal sale de h*0.01 por unidad de mundo)
  s.alb=mix(vec3(0.06,0.05,0.04),sc,st); s.h=100.*(0.035*sqrt(smoothstep(0.02,0.13,e))+0.004*(fbm(p*50.,3)-0.5));
  s.alb*=0.55+0.45*smoothstep(0.02,0.08,e);                                       // oclusion en las juntas
  // chimenea detras del caldero: boca oscura con arco
  vec2 fq=p-vec2(0.,-0.50);
  float arch=max(sdBox(fq-vec2(0.,-0.10),vec2(0.92,0.40)), -(length(fq-vec2(0.,0.30))-0.92)*0.+0.);
  float mouthF=min(sdBox(fq-vec2(0.,-0.20),vec2(0.86,0.30)), length((fq-vec2(0.,0.10))*vec2(1.,1.6))-0.86);
  if(mouthF<0.){ s.alb=vec3(0.03,0.025,0.02)*(0.6+0.6*fbm(fq*8.,4)); s.h=0.; }
  float lintel=sdBox(fq-vec2(0.,0.72),vec2(1.15,0.08));
  if(lintel<0.){ s.alb=vec3(0.18,0.11,0.06)*(0.6+0.5*fbm(vec2(fq.x*20.,fq.y*4.),5)); s.h=5.+100.*infl(lintel,0.05)+0.8*fbm(vec2(fq.x*20.,fq.y*4.),5); }
  // vigas del techo
  if(p.y>1.00){ s.alb=vec3(0.14,0.08,0.045)*(0.6+0.6*fbm(vec2(p.x*3.,p.y*25.),6)); s.h=1.2; }
  // estantes con frascos a los costados
  for(int k=0;k<2;k++){
    float sx = k==0? -2.25 : 2.25;
    for(int r=0;r<2;r++){
      float sy = 0.05 + float(r)*0.48;
      float shelf=sdBox(p-vec2(sx,sy),vec2(0.62,0.025));
      if(shelf<0.){ s.alb=vec3(0.20,0.12,0.06)*(0.6+0.5*fbm(vec2(p.x*20.,p.y*80.),5)); s.h=1.5; }
      // sombra bajo el estante
      s.alb*=1.-0.5*exp(-pow((p.y-(sy-0.05))/0.03,2.))*step(abs(p.x-sx),0.62);
      for(int j=0;j<5;j++){
        float fj=float(j);
        float hh=h21(vec2(fj+float(k)*7.,float(r)));
        float jx=sx-0.50+fj*0.25;
        float jh=0.10+0.14*hh, jw=0.035+0.035*h21(vec2(fj,float(r)+3.));
        vec2 jq=p-vec2(jx,sy+0.025);
        float type=floor(h21(vec2(fj,float(k)*3.+float(r)))*3.);
        float d;
        if(type<0.5) d=sdRBox(jq-vec2(0.,jh*0.5),vec2(jw,jh*0.5),0.012);                 // frasco
        else if(type<1.5) d=min(length((jq-vec2(0.,jh*0.35))/vec2(1.,0.9))-jw*1.2, sdBox(jq-vec2(0.,jh*0.85),vec2(jw*0.35,jh*0.25)));  // botella redonda
        else d=min(sdRBox(jq-vec2(0.,jh*0.4),vec2(jw*0.8,jh*0.4),0.01), sdBox(jq-vec2(0.,jh*0.92),vec2(jw*0.3,jh*0.12)));  // botella alta
        if(d<0.){
          float u=jq.x/(jw*1.2);
          vec3 lc=hsv(vec3(h21(vec2(fj,float(r)+11.+float(k))),0.7,0.6));
          float fill=step(jq.y, jh*(0.3+0.5*hh));
          s.alb=mix(vec3(0.18,0.20,0.17),lc,fill*0.85)*(0.6+0.5*sqrt(max(1.-u*u,0.)));
          s.alb+=vec3(0.25)*smoothstep(0.6,0.95,-u)*0.5;
          s.h=5.+100.*infl(d,jw*1.1); s.glass=0.4+0.6*fill;
          // corcho
          if(jq.y>jh*0.98 && jq.y<jh*1.12 && abs(jq.x)<jw*0.4){ s.alb=vec3(0.35,0.22,0.10); s.glass=0.; }
        }
        float cork=sdBox(jq-vec2(0.,jh+0.015),vec2(jw*0.32,0.018));
        if(cork<0.){ s.alb=vec3(0.32,0.20,0.10)*(0.7+0.4*gn(jq*300.)); s.glass=0.; s.h=1.3; }
      }
    }
    // libro y calavera en el estante de arriba
  }
  // calavera sobre el estante derecho de arriba
  vec2 kq=(p-vec2(2.62,0.60))/0.10;
  float cr=length((kq-vec2(0.,0.15))/vec2(1.,0.9))-0.55;
  float jw2=sdBox(kq-vec2(0.,-0.30),vec2(0.30,0.15))-0.05;
  float sk=max(min(cr,jw2), -min(length(vec2(abs(kq.x)-0.22,kq.y-0.05))-0.15, max(abs(kq.x)*1.5+(kq.y+0.17)*0.8-0.06,-(kq.y+0.22))));
  if(sk<0.){ s.alb=vec3(0.62,0.56,0.44)*(0.7+0.4*fbm(kq*10.,4)); s.h=5.+100.*infl(sk*0.10,0.05); s.glass=0.; }
  // libro de hechizos sobre el estante izquierdo de arriba
  vec2 bq=p-vec2(-1.92,0.585);
  float book=sdBox(bq,vec2(0.20,0.06));
  if(book<0.){ s.alb=vec3(0.22,0.05,0.04)*(0.6+0.5*fbm(bq*40.,5)); if(abs(bq.y)<0.045&&bq.x>0.17) s.alb=vec3(0.6,0.55,0.4); if(abs(bq.x)<0.03&&abs(bq.y)<0.03) s.alb=vec3(0.55,0.45,0.15); s.h=1.4; s.glass=0.; }
  // ramos de hierbas colgando de la viga
  for(int i=0;i<6;i++){
    float fi=float(i);
    float hx=-1.5+fi*0.6+0.1*h21(vec2(fi,2.));
    vec2 q=p-vec2(hx,1.00);
    float str=max(abs(q.x)-0.003, max(q.y, -q.y-0.10));
    float bunch=max(length((q-vec2(0.,-0.24))*vec2(1.0,0.55))-0.10, -q.y-0.36);
    float stems=step(0.5,fract(q.x*90.+q.y*8.));
    if(str<0.){ s.alb=vec3(0.25,0.20,0.12); s.h=1.5; }
    if(bunch<0.){ s.alb=mix(vec3(0.12,0.16,0.06),vec3(0.28,0.22,0.10),h21(vec2(fi,4.)))*(0.6+0.5*fbm(q*vec2(60.,20.),4))*(0.8+0.3*stems); s.h=6.+100.*infl(bunch,0.08)+1.5*stems; s.glass=0.; }
  }
  return s;
}

S cauldron(vec2 p){
  S s; s.glass=0.; s.a=0.; s.alb=vec3(0.); s.h=0.;
  vec2 cp=p-vec2(0.,-0.42);
  // lena y brasas debajo
  for(int i=0;i<3;i++){
    float fi=float(i);
    vec2 lq=rot((fi-1.)*0.35)*(cp-vec2((fi-1.)*0.25,-0.50));
    float log1=sdRBox(lq,vec2(0.36,0.06),0.05);
    if(log1<0.){ float ring=step(0.30,abs(lq.x)); s.alb=mix(vec3(0.12,0.07,0.04)*(0.6+0.6*fbm(vec2(lq.x*30.,lq.y*60.),5)),vec3(0.30,0.20,0.10),ring); s.h=60.*infl(log1,0.06)+1.5*fbm(vec2(lq.x*30.,lq.y*60.),5)*(1.-ring); s.a=1.; s.glass=0.0; }
  }
  // brasas: el canal glass marca donde arden (en vivo)
  float coals=(length((cp-vec2(0.,-0.57))/vec2(0.60,0.07))-1.0)*0.07 + (gn(cp*vec2(40.,8.))-0.5)*0.02;
  if(coals<0.){ float g=fbm(cp*vec2(20.,30.),5); s.alb=vec3(0.06,0.03,0.02); s.glass=smoothstep(0.45,0.7,g); s.h=0.6; s.a=1.; }
  float bodyD=length(cp/vec2(0.62,0.48))-1.0;
  float body=max(bodyD*0.48, cp.y-0.20);
  vec2 mp=(cp-vec2(0.,0.20))/vec2(0.58,0.10);
  float mouth=length(mp)-1.0;
  float lip=abs(mouth)-0.18;
  float legs=1e3;
  for(int k=-1;k<=1;k+=2){ vec2 lq=cp-vec2(float(k)*0.38,-0.50); legs=min(legs,max(abs(lq.x)-0.045+lq.y*0.15,abs(lq.y)-0.09)); }
  // asas
  float handle=1e3;
  for(int k=-1;k<=1;k+=2){ vec2 hq=cp-vec2(float(k)*0.60,0.05); handle=min(handle, abs(length(hq*vec2(1.,1.2))-0.07)-0.014); }
  float pot=min(min(body,lip*0.1),min(legs,handle));
  if(pot<0.){
    s.a=1.;
    vec2 q=cp/vec2(0.62,0.48);
    vec3 n=normalize(vec3(q*0.9, sqrt(max(1.-dot(q,q),0.))+0.05));
    float ham=fbm(cp*30.,5);
    vec3 iron=vec3(0.10,0.10,0.11)*(0.65+0.5*ham);
    iron=mix(iron,vec3(0.22,0.10,0.04),smoothstep(0.6,0.8,fbm(cp*8.,5))*0.6);   // oxido
    // remaches en una franja
    vec2 rv=vec2(fract(atan(q.x,1.0)*6.)-0.5, cp.y+0.02);
    if(length(rv*vec2(1.,6.))<0.10) { iron=vec3(0.16); }
    // labio del borde
    if(lip<0.){ iron=vec3(0.13,0.13,0.14)*(0.7+0.4*fbm(cp*40.,4)); n=normalize(vec3(0.,1.,0.4)); }
    if(handle<0.){ iron=vec3(0.12); }
    s.alb=iron; s.h=1.+ham*1.2; s.glass=0.;
    if(handle<0.) s.h=1.+100.*infl(handle,0.014);
  }
  // la boca: transparente (ahi va el liquido en vivo)
  if(mouth<-0.18 && cp.y>0.10) { s.a=0.; }
  return s;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  bool isPot = plate>=2;
  S s = isPot ? cauldron(p) : hut(p);
  if(plate==0||plate==2){ fc=vec4(pow(clamp(s.alb*2.,0.,1.),vec3(1./2.2)), s.a); return; }
  float e=0.002;
  S sx1 = isPot? cauldron(p+vec2(e,0.)) : hut(p+vec2(e,0.));
  S sx0 = isPot? cauldron(p-vec2(e,0.)) : hut(p-vec2(e,0.));
  S sy1 = isPot? cauldron(p+vec2(0.,e)) : hut(p+vec2(0.,e));
  S sy0 = isPot? cauldron(p-vec2(0.,e)) : hut(p-vec2(0.,e));
  vec3 n=normalize(vec3(-(sx1.h-sx0.h)*2.5,-(sy1.h-sy0.h)*2.5,1.));
  if(isPot && s.a>0.){
    vec2 cp=p-vec2(0.,-0.42); vec2 q=cp/vec2(0.62,0.48);
    if(dot(q,q)<1.) n=normalize(n+vec3(q*0.9, 0.));
  }
  fc=vec4(n.xy*0.5+0.5, s.glass, s.a);
}
"""


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    src = FRAG.replace('float h21(', 'vec3 hsv(vec3 c){ vec3 r=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z*mix(vec3(1.),r,c.y); }\nfloat h21(', 1)
    prog = ctx.program(vertex_shader=VERT, fragment_shader=src)
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
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '5_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
