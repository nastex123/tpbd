import { Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { GlobeMethods } from 'react-globe.gl';
import { solarPosition } from './globeGeography';

export function addNightLayer(globe: GlobeMethods) {
  const geometry = new SphereGeometry(globe.getGlobeRadius() * 1.002, 64, 32);
  const material = new ShaderMaterial({
    uniforms: { sunDirection: { value: new Vector3() } },
    vertexShader: `
      varying vec3 surfacePoint;
      void main() {
        surfacePoint = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 surfacePoint;
      uniform vec3 sunDirection;
      void main() {
        float illumination = dot(normalize(surfacePoint), sunDirection);
        float night = 1.0 - smoothstep(-0.08, 0.035, illumination);
        gl_FragColor = vec4(0.018, 0.036, 0.085, night * 0.66);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const shadow = new Mesh(geometry, material);
  shadow.raycast = () => {};
  shadow.renderOrder = 1;
  const update = () => {
    const { lat, lng } = solarPosition(new Date());
    const { x, y, z } = globe.getCoords(lat, lng);
    material.uniforms.sunDirection.value.set(x, y, z).normalize();
  };
  update();
  const timer = window.setInterval(update, 30_000);
  const scene = globe.scene();
  scene.add(shadow);
  return () => {
    window.clearInterval(timer);
    scene.remove(shadow);
    material.dispose();
    geometry.dispose();
  };
}
