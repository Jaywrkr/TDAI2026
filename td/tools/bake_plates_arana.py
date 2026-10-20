"""Hornea las laminas de la escena 08 de Halloween (arana en su tela).

Un plano macro en un desvan de noche: el fondo desenfocado (vigas,
ventanal con luna, circulos de luz de una lampara lejana) y, nitidas,
la viga de arriba y el poste de la izquierda donde se ata la tela, con
veta, clavos y telaranas viejas con polvo. Ver docs/53.

uso: python3 td/tools/bake_plates_arana.py
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene08')
SS = 2
R = (-3.1, -1.2, 3.1, 1.2)
W, H = 1280, 496
PLATES = [('1_fondo', 0), ('2_vigas', 1)]

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

vec3 background(vec2 p){
  // todo fuera de foco: formas suaves y circulos de luz
  vec3 c=mix(vec3(0.020,0.018,0.030),vec3(0.035,0.030,0.045),smoothstep(-1.2,1.2,p.y));
  // ventanal lejano con luz de luna (difuso)
  vec2 wq=p-vec2(1.55,0.35);
  float win=sdBox(wq,vec2(0.45,0.55));
  c+=vec3(0.20,0.25,0.45)*smoothstep(0.25,-0.15,win)*0.55;
  // cruz del ventanal, tambien difusa
  float cross=min(abs(wq.x),abs(wq.y-0.05));
  c*=1.-0.5*smoothstep(0.12,0.0,cross)*smoothstep(0.25,-0.15,win);
  // vigas lejanas en diagonal
  for(int i=0;i<3;i++){
    float fi=float(i);
    vec2 q=rot(0.35+fi*0.12)*(p-vec2(-1.5+fi*1.4,0.6-fi*0.2));
    c*=1.-0.45*smoothstep(0.22,0.0,abs(q.y))*smoothstep(1.6,0.6,abs(q.x));
  }
  // circulos de luz (bokeh): calidos de una lampara, frios de la ventana
  for(int i=0;i<26;i++){
    float fi=float(i);
    vec2 cc=(h22(vec2(fi,3.))-0.5)*vec2(6.0,2.2);
    float warm=step(cc.x,0.3);
    cc+=warm*vec2(-0.6,-0.2)*0.0;
    float r=0.05+0.12*h21(vec2(fi,4.));
    float d=length(p-cc);
    float disk=smoothstep(r,r*0.92,d);
    float ring=exp(-pow((d-r*0.92)/(r*0.06),2.))*0.6;
    vec3 bc=mix(vec3(0.35,0.42,0.75),vec3(1.0,0.62,0.28),warm)*(0.25+0.55*h21(vec2(fi,5.)));
    c+=bc*(disk*0.45+ring*disk)*0.35;
  }
  c*=0.8+0.3*fbm(p*1.2,3);
  return c;
}

vec4 beams(vec2 p){
  vec3 c=vec3(0.); float a=0.;
  // viga de arriba, levemente en diagonal
  float topY=0.86+0.04*p.x/3.0;
  float top=topY-p.y;
  // poste de la izquierda
  float post=p.x-(-2.35+0.02*p.y);
  float m1=smoothstep(0.003,-0.003,top);
  float m2=smoothstep(0.003,-0.003,post);
  if(m1>0.||m2>0.){
    bool isTop = m1>=m2;
    vec2 g = isTop? vec2(p.x*0.6, (p.y-topY)*8.) : vec2((p.y)*0.6, (p.x+2.35)*8.);
    float grain=fbm(vec2(g.x*3.,g.y*6.+fbm(g*vec2(2.,4.),4)*3.),6);
    float rings=0.5+0.5*sin(g.y*30.+fbm(g*2.,4)*10.);
    vec3 wood=mix(vec3(0.16,0.10,0.06),vec3(0.28,0.18,0.10),grain)*(0.8+0.25*rings);
    float crack=smoothstep(0.985,0.997,1.-abs(fbm(g*vec2(1.,6.),5)*2.-1.));
    wood*=1.-crack*0.7;
    // luz de luna desde la derecha y arriba: borde iluminado
    float edge = isTop? smoothstep(0.03,0.0,p.y-topY) : smoothstep(-0.03,0.0,p.x+2.35);
    wood*=0.45+0.4*(isTop? smoothstep(0.35,0.0,p.y-topY) : smoothstep(-0.4,0.,p.x+2.35));
    wood+=vec3(0.30,0.35,0.55)*edge*0.25;
    // clavos
    for(int i=0;i<4;i++){
      vec2 nc = i<2? vec2(-1.5+float(i)*2.2, topY+0.06) : vec2(-2.42, -0.4+float(i-2)*0.9);
      float nd=length(p-nc);
      if(nd<0.022){ wood=vec3(0.10,0.06,0.04)*(0.6+0.8*smoothstep(0.022,0.0,length(p-nc-vec2(-0.006,0.006)))); }
      wood=mix(wood,wood*vec3(0.8,0.55,0.4),smoothstep(0.06,0.02,nd)*0.5);
    }
    c=wood; a=max(m1,m2);
  }
  // telaranas viejas en la esquina: tela algodonosa con polvo
  vec2 cq=p-vec2(-2.35,0.86);
  float r=length(cq);
  if(cq.x>0. && cq.y<0. && r<0.75){
    float ang=atan(-cq.y,cq.x);
    float strands=pow(gn(vec2(ang*40.,r*3.)),6.)*smoothstep(0.75,0.1,r);
    float fluff=smoothstep(0.55,0.8,fbm(cq*vec2(18.,18.),5))*smoothstep(0.5,0.05,r)*smoothstep(0.0,0.08,min(cq.x,-cq.y));
    float web=max(strands*0.8,fluff*0.6);
    c=mix(c,vec3(0.30,0.30,0.32),web*(1.-a*0.5));
    a=max(a,web*0.85);
  }
  return vec4(c,a);
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  vec4 c = plate==0 ? vec4(background(p),1.) : beams(p);
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
        img = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
