"""Hornea las laminas de la escena 29 de Halloween (la morgue).

Sala de autopsias en perspectiva de un punto, hecha por trazado de rayos:
azulejos blancos-verdosos con junta sucia, la pared izquierda de cajones
refrigerados de acero con manija y etiqueta, la puerta de salida al fondo
a la derecha, piso de baldosas con desague, techo con las monturas de los
tubos, y dos mesas de acero con patas y un cuerpo bajo la sabana. Sin la
luz de los tubos: esa va en vivo (la escena sabe la profundidad de cada
pixel y calcula la luz de cada tubo sobre el punto real).

La geometria sale del MISMO bloque GLSL que usa la escena (entre
"// >>> MORGUE_GEOM" y "// <<< MORGUE_GEOM" en scene29_morgue.frag).

Laminas:
  1_sala    albedo (lineal x2, gamma 2.2), A = 1
  2_marcas  R sabana, G metal o mojado (brillo de los tubos), B
            profundidad z / 6, A = 1
  3_ruido   el ruido que se repite de la escena 00 (vapor, sangre)

uso: python3 td/tools/bake_plates_morgue.py   (despues: build_atlas.py)
"""
import os
import re
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SET = os.path.join(os.path.dirname(HERE), 'sets', 'halloween')
SETS = os.path.join(SET, 'plates')
OUT = os.path.join(SETS, 'scene29')
FRAG = os.path.join(SET, 'visuals', 'scene29_morgue.frag')
SS = 2
R = (-3.4, -1.25, 3.4, 1.25)
W, H = 1280, 470
PLATES = [('1_sala', 0), ('2_marcas', 1)]

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

// rayo desde la camara (0,0,0) con direccion (dx, dy, 1): el punto a
// profundidad z es d*z. Caja alineada: devuelve z de entrada o 1e3.
float boxZ(vec3 d, vec3 lo, vec3 hi){
  vec3 inv=1./d;
  vec3 t0=lo*inv, t1=hi*inv;
  vec3 tmin=min(t0,t1), tmax=max(t0,t1);
  float a=max(max(tmin.x,tmin.y),tmin.z), b=min(min(tmax.x,tmax.y),tmax.z);
  return (b>=a&&a>0.)?a:1e3;
}
// altura de la sabana sobre la tapa (u -1..1 a lo ancho, v 0..1 a lo largo, 1 = cabecera)
float sheetH(float u, float v){
  float body=exp(-u*u*3.0)*(0.11+0.06*exp(-pow((v-0.58)/0.16,2.))+0.03*exp(-pow((v-0.32)/0.12,2.)));
  float head=0.15*exp(-(u*u*7.+pow((v-0.88)/0.08,2.)));
  float feet=0.13*(exp(-((u-0.3)*(u-0.3)*30.+pow((v-0.05)/0.05,2.)))+exp(-((u+0.3)*(u+0.3)*30.+pow((v-0.05)/0.05,2.))));
  float drape=0.012*smoothstep(1.1,0.6,abs(u));
  return max(max(body,head),feet)+drape+0.004*gn(vec2(u*20.,v*40.));
}

vec3 tiles(vec2 q, float seed){
  vec2 g=q*vec2(12.,12.); vec2 f=fract(g); vec2 id=floor(g);
  float grout=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
  vec3 c=vec3(0.42,0.47,0.42)*(0.85+0.15*h21(id+seed));
  c*=0.8+0.25*fbm(q*6.+seed,4);
  c=mix(c,vec3(0.22,0.24,0.18),smoothstep(0.05,0.02,grout));            // junta sucia
  c*=1.-0.35*smoothstep(0.55,0.85,fbm(vec2(q.x*3.,q.y*0.8)+seed,5));    // manchas de humedad
  return c;
}
vec3 steel(vec2 q, float seed){
  float brush=0.75+0.25*gn(vec2(q.x*2.,q.y*120.)+seed);
  return vec3(0.42,0.44,0.46)*brush*(0.8+0.3*fbm(q*5.+seed,3));
}

