import fs from "fs-extra";
import { APIv2 } from "google-font-metadata";

import { fontFace } from "../templates/css";
import { makeFontFilePath, findClosest } from "../utils/utils";

const packagerV2 = (id: string): void => {
  const font = APIv2[id];
  const fontDir = `fonts/google/${font.id}`;

  // Find the weight for index.css in the case weight 400 does not exist.
  const indexWeight = findClosest(font.weights, 400);

  // Generate CSS
  const unicodeKeys = Object.keys(font.unicodeRange);

  font.weights.forEach(weight => {
    font.styles.forEach(style => {
      const cssStyle: string[] = [];
      unicodeKeys.forEach(subset => {
        // Some fonts may have variants 400, 400i, 700 but not 700i.
        if (style in font.variants[weight]) {
          const css = fontFace({
            fontId: font.id,
            fontName: font.family,
            style,
            subset,
            weight,
            woff2Path: makeFontFilePath(
              font.id,
              subset.replace("[", "").replace("]", ""),
              weight,
              style,
              "woff2"
            ),
            woffPath: makeFontFilePath(font.id, "all", weight, style, "woff"),
            unicodeRange: font.unicodeRange[subset],
          });
          cssStyle.push(css);
        }
      });
      // Write down CSS
      if (style in font.variants[weight]) {
        if (style === "normal") {
          const cssPath = `${fontDir}/${weight}.css`;
          fs.writeFileSync(cssPath, cssStyle.join(""));

          // Generate index CSS
          if (weight === indexWeight) {
            fs.writeFileSync(`${fontDir}/index.css`, cssStyle.join(""));
          }
        } else {
          // If italic or else, define specific style CSS file
          const cssStylePath = `${fontDir}/${weight}-${style}.css`;
          fs.writeFileSync(cssStylePath, cssStyle.join(""));
        }
      }
    });
  });
};

export { packagerV2 };
