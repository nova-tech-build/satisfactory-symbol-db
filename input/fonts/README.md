# INPUT FONTS

The list generator resolves every font face referenced by `input/assets/DescriptionText.json` by asset name. It searches this directory recursively, including `exclude` and `known-working`; it does not merge unrelated font files or treat a character range as proof of glyph coverage.

Provide the game-extracted faces referenced by the composite font, including:

* `OpenSans-Regular.ufont`, `OpenSans-SemiBold.ufont`, and `OpenSans-Bold.ufont` for the default typeface.
* `NotoSansCJK-Regular.ufont` for the fallback typeface and its declared collection subfaces.
* The Noto Sans, Noto Sans Display, Noto Sans Thai UI, Noto Kufi Arabic, Bengali, and Heebo faces referenced by the subtypefaces.

The resolver uses each face's declared `SubFaceIndex`; for example, it does not union every face in the CJK collection. Missing or ambiguous assets and unavailable face indices are errors. Fonts may remain under `exclude` as long as their filenames match the referenced game assets.

Use the actual `NotoSansThaiUI-Regular.ufont` referenced by `DescriptionText.json`; `NotoSansThai-Regular.ttf` is a substitute and is not used by generation. Heebo's SemiBold face is the game asset `Heebo-Medium.ufont`.

Generation checks the actual cmap glyph ID in the selected face for Regular, SemiBold, and Bold. It ignores culture declarations and selects the first subtypeface in JSON order whose range contains the codepoint; if no range matches, it uses the default typeface. A missing subtype style uses that subtype's Regular face; a missing glyph may use the composite font's fallback face. U+FFFF and glyph-zero mappings are excluded. U+2044, U+2120, and U+FEFF are appended as known-good points based on in-game confirmation.

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
