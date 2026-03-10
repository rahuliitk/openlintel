#!/usr/bin/env python3
"""Convert DXF/DWG files to PNG images for AI floor plan analysis.

Usage: python3 dxf2png.py <input_file> <output_png>
Supports: .dxf files (via ezdxf), .dwg files (attempted via ezdxf odafc addon)
"""
import sys
import os

def convert_dxf_to_png(input_path: str, output_path: str) -> None:
    import ezdxf
    from ezdxf.addons.drawing import matplotlib as draw_mpl

    doc = ezdxf.readfile(input_path)
    msp = doc.modelspace()

    fig = draw_mpl.figure()
    ax = fig.add_axes([0, 0, 1, 1])

    ctx = draw_mpl.RenderContext(doc)
    out = draw_mpl.MatplotlibBackend(ax)
    draw_mpl.Frontend(ctx, out).draw_layout(msp)

    fig.savefig(output_path, dpi=200, bbox_inches='tight', pad_inches=0.1,
                facecolor='white', edgecolor='none')
    print(f"OK: {output_path}")


def convert_dwg_to_png(input_path: str, output_path: str) -> None:
    """Try to convert DWG → DXF using ezdxf's odafc addon, then render."""
    try:
        import ezdxf
        from ezdxf.addons import odafc

        # Convert DWG to DXF in a temp file
        dxf_path = input_path.rsplit('.', 1)[0] + '_converted.dxf'
        odafc.convert(input_path, dxf_path)
        convert_dxf_to_png(dxf_path, output_path)
        os.unlink(dxf_path)
    except Exception as e:
        # Fallback: try reading directly with ezdxf (works for some DWG versions)
        try:
            import ezdxf
            doc = ezdxf.readfile(input_path)
            from ezdxf.addons.drawing import matplotlib as draw_mpl

            fig = draw_mpl.figure()
            ax = fig.add_axes([0, 0, 1, 1])
            ctx = draw_mpl.RenderContext(doc)
            out = draw_mpl.MatplotlibBackend(ax)
            draw_mpl.Frontend(ctx, out).draw_layout(doc.modelspace())
            fig.savefig(output_path, dpi=200, bbox_inches='tight',
                        pad_inches=0.1, facecolor='white', edgecolor='none')
            print(f"OK: {output_path}")
        except Exception as e2:
            print(f"ERROR: Could not convert DWG file. Primary error: {e}. Fallback error: {e2}", file=sys.stderr)
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
