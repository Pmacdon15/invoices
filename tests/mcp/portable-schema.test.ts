import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as catalog from "@/mcp/catalog-tools";
import * as invoices from "@/mcp/invoice-tools";
import * as org from "@/mcp/org-tools";
import { portable, toPortableJsonSchema } from "@/mcp/portable-schema";

/*
 * Every tool's advertised input schema has to be in the JSON Schema subset
 * Gemini accepts; one bad keyword in one tool breaks the whole connector.
 */

const FORBIDDEN_KEYWORDS = [
  "$schema",
  "$id",
  "$comment",
  "additionalProperties",
  "unevaluatedProperties",
  "propertyNames",
  "dependentRequired",
  "dependentSchemas",
  "examples",
  "readOnly",
  "writeOnly",
  "deprecated",
  "contentEncoding",
  "contentMediaType",
  "const",
  "exclusiveMinimum",
  "exclusiveMaximum",
];

function collectKeys(obj: unknown, found = new Set<string>()): Set<string> {
  if (!obj || typeof obj !== "object") return found;
  if (Array.isArray(obj)) {
    for (const item of obj) collectKeys(item, found);
    return found;
  }
  for (const [k, v] of Object.entries(obj)) {
    found.add(k);
    collectKeys(v, found);
  }
  return found;
}

const schemas = Object.entries({ ...catalog, ...invoices, ...org }).filter(
  ([name, value]) => name.endsWith("InputSchema") && value instanceof z.ZodType,
) as [string, z.ZodType][];

describe("portable JSON schema", () => {
  it("finds every tool's input schema", () => {
    expect(schemas.length).toBeGreaterThanOrEqual(20);
  });

  for (const [name, schema] of schemas) {
    it(`advertises a Gemini/Claude/Muse/ChatGPT-compatible schema for ${name}`, () => {
      const json = portable(
        schema as unknown as Parameters<typeof portable>[0],
      )["~standard"].jsonSchema.input({
        target: "draft-2020-12",
      });
      const keys = collectKeys(json);
      for (const bad of FORBIDDEN_KEYWORDS) {
        expect(keys.has(bad), `${name} has forbidden keyword ${bad}`).toBe(
          false,
        );
      }
      expect((json as { type?: string }).type).toBe("object");
      expect((json as { properties?: unknown }).properties).toBeDefined();
    });
  }

  it("keeps validating with the original schema", () => {
    const schema = portable(z.object({ n: z.number().positive() }));
    const result = schema["~standard"].validate({ n: -1 }) as {
      issues?: unknown[];
    };
    expect(result.issues?.length).toBe(1);
    const out = schema["~standard"].jsonSchema.output({
      target: "draft-2020-12",
    }) as { properties: { n: Record<string, unknown> } };
    expect(out.properties.n).toEqual({ type: "number", minimum: 0 });
  });

  it("rewrites nullable unions to nullable: true", () => {
    expect(
      toPortableJsonSchema({ anyOf: [{ type: "string" }, { type: "null" }] }),
    ).toEqual({ type: "string", nullable: true });
    expect(
      toPortableJsonSchema({
        oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
      }),
    ).toEqual({
      anyOf: [{ type: "string" }, { type: "number" }],
      nullable: true,
    });
    expect(
      toPortableJsonSchema({
        description: "kept",
        anyOf: [{ type: "string", description: "dropped" }, { type: "null" }],
      }),
    ).toEqual({ description: "kept", type: "string", nullable: true });
    expect(toPortableJsonSchema({ anyOf: [{ type: "null" }] })).toEqual({
      nullable: true,
    });
    expect(
      toPortableJsonSchema({ anyOf: [{ type: "string" }, { type: "number" }] }),
    ).toEqual({ anyOf: [{ type: "string" }, { type: "number" }] });
  });

  it("turns type arrays with null into nullable types", () => {
    expect(toPortableJsonSchema({ type: ["string", "null"] })).toEqual({
      type: "string",
      nullable: true,
    });
    expect(toPortableJsonSchema({ type: ["string", "number"] })).toEqual({
      type: ["string", "number"],
    });
    expect(toPortableJsonSchema({ type: ["null"] })).toEqual({
      nullable: true,
    });
  });

  it("turns const into a typed enum", () => {
    expect(toPortableJsonSchema({ const: "a" })).toEqual({
      enum: ["a"],
      type: "string",
    });
    expect(toPortableJsonSchema({ const: 2 })).toEqual({
      enum: [2],
      type: "integer",
    });
    expect(toPortableJsonSchema({ const: 2.5 })).toEqual({
      enum: [2.5],
      type: "number",
    });
    expect(toPortableJsonSchema({ const: true })).toEqual({
      enum: [true],
      type: "boolean",
    });
    expect(toPortableJsonSchema({ type: "string", const: "a" })).toEqual({
      type: "string",
      enum: ["a"],
    });
    expect(toPortableJsonSchema({ const: null })).toEqual({ enum: [null] });
  });

  it("types an untyped enum when its values share one type", () => {
    expect(toPortableJsonSchema({ enum: ["a", "b"] })).toEqual({
      enum: ["a", "b"],
      type: "string",
    });
    expect(toPortableJsonSchema({ enum: ["a", 1] })).toEqual({
      enum: ["a", 1],
    });
    expect(toPortableJsonSchema({ enum: [{}] })).toEqual({ enum: [{}] });
  });

  it("folds exclusive bounds into inclusive ones", () => {
    expect(toPortableJsonSchema({ exclusiveMinimum: 0 })).toEqual({
      minimum: 0,
    });
    expect(toPortableJsonSchema({ minimum: 5, exclusiveMinimum: 0 })).toEqual({
      minimum: 5,
    });
    expect(toPortableJsonSchema({ exclusiveMinimum: 7, minimum: 5 })).toEqual({
      minimum: 7,
    });
    expect(toPortableJsonSchema({ exclusiveMaximum: 10 })).toEqual({
      maximum: 10,
    });
    expect(toPortableJsonSchema({ maximum: 5, exclusiveMaximum: 10 })).toEqual({
      maximum: 5,
    });
    expect(toPortableJsonSchema({ exclusiveMaximum: 3, maximum: 5 })).toEqual({
      maximum: 3,
    });
    expect(
      toPortableJsonSchema({ exclusiveMinimum: "x", exclusiveMaximum: "y" }),
    ).toEqual({});
    expect(toPortableJsonSchema({ minimum: "x", maximum: "y" })).toEqual({
      minimum: "x",
      maximum: "y",
    });
  });

  it("keeps only portable string formats", () => {
    expect(toPortableJsonSchema({ type: "string", format: "email" })).toEqual({
      type: "string",
    });
    expect(
      toPortableJsonSchema({ type: "string", format: "date-time" }),
    ).toEqual({ type: "string", format: "date-time" });
    expect(toPortableJsonSchema({ format: 3 })).toEqual({});
  });

  it("rewrites nested properties and items, and gives empty objects properties", () => {
    expect(
      toPortableJsonSchema({
        type: "object",
        additionalProperties: false,
        properties: {
          list: { type: "array", items: { const: "x" } },
        },
      }),
    ).toEqual({
      type: "object",
      properties: {
        list: { type: "array", items: { enum: ["x"], type: "string" } },
      },
    });
    expect(toPortableJsonSchema({ type: "object" })).toEqual({
      type: "object",
      properties: {},
    });
    expect(toPortableJsonSchema({ properties: "bad", anyOf: "bad" })).toEqual(
      {},
    );
    expect(toPortableJsonSchema(null)).toEqual({});
    expect(toPortableJsonSchema([1])).toEqual({});
  });
});
