"""Hornea las laminas de la escena 01 de Halloween (Jack O'Lantern).

Lo quieto con todo el detalle: pared de tablones con ventana y
telaranas, mesa de madera en perspectiva, calabazas, calabacitas, velas
con chorreado de cera y libros, y la calabaza principal (color y
relieve por separado para iluminarla en vivo). Ver docs/53.

uso: python3 td/tools/bake_plates_calabaza.py
"""
import os
import shutil

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SETS = os.path.join(os.path.dirname(HERE), 'sets', 'halloween', 'plates')
OUT = os.path.join(SETS, 'scene01')
SS = 2

# encuadres (coinciden con scene01_calabaza.frag)
X0, X1 = -3.2, 3.2
PLATES = [
    ('1_pared', 0, (X0, -0.62, X1, 1.25), 1280, 380),
    ('2_mesa', 1, (X0, -1.25, X1, -0.48), 1280, 300),
    ('3_objetos', 2, (X0, -0.80, X1, 0.25), 1280, 420),
    ('4_calabaza_color', 3, (-0.85, -0.62, 0.85, 0.80), 1024, 856),
    ('5_calabaza_relieve', 4, (-0.85, -0.62, 0.85, 0.80), 1024, 856),
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
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
vec3 hsv(vec3 c){ vec3 r=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z*mix(vec3(1.),r,c.y); }
const vec3 L = normalize(vec3(-0.55, 0.45, 0.70));     // luz de la ventana (arriba izquierda)
vec4 enc(vec3 c, float a){ return vec4(pow(clamp(c,0.,1.),vec3(1./2.2)), a); }

// ---------------- pared ----------------
vec4 wall(vec2 p){
  float pw=0.22;
  float id=floor(p.x/pw);
  float fx=fract(p.x/pw);
  float gap=smoothstep(0.0,0.03,fx)*smoothstep(1.0,0.97,fx);
  float shade=0.75+0.35*h21(vec2(id,1.));
  float grain=fbm(vec2(p.x*60.+id*13., p.y*3.),6);
  float rings=0.5+0.5*sin((p.x*90.+fbm(vec2(p.x*8.,p.y*1.5+id),4)*14.)+id*7.);
  vec3 wood=mix(vec3(0.20,0.12,0.07),vec3(0.33,0.21,0.12),grain)*(0.80+0.25*rings)*shade;
  // manchas de humedad, desgaste y nudos
  wood*=0.7+0.4*fbm(p*vec2(3.,1.2)+id,5);
  vec2 kn=vec2(fract(p.x/pw)-0.5, fract(p.y*0.9+h21(vec2(id,4.)))-0.5);
  float knot=exp(-dot(kn*vec2(9.,5.),kn*vec2(9.,5.)))*step(0.6,h21(vec2(id,floor(p.y*0.9+h21(vec2(id,4.))))));
  wood*=1.-knot*0.6;
  // clavos
  float nail=0.;
  for(int k=0;k<2;k++){ vec2 np=vec2((id+0.5)*pw, -0.30+float(k)*1.15+h21(vec2(id,float(k)))*0.05);
    nail=max(nail, smoothstep(0.012,0.006,length(p-np))); }
  wood=mix(wood,vec3(0.05,0.045,0.04),nail);
  vec3 col=wood*gap+vec3(0.015,0.01,0.008)*(1.-gap);
  float a=1.;
  // ventana: marco, travesanos, alfeizar; vidrios transparentes
  vec2 wc=vec2(-1.55,0.30); vec2 wh=vec2(0.42,0.50);
  vec2 wq=p-wc;
  float outer=sdBox(wq,wh+0.07);
  float inner=sdBox(wq,wh);
  if(outer<0.){
    float frame=max(outer,-inner);
    float mull=min(abs(wq.x)-0.022, abs(wq.y-0.05)-0.022);
    float wf=min(frame, max(mull,inner));
    float fm=smoothstep(0.002,-0.002,wf);
    vec3 fw=vec3(0.16,0.10,0.06)*(0.6+0.6*fbm(wq*vec2(40.,8.),5));
    // biselado del marco
    fw*=0.8+0.4*smoothstep(-0.03,0.0,-abs(frame+0.035));
    col=mix(vec3(0.),fw,fm);
    a=fm;
  }
  // alfeizar
  float sill=sdBox(p-vec2(wc.x,wc.y-wh.y-0.10),vec2(wh.x+0.12,0.025));
  float sm=smoothstep(0.002,-0.002,sill);
  col=mix(col,vec3(0.22,0.14,0.08)*(0.7+0.5*fbm(p*vec2(30.,90.),4)),sm); a=max(a,sm);
  // sombra bajo el alfeizar
  col*=1.-0.5*exp(-pow((p.y-(wc.y-wh.y-0.13))/0.03,2.))*step(abs(p.x-wc.x),wh.x+0.12)*(1.-sm);
  // telaranas en las esquinas de arriba
  for(int s=0;s<2;s++){
    vec2 c0 = s==0 ? vec2(-3.2,1.25) : vec2(3.2,1.25);
    vec2 d=p-c0; d.x*= s==0 ? 1. : -1.;
    float r=length(d); float ang=atan(-d.y,d.x);
    if(r<1.1 && ang>0. && ang<1.5708){
      float spokes=abs(fract(ang/1.5708*7.)-0.5)*1.5708/7.*r;
      float ring=abs(fract(r*9.+0.15*sin(ang*7.))-0.5)/9.;
      float th=min(spokes,ring);
      float web=smoothstep(0.0025,0.0005,th)*smoothstep(1.1,0.3,r)*(0.6+0.4*h21(vec2(floor(r*9.),floor(ang*4.45))));
      col=mix(col,vec3(0.55,0.53,0.50),web*0.55*a);
    }
  }
  // oscurece hacia arriba y abajo (la luz esta en el centro)
  col*=mix(0.55,1.0,smoothstep(1.25,0.2,p.y));
  return enc(col,a);
}

// ---------------- mesa ----------------
vec4 table(vec2 p){
  float back=-0.50;
  if(p.y>back) return vec4(0.);
  float z=1.0/((back-p.y)+0.12);
  float u=p.x*z*0.55;
  float id=floor(u);
  float fu=fract(u);
  float seam=smoothstep(0.0,0.025,fu)*smoothstep(1.0,0.975,fu);
  float grain=fbm(vec2(u*14.+id*7.,z*0.8),6);
  float streak=fbm(vec2(u*60.,z*0.25+id),4);
  vec3 wood=mix(vec3(0.17,0.09,0.045),vec3(0.30,0.17,0.08),grain)*(0.75+0.35*streak)*(0.85+0.3*h21(vec2(id,2.)));
  // rayones finos y manchas
  float scr=smoothstep(0.985,1.0,gn(vec2(u*3.,z*40.+id)));
  wood+=vec3(0.06,0.04,0.02)*scr;
  wood*=0.75+0.35*fbm(vec2(p.x*2.,z*0.4),4);
  // gotas de cera cerca de las velas
  for(int i=0;i<3;i++){
    vec2 c = i==0?vec2(-0.72,-0.62): i==1?vec2(0.80,-0.64): vec2(0.95,-0.67);
    vec2 d=(p-c)*vec2(1.,3.5);
    float drop=0.;
    for(int k=0;k<4;k++){ vec2 o=(h22(vec2(float(i),float(k)))-0.5)*vec2(0.18,0.10);
      drop=max(drop, smoothstep(0.022,0.016,length(d-o*vec2(1.,3.5)))); }
    wood=mix(wood,vec3(0.75,0.70,0.58),drop*0.9);
  }
  // hojas secas y paja
  float leaf=smoothstep(0.80,0.86,gn(vec2(p.x*18.,z*1.6)));
  wood=mix(wood,vec3(0.32,0.15,0.05),leaf*0.8);
  vec3 col=wood*seam+vec3(0.02,0.01,0.005)*(1.-seam);
  // canto de atras con brillo
  col+=vec3(0.25,0.15,0.08)*exp(-(back-p.y)*90.)*0.5;
  col*=mix(1.0,0.45,smoothstep(-0.55,-1.25,p.y));
  return enc(col,1.);
}

// ---------------- calabazas y objetos ----------------
float lobes(vec2 q, vec2 R, int n, out vec3 nrm){
  float body=1e3; nrm=vec3(0.,0.,1.);
  for(int i=0;i<7;i++){
    if(i>=n) break;
    float fi=float(i)-float(n-1)*0.5;
    vec2 c=vec2(fi*R.x*0.42,0.);
    vec2 r=R*vec2(0.72-abs(fi)*0.10, 1.0-abs(fi)*0.07);
    vec2 d=(q-c)/r;
    float e=(length(d)-1.)*min(r.x,r.y);
    if(e<body){ body=e; float zz=sqrt(max(1.-dot(d,d),0.)); nrm=normalize(vec3(d*0.9,zz+0.15)); }
  }
  return body;
}
vec3 litPumpkin(vec2 q, vec3 nrm, float body, vec3 alb, float seed){
  float bump=fbm(q*30.+seed,5)-0.5;
  nrm=normalize(nrm+vec3(bump*0.3,bump*0.2,0.));
  float dif=max(dot(nrm,L),0.);
  float spec=pow(max(dot(reflect(-L,nrm),vec3(0.,0.,1.)),0.),22.);
  float ao=smoothstep(-0.06,0.0,-abs(body+0.01))*0.0+mix(0.55,1.,smoothstep(-0.25,0.,q.y+0.0));
  alb*=0.80+0.30*fbm(q*vec2(6.,2.)+seed,4);
  alb*=1.-0.35*smoothstep(0.62,0.80,fbm(q*45.+seed,4));   // manchitas
  return alb*(0.25+0.85*dif)*ao + vec3(1.)*spec*0.12;
}
vec4 stemAt(vec2 p, vec2 base, float len, float w, float bend){
  vec2 s=p-base; s=rot(bend)*s;
  float k=clamp(s.y/len,0.,1.);
  s.x-=sin(k*2.2)*w*1.2;
  float d=max(abs(s.x)-w*(1.-0.4*k), max(-s.y, s.y-len));
  float m=smoothstep(0.002,-0.002,d);
  vec3 c=vec3(0.16,0.15,0.07)*(0.5+0.8*gn(vec2(s.x*200.,s.y*20.)))*(0.6+0.5*smoothstep(w,-w,s.x));
  return vec4(c,m);
}
float candleSdf(vec2 p, vec2 base, float h, float r){
  vec2 q=p-base;
  float body=sdBox(q-vec2(0.,h*0.5),vec2(r,h*0.5));
  // chorreado de cera: gotas que bajan por los lados
  for(int i=0;i<5;i++){
    float side=(h21(vec2(base.x,float(i)))-0.5)*2.*r*0.95;
    float len=h*(0.15+0.55*h21(vec2(base.x+1.,float(i))));
    vec2 dq=q-vec2(side,h-len*0.5);
    float drip=length(max(abs(dq)-vec2(r*0.16,len*0.5),0.))-r*0.10;
    body=min(body, max(drip, -(q.y-h+0.004)));
    body=min(body, length(q-vec2(side,h-len))-r*0.22);
  }
  // charco de cera en la base
  body=min(body, length((q-vec2(0.,0.008))*vec2(1.,4.))-r*1.7);
  return body;
}
vec4 props(vec2 p){
  vec3 col=vec3(0.); float a=0.;
  // calabaza blanca
  { vec2 q=p-vec2(-1.15,-0.40); vec3 n; float b=lobes(q,vec2(0.30,0.20),5,n);
    float m=smoothstep(0.003,-0.003,b);
    vec3 c=litPumpkin(q,n,b,vec3(0.78,0.76,0.66),3.);
    col=mix(col,c,m); a=max(a,m);
    vec4 st=stemAt(p,vec2(-1.13,-0.22),0.08,0.020,0.2); col=mix(col,st.rgb,st.a); a=max(a,st.a); }
  // calabacita verrugosa
  { vec2 q=p-vec2(-1.62,-0.58); q.y-=0.04*q.x;
    float d=length(q*vec2(1.,0.95+0.25*smoothstep(-0.02,0.12,q.y)))-0.11+0.008*(gn(q*90.)-0.5);
    d=min(d,length((q-vec2(0.02,0.11))*vec2(1.6,1.))-0.06);
    float m=smoothstep(0.003,-0.003,d);
    vec3 nn=normalize(vec3(q*6.,1.));
    vec3 alb=mix(vec3(0.55,0.50,0.12),vec3(0.20,0.32,0.08),smoothstep(0.4,0.7,fbm(q*14.,4)));
    float wart=smoothstep(0.75,0.85,gn(q*70.));
    vec3 c=alb*(0.3+0.8*max(dot(nn,L),0.))*(1.+wart*0.4);
    col=mix(col,c,m); a=max(a,m); }
  // calabaza chica tallada (la cara se dibuja en vivo)
  { vec2 q=p-vec2(1.38,-0.42); vec3 n; float b=lobes(q,vec2(0.29,0.22),5,n);
    float m=smoothstep(0.003,-0.003,b);
    vec3 c=litPumpkin(q,n,b,vec3(0.85,0.36,0.05),7.);
    col=mix(col,c,m); a=max(a,m);
    vec4 st=stemAt(p,vec2(1.39,-0.22),0.09,0.022,-0.3); col=mix(col,st.rgb,st.a); a=max(a,st.a); }
  // libros viejos apilados
  for(int i=0;i<3;i++){
    float fi=float(i);
    vec2 c=vec2(2.20+(h21(vec2(fi,2.))-0.5)*0.08, -0.62+fi*0.085);
    vec2 q=rot((h21(vec2(fi,3.))-0.5)*0.08)*(p-c);
    float d=sdBox(q,vec2(0.30-fi*0.03,0.040));
    float m=smoothstep(0.002,-0.002,d);
    vec3 cov = i==0?vec3(0.30,0.06,0.05): i==1?vec3(0.10,0.16,0.10): vec3(0.25,0.18,0.08);
    float edge=step(abs(q.y),0.028)*step(q.x,0.24-fi*0.03)*step(0.,q.x+0.29-fi*0.03);
    vec3 pages=vec3(0.65,0.58,0.42)*(0.7+0.3*sin(q.y*900.));
    vec3 c2=mix(cov*(0.6+0.6*fbm(q*40.,4)), pages, edge*step(0.2,q.x));
    c2*=0.6+0.5*smoothstep(-0.04,0.04,q.y);
    // letras doradas del lomo
    c2+=vec3(0.5,0.4,0.15)*step(abs(q.y),0.008)*step(abs(q.x+0.20),0.04)*step(0.5,fract(q.x*120.));
    col=mix(col,c2,m); a=max(a,m);
  }
  // velas
  for(int i=0;i<4;i++){
    vec4 cd = i==0?vec4(-0.72,-0.60,0.42,0.045): i==1?vec4(0.80,-0.62,0.30,0.05): i==2?vec4(0.95,-0.66,0.17,0.04): vec4(2.20,-0.37,0.16,0.035);
    float d=candleSdf(p,cd.xy,cd.z,cd.w);
    float m=smoothstep(0.0015,-0.0015,d);
    vec2 q=p-cd.xy;
    float cyl=sqrt(max(1.-pow(q.x/(cd.w*1.2),2.),0.));
    vec3 wax=vec3(0.82,0.78,0.66)*(0.35+0.75*cyl)*(0.85+0.2*fbm(q*120.,3));
    // la parte de arriba translucida (la llama la ilumina en vivo)
    wax+=vec3(1.0,0.6,0.25)*0.25*smoothstep(cd.z-0.08,cd.z,q.y);
    col=mix(col,wax,m); a=max(a,m);
    // mecha
    float wick=sdBox(q-vec2(0.,cd.z+0.012),vec2(0.003,0.014));
    float wm=smoothstep(0.0015,-0.0015,wick);
    col=mix(col,vec3(0.02),wm); a=max(a,wm);
  }
  // sombras de contacto sobre la mesa
  return enc(col*0.9,a);
}

// ---------------- calabaza principal ----------------
float heroBody(vec2 q, out vec3 nrm, out float rib){
  float body=1e3; nrm=vec3(0.,0.,1.); rib=1.;
  for(int i=-2;i<=2;i++){
    float fi=float(i);
    vec2 c=vec2(fi*0.21,0.);
    vec2 r=vec2(0.36-abs(fi)*0.045,0.50-abs(fi)*0.035);
    vec2 d=(q-c)/r;
    float e=(length(d)-1.)*min(r.x,r.y);
    if(e<body){ body=e; float zz=sqrt(max(1.-dot(d,d),0.)); nrm=normalize(vec3(d*0.85,zz+0.15)); rib=zz; }
  }
  return body;
}
vec4 hero(vec2 q, int mode){
  vec3 n; float rib;
  float b=heroBody(q,n,rib);
  float m=smoothstep(0.003,-0.003,b);
  // estrias verticales finas, granos y cicatrices
  float stri=fbm(vec2(q.x*70.,q.y*6.),4)-0.5;
  float bump=fbm(q*36.,6)-0.5;
  float scar=0.;
  vec3 nn=normalize(n+vec3(stri*0.35+bump*0.25, bump*0.2, 0.)-vec3(0.,0.,scar*0.2));
  // tallo retorcido
  vec2 sq=rot(0.25)*(q-vec2(0.03,0.50));
  float k=clamp(sq.y/0.22,0.,1.);
  sq.x-=sin(k*2.0)*0.025;
  float stem=max(abs(sq.x)-0.060*(1.-0.30*k)-0.004*sin(sq.x*400.), max(-sq.y, sq.y-0.20));
  float sm=smoothstep(0.003,-0.003,stem);
  if(mode==0){
    vec3 alb=mix(vec3(0.70,0.25,0.03),vec3(0.95,0.45,0.06),fbm(q*vec2(4.,1.5),5));
    alb*=0.85+0.25*stri;
    alb=mix(alb,vec3(0.35,0.32,0.10),scar*0.6);
    alb*=1.-0.3*smoothstep(0.65,0.82,fbm(q*55.,4));
    alb*=mix(0.35,1.0,smoothstep(0.0,0.55,rib));     // surcos mas oscuros
    alb*=0.9+0.2*smoothstep(0.6,0.95,rib);
    vec3 stc=vec3(0.22,0.20,0.09)*(0.5+0.8*gn(vec2(sq.x*260.,sq.y*30.)))*(0.6+0.5*smoothstep(0.05,-0.05,sq.x));
    vec3 c=mix(alb,stc,sm);
    return vec4(pow(clamp(c,0.,1.),vec3(1./2.2)), max(m,sm));
  }
  // relieve: RG normal, B oclusion de surcos, A cobertura
  vec3 sn=normalize(vec3((gn(vec2(sq.x*260.,sq.y*30.))-0.5)*0.6, 0.0, 1.));
  nn=normalize(mix(nn, sn, sm));
  float ao=mix(0.35,1.0,smoothstep(0.0,0.6,rib));
  return vec4(nn.xy*0.5+0.5, ao, max(m,sm));
}

void main(){
  vec2 p = mix(rect.xy, rect.zw, vUV);
  if(plate==0) fc=wall(p);
  else if(plate==1) fc=table(p);
  else if(plate==2) fc=props(p);
  else fc=hero(p, plate==3?0:1);
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
        out = np.concatenate([rgb, pm[..., 3:4]], -1)
        Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(
            os.path.join(OUT, name + '.png'), optimize=True)
        print('lamina', name, (w, h), r)
    # ruido que se repite: el mismo de la escena 00
    shutil.copy(os.path.join(SETS, 'scene00', '5_ruido.png'), os.path.join(OUT, '6_ruido.png'))
    print('-> ' + OUT)


if __name__ == '__main__':
    bake()
