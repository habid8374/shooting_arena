# 🫧 Shooting Arenas

Aventura 3D de bloques pastel: recorre mundos, dispara **burbujas de energía** a criaturas
pastel, recoge bonus y construye con bloques. Funciona en el navegador y se instala como app (PWA).

🎮 **Jugar:** https://habid8374.github.io/shooting_arena/

> 🚧 Proyecto en construcción, por fases, para la Semana de la Tecnología.
> Fase actual: **2 – Mundo** (chunks, generación con semilla, mallado y texturas pastel desde JSON).

## Cómo ejecutarlo en tu computadora

Requisitos: [Node.js](https://nodejs.org/) 22 o superior.

```bash
npm install      # instala las dependencias
npm run dev      # abre el juego en modo desarrollo (http://localhost:5173/shooting_arena/)
npm test         # ejecuta las pruebas
npm run lint     # revisa el estilo del código
npm run build    # genera la versión final en dist/
```

## Crear un mundo nuevo (sin tocar código)

Cada mundo es un archivo JSON en `src/data/worlds/`. El juego carga **automáticamente** todos los
archivos de esa carpeta y los revisa: si algo está mal, te dice en español qué corregir.

1. Copia `01-pradera-rosa.json` y cámbiale el nombre (ej. `06-bosque-menta.json`).
2. Cambia `id` (minúsculas y guiones), `order` (6), `name`, `emoji` y `seed`.
3. Ajusta los colores en `palette` y la forma del terreno en `terrain`.
4. Ejecuta `npm run dev` y abre `http://localhost:5173/shooting_arena/?world=tu-id`.

| Campo de `terrain`        | Qué hace                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `baseHeight`, `amplitude` | Altura media del suelo y cuánto suben/bajan las colinas       |
| `frequency`, `octaves`    | Tamaño de las colinas (menor = más anchas) y nivel de detalle |
| `waterLevel`              | Altura del agua (`-1` = sin agua)                             |
| `layers`                  | Bloques de superficie, subsuelo, profundidad y orilla         |
| `snowLine` _(opcional)_   | Desde qué altura la superficie es nieve                       |
| `islands` _(opcional)_    | Divide el terreno en islas                                    |
| `floating` _(opcional)_   | Islas flotando en el cielo, sin suelo debajo                  |
| `caves` _(opcional)_      | Excava cuevas con ruido 3D                                    |
| `trees` _(opcional)_      | Densidad, bloques y altura de los árboles                     |

Bloques disponibles: `grass`, `dirt`, `stone`, `sand`, `water`, `wood`, `leaves`, `snow`,
`snow_grass`, `candy`, `caramel`, `cloud`, `brick`.

## Tecnologías

Vite · TypeScript (estricto) · Three.js · vite-plugin-pwa · IndexedDB (idb) · Vitest · ESLint + Prettier

## Créditos

Creado por **habid8374** para la Semana de la Tecnología.
Todo el arte y el sonido se generan por código.
