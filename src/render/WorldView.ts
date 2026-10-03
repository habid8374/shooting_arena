import * as THREE from 'three';
import { WORLD } from '../config/engine';
import { Chunk } from '../world/Chunk';
import type { World } from '../world/World';
import { meshChunk, type MeshData } from './ChunkMesher';
import { buildAtlas, buildMipmaps, type AtlasData } from './TextureAtlas';
import { resolvePalette, type ResolvedPalette } from './color';

/**
 * WorldView: se encarga de DIBUJAR un mundo. Crea una malla 3D por chunk,
 * reconstruye solo las que cambiaron y esconde las que quedan fuera de la
 * distancia de render.
 */
export class WorldView {
  readonly group = new THREE.Group();
  readonly palette: ResolvedPalette;
  private readonly atlas: AtlasData;
  private readonly texture: THREE.DataTexture;
  private readonly opaqueMaterial: THREE.MeshBasicMaterial;
  private readonly waterMaterial: THREE.MeshBasicMaterial;
  private readonly meshes = new Map<Chunk, { opaque: THREE.Mesh; water: THREE.Mesh }>();

  constructor(private readonly world: World) {
    this.palette = resolvePalette(world.def.palette);
    this.atlas = buildAtlas(this.palette, world.def.seed);

    this.texture = new THREE.DataTexture(this.atlas.pixels, this.atlas.width, this.atlas.height);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // "Nearest" = píxeles nítidos de cerca; de lejos se usan los mipmaps.
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestMipmapLinearFilter;
    this.texture.mipmaps = buildMipmaps(this.atlas);
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;

    // MeshBasic no calcula luces (muy rápido): el sombreado viene de los colores por cara.
    this.opaqueMaterial = new THREE.MeshBasicMaterial({ map: this.texture, vertexColors: true });
    this.waterMaterial = new THREE.MeshBasicMaterial({
      map: this.texture,
      vertexColors: true,
      transparent: true,
      opacity: WORLD.waterOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  /** Reconstruye las mallas de los chunks marcados como "sucios". Devuelve cuántas. */
  rebuildDirty(limit = Infinity): number {
    let rebuilt = 0;
    for (const chunk of this.world.loadedChunks()) {
      if (!chunk.dirty) continue;
      if (rebuilt >= limit) break;
      this.rebuildChunk(chunk);
      rebuilt++;
    }
    return rebuilt;
  }

  /** Muestra solo los chunks cerca de la cámara. */
  updateVisibility(cameraPos: THREE.Vector3, renderDistanceChunks: number): void {
    const S = Chunk.SIZE;
    const maxDist = (renderDistanceChunks + 0.5) * S;
    for (const [chunk, m] of this.meshes) {
      const dx = chunk.cx * S + S / 2 - cameraPos.x;
      const dz = chunk.cz * S + S / 2 - cameraPos.z;
      const visible = dx * dx + dz * dz <= maxDist * maxDist;
      m.opaque.visible = visible;
      m.water.visible = visible;
    }
  }

  /** Cuántos triángulos se están dibujando (útil para medir rendimiento). */
  triangleCount(): number {
    let total = 0;
    for (const m of this.meshes.values()) {
      if (m.opaque.visible) total += (m.opaque.geometry.index?.count ?? 0) / 3;
      if (m.water.visible) total += (m.water.geometry.index?.count ?? 0) / 3;
    }
    return total;
  }

  /** Libera la memoria de la tarjeta gráfica al cambiar de mundo. */
  dispose(): void {
    for (const m of this.meshes.values()) {
      m.opaque.geometry.dispose();
      m.water.geometry.dispose();
    }
    this.meshes.clear();
    this.group.clear();
    this.texture.dispose();
    this.opaqueMaterial.dispose();
    this.waterMaterial.dispose();
  }

  private rebuildChunk(chunk: Chunk): void {
    const S = Chunk.SIZE;
    const ox = chunk.cx * S;
    const oz = chunk.cz * S;
    const result = meshChunk(
      chunk,
      (x, y, z) => this.world.getBlock(ox + x, y, oz + z),
      this.atlas.uvs,
    );
    chunk.dirty = false;

    let entry = this.meshes.get(chunk);
    if (!entry) {
      entry = {
        opaque: new THREE.Mesh(new THREE.BufferGeometry(), this.opaqueMaterial),
        water: new THREE.Mesh(new THREE.BufferGeometry(), this.waterMaterial),
      };
      entry.opaque.position.set(ox, 0, oz);
      entry.water.position.set(ox, 0, oz);
      entry.water.renderOrder = 1; // el agua se dibuja después de lo sólido
      this.group.add(entry.opaque, entry.water);
      this.meshes.set(chunk, entry);
    }
    replaceGeometry(entry.opaque, result.opaque);
    replaceGeometry(entry.water, result.transparent);
  }
}

function replaceGeometry(mesh: THREE.Mesh, data: MeshData): void {
  mesh.geometry.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
  g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  g.setIndex(new THREE.BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  mesh.geometry = g;
}
