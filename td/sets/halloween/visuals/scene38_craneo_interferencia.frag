// HALLOWEEN VJ 38 — CRANEO DE INTERFERENCIA
// @D1: numero de curvas de nivel
// @D2: apertura de la mandibula
// @D3: fracturas y contornos interiores
// @D4: desplazamiento de franjas
// @D5: blanco violeta a rojo sangre
// @D6: ecos laterales y halo fino
// Detail con mas rango: las fracturas llegan a 1.8 (hkDR)
#define uD3x hkDR(0.0, 0.5, 1.8, uD3)
// PIANO: separa e ilumina capas del grabado. Momento abre la mandibula.

// Trazo con cobertura en pixeles y halo estrecho independiente.
vec3 vjLine(float d,vec3 ink,float gain) {
    float aa=max(fwidth(d),2.0/max(uResH,1.0));
    float core=1.0-smoothstep(aa*0.28,aa*1.05,abs(d));
    float halo=exp(-abs(d)/max(aa*3.5,0.0005))*hkDR(0.0,0.115,0.40,uD6);
    return (mix(ink,vec3(0.80,0.92,1.0),0.16)*core+ink*halo)*gain;
}
vec3 vjKeys(vec3 col,vec2 p,vec3 ink,vec3 accent) {
    vec3 keys=hkKeyLit(col,p,0.0,vec2(0.40,0.95),ink,accent,0.04,0.85);
    return mix(col,keys,smoothstep(0.002,0.035,max(col.r,max(col.g,col.b))));
}

