"""Hornea las laminas de la escena 14 de Halloween (luna de sangre y cuervos).

Colinas lejanas con una capilla en ruinas, cruces y arboles pelados
(lamina de fondo); un arbol muerto enorme con corteza en relieve, raices
y una rama larga donde se posan los cuervos (color + relieve); y un
cuervo posado de perfil con plumas (color + relieve) que el shader
repite a lo largo de la rama. La luna reusa la de la escena 00. Ver
docs/53.

La rama de los cuervos es una poligonal: PERCH (abajo) es la MISMA que
usa scene14_luna_cuervos.frag para apoyar a los cuervos encima.

uso: python3 td/tools/bake_plates_cuervos.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene14')
SS = 2
PLATES = [
    ('1_lejos', 0, (-3.1, -1.0, 3.1, 0.05), 1280, 216),
    ('2_arbol_color', 1, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
    ('3_arbol_relieve', 2, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
    ('4_cuervo_color', 3, (-0.5, -0.55, 0.5, 0.55), 384, 422),
    ('5_cuervo_relieve', 4, (-0.5, -0.55, 0.5, 0.55), 384, 422),
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
float hkSegB(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
// segmento con radio que va de ra a rb: (distancia con signo, avance 0..1)
vec2 cone(vec2 p, vec2 a, vec2 b, float ra, float rb){
  vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
  return vec2(length(pa-ba*h)-mix(ra,rb,h), h);
}

// --- rama de los cuervos (igual en el shader) ---
const int NP=7;
const vec2 PERCH[7]=vec2[7](vec2(-1.85,0.22),vec2(-1.0,0.30),vec2(-0.2,0.34),vec2(0.6,0.40),vec2(1.4,0.43),vec2(2.1,0.50),vec2(2.75,0.58));

// --- fondo ---
vec4 farP(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  float h1=-0.38+0.12*fbm(vec2(p.x*0.4,1.),5)+0.06*sin(p.x*0.9);
  float m1=smoothstep(0.003,-0.003,p.y-h1);
  c=mix(c,vec3(0.10,0.06,0.07)*(0.7+0.4*fbm(p*vec2(4.,12.),4)),m1); a=max(a,m1);
  float h2=-0.62+0.08*fbm(vec2(p.x*0.7,5.),5);
  float m2=smoothstep(0.003,-0.003,p.y-h2);
  c=mix(c,vec3(0.05,0.03,0.035)*(0.7+0.4*fbm(p*vec2(6.,14.),4)),m2); a=max(a,m2);
  // capilla en ruinas sobre la colina
  vec2 q=p-vec2(1.15,h1+0.0);
  float nave=sdBox(q-vec2(0.,0.07),vec2(0.16,0.07));
  float roof=max(abs(q.x)*0.8+(q.y-0.14)-0.10, 0.14-q.y);
  float tower=sdBox(q-vec2(-0.13,0.17),vec2(0.035,0.17));
  float spire=max(abs(q.x+0.13)*3.+(q.y-0.34)-0.12, 0.34-q.y);
  float hole=sdBox(q-vec2(0.06,0.20),vec2(0.05,0.07)+0.02*fbm(q*20.,3));
  float ch=max(min(min(nave,roof),min(tower,spire)),-hole);
  float cm=smoothstep(0.002,-0.002,ch);
  c=mix(c,vec3(0.06,0.04,0.045),cm); a=max(a,cm);
  // cruces y arboles pelados
  for(int i=0;i<9;i++){
    float fi=float(i); float x0=-2.9+fi*0.7+0.25*h21(vec2(fi,2.));
    float base=-0.38+0.12*fbm(vec2(x0*0.4,1.),5)+0.06*sin(x0*0.9);
    vec2 r=p-vec2(x0,base);
    float cr=min(sdBox(r-vec2(0.,0.05),vec2(0.006,0.05)),sdBox(r-vec2(0.,0.07),vec2(0.025,0.005)));
    float tr=max(abs(r.x+0.01*sin(r.y*20.))-0.008*(1.-r.y*2.5),max(-r.y,r.y-0.30));
    for(int k=0;k<4;k++){ vec2 bq=rot((mod(float(k),2.)*2.-1.)*0.75)*(r-vec2(0.,0.10+float(k)*0.045)); tr=min(tr,max(abs(bq.x)-0.003,max(-bq.y,bq.y-0.11))); }
    float s=mod(fi,3.)<1.?cr:tr;
    float sm=smoothstep(0.002,-0.002,s); c=mix(c,vec3(0.04,0.025,0.03),sm); a=max(a,sm);
  }
  return vec4(c,a);
}

// --- arbol: altura (relieve) + albedo ---
struct T { float h; float d; vec3 alb; };
T tree(vec2 p){
  T t; t.h=0.; t.d=1e3; t.alb=vec3(0.);
  float best=1e3; float along=0.; float rad=0.05;
  // tronco que se ensancha en las raices
  vec2 tc=cone(p,vec2(-1.95,-1.25),vec2(-1.82,0.26),0.20,0.085);
  float tw=0.02*sin(p.y*6.+1.)+0.012*fbm(p*vec2(3.,8.),3);
  tc.x-=tw;
  if(tc.x<best){best=tc.x; along=tc.y; rad=mix(0.20,0.085,tc.y);}
  // raices
  for(int k=0;k<4;k++){
    float fk=float(k); float s=fk<2.?-1.:1.;
    vec2 e=vec2(-1.95+s*(0.35+mod(fk,2.)*0.22),-1.22-mod(fk,2.)*0.05);
    vec2 rc=cone(p,vec2(-1.95+s*0.06,-1.0),e,0.07,0.012); if(rc.x<best){best=rc.x; along=rc.y; rad=0.05;}
  }
  // rama larga de los cuervos (poligonal PERCH)
  for(int i=0;i<NP-1;i++){
    float k0=float(i)/float(NP-1), k1=float(i+1)/float(NP-1);
    vec2 pw=p+vec2(0.,0.012*sin(p.x*7.+float(i))+0.006*gn(p*9.));
    vec2 bc=cone(pw,PERCH[i],PERCH[i+1],mix(0.075,0.016,k0),mix(0.075,0.016,k1));
    if(bc.x<best){best=bc.x; along=bc.y; rad=mix(0.075,0.016,mix(k0,k1,bc.y));}
    // ramitas que cuelgan y suben de la rama larga
    vec2 s0=mix(PERCH[i],PERCH[i+1],0.5);
    vec2 s1=s0+vec2(0.10,(mod(float(i),2.)<1.?-0.22:0.20));
    vec2 sc=cone(p,s0,s1,0.012,0.003);
    if(sc.x<best){best=sc.x; along=sc.y; rad=0.01;}
  }
  // ramas que suben y ramitas
  vec2 B[14]=vec2[14](vec2(-1.83,0.20),vec2(-2.35,0.95), vec2(-1.84,0.25),vec2(-1.55,1.15),
                      vec2(-2.05,0.62),vec2(-2.75,0.80), vec2(-1.70,0.70),vec2(-1.25,0.98),
                      vec2(-0.6,0.32),vec2(-0.25,0.82), vec2(0.9,0.41),vec2(1.25,0.95),
                      vec2(1.8,0.47),vec2(2.25,0.18));
  for(int i=0;i<7;i++){
    vec2 a=B[i*2], b=B[i*2+1];
    float r0=i<2?0.05:0.025;
    // quiebre: la rama se dobla a mitad de camino
    vec2 m=mix(a,b,0.55)+vec2(0.06*sin(float(i)*3.),0.04);
    vec2 c1=cone(p,a,m,r0,r0*0.55), c2=cone(p,m,b,r0*0.55,0.005);
    vec2 bc=c1.x<c2.x?c1:c2;
    if(bc.x<best){best=bc.x; along=bc.y; rad=r0*0.6;}
    // ramitas secundarias
    for(int k=0;k<3;k++){
      float fk=float(k)+1.;
      vec2 s0=mix(a,b,0.25*fk);
      vec2 s1=s0+rot((mod(fk+float(i),2.)*2.-1.)*0.9)*normalize(b-a)*0.22/fk*1.4;
      vec2 sc=cone(p,s0,s1,r0*0.35,0.003);
      if(sc.x<best){best=sc.x; along=sc.y; rad=r0*0.3;}
    }
  }
  t.d=best;
  if(best<0.){
    float x=clamp(-best/max(rad,1e-3),0.,1.);
    float prof=sqrt(1.-(1.-x)*(1.-x));
    // corteza: surcos a lo largo + nudos
    float groove=fbm(vec2(p.x*9.+p.y*2.,p.y*55.),4);
    float knot=smoothstep(0.75,0.95,fbm(p*14.,3));
    t.h=prof*rad*(0.8+0.4*groove)-knot*0.01;
    vec3 bark=mix(vec3(0.07,0.055,0.05),vec3(0.16,0.13,0.11),groove);
    bark=mix(bark,vec3(0.10,0.12,0.07),smoothstep(0.62,0.8,fbm(p*6.+3.,4))*0.5);   // liquen
    t.alb=bark*(0.6+0.4*prof);
  }
  // suelo en primer plano con pasto seco y lapidas torcidas
  float gy=-1.0+0.06*fbm(vec2(p.x*1.5,3.),4)+0.03*sin(p.x*2.);
  if(p.y<gy && best>=0.){
    t.d=-0.01; t.h=0.004*fbm(p*30.,3);
    t.alb=vec3(0.06,0.05,0.04)*(0.6+0.6*fbm(p*vec2(30.,60.),4));
  }
  for(int i=0;i<4;i++){
    float fi=float(i); vec2 g=p-vec2(-0.6+fi*1.05,-1.02); g=rot(0.12*(h21(vec2(fi,3.))-0.5))*g;
    float st=fi==1.?min(sdBox(g-vec2(0.,0.12),vec2(0.018,0.14)),sdBox(g-vec2(0.,0.18),vec2(0.07,0.016))):sdBox(g-vec2(0.,0.06),vec2(0.08,0.10))-0.03;
    if(st<0.){ t.d=-0.01; t.h=0.02*smoothstep(0.,-0.02,st)+0.005*fbm(g*40.,3); t.alb=vec3(0.13,0.12,0.115)*(0.6+0.5*fbm(g*20.,4)); }
  }
  return t;
}

// --- cuervo posado de perfil, mirando a la derecha ---
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float ell(vec2 p, vec2 c, vec2 r, float a){ vec2 q=rot(-a)*(p-c); return (length(q/r)-1.)*min(r.x,r.y); }
struct C { float d; float h; vec3 alb; };
C crow(vec2 p){
  C c; c.d=1e3; c.h=0.; c.alb=vec3(0.);
  // cuerpo inclinado como un cuervo parado (cola hacia abajo-atras)
  float body=ell(p,vec2(-0.03,-0.02),vec2(0.27,0.13),-0.50);
  float chest=ell(p,vec2(0.08,0.02),vec2(0.12,0.12),-0.3);
  float head=length(p-vec2(0.19,0.19))-0.085;
  float neck=ell(p,vec2(0.13,0.11),vec2(0.08,0.10),-0.4);
  // plumas de la garganta (desflecadas)
  float throat=ell(p,vec2(0.17,0.08),vec2(0.06,0.07),0.2)+0.012*sin(atan(p.y-0.08,p.x-0.17)*9.);
  float d=smin(smin(body,chest,0.05),smin(head,neck,0.04),0.05);
  d=smin(d,throat,0.02);
  // pico grueso, curvo hacia abajo
  vec2 bq=p-vec2(0.255,0.185);
  float bx=clamp(bq.x/0.15,0.,1.);
  float beak=max(abs(bq.y+bq.x*bq.x*1.2)-0.036*(1.-bx*0.92),max(-bq.x-0.03,bq.x-0.15));
  // cola en cuna
  vec2 tq=rot(0.62)*(p-vec2(-0.22,-0.13));
  float tail=max(abs(tq.y)-(0.028+(-tq.x)*0.10),max(tq.x-0.02,-tq.x-0.25));
  // ala plegada con las primarias que pasan la cola
  float wing=ell(p,vec2(-0.10,0.0),vec2(0.24,0.085),-0.48);
  vec2 wq=rot(0.62)*(p-vec2(-0.22,-0.09));
  float prim=max(abs(wq.y)-0.022,max(wq.x-0.02,-wq.x-0.13));
  // patas cortas y dedos agarrando la rama
  float legs=min(hkSegB(p,vec2(0.01,-0.10),vec2(0.03,-0.42))-0.011,hkSegB(p,vec2(0.06,-0.08),vec2(0.08,-0.42))-0.011);
  float toes=min(min(hkSegB(p,vec2(0.0,-0.44),vec2(0.12,-0.45)),hkSegB(p,vec2(0.05,-0.44),vec2(0.16,-0.46))),hkSegB(p,vec2(-0.03,-0.44),vec2(0.05,-0.43)))-0.008;
  d=min(min(d,beak),min(min(tail,prim),min(legs,toes)));
  c.d=d;
  if(d<0.){
    float fe=fbm(rot(0.5)*p*vec2(40.,18.),4);
    vec3 black=vec3(0.022,0.022,0.028)*(0.6+0.8*fe);
    black+=vec3(0.03,0.035,0.08)*smoothstep(0.62,0.9,fe);       // tornasol azul-violeta
    c.alb=black;
    c.h=0.10*sqrt(clamp(-min(body,chest)/0.10,0.,1.))+0.07*sqrt(clamp(-min(head,neck)/0.07,0.,1.));
    if(wing<0.){ c.h=max(c.h,0.12*sqrt(clamp(-wing/0.06,0.,1.))); vec2 sq=rot(-0.48)*p*vec2(22.,30.); c.h-=0.008*smoothstep(0.75,1.,fract(sq.x+0.5*floor(sq.y))); }
    if(tail<0.||prim<0.){ c.h=0.04+0.01*sin((tq.y)*160.); }
    if(throat<0.&&body>0.){ c.h=0.05+0.01*fe; }
    c.h+=fe*0.008;
    if(beak<0.){ c.alb=vec3(0.05,0.048,0.045)*(0.7+0.6*clamp(bq.y*20.+0.6,0.,1.)); c.h=0.04*(1.-bx); }
    if(legs<0.||toes<0.){ c.alb=vec3(0.035,0.032,0.03); c.h=0.01; }
    float eye=length(p-vec2(0.215,0.205))-0.014;
    if(eye<0.){ c.alb=vec3(0.0); c.h=0.09; }
    if(length(p-vec2(0.219,0.21))<0.005) c.alb=vec3(0.55);
  }
  return c;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==0){ vec4 f=farP(p); fc=vec4(pow(clamp(f.rgb*2.,0.,1.),vec3(1./2.2)), f.a); return; }
  float e=0.0025;
  if(plate==1||plate==2){
    T t=tree(p);
    float a=smoothstep(0.003,-0.003,t.d);
    if(plate==1){ fc=vec4(pow(clamp(t.alb*2.,0.,1.),vec3(1./2.2)), a); return; }
    float hx=tree(p+vec2(e,0.)).h-tree(p-vec2(e,0.)).h;
    float hy=tree(p+vec2(0.,e)).h-tree(p-vec2(0.,e)).h;
    vec3 n=normalize(vec3(-hx/(2.*e)*0.6,-hy/(2.*e)*0.6,1.));
    fc=vec4(n.xy*0.5+0.5, 0., a); return;
  }
  C c=crow(p);
  float a=smoothstep(0.003,-0.003,c.d);
  if(plate==3){ fc=vec4(pow(clamp(c.alb*2.,0.,1.),vec3(1./2.2)), a); return; }
  float e2=0.004;
  float hx=crow(p+vec2(e2,0.)).h-crow(p-vec2(e2,0.)).h;
  float hy=crow(p+vec2(0.,e2)).h-crow(p-vec2(0.,e2)).h;
  vec3 n=normalize(vec3(-hx/(2.*e2)*0.5,-hy/(2.*e2)*0.5,1.));
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
    shutil.copy(os.path.join(SETS, 'scene00', '6_luna.png'), os.path.join(OUT, '6_luna.png'))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '7_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
