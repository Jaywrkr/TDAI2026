"""Hornea las laminas de la escena 16 de Halloween (velas).

Una capilla a oscuras: pared de piedra con un nicho de arco y un
ventanal gotico de vitral (color + relieve; el vitral va en el canal B),
y adelante un altar con mantel de borde deshilachado, libros viejos, una
calavera, un candelabro y doce velas de distintas alturas con la cera
chorreada (color + relieve; la cera va en el canal B para que el shader
le haga transluscencia cerca de la llama). Las llamas son en vivo. Ver
docs/53.

CANDLES (abajo) es la MISMA lista que usa scene16_velas.frag: x, base,
alto y radio de cada vela (la mecha queda arriba de todo).

uso: python3 td/tools/bake_plates_velas.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene16')
SS = 2
PLATES = [
    ('1_pared_color', 0, (-3.1, -0.6, 3.1, 1.2), 1280, 372),
    ('2_pared_relieve', 1, (-3.1, -0.6, 3.1, 1.2), 1280, 372),
    ('3_altar_color', 2, (-3.1, -1.2, 3.1, 0.55), 1280, 362),
    ('4_altar_relieve', 3, (-3.1, -1.2, 3.1, 0.55), 1280, 362),
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

const float ALTAR_Y=-0.38;
const vec4 CANDLES[12]=vec4[12](
  vec4(-2.35,ALTAR_Y,0.30,0.045), vec4(-2.00,ALTAR_Y,0.48,0.055), vec4(-1.62,ALTAR_Y,0.22,0.050),
  vec4(-1.34,ALTAR_Y,0.62,0.060), vec4(-0.55,ALTAR_Y,0.40,0.050), vec4(0.55,ALTAR_Y,0.36,0.050),
  vec4(1.26,ALTAR_Y,0.70,0.062), vec4(1.55,ALTAR_Y,0.26,0.048), vec4(1.95,ALTAR_Y,0.52,0.055),
  vec4(2.35,ALTAR_Y,0.32,0.046), vec4(-0.98,0.16,0.20,0.032), vec4(0.98,0.16,0.20,0.032));

// --- pared con nicho y vitral ---
struct W { vec3 alb; float h; float glass; };
W wall(vec2 p){
  W w; w.glass=0.;
  vec2 g=p*vec2(2.7,4.8); g.x+=floor(g.y)*0.5;
  vec2 i=floor(g), f=fract(g);
  float m=min(min(f.x,1.-f.x)*0.57,min(f.y,1.-f.y));
  float mortar=smoothstep(0.02,0.06,m);
  vec3 st=vec3(0.15,0.14,0.13)*(0.7+0.5*h21(i))*(0.6+0.6*fbm(p*vec2(12.,18.)+i,5));
  st=mix(st,vec3(0.06,0.08,0.05),smoothstep(0.6,0.8,fbm(p*3.+7.,4))*0.5);
  w.alb=mix(vec3(0.04,0.035,0.03),st,mortar);
  w.h=mortar*(0.5+0.5*smoothstep(0.06,0.2,m))+0.1*fbm(p*20.,3);
  // nicho de arco en el centro
  vec2 q=p-vec2(0.,0.10);
  float arch=q.y<0.30?abs(q.x)-0.62:length(q-vec2(0.,0.30))-0.62;
  arch=max(arch,-(q.y+0.48));
  if(arch<0.){
    w.alb*=0.45; w.h-=0.3;
    // ventanal gotico con vitral y parteluces
    vec2 v=p-vec2(0.,0.30);
    float win=v.y<0.25?abs(v.x)-0.36:length(vec2(abs(v.x)+0.18,v.y-0.25))-0.54;
    win=max(win,-(v.y+0.55));
    if(win<0.){
      float lead=min(abs(v.x)-0.01,abs(fract(v.y*5.)-0.5)*0.2-0.004);
      vec2 cg=v*vec2(10.,8.); vec2 ci=floor(cg);
      float pane=1.-smoothstep(0.03,0.06,min(min(fract(cg.x),1.-fract(cg.x)),min(fract(cg.y),1.-fract(cg.y))));
      vec3 gc=mix(vec3(0.30,0.05,0.06),vec3(0.10,0.12,0.35),step(0.5,h21(ci)));
      gc=mix(gc,vec3(0.35,0.30,0.08),step(0.85,h21(ci+3.)));
      w.alb=mix(gc*(0.6+0.4*fbm(v*20.,3)),vec3(0.02),max(pane,step(lead,0.)));
      w.glass=1.-max(pane,step(lead,0.));
      w.h=0.2;
    }
    float frame=abs(win)-0.025;
    if(frame<0.){ w.alb=vec3(0.13,0.12,0.11)*(0.7+0.4*fbm(v*30.,3)); w.h=0.6; w.glass=0.; }
  }
  float archRim=abs(arch)-0.03;
  if(archRim<0.){ w.alb=vec3(0.17,0.16,0.14)*(0.7+0.4*fbm(q*25.,3)); w.h=0.8; }
  return w;
}

// --- altar con velas, calavera, libros, candelabro ---
struct A { vec3 alb; float h; float a; float wax; };
A altar(vec2 p){
  A r; r.alb=vec3(0.); r.h=0.; r.a=0.; r.wax=0.;
  // mesa de piedra + mantel con borde deshilachado
  if(p.y<ALTAR_Y){
    r.a=1.;
    float cloth=p.y-(ALTAR_Y-0.30-0.04*sin(p.x*3.)-0.03*fbm(vec2(p.x*10.,1.),3));
    vec3 stone=vec3(0.11,0.10,0.09)*(0.6+0.6*fbm(p*vec2(10.,20.),5));
    vec3 lin=vec3(0.28,0.25,0.21)*(0.85+0.15*sin(p.x*40.+fbm(p*5.,3)*4.))*(0.75+0.3*fbm(p*vec2(30.,4.),4));
    lin=mix(lin,vec3(0.15,0.08,0.05),smoothstep(0.6,0.8,fbm(p*5.,4))*0.6);       // manchas de cera y vino
    r.alb=cloth>0.?lin:stone;
    r.h=cloth>0.?0.3+0.08*sin(p.x*20.+fbm(p*4.,3)*4.):0.1*fbm(p*20.,3);
    if(abs(cloth)<0.012) { r.alb=vec3(0.22,0.20,0.16); r.h=0.5; }
    if(cloth<0.&&cloth>-0.05&&fract(p.x*90.)<0.4){ r.alb=vec3(0.24,0.21,0.17)*0.8; r.h=0.4; }   // flecos
  }
  // velas con chorreadas
  for(int i=0;i<12;i++){
    vec4 c=CANDLES[i];
    vec2 q=p-c.xy;
    float hgt=c.z, rad=c.w;
    float top=hgt-0.012*sin(q.x*60.+float(i));
    float body=max(abs(q.x)-rad,max(-q.y,q.y-top));
    // chorreadas: lenguas de cera que bajan por el costado
    float drip=1e3;
    for(int k=0;k<4;k++){
      float fk=float(k);
      float dx=(h21(vec2(float(i),fk))-0.5)*rad*2.2;
      float len=hgt*(0.2+0.7*h21(vec2(fk,float(i)+3.)));
      drip=min(drip,length(vec2((q.x-dx)*1.6,max(q.y-hgt,0.)+max(hgt-len-q.y,0.)))-0.012*(1.+h21(vec2(fk,9.))));
    }
    float pool=length((q-vec2(0.,0.0))/vec2(rad*2.2,0.025))-1.;
    float cd=min(min(body,drip),pool*0.02);
    cd=smin(body,min(drip,pool*0.02),0.01);
    if(cd<0.){
      r.a=1.;
      float x=clamp(q.x/rad,-1.,1.);
      vec3 wax=mix(vec3(0.55,0.50,0.42),vec3(0.75,0.70,0.60),h21(vec2(float(i),5.)));
      wax*=0.8+0.2*fbm(q*vec2(40.,80.),3);
      r.alb=wax; r.wax=1.;
      r.h=sqrt(max(1.-x*x,0.))*0.6+0.1*smoothstep(-0.01,0.,-drip);
      // crater de la mecha arriba
      if(q.y>top-0.02&&abs(q.x)<rad*0.8){ r.h-=0.2; r.alb*=0.8; }
      if(abs(q.x)<0.004&&q.y>top-0.01&&q.y<top+0.025){ r.alb=vec3(0.02); r.wax=0.; }
    }
  }
  // candelabro de hierro para las dos velas altas
  for(int s=0;s<2;s++){
    float sg=s==0?-1.:1.;
    vec2 q=p-vec2(sg*0.965,ALTAR_Y);
    float stem=rbox(q-vec2(0.,0.25),vec2(0.012,0.25),0.006);
    float base=rbox(q-vec2(0.,0.02),vec2(0.07,0.02),0.01);
    float cup=rbox(q-vec2(sg*0.015,0.53),vec2(0.05,0.012),0.006);
    float knob=length(q-vec2(0.,0.30))-0.025;
    float d=min(min(stem,base),min(cup,knob));
    if(d<0.){ r.a=1.; r.wax=0.; r.alb=vec3(0.06,0.055,0.05)*(0.6+0.6*fbm(q*40.,3)); r.h=0.5; }
  }
  // calavera en el centro
  {
    vec2 q=p-vec2(0.0,ALTAR_Y+0.13);
    float cran=length(q/vec2(0.15,0.14))-1.; cran*=0.14;
    float jaw=rbox(q-vec2(0.,-0.12),vec2(0.085,0.05),0.03);
    float sk=smin(cran,jaw,0.03);
    float eyes=min(length((q-vec2(-0.055,-0.01))/vec2(1.,1.2))-0.04,length((q-vec2(0.055,-0.01))/vec2(1.,1.2))-0.04);
    float nose=max(abs(q.x)*1.6+(q.y+0.06)*0.9-0.03,-(q.y+0.09));
    float teeth=step(abs(q.y+0.13),0.018)*step(abs(q.x),0.07)*step(0.25,fract(q.x*45.));
    if(sk<0.){
      r.a=1.; r.wax=0.;
      float sh=sqrt(clamp(-sk/0.10,0.,1.));
      r.alb=vec3(0.55,0.50,0.40)*(0.7+0.4*fbm(q*30.,4));
      r.h=sh*0.8;
      if(eyes<0.||nose<0.){ r.alb=vec3(0.01); r.h=-0.3; }
      if(teeth>0.5&&q.y<-0.115){ r.alb=vec3(0.62,0.58,0.48); }
      float crack=1.-smoothstep(0.,0.004,abs(q.x-0.04-0.03*sin(q.y*30.))-0.0015);
      r.alb*=1.-crack*step(0.02,q.y)*0.7;
    }
  }
  // libros apilados a la izquierda y derecha
  for(int b=0;b<5;b++){
    float fb=float(b);
    float sx=fb<3.?-0.30:0.28;
    float k=fb<3.?fb:fb-3.;
    vec2 q=p-vec2(sx+0.02*sin(fb*3.),ALTAR_Y+0.025+k*0.05);
    q=rot(0.04*(h21(vec2(fb,1.))-0.5))*q;
    float bk=rbox(q,vec2(0.12-k*0.012,0.022),0.006);
    if(bk<0.){
      r.a=1.; r.wax=0.;
      vec3 cov=mix(vec3(0.20,0.06,0.05),vec3(0.07,0.10,0.06),step(0.5,h21(vec2(fb,4.))));
      bool pages=abs(q.y)<0.012&&q.x>0.08-k*0.012;
      r.alb=pages?vec3(0.45,0.40,0.30)*(0.8+0.2*sin(q.y*900.)):cov*(0.6+0.5*fbm(q*40.,3));
      r.h=0.4;
    }
  }
  return r;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  float e=0.0025;
  if(plate<=1){
    W w=wall(p);
    if(plate==0){ fc=vec4(pow(clamp(w.alb*2.,0.,1.),vec3(1./2.2)), 1.); return; }
    float hx=wall(p+vec2(e,0.)).h-wall(p-vec2(e,0.)).h;
    float hy=wall(p+vec2(0.,e)).h-wall(p-vec2(0.,e)).h;
    vec3 n=normalize(vec3(-hx/(2.*e)*0.02,-hy/(2.*e)*0.02,1.));
    fc=vec4(n.xy*0.5+0.5, w.glass, 1.); return;
  }
  A a=altar(p);
  if(plate==2){ fc=vec4(pow(clamp(a.alb*2.,0.,1.),vec3(1./2.2)), a.a); return; }
  float hx=altar(p+vec2(e,0.)).h-altar(p-vec2(e,0.)).h;
  float hy=altar(p+vec2(0.,e)).h-altar(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx/(2.*e)*0.02,-hy/(2.*e)*0.02,1.));
  fc=vec4(n.xy*0.5+0.5, a.wax, a.a);
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
