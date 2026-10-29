#!/usr/bin/env python3
"""Ejecuta el análisis estadístico a partir de uno o varios CSV del juego.

Ejemplos:
    python analizar.py --input datos --output resultados --demo
    python analizar.py --input datos --output resultados
"""
from __future__ import annotations

import argparse
from pathlib import Path

from ikea_analisis.carga import leer_csv
from ikea_analisis.estadistica import (
    descriptivos, resumen_por_nivel, brecha_por_nivel,
    contraste_h1, modelo_mixto,
)
from ikea_analisis.graficos import crear_graficos
from ikea_analisis.exportar import guardar_resultados


def main() -> int:
    """Lee los datos, ejecuta H1 y H2, y guarda tablas y gráficos.

    Returns:
        Código de salida cero si el procesamiento terminó. Las pruebas que
        no pueden calcularse por falta de participantes se marcan como tales.
    """
    parser = argparse.ArgumentParser(description="Análisis de precios: efecto IKEA digital")
    parser.add_argument("--input", required=True, help="CSV individual o carpeta de archivos CSV")
    parser.add_argument("--output", default="resultados", help="Carpeta para guardar resultados")
    parser.add_argument("--demo", action="store_true", help="Leer las sesiones de demostración en vez de las reales")
    args = parser.parse_args()

    datos, auditoria = leer_csv(args.input, modo_demo=args.demo)
    desc = descriptivos(datos)
    niveles = resumen_por_nivel(datos)
    brechas = brecha_por_nivel(niveles)
    h1 = contraste_h1(datos)
    h2 = modelo_mixto(datos)

    salida = Path(args.output)
    guardar_resultados(salida, datos, desc, niveles, brechas, h1, h2)
    crear_graficos(datos, brechas, salida)

    print(f"Archivos leídos: {auditoria['archivos_leidos']}")
    print(f"Participantes válidos: {auditoria['participantes_validos']} "
          f"(construcción: {auditoria['participantes_construccion']}; "
          f"observación: {auditoria['participantes_observacion']})")
    print(f"H1 (Welch + d de Cohen): {h1['estado']}")
    print(f"H2 (modelo mixto): {h2['estado']}")
    for aviso in auditoria["avisos"]:
        print("AVISO:", aviso)
    print(f"Resultados guardados en: {salida.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
