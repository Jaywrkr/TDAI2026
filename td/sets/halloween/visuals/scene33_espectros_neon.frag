// HALLOWEEN VJ 33 — ESPECTROS NEON: cortejo de sudarios, rostros y filamentos.
// @D1: numero de apariciones
// @D2: longitud y deshilachado de los sudarios
// @D3: pliegues y filamentos luminosos
// @D4: vuelo y ondulacion del tejido
// @D5: ectoplasma cian a ultravioleta
// @D6: halo y niebla espectral
// PIANO: luz por voz. Momento estira los rostros y revela el cortejo.
vec4 snGhost(vec2 q,float seed,float climax) {
    float t=uTime*0.22;
    float trail=clamp((0.30-q.y)*0.75,0.0,1.0);
    q.x+=sin(q.y*5.0+t*1.7+seed)*trail*(0.06+uD4*0.13);
    float len=0.75+uD2*0.65;
    float width=0.36*(1.0-trail*0.55);
    width+=sin(q.y*17.0+t*2.0+seed)*trail*0.018;
    float cap=length((q-vec2(0.0,0.30))/vec2(0.36,0.38))-1.0;
    float hem=-len+0.08*sin(q.x*38.0+t*1.5+seed);
    float sheet=max(abs(q.x)-width,hem-q.y);
    float d=q.y>0.30?cap*0.36:sheet;
    float alpha=(1.0-smoothstep(-0.012,0.012,d))*0.90;
    // Volumen analitico y pliegues suaves para dar cuerpo al sudario.
    float roundness=sqrt(max(0.0,1.0-pow(q.x/max(width,0.01),2.0) - pow(max(0.0,q.y-0.30)/0.38,2.0)));
    float fold=0.5+0.5*cos(q.x*52.0+sin(q.y*4.0-t)*1.4+seed);
    float fine=pow(0.5+0.5*cos(q.x*112.0+q.y*6.0+t),12.0);
    float volume=0.18+roundness*0.50+pow(fold,3.0)*0.20;
    vec3 cold=mix(vec3(0.11,0.72,0.75),vec3(0.46,0.20,0.95),uD5);
    vec3 col=mix(cold,vec3(0.72,0.91,0.9),roundness*0.65)*volume;
    col+=cold*fine*(0.08+uD3*0.25)*trail;
    // Cuencas hundidas y boca abierta a la sombra de la capucha.
    vec2 eye=vec2(abs(q.x)-0.135,q.y-0.27+abs(q.x)*0.15);
    float eyes=length(eye/vec2(0.073,0.105))-1.0;
    float mouth=length((q-vec2(0.0,0.015))/vec2(0.072+climax*0.02,0.12+climax*0.08))-1.0;
    float face=min(eyes,mouth);
    float holes=1.0-smoothstep(-0.15,0.10,face);
    col=mix(col,vec3(0.003,0.009,0.02),holes*0.96);
    float eyePin=exp(-dot(eye/vec2(0.018,0.022),eye/vec2(0.018,0.022)));
    col+=vec3(0.4,1.0,0.95)*eyePin*(0.5+hkHit()*0.5);
    // Filamentos redondeados y deshilachados al pie del sudario.
    float fringe=pow(0.5+0.5*sin(q.x*83.0+sin(q.y*5.0+t)),18.0);
    alpha*=1.0-trail*0.38*(1.0-fringe);
    col+=cold*exp(-abs(d)*65.0)*0.25;
    return vec4(col,alpha);
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);
    float t=uTime*0.22;
    vec4 C=hkClimax(33.0,151.0,22.0);
    vec3 cold=mix(vec3(0.06,0.62,0.67),vec3(0.46,0.14,0.9),uD5);
    float fog=fbm(p*2.0+vec2(t*0.12,t*0.07),3,0.55);
    vec3 col=vec3(0.006,0.012,0.024)+cold*fog*0.07*(0.4+uD6);
    // Arco gotico abstracto y reflejos que estructuran el fondo.
    vec2 ap=vec2(abs(p.x),p.y);
    float arch=abs(length(ap-vec2(0.0,-0.7))-1.65);
    col+=cold*exp(-arch*90.0)*0.10;
    for(int j=6;j>=0;j--) {
        float fj=float(j), reveal=j==0?1.0:revealAt(1.0+uD1*6.0,fj);
        if(reveal<0.001) continue;
        float row=ceil(fj*0.5);
        float side=mod(fj,2.0)*2.0-1.0;
        float s=j==0?0.88:0.63-row*0.105;
        vec2 pos=j==0?vec2(0.0,0.20):vec2(side*(0.65+row*0.34),0.12+row*0.12);
        pos+=vec2(sin(t*0.7+fj)*0.065,cos(t+fj*1.7)*0.065)*uD4;
        vec2 q=(p-pos)/s;
        float halo=exp(-dot(q*vec2(1.4,0.6),q*vec2(1.4,0.6)));
        col+=cold*halo*(0.10+uD6*0.16)*reveal;
        vec4 ghost=snGhost(q,fj*2.7,C.y);
        col=mix(col,ghost.rgb*(0.75+hkHit()*0.18+C.y*0.25),ghost.a*reveal);
    }
    // Cintas de ectoplasma en primer plano, separadas de los cuerpos.
    for(int k=0;k<4;k++) {
        float fk=float(k);
        float y=-0.72+fk*0.10+sin(p.x*2.0-t*0.6+fk)*0.06;
        float line=exp(-abs(p.y-y)*180.0);
        col+=cold*line*(0.07+uD3*0.08)*uD6;
    }
    col=hkKeyLit(col,p,0.0,vec2(0.38,0.95),vec3(0.10,0.95,0.85),vec3(0.7,0.35,1.0),0.04,0.9);
    return vec4(hkFinish(col,uv,cold),1.0);
}
