"""Hornea las laminas de la escena 06 de Halloween (VHS en la tele vieja).

Un living abandonado (empapelado con damasco descascarado, zocalo de
madera, persiana con luz de luna, sillon, lampara, piso) y una tele de
tubo con mueble de madera, perillas, parlante, antena y videocasetera.
La pantalla queda transparente: ahi va la imagen en vivo. Ver docs/53.

uso: python3 td/tools/bake_plates_tele.py
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene06')
SS = 2
PLATES = [
    ('1_cuarto', 0, (-3.1, -1.2, 3.1, 1.2), 1280, 496),
    ('2_tele', 1, (-0.95, -1.0, 0.95, 0.95), 1000, 1026),
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
float sdRBox(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b+r; return length(max(d,0.))+min(max(d.x,d.y),0.)-r; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

const float FLOOR_Y=-0.72;

vec4 room(vec2 p){
  vec3 c;
  if(p.y<FLOOR_Y){
    float z=1.0/((FLOOR_Y-p.y)+0.10);
    float u=p.x*z*0.5;
    float id=floor(u*3.); float fu=fract(u*3.);
    float seam=smoothstep(0.,0.03,fu)*smoothstep(1.,0.97,fu);
    vec3 wood=mix(vec3(0.16,0.09,0.05),vec3(0.26,0.15,0.08),fbm(vec2(u*20.+id*5.,z*0.6),6));
    wood*=0.7+0.4*h21(vec2(id,1.));
    c=wood*seam+vec3(0.02,0.01,0.005)*(1.-seam);
    // alfombra raida
    float rug=sdRBox(vec2(p.x*z*0.4,(z-2.0)*0.4),vec2(0.55,0.35),0.05);
    if(rug<0.){ c=mix(vec3(0.20,0.06,0.05),vec3(0.30,0.20,0.10),step(0.5,fract((p.x*z*0.4)*8.)))*(0.6+0.4*fbm(p*vec2(20.,60.),4)); }
    c*=mix(1.,0.4,smoothstep(-0.75,-1.2,p.y));
    return vec4(c,1.);
  }
  // empapelado con damasco
  // damasco: reticula en diagonal con medallon y volutas
  vec2 g=rot(0.785)*p*4.2;
  vec2 f=abs(fract(g)-0.5);
  float med=length(f*vec2(1.0,2.2))-0.10;
  float ring=abs(length(f-vec2(0.5,0.0))-0.22)-0.012;
  float leaf=abs(length(f-vec2(0.25,0.25))-0.10)-0.010;
  float dam=min(min(med,ring),leaf);
  float pat=smoothstep(0.012,-0.012,dam);
  vec3 paper=mix(vec3(0.26,0.22,0.15),vec3(0.31,0.27,0.18),pat);
  paper*=0.8+0.3*fbm(p*12.,5);
  // manchas de humedad y papel despegado
  float damp=smoothstep(0.45,0.8,fbm(vec2(p.x*1.5,p.y*2.),6));
  paper*=1.-0.45*damp;
  float peel=smoothstep(0.62,0.66,fbm(p*vec2(2.5,3.5)+4.,6));
  vec3 plaster=vec3(0.30,0.28,0.24)*(0.7+0.5*fbm(p*30.,4));
  c=mix(paper,plaster,peel);
  c*=1.-0.6*smoothstep(0.64,0.67,fbm(p*vec2(2.5,3.5)+4.,6))*(1.-smoothstep(0.67,0.72,fbm(p*vec2(2.5,3.5)+4.,6)));  // borde del papel
  // zocalo de madera
  if(p.y<FLOOR_Y+0.30){
    float pan=fract(p.x*1.6);
    c=vec3(0.14,0.08,0.045)*(0.7+0.4*fbm(vec2(p.x*30.,p.y*4.),5))*(0.8+0.3*smoothstep(0.,0.05,pan)*smoothstep(1.,0.95,pan));
    if(abs(p.y-(FLOOR_Y+0.30))<0.012) c=vec3(0.22,0.13,0.07);
  }
  // persiana a la izquierda con luz de luna entre las tablillas
  vec2 wq=p-vec2(-2.05,0.25);
  float wbox=sdBox(wq,vec2(0.42,0.55));
  if(wbox<0.){
    float slat=fract(wq.y*16.);
    float gap=smoothstep(0.75,0.82,slat)*smoothstep(1.0,0.92,slat);
    vec3 night=vec3(0.15,0.18,0.30)*(0.8+0.2*sin(wq.x*3.));
    c=mix(vec3(0.20,0.19,0.17)*(0.6+0.5*smoothstep(0.,0.6,slat)), night, gap);
  }
  if(abs(wbox)<0.03) c=vec3(0.18,0.12,0.07);
  // franjas de luz de luna en la pared (de la persiana)
  vec2 lq=p-vec2(-1.2,0.0); lq=rot(0.25)*lq;
  float stripes=step(0.55,fract(lq.y*7.))*smoothstep(0.9,0.0,abs(lq.x+0.2))*smoothstep(-0.7,0.3,lq.y)*step(wbox,0.)*0.0;
  float beam=step(0.6,fract((p.y-p.x*0.35)*9.))*exp(-pow((p.x+1.25)/0.45,2.))*smoothstep(FLOOR_Y,0.4,p.y)*step(0.0,wbox);
  c+=vec3(0.10,0.12,0.20)*beam;
  // lampara de pie apagada a la derecha
  float lpole=max(abs(p.x-1.95)-0.012, max(FLOOR_Y-p.y, p.y-0.45));
  vec2 sh=p-vec2(1.95,0.58);
  float shade=max(abs(sh.x)-(0.16+sh.y*(-0.35)), abs(sh.y)-0.13);
  float lb=min(lpole,shade);
  if(lb<0.) c=lb==shade? vec3(0.30,0.24,0.16)*(0.6+0.5*fbm(sh*30.,4)) : vec3(0.08);
  // sillon a la derecha
  vec2 aq=p-vec2(1.25,-0.45);
  float back=sdRBox(aq-vec2(0.,0.10),vec2(0.34,0.36),0.10);
  float arms=min(sdRBox(aq-vec2(-0.36,-0.12),vec2(0.08,0.18),0.06), sdRBox(aq-vec2(0.36,-0.12),vec2(0.08,0.18),0.06));
  float seat=sdRBox(aq-vec2(0.,-0.18),vec2(0.32,0.10),0.04);
  float legs=min(sdBox(aq-vec2(-0.32,-0.30),vec2(0.02,0.04)),sdBox(aq-vec2(0.32,-0.30),vec2(0.02,0.04)));
  float chair=min(min(back,arms),min(seat,legs));
  if(chair<0.){
    vec3 fab=vec3(0.22,0.07,0.06)*(0.6+0.6*fbm(aq*vec2(40.,40.),5));
    float tuft=smoothstep(0.02,0.0,length(fract(aq*6.)-0.5)-0.03)*step(back,0.)*step(-0.02,aq.y);
    fab*=1.-tuft*0.5;
    fab*=0.6+0.5*smoothstep(-0.3,0.4,aq.x*-1.)+0.0;
    c=fab;
  }
  c*=mix(0.55,1.0,smoothstep(1.2,0.1,abs(p.y-0.0)));
  return vec4(c,1.);
}

vec4 tele(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  // mesita
  float tb=sdBox(p-vec2(0.,-0.62),vec2(0.66,0.035));
  float legs=min(sdBox(p-vec2(-0.58,-0.82),vec2(0.025,0.17)),sdBox(p-vec2(0.58,-0.82),vec2(0.025,0.17)));
  float shelf=sdBox(p-vec2(0.,-0.86),vec2(0.60,0.02));
  float table=min(min(tb,legs),shelf);
  if(table<0.){ c=vec3(0.16,0.09,0.05)*(0.6+0.5*fbm(vec2(p.x*30.,p.y*6.),5)); a=1.; }
  // videocasetera sobre la mesita
  float vcr=sdRBox(p-vec2(0.,-0.53),vec2(0.42,0.055),0.01);
  if(vcr<0.){
    c=vec3(0.06,0.06,0.065)*(0.8+0.3*gn(p*300.));
    float slot=sdBox(p-vec2(-0.12,-0.52),vec2(0.17,0.012));
    if(slot<0.) c=vec3(0.015);
    float disp=sdBox(p-vec2(0.25,-0.52),vec2(0.09,0.022));
    if(disp<0.) c=vec3(0.01,0.02,0.015);
    for(int i=0;i<4;i++){ if(length(p-vec2(-0.34+float(i)*0.05,-0.565))<0.01) c=vec3(0.25); }
    a=1.;
  }
  // mueble de madera de la tele
  vec2 q=p-vec2(0.,0.02);
  float cab=sdRBox(q,vec2(0.66,0.47),0.06);
  if(cab<0.){
    float grain=fbm(vec2(q.x*4.,q.y*40.),6);
    vec3 wood=mix(vec3(0.18,0.09,0.04),vec3(0.30,0.16,0.07),grain);
    // biselado y brillo del barniz
    float bev=smoothstep(-0.04,0.0,cab);
    wood*=0.75+0.4*bev*smoothstep(-0.2,0.5,q.y);
    wood+=vec3(0.10,0.07,0.05)*pow(smoothstep(0.3,0.47,q.y)*smoothstep(-0.01,0.,cab+0.03),2.)*0.0;
    c=wood; a=1.;
    // marco de la pantalla (plastico negro) y pantalla transparente
    vec2 sq=q-vec2(-0.12,0.02);
    float frame=sdRBox(sq,vec2(0.47,0.37),0.08);
    float scr=sdRBox(sq*vec2(1.0+0.0,1.0),vec2(0.42,0.32),0.07);
    if(frame<0.){ c=vec3(0.04,0.04,0.045)*(0.8+0.4*smoothstep(-0.05,0.,frame)); }
    if(scr<0.){ c=vec3(0.); a=0.; }
    // panel de la derecha: perillas y parlante
    vec2 kq=q-vec2(0.50,0.0);
    float panel=sdRBox(kq,vec2(0.10,0.40),0.02);
    if(panel<0.){
      c=vec3(0.09,0.085,0.08)*(0.8+0.3*gn(kq*200.));
      for(int i=0;i<2;i++){
        vec2 kc=kq-vec2(0.,0.26-float(i)*0.16);
        float knob=length(kc)-0.045;
        if(knob<0.){ float ang=atan(kc.y,kc.x); c=vec3(0.18,0.17,0.16)*(0.6+0.4*step(0.5,fract(ang*6.))); c+=vec3(0.2)*smoothstep(0.045,0.0,length(kc-vec2(-0.015,0.015))); }
      }
      // rejilla del parlante
      if(kq.y<-0.04 && kq.y>-0.36 && abs(kq.x)<0.075){ c=vec3(0.03)*(1.+step(0.5,fract(kq.y*55.))*1.5); }
    }
  }
  // antena de conejo
  float ant=min(sdSeg(p,vec2(0.0,0.50),vec2(-0.32,0.92)), sdSeg(p,vec2(0.0,0.50),vec2(0.30,0.88)))-0.006;
  float base=length((p-vec2(0.,0.51))*vec2(1.,2.))-0.07;
  if(min(ant,base)<0.){ c=min(ant,base)==ant? vec3(0.45,0.45,0.48): vec3(0.07); a=1.; }
  for(int s=-1;s<=1;s+=2){ vec2 tip=s<0?vec2(-0.32,0.92):vec2(0.30,0.88); if(length(p-tip)<0.012){ c=vec3(0.5); a=1.; } }
  return vec4(c,a);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  vec4 c = plate==0 ? room(p) : tele(p);
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
        a = img[..., 3:4]
        pm = np.concatenate([img[..., :3] * a, a], -1).reshape(h, SS, w, SS, 4).mean((1, 3))
        rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
        img = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h), r)
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
