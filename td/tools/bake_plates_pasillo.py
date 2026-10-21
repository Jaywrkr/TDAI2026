"""Hornea las laminas de la escena 07 de Halloween (fantasmas en el pasillo).

Un pasillo de mansion en perspectiva de un punto: piso de tablas con una
alfombra larga, zocalo de paneles de madera, empapelado oscuro con
moldura, puertas, retratos con marco dorado, vigas y arana en el techo,
y al fondo un ventanal en arco (vidrios transparentes: el cielo va en
vivo). Una segunda lamina marca los ojos de los retratos y la rendija de
las puertas. Ver docs/53.

uso: python3 td/tools/bake_plates_pasillo.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene07')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
W, H = 1280, 496
PLATES = [('1_pasillo', 0), ('2_marcas', 1), ('4_relieve', 2)]

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

// geometria del pasillo (igual que en la escena)
const vec2 VP = vec2(0.0, 0.05);
const float HF = 1.05, HC = 0.95, WC = 1.40, ZB = 4.6;

// superficie: 0 piso, 1 techo, 2 pared izq, 3 pared der, 4 fondo
// devuelve (u, v, z) en coordenadas de esa superficie
vec4 surf(vec2 p){
  vec2 d=p-VP;
  float z=1e3; float id=4.;
  if(d.y<0.){ float zz=HF/(-d.y); if(zz<z){ z=zz; id=0.; } }
  if(d.y>0.){ float zz=HC/d.y; if(zz<z){ z=zz; id=1.; } }
  if(abs(d.x)>1e-4){ float zz=WC/abs(d.x); if(zz<z){ z=zz; id=d.x<0.?2.:3.; } }
  if(z>ZB){ z=ZB; id=4.; }
  return vec4(d*z, z, id);
}

vec4 shade(vec2 p, out vec2 marks){
  marks=vec2(0.);
  vec4 s=surf(p);
  vec3 X=vec3(s.xy, s.z);   // x, y, z del punto en el mundo
  float id=s.w;
  vec3 c; float a=1.;
  if(id==0.){
    // piso: tablas a lo largo + alfombra con borde
    float bx=fract(X.x*5.);
    float board=smoothstep(0.,0.04,bx)*smoothstep(1.,0.96,bx);
    vec3 wood=vec3(0.13,0.07,0.04)*(0.6+0.6*fbm(vec2(X.x*5.,X.z*1.5),6))*(0.7+0.3*board);
    float rug=step(abs(X.x),0.55);
    float border=step(0.45,abs(X.x))*rug;
    float pat=step(0.5,fract(X.z*2.5+abs(X.x)*2.))*step(abs(X.x),0.38);
    vec3 rc=mix(vec3(0.28,0.04,0.05),vec3(0.20,0.03,0.04),pat);
    rc=mix(rc,vec3(0.35,0.25,0.08),border);
    rc*=0.7+0.4*fbm(X.xz*vec2(20.,8.),5);
    c=mix(wood,rc,rug);
  } else if(id==1.){
    float beam=step(0.82,fract(X.z*1.1));
    c=vec3(0.06,0.05,0.045)*(0.7+0.4*fbm(X.xz*4.,4))*(1.+beam*0.6);
    c*=1.-beam*0.3*step(fract(X.z*1.1),0.86);
  } else if(id<3.5){
    float sideS=id==2.?-1.:1.;
    float Y=X.y, Z=X.z;
    vec3 paper=vec3(0.07,0.10,0.07)*(0.7+0.5*step(0.5,fract(Z*6.)))*(0.7+0.4*fbm(vec2(Z*8.,Y*5.),5));
    paper*=1.-0.4*smoothstep(0.5,0.8,fbm(vec2(Z*2.,Y*3.)+id,5));
    c=paper;
    // moldura de techo
    if(Y>0.82) c=vec3(0.16,0.13,0.09)*(0.6+0.4*fract(Y*30.));
    // zocalo de paneles
    if(Y<-0.38){
      float pz=fract(Z*1.6); float py=(Y+1.05)/0.67;
      float panel=step(0.10,pz)*step(pz,0.90)*step(0.18,py)*step(py,0.82);
      c=vec3(0.14,0.08,0.045)*(0.6+0.5*fbm(vec2(Z*12.,Y*3.),5))*(0.75+0.35*panel);
      if(abs(Y+0.38)<0.02) c=vec3(0.20,0.12,0.06);
    }
    // puertas
    vec2 dz = id==2.? vec2(1.25,1.85) : vec2(2.55,3.10);
    if(Z>dz.x && Z<dz.y && Y<0.45){
      float fr=min(min(Z-dz.x,dz.y-Z), 0.45-Y);
      vec3 door=vec3(0.10,0.055,0.03)*(0.7+0.4*fbm(vec2(Z*15.,Y*4.),5));
      float pnl=step(0.06,fr);
      door*=0.8+0.3*pnl*step(0.5,fract((Y+1.05)*2.2));
      if(fr<0.04) door=vec3(0.18,0.11,0.06);
      // picaporte
      vec2 kn=vec2(Z-(id==2.?dz.y-0.06:dz.x+0.06), Y+0.38);
      if(length(kn*vec2(1.,2.))<0.02) door=vec3(0.45,0.35,0.12);
      c=door;
      // rendija de la puerta (se enciende en vivo)
      float gapZ=id==2.?dz.y:dz.x;
      if(abs(Z-gapZ)<0.012) marks.y=1.;
    }
    // retratos
    vec2 pz2 = id==2.? vec2(2.05,2.45) : vec2(1.35,1.85);
    if(Z>pz2.x && Z<pz2.y && Y>-0.05 && Y<0.60){
      float fr=min(min(Z-pz2.x,pz2.y-Z),min(Y+0.05,0.60-Y));
      vec3 pc=vec3(0.06,0.05,0.04)*(0.6+0.6*fbm(vec2(Z*20.,Y*20.),5));
      // figura del retrato: cabeza ovalada y hombros
      float zc=(pz2.x+pz2.y)*0.5;
      vec2 fq=vec2((Z-zc)/(pz2.y-pz2.x), (Y-0.36)/0.65);
      float face=length(fq*vec2(1.,0.75))-0.16;
      float body=max(length((fq-vec2(0.,-0.55))*vec2(0.7,1.))-0.45, -fq.y-0.6);
      pc=mix(pc, vec3(0.22,0.17,0.13)*(0.7+0.4*fbm(fq*30.,4)), smoothstep(0.01,-0.01,face));
      pc=mix(pc, vec3(0.05,0.03,0.04), smoothstep(0.01,-0.01,body)*step(face,0.)*0.0 + smoothstep(0.01,-0.01,body)*(1.-step(face,0.)));
      vec2 eq=vec2(abs(fq.x)-0.06, fq.y-0.03);
      float eye=length(eq*vec2(1.,1.6))-0.025;
      if(eye<0.){ pc=vec3(0.02); marks.x=1.; }
      if(fr<0.05) pc=vec3(0.40,0.30,0.10)*(0.6+0.6*fract(fr*80.))*(0.7+0.4*gn(vec2(Z,Y)*200.));
      c=pc;
    }
    // apliques de pared (la llama va en vivo)
    for(int k=0;k<2;k++){
      float zs = k==0?1.0:2.25;
      float zz = id==2.?zs:zs+0.65;
      vec2 sq=vec2((Z-zz)*1.8, Y-0.12);
      if(length(sq*vec2(1.,0.6))<0.06) c=vec3(0.35,0.27,0.10);
    }
  } else {
    // pared del fondo con ventanal en arco
    vec2 b=X.xy;
    vec3 paper=vec3(0.07,0.10,0.07)*(0.7+0.5*step(0.5,fract(b.x*6.)))*(0.7+0.4*fbm(b*8.,5));
    c=paper;
    if(b.y<-0.38) c=vec3(0.14,0.08,0.045)*(0.6+0.5*fbm(b*vec2(12.,3.),5));
    vec2 wq=b-vec2(0.,0.10);
    float win=max(abs(wq.x)-0.48, max(-(wq.y+0.55), wq.y-0.45));
    win=min(win, length(wq-vec2(0.,0.45))-0.48);
    win=max(win, -(wq.y+0.55));
    if(win<0.){
      float mull=min(abs(wq.x)-0.018, min(abs(wq.y-0.05)-0.018, abs(wq.y-0.45)-0.014));
      float rim=-win-0.035;
      if(mull<0.||rim<0.){ c=vec3(0.10,0.07,0.05); } else { c=vec3(0.); a=0.; }
    }
  }
  // oclusion en las esquinas y oscuridad con la distancia
  c*=exp(-s.z*0.18);
  return vec4(c,a);
}


// ---------- RELIEVE (fase 25) ----------
// Altura sobre cada superficie del pasillo: tablas del piso y borde de la
// alfombra, vigas, zocalo de paneles, molduras, puertas con tableros y
// marco, retratos con marco dorado, apliques. Se hornea la NORMAL EN EL
// MUNDO (x, y, z del pasillo) para que la escena ilumine con las velas y
// los fantasmas desde su posicion real.
float hgt(vec2 p, out vec3 X, out float id){
  vec4 s=surf(p);
  X=vec3(s.xy, s.z); id=s.w;
  float h=0.;
  if(id==0.){
    float bx=fract(X.x*5.);
    h=0.006*smoothstep(0.,0.04,bx)*smoothstep(1.,0.96,bx);
    if(abs(X.x)<0.55){ h=0.012+0.004*step(0.45,abs(X.x)); }
  } else if(id==1.){
    h=0.04*step(0.82,fract(X.z*1.1));
  } else if(id<3.5){
    float Y=X.y, Z=X.z;
    h=0.002*step(0.5,fract(Z*6.));
    if(Y>0.82) h=0.03*(0.5+0.5*fract(Y*30.));
    if(Y<-0.38){
      float pz=fract(Z*1.6); float py=(Y+1.05)/0.67;
      float panel=smoothstep(0.08,0.12,pz)*smoothstep(0.92,0.88,pz)*smoothstep(0.16,0.20,py)*smoothstep(0.84,0.80,py);
      h=0.02+0.012*panel;
      if(abs(Y+0.38)<0.02) h=0.04;
    }
    vec2 dz = id==2.? vec2(1.25,1.85) : vec2(2.55,3.10);
    if(Z>dz.x && Z<dz.y && Y<0.45){
      float fr=min(min(Z-dz.x,dz.y-Z), 0.45-Y);
      h=-0.02+0.012*step(0.06,fr)*step(0.5,fract((Y+1.05)*2.2));
      if(fr<0.04) h=0.03*smoothstep(0.0,0.02,fr);
      vec2 kn=vec2(Z-(id==2.?dz.y-0.06:dz.x+0.06), Y+0.38);
      h+=0.02*smoothstep(0.02,0.0,length(kn*vec2(1.,2.)));
    }
    vec2 pz2 = id==2.? vec2(2.05,2.45) : vec2(1.35,1.85);
    if(Z>pz2.x && Z<pz2.y && Y>-0.05 && Y<0.60){
      float fr=min(min(Z-pz2.x,pz2.y-Z),min(Y+0.05,0.60-Y));
      h=0.01;
      if(fr<0.05) h=0.01+0.03*sin(fr/0.05*3.14159)*(0.85+0.15*fract(fr*80.));
    }
    for(int k=0;k<2;k++){
      float zs = k==0?1.0:2.25;
      float zz = id==2.?zs:zs+0.65;
      vec2 sq=vec2((Z-zz)*1.8, Y-0.12);
      float r=length(sq*vec2(1.,0.6));
      if(r<0.06) h=0.03*sqrt(1.-r*r/0.0036);
    }
  } else {
    vec2 b=X.xy;
    if(b.y<-0.38) h=0.02;
  }
  return h;
}
vec3 baseN(float id, vec3 X){
  if(id==0.) return vec3(0.,1.,0.);
  if(id==1.) return vec3(0.,-1.,0.);
  if(id==2.) return vec3(1.,0.,0.);
  if(id<3.5) return vec3(-1.,0.,0.);
  return vec3(0.,0.,-1.);
}
vec4 reliefW(vec2 p){
  vec3 X; float id;
  float h=hgt(p,X,id);
  vec3 nb=baseN(id,X);
  float e=0.0025;
  vec3 X1,X2,X3,X4; float i1,i2,i3,i4;
  float h1=hgt(p+vec2(e,0.),X1,i1), h2=hgt(p-vec2(e,0.),X2,i2), h3=hgt(p+vec2(0.,e),X3,i3), h4=hgt(p-vec2(0.,e),X4,i4);
  if(i1!=id||i2!=id||i3!=id||i4!=id||X.z>4.5) return vec4(nb*0.5+0.5,1.);
  vec3 dx=(X1+nb*h1)-(X2+nb*h2), dy=(X3+nb*h3)-(X4+nb*h4);
  vec3 n=normalize(cross(dx,dy));
  if(dot(n,nb)<0.) n=-n;
  return vec4(n*0.5+0.5,1.);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==2){ fc=reliefW(p); return; }
  vec2 marks;
  vec4 c=shade(p,marks);
  if(plate==1){ fc=vec4(marks,0.,1.); return; }
  fc = vec4(pow(clamp(c.rgb*2.,0.,1.),vec3(1./2.2)), c.a);
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
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '3_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
