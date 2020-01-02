var vs_default = `
    varying vec2 vUv; 
    void main() { 
        gl_Position = projectionMatrix* modelViewMatrix * vec4( position, 1.0); 
        vUv = uv; 
    }
`;
/********馬賽克********/

var fs_mosaic = `
    uniform sampler2D texture; 
    varying vec2 vUv; 
    uniform float gran;
    vec2 vUvm;
    uniform vec2 headNDC;
    uniform float headSize;
    uniform bool front;

    void main() {
        if(front){
            float d = distance (headNDC, vUv);
            float borderWidth = headSize*0.1; 
            if (d < headSize) {
                vUvm = floor (vUv/gran)*gran;
                gl_FragColor = texture2D(texture, vUvm);
            } else if (d < headSize+borderWidth) {
                //馬賽克外圈的顏色
                gl_FragColor = vec4(1,0.0784313725,0.576470588,1);
            } else {
                vUvm = vUv;
                gl_FragColor = texture2D(texture, vUvm);
            }
        }
        else{
            //如果看不到臉直接把材質貼回去
            gl_FragColor = texture2D(texture, vUv);
        }
    }
`;

/********海報********/
var vs_texSwap = `
    uniform int which; // 0, 1, 2, 3
    varying vec2 vUv; 
    void main() {
    gl_Position = projectionMatrix* modelViewMatrix * vec4( position, 1.0);      
    vUv = vec2 ((uv.s + float(which))/4., uv.t); 
    }
`;

var fs_texSwap = `
uniform sampler2D texture; 
varying vec2 vUv; 
void main() {
    vec3 color = texture2D (texture, vUv).rgb;
    gl_FragColor = vec4 (color, 1.0); 
}
`;

var vs_sobel = `
    varying vec2 vUv; 
    void main() { 
        gl_Position = projectionMatrix* modelViewMatrix * vec4( position, 1.0); 
        vUv = uv; 
    }
`;

var fs_sobel = `
    uniform sampler2D texture; 
    uniform vec2 imageSize;
    varying vec2 vUv; 
    float step_w = 1.0/imageSize.x; 
    float step_h = 1.0/imageSize.y; 
    void main() { 
        float kernel[9];
            
        vec2 offset[9]; 
        offset[0]=vec2(-step_w, -step_h); 
        offset[1]=vec2(0.0, -step_h); offset[2]= vec2(step_w, -step_h), 
        offset[3]=vec2(-step_w, 0.0), offset[4]=vec2(0.0, 0.0), offset[5]=vec2(step_w, 0.0), 
        offset[6]=vec2(-step_w, step_h), offset[7]=vec2(0.0, step_h), offset[8]=vec2(step_w, step_h); 
        
        // sobel filter - Gx
        for (int i = 0; i < 9; i++) kernel[i]=0.0; 
        kernel[0] = -1.0; kernel[2] = 1.0;
        kernel[3] = -2.0; kernel[5] =  2.0;
        kernel[6] = -1.0; kernel[8] = 1.0;

        vec3 sumX= vec3(0.0); 
        for (int i=0 ; i < 9; i++) { 
            vec3 tmp=texture2D (texture, vUv+offset[i]).rgb; 
            sumX += tmp*kernel[i]; 
        }
        
        // sobel filter - Gy
        for (int i = 0; i < 9; i++) kernel[i]=0.0; 
        kernel[6] = -1.0; kernel[7] = -2.0; kernel[8] = -1.0;
        kernel[0] = 1.0; kernel[1] = 2.0; kernel[2] = 1.0;

        vec3 sumY= vec3(0.0); 
        for (int i=0 ; i < 9; i++) { 
            vec3 tmp=texture2D (texture, vUv+offset[i]).rgb; 
            sumY += tmp*kernel[i]; 
        }
        vec3 delX = vec3 (1, 0, sumX);
        vec3 delY = vec3 (0, 1, sumY);
        vec3 n = normalize (cross (delX, delY));
        
        vec3 encode = (n + vec3 (1))/2.0;
        
        gl_FragColor = vec4 (encode, 1.0); 
    }
`;

