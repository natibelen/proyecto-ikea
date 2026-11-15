"""Carga y validación de CSV generados por la aplicación web (carpeta proyecto/).

Reglas: dos grupos independientes, 6 modelos por participante (3 pulseras,
3 collares), una respuesta monetaria por modelo.

Códigos de sesión:
    * Número de participante 1–30 → construcción; 31–60 → observación.
    * Formato antiguo C01…/O01… (aceptado por compatibilidad).
    * DEMO-C / DEMO-O para sesiones de prueba.
"""
from __future__ import annotations

from pathlib import Path
import pandas as pd

MODELOS = {(tipo, nivel) for tipo in ("pulsera", "collar") for nivel in (1, 2, 3)}
REQUERIDAS = {"session_code", "group", "object_type", "difficulty", "price_clp"}
# Debe coincidir con GRUPOS en proyecto/js/config.js.
RANGOS = {"construccion": (1, 30), "observacion": (31, 60)}
PATRON_REAL = r"^(?:\d{1,2}|[CO]\d{2,3})$"
PATRON_DEMO = r"^DEMO-[CO]$"


def _normalizar_codigo(codigo: str) -> str:
    """Quita ceros a la izquierda de los números de participante ("05" → "5")."""
    return str(int(codigo)) if codigo.isdigit() else codigo


def grupo_esperado(codigo: str) -> str | None:
    """Grupo experimental que corresponde a un código de sesión.

    Args:
        codigo: Número de participante (1–60), código antiguo C01/O01 o DEMO-C/DEMO-O.

    Returns:
        "construccion", "observacion" o None si el código no corresponde a ningún grupo.
    """
    codigo = str(codigo)
    if codigo.isdigit():
        n = int(codigo)
        for grupo, (desde, hasta) in RANGOS.items():
            if desde <= n <= hasta:
                return grupo
        return None
    if codigo.startswith(("C", "DEMO-C")):
        return "construccion"
    if codigo.startswith(("O", "DEMO-O")):
        return "observacion"
    return None


def _orden_codigo(codigo: str) -> str:
    """Clave de orden: números de participante en orden numérico, luego códigos de texto."""
    codigo = str(codigo)
    return codigo.zfill(4) if codigo.isdigit() else "~" + codigo


def _numero_precio(serie: pd.Series) -> pd.Series:
    """Convierte textos de precios CLP a valores numéricos.

    Args:
        serie: Columna original de precios del CSV.

    Returns:
        Serie numérica; los valores no interpretables se convierten a NaN.
    """
    return pd.to_numeric(
        serie.astype(str).str.strip().str.replace(r"(?<=\d)\.(?=\d{3}(?:\D|$))", "", regex=True),
        errors="coerce",
    )


