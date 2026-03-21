"""
DWG to DXF conversion using LibreDWG or ODA File Converter.

Conversion strategy (in priority order):
1. LibreDWG ``dwg2dxf`` -- open-source, GPLv3, supports R2000-R2018.
2. ODA File Converter -- free (proprietary), supports R14-R2024.
3. Neither available -> raise RuntimeError with install instructions.

Usage::

    converter = DWGConverter()
    if converter.is_available:
        dxf_path = await converter.convert("input.dwg")
    else:
        print(converter.install_instructions)

The converted DXF is then parsed by ``ezdxf`` via ``FloorPlanPipeline._parse_dxf()``.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


class ConversionError(Exception):
    """Raised when DWG-to-DXF conversion fails."""


class DWGConverter:
    """Converts DWG files to DXF format using available system tools.

    Parameters
    ----------
    libredwg_path:
        Explicit path to the ``dwg2dxf`` binary.  If ``None``, searches ``$PATH``.
    oda_converter_path:
        Explicit path to the ``ODAFileConverter`` binary.  If ``None``, searches ``$PATH``.
    timeout_seconds:
        Maximum time to wait for a conversion subprocess.
    """

    def __init__(
        self,
        *,
        libredwg_path: str | None = None,
        oda_converter_path: str | None = None,
        timeout_seconds: int = 120,
    ) -> None:
        self._libredwg = libredwg_path or shutil.which("dwg2dxf")
        self._oda = oda_converter_path or shutil.which("ODAFileConverter")
        self._timeout = timeout_seconds

    # -- Public properties -----------------------------------------------------

    @property
    def is_available(self) -> bool:
        """True if at least one conversion backend is installed."""
        return bool(self._libredwg or self._oda)

    @property
    def backend(self) -> str:
        """Name of the active backend: ``'libredwg'``, ``'oda'``, or ``'none'``."""
        if self._libredwg:
            return "libredwg"
        if self._oda:
            return "oda"
        return "none"

    @property
    def install_instructions(self) -> str:
        """Human-readable install instructions when no backend is found."""
        return (
            "No DWG conversion backend found.\n"
            "Install one of:\n"
            "  1. LibreDWG (open source):\n"
            "     Ubuntu/Debian: sudo apt-get install libredwg-utils\n"
            "     macOS:         brew install libredwg\n"
            "  2. ODA File Converter (free, proprietary):\n"
            "     Download from https://www.opendesign.com/guestfiles/oda_file_converter\n"
        )

    # -- Public API ------------------------------------------------------------

    async def convert(
        self,
        dwg_path: str | Path,
        *,
        output_path: str | Path | None = None,
        dxf_version: str = "R2013",
    ) -> Path:
        """Convert a DWG file to DXF.

        Parameters
        ----------
        dwg_path:
            Path to the input ``.dwg`` file.
        output_path:
            Destination for the ``.dxf`` file.  Defaults to the same directory
            and basename as the input with ``.dxf`` extension.
        dxf_version:
            Target DXF version (used by ODA converter).  LibreDWG outputs
            the version matching the source DWG.

        Returns
        -------
        Path
            Absolute path to the generated DXF file.

        Raises
        ------
        FileNotFoundError
            If the input DWG file does not exist.
        ConversionError
            If the conversion subprocess fails.
        RuntimeError
            If no conversion backend is available.
        """
        dwg_path = Path(dwg_path).resolve()
        if not dwg_path.exists():
            raise FileNotFoundError(f"DWG file not found: {dwg_path}")
        if not dwg_path.suffix.lower() == ".dwg":
            raise ValueError(f"Expected .dwg file, got: {dwg_path.suffix}")

        if output_path is None:
            output_path = dwg_path.with_suffix(".dxf")
        output_path = Path(output_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(
            "Converting DWG->DXF: %s -> %s (backend=%s)",
            dwg_path.name,
            output_path.name,
            self.backend,
        )

        if self._libredwg:
            return await self._convert_libredwg(dwg_path, output_path)
        elif self._oda:
            return await self._convert_oda(dwg_path, output_path, dxf_version)
        else:
            raise RuntimeError(self.install_instructions)

    async def check_health(self) -> dict[str, str | bool]:
        """Check which backends are available and their versions."""
        result: dict[str, str | bool] = {
            "available": self.is_available,
            "backend": self.backend,
        }

        if self._libredwg:
            try:
                proc = await asyncio.create_subprocess_exec(
                    self._libredwg, "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
                result["libredwg_version"] = stdout.decode().strip()
            except Exception as exc:
                result["libredwg_error"] = str(exc)

        if self._oda:
            result["oda_path"] = self._oda

        return result

    # -- Private conversion methods --------------------------------------------

    async def _convert_libredwg(
        self,
        dwg_path: Path,
        output_path: Path,
    ) -> Path:
        """Convert using LibreDWG's ``dwg2dxf`` command-line tool.

        Command: ``dwg2dxf -o <output.dxf> <input.dwg>``

        LibreDWG preserves the DWG's native version in the output DXF.
        Supports AutoCAD R2000 through R2018 formats.
        """
        cmd = [self._libredwg, "-o", str(output_path), str(dwg_path)]

        logger.debug("Running: %s", " ".join(cmd))

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=self._timeout,
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise ConversionError(
                f"LibreDWG conversion timed out after {self._timeout}s "
                f"for {dwg_path.name}"
            )

        if proc.returncode != 0:
            error_msg = stderr.decode().strip() or stdout.decode().strip()
            raise ConversionError(
                f"dwg2dxf exited with code {proc.returncode}: {error_msg}"
            )

        if not output_path.exists():
            raise ConversionError(
                f"dwg2dxf completed but output file not found: {output_path}"
            )

        logger.info(
            "LibreDWG conversion successful: %s (%d bytes)",
            output_path.name,
            output_path.stat().st_size,
        )
        return output_path

    async def _convert_oda(
        self,
        dwg_path: Path,
        output_path: Path,
        dxf_version: str,
    ) -> Path:
        """Convert using ODA File Converter.

        ODA works on entire directories, so we:
        1. Copy the DWG into a temp input directory
        2. Run ODAFileConverter with input_dir, output_dir, version, format
        3. Copy the resulting DXF to the desired output path
        4. Clean up temp directories

        ODA command:
          ODAFileConverter <input_dir> <output_dir> <version> <format> <recurse> <audit>
          Example: ODAFileConverter /tmp/in /tmp/out ACAD2013 DXF 0 1
        """
        oda_version_map = {
            "R14": "ACAD14",
            "R2000": "ACAD2000",
            "R2004": "ACAD2004",
            "R2007": "ACAD2007",
            "R2010": "ACAD2010",
            "R2013": "ACAD2013",
            "R2018": "ACAD2018",
        }
        oda_version = oda_version_map.get(dxf_version, "ACAD2013")

        with tempfile.TemporaryDirectory(prefix="openlintel_oda_") as tmpdir:
            input_dir = Path(tmpdir) / "input"
            output_dir = Path(tmpdir) / "output"
            input_dir.mkdir()
            output_dir.mkdir()

            # Copy DWG to input directory
            shutil.copy2(dwg_path, input_dir / dwg_path.name)

            cmd = [
                self._oda,
                str(input_dir),
                str(output_dir),
                oda_version,
                "DXF",
                "0",  # recurse = no
                "1",  # audit = yes
            ]

            logger.debug("Running: %s", " ".join(cmd))

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self._timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                raise ConversionError(
                    f"ODA conversion timed out after {self._timeout}s "
                    f"for {dwg_path.name}"
                )

            # ODA does not always return non-zero on failure
            converted_files = list(output_dir.glob("*.dxf"))

            if not converted_files:
                error_msg = stderr.decode().strip() or stdout.decode().strip()
                raise ConversionError(
                    f"ODA File Converter produced no DXF output. "
                    f"Return code: {proc.returncode}. "
                    f"Error: {error_msg or 'unknown'}"
                )

            # Copy the first (and usually only) DXF to desired output
            shutil.copy2(converted_files[0], output_path)

        logger.info(
            "ODA conversion successful: %s (%d bytes)",
            output_path.name,
            output_path.stat().st_size,
        )
        return output_path
