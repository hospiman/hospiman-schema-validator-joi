import Joi from "joi";
import { UtilService } from "./util-service.ts";

export type ISchemaMap = Joi.SchemaMap;
export type IObjectSchema<T> = Joi.ObjectSchema<T>;
export type ICoreSchemaType<T> = {
  [P in keyof T]-?: Joi.AnySchema | Joi.AlternativesSchema | [Joi.AnySchema, Joi.AnySchema];
};
// export type ICoreSchemaType<T> = { [P in keyof T]-?: Joi.AnySchema | Joi.AlternativesSchema };

export function getJoiValidationErrors(err: Joi.ValidationError): string | null {
  if (err?.details?.length) {
    const details: Joi.ValidationErrorItem[] = JSON.parse(JSON.stringify(err.details));
    const joiData = details.map((x) => x.message.replace(new RegExp('"', "g"), ""));
    return joiData.join("; ");
  }
  return "";
}

type IUrlOption = {
  label?: string;
  isRequired?: boolean;
  //
  defaultVal?: string;
};

function sanitize_plain_text(input: string | undefined | null): string | null {
  if (typeof input !== "string") return null;
  if (!input) return null;

  const input01 = input
    // normalize unicode
    .normalize("NFKC")

    // Remove ALL ASCII control chars except newline & tab
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

    // Remove JS line/paragraph separators (JSON killers in JS)
    .replace(/[\u2028\u2029]/g, "")

    // replace non-breaking spaces
    .replace(/\u00A0/g, " ")

    // remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")

    // normalize smart quotes
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")

    // normalize dashes
    .replace(/[–—]/g, "-")

    // normalize bullets
    .replace(/[•▪◦]/g, "-")

    // collapse multiple spaces
    .replace(/[ \t]+/g, " ")

    // normalize newlines
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")

    .trim();

  return input01;
}

const joi_phone_number = (phoneString: string, helpers: Joi.CustomHelpers) => {
  if (phoneString.startsWith("+") && UtilService.isValidPhoneNumberSync(phoneString)) {
    const numberFound = UtilService.findRawPhoneNumbersFromTextSync(phoneString);
    if (numberFound?.number?.country === "NG") {
      const nationalNumber01 = numberFound.number.nationalNumber;
      if (nationalNumber01.length === 10) {
        return phoneString;
      }
      if (nationalNumber01.length === 12) {
        // format help line: "+234700494342466" => "700494342466"
        if (nationalNumber01[1] === "0" && nationalNumber01[2] === "0") {
          return phoneString;
        }
      }
      if (nationalNumber01.length === 8 || nationalNumber01.length === 9) {
        // eg: format for land lines: (Lagos) "+23414607560" => "14607560"
        // eg: format for land lines: (Enugu) "+234424607560" => "424607560"
        return phoneString;
      }
      throw new Error(`'${numberFound.number.number}' not valid a valid phone number length`);
    }
    return phoneString;
  }
  throw new Error(`'${helpers.original}' not valid a valid phone number`);
};

const joi_yyyy_mm_dd_base = (dateString: string, errorMsg: string) => {
  if (!(dateString && typeof dateString === "string")) {
    throw new Error(errorMsg);
  }
  const regEx = /^\d{4}-\d{2}-\d{2}$/;

  if (!regEx.test(dateString)) {
    // Invalid format
    throw new Error(errorMsg);
  }

  const pdate = dateString.split("-");
  if (pdate?.length !== 3) {
    throw new Error(errorMsg);
  }
  const [yyyy, mm, dd] = pdate.map((dt) => parseInt(dt));

  if (!(mm >= 1 && mm <= 12)) {
    throw new Error(errorMsg);
  }
  // Create list of days of a month [assume there is no leap year by default]
  const listOfDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const isNonLeapYearMonth = mm === 1 || mm > 2;

  if (isNonLeapYearMonth) {
    if (dd > listOfDays[mm - 1]) {
      throw new Error(errorMsg);
    }
  } else {
    let lyear = false;
    if ((!(yyyy % 4) && yyyy % 100) || !(yyyy % 400)) {
      lyear = true;
    }
    if (lyear === false && dd >= 29) {
      throw new Error(errorMsg);
    }
    if (lyear === true && dd > 29) {
      throw new Error(errorMsg);
    }
  }
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) {
    // NaN value, Invalid date
    throw new Error(errorMsg);
  }
  const check1 = d.toISOString().slice(0, 10) === dateString;
  const check2 = d.toISOString().split("T")[0] === dateString;
  if (!(check1 && check2)) {
    throw new Error(errorMsg);
  }
  // Return the value unchanged
  return dateString;
};

