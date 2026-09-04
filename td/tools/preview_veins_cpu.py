#!/usr/bin/env python3
"""Port a CPU (numpy) de scene00_veins.frag, para previsualizar sin GPU ni TD.

    pip install numpy pillow
    python3 td/tools/preview_veins_cpu.py salida.png
    python3 td/tools/preview_veins_cpu.py salida.png "{'density':0.85,'hue':0.5}"

Sirve para iterar el look de un shader rapido y para comprobar como reacciona
a valores concretos de los knobs y del audio sin tener que montar el rig.
Ojo: es una REPLICA del .frag, no se genera desde el. Si editas el shader,
edita tambien esto o el preview mentira.

Parametros: t density hue chaos level bass high kick beat
"""
import numpy as np, sys
from PIL import Image
F=np.float32
def fract(x): return x-np.floor(x)
def hash22(px,py):
    ax=fract(px*F(123.34)); ay=fract(py*F(234.34)); az=fract(px*F(345.65))
    d=ax*(ax+F(34.45))+ay*(ay+F(34.45))+az*(az+F(34.45))
    return fract((ax+d)*(ay+d)), fract((ay+d)*(az+d))
def hash21(px,py):
    x=fract(px*F(123.34)); y=fract(py*F(456.21)); d=x*(x+F(45.32))+y*(y+F(45.32))
    return fract((x+d)*(y+d))
def noise21(px,py):
    ix,iy=np.floor(px),np.floor(py); fx,fy=px-ix,py-iy
    ux=fx*fx*(3-2*fx); uy=fy*fy*(3-2*fy)
    def g(ox,oy):
        hx,hy=hash22(ix+ox,iy+oy); return (hx-F(.5))*(fx-ox)+(hy-F(.5))*(fy-oy)
    a,b,c,d=g(0,0),g(1,0),g(0,1),g(1,1)
    ab=a+(b-a)*ux; cd=c+(d-c)*ux
    return np.clip(F(.5)+F(1.6)*(ab+(cd-ab)*uy),0,1)
C6,S6=F(np.cos(.6)),F(np.sin(.6))
def fbm(px,py,o,r=F(.5)):
    s=np.zeros_like(px); n=F(0); a=F(.5)
    for _ in range(o):
        s=s+a*noise21(px,py); n=n+a; a=a*r
        rx=C6*px-S6*py; ry=S6*px+C6*py; px=rx*F(2.02)+F(13.7); py=ry*F(2.02)+F(13.7)
    return s/n
def ss(e0,e1,x):
    t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
def fwidth(a):
    gy,gx=np.gradient(a); return np.abs(gx)+np.abs(gy)
def vein(n,w):
    d=np.abs(n-F(.5)); g=np.maximum(fwidth(n),F(1e-6)); return 1-ss(0,w*g,d)
def hsv2rgb(h,s,v):
    return [v*(1+(np.clip(np.abs(fract(h+F(k))*6-3)-1,0,1)-1)*s) for k in (0.,2/3,1/3)]
def warp(px,py,t,amt,O=3):
    a=fbm(px*F(.70),py*F(.70)+t*F(.07),O); b=fbm(px*F(.70)+F(4.3)-t*F(.05),py*F(.70)+F(1.7),O)
    return px+amt*(a-F(.5))*2, py+amt*(b-F(.5))*2

def render(W,H,t=8.,density=.5,hue=.0,chaos=.35,level=.35,bass=.4,
           high=.3,kick=.15,beat=.35):
    t=F(t); ys,xs=np.mgrid[0:H,0:W]
    uvx=F((xs+.5)/W); uvy=F(1-(ys+.5)/H); asp=F(W/H)
    px=(uvx-F(.5))*asp*2; py=(uvy-F(.5))*2
    br=1+F(.05)*np.sin(t*F(.5)); px/=br; py/=br  # Fase 2: solo tiempo, no level
    px=px+t*F(.018); py=py+t*F(.011)

    cover=fbm(px*F(.42)+F(3.1),py*F(.42)+t*F(.03),3)
    cover=ss(F(.52)-F(density)*F(.30),F(.80)-F(density)*F(.22),cover)  # Fase 2: sin level

    wax,way=warp(px,py,t,F(.25)+F(chaos)*F(.80))
    na=fbm(wax*F(.85),way*F(.85),4,F(.50))
    wT=F(1.3)+(1-F(density))*F(1.0)  # Fase 2: sin bass (era geometria)
    trunk=vein(na,wT); tGlow=vein(na,wT*F(7.))

    wbx,wby=warp(px*F(2.6)+F(7.1),py*F(2.6)+F(7.1),t*F(1.3),F(.15)+F(chaos)*F(.45))
    nb=fbm(wbx*F(2.2),wby*F(2.2),3,F(.55))
    wC=F(.8)+(1-F(density))*F(.5)  # Fase 2: sin bass
    cap=vein(nb,wC)*ss(F(.05),F(.45),tGlow)*(F(.35)+F(density)*F(.9))
    cGlow=vein(nb,wC*F(6.))*ss(F(.05),F(.45),tGlow)

    veins=np.maximum(trunk,cap)*cover; tGlow=tGlow*cover; cGlow=cGlow*cover

    phase=fbm(wax*F(.9),way*F(.9),2)
    flow=fract(phase*F(3.5)-t*F(.30)-F(beat)*F(.20))
    pulse=ss(0,F(.30),flow)*ss(F(.90),F(.55),flow)

    core=veins*(F(.35)+F(1.20)*pulse+F(1.0)*F(kick))
    halo=(tGlow*F(.75)+cGlow*F(.30))*(F(.45)+F(.55)*F(level)+F(.85)*F(beat))

    h=F(hue)
    dC=[c*F(.10) for c in hsv2rgb(fract(h+F(.60)),F(.85),F(1.))]
    bC=hsv2rgb(fract(h+F(.98)),F(.95),F(1.))
    cC=hsv2rgb(fract(h+F(.06)),F(.40),F(1.))
    col=[]
    for d_,b_,c_ in zip(dC,bC,cC):
        col.append(d_*(F(.14)+F(1.00)*halo)+b_*core*F(1.25)
                   +c_*(core**F(3.))*F(2.2)+b_*halo*F(.75)+c_*cap*F(high)*F(.35))
    # audioLift: bajos suben el brillo de lo que ya esta claro, nunca la geometria.
    lum = F(0.299)*col[0]+F(0.587)*col[1]+F(0.114)*col[2]
    col = [c*(1+F(bass)*F(0.8)*lum) for c in col]
    col=[c/(1+c) for c in col]
    d2=((uvx-F(.5))*2)**2+((uvy-F(.5))*2)**2
    vig=1+(np.clip(1-d2*F(.55),0,1)-1)*F(.55)
    dith=(hash21(uvx*F(W),uvy*F(W))-F(.5))*F(.012)
    return (np.clip(np.stack([c*vig+dith for c in col],-1),0,1)*255).astype(np.uint8)

out=sys.argv[1]; kw=eval(sys.argv[2]) if len(sys.argv)>2 else {}
Image.fromarray(render(640,360,**kw)).save(out); print('ok',out)
