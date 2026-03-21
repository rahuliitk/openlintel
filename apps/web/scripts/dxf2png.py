#!/usr/bin/env python3
"""Convert DXF/DWG files to PNG images for AI floor plan analysis.

Usage: python3 dxf2png.py <input_file> <output_png>
Supports: .dxf files (via ezdxf), .dwg files (via dwg2dxf from LibreDWG)
"""
import sys
import os
import subprocess


def ensure_layers_visible(doc) -> None:
    """Turn on all layers and unfreeze them so nothing is hidden in the render.
    DWG→DXF converters (especially LibreDWG's dwg2dxf) often mark layers as off."""
    for layer in doc.layers:
        layer.on()
        layer.thaw()


def render_dxf_to_png(input_path: str, output_path: str) -> None:
    """Render a DXF file to PNG using ezdxf's recover reader (tolerant of malformed handles)."""
    from ezdxf import recover
    from ezdxf.addons.drawing import matplotlib as draw_mpl

    doc, auditor = recover.readfile(input_path)
    ensure_layers_visible(doc)
    msp = doc.modelspace()
    draw_mpl.qsave(msp, output_path, dpi=200, bg="#FFFFFF")
    print(f"OK: {output_path}")


def convert_dxf_to_png(input_path: str, output_path: str) -> None:
    """Render a DXF file to PNG using ezdxf's qsave."""
    import ezdxf
    from ezdxf.addons.drawing import matplotlib as draw_mpl

    doc = ezdxf.readfile(input_path)
    ensure_layers_visible(doc)
    msp = doc.modelspace()
    draw_mpl.qsave(msp, output_path, dpi=200, bg="#FFFFFF")
    print(f"OK: {output_path}")


def convert_dwg_to_png(input_path: str, output_path: str) -> None:
    """Convert DWG -> DXF using dwg2dxf (LibreDWG), then render with ezdxf."""
    errors = []
    dxf_path = input_path.rsplit('.', 1)[0] + '_converted.dxf'

    # Strategy 1: Use dwg2dxf (LibreDWG) + ezdxf recover reader
    # dwg2dxf may produce DXF with handle quirks, so we use recover.readfile()
    # Try full output first, then minimal (-m) which strips metadata but keeps entities
    for dwg2dxf_flags in [['-y'], ['-y', '-m']]:
        try:
            result = subprocess.run(
                ['dwg2dxf', *dwg2dxf_flags, '-o', dxf_path, input_path],
                capture_output=True, text=True, timeout=60,
            )
            if result.returncode != 0:
                raise RuntimeError(f"dwg2dxf exit code {result.returncode}: {result.stderr}")
            if not os.path.exists(dxf_path) or os.path.getsize(dxf_path) == 0:
                raise RuntimeError("dwg2dxf produced no output file")
            render_dxf_to_png(dxf_path, output_path)
            return
        except Exception as e:
            flag_str = ' '.join(dwg2dxf_flags)
            errors.append(f"dwg2dxf ({flag_str}): {e}")
        finally:
            if os.path.exists(dxf_path):
                try:
                    os.unlink(dxf_path)
                except OSError:
                    pass

    # Strategy 2: Try ezdxf's ODA File Converter addon
    try:
        from ezdxf.addons import odafc

        oda_dxf_path = input_path.rsplit('.', 1)[0] + '_oda_converted.dxf'
        odafc.convert(input_path, oda_dxf_path)
        try:
            convert_dxf_to_png(oda_dxf_path, output_path)
            return
        finally:
            if os.path.exists(oda_dxf_path):
                os.unlink(oda_dxf_path)
    except Exception as e:
        errors.append(f"odafc: {e}")

    # Strategy 3: Try reading DWG directly with ezdxf (some older DWG versions)
    try:
        from ezdxf import recover
        from ezdxf.addons.drawing import matplotlib as draw_mpl

        doc, auditor = recover.readfile(input_path)
        ensure_layers_visible(doc)
        msp = doc.modelspace()
        draw_mpl.qsave(msp, output_path, dpi=200, bg="#FFFFFF")
        print(f"OK: {output_path}")
        return
    except Exception as e:
        errors.append(f"ezdxf direct: {e}")

    print(f"ERROR: Could not convert DWG file. Tried: {'; '.join(errors)}", file=sys.stderr)
    sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 dxf2png.py <input_file> <output_png>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    if not os.path.exists(input_file):
        print(f"ERROR: Input file not found: {input_file}", file=sys.stderr)
        sys.exit(1)

    ext = input_file.rsplit('.', 1)[-1].lower()
    if ext == 'dxf':
        convert_dxf_to_png(input_file, output_file)
    elif ext == 'dwg':
        convert_dwg_to_png(input_file, output_file)
    else:
        print(f"ERROR: Unsupported file type: .{ext}", file=sys.stderr)
        sys.exit(1)