const joi_yyyy_mm_dd_method = (dateString: string, helpers: Joi.CustomHelpers) => {
  const errorMsg = `'${helpers.original}' not valid. Value must be a valid date format: YYYY-MM-DD`;
  return joi_yyyy_mm_dd_base(dateString, errorMsg);
};

const joi_yyyy_mm_method = (dateString: string, helpers: Joi.CustomHelpers) => {
  const errorMsg = `'${helpers.original}' not valid. Value must be valid date format: YYYY-MM`;
  const validated = joi_yyyy_mm_dd_base(`${dateString}-01`, errorMsg);
  if (validated) {
    // trick linter
  }
  return dateString;
};

const joi_mm_dd_method = (mmddDateString: string, helpers: Joi.CustomHelpers) => {
  const errorMsg = `'${helpers.original}' not valid. Value must be valid date format: MM-DD`;
  const validated = joi_yyyy_mm_dd_base(`2022-${mmddDateString}`, errorMsg);
  if (validated) {
    // trick linter
  }
  return mmddDateString;
};

const joi_yyyy_method = (dateString: string, helpers: Joi.CustomHelpers) => {
  const errorMsg = `'${helpers.original}' not valid. Value must be valid date format: YYYY`;
  const validated = joi_yyyy_mm_dd_base(`${dateString}-01-01`, errorMsg);
  if (validated) {
    // trick linter
  }
  return dateString;
};

