// HALLOWEEN VJ 35 — MURCIELAGOS EN FUGA
// @D1: cantidad de murcielagos
// @D2: apertura del tunel
// @D3: nervaduras y doble contorno
// @D4: amplitud de aleteo
// @D5: violeta a rojo sangre
// @D6: estelas y halo fino
// Detail con mas rango: las nervaduras llegan a 1.8 (hkDR)
#define uD3x hkDR(0.0, 0.5, 1.8, uD3)
// PIANO: ilumina rutas de la bandada. Momento dispersa las alas.

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

vec3 bfBat(vec2 p,float flap,vec3 ink,float gain) {
    vec2 q=vec2(abs(p.x),p.y);
    float wing=10.0;
    vec2 prev=vec2(0.07,0.07);
    // Arco superior de falanges y tres membranas concavas por ala.
    vec2 finger[4]=vec2[4](vec2(0.72,0.35),vec2(0.50,-0.02),vec2(0.29,-0.18),vec2(0.10,-0.22));
    for(int k=0;k<3;k++) {
        vec2 a=k==0?vec2(0.07,0.08):finger[k-1];
        vec2 b=k==0?finger[0]:finger[k];
        a.y+=a.x*flap;b.y+=b.x*flap;
        vec2 ctrl=mix(a,b,0.52)+vec2(0.0,k==0?0.14:0.12);
        vec2 last=a;
        for(int j=1;j<=5;j++) {
            float u=float(j)/5.0;
            vec2 next=mix(mix(a,ctrl,u),mix(ctrl,b,u),u);
            wing=min(wing,hkSeg(q,last,next));last=next;
        }
    }
    for(int k=0;k<3;k++) {
        vec2 a=finger[k],b=finger[k+1];
        a.y+=a.x*flap;b.y+=b.x*flap;
        vec2 ctrl=mix(a,b,0.5)+vec2(-0.03,0.17);
        vec2 last=a;
        for(int j=1;j<=5;j++) {
            float u=float(j)/5.0;
            vec2 next=mix(mix(a,ctrl,u),mix(ctrl,b,u),u);
            wing=min(wing,hkSeg(q,last,next));last=next;
        }
    }
    wing=min(wing,hkSeg(q,finger[3]+vec2(0.0,finger[3].x*flap),vec2(0.04,-0.10)));
    float body=(length(p/vec2(0.085,0.18))-1.0)*0.085;
    float ears=min(hkSeg(q,vec2(0.025,0.13),vec2(0.075,0.29)),hkSeg(q,vec2(0.075,0.29),vec2(0.09,0.12)));
    vec3 col=vjLine(min(wing,min(body,ears)),ink,gain);
    for(int k=0;k<3;k++) {
        vec2 tip=finger[k];tip.y+=tip.x*flap;
        vec2 root=vec2(0.055,0.045);
        col+=vjLine(hkSeg(q,root,tip),ink,gain*hkDR(0.0,0.4,0.9,uD3));
        vec2 a=mix(root,tip,0.45),b=mix(root,tip,0.78);
        col+=vjLine(hkSeg(q,a,b+vec2(-0.015,0.035)),ink,gain*uD3x*0.18);
        col+=vjLine(length(q-tip)-0.010,ink,gain*uD3x*0.3);
    }
    float ribs=abs(mod(p.y+0.20,0.045)-0.0225);
    col+=vjLine(ribs,ink,gain*uD3x*0.18)*(1.0-smoothstep(0.035,0.07,abs(p.x)))*(1.0-smoothstep(0.10,0.14,abs(p.y)));
    float eye=length(vec2(abs(p.x)-0.036,p.y-0.09))-0.009;
    col+=vjLine(eye,vec3(1.0,0.25,0.10),gain*0.7);
    return col;
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);float t=uTime*0.12,hit=hkHit(),B=hkBass(),st=hkStepBeat();
    vec4 C=hkClimax(35.0,153.0,22.0);
    vec3 ink=mix(vec3(0.56,0.13,1.0),vec3(1.0,0.055,0.12),uD5);
    vec3 accent=vec3(0.06,0.65,0.85);
    vec3 col=vec3(0.0);
    // Tunel en perspectiva con travesanos en forma de chevron.
    for(int j=0;j<8;j++) {
        float z=fract(float(j)/8.0-t*0.05-0.04*st),s=0.12+z*z*2.7;
        vec2 q=p/s;
        float chevron=abs(q.y)+abs(q.x)*0.55-1.0;
        col+=vjLine(chevron,accent,0.15*smoothstep(0.0,0.15,z)*(1.0-smoothstep(0.85,1.0,z)));
    }
    // Tres siluetas cercanas muestran el detalle; la bandada aporta profundidad.
    for(int hero=0;hero<3;hero++) {
        float h=float(hero);
        vec2 center=vec2((h-1.0)*1.35,0.12+0.23*sin(t*0.5+h*2.0)+0.06*hit*sin(h*2.0+1.0));
        float size=(hero==1?0.73:0.49)*(1.0+0.08*hit+0.04*B);
        vec2 q=rot2((h-1.0)*0.12)*(p-center)/size;
        float flap=sin(t*1.5+h*1.7)*hkDR(0.0,0.245,0.6,uD4)+hit*0.25+B*0.1;
        col+=bfBat(q,flap,ink,hero==1?0.85:0.62);
    }
    float count=hkDR(1.0,12.0,24.0,uD1);
    for(int j=0;j<24;j++) {
        float fj=float(j),show=revealAt(count,fj);if(show<0.001)continue;
        float seed=hash21(vec2(fj,5.0));
        float z=fract(fj*0.618033-t*0.07-0.03*st);
        float depth=0.24+z*z*2.1;
        float a=fj*2.39996+0.12*sin(t+fj);
        vec2 center=vec2(cos(a)*1.55,sin(a)*0.68)*depth*(hkDR(0.3,0.8,1.3,uD2)+C.y*0.12);
        // Una voz desvia su grupo de murcielagos hacia una ruta propia.
        int voice=j%N_KEYS;
        float keyed=keyEnv(voice,0.04,0.85);
        center+=vec2(keyPos(voice)-0.5,0.25*sin(fj))*keyed*0.22;
        float size=0.095+z*z*0.43;
        float flap=sin(t*2.0+seed*TAU)*hkDR(0.0,0.33,0.8,uD4)+hit*0.25;
        float fade=smoothstep(0.0,0.12,z)*(1.0-smoothstep(0.86,1.0,z))*show;
        vec2 q=rot2(0.15*sin(a))*(p-center)/size;
        col+=bfBat(q,flap,ink,fade*0.42);
        vec2 tail=p-center;
        float trail=hkSeg(tail,vec2(0.0,-size*0.14),vec2(0.04,-size*0.14-0.22*z));
        col+=vjLine(trail,ink,fade*hkDR(0.0,0.05,0.25,uD6));
    }
    col=vjKeys(col,p,ink,accent);
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
