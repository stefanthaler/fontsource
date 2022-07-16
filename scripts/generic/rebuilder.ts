import consola from "consola"
import fs from "fs-extra";
import jsonfile from "jsonfile";

import { getDirectories } from "../utils/utils";
import { packager } from "./generic-packager";

interface Metadata {
  fontId: string;
  fontName: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  defSubset: string;
  variable: boolean;
  lastModified: string;
  version: string;
  category: string;
  source: string;
  license: string;
  type: string;
}

interface UnicodeRange {
  [subset: string]: string;
}

const rebuild = (type: string) => {
  const directories = getDirectories(type);
  for (const directory of directories) {
    const fontDir = `./fonts/${type}/${directory}`;
    try {
      const metadata: Metadata = jsonfile.readFileSync(
        `${fontDir}/metadata.json`
      );

      let unicodeRange: UnicodeRange = {};
      if (fs.existsSync(`${fontDir}/unicode.json`)) {
        unicodeRange = jsonfile.readFileSync(`${fontDir}/unicode.json`);
      }

      // Rebuild only non-Google fonts
      if (metadata.type !== "google") {
        const packageJSONData = jsonfile.readFileSync(
          `${fontDir}/package.json`
        );

        // Clear directory
        fs.copySync(`${fontDir}/files`, `./scripts/temp_packages/${directory}`);
        fs.emptyDirSync(fontDir);
        fs.copySync(
          `./scripts/temp_packages/${directory}`,
          `./${fontDir}/files`
        );
        fs.removeSync(`./scripts/temp_packages/${directory}`);

        // Create object to store all necessary data to run package function
        const fontObject = {
          fontId: metadata.fontId,
          fontName: metadata.fontName,
          subsets: metadata.subsets,
          weights: metadata.weights.map(Number),
          styles: metadata.styles,
          defSubset: metadata.defSubset,
          unicodeRange,
          variable: false,
          lastModified: metadata.lastModified,
          version: metadata.version,
          category: metadata.category,
          source: metadata.source,
          license: metadata.license,
          type: metadata.type,

          fontDir,
          packageVersion: packageJSONData.version,
        };

        // Generate files (true for rebuildFlag)
        packager(fontObject, true);

        consola.success(`Finished processing ${metadata.fontId}.`);
      }
    } catch (error) {
      consola.error(error);
    }
  }
};

rebuild("league");
rebuild("icons");
rebuild("other");
