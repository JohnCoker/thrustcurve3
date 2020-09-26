#!/bin/sh -e
#
# Generate the different sized icons needed from a single source image.

cd $(dirname $0)
rm -rf ios android
mkdir ios android

# iOS icons
echo '    <platform name="ios">'
(
  while read size name; do
    convert icon-ios.png -resize "$size" "ios/${name}.png"
    w=$(echo "$size" | sed 's/x.*$//')
    h=$(echo "$size" | sed 's/^[0-9]*x//')
    echo '        <icon src="res/ios/'${name}'.png" width="'${w}'" height="'${h}'" />'
  done
) <<'EOF'
512x512 iTunesArtwork
1024x1024 iTunesArtwork@2x
120x120 Icon-60@2x
180x180 Icon-60@3x
76x76 Icon-76
152x152 Icon-76@2x
167x167 Icon-83.5@2x
40x40 Icon-Small-40
80x80 Icon-Small-40@2x
120x120 Icon-Small-40@3x
29x29 Icon-Small.png
58x58 Icon-Small@2x.png
87x87 Icon-Small@3x.png
EOF

# iOS icons
echo '    <platform name="android">'
(
  while read size name; do
    convert icon-android-fg.png -resize "$size" "android/${name}-fg.png"
    convert icon-android-bg.png -resize "$size" "android/${name}-bg.png"
    echo '        <icon background="res/android/'${name}'-bg.png" foreground="res/android/'${name}'-fg.png" density="'${name}'" />'
  done
) <<'EOF'
36x36 ldpi
48x48 mdpi
72x72 hdpi
96x96 xhdpi
144x144 xxhdpi
192x192 xxxhdpi
EOF
