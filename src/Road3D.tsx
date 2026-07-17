import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = { speed: number; lane: number; distance: number; scene: string };

function routeCenter(scene: string, metres: number) {
  if (scene === "slalom") return Math.sin(metres / 22) * .86;
  if (scene === "curve") return Math.sin((metres + 18) / 55) * .78;
  return 0;
}

export default function Road3D({ speed, lane, distance, scene: sceneName }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const live = useRef({ speed, lane, distance, sceneName });
  useEffect(() => { live.current = { speed, lane, distance, sceneName }; }, [speed, lane, distance, sceneName]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const world = new THREE.Scene();
    world.background = new THREE.Color(0x071321);
    world.fog = new THREE.FogExp2(0x0b1b29, 0.014);
    const camera = new THREE.PerspectiveCamera(64, 1, .1, 220);
    camera.position.set(0, 2.3, 6.5);
    camera.lookAt(0, 1.1, -38);

    world.add(new THREE.HemisphereLight(0x7fcfff, 0x15200e, 1.45));
    const moon = new THREE.DirectionalLight(0xd8edff, 2.2);
    moon.position.set(-8, 18, 8); moon.castShadow = true; world.add(moon);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x18222a, roughness: .94, metalness: .04 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 210), roadMat);
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -94); road.receiveShadow = true; world.add(road);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x101b17, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.035, -94); world.add(ground);

    const movers: THREE.Object3D[] = [];
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xeaf7ff, toneMapped: false });
    for (let z = -175; z < 8; z += 9) {
      for (const x of [-2.7, 2.7]) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(.13, .025, 4.2), laneMat);
        dash.position.set(x, .025, z); dash.userData = { baseX: x, roadMover: true }; world.add(dash); movers.push(dash);
      }
    }
    for (let z = -178; z < 8; z += 6) {
      for (const x of [-7.7, 7.7]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, 5.7), new THREE.MeshBasicMaterial({ color: 0x70ddff }));
        edge.position.set(x, .03, z); edge.userData = { baseX: x, roadMover: true }; world.add(edge); movers.push(edge);
      }
    }

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x344a58, metalness: .72, roughness: .3 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd58b, emissive: 0xffa735, emissiveIntensity: 4 });
    for (let z = -170; z < 8; z += 14) {
      for (const side of [-1, 1]) {
        const group = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.055, .075, 5.4, 8), poleMat); pole.position.y = 2.7; group.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), lampMat); lamp.position.set(-side * .45, 5.2, 0); group.add(lamp);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, .06), poleMat); arm.position.set(-side * .22, 5.25, 0); group.add(arm);
        group.position.set(side * 10.5, 0, z); group.userData = { baseX: side * 10.5, roadMover: true }; world.add(group); movers.push(group);
      }
    }

    const buildingColors = [0x172536, 0x223449, 0x263847, 0x1c2a38];
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? -1 : 1; const h = 5 + (i * 7 % 11); const w = 3 + (i * 5 % 4);
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4.5), new THREE.MeshStandardMaterial({ color: buildingColors[i % buildingColors.length], roughness: .9 }));
      box.position.set(side * (14 + (i % 3) * 3.2), h / 2, -8 - i * 6.2); box.userData = { baseX: box.position.x, roadMover: true }; world.add(box); movers.push(box);
      for (let wy = 2; wy < h - 1; wy += 2.2) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(.45, .38), new THREE.MeshBasicMaterial({ color: i % 3 ? 0x5a8faa : 0xffbd62 }));
        win.position.set(box.position.x - side * (w / 2 + .01), wy, box.position.z + 2.26); win.rotation.y = side * Math.PI / 2; win.userData = { baseX: win.position.x, roadMover: true }; world.add(win); movers.push(win);
      }
    }

    const scenario = new THREE.Group(); world.add(scenario);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff721f, emissive: 0x441000 });
    for (let i = 0; i < 9; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.28, .8, 12), coneMat);
      cone.position.set((i % 2 ? 1 : -1) * (1.3 + (i % 3) * .7), .4, -26 - i * 8); cone.castShadow = true; cone.userData = { baseX: cone.position.x, roadMover: true, hazard: true }; scenario.add(cone); movers.push(cone);
    }
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, .75, 4), new THREE.MeshStandardMaterial({ color: 0x1c6b9e, metalness: .5, roughness: .3 })); body.position.y = .65; body.castShadow = true; car.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.65, .65, 1.8), new THREE.MeshStandardMaterial({ color: 0x101b26, metalness: .35 })); cabin.position.set(0, 1.2, -.15); car.add(cabin);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 5 });
    for (const x of [-.72, .72]) { const tail = new THREE.Mesh(new THREE.BoxGeometry(.32, .2, .05), tailMat); tail.position.set(x, .72, 2.02); car.add(tail); }
    car.position.set(1.2, 0, -58); car.userData = { baseX: 1.2, roadMover: true, vehicle: true }; world.add(car); movers.push(car);

    const sign = new THREE.Group();
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 5, 8), poleMat); signPost.position.y = 2.5; sign.add(signPost);
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.5, .12), new THREE.MeshStandardMaterial({ color: 0x075ba8, emissive: 0x052a51 })); signBoard.position.set(-1.8, 4.8, 0); sign.add(signBoard);
    sign.position.set(9.5, 0, -48); sign.userData = { baseX: 9.5, roadMover: true, sign: true }; world.add(sign); movers.push(sign);

    let last = performance.now(); let raf = 0;
    const animate = (now: number) => {
      const rect = host.getBoundingClientRect(); renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      camera.aspect = Math.max(.1, rect.width / Math.max(1, rect.height)); camera.updateProjectionMatrix();
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const current = live.current; const travel = current.speed * dt * .56;
      camera.position.x += ((current.lane * 2.7) - camera.position.x) * Math.min(1, dt * 5);
      camera.rotation.z += ((-current.lane * .022) - camera.rotation.z) * Math.min(1, dt * 4);
      movers.forEach(obj => {
        obj.position.z += travel;
        if (obj.position.z > 10) obj.position.z -= 184;
        const baseX = Number(obj.userData.baseX || 0);
        // The route is a fixed function of world depth. Never include clock time here:
        // a stopped vehicle must see a completely stationary road.
        const metresAhead = Math.max(0, -obj.position.z) * 1.12;
        const curve = routeCenter(current.sceneName, current.distance + metresAhead) * 2.7;
        obj.position.x = baseX + curve;
        if (obj.userData.hazard) obj.visible = ["slalom", "hazard", "exam", "yard"].includes(current.sceneName);
        if (obj.userData.vehicle) obj.visible = ["highway", "hazard", "load", "exam", "urban"].includes(current.sceneName);
        if (obj.userData.sign) obj.visible = current.sceneName === "highway";
      });
      world.fog = new THREE.FogExp2(current.sceneName === "night" ? 0x70818c : 0x0b1b29, current.sceneName === "night" ? .03 : .014);
      world.background = new THREE.Color(current.sceneName === "night" ? 0x07101a : 0x0a1c2d);
      renderer.render(world, camera); raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf); renderer.dispose(); renderer.domElement.remove();
      world.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m = o.material; if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose(); } });
    };
  }, []);

  return <div ref={hostRef} className="road-3d" aria-label="Mặt đường WebGL ba chiều" />;
}
