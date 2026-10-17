import "i18next";
import type common from "./locales/en/common.json";

// Makes t("some.key") type-checked against the English file.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
    };
  }
}
