import { SchemaValidatorGenericError } from "./errors.ts";
import { getJoiValidationErrors, type IObjectSchema } from "./schema-validator-components.ts";

class SchemaValidatorServiceBase {
  async validate<T = any>({
    schema,
    data,
    errorMesssagePrefix,
    canThrowTheError,
    allowUnknown,
    stripUnknown,
  }: {
    schema: IObjectSchema<any>;
    data: Record<string, any>;
    errorMesssagePrefix?: string;
    canThrowTheError: boolean;
    allowUnknown?: boolean;
    stripUnknown?: boolean;
  }) {
    const { error, value } = schema.validate(data, {
      allowUnknown,
      stripUnknown,
      skipFunctions: true,
    });

    if (error) {
      const msg = getJoiValidationErrors(error) || "Validation error occured";
      const errorMesage = [errorMesssagePrefix, msg].filter((x) => x).join(": ");

      if (canThrowTheError) {
        throw new SchemaValidatorGenericError(errorMesage);
      }
      return await Promise.resolve({ validatedData: undefined, errorMesage });
    }
    return await Promise.resolve({ validatedData: value as T, errorMesage: undefined });
  }

  async validateOrThrowError<T = any>({
    schema,
    data,
    allowUnknown,
    stripUnknown,
  }: {
    allowUnknown?: boolean;
    stripUnknown?: boolean;
    schema: IObjectSchema<any>;
    data: Record<string, any>;
  }) {
    const { validatedData } = await this.validate({
      schema,
      data,
      canThrowTheError: true,
      allowUnknown,
      stripUnknown,
    });
    return validatedData as T;
  }
}

export const SchemaValidatorService = new SchemaValidatorServiceBase();
