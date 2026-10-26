// HALLOWEEN VJ 32 — CALABAZAS ACID: grabado vectorial de neon sobre negro.
// @D1: cantidad de sellos orbitales
// @D2: apertura del mandala
// @D3: filigrana y doble contorno
// @D4: contrarrotacion y baile de los anillos
// @D5: ambar a verde veneno
// @D6: halo estrecho y chispas
// PIANO: acentos luminosos por voz. Momento despliega los sellos.
// El nucleo del trazo usa cobertura en pixeles; el halo no sustituye al filo.
vec3 caStroke(float d, vec3 ink, float strength) {
    float aa=max(fwidth(d),2.0 / max(uResH,1.0));
    float halfWidth=aa*0.30;
    float core=1.0-smoothstep(halfWidth,halfWidth+aa*0.75,abs(d));
    float halo=exp(-abs(d)/max(aa*4.0,0.0006))*(0.06+uD6*0.16);
    return (mix(ink,vec3(1.0,0.84,0.51),0.20)*core+ink*halo)*strength;
}
float caTriangle(vec2 q,vec2 a,vec2 b,vec2 c) {
    return min(hkSeg(q,a,b),min(hkSeg(q,b,c),hkSeg(q,c,a)));
}
vec3 caMask(vec2 q, vec3 ink, float t, float strength) {
    float angle=atan(q.y/0.73,q.x/0.88);
    float radius=length(q/vec2(0.88,0.73));
    float outline=(radius-1.0+0.018*cos(angle*8.0))*0.73;
    vec3 col=caStroke(outline,ink,strength);
    // Doble contorno interior y meridianos abiertos, sin relleno.
    col+=caStroke(outline+0.035,ink,strength*0.32*uD3);
    float inside=1.0-smoothstep(0.94,1.0,radius);
    float above=smoothstep(0.27,0.39,abs(q.y));
    for(int k=0;k<5;k++) {
        float x=(float(k)-2.0)*0.26;
        float bend=x*sqrt(max(0.0,1.0-pow(q.y/0.78,2.0)));
        col+=caStroke(q.x-bend,ink,strength*0.40)*inside*above;
    }
    float eyes=caTriangle(vec2(abs(q.x),q.y),vec2(0.13,0.15),vec2(0.47,0.12),vec2(0.38,0.39));
    col+=caStroke(eyes,ink,strength*1.1);
    col+=caStroke(eyes-0.024,ink,strength*0.35*uD3);
    float nose=caTriangle(q,vec2(-0.07,-0.04),vec2(0.07,-0.04),vec2(0.0,0.09));
    col+=caStroke(nose,ink,strength*0.75);
    // Sonrisa dentada de segmentos continuos, con distancia exacta a cada arista.
    float teeth=10.0;
    vec2 prev=vec2(-0.55,-0.12);
    for(int k=1;k<=16;k++) {
        float x=-0.55+float(k)*1.10/16.0;
        float y=-0.36+0.75*x*x+mod(float(k),2.0)*0.065;
        vec2 next=vec2(x,y);
        teeth=min(teeth,hkSeg(q,prev,next));prev=next;
    }
    float lower=abs(q.y-(-0.45+0.65*q.x*q.x));
    lower=max(lower,abs(q.x)-0.55);
    col+=caStroke(min(teeth,lower),ink,strength);
    float stem=min(hkSeg(q,vec2(-0.08,0.73),vec2(-0.03,0.95)),hkSeg(q,vec2(-0.03,0.95),vec2(0.09,0.91)));
    col+=caStroke(stem,ink,strength*0.85);
    // Grabados circulares finos en las mejillas.
    vec2 cheek=vec2(abs(q.x)-0.60,q.y+0.04);
    float mark=abs(length(cheek)-0.09);
    col+=caStroke(mark,ink,strength*0.45*uD3);
    return col;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);
    float t=uTime*0.11, hit=hkHit();
    vec4 C=hkClimax(32.0,157.0,22.0);
    vec3 ink=mix(vec3(1.0,0.22,0.025),vec3(0.27,1.0,0.04),uD5);
    vec3 accent=mix(vec3(0.72,0.08,1.0),vec3(0.02,0.70,0.52),uD5);
    vec3 col=vec3(0.0);
    float radius=length(p), angle=atan(p.y,p.x);
    float spread=0.94+uD2*0.24+C.y*0.05;
    // Gran roseta de anillos finos que giran en sentidos opuestos.
    for(int j=0;j<3;j++) {
        float fj=float(j),r=spread+fj*0.10;
        float tick=pow(0.5+0.5*cos(angle*(48.0+fj*16.0)+t*(fj-1.0)),18.0);
        col+=caStroke(radius-r,mix(ink,accent,fj*0.5),0.32+tick*0.45);
        col+=caStroke(radius-r-0.028,accent,0.22*uD3);
    }
    // Sellos laterales en orbita conectados con triangulos geometricos.
    float orbit=1.65+uD2*0.20;
    float count=2.0+floor(uD1*6.0);
    for(int j=0;j<8;j++) {
        float fj=float(j),show=revealAt(count,fj);
        if(show<0.001) continue;
        float a=fj*TAU/count+t*0.12*(0.2+uD4);
        vec2 center=vec2(cos(a),sin(a))*orbit;
        vec2 q=rot2(a-PI*0.5)*(p-center)/0.27;
        col+=caMask(q,mix(ink,accent,0.25),t,show*0.58);
        vec2 other=vec2(cos(a+TAU*2.0/count),sin(a+TAU*2.0/count))*orbit;
        col+=caStroke(hkSeg(p,center,other),accent,show*0.12*uD3);
    }
    // Mascara central con animacion local y doble contorno.
    vec2 hero=rot2(sin(t*0.4)*0.025*uD4)*p/(0.79+hit*0.012);
    col+=caMask(hero,ink,t,0.90+C.y*0.30+hit*0.18);
    // Trenza radial de pequenos chevrones trazados con precision.
    vec2 q=rot2(-t*0.13*(0.2+uD4))*p;
    float a=atan(q.y,q.x),cell=floor((a+PI)/TAU*48.0);
    float aa=(cell+0.5)*TAU/48.0-PI;
    vec2 rune=rot2(aa)*q-vec2(spread+0.28,0.0);
    float chev=min(hkSeg(rune,vec2(-0.035,-0.026),vec2(0.035,0.0)),hkSeg(rune,vec2(0.035,0.0),vec2(-0.035,0.026)));
    col+=caStroke(chev,ink,0.55*uD3);
    // Marcas de calibracion entre los dos aros exteriores.
    float markAngle=angle-t*0.08;
    float ticks=pow(max(0.0,cos(markAngle*96.0)),28.0);
    float tickBand=smoothstep(spread+0.13,spread+0.14,radius)*(1.0-smoothstep(spread+0.18,spread+0.19,radius));
    col+=ink*ticks*tickBand*uD3*0.45;
    // El piano acentua los trazos existentes sin rellenar superficies.
    vec3 keys=hkKeyLit(col,p,0.0,vec2(0.38,0.95),ink,accent,0.04,0.8);
    col=mix(col,keys,smoothstep(0.002,0.035,max(col.r,max(col.g,col.b))));
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
