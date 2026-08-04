import sanitizeHtml from "sanitize-html";

const safeColorPatterns = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
  /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i,
];

const safeFontSizePatterns = [
  /^\d+(\.\d+)?(px|rem|em|%)$/i,
];

export const sanitizeRichHtml = (
  value: unknown,
  fallback = ""
): string => {
  const input =
    typeof value === "string"
      ? value
      : fallback;

  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "mark",
      "span",
      "div",

      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",

      "ul",
      "ol",
      "li",

      "blockquote",
      "pre",
      "code",

      "a",
      "img",

      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",

      "figure",
      "figcaption",

      "hr",
      "sup",
      "sub",
    ],

    allowedAttributes: {
      "*": [
        "class",
        "style",
      ],

      a: [
        "href",
        "title",
        "target",
        "rel",
      ],

      img: [
        "src",
        "alt",
        "title",
        "width",
        "height",
        "loading",
      ],

      table: [
        "class",
        "style",
      ],

      th: [
        "colspan",
        "rowspan",
        "scope",
        "class",
        "style",
      ],

      td: [
        "colspan",
        "rowspan",
        "class",
        "style",
      ],

      ol: [
        "start",
        "type",
        "class",
        "style",
      ],

      li: [
        "value",
        "class",
        "style",
      ],
    },

    allowedSchemes: [
      "http",
      "https",
      "mailto",
      "tel",
    ],

    allowedSchemesByTag: {
      img: [
        "http",
        "https",
      ],
    },

    allowProtocolRelative: false,

    allowedStyles: {
      "*": {
        "text-align": [
          /^(left|right|center|justify)$/i,
        ],

        color: safeColorPatterns,

        "background-color":
          safeColorPatterns,

        "font-size":
          safeFontSizePatterns,

        "font-weight": [
          /^(normal|bold|bolder|lighter|[1-9]00)$/i,
        ],

        "font-style": [
          /^(normal|italic|oblique)$/i,
        ],

        "text-decoration": [
          /^(none|underline|line-through)$/i,
        ],

        "list-style-type": [
          /^(disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman|none)$/i,
        ],
      },
    },

    transformTags: {
      a: (
        tagName,
        attributes
      ) => {
        const transformedAttributes = {
          ...attributes,
        };

        if (
          transformedAttributes.target ===
          "_blank"
        ) {
          transformedAttributes.rel =
            "noopener noreferrer";
        } else {
          delete transformedAttributes.target;
        }

        return {
          tagName,
          attribs:
            transformedAttributes,
        };
      },

      img: (
        tagName,
        attributes
      ) => ({
        tagName,
        attribs: {
          ...attributes,
          loading: "lazy",
        },
      }),
    },

    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
  });
};