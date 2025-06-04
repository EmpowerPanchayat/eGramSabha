// Swagger documentation generator: Scans Express route files and generates OpenAPI spec with tags.

const fs = require('fs');
const path = require('path');
const enhancedDoc = require('./config/swaggerEnhanced');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const outputFile = './swagger-output.json';
const ROUTES_DIR = path.join(__dirname, 'routes');
const SERVER_FILE = path.join(__dirname, 'server.js');

// --- Utility Functions ---
const pluralize = word => {
  if (word.toLowerCase().endsWith('s')) return word;
  if (word.toLowerCase().endsWith('y')) return word.slice(0, -1) + 'ies';
  return word + 's';
};

function normalizePath(route) {
  return route
    .replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

function extractPathParameters(routePath) {
  const matches = routePath.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map(param => ({
    name: param.replace(/[{}]/g, ''),
    in: 'path',
    required: true,
    schema: {
      type: 'string'
    },
    description: `Path parameter: ${param.replace(/[{}]/g, '')}`
  }));
}

// --- 1. Discover route base paths from server.js ---
const serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
const mountRegex = /app\.use\(['"](.*?)['"],\s*(\w+)/g;
const ROUTE_MOUNTS = {};
let match;
while ((match = mountRegex.exec(serverContent)) !== null) {
  ROUTE_MOUNTS[match[2]] = match[1];
}
console.log('----------- Route mounts discovered.');

// --- 2. Find all .js route files under /routes ---
const endpointsFiles = fs.readdirSync(ROUTES_DIR)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(ROUTES_DIR, file))
  .filter(fullPath => fs.existsSync(fullPath) && fs.statSync(fullPath).isFile())
  .map(fullPath => path.relative(process.cwd(), fullPath).split(path.sep).join('/'));

// --- 3. Optional: custom tag overrides by filename (without .js) ---
const customTagOverrides = {
  authRoutes: 'Authentication',
  // Add more as needed
};

// --- 4. Generate mapping: filename → tag ---
const fileTagMap = Object.fromEntries(
  endpointsFiles.map(file => {
    const base = path.basename(file, '.js');
    if (customTagOverrides[base]) return [base, customTagOverrides[base]];
    const raw = base.replace(/Routes$/, '');
    const spaced = raw.replace(/([A-Z])/g, ' $1').trim();
    const tag = pluralize(spaced.charAt(0).toUpperCase() + spaced.slice(1));
    return [base, tag];
  })
);
console.log('----------- Tag mapping ready.');

// --- 5. Prepare Swagger spec object ---
const swaggerSpec = {
  ...enhancedDoc,
  paths: {},
};

// --- 6. Scan each route file and build Swagger paths ---

endpointsFiles.forEach(file => {
  const base = path.basename(file, '.js');
  const tag = fileTagMap[base] || 'Uncategorized';
  const mountPrefix = ROUTE_MOUNTS[base] || '';
  const fullPath = path.join(process.cwd(), file);

  const routes = extractRoutesFromFile(fullPath);

  routes.forEach(({ method, path: routePath }) => {
    if (!routePath.startsWith('/')) routePath = '/' + routePath;
    const combinedPath = mountPrefix + routePath;
    const fullRoute = normalizePath(combinedPath);

    const parameters = extractPathParameters(fullRoute);

    // Build operation object
    const operation = {
      tags: [tag],
      summary: '',
      parameters,
      responses: {
        200: { description: 'Success' }
      }
    };

    // Add requestBody only for methods that typically require a body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const schemaName = tag.replace(/\s/g, '').replace(/s$/, ''); // Users → User, Panchayats → Panchayat
      if (swaggerSpec.components?.schemas?.[schemaName]) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemaName}`
              }
            }
          }
        };
      }
    }

    // Add to paths
    if (!swaggerSpec.paths[fullRoute]) swaggerSpec.paths[fullRoute] = {};
    swaggerSpec.paths[fullRoute][method.toLowerCase()] = operation;
  });
});

// --- 7. Write Swagger JSON output ---
fs.writeFileSync(outputFile, JSON.stringify(swaggerSpec, null, 2));
console.log(`----------- Swagger documentation generated successfully : ${outputFile}`);

// --- 8. AST-based route extraction ---
function extractRoutesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const ast = parser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  const routes = [];

  traverse(ast, {
    CallExpression(path) {
      // Match router.METHOD('/path', ...)
      if (
        path.node.callee.type === 'MemberExpression' &&
        path.node.callee.object.name === 'router' &&
        ['get', 'post', 'put', 'delete', 'patch'].includes(path.node.callee.property.name)
      ) {
        const method = path.node.callee.property.name.toUpperCase();
        const arg = path.node.arguments[0];
        if (arg && arg.type === 'StringLiteral') {
          routes.push({ method, path: arg.value });
        }
      }
      // Match router.route('/path').METHOD(...)
      if (
        path.node.callee.type === 'MemberExpression' &&
        path.node.callee.object.type === 'CallExpression' &&
        path.node.callee.object.callee.type === 'MemberExpression' &&
        path.node.callee.object.callee.object.name === 'router' &&
        path.node.callee.object.callee.property.name === 'route'
      ) {
        const routeArg = path.node.callee.object.arguments[0];
        const method = path.node.callee.property.name.toUpperCase();
        if (routeArg && routeArg.type === 'StringLiteral') {
          routes.push({ method, path: routeArg.value });
        }
      }
    }
  });
  return routes;
}