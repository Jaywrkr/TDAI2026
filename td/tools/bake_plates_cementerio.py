"""Hornea las laminas (capas PNG) de la escena 00 de Halloween.

Las laminas son lo QUIETO de la escena (sierra, colinas, reja, lapidas,
cruz, suelo, luna, texturas de nubes y niebla) dibujado con todo el
detalle que haga falta: aca no importa el costo, se calcula una sola vez.
En vivo el shader solo las lee (barato) y les pone encima todo lo que se
mueve y baila. Se pueden reemplazar por fotos o arte con el mismo nombre
y el mismo encuadre (ver docs/53).

uso: python3 td/tools/bake_plates_cementerio.py
Necesita moderngl, numpy, pillow y Mesa (como render_scenes.py).
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates', 'scene00')

# Encuadre de cada lamina en coordenadas de escena (x: -3.4..3.4 cubre la
# pantalla 2,5:1 mas el recorrido de camara y parallax). Tiene que
# coincidir con las constantes de scene00_cementerio_niebla.frag.
H0 = -0.36
X0, X1 = -3.4, 3.4
PLATES = [
    # nombre, id, (y0, y1), alto px, celda de lapidas, modo de la lamina media
    # Medio en tres laminas para que D2 sume lapidas DE A UNA (sin saltos):
    #   2_medio_base     colinas, reja, suelo y pasto, sin lapidas (modo 1)
    #   3_medio_lapidas  solo las lapidas (modo 2)
    #   7_lapidas_normal relieve 3D y, en B, en que punto de D2 aparece cada lapida
    ('1_lejos', 0, (H0 + 0.12, H0 + 0.68), 0, 0.0, 0),
    ('2_medio_base', 1, (H0 - 0.40, H0 + 0.95), 0, 0.27, 1),
    ('3_medio_lapidas', 5, (H0 - 0.40, H0 + 0.95), 0, 0.27, 0),
    ('4_cerca', 3, (-1.30, 0.40), 0, 0.0, 0),
    # relieve 3D (normal en RG) de las lapidas; A = hay lapida.
    #   7_lapidas_normal  B = en que punto de D2 aparece cada lapida
    #   8_cerca_normal    B = oclusion
    ('7_lapidas_normal', 6, (H0 - 0.40, H0 + 0.95), 0, 0.27, 0),
    ('8_cerca_normal', 4, (-1.30, 0.40), 0, 0.0, 0),
]
W = 1280
SS = 2  # supersampling

VERT = """#version 330
in vec2 in_pos; out vec2 vUV;
void main(){ vUV = in_pos*0.5+0.5; gl_Position = vec4(in_pos,0,1); }
"""

FRAG = r"""#version 330
in vec2 vUV; out vec4 fc;
uniform int plate;
uniform vec4 rect;
uniform float cellW;
uniform int midMode;   // 0 todo, 1 sin lapidas, 2 solo lapidas, 3 orden
uniform vec2 texRes;
const float H0 = %(h0)f;
const vec3 MOONC = vec3(0.80, 0.74, 0.86);
const vec3 L = normalize(vec3(0.55, 0.55, 0.62));   // luna arriba a la derecha

