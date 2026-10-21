"""Hornea las laminas de la escena 26 de Halloween (la mansion embrujada).

Fachada victoriana de noche, de frente: cuerpo principal de dos pisos con
tablas de madera gastada, techo a la mansarda con escamas de pizarra y
cresteria de hierro, torre central con aguja, ala izquierda con
frontispicio, torreon redondo a la derecha con techo conico, porche con
columnas y puerta en arco, tres chimeneas de ladrillo, setos secos, la
reja de lanzas, el camino de grava y dos arboles muertos. El cielo queda
transparente (va en vivo).

La geometria de ventanas, puerta y chimeneas sale del MISMO bloque GLSL
que usa la escena (entre "// >>> MANSION_GEOM" y "// <<< MANSION_GEOM" en
scene26_mansion.frag): las laminas y el shader en vivo no se desfasan.

Laminas:
  1_fachada  color (lineal x2, gamma 2.2) y A = cobertura (0 = cielo)
  2_marcas   R puerta (1) o lo que queda delante de la niebla (0.5: reja,
             setos, arboles), G vidrio de las ventanas (sin parteluces),
             B hiedra: cuando llega (0.02..1; 0 = no crece ahi; la perilla
             D6 la hace crecer desde el suelo), A = 1 siempre (con A = 0
             el atlas pierde el color al achicar: PIL premultiplica)
  3_ruido    el ruido que se repite de la escena 00 (nubes, niebla)
  4_relieve  relieve de la fachada (fase 22): RG normal, B cavidad, A = hay
             fachada; la luz de la luna, el relampago, las ventanas y la
             puerta se calcula en vivo con esto

uso: python3 td/tools/bake_plates_mansion.py   (despues: build_atlas.py)
"""
import os
import re
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = os.path.join(os.path.dirname(HERE), 'sets', 'halloween')
SETS = os.path.join(SET, 'plates')
OUT = os.path.join(SETS, 'scene26')
FRAG = os.path.join(SET, 'visuals', 'scene26_mansion.frag')
SS = 2
R = (-3.4, -1.25, 3.4, 1.25)
W, H = 1280, 470
PLATES = [('1_fachada', 0), ('2_marcas', 1), ('4_relieve', 2)]

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
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c){
  vec2 e0=b-a,e1=c-b,e2=a-c,v0=p-a,v1=p-b,v2=p-c;
  vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
  vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
  vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
  float s=sign(e0.x*e2.y-e0.y*e2.x);
  vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y); }

float ground(float x){ return -0.585 - 0.05*pow(x/2.6,2.) + 0.018*(gn(vec2(x*1.7,3.1))-0.5); }

// tablas horizontales gastadas (y pintura que se pela)
vec3 siding(vec2 p, vec3 paint){
  float by=fract(p.y*40.);
  float board=0.78+0.22*smoothstep(0.,0.18,by);           // sombra bajo cada tabla
  float grain=0.85+0.3*fbm(vec2(p.x*30.,floor(p.y*40.)*3.7),4);
  float peel=smoothstep(0.62,0.70,fbm(p*vec2(9.,14.)+3.,5));
  vec3 c=mix(paint, vec3(0.13,0.10,0.08), peel*0.8)*board*grain;
  // chorreado de humedad
  c*=1.-0.35*smoothstep(0.55,0.85,fbm(vec2(p.x*22.,p.y*1.5),4));
  return c;
}
// escamas de pizarra
vec3 slate(vec2 p, float lit){
  vec2 s=p*vec2(26.,30.);
  float row=floor(s.y);
  s.x+=mod(row,2.)*0.5;
  vec2 f=fract(s)-vec2(0.5,1.0);
  float sc=length(f*vec2(1.,0.9));
  float edge=smoothstep(0.42,0.52,sc);
  vec3 c=vec3(0.17,0.175,0.20)*(0.7+0.5*h21(floor(s)))*(1.-0.45*edge);
  c*=0.8+0.4*fbm(p*12.,3);
  return c*lit;
}
vec3 brick(vec2 p){
  vec2 s=p*vec2(28.,56.);
  s.x+=mod(floor(s.y),2.)*0.5;
  vec2 f=fract(s);
  float mortar=step(f.x,0.07)+step(f.y,0.12);
  vec3 c=vec3(0.30,0.12,0.08)*(0.7+0.5*h21(floor(s)));
  return mix(c, vec3(0.16,0.15,0.13), clamp(mortar,0.,1.))*(0.75+0.35*fbm(p*20.,3));
}
vec3 stone(vec2 p){
  vec2 s=p*vec2(9.,14.); s.x+=mod(floor(s.y),2.)*0.45;
  vec2 f=fract(s); float j=step(f.x,0.05)+step(f.y,0.08);
  return mix(vec3(0.20,0.19,0.18)*(0.6+0.6*h21(floor(s))), vec3(0.07), clamp(j,0.,1.))*(0.7+0.4*fbm(p*14.,4));
}

