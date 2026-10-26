// HALLOWEEN VJ 35 — MURCIELAGOS EN FUGA
// @D1: cantidad de murcielagos
// @D2: apertura del tunel
// @D3: nervaduras y doble contorno
// @D4: amplitud de aleteo
// @D5: violeta a rojo sangre
// @D6: estelas y halo fino
// PIANO: ilumina rutas de la bandada. Momento dispersa las alas.

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

vec3 bfBat(vec2 p,float flap,vec3 ink,float gain) {
    vec2 q=vec2(abs(p.x),p.y);
    float wing=10.0;
    vec2 prev=vec2(0.07,0.07);
    // Silueta de ala poligonal continua con tres puntas recortadas.
    vec2 pts[8]=vec2[8](vec2(0.22,0.26),vec2(0.68,0.40),vec2(0.53,0.04),vec2(0.41,0.13),vec2(0.32,-0.12),vec2(0.23,0.025),vec2(0.13,-0.17),vec2(0.05,-0.12));
    for(int k=0;k<8;k++) {
        vec2 next=pts[k];next.y+=next.x*flap;
        wing=min(wing,hkSeg(q,prev,next));prev=next;
    }
    float body=(length(p/vec2(0.085,0.18))-1.0)*0.085;
    float ears=min(hkSeg(q,vec2(0.025,0.13),vec2(0.075,0.29)),hkSeg(q,vec2(0.075,0.29),vec2(0.09,0.12)));
    vec3 col=vjLine(min(wing,min(body,ears)),ink,gain);
    for(int k=0;k<3;k++) {
        vec2 tip=pts[2+k*2];tip.y+=tip.x*flap;
        col+=vjLine(hkSeg(q,vec2(0.06,0.04),tip),ink,gain*(0.25+uD3*0.35));
    }
    float eye=length(vec2(abs(p.x)-0.036,p.y-0.09))-0.009;
    col+=vjLine(eye,vec3(1.0,0.25,0.10),gain*0.7);
    return col;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);float t=uTime*0.12,hit=hkHit();
    vec4 C=hkClimax(35.0,153.0,22.0);
    vec3 ink=mix(vec3(0.56,0.13,1.0),vec3(1.0,0.055,0.12),uD5);
    vec3 accent=vec3(0.06,0.65,0.85);
    vec3 col=vec3(0.0);
    // Tunel en perspectiva con travesanos en forma de chevron.
    for(int j=0;j<8;j++) {
        float z=fract(float(j)/8.0-t*0.05),s=0.12+z*z*2.7;
        vec2 q=p/s;
        float chevron=abs(q.y)+abs(q.x)*0.55-1.0;
        col+=vjLine(chevron,accent,0.15*smoothstep(0.0,0.15,z)*(1.0-smoothstep(0.85,1.0,z)));
    }
    float count=8.0+uD1*16.0;
    for(int j=0;j<24;j++) {
        float fj=float(j),show=revealAt(count,fj);if(show<0.001)continue;
        float seed=hash21(vec2(fj,5.0));
        float z=fract(fj*0.618033-t*0.07);
        float depth=0.24+z*z*2.1;
        float a=fj*2.39996+0.12*sin(t+fj);
        vec2 center=vec2(cos(a)*1.55,sin(a)*0.68)*depth*(0.55+uD2*0.5+C.y*0.12);
        // Una voz desvia su grupo de murcielagos hacia una ruta propia.
        int voice=j%N_KEYS;
        float keyed=keyEnv(voice,0.04,0.85);
        center+=vec2(keyPos(voice)-0.5,0.25*sin(fj))*keyed*0.22;
        float size=0.095+z*z*0.43;
        float flap=sin(t*2.0+seed*TAU)*(0.14+uD4*0.38)+hit*0.08;
        float fade=smoothstep(0.0,0.12,z)*(1.0-smoothstep(0.86,1.0,z))*show;
        vec2 q=rot2(0.15*sin(a))*(p-center)/size;
        col+=bfBat(q,flap,ink,fade*0.75);
        for(int k=1;k<=2;k++) {
            vec2 echo=q+vec2(0.0,float(k)*0.16);
            col+=bfBat(echo,flap,ink,fade*uD6*0.045/float(k));
        }
    }
    col=vjKeys(col,p,ink,accent);
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