export function ValDateISOValidation({
  isRequired,
  defaultVal,
  defaultNow,
  enforceFullIsoFormat,
  label,
}: {
  isRequired?: boolean;
  defaultNow?: boolean;
  enforceFullIsoFormat?: boolean;
  defaultVal?: () => string;
  label?: string;
} = {}) {
  //
  if (enforceFullIsoFormat === true) {
    const isoFullDateFormatFunc = (str: string, helpers: Joi.CustomHelpers) => {
      const msg = `'${helpers.original}' not valid. Value must be valid date and full iso date format`;
      if (!(str && typeof str === "string")) {
        throw new Error(msg);
      }
      if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) {
        throw new Error(msg);
      }
      const d = new Date(str);
      const isValid = d?.toISOString() === str;
      if (!isValid) {
        throw new Error(msg);
      }
      return str;
    };

    const joiInst = Joi.string().empty("").custom(isoFullDateFormatFunc, "Full iso date");

    if (isRequired === true) {
      return joiInst.required().strict(false);
    }
    if (defaultVal) {
      return joiInst.default(defaultVal).strict(false);
    }

    if (defaultNow === true) {
      return joiInst.strict(false).default(() => new Date().toISOString());
    }
    return joiInst;
  }
  let joiInst = Joi.string().empty("").isoDate().strict(false);

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isRequired === true) {
    return joiInst.required();
  }
  if (defaultVal) {
    return joiInst.default(defaultVal);
  }
  if (defaultNow === true) {
    return joiInst.default(() => new Date().toISOString());
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValIsoTimeFormat_HH_MM({
  isRequired,
  defaultNow,
  label,
}: { isRequired?: boolean; defaultNow?: boolean; label?: string } = {}) {
  //
  const isoTimeFormatFunc = (hh_mm: string, helpers: Joi.CustomHelpers) => {
    const msg = `'${helpers.original}' not valid. Value must be valid iso time and format: HH:MM`;
    if (!(hh_mm && typeof hh_mm === "string")) {
      throw new Error(msg);
    }
    if (!/\d{2}:\d{2}/.test(hh_mm)) {
      throw new Error(msg);
    }

    const [hh, mm] = hh_mm.split(":").map((f, _, arr) => {
      if (arr.length !== 2) {
        throw new Error(msg);
      }
      return Number(f);
    });

    if (!(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)) {
      throw new Error(msg);
    }

    const joinedDate = `2021-01-01T${hh_mm}:00.000Z`;
    const d = new Date(joinedDate);
    const isValid = d?.toISOString() === joinedDate;
    if (!isValid) {
      throw new Error(msg);
    }
    return hh_mm;
  };

  let joiInst = Joi.string().empty("").custom(isoTimeFormatFunc, "iso time").strict(false);

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isRequired === true) {
    return joiInst.required();
  }

  if (defaultNow === true) {
    return joiInst.default(() => {
      const [hh, mm] = new Date().toISOString().split("T")[1].split(":");
      return [hh, mm].join(":");
    });
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValDateFormat_YYYY_MM_DD({
  isRequired,
  useTodayAsDefault,
  max,
  label,
}: {
  isRequired?: boolean;
  useTodayAsDefault?: boolean;
  max?: "today"; // | "tomorrow" | "yestarday";
  label?: string;
} = {}) {
  let joiInst = Joi.string()
    .empty("")
    .custom(joi_yyyy_mm_dd_method, "custom YYYY-MM-DD validation");

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (useTodayAsDefault === true) {
    joiInst = joiInst.default(() => {
      return new Date().toISOString().split("T")[0];
    });
  }

  if (max === "today") {
    joiInst = joiInst.custom((value, helpers) => {
      const date01 = new Date().toISOString().split("T")[0];
      if (value > date01) {
        const errorMsg = `'${helpers.original}' not valid. Date must not be graeter than today: ${date01}`;
        throw new Error(errorMsg);
      }
      return value;
    });
  }

  if (isRequired === true) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValDateFormat_YYYY_MM({
  isRequired,
  label,
}: { isRequired?: boolean; label?: string } = {}) {
  let joiInst = Joi.string().custom(joi_yyyy_mm_method, "custom YYYY-MM validation");

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isRequired === true) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValDateFormat_MM_DD({
  isRequired,
  label,
}: { isRequired?: boolean; label?: string } = {}) {
  let joiInst = Joi.string().custom(joi_mm_dd_method, "custom MM-DD validation");

  if (label) {
    joiInst = joiInst.label(label);
  }
  if (isRequired === true) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValDateFormat_YYYY({
  isRequired,
  label,
}: { isRequired?: boolean; label?: string } = {}) {
  let joiInst = Joi.string().custom(joi_yyyy_method, "custom YYYY validation");

  if (label) {
    joiInst = joiInst.label(label);
  }
  if (isRequired === true) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValStringCustomId({
  isRequired,
  label,
}: { isRequired?: boolean; label?: string } = {}) {
  let joiInst = Joi.string()
    .empty("")
    .pattern(/^[A-Za-z0-9\-_:#]+$/)
    .trim()
    .min(4)
    .max(512)
    .trim();

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isRequired) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValPhoneNumber({
  isRequired,
  label,
}: { isRequired?: boolean; label?: string } = {}) {
  let joiInst = Joi.string().empty("").trim().custom(joi_phone_number);

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isRequired) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValStripWhenNull() {
  return Joi.any().empty("").valid(null).strip();
}

export function ValBoolean({
  isRequired,
  label,
  defaultVal,
}: { isRequired?: boolean; label?: string; defaultVal?: boolean } = {}) {
  let joiInst = Joi.boolean();

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (typeof defaultVal === "boolean") {
    joiInst = joiInst.default(defaultVal);
  }

  if (isRequired) {
    return joiInst.required();
  }

  if (typeof defaultVal === "boolean") {
    return joiInst;
  }

  return Joi.alternatives<boolean>([ValStripWhenNull(), joiInst]);
}

export function ValEmail({ isRequired, label }: { isRequired?: boolean; label?: string } = {}) {
  let joiInst = Joi.string().empty("").trim().email().lowercase();

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isRequired) {
    return joiInst.required();
  }
  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValUrl({ isRequired, label, defaultVal }: IUrlOption = {}) {
  let joiInst = Joi.string().empty("").lowercase().trim().uri();

  const isValidDefault = (() => {
    if (!defaultVal) return false;
    if (typeof defaultVal === "string" || typeof defaultVal === "function") return true;
    return false;
  })();

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isValidDefault) {
    joiInst = joiInst.default(defaultVal);
  }

  if (isRequired) {
    return joiInst.required();
  }

  if (isValidDefault) {
    return joiInst;
  }

  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValString({
  isRequired,
  lowercase,
  uppercase,
  isEmail,
  trim,
  valid,
  min,
  max,
  pattern,
  message,
  label,
  isUUID,
  defaultValue,
  isAlphNumeric,
  isNumeric,
  canSanitize,
}: {
  isRequired?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  isEmail?: boolean;
  isUUID?: boolean;
  trim?: boolean;
  min?: number;
  max?: number;
  valid?: any[];
  pattern?: RegExp;
  message?: string;
  label?: string;
  isAlphNumeric?: boolean;
  isNumeric?: boolean;
  canSanitize?: boolean;
  defaultValue?: string | (() => string);
} = {}) {
  //
  let joiInst = (() => {
    if (canSanitize) {
      return Joi.string()
        .empty("")
        .custom((value, helpers) => {
          const sanitized = sanitize_plain_text(value);

          if (!sanitized) {
            return helpers.error("string.empty");
          }

          return sanitized;
        }, "Plain text sanitization");
    }
    return Joi.string().empty("");
  })();

  if (lowercase) {
    joiInst = joiInst.lowercase();
  }
  if (uppercase) {
    joiInst = joiInst.uppercase();
  }
  if (trim) {
    joiInst = joiInst.trim();
  }
  if (message) {
    joiInst = joiInst.message(message);
  }
  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isAlphNumeric) {
    joiInst = joiInst.alphanum();
  } else if (isNumeric) {
    joiInst = joiInst.regex(/^[0-9]+$/);
  }

  if (pattern) {
    joiInst = joiInst.pattern(pattern);
  }

  if (isEmail) {
    joiInst = joiInst.email();
  } else if (isUUID) {
    joiInst = joiInst.uuid();
  }

  if (valid?.length) {
    joiInst = joiInst.valid(...valid);
  }

  if (min || min === 0) {
    joiInst = joiInst.min(min);
  }

  if (max || max === 0) {
    joiInst = joiInst.max(max);
  }

  const isValidDefault = (() => {
    if (!defaultValue) return false;
    if (typeof defaultValue === "string" || typeof defaultValue === "function") return true;
    return false;
  })();

  if (isValidDefault) {
    joiInst = joiInst.default(defaultValue);
  }

  if (isRequired) {
    return joiInst.required();
  }

  if (isValidDefault) {
    return joiInst;
  }

  return Joi.alternatives<string>([ValStripWhenNull(), joiInst]);
}

export function ValCurrency({
  isRequired,
  min,
  max,
  defaultValue,
  isInteger,
  label,
}: {
  isRequired?: boolean;
  min?: number;
  max?: number;
  defaultValue?: number;
  isInteger?: boolean;
  label?: string;
} = {}) {
  let joiInst = Joi.number().precision(2);

  if (min || min === 0) {
    joiInst = joiInst.min(min);
  }

  if (max || max === 0) {
    joiInst = joiInst.max(max);
  }

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (isInteger) {
    joiInst = joiInst.integer();
  }

  if (typeof defaultValue === "number") {
    joiInst = joiInst.default(defaultValue);
  }

  if (isRequired) {
    return joiInst.required();
  }

  if (typeof defaultValue === "number") {
    return joiInst;
  }

  return Joi.alternatives<number>([ValStripWhenNull(), joiInst]);
}

export function ValNumber({
  isRequired,
  min,
  max,
  defaultValue,
  isInteger,
  label,
  valid,
}: {
  isRequired?: boolean;
  min?: number;
  max?: number;
  defaultValue?: number;
  isInteger?: boolean;
  label?: string;
  valid?: number[];
} = {}) {
  let joiInst = Joi.number().empty("");

  if (min || min === 0) {
    joiInst = joiInst.min(min);
  }

  if (max || max === 0) {
    joiInst = joiInst.max(max);
  }

  if (label) {
    joiInst = joiInst.label(label);
  }

  if (valid?.length) {
    joiInst = joiInst.valid(...valid);
  }

  if (isInteger) {
    joiInst = joiInst.integer();
  }

  if (typeof defaultValue === "number") {
    joiInst = joiInst.default(defaultValue);
  }

  if (isRequired) {
    return joiInst.required();
  }

  if (typeof defaultValue === "number") {
    return joiInst;
  }

  return Joi.alternatives<number>([ValStripWhenNull(), joiInst]);
}

export function ValArrayItems<T extends Joi.SchemaLikeWithoutArray>(items: T) {
  return Joi.array().items(items);
}

export function ValArrayItemsRequired<T extends Joi.SchemaLikeWithoutArray>(items: T) {
  return Joi.array().items(items).required();
}

export function ValArrayItemsOptional<T extends Joi.SchemaLikeWithoutArray>(items: T) {
  return Joi.array().items(items).optional();
}

export function ValObject<T>(schema: Joi.PartialSchemaMap<T>) {
  return Joi.object<T>().keys(schema);
}

export function ValObjectRequired<T>(schema: Joi.PartialSchemaMap<T>) {
  return Joi.object<T>().keys(schema).required();
}

export function ValObjectOptional<T>(schema: Joi.PartialSchemaMap<T>) {
  return Joi.object<T>().keys(schema).optional();
}

export function ValObjectUnknown<T>(schema?: Joi.PartialSchemaMap<T>) {
  if (schema) {
    return Joi.object<T>().keys(schema).unknown(true);
  }
  return Joi.object<T>().unknown(true);
}

export function ValObjectPattern<T>({
  pattern,
  schema,
  options,
}: {
  pattern: RegExp | Joi.SchemaLike;
  schema: Joi.PartialSchemaMap<T>;
  options?: Joi.ObjectPatternOptions;
}) {
  return Joi.object<T>().pattern(pattern, schema, options);
}

export const ValStripAnyField = () => Joi.any().strip();
export const ValAnyValue = () => Joi.any();

export function ValUnion<T = any>(schema: [Joi.SchemaLike, Joi.SchemaLike, ...Joi.SchemaLike[]]) {
  return Joi.alternatives<T>(schema);
}