// arbol muerto: tronco retorcido y tres niveles de ramas (segmentos con
// ruido); devuelve la distancia
float tree(vec2 p, vec2 base, float hgt, float seed){
  vec2 q=p-base;
  if(abs(q.x)>hgt*1.3||q.y<-0.05||q.y>hgt*1.25) return 1e3;
  q.x+=0.035*sin(q.y*5.+seed)+0.015*sin(q.y*17.+seed*2.);
  float d=abs(q.x)-mix(0.055,0.010,clamp(q.y/hgt,0.,1.))*(1.+0.25*gn(vec2(q.y*20.,seed)));
  d=max(d,max(-q.y-0.02,q.y-hgt));
  // raices
  d=min(d,max(abs(q.x)-0.12*smoothstep(0.08,-0.02,q.y)-0.01,abs(q.y+0.01)-0.07));
  for(int i=0;i<6;i++){
    float fi=float(i);
    float side=mod(fi,2.)<0.5?-1.:1.;
    vec2 a=vec2(0.,hgt*(0.32+0.11*fi));
    float len=hgt*(0.62-0.07*fi)*(0.75+0.4*h21(vec2(fi,seed)));
    float ang=side*(0.55+0.35*h21(vec2(seed,fi)))+ (h21(vec2(fi,seed*3.))-0.5)*0.3;
    vec2 dir=vec2(sin(ang),cos(ang));
    vec2 m=a+dir*len*0.5+vec2(-dir.y,dir.x)*0.04*side;
    vec2 b=a+dir*len;
    float w0=mix(0.020,0.008,fi/6.);
    d=min(d,min(sdSeg(q,a,m)-w0,sdSeg(q,m,b)-w0*0.6));
    for(int k=0;k<3;k++){
      float fk=float(k);
      vec2 c=mix(a,b,0.35+0.25*fk);
      float a2=ang+side*(0.5+0.4*h21(vec2(fi*7.+fk,seed)))*(mod(fk,2.)<0.5?1.:-0.7);
      vec2 d2=vec2(sin(a2),cos(a2));
      float l2=len*(0.42-0.08*fk);
      vec2 e=c+d2*l2;
      d=min(d,sdSeg(q,c,e)-w0*0.45);
      for(int m2=0;m2<2;m2++){
        float fm=float(m2);
        vec2 f=mix(c,e,0.5+0.3*fm);
        float a3=a2+(fm<0.5?0.6:-0.6)+(h21(vec2(fk,fi+fm))-0.5)*0.5;
        d=min(d,sdSeg(q,f,f+vec2(sin(a3),cos(a3))*l2*0.45)-0.0035);
      }
    }
  }
  return d;
}

struct S { vec3 c; float a; vec4 mk; };

