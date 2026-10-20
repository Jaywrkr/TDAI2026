"""Hornea las laminas de la escena 19 de Halloween (glitch demoniaco).

El rostro de un demonio de frente: craneo alargado, cuernos retorcidos
con anillos, arco de la ceja marcado, pomulos, nariz chata, cuencas
hondas, boca abierta con colmillos, arrugas y venas en la piel (color +
relieve; los ojos van en el canal B para que el shader los haga arder).
Ver docs/53.

uso: python3 td/tools/bake_plates_demonio.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene19')
SS = 2
PLATES = [
    ('1_demonio_color', 0, (-1.3, -1.1, 1.3, 1.25), 768, 694),
    ('2_demonio_relieve', 1, (-1.3, -1.1, 1.3, 1.25), 768, 694),
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
float g2(vec2 p, vec2 c, vec2 r){ vec2 d=(p-c)/r; return exp(-dot(d,d)); }

struct F { float h; float a; vec3 alb; float eye; };
F face(vec2 p){
  F f; f.h=0.; f.a=0.; f.alb=vec3(0.); f.eye=0.;
  vec2 q=vec2(abs(p.x),p.y);
  // contorno: frente ancha, pomulos marcados, menton en punta
  float yy=p.y;
  float w=0.50+0.10*exp(-pow((yy-0.05)/0.25,2.))-0.32*smoothstep(-0.15,-0.95,yy)+0.04*smoothstep(0.4,0.9,yy);
  w*=sqrt(max(1.-pow(max(yy-0.55,0.)/0.5,2.),0.));
  w*=pow(max(1.-pow(max(-0.30-yy,0.)/0.72,2.),0.),0.45);     // menton en punta
  float inHead=step(abs(p.x),w)*step(-0.98,yy)*step(yy,1.05);
  // cuernos: curva que sale de la frente hacia afuera y arriba, se afina
  float horn=0.; float hornH=0.;
  {
    vec2 A=vec2(0.26,0.72), C=vec2(0.85,0.70), Bp=vec2(0.92,1.18);
    float best=1e3, bt=0.;
    for(int i=0;i<=24;i++){
      float tt=float(i)/24.;
      vec2 b=mix(mix(A,C,tt),mix(C,Bp,tt),tt);
      float d=length(q-b);
      if(d<best){best=d; bt=tt;}
    }
    float thick=0.13*(1.-bt*0.9);
    if(best<thick&&q.y>0.55){ horn=1.; float x=1.-best/thick; hornH=0.7*sqrt(x)+0.04*sin(bt*55.)*x; f.eye=0.; }
    hornH+=0.0;
    if(horn>0.5) f.h=bt;
  }
  if(inHead<0.5&&horn<0.5) return f;
  f.a=1.;
  if(horn>0.5&&(inHead<0.5||q.y>0.80)){
    float bt=f.h; f.h=hornH;
    float ring=0.5+0.5*sin(bt*55.);
    f.alb=mix(vec3(0.10,0.08,0.06),vec3(0.30,0.26,0.20),ring*0.6)*(0.7+0.4*fbm(p*30.,3))*mix(1.,1.6,bt);
    return f;
  }
  float ex=abs(p.x)/max(w,1e-3);
  float dome=sqrt(max(1.-ex*ex,0.))*0.6;
  float h=dome;
  // ceja en V, pomulos, nariz, menton
  h+=0.18*g2(q,vec2(0.20,0.28-q.x*0.25),vec2(0.20,0.06));
  h+=0.12*g2(q,vec2(0.30,-0.10),vec2(0.13,0.10));
  h+=0.16*g2(p,vec2(0.,0.02),vec2(0.07,0.20))-0.08*g2(q,vec2(0.05,-0.12),vec2(0.03,0.03));
  h+=0.10*g2(p,vec2(0.,-0.72),vec2(0.14,0.10));
  h-=0.06*g2(p,vec2(0.,0.30),vec2(0.04,0.10));     // entrecejo fruncido
  // cuencas hondas
  float sock=g2(q,vec2(0.20,0.13),vec2(0.14,0.08));
  h-=0.30*sock;
  vec2 eq=q-vec2(0.20,0.12); eq=vec2(eq.x,eq.y+eq.x*0.45);
  float eye=exp(-dot(eq/vec2(0.085,0.028),eq/vec2(0.085,0.028)));
  // boca abierta con colmillos
  vec2 m=p-vec2(0.,-0.38);
  float mo=length(m/vec2(0.26,0.09))-1.;
  float fang=max(abs(abs(m.x)-0.13)*4.+(m.y+0.02)*1.6-0.10,-(m.y+0.10));
  float tooth=step(abs(m.y-0.04),0.025)*step(abs(m.x),0.2)*step(0.3,fract(m.x*22.));
  // arrugas en la frente y alrededor de la boca, venas
  float wr=fbm(vec2(p.x*4.,p.y*18.),4);
  h+=0.03*(wr-0.5)*smoothstep(0.25,0.6,p.y);
  float vein=(1.-smoothstep(0.,0.008,abs(fbm(p*vec2(3.,5.)+3.,4)-0.5)-0.002))*smoothstep(0.55,0.75,fbm(p*2.+9.,3));
  h+=vein*0.02;
  float skinN=fbm(p*vec2(40.,40.),4);
  h+=skinN*0.02;
  vec3 skin=mix(vec3(0.16,0.02,0.02),vec3(0.34,0.06,0.04),dome*1.3);
  skin*=0.75+0.4*skinN;
  skin=mix(skin,vec3(0.08,0.01,0.01),sock*0.8);
  skin=mix(skin,vec3(0.10,0.0,0.0),vein*0.5);
  f.alb=skin; f.h=h;
  if(mo<0.){ f.alb=vec3(0.02,0.0,0.0); f.h-=0.25*smoothstep(0.,-0.5,mo); }
  if(mo<0.&&(fang<0.||tooth>0.5)){ f.alb=vec3(0.55,0.48,0.32)*(0.7+0.4*skinN); f.h+=0.25; }
  if(eye>0.4){ f.alb=vec3(0.03,0.0,0.0); f.eye=smoothstep(0.4,0.9,eye); }
  return f;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  F f=face(p);
  if(plate==0){ fc=vec4(pow(clamp(f.alb*2.,0.,1.),vec3(1./2.2)), f.a); return; }
  float e=0.003;
  float hx=face(p+vec2(e,0.)).h-face(p-vec2(e,0.)).h;
  float hy=face(p+vec2(0.,e)).h-face(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx/(2.*e)*0.35,-hy/(2.*e)*0.35,1.));
  fc=vec4(n.xy*0.5+0.5, f.eye, f.a);
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
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '3_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
