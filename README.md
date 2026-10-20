# arca-moulds

SW's [Code-CAD](https://github.com/Irev-Dev/curated-code-cad) tools for generating moulds around 2D (`SVG`) diagrams and 3D (`STL`) models.

## Usage

### `npm run moulds`

Build moulds around an STL model by running:

`npm run mould --project="example1"`

The mould object must be named `model.stl` and placed in the appropriate directory in `input/` (in the above case, `input/example1/`). That project's output would then be placed in `output/example1/`
