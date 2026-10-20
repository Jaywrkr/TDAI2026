"""Hornea las laminas de la escena 15 de Halloween (manos de zombie).

Fondo de cementerio de noche (reja de hierro, mausoleo, lapidas
torcidas, arboles pelados); la tierra recien removida con montículos,
terrones, raices y un agujero oscuro en cada tumba (color + relieve); y
una mano de zombie con antebrazo y manga rota en dos poses -- abierta y
en garra -- con piel podrida, venas, unas rotas y hueso en las puntas
(color + relieve). El shader mezcla las dos poses para que los dedos se
abran y cierren. Ver docs/53.

HOLES (abajo) es la MISMA lista que usa scene15_manos_zombie.frag.

uso: python3 td/tools/bake_plates_zombies.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene15')
SS = 2
PLATES = [
    ('1_fondo', 0, (-3.1, -0.8, 3.1, 0.6), 1280, 290),
    ('2_tierra_color', 1, (-3.1, -1.2, 3.1, -0.25), 1280, 196),
    ('3_tierra_relieve', 2, (-3.1, -1.2, 3.1, -0.25), 1280, 196),
    ('4_mano_abierta_color', 3, (-0.5, -0.25, 0.5, 1.30), 330, 512),
    ('5_mano_abierta_relieve', 4, (-0.5, -0.25, 0.5, 1.30), 330, 512),
    ('6_mano_garra_color', 5, (-0.5, -0.25, 0.5, 1.30), 330, 512),
    ('7_mano_garra_relieve', 6, (-0.5, -0.25, 0.5, 1.30), 330, 512),
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
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
vec2 cone(vec2 p, vec2 a, vec2 b, float ra, float rb){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return vec2(length(pa-ba*h)-mix(ra,rb,h),h); }
float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }

// agujeros de las tumbas (igual en el shader): x, y del agujero
const int NH=9;
const vec2 HOLES[9]=vec2[9](vec2(-2.25,-0.50),vec2(-1.50,-0.47),vec2(-0.75,-0.52),vec2(0.0,-0.46),vec2(0.75,-0.51),
                            vec2(1.50,-0.47),vec2(2.25,-0.50),vec2(-1.12,-0.60),vec2(1.12,-0.60));

// --- fondo ---
vec4 back(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  float g=-0.42+0.05*fbm(vec2(p.x*0.8,2.),4);
  float gm=smoothstep(0.003,-0.003,p.y-g); c=mix(c,vec3(0.05,0.06,0.05)*(0.6+0.5*fbm(p*vec2(8.,20.),4)),gm); a=max(a,gm);
  // mausoleo
  vec2 q=p-vec2(-0.45,g);
  float mau=min(sdBox(q-vec2(0.,0.16),vec2(0.24,0.16)),max(abs(q.x)*0.55+(q.y-0.32)-0.10,0.32-q.y));
  mau=min(mau,sdBox(q-vec2(0.,0.35),vec2(0.03,0.08)));
  mau=min(mau,sdBox(q-vec2(0.,0.39),vec2(0.06,0.012)));
  float door=sdBox(q-vec2(0.,0.10),vec2(0.07,0.10));
  float mm=smoothstep(0.002,-0.002,mau);
  vec3 stone=vec3(0.12,0.13,0.12)*(0.6+0.5*fbm(q*vec2(20.,30.),4))*(0.7+0.3*smoothstep(0.24,-0.24,q.x));
  stone*=1.-0.4*smoothstep(0.004,0.,abs(fract(q.y*14.)-0.5)-0.47);
  c=mix(c,door<0.?vec3(0.01):stone,mm); a=max(a,mm);
  // reja de hierro con puntas
  float bars=abs(fract(p.x*7.)-0.5)-0.06;
  float fence=max(bars,max(-(p.y-g),p.y-(g+0.22)));
  float spike=max(abs(fract(p.x*7.)-0.5)*2.5+(p.y-(g+0.26))-0.0,-(p.y-(g+0.21)));
  float rails=max(min(abs(p.y-(g+0.05))-0.006,abs(p.y-(g+0.18))-0.006),abs(p.x)-3.2);
  float fm=smoothstep(0.002,-0.002,min(min(fence,spike),rails))*step(0.35,abs(p.x+0.45)-0.0);
  c=mix(c,vec3(0.02,0.02,0.025),fm); a=max(a,fm);
  // lapidas torcidas y arboles
  for(int i=0;i<8;i++){
    float fi=float(i); float x0=-2.9+fi*0.8+0.2*h21(vec2(fi,1.));
    vec2 r=rot(0.2*(h21(vec2(fi,2.))-0.5))*(p-vec2(x0,g-0.02));
    float st=sdBox(r-vec2(0.,0.08),vec2(0.06,0.08))-0.03;
    if(mod(fi,3.)<1.) st=min(sdBox(r-vec2(0.,0.10),vec2(0.012,0.11)),sdBox(r-vec2(0.,0.15),vec2(0.05,0.012)));
    float sm=smoothstep(0.002,-0.002,st);
    c=mix(c,vec3(0.10,0.11,0.10)*(0.6+0.5*fbm(r*25.,3)),sm); a=max(a,sm);
    vec2 tq=p-vec2(x0+0.4,g);
    float tr=max(abs(tq.x+0.02*sin(tq.y*9.))-0.014*(1.-tq.y*1.4),max(-tq.y,tq.y-0.55));
    for(int k=0;k<5;k++){ vec2 bq=rot((mod(float(k),2.)*2.-1.)*0.8)*(tq-vec2(0.,0.18+float(k)*0.07)); tr=min(tr,max(abs(bq.x)-0.004,max(-bq.y,bq.y-0.18))); }
    float tm=smoothstep(0.002,-0.002,tr)*step(1.5,mod(fi+1.,3.)*1.);
    c=mix(c,vec3(0.02),tm); a=max(a,tm);
  }
  return vec4(c,a);
}

// --- tierra removida: altura + albedo ---
float groundY(float x){
  float y=-0.66+0.03*fbm(vec2(x*1.2,4.),4);
  for(int i=0;i<NH;i++){ float d=(x-HOLES[i].x)/0.34; y+=0.14*exp(-d*d)*(i>=7?0.55:1.0); }
  return y;
}
struct G { float a; float h; vec3 alb; };
G ground(vec2 p){
  G g; g.a=0.; g.h=0.; g.alb=vec3(0.);
  float gy=groundY(p.x);
  if(p.y>gy) return g;
  g.a=1.;
  float clod=fbm(p*vec2(22.,30.),5);
  g.h=(gy-p.y)*0.0+clod*0.025+0.02*smoothstep(0.55,0.75,fbm(p*9.,4));
  vec3 dirt=mix(vec3(0.07,0.05,0.035),vec3(0.16,0.12,0.08),clod);
  dirt=mix(dirt,vec3(0.05,0.07,0.035),smoothstep(0.6,0.8,fbm(p*vec2(6.,12.)+5.,4))*0.6);   // pasto muerto
  // raices
  float root=1.-smoothstep(0.0,0.006,abs(fbm(p*vec2(3.,7.)+2.,4)-0.5)-0.006);
  dirt=mix(dirt,vec3(0.12,0.09,0.06),root*smoothstep(gy-0.03,gy-0.25,p.y)*0.7);
  g.h+=root*0.01;
  // agujeros: boca oscura con borde de terrones
  for(int i=0;i<NH;i++){
    vec2 hq=(p-HOLES[i])/vec2(0.12,0.04)*(i>=7?1.25:1.0);
    float hd=length(hq)-1.0+0.15*fbm(hq*3.+float(i),3);
    if(hd<0.){ dirt=vec3(0.006,0.004,0.003)*(1.+3.*smoothstep(-0.6,0.,hd)); g.h=-0.03*smoothstep(0.,-0.5,hd); }
    float rim=exp(-max(hd,0.)*4.)*step(0.,hd);
    dirt=mix(dirt,vec3(0.18,0.13,0.09)*(0.6+0.6*clod),rim*0.6);
    g.h+=rim*0.03;
  }
  // terrones sueltos
  vec2 cg=p*vec2(14.,22.); vec2 ci=floor(cg);
  float cl=length(fract(cg)-0.5-(h22(ci)-0.5)*0.4)-0.18*h21(ci+3.);
  if(cl<0.&&h21(ci)>0.6){ dirt=vec3(0.14,0.10,0.07)*(0.6+0.6*fbm(cg,3)); g.h+=0.02*smoothstep(0.,-0.15,cl); }
  g.alb=dirt*(0.5+0.5*smoothstep(gy-0.5,gy,p.y));
  return g;
}

// --- mano de zombie (open 1 = abierta, 0 = garra) ---
struct H { float d; float h; vec3 alb; float bone; };
H hand(vec2 p, float open){
  H r; r.d=1e3; r.h=0.; r.alb=vec3(0.); r.bone=0.;
  // antebrazo que sale de abajo
  vec2 fa=cone(p+vec2(0.02*sin(p.y*5.),0.),vec2(0.0,-0.25),vec2(0.02,0.58),0.115,0.085);
  float palm=length((p-vec2(0.02,0.70))/vec2(0.15,0.15))-1.; palm*=0.14;
  float d=smin(fa.x,palm,0.05);
  float best=d; float fh=0.;
  // dedos: 3 falanges cada uno; en garra se doblan hacia adelante
  for(int i=0;i<5;i++){
    float fi=float(i);
    float th=(i==4)?1.:0.;
    float sgn=sign(fi-1.8+0.01);
    float ang=mix((fi-1.8)*0.14,(fi-1.8)*0.32,open)+(th>0.5?mix(-0.9,-1.25,open):0.);
    vec2 b0=vec2(0.02,0.72)+vec2((fi-1.8)*0.065,0.08)+(th>0.5?vec2(-0.10,-0.12):vec2(0.));
    float L=(i==2?0.36:(i==1||i==3?0.32:0.25))*(th>0.5?0.75:1.);
    float curl=(1.-open)*(th>0.5?0.5:1.);
    vec2 dir=vec2(sin(ang),cos(ang));
    vec2 j1=b0+dir*L*0.42;
    // en garra las falanges se acortan (vienen hacia la camara) y se
    // ganchan hacia abajo y hacia adentro
    vec2 d2=normalize(dir+vec2(-sgn*0.35*curl+0.25*curl,-0.55*curl));
    vec2 j2=j1+d2*L*0.33*mix(1.,0.85,curl);
    vec2 d3=normalize(d2+vec2(-sgn*0.20*curl,-1.6*curl));
    vec2 j3=j2+d3*L*0.25*mix(1.,0.9,curl);
    float w=0.034*(th>0.5?1.15:1.);
    vec2 s1=cone(p,b0,j1,w,w*0.85), s2=cone(p,j1,j2,w*0.85,w*0.72), s3=cone(p,j2,j3,w*0.70,w*0.45);
    float fd=min(min(s1.x,s2.x),s3.x);
    // nudillos hinchados
    fd=smin(fd,length(p-j1)-w*1.05,0.01); fd=smin(fd,length(p-j2)-w*0.9,0.01);
    best=smin(best,fd,0.025);
    // punta: hueso que asoma
    if(s3.x<0.&&s3.y>0.65) r.bone=max(r.bone,smoothstep(0.65,0.9,s3.y)*step(0.5,h21(vec2(fi,3.)))*0.7);
  }
  r.d=best;
  if(best<0.){
    float depth=clamp(-best/0.10,0.,1.);
    float rot1=fbm(p*vec2(16.,10.),5);
    vec3 skin=mix(vec3(0.20,0.24,0.17),vec3(0.36,0.38,0.27),rot1);
    skin=mix(skin,vec3(0.10,0.08,0.06),smoothstep(0.6,0.78,fbm(p*7.+3.,4))*0.8);       // podrido
    skin=mix(skin,vec3(0.24,0.05,0.05),smoothstep(0.72,0.85,fbm(p*12.+8.,3))*0.7);      // carne viva
    float vein=1.-smoothstep(0.,0.01,abs(fbm(p*vec2(5.,14.),4)-0.5)-0.004);
    skin=mix(skin,vec3(0.08,0.10,0.12),vein*0.6);
    skin=mix(skin,vec3(0.80,0.76,0.66),r.bone);
    r.alb=skin;
    r.h=sqrt(depth)*0.08+rot1*0.012-vein*0.006;
    // manga rota en el antebrazo
    float sleeve=p.y-(0.22+0.05*fbm(vec2(p.x*20.,1.),3)+0.03*sin(p.x*40.));
    if(sleeve<0.){ vec3 cloth=vec3(0.05,0.045,0.05)*(0.6+0.6*fbm(p*vec2(60.,12.),4)); r.alb=cloth; r.h=sqrt(depth)*0.09+0.015*sin(p.x*90.); }
  }
  return r;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==0){ vec4 f=back(p); fc=vec4(pow(clamp(f.rgb*2.,0.,1.),vec3(1./2.2)), f.a); return; }
  if(plate==1||plate==2){
    G g=ground(p);
    if(plate==1){ fc=vec4(pow(clamp(g.alb*2.,0.,1.),vec3(1./2.2)), g.a); return; }
    float e=0.003;
    float hx=ground(p+vec2(e,0.)).h-ground(p-vec2(e,0.)).h;
    float hy=ground(p+vec2(0.,e)).h-ground(p-vec2(0.,e)).h;
    vec3 n=normalize(vec3(-hx/(2.*e)*0.5,-hy/(2.*e)*0.5,1.));
    fc=vec4(n.xy*0.5+0.5, 0., g.a); return;
  }
  float open=(plate==3||plate==4)?1.:0.;
  H h=hand(p,open);
  float a=smoothstep(0.003,-0.003,h.d);
  if(plate==3||plate==5){ fc=vec4(pow(clamp(h.alb*2.,0.,1.),vec3(1./2.2)), a); return; }
  float e=0.003;
  float hx=hand(p+vec2(e,0.),open).h-hand(p-vec2(e,0.),open).h;
  float hy=hand(p+vec2(0.,e),open).h-hand(p-vec2(0.,e),open).h;
  vec3 n=normalize(vec3(-hx/(2.*e)*0.5,-hy/(2.*e)*0.5,1.));
  fc=vec4(n.xy*0.5+0.5, h.bone, a);
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
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '8_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
