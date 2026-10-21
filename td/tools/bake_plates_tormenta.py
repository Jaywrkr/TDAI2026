"""Hornea las laminas de la escena 09 de Halloween (tormenta en el paramo).

El paisaje (colinas, campo de pasto alto, granja
lejana con ventana, cerca y espantapajaros) y, aparte, el arbol muerto
(D6 lo hace aparecer). Las nubes se arman en vivo con la textura de
ruido. Ver docs/53.

uso: python3 td/tools/bake_plates_tormenta.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene09')
SS = 2
PLATES = [
    ('1_paisaje', 1, (-3.1, -1.2, 3.1, 0.10), 1280, 268),
    ('2_arbol', 2, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
    ('4_arbol_relieve', 3, (-2.75, -0.80, -0.35, 1.20), 600, 500),   # RG normal, B cavidad
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
// ruido periodico en x (para que las nubes se repitan sin costura)
float gp(vec2 p, float P){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  vec2 i0=vec2(mod(i.x,P),i.y), i1=vec2(mod(i.x+1.,P),i.y);
  float a=dot(h22(i0)-.5,f), b=dot(h22(i1)-.5,f-vec2(1,0));
  float c=dot(h22(i0+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i1+vec2(0,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fp(vec2 p, float P, int o){ float s=0.,a=.5,n=0.; for(int i=0;i<9;i++){ if(i>=o)break; s+=a*gp(p,P); n+=a; a*=.5; p*=2.; P*=2.; } return s/n; }
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

vec4 clouds(vec2 p, vec2 uv){
  // x de la lamina en celdas periodicas: 8 celdas a lo ancho
  vec2 q=vec2(uv.x*8., p.y*4.5);
  vec2 w=vec2(fp(q*0.5+3.1,4.,3), fp(q*0.5+7.7,4.,3));
  float base=fp(q+(w-0.5)*0.7, 8., 7);
  base=mix(base, 1.-abs(base*2.-1.), 0.35);   // bordes de coliflor
  // los nubarrones son mas densos abajo (panza oscura) y arriba se abren
  float shape=base + smoothstep(1.1,0.1,p.y)*0.25 - 0.18;
  float cov=smoothstep(0.40,0.58,shape);
  // espesor: cuanto material hay (para el brillo interno del relampago)
  float thick=smoothstep(0.45,0.85,shape);
  // luz: arriba mas clara (luz de luna detras), panza oscura
  float e=0.02;
  float sx=fp(q+vec2(e*8.,e*4.5)+(w-0.5)*0.7,8.,6);
  float light=clamp(0.35+(base-sx)*45.,0.,1.)*0.45+clamp((base-0.45)*1.6,0.,1.)*0.35+smoothstep(-0.1,1.2,p.y)*0.25;
  float rim=smoothstep(0.38,0.46,shape)-smoothstep(0.46,0.60,shape);
  return vec4(light, thick, rim, cov);
}

vec4 land(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  // colinas lejanas
  float h1=-0.38+0.10*fbm(vec2(p.x*0.7,1.),5)+0.06*sin(p.x*0.6);
  float h2=-0.55+0.08*fbm(vec2(p.x*1.1,4.),5);
  float m1=smoothstep(0.003,-0.003,p.y-h1);
  c=mix(c,vec3(0.10,0.10,0.13)*(0.7+0.4*fbm(p*vec2(6.,20.),4)),m1); a=max(a,m1);
  // granja lejana con ventana (la vela va en vivo)
  vec2 fq=p-vec2(1.55,h1-0.005);
  float house=sdBox(fq-vec2(0.,0.045),vec2(0.085,0.045));
  house=min(house, max(abs(fq.x)*0.9+(fq.y-0.09)-0.07, 0.09-fq.y));
  house=min(house, sdBox(fq-vec2(0.05,0.15),vec2(0.012,0.04)));   // chimenea
  float barn=sdBox(fq-vec2(-0.22,0.035),vec2(0.07,0.035));
  barn=min(barn, max(abs(fq.x+0.22)*1.2+(fq.y-0.07)-0.06, 0.07-fq.y));
  float hm=smoothstep(0.002,-0.002,min(house,barn));
  c=mix(c,vec3(0.03,0.03,0.04),hm); a=max(a,hm);
  // campo de pasto alto
  float m2=smoothstep(0.003,-0.003,p.y-h2);
  vec3 field=vec3(0.13,0.12,0.07)*(0.6+0.6*fbm(vec2(p.x*12.,p.y*30.),5));
  field*=mix(1.,0.5,smoothstep(h2,-1.2,p.y));
  c=mix(c,field,m2); a=max(a,m2);
  // espigas en el borde del campo
  float k=p.x*120.;
  float bh=0.02+0.05*pow(h21(vec2(floor(k),1.)),2.);
  float bx=fract(k+(p.y-h2)*(h21(vec2(floor(k),2.))-0.5)*90.)-0.5;
  float blade=step(abs(bx),0.18*(1.-(p.y-h2)/bh))*step(h2-0.01,p.y)*step(p.y,h2+bh);
  c=mix(c,vec3(0.10,0.09,0.05),blade); a=max(a,blade);
  // cerca de postes torcidos
  for(int i=0;i<9;i++){
    float fi=float(i);
    float x=-2.9+fi*0.34+0.05*h21(vec2(fi,3.));
    float gy=-0.55+0.08*fbm(vec2(x*1.1,4.),5);
    vec2 q=rot((h21(vec2(fi,5.))-0.5)*0.25)*(p-vec2(x,gy));
    float post=sdBox(q-vec2(0.,0.07),vec2(0.012,0.07));
    float pm=smoothstep(0.002,-0.002,post);
    c=mix(c,vec3(0.05,0.04,0.03),pm); a=max(a,pm);
  }
  float wire=abs(p.y-(-0.47+0.06*fbm(vec2(p.x*1.1,4.),5)+0.01*sin(p.x*9.)))-0.002;
  c=mix(c,vec3(0.06),smoothstep(0.002,0.,wire)*step(p.x,0.1)*step(-2.95,p.x));
  // espantapajaros en cruz
  vec2 sq=p-vec2(0.55,-0.58);
  float pole=sdBox(sq-vec2(0.,0.22),vec2(0.012,0.24));
  float arm=sdBox(sq-vec2(0.,0.32),vec2(0.17,0.01));
  float coat=max(abs(sq.x)-(0.06+0.06*smoothstep(0.32,0.12,sq.y)), max(0.10-sq.y, sq.y-0.33));
  coat=min(coat, max(abs(sq.y-0.31)-0.025-0.01*sin(sq.x*60.), abs(sq.x)-0.16));   // mangas
  float head=length((sq-vec2(0.,0.39))*vec2(1.,1.1))-0.045;
  float hat=min(sdBox(sq-vec2(0.,0.425),vec2(0.075,0.008)), max(abs(sq.x)*1.4+(sq.y-0.50)-0.0, 0.43-sq.y));
  float scare=min(min(pole,arm),min(min(coat,head),hat));
  float sm=smoothstep(0.002,-0.002,scare);
  vec3 sc=vec3(0.06,0.05,0.035)*(0.7+0.5*fbm(sq*60.,4));
  if(head<0.) sc=vec3(0.18,0.15,0.08)*(0.7+0.4*gn(sq*200.));
  // paja que asoma
  float straw=step(0.7,gn(vec2(sq.x*200.,sq.y*30.)))*smoothstep(0.03,0.0,abs(coat))*step(sq.y,0.14);
  c=mix(c,sc,sm); a=max(a,sm);
  c=mix(c,vec3(0.25,0.20,0.08),straw*0.8); a=max(a,straw);
  return vec4(c,a);
}

float treeD(vec2 p){
  vec2 tq=p-vec2(-1.55,-0.62);
  float tr=abs(tq.x+0.06*sin(tq.y*2.5))-(0.10-tq.y*0.045)*(1.-0.85*smoothstep(0.85,1.32,tq.y));  // la copa termina en punta
  tr=max(tr,max(-tq.y,tq.y-1.32));
  float d=tr;
  for(int i=0;i<8;i++){
    float fi=float(i);
    float side=mod(fi,2.)*2.-1.;
    vec2 q=rot(side*(0.45+0.07*fi)-0.10)*(tq-vec2(0.,0.45+fi*0.10));
    float len=0.95-fi*0.07;
    float b=abs(q.x+0.05*sin(q.y*6.+fi))-0.028*(1.-q.y/len);
    b=max(b,max(-q.y,q.y-len));
    d=min(d,b);
    for(int k=0;k<2;k++){
      vec2 q2=rot(side*0.7*(k==0?1.:-1.))*(q-vec2(0.,len*(0.45+0.25*float(k))));
      d=min(d, max(abs(q2.x+0.02*sin(q2.y*14.))-0.008*(1.-q2.y/(len*0.4)), max(-q2.y,q2.y-len*0.4)));
    }
  }
  // raices
  for(int i=0;i<3;i++){
    vec2 q=rot((float(i)-1.)*1.1)*(tq-vec2(0.,0.03));
    d=min(d, max(abs(q.x)-0.03*(1.+q.y*6.), max(q.y, -q.y-0.12)));
  }
  return d;
}
vec4 tree(vec2 p){
  vec2 tq=p-vec2(-1.55,-0.62);
  float m=smoothstep(0.002,-0.002,treeD(p));
  vec3 bark=vec3(0.04,0.035,0.03)*(0.6+0.6*fbm(tq*vec2(25.,6.),5));
  return vec4(bark,m);
}

// ---------- RELIEVE DEL ARBOL (fase 26) ----------
// Tronco y ramas inflados como tubos, con surcos de corteza a lo largo.
// La escena saca la normal y el rayo lo ilumina del lado donde cae.
float treeH(vec2 p){
  float d=treeD(p);
  if(d>0.) return 0.;
  float k=clamp(-d/0.05,0.,1.);
  float h=0.05*sqrt(max(1.-(1.-k)*(1.-k),0.));
  vec2 tq=p-vec2(-1.55,-0.62);
  h+=0.006*(fbm(tq*vec2(25.,6.),5)-0.5)*k;
  return h;
}
vec4 treeRelief(vec2 p){
  if(treeD(p)>0.004) return vec4(0.5,0.5,1.,1.);
  float e=0.0025;
  float hx=treeH(p+vec2(e,0.))-treeH(p-vec2(e,0.));
  float hy=treeH(p+vec2(0.,e))-treeH(p-vec2(0.,e));
  vec3 n=normalize(vec3(-hx/(2.*e),-hy/(2.*e),1.));
  vec2 tq=p-vec2(-1.55,-0.62);
  float cav=0.6+0.4*smoothstep(0.35,0.6,fbm(tq*vec2(25.,6.),5));
  return vec4(n.xy*0.5+0.5,cav,1.);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==0){ fc=clouds(p,vUV); return; }
  if(plate==3){ fc=treeRelief(p); return; }
  vec4 c = plate==1 ? land(p) : tree(p);
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
    for name, pid, r, w, h in PLATES:
        prog['plate'].value = pid
        prog['rect'].value = r
        fbo = ctx.simple_framebuffer((w * SS, h * SS), components=4, dtype='f4')
        fbo.use()
        fbo.clear(0, 0, 0, 0)
        vao.render(mode=moderngl.TRIANGLE_STRIP)
        img = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(h * SS, w * SS, 4)[::-1]
        fbo.release()
        if pid == 0:
            img = img.reshape(h, SS, w, SS, 4).mean((1, 3))
        else:
            a = img[..., 3:4]
            pm = np.concatenate([img[..., :3] * a, a], -1).reshape(h, SS, w, SS, 4).mean((1, 3))
            rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
            img = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h), r)
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '3_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