S shade(vec2 p){
  S o; o.c=vec3(0.); o.a=0.; o.mk=vec4(0.);
  float lit=1.0;
  // ---------- fondo: suelo ----------
  float gy=ground(p.x);
  if(p.y<gy){
    vec3 g=vec3(0.13,0.13,0.10)*(0.45+0.9*fbm(p*vec2(4.,12.),6))*(0.8+0.4*gn(p*vec2(40.,90.)));
    g+=vec3(0.06,0.05,0.03)*step(0.6,gn(p*vec2(60.,140.)));     // pasto seco
    // camino de grava a la puerta
    float path=abs(p.x)-mix(0.17,0.55,clamp((gy-p.y)/0.6,0.,1.));
    if(path<0.) g=vec3(0.24,0.23,0.20)*(0.6+0.6*h21(floor(p*300.)))*(0.7+0.3*fbm(p*20.,3));
    o.c=g*(0.7+0.3*smoothstep(-1.2,gy,p.y)); o.a=1.;
  }
  // ---------- arboles muertos de los costados (detras de la casa no) ----------
  float tr=min(tree(p,vec2(-2.30,ground(-2.30)),1.55,1.),tree(p,vec2(2.25,ground(2.25)),1.20,7.));
  if(tr<0.){ o.c=vec3(0.035,0.03,0.03)*(0.7+0.4*fbm(p*40.,3)); o.a=1.; o.mk.r=0.5; }

  // ---------- la casa ----------
  vec3 paint=vec3(0.20,0.19,0.23);
  vec3 trim=vec3(0.40,0.38,0.36);
  bool house=false;
  vec3 hc=vec3(0.);
  // ala izquierda
  if(p.x>-1.72&&p.x<-0.95&&p.y>-0.56&&p.y<0.02){ house=true; hc=siding(p,paint*0.92); }
  float gab=sdTri(p,vec2(-1.80,0.02),vec2(-0.88,0.02),vec2(-1.34,0.40));
  if(gab<0.){ house=true; hc=siding(p,paint*0.88)*0.95;
    if(gab>-0.035){ hc=trim*0.8*(0.7+0.3*sin(abs(p.x+1.34)*160.)); }            // tablas de borde calado
  }
  // cuerpo principal
  if(abs(p.x)<0.95&&p.y>-0.56&&p.y<0.24){ house=true; hc=siding(p,paint); }
  // cornisa con mensulas
  if(abs(p.x)<0.99&&p.y>0.205&&p.y<0.255){ house=true; hc=trim*(0.65+0.35*step(0.5,fract(p.x*14.)))*(p.y<0.22?0.6:1.); }
  // mansarda curva
  float mt=(p.y-0.255)/0.22;
  if(mt>0.&&mt<1.){
    float hw=mix(1.00,0.80,pow(mt,0.7));
    if(abs(p.x)<hw){ house=true; hc=slate(p,0.75+0.45*mt); }
  }
  if(abs(p.x)<0.82&&p.y>0.47&&p.y<0.50){ house=true; hc=vec3(0.06)*(0.7+0.3*step(0.5,fract(p.x*30.))); }
  // cresteria de hierro
  if(abs(p.x)<0.82&&p.y>0.50&&p.y<0.545){
    float sp=abs(fract(p.x*30.)-0.5);
    if(sp<0.08||(p.y<0.51)||(abs(p.y-0.525)<0.004)){ house=true; hc=vec3(0.04); }
  }
  // torre central y su aguja
  if(abs(p.x)<0.21&&p.y>0.24&&p.y<0.84){ house=true; hc=siding(p,paint*1.04); }
  if(abs(p.x)<0.235&&p.y>0.80&&p.y<0.845){ house=true; hc=trim*0.7; }
  float sp=sdTri(p,vec2(-0.25,0.845),vec2(0.25,0.845),vec2(0.,1.08));
  if(sp<0.){ house=true; hc=slate(p*vec2(1.6,1.),0.7+0.6*smoothstep(0.1,-0.1,p.x)); }
  if(abs(p.x)<0.006&&p.y>1.07&&p.y<1.13){ house=true; hc=vec3(0.05); }
  // torreon redondo
  float tx=(p.x-1.20)/0.25;
  if(abs(tx)<1.&&p.y>-0.56&&p.y<0.52){ house=true;
    float n=sqrt(1.-tx*tx);
    hc=siding(vec2(asin(tx)*0.25+1.2,p.y),paint*0.95)*(0.45+0.65*clamp(0.3-tx*0.8+n*0.5,0.,1.));
  }
  if(abs(tx)<1.12&&p.y>0.50&&p.y<0.545){ house=true; hc=trim*0.7; }
  float cone=sdTri(p,vec2(0.92,0.545),vec2(1.48,0.545),vec2(1.20,0.93));
  if(cone<0.){ house=true; hc=slate(vec2(p.x*1.4,p.y),0.55+0.7*smoothstep(1.35,1.05,p.x)); }
  // chimeneas
  for(int i=0;i<3;i++){
    vec3 ch=MN_CHIM[i];
    if(abs(p.x-ch.x)<ch.z&&p.y>ch.y-0.36&&p.y<ch.y){ house=true; hc=brick(p)*(0.6+0.5*smoothstep(ch.x+ch.z,ch.x-ch.z,p.x)); }
    if(abs(p.x-ch.x)<ch.z+0.015&&p.y>ch.y-0.03&&p.y<ch.y){ house=true; hc=vec3(0.12); }
  }
  // cimiento de piedra
  if(house && p.y<-0.50) hc=stone(p);
  if(house){
    // sombras bajo los aleros
    if(abs(p.x)<0.95&&p.y<0.205&&p.y>0.13) hc*=mix(0.5,1.,(0.205-p.y)/0.075);
    if(p.x>-1.72&&p.x<-0.95&&p.y<0.02&&p.y>-0.05) hc*=0.6;
    // cada piso un poco mas oscuro abajo (la luna llega de arriba)
    hc*=0.75+0.3*smoothstep(-0.6,0.6,p.y);
    o.c=hc; o.a=1.;
  }
  // ---------- porche ----------
  if(abs(p.x)<0.42&&p.y>-0.225&&p.y<-0.17){ o.c=trim*0.62*(p.y<-0.21?0.6:1.); o.a=1.; }
  if(abs(p.x)<0.40&&p.y>-0.27&&p.y<-0.225){ o.c*=0.45; }                       // sombra del techo del porche
  for(int k=0;k<4;k++){
    float cx=k<2?(k==0?-0.36:-0.17):(k==2?0.17:0.36);
    if(abs(p.x-cx)<0.016&&p.y>-0.56&&p.y<-0.225){ o.c=trim*0.75*(0.6+0.5*smoothstep(cx+0.016,cx-0.016,p.x)); o.a=1.; }
  }
  // baranda
  if(abs(p.x)<0.40&&abs(p.x)>0.19&&p.y>-0.56&&p.y<-0.45){
    if(abs(p.y+0.455)<0.006||fract(p.x*60.)<0.25){ o.c=trim*0.5; o.a=1.; }
  }
  // escalones
  for(int k=0;k<3;k++){
    float y0=-0.56-0.022*float(k);
    if(abs(p.x)<0.17+0.02*float(k)&&p.y<y0&&p.y>y0-0.022){ o.c=stone(p)*(1.2-0.15*float(k)); o.a=1.; }
  }
  // ---------- puerta ----------
  vec4 dr=MN_DOOR;
  vec2 dq=p-dr.xy;
  float top=dr.w-dr.z;
  float dd=min(max(abs(dq.x)-dr.z,max(dq.y-top,-dr.w-dq.y)),length(dq-vec2(0.,top))-dr.z);
  if(dd<0.035&&dd>0.){ o.c=trim*0.8*(0.6+0.4*fract(atan(dq.y-top,dq.x)*8.)); o.a=1.; }
  if(dd<0.){
    vec3 wd=vec3(0.13,0.06,0.04)*(0.7+0.4*fbm(vec2(dq.x*40.,dq.y*6.),4));
    float pan=step(0.012,abs(abs(dq.x)-0.05))*step(0.02,abs(fract((dq.y+dr.w)*6.)-0.5));
    wd*=0.75+0.35*pan;
    if(abs(dq.x)<0.004) wd*=0.3;                                     // junta de las dos hojas
    if(length((dq-vec2(0.03,-0.03))*vec2(1.,0.8))<0.009||length((dq-vec2(-0.03,-0.03))*vec2(1.,0.8))<0.009) wd=vec3(0.45,0.36,0.12);
    o.c=wd; o.a=1.; o.mk.r=1.;
  }
  // ---------- ventanas ----------
  for(int i=0;i<MN_NW;i++){
    vec4 w=MN_WIN[i];
    vec2 q=p-w.xy;
    if(abs(q.x)>w.z+0.09||abs(q.y)>w.w+0.09) continue;
    float d=mnWinD(p,i);
    int ty=MN_TYPE[i];
    // persianas en las rectangulares del cuerpo principal y del ala
    if(ty==0){
      float sx=abs(q.x)-w.z-0.03;
      if(abs(sx)<0.03&&abs(q.y)<w.w){
        vec3 sh=vec3(0.07,0.10,0.08)*(0.7+0.4*step(0.5,fract(q.y*70.)));
        if(i==3||i==13){ // persiana rota y torcida
          if(q.y<w.w*0.2) sh=vec3(-1.);
        }
        if(sh.x>=0.){ o.c=sh; o.a=1.; }
      }
      // dintel y alfeizar
      if(abs(q.x)<w.z+0.02&&q.y>w.w&&q.y<w.w+0.025){ o.c=trim*(0.7+0.3*step(0.5,fract(q.x*60.))); o.a=1.; }
      if(abs(q.x)<w.z+0.025&&q.y<-w.w&&q.y>-w.w-0.018){ o.c=trim*0.85; o.a=1.; }
      if(abs(q.x)<w.z+0.02&&q.y<-w.w-0.018&&q.y>-w.w-0.04) o.c*=0.55;          // sombra del alfeizar
    }
    if(d<0.018&&d>0.){ o.c=trim*0.75*(0.6+0.4*smoothstep(0.018,0.,d)); o.a=1.; }
    if(d<=0.){
      // vidrio oscuro con reflejo de la luna y parteluces
      float mull=min(abs(q.x)-0.006, abs(q.y-(ty==1?w.w-w.z:0.))-0.006);
      if(ty==2) mull=min(abs(q.x),abs(q.y))-0.005;
      vec3 gl=vec3(0.025,0.03,0.045)+vec3(0.06,0.07,0.10)*smoothstep(0.2,-0.6,q.x/w.z+q.y/w.w);
      gl*=0.8+0.3*fbm(q*40.,3);
      if(mull<0.){ o.c=trim*0.5; o.a=1.; }
      else {
        float cov=smoothstep(0.,0.004,-d)*smoothstep(0.,0.004,mull);
        o.c=gl; o.a=1.; o.mk.g=cov;
      }
    }
  }
  // ---------- hiedra (solo sobre las paredes) ----------
  if(o.a>0.5&&o.mk.g<0.01&&o.mk.r<0.4&&p.y>-0.58&&p.y<0.55){
    float best=1e3;
    vec2 roots[4]; roots[0]=vec2(-1.62,-0.56); roots[1]=vec2(-0.88,-0.56); roots[2]=vec2(0.98,-0.56); roots[3]=vec2(1.38,-0.56);
    for(int k=0;k<4;k++){
      vec2 r=p-roots[k];
      float wob=(fbm(p*vec2(5.,3.)+float(k)*3.,4)-0.5)*0.35;
      float far=(r.y*1.05+abs(r.x+wob)*1.9)/1.15;
      best=min(best,far);
    }
    float leaf=fbm(p*70.,3);
    float arr=clamp(best+(0.55-leaf)*0.28,0.,1.);
    if(leaf>0.36&&arr<0.98) o.mk.b=max(arr,0.02);
  }
  // ---------- delante: setos secos y la reja ----------
  float hedge=p.y-(-0.66+0.10*fbm(vec2(p.x*6.,1.),5)+0.04*gn(vec2(p.x*34.,2.)));
  if(hedge<0.&&p.y>-0.82&&abs(p.x)>0.58){ o.c=vec3(0.06,0.07,0.045)*(0.5+0.9*fbm(p*40.,4)); o.a=1.; o.mk.r=0.5; }
  // reja de lanzas (con el porton abierto en el centro)
  if(p.y>-0.93&&p.y<-0.68&&abs(p.x)>0.24){
    float bx=fract(p.x*9.)-0.5;
    float bar=abs(bx)-0.045;
    float tipY=-0.705+0.012*sin(p.x*3.);
    float spear=max(abs(bx)-0.11*(tipY+0.03-p.y)/0.03,-1.);
    bool on=(bar<0.&&p.y<tipY)||(p.y>tipY&&p.y<tipY+0.03&&abs(bx)<0.11*(tipY+0.03-p.y)/0.03);
    on=on||abs(p.y+0.74)<0.006||abs(p.y+0.89)<0.006;
    if(on){ o.c=vec3(0.03,0.03,0.035)+vec3(0.05)*smoothstep(0.03,-0.04,bx); o.a=1.; o.mk.r=0.5; }
  }
  // porton abierto (dos hojas en perspectiva)
  for(int s=0;s<2;s++){
    float sg=s==0?-1.:1.;
    float gx=(p.x-sg*0.24)*sg;           // 0 en la bisagra, positivo hacia afuera
    if(gx<0.&&gx>-0.11&&p.y>-0.92&&p.y<-0.70+gx*0.3){
      if(fract(gx*30.)<0.3||abs(p.y+0.75)<0.005){ o.c=vec3(0.03); o.a=1.; o.mk.r=0.5; }
    }
  }
  return o;
}


