# Mi pequeño taller — versión organizada

## Objetivo

Esta versión separa el HTML, CSS y JavaScript en archivos distintos y divide parte del JavaScript por responsabilidad, procurando conservar el comportamiento de la aplicación original.

## Estructura

- `index.html`: punto de entrada de la aplicación.
- `css/styles.css`: estilos, diseño adaptable y accesibilidad visual.
- `js/config.js`: constantes, diseños experimentales, tareas y columnas CSV.
- `js/storage.js`: carga y guardado local de los datos y selector de DOM.
- `js/accessories.js`: posiciones, geometría y generación SVG de accesorios.
- `js/csv.js`: creación del CSV a partir de los registros.
- `js/app.js`: pantallas, flujo de sesión, eventos, administración y escritura en archivo.

## Cómo ejecutar

Por compatibilidad con módulos de navegador y APIs de archivos, se recomienda abrir la carpeta con un servidor HTTP local (por ejemplo, la extensión Live Server de VS Code) y visitar `index.html`. No se recomienda abrirlo directamente mediante `file://` si se presentan restricciones del navegador.

## Datos

- La aplicación continúa utilizando `localStorage` con la clave `taller_v1`.
- Los registros no se envían a un servidor.
- La vinculación y escritura directa en archivos depende del navegador y de sus permisos.
- Haz una copia de seguridad de los datos existentes antes de reemplazar la versión que utilizas.

## Orden de carga

Los scripts JavaScript se cargan como scripts clásicos y comparten el ámbito léxico global. Esto reduce el riesgo de introducir cambios funcionales grandes en esta primera reorganización. Como siguiente mejora, se recomienda migrar a módulos ES (`import`/`export`) y encapsular el estado para reducir dependencias globales.

## Lista de comprobación antes de usar con participantes

1. Probar los dos grupos experimentales: construcción y observación.
2. Completar los seis accesorios y verificar orden, colores y dificultad.
3. Comprobar que la validación del precio acepta solo montos permitidos.
4. Verificar que tiempos, errores y retiros se registran correctamente.
5. Exportar CSV real y CSV con demostraciones, comprobando columnas y valores.
6. Probar permisos de escritura en archivo y recuperación después de recargar.
7. Verificar que las demostraciones no se mezclen con los datos reales.

## Seguridad

El PIN del panel está definido en el JavaScript del cliente en la versión original. Esto no constituye autenticación segura frente a una persona que inspeccione el código. No almacenes datos sensibles ni confíes en ese PIN como mecanismo de seguridad.
