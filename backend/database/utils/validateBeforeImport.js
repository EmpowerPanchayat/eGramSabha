// \backend\database\dbBackups> node ..\utils\validatebeforeImport.js .\backup_Haryana\
// \backend\database\dbBackups> node ..\utils\validatebeforeImport.js .\backup_67f77646e3620fec252a618d\

const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// ------------------
// Load whitelist
// ------------------
function loadWhitelist() {
  const configPath = path.join(__dirname, "config.json");
  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return cfg.whitelist || [];
  }
  return ["_id", "__v", "createdAt", "updatedAt"]; // defaults
}

const WHITELISTED_FIELDS = loadWhitelist();
console.log(WHITELISTED_FIELDS);

// ------------------
// Type mapping
// ------------------
function mapTypes(types) {
  if (types.includes("date")) {
    // accept ISO string or null
    return { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] };
  }
  if (types.includes("objectid")) {
    // ObjectId can be a valid 24-char hex string or null
    return {
      anyOf: [
        { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
        { type: "null" }
      ]
    };
  }
  if (types.includes("mixed")) {
    return { type: ["object", "string", "number", "boolean", "array", "null"] };
  }
  if (types.includes("string")) return { type: ["string", "null"] };
  if (types.includes("number")) return { type: ["number", "null"] };
  if (types.includes("boolean")) return { type: ["boolean", "null"] };
  if (types.includes("array")) return { type: ["array", "null"] };

  return {}; // fallback
}

// ------------------
// Build nested properties
// ------------------
function buildProperties(summary) {
  const props = {};
  const required = new Set();

  for (const [field, def] of Object.entries(summary)) {
    const parts = field.split(".");
    let current = props;
    let reqTracker = required;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (i === parts.length - 1) {
        // Leaf → assign schema
        current[part] = mapTypes(def.types);
        if (def.required) {
          reqTracker.add(part);
        }
      } else {
        if (!current[part]) {
          current[part] = { type: "object", properties: {} };
        }
        if (!current[part].properties) {
          current[part].properties = {};
        }
        if (!current[part].requiredSet) {
          current[part].requiredSet = new Set();
        }

        // walk down one level
        current = current[part].properties;
        reqTracker = current[part]?.requiredSet || new Set();
      }
    }
  }

  // Recursively convert all .requiredSet to arrays
  function finalize(obj) {
    for (const [k, v] of Object.entries(obj)) {
      if (v.properties) {
        finalize(v.properties);
      }
      if (v.requiredSet) {
        v.required = Array.from(v.requiredSet);
        delete v.requiredSet;
      }
    }
  }
  finalize(props);

  return { props, required: Array.from(required) };
}

// ------------------
// Convert summary → AJV schema
// ------------------
function schemaSummaryToAjvSchema(summary, allowExtra = false) {
  const { props, required } = buildProperties(summary);

  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "array",
    items: {
      type: "object",
      properties: {
        ...props,
        // whitelist fields: free pass (any type)
        ...Object.fromEntries(WHITELISTED_FIELDS.map(f => [f, {}]))
      },
      required: required,
      additionalProperties: allowExtra ? true : false
    }
  };
}

// ------------------
// Validation
// ------------------
function validateFile(filePath, schemaSummary, allowExtra) {
  const schema = schemaSummaryToAjvSchema(schemaSummary, allowExtra);
  const validate = ajv.compile(schema);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const valid = validate(data);
  if (!valid) {
    console.error(`Validation errors in ${path.basename(filePath)}:`);
    console.error(validate.errors);
    return false;
  }

  console.log(`${path.basename(filePath)} is valid`);
  return true;
}

function runValidation(backupDir) {
  const schemaSummaryPath = path.join(backupDir, "schema_summary.json");
  if (!fs.existsSync(schemaSummaryPath)) {
    console.error("schema_summary.json not found in backup folder");
    process.exit(1);
  }

  const schemaSummary = JSON.parse(fs.readFileSync(schemaSummaryPath, "utf8"));
  const allowExtra = process.argv.includes("--loose");
  let allValid = true;

  for (const [fileName, summary] of Object.entries(schemaSummary)) {
    const filePath = path.join(backupDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping ${fileName}, file not found in backup`);
      continue;
    }

    const valid = validateFile(filePath, summary, allowExtra);
    if (!valid) allValid = false;
  }

  if (allValid) {
    console.log("All files validated successfully!");
  } else {
    console.error("Some files failed validation");
    process.exit(1);
  }
}

// ------------------
// CLI entrypoint
// ------------------
const backupDir = process.argv[2];
if (!backupDir) {
  console.error("Usage: node utils/validateBeforeImport.js <BackupDir> [--loose]");
  process.exit(1);
}

runValidation(backupDir);