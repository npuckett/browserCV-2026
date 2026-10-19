# markers/

Printable sheets for the marker examples. Open a page, choose ids and size, and print at **100% scale** (turn off "fit to page").

| Page | Prints | Used by |
| --- | --- | --- |
| [print-aruco.html](print-aruco.html) | ArUco markers, `ARUCO_MIP_36h12` (default) or `ARUCO` | [aruco-markers](../p5/markers/aruco-markers/), [aruco-pose](../three/aruco-pose/) |
| [print-apriltag.html](print-apriltag.html) | AprilTags, family tag36h11, ids 0–15 | [apriltag-detect](../p5/markers/apriltag-detect/), [apriltag-pose](../three/apriltag-pose/) |
| [print-qr.html](print-qr.html) | QR codes with any text (one per line) | [qr-markers](../p5/markers/qr-markers/) |

Tips:

- **Size** on each page is the width of the black square. The pose examples need that real size: measure a printed marker with a ruler and set `MARKER_SIZE` or `TAG_SIZE` (in meters).
- Keep the white border around every marker, and keep fingers off it.
- Matte paper avoids glare. Mounting markers on card stops them curling.
- Markers on a phone or laptop screen work too, at screen brightness.

Sources:

- ArUco markers are drawn in the page by js-aruco2's `AR.Dictionary(...).generateSVG(id)`, so they always match the detector's dictionary.
- AprilTag images in `apriltag-36h11/` are the official [AprilRobotics/apriltag-imgs](https://github.com/AprilRobotics/apriltag-imgs) files (BSD-2-Clause; license included). The full family has 587 ids.
- QR codes are made by [qrcode-generator](https://www.npmjs.com/package/qrcode-generator) with medium error correction and the standard 4-module quiet zone.
