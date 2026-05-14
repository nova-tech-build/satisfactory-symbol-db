# INPUT FONTS


Based on DescriptionText.json

Primary font: OpenSans 
Subfonts: TBD
Fallback: NotoSandCJK




TODO THIS IS KINDA WRONG. THERE IS A FONT MAP DescriptionText.json WHICH DEFINES A COMPOSITE FONT


Extract the following ufonts:

* NotoKufiArabic-Regular.ufont
* NotoSansCJK-Regular.ufont
* NotoSansThai-Regular.ttf
* OpenSans-Regular.ufont

The other fonts dont apear to be used in the sign rendering logic.

This was determined by deduction:

## CONFIRMED CHARS DONT WORK

U+A662 42594 Ꙣ Cyrillic Extended-B Noto Sans Bold, Noto Sans Display Regular, Noto Sans Regular, Noto Sans SemiBold
U+FB05 64261 ﬅ Alphabetic Presentation Forms Heebo Bold, Heebo-Medium, Heebo-Regular
U+20B9 8377 ₹ Currency Symbols Noto Sans Bengali Regular
U+02D7 727 ˗ Spacing Modifier Letters Noto Sans Thai UI Regular
U+063B	1595	ػ	Arabic	Noto Naskh Arabic UI
U+1E5F	7775	ṟ	Latin Extended Additional	Noto Sans Bold, Noto Sans Display Regular, Noto Sans Regular, Noto Sans SemiBold
U+1CF6	7414	ᳶ	Vedic Extensions	Noto Sans Bengali Regular
U+010400	66560	𐐀	Deseret	Droid Sans Fallback

## CONFIRMED CHARS WORK
U+017F	383	ſ	Latin Extended-A	Open Sans Regular
U+0601	1537	؁	Arabic	Noto Kufi Arabic Regular
U+0E52	3666	๒	Thai	Noto Sans Thai Regular