def leer_csv(entrada: str | Path, modo_demo: bool = False) -> tuple[pd.DataFrame, dict]:
    """Une todos los CSV de una carpeta y valida sesiones completas.

    Args:
        entrada: Ruta a un CSV o carpeta con uno o más archivos CSV.
        modo_demo: Si es True, procesa solo códigos DEMO-C y DEMO-O;
            si es False, procesa únicamente sesiones reales (números 1–60
            o códigos antiguos C01/O01).

    Returns:
        Una tabla con seis valoraciones por participante y un diccionario
        de conteos y avisos de validación. Elimina filas duplicadas de
        exportaciones acumuladas, pero descarta sesiones contradictorias.

    Raises:
        FileNotFoundError: Si no existe la ruta de entrada.
        ValueError: Si no existen CSV válidos o sesiones completas.
    """
    ruta = Path(entrada)
    if not ruta.exists():
        raise FileNotFoundError(f"No existe la ruta: {ruta}")
    archivos = sorted(ruta.rglob("*.csv")) if ruta.is_dir() else [ruta]
    if not archivos:
        raise ValueError(f"No se encontraron archivos CSV en {ruta}")

    partes = []
    avisos = []
    for archivo in archivos:
        try:
            tabla = pd.read_csv(archivo, dtype={"session_code": "string", "group": "string", "object_type": "string"}, encoding="utf-8-sig")
        except Exception as exc:
            avisos.append(f"Archivo ignorado por error de lectura: {archivo.name}: {exc}")
            continue
        if not REQUERIDAS.issubset(tabla.columns):
            faltan = ", ".join(sorted(REQUERIDAS - set(tabla.columns)))
            avisos.append(f"Archivo ignorado: {archivo.name}; faltan columnas: {faltan}")
            continue
        tabla["archivo_origen"] = archivo.name
        partes.append(tabla)

    if not partes:
        raise ValueError("Ningún archivo posee las columnas requeridas por la aplicación.")
    bruto = pd.concat(partes, ignore_index=True)
    n_bruto = len(bruto)

    # Solo se incluyen demos cuando se solicita explícitamente --demo.
    if "es_demo" in bruto:
        marca_demo = bruto["es_demo"].astype(str).str.strip().str.lower().isin(
            ["1", "true", "si", "sí"]
        )
        bruto = bruto.loc[marca_demo if modo_demo else ~marca_demo].copy()

    n_demos = 0 if modo_demo else n_bruto - len(bruto)
    if "completed" in bruto:
        bruto = bruto.loc[bruto["completed"].astype(str).str.strip().str.lower().isin(["1", "1.0", "true", "si", "sí"])].copy()

    bruto["session_code"] = bruto["session_code"].astype("string").str.strip().str.upper()
    bruto["session_code"] = bruto["session_code"].map(
        lambda c: _normalizar_codigo(c) if isinstance(c, str) else c
    ).astype("string")
    bruto["group"] = bruto["group"].astype("string").str.strip().str.lower()
    bruto["object_type"] = bruto["object_type"].astype("string").str.strip().str.lower()
    bruto["difficulty"] = pd.to_numeric(bruto["difficulty"], errors="coerce")
    bruto["price_clp"] = _numero_precio(bruto["price_clp"])

    patron_codigo = PATRON_DEMO if modo_demo else PATRON_REAL

    valido = (
        bruto["group"].isin(["construccion", "observacion"])
        & bruto["object_type"].isin(["pulsera", "collar"])
        & bruto["difficulty"].isin([1, 2, 3])
        & bruto["price_clp"].between(1, 1_000_000)
        & (bruto["price_clp"] % 1 == 0)
        & bruto["session_code"].str.match(patron_codigo, na=False)
        & bruto["session_code"].map(lambda c: grupo_esperado(c) is not None if isinstance(c, str) else False).astype(bool)
    )
    rechazadas = int((~valido).sum())
    if rechazadas:
        avisos.append(f"{rechazadas} fila(s) inválida(s) descartada(s): datos, grupo, código o precio fuera de rango.")
    bruto = bruto.loc[valido].copy()
    bruto["difficulty"] = bruto["difficulty"].astype(int)
    bruto["price_clp"] = bruto["price_clp"].astype(float)

    # No se deben contar varias veces las exportaciones acumuladas de un mismo navegador.
    clave = ["session_code", "group", "object_type", "difficulty", "price_clp"]
    antes = len(bruto)
    bruto = bruto.drop_duplicates(subset=clave)
    n_duplicados = antes - len(bruto)

    # Cuando un código se reutiliza con diferentes precios, no se puede establecer
    # con seguridad cuál fue el registro válido: se excluye la sesión completa.
    invalidas = set()
    repetidos = set()
    for codigo, bloque in bruto.groupby("session_code", dropna=False):
        # Un mismo número usado por dos personas (p. ej. en dos computadores distintos).
        # En modo demo es normal que DEMO-C/DEMO-O se repitan, pero igual se excluyen.
        if "participant_id" in bloque.columns and bloque["participant_id"].nunique() > 1:
            invalidas.add(codigo)
            repetidos.add(codigo)
            continue
        modelos = set(zip(bloque["object_type"], bloque["difficulty"]))
        if len(bloque) != 6 or modelos != MODELOS or bloque["group"].nunique() != 1:
            invalidas.add(codigo)
            continue
        if bloque["group"].iloc[0] != grupo_esperado(codigo):
            invalidas.add(codigo)
    if repetidos and not modo_demo:
        avisos.append(
            "Número(s) de participante usados por más de una persona "
            f"(posiblemente en computadores distintos), excluidos: {', '.join(sorted(map(str, repetidos), key=_orden_codigo))}"
        )
    if invalidas:
        avisos.append(f"Sesiones incompletas/inconsistentes excluidas ({len(invalidas)}): {', '.join(sorted(map(str, invalidas), key=_orden_codigo))}")
    limpio = bruto.loc[~bruto["session_code"].isin(invalidas)].copy()
    limpio["participant"] = limpio["session_code"]
    limpio["nivel"] = limpio["difficulty"].map({1: "Fácil", 2: "Medio", 3: "Difícil"})
    limpio = limpio.sort_values(
        ["session_code", "object_type", "difficulty"],
        key=lambda col: col.map(_orden_codigo) if col.name == "session_code" else col,
    ).reset_index(drop=True)
    auditoria = {
        "archivos_encontrados": len(archivos),
        "archivos_leidos": len(partes),
        "filas_originales": n_bruto,
        "filas_demo_excluidas": n_demos,
        "filas_invalidas": rechazadas,
        "filas_duplicadas_excluidas": n_duplicados,
        "sesiones_incompletas_excluidas": len(invalidas),
        "participantes_validos": limpio["participant"].nunique(),
        "participantes_construccion": limpio.loc[limpio.group == "construccion", "participant"].nunique(),
        "participantes_observacion": limpio.loc[limpio.group == "observacion", "participant"].nunique(),
        "filas_analizadas": len(limpio),
        "avisos": avisos,
    }
    if limpio.empty:
        raise ValueError("No se encontraron sesiones completas y válidas (6 modelos por participante). " + "; ".join(avisos))
    return limpio, auditoria
