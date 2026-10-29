"""Generación de gráficos PNG con los resultados descriptivos del experimento."""
from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # Genera imágenes sin abrir ventanas de gráficos.
import matplotlib.pyplot as plt
import pandas as pd


def crear_graficos(datos: pd.DataFrame, brechas: pd.DataFrame, salida: Path) -> list[str]:
    """Guarda gráficos de precios reales y diferencias proporcionales.

    Args:
        datos: Tabla validada con los precios en pesos chilenos.
        brechas: Diferencias relativas de ``brecha_por_nivel``.
        salida: Carpeta donde guardar las imágenes.

    Returns:
        Nombres de los archivos PNG generados.
    """
    salida.mkdir(parents=True, exist_ok=True)
    nombres = []

    # Precios en pesos, mostrando separadamente cada tipo de joya.
    tabla = (
        datos.groupby(["object_type", "group", "difficulty"])["price_clp"]
        .mean()
    )
    for tipo in ("pulsera", "collar"):
        fig, ax = plt.subplots(figsize=(7, 4))
        for grupo, nombre in (("observacion", "Observación"), ("construccion", "Construcción")):
            niveles = [1, 2, 3]
            valores = [float(tabla.get((tipo, grupo, nivel), float("nan"))) for nivel in niveles]
            ax.plot(niveles, valores, marker="o", label=nombre)
        ax.set_xticks([1, 2, 3], ["Fácil", "Medio", "Difícil"])
        ax.set_xlabel("Dificultad")
        ax.set_ylabel("Precio promedio (CLP)")
        ax.set_title(f"Valoraciones: {'pulseras' if tipo == 'pulsera' else 'collares'}")
        ax.legend()
        ax.grid(alpha=0.2)
        fig.tight_layout()
        nombre_archivo = "precios_pulseras.png" if tipo == "pulsera" else "precios_collares.png"
        fig.savefig(salida / nombre_archivo, dpi=150)
        plt.close(fig)
        nombres.append(nombre_archivo)

    # Una sola comparación combinada (pulseras + collares) en porcentajes.
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(brechas["difficulty"], brechas["diferencia_porcentual"], marker="o")
    ax.axhline(0, linestyle="--", linewidth=1)
    ax.set_xticks([1, 2, 3], ["Fácil", "Medio", "Difícil"])
    ax.set_xlabel("Dificultad")
    ax.set_ylabel("Constructor frente a observador (%)")
    ax.set_title("Diferencia proporcional por dificultad (ambas joyas)")
    ax.grid(alpha=0.2)
    fig.tight_layout()
    nombre_archivo = "diferencia_porcentual_por_dificultad.png"
    fig.savefig(salida / nombre_archivo, dpi=150)
    plt.close(fig)
    nombres.append(nombre_archivo)
    return nombres