// ---------- RELIEVE (fase 22) ----------
// Altura de cada punto de la fachada (en unidades de la escena): tablas
// que sobresalen, cornisa y molduras, ventanas y puerta hundidas,
// persianas con tablillas, mansarda inclinada, torreon cilindrico, conos y
// aguja, chimeneas de ladrillo y columnas. La escena saca de aca la normal
// y hace la luz en vivo (luna, relampago, ventanas, puerta).
float height(vec2 p, out float on){
  on=0.; float h=0.;
  float board=0.004*fract(p.y*40.);
  bool wall=(p.x>-1.72&&p.x<-0.95&&p.y>-0.56&&p.y<0.02)||(abs(p.x)<0.95&&p.y>-0.56&&p.y<0.24)||(abs(p.x)<0.21&&p.y>0.24&&p.y<0.84);
  float gab=sdTri(p,vec2(-1.80,0.02),vec2(-0.88,0.02),vec2(-1.34,0.40));
  if(wall||gab<0.){ on=1.; h=board; if(gab<0.&&gab>-0.035) h=0.012; }
  if(abs(p.x)<0.21&&p.y>0.24&&p.y<0.84) h=0.05+board;              // la torre sale del cuerpo
  float tx=(p.x-1.20)/0.25;
  if(abs(tx)<1.&&p.y>-0.56&&p.y<0.52){ on=1.; h=sqrt(max(1.-tx*tx,0.))*0.25+board; }
  if(abs(tx)<1.12&&p.y>0.50&&p.y<0.545){ on=1.; h=sqrt(max(1.-tx*tx/1.25,0.))*0.27+0.01; }
  if(abs(p.x)<0.99&&p.y>0.205&&p.y<0.255){ on=1.; h=0.035+0.008*step(0.5,fract(p.x*14.))+(p.y-0.205)*0.3; }
  float mt=(p.y-0.255)/0.22;
  if(mt>0.&&mt<1.){ float hw=mix(1.00,0.80,pow(mt,0.7));
    if(abs(p.x)<hw){ on=1.;
      vec2 sc=p*vec2(26.,30.); sc.x+=mod(floor(sc.y),2.)*0.5; vec2 f=fract(sc)-vec2(0.5,1.0);
      h=0.035-mt*0.10+0.003*(1.-smoothstep(0.3,0.52,length(f*vec2(1.,0.9)))); } }
  if(abs(p.x)<0.21&&p.y>0.24&&p.y<0.84) { on=1.; h=0.05+board; }
  if(abs(p.x)<0.235&&p.y>0.80&&p.y<0.845){ on=1.; h=0.065; }
  float spr=sdTri(p,vec2(-0.25,0.845),vec2(0.25,0.845),vec2(0.,1.08));
  if(spr<0.){ on=1.; h=0.06+(0.25-abs(p.x))*0.35; }
  float cone=sdTri(p,vec2(0.92,0.545),vec2(1.48,0.545),vec2(1.20,0.93));
  if(cone<0.){ on=1.; float r=(0.93-p.y)/0.385*0.28; float u=clamp((p.x-1.20)/max(r,0.01),-1.,1.); h=sqrt(1.-u*u)*r; }
  for(int i=0;i<3;i++){ vec3 ch=MN_CHIM[i];
    if(abs(p.x-ch.x)<ch.z&&p.y>ch.y-0.36&&p.y<ch.y){ on=1.;
      vec2 s2=p*vec2(28.,56.); s2.x+=mod(floor(s2.y),2.)*0.5; vec2 f=fract(s2);
      h=0.06+sqrt(max(1.-pow((p.x-ch.x)/ch.z,2.),0.))*0.02-0.004*clamp(step(f.x,0.07)+step(f.y,0.12),0.,1.); }
    if(abs(p.x-ch.x)<ch.z+0.015&&p.y>ch.y-0.03&&p.y<ch.y){ on=1.; h=0.09; } }
  if(on>0.&&p.y<-0.50){ vec2 s3=p*vec2(9.,14.); s3.x+=mod(floor(s3.y),2.)*0.45; vec2 f=fract(s3); h=0.012-0.006*clamp(step(f.x,0.05)+step(f.y,0.08),0.,1.); }
  // porche
  if(abs(p.x)<0.42&&p.y>-0.225&&p.y<-0.17){ on=1.; h=0.10; }
  for(int k=0;k<4;k++){ float cx=k<2?(k==0?-0.36:-0.17):(k==2?0.17:0.36);
    if(abs(p.x-cx)<0.016&&p.y>-0.56&&p.y<-0.225){ on=1.; h=0.08+sqrt(max(1.-pow((p.x-cx)/0.016,2.),0.))*0.016; } }
  // puerta hundida con marco y tableros
  vec4 dr=MN_DOOR; vec2 dq=p-dr.xy; float top=dr.w-dr.z;
  float dd=min(max(abs(dq.x)-dr.z,max(dq.y-top,-dr.w-dq.y)),length(dq-vec2(0.,top))-dr.z);
  if(dd<0.035&&dd>0.){ on=1.; h=0.02+0.01*smoothstep(0.035,0.015,dd); }
  if(dd<0.){ on=1.; h=-0.03+0.004*step(0.012,abs(abs(dq.x)-0.05))*step(0.02,abs(fract((dq.y+dr.w)*6.)-0.5)); }
  // ventanas: vidrio hundido, marco, alfeizar, dintel y persianas
  for(int i=0;i<MN_NW;i++){ vec4 w=MN_WIN[i]; vec2 q=p-w.xy;
    if(abs(q.x)>w.z+0.09||abs(q.y)>w.w+0.09) continue;
    float d=mnWinD(p,i); int ty=MN_TYPE[i];
    if(ty==0){ float sx=abs(q.x)-w.z-0.03;
      if(abs(sx)<0.03&&abs(q.y)<w.w&&!((i==3||i==13)&&q.y<w.w*0.2)){ on=1.; h=0.010+0.003*fract(q.y*70.); }
      if(abs(q.x)<w.z+0.02&&q.y>w.w&&q.y<w.w+0.025){ on=1.; h=0.018; }
      if(abs(q.x)<w.z+0.025&&q.y<-w.w&&q.y>-w.w-0.018){ on=1.; h=0.020; } }
    if(d<0.018&&d>0.){ on=1.; h=0.012+0.008*smoothstep(0.018,0.006,d); }
    if(d<=0.){ on=1.; float mull=min(abs(q.x)-0.006, abs(q.y-(ty==1?w.w-w.z:0.))-0.006); if(ty==2) mull=min(abs(q.x),abs(q.y))-0.005;
      h=mull<0.?-0.012:-0.025; } }
  return h;
}
vec4 relief(vec2 p){
  float on, o2; float h=height(p,on);
  if(on<0.5) return vec4(0.5,0.5,1.,0.);
  float e=0.0026;
  float hx=height(p+vec2(e,0.),o2)-height(p-vec2(e,0.),o2);
  float hy=height(p+vec2(0.,e),o2)-height(p-vec2(0.,e),o2);
  vec3 n=normalize(vec3(-hx/(2.*e),-hy/(2.*e),1.));
  // cavidad: mas oscuro donde lo de alrededor sobresale
  float avg=0.; for(int k=0;k<4;k++){ float a=float(k)*1.5708; avg+=height(p+vec2(cos(a),sin(a))*0.012,o2); }
  float ao=clamp(1.-max(avg*0.25-h,0.)*14.,0.45,1.);
  return vec4(n.xy*0.5+0.5,ao,1.);
}

void main(){
  vec2 p=mix(rect.xy,rect.zw,vUV);
  if(plate==2){ fc=relief(p); return; }
  S o=shade(p);
  if(plate==1){ fc=vec4(o.mk.rgb,1.); return; }
  fc=vec4(pow(clamp(o.c*2.,0.,1.),vec3(1./2.2)),o.a);
}
"""


def geom_block():
    with open(FRAG, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'// >>> MANSION_GEOM.*?\n(.*?)// <<< MANSION_GEOM', src, re.S)
    if not m:
        raise SystemExit('no encuentro el bloque MANSION_GEOM en ' + FRAG)
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
        if pid in (0, 2):
            a = img[..., 3:4]
            pm = np.concatenate([img[..., :3] * a, a], -1).reshape(H, SS, W, SS, 4).mean((1, 3))
            rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
            img = np.concatenate([rgb, pm[..., 3:4]], -1)
        else:
            # marcas: promedio simple; la hiedra (B, "cuando llega") por minimo
            # para que el borde no se adelante
            r = img.reshape(H, SS, W, SS, 4)
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
