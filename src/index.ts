export { SchemaValidatorGenericError } from "./helpers/errors.ts";
import * as schemaVal from "./helpers/schema-validator-components.ts";
import {
  type ISchemaMap as ISchemaMap0,
  type ICoreSchemaType as ICoreSchemaType0,
} from "./helpers/schema-validator-components.ts";

export default schemaVal;
export const v = schemaVal;
export { SchemaValidatorService } from "./helpers/validator-service.ts";
export type ISchemaMap = ISchemaMap0;
export type ICoreSchemaType<T> = ICoreSchemaType0<T>;
