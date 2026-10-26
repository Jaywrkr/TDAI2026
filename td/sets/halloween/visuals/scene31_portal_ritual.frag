// HALLOWEEN VJ 31 — PORTAL RITUAL: iris astral, sellos y runas en profundidad.
// @D1: numero de sellos en profundidad
// @D2: apertura del iris central
// @D3: filigrana y grosor de los grabados
// @D4: contrarrotacion de los anillos
// @D5: amatista a fuego ritual
// @D6: polvo, rayos y halo
// PIANO: cada nota enciende su sector del portal. Momento abre el iris.
float prInk(float d, float w) { return exp(-abs(d) / max(w, 0.0006)); }
float prSeal(vec2 q, float t, float seed) {
    float r = length(q), a = atan(q.y, q.x);
    float w = mix(0.002, 0.005, uD3);
    float c = prInk(r - 1.0, w) + prInk(r - 0.91, w * 0.6);
    c += prInk(r - 0.76, w) * (0.45 + 0.55 * pow(abs(sin(a * 36.0 + seed)), 14.0));
    c += prInk(r - 1.055, w * 0.5) * pow(abs(cos(a * 64.0)), 22.0);
    // Alfabeto geometrico: un signo independiente por casillero del aro.
    float sector = floor((a + PI) / TAU * 32.0);
    float angle = (sector + 0.5) * TAU / 32.0 - PI;
    vec2 g = rot2(angle) * q; // rot2 usa una base girada en sentido horario
    g -= vec2(0.835, 0.0);
    float h = hash21(vec2(sector, seed));
    float rune = hkSeg(g, vec2(-0.025,-0.029), vec2(0.026,0.029));
    rune = min(rune, hkSeg(g, vec2(-0.025,0.029), vec2(0.026,-0.029)));
    if (h > 0.35) rune = min(rune, hkSeg(g, vec2(-0.025,0.029), vec2(0.026,0.029)));
    if (h > 0.65) rune = min(rune, hkSeg(g, vec2(0.026,-0.029), vec2(0.026,0.029)));
    c += prInk(rune, w * 0.65);
    vec2 s = rot2(-t * 0.12) * q;
    float star = 10.0;
    for (int k = 0; k < 5; k++) {
        float aa = PI * 0.5 + float(k) * TAU / 5.0;
        float bb = aa + TAU * 2.0 / 5.0;
        star = min(star, hkSeg(s, 0.69 * vec2(cos(aa),sin(aa)), 0.69 * vec2(cos(bb),sin(bb))));
    }
    c += prInk(star, w) * 0.8;
    c += prInk(r - 0.68, w * 0.5) * 0.6;
    return c;
}
vec4 render(vec2 uv) {
    vec2 p = centered(uv);
    float t = uTime * 0.13, hit = hkHit();
    vec4 C = hkClimax(31.0,145.0,22.0);
    vec3 violet = mix(vec3(0.34,0.07,0.85),vec3(0.95,0.17,0.025),uD5);
    vec3 gold = mix(vec3(0.20,0.7,1.0),vec3(1.0,0.63,0.12),uD5);
    float r = length(p), a = atan(p.y,p.x);
    float mist = fbm(p * 3.4 + vec2(t * 0.13,-t * 0.15),3,0.55);
    vec3 col = violet * exp(-r * 1.8) * (0.10 + mist * 0.2);
    // Rayos locales, sin destellos de pantalla completa.
    float rays = pow(0.5+0.5*sin(a*19.0 + sin(a*7.0-t)*2.0 + t),8.0);
    col += gold * rays * exp(-r*1.5) * smoothstep(0.1,0.5,r) * (0.04+uD6*0.12);
    float count = mix(3.0,7.0,uD1);
    for (int j=6;j>=0;j--) {
        float fj=float(j), show=revealAt(count,fj);
        if (show<0.001) continue;
        float z=fj/6.0;
        float radius=0.40 + z*z*2.2;
        radius *= 0.85 + uD2*0.3 + C.y*0.12;
        vec2 center=vec2(sin(t*0.4+z*2.0),cos(t*0.3+z))*z*0.10;
        vec2 q=rot2((t*0.12+z*0.45)*(0.3+uD4))*(p-center)/radius;
        float seal=prSeal(q,t*(mod(fj,2.0)*2.0-1.0),fj);
        float fall=mix(0.65,0.3,z)*show;
        col += mix(gold,violet,z)*seal*fall*(1.0+hit*0.35+C.y*0.25);
        float rim=exp(-abs(length(q)-1.0)*38.0);
        col += violet*rim*fall*(0.15+uD6*0.3);
    }
    // Iris organico con pupila negra, filamentos radiales y borde incandescente.
    float iris=0.25+uD2*0.10+C.y*0.10;
    float bands=sin(a*73.0+noise21(p*18.0)*5.0-t*1.6);
    float fibers=pow(0.5+0.5*bands,3.0);
    float eye=smoothstep(iris*0.25,iris*0.58,r)*(1.0-smoothstep(iris*0.9,iris,r));
    col=mix(col,vec3(0.003,0.001,0.012),1.0-smoothstep(iris*0.2,iris*0.4,r));
    col += mix(violet,gold,fibers)*eye*(0.28+fibers*0.65+hit*0.15);
    col += gold*exp(-abs(r-iris)*150.0)*0.45;
    // Brasas en capas con trayectorias estables.
    for(int k=0;k<3;k++) {
        float scale=14.0+float(k)*11.0;
        vec2 v=p*scale+vec2(t*(0.8+float(k)*0.3),-t*1.4);
        vec2 id=floor(v), f=fract(v)-0.5;
        vec2 off=(hash22(id)-0.5)*0.65;
        float spark=exp(-length((f-off)*vec2(1.0,1.8))*70.0);
        col += gold*spark*(0.15+uD6*0.85)*smoothstep(0.2,0.7,r);
    }
    col=hkKeyLit(col,p,0.0,vec2(0.32,0.9),gold,vec3(0.7,0.3,1.0),0.04,0.8);
    return vec4(hkFinish(col,uv,violet),1.0);
}
