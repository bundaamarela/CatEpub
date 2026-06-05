# Cat Epub — Scripts

## `generate_covers.py` — Minimal generated covers

Standalone Python script that generates clean minimal cover PNGs (light + dark)
for books that arrive without a usable cover image.

### Requirements

Python 3.9+ and Pillow.

```bash
pip install Pillow
```

### Usage

1. Create `scripts/covers_input.json` with the books you want covers for:

    ```json
    [
      { "id": "01HXY...", "title": "The Sovereign Individual", "author": "James Dale Davidson" },
      { "id": "01HXZ...", "title": "Muqaddimah", "author": "Ibn Khaldun" }
    ]
    ```

    The `id` should match the book's Cat Epub ID (visible in the metadata editor
    URL / debug panel). Title and author are free text.

2. Run the script:

    ```bash
    cd scripts
    python generate_covers.py
    ```

    Output is written to `scripts/covers_output/`:

    ```
    {id}_light.png   — white background, 400x600
    {id}_dark.png    — black background, 400x600
    ```

3. In Cat Epub, open **Biblioteca → "…" on the book → Editar metadados → Carregar capa**
   and drop the PNG you prefer. The cover field accepts PNG (along with JPEG
   and WebP), max 2 MB.

### Layout

- Title centred vertically in the upper 60% (wraps if long, font shrinks to fit)
- Thin horizontal rule under the title
- Author in the lower 20%, centred
- Clean sans-serif throughout (DejaVu / Arial / Helvetica, whichever is available)

### Notes

- No external services. Runs entirely offline.
- The script is intentionally standalone — it does not touch the Cat Epub app
  or its database. You import covers manually via the metadata editor.
- Re-running overwrites previous output for the same `id`.
