from pathlib import Path
import fitz
import sys


# ============================================================
# PDF PATH
# ============================================================

PDF_PATH = Path("public/template/blank-template.pdf")


# ============================================================
# POINT TO MM
# ============================================================

def pt_to_mm(value):
    return value * 25.4 / 72


# ============================================================
# PYMUPDF Y -> PDF-LIB Y
# ============================================================

def pymupdf_to_pdflib_y(page_height, y):
    return page_height - y


# ============================================================
# ANALYZE PDF
# ============================================================

def analyze_pdf():

    try:
        sys.stdout.reconfigure(
            encoding="utf-8",
            errors="replace"
        )
    except Exception:
        pass


    # ========================================================
    # CHECK PDF
    # ========================================================

    if not PDF_PATH.exists():

        print("PDF nahi mila:")
        print(PDF_PATH.resolve())

        return


    # ========================================================
    # OPEN PDF
    # ========================================================

    doc = fitz.open(PDF_PATH)


    print("=" * 70)
    print("PDF TEMPLATE ANALYSIS")
    print("=" * 70)

    print(f"File: {PDF_PATH.resolve()}")
    print(f"Pages: {len(doc)}")


    # ========================================================
    # PAGE LOOP
    # ========================================================

    for page_no, page in enumerate(doc, start=1):

        page_width = page.rect.width
        page_height = page.rect.height


        print()
        print("=" * 70)
        print(f"PAGE {page_no}")
        print("=" * 70)


        # ====================================================
        # PAGE SIZE
        # ====================================================

        print()
        print("PAGE SIZE")
        print("-" * 70)

        print(
            f"Width  : {page_width:.2f} pt "
            f"({pt_to_mm(page_width):.2f} mm)"
        )

        print(
            f"Height : {page_height:.2f} pt "
            f"({pt_to_mm(page_height):.2f} mm)"
        )


        # ====================================================
        # TEXT
        # ====================================================

        print()
        print("TEXT")
        print("-" * 70)


        blocks = page.get_text(
            "dict"
        ).get(
            "blocks",
            []
        )


        for block in blocks:

            if block.get("type") != 0:
                continue


            for line in block.get(
                "lines",
                []
            ):

                for span in line.get(
                    "spans",
                    []
                ):

                    text = span.get(
                        "text",
                        ""
                    ).strip()


                    if not text:
                        continue


                    # ----------------------------------------
                    # BOUNDING BOX
                    # ----------------------------------------

                    x0, y0, x1, y1 = span[
                        "bbox"
                    ]


                    width = x1 - x0
                    height = y1 - y0


                    # ----------------------------------------
                    # PYMuPDF -> PDF-LIB
                    # ----------------------------------------

                    pdf_bottom_y = (
                        page_height - y1
                    )

                    pdf_top_y = (
                        page_height - y0
                    )


                    print()
                    print(
                        f"TEXT: {text!r}"
                    )


                    # ----------------------------------------
                    # PYMuPDF
                    # ----------------------------------------

                    print()
                    print(
                        "PyMuPDF coordinates:"
                    )

                    print(
                        f"  x0 = {x0:.2f}"
                    )

                    print(
                        f"  y0 = {y0:.2f}"
                    )

                    print(
                        f"  x1 = {x1:.2f}"
                    )

                    print(
                        f"  y1 = {y1:.2f}"
                    )


                    # ----------------------------------------
                    # PDF-LIB
                    # ----------------------------------------

                    print()
                    print(
                        "PDF-Lib coordinates:"
                    )

                    print(
                        f"  left X   = {x0:.2f}"
                    )

                    print(
                        f"  bottom Y = "
                        f"{pdf_bottom_y:.2f}"
                    )

                    print(
                        f"  right X  = {x1:.2f}"
                    )

                    print(
                        f"  top Y    = "
                        f"{pdf_top_y:.2f}"
                    )


                    # ----------------------------------------
                    # SIZE
                    # ----------------------------------------

                    print()
                    print("SIZE:")

                    print(
                        f"  Width  = "
                        f"{width:.2f} pt "
                        f"({pt_to_mm(width):.2f} mm)"
                    )

                    print(
                        f"  Height = "
                        f"{height:.2f} pt "
                        f"({pt_to_mm(height):.2f} mm)"
                    )


                    # ----------------------------------------
                    # FONT
                    # ----------------------------------------

                    print()
                    print("FONT:")

                    print(
                        f"  Name = "
                        f"{span.get('font', 'Unknown')}"
                    )

                    print(
                        f"  Size = "
                        f"{span.get('size', 0):.2f} pt"
                    )


        # ====================================================
        # IMAGES
        # ====================================================

        print()
        print("IMAGES")
        print("-" * 70)


        images = page.get_images(
            full=True
        )


        if not images:

            print(
                "No embedded images."
            )

        else:

            print(
                f"Embedded images: "
                f"{len(images)}"
            )


            for index, image in enumerate(
                images,
                start=1
            ):

                xref = image[0]


                try:

                    rects = page.get_image_rects(
                        xref
                    )


                    for r in rects:

                        # Convert image Y
                        # PyMuPDF -> PDF-Lib

                        pdf_y = (
                            page_height
                            - r.y0
                            - r.height
                        )


                        print()
                        print(
                            f"IMAGE {index}"
                        )


                        print(
                            "PyMuPDF:"
                        )

                        print(
                            f"  x = "
                            f"{r.x0:.2f}"
                        )

                        print(
                            f"  y = "
                            f"{r.y0:.2f}"
                        )

                        print(
                            f"  width = "
                            f"{r.width:.2f}"
                        )

                        print(
                            f"  height = "
                            f"{r.height:.2f}"
                        )


                        print()
                        print(
                            "PDF-Lib:"
                        )

                        print(
                            f"  x = "
                            f"{r.x0:.2f}"
                        )

                        print(
                            f"  y = "
                            f"{pdf_y:.2f}"
                        )

                        print(
                            f"  width = "
                            f"{r.width:.2f}"
                        )

                        print(
                            f"  height = "
                            f"{r.height:.2f}"
                        )


                except Exception as error:

                    print(
                        f"Image {index} "
                        f"position unavailable."
                    )

                    print(
                        f"Reason: {error}"
                    )


    # ========================================================
    # CLOSE
    # ========================================================

    doc.close()


    print()
    print("=" * 70)
    print("ANALYSIS COMPLETE")
    print("=" * 70)


# ============================================================
# PROGRAM START
# ============================================================

if __name__ == "__main__":
    analyze_pdf()