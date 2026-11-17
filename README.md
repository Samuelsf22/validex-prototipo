# Validex: prototipo de interfaces

Prototipo navegable de Validex, la plataforma para validar el contenido de instrumentos con jueces expertos.
Es parte del Producto Académico 3 de Taller de Proyectos 2 (Universidad Continental).

- Plataforma web para el investigador y formulario móvil para el juez.
- 19 interfaces, una por historia de usuario (IU07 es la historia HU07). El mapa de interfaces está en la página de inicio.
- La V de Aiken, el intervalo Score y la RVC de Lawshe se calculan de verdad en el navegador (`calc.js`).
- Todos los datos son de ejemplo. No hay servidor ni base de datos, y no se guarda nada.

## Cómo abrirlo

Abre `index.html` o publícalo tal cual (GitHub Pages). No necesita instalación.

## Pruebas

```sh
node --test tests/calc.test.js        # cálculo: V de Aiken, intervalo Score y RVC
npm install                           # playwright-core, solo para las pruebas de aceptación
python -m http.server 8765            # en otra terminal
CHROME_PATH="<ruta a chrome.exe>" node tests/acceptance.cjs
```

Las pruebas de aceptación cubren las historias HU01, HU04, HU07 y HU11.