var vs_normalmap = `
    uniform vec3 lightpos;

    attribute vec4 tangent;
    varying vec2 vUv;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    varying vec3 vNormal;
    varying vec3 vLL;

    void main() {
        vec4 vWorldpos = modelMatrix * vec4( position, 1.0 ) ;
        vec2 myrepeat = vec2 (1.0, 1.0);
        vUv = myrepeat*uv;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        // TBN in eyespace 
        // no need to normalize these varying variable
        // as they will be normalized in fragment shader
        //
        vNormal = normalMatrix * normal ;
        vTangent = normalMatrix * tangent.xyz ;
        vBitangent = cross( vNormal, vTangent ) ;

        vLL = normalMatrix * (lightpos - vWorldpos.xyz);
    }
`;

var fs_normalmap = `
    uniform sampler2D tNormal;
    varying vec2 vUv;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    varying vec3 vNormal;
    varying vec3 vLL;

    void main() {
        vec3 normalTex = texture2D (tNormal, vUv).xyz * 2.0 - 1.0;
        normalTex.xy *= 6.0;    // exaggerate the normal deviation
        normalTex = normalize( normalTex );

        mat3 tsb = mat3( normalize( vTangent ), normalize( vBitangent ), normalize( vNormal ) );
        vec3 finalNormal = tsb * normalTex;
        float ndotl = dot (normalize (vLL), normalize (finalNormal));
        gl_FragColor = vec4( vec3(ndotl), 1 );
    }
`;

/********灰階********/
var fs_mono = `
    uniform sampler2D texture;
    uniform vec2 imageSize;
    varying vec2 vUv;

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() { 
        vec3 color = texture2D (texture, vUv).rgb;
        vec3 hh = rgb2hsv (color);
        hh.y = 0.0;
        vec3 cc = hsv2rgb (hh);
        gl_FragColor = vec4 (cc, 1.0); 
    }
`;
//shader for eyeNormal Plot
var vs_Normal = `
    varying vec3 vNormal;
    void main() { 
        gl_Position = projectionMatrix* modelViewMatrix * vec4( position, 1.0); 
        vNormal = normalMatrix*normal;
    }
`;

var fs_Normal = `
    varying vec3 vNormal; // [-1,1]^3
    void main() {    
        vec3 color = (normalize(vNormal)+1.0)/2.; // [0,1]^3
        gl_FragColor = vec4 (color,1);
    }
`;

var fs_Filter = `
    uniform sampler2D texture; 
    uniform int imageSize;
    varying vec2 vUv; 
    void main() { 
        float step_w = 1.0/float(imageSize);
        float step_h = 1.0/float(imageSize);
        // Laplace filter
        float kernel[9]; 
        kernel[0] = kernel[2] = kernel[6] = kernel[8] = 0.0/1.0; 
        kernel[1] = kernel[3] = kernel[5] = kernel[7] = 1.0/1.0; 
        kernel[4] = -4.0/1.0; 
        vec2 offset[9]; 
        offset[0]=vec2(-step_w, -step_h); 
        offset[1]=vec2(0.0, -step_h); offset[2]= vec2(step_w, -step_h), 
        offset[3]=vec2(-step_w, 0.0), offset[4]=vec2(0.0, 0.0), offset[5]=vec2(step_w, 0.0), 
        offset[6]=vec2(-step_w, step_h), offset[7]=vec2(0.0, step_h), offset[8]=vec2(step_w, step_h); 

        vec3 sum= vec3(0.0); 
        for (int i=0 ; i < 9; i++) { 
            vec3 tmp=texture2D (texture, vUv+offset[i]).rgb; 
            sum += tmp*kernel[i]; 
        }

        if ((sum.r+sum.g+sum.b)/3.0 < 0.1) // if close to (0,0,0)
            discard;
        else 
            gl_FragColor = vec4 (0,0,0, 1.0); 
    }
`;

var fs_Cut = `
    uniform sampler2D texture; 
    varying vec2 vUv;
    void main() {
        vec3 color = texture2D (texture, vUv).rgb;
        if (color.r <= 0.05 && color.g >= 0.95 && color.b <= 0.05)  // close to (0,1,0)
        discard;
        else
        gl_FragColor = vec4 (color, 1);
    }
`;

