const { MongoClient } = require("mongodb");

const DB_NAME = "goobers_db";
const DB_COLLECTIONS = {
  goobers: "goobers",
  owners: "owners",
};

const mongo = new MongoClient("mongodb://localhost:27017");

const initDB = async ({ dbName }) => {
  await mongo.connect();

  const db = await mongo.db(dbName);
  console.log("DB initialized");
  return db;
};

const withDB = async (fn) => {
  const db = await initDB({ dbName: DB_NAME });
  await fn(db);
  await mongo.close();
};

module.exports = {
  withDB,
  DB_COLLECTIONS,
};
