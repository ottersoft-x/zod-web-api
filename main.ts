import { z, type ZodTypeAny } from "zod";

/**
 * Parses a query from a URL, URLSearchParams, or Request using a Zod schema.
 *
 * @param {URLSearchParams | string | Request} value - The query to parse.
 * @param {T} schema - The Zod schema to use for parsing.
 *
 * @example
 * // create schema
 * const schema = z.object({
 *   q: z.string(),
 * });
 *
 * // parse
 * const url = "https://example.com?searchQuery=photos";
 * const submission = await parseQueryAsync(url, schema);
 *
 * // submission will be this fully typed object
 * {
 *  q: "photos"
 * }
 *
 */
export async function parseQueryAsync<T extends ZodTypeAny>(value: URLSearchParams | string | Request, schema: T) {
  if (typeof value === "string") {
    value = new URL(value).searchParams;
  } else if (value instanceof Request) {
    value = new URL(value.url).searchParams;
  }

  return z.instanceof(URLSearchParams).transform(toRecord).pipe(schema).parse(value);
}

/**
 * Parses form data from a FormData or Request using a Zod schema.
 *
 * @param {FormData | Request} value - The form data to parse.
 * @param {T} schema - The Zod schema to use for parsing.
 *
 * @example
 * // create schema
 * const schema = z.object({
 *   username: z.string(),
 *   email: z.string()
 * });
 *
 * // create FormData
 * const formData = new FormData();
 * formData.append("username", "john");
 * formData.append("email", "john@example.com");
 *
 * // parse
 * const submission = await parseFormDataAsync(formData, schema);
 *
 * // submission will be this fully typed object
 * {
 *   username: "john",
 *   email: "john@example"
 * }
 *
 */
export async function parseFormDataAsync<T extends ZodTypeAny>(value: FormData | Request, schema: T) {
  value = value instanceof Request ? await value.formData() : value;

  return z.instanceof(FormData).transform(toRecord).pipe(schema).parse(value);
}

/**
 * Parses a request's query and form data using a Zod schema.
 * The query and form data are merged together before parsing.
 *
 * @param {Request} request - The request to parse.
 * @param {T} schema - The Zod schema to use for parsing.
 *
 * @example
 * // create schema
 * const schema = z.object({
 *   searchQuery: z.string(),
 *   username: z.string(),
 *   email: z.string()
 * });
 *
 * // create FormData
 * const formData = new FormData();
 * formData.append("username", "john");
 * formData.append("email", "john@example.com");
 *
 * // create Request
 * const request = new Request("https://example.com?searchQuery=photos", { method: "POST", body: formData });
 *
 * // parse
 * const submission = await parseRequestAsync(request, schema);
 *
 * // submission will be this fully typed object
 * {
 *   searchQuery: "photos",
 *   username: "john",
 *   email: "john@example"
 * }
 *
 */
export async function parseRequestAsync<T extends ZodTypeAny>(request: Request, schema: T) {
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

/**
 * Returns a formatted name from the paths based on the JS syntax convention
 * @example
 * // returns "foo[0].content"
 * formatPaths(['foo', 0, 'content']);
 */
export function formatPaths(paths: Array<string | number>): string {
  return paths.reduce<string>((name, path) => {
    if (typeof path === "number") {
      return `${name}[${path}]`;
    }

    if (name === "" || path === "") {
      return [name, path].join("");
    }

    return [name, path].join(".");
  }, "");
}