float ciHead(vec2 p) {
    vec2 q=vec2(abs(p.x),p.y);
    // Perfil anatomico: boveda, sien, arco cigomatico, rama y menton.
    vec2 profile[13]=vec2[13](vec2(0.0,0.88),vec2(0.32,0.85),vec2(0.52,0.68),vec2(0.61,0.39),vec2(0.57,0.11),vec2(0.65,-0.10),vec2(0.57,-0.25),vec2(0.41,-0.30),vec2(0.40,-0.52),vec2(0.32,-0.70),vec2(0.20,-0.77),vec2(0.08,-0.79),vec2(0.0,-0.79));
    float d=10.0;bool inside=false;
    for(int k=0;k<12;k++) {
        vec2 a=profile[k],b=profile[k+1];
        d=min(d,hkSeg(q,a,b));
        if((a.y>q.y)!=(b.y>q.y)) {
            float x=a.x+(q.y-a.y)*(b.x-a.x)/(b.y-a.y);
            if(q.x<x)inside=!inside;
        }
    }
    return inside?-d:d;
}
vec3 ciSkull(vec2 q,vec3 ink,vec3 accent,float gain,float opening) {
    float outline=ciHead(q);
    vec3 col=vjLine(outline,ink,gain);
    col+=vjLine(outline+0.027,accent,gain*uD3x*0.4);
    vec2 eye=vec2(abs(q.x)-0.26,q.y-0.12);
    eye=rot2(sign(q.x)*0.18)*eye;
    float orbit=(length(eye/vec2(0.19,0.20))-1.0)*0.17;
    orbit=max(orbit,(-eye.y-eye.x*0.18-0.14)*0.8);
    orbit=max(orbit,(eye.y-eye.x*0.28-0.16)*0.8);
    col+=vjLine(orbit,ink,gain*0.9);
    col+=vjLine(orbit+0.025,ink,gain*uD3x*0.40);
    vec2 nq=q-vec2(0.0,-0.16);
    float nose=max(abs(nq.x)-0.07-max(0.0,-nq.y)*0.16,abs(nq.y)-0.11);
    nose=max(nose,nq.y+abs(nq.x)*1.4-0.10);
    col+=vjLine(nose,accent,gain*0.70);
    // Curvas de nivel concentricas interrumpidas por las orbitas.
    float inside=1.0-smoothstep(-0.02,0.0,outline);
    float faceMask=smoothstep(0.015,0.055,orbit)*smoothstep(0.015,0.045,nose);
    float count=floor(hkDR(1.0,8.0,12.0,uD1));
    for(int j=0;j<12;j++) {
        float fj=float(j),show=revealAt(count,fj);if(show<0.001)continue;
        float d=(length((q-vec2(0.0,0.23))/vec2(0.68,0.75))-1.0)*0.63+fj*0.047;
        col+=vjLine(d,mix(ink,accent,fj/count),gain*show*0.32)*inside*faceMask*smoothstep(-0.32,-0.20,q.y);
    }
    // Dientes individuales, mandibula movil y pomulos grabados.
    vec2 m=q-vec2(0.0,-0.48-opening);
    for(int k=0;k<8;k++) {
        float x=(float(k)-3.5)*0.074;
        vec2 toothP=rot2(x*0.25)*(m-vec2(x,0.01+0.12*x*x));
        float tooth=hkRBox(toothP,vec2(0.030,0.074-abs(x)*0.05),0.012);
        col+=vjLine(tooth,ink,gain*0.65);
    }
    float jaw=min(hkSeg(m,vec2(-0.32,-0.09),vec2(0.0,-0.15)),hkSeg(m,vec2(0.0,-0.15),vec2(0.32,-0.09)));
    col+=vjLine(jaw,accent,gain*0.60);
    float cheek=hkSeg(vec2(abs(q.x),q.y),vec2(0.55,-0.18),vec2(0.35,-0.34));
    col+=vjLine(cheek,ink,gain*0.65);
    float crack=min(hkSeg(q,vec2(-0.12,0.80),vec2(-0.18,0.62)),hkSeg(q,vec2(-0.18,0.62),vec2(-0.08,0.52)));
    crack=min(crack,hkSeg(q,vec2(-0.08,0.52),vec2(-0.15,0.34)));
    col+=vjLine(crack,accent,gain*uD3x*0.6);
    vec2 side=vec2(abs(q.x),q.y);
    float zyg=min(hkSeg(side,vec2(0.57,0.02),vec2(0.43,-0.14)),hkSeg(side,vec2(0.43,-0.14),vec2(0.34,-0.25)));
    zyg=min(zyg,hkSeg(side,vec2(0.34,-0.25),vec2(0.21,-0.25)));
    col+=vjLine(zyg,ink,gain*0.6);
    float temple=min(hkSeg(side,vec2(0.50,0.48),vec2(0.45,0.30)),hkSeg(side,vec2(0.45,0.30),vec2(0.48,0.13)));
    col+=vjLine(temple,accent,gain*uD3x*0.40);
    // Suturas dentadas y ramas finas sobre la boveda.
    float suture=abs(q.x-0.014*sin(q.y*72.0))-0.003;
    col+=vjLine(suture,accent,gain*uD3x*0.34)*smoothstep(0.36,0.42,q.y)*(1.0-smoothstep(0.78,0.82,q.y));
    float smallCrack=min(hkSeg(side,vec2(0.48,0.64),vec2(0.34,0.55)),hkSeg(side,vec2(0.34,0.55),vec2(0.38,0.46)));
    col+=vjLine(smallCrack,ink,gain*uD3x*0.35);
    vec2 brow=side-vec2(0.26,0.12);
    float browLine=(length(brow/vec2(0.235,0.245))-1.0)*0.17;
    col+=vjLine(browLine,accent,gain*uD3x*0.30)*smoothstep(0.13,0.23,q.y);
    return col;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);float t=uTime*0.12,hit=hkHit(),B=hkBass();
    vec4 C=hkClimax(38.0,159.0,22.0);
    vec3 ink=mix(vec3(0.65,0.40,1.0),vec3(1.0,0.08,0.055),uD5);
    vec3 accent=mix(vec3(0.10,0.85,0.90),vec3(0.95,0.32,0.12),uD5);
    vec2 q=p/(0.93+0.06*hit+0.03*B);
    // Desplazamiento continuo por franjas con limites suavizados.
    float band=floor((q.y+2.0)*9.0);
    float within=fract((q.y+2.0)*9.0);
    float window=smoothstep(0.0,0.12,within)*(1.0-smoothstep(0.88,1.0,within));
    q.x+=sin(t*1.2+band*1.7)*hkDR(0.0,0.5,1.8,uD4)*0.065*window*(0.25+hit*2.0+B+C.y*0.5);
    for(int k=0;k<N_KEYS;k++) {
        float e=keyEnv(k,0.04,0.85);
        float zone=exp(-pow((q.y-mix(-0.7,0.8,keyPos(k)))*7.0,2.0));
        q.x+=e*zone*0.035*(keyPos(k)*2.0-1.0);
    }
    float opening=hkDR(0.0,0.03,0.11,uD2)+hit*0.07+B*0.03+C.y*0.035;
    vec3 col=ciSkull(q,ink,accent,0.85,opening);
    for(int side=-1;side<=1;side+=2) {
        vec2 echo=(p-vec2(float(side)*(1.65+0.1*hit),0.0))/0.60;
        echo.x+=sin(t+echo.y*3.0)*0.025;
        col+=ciSkull(echo,accent,ink,hkDR(0.0,0.225,0.8,uD6),opening*0.5);
    }
    col=vjKeys(col,p,ink,accent);
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
