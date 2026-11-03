
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const app = express();

// DynamoDBテーブル名を指定
const tableName = "lwf-counter";

if (!tableName) {
  throw new Error("tableName is not defined");
}

const [host, port] = (
  process.env.AWS_LAMBDA_HTTP_ENDPOINT ??
  "localhost:3000"
).split(":");

// 実行環境の識別子
const environmentId = randomUUID().slice(0, 8);

// DynamoDBクライアント
const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({})
);

// ファイル配置場所
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ミドルウェア
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// APIのキャッシュ無効化
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// DynamoDBの登録件数を取得
async function getCount() {
  let count = 0;
  let lastKey;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: tableName,
        Select: "COUNT",
        ConsistentRead: true,
        ExclusiveStartKey: lastKey,
      })
    );

    count += result.Count ?? 0;
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return count;
}

// GET: 現在のカウンターを取得
app.get("/api/count", async (_req, res) => {
  try {
    const count = await getCount();

    res.json({
      count,
      environmentId,
    });
  } catch (error) {
    console.error("GET /api/count failed:", error);

    res.status(500).json({
      message: "Failed to get count",
    });
  }
});

// POST: クリック履歴を追加
app.post("/api/count", async (_req, res) => {
  try {
    const id = randomUUID();
    const clickedAt = new Date().toISOString();

    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          id,
          clickedAt,
        },
      })
    );

    const count = await getCount();

    res.status(201).json({
      count,
      environmentId,
      id,
      clickedAt,
    });
  } catch (error) {
    console.error("POST /api/count failed:", error);

    res.status(500).json({
      message: "Failed to increment count",
    });
  }
});

// HTTPサーバー起動
app.listen(Number(port), host, () => {
  console.log(`Server listening on ${host}:${port}`);
  console.log(`Environment ID: ${environmentId}`);
  console.log(`DynamoDB Table: ${tableName}`);
});
