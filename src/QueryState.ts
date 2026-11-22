export interface QuerySort {
    attribute: string;
    descending: boolean;
}

export type QueryDefinition =
    | {
          mode: "simple";
          text: string;
          tags: string[];
          sort: QuerySort | null;
      }
    | {
          mode: "advanced";
          query: string;
      };

export type QueryMode = QueryDefinition["mode"];
export type AccessFilter = "all" | "shared" | "own";

export type StoredQueryScope = "post" | "collection" | "collection_item" | "user_group";

export interface StoredConstriction {
    pk: number;
    fk_user: number | null;
    scope: StoredQueryScope;
    name: string;
    condition: string;
    creation_timestamp: string;
}

export type SelectedConstriction =
    | { type: "none" }
    | { type: "stored"; constriction: StoredConstriction }
    | { type: "temporary"; name: string; condition: string };

const QUERY_PARAMETER_NAMES = ["query", "mode", "tag", "text", "sort", "descending"];

// ---------------------------------------------------------------------
// Query definition URL serialization
// ---------------------------------------------------------------------

export function parseQueryDefinition(
    search: string | URLSearchParams,
    preferredMode: QueryMode = "simple"
): QueryDefinition {
    const params = new URLSearchParams(search);
    const mode = params.get("mode");

    // Preserve compatibility with existing advanced query URLs.
    if (mode === "advanced" || (mode !== "simple" && params.has("query"))) {
        return {
            mode: "advanced",
            query: params.get("query") ?? "",
        };
    }

    const isSimple =
        mode === "simple" ||
        params.has("tag") ||
        params.has("text") ||
        params.has("sort") ||
        preferredMode === "simple";

    if (!isSimple) {
        return {
            mode: "advanced",
            query: "",
        };
    }

    const sortAttribute = params.get("sort");

    return {
        mode: "simple",
        text: params.get("text") ?? "",
        tags: params.getAll("tag"),
        sort: sortAttribute
            ? {
                  attribute: sortAttribute,
                  descending: params.get("descending") === "true",
              }
            : null,
    };
}

export function serializeQueryDefinition(
    definition: QueryDefinition,
    existingParams: URLSearchParams = new URLSearchParams()
): URLSearchParams {
    const params = new URLSearchParams(existingParams);

    QUERY_PARAMETER_NAMES.forEach((name) => params.delete(name));
    params.delete("page");

    // Deliberately preserve constriction, constriction_name and
    // access_filter when changing the query definition.

    if (definition.mode === "advanced") {
        params.set("query", definition.query);
        return params;
    }

    params.set("mode", "simple");

    definition.tags.forEach((tag) => {
        params.append("tag", tag);
    });

    if (definition.text) {
        params.set("text", definition.text);
    }

    if (definition.sort) {
        params.set("sort", definition.sort.attribute);
        params.set("descending", String(definition.sort.descending));
    }

    return params;
}

function quoteFql(value: string, delimiter: '"' | "`"): string {
    return delimiter + value.replaceAll("\\", "\\\\").replaceAll(delimiter, "\\" + delimiter) + delimiter;
}

export function compileQueryDefinition(definition: QueryDefinition): string {
    if (definition.mode === "advanced") {
        return definition.query;
    }

    if (definition.tags.length > 10) {
        throw new Error("Cannot select more than 10 tags");
    }

    const statements: string[] = definition.tags.map((tag) => quoteFql(tag, "`"));

    const text = definition.text.trim();

    if (text) {
        if (/[\r\n]/.test(text)) {
            throw new Error("Full-text search must be a single line");
        }

        statements.push(`~${quoteFql(text, '"')}`);
    }

    if (definition.sort) {
        const { attribute, descending } = definition.sort;

        if (!/^[a-z][a-z0-9_]*$/i.test(attribute)) {
            throw new Error("Invalid sort attribute");
        }

        statements.push(`%sort(@${attribute}, "${descending ? "DESC" : "ASC"}")`);
    }

    const query = statements.join(" ");

    if (Array.from(query).length > 1024) {
        throw new Error("Generated query exceeds 1024 characters");
    }

    return query;
}

/**
 * Resolve the selected constriction against the stored constrictions available to the current user for the current scope.
 *
 * When a name is provided, both name and condition must match. A matching condition with a different name is NOT sufficient.
 */
export function resolveSelectedConstriction(
    params: URLSearchParams,
    availableConstrictions: StoredConstriction[]
): SelectedConstriction {
    const condition = params.get("constriction");

    if (!condition) {
        return { type: "none" };
    }

    const name = params.get("constriction_name");

    const matches = availableConstrictions.filter(
        (constriction) => constriction.condition === condition && (name === null || constriction.name === name)
    );

    // Only resolve a stored entity when its identity is unambiguous.
    if (matches.length === 1) {
        return {
            type: "stored",
            constriction: matches[0],
        };
    }

    return {
        type: "temporary",
        name: name || "Custom",
        condition,
    };
}

/**
 * Set or clear the active constriction without changing the query, access filter or other independent search parameters.
 *
 * Both stored and temporary constrictions use the same URL format.
 */
export function setSelectedConstriction(
    existingParams: URLSearchParams,
    constriction: { name: string; condition: string } | null
): URLSearchParams {
    const params = new URLSearchParams(existingParams);

    if (constriction) {
        params.set("constriction", constriction.condition);
        params.set("constriction_name", constriction.name);
    } else {
        params.delete("constriction");
        params.delete("constriction_name");
    }

    params.delete("page");

    return params;
}

/**
 * Convert browser search parameters to parameters accepted by the Filebroker search API.
 *
 * constriction already contains FQL. constriction_name is only frontend metadata and must not be sent to the backend.
 */
export function toBackendQueryParams(browserParams: URLSearchParams): URLSearchParams {
    const definition = parseQueryDefinition(browserParams);
    const params = new URLSearchParams(browserParams);

    QUERY_PARAMETER_NAMES.forEach((name) => params.delete(name));

    // Frontend-only label used to identify the selected chip.
    params.delete("constriction_name");

    params.set("query", compileQueryDefinition(definition));

    // Existing backend parameters such as constriction, access_filter, page and limit remain untouched.
    return params;
}

export interface PostQuerySelection {
    query: string;
    constriction?: string;
    access_filter?: AccessFilter;
}

export function getPostQuerySelection(browserParams: URLSearchParams): PostQuerySelection | null {
    const definition = parseQueryDefinition(browserParams);

    const hasSearch =
        definition.mode === "simple"
            ? definition.tags.length > 0 || definition.text.trim().length > 0
            : definition.query.trim().length > 0;

    if (!hasSearch) {
        return null;
    }

    const params = toBackendQueryParams(browserParams);

    const accessParam = params.get("access_filter");
    const access_filter: AccessFilter | undefined =
        accessParam === "shared" || accessParam === "own" ? accessParam : undefined;

    return {
        query: params.get("query") ?? "",
        constriction: params.get("constriction") || undefined,
        access_filter,
    };
}
