"""Hornea las laminas de la escena 03 de Halloween (ojos en el bosque).

Tres profundidades de bosque nocturno: troncos lejanos en la niebla,
troncos medios con corteza y musgo, y troncos cercanos con arbustos y
helechos (con huecos donde se esconden los ojos cercanos). La luz de
luna llega desde arriba a la derecha. Ver docs/53.

uso: python3 td/tools/bake_plates_bosque.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene03')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
PLATES = [('1_lejos', 0), ('2_medio', 1), ('3_cerca', 2)]
W, H = 1280, 496

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
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

// escondites de los ojos cercanos (coinciden con la escena)
const vec2 NEAR_EYES[4] = vec2[](vec2(-1.5,-0.55), vec2(0.9,-0.60), vec2(2.1,-0.50), vec2(-0.6,-0.66));

// Tronco: eje que se curva un poco, ancho que se abre en la base.
// Devuelve (distancia con signo, coordenada transversal -1..1).
vec2 trunk(vec2 p, float x0, float w, float seed, float lean){
  float y = p.y;
  float cx = x0 + lean*(y+1.2) + 0.05*sin(y*1.7+seed)*w*4.;
  float ww = w*(1.0 + 0.9*exp(-(y+1.2)*3.0));          // raices
  float d = abs(p.x-cx) - ww;
  return vec2(d, (p.x-cx)/ww);
}

vec4 bark(vec2 p, vec2 tr, float seed, float detail){
  float u = tr.y;
  float cyl = sqrt(max(1.-u*u,0.));
  float furrow = fbm(vec2(u*6.+seed, p.y*2.2),5);
  float ridges = 1.-abs(fract(u*5.+fbm(vec2(u*3.,p.y*0.8+seed),4)*1.5)-0.5)*2.;
  float b = 0.6+0.6*fbm(vec2(u*14.+seed,p.y*9.),5)*detail;
  vec3 c = vec3(0.10,0.085,0.075)*b*(0.55+0.45*ridges);
  float moss = smoothstep(0.55,0.75,fbm(vec2(u*4.,p.y*3.)+seed*2.,5)+(-u)*0.25)*detail;
  c = mix(c, vec3(0.05,0.10,0.04)*(0.6+0.6*b), moss*0.8);
  // luna desde la derecha y arriba: borde del lado derecho
  float lit = 0.25 + 0.75*smoothstep(-0.2,0.95,u)*cyl;
  float rim = smoothstep(0.75,0.98,u)*0.9;
  c = c*lit + vec3(0.55,0.60,0.80)*rim*0.08*detail;
  c *= 0.6+0.4*smoothstep(-1.2,0.6,p.y);
  return vec4(c, 1.);
}

vec4 layerFar(vec2 p){
  // muchos troncos finos y claros (niebla), sin detalle
  float a=0.; float lum=0.;
  for(int i=0;i<20;i++){
    float fi=float(i);
    float x0=-3.2+fi*0.33+(h21(vec2(fi,1.))-0.5)*0.30;
    float w=0.012+0.03*pow(h21(vec2(fi,2.)),2.);
    vec2 tr=trunk(p,x0,w,fi,(h21(vec2(fi,3.))-0.5)*0.12);
    float m=smoothstep(0.003,-0.003,tr.x);
    if(m>a){ a=m; lum=0.5+0.5*smoothstep(-0.5,1.,tr.y); }
  }
  // ramas finas arriba
  float br=0.;
  for(int i=0;i<10;i++){
    float fi=float(i);
    vec2 o=vec2(-3.0+fi*0.65, 0.55+0.4*h21(vec2(fi,5.)));
    vec2 q=rot((h21(vec2(fi,6.))-0.5)*1.4)*(p-o);
    br=max(br, smoothstep(0.004,0.0,abs(q.y+0.04*sin(q.x*8.)))*step(abs(q.x),0.35));
  }
  a=max(a,br*0.9);
  // monte bajo lejano
  float bush=-0.30+0.08*fbm(vec2(p.x*3.,0.),4)+0.04*gn(vec2(p.x*20.,1.));
  float bm=smoothstep(0.004,-0.004,p.y-bush);
  if(bm>a){ a=bm; lum=0.35; }
  return vec4(lum, lum, lum, a);
}

vec4 layerMid(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  for(int i=0;i<9;i++){
    float fi=float(i);
    float x0=-2.9+fi*0.72+(h21(vec2(fi,11.))-0.5)*0.55;
    // dejar libres los escondites medios
    float w=0.035+0.06*pow(h21(vec2(fi,12.)),1.5);
    if(h21(vec2(fi,15.))<0.2) continue;
    vec2 tr=trunk(p,x0,w,fi*3.,(h21(vec2(fi,13.))-0.5)*0.06);
    float m=smoothstep(0.003,-0.003,tr.x);
    if(m>0.){ vec4 b=bark(p,tr,fi*5.,0.7); c=mix(c,b.rgb*0.8,m); a=max(a,m); }
    // munon de rama
    vec2 bq=rot(0.9*(mod(fi,2.)*2.-1.))*(p-vec2(x0, 0.2+0.4*h21(vec2(fi,14.))));
    float stub=max(abs(bq.y)-0.012*(1.-bq.x/0.25), max(-bq.x, bq.x-0.25*h21(vec2(fi,16.))));
    float sm=smoothstep(0.003,-0.003,stub)*step(0.4,h21(vec2(fi,17.)));
    c=mix(c,vec3(0.025,0.022,0.02),sm); a=max(a,sm);
  }
  // suelo medio con hojarasca
  float gy=-0.48+0.05*fbm(vec2(p.x*2.,3.),4);
  float gm=smoothstep(0.004,-0.004,p.y-gy-0.02*gn(vec2(p.x*60.,2.)));
  vec3 gc=vec3(0.035,0.03,0.025)*(0.6+0.8*fbm(p*vec2(20.,40.),5));
  c=mix(c,gc,gm); a=max(a,gm);
  return vec4(c,a);
}

vec4 layerNear(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  // troncos grandes en los costados
  for(int i=0;i<2;i++){
    float x0 = i==0?-2.75: i==1?2.60: -0.15;
    float w = i==2?0.07:0.20;
    if(i==2 && p.y>0.95) continue;
    vec2 tr=trunk(p,x0,w,float(i)*7.,i==0?0.03:-0.02);
    float m=smoothstep(0.003,-0.003,tr.x);
    if(i==2) m*=smoothstep(1.0,0.6,p.y);        // tronco cortado arriba
    if(m>0.){ vec4 b=bark(p,tr,float(i)*9.+2.,1.); c=mix(c,b.rgb,m); a=max(a,m); }
  }
  // arbustos y helechos abajo (con huecos para los ojos cercanos)
  float hole=1.0;
  for(int i=0;i<4;i++){ vec2 d=(p-NEAR_EYES[i])*vec2(1.,1.6); hole=min(hole, smoothstep(0.10,0.22,length(d))); }
  float top=-0.42+0.10*fbm(vec2(p.x*2.5,7.),4);
  float leaves=0.;
  vec3 lc=vec3(0.);
  for(int k=0;k<5;k++){
    float fk=float(k);
    vec2 g=p*vec2(9.+fk*3.,7.+fk*2.5)+fk*13.;
    vec2 id0=floor(g);
    for(int jy=-1;jy<=1;jy++) for(int jx=-1;jx<=1;jx++){
    vec2 id=id0+vec2(float(jx),float(jy)); vec2 f=g-id-0.5;
    vec2 hh=h22(id);
    float ang=(hh.x-0.5)*2.4;
    vec2 q=rot(ang)*(f-(hh-0.5)*0.6);
    float leaf=length(q*vec2(1.0,2.4))-0.62;       // hoja alargada
    float vein=abs(q.y)<0.02?1.:0.;
    vec2 cp=(id+0.5+(hh-0.5)*0.6)/vec2(9.+fk*3.,7.+fk*2.5);
    float mound=top-fk*0.06+0.05*sin(cp.x*3.1+fk*1.7)+0.05*hh.y;
    float on=step(cp.y, mound);
    float m=smoothstep(0.03,-0.03,leaf)*on*hole;
    vec3 col=mix(vec3(0.02,0.05,0.02),vec3(0.05,0.10,0.04),hh.x)*(0.55+0.6*smoothstep(-0.4,0.4,q.x))*(1.-vein*0.3);
    col*=0.7+0.3*fk/4.;
    col+=vec3(0.45,0.5,0.7)*0.05*smoothstep(0.1,0.4,q.x+q.y)*step(0.5,hh.x);  // brillo de luna en algunas
    lc=mix(lc,col,m); leaves=max(leaves,m);
  }
  }
  // interior del arbusto: sombra densa entre las hojas
  float inner=smoothstep(0.02,-0.04,p.y-(top-0.07+0.03*gn(vec2(p.x*12.,4.))))*hole;
  vec3 ic=vec3(0.006,0.012,0.006)*(0.6+0.8*fbm(p*vec2(30.,30.),4));
  c=mix(c,ic,inner); a=max(a,inner);
  c=mix(c,lc,leaves); a=max(a,leaves);
  // suelo cercano
  float gy=-0.92+0.05*fbm(vec2(p.x*3.,9.),4);
  float gm=smoothstep(0.004,-0.004,p.y-gy);
  c=mix(c,vec3(0.02,0.018,0.015)*(0.6+0.8*fbm(p*vec2(15.,30.),5)),gm); a=max(a,gm);
  return vec4(c,a);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  vec4 c;
  if(plate==0){ c=layerFar(p); fc=c; return; }
  c = plate==1 ? layerMid(p) : layerNear(p);
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
        out = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '4_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
