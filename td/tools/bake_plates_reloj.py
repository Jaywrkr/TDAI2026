"""Hornea las laminas de la escena 27 de Halloween (el reloj de la medianoche).

La torre del reloj vista desde abajo: sillares de piedra, pilastras,
gargolas en las esquinas, el campanario con persianas arriba, la esfera
grande con bisel de hierro, aro de numeros romanos (IIII a la antigua),
vidrio esmerilado y el centro calado (por ahi se ven los engranajes, que
van en vivo), y abajo el arco por donde cuelga el pendulo. A los costados,
los tejados y agujas del pueblo con alguna ventana. El cielo queda
transparente (va en vivo).

La geometria de la esfera, el calado y el arco sale del MISMO bloque GLSL
que usa la escena (entre "// >>> RELOJ_GEOM" y "// <<< RELOJ_GEOM" en
scene27_reloj.frag).

Laminas:
  1_torre    color (lineal x2, gamma 2.2) y A = cobertura (0 = cielo, el
             calado y el arco)
  2_marcas   R hierro (bisel, numeros, marcos: D5 lo tine y brilla con los
             agudos), G vidrio de la esfera (se ilumina desde adentro),
             B grietas de la esfera: cuando llegan (0.02..1; 0 = nunca;
             D6 las abre desde el centro), A = 1 siempre
  3_ruido    el ruido que se repite de la escena 00 (nubes, niebla)

uso: python3 td/tools/bake_plates_reloj.py   (despues: build_atlas.py)
"""
import os
import re
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = os.path.join(os.path.dirname(HERE), 'sets', 'halloween')
SETS = os.path.join(SET, 'plates')
OUT = os.path.join(SETS, 'scene27')
FRAG = os.path.join(SET, 'visuals', 'scene27_reloj.frag')
SS = 2
R = (-3.4, -1.25, 3.4, 1.25)
W, H = 1280, 470
PLATES = [('1_torre', 0), ('2_marcas', 1)]

VERT = """#version 330
in vec2 in_pos; out vec2 vUV;
void main(){ vUV = in_pos*0.5+0.5; gl_Position = vec4(in_pos,0,1); }
"""

