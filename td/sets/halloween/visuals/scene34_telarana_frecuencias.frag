// HALLOWEEN VJ 34 — TELARANA DE FRECUENCIAS
// @D1: densidad de hilos radiales
// @D2: separacion de hilos curvos
// @D3: doble hilo y nudos
// @D4: tension y vibracion
// @D5: plata cian a violeta
// @D6: gotas luminosas y halo fino
// PIANO: ilumina conexiones por voz. Momento tensa la red.

// Trazo con cobertura en pixeles y halo estrecho independiente.
vec3 vjLine(float d,vec3 ink,float gain) {
    float aa=max(fwidth(d),2.0/max(uResH,1.0));
    float core=1.0-smoothstep(aa*0.28,aa*1.05,abs(d));
    float halo=exp(-abs(d)/max(aa*3.5,0.0005))*(0.045+uD6*0.14);
    return (mix(ink,vec3(0.80,0.92,1.0),0.16)*core+ink*halo)*gain;
}
vec3 vjKeys(vec3 col,vec2 p,vec3 ink,vec3 accent) {
    vec3 keys=hkKeyLit(col,p,0.0,vec2(0.40,0.95),ink,accent,0.04,0.85);
    return mix(col,keys,smoothstep(0.002,0.035,max(col.r,max(col.g,col.b))));
}

vec3 wfWeb(vec2 p,float t,float seed,vec3 ink,vec3 accent,float gain) {
    float r=max(length(p),0.006),a=atan(p.y,p.x);
    float spokes=16.0+floor(uD1*16.0)*2.0;
    float cell=floor((a+PI)/TAU*spokes);
    float angle=(cell+0.5)*TAU/spokes-PI;
    float wave=sin(r*9.0-t*1.3+cell*1.73)*0.005*uD4*(1.0+hkHit()*1.2);
    vec2 q=rot2(angle)*p;
    float radial=q.y+wave;
    float visible=smoothstep(0.04,0.11,r)*(1.0-smoothstep(2.9,3.5,r));
    vec3 col=vjLine(abs(radial),ink,gain)*visible;
    col+=vjLine(abs(radial+0.013),ink,gain*0.23*uD3)*visible;
    float steps=7.0+uD2*8.0;
    // Separacion radial y curvatura distintas entre sectores.
    float warp=0.04*cos(a*3.0+seed)+0.018*sin(a*7.0-t*0.2);
    float phase=log(r+0.16)*steps+warp*steps;
    float thread=sin(phase)*max(r+0.16,0.2)/steps;
    float scallop=0.018*(1.0-cos((a-angle)*spokes))*r;
    col+=vjLine(thread+scallop,accent,gain*0.70)*visible;
    col+=vjLine(thread+scallop+0.012,ink,gain*0.22*uD3)*visible;
    float knot=exp(-pow(radial*140.0,2.0))*exp(-pow((thread+scallop)*100.0,2.0));
    float travel=0.5+0.5*sin(r*4.0-t+cell*0.3);
    col+=ink*knot*(0.12+uD6*0.50)*travel;
    // Centro de la telarana con diamantes anidados.
    float diamond=abs(p.x)+abs(p.y);
    col+=vjLine(diamond-0.10,ink,gain*0.5);
    col+=vjLine(diamond-0.065,accent,gain*0.35*uD3);
    return col;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);float t=uTime*0.14;
    vec4 C=hkClimax(34.0,149.0,22.0);
    vec3 ink=mix(vec3(0.12,0.85,1.0),vec3(0.65,0.13,1.0),uD5);
    vec3 accent=mix(vec3(0.45,0.25,0.95),vec3(1.0,0.16,0.45),uD5);
    vec2 center=vec2(-0.52+0.06*sin(t*0.4),0.13+0.04*cos(t*0.3));
    vec2 q=rot2(0.12*sin(t*0.15))*(p-center)/(1.0-C.y*0.035);
    vec3 col=wfWeb(q,t,0.0,ink,accent,0.72+hkHit()*0.12);
    col+=wfWeb((p-vec2(2.3,-0.85))*1.65,-t*0.8,3.0,accent,ink,0.20);
    // Cada tecla teje un puente distinto entre dos nudos.
    for(int k=0;k<N_KEYS;k++) {
        float e=keyEnv(k,0.04,0.85);if(e<0.001)continue;
        float a=keyPos(k)*TAU;
        vec2 a0=center+vec2(cos(a),sin(a))*(0.35+keyVel(k)*0.3);
        vec2 b0=center+vec2(cos(a+1.9),sin(a+1.9))*1.3;
        col+=vjLine(hkSeg(p,a0,b0),accent,e*0.55);
    }
    col=vjKeys(col,p,ink,accent);
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
