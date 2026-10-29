"""Análisis estadístico de las valoraciones monetarias del experimento IKEA.

Se analizan las seis joyas de cada participante conjuntamente. Para comparar
precios de distinta magnitud (pulseras y collares), las pruebas inferenciales
utilizan el logaritmo natural del precio, que conserva las diferencias relativas.

H1: t de Welch sobre el promedio de los seis logaritmos por participante;
    también se calcula d de Cohen sobre esa misma variable.
H2: modelo lineal mixto de log(precio) con interacción grupo × dificultad,
    ajustado por tipo de joya e intercepto aleatorio de participante.
"""
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from scipy import stats

GRUPOS = ("observacion", "construccion")


def descriptivos(datos: pd.DataFrame) -> pd.DataFrame:
    """Calcula descriptivos de precios originales (CLP) por grupo, nivel y joya.

    Args:
        datos: Tabla validada por ``leer_csv``, con la columna ``price_clp``.

    Returns:
        Tabla con n, media, mediana, desviación estándar, mínimo y máximo.
        No mezcla directamente los precios de collares y pulseras.
    """
    return (
        datos.groupby(["group", "object_type", "difficulty"])["price_clp"]
        .agg(n="count", media="mean", mediana="median", desviacion="std",
             minimo="min", maximo="max")
        .reset_index()
        .round(2)
    )


def resumen_por_nivel(datos: pd.DataFrame) -> pd.DataFrame:
    """Resume las seis joyas en una escala proporcional por grupo y nivel.

    Para cada nivel, cada persona aporta el promedio de los logaritmos de
    pulsera y collar. La exponencial de las medias es un precio geométrico
    en CLP, que sirve para visualizar ambas joyas sin favorecer a la más cara.

    Args:
        datos: Tabla validada con seis registros por participante.

    Returns:
        Número de participantes y precio geométrico para cada grupo y nivel.
    """
    trabajo = datos.assign(log_precio=np.log(datos["price_clp"]))
    por_persona = (
        trabajo.groupby(["participant", "group", "difficulty"], as_index=False)
        ["log_precio"].mean()
    )
    tabla = (
        por_persona.groupby(["group", "difficulty"])["log_precio"]
        .agg(n_participantes="count", media_log="mean")
        .reset_index()
    )
    tabla["precio_geometrico_clp"] = np.exp(tabla["media_log"])
    return tabla.drop(columns="media_log")


def brecha_por_nivel(resumen: pd.DataFrame) -> pd.DataFrame:
    """Calcula la diferencia porcentual constructor/observador por nivel.

    Args:
        resumen: Salida de ``resumen_por_nivel``.

    Returns:
        Tres filas (niveles 1, 2 y 3) con precios geométricos por grupo y
        porcentaje relativo ``(constructor / observador - 1) * 100``.
    """
    tabla = resumen.pivot(index="difficulty", columns="group", values="precio_geometrico_clp")
    tabla = tabla.reindex(columns=list(GRUPOS))
    tabla["diferencia_porcentual"] = (
        (tabla["construccion"] / tabla["observacion"] - 1) * 100
    )
    return tabla.reset_index().round(2)


def _welch(construccion: np.ndarray, observacion: np.ndarray) -> dict:
    """Ejecuta Welch bilateral y calcula d de Cohen para dos muestras independientes.

    Args:
        construccion: Un promedio logarítmico por constructor.
        observacion: Un promedio logarítmico por observador.

    Returns:
        Estadístico t, grados de libertad, valor p, d de Cohen, diferencia
        logarítmica y su equivalente porcentual con IC del 95 %. Si faltan
        participantes o variación, devuelve ``estado='no_ejecutado'``.
    """
    c = np.asarray(construccion, dtype=float)
    o = np.asarray(observacion, dtype=float)
    if min(len(c), len(o)) < 2:
        return {"estado": "no_ejecutado", "motivo": "Se necesitan al menos 2 participantes por grupo."}

    media_c, media_o = float(c.mean()), float(o.mean())
    var_c, var_o = float(c.var(ddof=1)), float(o.var(ddof=1))
    error2 = var_c / len(c) + var_o / len(o)
    if error2 <= 0 or not np.isfinite(error2):
        return {"estado": "no_ejecutado", "motivo": "Varianza insuficiente para calcular Welch."}

    diferencia = media_c - media_o
    gl = error2**2 / ((var_c / len(c))**2 / (len(c) - 1)
                      + (var_o / len(o))**2 / (len(o) - 1))
    t = diferencia / np.sqrt(error2)
    p = float(2 * stats.t.sf(abs(t), gl))
    margen = float(stats.t.ppf(0.975, gl) * np.sqrt(error2))

    # d de Cohen con desviación estándar conjunta de los valores individuales.
    var_conjunta = ((len(c) - 1) * var_c + (len(o) - 1) * var_o) / (len(c) + len(o) - 2)
    d = float(diferencia / np.sqrt(var_conjunta)) if var_conjunta > 0 else None
    return {
        "estado": "ok",
        "n_construccion": len(c),
        "n_observacion": len(o),
        "t": round(float(t), 5),
        "grados_libertad": round(float(gl), 4),
        "p_bilateral": p,
        "cohen_d": round(d, 4) if d is not None else None,
        "media_geometrica_construccion_clp": round(float(np.exp(media_c)), 2),
        "media_geometrica_observacion_clp": round(float(np.exp(media_o)), 2),
        "diferencia_logaritmica": round(float(diferencia), 5),
        "diferencia_porcentual": round(float(100 * np.expm1(diferencia)), 2),
        "ic95_porcentaje_inferior": round(float(100 * np.expm1(diferencia - margen)), 2),
        "ic95_porcentaje_superior": round(float(100 * np.expm1(diferencia + margen)), 2),
    }


