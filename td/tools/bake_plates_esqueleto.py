"""Hornea las laminas de la escena 17 de Halloween (esqueleto bailando).

Una cripta con arcos de piedra, columnas y un piso de losas en
perspectiva (color + relieve), y un ATLAS de huesos en relieve (color +
relieve): craneo, caja toracica con columna y claviculas, pelvis, fémur,
tibia y perone, humero, radio y cubito, mano y pie. El shader arma el
esqueleto con estas piezas y lo hace bailar. Ver docs/53.

BONES (abajo): rectangulo de cada pieza en el atlas y su ancho/largo en
unidades del mundo; es la MISMA tabla que usa scene17_esqueleto.frag.

uso: python3 td/tools/bake_plates_esqueleto.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene17')
SS = 2
PLATES = [
    ('1_cripta_color', 0, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
    ('2_cripta_relieve', 1, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
    ('3_huesos_color', 2, (0.0, 0.0, 1.0, 1.0), 1024, 1024),
    ('4_huesos_relieve', 3, (0.0, 0.0, 1.0, 1.0), 1024, 1024),
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
float rbox(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
vec2 cone(vec2 p, vec2 a, vec2 b, float ra, float rb){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return vec2(length(pa-ba*h)-mix(ra,rb,h),h); }
float ell(vec2 p, vec2 c, vec2 r){ return (length((p-c)/r)-1.)*min(r.x,r.y); }

// atlas: rect (u0, v0, du, dv) y tamano en el mundo (ancho, largo)
const vec4 BR[9]=vec4[9](vec4(0.50,0.00,0.12,0.50), vec4(0.62,0.00,0.12,0.50), vec4(0.74,0.00,0.12,0.50),
                         vec4(0.86,0.00,0.12,0.50), vec4(0.00,0.00,0.25,0.25), vec4(0.25,0.00,0.25,0.25),
                         vec4(0.00,0.50,0.50,0.50), vec4(0.50,0.50,0.50,0.50), vec4(0.00,0.25,0.50,0.25));
const vec2 BS[9]=vec2[9](vec2(0.16,0.42), vec2(0.16,0.40), vec2(0.13,0.28), vec2(0.13,0.26), vec2(0.20,0.20),
                         vec2(0.20,0.20), vec2(0.26,0.30), vec2(0.42,0.55), vec2(0.36,0.18));

// cada pieza en sus coordenadas: x = -W/2..W/2, y = 0 (articulacion a) .. L (articulacion b)
float longBone(vec2 q, float W, float L, bool cond){
  float shaft=abs(q.x+0.006*sin(q.y*12.))-W*(0.12+0.03*sin(q.y/L*3.14));
  shaft=max(shaft,max(-q.y-0.0,q.y-L));
  float headA=cond?min(length(q-vec2(-W*0.18,W*0.17))-W*0.21,length(q-vec2(W*0.18,W*0.17))-W*0.21):length(q-vec2(0.,W*0.2))-W*0.28;
  float headB=length(q-vec2(W*0.08,L-W*0.22))-W*0.26;
  float troch=length(q-vec2(-W*0.26,L-W*0.42))-W*0.12;
  return smin(smin(shaft,headA,W*0.15),smin(headB,troch,W*0.08),W*0.15);
}
float twoBones(vec2 q, float W, float L){
  float a=abs(q.x+W*0.12+0.004*sin(q.y*15.))-W*0.10; a=max(a,max(-q.y,q.y-L));
  float b=abs(q.x-W*0.16-0.003*sin(q.y*11.))-W*0.06; b=max(b,max(-q.y-0.0,q.y-L*0.96));
  float ea=rbox(q-vec2(0.,W*0.12),vec2(W*0.34,W*0.12),W*0.1);
  float eb=rbox(q-vec2(0.,L-W*0.12),vec2(W*0.30,W*0.11),W*0.1);
  return smin(min(a,b),min(ea,eb),W*0.1);
}
float handB(vec2 q, float W, float L, bool foot){
  float d=ell(q,vec2(0.,L*0.18),vec2(W*0.30,L*0.16));            // carpos / tarsos
  for(int i=0;i<5;i++){
    float fi=float(i);
    float x=(fi-2.)*W*0.15*(foot?1.1:1.);
    float ln=(foot?0.45:(i==2?0.72:(i==0||i==4?0.5:0.65)))*L;
    if(!foot&&i==0){ vec2 c=cone(q,vec2(-W*0.22,L*0.22),vec2(-W*0.45,L*0.55),W*0.05,W*0.03); d=smin(d,c.x,0.01); continue; }
    vec2 a=vec2(x*0.7,L*0.28), m=vec2(x,L*0.28+ln*0.5), b=vec2(x*1.1,L*0.28+ln);
    d=smin(d,min(cone(q,a,m,W*0.045,W*0.035).x,cone(q,m,b,W*0.035,W*0.025).x),0.006);
    d=min(d,length(q-m)-W*0.045);
  }
  return d;
}
float skullB(vec2 q, float W, float L, out float hole){
  vec2 c=q-vec2(0.,L*0.55);
  float cran=ell(c,vec2(0.,0.03),vec2(W*0.48,L*0.40));
  float cheek=ell(c,vec2(0.,-L*0.12),vec2(W*0.44,L*0.22));
  float jaw=rbox(q-vec2(0.,L*0.13),vec2(W*0.24,L*0.10),W*0.1);
  float d=smin(smin(cran,cheek,0.02),jaw,0.02);
  float eyes=min(ell(c,vec2(-W*0.20,-L*0.02),vec2(W*0.14,L*0.11)),ell(c,vec2(W*0.20,-L*0.02),vec2(W*0.14,L*0.11)));
  float nose=max(abs(c.x)*1.4+(c.y+L*0.16)*0.8-W*0.06,-(c.y+L*0.24));
  float mouth=max(abs(q.y-L*0.24)-L*0.012,abs(q.x)-W*0.22);
  hole=min(min(eyes,nose),mouth);
  return d;
}
float ribsB(vec2 q, float W, float L){
  // columna
  float sp=abs(q.x)-W*0.05; sp=max(sp,max(-q.y,q.y-L));
  float vert=step(0.35,fract(q.y*28.));
  float d=sp+(1.-vert)*0.004;
  // costillas
  for(int i=0;i<7;i++){
    float fi=float(i);
    float y=L*(0.40+fi*0.075);
    float w=W*(0.30+0.18*sin(3.14*(fi+1.5)/8.5));
    vec2 rq=(q-vec2(0.,y))/vec2(w,W*0.16);
    float rib=abs(length(rq*vec2(1.,1.)+vec2(0.,0.55))-1.)*W*0.16-W*0.013;
    rib=max(rib,-(q.y-y+W*0.05));
    rib=max(rib,(abs(q.x)<W*0.04?1.:-1.));
    d=min(d,rib);
  }
  // esternon y claviculas
  d=min(d,rbox(q-vec2(0.,L*0.70),vec2(W*0.035,L*0.16),W*0.02));
  d=min(d,cone(vec2(abs(q.x),q.y),vec2(W*0.03,L*0.92),vec2(W*0.46,L*0.95),W*0.022,W*0.016).x);
  // escapulas (atras, se asoman)
  d=min(d,ell(vec2(abs(q.x),q.y),vec2(W*0.40,L*0.82),vec2(W*0.09,L*0.10))+0.004);
  return d;
}
float pelvisB(vec2 q, float W, float L){
  float il=min(ell(q,vec2(-W*0.26,L*0.60),vec2(W*0.22,L*0.42)),ell(q,vec2(W*0.26,L*0.60),vec2(W*0.22,L*0.42)));
  float holeA=min(ell(q,vec2(-W*0.16,L*0.25),vec2(W*0.08,L*0.17)),ell(q,vec2(W*0.16,L*0.25),vec2(W*0.08,L*0.17)));
  float sac=rbox(q-vec2(0.,L*0.55),vec2(W*0.08,L*0.40),W*0.05);
  float pub=rbox(q-vec2(0.,L*0.12),vec2(W*0.24,L*0.10),W*0.05);
  float d=smin(smin(il,sac,0.01),pub,0.02);
  return max(d,-holeA);
}

struct S { float d; float h; vec3 alb; };
S bones(vec2 uv){
  S s; s.d=1e3; s.h=0.; s.alb=vec3(0.);
  for(int i=0;i<9;i++){
    vec4 r=BR[i];
    if(uv.x<r.x||uv.y<r.y||uv.x>r.x+r.z||uv.y>r.y+r.w) continue;
    vec2 lu=(uv-r.xy)/r.zw;                     // 0..1 en la pieza
    vec2 q=vec2((lu.x-0.5)*BS[i].x, lu.y*BS[i].y);
    float W=BS[i].x, L=BS[i].y;
    float d=1e3, hole=1e3;
    if(i==0) d=longBone(q,W,L,true);
    else if(i==1) d=twoBones(q,W,L);
    else if(i==2) d=longBone(q,W,L,false);
    else if(i==3) d=twoBones(q,W,L);
    else if(i==4) d=handB(q,W,L,false);
    else if(i==5) d=handB(q,W,L,true);
    else if(i==6) d=skullB(q,W,L,hole);
    else if(i==7) d=ribsB(q,W,L);
    else d=pelvisB(q,W,L);
    s.d=d;
    if(d<0.){
      float dep=clamp(-d/(W*0.12),0.,1.);
      s.h=sqrt(dep)*0.5;
      float st=fbm(q*vec2(60.,40.)+float(i),4);
      vec3 bone=mix(vec3(0.62,0.57,0.46),vec3(0.80,0.76,0.64),st);
      bone=mix(bone,vec3(0.35,0.28,0.18),smoothstep(0.62,0.8,fbm(q*14.+float(i)*3.,4))*0.6);   // manchas viejas
      s.alb=bone;
      s.h+=st*0.04;
      if(hole<0.){ s.alb=vec3(0.02,0.015,0.012); s.h=-0.2; }
      if(i==6){
        float teeth=step(abs(q.y-L*0.24),L*0.04)*step(abs(q.x),W*0.2)*step(0.25,fract(q.x/W*16.));
        if(teeth>0.5&&hole>=0.){ s.alb=vec3(0.78,0.74,0.62); s.h=0.35; }
      }
    }
    return s;
  }
  return s;
}

// --- cripta: arcos, columnas, piso de losas ---
struct C { vec3 alb; float h; };
C crypt(vec2 p){
  C c;
  float floorY=-0.62;
  if(p.y<floorY){
    float z=1./max(floorY-p.y+0.06,0.02);
    vec2 tq=vec2(p.x*z*0.30,z*0.55);
    vec2 ti=floor(tq), tf=fract(tq);
    float m=min(min(tf.x,1.-tf.x),min(tf.y,1.-tf.y));
    float grout=smoothstep(0.02,0.06,m);
    vec3 st=vec3(0.16,0.15,0.14)*(0.7+0.5*h21(ti))*(0.6+0.6*fbm(tq*vec2(3.,3.)+ti,4));
    c.alb=mix(vec3(0.03),st,grout)*smoothstep(-1.25,floorY,p.y);
    c.h=grout*0.5;
    return c;
  }
  // pared de fondo con tres arcos y columnas
  vec2 g=p*vec2(3.2,5.5); g.x+=floor(g.y)*0.5;
  vec2 i=floor(g), f=fract(g);
  float m=min(min(f.x,1.-f.x)*0.6,min(f.y,1.-f.y));
  vec3 st=vec3(0.13,0.12,0.11)*(0.7+0.5*h21(i))*(0.6+0.6*fbm(p*vec2(10.,16.)+i,4));
  c.alb=mix(vec3(0.035),st,smoothstep(0.02,0.07,m));
  c.h=smoothstep(0.02,0.1,m)*0.5;
  for(int k=-1;k<=1;k++){
    vec2 q=p-vec2(float(k)*1.85,floorY);
    float w=0.62;
    float arch=q.y<0.95?abs(q.x)-w:length(q-vec2(0.,0.95))-w;
    if(arch<0.){ float dk=k==0?0.25:0.4; c.alb*=dk; c.h-=0.4; }
    float rim=abs(arch)-0.05;
    if(rim<0.&&q.y>0.){ vec2 v=vec2(atan(q.y-0.95,q.x)*5.,length(q-vec2(0.,0.95))*8.); c.alb=vec3(0.17,0.16,0.14)*(0.7+0.4*fbm(v,3))*(q.y>0.95?(0.7+0.3*step(0.12,fract(v.x))):1.); c.h=0.9; }
    // columna entre arcos
    vec2 cq=p-vec2(float(k)*1.85+0.925,floorY);
    float col=rbox(cq-vec2(0.,0.70),vec2(0.10,0.70),0.02);
    float cap=rbox(cq-vec2(0.,1.42),vec2(0.15,0.04),0.01);
    float base=rbox(cq-vec2(0.,0.04),vec2(0.15,0.04),0.01);
    float cd=min(min(col,cap),base);
    if(cd<0.){ float x=clamp(cq.x/0.10,-1.,1.); c.alb=vec3(0.16,0.15,0.13)*(0.6+0.5*fbm(cq*vec2(20.,6.),4))*(0.5+0.5*sqrt(max(1.-x*x,0.))); c.h=1.0*sqrt(max(1.-x*x,0.)); }
  }
  return c;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate<=1){
    C c=crypt(p);
    if(plate==0){ fc=vec4(pow(clamp(c.alb*2.,0.,1.),vec3(1./2.2)), 1.); return; }
    float e=0.003;
    float hx=crypt(p+vec2(e,0.)).h-crypt(p-vec2(e,0.)).h;
    float hy=crypt(p+vec2(0.,e)).h-crypt(p-vec2(0.,e)).h;
    vec3 n=normalize(vec3(-hx/(2.*e)*0.02,-hy/(2.*e)*0.02,1.));
    fc=vec4(n.xy*0.5+0.5,0.,1.); return;
  }
  S s=bones(p);
  float a=smoothstep(0.0015,-0.0015,s.d);
  if(plate==2){ fc=vec4(pow(clamp(s.alb*2.,0.,1.),vec3(1./2.2)), a); return; }
  float e=0.0012;
  float hx=bones(p+vec2(e,0.)).h-bones(p-vec2(e,0.)).h;
  float hy=bones(p+vec2(0.,e)).h-bones(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx/(2.*e)*0.01,-hy/(2.*e)*0.01,1.));
  fc=vec4(n.xy*0.5+0.5,0.,a);
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
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '5_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
