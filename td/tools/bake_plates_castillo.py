"""Hornea las laminas de la escena 04 de Halloween (murcielagos y castillo).

Montanas lejanas, un castillo gotico sobre un acantilado de roca (piedra
con hiladas, almenas, contrafuertes, puente con arcos, torres con techos
conicos) con la luz de luna desde la derecha, la mascara de sus ventanas
(se encienden en vivo) y un primer plano de rocas y un arbol muerto.
Ver docs/53.

uso: python3 td/tools/bake_plates_castillo.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene04')
SS = 2
PLATES = [
    ('1_lejos', 0, (-3.1, -1.0, 3.1, 0.30), 1280, 268),
    ('2_castillo', 1, (-2.2, -1.1, 1.0, 0.90), 1024, 640),
    ('3_ventanas', 2, (-2.2, -1.1, 1.0, 0.90), 1024, 640),   # RG normal del relieve, B id de ventana
    ('4_cerca', 3, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
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
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }

// ---------- castillo ----------
// torres: x, base, alto, medio ancho
const vec4 TW[7] = vec4[](vec4(-1.62,-0.40,0.55,0.075), vec4(-1.28,-0.38,0.85,0.095), vec4(-0.92,-0.36,1.10,0.085),
                          vec4(-0.55,-0.38,0.70,0.10), vec4(-0.22,-0.40,0.95,0.07), vec4(0.10,-0.42,0.45,0.06),
                          vec4(0.62,-0.50,0.78,0.065));
float cliffY(float x){ return -0.42 + 0.03*(gn(vec2(x*30.,5.))-0.5) + 0.06*sin(x*2.3) - 0.85*smoothstep(0.25,0.97,x) + 0.04*fbm(vec2(x*6.,1.),5) - 0.85*smoothstep(-1.55,-2.18,x); }

// devuelve d (distancia), y en o: x = material (0 roca, 1 piedra, 2 techo), y = sombra lateral
float castle(vec2 p, out vec2 o){
  float d=1e3; o=vec2(0.,0.);
  // muralla entre torres
  float wall=sdBox(p-vec2(-0.75,-0.40),vec2(0.92,0.26));
  float cren=step(0.5,fract(p.x*16.))*0.022;
  wall=max(wall, p.y-(-0.14+cren));
  if(wall<d){ d=wall; o=vec2(1.,0.); }
  // torres con almenas y techos
  for(int i=0;i<7;i++){
    vec4 t=TW[i];
    vec2 q=p-vec2(t.x,t.y);
    float w=t.w*(1.0+0.08*smoothstep(0.1,0.0,q.y));
    float tw=sdBox(q-vec2(0.,(t.z-0.40)*0.5),vec2(w,(t.z+0.40)*0.5));
    // matacanes: borde que sobresale arriba
    tw=min(tw, sdBox(q-vec2(0.,t.z-0.02),vec2(w*1.18,0.02)));
    if(tw<d){ d=tw; o=vec2(1.,q.x/w); }
    // techo conico con aguja (algunas torres tienen almenas en vez de techo)
    if(mod(float(i),3.)!=1.){
      vec2 r=q-vec2(0.,t.z);
      float roof=max((abs(r.x)*(3.4/1.2) + r.y - w*3.4)*0.34, -r.y);
      roof=min(roof, max(abs(r.x)-0.004, max(-r.y+w*3.0, r.y-w*4.3)));
      if(roof<d){ d=roof; o=vec2(2.,r.x/w); }
    } else {
      float c=max(sdBox(q-vec2(0.,t.z+0.02),vec2(w*1.18,0.02)), -(step(0.5,fract(q.x*28.))-0.5));
      if(c<d){ d=c; o=vec2(1.,q.x/w); }
    }
  }
  // puente con arcos hacia la torre separada
  vec2 bq=p-vec2(0.37,-0.30);
  float bridge=sdBox(bq,vec2(0.24,0.035));
  float arch=length((bq-vec2(0.,-0.16))*vec2(1.,1.3))-0.16;
  float pillars=sdBox(vec2(abs(bq.x)-0.20,bq.y+0.20),vec2(0.03,0.20));
  bridge=min(bridge, pillars);
  bridge=max(bridge, -max(arch, bq.y));
  if(bridge<d){ d=bridge; o=vec2(1.,0.); }
  // contrafuertes en la muralla
  for(int i=0;i<0;i++){
    vec2 cq=p-vec2(-1.45+float(i)*0.52,-0.36);
    float bt=max(sdBox(cq,vec2(0.03,0.08)), cq.x*1.5+cq.y-0.06);
    if(bt<d){ d=bt; o=vec2(1.,0.6); }
  }
  // acantilado de roca
  float cl=p.y-cliffY(p.x);
  if(cl<d){ d=cl; o=vec2(0.,0.); }
  return d;
}

vec4 castleColor(vec2 p){
  vec2 o; float d=castle(p,o);
  float m=smoothstep(0.0015,-0.0015,d);
  if(m<=0.) return vec4(0.);
  vec3 c;
  if(o.x<0.5){
    // roca con estratos y grietas, luz de luna desde la derecha
    float strata=fbm(vec2(p.x*3.,p.y*14.+fbm(p*4.,3)*2.),6);
    float cr=smoothstep(0.985,0.997,1.-abs(fbm(p*vec2(8.,5.),5)*2.-1.));
    float face=fbm(p*vec2(6.,9.)+3.,5);
    c=vec3(0.13,0.12,0.13)*(0.5+0.8*strata)*(1.-cr*0.6);
    float lit=smoothstep(0.35,0.75,face+0.15*sin(p.x*5.));
    c*=0.35+0.9*lit;
    c*=0.5+0.5*smoothstep(-1.1,-0.45,p.y);
  } else {
    // sillares de piedra
    vec2 bq=vec2(p.x/0.05+0.5*mod(floor(p.y/0.022),2.), p.y/0.022);
    vec2 f=fract(bq);
    float mortar=smoothstep(0.0,0.10,f.x)*smoothstep(1.,0.9,f.x)*smoothstep(0.0,0.14,f.y)*smoothstep(1.,0.86,f.y);
    c=vec3(0.16,0.15,0.16)*(0.7+0.4*h21(floor(bq)))*(0.75+0.25*mortar)*(0.7+0.5*fbm(p*60.,4));
    if(o.x>1.5) c=vec3(0.07,0.07,0.09)*(0.7+0.6*step(0.5,fract(p.y*90.+p.x*0.)));    // techo de pizarra
    // cilindro: luz de luna en el lado derecho, sombra a la izquierda
    float u=clamp(o.y,-1.,1.);
    c*=0.35+0.85*smoothstep(-0.5,1.0,u);
    c+=vec3(0.55,0.58,0.75)*0.10*smoothstep(0.7,0.98,u);
    // musgo y manchas de agua
    c*=1.-0.35*smoothstep(0.55,0.8,fbm(vec2(p.x*20.,p.y*4.),4));
  }
  return vec4(c,m);
}

// ---------- RELIEVE (fase 26) ----------
// Torres cilindricas con sillares y almenas, techos conicos de pizarra,
// muralla y el acantilado con estratos y grietas. La escena saca la
// normal: el relampago entra desde su lado y la luna marca la roca.
float castleH(vec2 p, out float on){
  vec2 o; float d=castle(p,o);
  on=step(d,0.);
  if(d>0.) return 0.;
  float h;
  if(o.x<0.5){
    float strata=fbm(vec2(p.x*3.,p.y*14.+fbm(p*4.,3)*2.),6);
    float cr=smoothstep(0.985,0.997,1.-abs(fbm(p*vec2(8.,5.),5)*2.-1.));
    h=0.05*fbm(p*vec2(6.,9.)+3.,5)+0.012*strata-0.004*cr;
  } else {
    vec2 bq=vec2(p.x/0.05+0.5*mod(floor(p.y/0.022),2.), p.y/0.022);
    vec2 f=fract(bq);
    float mortar=smoothstep(0.0,0.10,f.x)*smoothstep(1.,0.9,f.x)*smoothstep(0.0,0.14,f.y)*smoothstep(1.,0.86,f.y);
    float u=clamp(o.y,-1.,1.);
    h=0.06+sqrt(max(1.-u*u,0.))*0.06+0.003*mortar;
    if(o.x>1.5) h=0.06+sqrt(max(1.-u*u,0.))*0.05+0.002*step(0.5,fract(p.y*90.));
    h=min(h,0.06-d*2.0);           // canto redondeado en el borde de la silueta
  }
  return h;
}
vec4 castleRelief(vec2 p){
  float on,o2; float h=castleH(p,on);
  if(on<0.5) return vec4(0.5,0.5,1.,1.);
  float e=0.0035;
  float hx=castleH(p+vec2(e,0.),o2)-castleH(p-vec2(e,0.),o2);
  float hy=castleH(p+vec2(0.,e),o2)-castleH(p-vec2(0.,e),o2);
  vec3 n=normalize(vec3(-hx/(2.*e),-hy/(2.*e),1.));
  return vec4(n.xy*0.5+0.5,1.,1.);
}

vec4 castleWindows(vec2 p){
  vec2 o; float d=castle(p,o);
  float inside=step(d,0.);
  float w=0.;
  for(int i=0;i<7;i++){
    vec4 t=TW[i];
    for(int k=0;k<3;k++){
      float fk=float(k);
      vec2 q=p-vec2(t.x, t.y+t.z*(0.30+fk*0.25));
      // ventana en arco
      float win=min(sdBox(q,vec2(t.w*0.20,0.020)), length(q-vec2(0.,0.020))-t.w*0.20);
      if(h21(vec2(float(i),fk))<0.35 && !(i==2 && k==2)) continue;   // la del vampiro siempre
      float id=(float(i)*3.+fk+1.)/24.;
      if(win<0.) w=max(w,id);
    }
  }
  // ventanas de la muralla
  vec2 q=vec2(fract((p.x+0.75)/0.18)-0.5, p.y+0.27)*vec2(0.18,1.);
  float wwin=sdBox(q,vec2(0.010,0.016));
  if(wwin<0. && abs(p.x+0.75)<0.88 && h21(vec2(floor((p.x+0.75)/0.18),9.))>0.4) w=max(w,0.95);
  vec4 rl=castleRelief(p);
  return vec4(rl.xy, w*inside, 1.);
}

// ---------- montanas lejanas ----------
vec4 far(vec2 p){
  float a=0., l=0.;
  for(int i=0;i<2;i++){
    float fi=float(i);
    float y=-0.35+fi*(-0.15)+0.22*fbm(vec2(p.x*(0.5+fi*0.4)+fi*5.,0.),6)-0.1;
    float m=smoothstep(0.003,-0.003,p.y-y);
    if(m>0.){ l=mix(l, 0.6-fi*0.3 + 0.25*fbm(p*vec2(4.,8.)+fi,5), m); a=max(a,m); }
  }
  return vec4(l,l,l,a);
}

// ---------- primer plano ----------
vec4 nearP(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  // rocas abajo a la izquierda y colina abajo a la derecha
  float rockL=p.y-(-0.95+0.25*smoothstep(-1.5,-3.1,p.x)+0.06*fbm(vec2(p.x*5.,2.),5));
  float hillR=p.y-(-0.98+0.30*smoothstep(1.2,3.1,p.x)+0.05*fbm(vec2(p.x*4.,3.),5));
  float g=min(rockL,hillR);
  float m=smoothstep(0.003,-0.003,g);
  c=mix(c, vec3(0.02,0.018,0.022)*(0.6+0.8*fbm(p*vec2(10.,20.),5)), m); a=max(a,m);
  // pasto seco en el borde
  float k=p.x*180.;
  float bh=0.015+0.04*h21(vec2(floor(k),1.));
  float gy=min(-0.95+0.25*smoothstep(-1.5,-3.1,p.x), -0.98+0.30*smoothstep(1.2,3.1,p.x));
  float bl=step(abs(fract(k)-0.5),0.2*(1.-(p.y-gy)/bh))*step(gy-0.01,p.y)*step(p.y,gy+bh);
  c=mix(c,vec3(0.015),bl); a=max(a,bl);
  // arbol muerto a la derecha: tronco y ramas que se abren sobre el cielo
  vec2 tq=p-vec2(2.35,-0.78);
  float tr=abs(tq.x+0.05*sin(tq.y*3.))-(0.085-tq.y*0.035);
  tr=max(tr,max(-tq.y,tq.y-1.5));
  float br=tr;
  for(int i=0;i<7;i++){
    float fi=float(i);
    vec2 o=vec2(0.,0.35+fi*0.13);
    float ang=(mod(fi,2.)*2.-1.)*(0.7+0.15*fi) - 0.35;
    vec2 q=rot(ang)*(tq-o);
    float len=1.0-fi*0.08;
    float b=abs(q.x+0.05*sin(q.y*7.+fi))-0.024*(1.-q.y/len);
    b=max(b,max(-q.y,q.y-len));
    br=min(br,b);
    vec2 q2=rot(0.6*(mod(fi,2.)*2.-1.))*(q-vec2(0.,len*0.6));
    br=min(br, max(abs(q2.x+0.02*sin(q2.y*12.))-0.006, max(-q2.y,q2.y-len*0.4)));
  }
  float tm=smoothstep(0.002,-0.002,br);
  vec3 bark=vec3(0.025,0.02,0.02)*(0.6+0.6*fbm(tq*vec2(20.,5.),4));
  c=mix(c,bark,tm); a=max(a,tm);
  return vec4(c,a);
}


void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  vec4 c;
  if(plate==0){ fc=far(p); return; }
  if(plate==2){ fc=castleWindows(p); return; }
  c = plate==1 ? castleColor(p) : nearP(p);
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
        ss = 1 if pid == 2 else SS        # la mascara de ventanas va sin promediar (ids)
        fbo = ctx.simple_framebuffer((w * ss, h * ss), components=4, dtype='f4')
        fbo.use()
        fbo.clear(0, 0, 0, 0)
        vao.render(mode=moderngl.TRIANGLE_STRIP)
        img = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(h * ss, w * ss, 4)[::-1]
        fbo.release()
        if ss > 1:
            a = img[..., 3:4]
            pm = np.concatenate([img[..., :3] * a, a], -1).reshape(h, ss, w, ss, 4).mean((1, 3))
            rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
            img = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h), r)
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '5_ruido.png'))
    shutil.copy(os.path.join(SETS, 'scene00', '6_luna.png'), os.path.join(OUT, '6_luna.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
