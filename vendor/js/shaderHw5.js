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

export { vs_gooch, fs_gooch, vs_sem, fs_sem, vs_toon, fs_toon };