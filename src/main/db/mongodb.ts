// src/main/db/mongodb/client.ts
import { MongoClient } from 'mongodb';
import log from 'electron-log';

export class Mongodb {
  private client: MongoClient;

  constructor(private config: string) {
    this.client = new MongoClient(this.config);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db();

    if (!db.databaseName || db.databaseName === 'test') {
      throw new Error('Please specify a valid database name in the connection string.');
    }

    try {
      await db.admin().command({ ping: 1 });
    } catch (err: any) {
      throw new Error(`Failed to ping MongoDB: ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async getSchemaVisualization() {
    const db = this.client.db();
    const collections = await db.listCollections().toArray();
    return collections
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((collection) => ({
        name: collection.name,
        type: 'collection'
      }));
  }

  async executeQuery(query: string): Promise<any[]> {
    try {
      // Improved regex patterns to handle more complex queries
      const findMatch = query.trim().match(/^db\.([a-zA-Z0-9_]+)\.find\(([\s\S]*?)\)$/);

      // For aggregate, we need a more robust approach since the pipeline can be complex
      const collectionMatch = query
        .trim()
        .match(/^db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\(([\s\S]*)\)$/);

      let collectionName, operation, paramsStr;

      if (findMatch) {
        [, collectionName, paramsStr] = findMatch;
        operation = 'find';
      } else if (collectionMatch && collectionMatch[2] === 'aggregate') {
        [, collectionName, operation, paramsStr] = collectionMatch;
      } else {
        throw new Error('Invalid MongoDB query format. Supported operations: find, aggregate');
      }

      const db = this.client.db();
      const collection = db.collection(collectionName);

      let params;
      if (paramsStr && paramsStr.trim() !== '') {
        try {
          // Parse the parameters safely
          params = new Function(`return ${paramsStr}`)();
        } catch (e: any) {
          log.error('Parameter parsing error:', e);
          throw new Error(`Invalid parameters syntax: ${e.message}`);
        }
      }

      // Handle different operations
      if (operation === 'find') {
        const filter = params || {};
        return await collection.find(filter).toArray();
      } else if (operation === 'aggregate') {
        // Ensure pipeline is an array
        const pipeline = Array.isArray(params) ? params : [params];
        return await collection.aggregate(pipeline).toArray();
      }

      return [];
    } catch (error: any) {
      log.error('MongoDB query error:', error.message);
      throw error;
    }
  }

  // async executeQuery(query: string): Promise<any[]> {
  //   try {
  //     // Match common MongoDB operation patterns
  //     const operationMatch = query.trim().match(/^db\.([a-zA-Z0-9_]+)\.([a-zA-Z]+)\((.*)\)$/);

  //     if (!operationMatch) {
  //       throw new Error('Invalid MongoDB query format');
  //     }

  //     const [, collectionName, operation, paramsStr] = operationMatch;
  //     const db = this.client.db();
  //     const collection = db.collection(collectionName);

  //     // Parse parameters - this handles nested parentheses and brackets
  //     let params = [];
  //     if (paramsStr && paramsStr.trim() !== '') {
  //       try {
  //         // Parse the parameters safely
  //         params = new Function(`return [${paramsStr}]`)();
  //       } catch (e) {
  //         throw new Error(`Invalid parameters syntax: ${e.message}`);
  //       }
  //     }

  //     log.info(`Executing ${operation} on ${collectionName} with params:`, params);

  //     // Handle different MongoDB operations
  //     switch (operation.toLowerCase()) {
  //       case 'find':
  //         const filter = params[0] || {};
  //         const options = params[1] || {};
  //         return await collection.find(filter, options).limit(100).toArray();

  //       case 'findone':
  //         return [await collection.findOne(params[0] || {}, params[1] || {})].filter(Boolean);

  //       case 'insertone':
  //         const insertResult = await collection.insertOne(params[0]);
  //         return [{ acknowledged: insertResult.acknowledged, insertedId: insertResult.insertedId }];

  //       case 'insertmany':
  //         const insertManyResult = await collection.insertMany(params[0]);
  //         return [
  //           {
  //             acknowledged: insertManyResult.acknowledged,
  //             insertedCount: insertManyResult.insertedCount,
  //             insertedIds: insertManyResult.insertedIds
  //           }
  //         ];

  //       case 'updateone':
  //         const updateResult = await collection.updateOne(
  //           params[0] || {},
  //           params[1],
  //           params[2] || {}
  //         );
  //         return [
  //           {
  //             acknowledged: updateResult.acknowledged,
  //             matchedCount: updateResult.matchedCount,
  //             modifiedCount: updateResult.modifiedCount,
  //             upsertedCount: updateResult.upsertedCount,
  //             upsertedId: updateResult.upsertedId
  //           }
  //         ];

  //       case 'updatemany':
  //         const updateManyResult = await collection.updateMany(
  //           params[0] || {},
  //           params[1],
  //           params[2] || {}
  //         );
  //         return [
  //           {
  //             acknowledged: updateManyResult.acknowledged,
  //             matchedCount: updateManyResult.matchedCount,
  //             modifiedCount: updateManyResult.modifiedCount,
  //             upsertedCount: updateManyResult.upsertedCount,
  //             upsertedId: updateManyResult.upsertedId
  //           }
  //         ];

  //       case 'deleteone':
  //         const deleteResult = await collection.deleteOne(params[0] || {});
  //         return [
  //           {
  //             acknowledged: deleteResult.acknowledged,
  //             deletedCount: deleteResult.deletedCount
  //           }
  //         ];

  //       case 'deletemany':
  //         const deleteManyResult = await collection.deleteMany(params[0] || {});
  //         return [
  //           {
  //             acknowledged: deleteManyResult.acknowledged,
  //             deletedCount: deleteManyResult.deletedCount
  //           }
  //         ];

  //       case 'aggregate':
  //         return await collection.aggregate(params[0] || []).toArray();

  //       case 'count':
  //       case 'countdocuments':
  //         const count = await collection.countDocuments(params[0] || {}, params[1] || {});
  //         return [{ count }];

  //       default:
  //         throw new Error(`Unsupported MongoDB operation: ${operation}`);
  //     }
  //   } catch (error: any) {
  //     log.error('MongoDB query error:', error.message);
  //     throw error;
  //   }
  // }
}
