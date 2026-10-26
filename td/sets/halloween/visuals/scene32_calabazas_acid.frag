// HALLOWEEN VJ 32 — CALABAZAS ACID: piel con gajos, tallado y fuego interior.
// @D1: calabazas satelite
// @D2: tamano de la calabaza principal
// @D3: sonrisa y dientes
// @D4: baile de cada calabaza
// @D5: naranja a verde veneno
// @D6: brasas y aura
// PIANO: luces de cada voz. Momento aviva el fuego y abre la sonrisa.
float paTri(vec2 p,vec2 size) {
    return max(abs(p.x)/size.x+p.y/size.y,-p.y/size.y)-0.5;
}
vec4 paPumpkin(vec2 q,float seed,float fire,float mouthOpen) {
    float t=uTime*0.18;
    q=rot2(sin(t+seed)*0.06*uD4)*q;
    // Los gajos modelan tambien la silueta, no solo el color.
    vec2 e=q/vec2(0.91,0.77);
    float longitude=asin(clamp(e.x,-0.999,0.999));
    float rib=cos(longitude*10.0);
    float radius=length(e)+rib*0.025;
    float mask=1.0-smoothstep(0.99,1.01,radius);
    float z=sqrt(max(0.0,1.0-dot(e,e)));
    vec3 normal=normalize(vec3(e.x*0.8+sin(longitude*10.0)*0.12,e.y,z));
    vec3 light=normalize(vec3(-0.6,0.9,1.5));
    float diffuse=max(0.0,dot(normal,light));
    float spec=pow(max(0.0,dot(reflect(-light,normal),vec3(0,0,1))),32.0);
    float grain=noise21(q*130.0+seed);
    vec3 skin=mix(vec3(0.65,0.115,0.012),vec3(0.13,0.42,0.017),uD5);
    float grooves=0.62+0.38*pow(0.5+0.5*rib,0.6);
    vec3 col=skin*(0.16+diffuse*0.85)*grooves*(0.85+grain*0.15);
    col+=vec3(1.0,0.65,0.30)*spec*0.22;
    // Ojos triangulares asimetricos, nariz y sonrisa curva con dientes.
    vec2 eye=vec2(abs(q.x)-0.31,q.y-0.19);
    eye=rot2(sign(q.x)*-0.24)*eye;
    float eyes=paTri(eye,vec2(0.29,0.27))*0.2;
    float nose=paTri(vec2(q.x,-q.y-0.015),vec2(0.14,0.16))*0.14;
    float curve=-0.24+0.45*q.x*q.x;
    float mouth=abs(q.y-curve)-(0.065+mouthOpen*0.075);
    mouth=max(mouth,abs(q.x)-0.55);
    float toothX=abs(fract((q.x+0.50)*6.0)-0.5);
    float tooth=step(toothX,0.20)*0.095;
    mouth=max(mouth,curve+0.08+mouthOpen*0.075-tooth-q.y-0.15);
    float cut=min(min(eyes,nose),mouth);
    float hole=1.0-smoothstep(-0.008,0.008,cut);
    float edge=exp(-abs(cut)*75.0);
    float flame=0.65+0.22*sin(q.x*17.0+t*3.0)+0.10*sin(q.y*27.0-t*4.0+seed);
    vec3 hot=mix(vec3(1.0,0.24,0.005),vec3(0.6,1.0,0.045),uD5);
    vec3 inside=hot*(0.8+fire*0.8)*flame;
    inside+=vec3(1.0,0.8,0.28)*pow(max(0.0,flame),4.0)*0.6;
    col=mix(col,inside,hole);
    col+=hot*edge*(0.15+fire*0.15);
    // Tallo curvo verde y marron con estrias longitudinales.
    vec2 stem=q-vec2(-0.035+0.12*(q.y-0.7),0.83);
    float sd=hkBox(stem,vec2(0.075,0.19));
    float sm=1.0-smoothstep(-0.008,0.008,sd);
    vec3 stemCol=vec3(0.14,0.17,0.035)*(0.55+0.45*cos(stem.x*85.0));
    col=mix(col*mask,stemCol,sm*(1.0-mask));
    return vec4(col,max(mask,sm));
}
vec4 render(vec2 uv) {
    vec2 p=centered(uv);
    float t=uTime*0.18, hit=hkHit();
    vec4 C=hkClimax(32.0,157.0,22.0);
    vec3 ember=mix(vec3(1.0,0.21,0.02),vec3(0.35,1.0,0.03),uD5);
    float fog=fbm(p*3.0+vec2(t*0.17,-t*0.13),3,0.55);
    vec3 col=vec3(0.025,0.007,0.04)+ember*fog*0.025;
    // Rejilla en perspectiva y halos independientes de cada calabaza.
    vec2 floorP=vec2(p.x/(abs(p.y+0.62)+0.15),1.0/(abs(p.y+0.62)+0.15));
    float grid=pow(0.5+0.5*cos(floorP.x*8.0),35.0)+pow(0.5+0.5*cos(floorP.y*6.0-t),35.0);
    col+=ember*grid*0.035*(1.0-smoothstep(-0.85,-0.1,p.y));
    for(int j=5;j>=0;j--) {
        float fj=float(j), reveal=j==0?1.0:revealAt(1.0+uD1*5.0,fj);
        if(reveal<0.001) continue;
        vec2 pos;
        float s;
        if(j==0) {pos=vec2(0.0,0.02);s=0.67+uD2*0.2;}
        else {
            float side=mod(fj,2.0)*2.0-1.0;
            float row=ceil(fj*0.5);
            pos=vec2(side*(0.93+row*0.35),0.18*sin(t+fj*2.1)+0.16*(row-1.0));
            s=0.42-row*0.055;
        }
        pos.y+=sin(t*1.3+fj)*0.035*uD4;
        vec2 q=(p-pos)/s;
        col+=ember*exp(-dot(q,q)*1.3)*0.12*(0.5+uD6)*(1.0+hit*0.3);
        vec4 pumpkin=paPumpkin(q,fj*7.3,hit+C.y*0.6,uD3+C.y*0.3);
        col=mix(col,pumpkin.rgb,pumpkin.a*reveal);
    }
    for(int k=0;k<2;k++) {
        float n=22.0+float(k)*14.0;
        vec2 v=p*n+vec2(sin(t)*0.4,-t*(1.3+float(k)));
        vec2 id=floor(v), f=fract(v)-hash22(id);
        float spark=exp(-length(f*vec2(1.0,0.5))*90.0);
        col+=ember*spark*uD6*0.7;
    }
    col=hkKeyLit(col,p,0.0,vec2(0.40,0.95),vec3(1.0,0.45,0.04),vec3(0.35,1.0,0.06),0.04,0.8);
    return vec4(hkFinish(col,uv,ember),1.0);
}
