import { RefinementCtx, z, type ZodTypeAny } from "zod";

/**
 * Parses a query from a URL, URLSearchParams, or Request using a Zod schema.
 *
 * @param {URLSearchParams | string | Request} value - The query to parse.
 * @param {TSchema} schema - The Zod schema to use for parsing.
 *
 * @example
 * import { z } from "zod";
 * import { parseQueryAsync } from "zod-web-api";
 *
 * // create schema
 * const schema = z.object({
 *   username: z.string(),
 *   email: z.string().email(),
 *   age: z.number().int().min(18),
 *   newsletter: z.boolean()
 * });
 *
 * // create URLSearchParams
 * const searchParams = new URLSearchParams();
 * searchParams.append("username", "john");
 * searchParams.append("email", "john@example.com");
 * searchParams.append("age", "23");
 * searchParams.append("newsletter", "false");
 *
 * // parse
 * let submission = await parseQueryAsync(searchParams, schema);
 *
 * // also accepts a string of the full URL
 * const url = `https://example.com?${searchParams}`;
 * submission = await parseQueryAsync(url, schema);
 *
 * // also accepts a Request object
 * const request = new Request(url);
 * submission = await parseQueryAsync(request, schema);
 *
 * // the three parseQueryAsync calls above would return this fully typed object
 * {
 *   username: "john",
 *   email: "john@example",
 *   age: 23,
 *   newsletter: false
 * }
 */
export async function parseQueryAsync<TValue extends URLSearchParams | string | Request, TSchema extends ZodTypeAny>(
  value: TValue,
  schema: TSchema,
) {
  let searchParams: URLSearchParams;

  if (typeof value === "string") {
    searchParams = new URL(value).searchParams;
  } else if (value instanceof Request) {
    searchParams = new URL(value.url).searchParams;
  } else {
    searchParams = value;
  }

  return z.instanceof(URLSearchParams).transform(toRecord).pipe(schema).parse(searchParams);
}

/**
 * Parses form data from a FormData or Request using a Zod schema.
 *
 * @param {FormData | Request} value - The form data to parse.
 * @param {TSchema} schema - The Zod schema to use for parsing.
 *
 * @example
 * import { z } from "zod";
 * import { parseFormDataAsync } from "zod-web-api";
 *
 * // create schema
 * const schema = z.object({
 *   username: z.string(),
 *   email: z.string().email(),
 *   age: z.number().int().min(18),
 *   hobbies: z.array(z.string()).min(1)
 *   newsletter: z.boolean()
 * });
 *
 * // create FormData
 * const formData = new FormData();
 * formData.append("username", "john");
 * formData.append("email", "john@example.com");
 * formData.append("age", "23");
 * formData.append("hobbies", "programming");
 * formData.append("hobbies", "basketball");
 * formData.append("newsletter", "false");
 *
 * // parse
 * let submission = await parseFormDataAsync(formData, schema);
 *
 * // also accepts a Request object
 * const request = new Request(url, { method: "POST", body: formData });
 * submission = await parseFormDataAsync(request, schema)
 *
 * // the two parseFormDataAsync calls above would return this fully typed object
 * {
 *   username: "john",
 *   email: "john@example",
 *   age: 23,
 *   hobbies: ["programming", "basketball"]
 *   newsletter: false
 * }
 *
 */
export async function parseFormDataAsync<TValue extends FormData | Request, TSchema extends ZodTypeAny>(
  value: TValue,
  schema: TSchema,
) {
  let formData: FormData;

  if (value instanceof Request) {
    formData = await value.formData();
  } else {
    formData = value;
  }

  return z.instanceof(FormData).transform(toRecord).pipe(schema).parse(formData);
}

/**
 * Parses a request's query and form data using a Zod schema.
 * The query and form data are merged together before parsing.
 *
 * @param {Request} request - The request to parse.
 * @param {TSchema} schema - The Zod schema to use for parsing.
 *
 * @example
 * import { z } from "zod";
 * import { parseRequestAsync } from "zod-web-api";
 *
 * // create schema
 * const schema = z.object({
 *   username: z.string(),
 *   email: z.string().email(),
 *   q: z.string(),
 * });
 *
 * // create URLSearchParams
 * const searchParams = new URLSearchParams();
 * searchParams.append("q", "photos");
 *
 * // create FormData
 * const formData = new FormData();
 * formData.append("username", "john");
 * formData.append("email", "john@example.com");
 *
 * // create Request
 * const request = new Request(`https://example.com?${searchParams}`, { method: "POST", body: formData });
 * const submission = await parseRequestAsync(request, schema);
 *
 * // the parseRequestAsync call above would return this fully typed object
 * {
 *   username: "john",
 *   email: "john@example",
 *   q: "photos"
 * }
 *
 */