var vs_toon = `
    uniform vec3 lightpos;
    varying float ndotl;
    varying vec3 lightdir;
    varying vec3 eyenorm;
    varying vec2 vUv;
    
    void main() {
        gl_Position = projectionMatrix* modelViewMatrix * vec4( position, 1.0);
        vUv = uv;
        //vec4 worldpos = modelMatrix * vec4 (position, 1.0);
        //ndotl = dot (normalize(lightpos.xyz - worldpos.xyz), normal);
        vec4 eyepos = modelViewMatrix * vec4 (position, 1.0);
        vec4 lighteye = viewMatrix * vec4 (lightpos, 1.0);
        lightdir = lighteye.xyz - eyepos.xyz;
        eyenorm = normalMatrix * normal;
    }
`;

var fs_toon = `
    varying float ndotl;
    varying vec3 lightdir;
    varying vec3 eyenorm;
    uniform sampler2D mytex;
    varying vec2 vUv;
    uniform vec3 uniColor;

    void main() {
        float nn = dot (normalize(lightdir), normalize(eyenorm));
        if (nn > 0.8) {
            nn= 1.0;
        } else if (nn > 0.6) {
            nn = 0.6;
        } else {
            nn = 0.2;
        }

        // vec4 texColor = texture2D (mytex, vUv);
        // gl_FragColor = nn*texColor;

        gl_FragColor = vec4 (nn *uniColor, 1.0);
    }
`;

//perlin
var vs_perlin = `
    varying vec4 wPos;
    varying vec2 vUv;
    uniform vec2 scale;
    uniform vec2 offset;

    void main() {
        vUv = uv * scale + offset;
        wPos = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

var fs_perlin = `
    //
    // FROM: http://jsfiddle.net/jmchen/cby3d1ag/
    //
    vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 mod289(vec4 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
        return mod289(((x * 34.0) + 1.0) * x);
    }

    vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        //   x0 = x0 - 0.0 + 0.0 * C.xxx;
        //   x1 = x0 - i1  + 1.0 * C.xxx;
        //   x2 = x0 - i2  + 2.0 * C.xxx;
        //   x3 = x0 - 1.0 + 3.0 * C.xxx;
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy; // -1.0+3.0*C.x = -0.5 = -D.y

        // Permutations
        i = mod289(i);
        vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
        float n_ = 0.142857142857; // 1.0/7.0
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z); //  mod(p,7*7)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_); // mod(j,N)

        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
        //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        //Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1),
        dot(p2, x2), dot(p3, x3)));
    }

    uniform int terms;
    uniform int use2D;
    uniform float time;
    varying vec2 vUv;
    varying vec4 wPos;
    
    //取得alphaMap
    uniform sampler2D mask;

    float surface3(vec3 coord) {
        float height = 0.0;
        height += abs(snoise(coord)) * 1.0;
        if (terms >= 2)    
            height += abs(snoise(coord * 2.0)) * 0.5;
        if (terms >= 3)
            height += abs(snoise(coord * 4.0)) * 0.25;
        if (terms >= 4)
            height += abs(snoise(coord * 8.0)) * 0.125;
        // can add more terms ...
        if (terms >= 5)   
                height += abs(snoise(coord * 16.0)) * 0.0625;
        return height;
    }

    void main() {
        float scale = 1.0;
        vec3 coord = vec3(scale * vUv[0], scale * vUv[1], time);
        float height = surface3(coord);

        float r;
        r = height;

        //找透明區塊
        vec4 texColor = texture2D (mask, vUv);
        if(texColor.a < 0.5){
            gl_FragColor = vec4(r*0.3, r*0.4, r*0.5, 1.0) * 1.2;
        }else{
            gl_FragColor = vec4(r*0.97, r*0.9, r*0.87, 0.5) * 1.2;
        }
    }
`;

export { vs_default, fs_mosaic, vs_texSwap, fs_texSwap, vs_sobel, fs_sobel, vs_normalmap, fs_normalmap, fs_mono, vs_Normal, fs_Normal, fs_Filter, fs_Cut, vs_toon, fs_toon, vs_perlin, fs_perlin };