"""Hornea las laminas de la escena 02 de Halloween (callejon de neon).

Pared de ladrillo mojado (color y relieve por separado, para que la luz
de cada cartel de neon la ilumine en vivo), con canerias, caja
electrica, cables, carteles rotos, oxido y chorreado; y el piso de
asfalto mojado. Ver docs/53.

uso: python3 td/tools/bake_plates_neon.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene02')
SS = 2

PLATES = [
    ('1_muro_color', 0, (-3.1, -0.62, 3.1, 1.25), 1280, 386),
    ('2_muro_relieve', 1, (-3.1, -0.62, 3.1, 1.25), 1280, 386),
    ('3_piso', 2, (-3.1, -1.25, 3.1, -0.50), 1280, 300),
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
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }

// Devuelve: albedo (rgb), altura (h), mojado (w), id de material
struct S { vec3 alb; float h; float wet; };

S wallAt(vec2 p){
  S s;
  // ladrillos (soga): 0.24 x 0.08
  vec2 bq = vec2(p.x/0.24 + 0.5*mod(floor(p.y/0.08),2.), p.y/0.08);
  vec2 id = floor(bq); vec2 f = fract(bq);
  vec2 e = min(f, 1.-f)*vec2(0.24,0.08);
  float edge = min(e.x, e.y);
  float mortarW = 0.006;
  float brick = smoothstep(mortarW, mortarW+0.006, edge);
  float bevel = smoothstep(mortarW, mortarW+0.018, edge);
  float hb = h21(id);
  vec3 bc = mix(vec3(0.32,0.13,0.09), vec3(0.45,0.22,0.14), hb);
  bc = mix(bc, vec3(0.22,0.20,0.19), step(0.86,hb));               // algun ladrillo gris
  bc *= 0.75+0.35*fbm(p*vec2(40.,60.)+id*3.,5);
  float chip = smoothstep(0.62,0.70,fbm(p*55.+id,4))*0.5;          // despostillado
  vec3 mortar = vec3(0.30,0.29,0.27)*(0.7+0.4*gn(p*200.));
  s.alb = mix(mortar, bc*(1.-chip*0.5), brick);
  s.h = brick*(0.6+0.4*bevel) - chip*0.25 + (fbm(p*120.+id,3)-0.5)*0.15;
  // mugre y humedad: mas abajo y en chorreados
  float grime = fbm(vec2(p.x*3.,p.y*1.2),5);
  float streak = smoothstep(0.55,0.85,fbm(vec2(p.x*22.,p.y*1.5+3.),5))*smoothstep(1.2,-0.2,p.y);
  s.alb *= 1.-0.45*smoothstep(0.4,0.8,grime)-0.35*streak;
  s.wet = clamp(smoothstep(0.3,-0.6,p.y)*0.8 + streak*0.6 + smoothstep(0.6,0.8,grime)*0.3, 0., 1.);
  // carteles viejos pegados y rotos
  for(int i=0;i<3;i++){
    vec2 c = i==0?vec2(-0.95,0.62): i==1?vec2(0.95,-0.12): vec2(2.55,0.55);
    vec2 hs = i==0?vec2(0.22,0.30): i==1?vec2(0.18,0.24): vec2(0.20,0.28);
    vec2 q=p-c;
    float torn = sdBox(q,hs) + (fbm(q*14.+float(i)*5.,5)-0.5)*0.10*step(0.,-q.y+hs.y*0.2);
    float m=smoothstep(0.002,-0.002,torn);
    vec3 pc = i==0?vec3(0.55,0.50,0.38): i==1?vec3(0.45,0.15,0.12): vec3(0.30,0.35,0.40);
    pc *= 0.6+0.5*fbm(q*30.,4);
    // franjas de texto desteñido
    pc *= 1.-0.35*step(0.5,fract(q.y*14.))*step(abs(q.x),hs.x*0.8)*step(q.y,hs.y*0.3);
    s.alb=mix(s.alb,pc,m*0.92); s.h=mix(s.h,0.75,m); s.wet=mix(s.wet,s.wet*0.5,m);
  }
  // canerias: una horizontal arriba y una bajada
  float pipeH = abs(p.y-1.02)-0.035;
  float pipeV = max(abs(p.x+2.05)-0.035, p.y-1.02);
  float pd = min(pipeH, pipeV);
  if(pd<0.){
    float k = pd==pipeH ? (p.y-1.02)/0.035 : (p.x+2.05)/0.035;
    float cyl = sqrt(max(1.-k*k,0.));
    vec3 metal = vec3(0.20,0.20,0.21)*(0.6+0.5*fbm(p*90.,4));
    float rust = smoothstep(0.5,0.75,fbm(p*25.,5));
    metal = mix(metal, vec3(0.35,0.16,0.06), rust);
    // abrazaderas
    float clamp1 = step(abs(fract(p.x*1.2)-0.5),0.02)*step(pd,pipeH+1e-4);
    s.alb = metal*(1.+clamp1*0.4); s.h = 1.0+cyl*1.5; s.wet = 0.4+0.4*rust;
  }
  // oxido que chorrea debajo de la caneria
  float rustS = smoothstep(0.6,0.85,fbm(vec2(p.x*30.,p.y*2.),4))*smoothstep(0.98,0.55,p.y)*step(p.y,0.98)*step(-2.0,-p.x+0.0);
  s.alb = mix(s.alb, s.alb*vec3(1.2,0.75,0.5), rustS*0.6);
  // caja electrica con cables
  vec2 bq2=p-vec2(-2.05,0.28);
  float box=sdBox(bq2,vec2(0.16,0.20));
  if(box<0.){
    float bev=smoothstep(0.0,-0.02,box);
    vec3 grey=vec3(0.30,0.31,0.30)*(0.6+0.5*fbm(p*60.,4));
    grey=mix(grey,vec3(0.35,0.17,0.07),smoothstep(0.6,0.8,fbm(p*20.+4.,4)));
    float lbl=step(abs(bq2.x),0.07)*step(abs(bq2.y-0.08),0.04);
    grey=mix(grey,vec3(0.75,0.62,0.10),lbl*0.8);                      // etiqueta amarilla
    s.alb=grey; s.h=1.2+bev*0.6; s.wet=0.5;
  }
  float cable=1e3;
  cable=min(cable, sdSeg(p, vec2(-2.00,0.08), vec2(-1.2,-0.05)) - 0.008 + 0.0*p.x);
  cable=min(cable, abs(p.y-(0.08-0.10*sin((p.x+2.0)*1.9)))-0.006 + 10.*step(p.x,-2.0)+10.*step(-1.25,p.x));
  cable=min(cable, abs(p.y-(1.15-0.08*sin((p.x+3.1)*0.5)*sin((p.x+3.1)*0.5)))-0.007);
  if(cable<0.){ s.alb=vec3(0.03); s.h=1.1; s.wet=0.6; }
  // marco metalico del cartel central (soporte)
  float panel=sdBox(p-vec2(0.0,0.17),vec2(0.62,0.58));
  float rim=abs(panel)-0.012;
  if(panel<0.){ s.alb*=0.45; s.h=0.9; }
  if(rim<0.){ s.alb=vec3(0.12,0.12,0.13)*(0.7+0.4*gn(p*300.)); s.h=1.3; s.wet=0.5; }
  // tornillos del panel
  vec2 sq=abs(p-vec2(0.0,0.17))-vec2(0.58,0.54);
  if(length(sq)<0.012){ s.alb=vec3(0.35); s.h=1.5; }
  // tapa de la rejilla de vapor (abajo a la izquierda)
  vec2 vq=p-vec2(-0.95,-0.40);
  float vent=sdBox(vq,vec2(0.17,0.09));
  if(vent<0.){ float sl=step(0.5,fract(vq.y*28.)); s.alb=vec3(0.08)*(0.6+0.6*sl); s.h=0.6+0.5*sl; s.wet=0.7; }
  // zocalo de cemento abajo
  if(p.y<-0.50){ s.alb=vec3(0.22,0.22,0.21)*(0.6+0.5*fbm(p*50.,5)); s.h=0.8; s.wet=0.9; }
  return s;
}

vec4 floorAt(vec2 p){
  float back=-0.55;
  if(p.y>back) return vec4(0.);
  float z=1.0/((back-p.y)+0.10);
  vec2 g=vec2(p.x*z*0.5, z*0.35);
  float n=fbm(g*vec2(12.,10.),6);
  float grit=gn(g*vec2(160.,140.));
  vec3 asph=vec3(0.07,0.07,0.075)*(0.6+0.7*n)*(0.8+0.4*grit);
  // grietas y una linea pintada gastada
  float crack=smoothstep(0.988,0.998,1.-abs(fbm(g*vec2(3.,2.)+5.,5)*2.-1.));
  asph*=1.-crack*0.6;
  float paint=step(abs(p.x*z*0.5-0.9),0.06)*step(0.4,fbm(g*vec2(20.,4.),4));
  asph=mix(asph,vec3(0.45,0.40,0.18),paint*0.5);
  // cordon de la vereda
  float curb=smoothstep(0.0,0.004,back-p.y)*(1.-smoothstep(0.035,0.04,back-p.y));
  asph=mix(asph,vec3(0.25,0.25,0.24)*(0.7+0.4*gn(p*200.)),curb);
  asph*=mix(1.0,0.6,smoothstep(-0.6,-1.25,p.y));
  return vec4(asph,1.);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==2){ vec4 f=floorAt(p); fc=vec4(pow(clamp(f.rgb,0.,1.),vec3(1./2.2)),f.a); return; }
  S s = wallAt(p);
  if(plate==0){ fc=vec4(pow(clamp(s.alb,0.,1.),vec3(1./2.2)),1.); return; }
  // relieve: normal de la altura (diferencias finitas), B mojado
  float e=0.0025;
  float hx=wallAt(p+vec2(e,0.)).h - wallAt(p-vec2(e,0.)).h;
  float hy=wallAt(p+vec2(0.,e)).h - wallAt(p-vec2(0.,e)).h;
  vec3 n=normalize(vec3(-hx*3.0,-hy*3.0,1.));
  fc=vec4(n.xy*0.5+0.5, s.wet, 1.);
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
        img = img.reshape(h, SS, w, SS, 4).mean((1, 3))
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h), r)
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '4_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
