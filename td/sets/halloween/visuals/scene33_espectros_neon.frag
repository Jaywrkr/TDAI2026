// HALLOWEEN VJ 33 — ESPECTROS NEON: mandala de siluetas y filamentos.
// @D1: apariciones en la corona
// @D2: apertura de las coronas
// @D3: dobles contornos y grabado de filamentos
// @D4: contrarrotacion y ondulacion local
// @D5: cian espectral a ultravioleta
// @D6: halo fino y puntos orbitales
// PIANO: acentua los trazos por voz. Momento abre la roseta.
vec3 enStroke(float d,vec3 ink,float gain) {
    float aa=max(fwidth(d),2.0 / max(uResH,1.0));
    float core=1.0-smoothstep(aa*0.25,aa*1.0,abs(d));
    float halo=exp(-abs(d)/max(aa*3.5,0.0005))*(0.05+uD6*0.15);
    return (mix(ink,vec3(0.75,0.95,1.0),0.18)*core+ink*halo)*gain;
}
float enBody(vec2 q,float t,float seed) {
    float trail=clamp((0.28-q.y)*0.7,0.0,1.0);
    q.x+=sin(q.y*5.0+t+seed)*trail*(0.025+uD4*0.055);
    float width=0.33*(1.0-trail*0.35);
    float hem=-0.70+0.10*cos(q.x*28.0+seed);
    float head=(length((q-vec2(0.0,0.28))/vec2(0.33,0.38))-1.0)*0.33;
    float sides=abs(q.x)-width;
    return q.y>0.28?head:max(sides,hem-q.y);
}
vec3 enSigil(vec2 q,float t,float seed,vec3 ink,float gain) {
    float d=enBody(q,t,seed);
    vec3 col=enStroke(d,ink,gain);
    col+=enStroke(d+0.025,ink,gain*0.38*uD3);
    col+=enStroke(d+0.053,ink,gain*0.16*uD3);
    vec2 eye=vec2(abs(q.x)-0.13,q.y-0.26+abs(q.x)*0.12);
    float ed=(length(eye/vec2(0.065,0.095))-1.0)*0.065;
    float mouth=(length((q-vec2(0.0,0.015))/vec2(0.065,0.115))-1.0)*0.065;
    col+=enStroke(ed,ink,gain*0.9);
    col+=enStroke(ed+0.017,ink,gain*0.30*uD3);
    col+=enStroke(mouth,ink,gain*0.8);
    // Filamentos limitados al interior del contorno; fondo negro.
    float inside=1.0-smoothstep(-0.014,0.0,d);
    float lower=(1.0-smoothstep(-0.10,0.02,q.y))*smoothstep(-0.70,-0.52,q.y);
    for(int j=0;j<5;j++) {
        float fj=float(j);
        float x=(fj-2.0)*0.082+sin(q.y*7.0+t+fj*0.5+seed)*0.018*uD4;
        col+=enStroke(q.x-x,ink,gain*(0.20+uD3*0.22))*inside*lower;
    }
    return col;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);
    float t=uTime*0.13,hit=hkHit(),B=hkBass(),st=hkStepBeat();
    vec4 C=hkClimax(33.0,151.0,22.0);
    vec3 ink=mix(vec3(0.015,0.85,0.86),vec3(0.56,0.09,1.0),uD5);
    vec3 accent=mix(vec3(0.42,0.20,1.0),vec3(0.9,0.15,0.55),uD5);
    vec3 col=vec3(0.0);
    float r=length(p),a=atan(p.y,p.x);
    float orbit=0.90+uD2*0.30+C.y*0.065+0.08*B+0.07*hit;
    float count=4.0+floor(uD1*8.0);
    // Roseta giratoria con apariciones alrededor de la mascara central.
    for(int j=0;j<12;j++) {
        float fj=float(j),show=revealAt(count,fj);
        if(show<0.001) continue;
        float angle=fj*TAU/count+t*0.10*(0.15+uD4)+st*TAU/count*0.5;
        vec2 center=vec2(cos(angle),sin(angle))*orbit;
        vec2 q=rot2(angle-PI*0.5)*(p-center)/0.31;
        col+=enSigil(q,t,fj*0.7,ink,show*0.52);
    }
    // Anillos grabados, puntas y contrarrotacion de la estructura gotica.
    vec2 q=rot2(-t*0.12*(0.2+uD4)-st*TAU/24.0)*p;
    float angle=atan(q.y,q.x);
    float teeth=0.035*pow(0.5+0.5*cos(angle*48.0),4.0)*(1.0+3.0*B);
    col+=enStroke(r-(orbit+0.35)-teeth,accent,0.50);
    col+=enStroke(r-(orbit+0.44),ink,0.42);
    col+=enStroke(r-(orbit-0.27),accent,0.32);
    for(int k=0;k<3;k++) {
        float fk=float(k);
        float rose=0.68+fk*0.055+(0.025+uD3*0.025)*cos(a*12.0+t*(fk-1.0)*0.2);
        col+=enStroke(r-rose,mix(ink,accent,fk*0.5),0.35);
    }
    col+=enSigil(p/(0.66-hit*0.06-B*0.03),t,0.0,ink,0.95+C.y*0.25);
    // Estrellas de cuatro puntas ancladas a las lineas del circulo.
    float sector=floor((angle+PI)/TAU*24.0);
    float aa=(sector+0.5)*TAU/24.0-PI;
    vec2 star=rot2(aa)*q-vec2(orbit+0.44,0.0);
    float sd=min(hkSeg(star,vec2(-0.025,0.0),vec2(0.025,0.0)),hkSeg(star,vec2(0.0,-0.025),vec2(0.0,0.025)));
    col+=enStroke(sd,ink,0.35+uD6*0.40);
    vec3 keys=hkKeyLit(col,p,0.0,vec2(0.38,0.95),ink,accent,0.04,0.9);
    col=mix(col,keys,smoothstep(0.002,0.035,max(col.r,max(col.g,col.b))));
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
