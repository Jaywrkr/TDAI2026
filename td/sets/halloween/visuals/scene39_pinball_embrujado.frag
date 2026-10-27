// HALLOWEEN 39 — PINBALL EMBRUJADO
// Composicion vectorial estable: vidrieras, mascaras y bombillas por zonas.
// @D1: intensidad de las zonas de color
// @D2: recorrido automatico de luces
// @D3: tramas y grabados interiores
// @D4: barridos sobre las ilustraciones
// @D5: paleta fuego violeta a veneno cian
// @D6: bombillas y halo
// PIANO: seis grupos de insertos independientes. Momento recorre el tablero.
float pbTime;
float pbHit;
float pbPeak;
vec3 pbKeysA;
vec3 pbKeysB;
float pbKey(float seed) {
    int i=int(mod(floor(seed),6.0));
    return i==0?pbKeysA.x:i==1?pbKeysA.y:i==2?pbKeysA.z:i==3?pbKeysB.x:i==4?pbKeysB.y:pbKeysB.z;
}
float pbEllipse(vec2 p,vec2 r) { return (length(p/r)-1.0)*min(r.x,r.y); }
float pbTri(vec2 p,vec2 r) { return (max(abs(p.x)/r.x+p.y/r.y,-p.y/r.y)-0.5)*min(r.x,r.y); }
float pbStar(vec2 p,float r) {
    float a=atan(p.y,p.x)+PI*0.5;
    float sector=mod(a+PI/5.0,TAU/5.0)-PI/5.0;
    float edge=mix(r,r*0.43,abs(sector)/(PI/5.0));
    return length(p)-edge;
}
vec3 pbPalette(vec3 color,float seed) {
    vec3 poison=mix(vec3(0.02,0.72,0.58),vec3(0.50,0.90,0.045),0.5+0.5*sin(seed*2.7));
    return mix(color,poison,uD5*0.68);
}
float pbLamp(float seed) {
    float wave=0.5+0.5*sin(pbTime*(0.55+uD2*0.8)-seed*1.42);
    float chase=smoothstep(0.45,0.90,wave);
    float keyed=pbKey(seed);
    return clamp(0.20+uD1*0.20+chase*(0.12+uD2*0.35)+pbHit*(0.08+0.12*chase)+keyed*0.60+pbPeak*chase*0.22,0.0,1.4);
}
void pbShape(inout vec3 col,float d,vec3 color,float seed,vec2 p,float pattern) {
    float px=2.0/max(uResH,1.0);
    float aa=max(min(fwidth(d),px*2.0),px*0.65);
    float mask=1.0-smoothstep(-aa,aa,d);
    float inner=1.0-smoothstep(-0.014-aa,-0.014+aa,d);
    vec3 ink=pbPalette(color,seed);
    float lamp=pbLamp(seed);
    float stripes=0.5+0.5*sin((p.y+p.x*0.30)*110.0+seed);
    vec2 cells=floor(p*vec2(56.0,45.0));
    float checker=mod(cells.x+cells.y,2.0);
    float texture=mix(stripes,checker,step(0.5,fract(seed*0.37)));
    float engraving=1.0-pattern*uD3*(0.20+0.27*texture);
    float sweep=pow(0.5+0.5*sin(p.x*8.0+p.y*4.0-pbTime*0.8+seed),14.0)*uD4;
    vec3 fill=ink*(0.18+lamp*0.95)*engraving;
    fill+=ink*sweep*(0.12+pbHit*0.10);
    vec3 surface=mix(vec3(0.006,0.004,0.012),fill,inner);
    col=mix(col,surface,mask);
    float rim=exp(-abs(d+0.017)/(px*1.8))*inner;
    col+=ink*rim*(0.04+lamp*0.055);
}
void pbStroke(inout vec3 col,float d,vec3 color,float strength) {
    float px=2.0/max(uResH,1.0);
    float aa=max(min(fwidth(d),px*1.8),px*0.65);
    float line=1.0-smoothstep(aa*0.35,aa*1.3,abs(d));
    col+=color*line*strength;
}
void pbBulb(inout vec3 col,vec2 q,float radius,float seed,vec3 color) {
    float d=length(q)-radius;
    pbShape(col,d,vec3(0.14,0.08,0.23),seed,q,0.0);
    float lamp=pbLamp(seed);
    float disc=1.0-smoothstep(radius*0.52,radius*0.68,length(q));
    vec3 hot=mix(color,vec3(1.0,0.92,0.70),0.40);
    col+=hot*disc*(0.18+lamp*(0.35+uD6*0.55));
    col+=hot*exp(-length(q)/(radius*0.85))*(0.015+uD6*0.065)*lamp;
}
void pbPumpkin(inout vec3 col,vec2 q) {
    float a=atan(q.y/0.67,q.x/0.77);
    float body=pbEllipse(q,vec2(0.77,0.67))+cos(a*8.0)*0.018;
    pbShape(col,body+0.0,vec3(1.0,0.30,0.018),0.0,q,0.0);
    pbShape(col,body+0.065,vec3(0.95,0.23,0.012),1.0,q,0.0);
    for(int i=0;i<5;i++) {
        float x=(float(i)-2.0)*0.22;
        float rib=abs(q.x-x*sqrt(max(0.0,1.0-pow(q.y/0.68,2.0))))-0.008;
        float clip=max(rib,body+0.09);
        pbShape(col,clip,vec3(0.42,0.075,0.01),2.0+float(i),q,0.0);
    }
    vec2 eye=vec2(abs(q.x)-0.31,q.y-0.18);
    eye=rot2(-sign(q.x)*0.16)*eye;
    float eyes=pbTri(eye,vec2(0.16,0.14));
    pbShape(col,eyes,vec3(1.0,0.83,0.20),q.x<0.0?2.0:3.0,q,0.15);
    pbShape(col,pbTri(q-vec2(0.0,-0.02),vec2(0.07,0.08)),vec3(1.0,0.88,0.35),4.0,q,0.0);
    float grin=max(abs(q.y+0.28-q.x*q.x*0.45)-0.085,abs(q.x)-0.53);
    pbShape(col,grin,vec3(1.0,0.79,0.12),5.0,q,0.0);
    for(int k=0;k<7;k++) {
        float x=(float(k)-3.0)*0.13;
        float tooth=hkBox(q-vec2(x,-0.20+x*x*0.45),vec2(0.033,0.057));
        pbShape(col,max(tooth,grin+0.01),vec3(0.37,0.07,0.01),1.0,q,0.0);
    }
    vec2 stem=rot2(-0.14)*(q-vec2(0.0,0.72));
    pbShape(col,hkRBox(stem,vec2(0.09,0.16),0.025),vec3(0.10,0.43,0.17),7.0,q,0.8);
}
void pbSkull(inout vec3 col,vec2 q) {
    float dome=pbEllipse(q-vec2(0.0,0.11),vec2(0.43,0.45));
    float jaw=hkRBox(q-vec2(0.0,-0.29),vec2(0.28,0.24),0.055);
    pbShape(col,min(dome,jaw),vec3(0.94,0.80,0.47),10.0,q,0.25);
    vec2 eye=vec2(abs(q.x)-0.18,q.y-0.13);
    pbShape(col,pbEllipse(eye,vec2(0.12,0.145)),vec3(0.11,0.025,0.21),11.0,q,0.0);
    pbBulb(col,eye,0.058,q.x<0.0?12.0:13.0,vec3(0.49,0.19,1.0));
    pbShape(col,pbTri(q-vec2(0.0,-0.10),vec2(0.075,0.09)),vec3(0.20,0.035,0.30),14.0,q,0.0);
    for(int k=0;k<5;k++) {
        vec2 tooth=q-vec2((float(k)-2.0)*0.09,-0.32);
        pbShape(col,hkRBox(tooth,vec2(0.036,0.08),0.009),vec3(1.0,0.88,0.65),15.0+float(k),q,0.0);
    }
    float crack=min(hkSeg(q,vec2(-0.06,0.52),vec2(-0.12,0.36)),hkSeg(q,vec2(-0.12,0.36),vec2(-0.03,0.28)));
    pbStroke(col,crack,vec3(0.08,0.018,0.14),0.8);
}
void pbBat(inout vec3 col,vec2 q) {
    vec2 p=vec2(abs(q.x),q.y);
    // Alas recortadas en superficies con insertos de luz independientes.
    float wing=pbTri(rot2(-0.35)*(p-vec2(0.39,0.03)),vec2(0.37,0.21));
    wing=max(wing,0.11-p.x);
    pbShape(col,wing,vec3(0.42,0.11,0.83),20.0+step(0.0,q.x),q,0.8);
    for(int k=0;k<3;k++) {
        float fk=float(k);
        float cut=length(p-vec2(0.18+fk*0.17,-0.12-fk*0.016))-0.09;
        pbShape(col,max(cut,wing+0.018),vec3(0.025,0.013,0.07),22.0,q,0.0);
    }
    pbShape(col,pbEllipse(q,vec2(0.09,0.20)),vec3(0.60,0.07,0.31),23.0,q,0.6);
    vec2 ear=vec2(abs(q.x)-0.06,q.y-0.22);
    pbShape(col,pbTri(ear,vec2(0.055,0.10)),vec3(0.68,0.17,0.54),24.0,q,0.0);
    pbBulb(col,vec2(abs(q.x)-0.033,q.y-0.08),0.028,25.0,vec3(1.0,0.13,0.06));
}
void pbGhost(inout vec3 col,vec2 q) {
    float head=pbEllipse(q-vec2(0.0,0.12),vec2(0.25,0.28));
    float hem=-0.31+cos(q.x*37.0)*0.045;
    float sheet=max(abs(q.x)-0.25,max(q.y-0.12,hem-q.y));
    pbShape(col,min(head,sheet),vec3(0.10,0.74,0.66),28.0,q,0.55);
    vec2 eyes=vec2(abs(q.x)-0.09,q.y-0.13);
    pbShape(col,pbEllipse(eyes,vec2(0.04,0.055)),vec3(0.025,0.035,0.11),29.0,q,0.0);
    pbShape(col,pbEllipse(q-vec2(0.0,-0.03),vec2(0.045,0.06)),vec3(0.025,0.035,0.11),30.0,q,0.0);
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);
    // Los insertos MIDI permanecen activos en silencio.
    pbKeysA=vec3(keyEnv(0,0.05,0.85),keyEnv(1,0.05,0.85),keyEnv(2,0.05,0.85));
    pbKeysB=vec3(keyEnv(3,0.05,0.85),keyEnv(4,0.05,0.85),keyEnv(5,0.05,0.85));
    pbTime=uTime*0.32;pbHit=hkHit();
    vec4 C=hkClimax(39.0,155.0,22.0);pbPeak=C.y;
    vec3 col=vec3(0.008,0.006,0.018);
    vec3 gold=vec3(0.92,0.48,0.075),red=vec3(0.64,0.055,0.15),blue=vec3(0.055,0.20,0.68),green=vec3(0.04,0.55,0.32);
    // Tablero panoramico con marco y ornamentos simetricos.
    float board=hkRBox(p,vec2(2.44,0.94),0.12);
    pbShape(col,board,gold,31.0,p,0.5);
    pbShape(col,hkRBox(p,vec2(2.38,0.88),0.10),red,32.0,p,0.8);
    pbShape(col,hkRBox(p,vec2(2.29,0.80),0.08),vec3(0.025,0.017,0.075),33.0,p,0.0);
    for(int side=-1;side<=1;side+=2) {
        float signx=float(side);
        vec2 q=vec2(p.x*signx,p.y);
        // Escudos laterales de color, canales y travesanos.
        pbShape(col,hkRBox(q-vec2(1.55,0.0),vec2(0.63,0.70),0.22),blue,34.0+signx,p,0.7);
        pbShape(col,hkRBox(q-vec2(1.55,0.0),vec2(0.54,0.62),0.18),red,36.0+signx,p,0.6);
        pbShape(col,hkRBox(q-vec2(1.55,0.0),vec2(0.46,0.55),0.14),vec3(0.03,0.02,0.09),38.0,p,0.0);
        vec2 rail=rot2(0.32)*(q-vec2(0.89,0.05));
        pbShape(col,hkRBox(rail,vec2(0.095,0.61),0.06),gold,39.0+signx,p,0.8);
        pbShape(col,hkRBox(rail,vec2(0.048,0.54),0.035),green,41.0+signx,p,1.0);
        for(int k=0;k<3;k++) {
            vec2 inset=rail-vec2(0.0,(float(k)-1.0)*0.29);
            pbBulb(col,inset,0.033,43.0+float(k)+signx,vec3(0.10,0.90,0.68));
        }
        vec2 banner=rot2(-0.20)*(q-vec2(1.55,0.62));
        pbShape(col,hkRBox(banner,vec2(0.46,0.095),0.03),gold,47.0+signx,p,0.0);
        pbShape(col,hkRBox(banner,vec2(0.39,0.05),0.02),green,49.0+signx,p,0.9);
        // Rosetas e insertos independientes en las cuatro esquinas.
        for(int k=0;k<2;k++) {
            float y=(float(k)*2.0-1.0)*0.66;
            vec2 flower=q-vec2(2.14,y);
            float angle=atan(flower.y,flower.x);
            float petals=length(flower)-0.11-0.018*cos(angle*8.0);
            pbShape(col,petals,gold,51.0+float(k)+signx,p,0.4);
            pbBulb(col,flower,0.055,54.0+float(k)+signx,vec3(1.0,0.45,0.05));
        }
        // Rampas inferiores y paletas de pinball.
        vec2 flipper=rot2(signx*0.14)*(p-vec2(signx*0.42,-0.77));
        pbShape(col,hkRBox(flipper,vec2(0.28,0.055),0.045),vec3(0.96,0.78,0.40),57.0+signx,p,0.0);
        pbShape(col,hkRBox(flipper,vec2(0.21,0.023),0.017),red,59.0+signx,p,0.0);
    }
    // Mascaras principales de los paneles con contornos negros definidos.
    pbSkull(col,(p-vec2(-1.55,0.10))/0.77);
    pbGhost(col,(p-vec2(1.55,0.06))/1.18);
    pbPumpkin(col,(p-vec2(0.0,-0.04))/0.91);
    // Abanicos de vidriera y placas grabadas alrededor de las mascaras.
    for(int side=-1;side<=1;side+=2) {
        vec2 q=vec2(p.x*float(side),p.y);
        vec2 rosette=q-vec2(1.55,-0.51);
        for(int petal=0;petal<5;petal++) {
            float a=(float(petal)-2.0)*0.42;
            vec2 leaf=rot2(a)*(rosette-vec2(sin(a),cos(a))*0.10);
            pbShape(col,pbEllipse(leaf,vec2(0.045,0.11)),vec3(0.45,0.12,0.74),110.0+float(petal)+float(side),p,0.8);
        }
        pbBulb(col,rosette,0.046,117.0+float(side),vec3(1.0,0.50,0.08));
        vec2 scroll=q-vec2(1.98,0.10);
        for(int k=0;k<3;k++) {
            vec2 tile=scroll-vec2(0.0,(float(k)-1.0)*0.20);
            float arrow=abs(tile.x)+abs(tile.y)-0.065;
            pbShape(col,arrow,vec3(0.05,0.53,0.38),120.0+float(k)+float(side),p,0.5);
        }
    }
    // Corona de murcielagos y fronton de vidriera.
    for(int k=0;k<3;k++) {
        float fk=float(k);
        vec2 q=(p-vec2((fk-1.0)*0.72,0.67))/0.36;
        pbBat(col,q);
    }
    vec2 center=p-vec2(0.0,-0.79);
    pbShape(col,pbStar(center,0.12),gold,62.0,p,0.0);
    // Frisos de bombillas: cada grupo tiene su fase.
    for(int k=0;k<20;k++) {
        float fk=float(k),x=(fk-9.5)*0.223;
        pbBulb(col,p-vec2(x,0.865),0.025,65.0+fk,vec3(1.0,0.50,0.16));
        pbBulb(col,p-vec2(x,-0.865),0.025,85.0+fk,vec3(0.20,0.85,0.75));
    }
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
