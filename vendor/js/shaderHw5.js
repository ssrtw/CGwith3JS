var myVertexShader = `
    uniform int shading;
    uniform int coordinate;
    varying vec3 color;
    varying vec4 objpos;
    varying vec4 worldpos;
    varying vec4 eyepos;

    void perVertexShading(vec3 objpos, vec3 worldpos) {
        if (coordinate == 0) {
            //物件座標
            if (objpos.x > 0.0) 
                color = vec3 (1,1,1);
            else
                color = vec3 (0,0,0);
        } else if (coordinate == 1) {
            //世界座標
            if (worldpos.x > 0.0) 
                color = vec3 (1,1,1);
            else
                color = vec3 (0,0,0);    	
        } else if (coordinate == 2) {
            //眼睛座標(直接拿varying變數，於main已經算好)
            if (eyepos.x > 0.0) 
                color = vec3 (1,1,1);
            else
                color = vec3 (0,0,0);    	
        }
    }

    void main() {
        gl_Position = projectionMatrix* modelViewMatrix * vec4(position, 1.0);
        objpos = vec4(position, 1.0);
        worldpos = modelMatrix * vec4(position, 1.0);
        eyepos = modelViewMatrix * vec4(position, 1.0);
        if (shading == 0)  // per-vertex shading
            perVertexShading(position, worldpos.xyz);
    }
`;

var myFragmentShader = `
    uniform int shading;
    uniform int coordinate;
    //用頂點上的色
    varying vec3 color;

    //傳到fragment像素做處理
    //物件座標
    varying vec4 objpos;
    //世界座標
    varying vec4 worldpos;
    //眼睛座標
    varying vec4 eyepos;

    void main() {
        if(shading==0){
            //從Vertex下手
            gl_FragColor = vec4 (color, 1.0);
        }else{
            // your homework
            //perPixelShading移到這裡
            vec3 fragcolor;
            //從Pixel下手
            if (coordinate == 0) {
                if (objpos.x > 0.0) 
                    fragcolor = vec3 (1,1,1);
                else
                    fragcolor = vec3 (0,0,0);
            } else if (coordinate == 1) {
                if (worldpos.x > 0.0) 
                    fragcolor = vec3 (1,1,1);
                else
                    fragcolor = vec3 (0,0,0);    	
            } else if (coordinate == 2) {
                if (eyepos.x > 0.0) 
                    fragcolor = vec3 (1,1,1);
                else
                    fragcolor = vec3 (0,0,0);    	
            }
            gl_FragColor = vec4 (fragcolor, 1.0);
        }
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
    //取得透明度
    uniform float opacity;

    void main() {
        float nn = dot (normalize(lightdir), normalize(eyenorm));
        if (nn > 0.8) {
            nn= 1.0;
        } else if (nn > 0.6) {
            nn = 0.6;
        } else {
            nn = 0.2;
        }

        vec4 texColor = texture2D (mytex, vUv);
        //gl_FragColor = nn*texColor;
        gl_FragColor = vec4 (nn,nn,nn, opacity);
    }
`;

var vs_gooch = `
    uniform vec3 lightpos;  // world coordinate
    varying vec3 eyelightdir;
    varying vec3 eyenormal;

    varying vec4 eyepos;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

        eyepos = modelViewMatrix * vec4 (position, 1.0);
        vec4 eyelightpos= viewMatrix * vec4 (lightpos, 1.0);
        eyelightdir = normalize (eyelightpos.xyz - eyepos.xyz);
        eyenormal = normalMatrix * normal;
    }
`;

var vs_gooch = `
    uniform vec3 lightpos;  // world coordinate
    varying vec3 eyelightdir;
    varying vec3 eyenormal;

    varying vec4 eyepos;

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

        eyepos = modelViewMatrix * vec4 (position, 1.0);
        vec4 eyelightpos= viewMatrix * vec4 (lightpos, 1.0);
        eyelightdir = normalize (eyelightpos.xyz - eyepos.xyz);
        eyenormal = normalMatrix * normal;
    }
`;

var fs_gooch = `
    varying vec3 eyelightdir;
    varying vec3 eyenormal;
    varying vec4 eyepos;

    uniform float opacity;
    uniform vec3 kcool; 
    uniform vec3 kwarm;

    void main() {
        float lDotn = dot (normalize (eyenormal), normalize (eyelightdir));    
        
        vec3 h = normalize(-normalize (eyepos.xyz) + normalize (eyelightdir));
        float shininess = 40.;    
        vec3 specular = pow (dot (eyenormal, h), shininess) *vec3 (1,1,1);
        
        float k = (1. + lDotn)/2.;
        gl_FragColor = vec4(mix (kcool, kwarm, k) + specular, opacity); // built-in: mix
    }
`;

var vs_sem = `
    varying vec2 vN;
    void main() {
        vec3 e = normalize( vec3( modelViewMatrix * vec4( position, 1.0 ) ) );
        vec3 n = normalize( normalMatrix * normal );
        vec3 r = reflect( e, n );
        float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
        vN = r.xy / m + .5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1. );
    }
`;

var fs_sem = `
    uniform sampler2D tMatCap;
    varying vec2 vN;
    uniform float opacity;
    void main() {
        vec3 base = texture2D( tMatCap, vN ).rgb;
        gl_FragColor = vec4( base, opacity);
    }
`;

export { myVertexShader, myFragmentShader, vs_gooch, fs_gooch, vs_sem, fs_sem, vs_toon, fs_toon };