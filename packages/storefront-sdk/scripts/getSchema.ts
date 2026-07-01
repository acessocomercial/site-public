import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { printSchema } from 'graphql/utilities/printSchema';
import { getIntrospectionQuery } from 'graphql/utilities/getIntrospectionQuery';
import { buildClientSchema } from 'graphql/utilities/buildClientSchema';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const schemaFile = join(currentDirectory, '../schema.graphql');

const endpoint =
  process.env.STOREFRONT_GRAPHQL_URL ||
  'http://localhost:8082/api/storefront/graphql';

fetch(endpoint, {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: getIntrospectionQuery() }),
})
  .then((response) => response.json())
  .then((result: { data?: Parameters<typeof buildClientSchema>[0]; errors?: Array<{ message: string }> }) => {
    if (result.errors) {
      throw result;
    }
    if (!result.data) {
      throw new Error('No data returned from introspection query');
    }
    const schemaString = printSchema(buildClientSchema(result.data));
    writeFileSync(schemaFile, schemaString);
    console.log(`Storefront schema written to schema.graphql`);
  })
  .catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ECONNREFUSED') {
      console.log('Connection error — make sure the backend is running!');
    } else {
      console.log(error);
    }
    process.exit(1);
  });
