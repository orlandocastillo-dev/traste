# Traste

App para tocar en la iglesia. Pegas el link de YouTube de la canción, trae la letra, le pones los acordes tocando la palabra donde entra cada uno, y queda lista para tocar con los diagramas arriba, cambio de tono, cejilla y desplazamiento automático.

En vivo: https://traste-nine.vercel.app

![Hoja de la canción](docs/captura-cancion.png)

| Pegar un link | Poner acordes | En el celular, de noche |
| --- | --- | --- |
| ![](docs/captura-importar.png) | ![](docs/captura-colocar.png) | ![](docs/captura-movil.png) |

## Cómo se usa

1. Pega el link del video (sirven `youtube.com`, `youtu.be`, Shorts y YouTube Music).
2. La app separa canción y artista del título y busca la letra.
3. Eliges la versión y tocas cada palabra para ponerle el acorde. La tonalidad se detecta sola.
4. Si ya tienes la hoja con acordes de un cancionero, la pegas tal cual y los acordes quedan sobre la sílaba correcta. También entiende cifrado latino (Do, Rem, Sol7).

En la hoja de la canción puedes subir o bajar el tono, poner cejilla (la hoja muestra la forma que se toca), dejar que la página baje sola, verla solo con la letra para cantar y en modo oscuro para la tarima. También sugiere escalas para improvisar en esa tonalidad, dibujadas en el diapasón.

En Progresión escribes los acordes en orden (`D A/C# Bm G`) y te dice en qué tonalidad está, el grado de cada acorde y con qué cejilla tocarla.

## Con qué está hecha

React, TypeScript y Redux Toolkit. Con RTK Query traigo el título del video (oEmbed) y las letras de [LRCLIB](https://lrclib.net). La teoría musical usa [Tonal](https://github.com/tonaljs/tonal), los diagramas y el diapasón son SVG, y el sonido de los acordes es síntesis de cuerda con Web Audio. Las canciones se guardan en formato ChordPro (`A[G]mazing [G7]grace`). Pruebas con Vitest.

Los acordes no se descargan de ninguna página: no hay una fuente abierta y copiar los de los sitios de acordes va contra sus condiciones. Por eso la app hace rápido lo que sí se puede, que es traer la letra y poner los acordes con un toque. Las letras de canciones actuales se guardan solo en tu dispositivo, y los himnos incluidos son de dominio público.

## Correrla

```bash
npm install
npm run dev
npm test
npm run build
```

En Windows con PowerShell usa `npm.cmd` si `npm` da error. `portable/index.html` abre con doble clic (`npm run build:portable` lo regenera).

Licencia MIT.
