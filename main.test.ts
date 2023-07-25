import { expect, it, describe } from "vitest";
import { z } from "zod";
import { parseFormDataAsync, parseQueryAsync, parseRequestAsync, zt } from "./main";

describe("parseQueryAsync function", () => {
  it("should handle primitive types string, number, boolean", async () => {
    // expected object
    const expected = {
      username: "john",
      email: "john@example.com",
      age: 23,
      newsletter: false,
    };

    // create schema
    const schema = z.object({
      username: z.string(),
      email: z.string().email(),
      age: z.number().int().min(18),
      newsletter: z.boolean(),
    });

    // create URLSearchParams
    const searchParams = new URLSearchParams();
    searchParams.append("username", "john");
    searchParams.append("email", "john@example.com");
    searchParams.append("age", "23");
    searchParams.append("newsletter", "false");

    // parse
    let submission = await parseQueryAsync(searchParams, schema);
    expect(submission).toStrictEqual(expected);

    // also accepts a string of the full URL
    const url = `https://example.com?${searchParams}`;
    submission = await parseQueryAsync(url, schema);
    expect(submission).toStrictEqual(expected);

    // also accepts a Request object
    const request = new Request(url);
    submission = await parseQueryAsync(request, schema);
    expect(submission).toStrictEqual(expected);
  });
});

describe("parseFormDataAsync function", () => {
  it("should handle arrays", async () => {
    // expected object
    const expected = {
      username: "john",
      email: "john@example.com",
      age: 23,
      hobbies: ["programming", "basketball"],
      newsletter: false,
    };

    // create schema
    const schema = z.object({
      username: z.string(),
      email: z.string().email(),
      age: z.number().int().min(18),
      hobbies: z.array(z.string()).min(1),
      newsletter: z.boolean(),
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
    expect(submission).toStrictEqual(expected);

    // also accepts a Request object
    const url = `https://example.com`;
    const request = new Request(url, { method: "POST", body: formData });
    submission = await parseFormDataAsync(request, schema);
    expect(submission).toStrictEqual(expected);
  });
});

describe("parseRequestAsync function", () => {
  it("should handle merging of query and form data", async () => {
    // expected object
    const expected = {
      username: "john",
      email: "john@example.com",
      q: "photos",
    };

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

    expect(submission).toStrictEqual(expected);
  });
});

describe("Nested Object and Array", () => {
  it("should handle nested object and array property names", async () => {
    // expected object
    const expected = {
      username: "john",
      tasks: [
        {
          label: "Grocery Shopping",
          description: "Buy fruits/vegetables from grocery store.",
        },
        {
          label: "Email Management",
          description: "Organize and reply to urgent emails.",
        },
      ],
    };

    // create tasks schema
    const taskSchema = z.object({
      label: z.string(),
      description: z.string(),
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
    formData.append("tasks[0].description", "Buy fruits/vegetables from grocery store.");
    formData.append("tasks[1].label", "Email Management");
    formData.append("tasks[1].description", "Organize and reply to urgent emails.");

    // parse
    const submission = await parseFormDataAsync(formData, schema);
    expect(submission).toStrictEqual(expected);
  });
});

describe("findBy transformer function", () => {
  it("should returns the first item with a property matching the passed value", () => {
    const expected = { id: 3, name: "Tom" };
    const users = [
      { id: 1, name: "Christine" },
      { id: 2, name: "Danielle" },
      { id: 3, name: "Tom" },
    ];

    const schema = z.string().transform(zt.findBy("name", users));
    expect(schema.parse("Tom")).toStrictEqual(expected);
  });
});

describe("json transformer function", () => {
  it("should returns the first item with a property matching the passed value", () => {
    const expected = { name: "John" };
    const schema = z.string().transform(zt.json(z.object({ name: z.string() })));
    expect(schema.parse('{"name": "John"}')).toStrictEqual(expected);
  });
});
