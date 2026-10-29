# Análisis programado — Efecto IKEA digital

## Ejecución

Instalar dependencias desde la carpeta principal:

```bash
python -m pip install -r requirements.txt
```

**CSV de demostración de la app** (`DEMO-C` / `DEMO-O`):

```bash
python analizar.py --input datos --output resultados --demo
```

**CSV de participantes reales** (`C01`, `O01`, etc.):

```bash
python analizar.py --input datos --output resultados
```

La carpeta de entrada puede contener **uno o varios CSV**, incluso archivos con ambos grupos. El programa los une y acepta solo sesiones completas con seis valoraciones diferentes. Ignora sesiones demo en modo normal y registros reales en modo `--demo`.

## Organización del código

- `analizar.py`: punto de entrada y coordinación.
- `ikea_analisis/carga.py`: lectura, consolidación y validación de los CSV.
- `ikea_analisis/estadistica.py`: descriptivos y pruebas H1/H2.
- `ikea_analisis/graficos.py`: figuras PNG.
- `ikea_analisis/exportar.py`: exportación de datos y resultados, sin texto interpretativo.

## Estadísticas

- **Descriptivas**: media, mediana y desviación estándar en CLP, por grupo, dificultad y tipo de joya.
- **H1**: cada participante aporta el promedio de `ln(precio)` de sus seis joyas. Se compara construcción vs. observación mediante **t de Welch bilateral** y **d de Cohen**. La diferencia de logaritmos se expresa también como cambio porcentual: `(exp(diferencia) - 1) × 100`.
- **H2**: modelo lineal mixto de `ln(precio)` con grupo, dificultad categórica, interacción grupo × dificultad, y tipo de joya como covariable. Se incluye intercepto aleatorio por participante; la interacción se evalúa comparando dos modelos por razón de verosimilitudes (ML). La significación de la interacción no establece por sí sola la dirección de la tendencia.

Solo se usan los **precios** de las joyas para los análisis. No se evalúan esfuerzo percibido, agrado ni satisfacción.

## Archivos generados

- `datos_consolidados.csv`: registros válidos reunidos desde los archivos de entrada.
- `descriptivos.csv`: precios en CLP por grupo, joya y dificultad.
- `precios_geometricos_por_nivel.csv`: combinación proporcional de ambos tipos de joya.
- `diferencias_porcentuales.csv`: brecha proporcional entre grupos por dificultad.
- `pruebas_estadisticas.json`: valores numéricos de Welch, Cohen y del modelo mixto.
- `precios_pulseras.png`, `precios_collares.png`, `diferencia_porcentual_por_dificultad.png`: gráficos.

Con pocos participantes se calculan descriptivos, pero las pruebas inferenciales pueden indicar `no_ejecutado`. Los resultados deben ser interpretados por el equipo investigador.
