"""Exportación de tablas, valores estadísticos y datos consolidados.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


def guardar_resultados(salida: Path, datos: pd.DataFrame, descriptivo: pd.DataFrame,
                       por_nivel: pd.DataFrame, brechas: pd.DataFrame,
                       h1: dict, h2: dict) -> None:
    """Guarda las tablas CSV y los resultados numéricos de ambas hipótesis.

    Args:
        salida: Carpeta de resultados.
        datos: Registros validados y combinados de todos los CSV de entrada.
        descriptivo: Estadísticas descriptivas por joya, rol y dificultad.
        por_nivel: Precios geométricos por rol y dificultad.
        brechas: Diferencias porcentuales por nivel entre ambos grupos.
        h1: Resultado de Welch y d de Cohen.
        h2: Resultado del modelo lineal mixto.
    """
    salida.mkdir(parents=True, exist_ok=True)
    # Conservamos exclusivamente columnas provenientes de los CSV originales
    # (se excluyen las columnas auxiliares creadas durante la validación).
    originales = [col for col in datos.columns if col not in {"participant", "nivel", "archivo_origen"}]
    datos[originales].to_csv(salida / "datos_consolidados.csv", index=False, encoding="utf-8-sig")
    descriptivo.to_csv(salida / "descriptivos.csv", index=False, encoding="utf-8-sig")
    por_nivel.to_csv(salida / "precios_geometricos_por_nivel.csv", index=False, encoding="utf-8-sig", float_format="%.2f")
    brechas.to_csv(salida / "diferencias_porcentuales.csv", index=False, encoding="utf-8-sig")
    (salida / "pruebas_estadisticas.json").write_text(
        json.dumps({"H1_welch_y_cohen": h1, "H2_modelo_mixto": h2},
                   ensure_ascii=False, indent=2, allow_nan=False),
        encoding="utf-8",
    )
