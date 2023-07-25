<p align="center">
  <img src="zod-logo.svg" width="200px" align="center" alt="Zod logo" />
  <h1 align="center">Zod ❤️ Web API</h1>
  <p align="center">
    Zod Web API simplifies the process of integrating <a href="https://github.com/colinhacks/zod">Zod</a> with <a href="https://developer.mozilla.org/en-US/docs/Web/API">Web APIs</a> including <code>Request</code>, <code>URLSearchParams</code>, <code>FormData</code>.
  </p>
</p>
<br/>
<p align="center">
<a href="https://github.com/ottersoft-x/zod-web-api/actions?query=branch%3Amain"><img src="https://github.com/ottersoft-x/zod-web-api/actions/workflows/main.yml/badge.svg?event=push&branch=main" alt="Zod Web API CI status" /></a>
<a href="https://www.npmjs.com/package/zod-web-api" rel="nofollow"><img src="https://img.shields.io/npm/v/zod-web-api.svg?color=0c0" alt="Zod Web API NPM version"></a>
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/ottersoft-x/zod-web-api" alt="License"></a>
</p>

## Basic usage

#### parseQueryAsync

Parses a query from a `string` URL, `URLSearchParams`, or `Request` object using a Zod schema.

```ts
import { z } from "zod";
import { parseQueryAsync } from "zod-web-api";

// create schema
const schema = z.object({
  username: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18),
  newsletter: z.boolean()
});

// create URLSearchParams
const searchParams = new URLSearchParams();
searchParams.append("username", "john");
searchParams.append("email", "john@example.com");
searchParams.append("age", "23");
searchParams.append("newsletter", "false");

// parse
let submission = await parseQueryAsync(searchParams, schema);

// also accepts a string of the full URL
const url = `https://example.com?${searchParams}`;
submission = await parseQueryAsync(url, schema);

// also accepts a Request object
const request = new Request(url);
submission = await parseQueryAsync(request, schema);

// the three parseQueryAsync calls above would return this fully typed object
{
  username: "john",
  email: "john@example",
  age: 23,
  newsletter: false
}

```

#### parseFormDataAsync

Parses form data from a `FormData` or `Request` object using a Zod schema.

```ts
import { z } from "zod";
import { parseFormDataAsync } from "zod-web-api";

// create schema
const schema = z.object({
  username: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18),
  hobbies: z.array(z.string()).min(1),
  newsletter: z.boolean()
});

// create FormData
const formData = new FormData();
formData.append("username", "john");
formData.append("email", "john@example.com");
formData.append("age", "23");
formData.append("hobbies", "programming");
formData.append("hobbies", "basketball");
formData.append("newsletter", "false");

// parse
let submission = await parseFormDataAsync(formData, schema);

// also accepts a Request object
const url = `https://example.com`;
const request = new Request(url, { method: "POST", body: formData });
submission = await parseFormDataAsync(request, schema);

// the two parseFormDataAsync calls above would return this fully typed object
{
  username: "john",
  email: "john@example.com",
  age: 23,
  hobbies: ["programming", "basketball"],
  newsletter: false
}

```

#### parseRequestAsync

Parses a `Request`'s query and form data using a Zod schema. The query and form data are merged together before parsing.

```ts
import { z } from "zod";
import { parseRequestAsync } from "zod-web-api";

// create schema
const schema = z.object({
  username: z.string(),
  email: z.string().email(),
  q: z.string(),
});

// create URLSearchParams
const searchParams = new URLSearchParams();
searchParams.append("q", "photos");

// create FormData
const formData = new FormData();
formData.append("username", "john");
formData.append("email", "john@example.com");

// create Request
const request = new Request(`https://example.com?${searchParams}`, { method: "POST", body: formData });
const submission = await parseRequestAsync(request, schema);

// the parseRequestAsync call above would return this fully typed object
{
  username: "john",
  email: "john@example.com",
  q: "photos"
}

```

## Nested Object and Array

`Zod Web API` support both nested object and array by leveraging a naming convention of the property name. Use the `object.property` and `array[index]` syntax to denote data structure. These notations could be combined for nested lists as well. e.g. `tasks[0].label`.

```ts
import { z } from "zod";
import { parseFormDataAsync } from "zod-web-api";
// create tasks schema
const taskSchema = z.object({
  label: z.string(),
  description: z.string()
});

// create schema
const schema = z.object({
  username: z.string(),
  tasks: taskSchema.array().min(2),
});

// create FormData
const formData = new FormData();
formData.append("username", "john");
formData.append("tasks[0].label", "Grocery Shopping");
formData.append("tasks[0].description", "Buy fruits/vegetables from grocery store.")
formData.append("tasks[1].label", "Email Management");
formData.append("tasks[1].description", "Organize and reply to urgent emails.")

// parse
let submission = await parseFormDataAsync(formData, schema);

// the parseFormDataAsync call above would return this fully typed object
{
  username: "john",
  tasks: [
    {
      label: "Grocery Shopping",
      description: "Buy fruits/vegetables from grocery store."
    },
    {
      label: "Email Management",
      description: "Organize and reply to urgent emails."
    }
  ]
}
```

## Utilities

`Zod Web API` also comes with a couple utilities that help with common tasks

#### Transformer: findBy

Returns the first item with a property matching the passed value.

```ts
import { zt } from "zod-web-api";

const users = [
  { id: 1, name: "Christine" },
  { id: 2, name: "Danielle" },
  { id: 2, name: "Tom" },
];

const schema = z.string().transform(zt.findBy("name", users));
schema.parse("Tom"); // { id: 2, name: 'Tom' }
```

#### Transformer: json

Validates JSON encoded as a string, then returns the parsed value

```ts
import { zt } from "zod-web-api";

const schema = z.string().transform(zt.json(z.object({ name: z.string() })));
schema.parse('{"name": "John"}'); // { name: 'John' }
```

## Credits

`Zod Web API` was heavily influenced by the following projects:

- [Zod Utilz](https://github.com/JacobWeisenburger/zod_utilz) by [JacobWeisenburger](https://github.com/JacobWeisenburger)
- [Conform](https://github.com/edmundhung/conform) by [edmundhung](https://github.com/edmundhung)
- [Zodix](https://github.com/rileytomasek/zodix) by [rileytomasek](https://github.com/rileytomasek)
