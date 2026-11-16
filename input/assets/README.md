# ASSETS

`DescriptionText.json` defines the default typeface, fallback typeface, and range-specific subtypefaces used by the sign font. The list generator reads this asset by its `Name`, resolves only each typeface's Regular game font face, and includes a codepoint when a nonzero cmap glyph is available in the selected Regular face or the fallback Regular face.

The generator ignores subtypeface culture declarations and uses the first subtypeface in JSON declaration order whose character range contains the codepoint. If no range matches, it uses the default typeface; if the selected Regular face lacks a glyph, it tries only the composite font's fallback Regular face, not another subtypeface. This does not verify SemiBold or Bold rendering.

U+2044, U+2120, and U+FEFF are appended as user-confirmed known-good codepoints because they render in-game despite being absent from the face-based resolver output. This simplified generation is not claimed to reproduce the engine's culture-aware routing exactly.
