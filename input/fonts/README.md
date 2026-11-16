# INPUT FONTS

The list generator resolves only the Regular `.uasset` face from each typeface in `input/assets/DescriptionText.json` by asset name; other font extensions are ignored. It searches only `.uasset` files directly inside this directory; subdirectories such as `exclude` and `known-working` are ignored. Move each required font from `exclude` into this directory to use it. It does not merge unrelated font files or treat a character range as proof of glyph coverage. SemiBold and Bold assets are not needed for generation.

Place these eight game-extracted Regular font files directly in this directory:

* `OpenSans-Regular.uasset` — default typeface.
* `NotoSansCJK-Regular.uasset` — fallback typeface and CJK subtypefaces, using their declared collection face indices.
* `NotoSans-Regular.uasset` — Noto Sans subtypeface.
* `NotoSansDisplay-Regular.uasset` — Noto Sans Display subtypeface.
* `NotoSansThaiUI-Regular.uasset` — Thai UI subtypeface.
* `NotoKufiArabic-Regular.uasset` — Noto Kufi Arabic subtypeface.
* `NotoSansBengali-Regular.uasset` — Bengali subtypeface.
* `Heebo-Regular.uasset` — Heebo subtypeface.

The resolver uses each face's declared `SubFaceIndex`; for example, it does not union every face in the CJK collection. Missing or ambiguous assets and unavailable face indices are errors. Only the required Regular assets need to be moved out of `exclude`; unused fonts can remain there.

Use the actual `NotoSansThaiUI-Regular.uasset` referenced by `DescriptionText.json`; `NotoSansThai-Regular.uasset` is a substitute and is not used by generation.

Generation checks the actual cmap glyph ID in the selected Regular face. It ignores culture declarations and selects the first subtypeface in JSON order whose range contains the codepoint; if no range matches, it uses the default typeface. A missing glyph may use the composite font's fallback Regular face. U+FFFF and glyph-zero mappings are excluded. U+2044, U+2120, and U+FEFF are appended as known-good points based on in-game confirmation. SemiBold and Bold rendering is not checked.

## Direct testing

### CONFIRMED CHARS DONT WORK

U+A662 42594 Ꙣ Cyrillic Extended-B Noto Sans Bold, Noto Sans Display Regular, Noto Sans Regular, Noto Sans SemiBold
U+FB05 64261 ﬅ Alphabetic Presentation Forms Heebo Bold, Heebo-Medium, Heebo-Regular
U+20B9 8377 ₹ Currency Symbols Noto Sans Bengali Regular
U+02D7 727 ˗ Spacing Modifier Letters Noto Sans Thai UI Regular
U+063B 1595 ػ Arabic Noto Naskh Arabic UI
U+1E5F 7775 ṟ Latin Extended Additional Noto Sans Bold, Noto Sans Display Regular, Noto Sans Regular, Noto Sans SemiBold
U+1CF6 7414 ᳶ Vedic Extensions Noto Sans Bengali Regular
U+010400 66560 𐐀 Deseret Droid Sans Fallback

### CONFIRMED CHARS WORK

U+017F 383 ſ Latin Extended-A Open Sans Regular
U+0601 1537 ؁ Arabic Noto Kufi Arabic Regular
U+0E52 3666 ๒ Thai Noto Sans Thai Regular
