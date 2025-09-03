// \backend\database\dbBackups> node ..\utils\exportSchema.js .\backup_Haryana\
// \backend\database\dbBackups> node ..\utils\exportSchema.js .\backup_682c40492e34934aabdd1849\

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Path to models folder
const modelsPath = path.join(__dirname, "../../models");

// Dynamically load all models
const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith(".js"));

function getFieldType(schemaType) {
  if (Array.isArray(schemaType.options.type)) return "array";
  if (schemaType.instance) {
    switch (schemaType.instance) {
      case "ObjectID": return "objectid";
      case "Mixed": return "mixed";
      case "Decimal128": return "decimal";
      case "Buffer": return "buffer";
      case "Map": return "map";
      default: return schemaType.instance.toLowerCase();
    }
  }
  return typeof schemaType.options.type;
}

function exportSchemas(backupDir) {
  const summary = {};

  modelFiles.forEach(file => {
    const modelExport = require(path.join(modelsPath, file));
    // handle both "exports = model" and "exports = { Model }"
    const model =
      modelExport.prototype instanceof mongoose.Model
        ? modelExport
        : Object.values(modelExport).find(
            v => v && v.prototype instanceof mongoose.Model
          );

    if (!model) {
      console.warn(`Skipping ${file}, no mongoose model exported`);
      return;
    }
    const schema = model.schema;

    const schemaSummary = {};
    schema.eachPath((pathname, schemaType) => {
      // skip internal mongoose fields like __v
      if (pathname === "__v") return;

      schemaSummary[pathname] = {
        types: [getFieldType(schemaType)],
        // Handle required:
        // - true/false → keep as is
        // - function or array (conditional required) → treat as false
        required: (typeof schemaType.options.required === "boolean")
                    ? schemaType.options.required
                    : false
      };
    });

    summary[`${model.collection.collectionName}.json`] = schemaSummary;
  });
  fs.writeFileSync(path.join(backupDir, 'schema_summary.json'), JSON.stringify(summary, null, 2));
  console.log('Schema summary saved to', path.join(backupDir, 'schema_summary.json'));
}

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('Usage: node utils/exportSchema.js <BackupDir>');
  process.exit(1);
}
exportSchemas(backupDir);