export async function parseRequestAsync<TSchema extends ZodTypeAny>(request: Request, schema: TSchema) {
  if (!containsFormData(request)) {
    return parseQueryAsync(request, schema);
  }

  const formData = await request.formData();
  for (const [key, value] of new URL(request.url).searchParams.entries()) {
    formData.append(key, value);
  }

  return parseFormDataAsync(formData, schema);
}

function containsFormData(request: Request) {
  const contentType = request.headers.get("Content-Type");
  return contentType && contentType.includes("multipart/form-data");
}

function toRecord(payload: FormData | URLSearchParams, record: Record<string, any> = {}) {
  for (const [key, value] of payload.entries()) {
    let next: FormDataEntryValue | undefined = value;
    if (typeof next === "string" ? next === "" : next.name === "" && next.size === 0) {
      // Set the value to undefined instead of skipping it
      // to maintain the data structure
      next = undefined;
    }

    if (typeof next === "string") {
      next = safeParseJSON(next);
    }

    setValue(record, key, (prev) => {
      if (!prev) {
        return next;
      } else if (!next) {
        return prev;
      } else if (Array.isArray(prev)) {
        return prev.concat(next);
      } else {
        return [prev, next];
      }
    });
  }

  return record;
}

function safeParseJSON(string: string): any {
  try {
    return JSON.parse(string);
  } catch {
    return string;
  }
}

/**
 * Sets a value on a target object based on a string key.
 *
 * @param target - The object on which to set the value.
 * @param name - The string key to set the value on.
 * @param valueFn - The function to generate the value.
 *
 * @example
 * // Given an object like { a: { b: [1, 2] } }
 * // Sets the value at the path 'a.b[2]' to 3
 * setValue(obj, 'a.b[2]', () => 3);
 */
function setValue(target: any, name: string, valueFn: (prev?: unknown) => any): void {
  const paths = getPaths(name);
  const length = paths.length;
  const lastIndex = length - 1;
  let index = -1;
  let pointer = target;

  while (pointer != null && ++index < length) {
    const key = paths[index];
    const next = paths[index + 1];
    const newValue = index != lastIndex ? pointer[key] ?? (typeof next === "number" ? [] : {}) : valueFn(pointer[key]);

    pointer[key] = newValue;
    pointer = pointer[key];
  }
}

/**
 * Parses a string path into an array of keys.
 *
 * @param name - The string path to parse.
 * @returns An array of keys.
 *
 * @example
 * // Returns ["a", "b", 2]
 * getPaths("a.b[2]");
 */
function getPaths(name: string): Array<string | number> {
  const pattern = /(\w*)\[(\d+)\]/;

  if (!name) {
    return [];
  }

  return name.split(".").flatMap((key) => {
    const matches = pattern.exec(key);

    if (!matches) {
      return key;
    }

    if (matches[1] === "") {
      return Number(matches[2]);
    }

    return [matches[1], Number(matches[2])];
  });
}

export const zt = {
  /**
   * Returns the first item with a property matching the passed value.
   *
   * @param {keyof TArrayItem} key - The key to match in the array items.
   * @param {ReadonlyArray<TArrayItem>} arr - The array to search through.
   *
   * @example
   * ```
   * const users = [{id: 1, name: 'Christine'}, {id: 2, name: 'Danielle'}, {id: 2, name: 'Tom'}];
   * const schema = z.string().transform(zt.findBy('name', users));
   * schema.parse('Tom'); // {id: 2, name: 'Tom'}
   *
   * ```
   */
  findBy<TValue extends string | null | undefined, TArrayItem>(key: keyof TArrayItem, arr: ReadonlyArray<TArrayItem>) {
    return (value: TValue, ctx: RefinementCtx) => {
      const match = arr.find((x) => x[key] === value);

      if (!match) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must match a value from the provided array.",
        });
        return z.NEVER;
      }

      return match;
    };
  },

  /**
   * Validates JSON encoded as a string, then returns the parsed value
   *
   * @param {TSchema} schema - The schema to use when parsing.
   *
   * @example
   * ```
   * const schema = z.string().transform(zt.json(z.object({ name: z.string() })));
   * schema('{"name": "John"}', ctx); // {name: 'John'}
   *
   * ```
   */
  json<TValue extends string | null | undefined, TSchema extends z.ZodTypeAny>(
    schema: TSchema,
  ): (value: TValue, ctx: RefinementCtx) => TValue extends string ? z.output<TSchema> : TValue {
    return (value: TValue, ctx: RefinementCtx) => {
      if (value == null) {
        return value;
      }

      try {
        const parsed = JSON.parse(value);
        return schema.parse(parsed);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a valid JSON string.",
        });
        return z.NEVER;
      }
    };
  },
};
