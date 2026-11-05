#!/usr/bin/env python3
"""Generate launcher icon PNGs and bind them to the Android application."""
import math, os, re, struct, zlib
ROOT="android/app/src/main/res"
def render(path,size):
    raw=bytearray()
    cx=cy=(size-1)/2
    for y in range(size):
        raw.append(0)
        for x in range(size):
            nx=(x-cx)/(size*.5); ny=(y-cy)/(size*.5)
            col=(9,22,32,255)
            if abs(nx)<.88 and abs(ny)<.88: col=(12,31,42,255)
            pts=[(0,-.72),(.63,-.42),(.63,.24),(0,.72),(-.63,.24),(-.63,-.42)]
            inside=False
            for i in range(len(pts)):
                x1,y1=pts[i];x2,y2=pts[(i+1)%len(pts)]
                if ((y1>ny)!=(y2>ny)) and nx<(x2-x1)*(ny-y1)/(y2-y1+1e-9)+x1: inside=not inside
            if inside: col=(224,180,72,255)
            if (nx/.48)**2+(ny/.48)**2<1: col=(18,54,60,255)
            radius=math.sqrt(nx*nx+ny*ny)
            if radius<.29: col=(245,246,235,255)
            if radius<.105: col=(22,42,49,255)
            for angle in [0,72,144,216,288]:
                a=math.radians(angle); px=math.cos(a)*.19; py=math.sin(a)*.19
                if (nx-px)**2+(ny-py)**2<.025**2: col=(22,42,49,255)
            if abs(nx)>.91 and abs(ny)>.91 and (abs(nx)-.91)**2+(abs(ny)-.91)**2>.09**2: col=(0,0,0,0)
            raw.extend(col)
    def chunk(kind,data):
        return struct.pack("!I",len(data))+kind+data+struct.pack("!I",zlib.crc32(kind+data)&0xffffffff)
    data=b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack("!2I5B",size,size,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(bytes(raw),9))+chunk(b"IEND",b"")
    os.makedirs(os.path.dirname(path),exist_ok=True)
    with open(path,"wb") as f:f.write(data)
for density,size in [("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)]:
    folder=os.path.join(ROOT,"mipmap-"+density)
    render(os.path.join(folder,"ic_launcher.png"),size)
    render(os.path.join(folder,"ic_launcher_round.png"),size)
manifest="android/app/src/main/AndroidManifest.xml"
if os.path.exists(manifest):
    data=open(manifest,encoding="utf-8").read()
    def bind(match):
        attrs=re.sub(r'\sandroid:(?:icon|roundIcon)="[^"]*"',"",match.group(1))
        return '<application'+attrs+' android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round">'
    data=re.sub(r'<application\b([^>]*)>',bind,data,count=1)
    open(manifest,"w",encoding="utf-8").write(data)