def contraste_h1(datos: pd.DataFrame) -> dict:
    """Contrasta H1 comparando una valoración proporcional por participante.

    Calcula ``mean(log(precio))`` de las seis joyas de cada participante,
    de modo que cada persona tiene el mismo peso independientemente de los
    seis registros que produjo. Después aplica Welch y d de Cohen.

    Args:
        datos: Tabla validada por ``leer_csv``.

    Returns:
        Valores estadísticos de H1 o la causa de no ejecución.
    """
    trabajo = datos.assign(log_precio=np.log(datos["price_clp"]))
    persona = (
        trabajo.groupby(["participant", "group"], as_index=False)["log_precio"]
        .mean()
    )
    c = persona.loc[persona["group"] == "construccion", "log_precio"].to_numpy()
    o = persona.loc[persona["group"] == "observacion", "log_precio"].to_numpy()
    return _welch(c, o)


def _ajustar_modelo(formula: str, datos: pd.DataFrame):
    """Ajusta por máxima verosimilitud un modelo mixto de intercepto aleatorio.

    Args:
        formula: Fórmula estadística de ``statsmodels``.
        datos: Tabla con ``log_precio`` y ``participant``.

    Returns:
        Resultado de un ajuste convergente.

    Raises:
        RuntimeError: Si ninguno de los optimizadores consigue un ajuste.
    """
    import statsmodels.formula.api as smf

    modelo = smf.mixedlm(formula, data=datos, groups=datos["participant"])
    errores = []
    for metodo in ("lbfgs", "powell", "bfgs"):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                ajuste = modelo.fit(reml=False, method=metodo, maxiter=800, disp=False)
            if ajuste.converged and np.isfinite(ajuste.llf):
                return ajuste
            errores.append(f"{metodo}: no convergió")
        except Exception as exc:
            errores.append(f"{metodo}: {exc}")
    raise RuntimeError("; ".join(errores))


def modelo_mixto(datos: pd.DataFrame) -> dict:
    """Contrasta H2 con la interacción grupo × dificultad en las seis joyas.

    Compara por razón de verosimilitudes dos modelos mixtos de log(precio):
    uno sin interacción y otro con interacción, ambos controlando el tipo
    de joya y con intercepto aleatorio por participante. El contraste global
    detecta si la diferencia entre grupos cambia con la dificultad; por sí
    solo no establece la dirección de ese cambio.

    Args:
        datos: Tabla validada, con seis observaciones por participante.

    Returns:
        Chi-cuadrado, grados de libertad, p de interacción y coeficientes,
        o una razón por la cual el ajuste no se ejecutó.
    """
    conteos = datos.groupby("group")["participant"].nunique()
    if any(conteos.get(grupo, 0) < 3 for grupo in GRUPOS):
        return {"estado": "no_ejecutado", "motivo": "Se necesitan al menos 3 participantes por grupo."}

    trabajo = datos.assign(log_precio=np.log(datos["price_clp"]))
    formula_base = "log_precio ~ C(group) + C(difficulty) + C(object_type)"
    formula_interaccion = "log_precio ~ C(group) * C(difficulty) + C(object_type)"
    try:
        base = _ajustar_modelo(formula_base, trabajo)
        completo = _ajustar_modelo(formula_interaccion, trabajo)
        chi2 = max(0.0, float(2 * (completo.llf - base.llf)))
        grados = int(len(completo.fe_params) - len(base.fe_params))
        p = float(stats.chi2.sf(chi2, grados))
        return {
            "estado": "ok",
            "n_participantes": int(trabajo["participant"].nunique()),
            "chi2_interaccion": round(chi2, 5),
            "grados_libertad": grados,
            "p_interaccion": p,
            "coeficientes": {k: round(float(v), 5) for k, v in completo.fe_params.items()},
        }
    except Exception as exc:
        return {"estado": "no_ejecutado", "motivo": str(exc)[:300]}
