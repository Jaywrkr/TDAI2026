"""Hornea las laminas de la escena 30 de Halloween (el carnaval abandonado).

Una feria vieja de noche: dos carpas rayadas y rotas (la grande a la
izquierda, otra a la derecha), el carrusel (techo de lona a gajos, la
columna central con espejos, la plataforma y su faldon), las patas de
celosia de la rueda de la fortuna, la boleteria con su cartel y un poste
con el cable suelto, la reja y el suelo con papeles y charcos. El cielo y
el hueco de la rueda quedan transparentes: la rueda gira en vivo detras
de sus patas.

La geometria sale del MISMO bloque GLSL que usa la escena (entre
"// >>> CARNAVAL_GEOM" y "// <<< CARNAVAL_GEOM" en scene30_carnaval.frag).

Laminas:
  1_feria   color (lineal x2, gamma 2.2), A = cobertura
  2_ruido   el ruido que se repite de la escena 00 (nubes, niebla, oxido)

uso: python3 td/tools/bake_plates_carnaval.py   (despues: build_atlas.py)
"""
import os
import re
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = os.path.join(os.path.dirname(HERE), 'sets', 'halloween')
SETS = os.path.join(SET, 'plates')
OUT = os.path.join(SETS, 'scene30')
FRAG = os.path.join(SET, 'visuals', 'scene30_carnaval.frag')
SS = 2
R = (-3.4, -1.25, 3.4, 1.25)
W, H = 1280, 470

VERT = """#version 330
in vec2 in_pos; out vec2 vUV;
void main(){ vUV = in_pos*0.5+0.5; gl_Position = vec4(in_pos,0,1); }
"""