float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ vec3 a=fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a+=dot(a,a+34.45); return fract(vec2(a.x*a.y,a.y*a.z)); }
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(i)-.5,f), b=dot(h22(i+vec2(1,0))-.5,f-vec2(1,0));
  float c=dot(h22(i+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i+vec2(1,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fbm(vec2 p,int o){ float s=0.,a=.5,n=0.; for(int i=0;i<10;i++){ if(i>=o)break; s+=a*gn(p); n+=a; a*=.5; p=mat2(.8,-.6,.6,.8)*p*2.03+11.3; } return s/n; }
float ridgeN(float n){ return 1.-abs(n*2.-1.); }
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

// ---------------- lapidas ----------------
// tipo: 0 redonda, 1 gotica, 2 obelisco, 3 cruz, 4 rota, 5 celta
float tombShape(vec2 q, float w, float h, int type){
  float d;
  if(type==0){ d = min(sdBox(q-vec2(0.,h*0.40),vec2(w,h*0.40)), length(q-vec2(0.,h*0.80))-w); }
  else if(type==1){ float b = sdBox(q-vec2(0.,h*0.38),vec2(w,h*0.38));
    float og = max(length(q-vec2(-w*0.9,h*0.76))-w*1.9, length(q-vec2(w*0.9,h*0.76))-w*1.9);
    og = max(og, h*0.66-q.y);
    float k=0.012, hh=clamp(0.5+0.5*(og-b)/k,0.,1.); d = mix(og,b,hh)-k*hh*(1.-hh); }
  else if(type==2){ float k=(q.y)/(h*0.85); float tw=w*0.55*(1.-0.35*clamp(k,0.,1.));
    float sh=max(abs(q.x)-tw, max(-q.y+h*0.12, q.y-h*0.85));
    float py=max(abs(q.x)*1.4+(q.y-h*0.85)-w*0.38, h*0.85-q.y);
    float pl=sdBox(q-vec2(0.,h*0.06),vec2(w*0.85,h*0.06));
    d=min(min(sh,py),pl); }
  else if(type==3){ float post=sdBox(q-vec2(0.,h*0.52),vec2(w*0.24,h*0.48));
    float arm=sdBox(q-vec2(0.,h*0.74),vec2(w*0.80,w*0.22));
    float base=sdBox(q-vec2(0.,h*0.05),vec2(w*0.62,h*0.05));
    d=min(min(post,arm),base); }
  else if(type==4){ d = min(sdBox(q-vec2(0.,h*0.40),vec2(w,h*0.40)), length(q-vec2(0.,h*0.80))-w);
    float cut = h*(0.66 - 0.22*q.x/max(w,0.01)) + 0.06*h*(fbm(vec2(q.x*25.,3.),5)-0.5) + 0.03*h*sign(sin(q.x*60./max(w,0.01)));
    d = max(d, q.y - cut); }
  else { // celta
    float s=h/0.80;
    vec2 r=q/s;
    float post=sdBox(r-vec2(0.,0.40),vec2(0.045,0.40));
    float arm=sdBox(r-vec2(0.,0.58),vec2(0.20,0.042));
    float ring=abs(length(r-vec2(0.,0.58))-0.12)-0.018;
    ring=max(ring,-sdBox(r-vec2(0.,0.58),vec2(0.03,0.03)));
    float base=min(sdBox(r-vec2(0.,0.03),vec2(0.13,0.05)), sdBox(r-vec2(0.,0.10),vec2(0.085,0.03)));
    d=min(min(min(post,arm),ring),base)*s; }
  // canto desgastado
  d += (fbm(q*vec2(38.,38.)+float(type)*7.,4)-0.5)*0.010*min(w,0.25)/0.12;
  return d;
}

// Piedra con volumen: bisel + relieve, luz de luna, musgo, liquen,
// grietas, chorreado e inscripcion.
vec3 stone(vec2 p, vec2 q, float d, vec2 grad, float w, float h, float seed, int type, float detail){
  float bev = 0.010 + w*0.05;
  float ht = sqrt(clamp(-d/bev,0.,1.));
  float bump = fbm(p*70.+seed,5)*0.6 + fbm(p*190.+seed,3)*0.4;
  vec2 g = -grad*(1.-ht)*2.2 + vec2(gn(p*120.+seed)-0.5, gn(p*120.+seed+5.)-0.5)*0.35*detail;
  vec3 n = normalize(vec3(g, 1.0));
  float dif = max(dot(n,L),0.);
  // albedo: gris piedra variando por lapida
  vec3 base = mix(vec3(0.42,0.41,0.44), vec3(0.47,0.44,0.38), h21(vec2(seed,1.)));
  base *= 0.75+0.45*bump;
  // chorreado vertical de suciedad
  float streak = fbm(vec2(q.x*55.+seed, q.y*4.),4);
  base *= 1.-0.35*smoothstep(0.5,0.8,streak)*smoothstep(h,0.,q.y);
  // musgo abajo y en recovecos, liquen en manchas
  float mossN = fbm(p*28.+seed*3.,5);
  float moss = smoothstep(0.45,0.70, mossN + (1.-q.y/max(h,0.01))*0.35 - 0.2)*detail;
  base = mix(base, vec3(0.16,0.24,0.10)*(0.7+0.6*bump), moss*0.85);
  float lich = smoothstep(0.70,0.78,fbm(p*45.+seed*9.,4))*detail;
  base = mix(base, vec3(0.62,0.62,0.42), lich*0.6);
  // grietas
  float cr = ridgeN(fbm(p*vec2(7.,10.)+seed*2.,5));
  float crack = smoothstep(0.975,0.995,cr)*detail*step(0.45,h21(vec2(seed,9.)));
  // inscripcion (lineas de texto grabadas) en lapidas lisas
  float ins = 0.;
  if((type==0||type==1||type==4) && detail>0.5){
    for(int r=0;r<4;r++){
      float ry = h*(0.58 - float(r)*0.09);
      float rw = w*(r==0?0.55:0.70);
      if(abs(q.y-ry)<h*0.022 && abs(q.x)<rw){
        float ch = floor((q.x+rw)/(w*0.11));
        float on = step(0.25, h21(vec2(ch+seed*3., float(r))));
        float cx = fract((q.x+rw)/(w*0.11));
        ins = max(ins, on*smoothstep(0.15,0.25,cx)*smoothstep(0.85,0.75,cx)*(1.-smoothstep(0.6,1.0,abs(q.y-ry)/(h*0.022))));
      }
    }
    if(type==4) ins *= step(q.y, h*0.50);
  }
  float ao = mix(0.35, 1.0, smoothstep(0.0, h*0.35, q.y)) * mix(0.7,1.0,ht);
  vec3 c = base*(0.20 + 0.95*dif*MOONC)*ao;
  c *= 1.-crack*0.75;
  c *= 1.-ins*0.65;
  c += base*MOONC*0.35*ins*smoothstep(0.,1.,dot(vec2(0.,-1.),normalize(grad+1e-5)));  // borde inferior del grabado con luz
  // brillo de canto del lado de la luna
  float rim = (1.-ht)*smoothstep(0.2,0.9,dot(normalize(-grad+1e-5), normalize(L.xy)));
  c += MOONC*rim*0.35;
  return c*0.13;   // noche: la piedra devuelve poca luz
}

// ---------------- escena cercana ----------------
// lapidas a mano para la composicion: (x, base, ancho, alto, tipo, inclinacion)
const int NN = 8;
vec4 nearA(int i){
  if(i==0) return vec4(-3.05, -0.70, 0.17, 0.55);
  if(i==1) return vec4(-2.20, -0.71, 0.13, 0.95);
  if(i==2) return vec4(-1.42, -0.69, 0.24, 0.62);
  if(i==3) return vec4(-0.35, -0.72, 0.19, 0.48);
  if(i==4) return vec4( 0.55, -0.70, 0.12, 0.85);
  if(i==5) return vec4( 1.35, -0.71, 0.21, 0.58);
  if(i==6) return vec4( 2.15, -1.04, 0.24, 1.10);
  return vec4( 3.05, -0.70, 0.18, 0.66);
}
vec2 nearB(int i){ // tipo, inclinacion
  if(i==0) return vec2(4., 0.05);
  if(i==1) return vec2(3., -0.10);
  if(i==2) return vec2(1., 0.02);
  if(i==3) return vec2(0., 0.12);
  if(i==4) return vec2(2., -0.03);
  if(i==5) return vec2(0., -0.07);
  if(i==6) return vec2(5., 0.06);
  return vec2(3., 0.14);
}
vec2 nearScene(vec2 p, out vec2 qo, out int ido){
  float d=1e3; ido=-1; qo=vec2(0.);
  for(int i=0;i<NN;i++){
    vec4 a=nearA(i); vec2 b=nearB(i);
    vec2 q=rot(b.y)*(p-a.xy);
    float di=tombShape(q,a.z,a.w,int(b.x));
    if(di<d){ d=di; ido=i; qo=q; }
  }
  return vec2(d, float(ido));
}
float groundNear(float x){ return -0.70 + 0.018*sin(x*1.3+0.4) + 0.012*gn(vec2(x*3.,1.)); }

vec4 plateNear(vec2 p){
  vec3 col=vec3(0.); float a=0.;
  // suelo: tierra, hojas secas, piedritas, pasto ralo; mas oscuro adelante
  float gy = groundNear(p.x);
  if(p.y < gy){
    float depth = clamp((gy-p.y)/0.6,0.,1.);
    float n1=fbm(p*vec2(9.,30.),6), n2=fbm(p*vec2(40.,90.),4);
    vec3 soil = mix(vec3(0.10,0.085,0.075), vec3(0.06,0.09,0.05), smoothstep(0.4,0.7,n1));
    soil *= 0.55+0.7*n2;
    float leaf = smoothstep(0.72,0.80,fbm(p*vec2(55.,120.)+3.,4));
    soil = mix(soil, vec3(0.20,0.11,0.05), leaf*0.7);
    float pebble = smoothstep(0.80,0.86,gn(p*vec2(70.,160.)));
    soil += vec3(0.10)*pebble;
    float lit = 0.25 + 0.75*exp(-abs(p.x-1.05)*0.7)*(1.-depth*0.6);
    col = soil*0.09*lit*mix(1.,0.35,depth);
    a=1.;
  }
  // lapidas
  vec2 q; int id;
  vec2 ds = nearScene(p,q,id);
  float d=ds.x;
  float e=0.0015;
  vec2 q2; int i2;
  vec2 grad = vec2(nearScene(p+vec2(e,0.),q2,i2).x-d, nearScene(p+vec2(0.,e),q2,i2).x-d)/e;
  float m = smoothstep(0.0012,-0.0012,d);
  if(m>0.){
    vec4 A=nearA(id); vec2 B=nearB(id);
    vec3 sc = stone(p,q,d,grad,A.z,A.w,float(id)*3.7+1.,int(B.x),1.0);
    col = mix(col, sc, m); a = max(a,m);
  }
  // sombra de contacto al pie de cada lapida
  for(int i=0;i<NN;i++){
    vec4 A=nearA(i);
    float s = exp(-pow((p.x-A.x-0.06)/(A.z*1.6),2.))*exp(-pow((p.y-A.y)/0.03,2.));
    col *= 1.-0.6*s*(1.-m);
  }
  // pasto en silueta: macollos al pie de las lapidas y adelante
  float bladeY = gy + 0.02*fbm(vec2(p.x*20.,0.),3);
  float k = p.x*260.;
  float bh = 0.020+0.05*pow(h21(vec2(floor(k),3.)),2.)*(0.6+0.8*gn(vec2(p.x*4.,2.)));
  float lean = (h21(vec2(floor(k),5.))-0.5)*0.6;
  float bx = fract(k + (p.y-bladeY)*lean*260.*1.5)-0.5;
  float blade = step(abs(bx), 0.22*(1.-(p.y-bladeY)/bh)) * step(bladeY-0.01,p.y) * step(p.y,bladeY+bh);
  // pasto alto delante del todo
  float fy = -1.18 + 0.05*gn(vec2(p.x*5.,9.));
  float k2 = p.x*140.;
  float fh = 0.08+0.14*pow(h21(vec2(floor(k2),7.)),1.5);
  float fx = fract(k2 + (p.y-fy)*(h21(vec2(floor(k2),8.))-0.5)*140.*1.2)-0.5;
  float fblade = step(abs(fx), 0.25*(1.-(p.y-fy)/fh)) * step(p.y, fy+fh);
  float gr = max(blade, fblade);
  col = mix(col, vec3(0.012,0.016,0.010), gr*0.95);
  a = max(a, gr);
  return vec4(col, a);
}

// ---------------- escena media ----------------
float hillY(float x, int i){ float fi=float(i);
  return H0 + 0.20 - fi*0.10 + 0.06*sin(x*(1.2+fi)+fi*4.0) + 0.04*gn(vec2(x*3.0,fi)); }
float groundMid(float x){ return H0 + 0.05*sin(x*1.7+1.3) + 0.03*sin(x*4.1); }

vec2 midTombs(vec2 p, out vec2 qo, out vec4 info){
  float cx=floor(p.x/cellW); float d=1e3; qo=vec2(0.); info=vec4(0.);
  for(int k=-1;k<=1;k++){
    float id=cx+float(k);
    if(h21(vec2(id,4.7))<0.30) continue;
    float w=cellW*(0.16+0.12*h21(vec2(id,1.3)));
    float h=cellW*(0.55+0.75*h21(vec2(id,9.1)));
    float base=groundMid((id+0.5)*cellW)-0.01;
    vec2 q=p-vec2((id+0.5+(h21(vec2(id,2.2))-0.5)*0.4)*cellW, base);
    q=rot((h21(vec2(id,7.7))-0.5)*0.35)*q;
    float r=h21(vec2(id,5.5));
    int type = r<0.45?0:(r<0.62?1:(r<0.74?2:(r<0.90?3:4)));
    float di=tombShape(q,w,h,type);
    if(di<d){ d=di; qo=q; info=vec4(w,h,id,float(type)); }
  }
  return vec2(d,0.);
}

vec4 plateMid(vec2 p){
  vec3 col=vec3(0.); float a=0.;
  if(midMode>=2){
    // solo las lapidas (o su orden de aparicion)
    vec2 q; vec4 info;
    float d=midTombs(p,q,info).x;
    float m=smoothstep(0.0012,-0.0012,d);
    if(midMode==3) return vec4(vec3(h21(vec2(info.z,31.0))), m);
    float e=0.0012; vec2 q2; vec4 i2;
    vec2 grad=vec2(midTombs(p+vec2(e,0.),q2,i2).x-d, midTombs(p+vec2(0.,e),q2,i2).x-d)/e;
    if(m>0.) return vec4(stone(p,q,d,grad,info.x,info.y,info.z*1.3+7.,int(info.w),0.75)*0.85, m);
    return vec4(0.);
  }
  // colinas
  for(int i=0;i<2;i++){
    float hy=hillY(p.x,i);
    float m=smoothstep(0.002,-0.002,p.y-hy);
    vec3 hc = mix(vec3(0.075,0.045,0.10), vec3(0.03,0.02,0.04), float(i));
    hc *= 0.7+0.6*fbm(p*vec2(6.,20.)+float(i)*5.,5);
    hc += vec3(0.95,0.65,0.45)*0.08*exp(-abs(p.y-hy)*90.)*exp(-abs(p.x-1.05)*0.8);
    col=mix(col,hc*0.6,m); a=max(a,m);
  }
  // matorrales en la colina
  float bush = fbm(vec2(p.x*6.,0.),4);
  float by = hillY(p.x,1) + 0.03*smoothstep(0.55,0.8,bush)*(0.5+0.5*gn(vec2(p.x*40.,p.y*40.)));
  float bm = smoothstep(0.002,-0.002,p.y-by)*step(hillY(p.x,1)-0.01,p.y);
  col=mix(col,vec3(0.02,0.018,0.025),bm); a=max(a,bm);
  // reja de hierro a tramos, con oxido
  float fBase = H0 + 0.035 + 0.025*sin(p.x*1.7+1.3);
  float seg = step(0.35, h21(vec2(floor(p.x/1.4),8.)));
  float fx=(fract(p.x/0.045)-0.5)*0.045;
  float tip=fBase+0.115+0.006*sin(floor(p.x/0.045)*2.3)-abs(fx)*3.0;
  float bar=max(abs(fx)-0.0032,max(fBase-p.y,p.y-tip));
  float rail=min(abs(p.y-fBase-0.088)-0.0035,abs(p.y-fBase-0.025)-0.0035);
  float fd=min(bar,rail);
  float fm=smoothstep(0.0012,-0.0012,fd)*seg;
  vec3 iron = mix(vec3(0.018,0.016,0.020), vec3(0.035,0.022,0.015), smoothstep(0.55,0.8,fbm(p*80.,3)));
  iron += vec3(0.80,0.74,0.86)*0.025*step(0.,fx)*step(fx,0.0032);
  col=mix(col,iron,fm); a=max(a,fm);
  // suelo delante de las lapidas
  float gy=groundMid(p.x);
  float gm=smoothstep(0.002,-0.002,p.y-gy);
  vec3 gc=vec3(0.03,0.025,0.035)*(0.6+0.7*fbm(p*vec2(10.,35.),5));
  col=mix(col,gc*0.6,gm); a=max(a,gm);
  // lapidas
  if(midMode==0){
  vec2 q; vec4 info;
  float d=midTombs(p,q,info).x;
  float e=0.0012; vec2 q2; vec4 i2;
  vec2 grad=vec2(midTombs(p+vec2(e,0.),q2,i2).x-d, midTombs(p+vec2(0.,e),q2,i2).x-d)/e;
  float m=smoothstep(0.0012,-0.0012,d);
  if(m>0.){
    vec3 sc=stone(p,q,d,grad,info.x,info.y,info.z*1.3+7.,int(info.w),0.75);
    col=mix(col,sc*0.85,m); a=max(a,m);
  }
  }
  // pasto al pie
  float k=p.x*300.;
  float bh=0.012+0.025*h21(vec2(floor(k),3.));
  float bx=fract(k)-0.5;
  float blade=step(abs(bx),0.25*(1.-(p.y-gy)/bh))*step(gy-0.004,p.y)*step(p.y,gy+bh);
  col=mix(col,vec3(0.012,0.012,0.016),blade); a=max(a,blade);
  return vec4(col,a);
}


// ================= 3D (trazado de rayos) =================
// Las lapidas como solidos: la silueta de siempre extruida con espesor,
// cantos redondeados y gastados, y la cara de arriba a la vista (la
// camara mira un poco hacia abajo). Salen el color SIN luz (albedo), el
// relieve (normal en espacio de vista: x derecha, y arriba, z hacia el
// que mira) y la oclusion; la luz la pone la escena en vivo.
const vec3 RD = vec3(0.0, -0.25, 0.968);
float solid(vec3 P, vec2 base, float tilt, float w, float h, int type, float seed, out vec2 qo){
  vec2 q = rot(tilt)*(P.xy-base);
  qo = q;
  float d2 = tombShape(q,w,h,type);
  float T = w*0.30 + 0.010;
  float r = min(0.010, w*0.07);
  vec2 dd = vec2(d2 + r, abs(P.z) - T + r);
  float d = length(max(dd,0.)) + min(max(dd.x,dd.y),0.) - r;
  // desgaste en 3D: picaduras y cantos comidos
  if(d < 0.02) d += (gn(q*vec2(45.,45.)+P.z*31.+seed)-0.5)*0.0035 + (gn(q*140.+P.z*90.+seed)-0.5)*0.0012;
  return d;
}
float nearSolid(vec3 P, out vec2 qo, out int ido){
  float d=1e3; ido=-1; qo=vec2(0.);
  for(int i=0;i<NN;i++){
    vec4 a=nearA(i); vec2 b=nearB(i);
    if(abs(P.x-a.x) > a.z*1.4+0.05) continue;
    vec2 q; float di=solid(P,a.xy,b.y,a.z,a.w,int(b.x),float(i)*3.7+1.,q);
    if(di<d){ d=di; ido=i; qo=q; }
  }
  return d;
}
float midSolid(vec3 P, out vec2 qo, out vec4 info){
  float cx=floor(P.x/cellW); float d=1e3; qo=vec2(0.); info=vec4(0.);
  for(int k=-1;k<=1;k++){
    float id=cx+float(k);
    if(h21(vec2(id,4.7))<0.30) continue;
    float w=cellW*(0.16+0.12*h21(vec2(id,1.3)));
    float h=cellW*(0.55+0.75*h21(vec2(id,9.1)));
    float base=groundMid((id+0.5)*cellW)-0.01;
    vec2 bxy=vec2((id+0.5+(h21(vec2(id,2.2))-0.5)*0.4)*cellW, base);
    float r=h21(vec2(id,5.5));
    int type = r<0.45?0:(r<0.62?1:(r<0.74?2:(r<0.90?3:4)));
    vec2 q; float di=solid(P,bxy,(h21(vec2(id,7.7))-0.5)*0.35,w,h,type,id*1.3+7.,q);
    if(di<d){ d=di; qo=q; info=vec4(w,h,id,float(type)); }
  }
  return d;
}
// marcha el rayo que pasa por el punto p de la lamina (en z = 0)
// devuelve s del impacto o -1
float march(vec2 p, int which, out vec3 P){
  vec3 ro = vec3(p,0.) - RD*0.6;
  float s=0.;
  for(int i=0;i<90;i++){
    P = ro + RD*s;
    vec2 q; int id; vec4 inf;
    float d = which==0 ? nearSolid(P,q,id) : midSolid(P,q,inf);
    if(d<0.0004) return s;
    s += max(d*0.8, 0.0006);
    if(s>1.2) break;
  }
  return -1.;
}
vec3 normalAt(vec3 P, int which){
  vec2 e=vec2(0.0008,0.); vec2 q; int id; vec4 inf;
  #define SD(X) (which==0 ? nearSolid(X,q,id) : midSolid(X,q,inf))
  vec3 n = vec3(SD(P+e.xyy)-SD(P-e.xyy), SD(P+e.yxy)-SD(P-e.yxy), SD(P+e.yyx)-SD(P-e.yyx));
  #undef SD
  n = normalize(n);
  return vec3(n.x, n.y, -n.z);   // z hacia el que mira
}
// albedo de la piedra (sin luz) y su relieve fino (gradiente de altura)
vec3 stoneAlbedo(vec3 P, vec2 q, vec3 n, float w, float h, float seed, int type, float detail, out vec2 bumpG){
  // cara del frente o de arriba/costado: coordenadas de textura
  vec2 tp = abs(n.z)>0.6 ? q : vec2(q.x + P.z*0.7, q.y*0.3 + P.z*2.0);
  float bump = fbm(tp*70.+seed,5)*0.6 + fbm(tp*190.+seed,3)*0.4;
  float e=0.003;
  bumpG = vec2(fbm((tp+vec2(e,0.))*38.+seed,4)-fbm((tp-vec2(e,0.))*38.+seed,4), fbm((tp+vec2(0.,e))*38.+seed,4)-fbm((tp-vec2(0.,e))*38.+seed,4))*0.9*detail;
  vec3 base = mix(vec3(0.42,0.41,0.44), vec3(0.47,0.44,0.38), h21(vec2(seed,1.)));
  base *= 0.75+0.45*bump;
  float streak = fbm(vec2(q.x*55.+seed, q.y*4.),4);
  base *= 1.-0.35*smoothstep(0.5,0.8,streak)*smoothstep(h,0.,q.y);
  float mossN = fbm(tp*28.+seed*3.,5);
  // el musgo crece abajo y ARRIBA (donde junta agua), no en el frente liso
  float topK = smoothstep(0.3,0.8,n.y);
  float moss = smoothstep(0.45,0.70, mossN + (1.-q.y/max(h,0.01))*0.35 - 0.2 + topK*0.35)*detail;
  base = mix(base, vec3(0.16,0.24,0.10)*(0.7+0.6*bump), moss*0.85);
  float lich = smoothstep(0.70,0.78,fbm(tp*45.+seed*9.,4))*detail;
  base = mix(base, vec3(0.62,0.62,0.42), lich*0.6);
  float cr = ridgeN(fbm(tp*vec2(7.,10.)+seed*2.,5));
  float crack = smoothstep(0.975,0.995,cr)*detail*step(0.45,h21(vec2(seed,9.)));
  base *= 1.-crack*0.85;
  // inscripcion grabada (solo en el frente): oscura y con relieve
  if((type==0||type==1||type==4) && detail>0.5 && n.z>0.6){
    for(int r=0;r<4;r++){
      float ry = h*(0.58 - float(r)*0.09);
      float rw = w*(r==0?0.55:0.70);
      if(abs(q.y-ry)<h*0.022 && abs(q.x)<rw){
        float ch = floor((q.x+rw)/(w*0.11));
        float on = step(0.25, h21(vec2(ch+seed*3., float(r))));
        float cx = fract((q.x+rw)/(w*0.11));
        float yy = (q.y-ry)/(h*0.022);
        float ins = on*smoothstep(0.15,0.25,cx)*smoothstep(0.85,0.75,cx)*(1.-smoothstep(0.6,1.0,abs(yy)));
        if(type==4 && q.y>h*0.50) ins=0.;
        base *= 1.-ins*0.6;
        bumpG += vec2(0., -sign(yy)*ins*0.8);       // el surco: bordes de arriba y abajo inclinados
      }
    }
  }
  return base;
}
// lamina 3D: modo 0 albedo (y A cobertura), 1 normal/oclusion/orden
vec4 plate3D(vec2 p, int which, int mode){
  vec3 P;
  float s = march(p, which, P);
  if(s < 0.){
    return vec4(0.5,0.5,1.,0.)*float(mode==1);
  }
  vec3 n = normalAt(P, which);
  vec2 q; int id; vec4 inf; float w,h,seed; int type; float detail;
  if(which==0){ nearSolid(P,q,id); vec4 A=nearA(id); vec2 B=nearB(id); w=A.z; h=A.w; seed=float(id)*3.7+1.; type=int(B.x); detail=1.; }
  else { midSolid(P,q,inf); w=inf.x; h=inf.y; seed=inf.z*1.3+7.; type=int(inf.w); detail=0.75; }
  vec2 bg;
  vec3 alb = stoneAlbedo(P,q,n,w,h,seed,type,detail,bg);
  // oclusion: cerca del suelo y en los recovecos (dos muestras a lo largo de la normal)
  vec2 q2; int i2; vec4 inf2;
  vec3 nw = vec3(n.x,n.y,-n.z);
  float o1 = which==0 ? nearSolid(P+nw*0.01,q2,i2) : midSolid(P+nw*0.01,q2,inf2);
  float o2 = which==0 ? nearSolid(P+nw*0.03,q2,i2) : midSolid(P+nw*0.03,q2,inf2);
  float ao = clamp(0.45 + 0.55*(o1/0.01*0.4 + o2/0.03*0.6), 0., 1.);
  ao *= mix(0.40, 1.0, smoothstep(0.0, h*0.35, q.y));
  vec3 nb = normalize(n + vec3(-bg, 0.)*0.35);
  if(mode==1){
    float ord = which==1 ? h21(vec2(inf.z,31.0)) : 0.;
    return vec4(nb.xy*0.5+0.5, which==1 ? ord : ao, 1.);   // A = hay lapida
  }
  // el albedo va con la oclusion de la lapida del medio (la del cercano va en B)
  return vec4(alb*0.13*(which==1 ? ao*0.85 : 1.), 1.);
}

// ---------------- escena lejana ----------------
// R: luz, G: 0 sierra lejana / 1 sierra de pinos, A: cobertura
vec4 plateFar(vec2 p){
  float r2 = H0+0.40+0.06*sin(p.x*0.6+2.0)+0.05*gn(vec2(p.x*1.3,8.));
  float ridgeY = H0+0.30+0.07*sin(p.x*0.9+1.0)+0.04*gn(vec2(p.x*2.0,3.0));
  vec4 o=vec4(0.);
  float m2=smoothstep(0.002,-0.002,p.y-r2-0.01*fbm(vec2(p.x*12.,0.),3));
  o=mix(o,vec4(0.55+0.3*fbm(p*8.,4),0.,0.,1.),m2);
  // pinos por pisos con ramas finas
  float best=1e3;
  for(int k=-1;k<=1;k++){
    float c=floor(p.x*24.)+float(k);
    float hT=(0.045+0.075*h21(vec2(c,1.)))*step(0.18,h21(vec2(c,2.)));
    if(hT<0.01) continue;
    float cx=(c+0.5+(h21(vec2(c,4.))-0.5)*0.5)/24.;
    float yy=(p.y-ridgeY)/hT;
    float hw=(0.42/24.)*(1.-yy)*(0.65+0.35*fract(yy*5.+h21(vec2(c,3.))));
    hw *= 0.85+0.3*gn(vec2(p.y*400.,c));
    float dd=max(abs(p.x-cx)-hw, max(-yy,yy-1.)*hT);
    best=min(best,dd);
  }
  float pineD=min(best, p.y-ridgeY);
  // capilla con campanario, cruz y ventanas
  vec2 cq=p-vec2(-0.90, ridgeY-0.01);
  float ch=sdBox(cq-vec2(0.,0.05),vec2(0.075,0.05));
  ch=min(ch,max(abs(cq.x)*1.1+(cq.y-0.10)-0.08,0.10-cq.y));
  ch=min(ch,sdBox(cq-vec2(-0.05,0.13),vec2(0.016,0.07)));
  ch=min(ch,max(abs(cq.x+0.05)*3.0+(cq.y-0.20)-0.07,0.20-cq.y));
  ch=min(ch,min(sdBox(cq-vec2(-0.05,0.295),vec2(0.0025,0.022)),sdBox(cq-vec2(-0.05,0.302),vec2(0.011,0.0025))));
  float fd=min(pineD,ch);
  float m=smoothstep(0.0015,-0.0015,fd);
  o=mix(o,vec4(0.45+0.4*fbm(p*14.,4),1.,0.,1.),m);
  // B: ventanas de la capilla (la vela se enciende en vivo)
  float win=min(sdBox(cq-vec2(0.022,0.045),vec2(0.010,0.018)), sdBox(cq-vec2(-0.03,0.045),vec2(0.008,0.015)));
  win=min(win, length(cq-vec2(-0.05,0.16))-0.006);
  o.b = smoothstep(0.0012,-0.0012,win);
  return o;
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  vec4 c;
  if(plate==0){ c = plateFar(p); fc = vec4(c.rgb, c.a); return; }
  // 3D: 3 = cercana albedo, 4 = cercana normal + oclusion,
  //     5 = lapidas del medio albedo, 6 = su normal + orden
  if(plate>=3){
    int which = plate<=4 ? 0 : 1;
    int mode = (plate==4||plate==6) ? 1 : 0;
    c = plate3D(p, which, mode);
    if(mode==1){ fc = c; return; }
    if(which==0){
      // la cercana: suelo y pasto de siempre (con su luz horneada), lapidas 3D encima
      vec4 base = plateNear(p);
      vec3 P; float s = march(p, 0, P);
      if(s>=0.){ fc = vec4(pow(clamp(c.rgb*2.0,0.,1.),vec3(1./2.2)), 1.); return; }
      c = base;
    }
  } else
  if(plate==1) c = plateMid(p); else c = plateNear(p);
  // codificacion: col lineal x2 con gamma 2.2 (ver plateCol() en la escena)
  fc = vec4(pow(clamp(c.rgb*2.0,0.,1.),vec3(1./2.2)), c.a);
}
"""

NOISE_FRAG = r"""#version 330
in vec2 vUV; out vec4 fc;
uniform vec2 texRes;
vec2 h22(vec2 p){ vec3 a=fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a+=dot(a,a+34.45); return fract(vec2(a.x*a.y,a.y*a.z)); }
// ruido de gradiente periodico (P celdas): la textura se repite sin costura
float gp(vec2 p, vec2 P){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(mod(i,P))-.5,f), b=dot(h22(mod(i+vec2(1,0),P))-.5,f-vec2(1,0));
  float c=dot(h22(mod(i+vec2(0,1),P))-.5,f-vec2(0,1)), d=dot(h22(mod(i+vec2(1,1),P))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fp(vec2 p, vec2 P, int o){ float s=0.,a=.5,n=0.; for(int i=0;i<9;i++){ if(i>=o)break; s+=a*gp(p,P); n+=a; a*=.5; p*=2.; P*=2.; } return s/n; }
void main(){
  vec2 P = vec2(8., 4.);
  vec2 p = vUV*P;
  // nubes: dominio deformado, 8 octavas
  vec2 w = vec2(fp(p+3.1,P,4), fp(p+7.7,P,4));
  float clouds = fp(p + (w-0.5)*1.8, P, 8);
  // niebla A y B: volutas suaves con deformacion
  vec2 w2 = vec2(fp(p*1.0+1.3,P,3), fp(p*1.0+9.2,P,3));
  float fogA = fp(p + (w2-0.5)*2.2 + 5.0, P, 7);
  float fogB = fp(p*1.0 + (w-0.5)*1.2 + 11.0, P, 6);
  float fine = fp(p*2.0+17.0, P*2., 5);
  fc = vec4(clouds, fogA, fogB, fine);
}
"""

MOON_FRAG = r"""#version 330
in vec2 vUV; out vec4 fc;
vec2 h22(vec2 p){ vec3 a=fract(vec3(p.xyx)*vec3(123.34,234.34,345.65)); a+=dot(a,a+34.45); return fract(vec2(a.x*a.y,a.y*a.z)); }
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float gn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  float a=dot(h22(i)-.5,f), b=dot(h22(i+vec2(1,0))-.5,f-vec2(1,0));
  float c=dot(h22(i+vec2(0,1))-.5,f-vec2(0,1)), d=dot(h22(i+vec2(1,1))-.5,f-vec2(1,1));
  return clamp(0.5+1.6*mix(mix(a,b,u.x),mix(c,d,u.x),u.y),0.,1.); }
float fbm(vec2 p,int o){ float s=0.,a=.5,n=0.; for(int i=0;i<10;i++){ if(i>=o)break; s+=a*gn(p); n+=a; a*=.5; p=mat2(.8,-.6,.6,.8)*p*2.03+11.3; } return s/n; }
void main(){
  vec2 p = vUV*2.0-1.0;
  float r = length(p);
  if(r>1.0){ fc=vec4(0.); return; }
  float limb = sqrt(1.0-r*r);
  // mares (zonas oscuras grandes)
  float maria = fbm(p*1.6+3.1,7);
  float sea = smoothstep(0.50,0.62,maria);
  float lum = mix(0.92, 0.55, sea);
  lum *= 0.85+0.25*fbm(p*9.,6);
  // crateres con borde iluminado
  for(int i=0;i<40;i++){
    vec2 c = (h22(vec2(float(i),3.))*2.-1.)*0.85;
    float cr = 0.02+0.13*pow(h21(vec2(float(i),7.)),3.);
    vec2 d = p-c; float dl=length(d);
    float inside = smoothstep(cr,cr*0.85,dl);
    float rimL = exp(-pow((dl-cr)/(cr*0.18),2.));
    float sideL = dot(normalize(d+1e-5), normalize(vec2(-0.5,0.6)));
    lum *= 1.0 - inside*0.18;
    lum += rimL*0.10*sideL;
  }
  // rayos del crater Tycho
  vec2 ty=p-vec2(-0.25,-0.55);
  float ang=atan(ty.y,ty.x);
  lum += 0.10*pow(gn(vec2(ang*9.,1.)),6.)*exp(-length(ty)*2.2);
  lum *= 0.45+0.55*limb;
  float a = smoothstep(1.0,0.985,r);
  fc = vec4(vec3(clamp(lum,0.,1.)), a);
}
"""


def bake():
    import moderngl
    ctx = moderngl.create_standalone_context(backend='egl', require=330)
    vbo = ctx.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    os.makedirs(OUT, exist_ok=True)

    def run(src, w, h, uniforms):
        prog = ctx.program(vertex_shader=VERT, fragment_shader=src)
        vao = ctx.simple_vertex_array(prog, vbo, 'in_pos')
        for k, v in uniforms.items():
            if k in prog:
                prog[k].value = v
        fbo = ctx.simple_framebuffer((w, h), components=4, dtype='f4')
        fbo.use()
        fbo.clear(0, 0, 0, 0)
        vao.render(mode=moderngl.TRIANGLE_STRIP)
        data = np.frombuffer(fbo.read(components=4, dtype='f4'), 'f4').reshape(h, w, 4)[::-1]
        for o in (vao, prog, fbo):
            o.release()
        return data

    def down(img, f):
        # promedio con alfa premultiplicado (bordes limpios)
        h, w = img.shape[0] // f, img.shape[1] // f
        a = img[..., 3:4]
        pm = np.concatenate([img[..., :3] * a, a], -1)
        pm = pm[:h * f, :w * f].reshape(h, f, w, f, 4).mean((1, 3))
        rgb = pm[..., :3] / np.maximum(pm[..., 3:4], 1e-5)
        return np.concatenate([rgb, pm[..., 3:4]], -1)

    def save(img, name):
        im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
        im.save(os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, im.size)

    src = FRAG % dict(h0=H0)
    for old in ('2_medio_pocas', '3_medio_muchas', '7_lapidas_orden'):
        if os.path.isfile(os.path.join(OUT, old + '.png')):
            os.remove(os.path.join(OUT, old + '.png'))
    for name, pid, (y0, y1), _, cell, mode in PLATES:
        h = int(round(W * (y1 - y0) / (X1 - X0)))
        img = run(src, W * SS, h * SS, dict(plate=pid, rect=(X0, y0, X1, y1), cellW=cell, midMode=mode))
        save(down(img, SS), name)
    # textura de ruido (se repite): 1024 x 512
    save(run(NOISE_FRAG, 1024, 512, {}), '5_ruido')
    # luna 256 x 256 (en pantalla mide ~120 px; deja lugar en el atlas al relieve)
    save(down(run(MOON_FRAG, 1024, 1024, {}), 4), '6_luna')
    print('-> ' + OUT)
    for name, pid, (y0, y1), _, cell, mode in PLATES:
        print('  %s: x %.2f..%.2f  y %.3f..%.3f' % (name, X0, X1, y0, y1))


if __name__ == '__main__':
    bake()
