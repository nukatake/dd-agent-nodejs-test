# DatadogのTraceのサンプルです。
TraceIDを取得し、親スパンを作成、その情報をRedisに格納、他のプロセスから参照し、Traceを引き継いでDatadogに送信。
DatadogのAPMでトレースが可能

# Start
docker-compose up --build

# Set .env 
env.sample をコピーして使用してください。

# /login エンドポイントにリクエストを送信し、トレースIDとスパンIDを取得する
curl -X GET 'http://localhost:3000/login?userId=user123' -i

# 前のリクエストで取得したトレースIDを /trace エンドポイントにリクエストを送信する
# Replace 'trace_id_here' with the actual trace ID obtained from the previous response
curl -X GET 'http://localhost:3000/trace?traceId=trace_id_here' -i

# /logout エンドポイントにリクエストを送信し、親スパンを終了させる
# Replace 'trace_id_here' with the actual trace ID obtained from the previous response
curl -X GET 'http://localhost:3000/logout?traceId=trace_id_here' -i

# ポートを3002に変更すれば別プロセスからテストできます。

