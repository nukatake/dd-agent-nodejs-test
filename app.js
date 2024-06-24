const express = require('express');
const tracer = require('dd-trace').init({
  service: process.env.DD_SERVICE,
  env: process.env.DD_ENV,
  version: process.env.DD_VERSION,
  logInjection: process.env.DD_LOGS_INJECTION === 'true'
});
const Redis = require('ioredis');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Redis client setup
const redis = new Redis({
  host: 'redis', // Docker Compose で定義されたサービス名
  port: 6379
});

app.get('/login', async (req, res) => {
  const parentSpan = tracer.startSpan('web1.login');
  const userId = req.query.userId;

  if (!userId) {
    parentSpan.finish();
    return res.status(400).send('User ID is required');
  }

  parentSpan.setTag('user.id', userId);
  const traceId = parentSpan.context().toTraceId();
  const spanId = parentSpan.context().toSpanId();
  const samplingPriority = parentSpan.context()._sampling.priority;

  parentSpan.setTag('trace.id', traceId);
  parentSpan.setTag('span.id', spanId);

  // 親スパンを終了
  parentSpan.finish();

  // 親スパンのコンテキスト情報をRedisに保存
  const spanContext = {
    traceId: traceId,
    spanId: spanId,
    samplingPriority: samplingPriority
  };
  await redis.hset(traceId, spanContext);

  res.send({
    message: 'Logged in',
    traceId: traceId,
    spanId: spanId  // スパンIDも送信
  });
});

app.get('/trace', async (req, res) => {
  const traceIdFromParam = req.query.traceId;

  if (!traceIdFromParam) {
    return res.status(400).send('Trace ID is required');
  }

  // Redisから親スパンのコンテキストを取得
  const spanContext = await redis.hgetall(traceIdFromParam);
  const parentSpanContext = tracer.extract('text_map', {
    'x-datadog-trace-id': spanContext.traceId,
    'x-datadog-parent-id': spanContext.spanId,
    'x-datadog-sampling-priority': spanContext.samplingPriority
  });

  // 親スパンのコンテキストを使用して新しいスパンを作成
  const childSpan = tracer.startSpan('web1.trace', {
    childOf: parentSpanContext
  });

  const childSpanId = childSpan.context().toSpanId();

  childSpan.setTag('trace.id', spanContext.traceId);
  childSpan.setTag('span.id', childSpanId);
  childSpan.setTag('parent.span.id', spanContext.spanId);
  childSpan.setTag('trace.info', 'example information');

  setTimeout(() => {
    childSpan.finish();
    res.send({ message: 'Traced' });
  }, 1000);
});

app.get('/logout', async (req, res) => {
  const traceIdFromParam = req.query.traceId;

  if (!traceIdFromParam) {
    return res.status(400).send('Trace ID is required');
  }

  // Redisから親スパンのコンテキストを取得
  const spanContext = await redis.hgetall(traceIdFromParam);

  if (!spanContext) {
    return res.status(400).send('Invalid Trace ID');
  }

  const parentSpanContext = tracer.extract('text_map', {
    'x-datadog-trace-id': spanContext.traceId,
    'x-datadog-parent-id': spanContext.spanId,
    'x-datadog-sampling-priority': spanContext.samplingPriority
  });

  // 親スパンのコンテキストを使用して新しいスパンを作成
  const logoutSpan = tracer.startSpan('web1.logout', {
    childOf: parentSpanContext
  });

  logoutSpan.setTag('trace.id', spanContext.traceId);
  logoutSpan.setTag('parent.span.id', spanContext.spanId);
  logoutSpan.setTag('span.id', logoutSpan.context().toSpanId());

  setTimeout(() => {
    logoutSpan.finish();

    // 親スパンを終了
    const parentSpan = tracer.startSpan('web1.parent_finish', {
      childOf: parentSpanContext
    });
    parentSpan.finish();

    // Redisからスパン情報を削除
    //await redis.del(traceIdFromParam);

    res.send('Logged out');
  }, 1000);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

