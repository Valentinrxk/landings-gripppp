// Un elemento DOM (de ew×eh px) pegado a un plano 3D: las cuatro esquinas del
// plano (lado 1, centrado; el objeto ya escalado a su tamaño de mundo) se
// proyectan con la cámara del campo y arman un matrix3d (homografía). Sirve
// para lo que tiene que ser DOM de verdad dentro de la escena: un <video> que
// el navegador reproduzca (no decodifica lo que no está en pantalla) y que se
// vea nítido.
import * as THREE from 'three';

// el cuadrado unidad → el cuadrilátero (x0,y0)…(x3,y3), en sentido horario
// desde arriba a la izquierda, como matrix3d (por columnas)
function squareToQuad(q) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = den ? (dx3 * dy2 - dx2 * dy3) / den : 0;
  const h = den ? (dx1 * dy3 - dx3 * dy1) / den : 0;
  return [x1 - x0 + g * x1, y1 - y0 + g * y1, 0, g, x3 - x0 + h * x3, y3 - y0 + h * y3, 0, h, 0, 0, 1, 0, x0, y0, 0, 1];
}

const CORNERS = [
  new THREE.Vector3(-0.5, 0.5, 0),
  new THREE.Vector3(0.5, 0.5, 0),
  new THREE.Vector3(0.5, -0.5, 0),
  new THREE.Vector3(-0.5, -0.5, 0),
];
const v = new THREE.Vector3();
const n = new THREE.Vector3();
const quad = new Array(8);

// devuelve si el frente del plano mira a la cámara
export function proyectar(el, field, obj, ew, eh) {
  obj.updateWorldMatrix(true, false);
  for (let k = 0; k < 4; k++) {
    v.copy(CORNERS[k]).applyMatrix4(obj.matrixWorld);
    const [x, y] = field.project(v.x, v.y, v.z);
    quad[k * 2] = x;
    quad[k * 2 + 1] = y;
  }
  const m = squareToQuad(quad);
  m[0] /= ew;
  m[1] /= ew;
  m[3] /= ew;
  m[4] /= eh;
  m[5] /= eh;
  m[7] /= eh;
  el.style.transform = `matrix3d(${m.map((k) => k.toFixed(6)).join(',')})`;
  // el frente mira a la cámara si la normal (z local) apunta hacia ella
  n.set(0, 0, 1).transformDirection(obj.matrixWorld);
  v.setFromMatrixPosition(obj.matrixWorld);
  return n.dot(v.sub(field.camera.position)) < 0;
}