BODY = r"""
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
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c){
  vec2 e0=b-a,e1=c-b,e2=a-c,v0=p-a,v1=p-b,v2=p-c;
  vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
  vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
  vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
  float s=sign(e0.x*e2.y-e0.y*e2.x);
  vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y); }

// sillares de piedra: fila y bloque con junta, desgaste y musgo
vec3 ashlar(vec2 p, float lit){
  vec2 s=p*vec2(7.,13.);
  float row=floor(s.y);
  s.x+=mod(row,2.)*0.5+h21(vec2(row,3.))*0.3;
  vec2 f=fract(s), id=floor(s);
  float j=min(min(f.x,1.-f.x)*1.85,min(f.y,1.-f.y));
  float joint=smoothstep(0.03,0.08,j);
  vec3 c=vec3(0.24,0.22,0.20)*(0.75+0.45*h21(id));
  c*=0.7+0.45*fbm(p*18.+id,5);
  c=mix(c,vec3(0.10,0.12,0.07),smoothstep(0.62,0.8,fbm(p*6.+7.,5))*0.6);   // musgo
  c*=mix(0.35,1.,joint);
  c*=0.85+0.25*smoothstep(0.1,0.5,f.y);                                     // canto de arriba
  return c*lit;
}

// numeral romano dentro de una celda local (y hacia afuera de la esfera):
// trazos I, V y X, 'w' es el grosor
float romanStroke(vec2 q, float k, float w){
  // k: 0 = I, 1 = V, 2 = X; centrado en x=0, alto 1 (y -0.5..0.5)
  if(k<0.5) return sdSeg(q,vec2(0.,-0.5),vec2(0.,0.5))-w;
  if(k<1.5) return min(sdSeg(q,vec2(-0.28,0.5),vec2(0.,-0.5)),sdSeg(q,vec2(0.28,0.5),vec2(0.,-0.5)))-w;
  return min(sdSeg(q,vec2(-0.28,0.5),vec2(0.28,-0.5)),sdSeg(q,vec2(0.28,0.5),vec2(-0.28,-0.5)))-w;
}
// el numeral n (1..12) en coordenadas locales (q.y = radial, alto 1)
float roman(vec2 q, int n){
  // secuencias de trazos, de izquierda a derecha (0 I, 1 V, 2 X), -1 = fin
  int s0=-1,s1=-1,s2=-1,s3=-1;
  if(n==1){s0=0;}
  else if(n==2){s0=0;s1=0;}
  else if(n==3){s0=0;s1=0;s2=0;}
  else if(n==4){s0=0;s1=0;s2=0;s3=0;}
  else if(n==5){s0=1;}
  else if(n==6){s0=1;s1=0;}
  else if(n==7){s0=1;s1=0;s2=0;}
  else if(n==8){s0=1;s1=0;s2=0;s3=0;}
  else if(n==9){s0=0;s1=2;}
  else if(n==10){s0=2;}
  else if(n==11){s0=2;s1=0;}
  else {s0=2;s1=0;s2=0;}
  int cnt=(s0>=0?1:0)+(s1>=0?1:0)+(s2>=0?1:0)+(s3>=0?1:0);
  float wI=0.22, wV=0.62;
  float tot=0.;
  int ss[4]; ss[0]=s0; ss[1]=s1; ss[2]=s2; ss[3]=s3;
  for(int i=0;i<4;i++){ if(i>=cnt) break; tot+=ss[i]==0?wI:wV; }
  float x=-tot*0.5, d=1e3;
  for(int i=0;i<4;i++){
    if(i>=cnt) break;
    float cw=ss[i]==0?wI:wV;
    d=min(d,romanStroke(q-vec2(x+cw*0.5,0.),float(ss[i]),0.055));
    x+=cw;
  }
  // serifas: barras arriba y abajo
  d=min(d,max(abs(q.x)-tot*0.5-0.03,abs(abs(q.y)-0.5)-0.035));
  return d;
}

struct S { vec3 c; float a; vec4 mk; };

S shade(vec2 p){
  S o; o.c=vec3(0.); o.a=0.; o.mk=vec4(0.);
  vec2 dc=RJ_DIAL.xy; float RO=RJ_DIAL.z;
  // ---------- tejados del pueblo (fondo de los costados) ----------
  float rx=p.x*2.2;
  float roof=-0.60+0.10*abs(fract(rx*0.9)-0.5)*2.0*step(0.5,fract(floor(rx*0.9)*0.37+0.2))
                  +0.06*step(0.5,gn(vec2(floor(rx*1.7),1.)))+0.03*gn(vec2(p.x*3.,9.));
  // dos agujas lejanas
  float sp1=sdTri(p,vec2(-2.05,-0.55),vec2(-1.91,-0.55),vec2(-1.98,-0.05));
  float sp2=sdTri(p,vec2(1.92,-0.55),vec2(2.04,-0.55),vec2(1.98,-0.18));
  if(p.y<roof||sp1<0.||sp2<0.){
    vec3 c=vec3(0.06,0.055,0.06)*(0.7+0.4*fbm(p*vec2(20.,8.),4));
    // ventanitas encendidas
    vec2 wg=p*vec2(9.,14.); vec2 wi=floor(wg); vec2 wf=fract(wg);
    if(p.y<roof-0.05&&h21(wi+3.)>0.86&&abs(wf.x-0.5)<0.18&&abs(wf.y-0.5)<0.22) { c=vec3(0.9,0.6,0.25)*0.55; o.mk.g=0.6; }
    o.c=c; o.a=1.;
  }
  // ---------- la torre ----------
  float tw=RJ_TOWER;     // medio ancho
  bool tower=abs(p.x)<tw+0.10*smoothstep(-0.2,-1.2,p.y);   // se ensancha abajo
  if(tower){
    float lit=0.55+0.55*smoothstep(-tw,tw,p.x);           // luna desde la derecha
    vec3 c=ashlar(p,lit);
    // pilastras de las esquinas
    float pil=abs(abs(p.x)-tw+0.07)-0.07;
    if(pil<0.){ c=ashlar(p*vec2(1.6,1.),lit*1.1)*(0.8+0.4*smoothstep(0.07,-0.07,pil)); }
    // cornisas
    for(int k=0;k<3;k++){
      float cy=k==0?-0.25:(k==1?0.95:-0.98);
      if(abs(p.y-cy)<0.03){ c=vec3(0.30,0.28,0.26)*lit*(p.y<cy?0.55:1.)*(0.8+0.3*fbm(p*30.,3)); }
      if(p.y<cy-0.03&&p.y>cy-0.07) c*=0.55;
    }
    o.c=c; o.a=1.;
    // campanario: tres aberturas con persianas
    for(int k=-1;k<=1;k++){
      vec2 q=p-vec2(float(k)*0.30,1.14);
      float arch=max(abs(q.x)-0.09,q.y-0.14);
      arch=min(arch,length(q-vec2(0.,0.14))-0.09);
      arch=max(arch,-q.y-0.14);
      if(arch<0.){
        float lv=fract((q.y+0.2)*22.);
        o.c=vec3(0.05,0.04,0.035)*(0.6+0.8*smoothstep(0.2,0.7,lv))*lit;
        o.mk.r=0.5;
      }
      if(arch>0.&&arch<0.02){ o.c=vec3(0.32,0.30,0.27)*lit; }
    }
  }
  // gargolas en las esquinas (debajo del campanario)
  for(int s=0;s<2;s++){
    float sg=s==0?-1.:1.;
    vec2 q=(p-vec2(sg*(tw+0.02),0.80))*vec2(sg,1.);
    float body=length((q-vec2(0.10,0.0))*vec2(0.9,1.6))-0.09;
    float head=length(q-vec2(0.22,0.02))-0.05;
    float snout=sdSeg(q,vec2(0.22,0.02),vec2(0.30,-0.01))-0.022;
    float wing=sdTri(q,vec2(0.02,0.02),vec2(0.14,0.04),vec2(0.04,0.17));
    float horn=sdSeg(q,vec2(0.21,0.06),vec2(0.19,0.12))-0.008;
    float d=min(min(min(body,head),min(snout,wing)),horn);
    if(d<0.){ o.c=vec3(0.13,0.12,0.115)*(0.6+0.6*fbm(q*40.,4))*(0.6+0.4*smoothstep(-0.05,0.05,q.y)); o.a=1.; }
  }
  // ---------- arco del pendulo ----------
  {
    vec2 q=p-RJ_ARCH.xy;
    float d=rjArchD(p);
    if(d<0.){ o.a=0.; o.c=vec3(0.); }
    else if(d<0.035){
      // dovelas del arco
      float ang=atan(q.y,q.x);
      o.c=vec3(0.30,0.28,0.25)*(0.7+0.3*step(0.5,fract(ang*5.)))*(0.6+0.4*smoothstep(-0.3,0.3,q.x));
      o.a=1.;
    }
  }
  // ---------- la esfera ----------
  vec2 q=p-dc;
  float r=length(q);
  float ang=atan(q.x,q.y);          // 0 arriba, horario
  if(r<RO+0.05){
    o.a=1.;
    float lit=0.6+0.5*smoothstep(-RO,RO,q.x);
    // bisel exterior de piedra tallada
    if(r>RO){ o.c=vec3(0.30,0.28,0.25)*lit*(0.7+0.3*fbm(q*40.,4))*(0.7+0.3*smoothstep(RO,RO+0.05,r)); o.mk.r=0.; }
    // aro de hierro
    else if(r>RO-0.035){ float b=(r-(RO-0.035))/0.035; o.c=vec3(0.09,0.08,0.075)*(0.6+0.8*sin(b*3.14))*lit; o.mk.r=1.; }
    // anillo de los numeros: vidrio esmerilado, minutos en el borde
    else if(r>RJ_RIN){
      vec3 gl=vec3(0.62,0.58,0.50)*(0.85+0.15*fbm(q*30.,4));
      o.c=gl; o.mk.g=1.;
      // marcas de minuto
      float mA=fract(ang/6.2831853*60.+0.5)-0.5;
      if(r>RO-0.065&&abs(mA)<0.08){ o.c=vec3(0.06); o.mk.r=1.; o.mk.g=0.; }
      // numerales
      float seg=ang/6.2831853*12.;
      float ni=floor(seg+0.5);
      float a0=ni/12.*6.2831853;
      vec2 nc=vec2(sin(a0),cos(a0))*RJ_RNUM;
      vec2 lq=q-nc;
      // local: y radial hacia afuera, x tangente
      vec2 rad=vec2(sin(a0),cos(a0)), tan2=vec2(cos(a0),-sin(a0));
      vec2 l=vec2(dot(lq,tan2),dot(lq,rad))/0.085;
      int n=int(mod(ni+11.,12.))+1;
      if(abs(l.x)<1.2&&abs(l.y)<0.8){
        float d=roman(l,n);
        if(d<0.){ o.c=vec3(0.05,0.045,0.04); o.mk.r=1.; o.mk.g=0.; }
      }
      // aro interior
      if(r<RJ_RIN+0.012){ o.c=vec3(0.08); o.mk.r=1.; o.mk.g=0.; }
    }
    // disco interior: vidrio con tracerias hasta el calado
    else if(r>RJ_RCUT){
      vec3 gl=vec3(0.55,0.52,0.45)*(0.8+0.2*fbm(q*25.,4));
      o.c=gl; o.mk.g=0.9;
      // tracerias radiales de hierro (12) y un aro
      float spoke=abs(fract(ang/6.2831853*12.)-0.5)*r*6.2831853/12.;
      float tr=min(spoke-0.006, abs(r-(RJ_RCUT+RJ_RIN)*0.5)-0.006);
      // un arquito gotico en la punta de cada radio, contra el aro
      float fa=fract(ang/6.2831853*12.)-0.5;
      float lob=abs(length(vec2(fa*r*6.2831853/12.,r-(RJ_RIN-0.045)))-0.045)-0.005;
      lob=max(lob,-(r-(RJ_RIN-0.045)));
      if(tr<0.||lob<0.){ o.c=vec3(0.07,0.06,0.055)*lit; o.mk.r=1.; o.mk.g=0.; }
    }
    // el calado (engranajes en vivo)
    else if(r>RJ_RCUT-0.02){ o.c=vec3(0.09,0.08,0.07)*lit; o.mk.r=1.; }
    else { o.a=0.; o.c=vec3(0.); }
    // grietas: crecen desde el centro hacia afuera (cuando llegan)
    if(r<RO-0.035&&r>RJ_RCUT){
      float cr=1e3;
      for(int k=0;k<7;k++){
        float fk=float(k);
        float a1=fk*0.9+0.4;
        float wob=(gn(vec2(r*14.,fk*3.))-0.5)*0.35;
        float da=abs(mod(ang-a1-wob+3.14159,6.2831853)-3.14159)*r;
        cr=min(cr,da);
      }
      float br=fbm(q*60.,3);
      if(cr<0.004+0.003*br){ o.mk.b=max(0.02,(r-RJ_RCUT)/(RO-RJ_RCUT)*0.9+br*0.1); }
    }
  }
  return o;
}

void main(){
  vec2 p=mix(rect.xy,rect.zw,vUV);
  S o=shade(p);
  if(plate==1){ fc=vec4(o.mk.rgb,1.); return; }
  fc=vec4(pow(clamp(o.c*2.,0.,1.),vec3(1./2.2)),o.a);
}
"""


def geom_block():
    with open(FRAG, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'// >>> RELOJ_GEOM.*?\n(.*?)// <<< RELOJ_GEOM', src, re.S)
    if not m:
        raise SystemExit('no encuentro el bloque RELOJ_GEOM en ' + FRAG)
    return m.group(1)


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    prog = ctx.program(vertex_shader=VERT,
                       fragment_shader='#version 330\n' + geom_block() + BODY)
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
        r = img.reshape(H, SS, W, SS, 4)
        if pid == 0:
            a = img[..., 3:4]
            pm = np.concatenate([img[..., :3] * a, a], -1).reshape(H, SS, W, SS, 4).mean((1, 3))
            rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
            img = np.concatenate([rgb, pm[..., 3:4]], -1)
        else:
            img = r.mean((1, 3))
            arr = r[..., 2]
            arr = np.where(arr > 0, arr, 9.0).min((1, 3))
            img[..., 2] = np.where(arr < 9.0, arr, 0.0)
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '3_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