void main(){
  vec2 p=mix(rect.xy,rect.zw,vUV);
  vec3 d=vec3(p-MG_VP,1.);
  // superficies de la sala
  float z=MG_ZB; int id=4;
  if(d.y<0.){ float zz=MG_HF/(-d.y); if(zz<z){ z=zz; id=0; } }
  if(d.y>0.){ float zz=MG_HC/d.y; if(zz<z){ z=zz; id=1; } }
  if(d.x<0.){ float zz=MG_WC/(-d.x); if(zz<z){ z=zz; id=2; } }
  if(d.x>0.){ float zz=MG_WC/d.x; if(zz<z){ z=zz; id=3; } }
  // mesas: tapa, patas y la sabana
  float sheet=0.;
  for(int k=0;k<2;k++){
    vec4 T=MG_TABLE[k];
    float zt=boxZ(d,vec3(T.x-MG_TW,T.w-0.04,T.y),vec3(T.x+MG_TW,T.w,T.z));
    if(zt<z){ z=zt; id=10; }
    for(int l=0;l<4;l++){
      float lx=T.x+(l<2?-1.:1.)*(MG_TW-0.04), lz=(l==0||l==2)?T.y+0.06:T.z-0.06;
      float zl=boxZ(d,vec3(lx-0.022,-MG_HF,lz-0.022),vec3(lx+0.022,T.w,lz+0.022));
      if(zl<z){ z=zl; id=11; }
    }
    // bandeja de abajo
    float zb=boxZ(d,vec3(T.x-MG_TW+0.04,-0.72,T.y+0.05),vec3(T.x+MG_TW-0.04,-0.70,T.z-0.05));
    if(zb<z){ z=zb; id=11; }
    // sabana: marcha a lo largo del rayo sobre la tapa
    for(int s=0;s<90;s++){
      float zs=mix(T.y-0.05,T.z+0.05,float(s)/89.);
      if(zs>z) break;
      vec3 P=d*zs;
      float u=(P.x-T.x)/MG_TW, v=(P.z-T.y)/(T.z-T.y);
      if(abs(u)<1.08&&v>-0.02&&v<1.02&&P.y<T.w+sheetH(u,v)&&P.y>T.w-0.03){ z=zs; id=12; sheet=1.; break; }
    }
  }
  vec3 X=d*z;
  vec3 c; float metal=0.;
  if(id==0){
    c=tiles(X.xz*vec2(0.55,0.55),3.)*vec3(0.75,0.78,0.80);
    vec2 dq=X.xz-vec2(0.55,2.15);                                         // desague
    float dr=length(dq);
    if(dr<0.09){ c=vec3(0.08)*(0.6+0.6*step(0.5,fract(dq.x*40.))); }
    c*=0.85+0.3*smoothstep(0.9,0.1,dr*0.4);
    metal=0.35*smoothstep(0.5,0.8,fbm(X.xz*1.5,4))+0.1;                 // piso mojado
  } else if(id==1){
    c=vec3(0.30,0.31,0.30)*(0.7+0.3*fbm(X.xz*3.,4));
    for(int i=0;i<4;i++){
      vec2 q=vec2(X.x-0.20,X.z-MG_TUBE[i]);
      if(abs(q.x)<0.40&&abs(q.y)<0.07){ c=vec3(0.45,0.46,0.45); metal=0.5; }
    }
  } else if(id==2){
    // pared de cajones
    c=steel(vec2(X.z,X.y),1.)*0.8;
    metal=0.8;
    float cz=clamp(floor((X.z-0.95)/0.52),0.,4.), cr=clamp(floor((X.y+0.86)/0.42),0.,2.);
    vec4 dr=mgDrawer(int(cz),int(cr));
    bool inD=X.z>dr.x&&X.z<dr.y&&X.y>dr.z&&X.y<dr.w;
    if(X.z<0.90||X.z>3.60||X.y>0.42){ c=tiles(vec2(X.z,X.y),5.); metal=0.05; }
    else if(inD){
      vec2 q=vec2((X.z-(dr.x+dr.y)*0.5)/0.22,(X.y-(dr.z+dr.w)*0.5)/0.18);
      c=steel(q,cz*3.+cr);
      float edge=max(abs(q.x),abs(q.y));
      c*=0.8+0.3*smoothstep(0.92,0.85,edge);
      if(abs(q.y-0.1)<0.12&&abs(q.x)<0.45){ c=vec3(0.55,0.56,0.58); }  // manija
      if(abs(q.x+0.6)<0.18&&abs(q.y+0.55)<0.14){ c=vec3(0.75,0.72,0.62)*(0.8+0.2*h21(vec2(cz,cr))); metal=0.; } // etiqueta
    } else { c=vec3(0.05); metal=0.2; }
  } else if(id==3){
    c=tiles(vec2(X.z,X.y),7.);
    // puerta de salida
    if(X.z>3.20&&X.z<3.80&&X.y<0.12){
      c=vec3(0.22,0.26,0.24)*(0.8+0.3*fbm(vec2(X.z*8.,X.y*3.),4));
      if(abs(X.y+0.35)<0.02&&X.z>3.66) c=vec3(0.5);
      if(abs(X.z-3.50)<0.25&&X.y>-0.05&&X.y<0.08) c=vec3(0.05,0.07,0.07);
    }
    // cartel SALIDA sobre la puerta (la luz roja va en vivo)
    if(abs(X.z-3.50)<0.14&&abs(X.y-0.30)<0.05) c=vec3(0.35,0.06,0.05);
    // pileta y mesada
    if(X.z>1.2&&X.z<2.4&&X.y<-0.20&&X.y>-0.30){ c=steel(vec2(X.z,X.y),9.); metal=0.7; }
    if(X.z>1.2&&X.z<2.4&&X.y<-0.30){ c=vec3(0.10,0.11,0.11)*(0.8+0.2*step(0.5,fract(X.z*4.))); }
  } else if(id==4){
    c=tiles(X.xy,9.);
  } else if(id==10){
    c=steel(X.xz,2.)*1.1; metal=0.9;
  } else if(id==11){
    c=steel(X.xy,4.)*0.6; metal=0.6;
  } else {
    // la sabana: tela con pliegues
    vec4 T=X.z<2.15?MG_TABLE[0]:MG_TABLE[1];
    float u=(X.x-T.x)/MG_TW, v=(X.z-T.y)/(T.z-T.y);
    float fold=0.85+0.15*sin(u*14.+sin(v*9.)*2.)+0.05*gn(vec2(u*30.,v*60.));
    float hh=sheetH(u,v);
    float slope=sheetH(u+0.05,v)-sheetH(u-0.05,v)+ (sheetH(u,v+0.03)-sheetH(u,v-0.03))*1.5;
    c=vec3(0.80,0.82,0.80)*fold*(0.55+0.45*smoothstep(0.0,0.15,hh))*(0.85-slope*4.0);
    // una mano que asoma en la mesa del fondo, y una etiqueta en el pie
    if(T.x>0.5&&u>0.95&&abs(v-0.55)<0.06) c=vec3(0.55,0.58,0.55);
    if(T.x<0.5&&abs(u-0.3)<0.08&&v<0.03&&v>-0.02) c=vec3(0.75,0.72,0.62);
  }
  // oclusion en esquinas y con la distancia
  float ao=1.;
  if(id<5){
    ao*=0.65+0.35*smoothstep(0.,0.18,min(abs(X.y+MG_HF),abs(MG_HC-X.y)));
    ao*=0.65+0.35*smoothstep(0.,0.18,MG_WC-abs(X.x));
    // sombra bajo las mesas
    for(int k=0;k<2;k++){
      vec4 T=MG_TABLE[k];
      if(id==0){ vec2 q=vec2((X.x-T.x)/(MG_TW+0.1),(X.z-(T.y+T.z)*0.5)/((T.z-T.y)*0.5+0.1)); ao*=1.-0.55*smoothstep(1.2,0.6,max(abs(q.x),abs(q.y))); }
    }
  }
  c*=ao;
  if(plate==1){ fc=vec4(sheet,metal,clamp(z/6.,0.,1.),1.); return; }
  fc=vec4(pow(clamp(c*2.,0.,1.),vec3(1./2.2)),1.);
}
"""


def geom_block():
    with open(FRAG, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'// >>> MORGUE_GEOM.*?\n(.*?)// <<< MORGUE_GEOM', src, re.S)
    if not m:
        raise SystemExit('no encuentro el bloque MORGUE_GEOM en ' + FRAG)
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
        img = img.reshape(H, SS, W, SS, 4).mean((1, 3))
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (W, H))
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '3_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
