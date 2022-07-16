import fs from "fs-extra";
import glob from "glob";
import jsonfile from "jsonfile";

import { changelog } from "../templates/changelog";
import { fontFace } from "../templates/css";
import { materialIcons } from "../templates/icons";
import { packageJson } from "../templates/package";
import { readme } from "../templates/readme";
import { scssGeneric } from "../templates/scss";
import { findClosest, makeFontFilePath } from "../utils/utils";

interface Font {
  fontDir: string;
  fontId: string;
  fontName: string;
  subsets: string[];
  defSubset: string;
  weights: number[];
  styles: string[];
  unicodeRange: { [subset: string]: string };
  source: string;
  license: string;
  version: string;
  variable: boolean;
  type: string;
  lastModified: string;
  category: string;
  packageVersion: string | undefined;
}

const packager = (font: Font, rebuildFlag: boolean): void => {
  const {
    fontDir,
    fontId,
    fontName,
    subsets,
    defSubset,
    weights,
    styles,
    unicodeRange,
    source,
    license,
    version,
    variable,
    type,
    lastModified,
    category,
    packageVersion,
  } = font;

  // Find the weight for index.css in the case weight 400 does not exist.
  const indexWeight = findClosest(weights, 400);

  // Generate CSS files
  for (const subset of subsets) {
    const cssSubset: string[] = [];
    for (const weight of weights) {
      for (const style of styles) {
        const cssStyle = [];
        const css = fontFace({
          fontId,
          fontName,
          style,
          subset,
          weight,
          locals: [],
          woffPath: makeFontFilePath(fontId, subset, weight, style, "woff"),
          woff2Path: makeFontFilePath(fontId, subset, weight, style, "woff2"),
          unicodeRange: false,
        });
        cssSubset.push(css);
        cssStyle.push(css);

        const cssFile = cssStyle.join("");

        // If style isn't normal, only specify then.
        if (style === "normal") {
          let cssPath = `${fontDir}/${subset}-${weight}.css`;
          fs.writeFileSync(cssPath, cssFile);

          // Write weight only CSS
          if (subset === defSubset) {
            cssPath = `${fontDir}/${weight}.css`;
            fs.writeFileSync(cssPath, cssFile);

            // Write index.css
            if (weight === indexWeight) {
              fs.writeFileSync(`${fontDir}/index.css`, cssStyle.join(""));
            }
          }
        } else {
          let cssStylePath = `${fontDir}/${subset}-${weight}-${style}.css`;
          fs.writeFileSync(cssStylePath, cssFile);

          if (subset === defSubset) {
            cssStylePath = `${fontDir}/${weight}-${style}.css`;
            fs.writeFileSync(cssStylePath, cssFile);
          }
        }
      }

      const fileContentSubset = cssSubset.join("");
      // subset.css
      const cssPath = `${fontDir}/${subset}.css`;
      fs.writeFileSync(cssPath, fileContentSubset);
    }
  }

  // Write SCSS file
  fs.ensureDirSync(`./${fontDir}/scss`);

  const scss = scssGeneric({
    fontId,
    fontName,
    defSubset,
  });

  fs.writeFileSync(`${fontDir}/scss/mixins.scss`, scss);

  // Material Icons #152
  if (type === "icons") {
    const icons = materialIcons({
      fontId,
      fontName,
    });
    const files = glob.sync(`${fontDir}/**/*.{css,scss}`);
    for (const file of files) {
      fs.appendFileSync(file, icons);
    }
  }

  // Write file-list.json
  const fileList: string[] = [];
  for (const file of fs.readdirSync(`${fontDir}/files`)) {
    fileList.push(`./fonts/${type}/${fontId}/files/${file}`);
  }
  jsonfile.writeFileSync(`${fontDir}/files/file-list.json`, fileList);

  // Write README.md
  const packageReadme = readme({
    fontId,
    fontName,
    subsets,
    weights,
    styles,
    variable: false,
    source,
    license,
    version,
    type,
  });
  fs.writeFileSync(`${fontDir}/README.md`, packageReadme);

  // Write metadata.json
  jsonfile.writeFileSync(`${fontDir}/metadata.json`, {
    fontId,
    fontName,
    subsets,
    weights,
    styles,
    defSubset,
    variable,
    lastModified,
    version,
    category,
    source,
    license,
    type,
  });

  // Write CHANGELOG.md
  fs.writeFileSync(`${fontDir}/CHANGELOG.md`, changelog());

  // Write unicode.json
  jsonfile.writeFileSync(`${fontDir}/unicode.json`, unicodeRange);

  // Write out package.json file
  let packageJSON;
  // If the rebuilder is using the function, it needs to pass the existing package version
  if (rebuildFlag) {
    packageJSON = packageJson({
      fontId,
      fontName,
      version: packageVersion,
      type,
    });
  } else {
    const mainRepoPackageJson = jsonfile.readFileSync("./package.json");
    packageJSON = packageJson({
      fontId,
      fontName,
      version: mainRepoPackageJson.version,
      type,
    });
  }
  fs.writeFileSync(`${fontDir}/package.json`, packageJSON);
};

export { packager };
