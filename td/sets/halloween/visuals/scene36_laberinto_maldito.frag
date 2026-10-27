// HALLOWEEN VJ 36 — LABERINTO MALDITO
// @D1: profundidad y numero de puertas
// @D2: amplitud de los pasillos
// @D3: grabados y doble arista
// @D4: desplazamiento y pliegue
// @D5: rojo sangre a violeta
// @D6: marcas de recorrido y halo
// PIANO: enciende secciones del pasillo. Momento reorganiza el encuadre.

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

vec4 render(vec2 uv) {
    vec2 p=centered(uv);float t=uTime*0.10,hit=hkHit(),B=hkBass(),st=hkStepBeat();
    vec4 C=hkClimax(36.0,151.0,22.0);
    vec3 ink=mix(vec3(1.0,0.12,0.025),vec3(0.56,0.10,1.0),uD5);
    vec3 accent=mix(vec3(0.08,0.66,0.85),vec3(0.85,0.16,0.55),uD5);
    vec3 col=vec3(0.0);
    vec2 van=vec2(0.32*sin(t*0.23),0.14*cos(t*0.31))*uD4+vec2(sin(st*1.7),cos(st*2.3)-1.0)*0.05;
    float count=5.0+floor(uD1*7.0);
    for(int j=0;j<12;j++) {
        float fj=float(j),show=revealAt(count,fj);if(show<0.001)continue;
        float z=fract(fj/count-t*0.035-0.02*st);
        float s=0.11+z*z*3.3;
        vec2 offset=vec2(sin(fj*1.7+t*0.4),cos(fj*1.3-t*0.3))*0.08*uD4*z;
        vec2 q=(p-van-offset)/s;
        float width=0.82+uD2*0.48;
        // Puerta ortogonal de esquinas recortadas y superficie abierta.
        float door=max(abs(q.x)-width,abs(q.y)-0.72);
        door=max(door,(abs(q.x)+abs(q.y)-width-0.56)*0.7071);
        float fade=smoothstep(0.0,0.10,z)*(1.0-smoothstep(0.89,1.0,z))*show;
        col+=vjLine(door,ink,fade*(0.58+hit*0.35+B*0.15+C.y*0.13));
        col+=vjLine(door+0.045,accent,fade*uD3*0.40);
        col+=vjLine(door-0.027,ink,fade*0.18*uD3);
        // Bisel exterior con esquinas trabadas y clavijas de union.
        float arch=max(abs(q.x)-width-0.12,abs(q.y)-0.84);
        arch=max(arch,(abs(q.x)+abs(q.y)-width-0.77)*0.7071);
        col+=vjLine(arch,accent,fade*0.30);
        vec2 corner=vec2(abs(q.x)-width+0.06,abs(q.y)-0.65);
        col+=vjLine(hkBox(corner,vec2(0.035,0.027)),ink,fade*0.40*uD3);
        col+=vjLine(length(corner)-0.009,accent,fade*0.45*uD3);
        // Friso de meandros angulares sobre el dintel.
        vec2 tile=vec2(mod(q.x+width,0.16)-0.08,abs(q.y)-0.78);
        float frieze=min(hkSeg(tile,vec2(-0.06,-0.025),vec2(-0.06,0.025)),hkSeg(tile,vec2(-0.06,0.025),vec2(0.04,0.025)));
        frieze=min(frieze,hkSeg(tile,vec2(0.04,0.025),vec2(0.04,0.0)));
        float lintel=1.0-smoothstep(width-0.15,width-0.10,abs(q.x));
        col+=vjLine(frieze,ink,fade*uD3*0.35)*lintel;
        // Rieles laterales y dinteles subdivididos con perspectiva comun.
        for(int side=-1;side<=1;side+=2) {
            vec2 a=vec2(float(side)*width,-0.56);
            vec2 b=vec2(float(side)*(width+0.34),-0.90);
            col+=vjLine(hkSeg(q,a,b),accent,fade*0.35);
            // Paneles escalonados con una bifurcacion de recorrido.
            vec2 wall=vec2(float(side)*q.x-width-0.18,q.y);
            float panel=hkBox(wall,vec2(0.065,0.50));
            col+=vjLine(panel,accent,fade*0.26*uD3);
            float trace=min(hkSeg(wall,vec2(-0.025,-0.40),vec2(-0.025,0.16)),hkSeg(wall,vec2(-0.025,0.16),vec2(0.025,0.22)));
            trace=min(trace,hkSeg(wall,vec2(0.025,0.22),vec2(0.025,0.41)));
            col+=vjLine(trace,ink,fade*0.25*uD3);
            col+=vjLine(length(wall-vec2(0.025,0.41))-0.011,ink,fade*0.40*uD6);
            float x=abs(q.x)-width-0.12;
            float y=mod(q.y+0.75,0.15)-0.075;
            float hatch=hkSeg(vec2(x,y),vec2(-0.045,-0.025),vec2(0.045,0.025));
            float band=(1.0-smoothstep(0.67,0.71,abs(q.y)));
            col+=vjLine(hatch,ink,fade*(0.10+uD3*0.25))*band;
        }
        // Puerta interior desplazada para crear un pliegue de la arquitectura.
        vec2 shift=vec2(sin(t*0.45+fj)*0.25,0.0)*uD4*(0.4+C.y);
        float inner=hkBox(q-shift,vec2(width*0.38,0.52));
        col+=vjLine(inner,accent,fade*0.23*uD3);
        vec2 glyph=q-vec2(0.0,0.64);
        float rune=abs(glyph.x)+abs(glyph.y)-0.035;
        col+=vjLine(rune,ink,fade*(0.20+uD3*0.40));
        col+=vjLine(hkSeg(glyph,vec2(0.0,-0.065),vec2(0.0,0.065)),accent,fade*0.35*uD3);
        float notch=abs(q.x)-width*0.55;
        float dash=abs(q.y+0.68)-0.012;
        col+=vjLine(max(abs(notch)-0.04,dash),ink,fade*uD6*0.5);
    }
    // Cuatro lineas de fuga precisas hasta el punto de desaparicion.
    for(int k=0;k<4;k++) {
        vec2 corner=vec2(mod(float(k),2.0)*2.0-1.0,floor(float(k)/2.0)*2.0-1.0)*vec2(3.5,1.8);
        col+=vjLine(hkSeg(p,van,corner),accent,0.18+uD6*0.12);
    }
    col=vjKeys(col,p,ink,accent);
    return vec4(hkFinish(col,uv,vec3(0.0)),1.0);
}
