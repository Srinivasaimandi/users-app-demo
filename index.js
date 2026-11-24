/**
 * @author: srinivasaimandi
 */

const path = require('path');
const express = require('express');
const userRoutes = require('./routes/users');
const loginRoutes = require('./routes/login');
const { apiKeyAuth, isValidApiKey } = require('./middleware/auth');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { ApolloServer, AuthenticationError } = require('apollo-server-express');
const { typeDefs, resolvers } = require('./graphql');
const { ensureDataFile } = require('./utils/dataUtils');

// data/data.json is the working copy of the users; create it from the backup if missing
ensureDataFile();

const app = express();
const PORT = 9899;

// Middleware: Parse JSON
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Middleware: Set Content-Type header for all responses
app.use((req, res, next) => {
    // Don't set JSON content-type for Swagger UI or its assets
    if (req.path.startsWith('/api-docs')) {
        return next();
    }
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve Swagger UI at /api-docs/
app.use('/api-docs/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public routes
app.use('/api', loginRoutes);

// --- GraphQL Setup ---
async function startApolloServer() {
    const server = new ApolloServer({ 
        typeDefs, 
        resolvers,
        introspection: true,
        // Same API key as the REST /api/users routes; get one from POST /api/login
        context: ({ req }) => {
            if (!isValidApiKey(req.header('x-api-key'))) {
                throw new AuthenticationError('Unauthorized: Invalid API Key');
            }
            return {};
        }
    });
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });

    // Protected routes (apply apiKeyAuth only here)
    app.use('/api/users', apiKeyAuth, userRoutes);

    // Unknown routes get a JSON 404 like the rest of the API
    app.use((req, res) => {
        res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
    });

    // Return errors (e.g. malformed JSON bodies) as JSON instead of Express's HTML page
    app.use((err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.expose ? err.message : 'Internal server error';
        res.status(status).json({ message });
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
startApolloServer();