BODY = r"""
in vec2 vUV; out vec4 fc;
uniform vec4 rect;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ vec3 a=fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a+=dot(a,a+34.45); return fract(vec2(a.x*a.y,a.y*a.z)); }
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(i)-.5,f), b=dot(h22(i+vec2(1,0))-.5,f-vec2(1,0));
  float c=dot(h22(i+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i+vec2(1,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fbm(vec2 p,int o){ float s=0.,a=.5,n=0.; for(int i=0;i<10;i++){ if(i>=o)break; s+=a*gn(p); n+=a; a*=.5; p=mat2(.8,-.6,.6,.8)*p*2.03+11.3; } return s/n; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }

// lona rayada y gastada (u = coordenada a lo ancho para las rayas)
vec3 canvas(vec2 p, float u, float stripes){
  float st=step(0.5,fract(u*stripes));
  vec3 c=mix(vec3(0.55,0.10,0.08),vec3(0.62,0.58,0.50),st);
  c*=0.65+0.45*fbm(p*vec2(8.,20.),5);
  c=mix(c,vec3(0.18,0.14,0.10),smoothstep(0.55,0.8,fbm(p*4.+3.,5))*0.6);   // mugre
  return c;
}
// celosia de hierro entre dos puntos (ancho w)
float lattice(vec2 p, vec2 a, vec2 b, float w){
  vec2 ba=b-a; float L=length(ba); vec2 dir=ba/L, n=vec2(-dir.y,dir.x);
  vec2 q=vec2(dot(p-a,dir),dot(p-a,n));
  if(q.x<0.||q.x>L||abs(q.y)>w) return 1e3;
  float rails=abs(abs(q.y)-w*0.85)-w*0.15;
  float k=fract(q.x/(w*2.))*2.-1.;
  float diag=abs(q.y-k*w*sign(fract(q.x/(w*4.))-0.5))-w*0.12;
  return min(rails,diag);
}

void main(){
  vec2 p=mix(rect.xy,rect.zw,vUV);
  vec3 c=vec3(0.); float a=0.;
  float gy=cvGround(p.x);
  // suelo: tierra, papeles y charcos
  if(p.y<gy){
    c=vec3(0.10,0.085,0.07)*(0.5+0.8*fbm(p*vec2(5.,16.),5));
    vec2 g=p*vec2(10.,24.); vec2 id=floor(g); vec2 f=fract(g)-0.5; vec2 hh=h22(id);
    if(hh.x>0.93&&abs(f.x)<0.25&&abs(f.y)<0.18) c=vec3(0.45,0.42,0.36)*(0.6+0.4*hh.y);   // papeles
    float pud=smoothstep(0.62,0.66,fbm(p*vec2(1.5,5.)+7.,4));
    c=mix(c,vec3(0.03,0.03,0.05),pud*0.85);
    c*=0.6+0.4*smoothstep(-1.25,gy,p.y);
    a=1.;
  }
  // patas de la rueda (celosia), del eje al suelo
  vec2 hub=CV_WHEEL.xy;
  for(int s=0;s<2;s++){
    float sg=s==0?-1.:1.;
    float d=lattice(p,hub,vec2(hub.x+sg*0.48,cvGround(hub.x+sg*0.48)),0.035);
    if(d<0.006){ c=vec3(0.16,0.15,0.16)*(0.6+0.5*fbm(p*30.,3)); a=1.; }
  }
  if(length(p-hub)<0.06){ c=vec3(0.2); a=1.; }
  // cabina de control al pie de la rueda
  if(abs(p.x-(hub.x+0.05))<0.14&&p.y<cvGround(p.x)+0.20&&p.y>cvGround(p.x)-0.01){
    c=vec3(0.20,0.22,0.24)*(0.7+0.4*fbm(p*20.,4)); a=1.;
    if(abs(p.x-(hub.x+0.05))<0.08&&abs(p.y-(cvGround(p.x)+0.12))<0.04) c=vec3(0.04,0.05,0.06);
  }
  // carpa grande (izquierda) y carpa chica (derecha)
  for(int k=0;k<2;k++){
    vec4 s1=CV_GARL[k*2], s2=CV_GARL[k*2+1];
    vec2 peak=s1.zw; float x0=s1.x, x1=s2.z, ey=s1.y;
    float ty=ey+(peak.y-ey)*(1.-abs(p.x-peak.x)/(peak.x-x0));
    if(p.x>x0&&p.x<x1&&p.y<ty&&p.y>ey-0.02){ c=canvas(p,(p.x-peak.x)/max(peak.y-p.y,0.05)*0.25,6.)*(0.75+0.25*smoothstep(ey,peak.y,p.y)); a=1.; }
    // paredes con flecos y un desgarro
    float wy=ey-0.02;
    if(p.x>x0+0.04&&p.x<x1-0.04&&p.y<wy&&p.y>cvGround(p.x)){
      c=canvas(p,p.x,9.)*0.7;
      float fringe=wy-0.035-0.02*abs(sin(p.x*60.));
      if(p.y>fringe) c=vec3(0.62,0.50,0.20)*(0.6+0.4*fbm(p*40.,3));
      // entrada oscura
      if(abs(p.x-peak.x)<0.14&&p.y<wy-0.12) c=vec3(0.02,0.015,0.02);
      // desgarro
      vec2 tq=p-vec2(peak.x+(k==0?0.30:-0.22),wy-0.22);
      if(length(tq*vec2(2.,1.))<0.07+0.03*gn(tq*40.)) c=vec3(0.03);
      a=1.;
    }
    // mastil
    if(abs(p.x-peak.x)<0.01&&p.y>peak.y-0.01&&p.y<peak.y+0.12){ c=vec3(0.2); a=1.; }
  }
  // carrusel
  vec2 cc=CV_CAROUSEL.xy; float RX=CV_CAROUSEL.z, RY=CV_CAROUSEL.w;
  {
    // interior en sombra y columna central con espejos
    vec2 q=(p-cc)/vec2(RX,1.);
    if(abs(q.x)<0.98&&p.y<cc.y&&p.y>CV_CPLAT){
      c=vec3(0.035,0.03,0.035)*(0.7+0.4*fbm(p*10.,3)); a=1.;
      if(abs(p.x-cc.x)<0.10){
        c=vec3(0.30,0.24,0.14)*(0.6+0.4*step(0.5,fract((p.x-cc.x)*30.)));
        if(abs(p.x-cc.x)<0.07&&fract((p.y-CV_CPLAT)*4.)>0.15) c=vec3(0.18,0.20,0.24)*(0.7+0.5*fbm(p*50.,3));   // espejos
      }
    }
    // techo de lona a gajos
    float apexY=cc.y+0.50;
    float yt=cc.y+ (apexY-cc.y)*(1.-abs(p.x-cc.x)/RX);
    float rimY=cc.y-RY*sqrt(max(1.-pow((p.x-cc.x)/RX,2.),0.));
    if(abs(p.x-cc.x)<RX&&p.y<yt&&p.y>rimY){
      float u=atan(p.x-cc.x,(apexY-p.y))*3.;
      c=canvas(p,u,2.5)*(0.7+0.3*smoothstep(cc.y,apexY,p.y)); a=1.;
    }
    // faldon festoneado del techo
    float sk=rimY-0.05-0.025*abs(sin((p.x-cc.x)*18.));
    if(abs(p.x-cc.x)<RX&&p.y<rimY+0.01&&p.y>sk){ c=vec3(0.55,0.45,0.18)*(0.6+0.4*fbm(p*30.,3)); a=1.; }
    // bandera en la punta
    if(abs(p.x-cc.x)<0.008&&p.y>apexY&&p.y<apexY+0.12){ c=vec3(0.2); a=1.; }
    vec2 fq=p-vec2(cc.x+0.008,apexY+0.08);
    if(fq.x>0.&&fq.x<0.10&&abs(fq.y+fq.x*0.1)<0.03-fq.x*0.2){ c=vec3(0.5,0.08,0.06)*(0.7+0.3*gn(fq*60.)); a=1.; }
    // plataforma y faldon
    float py=(p.y-CV_CPLAT)/RY;
    float pe=pow((p.x-cc.x)/(RX*1.03),2.)+py*py;
    if(pe<1.&&p.y>CV_CPLAT-0.002){ c=vec3(0.22,0.16,0.10)*(0.6+0.4*step(0.5,fract((p.x-cc.x)*12.)))*(0.7+0.3*fbm(p*20.,3)); a=1.; }
    if(abs(p.x-cc.x)<RX*1.03&&p.y<CV_CPLAT-RY*sqrt(max(1.-pow((p.x-cc.x)/(RX*1.03),2.),0.))+0.002&&p.y>cvGround(p.x)-0.01){
      c=vec3(0.40,0.30,0.12)*(0.55+0.45*step(0.5,fract((p.x-cc.x)*7.)))*(0.6+0.4*fbm(p*25.,3)); a=1.;
    }
  }
  // boleteria y el poste del cable suelto
  vec2 bq=p-vec2(0.36,cvGround(0.36));
  if(abs(bq.x)<0.16&&bq.y>0.&&bq.y<0.36){
    c=vec3(0.35,0.12,0.10)*(0.6+0.4*step(0.5,fract(bq.x*14.)))*(0.6+0.5*fbm(p*20.,4)); a=1.;
    if(abs(bq.x)<0.11&&abs(bq.y-0.22)<0.06) c=vec3(0.04,0.04,0.05);          // ventanilla
  }
  if(abs(bq.x)<0.20&&bq.y>0.36&&bq.y<0.42){ c=vec3(0.55,0.50,0.30)*(0.6+0.4*fbm(p*30.,3)); a=1.;   // cartel
    vec2 lq=fract(bq*vec2(30.,1.))-0.5; if(abs(bq.y-0.39)<0.012&&abs(lq.x)<0.25&&abs(bq.x)<0.15) c=vec3(0.15,0.05,0.04); }
  if(abs(p.x-0.42)<0.007&&p.y>bq.y*0.+0.42+cvGround(0.36)&&p.y<0.30){ c=vec3(0.12); a=1.; }
  float cable=sdSeg(p,vec2(0.42,0.28),vec2(0.43,0.10+0.0))-0.004;
  if(cable<0.){ c=vec3(0.02); a=1.; }
  // reja abajo
  if(p.y<-0.88&&p.y>-1.10){
    float bx=fract(p.x*7.)-0.5;
    if(abs(bx)<0.035||abs(p.y+0.93)<0.006||abs(p.y+1.05)<0.006){ c=vec3(0.03,0.03,0.035); a=1.; }
  }
  fc=vec4(pow(clamp(c*2.,0.,1.),vec3(1./2.2)),a);
}
"""


def geom_block():
    with open(FRAG, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'// >>> CARNAVAL_GEOM.*?\n(.*?)// <<< CARNAVAL_GEOM', src, re.S)
    if not m:
        raise SystemExit('no encuentro el bloque CARNAVAL_GEOM en ' + FRAG)
    return m.group(1)


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    prog = ctx.program(vertex_shader=VERT,
                       fragment_shader='#version 330\n' + geom_block() + BODY)
    vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
    os.makedirs(OUT, exist_ok=True)
    prog['rect'].value = R
    fbo = ctx.simple_framebuffer((W * SS, H * SS), components=4, dtype='f4')
    fbo.use()
    fbo.clear(0, 0, 0, 0)
    vao.render(mode=moderngl.TRIANGLE_STRIP)
    img = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(H * SS, W * SS, 4)[::-1]
    a = img[..., 3:4]
    pm = np.concatenate([img[..., :3] * a, a], -1).reshape(H, SS, W, SS, 4).mean((1, 3))
    rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
    out = np.concatenate([rgb, pm[..., 3:4]], -1)
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
        os.path.join(OUT, '1_feria.png'), optimize=True)
    print('lamina 1_feria', (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '2_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
