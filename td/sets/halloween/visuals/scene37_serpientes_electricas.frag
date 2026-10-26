// HALLOWEEN VJ 37 — SERPIENTES ELECTRICAS
// @D1: numero de serpientes
// @D2: anchura y separacion de las cintas
// @D3: escamas y nervaduras
// @D4: amplitud de las ondas
// @D5: verde veneno a ambar
// @D6: espinas y halo fino
// PIANO: ilumina el cuerpo por voz. Momento abre las ondulaciones.

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

float seCurve(float x,float t,float seed) {
    return sin(x*2.1-t+seed)*(0.16+uD4*0.18)+sin(x*4.3+t*0.4+seed)*0.04;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);float t=uTime*0.20,hit=hkHit();
    vec4 C=hkClimax(37.0,155.0,22.0);
    vec3 ink=mix(vec3(0.15,1.0,0.14),vec3(1.0,0.30,0.025),uD5);
    vec3 accent=vec3(0.38,0.12,0.95);
    vec3 col=vec3(0.0);
    float count=2.0+floor(uD1*4.0);
    for(int j=0;j<6;j++) {
        float fj=float(j),show=revealAt(count,fj);if(show<0.001)continue;
        float keyed=keyEnv(j,0.04,0.85);
        float seed=fj*2.17,center=(fj-(count-1.0)*0.5)*(0.29+uD2*0.08);
        float direction=mod(fj,2.0)*2.0-1.0;
        vec2 q=vec2(p.x*direction,p.y-center);
        float headX=1.65+0.12*sin(t*0.5+seed)+keyed*0.07;
        float wave=seCurve(q.x,t,seed)*(1.0+C.y*0.15);
        float slope=cos(q.x*2.1-t+seed)*2.1*(0.16+uD4*0.18)+cos(q.x*4.3+t*0.4+seed)*0.172;
        float dist=(q.y-wave)/sqrt(1.0+slope*slope);
        float width=(0.035+uD2*0.035)*smoothstep(-2.8,-1.6,q.x);
        float bodyMask=(1.0-smoothstep(headX-0.11,headX+0.02,q.x))*smoothstep(-2.9,-2.65,q.x);
        vec3 color=mix(ink,accent,mod(fj,2.0)*0.32);
        col+=vjLine(abs(dist)-width,color,show*(0.75+hit*0.12+keyed*0.40))*bodyMask;
        col+=vjLine(dist,color,show*uD3*0.25)*bodyMask;
        // Escamas de diamantes que siguen la curva del cuerpo.
        float sx=mod(q.x+t*0.035,0.10)-0.05;
        float scale=abs(sx)*0.65+abs(dist)-width*0.78;
        float interior=1.0-smoothstep(width*0.72,width,abs(dist));
        col+=vjLine(scale,color,show*uD3*0.58)*interior*bodyMask;
        float headY=seCurve(headX,t,seed)*(1.0+C.y*0.15);
        vec2 h=q-vec2(headX,headY);
        float head=(length(h/vec2(0.18,0.095))-1.0)*0.095;
        col+=vjLine(head,color,show*0.90);
        float eye=length(vec2(h.x-0.045,abs(h.y)-0.045))-0.012;
        col+=vjLine(eye,vec3(1.0,0.55,0.10),show*0.65);
        float jaw=hkSeg(h,vec2(0.01,-0.012),vec2(0.16,0.0));
        col+=vjLine(jaw,color,show*0.45);
        float tongue=hkSeg(h,vec2(0.16,0.0),vec2(0.30,0.0));
        tongue=min(tongue,min(hkSeg(h,vec2(0.30,0.0),vec2(0.35,0.035)),hkSeg(h,vec2(0.30,0.0),vec2(0.35,-0.035))));
        col+=vjLine(tongue,accent,show*(0.35+hit*0.25));
        float tick=mod(q.x+0.04,0.18)-0.09;
        float spine=hkSeg(vec2(tick,abs(dist)-width),vec2(0.0,0.0),vec2(-0.025,0.045));
        col+=vjLine(spine,color,show*uD6*0.28)*bodyMask;
    }
    col=vjKeys(col,p,ink,accent);
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
