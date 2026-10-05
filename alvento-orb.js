import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// Module-local registries; nothing is added to window.
const instances = new WeakMap();
const audioGraphs = new WeakMap();

// Pass { analyser: existingAnalyser } when the page already owns an audio graph.
// That graph must already route audio to its destination. It is never reconnected.
export function createAlventoOrb(canvas, audio = null, { analyser: suppliedAnalyser } = {}) {
  if (!(canvas instanceof HTMLCanvasElement) || (audio !== null && !(audio instanceof HTMLMediaElement))) {
    throw new TypeError("Orb requires a canvas and an audio element.");
  }
  if (instances.has(canvas)) return instances.get(canvas);
  let analyser = suppliedAnalyser || audioGraphs.get(audio)?.analyser;
  if (analyser) analyser.fftSize = 256;
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  const data = new Uint8Array(128);
  const waveform = new Float32Array(256);
  const levels = [0, 0, 0, 0];
  let disposed = false, visible = true, frame = 0, last = 0, time = 0, flow = 0;
  let lowQuality = false, samples = 0, elapsed = 0, frameCost = 0;
  let measuredFPS = 0, measuredCPU = 0;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(new THREE.Color(getComputedStyle(canvas).getPropertyValue('--bg').trim() || '#0a0a0a'));
  const scene = new THREE.Scene();
  scene.background = renderer.getClearColor(new THREE.Color());
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 4.1;
  // Canvas antialiasing does not cover composer's offscreen scene target.
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples)
  });
  const composer = new EffectComposer(renderer, sceneTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(128, 128), 0.18, 0.5, 0.85);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  const outputPass = new OutputPass();
  composer.addPass(outputPass);
  const core = new THREE.Group();
  scene.add(core);
  const uniforms = {
    uTime: { value: 0 }, uFlow: { value: 0 },
    uAudio: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
    uLime: { value: new THREE.Color('#c4f042') }
  };
  // Analytic surface derivatives keep reflections smooth between mesh vertices.
  const surfaceField = `
    vec3 surfaceData(vec3 n) {
      float theta=acos(clamp(n.y,-1.,1.));
      float phi=atan(n.z,n.x);
      float st=max(.00001,sin(theta)), ct=cos(theta);
      float belt=st*sqrt(st), beltTheta=1.5*sqrt(st)*ct;
      float p=theta*2.1+uTime*1.45;
      float q=theta*3.4-uTime*1.15;
      float turn=phi+.18*sin(p)+.10*sin(q)+.16*sin(uFlow*.85);
      float turnTheta=.378*cos(p)+.34*cos(q);
      float a=turn*7.+theta*.65;
      float b=turn*11.-theta*2.+uTime*.8;
      float crease=.5+.5*sin(a+.65);
      float crease4=crease*crease*crease*crease;
      float fold=.035*sin(a)-.068*crease4*crease+.008*sin(b);
      float df=.035*cos(a)-.17*crease4*cos(a+.65);
      float foldTheta=df*(7.*turnTheta+.65)+.008*cos(b)*(11.*turnTheta-2.);
      float foldPhi=df*7.+.088*cos(b);
      float m=theta*5.+phi*3.-uTime*1.5;
      float voice=phi*4.+uTime*2.;
      float gain=1.+uBass*.2+uMid*.35;
      float layer=fold*gain+.014*sin(m)+.018*uAudio*sin(voice);
      float radius=1.+belt*layer;
      float thetaDerivative=beltTheta*layer+belt*(foldTheta*gain+.07*cos(m));
      float phiDerivative=belt*(foldPhi*gain+.042*cos(m)+.072*uAudio*cos(voice));
      return vec3(radius,thetaDerivative,phiDerivative);
    }
  `;
  const shellMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime, uFlow, uAudio, uBass, uMid;
      varying vec3 vDirection, vView;
      ${surfaceField}
      void main() {
        vec3 n=normalize(position);
        vec3 p=n*surfaceData(n).x*1.22;
        vDirection=n;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        vView=-mv.xyz;
        gl_Position=projectionMatrix*mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uLime;
      uniform float uTime, uFlow, uAudio, uBass, uMid, uHigh;
      uniform mat3 normalMatrix;
      varying vec3 vDirection, vView;
      ${surfaceField}
      // Smooth angular studio lights avoid projection singularities and hard patches.
      float softbox(vec3 ray, vec3 center, vec2 size) {
        vec3 axis=normalize(center);
        vec3 horizontal=normalize(cross(vec3(0.,1.,0.),axis));
        vec3 vertical=cross(axis,horizontal);
        float forward=dot(ray,axis);
        vec2 angles=vec2(atan(dot(ray,horizontal),forward),atan(dot(ray,vertical),forward));
        vec2 q=angles/size;
        return exp(-2.*dot(q,q))*smoothstep(-.1,.2,forward);
      }
      void main() {
        vec3 n=normalize(vDirection);
        vec3 field=surfaceData(n);
        float st=max(.00001,length(n.xz));
        vec3 eTheta=vec3(n.y*n.x/st,-st,n.y*n.z/st);
        vec3 ePhi=vec3(-n.z/st,0.,n.x/st);
        vec3 localNormal=normalize(n-eTheta*field.y/field.x-ePhi*field.z/(field.x*st));
        vec3 N=normalize(normalMatrix*localNormal), V=normalize(vView);
        vec3 R=reflect(-V,N);
        float nv=max(dot(N,V),0.);
        float fresnel=.035+.965*pow(1.-nv,4.);
        float broad=softbox(R,vec3(2.8,.3,1.),vec2(.46,1.18));
        float strip=softbox(R,vec3(-2.8,.5,.4),vec2(.18,1.16));
        float top=softbox(R,vec3(-.8,2.,.5),vec2(.74,.23));
        float rim=softbox(R,vec3(1.2,.1,-2.),vec2(.59,1.32));
        float bottom=softbox(R,vec3(-.2,-2.,-.7),vec2(.94,.23));
        float occlusion=smoothstep(.82,1.02,field.x);
        vec3 pigment=uLime, pearl=mix(pigment,vec3(1.),.92);
        vec3 reflection=pearl*(broad*3.4+top*2.6+strip*2.1);
        reflection+=mix(pigment,pearl,.25)*(rim*1.8+bottom*.7);
        vec3 color=pigment*.002;
        color+=reflection*(.018+fresnel*1.6)*(.45+.55*occlusion);
        color+=pigment*pow(1.-nv,3.)*.16;
        color*=1.+uAudio*.65+uHigh*.4;
        gl_FragColor=vec4(color,1.);
      }
    `
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1,128,96),shellMaterial);
  core.add(shell);

  // Lazily create an audio graph on a user gesture; reuse it on remount.
  // Keeping its playback route alive on destroy avoids muting the existing player.
  function activateAudio() {
    if (disposed || !audio) return;
    try {
      if (!analyser) {
        let graph = audioGraphs.get(audio);
        if (!graph) {
          const context = new AudioContext();
          const next = context.createAnalyser();
          next.fftSize=256; next.smoothingTimeConstant=.82;
          let source;
          try { source=context.createMediaElementSource(audio); }
          catch (error) { void context.close(); throw error; }
          source.connect(next); next.connect(context.destination);
          graph={ analyser: next, context, source };
          audioGraphs.set(audio,graph);
        }
        analyser=graph.analyser;
      }
      if (analyser.context.state==='suspended') {
        void analyser.context.resume().catch(error => console.warn('Orb audio resume:',error));
      }
    } catch (error) {
      console.error('Orb: pass the existing analyser as the third argument if this audio already has a MediaElementSource.',error);
      audio?.removeEventListener('play',activateAudio);
      document.removeEventListener('pointerdown',activateAudio);
      document.removeEventListener('keydown',activateAudio);
    }
  }
  audio?.addEventListener('play',activateAudio);
  document.addEventListener('pointerdown',activateAudio);
  document.addEventListener('keydown',activateAudio);

  function resize() {
    const {width,height}=canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio=Math.min(2,Math.max(1.5,devicePixelRatio || 1));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width,height,false);
    composer.setPixelRatio(ratio);
    composer.setSize(width,height);
    // Must happen AFTER composer.setSize(), which resizes every pass.
    const limit=lowQuality ? 96 : 128;
    const scale=Math.min(1,limit/Math.max(width*ratio,height*ratio));
    bloom.setSize(Math.round(width*ratio*scale),Math.round(height*ratio*scale));
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
  }
  function animate(now) {
    frame=0;
    if (disposed || document.hidden || !visible) return;
    if (!canvas.isConnected) { destroy(); return; }
    const start=performance.now();
    const raw=last ? (now-last)/1000 : 1/60;
    const dt=Math.min(raw,.15); last=now; if (!reducedMotion.matches) time+=dt;
    const target=[0,0,0,0], counts=[128,0,0,0];
    if (analyser && !audio.paused && !audio.ended && audio.readyState>=2) {
      analyser.getByteFrequencyData(data);
      analyser.getFloatTimeDomainData(waveform);
      let energy=0;
      for (const value of waveform) energy+=value*value;
      const hz=analyser.context.sampleRate/analyser.fftSize;
      for (let i=0;i<data.length;i++) {
        const value=data[i]/255;
        target[0]+=value;
        const band=i*hz<300 ? 1 : i*hz<3400 ? 2 : 3;
        if (i*hz<=8000) { target[band]+=value; counts[band]++; }
      }
      for (let i=0;i<4;i++) target[i]/=Math.max(1,counts[i]);
      // RMS catches spoken syllables without diluting them across silent FFT bins.
      target[0]=Math.min(1,Math.sqrt(energy/waveform.length)*5);
      target[1]=Math.min(1,target[1]*.9);
      target[2]=Math.min(1,target[2]*1.2);
      target[3]=Math.min(1,target[3]*1.4);
    }
    for (let i=0;i<4;i++) levels[i]+=(target[i]-levels[i])*(1-Math.exp(-dt*(target[i]>levels[i]?24:7)));
    if (!reducedMotion.matches) flow+=dt*(1.5+levels[0]*3.0+levels[2]*2.);
    ['uAudio','uBass','uMid','uHigh'].forEach((key,i)=>uniforms[key].value=reducedMotion.matches ? 0 : levels[i]);
    uniforms.uTime.value=time; uniforms.uFlow.value=flow;
    core.scale.setScalar(reducedMotion.matches ? 1 : 1+Math.sin(time*1.1)*.004+levels[1]*.014);
    core.rotation.y=.18+Math.sin(time*1.05)*.12;
    core.rotation.z=-.16+Math.sin(time*.85)*.035;
    core.rotation.x=.08+Math.sin(time*1.2)*.045;
    bloom.strength=.15+levels[0]*.15+levels[3]*.12;
    composer.render();
    frameCost+=performance.now()-start; elapsed+=raw; samples++;
    if (elapsed>=3) {
      measuredFPS=samples/elapsed; measuredCPU=frameCost/samples;
      if (measuredFPS<50 && !lowQuality) { lowQuality=true; resize(); }
      elapsed=0; samples=0; frameCost=0;
    }
    frame=requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(frame); frame=0; last=0;
    elapsed=0; samples=0; frameCost=0;
    if (!disposed && !document.hidden && visible) frame=requestAnimationFrame(animate);
  }
  const resizeObserver=new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting; sync();});
  intersectionObserver.observe(canvas);
  document.addEventListener('visibilitychange',sync);
  const removalObserver=new MutationObserver(()=>{if(!canvas.isConnected) destroy();});
  removalObserver.observe(document.body,{childList:true,subtree:true});
  function destroy() {
    if (disposed) return;
    disposed=true; cancelAnimationFrame(frame); frame=0;
    resizeObserver.disconnect(); intersectionObserver.disconnect(); removalObserver.disconnect();
    document.removeEventListener('visibilitychange',sync);
    document.removeEventListener('pointerdown',activateAudio);
    document.removeEventListener('keydown',activateAudio);
    audio?.removeEventListener('play',activateAudio);
    for (const mesh of [shell]) {mesh.geometry.dispose(); mesh.material.dispose();}
    outputPass.dispose(); bloom.dispose(); renderPass.dispose(); composer.dispose(); renderer.dispose();
    instances.delete(canvas);
  }
  const api={destroy, getStats:()=>({fps:measuredFPS,cpuMs:measuredCPU,lowQuality,levels:[...levels],running:!!frame,pixelRatio:renderer.getPixelRatio(),samples:sceneTarget.samples,segments:shell.geometry.parameters.widthSegments})};
  instances.set(canvas,api);
  resize(); sync();
  return api;
}

